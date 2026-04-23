/**
 * CRBOX Analytics — dataLayer event taxonomy
 * GTM-ready dataLayer push helpers with automatic page context injection.
 * Replace GTM-XXXXXXX with your real container ID before going live.
 *
 * Event naming: strict lowercase_snake_case for all event names and params.
 * Every push includes: page_path, page_name, page_type.
 *
 * page_type values: home | services | how_it_works | pricing | calculator | contact
 */

window.dataLayer = window.dataLayer || [];

// ─── Page context map ─────────────────────────────────────────────────────────

var _CRBOX_PAGE_MAP = {
  '/':                   { name: 'index',         type: 'home' },
  '/index.html':         { name: 'index',         type: 'home' },
  '/servicios.html':     { name: 'servicios',     type: 'services' },
  '/como-funciona.html': { name: 'como_funciona', type: 'how_it_works' },
  '/tarifas.html':       { name: 'tarifas',       type: 'pricing' },
  '/calculadora.html':   { name: 'calculadora',   type: 'calculator' },
  '/contacto.html':      { name: 'contacto',      type: 'contact' }
};

function _crboxPageCtx() {
  var p = window.location.pathname;
  var m = _CRBOX_PAGE_MAP[p] || {
    name: p.replace(/^\/|\.html$/g, '') || 'unknown',
    type: 'unknown'
  };
  return { page_path: p, page_name: m.name, page_type: m.type };
}

// ─── Core namespace ───────────────────────────────────────────────────────────

var CRBOX = window.CRBOX || {};

CRBOX.track = {

  push: function(event, params) {
    var payload = Object.assign({ event: event }, _crboxPageCtx(), params || {});
    window.dataLayer.push(payload);
  },

  // ── CTA events ──────────────────────────────────────────────────────────────

  afiliate_cta: function(location, label) {
    this.push('cta_afiliate_click', {
      cta_location: location || 'unknown',
      cta_label: label || ''
    });
  },

  calculadora_cta: function(location, label) {
    this.push('cta_calculadora_click', {
      cta_location: location || 'unknown',
      cta_label: label || ''
    });
  },

  // ── Contact channel events ───────────────────────────────────────────────────

  whatsapp_click: function(location) {
    this.push('whatsapp_click', { cta_location: location || 'floating_button' });
  },

  phone_click: function(phone, location) {
    this.push('phone_click', {
      phone_number: phone || '',
      cta_location: location || 'unknown'
    });
  },

  email_click: function(email, location) {
    this.push('email_click', {
      email_address: email || '',
      cta_location: location || 'unknown'
    });
  },

  // ── Form events ──────────────────────────────────────────────────────────────

  contact_form_submit: function(subject) {
    this.push('contact_form_submit', { contact_subject: subject || 'unknown' });
  },

  form_start: function(form_id) {
    this.push('form_start', { form_id: form_id || 'unknown' });
  },

  form_abandon: function(form_id) {
    this.push('form_abandon', { form_id: form_id || 'unknown' });
  },

  // ── Content engagement ───────────────────────────────────────────────────────

  faq_engage: function(question, section_id) {
    this.push('faq_engage', {
      faq_question: question || 'unknown',
      section_id: section_id || 'unknown'
    });
  },

  nav_click: function(label, destination) {
    this.push('nav_click', {
      nav_label: label || '',
      nav_destination: destination || ''
    });
  },

  service_card_click: function(service_name) {
    this.push('service_card_click', { service_name: service_name || 'unknown' });
  },

  // ── Calculator events ────────────────────────────────────────────────────────

  calculator_start: function(mode) {
    this.push('calculator_start', { shipping_mode: mode || 'aereo' });
  },

  calculator_tab_switch: function(to_mode) {
    this.push('calculator_tab_switch', { to_mode: to_mode || 'aereo' });
  },

  calculator_query: function(params) {
    params = params || {};
    this.push('calculator_query', {
      shipping_mode: params.mode || null,
      package_weight_kg: params.weight_kg || null,
      destination: params.destination || null,
      purchase_value_usd: params.purchase_value_usd || null
    });
  },

  calculator_result: function(params) {
    params = params || {};
    this.push('calculator_result', {
      shipping_mode: params.mode || null,
      package_weight_kg: params.weight_kg || null,
      destination: params.destination || null,
      total_usd: params.total_usd || null,
      shipping_usd: params.shipping_usd || null,
      handling_usd: params.handling_usd || null,
      taxes_usd: params.taxes_usd || null
    });
  },

  // ── Scroll & visibility ──────────────────────────────────────────────────────

  scroll_depth: function(depth_percent) {
    this.push('scroll_depth', { depth_percent: depth_percent });
  },

  section_visible: function(section_id) {
    this.push('section_visible', { section_id: section_id || 'unknown' });
  },

  // ── Backward-compat aliases (camelCase → snake_case) ─────────────────────────

  afiliateCTA:         function(l) { this.afiliate_cta(l); },
  calculadoraCTA:      function(l) { this.calculadora_cta(l); },
  whatsappClick:       function(l) { this.whatsapp_click(l); },
  phoneClick:          function(p, l) { this.phone_click(p, l); },
  emailClick:          function(e, l) { this.email_click(e, l); },
  contactFormSubmit:   function(s) { this.contact_form_submit(s); },
  faqEngage:           function(q) { this.faq_engage(q); },
  calculatorQuery:     function(p) { this.calculator_query(p); },
  calculatorResult:    function(p) { this.calculator_result(p); }

};

