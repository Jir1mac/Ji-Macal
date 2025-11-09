// Dynamické --header-h, mobilní menu, přepínač motivu, formulář AJAX -> Formspree.
// Fixed header + JS nastavuje padding-top pro <main> podle skutečné výšky headeru.

'use strict';

// debounce helper
function debounce(fn, ms = 140) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
}

// nastaví CSS proměnnou --header-h a inline padding-top pro main
function setHeaderHeightCSSVar() {
  const header = document.querySelector('.site-header');
  const main = document.querySelector('main');
  if (!header) return 0;
  const h = Math.ceil(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--header-h', `${h}px`);
  if (main) main.style.paddingTop = `${h}px`;
  return h;
}

// theme helpers
function applyStoredTheme() {
  const stored = localStorage.getItem('site-theme');
  if (stored === 'dark') document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
  updateThemeButton();
}
function updateThemeButton() {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;
  const isDark = document.documentElement.classList.contains('dark');
  themeToggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
  themeToggle.setAttribute('aria-label', isDark ? 'Přepnout na světlý motiv' : 'Přepnout na tmavý motiv');
}

document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  setHeaderHeightCSSVar();

  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('nav-toggle');
  if (nav && navToggle) {
    navToggle.setAttribute('aria-expanded', nav.classList.contains('open') ? 'true' : 'false');

    navToggle.addEventListener('click', () => {
      nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', nav.classList.contains('open') ? 'true' : 'false');
      setTimeout(() => setHeaderHeightCSSVar(), 160);
    });

    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('open')) return;
      const t = e.target;
      if (t === navToggle || nav.contains(t)) return;
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      setTimeout(() => setHeaderHeightCSSVar(), 160);
    });

    nav.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      setTimeout(() => {
        if (nav.classList.contains('open')) {
          nav.classList.remove('open');
          navToggle.setAttribute('aria-expanded', 'false');
          setHeaderHeightCSSVar();
        }
      }, 60);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (nav.classList.contains('open')) {
          nav.classList.remove('open');
          navToggle.setAttribute('aria-expanded', 'false');
          setHeaderHeightCSSVar();
        }
      }
    });
  }

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    applyStoredTheme();

    themeToggle.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark');
      const isDark = document.documentElement.classList.contains('dark');
      localStorage.setItem('site-theme', isDark ? 'dark' : 'light');
      updateThemeButton();
      setTimeout(() => setHeaderHeightCSSVar(), 120);
    });
    themeToggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); themeToggle.click(); }
    });
  }

  // form -> AJAX -> Formspree (uses form.action and FormData)
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (status) { status.textContent = ''; status.style.color = ''; }

      const name = document.getElementById('cf-name')?.value.trim() || '';
      const email = document.getElementById('cf-email')?.value.trim() || '';
      const message = document.getElementById('cf-message')?.value.trim() || '';

      if (!name || !email || !message) {
        if (status) { status.textContent = 'Prosím vyplňte všechna pole.'; status.style.color = 'tomato'; }
        return;
      }
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) {
        if (status) { status.textContent = 'Neplatný e-mail.'; status.style.color = 'tomato'; }
        return;
      }

      const honey = form.querySelector('input[name="_honey"]')?.value;
      if (honey) {
        if (status) { status.textContent = 'Spam detekován.'; status.style.color = 'tomato'; }
        return;
      }

      const submitBtn = document.getElementById('cf-submit');
      if (submitBtn) submitBtn.disabled = true;
      if (status) { status.textContent = 'Odesílám…'; status.style.color = ''; }

      const endpoint = form.getAttribute('action') || 'https://formspree.io/f/xeovjpov';

      try {
        const formData = new FormData(form);

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: formData
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          if (status) { status.textContent = 'Děkuji! Zpráva byla odeslána.'; status.style.color = 'green'; }
          form.reset();
        } else {
          const errMsg = data?.error || data?.message || (data?.errors && data.errors.map(i => i.message).join(', ')) || `Chyba při odesílání (status ${res.status}).`;
          if (status) { status.textContent = errMsg; status.style.color = 'tomato'; }
        }
      } catch (err) {
        console.error('Form submit error', err);
        if (status) { status.textContent = 'Chyba sítě. Zkus to později.'; status.style.color = 'tomato'; }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // anchor handling (fixed header + focus cleanup)
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;

    const href = a.getAttribute('href') || '';
    const hash = href.startsWith('#') ? href : null;
    if (!hash) return;

    e.preventDefault();

    const target = document.querySelector(hash);
    const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || setHeaderHeightCSSVar() || 0;
    const targetY = target ? Math.round(target.getBoundingClientRect().top + window.scrollY - Math.ceil(headerH)) : 0;

    const doScrollAndClean = () => {
      window.scrollTo({ top: Math.max(0, targetY), left: 0, behavior: 'smooth' });
      try { a.blur(); } catch (err) { /* ignore */ }
      try { history.pushState(null, '', hash); } catch (err) { location.hash = hash; }
    };

    const navEl = document.getElementById('nav');
    const navToggleEl = document.getElementById('nav-toggle');
    if (navEl && navEl.classList.contains('open')) {
      navEl.classList.remove('open');
      if (navToggleEl) navToggleEl.setAttribute('aria-expanded', 'false');
      setTimeout(doScrollAndClean, 80);
    } else {
      doScrollAndClean();
    }
  });
});

// resize recalculation
window.addEventListener('resize', debounce(() => setHeaderHeightCSSVar(), 160));

// after load ensure header var is current; if page opened with hash, correct jump if needed
window.addEventListener('load', () => {
  setHeaderHeightCSSVar();
  setTimeout(setHeaderHeightCSSVar, 60);
  setTimeout(setHeaderHeightCSSVar, 220);

  if (location.hash) {
    setTimeout(() => {
      const target = document.querySelector(location.hash);
      if (target) {
        const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 0;
        const y = Math.round(target.getBoundingClientRect().top + window.scrollY - Math.ceil(headerH));
        window.scrollTo({ top: Math.max(0, y), left: 0, behavior: 'auto' });
      }
    }, 120);
  }
});
