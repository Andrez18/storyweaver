import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { toast } from "sonner";
import {
  ChevronLeft,
  Share,
  Copy,
  Quote,
  PenLine,
  MoreHorizontal,
  EyeOff,
  Trash2,
  X,
} from "lucide-react";
import { CompartirModal } from "@/components/compartir";
import {
  FUENTES,
  eliminar,
  esAutor,
  extracto,
  fuenteCss,
  guardar,
  obtener,
  palabras,
  minutos,
  type Escrito,
} from "@/lib/store";

export const Route = createFileRoute("/obra/$id")({
  // SSR: trae la obra publicada para que las redes y los buscadores
  // vean el título, el extracto y la imagen correctos.
  loader: async ({ params }) => ({ doc: await obtener(params.id) }),
  head: ({ loaderData, params }) => {
    const doc = loaderData?.doc;
    const base = doc?.titulo?.trim() || "Sin título";
    const titulo = doc?.autor ? `${base} — ${doc.autor}` : base;
    const descripcion = doc
      ? extracto(doc.contenido, 160)
      : "Lee esta obra con tipografía y tema a tu gusto.";
    const sitio = (import.meta.env["VITE_SITE_URL"] as string | undefined)?.replace(/\/+$/, "");
    const imagen = sitio ? `${sitio}/og.png` : "/og.png";
    const enlace = sitio ? `${sitio}/obra/${params.id}` : `/obra/${params.id}`;
    return {
      meta: [
        { title: `${titulo} — Escritos` },
        { name: "description", content: descripcion },
        { property: "og:type", content: "article" },
        { property: "og:site_name", content: "Escritos" },
        { property: "og:title", content: titulo },
        { property: "og:description", content: descripcion },
        { property: "og:image", content: imagen },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: titulo },
        { name: "twitter:description", content: descripcion },
        { name: "twitter:image", content: imagen },
      ],
      links: [{ rel: "canonical", href: enlace }],
    };
  },
  component: Obra,
});

type Pref = {
  fuente: string | null;
  tam: number;
  linea: number;
  tema: "claro" | "sepia" | "noche";
  capitular: boolean;
};
const DEF: Pref = { fuente: null, tam: 20, linea: 1.75, tema: "claro", capitular: true };

