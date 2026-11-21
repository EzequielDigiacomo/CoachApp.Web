# CoachApp.Web

Frontend React 19 + Vite 8 + TypeScript para CoachApp (coaching de canotaje).

## Scripts

```bash
npm install
npm run dev      # Vite en http://localhost:5173
npm run build
npm run lint
npm test
```

## Muestra UI (Konsta + Ionic, estilo Mac)

Prototipo visual aislado (no reemplaza la app actual):

```text
http://localhost:5173/muestra.html
```

Chrome de ventana macOS + sidebar; adentro podés alternar **Konsta UI** (theme ios) e **Ionic** (mode ios). Datos de ejemplo.

## API en desarrollo

El proxy de Vite reenvía `/api` a la API.

```bash
# API local (Visual Studio, puerto 5203)
# .env.local
VITE_API_PROXY=http://127.0.0.1:5203
```

Sin `.env.local`, el default apunta al deploy en Render (ver `vite.config.ts`).

Producción (Vercel): `vercel.json` reescribe `/api/*` hacia el host de la API.

## Auth y roles

- Login → JWT en `localStorage` (`coachapp.token`)
- Roles: `SuperAdmin`, `Entrenador` (staff), `Atleta`
- Guards: `RutaProtegida`, `RutaStaff`

## Estructura

- `src/api` — cliente HTTP (AbortSignal), claves React Query y módulos de dominio
- `src/consultas` — `ProveedorConsultas` (TanStack Query)
- `src/auth` — contexto y guards
- `src/paginas` — pantallas (lazy por ruta)
- `src/componentes` — UI reutilizable
- `src/tipos` — DTOs alineados a la API

## Notas

- No levantar la API .NET desde acá: el usuario la inicia en Visual Studio (evita lock de DLL).
- Listados de entrenamientos piden `tamano=200` por defecto (paginación en API).
- React Query cancela requests viejos al cambiar filtros; 409/429 tienen mensajes claros.
