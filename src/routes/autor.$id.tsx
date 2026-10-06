import { createFileRoute, Link } from "@tanstack/react-router";

import { TarjetaObra } from "@/components/tarjeta-obra";
import { perfil, publicadosDe } from "@/lib/store";

export const Route = createFileRoute("/autor/$id")({
  loader: async ({ params }) => ({
    autor: await perfil(params.id),
    obras: await publicadosDe(params.id),
  }),
  head: ({ loaderData, params }) => {
    const nombre = loaderData?.autor?.nombre?.trim() || "Autor";
    const descripcion = `Obras publicadas de ${nombre} en Escritos.`;
    const sitio = (import.meta.env["VITE_SITE_URL"] as string | undefined)?.replace(/\/+$/, "");
    return {
      meta: [
        { title: `${nombre} — Escritos` },
        { name: "description", content: descripcion },
        { property: "og:title", content: `${nombre} — Escritos` },
        { property: "og:description", content: descripcion },
        { property: "og:image", content: sitio ? `${sitio}/og.png` : "/og.png" },
      ],
      links: [
        {
          rel: "canonical",
          href: sitio ? `${sitio}/autor/${params.id}` : `/autor/${params.id}`,
        },
      ],
    };
  },
  component: Autor,
});

function Autor() {
  const { autor, obras } = Route.useLoaderData();
  const nombre = autor?.nombre?.trim() || "Autor";
  const bio = autor?.biografia?.trim() || "";
  const lugar = autor?.ubicacion?.trim() || "";
  const enlace = autor?.enlace?.trim() || "";
  const foto = autor?.avatar_url?.trim() || "";

  return (
    <div className="min-h-screen pb-24">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 pt-6">
        <Link
          to="/"
          className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
        >
          ← Escritos
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-5 pt-16 pb-10 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Autor</p>
        {foto && (
          <img
            src={foto}
            alt=""
            className="mx-auto mt-5 h-24 w-24 rounded-full object-cover shadow-float"
          />
        )}
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{nombre}</h1>
        {lugar && <p className="mt-3 text-sm text-muted-foreground">{lugar}</p>}
        {bio && <p className="mx-auto mt-4 max-w-xl leading-relaxed text-foreground/80">{bio}</p>}
        {enlace && (
          <a
            href={enlace}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm font-medium underline-offset-4 hover:underline"
          >
            {enlace.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        )}
        <p className="mt-5 text-muted-foreground">
          {obras.length === 0
            ? "Todavía no ha publicado obras."
            : obras.length === 1
              ? "1 obra publicada"
              : `${obras.length} obras publicadas`}
        </p>
        {!autor && (
          <p className="mt-2 text-sm text-muted-foreground">
            (Este autor todavía no tiene perfil público.)
          </p>
        )}
      </section>

      <main className="mx-auto grid max-w-5xl gap-5 px-5 sm:grid-cols-2">
        {obras.map((e) => (
          <TarjetaObra key={e.id} escrito={e} destino="obra" />
        ))}
      </main>
    </div>
  );
}
