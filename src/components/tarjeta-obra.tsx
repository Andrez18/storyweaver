import { Link } from "@tanstack/react-router";

import { extracto, fuenteCss, minutos, palabras, type Escrito } from "@/lib/store";

type Props = { escrito: Escrito; destino: "obra" | "escribir" };

export function TarjetaObra({ escrito, destino }: Props) {
  const n = palabras(escrito.contenido);
  return (
    <Link
      to={destino === "obra" ? "/obra/$id" : "/escribir/$id"}
      params={{ id: escrito.id }}
      className="group rounded-3xl bg-card p-7 shadow-float transition hover:-translate-y-0.5"
    >
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        {escrito.estado === "borrador" ? (
          <span className="rounded-full bg-secondary px-2 py-0.5">Borrador</span>
        ) : (
          <span className="rounded-full bg-highlight px-2 py-0.5 text-accent-foreground">
            Publicado
          </span>
        )}
        <span>
          {minutos(n)} min · {n} palabras
        </span>
      </div>
      <h2
        className="text-2xl font-semibold leading-tight"
        style={{ fontFamily: fuenteCss(escrito.fuente) }}
      >
        {escrito.titulo || "Sin título"}
      </h2>
      {escrito.subtitulo && <p className="mt-1 text-muted-foreground">{escrito.subtitulo}</p>}
      <p
        className="mt-4 line-clamp-3 leading-relaxed text-foreground/80"
        style={{ fontFamily: fuenteCss(escrito.fuente) }}
      >
        {extracto(escrito.contenido)}
      </p>
      {escrito.autor && <p className="mt-5 text-sm font-medium">{escrito.autor}</p>}
    </Link>
  );
}