window.CRBOX = CRBOX;

// ─── Auto-bind on DOMContentLoaded ───────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  var waBtn = document.querySelector('a.whatsapp-btn, a[href^="https://wa.me/"]');
  if (waBtn) {
    waBtn.addEventListener('click', function() {
      CRBOX.track.whatsapp_click('floating_button');
    });
  }

  // ── tel: links ─────────────────────────────────────────────────────────────
  document.querySelectorAll('a[href^="tel:"]').forEach(function(el) {
    el.addEventListener('click', function() {
      var section = el.closest('section');
      var loc = section
        ? (section.id || 'section')
        : (el.closest('header') ? 'header' : 'footer');
      CRBOX.track.phone_click(el.href.replace('tel:', ''), loc);
    });
  });

  // ── mailto: links ──────────────────────────────────────────────────────────
  document.querySelectorAll('a[href^="mailto:"]').forEach(function(el) {
    el.addEventListener('click', function() {
      var section = el.closest('section');
      var loc = section
        ? (section.id || 'section')
        : (el.closest('header') ? 'header' : 'footer');
      CRBOX.track.email_click(el.href.replace('mailto:', ''), loc);
    });
  });

  // ── Afíliate CTAs ──────────────────────────────────────────────────────────
  document.querySelectorAll('a[href="afiliate.html"]').forEach(function(el) {
    el.addEventListener('click', function() {
      var section = el.closest('section');
      var loc = section
        ? (section.id || 'section')
        : (el.closest('header') ? 'header' : 'footer');
      CRBOX.track.afiliate_cta(loc, el.textContent.trim().slice(0, 80));
    });
  });

  // ── Calculadora CTAs ───────────────────────────────────────────────────────
  document.querySelectorAll('a[href="calculadora.html"]').forEach(function(el) {
    el.addEventListener('click', function() {
      var section = el.closest('section');
      var loc = section
        ? (section.id || 'section')
        : (el.closest('header') ? 'header' : 'footer');
      CRBOX.track.calculadora_cta(loc, el.textContent.trim().slice(0, 80));
    });
  });

  // ── Nav clicks (header nav links) ─────────────────────────────────────────
  var headerEl = document.querySelector('header');
  if (headerEl) {
    headerEl.querySelectorAll('nav a[href], .hidden.md\\:flex a[href]').forEach(function(el) {
      el.addEventListener('click', function() {
        CRBOX.track.nav_click(el.textContent.trim().slice(0, 60), el.getAttribute('href') || '');
      });
    });
  }

  // ── Service cards (servicios.html) ─────────────────────────────────────────
  document.querySelectorAll('.service-card').forEach(function(el) {
    el.addEventListener('click', function() {
      var h3 = el.querySelector('h3');
      CRBOX.track.service_card_click(h3 ? h3.textContent.trim() : 'unknown');
    });
  });

  // ── FAQ items ──────────────────────────────────────────────────────────────
  document.querySelectorAll('.faq-item').forEach(function(el) {
    el.addEventListener('click', function() {
      var q = el.querySelector('h3');
      var section = el.closest('section');
      CRBOX.track.faq_engage(
        q ? q.textContent.trim() : 'unknown',
        section ? (section.id || 'faq') : 'faq'
      );
    });
  });

  // ── Contact form submit ────────────────────────────────────────────────────
  var contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function() {
      var asuntoEl = contactForm.querySelector('[name="asunto"]');
      CRBOX.track.contact_form_submit(asuntoEl ? asuntoEl.value : 'unknown');
    });
  }

  // ── Form start + abandon tracking ─────────────────────────────────────────
  var _formState = {};

  function _trackFormStart(formId) {
    if (!_formState[formId]) _formState[formId] = { started: false, submitted: false };
    if (!_formState[formId].started) {
      _formState[formId].started = true;
      CRBOX.track.form_start(formId);
    }
  }

  function _bindFormTracking(formEl) {
    if (!formEl) return;
    var formId = formEl.id || 'form';
    formEl.addEventListener('input', function() { _trackFormStart(formId); });
    formEl.addEventListener('change', function() { _trackFormStart(formId); });
    formEl.addEventListener('submit', function() {
      if (!_formState[formId]) _formState[formId] = { started: false, submitted: false };
      _formState[formId].submitted = true;
    });
  }

  _bindFormTracking(contactForm);
  _bindFormTracking(document.getElementById('maritimo-quote-form'));

  // form_abandon on beforeunload — best-effort, not guaranteed in all browsers
  window.addEventListener('beforeunload', function() {
    Object.keys(_formState).forEach(function(formId) {
      var s = _formState[formId];
      if (s.started && !s.submitted) {
        CRBOX.track.form_abandon(formId);
      }
    });
  });

  // ── Calculator: start on first field interaction ───────────────────────────
  var _calcStarted = false;
  var _calcMode = 'aereo';

  function _bindCalcStart(inputId) {
    var el = document.getElementById(inputId);
    if (!el) return;
    function _fireStart() {
      if (!_calcStarted) {
        _calcStarted = true;
        CRBOX.track.calculator_start(_calcMode);
      }
    }
    el.addEventListener('input', _fireStart, { once: true });
    el.addEventListener('focus', _fireStart, { once: true });
  }

  _bindCalcStart('aero-weight');
  _bindCalcStart('aero-purchase-value');
  _bindCalcStart('aero-length');
  _bindCalcStart('nombre');

  // ── Calculator: tab switch ─────────────────────────────────────────────────
  var toggleAero = document.getElementById('toggle-aero');
  var toggleMaritimo = document.getElementById('toggle-maritimo');

  if (toggleAero) {
    toggleAero.addEventListener('click', function() {
      if (_calcMode !== 'aereo') {
        _calcMode = 'aereo';
        CRBOX.track.calculator_tab_switch('aereo');
      }
    });
  }
  if (toggleMaritimo) {
    toggleMaritimo.addEventListener('click', function() {
      if (_calcMode !== 'maritimo') {
        _calcMode = 'maritimo';
        CRBOX.track.calculator_tab_switch('maritimo');
      }
    });
  }

  // ── Scroll depth — 25 / 50 / 75 / 90 milestones ───────────────────────────
  var _scrollSeen = {};
  var _scrollTimer = null;

  window.addEventListener('scroll', function() {
    clearTimeout(_scrollTimer);
    _scrollTimer = setTimeout(function() {
      var scrolled = window.scrollY + window.innerHeight;
      var total = document.documentElement.scrollHeight;
      if (total === 0) return;
      var pct = Math.round((scrolled / total) * 100);
      [25, 50, 75, 90].forEach(function(m) {
        if (pct >= m && !_scrollSeen[m]) {
          _scrollSeen[m] = true;
          CRBOX.track.scroll_depth(m);
        }
      });
    }, 200);
  }, { passive: true });

  // ── Section visibility (IntersectionObserver, ~40% threshold, fire once) ───
  if ('IntersectionObserver' in window) {
    var _trackedSections = [
      'main-content',
      'stats', 'servicios', 'cta-afiliate',
      'servicios-destacados', 'casillero', 'compras', 'carga-aerea', 'carga-maritima',
      'proceso', 'faq', 'cta-como-funciona',
      'aerea', 'maritima', 'cta-tarifas',
      'aero-calculator',
      'sucursales', 'formulario'
    ];

    var _sectionObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          CRBOX.track.section_visible(entry.target.id);
          _sectionObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    _trackedSections.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) _sectionObserver.observe(el);
    });
  }

});
