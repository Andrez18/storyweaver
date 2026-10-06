import { describe, expect, it } from "vitest";

import { filtrarLocal, normalizarBusqueda, type Escrito } from "@/lib/store";

const doc = (s: Partial<Escrito>): Escrito => ({
  id: "id",
  user_id: "user",
  titulo: "",
  subtitulo: "",
  contenido: "",
  fuente: "libre",
  etiquetas: [],
  estado: "publicado",
  actualizado: "2024-01-01T00:00:00.000Z",
  creado: "2024-01-01T00:00:00.000Z",
  publicado_en: "2024-01-01T00:00:00.000Z",
  autor: "Autor",
  ...s,
});

describe("normalizarBusqueda", () => {
  it("quita caracteres especiales de PostgREST y limita el largo", () => {
    expect(normalizarBusqueda("  hola, (mundo)%*  ")).toBe("hola mundo");
    expect(normalizarBusqueda("x".repeat(200)).length).toBe(100);
  });
});

describe("filtrarLocal", () => {
  const docs = [
    doc({
      id: "1",
      titulo: "La noche azul",
      contenido: "relatos de mar",
      etiquetas: ["poesía"],
      actualizado: "2024-03-01",
    }),
    doc({
      id: "2",
      titulo: "Amanecer",
      subtitulo: "un cuento de nieve",
      etiquetas: ["relato", "nieve"],
      actualizado: "2024-04-01",
    }),
    doc({ id: "3", titulo: "Borrador viejo", estado: "borrador", actualizado: "2024-05-01" }),
  ];

  it("solo publicadas por defecto, más recientes primero", () => {
    expect(filtrarLocal(docs, {}).map((e) => e.id)).toEqual(["2", "1"]);
  });

  it("incluye borradores cuando se pide", () => {
    expect(filtrarLocal(docs, {}, false).map((e) => e.id)).toEqual(["3", "2", "1"]);
  });

  it("filtra por palabras en título, subtítulo o contenido", () => {
    expect(filtrarLocal(docs, { q: "nieve" }).map((e) => e.id)).toEqual(["2"]);
    expect(filtrarLocal(docs, { q: "relatos" }).map((e) => e.id)).toEqual(["1"]);
    expect(filtrarLocal(docs, { q: "zzz" })).toEqual([]);
  });

  it("filtra por etiqueta exacta e ignora mayúsculas", () => {
    expect(filtrarLocal(docs, { tag: "Poesía" }).map((e) => e.id)).toEqual(["1"]);
    expect(filtrarLocal(docs, { tag: "inexistente" })).toEqual([]);
  });

  it("pagina con desde/limite", () => {
    const pagina1 = filtrarLocal(docs, { desde: 0, limite: 1 }, false);
    const pagina2 = filtrarLocal(docs, { desde: 1, limite: 1 }, false);
    expect(pagina1.map((e) => e.id)).toEqual(["3"]);
    expect(pagina2.map((e) => e.id)).toEqual(["2"]);
    expect(filtrarLocal(docs, { desde: 5, limite: 2 }, false)).toEqual([]);
  });
});
