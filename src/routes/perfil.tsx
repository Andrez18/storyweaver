import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { guardarPerfil, miPerfil, usaNube, type Perfil } from "@/lib/store";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil — Escritos" },
      {
        name: "description",
        content:
          "Edita tu nombre público, biografía, ubicación y enlaces. Tu correo nunca se muestra.",
      },
    ],
  }),
  component: PerfilPagina,
});

type Campos = Omit<Perfil, "id">;

const CAMPOS: { k: keyof Campos; etiqueta: string; ayuda: string }[] = [
  { k: "nombre", etiqueta: "Nombre público", ayuda: "Aparece junto a tus obras." },
  {
    k: "biografia",
    etiqueta: "Biografía",
    ayuda: "Dos o tres líneas sobre ti (máx. 400 caracteres).",
  },
  { k: "ubicacion", etiqueta: "Ubicación", ayuda: "Ciudad o país. Opcional." },
  { k: "enlace", etiqueta: "Enlace", ayuda: "Tu web, blog o red social. Opcional." },
  { k: "avatar_url", etiqueta: "Foto de perfil", ayuda: "URL de una imagen. Opcional." },
];

function PerfilPagina() {
  const nav = useNavigate();
  const [f, setF] = useState<Campos | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    miPerfil().then((p) => {
      if (!vivo) return;
      if (!p) {
        nav({ to: "/entrar" });
        return;
      }
      setId(p.id);
      setF({
        nombre: p.nombre,
        biografia: p.biografia,
        ubicacion: p.ubicacion,
        enlace: p.enlace,
        avatar_url: p.avatar_url,
      });
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    setGuardando(true);
    try {
      await guardarPerfil(f);
      toast.success("Perfil guardado", {
        description: "Tu página pública ya muestra estos datos.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el perfil");
    } finally {
      setGuardando(false);
    }
  }

  const inicial = (f?.nombre || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen pb-24">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-6">
        <Link
          to="/"
          className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
        >
          ← Escritos
        </Link>
        {id && (
          <Link
            to="/autor/$id"
            params={{ id }}
            className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
          >
            Ver mi página pública
          </Link>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-5 pt-12">
        <h1 className="text-4xl font-bold tracking-tight">Mi perfil.</h1>
        <p className="mt-3 text-muted-foreground">
          Esto es lo que verá quien abra tu página pública.{" "}
          <span className="text-foreground">Tu correo no aparece en ninguna parte.</span>
        </p>

        {!usaNube() && (
          <p className="mt-4 rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
            Guardando en este dispositivo. Conecta la base de datos para tener perfil público.
          </p>
        )}

        {f && (
          <form onSubmit={guardar} className="mt-8 rounded-3xl bg-card p-7 shadow-float">
            <div className="mb-6 flex items-center gap-4">
              {f.avatar_url ? (
                <img
                  src={f.avatar_url}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-full bg-secondary text-2xl font-semibold">
                  {inicial}
                </span>
              )}
              <div>
                <p className="text-lg font-medium">{f.nombre || "Sin nombre público"}</p>
                <p className="text-sm text-muted-foreground">
                  {f.ubicacion || "Sin ubicación"}
                  {f.enlace && ` · ${f.enlace}`}
                </p>
              </div>
            </div>

            <div className="grid gap-5">
              {CAMPOS.map((c) => (
                <label key={c.k} className="block">
                  <span className="text-sm font-medium">{c.etiqueta}</span>
                  {c.k === "biografia" ? (
                    <textarea
                      value={f[c.k]}
                      onChange={(e) => setF({ ...f, [c.k]: e.target.value })}
                      rows={3}
                      maxLength={400}
                      placeholder="Escribe aquí…"
                      className="mt-1.5 w-full resize-none rounded-xl bg-secondary px-4 py-3 text-sm outline-none"
                    />
                  ) : (
                    <input
                      value={f[c.k]}
                      onChange={(e) => setF({ ...f, [c.k]: e.target.value })}
                      maxLength={400}
                      placeholder={
                        c.k === "nombre"
                          ? "Cómo quieres que te llamen"
                          : c.k === "enlace"
                            ? "https://…"
                            : c.k === "avatar_url"
                              ? "https://…/foto.jpg"
                              : "Madrid, España"
                      }
                      className="mt-1.5 w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none"
                    />
                  )}
                  <span className="mt-1 block text-xs text-muted-foreground">{c.ayuda}</span>
                </label>
              ))}
            </div>

            <div className="mt-7 flex items-center gap-3">
              <button
                disabled={guardando}
                className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {guardando ? "Guardando…" : "Guardar perfil"}
              </button>
              <Link to="/" className="text-sm text-muted-foreground">
                Volver
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
