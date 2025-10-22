/* ===========
   Velvet VT — enhanced
   =========== */

const App = (() => {
  const stage = document.querySelector('#stage');
  const motionBtn = document.querySelector('#motion-toggle');
  const openModalBtn = document.querySelector('#open-modal');
  const modal = document.querySelector('#vt-modal');
  const closeModalBtn = document.querySelector('#close-modal');

  const routes = {
    '/home': '#tpl-home',
    '/work': '#tpl-work',
    '/about': '#tpl-about',
    '/contact': '#tpl-contact'
  };

  // --- State
  const state = {
    motion: JSON.parse(localStorage.getItem('velvet.motion') ?? 'true'),
    modalOpen: false,
    lastFocus: null
  };

  // --- Feature detect
  const hasVT = 'startViewTransition' in document;

  // --- Init
  function init(){
    updateMotionUI();

    if (!location.hash) location.hash = '#/home';
    renderFromHash({ useVT:false });

    document.addEventListener('click', onNavClick);
    window.addEventListener('hashchange', () => renderFromHash({ useVT:true }));

    // Motion toggle
    motionBtn?.addEventListener('click', () => {
      state.motion = !state.motion;
      localStorage.setItem('velvet.motion', JSON.stringify(state.motion));
      updateMotionUI();
    });

    // Modal open/close
    openModalBtn?.addEventListener('click', openModal);
    closeModalBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target.matches('[data-close]')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (state.modalOpen && e.key === 'Escape') closeModal();
    });

    // Tiny “speculation”: warm up templates’ images after idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(warmImages, { timeout: 1500 });
    } else {
      setTimeout(warmImages, 1000);
    }

    // Live performance badges
    observeCLS();
    observeINP();
  }

  // ---------- Navigation / routing ----------
  function onNavClick(e){
    const a = e.target.closest('a[data-link]');
    if (!a) return;

    const bypass = a.getAttribute('data-vt') === 'off';

    // Normalize active class
    document.querySelectorAll('.nav a').forEach(n => n.classList.toggle('is-active', n === a));

    if (hasVT && state.motion && !bypass){
      e.preventDefault();
      const targetHash = a.getAttribute('href');
      document.startViewTransition(async () => {
        location.hash = targetHash;
      });
      return;
    }
    // else: allow default (hashchange handler will render)
  }

  function renderFromHash({ useVT } = { useVT:true }){
    const path = (location.hash || '#/home').replace('#','');
    const tplSel = routes[path] || routes['/home'];
    const tpl = document.querySelector(tplSel);
    if (!tpl) return;

    stage.setAttribute('aria-busy', 'true');

    const swap = () => {
      stage.replaceChildren(tpl.content.cloneNode(true));
      requestAnimationFrame(() => {
        stage.focus({ preventScroll: true });
        stage.setAttribute('aria-busy', 'false');
      });
      // Re-mark active link based on final hash
      document.querySelectorAll('.nav a').forEach(a => {
        const href = a.getAttribute('href');
        a.classList.toggle('is-active', href === `#${path}`);
      });
    };

    if (hasVT && state.motion && useVT){
      document.startViewTransition(swap);
    } else {
      swap();
    }
  }

  // ---------- Motion toggle ----------
  function updateMotionUI(){
    if (!motionBtn) return;
    motionBtn.setAttribute('aria-pressed', String(state.motion));
    motionBtn.querySelector('.label').textContent = `Motion: ${state.motion ? 'On' : 'Off'}`;
    document.documentElement.classList.toggle('motion-off', !state.motion);
  }

  // ---------- Modal with VT + focus trap ----------
  function openModal(){
    if (!modal) return;
    state.lastFocus = document.activeElement;
    const show = () => {
      modal.hidden = false;
      modal.querySelector('.modal__sheet')?.focus({ preventScroll: true });
      state.modalOpen = true;
      trapFocus();
    };
    if (hasVT && state.motion){
      document.startViewTransition(show);
    } else {
      show();
    }
  }

  function closeModal(){
    if (!modal) return;
    const hide = () => {
      modal.hidden = true;
      state.modalOpen = false;
      releaseFocus();
      // Restore focus to last focused control
      state.lastFocus?.focus?.({ preventScroll: true });
    };
    if (hasVT && state.motion){
      document.startViewTransition(hide);
    } else {
      hide();
    }
  }

  function trapFocus(){
    const focusables = modal.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
    const first = focusables[0], last = focusables[focusables.length - 1];
    function cycle(e){
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
    modal.addEventListener('keydown', cycle);
    modal._cycle = cycle;
  }

  function releaseFocus(){
    if (modal?._cycle){
      modal.removeEventListener('keydown', modal._cycle);
      modal._cycle = null;
    }
  }

  // ---------- Warm images in templates (simulates prefetch for hash routes) ----------
  function warmImages(){
    const urls = [];
    document.querySelectorAll('template').forEach(tpl => {
      tpl.content.querySelectorAll('img[src]').forEach(img => urls.push(img.getAttribute('src')));
    });
    // De-dup
    [...new Set(urls)].slice(0, 8).forEach(u => {
      const i = new Image();
      i.decoding = 'async';
      i.src = u;
    });
  }

  // ---------- Live Performance Badges (CLS & INP) ----------
  function observeCLS(){
    const badge = document.querySelector('#badge-cls');
    if (!badge || !('PerformanceObserver' in window)) return;

    let cls = 0;
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) cls += entry.value;
      }
      badge.textContent = `CLS: ${cls.toFixed(3)}`;
      badge.style.borderColor = cls <= 0.1 ? '#26d07c' : cls <= 0.25 ? '#ffb020' : '#ff5d5d';
    });
    try { po.observe({ type: 'layout-shift', buffered: true }); } catch {}
  }

  function observeINP(){
    const badge = document.querySelector('#badge-inp');
    if (!badge || !('PerformanceObserver' in window)) return;

    let best = 0;
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Largest duration of recent interactions is our INP-ish
        best = Math.max(best, entry.duration);
      }
      const ms = Math.round(best);
      badge.textContent = `INP: ${ms} ms`;
      badge.style.borderColor = ms <= 200 ? '#26d07c' : ms <= 500 ? '#ffb020' : '#ff5d5d';
    });
    try { po.observe({ type: 'event', buffered: true, durationThreshold: 16 }); } catch {}
  }

  return { init };
})();

App.init();
