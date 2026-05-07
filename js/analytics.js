/**
 * CRBOX Analytics — dataLayer event taxonomy
 * GTM-ready dataLayer push helpers with automatic page context injection.
 *
 * Event naming: strict lowercase_snake_case for all event names and params.
 * Every push includes: page_path, page_name, page_type.
 *
 * page_type values:
 *   Public:  home | services | how_it_works | pricing | calculator | contact
 *   Portal:  portal_auth | registration | portal | portal_packages |
 *            portal_invoices | portal_requests | portal_quotes | utility
 */

window.dataLayer = window.dataLayer || [];

// ─── Page context map ─────────────────────────────────────────────────────────

var _CRBOX_PAGE_MAP = {
  // ── Public pages ──────────────────────────────────────────────────────────
  '/':                      { name: 'index',            type: 'home' },
  '/index.html':            { name: 'index',            type: 'home' },
  '/servicios.html':        { name: 'servicios',        type: 'services' },
  '/como-funciona.html':    { name: 'como_funciona',    type: 'how_it_works' },
  '/tarifas.html':          { name: 'tarifas',          type: 'pricing' },
  '/calculadora.html':      { name: 'calculadora',      type: 'calculator' },
  '/contacto.html':         { name: 'contacto',         type: 'contact' },

  // ── Auth pages ────────────────────────────────────────────────────────────
  '/login.html':            { name: 'login',            type: 'portal_auth' },
  '/afiliate.html':         { name: 'afiliate',         type: 'registration' },

  // ── Portal pages ──────────────────────────────────────────────────────────
  '/dashboard.html':        { name: 'dashboard',        type: 'portal' },
  '/mi-cuenta.html':        { name: 'mi_cuenta',        type: 'portal' },
  '/mis-paquetes.html':     { name: 'mis_paquetes',     type: 'portal_packages' },
  '/mis-facturas.html':     { name: 'mis_facturas',     type: 'portal_invoices' },
  '/mis-solicitudes.html':  { name: 'mis_solicitudes',  type: 'portal_requests' },
  '/solicitud.html':        { name: 'solicitud',        type: 'portal_requests' },
  '/cotizar.html':          { name: 'cotizar',          type: 'portal_quotes' },

  // ── Utility pages ─────────────────────────────────────────────────────────
  '/404.html':              { name: '404',              type: 'utility' },
  '/privacidad.html':       { name: 'privacidad',       type: 'utility' },
  '/terminos.html':         { name: 'terminos',         type: 'utility' }
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
      weight_bucket: params.weight_bucket || null,
      value_bucket: params.value_bucket || null,
      destination_country: params.destination_country || null,
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

  // ── Auth events ──────────────────────────────────────────────────────────────

  login_start: function() {
    this.push('login_start', {});
  },

  login_success: function() {
    this.push('login_success', {});
  },

  login_error: function(error_category) {
    this.push('login_error', {
      error_category: error_category || 'unknown'
    });
  },

  signup_start: function() {
    this.push('signup_start', {});
  },

  signup_step: function(step_name) {
    this.push('signup_step', {
      step_name: step_name || 'unknown'
    });
  },

  signup_success: function(account_type) {
    this.push('signup_success', {
      account_type: account_type || 'personal'
    });
  },

  signup_error: function(error_category) {
    this.push('signup_error', {
      error_category: error_category || 'unknown'
    });
  },

  // ── Package events ───────────────────────────────────────────────────────────

  package_search: function(query_length_bucket) {
    this.push('package_search', {
      query_length_bucket: query_length_bucket || '1_5',
      search_used: true
    });
  },

  package_search_result: function(result_found, status_category) {
    this.push('package_search_result', {
      result_found: !!result_found,
      status_category: status_category || 'unknown'
    });
  },

  package_detail_view: function() {
    this.push('package_detail_view', {});
  },

  // ── Invoice events ───────────────────────────────────────────────────────────

  invoice_upload_start: function(file_type) {
    this.push('invoice_upload_start', {
      file_type: file_type || 'unknown'
    });
  },

  invoice_upload_success: function() {
    this.push('invoice_upload_success', {});
  },

  invoice_upload_error: function(error_category) {
    this.push('invoice_upload_error', {
      error_category: error_category || 'unknown'
    });
  },

  // ── Quote events ─────────────────────────────────────────────────────────────

  quote_start: function(service_type) {
    this.push('quote_start', {
      service_type: service_type || 'aereo'
    });
  },

  quote_submit: function(params) {
    params = params || {};
    this.push('quote_submit', {
      service_type:        params.service_type        || 'aereo',
      destination_country: params.destination_country || 'CR',
      has_dimensions:      !!params.has_dimensions,
      item_count_bucket:   params.item_count_bucket   || '1'
    });
  },

  // ── Portal navigation events ──────────────────────────────────────────────────

  portal_section_view: function(section_name) {
    this.push('portal_section_view', {
      section_name: section_name || 'unknown'
    });
  },

  // ── Chat events ───────────────────────────────────────────────────────────────

  chat_open: function() {
    this.push('chat_open', {});
  },

  chat_message_sent: function(message_type) {
    this.push('chat_message_sent', {
      message_type: message_type || 'text'
    });
  },

  // ── Outbound link events ──────────────────────────────────────────────────────

  outbound_click: function(link_domain, link_context) {
    this.push('outbound_click', {
      link_domain:  link_domain  || 'unknown',
      link_context: link_context || 'content'
    });
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

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Derive a privacy-safe query-length bucket from an input string's length.
 * Never captures the actual string.
 */
function _crboxQueryLengthBucket(str) {
  var len = (str || '').length;
  if (len <= 5)  return '1_5';
  if (len <= 15) return '6_15';
  return '16_plus';
}

/**
 * Derive the nearest semantic ancestor context label for an element.
 * Returns one of: nav, header, footer, or the closest section id, or 'content'.
 */
function _crboxLinkContext(el) {
  if (el.closest('nav'))    return 'nav';
  if (el.closest('header')) return 'header';
  if (el.closest('footer')) return 'footer';
  var section = el.closest('section[id]');
  if (section) return section.id;
  return 'content';
}

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

  // ── portal_section_view — auto-fire on every portal page load ───────────────
  // Each portal page is a separate HTML file; firing on DOMContentLoaded is the
  // reliable hook without touching every portal page individually.
  (function() {
    try {
      var ctx = _crboxPageCtx();
      if (ctx.page_type && ctx.page_type.indexOf('portal') === 0) {
        CRBOX.track.portal_section_view(ctx.page_name);
      }
    } catch (e) {}
  }());

  // ── Outbound link clicks ────────────────────────────────────────────────────
  // Fires outbound_click for any <a> pointing to a different hostname.
  // Only captures domain (never full URL or query params) + nearest ancestor context.
  var _currentHost = window.location.hostname;
  document.querySelectorAll('a[href]').forEach(function(el) {
    var href = el.getAttribute('href') || '';
    if (!href || href.charAt(0) === '/' || href.charAt(0) === '#' || href.charAt(0) === '.') return;
    try {
      var parsed = new URL(href, window.location.href);
      if (parsed.hostname && parsed.hostname !== _currentHost) {
        el.addEventListener('click', function() {
          CRBOX.track.outbound_click(parsed.hostname, _crboxLinkContext(el));
        });
      }
    } catch (e) { /* malformed href — skip */ }
  });

});
