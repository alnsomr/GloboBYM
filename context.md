# Context — estado de la sesión (handoff)

> Snapshot para retomar rápido en el próximo inicio. Última actualización: **2026-06-20**.
> Para reglas de trabajo, stack y decisiones de producto ver **CLAUDE.md** (fuente de verdad).
> Este archivo es estado operativo "vivo": qué se hizo, qué quedó pendiente y de quién depende.

## Dónde estamos

- Proyecto **migrado de C:\Backup_D\...(SATA) → E:\Proyectos Paginas Web\Globobym (NVMe Gen4)**.
  E: aloja ahora todos los proyectos. **Operativo y verificado**: `node_modules` sano,
  `npm run build` (12 páginas) OK, `npm run dev` → http://localhost:4321/ con todas las rutas 200.
- Rama actual: **`main`** (ya tiene la migración Astro; es la rama viva y de deploy).
  `astro-migration` quedó como legacy. `feature/culqi-skeleton` existe pero sin uso aún.
- Último commit propio: **`8281c11`** "Endurecer metricas Firestore + deploy opt-in" — pusheado a `origin/main`, SIN `[deploy]`.

## Hecho en esta sesión

1. **Verificada la migración de disco** — nada roto, build + dev OK. No hubo que regenerar archivos.
2. **`firestore.rules` endurecido** — `metricas/general` pasó de `if true` a validar solo los 11
   campos del funnel (numéricos; `origenes` es mapa). Update usa `diff().affectedKeys().hasOnly()`
   para no romperse si el doc ya tiene campos viejos. El admin solo LEE métricas → no se rompe.
3. **`netlify.toml` deploy opt-in** — comando `ignore`: el build (y deploy) solo corre si el último
   commit lleva `[deploy]` en el mensaje. Push normal = 0 minutos de build.
4. **Pregunta al Concejo** sobre seguridad/SEO/marketing/diseño/funcionalidad (resumen abajo).
5. **CLAUDE.md actualizado** con: migración de disco, rama main, deploy opt-in, republicar reglas,
   +200/33K reales, Google Business pendiente del dominio, pasos Culqi del cliente.

## Pendientes (qué falta y de quién depende)

### Del usuario (Alonso) — acciones fuera del código
- [ ] **Republicar `firestore.rules`** en Firebase Console → Firestore → Reglas → pegar archivo
      actual → Publicar. (Confirmar que incluye `ordenes_tienda` + el nuevo bloque `metricas`.)
- [ ] **Conectar Netlify ↔ GitHub** `alnsomr/GloboBYM` (Build & deploy → Link repository,
      production branch = `main`; opcional desactivar deploy previews / branch deploys).
      Hasta entonces el `ignore` de netlify.toml no actúa y producción sigue por drag & drop.
- [ ] **Comprar dominio** → dispara crear/actualizar **Google Business Profile**.

### Del cliente (GloboBYM) — reunión pendiente (domingo)
- [ ] Catálogo real (fotos/nombres/precios/colores/categorías) → reemplaza demo en `productos.json`.
- [ ] Razón social + RUC → `src/data/legal.js` (TODOs) → actualiza legales + libro de reclamaciones.
- [ ] Plazos de reprogramación/cancelación/reembolso → `legal.js`.
- [ ] Costo de envío por distrito (necesario antes de Culqi).
- [ ] **Culqi**: activar e-commerce, validación comercial (RUC + cuenta de abono), obtener llaves
      `pk_live_`/`sk_live_` y entregarlas seguras. (Pasos detallados en CLAUDE.md → Reunión, punto 5.)

### Técnicos abiertos (cuando haya tiempo / insumos)
- [ ] **Bug SEO**: `public/sitemap.xml` solo lista la home; faltan `/tienda/`, páginas de producto y
      legales, y el `lastmod` está congelado. Arreglo recomendado: instalar `@astrojs/sitemap`
      (autogenera con cada build). Es el arreglo concreto más rápido pendiente.
- [ ] **Fase 3 (Culqi)**: API route `create-charge` (recalcula total server-side, cobra con
      `sk` en env var) + webhook. Bloqueada por: llaves Culqi + decisión de hosting + conexión
      GitHub (las functions no corren con drag & drop). Email transaccional (Brevo) opcional.
- [ ] CSP usa `'unsafe-inline'` en scripts — revisar al entrar a pagos (más superficie).

## Resumen del Concejo (priorizado)

El proyecto está **técnicamente sano**; el cuello de botella NO es técnico sino de **cierre de
venta e insumos reales**. Orden recomendado:
1. 🔴 Cerrar la venta: catálogo real + Culqi (hoy la tienda termina en "coordina por WhatsApp/Yape").
2. 🟠 Marketing honesto: +200/33K **confirmados reales** → darles protagonismo (resuelto).
3. 🟡 SEO: arreglar sitemap (`@astrojs/sitemap`) + Google Business Profile (tras dominio).
4. 🟢 Diseño: sólido (Playfair + Inter), solo necesita fotos reales, no rediseño.
5. 🟢 Seguridad: ya endurecida hoy; revisar CSP recién con pagos.
- Acción sugerida antes del domingo: mirar en el panel el ratio `checkout_inicios → ordenes_completadas`
  para decidir si Culqi es urgente.

## Comandos útiles

```bash
npm run dev      # servidor local → http://localhost:4321/
npm run build    # genera dist/ (12 páginas)
npm run preview  # sirve dist/ como en producción

# Deploy opt-in (cuando Netlify esté conectado a GitHub):
git commit -m "cambios"            # push sin build (no gasta créditos)
git commit -m "cambios [deploy]"   # push + build + deploy a producción
```
