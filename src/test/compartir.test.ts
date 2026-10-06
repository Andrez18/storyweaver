import { describe, expect, it } from "vitest";

import { FORMATOS, nombreArchivo, redes, slug, textoCompartir } from "@/lib/compartir";
import type { Escrito } from "@/lib/store";

const doc: Escrito = {
  id: "abc-123",
  titulo: "La calma después de nosotros",
  subtitulo: "",
  contenido: "<p>El amor real no siempre llega cuando estamos listos.</p>",
  fuente: "newsreader",
  etiquetas: [],
  estado: "publicado",
  autor: "Andrés Gómez",
  creado: "2026-01-01T00:00:00.000Z",
  actualizado: "2026-01-01T00:00:00.000Z",
  publicado_en: "2026-01-01T00:00:00.000Z",
};

describe("compartir", () => {
  it("convierte el título en un slug apto para nombre de archivo", () => {
    expect(slug(doc.titulo)).toBe("la-calma-despues-de-nosotros");
    expect(slug("  ¡Hola,   Mundo!  ")).toBe("hola-mundo");
    expect(slug("")).toBe("");
  });

  it("genera un nombre de archivo por formato", () => {
    expect(nombreArchivo(doc, "vertical")).toBe("la-calma-despues-de-nosotros-vertical.png");
    expect(nombreArchivo({ ...doc, titulo: "" }, "cuadrado")).toBe("escrito-cuadrado.png");
  });

  it("arma el texto de compartir con título, autor y enlace", () => {
    expect(textoCompartir(doc, "https://ejemplo.com/obra/abc-123")).toBe(
      "“La calma después de nosotros” — Andrés Gómez\nhttps://ejemplo.com/obra/abc-123",
    );
    expect(textoCompartir({ ...doc, autor: "" }, "https://x.test")).toBe(
      "“La calma después de nosotros”\nhttps://x.test",
    );
  });

  it("codifica el texto en los enlaces de cada red", () => {
    const url = "https://ejemplo.com/obra/abc-123";
    const texto = textoCompartir(doc, url);

    expect(redes.whatsapp(texto)).toContain("https://wa.me/?text=");
    expect(redes.whatsapp(texto)).toContain(encodeURIComponent(texto));
    expect(redes.x(texto, url)).toContain("twitter.com/intent/tweet");
    expect(redes.x(texto, url)).toContain(`url=${encodeURIComponent(url)}`);
    expect(redes.facebook(url)).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    );
    expect(redes.telegram(texto, url)).toContain("t.me/share/url");
  });

  it("ofrece formatos verticales y cuadrados de 1080 px", () => {
    expect(FORMATOS.vertical).toEqual({ ancho: 1080, alto: 1350, nombre: "4:5" });
    expect(FORMATOS.cuadrado).toEqual({ ancho: 1080, alto: 1080, nombre: "1:1" });
  });
});
