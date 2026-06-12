// ═══ TIENDA: carrito (localStorage) + nav móvil ═══
// Cargado en /tienda, /tienda/<producto> y /checkout

const gbCart = (() => {
  const KEY = 'gb_cart_v1';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }
  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    renderBadge();
    renderDrawer();
  }

  // Dos líneas del mismo producto con distinto color/dedicatoria son items distintos
  function lineKey(it) { return it.id + '|' + (it.color || '') + '|' + (it.dedicatoria || ''); }

  function add(item) {
    const items = read();
    const key = lineKey(item);
    const existing = items.find(i => lineKey(i) === key);
    if (existing) existing.cantidad = Math.min(20, existing.cantidad + item.cantidad);
    else items.push(item);
    write(items);
    gbTrack('carrito_agregados'); // funnel
  }

  function setQty(index, qty) {
    const items = read();
    if (!items[index]) return;
    if (qty <= 0) items.splice(index, 1);
    else items[index].cantidad = Math.min(20, qty);
    write(items);
  }

  function remove(index) {
    const items = read();
    items.splice(index, 1);
    write(items);
  }

  function clear() { write([]); }

  function total() {
    return read().reduce((s, i) => s + i.precio * i.cantidad, 0);
  }

  function count() {
    return read().reduce((s, i) => s + i.cantidad, 0);
  }

  // ── UI ──
  function renderBadge() {
    const n = count();
    ['navCartCount', 'navCartCountMobile'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = n; el.hidden = n === 0; }
    });
  }

  function esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderDrawer() {
    const wrap = document.getElementById('cartItems');
    const foot = document.getElementById('cartFoot');
    if (!wrap) return;
    const items = read();

    if (!items.length) {
      wrap.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon">🎈</div>
          Tu carrito está vacío.<br/>¡Llénalo de globos!
        </div>`;
      if (foot) foot.hidden = true;
      return;
    }

    wrap.innerHTML = items.map((it, i) => `
      <div class="cart-item">
        ${it.imagen
          ? `<img src="${esc(it.imagen)}" alt="" class="cart-item-img" />`
          : `<div class="cart-item-img" style="display:flex;align-items:center;justify-content:center;font-size:1.4rem">🎈</div>`}
        <div class="cart-item-info">
          <div class="cart-item-nombre">${esc(it.nombre)}</div>
          ${it.color ? `<div class="cart-item-meta">Color: ${esc(it.color)}</div>` : ''}
          ${it.dedicatoria ? `<div class="cart-item-meta">"${esc(it.dedicatoria)}"</div>` : ''}
          <div class="cart-item-precio">S/ ${(it.precio * it.cantidad).toFixed(2)}</div>
        </div>
        <div class="cart-item-right">
          <div class="cart-qty">
            <button data-act="minus" data-i="${i}" aria-label="Menos">−</button>
            <span>${it.cantidad}</span>
            <button data-act="plus" data-i="${i}" aria-label="Más">+</button>
          </div>
          <button class="cart-item-remove" data-act="remove" data-i="${i}">Quitar</button>
        </div>
      </div>`).join('');

    const totalEl = document.getElementById('cartTotal');
    if (totalEl) totalEl.textContent = 'S/ ' + total().toFixed(2);
    if (foot) foot.hidden = false;
  }

  function openDrawer() {
    document.getElementById('cartDrawer')?.classList.add('open');
    document.getElementById('cartOverlay')?.classList.add('open');
    renderDrawer();
  }
  function closeDrawer() {
    document.getElementById('cartDrawer')?.classList.remove('open');
    document.getElementById('cartOverlay')?.classList.remove('open');
  }

  return { read, add, setQty, remove, clear, total, count, openDrawer, closeDrawer, renderBadge, renderDrawer };
})();

// ── BINDINGS ──
document.addEventListener('DOMContentLoaded', () => {
  gbCart.renderBadge();
  gbCart.renderDrawer();

  ['navCartBtn', 'navCartBtnMobile'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', gbCart.openDrawer);
  });
  document.getElementById('cartClose')?.addEventListener('click', gbCart.closeDrawer);
  document.getElementById('cartOverlay')?.addEventListener('click', gbCart.closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') gbCart.closeDrawer(); });

  // Botones +/−/quitar dentro del drawer (delegación)
  document.getElementById('cartItems')?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const i = parseInt(btn.dataset.i, 10);
    const items = gbCart.read();
    if (btn.dataset.act === 'plus') gbCart.setQty(i, items[i].cantidad + 1);
    if (btn.dataset.act === 'minus') gbCart.setQty(i, items[i].cantidad - 1);
    if (btn.dataset.act === 'remove') gbCart.remove(i);
  });

  // Nav móvil (hamburguesa) — en la landing lo maneja main.js; aquí, tienda.js
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
    });
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
    }));
  }
});

// ── FUNNEL: contadores via API REST de Firestore (sin cargar el SDK completo) ──
// Las reglas permiten update en metricas/general; el resto sigue protegido.
function gbTrack(field) {
  try {
    fetch('https://firestore.googleapis.com/v1/projects/globobym/databases/(default)/documents:commit?key=AIzaSyDDRomYCtRzPkCLbWlqlgRNnQ8aSj2izQ4', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        writes: [{
          transform: {
            document: 'projects/globobym/databases/(default)/documents/metricas/general',
            fieldTransforms: [{ fieldPath: field, increment: { integerValue: '1' } }]
          }
        }]
      })
    }).catch(() => {});
  } catch (e) {}
  try { if (window.gtag) gtag('event', field); } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
  // Visita al catálogo de la tienda (solo la página /tienda/, no productos)
  if (document.getElementById('productosGrid')) gbTrack('tienda_visitas');

  // Clics a WhatsApp desde páginas de tienda
  document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
    a.addEventListener('click', () => gbTrack('whatsapp_clicks'));
  });
});
