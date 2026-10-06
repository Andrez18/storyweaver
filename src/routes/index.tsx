import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PenLine, LogIn, LogOut, Search, User, X } from "lucide-react";
import { TarjetaObra } from "@/components/tarjeta-obra";
import {
  TAMANO_PAGINA,
  buscarPublicados,
  filtrarLocal,
  listar,
  miPerfil,
  sb,
  usaNube,
  type Escrito,
} from "@/lib/store";

type Busqueda = { q?: string; tag?: string };

function conBusqueda(s: Busqueda, cambios: Busqueda): Busqueda {
  const n = { ...s, ...cambios };
  const r: Busqueda = {};
  if (n.q) r.q = n.q;
  if (n.tag) r.tag = n.tag;
  return r;
}

export const Route = createFileRoute("/")({
  validateSearch: (b: Record<string, unknown>): { q?: string; tag?: string } => {
    const r: { q?: string; tag?: string } = {};
    if (typeof b["q"] === "string" && b["q"].trim()) r.q = b["q"].trim();
    if (typeof b["tag"] === "string" && b["tag"].trim()) r.tag = b["tag"].trim();
    return r;
  },
  head: () => ({
    meta: [
      { title: "Escritos — biblioteca de textos publicados" },
      {
        name: "description",
        content: "Lee y publica escritos con formato, tipografías cuidadas y modo lectura.",
      },
      { property: "og:title", content: "Escritos — biblioteca de textos publicados" },
      {
        property: "og:description",
        content: "Lee y publica escritos con formato, tipografías cuidadas y modo lectura.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { q = "", tag = "" } = Route.useSearch();
  const nav = useNavigate();
  const [tab, setTab] = useState<"publicados" | "todos">("publicados");
  const [texto, setTexto] = useState(q);
  const [items, setItems] = useState<Escrito[] | null>(null);
  const [pagina, setPagina] = useState(1);
  const [logueado, setLogueado] = useState(!usaNube());
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    const c = sb();
    if (!c) return;
    const cargar = () =>
      miPerfil().then((p) => {
        setLogueado(Boolean(p));
        setNombre(p?.nombre ?? "");
      });
    cargar();
    const { data } = c.auth.onAuthStateChange((ev) => {
      if (ev === "SIGNED_IN" || ev === "SIGNED_OUT" || ev === "USER_UPDATED") cargar();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // El buscador escribe en la URL (compartible) con un pequeño rebote.
  useEffect(() => setTexto(q), [q]);
  useEffect(() => {
    if (texto === q) return;
    const t = setTimeout(
      () => nav({ to: "/", search: (s) => conBusqueda(s, { q: texto }), replace: true }),
      350,
    );
    return () => clearTimeout(t);
  }, [texto, q, nav]);

  useEffect(() => setPagina(1), [q, tag, tab]);

  useEffect(() => {
    let vivo = true;
    setItems(null);
    const f = { q, tag, desde: 0, limite: TAMANO_PAGINA * pagina };
    const cargar =
      tab === "publicados"
        ? buscarPublicados(f)
        : listar(false).then((l) => filtrarLocal(l, f, false));
    cargar.then((l) => vivo && setItems(l)).catch(() => vivo && setItems([]));
    return () => {
      vivo = false;
    };
  }, [q, tag, tab, pagina]);

  const etiquetas = [...new Set((items ?? []).flatMap((e) => e.etiquetas))].slice(0, 12);
  const filtrando = Boolean(q || tag);
  const hayMas = Boolean(items && items.length === TAMANO_PAGINA * pagina);
  const limpiar = () => nav({ to: "/", search: () => ({}) });

  return (
    <div className="min-h-screen pb-24">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 pt-6">
        <span className="font-serif text-xl font-semibold">Escritos</span>
        {logueado ? (
          <div className="flex items-center gap-2">
            <Link
              to="/perfil"
              className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
              title="Mi perfil"
            >
              <span className="max-w-32 truncate">{nombre || "Mi perfil"}</span>
              <User className="h-4 w-4" />
            </Link>
            {usaNube() && (
              <button
                onClick={async () => {
                  await sb()?.auth.signOut();
                  setTab("publicados");
                }}
                className="glass grid h-9 w-9 place-items-center rounded-full"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
            <Link
              to="/escribir/$id"
              params={{ id: "nuevo" }}
              className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
            >
              <PenLine className="h-4 w-4" /> Escribir
            </Link>
          </div>
        ) : (
          <Link
            to="/entrar"
            className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
          >
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

      <div className="mx-auto mb-5 flex max-w-md items-center gap-2 rounded-full bg-secondary px-4 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar por título o subtítulo…"
          aria-label="Buscar obras"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {texto && (
          <button
            onClick={() => setTexto("")}
            aria-label="Limpiar búsqueda"
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="mx-auto mb-6 flex max-w-xs rounded-full bg-secondary p-1 text-sm">
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

      {(etiquetas.length > 0 || tag) && (
        <div className="mx-auto mb-7 flex max-w-5xl flex-wrap justify-center gap-2 px-5 text-xs">
          {tag && (
            <button
              onClick={() => nav({ to: "/", search: (s) => conBusqueda(s, { tag: "" }) })}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 font-medium text-primary-foreground"
              aria-label={`Quitar etiqueta ${tag}`}
            >
              #{tag} <X className="h-3 w-3" />
            </button>
          )}
          {etiquetas
            .filter((t) => t !== tag)
            .map((t) => (
              <button
                key={t}
                onClick={() => nav({ to: "/", search: (s) => conBusqueda(s, { tag: t }) })}
                className="rounded-full bg-secondary px-3 py-1.5 transition hover:bg-secondary/70"
              >
                #{t}
              </button>
            ))}
        </div>
      )}

      <main className="mx-auto grid max-w-5xl gap-5 px-5 sm:grid-cols-2">
        {items === null && (
          <p className="col-span-full text-center text-muted-foreground">Cargando…</p>
        )}
        {items?.length === 0 && (
          <div className="col-span-full rounded-3xl bg-card p-10 text-center shadow-float">
            <p className="font-serif text-2xl">
              {filtrando ? "No hay nada con esa búsqueda." : "Aún no hay escritos aquí."}
            </p>
            {filtrando ? (
              <button
                onClick={limpiar}
                className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Quitar filtros
              </button>
            ) : (
              <Link
                to={logueado ? "/escribir/$id" : "/entrar"}
                params={{ id: "nuevo" }}
                className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Empieza tu primer texto
              </Link>
            )}
          </div>
        )}
        {items?.map((e) => (
          <TarjetaObra
            key={e.id}
            escrito={e}
            destino={e.estado === "publicado" && tab === "publicados" ? "obra" : "escribir"}
          />
        ))}
        {hayMas && (
          <div className="col-span-full flex justify-center pt-2">
            <button
              onClick={() => setPagina((p) => p + 1)}
              className="rounded-full bg-secondary px-5 py-2.5 text-sm font-medium transition hover:bg-secondary/70"
            >
              Cargar más
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
