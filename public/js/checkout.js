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

  document.getElementById('coTotal').textContent = 'S/ ' + gbCart.total().toFixed(2);
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
    total: Math.round(gbCart.total() * 100) / 100,
    cliente: { nombre, telefono },
    envio: { direccion, distrito, fecha, rango },
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
  txt += `\n*Total:* S/ ${gbCart.total().toFixed(2)}`;
  txt += `\n*Entrega:* ${fecha} · ${rango}`;
  txt += `\n*Distrito:* ${distrito}`;
  txt += `\n*A nombre de:* ${nombre}`;

  document.getElementById('ordenOkWa').href =
    'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(txt);

  gbCart.clear();
  document.getElementById('checkoutGrid').hidden = true;
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
  // Funnel: llegó al checkout con productos en el carrito
  if (gbCart.read().length > 0) coTrack('checkout_inicios');
});
