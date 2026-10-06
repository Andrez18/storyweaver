import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Download,
  Facebook,
  Instagram,
  Link2,
  MessageCircle,
  Send,
  Share2,
  Twitter,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  FORMATOS,
  compartirImagen,
  descargarImagen,
  generarImagenCompartir,
  nombreArchivo,
  redes,
  textoCompartir,
  type FormatoImagen,
} from "@/lib/compartir";
import type { Escrito } from "@/lib/store";

type Props = { doc: Escrito; onCerrar: () => void };

export function CompartirModal({ doc, onCerrar }: Props) {
  const [formato, setFormato] = useState<FormatoImagen>("vertical");
  const [vista, setVista] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [ocupado, setOcupado] = useState(true);
  const vistaRef = useRef<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setOcupado(true);
    setBlob(null);
    generarImagenCompartir(doc, formato)
      .then((b) => {
        if (!vivo) return;
        if (vistaRef.current) URL.revokeObjectURL(vistaRef.current);
        const url = URL.createObjectURL(b);
        vistaRef.current = url;
        setVista(url);
        setBlob(b);
      })
      .catch(() => toast.error("No se pudo generar la imagen"))
      .finally(() => {
        if (vivo) setOcupado(false);
      });
    return () => {
      vivo = false;
    };
  }, [doc, formato]);

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

  const enlace = () => location.href;
  const texto = () => textoCompartir(doc, location.href);

  async function accionCompartir(instagram = false) {
    if (!blob) return;
    try {
      const resultado = await compartirImagen(blob, doc, location.href);
      if (resultado === "sin-soporte") {
        descargarImagen(blob, nombreArchivo(doc, formato));
        if (instagram) {
          await navigator.clipboard.writeText(location.href).catch(() => undefined);
          toast.success("Imagen y enlace listos", {
            description: "Súbela a tu historia o biografía de Instagram.",
          });
        } else {
          toast.success("Imagen descargada", {
            description: "Ábrela en Instagram o en tu red para publicarla.",
          });
        }
      }
    } catch {
      toast.error("No se pudo compartir la imagen");
    }
  }

  function accionDescargar() {
    if (!blob) return;
    descargarImagen(blob, nombreArchivo(doc, formato));
    toast.success("Imagen descargada");
  }

  function abrir(url: string) {
    open(url, "_blank", "noopener,noreferrer");
  }

  async function copiar() {
    await navigator.clipboard.writeText(enlace());
    toast.success("Enlace copiado");
  }

  const acciones: { clave: string; etiqueta: string; icono: ReactNode; alPulsar: () => void }[] = [
    {
      clave: "instagram",
      etiqueta: "Instagram",
      icono: <Instagram className="h-4 w-4" />,
      alPulsar: () => void accionCompartir(true),
    },
    {
      clave: "whatsapp",
      etiqueta: "WhatsApp",
      icono: <MessageCircle className="h-4 w-4" />,
      alPulsar: () => abrir(redes.whatsapp(texto())),
    },
    {
      clave: "x",
      etiqueta: "X",
      icono: <Twitter className="h-4 w-4" />,
      alPulsar: () => abrir(redes.x(texto(), enlace())),
    },
    {
      clave: "facebook",
      etiqueta: "Facebook",
      icono: <Facebook className="h-4 w-4" />,
      alPulsar: () => abrir(redes.facebook(enlace())),
    },
    {
      clave: "telegram",
      etiqueta: "Telegram",
      icono: <Send className="h-4 w-4" />,
      alPulsar: () => abrir(redes.telegram(texto(), enlace())),
    },
    {
      clave: "copiar",
      etiqueta: "Copiar enlace",
      icono: <Link2 className="h-4 w-4" />,
      alPulsar: () => void copiar(),
    },
  ];

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
        className="my-auto w-full max-w-sm rounded-3xl bg-card p-5 text-card-foreground shadow-float"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-serif text-xl font-semibold">Compartir</h2>
            <p className="truncate text-xs text-muted-foreground">{doc.titulo || "Sin título"}</p>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex justify-center">
          {ocupado || !vista ? (
            <div className="grid h-56 w-44 place-items-center rounded-2xl bg-secondary px-4 text-center text-xs text-muted-foreground">
              Generando imagen…
            </div>
          ) : (
            <img
              src={vista}
              alt="Vista previa de la imagen para compartir"
              className={`h-56 rounded-2xl border object-cover shadow-float ${
                formato === "vertical" ? "aspect-[4/5]" : "aspect-square"
              }`}
            />
          )}
        </div>

        <div className="mb-3 flex rounded-full bg-secondary p-1 text-sm">
          {(Object.keys(FORMATOS) as FormatoImagen[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormato(f)}
              className={`flex-1 rounded-full py-1.5 ${
                formato === f ? "bg-card font-semibold shadow-float" : "text-muted-foreground"
              }`}
            >
              {f === "vertical" ? "Vertical" : "Cuadrado"} · {FORMATOS[f].nombre}
            </button>
          ))}
        </div>

        <p className="mb-4 text-center text-xs leading-relaxed text-muted-foreground">
          En el móvil: <span className="font-medium text-foreground">Compartir…</span> y elige
          Instagram. En escritorio: descarga la imagen y súbela.
        </p>

        <div className="mb-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => void accionCompartir()}
            disabled={!blob}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" /> Compartir…
          </button>
          <button
            onClick={accionDescargar}
            disabled={!blob}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm font-medium transition disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Descargar
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          {acciones.map((a) => (
            <button
              key={a.clave}
              onClick={a.alPulsar}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-secondary px-2 py-3 text-muted-foreground transition hover:bg-secondary/70 hover:text-foreground"
            >
              {a.icono}
              <span>{a.etiqueta}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
