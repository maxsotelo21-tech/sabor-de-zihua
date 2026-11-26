/* Motor del menú digital: dibuja pestañas, destacados, secciones y ficha de platillo
   a partir de window.MENU (definido en data.js de cada restaurante). */
(function () {
  const M = window.MENU;
  const $ = (s, el = document) => el.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const saved = localStorage.getItem('menu-lang');
  const state = {
    lang: saved || ((navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en'),
    tab: 0,
  };

  const t = (x) => (x == null ? '' : typeof x === 'string' || typeof x === 'number' ? String(x) : x[state.lang] ?? x.es);
  const money = (p) => {
    if (p == null || p === '') return '';
    const s = String(p);
    return s.startsWith('+') ? '+$' + s.slice(1) : '$' + s;
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const UI = {
    es: { featured: 'Lo más pedido', swipe: 'Desliza', close: 'Cerrar', photo: 'Foto ilustrativa', lang: 'EN', choose: 'Elige', menu: 'Menú', top: 'Arriba' },
    en: { featured: 'Most loved', swipe: 'Swipe', close: 'Close', photo: 'Illustrative photo', lang: 'ES', choose: 'Choose', menu: 'Menu', top: 'Top' },
  };
  const ui = (k) => UI[state.lang][k];

  /* ---------- media helpers ---------- */
  function mediaHTML(it, cls, eager) {
    if (it.video) {
      return `<video class="${cls}" src="${it.video}" poster="${it.poster || it.img || ''}" muted loop playsinline preload="${eager ? 'auto' : 'none'}" aria-hidden="true"></video>`;
    }
    if (it.img) return `<img class="${cls}" src="${it.img}" alt="${esc(t(it.n))}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
    return '';
  }

  /* ---------- render ---------- */
  function render() {
    document.documentElement.lang = state.lang;
    const menu = M.menus[state.tab];
    document.body.dataset.menu = menu.id;

    // tabs
    const tabs = $('#tabs');
    if (tabs) {
      tabs.hidden = M.menus.length < 2;
      tabs.innerHTML = M.menus
        .map((m, i) => `<button role="tab" aria-selected="${i === state.tab}" data-tab="${i}">${esc(t(m.label))}</button>`)
        .join('');
    }

    // language button
    const lb = $('#langBtn');
    if (lb) lb.textContent = ui('lang');

    // static i18n
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const v = M.i18n && M.i18n[el.dataset.i18n];
      if (v) el.innerHTML = t(v);
    });

    // featured
    const feat = (menu.featured || []);
    $('#featured').innerHTML = feat.length
      ? `<div class="feat-head reveal"><h2>${esc(ui('featured'))}</h2><span class="swipe">${esc(ui('swipe'))} <i>→</i></span></div>
         <div class="feat-track">${feat
           .map(
             (f, i) => `<button class="feat-card" data-feat="${i}" style="--i:${i}">
               ${mediaHTML(f, 'feat-media', i < 2)}
               ${f.video ? '<span class="live"><b></b>video</span>' : ''}
               <span class="feat-info"><span class="feat-name">${esc(t(f.n))}</span><span class="feat-price">${money(f.p)}</span></span>
             </button>`
           )
           .join('')}</div>`
      : '';

    // nav chips
    $('#nav').innerHTML = `<div class="nav-track">${menu.sections
      .map((s) => `<a href="#${s.id}" data-sec="${s.id}">${esc(t(s.title))}</a>`)
      .join('')}</div>`;

    // sections
    $('#sections').innerHTML = menu.sections.map(sectionHTML).join('') + footHTML(menu);

    wire();
  }

  function priceHTML(p, sizes) {
    if (Array.isArray(p)) {
      return `<span class="price multi">${p.map((v) => `<span>${v == null ? '' : money(v)}</span>`).join('')}</span>`;
    }
    if (sizes) return `<span class="price multi"><span></span><span>${money(p)}</span></span>`;
    return `<span class="price">${money(p)}</span>`;
  }

  function sectionHTML(s) {
    const sizes = s.sizes ? `<div class="sizes"><span>${s.sizes.map((z) => `<b>${esc(t(z))}</b>`).join('')}</span></div>` : '';
    const items = (s.items || [])
      .map((it, i) => {
        const has = it.img || it.video;
        const tag = has ? 'button' : 'div';
        return `<${tag} class="item${has ? ' has-media' : ''}${it.star ? ' star' : ''}" style="--i:${i}" ${has ? `data-item="${s.id}:${i}"` : ''}>
          ${has ? `<span class="thumb">${it.img ? `<img src="${it.img}" alt="" loading="lazy" decoding="async">` : mediaHTML(it, '', false)}${it.video ? '<i class="play"></i>' : ''}</span>` : ''}
          <span class="txt">
            <span class="row"><span class="name">${esc(t(it.n))}${it.star ? ' <em class="badge">★</em>' : ''}</span><span class="dots"></span>${priceHTML(it.p, s.sizes)}</span>
            ${it.d ? `<span class="desc">${t(it.d)}</span>` : ''}
          </span>
        </${tag}>`;
      })
      .join('');
    const extras = (s.extras || [])
      .map(
        (g) => `<div class="extras">${g.title ? `<p class="ex-title">${esc(t(g.title))}</p>` : ''}<div class="chips">${g.items
          .map((x) => `<span class="chip">${esc(t(x.n))}${x.p != null ? ` <b>${money(x.p)}</b>` : ''}</span>`)
          .join('')}</div></div>`
      )
      .join('');
    return `<section class="sec reveal${s.script ? ' script' : ''}" id="${s.id}" data-deco="${s.deco || ''}">
      <header class="sec-head"><h2>${esc(t(s.title))}</h2>${s.kicker ? `<p class="kicker">${t(s.kicker)}</p>` : ''}</header>
      ${s.note ? `<p class="note">${t(s.note)}</p>` : ''}
      ${s.pre ? s.pre.map((g) => `<div class="extras pre">${g.title ? `<p class="ex-title">${esc(t(g.title))}</p>` : ''}<div class="chips">${g.items.map((x) => `<span class="chip">${esc(t(x.n))}${x.p != null ? ` <b>${money(x.p)}</b>` : ''}</span>`).join('')}</div></div>`).join('') : ''}
      ${sizes}
      <div class="items">${items}</div>
      ${extras}
      ${s.after ? `<p class="note after">${t(s.after)}</p>` : ''}
    </section>`;
  }

  function footHTML(menu) {
    return `<div class="foot-notes reveal">${(menu.notes || []).map((n) => `<p>${t(n)}</p>`).join('')}</div>`;
  }

  /* ---------- sheet (detail) ---------- */
  const sheet = $('#sheet');
  function openSheet(it) {
    const body = $('.sheet-body', sheet);
    body.innerHTML = `
      <div class="sheet-media">${mediaHTML(it, 'sm', true)}<span class="ph">${esc(ui('photo'))}</span></div>
      <div class="sheet-txt">
        <h3>${esc(t(it.n))}</h3>
        ${it.d ? `<p>${t(it.d)}</p>` : ''}
        <div class="sheet-price">${Array.isArray(it.p) ? it.p.map((v, i) => (v == null ? '' : `<span><small>${esc(t((it.sizes || [])[i] || ''))}</small>${money(v)}</span>`)).join('') : `<span>${money(it.p)}</span>`}</div>
      </div>`;
    const v = $('video', body);
    if (v) { v.play().catch(() => {}); }
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add('open'));
    document.body.classList.add('locked');
    $('.sheet-close', sheet).focus({ preventScroll: true });
  }
  function closeSheet() {
    sheet.classList.remove('open');
    document.body.classList.remove('locked');
    setTimeout(() => { sheet.hidden = true; $('.sheet-body', sheet).innerHTML = ''; }, reduce ? 0 : 380);
  }
  sheet.addEventListener('click', (e) => { if (e.target === sheet || e.target.closest('.sheet-close')) closeSheet(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });
  // swipe-down to close
  (() => {
    let y0 = null, dy = 0;
    const card = $('.sheet-card', sheet);
    card.addEventListener('touchstart', (e) => { if (card.scrollTop <= 0) { y0 = e.touches[0].clientY; dy = 0; card.style.transition = 'none'; } }, { passive: true });
    card.addEventListener('touchmove', (e) => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); card.style.transform = `translateY(${dy}px)`; }, { passive: true });
    card.addEventListener('touchend', () => { card.style.transition = ''; card.style.transform = ''; if (dy > 110) closeSheet(); y0 = null; });
  })();

  /* ---------- wiring ---------- */
  let io, vio, spy;
  function wire() {
    const menu = M.menus[state.tab];

    // item / featured clicks
    $('#sections').onclick = (e) => {
      const b = e.target.closest('[data-item]');
      if (!b) return;
      const [sid, i] = b.dataset.item.split(':');
      const s = menu.sections.find((x) => x.id === sid);
      openSheet({ ...s.items[+i], sizes: s.sizes });
    };
    $('#featured').onclick = (e) => {
      const b = e.target.closest('[data-feat]');
      if (b) openSheet(menu.featured[+b.dataset.feat]);
    };

    // reveal on scroll
    io && io.disconnect();
    io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    document.querySelectorAll('.reveal').forEach((el) => (reduce ? el.classList.add('in') : io.observe(el)));

    // autoplay videos only while visible
    vio && vio.disconnect();
    vio = new IntersectionObserver((ents) => ents.forEach((en) => {
      const v = en.target;
      if (en.isIntersecting) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
    }), { threshold: 0.35 });
    document.querySelectorAll('#featured video, #sections video').forEach((v) => vio.observe(v));

    // scrollspy for chips
    spy && spy.disconnect();
    const links = [...document.querySelectorAll('#nav a')];
    spy = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('on', a.dataset.sec === en.target.id));
        const on = links.find((a) => a.dataset.sec === en.target.id);
        if (on) { const tr = on.parentElement; tr.scrollTo({ left: on.offsetLeft - tr.clientWidth / 2 + on.clientWidth / 2, behavior: reduce ? 'auto' : 'smooth' }); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.sec').forEach((s) => spy.observe(s));

    $('#nav').onclick = (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      const el = document.getElementById(a.dataset.sec);
      const off = ($('#nav').offsetHeight || 0) + 8;
      scrollTo({ top: el.getBoundingClientRect().top + scrollY - off, behavior: reduce ? 'auto' : 'smooth' });
    };
  }

  // tabs + language
  document.addEventListener('click', (e) => {
    const tb = e.target.closest('#tabs [data-tab]');
    if (tb && +tb.dataset.tab !== state.tab) {
      state.tab = +tb.dataset.tab;
      document.body.classList.add('switching');
      setTimeout(() => {
        render();
        const anchor = $('#tabs') || $('#nav');
        scrollTo({ top: anchor.getBoundingClientRect().top + scrollY - 10, behavior: 'auto' });
        document.body.classList.remove('switching');
      }, reduce ? 0 : 220);
    }
    if (e.target.closest('#langBtn')) {
      state.lang = state.lang === 'es' ? 'en' : 'es';
      localStorage.setItem('menu-lang', state.lang);
      const y = scrollY;
      render();
      scrollTo(0, y);
    }
    if (e.target.closest('#toTop')) scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  // sticky nav shadow + back-to-top + parallax hero
  const hero = $('.hero');
  addEventListener('scroll', () => {
    const y = scrollY;
    document.body.classList.toggle('scrolled', y > (hero ? hero.offsetHeight - 80 : 200));
    if (hero && !reduce && y < hero.offsetHeight) hero.style.setProperty('--py', y);
  }, { passive: true });

  // splash
  setTimeout(() => document.body.classList.add('ready'), reduce ? 0 : 1300);

  render();
})();
