import { describe, expect, it } from "vitest";
import { generateDaySlots, type SlotContext } from "@/server/services/availability";
import { localToUtc } from "@/lib/time";

const base: SlotContext = {
  durationMinutes: 30,
  capacityPerSlot: 1,
  serviceId: "s1",
  rules: [{ weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60, validFrom: null, validUntil: null }],
  exceptions: [],
  appointments: [],
  earliest: new Date("2020-01-01T00:00:00Z"),
  latest: null,
};

// 2026-10-19 es lunes.
const MONDAY = "2026-10-19";

describe("Generación de turnos", () => {
  it("genera turnos según la duración del servicio en hora de Paraguay (UTC-3)", () => {
    const slots = generateDaySlots(MONDAY, base);
    expect(slots).toHaveLength(6);
    expect(slots[0].startsAt.toISOString()).toBe("2026-10-19T12:00:00.000Z");
    expect(slots[5].endsAt.toISOString()).toBe("2026-10-19T15:00:00.000Z");
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it("no genera turnos en días sin reglas", () => {
    expect(generateDaySlots("2026-10-20", base)).toHaveLength(0);
  });

  it("respeta la vigencia de las reglas", () => {
    const ctx = { ...base, rules: [{ ...base.rules[0], validFrom: new Date("2026-11-01T00:00:00Z") }] };
    expect(generateDaySlots(MONDAY, ctx)).toHaveLength(0);
  });

  it("no ofrece turnos que no entran completos en el bloque", () => {
    const slots = generateDaySlots(MONDAY, { ...base, durationMinutes: 40 });
    expect(slots).toHaveLength(4); // 09:00, 09:40, 10:20, 11:00 (11:40 no entra)
  });

  it("marca como ocupados los turnos con citas superpuestas", () => {
    const ctx: SlotContext = {
      ...base,
      appointments: [
        { id: "a1", serviceId: "s1", blocksSlot: true, status: "CONFIRMED", startsAt: localToUtc(MONDAY, 600), endsAt: localToUtc(MONDAY, 645) },
      ],
    };
    const slots = generateDaySlots(MONDAY, ctx);
    const byTime = Object.fromEntries(slots.map((s) => [s.startsAt.toISOString(), s.available]));
    expect(byTime["2026-10-19T13:00:00.000Z"]).toBe(false); // 10:00
    expect(byTime["2026-10-19T13:30:00.000Z"]).toBe(false); // 10:30 (se superpone hasta 10:45)
    expect(byTime["2026-10-19T14:00:00.000Z"]).toBe(true); // 11:00
  });

  it("ignora citas canceladas y la cita que se está reprogramando", () => {
    const appt = { serviceId: "s1", blocksSlot: true, startsAt: localToUtc(MONDAY, 540), endsAt: localToUtc(MONDAY, 570) };
    expect(generateDaySlots(MONDAY, { ...base, appointments: [{ ...appt, id: "x", status: "CANCELLED" }] })[0].available).toBe(true);
    expect(
      generateDaySlots(MONDAY, { ...base, appointments: [{ ...appt, id: "x", status: "SCHEDULED" }], ignoreAppointmentId: "x" })[0].available,
    ).toBe(true);
  });

  it("bloquea los turnos afectados por feriados, vacaciones o bloqueos", () => {
    const ctx = { ...base, exceptions: [{ startsAt: localToUtc(MONDAY, 600), endsAt: localToUtc(MONDAY, 720) }] };
    const slots = generateDaySlots(MONDAY, ctx);
    expect(slots.filter((s) => s.available)).toHaveLength(2);
  });

  it("respeta la anticipación mínima y la ventana máxima", () => {
    const ctx = { ...base, earliest: localToUtc(MONDAY, 600), latest: localToUtc(MONDAY, 660) };
    const available = generateDaySlots(MONDAY, ctx).filter((s) => s.available);
    expect(available.map((s) => s.startsAt.toISOString())).toEqual([
      "2026-10-19T13:00:00.000Z",
      "2026-10-19T13:30:00.000Z",
      "2026-10-19T14:00:00.000Z",
    ]);
  });

  it("admite varios pacientes por turno cuando el servicio tiene capacidad", () => {
    const appt = { serviceId: "s1", blocksSlot: false, status: "SCHEDULED" as const, startsAt: localToUtc(MONDAY, 540), endsAt: localToUtc(MONDAY, 570) };
    const ctx = { ...base, capacityPerSlot: 3, appointments: [{ ...appt, id: "1" }, { ...appt, id: "2" }] };
    const first = generateDaySlots(MONDAY, ctx)[0];
    expect(first.available).toBe(true);
    expect(first.remaining).toBe(1);
    const full = generateDaySlots(MONDAY, { ...ctx, appointments: [...ctx.appointments, { ...appt, id: "3" }] })[0];
    expect(full.available).toBe(false);
  });
});
