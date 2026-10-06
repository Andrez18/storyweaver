import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { sb, usaNube } from "@/lib/store";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar — Escritos" },
      { name: "description", content: "Inicia sesión para escribir y publicar tus textos." },
      { property: "og:title", content: "Entrar — Escritos" },
      { property: "og:description", content: "Inicia sesión para escribir y publicar tus textos." },
    ],
  }),
  component: Entrar,
});

type Modo = "entrar" | "crear";

function traducirError(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials"))
    return "Correo o contraseña incorrectos";
  if (m.includes("user not found")) return "No hay cuenta con ese correo";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Ese correo ya tiene cuenta";
  if (m.includes("password") && m.includes("6"))
    return "La contraseña necesita al menos 6 caracteres";
  if (m.includes("link") && m.includes("expired")) return "El enlace caducó. Pide uno nuevo";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiados intentos, espera un momento";
  if (m.includes("email not confirmed")) return "Confirma tu correo antes de entrar";
  return mensaje;
}

function Entrar() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [nombrePublico, setNombrePublico] = useState("");
  const [modo, setModo] = useState<Modo>("entrar");
  const [ocupado, setOcupado] = useState(false);

  // Enlace que llega de Supabase: confirmación de correo (?code=).
  useEffect(() => {
    const c = sb();
    if (!c) return;
    const p = new URLSearchParams(location.search);
    const codigo = p.get("code");
    const error = p.get("error_description") || p.get("error");
    if (error) {
      toast.error(traducirError(decodeURIComponent(error)));
      nav({ to: "/entrar", search: {}, replace: true });
      return;
    }
    if (!codigo) return;
    setOcupado(true);
    c.auth
      .exchangeCodeForSession(codigo)
      .then(({ error: e }) => {
        if (e) {
          toast.error(traducirError(e.message));
          nav({ to: "/entrar", search: {}, replace: true });
          return;
        }
        nav({ to: "/entrar", search: {}, replace: true });
        setModo("entrar");
        toast.success("¡Correo confirmado!", {
          description: "Ya puedes entrar con tu contraseña.",
        });
      })
      .finally(() => setOcupado(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- procesa el enlace una sola vez
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const c = sb();
    if (!c || ocupado) return;
    setOcupado(true);
    try {
      if (modo === "entrar") {
        const { error } = await c.auth.signInWithPassword({ email, password: pass });
        if (error) {
          toast.error(traducirError(error.message));
          return;
        }
        toast.success("Bienvenido");
        nav({ to: "/" });
      } else if (modo === "crear") {
        // El enlace de confirmación vuelve a /entrar?code=..., donde lo canjeamos.
        const { data, error } = await c.auth.signUp({
          email,
          password: pass,
          options: {
            emailRedirectTo: `${location.origin}/entrar`,
            data: { nombre: nombrePublico.trim() },
          },
        });
        if (error) {
          toast.error(traducirError(error.message));
          return;
        }
        if (data.session) {
          toast.success("Cuenta creada");
          nav({ to: "/" });
        } else {
          toast.success("Cuenta creada", { description: "Revisa tu correo para confirmarla." });
        }
      }
    } finally {
      setOcupado(false);
    }
  }

  async function reenviarConfirmacion() {
    const c = sb();
    if (!c || !email) {
      toast.error("Escribe tu correo primero");
      return;
    }
    const { error } = await c.auth.resend({ type: "signup", email });
    if (error) {
      toast.error(traducirError(error.message));
      return;
    }
    toast.success("Correo reenviado", { description: "Revisa también la carpeta de spam." });
  }

  const titulos: Record<Modo, string> = {
    entrar: "Entrar.",
    crear: "Crear cuenta.",
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={enviar} className="w-full max-w-sm rounded-3xl bg-card p-8 shadow-float">
        <h1 className="text-3xl font-bold">{titulos[modo]}</h1>

        {!usaNube() ? (
          <p className="mt-4 text-muted-foreground">
            La app funciona ahora guardando en este dispositivo. Conecta tu base de datos para
            publicar en línea.{" "}
            <Link to="/" className="underline">
              Volver
            </Link>
          </p>
        ) : (
          <>
            <input
              className="mt-6 w-full rounded-xl bg-secondary px-4 py-3 outline-none"
              type="email"
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="mt-3 w-full rounded-xl bg-secondary px-4 py-3 outline-none"
              type="password"
              placeholder="Contraseña"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
              minLength={6}
            />
            {modo === "crear" && (
              <>
                <input
                  className="mt-3 w-full rounded-xl bg-secondary px-4 py-3 outline-none"
                  placeholder="Nombre público (aparece junto a tus obras)"
                  value={nombrePublico}
                  onChange={(e) => setNombrePublico(e.target.value)}
                  maxLength={80}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Tu correo solo se usa para entrar; nunca se muestra públicamente.
                </p>
              </>
            )}
            <button
              disabled={ocupado}
              className="mt-5 w-full rounded-full bg-primary py-3 font-medium text-primary-foreground disabled:opacity-60"
            >
              {ocupado ? "Un momento…" : "Continuar"}
            </button>

            {modo === "entrar" ? (
              <button
                type="button"
                onClick={() => setModo("crear")}
                className="mt-3 w-full text-sm text-muted-foreground"
              >
                ¿No tienes cuenta? Crear una
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setModo("entrar")}
                  className="mt-3 w-full text-sm text-muted-foreground"
                >
                  Ya tengo cuenta
                </button>
                <button
                  type="button"
                  onClick={() => void reenviarConfirmacion()}
                  className="mt-2 w-full text-sm text-muted-foreground underline"
                >
                  Reenviar correo de confirmación
                </button>
              </>
            )}
          </>
        )}
      </form>
    </div>
  );
}
