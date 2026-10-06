import { extracto, fuenteCss, minutos, palabras, type Escrito } from "./store";

export type FormatoImagen = "vertical" | "cuadrado";

export const FORMATOS = {
  vertical: { ancho: 1080, alto: 1350, nombre: "4:5" },
  cuadrado: { ancho: 1080, alto: 1080, nombre: "1:1" },
} as const;

const RESPALDOS = {
  papel: "rgb(248, 247, 244)",
  tinta: "rgb(43, 42, 39)",
  tenue: "rgb(122, 119, 111)",
  acento: "rgb(246, 231, 158)",
};

type Bloque = { margen: number; alto: number; pintar: (y: number) => void };

function translucido(color: string, alfa: number): string {
  return color.startsWith("rgb(") ? `rgba(${color.slice(4, -1)}, ${alfa})` : color;
}

// Lee una custom property de CSS y la devuelve como color que el canvas entiende.
// Si el navegador no sabe parsear el valor (p. ej. oklch antiguo), se queda con el respaldo.
function colorDe(variable: string, respaldo: string): string {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  if (!valor) return respaldo;
  const c = document.createElement("canvas");
  c.width = 1;
  c.height = 1;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return respaldo;
  ctx.fillStyle = "#010203";
  ctx.fillRect(0, 0, 1, 1);
  const antes = ctx.getImageData(0, 0, 1, 1).data;
  const marca = [antes[0], antes[1], antes[2]];
  ctx.fillStyle = valor;
  ctx.fillRect(0, 0, 1, 1);
  const despues = ctx.getImageData(0, 0, 1, 1).data;
  if (despues[0] === marca[0] && despues[1] === marca[1] && despues[2] === marca[2])
    return respaldo;
  return `rgb(${despues[0]}, ${despues[1]}, ${despues[2]})`;
}

function leerPaleta() {
  return {
    papel: colorDe("--paper", RESPALDOS.papel),
    tinta: colorDe("--ink", RESPALDOS.tinta),
    tenue: colorDe("--muted-foreground", RESPALDOS.tenue),
    acento: colorDe("--highlight", RESPALDOS.acento),
  };
}

function redondeado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radio = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radio, y);
  ctx.arcTo(x + w, y, x + w, y + h, radio);
  ctx.arcTo(x + w, y + h, x, y + h, radio);
  ctx.arcTo(x, y + h, x, y, radio);
  ctx.arcTo(x, y, x + w, y, radio);
  ctx.closePath();
}

function partirTexto(ctx: CanvasRenderingContext2D, texto: string, anchoMax: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (ctx.measureText(candidata).width <= anchoMax) {
      actual = candidata;
      continue;
    }
    if (actual) {
      lineas.push(actual);
      actual = "";
    }
    if (ctx.measureText(palabra).width <= anchoMax) {
      actual = palabra;
      continue;
    }
    let trozo = "";
    for (const ch of palabra) {
      if (ctx.measureText(trozo + ch).width <= anchoMax) trozo += ch;
      else {
        if (trozo) lineas.push(trozo);
        trozo = ch;
      }
    }
    actual = trozo;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function conPuntosSuspensivos(lineas: string[], maxLineas: number): string[] {
  if (lineas.length <= maxLineas) return lineas;
  const recortadas = lineas.slice(0, maxLineas);
  const ultima = recortadas[recortadas.length - 1]!;
  recortadas[recortadas.length - 1] = `${ultima.trimEnd()}…`;
  return recortadas;
}

function ajustarTitulo(
  ctx: CanvasRenderingContext2D,
  texto: string,
  familia: string,
  anchoMax: number,
  maxLineas: number,
  tamMax: number,
  tamMin: number,
): { tam: number; lineas: string[] } {
  for (let tam = tamMax; tam >= tamMin; tam -= 2) {
    ctx.font = `600 ${tam}px ${familia}`;
    const lineas = partirTexto(ctx, texto, anchoMax);
    if (lineas.length <= maxLineas) return { tam, lineas };
  }
  ctx.font = `600 ${tamMin}px ${familia}`;
  return {
    tam: tamMin,
    lineas: conPuntosSuspensivos(partirTexto(ctx, texto, anchoMax), maxLineas),
  };
}

async function cargarFuentes(familia: string): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const especificaciones = [
    `600 92px ${familia}`,
    `400 44px ${familia}`,
    `italic 400 44px ${familia}`,
    "600 34px Figtree, system-ui, sans-serif",
    "400 26px Figtree, system-ui, sans-serif",
  ];
  await Promise.all(especificaciones.map((e) => document.fonts.load(e).catch(() => [])));
  await document.fonts.ready.catch(() => undefined);
}

/**
 * Dibuja una tarjeta editorial (1080 px de ancho) lista para el feed de Instagram
 * o cualquier red: título con la tipografía de la obra, extracto, autor y marca.
 */
