// ═══════════════════════════════════════════════════════════
//  PAGOS ONLINE — Culqi
//
//  ⚠️ TODO PENDIENTE DEL CLIENTE. Mientras los campos estén vacíos,
//     el sitio se comporta como hoy: el pago se coordina por WhatsApp
//     (Yape / Plin / transferencia) y no se muestra ningún botón de pago.
//
//  Son DOS mecanismos distintos, no confundirlos:
//
//  ── A) SERVICIOS · Separación de S/100 → LINK DE PAGO ──────────
//  Monto FIJO, así que basta un "link de pago" generado desde el panel
//  de Culqi (panel.culqi.com → Links de pago → Crear link de S/100).
//  NO requiere programación ni llaves API: es pegar la URL aquí abajo.
//  En cuanto el cliente la envíe, el botón "Separar con S/100" aparece
//  solo en la landing.
//
//  ── B) TIENDA · Cobro del carrito → INTEGRACIÓN POR API ────────
//  Monto VARIABLE (depende del carrito + movilidad), así que los links
//  de pago no sirven. Necesita Culqi Checkout + Cargos, con la llave
//  secreta en el servidor. Eso es la Fase 3 y requiere:
//    1. pk_live_ (pública, va en el front)
//    2. sk_live_ (secreta, SOLO como variable de entorno en el servidor)
//    3. Hosting con funciones/API routes (no funciona con drag & drop)
//    4. Webhook de confirmación configurado en el panel de Culqi
//
//  FLUJO ACORDADO PARA LA TIENDA (importante):
//  El pedido se guarda en el CRM ANTES de cobrar, con estado
//  'pendiente_pago'; el webhook de Culqi lo pasa a 'nuevo' al confirmar.
//  NO se debe guardar solo cuando el pago se aprueba: si el webhook
//  falla, el cliente pagaría y el pedido no existiría. Además, los que
//  quedan en 'pendiente_pago' son la lista de carritos abandonados,
//  que es plata recuperable.
//  ⚠️ Esto obliga a actualizar firestore.rules, que hoy fuerza
//     estado == 'nuevo' en el create de ordenes_tienda.
// ═══════════════════════════════════════════════════════════

export const PAGOS = {
  // ── A) Link de pago de S/100 para separar fecha de un evento ──
  // Pegar aquí la URL que genere el cliente en su panel de Culqi.
  // Mientras esté vacío, el botón NO se muestra.
  linkSeparacion: '',
  montoSeparacion: 100,

  // ── B) Tienda (Fase 3) ──
  // La llave pública puede vivir en el front. La SECRETA nunca va aquí:
  // va como variable de entorno en el servidor.
  culqiPublicKey: '',
  tiendaPagoOnlineActivo: false,
};

/** true si ya se puede mostrar el botón de separación de S/100. */
export const separacionDisponible = PAGOS.linkSeparacion.trim().length > 0;
