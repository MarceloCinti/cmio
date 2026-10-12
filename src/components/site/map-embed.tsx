"use client";

import { useState } from "react";
import { ExternalLink, MapPinned } from "lucide-react";

/**
 * Mapa interactivo que se carga solo cuando la persona lo solicita (evita enviar
 * datos a terceros y mejora el rendimiento). Si hay coordenadas verificadas se usa
 * OpenStreetMap; si no, Google Maps a partir de la dirección.
 */
export function MapEmbed({ query, latitude, longitude }: { query: string; latitude: number | null; longitude: number | null }) {
  const [loaded, setLoaded] = useState(false);
  const hasCoords = latitude != null && longitude != null;
  const src = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude! - 0.006}%2C${latitude! - 0.004}%2C${longitude! + 0.006}%2C${latitude! + 0.004}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  const external = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-canvas">
      {loaded ? (
        <iframe
          title="Mapa con la ubicación de la clínica"
          src={src}
          className="block h-72 w-full border-0 sm:h-80"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className="flex h-72 flex-col items-center justify-center gap-3 p-6 text-center sm:h-80">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            <MapPinned className="size-6" aria-hidden="true" />
          </span>
          <p className="max-w-xs text-sm text-muted">
            El mapa se carga desde un servicio externo. Al abrirlo, ese servicio recibirá tu dirección IP.
          </p>
          <button
            type="button"
            onClick={() => setLoaded(true)}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-strong"
          >
            Ver mapa interactivo
          </button>
        </div>
      )}
      <a
        href={external}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 border-t border-line bg-surface px-4 py-3 text-sm font-semibold text-primary hover:underline"
      >
        Abrir en Google Maps <ExternalLink className="size-4" aria-hidden="true" />
      </a>
    </div>
  );
}
