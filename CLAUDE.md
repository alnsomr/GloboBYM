# GloboBYM — Web + Tienda online + Panel de pedidos

Web de GloboBYM (@globobym_peru), boutique de globería en Lima, Perú. Dos unidades
de negocio: **decoración de eventos a domicilio** (cotizaciones) y **venta de globos
personalizados** (tienda online con carrito; pago online Culqi pendiente = Fase 3).

## Forma de trabajo (cómo colabora Claude)

### Pensamiento crítico (regla principal)
- Si el usuario pregunta si una idea es buena, **NO asumir que sí.** Analizarla de verdad y decir si es buena o no, con argumentos.
- **No decir lo que el usuario quiere leer.** Prefiere la verdad incómoda a la validación cómoda.
- Señalar riesgos, errores y puntos ciegos **aunque no los pida**. Priorizar lo realista sobre lo motivacional.

### Skill: "Pregunta al Concejo"
Cuando el usuario escriba **"Pregunta al Concejo"**, activarla. Aparecen 5 asesores con voz propia (pueden contradecirse):
1. **Asesor 1 — Espejo:** en qué se está equivocando y en qué acierta.
2. **Asesor 2 — Raíz:** qué intenta resolver de verdad (el problema detrás de la pregunta).
3. **Asesor 3 — Radar:** oportunidades o amenazas que no puede ver.
4. **Asesor 4 — Ojos nuevos:** entra sin contexto y nota lo que él no nota.
5. **Asesor 5 — Brújula:** piensa a futuro y define el mejor camino.

Cerrar siempre con **síntesis breve** y recomendación concreta.

## Estado actual (importante)

- **Rama de trabajo: `astro-migration`** — TODO el desarrollo nuevo vive aquí.
  `main` aún tiene la versión vieja pre-Astro. **Merge pendiente** (decisión del usuario).
- **Producción**: Netlify (globobym.netlify.app) por **drag & drop manual de `dist/`**.
  NO está conectado a GitHub todavía. Flujo de deploy: `npm run build` → arrastrar
  SOLO la carpeta `dist/` a Netlify → listo.
- **Decisión de hosting pendiente**: el usuario evalúa migrar a Vercel Pro (tiene otro
  proyecto y quiere consolidar; Netlify free sí permite uso comercial). La arquitectura
  es portable (URLs formato directorio, sin features propietarias). Fase 3 usará API
  routes de Astro + adapter para que el cambio sea 1 línea.
- ⚠️ **Verificar reglas Firestore**: el usuario aplicó `firestore.rules` pero su pedido
  de prueba falló ("No pudimos registrar tu pedido") — casi seguro pegó la versión
  vieja SIN el bloque `ordenes_tienda`. Confirmar en Firebase Console que el bloque existe.

## Stack

- **Astro 5** estático (sin frameworks UI, sin Tailwind — CSS propio en `src/styles/`)
- **Firebase** proyecto `globobym`: Firestore (pedidos, ordenes_tienda, metricas) +
  Auth (login panel). SDK compat v10 por CDN en landing/checkout/admin; en páginas de
  tienda se usa **API REST de Firestore** (función `gbTrack` en tienda.js) para no cargar el SDK.
- **Netlify**: build `npm run build` → `dist/`. Config + headers en `netlify.toml`.
- **GA4** G-FX6KTT78Z1: page_view + eventos de funnel espejados con gtag.

## Estructura

- `src/pages/index.astro` — landing eventos. Hero con carrusel "Decoraciones de esta
  semana" (lee `public/assets/semana/index.json`, regenerable con `actualizar-semana.ps1`),
  servicios 8 cards, galería, **sección vitrina de tienda** (3 destacados), why-us, contacto+form.
- `src/pages/tienda.astro` + `tienda/[id].astro` — catálogo y páginas de producto desde
  `src/data/productos.json` (fuente de verdad del catálogo, ver `src/data/README.md`).
- `src/pages/checkout.astro` — datos de entrega → guarda en Firestore `ordenes_tienda`.
- `src/pages/admin.astro` — panel: Cotizaciones / 🛍 Tienda (con funnel) / Resumen / Tracking.
- `src/pages/{terminos,privacidad,devoluciones}.astro` — legales. Variables en `src/data/legal.js`.
- `src/pages/libro-de-reclamaciones.astro` — comparte la base del proyecto Firebase
  `pulso-reclamaciones` (de otro proyecto del usuario) + respaldo Supabase; los reclamos
  llevan `negocioId: 'globobym'` y numeración `GBR-`.
