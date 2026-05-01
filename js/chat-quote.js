/**
 * chat-quote.js
 * Renders a compact mini-quote card inside a chat message.
 * Fields: name (optional), email (required), product URL (required).
 * Maps to POST /api/solicitudes using canonical field names with sensible
 * defaults for backend-required fields (product_name, declared_value_usd).
 */
(function (global) {
  'use strict';

  function createQuoteWidget(prefillData) {
    prefillData = prefillData || {};

    var container = document.createElement('div');
    container.className = 'crbox-widget-quote';

    var title = document.createElement('div');
    title.className = 'crbox-widget-title';
    title.innerHTML = '<i class="fas fa-shopping-bag"></i> Solicitar Compra por Encargo';
    container.appendChild(title);

    function mkField(labelText, inputType, placeholder, value) {
      var row = document.createElement('div');
      row.className = 'crbox-widget-row';
      var lbl = document.createElement('label');
      lbl.className = 'crbox-widget-label';
      lbl.textContent = labelText;
      var inp = document.createElement('input');
      inp.type = inputType;
      inp.className = 'crbox-widget-input';
      inp.placeholder = placeholder;
      inp.value = value || '';
      row.appendChild(lbl);
      row.appendChild(inp);
      container.appendChild(row);
      return inp;
    }

    var inpName  = mkField('Tu nombre (opcional)', 'text',  'Ana García',           prefillData.name  || '');
    var inpEmail = mkField('Email *',              'email', 'tu@email.com',         prefillData.email || '');
    var inpUrl   = mkField('Link del producto *',  'url',   'https://amazon.com/…', prefillData.url   || '');

    var errorDiv = document.createElement('div');
    errorDiv.className = 'crbox-quote-error';
    container.appendChild(errorDiv);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'crbox-quote-btn';
    btn.textContent = 'Solicitar cotización';
    container.appendChild(btn);

    var successDiv = document.createElement('div');
    successDiv.className = 'crbox-quote-success';
    successDiv.innerHTML = '<i class="fas fa-check-circle" style="margin-right:.35rem;"></i>¡Solicitud enviada! Te contactaremos pronto.';
    container.appendChild(successDiv);

    function showErr(msg) {
      errorDiv.textContent = msg;
      errorDiv.classList.add('visible');
    }
    function clearErr() { errorDiv.classList.remove('visible'); }

    btn.addEventListener('click', function () {
      clearErr();
      var name  = inpName.value.trim();
      var email = inpEmail.value.trim();
      var url   = inpUrl.value.trim();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showErr('Por favor ingresa un email válido.'); return;
      }
      if (!url || !url.match(/^https?:\/\/.+/)) {
        showErr('Por favor ingresa el link del producto (debe empezar con http).'); return;
      }

      btn.disabled = true;
      btn.textContent = 'Enviando…';

      var payload = {
        product_name:       'Solicitud vía asistente CRBox',
        customer_email:     email,
        declared_value_usd: 1,
        customer_name:      name || null,
        service_type:       'aereo',
        product_url:        url,
        customer_notes:     'Solicitud enviada desde el Asistente CRBox (chat). El equipo de ventas confirmará precio y disponibilidad.',
        data_source:        'manual',
      };

      fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok) {
          btn.style.display = 'none';
          successDiv.classList.add('visible');
        } else {
          var msg = (data && data.errors && data.errors[0]) || (data && data.error) || 'Error al enviar. Intenta de nuevo.';
          showErr(msg);
          btn.disabled = false;
          btn.textContent = 'Solicitar cotización';
        }
      })
      .catch(function () {
        showErr('Error de conexión. Intenta de nuevo.');
        btn.disabled = false;
        btn.textContent = 'Solicitar cotización';
      });
    });

    return container;
  }

  global.CHAT_QUOTE = { createQuoteWidget: createQuoteWidget };
})(window);
