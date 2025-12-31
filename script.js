'use strict';

function debounce(fn, ms = 140) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
}

function setHeaderHeightCSSVar() {
  const header = document.querySelector('.site-header');
  const main = document.querySelector('main');
  if (!header) return 0;
  const h = Math.ceil(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--header-h', `${h}px`);
  if (main) main.style.paddingTop = `${h}px`;
  return h;
}

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
      console.log('[form] sending to', endpoint);

      try {
        const formData = new FormData(form);

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: formData
        });

        const text = await res.text().catch(() => '');
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (err) { }

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
        setTimeout(() => {
          try { form.submit(); } catch (e) { }
        }, 600);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;

    const href = a.getAttribute('href') || '';
    const hash = href.startsWith('#') ? href : null;
    if (!hash) return;

    e.preventDefault();

    const target = document.querySelector(hash);
    const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || setHeaderHeightCSSVar() || 0;
    const targetY = target
      ? Math.round(target.getBoundingClientRect().top + window.scrollY - Math.ceil(headerH))
      : 0;

    const doScrollAndClean = () => {
      window.scrollTo({ top: Math.max(0, targetY), left: 0, behavior: 'smooth' });

      try { a.blur(); } catch (err) { }

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

window.addEventListener('resize', debounce(() => setHeaderHeightCSSVar(), 160));

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
(function () {
  'use strict';

  const DEBUG = false;
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STAGGER_STEP = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sr-stagger-step')) || 50;
  const ROOT_MARGIN = '0px 0px -15% 0px';
  const THRESHOLD = 0.08;

  function log(...args) { if (DEBUG) console.log('[ScrollReveal]', ...args); }

  function tagSectionContent(section) {
    if (!(section instanceof Element)) return null;
    const container = section.querySelector('.container');
    if (container) {
      if (!container.classList.contains('animate-on-scroll')) {
        container.classList.add('animate-on-scroll');
      }
      return container;
    }
    if (!section.classList.contains('animate-on-scroll')) {
      section.classList.add('animate-on-scroll');
    }
    return section;
  }

  function autoTag() {
    document.querySelectorAll('section.animate-on-scroll').forEach(sec => {
      const container = sec.querySelector('.container');
      if (container) {
        sec.classList.remove('animate-on-scroll');
        if (!container.classList.contains('animate-on-scroll')) {
          container.classList.add('animate-on-scroll');
        }
        log('Moved animation from section to container:', sec);
      }
    });

    document.querySelectorAll('section').forEach(sec => tagSectionContent(sec));

    document.querySelectorAll('h2').forEach(h => {
      if (!h.classList.contains('animate-on-scroll')) {
        h.classList.add('animate-on-scroll', 'heading');
      }
    });

    document.querySelectorAll('.project-card').forEach(card => {
      if (!card.classList.contains('animate-on-scroll')) {
        card.classList.add('animate-on-scroll', 'card');
      }
    });

    document.querySelectorAll('.projects-grid').forEach(grid => {
      if (!grid.classList.contains('animate-on-scroll')) {
        grid.classList.add('animate-on-scroll', 'stagger');
      }
    });

    document.querySelectorAll('.contact-grid, .about-grid, .hero-text, .hero-card').forEach(el => {
      if (!el.classList.contains('animate-on-scroll')) {
        el.classList.add('animate-on-scroll');
      }
    });

    document.querySelectorAll('.hero-cta .btn').forEach(btn => {
      if (!btn.classList.contains('animate-on-scroll')) {
        btn.classList.add('animate-on-scroll', 'btn-reveal');
      }
    });

    log('AutoTag complete');
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
      log('Reduced motion: revealed all elements immediately');
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
          if (!child.classList.contains('animate-on-scroll')) {
            child.classList.add('animate-on-scroll');
          }
          requestAnimationFrame(() => {
            requestAnimationFrame(() => child.classList.add('in-view'));
          });
        });
        el.classList.add('in-view');
      } else {
        requestAnimationFrame(() => el.classList.add('in-view'));
      }

      const once = el.dataset.once !== 'false';
      if (once) obs.unobserve(el);
      log('Revealed:', el);
    });
  }, { 
    root: null, 
    rootMargin: ROOT_MARGIN, 
    threshold: THRESHOLD 
  });

  document.addEventListener('DOMContentLoaded', () => {
    autoTag();
    document.querySelectorAll('.animate-on-scroll').forEach(el => io.observe(el));
    log('Observing', document.querySelectorAll('.animate-on-scroll').length, 'elements');
  });

  const mo = new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes && m.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        
        if (node.matches && node.matches('section')) {
          const content = tagSectionContent(node);
          if (content) io.observe(content);
          log('Observing new section:', content);
        }

        node.querySelectorAll && node.querySelectorAll(
          'section, h2, .project-card, .projects-grid, .contact-grid, .about-grid, .hero-text, .hero-card'
        ).forEach(n => {
          if (!n.classList.contains('animate-on-scroll')) {
            if (n.matches('h2')) n.classList.add('animate-on-scroll', 'heading');
            else if (n.matches('.project-card')) n.classList.add('animate-on-scroll', 'card');
            else if (n.matches('.projects-grid')) n.classList.add('animate-on-scroll', 'stagger');
            else n.classList.add('animate-on-scroll');
          }
          io.observe(n);
          log('Observing dynamically added:', n);
        });
      });
    });
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

})();


(function () {
  'use strict';

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  let ticking = false;
  const heroBg = document.querySelector('.hero-bg');
  
  function updateParallax() {
    if (!heroBg) return;
    const scrolled = window.scrollY;
    const heroHeight = document.querySelector('.hero')?.offsetHeight || 1000;
    
 
    if (scrolled < heroHeight) {
      const speed = 0.5; 
      const yPos = scrolled * speed;
      const scale = 1.02 + (scrolled / heroHeight) * 0.05;
      const opacity = 0.4 - (scrolled / heroHeight) * 0.15;
      
      heroBg.style.transform = `translateY(${yPos}px) scale(${scale})`;
      heroBg.style.opacity = Math.max(0.15, opacity);
    }
    
    ticking = false;
  }

  function requestParallaxUpdate() {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }

  window.addEventListener('scroll', requestParallaxUpdate, { passive: true });
  window.addEventListener('load', updateParallax);

})();

document.addEventListener('DOMContentLoaded', () => {
  const emailCard = document.getElementById('email-card');
  const emailModal = document.getElementById('email-modal');
  const closeModal = document.querySelector('.close-modal');

  if (emailCard && emailModal) {
    emailCard.addEventListener('click', (e) => {
      e.preventDefault();
      emailModal.style.display = 'flex';
      // prevent background scroll while modal is open
      document.body.classList.add('modal-open');
      setTimeout(() => emailModal.classList.add('show'), 10);
    });
  }

  if (closeModal && emailModal) {
    closeModal.addEventListener('click', () => {
      emailModal.classList.remove('show');
      setTimeout(() => {
        emailModal.style.display = 'none';
        document.body.classList.remove('modal-open');
      }, 300);
    });
  }

  if (emailModal) {
    emailModal.addEventListener('click', (e) => {
      if (e.target === emailModal) {
        emailModal.classList.remove('show');
        setTimeout(() => {
          emailModal.style.display = 'none';
          document.body.classList.remove('modal-open');
        }, 300);
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (e.target.matches('a') || e.target.closest('a')) {
      const link = e.target.matches('a') ? e.target : e.target.closest('a');
      setTimeout(() => {
        link.blur();
      }, 100);
    }
  });
});
