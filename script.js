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

    // close on Escape key
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

  // form -> AJAX -> Formspree (uses form.action and FormData, with diagnostics and fallback)
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

      // use the form's action so HTML/JS stay in sync
      const endpoint = form.getAttribute('action') || 'https://formspree.io/f/xeovjpov';
      console.log('[form] sending to', endpoint);

      try {
        const formData = new FormData(form);

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: formData
        });

        // read raw text for robust diagnostics, then try parse JSON
        const text = await res.text().catch(() => '');
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (err) { /* not JSON */ }

        console.log('[form] status', res.status, 'response:', text);

        if (res.ok) {
          if (status) { status.textContent = 'Děkuji! Zpráva byla odeslána.'; status.style.color = 'green'; }
          form.reset();
        } else {
          const errMsg = data?.error || data?.message || text || `Chyba při odesílání (status ${res.status}).`;
          if (status) { status.textContent = errMsg; status.style.color = 'tomato'; }
          if (res.status === 404) console.warn('[form] Form not found — zkontroluj action URL / Formspree ID');
        }
      } catch (err) {
        console.error('[form] fetch error', err);
        if (status) { status.textContent = 'Chyba sítě. Zkus to později nebo se provede nativní odeslání.'; status.style.color = 'tomato'; }
        // fallback: try native submit after short delay (in case fetch blocked)
        setTimeout(() => {
          try { form.submit(); } catch (e) { /* ignore */ }
        }, 600);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Improved delegated anchor handling to account for fixed header and mobile nav
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;

    // allow links that are programmatic/external (e.g. href="#!" or data-no-scroll) to fallthrough
    const href = a.getAttribute('href') || '';
    const hash = href.startsWith('#') ? href : null;
    if (!hash) return;

    // Prevent native jump and perform offset scroll so fixed header doesn't cover target
    e.preventDefault();

    // compute target position
    const target = document.querySelector(hash);
    const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || setHeaderHeightCSSVar() || 0;
    const targetY = target
      ? Math.round(target.getBoundingClientRect().top + window.scrollY - Math.ceil(headerH))
      : 0;

    // helper to do scroll + cleanup
    const doScrollAndClean = () => {
      window.scrollTo({ top: Math.max(0, targetY), left: 0, behavior: 'smooth' });

      // remove focus from clicked link so the cursor/outline doesn't stay "stuck"
      try { a.blur(); } catch (err) { /* ignore */ }

      // update URL hash without causing another scroll
      try { history.pushState(null, '', hash); } catch (err) { location.hash = hash; }
    };

    // close mobile nav if open (preserve existing behavior)
    const navEl = document.getElementById('nav');
    const navToggleEl = document.getElementById('nav-toggle');
    if (navEl && navEl.classList.contains('open')) {
      navEl.classList.remove('open');
      if (navToggleEl) navToggleEl.setAttribute('aria-expanded', 'false');
      // wait a bit for menu close to settle (matches existing timeouts)
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
// Modern scroll reveal — FIX for "grey band" issue.
// Key change: animate inner content (.container / .project-card / h2) instead of the <section> element,
// so section background remains visible while content fades in.

(function () {
  'use strict';

  const DEBUG = false; 
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STAGGER_STEP = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sr-stagger-step')) || 72;
  const ROOT_MARGIN = '0px 0px -30% 0px';
  const THRESHOLD = 0.06;

  function log(...args){ if (DEBUG) console.log('[sr]', ...args); }

  function tagSectionContent(section) {
    if (!(section instanceof Element)) return null;
    const container = section.querySelector('.container');
    if (container) {
      if (!container.classList.contains('animate-on-scroll')) container.classList.add('animate-on-scroll');
      return container;
    }
    if (!section.classList.contains('animate-on-scroll')) section.classList.add('animate-on-scroll');
    return section;
  }

  function autoTag() {
    document.querySelectorAll('section.animate-on-scroll').forEach(sec => {
      const container = sec.querySelector('.container');
      if (container) {
        sec.classList.remove('animate-on-scroll');
        if (!container.classList.contains('animate-on-scroll')) container.classList.add('animate-on-scroll');
        log('moved animate-on-scroll from <section> to .container for', sec);
      }
    });

    document.querySelectorAll('section').forEach(sec => {
      tagSectionContent(sec);
    });

    document.querySelectorAll('h2').forEach(h => {
      if (!h.classList.contains('animate-on-scroll')) h.classList.add('animate-on-scroll', 'heading');
    });

    document.querySelectorAll('.project-card').forEach(card => {
      if (!card.classList.contains('animate-on-scroll')) card.classList.add('animate-on-scroll', 'card');
    });

    document.querySelectorAll('.projects-grid').forEach(grid => {
      if (!grid.classList.contains('animate-on-scroll')) grid.classList.add('animate-on-scroll', 'stagger');
    });

    document.querySelectorAll('.contact-grid, .about-grid').forEach(el => {
      if (!el.classList.contains('animate-on-scroll')) el.classList.add('animate-on-scroll');
    });

    log('autoTag complete');
  }

  if (prefersReduced) {
    document.addEventListener('DOMContentLoaded', () => {
      autoTag();
      document.querySelectorAll('.animate-on-scroll').forEach(el => {
        el.classList.add('in-view');
        if (el.classList.contains('stagger')) {
          Array.from(el.children).forEach(child => child.classList.add('in-view'));
        }
      });
      log('Reduced motion: revealed all immediately');
    });
    return;
  }

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;

      if (el.classList.contains('stagger')) {
        Array.from(el.children).forEach((child, i) => {
          if (!(child instanceof Element)) return;
          const delay = i * STAGGER_STEP;
          child.style.setProperty('--sr-delay', `${delay}ms`);
          if (!child.classList.contains('animate-on-scroll')) child.classList.add('animate-on-scroll');
          requestAnimationFrame(() => child.classList.add('in-view'));
        });
        el.classList.add('in-view');
      } else {
        el.classList.add('in-view');
      }

      const once = el.dataset.once !== 'false';
      if (once) obs.unobserve(el);
      log('revealed', el);
    });
  }, { root: null, rootMargin: ROOT_MARGIN, threshold: THRESHOLD });

  document.addEventListener('DOMContentLoaded', () => {
    autoTag();

    document.querySelectorAll('.animate-on-scroll').forEach(el => io.observe(el));
    log('observing', document.querySelectorAll('.animate-on-scroll').length);
  });

  const mo = new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes && m.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.matches && node.matches('section')) {
          const content = tagSectionContent(node);
          if (content) io.observe(content);
          log('observing new section content', content);
        }
        node.querySelectorAll && node.querySelectorAll('section, h2, .project-card, .projects-grid, .contact-grid, .about-grid').forEach(n => {
          if (!n.classList.contains('animate-on-scroll')) {
            if (n.matches('h2')) n.classList.add('animate-on-scroll','heading');
            else if (n.matches('.project-card')) n.classList.add('animate-on-scroll','card');
            else if (n.matches('.projects-grid')) n.classList.add('animate-on-scroll','stagger');
            else n.classList.add('animate-on-scroll');
          }
          io.observe(n);
          log('observing added node', n);
        });
      });
    });
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

})();
(function () {
  'use strict';

  const DEBUG = false;
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STAGGER_STEP = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sr-stagger-step')) || 40;
  const ROOT_MARGIN = '0px 0px -30% 0px';
  const THRESHOLD = 0.06;

  function log(...args){ if (DEBUG) console.log('[sr]', ...args); }

  function tagSectionContent(section) {
    if (!(section instanceof Element)) return null;
    const container = section.querySelector('.container');
    if (container) {
      if (!container.classList.contains('animate-on-scroll')) container.classList.add('animate-on-scroll');
      return container;
    }
    if (!section.classList.contains('animate-on-scroll')) section.classList.add('animate-on-scroll');
    return section;
  }

  function autoTag() {
    document.querySelectorAll('section.animate-on-scroll').forEach(sec => {
      const container = sec.querySelector('.container');
      if (container) {
        sec.classList.remove('animate-on-scroll');
        if (!container.classList.contains('animate-on-scroll')) container.classList.add('animate-on-scroll');
        log('moved animate-on-scroll from section to container', sec);
      }
    });

    document.querySelectorAll('section').forEach(sec => tagSectionContent(sec));

    document.querySelectorAll('h2').forEach(h => {
      if (!h.classList.contains('animate-on-scroll')) h.classList.add('animate-on-scroll','heading');
    });

    document.querySelectorAll('.project-card').forEach(card => {
      if (!card.classList.contains('animate-on-scroll')) card.classList.add('animate-on-scroll','card');
    });

    document.querySelectorAll('.projects-grid').forEach(grid => {
      if (!grid.classList.contains('animate-on-scroll')) grid.classList.add('animate-on-scroll','stagger');
    });

    document.querySelectorAll('.contact-grid, .about-grid').forEach(el => {
      if (!el.classList.contains('animate-on-scroll')) el.classList.add('animate-on-scroll');
    });

    log('autoTag done');
  }

  if (prefersReduced) {
    document.addEventListener('DOMContentLoaded', () => {
      autoTag();
      document.querySelectorAll('.animate-on-scroll').forEach(el => {
        el.classList.add('in-view');
        if (el.classList.contains('stagger')) {
          Array.from(el.children).forEach(child => child.classList.add('in-view'));
        }
      });
      log('reduced-motion: revealed all');
    });
    return;
  }

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;

      if (el.classList.contains('stagger')) {
        Array.from(el.children).forEach((child, i) => {
          if (!(child instanceof Element)) return;
          const delay = i * STAGGER_STEP;
          child.style.setProperty('--sr-delay', `${delay}ms`);
          if (!child.classList.contains('animate-on-scroll')) child.classList.add('animate-on-scroll');
          // ensure delay is honored before adding in-view
          requestAnimationFrame(() => child.classList.add('in-view'));
        });
        el.classList.add('in-view');
      } else {
        el.classList.add('in-view');
      }

      const once = el.dataset.once !== 'false';
      if (once) obs.unobserve(el);
      log('revealed', el);
    });
  }, { root: null, rootMargin: ROOT_MARGIN, threshold: THRESHOLD });

  document.addEventListener('DOMContentLoaded', () => {
    autoTag();
    document.querySelectorAll('.animate-on-scroll').forEach(el => io.observe(el));
    log('observing', document.querySelectorAll('.animate-on-scroll').length);
  });

  const mo = new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes && m.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.matches && node.matches('section')) {
          const content = tagSectionContent(node);
          if (content) io.observe(content);
          log('observing new section content', content);
        }
        node.querySelectorAll && node.querySelectorAll('section, h2, .project-card, .projects-grid, .contact-grid, .about-grid').forEach(n => {
          if (!n.classList.contains('animate-on-scroll')) {
            if (n.matches('h2')) n.classList.add('animate-on-scroll','heading');
            else if (n.matches('.project-card')) n.classList.add('animate-on-scroll','card');
            else if (n.matches('.projects-grid')) n.classList.add('animate-on-scroll','stagger');
            else n.classList.add('animate-on-scroll');
          }
          io.observe(n);
          log('observing added descendant', n);
        });
      });
    });
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

})();
