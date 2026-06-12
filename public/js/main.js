  // ── FIREBASE INIT ──
  firebase.initializeApp({
    apiKey:            "AIzaSyDDRomYCtRzPkCLbWlqlgRNnQ8aSj2izQ4",
    authDomain:        "globobym.firebaseapp.com",
    projectId:         "globobym",
    storageBucket:     "globobym.firebasestorage.app",
    messagingSenderId: "499147123529",
    appId:             "1:499147123529:web:ad69e31c0dbeabdcc20898"
  });
  const _db = firebase.firestore();

  // ── DETECTAR ORIGEN DEL TRÁFICO ──
  function detectOrigen() {
    // 1. UTM source tiene prioridad (links etiquetados)
    const params = new URLSearchParams(location.search);
    const utm = params.get('utm_source');
    if (utm) return utm.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30) || 'otro';

    // 2. Referrer del navegador
    const ref = document.referrer;
    if (!ref) return 'directo';
    let host = '';
    try { host = new URL(ref).hostname.toLowerCase(); } catch { return 'directo'; }

    if (host === location.hostname) return 'directo';
    if (host.includes('instagram'))                       return 'instagram';
    if (host.includes('facebook') || host.includes('fb.com')) return 'facebook';
    if (host.includes('tiktok'))                          return 'tiktok';
    if (host.includes('whatsapp') || host.includes('wa.me'))  return 'whatsapp';
    if (host.includes('youtube'))                         return 'youtube';
    if (host.includes('google'))                          return 'google';
    if (host.includes('bing'))                            return 'bing';
    if (host.includes('twitter') || host === 'x.com' || host.endsWith('.x.com')) return 'twitter';
    if (host.includes('linkedin'))                        return 'linkedin';
    return 'otro';
  }

  // Contar visita al sitio + origen
  try {
    const origen = detectOrigen();
    _db.collection('metricas').doc('general').set({
      visitas_sitio: firebase.firestore.FieldValue.increment(1),
      origenes: { [origen]: firebase.firestore.FieldValue.increment(1) }
    }, { merge: true });
  } catch(e) {}

  // ── TRACKING TIEMPO EN LA WEB ──
  (() => {
    let activeMs = 0;
    let lastTick = Date.now();
    let visible  = document.visibilityState === 'visible';
    let flushed  = false;

    function accumulate() {
      if (visible) activeMs += Date.now() - lastTick;
      lastTick = Date.now();
    }

    document.addEventListener('visibilitychange', () => {
      accumulate();
      visible = document.visibilityState === 'visible';
      if (!visible) flush();
    });

    function flush() {
      accumulate();
      if (flushed) return;
      const seg = Math.round(activeMs / 1000);
      if (seg < 5) return;
      flushed = true;
      try {
        _db.collection('metricas').doc('general').set({
          tiempo_total_segundos: firebase.firestore.FieldValue.increment(seg),
          tiempo_sesiones:       firebase.firestore.FieldValue.increment(1)
        }, { merge: true });
      } catch(e) {}
    }

    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
  })();

  // ── SCROLL REVEAL ──
  const ro = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); ro.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => ro.observe(el));

  // ── GALLERY SLIDESHOW ──
  document.querySelectorAll('.gallery-item[data-slideshow]').forEach(card => {
    const slides = card.querySelectorAll('img.slide');
    const dotsWrap = card.querySelector('.slide-dots');
    const hint = card.querySelector('.slide-hint');
    let cur = 0;

    slides.forEach((_, i) => {
      const d = document.createElement('div');
      d.className = 'slide-dot' + (i === 0 ? ' active' : '');
      dotsWrap.appendChild(d);
    });
    if (slides.length <= 1 && hint) hint.style.display = 'none';

    card.addEventListener('click', e => {
      if (e.target.closest('.gallery-expand')) return;
      if (slides.length <= 1) return;
      slides[cur].classList.remove('active');
      dotsWrap.children[cur].classList.remove('active');
      cur = (cur + 1) % slides.length;
      slides[cur].classList.add('active');
      dotsWrap.children[cur].classList.add('active');
    });
  });

  // ── LIGHTBOX ──
  const lightbox    = document.getElementById('lightbox');
  const lbImg       = document.getElementById('lightboxImg');
  const lbCaption   = document.getElementById('lightboxCaption');
  let lbImages      = [];
  let lbCurrent     = 0;

  function buildLbImages() {
    lbImages = [];
    document.querySelectorAll('.gallery-item[data-slideshow]').forEach(card => {
      const label = card.querySelector('.gallery-cat-badge')?.textContent || '';
      card.querySelectorAll('img.slide').forEach(img => lbImages.push({ src: img.src, label }));
    });
  }

  function openLightbox(src, label) {
    buildLbImages();
    lbCurrent = lbImages.findIndex(i => i.src === src);
    if (lbCurrent < 0) lbCurrent = 0;
    lbImg.src = src;
    lbCaption.textContent = label;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function lbNav(dir) {
    lbCurrent = (lbCurrent + dir + lbImages.length) % lbImages.length;
    lbImg.src = lbImages[lbCurrent].src;
    lbCaption.textContent = lbImages[lbCurrent].label;
  }

  document.querySelectorAll('.gallery-expand').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const card = btn.closest('.gallery-item');
      const activeImg = card.querySelector('img.slide.active');
      const label = card.querySelector('.gallery-cat-badge')?.textContent || '';
      openLightbox(activeImg.src, label);
    });
  });

  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightboxPrev').addEventListener('click', () => lbNav(-1));
  document.getElementById('lightboxNext').addEventListener('click', () => lbNav(1));
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   lbNav(-1);
    if (e.key === 'ArrowRight')  lbNav(1);
  });

  // ── HERO SLIDESHOW ──
  const heroSlides = document.querySelectorAll('.hero-bg-slide');
  let hCur = 0;
  setInterval(() => {
    heroSlides[hCur].classList.remove('active');
    hCur = (hCur + 1) % heroSlides.length;
    heroSlides[hCur].classList.add('active');
  }, 4000);

  // ── HAMBURGER ──
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  hamburger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    hamburger.classList.remove('open');
  }));

  // ── FORM MODAL ──
  const formModal     = document.getElementById('formModal');
  const formModalClose = document.getElementById('formModalClose');

  let formOpenedAt = 0; // anti-bot: medir cuánto tarda en enviarse

  function openFormModal() {
    formModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    formOpenedAt = Date.now();
    // Registrar visita al formulario
    try {
      _db.collection('metricas').doc('general').set(
        { visitas_formulario: firebase.firestore.FieldValue.increment(1) },
        { merge: true }
      );
    } catch(e) {}
  }
  function closeFormModal() {
    formModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.getElementById('btn-abrir-form-hero').addEventListener('click', e => { e.preventDefault(); openFormModal(); });
  document.getElementById('btn-abrir-form-contacto').addEventListener('click', openFormModal);
  document.getElementById('nav-cta-desktop').addEventListener('click', e => { e.preventDefault(); openFormModal(); });
  document.getElementById('nav-cta-mobile').addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('mobileMenu').classList.remove('open');
    openFormModal();
  });

  // ── SEMANA SLIDER (dinámico, lee assets/semana/index.json) ──
  (async function initSemana() {
    const card = document.getElementById('semanaCard');
    const slider = document.getElementById('semanaSlider');
    const dotsWrap = document.getElementById('semanaDots');
    const prevBtn = document.getElementById('semanaPrev');
    const nextBtn = document.getElementById('semanaNext');
    if (!card || !slider || !dotsWrap) return;

    let files = [];
    try {
      const res = await fetch('assets/semana/index.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('no manifest');
      files = await res.json();
      if (!Array.isArray(files)) files = [];
    } catch (e) {
      // Sin manifiesto o sin fotos → la tarjeta queda oculta
      return;
    }
    if (!files.length) return;

    // Construir los slides desde el manifiesto
    files.forEach((fname, i) => {
      const div = document.createElement('div');
      div.className = 'semana-slide' + (i === 0 ? ' active' : '');
      const img = document.createElement('img');
      img.src = 'assets/semana/' + fname;
      img.alt = 'Decoración semana ' + (i + 1);
      img.loading = 'lazy';
      div.appendChild(img);
      slider.insertBefore(div, prevBtn); // antes de los botones nav
    });

    const slides = slider.querySelectorAll('.semana-slide');
    card.hidden = false;

    let cur = 0;
    let timer = null;
    const AUTO_MS = 4000;

    slides.forEach((_, i) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'semana-dot' + (i === 0 ? ' active' : '');
      d.setAttribute('aria-label', 'Ir a la foto ' + (i + 1));
      d.addEventListener('click', () => go(i));
      dotsWrap.appendChild(d);
    });

    function go(i) {
      slides[cur].classList.remove('active');
      dotsWrap.children[cur].classList.remove('active');
      cur = (i + slides.length) % slides.length;
      slides[cur].classList.add('active');
      dotsWrap.children[cur].classList.add('active');
      resetTimer();
    }
    function next() { go(cur + 1); }
    function prev() { go(cur - 1); }
    function startTimer() { timer = setInterval(next, AUTO_MS); }
    function resetTimer() { clearInterval(timer); startTimer(); }

    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);

    card.addEventListener('mouseenter', () => clearInterval(timer));
    card.addEventListener('mouseleave', startTimer);

    if (slides.length > 1) startTimer();
    else { prevBtn.style.display = 'none'; nextBtn.style.display = 'none'; dotsWrap.style.display = 'none'; }
  })();

  // ── CATÁLOGO ──
  const catalogOverlay = document.getElementById('catalogOverlay');
  function openCatalog() {
    catalogOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    catalogOverlay.scrollTop = 0;
    // Funnel: apertura del catálogo de packs
    try {
      _db.collection('metricas').doc('general').set(
        { catalogo_aperturas: firebase.firestore.FieldValue.increment(1) },
        { merge: true }
      );
      if (window.gtag) gtag('event', 'ver_catalogo_packs');
    } catch (e) {}
  }
  function closeCatalog() {
    catalogOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  document.getElementById('btn-abrir-catalogo').addEventListener('click', e => { e.preventDefault(); openCatalog(); });
  document.getElementById('catalogClose').addEventListener('click', closeCatalog);
  document.getElementById('catalogGotoGaleria').addEventListener('click', () => {
    closeCatalog();
    const gal = document.getElementById('galeria');
    if (gal) setTimeout(() => gal.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  });
  catalogOverlay.addEventListener('click', e => { if (e.target === catalogOverlay) closeCatalog(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && catalogOverlay.classList.contains('open')) closeCatalog();
  });
  formModalClose.addEventListener('click', closeFormModal);
  formModal.addEventListener('click', e => { if (e.target === formModal) closeFormModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && formModal.classList.contains('open')) closeFormModal();
  });

  // ── FORMULARIO → FIRESTORE ──
  // Packs con precio fijo: el dueño no necesita ingresar precio manualmente.
  // "Personalizado" y "Pack Económico" requieren precio manual desde el admin.
  const PACK_PRICES = {
    'Pack 1 - S/ 1,999': 1999,
    'Pack 2 - S/ 1,399': 1399,
    'Pack 3 - S/ 1,099': 1099,
    'Pack 4 - S/ 799':    799,
    'Pack 5 - S/ 650':    650,
  };

  async function enviarFormulario() {
    const nombre   = document.getElementById('f-nombre').value.trim();
    const tel      = document.getElementById('f-telefono').value.trim();
    const tipo     = document.getElementById('f-tipo').value;
    const pack     = document.getElementById('f-pack').value;
    const fecha    = document.getElementById('f-fecha').value;
    const distrito = document.getElementById('f-distrito').value.trim();
    const mensaje  = document.getElementById('f-mensaje').value.trim();

    if (!nombre || !tel || !tipo || !fecha || !distrito) { alert('Por favor completa los campos obligatorios: nombre, teléfono, tipo de evento, fecha y distrito.'); return; }

    // Anti-bot: honeypot lleno o envío en menos de 3 segundos = bot
    const honeypot = document.getElementById('f-website');
    if ((honeypot && honeypot.value !== '') || (formOpenedAt && Date.now() - formOpenedAt < 3000)) {
      return; // descartar silenciosamente
    }

    const btnForm = document.querySelector('#formModal .btn-form');
    if (btnForm) { btnForm.disabled = true; btnForm.textContent = 'Enviando...'; }

    const payload = {
      nombre,
      telefono: tel,
      tipo,
      pack,
      fecha,
      distrito,
      mensaje,
      estado: 'nuevo',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (PACK_PRICES[pack]) payload.precioTotal = PACK_PRICES[pack];

    let ok = false;
    if (_db) {
      try {
        await _db.collection('pedidos').add(payload);
        ok = true;
      } catch(e) {
        console.warn('No se pudo guardar en Firestore:', e.message);
      }
    }

    if (btnForm) { btnForm.disabled = false; btnForm.textContent = '📨 Enviar consulta'; }

    if (!ok) {
      alert('No pudimos enviar tu consulta. Revisa tu conexión e inténtalo de nuevo, o contáctanos por WhatsApp.');
      return;
    }

    document.getElementById('f-nombre').value   = '';
    document.getElementById('f-telefono').value = '';
    document.getElementById('f-tipo').value     = '';
    document.getElementById('f-pack').value     = 'Personalizado';
    document.getElementById('f-fecha').value    = '';
    document.getElementById('f-distrito').value = '';
    document.getElementById('f-mensaje').value  = '';

    closeFormModal();
    alert('✅ ¡Gracias ' + nombre + '! Recibimos tu solicitud. Te contactaremos pronto.');
  }

  // ── FUNNEL: clics a WhatsApp (cualquier enlace wa.me de la landing) ──
  document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
    a.addEventListener('click', () => {
      try {
        _db.collection('metricas').doc('general').set(
          { whatsapp_clicks: firebase.firestore.FieldValue.increment(1) },
          { merge: true }
        );
        if (window.gtag) gtag('event', 'click_whatsapp');
      } catch (e) {}
    });
  });