function Obra() {
  const { id } = Route.useParams();
  const inicial = Route.useLoaderData();
  const nav = useNavigate();
  const [docCli, setDocCli] = useState<Escrito | null | undefined>(undefined);
  const [p, setP] = useState<Pref>(DEF);
  const [ajustes, setAjustes] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [sel, setSel] = useState<{ texto: string; x: number; y: number } | null>(null);
  const [cita, setCita] = useState<string | null>(null);
  const [formato, setFormato] = useState<"ancho" | "cuadrado">("ancho");
  const [prog, setProg] = useState(0);
  const [compartir, setCompartir] = useState(false);
  const [soyAutor, setSoyAutor] = useState(false);

  // El SSR trae la obra publicada; si no la trae (borrador propio o borrada),
  // se vuelve a pedir desde el navegador con la sesión del usuario.
  const cargando = !inicial.doc && docCli === undefined;
  const doc: Escrito | null = docCli && docCli.id === id ? docCli : inicial.doc;

  useEffect(() => {
    if (!doc) {
      setSoyAutor(false);
      return;
    }
    let vivo = true;
    esAutor(doc)
      .then((ok) => vivo && setSoyAutor(ok))
      .catch(() => vivo && setSoyAutor(false));
    return () => {
      vivo = false;
    };
  }, [doc]);

  useEffect(() => {
    setDocCli(undefined);
    if (!inicial.doc) obtener(id).then(setDocCli);
    try {
      setP({ ...DEF, ...JSON.parse(localStorage.getItem("escritos.lectura") || "{}") });
    } catch {
      /* */
    }
  }, [id, inicial.doc]);
  const upd = (x: Partial<Pref>) =>
    setP((o) => {
      const n = { ...o, ...x };
      localStorage.setItem("escritos.lectura", JSON.stringify(n));
      return n;
    });

  async function despublicar() {
    if (!doc) return;
    try {
      const n = { ...doc, estado: "borrador" as const, publicado_en: null };
      await guardar(n);
      setDocCli(n);
      setMenu(false);
      toast.success("Obra despublicada", { description: "Ahora solo tú puedes verla." });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function eliminarObra() {
    if (!doc) return;
    try {
      await eliminar(doc.id);
      setMenu(false);
      toast.success("Obra eliminada");
      nav({ to: "/" });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  useEffect(() => {
    const s = () =>
      setProg(Math.min(1, scrollY / Math.max(1, document.body.scrollHeight - innerHeight)));
    const up = () => {
      const s = getSelection();
      const t = s?.toString().trim();
      if (!s || !t || !s.rangeCount) return setSel(null);
      const r = s.getRangeAt(0).getBoundingClientRect();
      setSel({ texto: t, x: r.left + r.width / 2, y: r.bottom + scrollY + 10 });
    };
    addEventListener("scroll", s);
    document.addEventListener("selectionchange", up);
    return () => {
      removeEventListener("scroll", s);
      document.removeEventListener("selectionchange", up);
    };
  }, []);

  if (cargando) return <p className="p-10 text-center text-muted-foreground">Cargando…</p>;
  if (!doc)
    return (
      <div className="p-10 text-center">
        Obra no encontrada.{" "}
        <Link to="/" className="underline">
          Volver
        </Link>
      </div>
    );

  const fam = fuenteCss(p.fuente ?? doc.fuente);
  const n = palabras(doc.contenido);
  const tema = p.tema === "sepia" ? "tema-sepia" : p.tema === "noche" ? "tema-noche" : "";

  return (
    <div className={`${tema} min-h-screen bg-paper text-ink transition-colors`}>
      <div className="fixed left-0 top-0 z-40 h-0.5 bg-ink" style={{ width: `${prog * 100}%` }} />
      <header className="sticky top-0 z-30 mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link
          to="/"
          className="glass grid h-10 w-10 place-items-center rounded-full text-foreground"
          aria-label="Volver"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex gap-2 text-foreground">
          {soyAutor && (
            <button
              onClick={() => {
                setMenu(!menu);
                setConfirmar(false);
                setAjustes(false);
              }}
              className="glass grid h-10 w-10 place-items-center rounded-full"
              aria-label="Opciones de la obra"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
          {soyAutor && (
            <Link
              to="/escribir/$id"
              params={{ id: doc.id }}
              className="glass grid h-10 w-10 place-items-center rounded-full"
              aria-label="Editar"
            >
              <PenLine className="h-4 w-4" />
            </Link>
          )}
          <button
            onClick={() => {
              setAjustes(!ajustes);
              setMenu(false);
            }}
            className="glass grid h-10 w-10 place-items-center rounded-full font-serif text-base"
            aria-label="Ajustes de lectura"
          >
            Aa
          </button>
          <button
            onClick={() => {
              setCompartir(true);
              setMenu(false);
            }}
            className="glass grid h-10 w-10 place-items-center rounded-full"
            aria-label="Compartir"
          >
            <Share className="h-4 w-4" />
          </button>
        </div>
      </header>

      {menu && soyAutor && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
          <div className="glass fixed right-4 top-16 z-40 w-64 rounded-3xl p-2 text-sm text-foreground">
            {!confirmar ? (
              <div className="flex flex-col">
                {doc.estado === "publicado" && (
                  <button
                    onClick={() => void despublicar()}
                    className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left transition hover:bg-secondary"
                  >
                    <EyeOff className="h-4 w-4" /> Despublicar
                  </button>
                )}
                <button
                  onClick={() => setConfirmar(true)}
                  className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-destructive transition hover:bg-secondary"
                >
                  <Trash2 className="h-4 w-4" /> Eliminar
                </button>
              </div>
            ) : (
              <div className="p-2">
                <p className="mb-3 leading-snug">
                  ¿Eliminar «{doc.titulo.trim() || "Sin título"}»? No se puede deshacer.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmar(false)}
                    className="flex-1 rounded-xl bg-secondary py-2 font-medium transition hover:bg-secondary/70"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => void eliminarObra()}
                    className="flex-1 rounded-xl bg-destructive py-2 font-medium text-destructive-foreground transition hover:bg-destructive/90"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {ajustes && (
        <div className="glass fixed right-4 top-16 z-40 w-72 rounded-3xl p-5 text-sm text-foreground">
          <p className="mb-2 font-semibold">Fuente</p>
          <div className="grid grid-cols-2 gap-2">
            {FUENTES.map((f) => (
              <button
                key={f.id}
                onClick={() => upd({ fuente: f.id })}
                style={{ fontFamily: f.css }}
                className={`rounded-xl px-3 py-2 text-left ${(p.fuente ?? doc.fuente) === f.id ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
              >
                {f.nombre}
              </button>
            ))}
          </div>
          <p className="mt-4 font-semibold">Tamaño · {p.tam}px</p>
          <input
            type="range"
            min={15}
            max={30}
            value={p.tam}
            onChange={(e) => upd({ tam: +e.target.value })}
            className="w-full accent-current"
          />
          <p className="mt-2 font-semibold">Interlineado · {p.linea}</p>
          <input
            type="range"
            min={1.3}
            max={2.2}
            step={0.05}
            value={p.linea}
            onChange={(e) => upd({ linea: +e.target.value })}
            className="w-full accent-current"
          />
          <p className="mt-3 font-semibold">Tema</p>
          <div className="mt-1 flex rounded-full bg-secondary p-1">
            {(["claro", "sepia", "noche"] as const).map((t) => (
              <button
                key={t}
                onClick={() => upd({ tema: t })}
                className={`flex-1 rounded-full py-1.5 capitalize ${p.tema === t ? "bg-card shadow-float" : ""}`}
              >
                {t}
              </button>
            ))}
          </div>
          <label className="mt-4 flex items-center justify-between font-semibold">
            Letra capital
            <input
              type="checkbox"
              checked={p.capitular}
              onChange={(e) => upd({ capitular: e.target.checked })}
            />
          </label>
        </div>
      )}

      <article className="mx-auto max-w-2xl px-6 pb-32 pt-12" style={{ fontFamily: fam }}>
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">{doc.titulo}</h1>
        {doc.subtitulo && (
          <p className="mt-3 text-xl italic text-muted-foreground">{doc.subtitulo}</p>
        )}
        <p className="mt-6 font-sans text-sm text-muted-foreground">
          {doc.autor &&
            (doc.user_id ? (
              <Link
                to="/autor/$id"
                params={{ id: doc.user_id }}
                className="font-medium text-ink underline-offset-4 hover:underline"
              >
                {doc.autor}
              </Link>
            ) : (
              <span className="font-medium text-ink">{doc.autor}</span>
            ))}
          {doc.autor && " · "}
          {minutos(n)} min de lectura
          {doc.publicado_en &&
            ` · ${new Date(doc.publicado_en).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}`}
        </p>
        {doc.etiquetas.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 font-sans text-xs">
            {doc.etiquetas.map((t) => (
              <Link
                key={t}
                to="/"
                search={{ tag: t }}
                className="rounded-full border px-2.5 py-0.5 text-muted-foreground transition hover:border-ink/30 hover:text-ink"
              >
                {t}
              </Link>
            ))}
          </div>
        )}
        <div
          className={`prosa mt-10 ${p.capitular ? "capitular" : ""}`}
          style={{ fontSize: p.tam, lineHeight: p.linea }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(doc.contenido) }}
        />
        <p className="mt-16 text-center text-muted-foreground">⁂</p>
      </article>

      {sel && !cita && (
        <div
          className="glass absolute z-40 flex -translate-x-1/2 gap-1 rounded-2xl p-1.5 font-sans text-xs text-foreground"
          style={{ left: sel.x, top: sel.y }}
        >
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              navigator.clipboard.writeText(sel.texto);
              toast.success("Copiado");
            }}
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 hover:bg-secondary"
          >
            <Copy className="h-4 w-4" />
            Copiar
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setCita(sel.texto)}
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 hover:bg-secondary"
          >
            <Quote className="h-4 w-4" />
            Cita
          </button>
        </div>
      )}

      {cita && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-foreground/60 p-5 font-sans"
          onClick={() => setCita(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`rounded-3xl bg-card p-7 text-card-foreground shadow-float ${formato === "cuadrado" ? "aspect-square w-80 flex flex-col justify-center" : "w-full max-w-md"}`}
          >
            <blockquote className="border-l-4 border-primary pl-4 text-2xl font-bold leading-snug">
              {cita}
            </blockquote>
            <p className="mt-5 text-sm font-semibold">{doc.autor || "Anónimo"}</p>
            <p className="text-sm">{doc.titulo}</p>
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-md items-center gap-2 rounded-3xl bg-card p-2"
          >
            <div className="flex flex-1 rounded-full bg-secondary p-1 text-sm">
              {(["ancho", "cuadrado"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormato(f)}
                  className={`flex-1 rounded-full py-2 capitalize ${formato === f ? "bg-card font-semibold shadow-float" : "text-muted-foreground"}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `“${cita}” — ${doc.autor || "Anónimo"}, ${doc.titulo}`,
                );
                toast.success("Cita copiada");
              }}
              className="rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground"
            >
              Copiar
            </button>
            <button
              onClick={() => setCita(null)}
              className="grid h-10 w-10 place-items-center rounded-full bg-secondary"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {compartir && <CompartirModal doc={doc} onCerrar={() => setCompartir(false)} />}
    </div>
  );
}
