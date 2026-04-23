/**
 * CRBOX Analytics — dataLayer event taxonomy
 * Push structured events to GTM's dataLayer.
 * Replace GTM-XXXXXXX with your real container ID before going live.
 */

window.dataLayer = window.dataLayer || [];

var CRBOX = CRBOX || {};

CRBOX.track = {

  push: function(event, params) {
    window.dataLayer.push(Object.assign({ event: event }, params || {}));
  },

  // CTA — Afíliate Gratis button clicks
  afiliateCTA: function(location) {
    this.push('cta_afiliate_click', { cta_location: location || 'unknown' });
  },

  // CTA — Calcular Envío button clicks
  calculadoraCTA: function(location) {
    this.push('cta_calculadora_click', { cta_location: location || 'unknown' });
  },

  // WhatsApp floating button or link click
  whatsappClick: function(location) {
    this.push('whatsapp_click', { cta_location: location || 'floating_button' });
  },

  // Phone number click (tel: link)
  phoneClick: function(phone, location) {
    this.push('phone_click', { phone_number: phone, cta_location: location || 'unknown' });
  },

  // Email link click (mailto:)
  emailClick: function(email, location) {
    this.push('email_click', { email_address: email, cta_location: location || 'unknown' });
  },

  // Contact form submission
  contactFormSubmit: function(asunto) {
    this.push('contact_form_submit', { contact_subject: asunto || 'unknown' });
  },

  // FAQ item engagement (click / expand)
  faqEngage: function(question) {
    this.push('faq_engage', { faq_question: question || 'unknown' });
  },

  // Calculator: user requested a quote
  // params: { mode, weight_kg, destination, purchase_value_usd }
  calculatorQuery: function(params) {
    params = params || {};
    this.push('calculator_query', {
      shipping_mode: params.mode || null,
      package_weight_kg: params.weight_kg || null,
      destination: params.destination || null,
      purchase_value_usd: params.purchase_value_usd || null
    });
  },

  // Calculator: result shown to the user
  // params: { mode, weight_kg, destination, total_usd, shipping_usd, handling_usd, taxes_usd }
  calculatorResult: function(params) {
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
  }

};

// Auto-bind WhatsApp floating button
document.addEventListener('DOMContentLoaded', function() {
  var waBtn = document.querySelector('a.whatsapp-btn, a[href^="https://wa.me/"]');
  if (waBtn) {
    waBtn.addEventListener('click', function() {
      CRBOX.track.whatsappClick('floating_button');
    });
  }

  // Auto-bind tel: links
  document.querySelectorAll('a[href^="tel:"]').forEach(function(el) {
    el.addEventListener('click', function() {
      CRBOX.track.phoneClick(el.href.replace('tel:', ''), el.closest('section')?.id || 'header');
    });
  });

  // Auto-bind mailto: links
  document.querySelectorAll('a[href^="mailto:"]').forEach(function(el) {
    el.addEventListener('click', function() {
      CRBOX.track.emailClick(el.href.replace('mailto:', ''), el.closest('section')?.id || 'header');
    });
  });

  // Auto-bind Afíliate CTA
  document.querySelectorAll('a[href="afiliate.html"]').forEach(function(el) {
    el.addEventListener('click', function() {
      var loc = el.closest('section')?.id || el.closest('header') ? 'header' : 'footer';
      CRBOX.track.afiliateCTA(loc);
    });
  });

  // Auto-bind Calculadora CTA
  document.querySelectorAll('a[href="calculadora.html"]').forEach(function(el) {
    el.addEventListener('click', function() {
      var loc = el.closest('section')?.id || el.closest('header') ? 'header' : 'footer';
      CRBOX.track.calculadoraCTA(loc);
    });
  });

  // Auto-bind FAQ items
  document.querySelectorAll('.faq-item').forEach(function(el) {
    el.addEventListener('click', function() {
      var q = el.querySelector('h3');
      CRBOX.track.faqEngage(q ? q.textContent.trim() : 'unknown');
    });
  });

  // Contact form
  var contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      var asuntoEl = contactForm.querySelector('[name="asunto"]');
      CRBOX.track.contactFormSubmit(asuntoEl ? asuntoEl.value : 'unknown');
    });
  }
});
