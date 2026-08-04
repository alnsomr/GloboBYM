# Context — estado de la sesión (handoff)

> Snapshot para retomar rápido en el próximo inicio. Última actualización: **2026-08-03**.
> Para reglas de trabajo, stack y decisiones de producto ver **CLAUDE.md** (fuente de verdad).
> Este archivo es estado operativo "vivo": qué se hizo, qué quedó pendiente y de quién depende.

## Dónde estamos

- Rama **`main`**, en `E:\Proyectos Paginas Web\Globobym`. Build verde: `npm run build`
  → 12 páginas. `npm run dev` → http://localhost:4321/ con todas las rutas 200.
- **Producción sigue siendo drag & drop de `dist/`.** Netlify NO está conectado a GitHub
  todavía, así que la etiqueta `[deploy]` de `netlify.toml` aún no hace nada.
- Se hizo la reunión con el cliente (**2 ago 2026**). Lo de abajo sale de ahí.

## Hecho desde la última actualización

### Reunión previa (demo del sitio + CRM)
1. **Fix del checkout**: el formulario no se ocultaba tras enviar y el botón quedaba
   congelado en "Enviando...". Causa: `.checkout-grid` declara `display:grid`, que le gana
   al `display:none` del atributo `[hidden]`. Se añadió `[hidden]{display:none!important}`
   en `global.css`. Eso arregló de paso el badge "0" fantasma del carrito en el nav.
2. **Tema oscuro en el panel** `/admin/`, con botón en el header y activo en las 4 vistas.
   Se aplica antes del primer pintado (script en `<head>`) para evitar el flash blanco.
3. **Sección Calendario** en el panel: agenda unificada de eventos (`pedidos.fecha`, solo
   Separado/Atendido/Venta) y entregas de tienda (`ordenes_tienda.envio.fecha`).

### Cambios pedidos en la reunión (todos implementados)
4. **Color de marca: fucsia → navy `#1B2138`.** Centralizado en 3 tokens de `global.css`.
   Se añadió `--primary-accent: #3D5BA9` para texto de acento: el navy puro es casi igual
   a `--dark` y los `<em>` de los títulos se volvían invisibles.
   **El panel `/admin/` sigue en fucsia** — el pedido fue solo para la web pública.
5. **Hero en móvil/tablet**: la foto dejó de ser `background-image` detrás del texto y pasó
   a ser un bloque real arriba. En escritorio el hero no cambió.
6. **Sistema de campañas** (`src/data/campania.js`) con vigencia por fechas. Ver CLAUDE.md.
7. **Costo de envío por distrito** (`src/data/envios.js`, 50 distritos). Checkout muestra
   Subtotal + Envío = Total. **Precios PROVISIONALES inventados por el dev.**
8. **Botón flotante de WhatsApp** en las 8 páginas públicas. ⚠️ Revierte una decisión de
   producto previa — ver el riesgo en CLAUDE.md.
9. **`<select>` de distrito** en vez de input + datalist: el datalist filtraba al escribir
   y no dejaba volver a ver la lista completa. De paso elimina typos.
10. **Botón "Inicio"** en el nav (desktop + móvil) → tope de la landing.
11. **Hero también en `/tienda/`**, más bajo que el de la landing a propósito.

## Pendientes (qué falta y de quién depende)

### Del usuario (Alonso) — acciones fuera del código
- [ ] **Republicar `firestore.rules`** en Firebase Console → Firestore → Reglas.
      (Los cambios de envío NO requieren republicar; esto viene de antes.)
- [ ] **Conectar Netlify ↔ GitHub** `alnsomr/GloboBYM` (production branch = `main`).
      Hasta entonces, producción sigue por drag & drop de `dist/`.
- [ ] **Comprar dominio** → dispara crear/actualizar **Google Business Profile**.
- [ ] **Decidir** si la campaña será solo de Tienda o independiente por unidad
      (hoy está en modo B: campaña compartida, CTA distinto por unidad).

### Del cliente (GloboBYM)
- [ ] **Tarifario real de movilidad por distrito** → reemplaza los provisionales de
      `envios.js` y pone `TARIFAS_PROVISIONALES = false`. **Prerequisito de Culqi.**
- [ ] **Link de pago Culqi de S/100** (monto fijo, se genera desde el panel, sin
      programación) → pegar en `PAGOS.linkSeparacion` y el botón aparece solo.
- [ ] **Llaves API Culqi** (`pk_live_` / `sk_live_`) para el cobro variable de la tienda.
- [ ] Catálogo real (fotos/nombres/precios) → `productos.json` (los 4 actuales son DEMO).
- [ ] Razón social + RUC y plazos legales → `src/data/legal.js`.
- [ ] Imágenes de campaña → hoy `public/assets/campanias/` tiene COPIAS de foto1–foto4.

### Técnicos abiertos
- [ ] **Bug SEO**: `public/sitemap.xml` solo lista la home; faltan `/tienda/`, páginas de
      producto y legales, y el `lastmod` está congelado. Arreglo: `@astrojs/sitemap`.
      Sigue siendo el arreglo concreto más rápido pendiente.
- [ ] **Fase 3 (Culqi)**. ⚠️ Flujo acordado: el pedido se guarda en el CRM **ANTES** de
      cobrar con estado `pendiente_pago`, y el webhook lo pasa a `nuevo`. NO guardar solo
      al aprobarse el pago: si el webhook falla, el cliente pagaría y el pedido no
      existiría; además los `pendiente_pago` son la lista de carritos abandonados.
      Obliga a tocar `firestore.rules`, que hoy fuerza `estado == 'nuevo'` en el create.
- [ ] **Vigilar el funnel** tras el botón flotante de WhatsApp: si `whatsapp_clicks` sube
      mientras `visitas_formulario` baja, está robando cotizaciones que quedaban en el CRM.
- [ ] Panel `/admin/` sigue en fucsia mientras la web pública es navy — decidir si se unifica.
- [ ] CSP usa `'unsafe-inline'` en scripts — revisar al entrar a pagos.

## Trampas conocidas del repo

- **`[hidden]` vs `display`**: cualquier regla de autor con `display:grid/flex` le gana al
  `[hidden]`. Ya hay `[hidden]{display:none!important}` en `global.css` y `admin.css`.
- **`.tienda-main` la comparten** tienda, checkout y páginas de producto. Solo la tienda
  tiene hero, así que el padding reducido va en `.tienda-hero + .tienda-main`, no en la
  clase base — bajarlo en la base mete checkout debajo del nav fijo.
- **Rutas de imagen en componentes compartidos**: usar `/assets/...` absoluto. Una ruta
  relativa desde `/tienda/` resuelve a `/tienda/assets/...` y rompe.
- **Encoding**: editar archivos con tildes con las herramientas Edit/Write, no con
  `sed`/`Set-Content` — corrompen UTF-8. Un `sed` de "primera coincidencia" también puede
  pegarle al comentario en vez de a la configuración: verificar siempre el resultado.

## Comandos útiles

```bash
npm run dev      # servidor local → http://localhost:4321/
npm run build    # genera dist/ (12 páginas)
npm run preview  # sirve dist/ como en producción

# Deploy opt-in (solo surtirá efecto cuando Netlify esté conectado a GitHub):
git commit -m "cambios"            # push sin build (no gasta créditos)
git commit -m "cambios [deploy]"   # push + build + deploy a producción
```
