/**
 * CRBOX Analytics — dataLayer event taxonomy
 * GTM-ready dataLayer push helpers with automatic page context injection.
 *
 * Event naming: strict lowercase_snake_case for all event names and params.
 * Every push includes: page_path, page_name, page_type, page_path_group.
 *
 * page_type registered values (GA4 custom dimension):
 *   Public:  public_home | public_service | public_how_it_works | public_rates |
 *            public_calculator | public_contact | public_affiliate
 *   Portal:  portal_auth | portal | portal_packages | portal_invoices |
 *            portal_requests | portal_quotes | utility
 *
 * page_path_group registered values (GA4 custom dimension):
 *   public | portal | quote | legal | utility
 *
 * Only the 24 registered GA4 custom dimension parameter names are ever sent.
 * No PII (phone numbers, email addresses, question text, tracking numbers,
 * raw URLs, or user-supplied strings) is included in any payload.
 */

window.dataLayer = window.dataLayer || [];

// ─── Page context map ─────────────────────────────────────────────────────────

var _CRBOX_PAGE_MAP = {
  // ── Public pages ──────────────────────────────────────────────────────────
  '/':                      { name: 'index',            type: 'public_home',           group: 'public' },
  '/index.html':            { name: 'index',            type: 'public_home',           group: 'public' },
  '/servicios.html':        { name: 'servicios',        type: 'public_service',        group: 'public' },
  '/como-funciona.html':    { name: 'como_funciona',    type: 'public_how_it_works',   group: 'public' },
  '/tarifas.html':          { name: 'tarifas',          type: 'public_rates',          group: 'public' },
  '/calculadora.html':      { name: 'calculadora',      type: 'public_calculator',     group: 'public' },
  '/contacto.html':         { name: 'contacto',         type: 'public_contact',        group: 'public' },

  // ── Auth / registration pages ──────────────────────────────────────────────
  '/login.html':            { name: 'login',            type: 'portal_auth',           group: 'portal' },
  '/afiliate.html':         { name: 'afiliate',         type: 'public_affiliate',      group: 'public' },

  // ── Portal pages ──────────────────────────────────────────────────────────
  '/dashboard.html':        { name: 'dashboard',        type: 'portal',                group: 'portal' },
  '/mi-cuenta.html':        { name: 'mi_cuenta',        type: 'portal',                group: 'portal' },
  '/mis-paquetes.html':     { name: 'mis_paquetes',     type: 'portal_packages',       group: 'portal' },
  '/mis-facturas.html':     { name: 'mis_facturas',     type: 'portal_invoices',       group: 'portal' },
  '/mis-solicitudes.html':  { name: 'mis_solicitudes',  type: 'portal_requests',       group: 'portal' },
  '/solicitud.html':        { name: 'solicitud',        type: 'portal_requests',       group: 'portal' },
  '/cotizar.html':          { name: 'cotizar',          type: 'portal_quotes',         group: 'quote'  },

  // ── Utility / legal pages ─────────────────────────────────────────────────
  '/404.html':              { name: '404',              type: 'utility',               group: 'utility' },
  '/privacidad.html':       { name: 'privacidad',       type: 'utility',               group: 'legal'   },
  '/terminos.html':         { name: 'terminos',         type: 'utility',               group: 'legal'   }
};

function _crboxPageCtx() {
  var p = window.location.pathname;
  var m = _CRBOX_PAGE_MAP[p] || {
    name: p.replace(/^\/|\.html$/g, '') || 'unknown',
    type: 'unknown',
    group: 'unknown'
  };
  return {
    page_path:       p,
    page_name:       m.name,
    page_type:       m.type,
    page_path_group: m.group
  };
}

// ─── Core namespace ───────────────────────────────────────────────────────────

var CRBOX = window.CRBOX || {};

