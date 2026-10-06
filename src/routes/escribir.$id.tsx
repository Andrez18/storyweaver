import { createFileRoute, Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { Placeholder, Focus } from "@tiptap/extensions";
import { toast } from "sonner";
import {
  ChevronLeft,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Quote,
  List,
  ListOrdered,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignJustify,
  Undo2,
  Redo2,
  Eye,
  Focus as FocusIcon,
  Download,
  Trash2,
  Type,
} from "lucide-react";
import {
  FUENTES,
  fuenteCss,
  guardar,
  obtener,
  eliminar,
  esAutor,
  nuevoEscrito,
  palabras,
  minutos,
  uidActual,
  usaNube,
  type Escrito,
} from "@/lib/store";

export const Route = createFileRoute("/escribir/$id")({
  head: () => ({
    meta: [
      { title: "Escribir — Escritos" },
      { name: "description", content: "Editor con formato para escribir y publicar tus textos." },
      { property: "og:title", content: "Escribir — Escritos" },
      {
        property: "og:description",
        content: "Editor con formato para escribir y publicar tus textos.",
      },
    ],
  }),
  component: Escribir,
});

function Escribir() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [doc, setDoc] = useState<Escrito | null>(null);
  const [bloqueo, setBloqueo] = useState<"no-existe" | "no-autor" | "error" | null>(null);
  const [ajeno, setAjeno] = useState<Escrito | null>(null);
  const [enfoque, setEnfoque] = useState(false);
  const [meta, setMeta] = useState(1000);
  const [estado, setEstado] = useState("Guardado");
  const [panel, setPanel] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendiente = useRef<Escrito | null>(null);

  // En la nube, solo quien tiene sesión puede abrir el editor.
  useEffect(() => {
    if (!usaNube()) return;
    let vivo = true;
    uidActual().then((u) => {
      if (vivo && !u) nav({ to: "/entrar" });
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  // Aviso del navegador si quedan cambios sin guardar al cerrar la pestaña.
  useBlocker({
    shouldBlockFn: () => false,
    enableBeforeUnload: () => pendiente.current !== null,
  });

  useEffect(() => {
    setMeta(Number(localStorage.getItem("escritos.meta") || 1000));
    setDoc(null);
    setBloqueo(null);
    setAjeno(null);
    if (id === "nuevo") {
      setDoc(nuevoEscrito());
      return;
    }
    let vivo = true;
    obtener(id)
      .then(async (d) => {
        if (!vivo) return;
        if (!d) return setBloqueo("no-existe");
        const ok = await esAutor(d);
        if (!vivo) return;
        if (ok) setDoc(d);
        else {
          setAjeno(d);
          setBloqueo("no-autor");
        }
      })
      .catch(() => vivo && setBloqueo("error"));
    return () => {
      vivo = false;
    };
  }, [id]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Highlight,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Placeholder.configure({ placeholder: "Había una vez…" }),
        Focus.configure({ mode: "deepest" }),
      ],
      content: doc?.contenido ?? "",
      editorProps: { attributes: { class: "prosa min-h-[60vh] text-[1.2rem]" } },
      onUpdate: ({ editor }) => cambiar({ contenido: editor.getHTML() }),
    },
    [doc?.id],
  );

  function guardarAhora() {
    const n = pendiente.current;
    if (!n) return;
    clearTimeout(timer.current);
    pendiente.current = null;
    setEstado("Guardando…");
    guardar(n)
      .then(() => setEstado("Guardado"))
      .catch((e) => setEstado(e.message));
  }

  // Si la pestaña se oculta o se cierra, guarda lo último sin esperar al temporizador.
  useEffect(() => {
    const ocultar = () => {
      if (document.visibilityState === "hidden") guardarAhora();
    };
    document.addEventListener("visibilitychange", ocultar);
    window.addEventListener("pagehide", guardarAhora);
    return () => {
      document.removeEventListener("visibilitychange", ocultar);
      window.removeEventListener("pagehide", guardarAhora);
    };
  }, []);

  function cambiar(p: Partial<Escrito>) {
    setDoc((d) => {
      if (!d) return d;
      const n = { ...d, ...p };
      pendiente.current = n;
      setEstado("Sin guardar…");
      clearTimeout(timer.current);
      timer.current = setTimeout(guardarAhora, 1200);
      return n;
    });
  }

  async function publicar() {
    if (!doc) return;
    if (!doc.titulo.trim()) {
      toast.error("Dale un título a tu obra");
      return;
    }
    if (usaNube() && !(await uidActual())) {
      toast.error("Inicia sesión para publicar");
      nav({ to: "/entrar" });
      return;
    }
    const n: Escrito = {
      ...doc,
      contenido: editor?.getHTML() ?? doc.contenido,
      estado: "publicado",
      publicado_en: doc.publicado_en ?? new Date().toISOString(),
    };
    try {
      await guardar(n);
      toast.success("¡Obra publicada!");
      nav({ to: "/obra/$id", params: { id: n.id } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function exportar() {
    if (!doc) return;
    const html = `<!doctype html><meta charset="utf-8"><title>${doc.titulo}</title><body style="max-width:680px;margin:60px auto;font-family:${fuenteCss(doc.fuente)};line-height:1.7;font-size:20px"><h1>${doc.titulo}</h1><p><em>${doc.subtitulo}</em></p>${doc.contenido}</body>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = `${doc.titulo || "escrito"}.html`;
    a.click();
  }

  if (bloqueo) return <SinAcceso motivo={bloqueo} doc={ajeno} />;
  if (!doc) return <p className="p-10 text-center text-muted-foreground">Cargando…</p>;
  const n = palabras(doc.contenido);

  return (
    <div className="min-h-screen bg-paper pb-40">
      <header className="sticky top-0 z-20 mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3">
        <Link
          to="/"
          className="glass grid h-10 w-10 place-items-center rounded-full"
          aria-label="Volver"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <span className="truncate text-xs text-muted-foreground">{estado}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPanel(!panel)}
            className="glass grid h-10 w-10 place-items-center rounded-full"
            aria-label="Ajustes"
          >
            <Type className="h-4 w-4" />
          </button>
          <button
            onClick={() => setEnfoque(!enfoque)}
            className={`glass grid h-10 w-10 place-items-center rounded-full ${enfoque ? "bg-highlight" : ""}`}
            aria-label="Modo enfoque"
          >
            <FocusIcon className="h-4 w-4" />
          </button>
          {doc.estado === "publicado" && (
            <Link
              to="/obra/$id"
              params={{ id: doc.id }}
              className="glass grid h-10 w-10 place-items-center rounded-full"
              aria-label="Ver"
            >
              <Eye className="h-4 w-4" />
            </Link>
          )}
          <button
            onClick={publicar}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            {doc.estado === "publicado" ? "Actualizar" : "Publicar"}
          </button>
        </div>
      </header>

      {panel && (
        <div className="glass fixed right-4 top-16 z-30 w-72 rounded-3xl p-5 text-sm">
          <p className="mb-2 font-semibold">Tipografía de la obra</p>
          <div className="grid grid-cols-2 gap-2">
            {FUENTES.map((f) => (
              <button
                key={f.id}
                onClick={() => cambiar({ fuente: f.id })}
                style={{ fontFamily: f.css }}
                className={`rounded-xl px-3 py-2 text-left ${doc.fuente === f.id ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
              >
                {f.nombre}
              </button>
            ))}
          </div>
          <label className="mt-4 block font-semibold">Autor</label>
          <input
            value={doc.autor}
            onChange={(e) => cambiar({ autor: e.target.value })}
            className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 outline-none"
            placeholder="Tu nombre"
          />
          <label className="mt-3 block font-semibold">Etiquetas</label>
          <input
            value={doc.etiquetas.join(", ")}
            onChange={(e) =>
              cambiar({
                etiquetas: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 outline-none"
            placeholder="poesía, cuento"
          />
          <label className="mt-3 block font-semibold">Meta de palabras</label>
          <input
            type="number"
            value={meta}
            onChange={(e) => {
              setMeta(+e.target.value);
              localStorage.setItem("escritos.meta", e.target.value);
            }}
            className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 outline-none"
          />
          <div className="mt-4 flex gap-2">
            <button
              onClick={exportar}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-secondary py-2"
            >
              <Download className="h-4 w-4" /> Exportar
            </button>
            <button
              onClick={async () => {
                if (confirm("¿Eliminar este escrito?")) {
                  await eliminar(doc.id);
                  nav({ to: "/" });
                }
              }}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-secondary py-2 text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Eliminar
            </button>
          </div>
        </div>
      )}

      <main
        className={`mx-auto max-w-2xl px-6 pt-10 ${enfoque ? "enfoque" : ""}`}
        style={{ fontFamily: fuenteCss(doc.fuente) }}
      >
        <textarea
          rows={1}
          value={doc.titulo}
          onChange={(e) => cambiar({ titulo: e.target.value })}
          placeholder="Título"
          className="w-full resize-none bg-transparent text-4xl font-semibold leading-tight text-ink outline-none placeholder:text-muted-foreground/50 sm:text-5xl"
        />
        <input
          value={doc.subtitulo}
          onChange={(e) => cambiar({ subtitulo: e.target.value })}
          placeholder="Subtítulo (opcional)"
          className="mt-2 w-full bg-transparent text-xl italic text-muted-foreground outline-none"
        />
        <div className="mt-8">
          <EditorContent editor={editor} />
        </div>
      </main>

      {editor && <Barra editor={editor} />}

      <footer className="fixed bottom-24 left-1/2 z-10 -translate-x-1/2 text-xs text-muted-foreground sm:bottom-6 sm:left-6 sm:translate-x-0">
        {n} / {meta} palabras · {minutos(n)} min
        <div className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(100, (n / meta) * 100)}%` }}
          />
        </div>
      </footer>
    </div>
  );
}

function Barra({ editor }: { editor: Editor }) {
  const [, re] = useState(0);
  useEffect(() => {
    const f = () => re((x) => x + 1);
    editor.on("transaction", f);
    return () => {
      editor.off("transaction", f);
    };
  }, [editor]);
  const c = () => editor.chain().focus();
  const B = ({
    on,
    act,
    label,
    children,
  }: {
    on: () => void;
    act?: boolean;
    label: string;
    children: React.ReactNode;
  }) => (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      aria-label={label}
      title={label}
      className={`grid h-9 min-w-9 shrink-0 place-items-center rounded-xl px-2 text-sm ${act ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
    >
      {children}
    </button>
  );
  return (
    <div className="glass fixed bottom-4 left-1/2 z-20 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-2xl p-1.5">
      <B
        label="Título 1"
        act={editor.isActive("heading", { level: 1 })}
        on={() => c().toggleHeading({ level: 1 }).run()}
      >
        H1
      </B>
      <B
        label="Título 2"
        act={editor.isActive("heading", { level: 2 })}
        on={() => c().toggleHeading({ level: 2 }).run()}
      >
        H2
      </B>
      <B
        label="Título 3"
        act={editor.isActive("heading", { level: 3 })}
        on={() => c().toggleHeading({ level: 3 }).run()}
      >
        H3
      </B>
      <span className="mx-1 h-5 w-px shrink-0 bg-border" />
      <B label="Negrita" act={editor.isActive("bold")} on={() => c().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </B>
      <B label="Cursiva" act={editor.isActive("italic")} on={() => c().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </B>
      <B
        label="Subrayado"
        act={editor.isActive("underline")}
        on={() => c().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </B>
      <B label="Tachado" act={editor.isActive("strike")} on={() => c().toggleStrike().run()}>
        <Strikethrough className="h-4 w-4" />
      </B>
      <B label="Resaltar" act={editor.isActive("highlight")} on={() => c().toggleHighlight().run()}>
        <Highlighter className="h-4 w-4" />
      </B>
      <span className="mx-1 h-5 w-px shrink-0 bg-border" />
      <B label="Cita" act={editor.isActive("blockquote")} on={() => c().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </B>
      <B label="Lista" act={editor.isActive("bulletList")} on={() => c().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </B>
      <B
        label="Lista numerada"
        act={editor.isActive("orderedList")}
        on={() => c().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </B>
      <B label="Separador de escena" on={() => c().setHorizontalRule().run()}>
        <Minus className="h-4 w-4" />
      </B>
      <span className="mx-1 h-5 w-px shrink-0 bg-border" />
      <B
        label="Izquierda"
        act={editor.isActive({ textAlign: "left" })}
        on={() => c().setTextAlign("left").run()}
      >
        <AlignLeft className="h-4 w-4" />
      </B>
      <B
        label="Centrar"
        act={editor.isActive({ textAlign: "center" })}
        on={() => c().setTextAlign("center").run()}
      >
        <AlignCenter className="h-4 w-4" />
      </B>
      <B
        label="Justificar"
        act={editor.isActive({ textAlign: "justify" })}
        on={() => c().setTextAlign("justify").run()}
      >
        <AlignJustify className="h-4 w-4" />
      </B>
      <span className="mx-1 h-5 w-px shrink-0 bg-border" />
      <B label="Deshacer" on={() => c().undo().run()}>
        <Undo2 className="h-4 w-4" />
      </B>
      <B label="Rehacer" on={() => c().redo().run()}>
        <Redo2 className="h-4 w-4" />
      </B>
    </div>
  );
}

function SinAcceso({
  motivo,
  doc,
}: {
  motivo: "no-existe" | "no-autor" | "error";
  doc?: Escrito | null;
}) {
  const leer = motivo === "no-autor" && doc?.estado === "publicado";
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-paper px-6 text-center">
      <p className="max-w-lg font-serif text-3xl text-ink">
        {motivo === "no-autor"
          ? "Solo el autor puede editar esta obra"
          : motivo === "error"
            ? "No pudimos cargar esta obra"
            : "No encontramos esta obra"}
      </p>
      <p className="max-w-md text-sm text-muted-foreground">
        {motivo === "no-autor"
          ? "Esta obra pertenece a otro escritor: puedes leerla tal cual, pero no modificarla."
          : motivo === "error"
            ? "Revisa tu conexión e inténtalo otra vez."
            : "Puede que se haya eliminado o que el enlace sea incorrecto."}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {leer && (
          <Link
            to="/obra/$id"
            params={{ id: doc!.id }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Leer la obra
          </Link>
        )}
        <Link to="/" className="rounded-full bg-secondary px-5 py-2.5 text-sm font-medium">
          Volver al inicio
        </Link>
        <Link
          to="/escribir/$id"
          params={{ id: "nuevo" }}
          className="rounded-full bg-secondary px-5 py-2.5 text-sm font-medium"
        >
          Empezar una nueva
        </Link>
      </div>
    </div>
  );
}
