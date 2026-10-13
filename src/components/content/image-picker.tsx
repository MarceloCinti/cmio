"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ImagePlus, X } from "lucide-react";
import { CLINIC_IMAGE_LIST, STOCK_IMAGE_LIST } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { uploadImageAction } from "@/app/panel/admin-actions";

/** Selector de imagen: fotos del CMIO, biblioteca de imágenes con licencia o subida propia (JPG/PNG/WebP, máx. 5 MB). */
export function ImagePicker({
  value,
  onChange,
  label,
  allowEmpty = true,
}: {
  value: string | null;
  onChange: (path: string | null, alt?: string) => void;
  label: string;
  allowEmpty?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink">{label}</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative h-20 w-32 overflow-hidden rounded-xl border border-line bg-canvas">
          {value ? <Image src={value} alt="" fill sizes="128px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-muted">Sin imagen</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            Elegir de la biblioteca
          </Button>
          <Button size="sm" variant="outline" icon={pending ? <Spinner className="size-4" /> : <ImagePlus className="size-4" aria-hidden="true" />} onClick={() => fileRef.current?.click()}>
            Subir imagen
          </Button>
          {allowEmpty && value ? (
            <Button size="sm" variant="ghost" icon={<X className="size-4" aria-hidden="true" />} onClick={() => onChange(null)}>
              Quitar
            </Button>
          ) : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={`Subir imagen para ${label}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const fd = new FormData();
            fd.set("file", file);
            start(async () => {
              const res = await uploadImageAction(null, fd);
              if (res?.ok && res.data) {
                setError(null);
                onChange(res.data.path);
              } else if (res && !res.ok) setError(res.message);
            });
            e.target.value = "";
          }}
        />
      </div>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      {open ? (
        <ul className="grid grid-cols-3 gap-2 rounded-xl border border-line bg-canvas p-2 sm:grid-cols-5">
          {[...CLINIC_IMAGE_LIST, ...STOCK_IMAGE_LIST].map((img) => (
            <li key={img.path}>
              <button
                type="button"
                onClick={() => {
                  onChange(img.path, img.alt);
                  setOpen(false);
                }}
                className={cn("relative block aspect-[4/3] w-full overflow-hidden rounded-lg border-2", value === img.path ? "border-primary" : "border-transparent")}
                aria-label={img.alt}
              >
                <Image src={img.path} alt="" fill sizes="120px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-muted">Usa imágenes con licencia. No publiques fotografías de pacientes ni de otras instituciones.</p>
    </div>
  );
}
