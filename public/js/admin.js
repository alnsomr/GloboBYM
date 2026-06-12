  // ── FIREBASE INIT ──
  firebase.initializeApp({
    apiKey:            "AIzaSyDDRomYCtRzPkCLbWlqlgRNnQ8aSj2izQ4",
    authDomain:        "globobym.firebaseapp.com",
    projectId:         "globobym",
    storageBucket:     "globobym.firebasestorage.app",
    messagingSenderId: "499147123529",
    appId:             "1:499147123529:web:ad69e31c0dbeabdcc20898"
  });
  const db   = firebase.firestore();
  const auth = firebase.auth();

  // ── AUTH STATE ──
  auth.onAuthStateChanged(user => {
    if (user) {
      showDashboard(user);
    } else {
      document.getElementById('loginScreen').hidden = false;
      document.getElementById('dashboard').hidden   = true;
    }
  });

  // ── LOGIN ──
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn   = document.getElementById('loginBtn');
    const errEl = document.getElementById('loginError');
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPass').value;
    btn.disabled = true;
    btn.textContent = 'Entrando...';
    errEl.textContent = '';
    try {
      await auth.signInWithEmailAndPassword(email, pass);
    } catch(err) {
      errEl.textContent = 'Email o contraseña incorrectos.';
      btn.disabled = false;
      btn.textContent = 'Entrar al panel';
    }
  });

  // ── LOGOUT ──
  document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());

  // ── STATE ──
  let allOrders     = [];
  let currentFilter = 'todos';
  let currentType   = '';
  let knownIds      = null;  // null = first load pending

  // ── DASHBOARD INIT ──
  function showDashboard(user) {
    document.getElementById('loginScreen').hidden = true;
    document.getElementById('dashboard').hidden   = false;
    document.getElementById('userEmail').textContent = user.email;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    firebase.firestore()
      .collection('pedidos')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const fresh = [];
        snapshot.forEach(doc => fresh.push({ id: doc.id, ...doc.data() }));

        if (knownIds === null) {
          // First load — just record IDs, no notification
          knownIds = new Set(fresh.map(o => o.id));
        } else {
          // Subsequent updates — notify for truly new docs
          fresh.forEach(o => {
            if (!knownIds.has(o.id)) {
              notifyNew(o);
              knownIds.add(o.id);
            }
          });
        }

        allOrders = fresh;
        migrateLegacyVentaCerrada();
        autoTransitionContactado();
        autoTransitionAtendido();
        updateStats();
        renderOrders();
        if (!document.getElementById('sectionResumen').hidden) renderResumen();
      }, err => {
        console.error('Firestore error:', err);
      });
  }

  // ── STATS ──
  function updateStats() {
    const c = { nuevo: 0, contactado: 0, pagado: 0, atendido: 0, venta: 0, sin_compra: 0 };
    allOrders.forEach(o => { if (c[o.estado] !== undefined) c[o.estado]++; });
    document.getElementById('statNuevo').textContent      = c.nuevo;
    document.getElementById('statContactado').textContent = c.contactado;
    document.getElementById('statPagado').textContent     = c.pagado;
    document.getElementById('statAtendido').textContent   = c.atendido;
    document.getElementById('statVenta').textContent      = c.venta;
    document.getElementById('statSinCompra').textContent  = c.sin_compra;
  }

  // ── RENDER ORDERS ──
  function renderOrders() {
    let list = [...allOrders];
    if (currentFilter !== 'todos') list = list.filter(o => o.estado === currentFilter);
    if (currentType)               list = list.filter(o => o.tipo   === currentType);

    const count = document.getElementById('filterCount');
    count.textContent = list.length ? `${list.length} pedido${list.length > 1 ? 's' : ''}` : '';

    const wrap = document.getElementById('ordersList');
    if (!list.length) {
      wrap.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-title">No hay pedidos aquí</div>
          <div class="empty-sub">Cambia los filtros o espera nuevas consultas.</div>
        </div>`;
      return;
    }
    wrap.innerHTML = `<div class="orders-grid">${list.map(cardHTML).join('')}</div>`;
  }

  // ── CARD HTML ──
  const STATUS_LABELS = {
    nuevo:         '🔴 Nuevo',
    contactado:    '🟡 Contactado',
    venta_cerrada: '🔵 Venta Cerrada',
    pagado:        '🟣 Separado',
    atendido:      '🟢 Atendido',
    venta:         '💎 Venta',
    sin_compra:    '⚪ Sin Compra',
  };

  // Mapeo de retroceso (estado actual → estado al que regresa)
  const BACK_MAP = {
    contactado: 'nuevo',
    sin_compra: 'contactado',
    pagado:     'contactado',
    atendido:   'pagado',
  };

  function statusActions(o) {
    const id = o.id, st = o.estado;
    const back = BACK_MAP[st]
      ? `<button class="btn-back" title="Volver a ${STATUS_LABELS[BACK_MAP[st]]}" onclick="setStatus('${id}','${BACK_MAP[st]}',this,true)">↩</button>`
      : '';
    if (st === 'nuevo') return `
      <div class="card-status-actions">
        <button class="btn-status" onclick="setStatus('${id}','contactado',this)">✓ Contactado</button>
      </div>`;
    if (st === 'contactado') return `
      <div class="card-status-actions">
        ${back}
        <button class="btn-sincompra" onclick="setStatus('${id}','sin_compra',this)">✕ Sin compra</button>
        <button class="btn-venta"     onclick="setStatus('${id}','pagado',this)">💳 Separado</button>
      </div>`;
    if (st === 'sin_compra') return `
      <div class="card-status-actions">
        ${back}
      </div>`;
    if (st === 'pagado') return `
      <div class="card-status-actions">
        ${back}
        <button class="btn-status" onclick="setStatus('${id}','atendido',this)">✅ Atendido</button>
      </div>`;
    if (st === 'atendido') return `
      <div class="card-status-actions">
        ${back}
      </div>`;
    return ''; // venta: estado bloqueado (terminal automático)
  }

  function cardHTML(o) {
    const t   = o.createdAt?.toDate ? o.createdAt.toDate() : (o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : null);
    const tel = o.telefono ? o.telefono.replace(/[\s\-\(\)]/g, '') : '';
    const waText = encodeURIComponent(
      `Hola ${esc(o.nombre) || 'cliente'} 👋, te contactamos de GloboBYM 🎈\n` +
      `Recibimos tu consulta para *${esc(o.tipo) || 'tu evento'}*. ¿Cuándo podemos hablar?`
    );

    return `
      <div class="order-card ${o.estado}">
        <div class="card-header">
          <span class="status-badge ${o.estado}">${STATUS_LABELS[o.estado] || o.estado}</span>
          <span class="card-time">${t ? timeAgo(t) : ''}</span>
        </div>
        <div class="card-body">
          <div class="card-name">${esc(o.nombre) || 'Sin nombre'}</div>
          <div class="card-meta">
            ${o.telefono ? `<span class="card-meta-item">📱 <strong>${esc(o.telefono)}</strong></span>` : ''}
            ${o.tipo     ? `<span class="card-meta-item">🎈 <strong>${esc(o.tipo)}</strong></span>` : ''}
            ${o.pack     ? `<span class="card-meta-item">📦 <strong>${esc(o.pack)}</strong></span>` : ''}
            ${o.fecha    ? `<span class="card-meta-item">📅 <strong>${esc(o.fecha)}</strong></span>` : ''}
          </div>
          ${o.mensaje ? `<div class="card-message">"${esc(o.mensaje)}"</div>` : ''}
        </div>
        ${precioRowHTML(o)}
        <div class="card-actions">
          ${tel ? `
            <a href="https://wa.me/${tel}?text=${waText}" target="_blank" class="btn-wa">💬 WhatsApp</a>
            <a href="tel:${tel}" class="btn-call">📞 Llamar</a>
          ` : ''}
          ${statusActions(o)}
        </div>
      </div>`;
  }

  // ── PRECIO / SALDO ──
  const MONTO_SEPARADO = 100;

  function precioRowHTML(o) {
    // Solo se muestra cuando el pedido está separado, atendido o venta
    if (!['pagado', 'atendido', 'venta'].includes(o.estado)) return '';
    const precio = typeof o.precioTotal === 'number' ? o.precioTotal : null;
    if (precio === null) {
      return `
        <div class="card-precio-row">
          <button class="btn-precio" onclick="askPrecio('${o.id}')">💰 Ingresar precio total</button>
          <span class="col-muted">Separado: S/ ${MONTO_SEPARADO}</span>
        </div>`;
    }
    // Atendido / venta: saldo se considera cobrado al marcar el evento como atendido
    const cobradoFull = ['atendido', 'venta'].includes(o.estado);
    const saldo = Math.max(0, precio - MONTO_SEPARADO);
    const saldoClass = cobradoFull || saldo === 0 ? 'zero' : 'pending';
    const saldoText  = cobradoFull
      ? `✅ Cobrado completo (S/ ${precio})`
      : saldo === 0
        ? '✅ Pagado completo'
        : `Saldo: S/ ${saldo}`;
    return `
      <div class="card-precio-row">
        <span>💰 Precio: <span class="precio-val">S/ ${precio}</span></span>
        <span>· Separado: <span class="precio-val">S/ ${MONTO_SEPARADO}</span></span>
        <span class="saldo-val ${saldoClass}">${saldoText}</span>
        <button class="btn-precio-edit" title="Editar precio" onclick="askPrecio('${o.id}')">✏️</button>
      </div>`;
  }

  async function askPrecio(id) {
    const o = allOrders.find(x => x.id === id);
    const current = (o && typeof o.precioTotal === 'number') ? o.precioTotal : '';
    const input = prompt(`Precio total del servicio en soles (S/):\n\nSe descontarán S/ ${MONTO_SEPARADO} (monto separado) y se mostrará el saldo pendiente.`, current);
    if (input === null) return;
    const trimmed = String(input).trim();
    if (trimmed === '') {
      // Permite borrar el precio
      try {
        await firebase.firestore().collection('pedidos').doc(id).update({
          precioTotal: firebase.firestore.FieldValue.delete()
        });
      } catch (e) { console.error('Error borrando precio:', e); }
      return;
    }
    const n = Number(trimmed.replace(',', '.'));
    if (!isFinite(n) || n < 0) {
      alert('Precio inválido. Ingresa un número positivo.');
      return;
    }
    try {
      await firebase.firestore().collection('pedidos').doc(id).update({
        precioTotal: n,
        precioSetAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.error('Error guardando precio:', e);
      alert('No se pudo guardar el precio. Revisa la conexión.');
    }
  }

  // ── SET STATUS ──
  // isBack = true → no se sobrescriben los timestamps (preserva historial al retroceder)
  async function setStatus(id, newState, btn, isBack) {
    if (btn) { btn.disabled = true; btn.closest('.card-status-actions')?.querySelectorAll('button').forEach(b => b.disabled = true); }
    const extra = {};
    if (!isBack) {
      if (newState === 'contactado') extra.contactadoAt = firebase.firestore.FieldValue.serverTimestamp();
      if (newState === 'pagado')     extra.pagadoAt     = firebase.firestore.FieldValue.serverTimestamp();
      if (newState === 'atendido')   extra.atendidoAt   = firebase.firestore.FieldValue.serverTimestamp();
      if (newState === 'sin_compra') extra.sinCompraAt  = firebase.firestore.FieldValue.serverTimestamp();
    }
    try {
      await firebase.firestore().collection('pedidos').doc(id).update({ estado: newState, ...extra });
    } catch(e) {
      console.error('Error updating status:', e);
      if (btn) { btn.disabled = false; }
    }
  }

  function tsToMs(ts) {
    if (!ts) return null;
    if (ts.toDate) return ts.toDate().getTime();
    if (ts.seconds) return ts.seconds * 1000;
    return null;
  }

  // ── AUTO-TRANSITION: contactado → sin_compra después de 7 días ──
  function autoTransitionContactado() {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    allOrders.forEach(o => {
      if (o.estado !== 'contactado') return;
      const ref = tsToMs(o.contactadoAt) || tsToMs(o.createdAt);
      if (ref && ref < sevenDaysAgo) {
        firebase.firestore().collection('pedidos').doc(o.id).update({
          estado: 'sin_compra',
          sinCompraAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    });
  }

  // ── AUTO-TRANSITION: atendido → venta después de 24h ──
  function autoTransitionAtendido() {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    allOrders.forEach(o => {
      if (o.estado !== 'atendido') return;
      const ref = tsToMs(o.atendidoAt);
      if (ref && ref < dayAgo) {
        firebase.firestore().collection('pedidos').doc(o.id).update({
          estado: 'venta',
          ventaAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    });
  }

  // ── MIGRACIÓN LEGACY: pedidos viejos en venta_cerrada → pagado ──
  function migrateLegacyVentaCerrada() {
    allOrders.forEach(o => {
      if (o.estado !== 'venta_cerrada') return;
      const update = { estado: 'pagado' };
      if (!o.pagadoAt && o.ventaCerradaAt) update.pagadoAt = o.ventaCerradaAt;
      firebase.firestore().collection('pedidos').doc(o.id).update(update);
    });
  }

  // ── MAIN NAV ──
  let visitasTotal   = null;
  let visitasSitio   = null;
  let tiempoTotal    = 0;
  let tiempoSesiones = 0;
  let origenes       = {};

  document.querySelectorAll('.main-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.main-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const section = btn.dataset.section;
      document.getElementById('sectionCotizaciones').hidden = section !== 'cotizaciones';
      document.getElementById('sectionTienda').hidden       = section !== 'tienda';
      document.getElementById('sectionResumen').hidden      = section !== 'resumen';
      document.getElementById('sectionTracking').hidden     = section !== 'tracking';
      if (section === 'tracking') renderTracking();
      if (section === 'resumen')  renderResumen();
    });
  });

  function pct(num, den) {
    if (!den) return '—';
    return Math.round(num / den * 100) + '%';
  }

  // ── RESUMEN ──
  let resumenFilters = { nombre: '', evento: '', mes: '' };

  function bindResumenFilters() {
    if (bindResumenFilters._done) return;
    bindResumenFilters._done = true;
    const fn = document.getElementById('rsmFilterNombre');
    const fe = document.getElementById('rsmFilterEvento');
    const fm = document.getElementById('rsmFilterMes');
    const fc = document.getElementById('rsmFilterClear');
    const fx = document.getElementById('rsmExportBtn');
    fn.addEventListener('input', () => { resumenFilters.nombre = fn.value.trim().toLowerCase(); renderResumen(); });
    fe.addEventListener('change', () => { resumenFilters.evento = fe.value; renderResumen(); });
    fm.addEventListener('change', () => { resumenFilters.mes = fm.value; renderResumen(); });
    fc.addEventListener('click', () => {
      resumenFilters = { nombre: '', evento: '', mes: '' };
      fn.value = ''; fe.value = ''; fm.value = '';
      renderResumen();
    });
    fx.addEventListener('click', exportResumenCSV);
  }

  function getFilteredResumenOrders() {
    const { nombre, evento, mes } = resumenFilters;
    return allOrders.filter(o => {
      if (o.estado === 'sin_compra') return false;
      if (nombre && !(o.nombre || '').toLowerCase().includes(nombre)) return false;
      if (evento && o.tipo !== evento) return false;
      if (mes) {
        const f = parseFechaEvento(o.fecha);
        if (!f) return false;
        const orderMes = `${f.year}-${String(f.month).padStart(2, '0')}`;
        if (orderMes !== mes) return false;
      }
      return true;
    }).sort((a, b) => {
      const fa = parseFechaEvento(a.fecha);
      const fb = parseFechaEvento(b.fecha);
      if (!fa && !fb) return 0;
      if (!fa) return 1;
      if (!fb) return -1;
      return fb.raw.localeCompare(fa.raw);
    });
  }

  function csvCell(v) {
    const s = (v === null || v === undefined) ? '' : String(v);
    if (/[";\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function fmtFechaCreacion(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : null);
    if (!d) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function exportResumenCSV() {
    const orders = getFilteredResumenOrders();
    if (!orders.length) {
      alert('No hay pedidos para exportar con los filtros actuales.');
      return;
    }
    const headers = [
      'Cliente', 'Teléfono', 'Evento', 'Pack', 'Fecha del evento', 'Distrito',
      'Estado', 'Precio total (S/)', 'Monto separado (S/)', 'Saldo (S/)',
      'Mensaje', 'Fecha de cotización'
    ];
    const rows = orders.map(o => {
      const precio       = typeof o.precioTotal === 'number' ? o.precioTotal : '';
      const cobradoFull  = ['atendido', 'venta'].includes(o.estado);
      const tieneSeparado = ['pagado', 'atendido', 'venta'].includes(o.estado) && precio !== '';
      const separado     = tieneSeparado ? MONTO_SEPARADO : '';
      let saldo = '';
      if (precio !== '' && tieneSeparado) saldo = cobradoFull ? 0 : Math.max(0, precio - MONTO_SEPARADO);
      // Estado en texto plano (sin emoji para Excel)
      const estadoLabel = (STATUS_LABELS[o.estado] || o.estado).replace(/^[^\w\sñÑáéíóúÁÉÍÓÚ]+\s*/, '');
      return [
        o.nombre || '', o.telefono || '', o.tipo || '', o.pack || '', o.fecha || '', o.distrito || '',
        estadoLabel, precio, separado, saldo,
        (o.mensaje || '').replace(/[\r\n]+/g, ' '),
        fmtFechaCreacion(o.createdAt)
      ];
    });
    // BOM + separador ; para compatibilidad con Excel en locale es-PE
    const csv = '﻿' + [headers, ...rows].map(r => r.map(csvCell).join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const ts   = new Date();
    const pad  = n => String(n).padStart(2, '0');
    a.href     = url;
    a.download = `globobym_pedidos_${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function parseFechaEvento(fechaStr) {
    // Espera formato YYYY-MM-DD (input type=date)
    if (!fechaStr || typeof fechaStr !== 'string') return null;
    const m = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return { year: +m[1], month: +m[2], day: +m[3], raw: fechaStr };
  }

  function renderResumen() {
    bindResumenFilters();

    // Totales (no afectados por filtros)
    const atendidosCount = allOrders.filter(o => o.estado === 'atendido').length;
    const ventasCount    = allOrders.filter(o => o.estado === 'venta').length;
    const ingresos = allOrders
      .filter(o => ['atendido','venta'].includes(o.estado) && typeof o.precioTotal === 'number')
      .reduce((sum, o) => sum + o.precioTotal, 0);
    const saldoPendiente = allOrders
      .filter(o => o.estado === 'pagado' && typeof o.precioTotal === 'number')
      .reduce((sum, o) => sum + Math.max(0, o.precioTotal - MONTO_SEPARADO), 0);

    document.getElementById('rsmAtendidos').textContent = atendidosCount;
    document.getElementById('rsmVentas').textContent    = ventasCount;
    document.getElementById('rsmIngresos').textContent  = 'S/ ' + ingresos.toLocaleString('es-PE');
    document.getElementById('rsmSaldoPendiente').textContent = 'S/ ' + saldoPendiente.toLocaleString('es-PE');

    // Lista filtrada (excluye sin_compra para enfocar en pedidos viables/históricos)
    const { nombre, evento, mes } = resumenFilters;
    const filtered = allOrders.filter(o => {
      if (o.estado === 'sin_compra') return false;
      if (nombre && !(o.nombre || '').toLowerCase().includes(nombre)) return false;
      if (evento && o.tipo !== evento) return false;
      if (mes) {
        // mes formato YYYY-MM
        const f = parseFechaEvento(o.fecha);
        if (!f) return false;
        const orderMes = `${f.year}-${String(f.month).padStart(2, '0')}`;
        if (orderMes !== mes) return false;
      }
      return true;
    });

    // Ordenar por fecha del evento descendente (más recientes primero)
    filtered.sort((a, b) => {
      const fa = parseFechaEvento(a.fecha);
      const fb = parseFechaEvento(b.fecha);
      if (!fa && !fb) return 0;
      if (!fa) return 1;
      if (!fb) return -1;
      return fb.raw.localeCompare(fa.raw);
    });

    const info = document.getElementById('rsmResultsInfo');
    info.textContent = filtered.length
      ? `${filtered.length} pedido${filtered.length > 1 ? 's' : ''} encontrado${filtered.length > 1 ? 's' : ''}`
      : (nombre || evento || mes) ? 'Sin resultados con esos filtros' : '';

    const list = document.getElementById('rsmResultsList');
    if (!filtered.length) {
      list.innerHTML = (nombre || evento || mes)
        ? `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">Sin coincidencias</div><div class="empty-sub">Prueba con otro nombre, evento o mes.</div></div>`
        : `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">Aún no hay datos</div><div class="empty-sub">Cuando lleguen pedidos aparecerán aquí.</div></div>`;
      return;
    }

    const rows = filtered.map(o => {
      const precio = typeof o.precioTotal === 'number' ? o.precioTotal : null;
      const cobradoFull = ['atendido', 'venta'].includes(o.estado);
      const saldo  = precio !== null ? Math.max(0, precio - MONTO_SEPARADO) : null;
      let saldoClass, saldoText;
      if (precio === null)  { saldoClass = 'col-muted'; saldoText = '—'; }
      else if (cobradoFull) { saldoClass = 'zero';      saldoText = '✅ Cobrado'; }
      else if (saldo === 0) { saldoClass = 'zero';      saldoText = '✅ Pagado'; }
      else                  { saldoClass = 'pending';   saldoText = `S/ ${saldo}`; }
      return `
        <div class="resumen-row">
          <div class="col-name" data-label="Cliente">${esc(o.nombre) || '—'}</div>
          <div data-label="Evento">${esc(o.tipo) || '—'}</div>
          <div data-label="Pack">${esc(o.pack) || '—'}</div>
          <div class="col-muted" data-label="Fecha">${esc(o.fecha) || '—'}</div>
          <div class="col-state" data-label="Estado"><span class="status-badge ${o.estado}">${STATUS_LABELS[o.estado] || o.estado}</span></div>
          <div class="col-precio" data-label="Precio">${precio !== null ? 'S/ ' + precio.toLocaleString('es-PE') : '—'}</div>
          <div class="col-saldo ${saldoClass}" data-label="Saldo">${saldoText}</div>
        </div>`;
    }).join('');

    list.innerHTML = `
      <div class="resumen-row header">
        <div>Cliente</div>
        <div>Evento</div>
        <div>Pack</div>
        <div>Fecha</div>
        <div>Estado</div>
        <div>Precio</div>
        <div>Saldo</div>
      </div>
      ${rows}`;
  }

  function renderTracking() {
    const total   = allOrders.length;
    const ventas  = allOrders.filter(o => ['pagado','atendido','venta'].includes(o.estado)).length;
    const visitas = visitasTotal;
    const sitio   = visitasSitio;

    // Metric cards
    document.getElementById('trVisitasSitio').textContent = sitio !== null ? sitio : '—';
    document.getElementById('trVisitas').textContent      = visitas !== null ? visitas : '—';
    document.getElementById('trFormularios').textContent  = total;
    document.getElementById('trConversion').textContent   = visitas ? pct(total, visitas) : '—';
    document.getElementById('trCierre').textContent       = pct(ventas, total);

    // ── TIEMPO PROMEDIO EN LA WEB ──
    if (tiempoSesiones > 0) {
      const avgSeg = Math.round(tiempoTotal / tiempoSesiones);
      document.getElementById('trTiempoWeb').textContent =
        avgSeg < 60  ? avgSeg + 's'
        : avgSeg < 3600 ? Math.floor(avgSeg/60) + 'm ' + (avgSeg%60) + 's'
        : (Math.round(avgSeg/3600 * 10) / 10) + 'h';
    } else {
      document.getElementById('trTiempoWeb').textContent = '—';
    }

    // Funnel bars — base es visitas al sitio (o el primer dato disponible)
    const base = sitio || total || 1;
    function setBar(id, cntId, pctId, count, refBase, color) {
      const w = Math.round(count / base * 100);
      const el = document.getElementById(id);
      el.style.width = w + '%';
      el.style.background = color || '';
      document.getElementById(cntId).textContent = count;
      if (pctId) document.getElementById(pctId).textContent = pct(count, refBase);
    }

    // Funnel paso 1: visitas al sitio
    document.getElementById('fcntSitio').textContent = sitio !== null ? sitio : '—';
    document.getElementById('fbarSitio').style.width = '100%';
    setBar('fbarForm',  'fcntForm',  'fpctForm',  total,  sitio || total, 'var(--contactado)');
    setBar('fbarVenta', 'fcntVenta', 'fpctVenta', ventas, total,          'var(--venta)');

    // ── TIEMPO DE RESPUESTA ──
    const tiempos = allOrders
      .filter(o => o.contactadoAt && o.createdAt)
      .map(o => {
        const c = o.createdAt.toDate    ? o.createdAt.toDate()    : new Date(o.createdAt);
        const r = o.contactadoAt.toDate ? o.contactadoAt.toDate() : new Date(o.contactadoAt);
        return (r - c) / 3600000;
      }).filter(h => h >= 0);
    if (tiempos.length) {
      const avg = tiempos.reduce((a,b) => a+b, 0) / tiempos.length;
      document.getElementById('trRespuesta').textContent =
        avg < 1  ? Math.round(avg * 60) + 'min'
        : avg < 24 ? Math.round(avg) + 'h'
        : (Math.round(avg / 24 * 10) / 10) + 'd';
    } else {
      document.getElementById('trRespuesta').textContent = '—';
    }

    // ── EVENTOS PRÓXIMOS 7 DÍAS ──
    const hoy7 = new Date(); hoy7.setHours(0,0,0,0);
    const en7  = new Date(hoy7); en7.setDate(en7.getDate() + 7);
    const proximos = allOrders.filter(o => {
      if (!o.fecha || ['atendido','sin_compra'].includes(o.estado)) return false;
      const fev = new Date(o.fecha + 'T00:00:00');
      return fev >= hoy7 && fev <= en7;
    }).sort((a,b) => a.fecha.localeCompare(b.fecha));
    document.getElementById('trProximos').textContent = proximos.length;
    const ul = document.getElementById('upcomingList');
    if (proximos.length) {
      ul.innerHTML = proximos.map(o => {
        const d = new Date(o.fecha + 'T00:00:00');
        const lbl = d.toLocaleDateString('es-PE', {day:'numeric', month:'short'});
        return `<div class="upcoming-item">
          <div class="upcoming-date">${lbl}</div>
          <div class="upcoming-info">
            <div class="upcoming-name">${o.nombre}</div>
            <div class="upcoming-tipo">${o.tipo || ''}</div>
          </div>
          <span class="badge badge-${o.estado}">${(STATUS_LABELS||{})[o.estado]||o.estado}</span>
        </div>`;
      }).join('');
    } else {
      ul.innerHTML = '<div class="upcoming-empty">Sin eventos en los próximos 7 días</div>';
    }

    // ── TIPO DE EVENTO ──
    const tipoCount = {};
    allOrders.forEach(o => { const t = o.tipo||'Otro'; tipoCount[t]=(tipoCount[t]||0)+1; });
    const tipoMax = Math.max(...Object.values(tipoCount), 1);
    document.getElementById('tipoList').innerHTML =
      Object.entries(tipoCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v]) =>
        `<div class="rank-item">
          <div class="rank-item-label">${k}</div>
          <div class="rank-item-bar-wrap"><div class="rank-item-bar" style="width:${Math.round(v/tipoMax*100)}%"></div></div>
          <div class="rank-item-count">${v}</div>
        </div>`
      ).join('') || '<div class="upcoming-empty">Sin datos aún</div>';

    // ── MES MÁS ACTIVO ──
    const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const mesCount = {};
    allOrders.forEach(o => {
      if (!o.createdAt) return;
      const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      const k = MESES_ES[d.getMonth()] + ' ' + d.getFullYear();
      mesCount[k] = (mesCount[k]||0)+1;
    });
    const mesMax = Math.max(...Object.values(mesCount), 1);
    document.getElementById('mesList').innerHTML =
      Object.entries(mesCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v]) =>
        `<div class="rank-item">
          <div class="rank-item-label">${k}</div>
          <div class="rank-item-bar-wrap"><div class="rank-item-bar" style="width:${Math.round(v/mesMax*100)}%"></div></div>
          <div class="rank-item-count">${v}</div>
        </div>`
      ).join('') || '<div class="upcoming-empty">Sin datos aún</div>';

    // ── DISTRITOS ──
    const distritoCount = {};
    allOrders.forEach(o => {
      const d = (o.distrito || '').trim();
      if (d) distritoCount[d] = (distritoCount[d] || 0) + 1;
    });
    const distritoMax = Math.max(...Object.values(distritoCount), 1);
    document.getElementById('distritoList').innerHTML =
      Object.entries(distritoCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v]) =>
        `<div class="rank-item">
          <div class="rank-item-label">${k}</div>
          <div class="rank-item-bar-wrap"><div class="rank-item-bar" style="width:${Math.round(v/distritoMax*100)}%"></div></div>
          <div class="rank-item-count">${v}</div>
        </div>`
      ).join('') || '<div class="upcoming-empty">Sin datos aún</div>';

    // ── ORIGEN DEL TRÁFICO ──
    const ORIGEN_LABELS = {
      instagram: '📷 Instagram',
      facebook:  '👤 Facebook',
      tiktok:    '🎵 TikTok',
      whatsapp:  '💬 WhatsApp',
      google:    '🔍 Google',
      bing:      '🔍 Bing',
      youtube:   '▶ YouTube',
      twitter:   '🐦 X / Twitter',
      linkedin:  '💼 LinkedIn',
      directo:   '🔗 Directo',
      otro:      '🌐 Otro',
    };
    const origenEntries = Object.entries(origenes).filter(([,v]) => v > 0);
    const origenMax     = Math.max(...origenEntries.map(([,v]) => v), 1);
    document.getElementById('origenList').innerHTML =
      origenEntries.sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v]) => {
        const lbl = ORIGEN_LABELS[k] || ('🌐 ' + k);
        return `<div class="rank-item">
          <div class="rank-item-label">${lbl}</div>
          <div class="rank-item-bar-wrap"><div class="rank-item-bar" style="width:${Math.round(v/origenMax*100)}%"></div></div>
          <div class="rank-item-count">${v}</div>
        </div>`;
      }).join('') || '<div class="upcoming-empty">Sin datos aún</div>';

    // ── HORA PICO DE COTIZACIÓN ──
    const horaCount = {};
    allOrders.forEach(o => {
      if (!o.createdAt) return;
      const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      const h = d.getHours();
      const lbl = String(h).padStart(2,'0') + ':00 – ' + String((h+1)%24).padStart(2,'0') + ':00';
      horaCount[lbl] = (horaCount[lbl] || 0) + 1;
    });
    const horaMax = Math.max(...Object.values(horaCount), 1);
    document.getElementById('horaList').innerHTML =
      Object.entries(horaCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v]) =>
        `<div class="rank-item">
          <div class="rank-item-label">${k}</div>
          <div class="rank-item-bar-wrap"><div class="rank-item-bar" style="width:${Math.round(v/horaMax*100)}%"></div></div>
          <div class="rank-item-count">${v}</div>
        </div>`
      ).join('') || '<div class="upcoming-empty">Sin datos aún</div>';

    // ── CLIENTES ──
    const telCount = {};
    allOrders.forEach(o => { const t = (o.telefono||'').trim(); if(t) telCount[t]=(telCount[t]||0)+1; });
    const unicos      = Object.keys(telCount).length;
    const recurrentes = Object.values(telCount).filter(c => c > 1).length;
    document.getElementById('trUnicos').textContent      = unicos;
    document.getElementById('trRecurrentes').textContent = recurrentes;
  }

  // Cargar visitas desde Firestore
  firebase.firestore().collection('metricas').doc('general')
    .onSnapshot(snap => {
      const data = snap.exists ? snap.data() : {};
      visitasTotal   = data.visitas_formulario    || 0;
      visitasSitio   = data.visitas_sitio         || 0;
      tiempoTotal    = data.tiempo_total_segundos || 0;
      tiempoSesiones = data.tiempo_sesiones       || 0;
      origenes       = data.origenes              || {};
      if (!document.getElementById('sectionTracking').hidden) renderTracking();

      // ── Métricas extra de tracking (catálogo packs + WhatsApp) ──
      const elCat = document.getElementById('trCatalogo');
      const elWa  = document.getElementById('trWhatsapp');
      if (elCat) elCat.textContent = data.catalogo_aperturas || 0;
      if (elWa)  elWa.textContent  = data.whatsapp_clicks || 0;

      // ── Funnel de la tienda ──
      const tv = data.tienda_visitas      || 0;
      const ca = data.carrito_agregados   || 0;
      const ci = data.checkout_inicios    || 0;
      const oc = data.ordenes_completadas || 0;
      const setNum = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      setNum('tdfVisitas',  tv);
      setNum('tdfCarrito',  ca);
      setNum('tdfCheckout', ci);
      setNum('tdfOrdenes',  oc);
      const elAb = document.getElementById('tdfAbandono');
      if (elAb) {
        if (ci > 0) {
          const abandonos = Math.max(0, ci - oc);
          elAb.textContent = abandonos + ' (' + Math.round(abandonos / ci * 100) + '%)';
        } else {
          elAb.textContent = '—';
        }
      }
    });

  // ── FILTERS ──
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderOrders();
    });
  });
  document.getElementById('typeFilter').addEventListener('change', e => {
    currentType = e.target.value;
    renderOrders();
  });

  // ── NOTIFICATIONS ──
  function notifyNew(o) {
    showToast(`Nuevo pedido de ${o.nombre || 'un cliente'} · ${o.tipo || ''}`);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('GloboBYM · Nuevo pedido 🎈', {
        body: `${o.nombre || 'Cliente'} · ${o.tipo || ''} · ${o.fecha || ''}`,
        icon: 'assets/avatar.jpg'
      });
    }
  }

  let toastTimer;
  function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4500);
  }

  // ── HELPERS ──
  function esc(str) {
    return String(str || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function timeAgo(date) {
    const s = Math.floor((Date.now() - date) / 1000);
    if (s <    60) return 'hace un momento';
    if (s <  3600) return `hace ${Math.floor(s / 60)} min`;
    if (s < 86400) return `hace ${Math.floor(s / 3600)}h`;
    if (s < 172800) return 'ayer';
    return `hace ${Math.floor(s / 86400)} días`;
  }

  // ── STATS CHART ──
  let chartInstance  = null;
  let currentPeriod  = 'dias';
  let currentDateType = 'pedido';

  document.getElementById('btnStats').addEventListener('click', () => {
    document.getElementById('statsModal').classList.add('open');
    updateChart();
  });
  document.getElementById('statsModalClose').addEventListener('click', () =>
    document.getElementById('statsModal').classList.remove('open'));
  document.getElementById('statsModal').addEventListener('click', e => {
    if (e.target === document.getElementById('statsModal'))
      document.getElementById('statsModal').classList.remove('open');
  });

  document.querySelectorAll('.period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentPeriod = tab.dataset.period;
      document.getElementById('rangeInputs').classList.toggle('visible', currentPeriod === 'rango');
      if (currentPeriod !== 'rango') updateChart();
    });
  });

  document.querySelectorAll('.date-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.date-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDateType = btn.dataset.dtype;
      updateChart();
    });
  });

  function getOrderDate(o) {
    if (o.createdAt?.toDate) return o.createdAt.toDate();
    if (o.createdAt?.seconds) return new Date(o.createdAt.seconds * 1000);
    return null;
  }

  function getEventDate(o) {
    if (!o.fecha) return null;
    const d = new Date(o.fecha + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }

  function getChartDate(o) {
    return currentDateType === 'evento' ? getEventDate(o) : getOrderDate(o);
  }

  function updateChart() {
    const { labels, nuevo, contactado, pagado, atendido, venta, sin_compra } = buildChartData();
    const ctx = document.getElementById('statsChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: '🔴 Nuevos',      data: nuevo,      backgroundColor: 'rgba(220,38,38,.8)',   borderRadius: 4, borderSkipped: false },
          { label: '🟡 Contactados', data: contactado, backgroundColor: 'rgba(217,119,6,.8)',   borderRadius: 4, borderSkipped: false },
          { label: '🟣 Separados',   data: pagado,     backgroundColor: 'rgba(124,58,237,.8)',  borderRadius: 4, borderSkipped: false },
          { label: '🟢 Atendidos',   data: atendido,   backgroundColor: 'rgba(22,163,74,.8)',   borderRadius: 4, borderSkipped: false },
          { label: '💎 Ventas',      data: venta,      backgroundColor: 'rgba(212,160,23,.85)', borderRadius: 4, borderSkipped: false },
          { label: '⚪ Sin Compra',  data: sin_compra, backgroundColor: 'rgba(100,116,139,.5)', borderRadius: 4, borderSkipped: false },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { usePointStyle: true, padding: 20, font: { size: 12 } } },
          tooltip: {
            callbacks: { label: c => ` ${c.dataset.label.slice(3)}: ${c.parsed.y} pedido${c.parsed.y !== 1 ? 's' : ''}` }
          }
        },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, grid: { color: '#f1f5f9' } }
        }
      }
    });
  }

  function countByEstado(orders, estado) { return orders.filter(o => o.estado === estado).length; }

  function buildChartData() {
    const now = new Date();
    const labels = [], nuevo = [], contactado = [], pagado = [], atendido = [], venta = [], sin_compra = [];

    function pushBucket(bucketOrders) {
      nuevo.push(countByEstado(bucketOrders, 'nuevo'));
      contactado.push(countByEstado(bucketOrders, 'contactado'));
      pagado.push(countByEstado(bucketOrders, 'pagado'));
      atendido.push(countByEstado(bucketOrders, 'atendido'));
      venta.push(countByEstado(bucketOrders, 'venta'));
      sin_compra.push(countByEstado(bucketOrders, 'sin_compra'));
    }

    if (currentPeriod === 'dias') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        labels.push(d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' }));
        pushBucket(allOrders.filter(o => { const t = getChartDate(o); return t && t.toISOString().slice(0, 10) === key; }));
      }
    } else if (currentPeriod === 'semanas') {
      for (let i = 3; i >= 0; i--) {
        const start = new Date(now); start.setDate(start.getDate() - (i + 1) * 7);
        const end   = new Date(now); end.setDate(end.getDate() - i * 7);
        labels.push(`Sem. ${4 - i}`);
        pushBucket(allOrders.filter(o => { const t = getChartDate(o); return t && t >= start && t < end; }));
      }
    } else if (currentPeriod === 'meses') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(d.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }));
        pushBucket(allOrders.filter(o => { const t = getChartDate(o); return t && t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth(); }));
      }
    } else if (currentPeriod === 'rango') {
      const from = new Date(document.getElementById('rangeFrom').value);
      const to   = new Date(document.getElementById('rangeTo').value); to.setHours(23, 59, 59);
      if (isNaN(from) || isNaN(to) || from > to) return { labels: ['Rango inválido'], nuevo: [0], contactado: [0], atendido: [0] };
      const days = Math.min(Math.ceil((to - from) / 86400000) + 1, 90);
      for (let i = 0; i < days; i++) {
        const d = new Date(from); d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        labels.push(d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }));
        pushBucket(allOrders.filter(o => { const t = getChartDate(o); return t && t.toISOString().slice(0, 10) === key; }));
      }
    }
    return { labels, nuevo, contactado, pagado, atendido, venta, sin_compra };
  }

  // ═══════════════════════════════════════════════
  //  ÓRDENES DE LA TIENDA ONLINE (ordenes_tienda)
  // ═══════════════════════════════════════════════
  const TD_LABELS = {
    nuevo:      '🔴 Nueva',
    preparando: '📦 Preparando',
    enviado:    '🚚 Enviada',
    entregado:  '✅ Entregada',
    cancelado:  '✕ Cancelada',
  };
  // estado actual → siguiente paso del flujo
  const TD_NEXT = { nuevo: 'preparando', preparando: 'enviado', enviado: 'entregado' };
  const TD_BACK = { preparando: 'nuevo', enviado: 'preparando', entregado: 'enviado', cancelado: 'nuevo' };

  let tiendaOrders = [];
  let tdFilter     = 'todos';
  let tdInit       = false;

  auth.onAuthStateChanged(user => {
    if (!user || tdInit) return;
    tdInit = true;
    db.collection('ordenes_tienda')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snap => {
        tiendaOrders = [];
        snap.forEach(doc => tiendaOrders.push({ id: doc.id, ...doc.data() }));
        renderTiendaStats();
        renderTiendaOrders();
      }, err => console.error('Firestore ordenes_tienda:', err));
  });

  function renderTiendaStats() {
    const c = { nuevo: 0, preparando: 0, enviado: 0, entregado: 0, cancelado: 0 };
    tiendaOrders.forEach(o => { if (c[o.estado] !== undefined) c[o.estado]++; });
    document.getElementById('tdStatNuevo').textContent      = c.nuevo;
    document.getElementById('tdStatPreparando').textContent = c.preparando;
    document.getElementById('tdStatEnviado').textContent    = c.enviado;
    document.getElementById('tdStatEntregado').textContent  = c.entregado;
    document.getElementById('tdStatCancelado').textContent  = c.cancelado;
    const badge = document.getElementById('tiendaNavBadge');
    if (badge) { badge.textContent = c.nuevo; badge.hidden = c.nuevo === 0; }
  }

  function tdActions(o) {
    const next = TD_NEXT[o.estado];
    const back = TD_BACK[o.estado];
    let html = '<div class="card-status-actions">';
    html += `<button class="btn-delete" title="Eliminar definitivamente (requiere código)" onclick="deleteTiendaOrder('${o.id}')">🗑</button>`;
    if (back) html += `<button class="btn-back" title="Volver a ${TD_LABELS[back]}" onclick="setTiendaStatus('${o.id}','${back}')">↩</button>`;
    if (o.estado === 'nuevo') html += `<button class="btn-sincompra" onclick="setTiendaStatus('${o.id}','cancelado')">✕ Cancelar</button>`;
    if (next) html += `<button class="btn-venta" onclick="setTiendaStatus('${o.id}','${next}')">${TD_LABELS[next]}</button>`;
    html += '</div>';
    return html;
  }

  // Eliminación DEFINITIVA — pide el código 'PRUEBA' para evitar borrados accidentales
  async function deleteTiendaOrder(id) {
    const o = tiendaOrders.find(x => x.id === id);
    const quien = o?.cliente?.nombre ? ` de "${o.cliente.nombre}"` : '';
    const code = prompt(
      `⚠️ ELIMINACIÓN DEFINITIVA de la orden${quien}.\n\n` +
      `Esta acción NO se puede deshacer. La orden desaparecerá del historial.\n\n` +
      `Escribe PRUEBA para confirmar:`
    );
    if (code === null) return; // canceló
    if (code.trim().toUpperCase() !== 'PRUEBA') {
      alert('Código incorrecto. No se eliminó nada.');
      return;
    }
    try {
      await db.collection('ordenes_tienda').doc(id).delete();
    } catch (e) {
      console.error('Error eliminando orden:', e);
      alert('No se pudo eliminar la orden. Revisa la conexión.');
    }
  }
  window.deleteTiendaOrder = deleteTiendaOrder;

  function tiendaCardHTML(o) {
    const t   = o.createdAt?.toDate ? o.createdAt.toDate() : (o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : null);
    const tel = o.cliente?.telefono ? o.cliente.telefono.replace(/[\s\-\(\)]/g, '') : '';
    const waText = encodeURIComponent(
      `Hola ${o.cliente?.nombre || 'cliente'} 👋, te escribimos de GloboBYM 🎈\n` +
      `Recibimos tu pedido de la tienda por S/ ${(o.total || 0).toFixed(2)}. Te confirmamos los detalles y coordinamos el pago.`
    );
    const items = (o.items || []).map(it => `
      <div class="card-item-row">
        <div>
          ${it.cantidad}× ${esc(it.nombre)}
          ${it.color ? `<div class="card-item-det">Color: ${esc(it.color)}</div>` : ''}
          ${it.dedicatoria ? `<div class="card-item-det">"${esc(it.dedicatoria)}"</div>` : ''}
        </div>
        <strong>S/ ${(it.precio * it.cantidad).toFixed(2)}</strong>
      </div>`).join('');

    return `
      <div class="order-card ${o.estado}">
        <div class="card-header">
          <span class="status-badge ${o.estado}">${TD_LABELS[o.estado] || o.estado}</span>
          <span class="card-time">${t ? timeAgo(t) : ''}</span>
        </div>
        <div class="card-body">
          <div class="card-name">${esc(o.cliente?.nombre) || 'Sin nombre'}</div>
          <div class="card-meta">
            ${o.cliente?.telefono ? `<span class="card-meta-item">📱 <strong>${esc(o.cliente.telefono)}</strong></span>` : ''}
            ${o.envio?.fecha ? `<span class="card-meta-item">📅 <strong>${esc(o.envio.fecha)}</strong></span>` : ''}
            ${o.envio?.rango ? `<span class="card-meta-item">🕐 <strong>${esc(o.envio.rango)}</strong></span>` : ''}
          </div>
          <div class="card-meta" style="margin-top:4px">
            ${o.envio?.direccion ? `<span class="card-meta-item">📍 <strong>${esc(o.envio.direccion)}${o.envio.distrito ? ' · ' + esc(o.envio.distrito) : ''}</strong></span>` : ''}
          </div>
          ${o.notas ? `<div class="card-message">"${esc(o.notas)}"</div>` : ''}
        </div>
        <div class="card-items">${items}</div>
        <div class="card-total-row"><span>Total productos</span><span>S/ ${(o.total || 0).toFixed(2)}</span></div>
        <div class="card-actions">
          ${tel ? `
            <a href="https://wa.me/${tel}?text=${waText}" target="_blank" class="btn-wa">💬 WhatsApp</a>
            <a href="tel:${tel}" class="btn-call">📞 Llamar</a>
          ` : ''}
          ${tdActions(o)}
        </div>
      </div>`;
  }

  function renderTiendaOrders() {
    const wrap = document.getElementById('tiendaOrdersList');
    if (!wrap) return;
    const list = tdFilter === 'todos' ? tiendaOrders : tiendaOrders.filter(o => o.estado === tdFilter);
    if (!list.length) {
      wrap.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🛍</div>
          <div class="empty-title">No hay órdenes aquí</div>
          <div class="empty-sub">Cuando lleguen pedidos de la tienda online aparecerán en esta sección.</div>
        </div>`;
      return;
    }
    wrap.innerHTML = `<div class="orders-grid">${list.map(tiendaCardHTML).join('')}</div>`;
  }

  async function setTiendaStatus(id, newState) {
    const extra = {};
    if (newState === 'preparando') extra.preparandoAt = firebase.firestore.FieldValue.serverTimestamp();
    if (newState === 'enviado')    extra.enviadoAt    = firebase.firestore.FieldValue.serverTimestamp();
    if (newState === 'entregado')  extra.entregadoAt  = firebase.firestore.FieldValue.serverTimestamp();
    if (newState === 'cancelado')  extra.canceladoAt  = firebase.firestore.FieldValue.serverTimestamp();
    try {
      await db.collection('ordenes_tienda').doc(id).update({ estado: newState, ...extra });
    } catch (e) {
      console.error('Error actualizando orden tienda:', e);
    }
  }
  window.setTiendaStatus = setTiendaStatus;

  document.querySelectorAll('[data-tdfilter]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-tdfilter]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      tdFilter = tab.dataset.tdfilter;
      renderTiendaOrders();
    });
  });
