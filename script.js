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
  // inline padding pro main, aby obsah nikdy nešel pod fixed header
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
  // year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // initial header measurement
  setHeaderHeightCSSVar();

  // nav + mobile toggle
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('nav-toggle');
  if (nav && navToggle) {
    // init aria
    navToggle.setAttribute('aria-expanded', nav.classList.contains('open') ? 'true' : 'false');

    navToggle.addEventListener('click', () => {
      nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', nav.classList.contains('open') ? 'true' : 'false');
      // recalc after menu open/close
      setTimeout(() => setHeaderHeightCSSVar(), 160);
    });

    // close on outside click
    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('open')) return;
      const t = e.target;
      if (t === navToggle || nav.contains(t)) return;
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      setTimeout(() => setHeaderHeightCSSVar(), 160);
    });

    // when clicking a link inside nav, let native anchor run, but close menu
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
  }

  // theme toggle
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

  // form -> AJAX -> Formspree
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (status) { status.textContent = ''; status.style.color = ''; }

      const name = document.getElementById('cf-name')?.value.trim() || '';
      const email = document.getElementById('cf-email')?.value.trim() || '';
      const message = document.getElementById('cf-message')?.value.trim() || '';

      // basic validation
      if (!name || !email || !message) {
        if (status) { status.textContent = 'Prosím vyplňte všechna pole.'; status.style.color = 'tomato'; }
        return;
      }
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) {
        if (status) { status.textContent = 'Neplatný e-mail.'; status.style.color = 'tomato'; }
        return;
      }

      // honeypot check (anti-spam)
      const honey = form.querySelector('input[name="_honey"]')?.value;
      if (honey) {
        if (status) { status.textContent = 'Spam detekován.'; status.style.color = 'tomato'; }
        return;
      }

      const submitBtn = document.getElementById('cf-submit');
      if (submitBtn) submitBtn.disabled = true;
      if (status) { status.textContent = 'Odesílám…'; status.style.color = ''; }

      // <-- PUT YOUR FORMSPREE ENDPOINT HERE -->
      const endpoint = 'https://formspree.io/f/xeovjpow';

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, message })
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          if (status) { status.textContent = 'Děkuji! Zpráva byla odeslána.'; status.style.color = 'green'; }
          form.reset();
        } else {
          const errMsg = data.error || (data.errors && data.errors.map(i => i.message).join(', ')) || 'Chyba při odesílání.';
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

  // Delegate anchor clicks outside nav: we let native behavior handle scrolling.
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    // if mobile nav open, close it
    const navEl = document.getElementById('nav');
    const navToggleEl = document.getElementById('nav-toggle');
    if (navEl && navEl.classList.contains('open')) {
      setTimeout(() => {
        navEl.classList.remove('open');
        if (navToggleEl) navToggleEl.setAttribute('aria-expanded', 'false');
        setHeaderHeightCSSVar();
      }, 60);
    }
  });
});

// resize recalculation
window.addEventListener('resize', debounce(() => setHeaderHeightCSSVar(), 160));

// after load ensure header var is current; if page opened with hash, correct jump if needed
window.addEventListener('load', () => {
  // přepočítat hned a párkrát potom (pro fonty/obrázky)
  setHeaderHeightCSSVar();
  setTimeout(setHeaderHeightCSSVar, 60);
  setTimeout(setHeaderHeightCSSVar, 220);

  // pokud bylo načteno s hashem, uprav posun jednou (auto = bez animace)
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
