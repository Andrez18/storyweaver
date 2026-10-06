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

let clienteWeb: SupabaseClient | null = null;
let clienteServidor: SupabaseClient | null = null;

/**
 * Cliente de Supabase. En el navegador mantiene la sesión del usuario; en el
 * servidor solo lee (sin sesión), para poder SSR las obras publicadas.
 */
export function sb(): SupabaseClient | null {
  if (!URL || !KEY) return null;
  if (typeof window === "undefined") {
    if (!clienteServidor)
      clienteServidor = createClient(URL, KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
    return clienteServidor;
  }
  if (!clienteWeb) clienteWeb = createClient(URL, KEY);
  return clienteWeb;
}
export const usaNube = () => Boolean(URL && KEY);

const LS = "escritos.v1";
const leerLocal = (): Escrito[] => {
  if (typeof localStorage === "undefined") return [];
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

export const TAMANO_PAGINA = 50;

export type Filtro = { q?: string; tag?: string; desde?: number; limite?: number };

/** Limpia el texto de búsqueda para que no rompa el filtro `.or()` de PostgREST. */
export function normalizarBusqueda(consulta: string): string {
  return consulta
    .replace(/[,%()*\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

/** Filtra en memoria (modo local): obras por texto y por etiqueta. */
export function filtrarLocal(docs: Escrito[], f: Filtro, soloPublicados = true): Escrito[] {
  const q = normalizarBusqueda(f.q ?? "").toLowerCase();
  const tag = (f.tag ?? "").trim().toLowerCase();
  let l = soloPublicados ? docs.filter((e) => e.estado === "publicado") : [...docs];
  if (q) l = l.filter((e) => `${e.titulo} ${e.subtitulo} ${e.contenido}`.toLowerCase().includes(q));
  if (tag) l = l.filter((e) => e.etiquetas.some((t) => t.toLowerCase() === tag));
  l = l.sort((a, b) => b.actualizado.localeCompare(a.actualizado));
  const desde = f.desde ?? 0;
  const limite = f.limite ?? TAMANO_PAGINA;
  return l.slice(desde, desde + limite);
}

/** Obras publicadas con búsqueda, etiqueta y paginación. */
export async function buscarPublicados(f: Filtro): Promise<Escrito[]> {
  const c = sb();
  const desde = f.desde ?? 0;
  const limite = f.limite ?? TAMANO_PAGINA;
  if (c) {
    let q = c.from("escritos").select("*").eq("estado", "publicado");
    const texto = normalizarBusqueda(f.q ?? "");
    if (texto) q = q.or(`titulo.ilike.*${texto}*,subtitulo.ilike.*${texto}*`);
    const tag = (f.tag ?? "").trim();
    if (tag) q = q.contains("etiquetas", [tag]);
    const { data, error } = await q
      .order("actualizado", { ascending: false })
      .range(desde, desde + limite - 1);
    if (error) throw error;
    return (data ?? []) as Escrito[];
  }
  return filtrarLocal(leerLocal(), { ...f, desde, limite });
}

/** Obras publicadas de un autor (solo existe con sesión y nube). */
export async function publicadosDe(userId: string): Promise<Escrito[]> {
  const c = sb();
  if (!c) return [];
  const { data, error } = await c
    .from("escritos")
    .select("*")
    .eq("user_id", userId)
    .eq("estado", "publicado")
    .order("actualizado", { ascending: false });
  if (error) throw error;
  return data as Escrito[];
}

/** Perfil público: lo que se muestra en /autor y nada más. El correo nunca
 *  se guarda aquí ni se consulta para el público. */
export type Perfil = {
  id: string;
  nombre: string;
  biografia: string;
  ubicacion: string;
  enlace: string;
  avatar_url: string;
  actualizado?: string;
};

export const PERFIL_VACIO: Omit<Perfil, "id"> = {
  nombre: "",
  biografia: "",
  ubicacion: "",
  enlace: "",
  avatar_url: "",
};

const PERFIL_LOCAL = "escritos.perfil";

function leerPerfilLocal(): Perfil {
  const base: Perfil = { id: "local", ...PERFIL_VACIO };
  if (typeof localStorage === "undefined") return base;
  let p: Partial<Perfil> = {};
  try {
    p = JSON.parse(localStorage.getItem(PERFIL_LOCAL) || "{}");
  } catch {
    p = {};
  }
  return {
    ...base,
    ...p,
    id: "local",
    nombre: p.nombre || localStorage.getItem("escritos.autor") || "",
  };
}

/** Perfil público de un autor. */
export async function perfil(id: string): Promise<Perfil | null> {
  const c = sb();
  if (!c) return leerPerfilLocal();
  const { data } = await c
    .from("perfiles")
    .select("id, nombre, biografia, ubicacion, enlace, avatar_url, actualizado")
    .eq("id", id)
    .maybeSingle();
  return (data as Perfil) ?? null;
}

export async function guardarPerfil(p: Omit<Perfil, "id">): Promise<void> {
  const limpio = {
    nombre: p.nombre.trim().slice(0, 80),
    biografia: p.biografia.trim().slice(0, 400),
    ubicacion: p.ubicacion.trim().slice(0, 80),
    enlace: p.enlace.trim().slice(0, 200),
    avatar_url: p.avatar_url.trim().slice(0, 400),
    actualizado: new Date().toISOString(),
  };
  const c = sb();
  if (!c) {
    localStorage.setItem(PERFIL_LOCAL, JSON.stringify(limpio));
    return;
  }
  const uid = await uidActual();
  if (!uid) throw new Error("Inicia sesión para editar tu perfil");
  const { error } = await c.from("perfiles").upsert({ id: uid, ...limpio });
  if (error) throw error;
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

export async function miPerfil(): Promise<Perfil | null> {
  const c = sb();
  if (!c) return leerPerfilLocal();
  const { data: u } = await c.auth.getUser();
  if (!u.user) return null;
  return (await perfil(u.user.id)) ?? { id: u.user.id, ...PERFIL_VACIO };
}
