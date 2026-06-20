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

- **Disco/ruta**: el proyecto se migró de `C:\Backup_D\Proyectos Paginas Web\Globobym`
  (SSD SATA) a `E:\Proyectos Paginas Web\Globobym` (SSD M.2 NVMe Gen4). E: aloja ahora
  todos los proyectos. Verificado operativo: `node_modules` sano (no hizo falta reinstalar),
  `npm run build` (12 páginas) y `npm run dev` (localhost:4321, rutas 200) OK.
- **Rama de trabajo: `main`** — la migración Astro YA está en `main` (es la versión viva
  y la rama de deploy). `astro-migration` quedó como legacy/respaldo. Todo el desarrollo
  nuevo va a `main`.
- **Producción**: Netlify (globobym.netlify.app). En transición de **drag & drop manual
  de `dist/`** a **deploy desde GitHub con opt-in** (ver siguiente punto). Hasta conectar
  Netlify ↔ repo en el dashboard, sigue siendo drag & drop.
- **Deploy opt-in (en `netlify.toml`)**: el comando `ignore` CANCELA el build salvo que el
  ÚLTIMO commit lleve `[deploy]` en el mensaje. Así un `git push` normal NO gasta minutos
  de build (créditos); `git commit -m "... [deploy]"` sí despliega. **PENDIENTE del usuario**:
  conectar Netlify ↔ `alnsomr/GloboBYM` en el dashboard (Build & deploy → Link repository,
  production branch = `main`; opcional: desactivar deploy previews / branch deploys).
- **Decisión de hosting pendiente**: el usuario evalúa migrar a Vercel Pro (tiene otro
  proyecto y quiere consolidar; Netlify free sí permite uso comercial). La arquitectura
  es portable (URLs formato directorio, sin features propietarias). Fase 3 usará API
  routes de Astro + adapter para que el cambio sea 1 línea.
- ⚠️ **Reglas Firestore — REPUBLICAR**: `firestore.rules` se endureció (el bloque
  `metricas/general` pasó de `if true` a validar solo los campos del funnel, numéricos,
  con `diff().affectedKeys().hasOnly()` en update). Las reglas se aplican A MANO → pegar el
  archivo ACTUAL en Firebase Console → Firestore → Reglas → Publicar. Confirmar de paso que
  el bloque `ordenes_tienda` quede en la versión publicada (un pedido de prueba falló antes
  por pegar una versión vieja sin ese bloque).

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
- **`+200 eventos` y `33K seguidores` son REALES** (verificado: cuenta IG @globobym_peru
  + antigüedad). Quedan como social proof legítimo en meta/landing; NO cuestionar de nuevo.
- **Google Business Profile**: pendiente, **disparado por la compra del dominio**. Una vez
  el cliente compre el dominio se crea/actualiza el perfil (clave para búsquedas locales y
  para reviews reales). Hoy el sitio se anuncia como `LocalBusiness` con geo pero no existe
  en Google Maps.
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
5. **Culqi (montos dinámicos)**: cliente ya tiene cuenta (compró POS). Para cobrar el total
   variable del carrito se usa la **integración por API (Checkout + Cargos)**, NO los "links
   de pago" (esos son de monto fijo). El cliente NO configura montos: el servidor manda el
   total exacto en cada cobro. Pasos que debe hacer el cliente:
   1. Entrar a su panel Culqi (panel.culqi.com) con la cuenta del POS.
   2. Activar el **canal de pagos online / e-commerce** (hoy es POS presencial; puede requerir
      pedirlo a soporte Culqi).
   3. Completar **validación comercial**: razón social/RUC, representante legal, rubro y la
      **cuenta bancaria de abono** (donde Culqi deposita las ventas). Culqi aprueba.
   4. Copiar las **API keys** (Configuración → Desarrollo): pública `pk_live_` (va en el front)
      y secreta `sk_live_` (NUNCA por canal abierto; solo en el servidor). Hay también de prueba
      `pk_test_`/`sk_test_`.
   5. Enviar ambas llaves al dev de forma segura → van como env var en el servidor.
   6. El dev configura el **webhook** de confirmación en el panel (Fase 3).
   - Costos: comisión ~3.99% + S/0.50 + IGV por venta. Sin costo fijo mensual.
   - ⚠️ Los rótulos exactos del panel pueden variar; confirmar en el panel real / soporte Culqi.

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
