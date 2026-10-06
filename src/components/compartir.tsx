import { useEffect, useRef, useState } from "react";
import { Download, Link2, Share2, X } from "lucide-react";
import { toast } from "sonner";

import {
  compartirImagen,
  descargarImagen,
  generarImagenCompartir,
  nombreArchivo,
  textoCompartir,
} from "@/lib/compartir";
import type { Escrito } from "@/lib/store";

const FORMATO = "vertical" as const;

type Props = { doc: Escrito; onCerrar: () => void };

export function CompartirModal({ doc, onCerrar }: Props) {
  const [vista, setVista] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const vistaRef = useRef<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setBlob(null);
    generarImagenCompartir(doc, FORMATO)
      .then((b) => {
        if (!vivo) return;
        if (vistaRef.current) URL.revokeObjectURL(vistaRef.current);
        const url = URL.createObjectURL(b);
        vistaRef.current = url;
        setVista(url);
        setBlob(b);
      })
      .catch(() => toast.error("No se pudo generar la imagen"));
    return () => {
      vivo = false;
    };
  }, [doc]);

  useEffect(
    () => () => {
      if (vistaRef.current) URL.revokeObjectURL(vistaRef.current);
    },
    [],
  );

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [onCerrar]);

  async function compartir() {
    if (!blob) return;
    try {
      const resultado = await compartirImagen(blob, doc, location.href);
      if (resultado === "sin-soporte") {
        descargarImagen(blob, nombreArchivo(doc, FORMATO));
        toast.success("Imagen descargada", {
          description: "Súbela a Instagram o a la red que prefieras.",
        });
      }
    } catch {
      toast.error("No se pudo compartir la imagen");
    }
  }

  function descargar() {
    if (!blob) return;
    descargarImagen(blob, nombreArchivo(doc, FORMATO));
    toast.success("Imagen descargada");
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(location.href);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  }

  const ancho = "w-full max-w-[22rem]";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Compartir obra"
      onClick={onCerrar}
      className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-foreground/60 p-5 font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`my-auto ${ancho} rounded-3xl bg-card p-4 text-card-foreground shadow-float`}
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="font-serif text-lg font-semibold">Compartir</h2>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex justify-center">
          {!blob ? (
            <div className="grid h-72 w-[14.25rem] place-items-center rounded-2xl bg-secondary px-6 text-center text-xs text-muted-foreground">
              Generando imagen…
            </div>
          ) : (
            <img
              src={vista ?? undefined}
              alt="Imagen lista para compartir"
              className="h-72 w-[14.25rem] rounded-2xl object-cover shadow-float"
            />
          )}
        </div>

        <p className="mt-3 text-center text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
          1080 × 1350 · PNG
        </p>

        <button
          onClick={() => void compartir()}
          disabled={!blob}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition disabled:opacity-50"
        >
          <Share2 className="h-4 w-4" /> Compartir…
        </button>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={descargar}
            disabled={!blob}
            className="flex items-center justify-center gap-2 rounded-full bg-secondary px-3 py-2.5 text-sm font-medium transition hover:bg-secondary/70 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Descargar
          </button>
          <button
            onClick={() => void copiar()}
            className="flex items-center justify-center gap-2 rounded-full bg-secondary px-3 py-2.5 text-sm font-medium transition hover:bg-secondary/70"
          >
            <Link2 className="h-4 w-4" /> Copiar enlace
          </button>
        </div>
      </div>
    </div>
  );
}
