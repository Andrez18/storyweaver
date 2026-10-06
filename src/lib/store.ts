import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Estado = "borrador" | "publicado";
export type Escrito = {
  id: string;
  titulo: string;
  subtitulo: string;
  contenido: string; // HTML con formato
  fuente: string;
  etiquetas: string[];
  estado: Estado;
  autor: string;
  creado: string;
  actualizado: string;
  publicado_en: string | null;
  user_id?: string;
};

const URL = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const KEY = (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
  import.meta.env["VITE_SUPABASE_ANON_KEY"]) as string | undefined;

let client: SupabaseClient | null = null;
export function sb(): SupabaseClient | null {
  if (!URL || !KEY || typeof window === "undefined") return null;
  if (!client) client = createClient(URL, KEY);
  return client;
}
export const usaNube = () => Boolean(URL && KEY);

const LS = "escritos.v1";
const leerLocal = (): Escrito[] => {
  try {
    return JSON.parse(localStorage.getItem(LS) || "[]");
  } catch {
    return [];
  }
};
const guardarLocal = (l: Escrito[]) => localStorage.setItem(LS, JSON.stringify(l));

export function nuevoEscrito(): Escrito {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    titulo: "",
    subtitulo: "",
    contenido: "",
    fuente: "newsreader",
    etiquetas: [],
    estado: "borrador",
    autor: localStorage.getItem("escritos.autor") || "",
    creado: now,
    actualizado: now,
    publicado_en: null,
  };
}

export async function listar(soloPublicados: boolean): Promise<Escrito[]> {
  const c = sb();
  if (c) {
    let q = c.from("escritos").select("*").order("actualizado", { ascending: false });
    if (soloPublicados) q = q.eq("estado", "publicado");
    else {
      const { data: u } = await c.auth.getUser();
      if (!u.user) return [];
      q = q.eq("user_id", u.user.id);
    }
    const { data, error } = await q;
    if (error) throw error;
    return data as Escrito[];
  }
  const l = leerLocal().sort((a, b) => b.actualizado.localeCompare(a.actualizado));
  return soloPublicados ? l.filter((e) => e.estado === "publicado") : l;
}

export async function obtener(id: string): Promise<Escrito | null> {
  const c = sb();
  if (c) {
    const { data } = await c.from("escritos").select("*").eq("id", id).maybeSingle();
    return (data as Escrito) ?? null;
  }
  return leerLocal().find((e) => e.id === id) ?? null;
}

export async function uidActual(): Promise<string | null> {
  const c = sb();
  if (!c) return null;
  const { data } = await c.auth.getUser();
  return data.user?.id ?? null;
}

export function puedeEditar(doc: Escrito, uid: string | null): boolean {
  if (!uid || !doc.user_id) return false;
  return doc.user_id === uid;
}

export async function esAutor(doc: Escrito): Promise<boolean> {
  if (!usaNube()) return true;
  return puedeEditar(doc, await uidActual());
}

export async function guardar(e: Escrito): Promise<void> {
  e.actualizado = new Date().toISOString();
  localStorage.setItem("escritos.autor", e.autor);
  const c = sb();
  if (c) {
    const { data: u } = await c.auth.getUser();
    if (!u.user) throw new Error("Inicia sesión para guardar en la nube");
    if (e.user_id && !puedeEditar(e, u.user.id))
      throw new Error("Solo el autor de la obra puede editarla");
    if (!e.autor) e.autor = (await miPerfil())?.nombre ?? "";
    const { error } = await c.from("escritos").upsert({ ...e, user_id: u.user.id });
    if (error) throw error;
    return;
  }
  const l = leerLocal().filter((x) => x.id !== e.id);
  guardarLocal([e, ...l]);
}

export async function eliminar(id: string): Promise<void> {
  const c = sb();
  if (c) {
    const { error } = await c.from("escritos").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  guardarLocal(leerLocal().filter((x) => x.id !== id));
}

export function palabras(html: string) {
  const t = html.replace(/<[^>]+>/g, " ").trim();
  return t ? t.split(/\s+/).length : 0;
}
export const minutos = (n: number) => Math.max(1, Math.round(n / 220));
export const extracto = (html: string, n = 180) => {
  const t = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
};

export const FUENTES = [
  { id: "newsreader", nombre: "Newsreader", css: "'Newsreader', Georgia, serif" },
  { id: "garamond", nombre: "EB Garamond", css: "'EB Garamond', Garamond, serif" },
  { id: "lora", nombre: "Lora", css: "'Lora', Georgia, serif" },
  { id: "literata", nombre: "Literata", css: "'Literata', Georgia, serif" },
  { id: "playfair", nombre: "Playfair", css: "'Playfair Display', serif" },
  { id: "figtree", nombre: "Figtree", css: "'Figtree', system-ui, sans-serif" },
  { id: "mono", nombre: "Plex Mono", css: "'IBM Plex Mono', monospace" },
];
export const fuenteCss = (id: string) => (FUENTES.find((f) => f.id === id) ?? FUENTES[0]!).css;

export async function miPerfil(): Promise<{ id: string; nombre: string } | null> {
  const c = sb();
  if (!c) return null;
  const { data: u } = await c.auth.getUser();
  if (!u.user) return null;
  const { data } = await c.from("perfiles").select("id, nombre").eq("id", u.user.id).maybeSingle();
  return data ?? { id: u.user.id, nombre: u.user.email?.split("@")[0] ?? "" };
}
