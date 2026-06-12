# GloboBYM — Web + Panel de pedidos

Web de GloboBYM (@globobym_peru), boutique de globería en Lima, Perú. Dos unidades
de negocio: **decoración de eventos a domicilio** (cotizaciones) y próximamente
**venta de globos personalizados** (carrito de compras con Culqi).

## Stack

- **Astro 5** (output estático, sin frameworks de UI) + CSS propio (sin Tailwind)
- **Firebase**: Firestore (pedidos + métricas) y Auth (login del panel). SDK compat v10 por CDN.
- **Netlify**: hosting. Build `npm run build` → `dist/`. Config en `netlify.toml`.
- **GA4**: G-FX6KTT78Z1 (solo page_view; el tracking real son contadores en Firestore `metricas/general`).

## Estructura

- `src/pages/index.astro` — landing pública (eventos). Markup completo de secciones.
- `src/pages/admin.astro` — panel de pedidos (login, estados, tracking, resumen, export CSV).
- `src/layouts/BaseLayout.astro` — shell compartido (GA, favicon, slot "head").
- `src/components/Nav.astro`, `Footer.astro` — compartidos.
- `src/styles/global.css` — estilos de la landing. `admin.css` — estilos del panel.
- `public/js/main.js` — JS de la landing (modales, carrusel, formulario→Firestore, tracking).
- `public/js/admin.js` — JS del panel (auth, estados, métricas, gráficos Chart.js).
- `public/assets/` — imágenes optimizadas (~4MB). `_originals/` está gitignored.
- `firestore.rules` — reglas endurecidas. Aplicar a mano en Firebase Console → Firestore → Reglas.
- `actualizar-semana.ps1` — regenera `public/assets/semana/index.json` (carrusel "Decoraciones de esta semana").

## Comandos

- `npm run dev` — desarrollo local (localhost:4321)
- `npm run build` — genera `dist/`
- Deploy: push a `main` → Netlify build automático (cuando esté conectado a GitHub)

## Datos del negocio

- WhatsApp: +51 960 876 002 · Firebase project: `globobym`
- Packs decoración: 1=S/1999, 2=S/1399, 3=S/1099, 4=S/799, 5=S/650, Económico/Personalizado=precio manual
- Flujo de estados pedidos: Nuevo → Contactado → Separado(`pagado`) → Atendido → Venta(terminal, auto-24h).
  El estado interno sigue siendo `pagado` aunque la UI diga "Separado". Monto de separación: S/100.
- Cumpleaños dividido en "Cumpleaños Infantil" / "Cumpleaños Adulto" (pedidos viejos dicen "Cumpleaños" a secas).

## Decisiones tomadas

- Imágenes en el repo (no Cloudinary/Storage) — gratis y CDN de Netlify.
- Firebase SDK compat (no modular) — migración pendiente, no urgente.
- Métricas con contadores Firestore propios, no eventos GA4.
- Testimonios eliminados hasta tener reviews reales (los anteriores eran inventados).
- Stats hardcodeados (33K seguidores, 789 posts): actualizar a mano cuando cambien mucho.

## Tienda online (Fase 2 — construida, con datos demo)

- Catálogo: `src/data/productos.json` (fuente de verdad, ver `src/data/README.md`).
  Editar JSON + push = catálogo actualizado. NO hay admin de productos.
- Páginas: `/tienda/` (grid + filtro por categoría), `/tienda/<id>/` (detalle con
  color/dedicatoria/cantidad), `/checkout/` (envío + guardado en Firestore).
- Carrito: localStorage (`gb_cart_v1`), drawer compartido (`CartDrawer.astro` + `public/js/tienda.js`).
- Órdenes → colección `ordenes_tienda` (estado inicial `nuevo`).
  Flujo admin: nuevo → preparando → enviado → entregado (+ cancelado). Sección "🛍 Tienda" del panel.
- Pago: por ahora coordinado por WhatsApp (Fase 3 = Culqi).
- Los 4 productos actuales son DEMO con fotos prestadas — reemplazar cuando el cliente pase el catálogo real.

## Pendiente / Roadmap

- Reemplazar productos demo por catálogo real del cliente (fotos + precios + categorías).
- Fase 3 — Pago online Culqi: API routes de Astro + adapter (portable Netlify/Vercel),
  validación de precios server-side contra productos.json, webhook, emails transaccionales.
  Cliente ya tiene cuenta Culqi (POS); falta activar pagos online y obtener API keys.
- Decisión de hosting pendiente: usuario evalúa migrar de Netlify a Vercel Pro (consolidar
  proyectos). La arquitectura es portable: URLs formato directorio, sin features propietarias.
  Si se va a Vercel: crear vercel.json (headers + redirect /admin.html→/admin/) y usar adapter
  @astrojs/vercel en Fase 3.
- Conectar el hosting elegido a GitHub (obligatorio a más tardar en Fase 3 por las functions).
- Páginas legales (T&C, privacidad, devoluciones) — obligatorias antes de cobrar online.
- Aplicar `firestore.rules` en la consola Firebase (incluye reglas de `ordenes_tienda`).
- Zonas/costo de envío y stock: por confirmar con el cliente (hoy: "se coordina por WhatsApp").
