import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PenLine, LogIn, LogOut } from "lucide-react";
import { miPerfil, listar, extracto, palabras, minutos, fuenteCss, usaNube, sb, type Escrito } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Escritos — biblioteca de textos publicados" },
      { name: "description", content: "Lee y publica escritos con formato, tipografías cuidadas y modo lectura." },
      { property: "og:title", content: "Escritos — biblioteca de textos publicados" },
      { property: "og:description", content: "Lee y publica escritos con formato, tipografías cuidadas y modo lectura." },
    ],
  }),
  component: Index,
});

function Index() {
  const [tab, setTab] = useState<"publicados" | "todos">("publicados");
  const [items, setItems] = useState<Escrito[] | null>(null);
  const [logueado, setLogueado] = useState(!usaNube());
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    const c = sb();
    if (!c) return;
    const cargar = () => miPerfil().then((p) => { setLogueado(Boolean(p)); setNombre(p?.nombre ?? ""); });
    cargar();
    const { data } = c.auth.onAuthStateChange((ev) => {
      if (ev === "SIGNED_IN" || ev === "SIGNED_OUT" || ev === "USER_UPDATED") cargar();
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    setItems(null);
    listar(tab === "publicados").then(setItems).catch(() => setItems([]));
  }, [tab]);

  return (
    <div className="min-h-screen pb-24">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 pt-6">
        <span className="font-serif text-xl font-semibold">Escritos</span>
        {logueado ? (
          <div className="flex items-center gap-2">
          {usaNube() && (
            <button onClick={async () => { await sb()?.auth.signOut(); setTab("publicados"); }} className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm" title="Cerrar sesión">
              <span className="max-w-32 truncate">{nombre}</span> <LogOut className="h-4 w-4" />
            </button>
          )}
          <Link to="/escribir/$id" params={{ id: "nuevo" }} className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
            <PenLine className="h-4 w-4" /> Escribir
          </Link>
          </div>
        ) : (
          <Link to="/entrar" className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
            <LogIn className="h-4 w-4" /> Entrar
          </Link>
        )}
      </header>

      <section className="mx-auto max-w-3xl px-5 pt-20 pb-14 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">Escritos.</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground sm:text-2xl">
          Escribe con calma, da formato a cada línea y publica para ser leído.
        </p>
      </section>

      <div className="mx-auto mb-8 flex max-w-xs rounded-full bg-secondary p-1 text-sm">
        {(["publicados", ...(logueado ? ["todos"] : [])] as ("publicados" | "todos")[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 font-medium transition ${tab === t ? "bg-card shadow-float" : "text-muted-foreground"}`}
          >
            {t === "publicados" ? "Publicados" : "Mi escritorio"}
          </button>
        ))}
      </div>

      <main className="mx-auto grid max-w-5xl gap-5 px-5 sm:grid-cols-2">
        {items === null && <p className="col-span-full text-center text-muted-foreground">Cargando…</p>}
        {items?.length === 0 && (
          <div className="col-span-full rounded-3xl bg-card p-10 text-center shadow-float">
            <p className="font-serif text-2xl">Aún no hay escritos aquí.</p>
            <Link to={logueado ? "/escribir/$id" : "/entrar"} params={{ id: "nuevo" }} className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
              Empieza tu primer texto
            </Link>
          </div>
        )}
        {items?.map((e) => {
          const n = palabras(e.contenido);
          return (
            <Link
              key={e.id}
              to={e.estado === "publicado" && tab === "publicados" ? "/obra/$id" : "/escribir/$id"}
              params={{ id: e.id }}
              className="group rounded-3xl bg-card p-7 shadow-float transition hover:-translate-y-0.5"
            >
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                {e.estado === "borrador" ? (
                  <span className="rounded-full bg-secondary px-2 py-0.5">Borrador</span>
                ) : (
                  <span className="rounded-full bg-highlight px-2 py-0.5 text-accent-foreground">Publicado</span>
                )}
                <span>{minutos(n)} min · {n} palabras</span>
              </div>
              <h2 className="text-2xl font-semibold leading-tight" style={{ fontFamily: fuenteCss(e.fuente) }}>
                {e.titulo || "Sin título"}
              </h2>
              {e.subtitulo && <p className="mt-1 text-muted-foreground">{e.subtitulo}</p>}
              <p className="mt-4 line-clamp-3 leading-relaxed text-foreground/80" style={{ fontFamily: fuenteCss(e.fuente) }}>
                {extracto(e.contenido)}
              </p>
              {e.autor && <p className="mt-5 text-sm font-medium">{e.autor}</p>}
            </Link>
          );
        })}
      </main>
    </div>
  );
}
