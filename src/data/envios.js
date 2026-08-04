// ═══════════════════════════════════════════════════════════
//  COSTO DE ENVÍO (movilidad) POR DISTRITO — Lima y Callao
//
//  ⚠️ VALORES PROVISIONALES. El cliente todavía no entregó su tarifario.
//     Los precios de abajo están agrupados por zona solo para que el
//     checkout funcione y se pueda ver el flujo completo. HAY QUE
//     REEMPLAZARLOS por la lista real antes de salir a producción.
//
//  CÓMO EDITAR:
//   • Envío gratis en un distrito  ->  poner 0
//   • Con costo                    ->  poner el monto en soles (ej. 15)
//   • Distrito donde NO reparten   ->  poner null
//                                     (el checkout avisa y no deja continuar)
//
//  El total del carrito se recalcula solo: Subtotal + Envío = Total.
// ═══════════════════════════════════════════════════════════

/** Mientras sea true, el checkout muestra un aviso de que la tarifa es
 *  referencial. Cambiar a false cuando el cliente confirme su tarifario. */
export const TARIFAS_PROVISIONALES = true;

/** Costo que se aplica si el distrito escrito no está en la lista de abajo
 *  (por ejemplo, un typo o una provincia). null = no se puede cotizar solo. */
export const ENVIO_NO_LISTADO = null;

export const ENVIOS = {
  // ── Lima Moderna / centro — envío gratis ──
  'Barranco': 0,
  'Jesús María': 0,
  'La Victoria': 0,
  'Lince': 0,
  'Magdalena del Mar': 0,
  'Miraflores': 0,
  'Pueblo Libre': 0,
  'San Borja': 0,
  'San Isidro': 0,
  'San Miguel': 0,
  'Santiago de Surco': 0,
  'Surquillo': 0,

  // ── Lima centro-este / cercanías ──
  'Breña': 10,
  'Cercado de Lima': 10,
  'El Agustino': 12,
  'La Molina': 12,
  'Rímac': 12,
  'San Luis': 10,
  'Santa Anita': 12,

  // ── Lima Norte ──
  'Carabayllo': 20,
  'Comas': 18,
  'Independencia': 15,
  'Los Olivos': 15,
  'Puente Piedra': 20,
  'San Martín de Porres': 15,
  'Santa Rosa': 25,
  'Ancón': 30,

  // ── Lima Sur ──
  'Chorrillos': 15,
  'San Juan de Miraflores': 15,
  'Villa María del Triunfo': 18,
  'Villa El Salvador': 20,
  'Lurín': 25,
  'Pachacámac': 25,

  // ── Lima Este ──
  'Ate': 15,
  'San Juan de Lurigancho': 18,
  'Chaclacayo': 30,
  'Cieneguilla': 30,
  'Lurigancho-Chosica': 30,

  // ── Callao ──
  'Bellavista': 15,
  'Callao': 18,
  'Carmen de la Legua': 15,
  'La Perla': 15,
  'La Punta': 20,
  'Ventanilla': 28,
  'Mi Perú': 30,

  // ── Balnearios del sur: por confirmar si reparten ──
  'Punta Hermosa': null,
  'Punta Negra': null,
  'San Bartolo': null,
  'Santa María del Mar': null,
  'Pucusana': null,
};

/** Agrupación por zona, SOLO para mostrar el desplegable ordenado.
 *  Los precios viven en ENVIOS; aquí solo van los nombres.
 *  Si agregas un distrito a ENVIOS, agrégalo también a su zona aquí. */
export const ZONAS = [
  { nombre: 'Lima Moderna', distritos: [
    'Barranco', 'Jesús María', 'La Victoria', 'Lince', 'Magdalena del Mar', 'Miraflores',
    'Pueblo Libre', 'San Borja', 'San Isidro', 'San Miguel', 'Santiago de Surco', 'Surquillo',
  ]},
  { nombre: 'Lima Centro', distritos: [
    'Breña', 'Cercado de Lima', 'El Agustino', 'La Molina', 'Rímac', 'San Luis', 'Santa Anita',
  ]},
  { nombre: 'Lima Norte', distritos: [
    'Ancón', 'Carabayllo', 'Comas', 'Independencia', 'Los Olivos',
    'Puente Piedra', 'San Martín de Porres', 'Santa Rosa',
  ]},
  { nombre: 'Lima Sur', distritos: [
    'Chorrillos', 'Lurín', 'Pachacámac', 'San Juan de Miraflores',
    'Villa El Salvador', 'Villa María del Triunfo',
  ]},
  { nombre: 'Lima Este', distritos: [
    'Ate', 'Chaclacayo', 'Cieneguilla', 'Lurigancho-Chosica', 'San Juan de Lurigancho',
  ]},
  { nombre: 'Callao', distritos: [
    'Bellavista', 'Callao', 'Carmen de la Legua', 'La Perla', 'La Punta', 'Mi Perú', 'Ventanilla',
  ]},
  { nombre: 'Balnearios del sur', distritos: [
    'Pucusana', 'Punta Hermosa', 'Punta Negra', 'San Bartolo', 'Santa María del Mar',
  ]},
];

/** Quita tildes y pasa a minúsculas para comparar sin importar cómo se escriba.
 *  ̀-ͯ es el rango de marcas diacríticas que NFD deja separadas. */
export function normalizaDistrito(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Devuelve el costo de envío de un distrito.
 * @returns {{ costo: number|null, listado: boolean }}
 *   costo   = monto en soles, o null si no hay reparto / no se puede cotizar
 *   listado = si el distrito estaba en la tabla
 */
export function costoEnvio(distrito) {
  const key = String(distrito || '').trim();
  if (!key) return { costo: null, listado: false };

  // Comparación sin distinguir mayúsculas ni tildes: el campo es de texto
  // libre con datalist, el cliente puede escribir "san isidro" o "SAN ISIDRO".
  const objetivo = normalizaDistrito(key);

  for (const nombre of Object.keys(ENVIOS)) {
    if (normalizaDistrito(nombre) === objetivo) return { costo: ENVIOS[nombre], listado: true };
  }
  return { costo: ENVIO_NO_LISTADO, listado: false };
}