export async function generarImagenCompartir(doc: Escrito, formato: FormatoImagen): Promise<Blob> {
  const medidas = FORMATOS[formato];
  const lienzo = document.createElement("canvas");
  lienzo.width = medidas.ancho;
  lienzo.height = medidas.alto;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no puede generar la imagen");

  const familia = fuenteCss(doc.fuente);
  await cargarFuentes(familia);

  const p = leerPaleta();
  const { ancho, alto } = medidas;
  const vertical = formato === "vertical";
  const sans = "Figtree, system-ui, sans-serif";
  const cx = ancho / 2;
  const soporteEspaciado = "letterSpacing" in ctx;
  const espaciado = (px: number) => {
    if (soporteEspaciado) ctx.letterSpacing = `${px}px`;
  };

  ctx.fillStyle = p.papel;
  ctx.fillRect(0, 0, ancho, alto);

  const m = 56;
  ctx.lineWidth = 3;
  ctx.strokeStyle = translucido(p.tinta, 0.16);
  redondeado(ctx, m, m, ancho - m * 2, alto - m * 2, 48);
  ctx.stroke();

  const margenLateral = vertical ? 150 : 130;
  const anchoTexto = ancho - margenLateral * 2;
  const interior = { y: m + 80, alto: alto - m * 2 - 160 };

  const titulo = doc.titulo.trim() || "Sin título";
  const subtitulo = doc.subtitulo.trim();
  const textoExtracto = extracto(doc.contenido, vertical ? 300 : 220);
  const totalPalabras = palabras(doc.contenido);
  const host = typeof location !== "undefined" ? location.hostname.replace(/^www\./, "") : "";
  const publicado = doc.estado === "publicado";

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const dibujarLineas = (lineas: string[], y: number, lh: number) => {
    for (let i = 0; i < lineas.length; i++) ctx.fillText(lineas[i]!, cx, y + lh * i + lh / 2);
  };

  const pintarPildora = (y: number) => {
    ctx.font = `600 24px ${sans}`;
    const etiqueta = "PUBLICADO";
    const w = ctx.measureText(etiqueta).width + 52;
    ctx.fillStyle = p.acento;
    redondeado(ctx, cx - w / 2, y, w, 56, 28);
    ctx.fill();
    ctx.fillStyle = p.tinta;
    ctx.fillText(etiqueta, cx, y + 30);
  };

  const construir = (maxTitulo: number, maxSubtitulo: number, maxExtracto: number): Bloque[] => {
    const bloques: Bloque[] = [];

    if (publicado) bloques.push({ margen: 0, alto: 56, pintar: pintarPildora });

    bloques.push({
      margen: publicado ? 44 : 0,
      alto: 40,
      pintar: (y) => {
        ctx.font = `600 30px ${sans}`;
        ctx.fillStyle = p.tinta;
        espaciado(12);
        ctx.fillText("ESCRITOS", cx + 6, y + 20);
        espaciado(0);
      },
    });

    bloques.push({
      margen: 16,
      alto: 54,
      pintar: (y) => {
        ctx.font = `400 42px ${familia}`;
        ctx.fillStyle = p.tenue;
        ctx.fillText("⁂", cx, y + 27);
      },
    });

    const ajuste = ajustarTitulo(
      ctx,
      titulo,
      familia,
      anchoTexto,
      maxTitulo,
      vertical ? 88 : 76,
      vertical ? 54 : 48,
    );
    const lhTitulo = Math.round(ajuste.tam * 1.18);
    bloques.push({
      margen: 36,
      alto: ajuste.lineas.length * lhTitulo,
      pintar: (y) => {
        ctx.font = `600 ${ajuste.tam}px ${familia}`;
        ctx.fillStyle = p.tinta;
        dibujarLineas(ajuste.lineas, y, lhTitulo);
      },
    });

    if (subtitulo) {
      ctx.font = `italic 400 40px ${familia}`;
      const lineas = conPuntosSuspensivos(partirTexto(ctx, subtitulo, anchoTexto), maxSubtitulo);
      const lh = 58;
      bloques.push({
        margen: 24,
        alto: lineas.length * lh,
        pintar: (y) => {
          ctx.font = `italic 400 40px ${familia}`;
          ctx.fillStyle = p.tenue;
          dibujarLineas(lineas, y, lh);
        },
      });
    }

    bloques.push({
      margen: 48,
      alto: 3,
      pintar: (y) => {
        ctx.fillStyle = translucido(p.tinta, 0.25);
        ctx.fillRect(cx - 48, y, 96, 3);
      },
    });

    if (textoExtracto) {
      const f = vertical ? 40 : 36;
      const lh = Math.round(f * 1.65);
      ctx.font = `400 ${f}px ${familia}`;
      const lineas = conPuntosSuspensivos(partirTexto(ctx, textoExtracto, anchoTexto), maxExtracto);
      bloques.push({
        margen: 46,
        alto: lineas.length * lh,
        pintar: (y) => {
          ctx.font = `400 ${f}px ${familia}`;
          ctx.fillStyle = translucido(p.tinta, 0.88);
          dibujarLineas(lineas, y, lh);
        },
      });
    }

    bloques.push({
      margen: 56,
      alto: 1,
      pintar: (y) => {
        ctx.fillStyle = translucido(p.tinta, 0.14);
        ctx.fillRect(cx - anchoTexto / 2, y, anchoTexto, 1);
      },
    });

    bloques.push({
      margen: 26,
      alto: 50,
      pintar: (y) => {
        ctx.font = `600 34px ${sans}`;
        ctx.fillStyle = p.tinta;
        ctx.fillText(doc.autor.trim() || "Anónimo", cx, y + 25);
      },
    });

    bloques.push({
      margen: 4,
      alto: 40,
      pintar: (y) => {
        ctx.font = `400 26px ${sans}`;
        ctx.fillStyle = p.tenue;
        ctx.fillText(`${minutos(totalPalabras)} min de lectura`, cx, y + 20);
      },
    });

    if (host) {
      bloques.push({
        margen: 12,
        alto: 38,
        pintar: (y) => {
          ctx.font = `600 24px ${sans}`;
          ctx.fillStyle = translucido(p.tinta, 0.5);
          espaciado(5);
          ctx.fillText(host.toUpperCase(), cx + 2.5, y + 19);
          espaciado(0);
        },
      });
    }

    return bloques;
  };

  // El contenido crece según el texto: si no cabe en el marco, se recorta por
  // el extracto, luego el subtítulo y por último el título.
  let maxTitulo = vertical ? 4 : 3;
  let maxSubtitulo = 2;
  let maxExtracto = vertical ? 8 : 5;
  let bloques = construir(maxTitulo, maxSubtitulo, maxExtracto);
  let total = bloques.reduce((s, b) => s + b.margen + b.alto, 0);
  for (let i = 0; total > interior.alto && i < 24; i++) {
    if (maxExtracto > 2) maxExtracto--;
    else if (maxSubtitulo > 1) maxSubtitulo--;
    else if (maxTitulo > 2) maxTitulo--;
    else break;
    bloques = construir(maxTitulo, maxSubtitulo, maxExtracto);
    total = bloques.reduce((s, b) => s + b.margen + b.alto, 0);
  }

  // Si aún así no cabe, se comprimen los espacios y, en último recurso, se
  // escala el conjunto para que nada cruce el marco.
  const margenTotal = bloques.reduce((s, b) => s + b.margen, 0);
  let excedente = total - interior.alto;
  if (excedente > 0 && margenTotal > 0) {
    const factor = Math.max(0, 1 - excedente / margenTotal);
    for (const b of bloques) b.margen = Math.round(b.margen * factor);
    total = bloques.reduce((s, b) => s + b.margen + b.alto, 0);
    excedente = total - interior.alto;
  }
  const escala = excedente > 0 && total > 0 ? interior.alto / total : 1;

  const centroY = interior.y + total / 2;
  ctx.save();
  if (escala < 1) {
    ctx.translate(cx, centroY);
    ctx.scale(escala, escala);
    ctx.translate(-cx, -centroY);
  }
  let y = interior.y + Math.max(0, (interior.alto - total) / 2);
  for (const b of bloques) {
    y += b.margen;
    b.pintar(y);
    y += b.alto;
  }
  ctx.restore();

  return await new Promise<Blob>((resolve, reject) => {
    lienzo.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo exportar la imagen"))),
      "image/png",
    );
  });
}

