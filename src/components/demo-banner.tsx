export function DemoBanner() {
  const demo = process.env.DEMO_MODE === "true" || process.env.DEMO_MODE === "1";
  if (!demo) return null;
  return (
    <div className="bg-amber-100 text-amber-950">
      <p className="container-page py-1.5 text-center text-xs font-medium sm:text-sm">
        Entorno de demostración: los profesionales, pacientes y citas que se muestran son ficticios.
      </p>
    </div>
  );
}
