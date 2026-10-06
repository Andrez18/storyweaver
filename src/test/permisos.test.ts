import { describe, expect, it } from "vitest";

import { puedeEditar, type Escrito } from "@/lib/store";

const obra: Escrito = {
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
  user_id: "autor-1",
};

describe("puedeEditar", () => {
  it("permite editar al autor de la obra", () => {
    expect(puedeEditar(obra, "autor-1")).toBe(true);
  });

  it("bloquea a cualquier otro usuario", () => {
    expect(puedeEditar(obra, "otro-usuario")).toBe(false);
  });

  it("bloquea sin sesión iniciada", () => {
    expect(puedeEditar(obra, null)).toBe(false);
  });

  it("bloquea obras sin user_id", () => {
    const { user_id: _sinUser, ...sinDueno } = obra;
    expect(puedeEditar(sinDueno, "autor-1")).toBe(false);
  });

  it("compara por id exacto", () => {
    expect(puedeEditar(obra, "autor-1 ")).toBe(false);
    expect(puedeEditar({ ...obra, user_id: "otro" }, "autor-1")).toBe(false);
  });
});
