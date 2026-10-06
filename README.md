# story-weaver

Escribe, da formato y publica tus textos con una lectura cuidada.

## Stack

- TanStack Start (SSR)
- React + TypeScript
- Tailwind CSS 4
- Supabase
- Vite + Vitest + ESLint + Prettier

## Requisitos

- Node.js 22+
- [pnpm](https://pnpm.io) (`corepack enable pnpm` o `npm i -g pnpm`)

## Desarrollo

```sh
pnpm install
pnpm dev
```

## Scripts

| Comando          | Descripción                  |
| ---------------- | ---------------------------- |
| `pnpm dev`       | Servidor de desarrollo       |
| `pnpm build`     | Build de producción          |
| `pnpm preview`   | Vista previa del build       |
| `pnpm lint`      | ESLint                       |
| `pnpm format`    | Formateo con Prettier        |
| `pnpm test`      | Tests con Vitest             |
| `pnpm test:watch`| Vitest en modo watch         |

## Estructura

```
src/
  components/   Componentes UI (shadcn/ui)
  lib/          Utilidades, cliente Supabase, store
  routes/       Rutas TanStack Router
  supabase/     Esquema SQL
  server.ts     Entrada del servidor SSR (manejo de errores)
  start.ts      Middleware de TanStack Start
```