CRBOX.track = {

  push: function(event, params) {
    var payload = Object.assign({ event: event }, _crboxPageCtx(), params || {});
    window.dataLayer.push(payload);
  },

  // ── CTA events ──────────────────────────────────────────────────────────────
  // Unified method for all CTA clicks. Replaces event-specific afiliate_cta /
  // calculadora_cta. Uses registered parameters only.
  //   cta_id           — machine-stable identifier (e.g. 'afiliate_cta', 'calculadora_cta')
  //   cta_location     — ancestor context  (section id | 'header' | 'footer' | 'nav')
  //   destination_type — 'internal_page' | 'external'
  //   cta_text         — (optional) controlled label, max 60 chars

  cta_click: function(params) {
    params = params || {};
    this.push('cta_click', {
      cta_id:           params.cta_id           || 'unknown',
      cta_location:     params.cta_location     || 'unknown',
      destination_type: params.destination_type || 'internal_page',
      cta_text:         params.cta_text         || undefined
    });
  },

  // ── Contact channel events ───────────────────────────────────────────────────
  // Phone and email clicks use outbound_click pattern with link_domain/link_context.
  // Raw phone numbers and email addresses are never captured.

  whatsapp_click: function(location) {
    this.push('whatsapp_click', {
      cta_location: location || 'floating_button',
      link_domain:  'wa.me',
      link_context: location || 'floating_button'
    });
  },

  phone_click: function(location) {
    this.push('phone_click', {
      link_domain:  'phone',
      link_context: location || 'unknown'
    });
  },

  email_click: function(location) {
    this.push('email_click', {
      link_context: location || 'unknown'
    });
  },

  // ── Form events ──────────────────────────────────────────────────────────────
  // form_name replaces the non-registered form_id parameter.

  contact_form_submit: function() {
    this.push('contact_form_submit', { form_name: 'contact' });
  },

  form_start: function(form_name) {
    this.push('form_start', { form_name: form_name || 'unknown' });
  },

  form_abandon: function(form_name) {
    this.push('form_abandon', { form_name: form_name || 'unknown' });
  },

  // ── Content engagement ───────────────────────────────────────────────────────
  // faq_engage: raw question text removed — only the section_name (section id) is sent.
  // nav_click:  raw label and href removed — only link_context + destination_type.
  // service_card_click: raw service name replaced with normalized service_type.

  faq_engage: function(section_name) {
    this.push('faq_engage', { section_name: section_name || 'faq' });
  },

  nav_click: function(link_context, destination_type) {
    this.push('nav_click', {
      link_context:     link_context     || 'nav',
      destination_type: destination_type || 'internal_page'
    });
  },

  service_card_click: function(service_type) {
    this.push('service_card_click', { service_type: service_type || 'unknown' });
  },

  // ── Calculator events ────────────────────────────────────────────────────────
  // calculator_query: raw weight, destination, and purchase value removed.
  //   Only shipping_mode (registered) is retained.
  // calculator_result: raw monetary values removed (total_usd, shipping_usd,
  //   handling_usd, taxes_usd). Only registered bucketed dimensions are sent.
  // calculator_tab_switch: to_mode renamed to shipping_mode (registered).

  calculator_start: function(mode) {
    this.push('calculator_start', { shipping_mode: mode || 'aereo' });
  },

  calculator_tab_switch: function(shipping_mode) {
    this.push('calculator_tab_switch', { shipping_mode: shipping_mode || 'aereo' });
  },

  calculator_query: function(params) {
    params = params || {};
    this.push('calculator_query', {
      shipping_mode: params.mode || params.shipping_mode || null
    });
  },

  calculator_result: function(params) {
    params = params || {};
    this.push('calculator_result', {
      shipping_mode:       params.mode || params.shipping_mode || null,
      weight_bucket:       params.weight_bucket       || null,
      value_bucket:        params.value_bucket        || null,
      destination_country: params.destination_country || null
    });
  },

  // ── Scroll & visibility ──────────────────────────────────────────────────────
  // section_visible: section_id renamed to section_name (registered).

  scroll_depth: function(depth_percent) {
    this.push('scroll_depth', { depth_percent: depth_percent });
  },

  section_visible: function(section_name) {
    this.push('section_visible', { section_name: section_name || 'unknown' });
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

  // package_search: query_length_bucket and search_used are not registered
  // GA4 custom dimensions, so they are not included in the push. The event
  // name itself signals that a search occurred; volume and funnel data is
  // captured through the event count. No query text is ever sent.

  package_search: function() {
    this.push('package_search', {});
  },

  // package_search_result: result_found (boolean) is not a registered GA4
  // custom dimension. status_category IS registered and is retained so GA4
  // can report on which statuses yield "no results".

  package_search_result: function(result_found, status_category) {
    this.push('package_search_result', {
      status_category: result_found ? (status_category || 'unknown') : 'no_result'
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

  // quote_submit: has_dimensions and item_count_bucket are not registered GA4
  // custom dimensions. Only service_type and destination_country (both registered)
  // are included. The event name itself signals quote intent.

  quote_submit: function(params) {
    params = params || {};
    this.push('quote_submit', {
      service_type:        params.service_type        || 'aereo',
      destination_country: params.destination_country || 'CR'
    });
  },

  // ── Portal navigation events ──────────────────────────────────────────────────
  // Accepts an object with all four registered parameters, or a plain string
  // for backward compatibility (string is treated as section_name; page context
  // is derived automatically from _crboxPageCtx).
  //
  //   section_name    — e.g. 'mis_paquetes' | 'mis_facturas' | 'packages_in_transit'
  //   page_name       — (optional) override; defaults to current page_name
  //   page_type       — (optional) override; defaults to current page_type
  //   status_category — (optional) e.g. 'in_transit' | 'miami' | 'delivered'
  //   cta_location    — (optional) which UI element triggered navigation:
  //                     'entry_card' | 'stat_card' | 'hero_button' | 'tab_bar'
  //                     | 'nav_dropdown' | 'mobile_nav' | 'other'

  portal_section_view: function(params) {
    var ctx = _crboxPageCtx();
    var section_name, page_name, page_type, status_category, cta_location;

    if (params && typeof params === 'object') {
      section_name    = params.section_name    || 'unknown';
      page_name       = params.page_name       || ctx.page_name;
      page_type       = params.page_type       || ctx.page_type;
      status_category = params.status_category || undefined;
      cta_location    = params.cta_location    || undefined;
    } else {
      section_name    = params || 'unknown';
      page_name       = ctx.page_name;
      page_type       = ctx.page_type;
      status_category = undefined;
      cta_location    = undefined;
    }

    var payload = {
      section_name: section_name,
      page_name:    page_name,
      page_type:    page_type
    };
    if (status_category) payload.status_category = status_category;
    if (cta_location)    payload.cta_location    = cta_location;
    this.push('portal_section_view', payload);
  },

  // ── Chat events ───────────────────────────────────────────────────────────────

  chat_open: function() {
    this.push('chat_open', {});
  },

  chat_message_sent: function() {
    this.push('chat_message_sent', { message_type: 'text' });
  },

  // ── Outbound link events ──────────────────────────────────────────────────────

  outbound_click: function(link_domain, link_context) {
    this.push('outbound_click', {
      link_domain:  link_domain  || 'unknown',
      link_context: link_context || 'content'
    });
  },

  // ── Backward-compat aliases ───────────────────────────────────────────────────
  // Kept so any existing inline call sites continue to work without error.
  // These forward to the corrected implementations above.

  afiliate_cta: function(location) {
    this.cta_click({ cta_id: 'afiliate_cta', cta_location: location || 'unknown', destination_type: 'internal_page' });
  },
  calculadora_cta: function(location) {
    this.cta_click({ cta_id: 'calculadora_cta', cta_location: location || 'unknown', destination_type: 'internal_page' });
  },
  afiliateCTA:       function(l)    { this.afiliate_cta(l); },
  calculadoraCTA:    function(l)    { this.calculadora_cta(l); },
  whatsappClick:     function(l)    { this.whatsapp_click(l); },
  phoneClick:        function(l)    { this.phone_click(l); },
  emailClick:        function(l)    { this.email_click(l); },
  contactFormSubmit: function()     { this.contact_form_submit(); },
  faqEngage:         function(s)    { this.faq_engage(s); },
  calculatorQuery:   function(p)    { this.calculator_query(p); },
  calculatorResult:  function(p)    { this.calculator_result(p); }

};

window.CRBOX = CRBOX;

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

/**
 * Normalize a raw service card h3 text to a stable service_type slug.
 * Strips accents, lowercases, replaces spaces/punctuation with underscores,
 * truncates to 40 chars. Never sends free-form user text.
 */
function _crboxServiceType(text) {
  if (!text) return 'unknown';
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // strip accents
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'unknown';
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

  // ── tel: links — no raw phone number sent ─────────────────────────────────
  document.querySelectorAll('a[href^="tel:"]').forEach(function(el) {
    el.addEventListener('click', function() {
      var section = el.closest('section');
      var loc = section
        ? (section.id || 'section')
        : (el.closest('header') ? 'header' : 'footer');
      CRBOX.track.phone_click(loc);
    });
  });

  // ── mailto: links — no raw email sent ────────────────────────────────────
  document.querySelectorAll('a[href^="mailto:"]').forEach(function(el) {
    el.addEventListener('click', function() {
      var section = el.closest('section');
      var loc = section
        ? (section.id || 'section')
        : (el.closest('header') ? 'header' : 'footer');
      CRBOX.track.email_click(loc);
    });
  });

  // ── Afíliate CTAs — unified cta_click ────────────────────────────────────
  document.querySelectorAll('a[href="afiliate.html"]').forEach(function(el) {
    el.addEventListener('click', function() {
      var loc = _crboxLinkContext(el);
      CRBOX.track.cta_click({
        cta_id:           'afiliate_cta',
        cta_location:     loc,
        destination_type: 'internal_page'
      });
    });
  });

  // ── Calculadora CTAs — unified cta_click ──────────────────────────────────
  document.querySelectorAll('a[href="calculadora.html"]').forEach(function(el) {
    el.addEventListener('click', function() {
      var loc = _crboxLinkContext(el);
      CRBOX.track.cta_click({
        cta_id:           'calculadora_cta',
        cta_location:     loc,
        destination_type: 'internal_page'
      });
    });
  });

  // ── Nav clicks (header nav links) — no raw label or destination ───────────
  var headerEl = document.querySelector('header');
  if (headerEl) {
    headerEl.querySelectorAll('nav a[href], .hidden.md\\:flex a[href]').forEach(function(el) {
      el.addEventListener('click', function() {
        var href = el.getAttribute('href') || '';
        var destType = (href.indexOf('http') === 0) ? 'external' : 'internal_page';
        CRBOX.track.nav_click(_crboxLinkContext(el), destType);
      });
    });
  }

  // ── Service cards — normalized service_type slug ──────────────────────────
  document.querySelectorAll('.service-card').forEach(function(el) {
    el.addEventListener('click', function() {
      var h3 = el.querySelector('h3');
      CRBOX.track.service_card_click(_crboxServiceType(h3 ? h3.textContent : ''));
    });
  });

  // ── FAQ items — section_name only, no question text ───────────────────────
  document.querySelectorAll('.faq-item').forEach(function(el) {
    el.addEventListener('click', function() {
      var section = el.closest('section');
      CRBOX.track.faq_engage(section ? (section.id || 'faq') : 'faq');
    });
  });

  // ── Contact form submit — form_name only, no subject value ────────────────
  var contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function() {
      CRBOX.track.contact_form_submit();
    });
  }

  // ── Form start + abandon tracking ─────────────────────────────────────────
  var _formState = {};

  function _trackFormStart(formName) {
    if (!_formState[formName]) _formState[formName] = { started: false, submitted: false };
    if (!_formState[formName].started) {
      _formState[formName].started = true;
      CRBOX.track.form_start(formName);
    }
  }

  function _bindFormTracking(formEl) {
    if (!formEl) return;
    var formName = formEl.id || 'form';
    formEl.addEventListener('input',  function() { _trackFormStart(formName); });
    formEl.addEventListener('change', function() { _trackFormStart(formName); });
    formEl.addEventListener('submit', function() {
      if (!_formState[formName]) _formState[formName] = { started: false, submitted: false };
      _formState[formName].submitted = true;
    });
  }

  _bindFormTracking(contactForm);
  _bindFormTracking(document.getElementById('maritimo-quote-form'));

  // form_abandon on beforeunload — best-effort, not guaranteed in all browsers
  window.addEventListener('beforeunload', function() {
    Object.keys(_formState).forEach(function(formName) {
      var s = _formState[formName];
      if (s.started && !s.submitted) {
        CRBOX.track.form_abandon(formName);
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
  var toggleAero     = document.getElementById('toggle-aero');
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
  var _scrollSeen  = {};
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

  // ── portal_section_view — auto-fire on portal page load ───────────────────
  // Fires for authenticated portal app pages only.
  // Explicitly excludes portal_auth (login.html) because that page is not
  // part of the portal navigation set and 'login' is not a normalized
  // portal section_name value.
  (function() {
    try {
      var ctx = _crboxPageCtx();
      var isPortalApp = ctx.page_type && ctx.page_type.indexOf('portal') === 0
                        && ctx.page_type !== 'portal_auth';
      if (isPortalApp) {
        CRBOX.track.portal_section_view({
          section_name: ctx.page_name,
          page_name:    ctx.page_name,
          page_type:    ctx.page_type
        });
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