export function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function nombreArchivo(doc: Escrito, formato: FormatoImagen): string {
  return `${slug(doc.titulo) || "escrito"}-${formato}.png`;
}

export function textoCompartir(doc: Escrito, url: string): string {
  const autor = doc.autor.trim() ? ` — ${doc.autor.trim()}` : "";
  return `“${doc.titulo.trim() || "Sin título"}”${autor}\n${url}`;
}

export type ResultadoCompartir = "compartido" | "cancelado" | "sin-soporte";

/** Comparte la imagen con el menú nativo del sistema (Instagram, WhatsApp, Telegram…). */
export async function compartirImagen(
  blob: Blob,
  doc: Escrito,
  url: string,
): Promise<ResultadoCompartir> {
  const archivo = new File([blob], nombreArchivo(doc, "vertical"), { type: "image/png" });
  const datos: ShareData = {
    files: [archivo],
    title: doc.titulo.trim() || "Escrito",
    text: textoCompartir(doc, url),
  };
  if (!navigator.canShare?.(datos)) return "sin-soporte";
  try {
    await navigator.share(datos);
    return "compartido";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "cancelado";
    throw error;
  }
}

export function descargarImagen(blob: Blob, nombre: string): void {
  const enlace = document.createElement("a");
  const url = URL.createObjectURL(blob);
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
