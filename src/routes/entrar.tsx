import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
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

function Entrar() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [modo, setModo] = useState<"entrar" | "crear">("entrar");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const c = sb();
    if (!c) return;
    const { error } =
      modo === "entrar"
        ? await c.auth.signInWithPassword({ email, password: pass })
        : await c.auth.signUp({ email, password: pass });
    if (error) { toast.error(error.message); return; }
    toast.success(modo === "entrar" ? "Bienvenido" : "Cuenta creada");
    nav({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={enviar} className="w-full max-w-sm rounded-3xl bg-card p-8 shadow-float">
        <h1 className="text-3xl font-bold">{modo === "entrar" ? "Entrar." : "Crear cuenta."}</h1>
        {!usaNube() ? (
          <p className="mt-4 text-muted-foreground">
            La app funciona ahora guardando en este dispositivo. Conecta tu base de datos para publicar en línea.{" "}
            <Link to="/" className="underline">Volver</Link>
          </p>
        ) : (
          <>
            <input className="mt-6 w-full rounded-xl bg-secondary px-4 py-3 outline-none" type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="mt-3 w-full rounded-xl bg-secondary px-4 py-3 outline-none" type="password" placeholder="Contraseña" value={pass} onChange={(e) => setPass(e.target.value)} required minLength={6} />
            <button className="mt-5 w-full rounded-full bg-primary py-3 font-medium text-primary-foreground">Continuar</button>
            <button type="button" onClick={() => setModo(modo === "entrar" ? "crear" : "entrar")} className="mt-3 w-full text-sm text-muted-foreground">
              {modo === "entrar" ? "¿No tienes cuenta? Crear una" : "Ya tengo cuenta"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
