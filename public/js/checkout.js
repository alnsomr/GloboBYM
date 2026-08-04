// ═══ CHECKOUT: resumen + guardado de orden en Firestore ═══

firebase.initializeApp({
  apiKey:            "AIzaSyDDRomYCtRzPkCLbWlqlgRNnQ8aSj2izQ4",
  authDomain:        "globobym.firebaseapp.com",
  projectId:         "globobym",
  storageBucket:     "globobym.firebasestorage.app",
  messagingSenderId: "499147123529",
  appId:             "1:499147123529:web:ad69e31c0dbeabdcc20898"
});
const _codb = firebase.firestore();

const WHATSAPP = '51960876002';
let checkoutOpenedAt = Date.now(); // anti-bot

function coEsc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── ENVÍO POR DISTRITO ──
// El tarifario lo inyecta checkout.astro desde src/data/envios.js (window.GB_ENVIOS).
// Estado actual del cálculo, que enviarOrden() reutiliza para no recalcular.
let envioActual = { costo: null, listado: false, distrito: '' };

function coNormDistrito(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function coCostoEnvio(distrito) {
  const tabla = window.GB_ENVIOS || {};
  const objetivo = coNormDistrito(distrito);
  if (!objetivo) return { costo: null, listado: false };
  for (const nombre of Object.keys(tabla)) {
    if (coNormDistrito(nombre) === objetivo) return { costo: tabla[nombre], listado: true };
  }
  const fallback = window.GB_ENVIO_NO_LISTADO;
  return { costo: fallback === undefined ? null : fallback, listado: false };
}

// Recalcula la línea de envío y el total. Se llama al escribir el distrito.
function renderEnvio() {
  const distrito = (document.getElementById('co-distrito') || {}).value || '';
  const r = coCostoEnvio(distrito);
  envioActual = { costo: r.costo, listado: r.listado, distrito: distrito.trim() };

  const elEnvio    = document.getElementById('coEnvio');
  const elDist     = document.getElementById('coEnvioDistrito');
  const elTotal    = document.getElementById('coTotal');
  const elNota     = document.getElementById('coEnvioNota');
  const btn        = document.getElementById('coEnviar');
  const subtotal   = gbCart.total();

  elDist.textContent = envioActual.distrito ? '· ' + envioActual.distrito : '';

  // Sin distrito escrito todavía
  if (!envioActual.distrito) {
    elEnvio.textContent = '—';
    elEnvio.className   = '';
    elTotal.textContent = 'S/ ' + subtotal.toFixed(2);
    elNota.textContent  = '🚚 Elige tu distrito para calcular el costo de envío.';
    btn.disabled = false;
    return;
  }

  // Distrito sin reparto (null) o no reconocido
  if (r.costo === null || r.costo === undefined) {
    elEnvio.textContent = 'A coordinar';
    elEnvio.className   = 'co-envio-pendiente';
    elTotal.textContent = 'S/ ' + subtotal.toFixed(2);
    elNota.textContent  = r.listado
      ? '📍 Todavía no tenemos tarifa fija para ' + envioActual.distrito +
        '. Puedes enviar tu pedido igual y coordinamos el envío por WhatsApp.'
      : '📍 No reconocimos ese distrito. Revisa que esté bien escrito o envía tu ' +
        'pedido igual: coordinamos el envío contigo por WhatsApp.';
    btn.disabled = false;   // no bloqueamos la venta: se coordina manualmente
    return;
  }

  // Con tarifa
  const total = subtotal + r.costo;
  elEnvio.textContent = r.costo === 0 ? 'Gratis' : 'S/ ' + r.costo.toFixed(2);
  elEnvio.className   = r.costo === 0 ? 'co-envio-gratis' : '';
  elTotal.textContent = 'S/ ' + total.toFixed(2);
  elNota.textContent  = r.costo === 0
    ? '🎉 ¡Envío gratis a ' + envioActual.distrito + '!'
    : '🚚 Movilidad a ' + envioActual.distrito + ': S/ ' + r.costo.toFixed(2) + '.';
  if (window.GB_TARIFAS_PROVISIONALES) {
    elNota.textContent += ' (tarifa referencial, se confirma al coordinar)';
  }
  btn.disabled = false;
}

function renderResumen() {
  const items = gbCart.read();
  const grid = document.getElementById('checkoutGrid');
  const vacio = document.getElementById('checkoutVacio');
  if (!items.length) {
    grid.hidden = true;
    vacio.hidden = false;
    return;
  }
  grid.hidden = false;
  vacio.hidden = true;

  document.getElementById('coResumenItems').innerHTML = items.map(it => `
    <div class="co-item">
      <div>
        <div class="co-item-nombre">${it.cantidad}× ${coEsc(it.nombre)}</div>
        ${it.color ? `<div class="co-item-detalle">Color: ${coEsc(it.color)}</div>` : ''}
        ${it.dedicatoria ? `<div class="co-item-detalle">"${coEsc(it.dedicatoria)}"</div>` : ''}
      </div>
      <div class="co-item-precio">S/ ${(it.precio * it.cantidad).toFixed(2)}</div>
    </div>`).join('');

  document.getElementById('coSubtotal').textContent = 'S/ ' + gbCart.total().toFixed(2);
  renderEnvio();  // recalcula envío y total sobre el nuevo subtotal
}

// Fecha mínima: mañana
(function setMinDate() {
  const f = document.getElementById('co-fecha');
  if (!f) return;
  const t = new Date(Date.now() + 24 * 60 * 60 * 1000);
  f.min = t.toISOString().split('T')[0];
})();

async function enviarOrden() {
  const items    = gbCart.read();
  if (!items.length) return;

  const nombre    = document.getElementById('co-nombre').value.trim();
  const telefono  = document.getElementById('co-telefono').value.trim();
  const direccion = document.getElementById('co-direccion').value.trim();
  const distrito  = document.getElementById('co-distrito').value.trim();
  const fecha     = document.getElementById('co-fecha').value;
  const rango     = document.getElementById('co-rango').value;
  const notas     = document.getElementById('co-notas').value.trim();

  if (!nombre || !telefono || !direccion || !distrito || !fecha || !rango) {
    alert('Por favor completa todos los campos obligatorios (*).');
    return;
  }

  // Consentimiento de datos obligatorio (Ley N.° 29733)
  const acepto = document.getElementById('co-acepto');
  if (acepto && !acepto.checked) {
    alert('Para continuar debes aceptar los Términos y la Política de Privacidad.');
    return;
  }

  // Anti-bot: honeypot lleno o envío en menos de 4 segundos
  const honeypot = document.getElementById('co-website');
  if ((honeypot && honeypot.value !== '') || Date.now() - checkoutOpenedAt < 4000) return;

  const btn = document.getElementById('coEnviar');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  const orden = {
    items: items.map(it => ({
      id: it.id,
      nombre: it.nombre,
      precio: it.precio,
      cantidad: it.cantidad,
      color: it.color || '',
      dedicatoria: it.dedicatoria || '',
    })),
    // El total que se guarda YA incluye la movilidad. Si el distrito no tiene
    // tarifa fija, el envío se coordina aparte y aquí va solo el subtotal.
    total: Math.round((gbCart.total() + (envioActual.costo || 0)) * 100) / 100,
    cliente: { nombre, telefono },
    envio: {
      direccion, distrito, fecha, rango,
      // number = tarifa aplicada (0 = gratis) · null = se coordina por WhatsApp
      costo: typeof envioActual.costo === 'number' ? envioActual.costo : null,
      subtotal: Math.round(gbCart.total() * 100) / 100,
    },
    notas,
    estado: 'nuevo',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await _codb.collection('ordenes_tienda').add(orden);
    coTrack('ordenes_completadas'); // funnel
  } catch (e) {
    console.error('Error guardando orden:', e);
    btn.disabled = false;
    btn.textContent = '📨 Enviar pedido';
    alert('No pudimos registrar tu pedido. Revisa tu conexión e inténtalo de nuevo, o escríbenos por WhatsApp.');
    return;
  }

  // Mensaje de WhatsApp con el resumen (opcional para el cliente)
  let txt = `Hola GloboBYM 🎈 Acabo de hacer un pedido en la tienda:\n\n`;
  items.forEach(it => {
    txt += `• ${it.cantidad}× ${it.nombre}`;
    if (it.color) txt += ` (${it.color})`;
    txt += `\n`;
  });
  txt += `\n*Subtotal:* S/ ${gbCart.total().toFixed(2)}`;
  if (typeof envioActual.costo === 'number') {
    txt += `\n*Envío (${distrito}):* ${envioActual.costo === 0 ? 'Gratis' : 'S/ ' + envioActual.costo.toFixed(2)}`;
    txt += `\n*Total:* S/ ${(gbCart.total() + envioActual.costo).toFixed(2)}`;
  } else {
    txt += `\n*Envío (${distrito}):* a coordinar`;
    txt += `\n*Total (sin envío):* S/ ${gbCart.total().toFixed(2)}`;
  }
  txt += `\n*Entrega:* ${fecha} · ${rango}`;
  txt += `\n*A nombre de:* ${nombre}`;

  document.getElementById('ordenOkWa').href =
    'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(txt);

  gbCart.clear();
  // Restaurar el botón: si algo dejara el formulario visible, no debe quedar
  // congelado en "Enviando..." (se lee como que el pedido sigue en proceso).
  btn.disabled = false;
  btn.textContent = '📨 Enviar pedido';

  document.getElementById('checkoutGrid').hidden = true;
  document.getElementById('checkoutVacio').hidden = true; // el carrito quedó vacío tras clear()
  document.getElementById('ordenOk').hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Funnel: contador en metricas/general
function coTrack(field) {
  try {
    _codb.collection('metricas').doc('general').set(
      { [field]: firebase.firestore.FieldValue.increment(1) },
      { merge: true }
    );
    if (window.gtag) gtag('event', field);
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
  renderResumen();
  document.getElementById('coEnviar').addEventListener('click', enviarOrden);

  // Recalcular el envío mientras se escribe el distrito. 'input' cubre tanto
  // el tipeo como la selección desde el datalist (click o Enter).
  const inputDistrito = document.getElementById('co-distrito');
  if (inputDistrito) {
    inputDistrito.addEventListener('input',  renderEnvio);
    inputDistrito.addEventListener('change', renderEnvio);
    inputDistrito.addEventListener('blur',   renderEnvio);
  }
  // Funnel: llegó al checkout con productos en el carrito
  if (gbCart.read().length > 0) coTrack('checkout_inicios');
});