- `src/components/` — Nav (prop showCart), Footer, CartDrawer, DistritosDatalist.
- `public/js/main.js` (landing), `tienda.js` (carrito localStorage `gb_cart_v1` + gbTrack),
  `checkout.js`, `admin.js`.
- `firestore.rules` — reglas endurecidas con validación de schema (pedidos, ordenes_tienda,
  metricas). Se aplican A MANO en Firebase Console.

## Flujos clave

- **Cotización eventos**: form modal → Firestore `pedidos` (estado `nuevo`) → panel
  Cotizaciones. Estados: Nuevo → Contactado → Separado(`pagado` interno, S/100) →
  Atendido → Venta (terminal, auto-24h). Packs: 1=S/1999, 2=S/1399, 3=S/1099, 4=S/799,
  5=S/650; Económico/Personalizado = precio manual del dueño.
- **Compra tienda**: producto (color/dedicatoria/cantidad) → carrito drawer → checkout →
  `ordenes_tienda` (estado `nuevo`) → panel Tienda. Estados: nuevo → preparando →
  enviado → entregado (+cancelado). Eliminación definitiva con código **PRUEBA** (botón 🗑).
  Pago actual: coordinado por WhatsApp/Yape. Envío: "se coordina según distrito".
- **Funnel** (contadores en `metricas/general` + eventos GA4): visitas_sitio,
  visitas_formulario, catalogo_aperturas, whatsapp_clicks, tienda_visitas,
  carrito_agregados, checkout_inicios, ordenes_completadas. Panel muestra funnel de
  tienda con % de abandono de checkout.

## Decisiones de producto/marketing tomadas

- Testimonios ELIMINADOS (eran inventados) — volver solo con reviews reales.
- WhatsApp solo al final (sección contacto + footer): se "educa" al cliente a usar
  el formulario/carrito. Sin botón flotante ni WA en el hero.
- Headline: "Decoración con globos premium a domicilio en Lima y Callao".
- CTAs hero: Solicitar cotización (primario) → Ver packs y precios → Ver galería.
- NO splash de bienvenida para separar unidades de negocio: se usa cross-promoción
  (vitrina de tienda en landing + banner de eventos en tienda).
- NO precio ancla "desde S/650" en servicios (el Pack Económico es flexible, asustaría).
- Catálogo de productos en archivo JSON (no Firestore): editar + push + deploy.
  Los 4 productos actuales son DEMO con fotos prestadas.
- Imágenes en el repo (`public/assets/`), no Cloudinary/Storage.

## Reunión con cliente (pendiente — domingo)

1. **Catálogo real** de productos (fotos, nombres, precios, colores, categorías) → reemplazar demo en `productos.json`
2. **Razón social + RUC** → completar `src/data/legal.js` (TODOs marcados; actualiza legales + libro de reclamaciones)
3. **Plazos** de reprogramación/cancelación/reembolso → `legal.js`
4. **Costo de envío por distrito** (necesario antes de Culqi; hoy "se coordina por WhatsApp")
5. **Culqi**: cliente ya tiene cuenta (compró POS). Debe activar "pagos online" en su
   panel y obtener API keys (pública + secreta). Sin costo fijo: solo comisión ~3.99% + S/0.50 + IGV por venta.

## Fase 3 (siguiente, bloqueada por insumos)

- API route `create-charge`: recalcula total server-side desde productos.json, cobra
  con llave secreta (env var). Webhook Culqi. Checkout pasa de "Enviar pedido" a "Pagar S/X".
- Requiere: keys Culqi + decisión de hosting + conexión GitHub (functions no funcionan
  con drag & drop).
- Email transaccional (Brevo gratis) opcional junto al pago.

## Quirks del entorno

- Windows + Git Bash. A veces los Edit dan error "EIO fsync" pero el cambio SÍ se aplica
  — verificar con grep antes de reintentar (riesgo de doble aplicación).
- PowerShell también disponible; cuidado con encoding UTF-8 al editar archivos con tildes
  (usar herramientas Edit/Write, no Set-Content).
- El usuario (Alonso) está aprendiendo git — explicar comandos cuando se usen.
- Sus otros datos: proyecto "Pulso" (RUC personal 10717562751, base reclamaciones compartida).
