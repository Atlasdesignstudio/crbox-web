/**
 * concierge-intake.js — CRBox Concierge-Style AI Product Intake
 *
 * Renders a warm "¿Qué te gustaría traer?" block with quick-pick chips,
 * optional URL and price fields, classify() integration, and a results
 * card with category info, tax range, compliance notice, and two CTAs.
 *
 * Public API:
 *   ConciergeIntake.mount(container, opts)
 *
 * opts:
 *   onRequestQuote(name, approxPrice, classResult)   — "Solicitar compra" CTA
 *   onCalcTax(name, classResult)                     — "Calcular impuesto" CTA (if no redirect)
 *   calcRedirect {boolean}  default true  — CTA navigates to calculadora.html via localStorage
 *   showUrl      {boolean}  default true  — show optional URL field
 *   showPrice    {boolean}  default true  — show optional price field
 *   placeholder  {string}   — input placeholder override
 *   compact      {boolean}  default false — no chips, smaller padding (portal panel mode)
 *
 * Requires: product-classifier.js + product-categories.js (loaded before this file).
 * No build step; injects own CSS on first call.
 */
(function (global) {
  'use strict';

  var _cssInjected = false;

  function _injectCss() {
    if (_cssInjected) return;
    _cssInjected = true;
    var style = document.createElement('style');
    style.textContent = [
      '.ci-wrap{background:#fff;border-radius:1rem;border:1px solid #e5e7eb;',
        'box-shadow:0 4px 20px rgba(0,0,0,.07);padding:1.5rem 1.5rem 1.25rem;margin-bottom:1.25rem;}',
      '.ci-wrap.ci-compact{padding:1rem 1rem .85rem;border-radius:.75rem;}',
      '.ci-heading{font-size:1.2rem;font-weight:700;color:#111827;margin:0 0 .3rem;}',
      '.ci-wrap.ci-compact .ci-heading{font-size:1rem;}',
      '.ci-sub{font-size:.83rem;color:#6b7280;margin:0 0 1rem;}',
      '.ci-wrap.ci-compact .ci-sub{margin-bottom:.75rem;}',
      '.ci-input-row{display:flex;gap:.5rem;align-items:center;}',
      '.ci-input{flex:1;padding:.7rem 1rem;border:1.5px solid #d1d5db;border-radius:.6rem;',
        'font-size:.95rem;color:#111827;transition:border-color .18s;outline:none;}',
      '.ci-input:focus{border-color:#FF6B00;box-shadow:0 0 0 3px rgba(255,107,0,.13);}',
      '.ci-btn{flex-shrink:0;padding:.7rem 1.15rem;background:#FF6B00;color:#fff;border:none;',
        'border-radius:.6rem;font-size:.9rem;font-weight:700;cursor:pointer;',
        'transition:background .2s,transform .1s;white-space:nowrap;}',
      '.ci-btn:hover{background:#E05A00;transform:translateY(-1px);}',
      '.ci-btn:disabled{background:#d1d5db;color:#9ca3af;cursor:not-allowed;transform:none;}',
      '.ci-chips{display:flex;flex-wrap:wrap;gap:.45rem;margin:.75rem 0 0;}',
      '.ci-chip{padding:.28rem .7rem;background:#f3f4f6;color:#374151;border:1.5px solid #e5e7eb;',
        'border-radius:99px;font-size:.78rem;cursor:pointer;transition:all .15s;user-select:none;}',
      '.ci-chip:hover,.ci-chip.active{background:#fff7ed;border-color:#fdba74;color:#9a3412;font-weight:600;}',
      '.ci-expand-row{margin-top:.6rem;}',
      '.ci-expand-toggle{background:none;border:none;color:#6b7280;font-size:.78rem;',
        'cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:2px;}',
      '.ci-expand-toggle:hover{color:#374151;}',
      '.ci-extra-fields{margin-top:.55rem;display:grid;grid-template-columns:1fr 1fr;gap:.5rem;}',
      '@media(max-width:480px){.ci-extra-fields{grid-template-columns:1fr;}}',
      '.ci-field-wrap{display:flex;flex-direction:column;gap:.25rem;}',
      '.ci-field-label{font-size:.75rem;color:#6b7280;font-weight:500;}',
      '.ci-field-input{padding:.5rem .75rem;border:1.5px solid #d1d5db;border-radius:.5rem;',
        'font-size:.85rem;color:#111827;outline:none;transition:border-color .18s;}',
      '.ci-field-input:focus{border-color:#FF6B00;box-shadow:0 0 0 2px rgba(255,107,0,.12);}',
      '.ci-result{margin-top:1rem;padding:1rem 1.1rem;background:#f9fafb;border:1px solid #e5e7eb;',
        'border-radius:.75rem;animation:ci-fadein .25s ease;}',
      '@keyframes ci-fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}',
      '.ci-result-cat{display:inline-flex;align-items:center;gap:.35rem;font-size:.82rem;',
        'color:#374151;font-weight:600;margin-bottom:.35rem;}',
      '.ci-result-cat i{color:#f97316;font-size:.75rem;}',
      '.ci-result-range{display:inline-flex;align-items:center;gap:.3rem;font-size:.79rem;',
        'color:#6b7280;margin-left:.6rem;}',
      '.ci-result-msg{font-size:.8rem;color:#6b7280;margin:.3rem 0 0;line-height:1.5;}',
      '.ci-result-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.85rem;}',
      '.ci-cta-primary{flex:1;min-width:120px;padding:.6rem .9rem;background:#FF6B00;color:#fff;',
        'border:none;border-radius:.55rem;font-size:.85rem;font-weight:700;cursor:pointer;',
        'transition:background .18s;text-align:center;}',
      '.ci-cta-primary:hover{background:#E05A00;}',
      '.ci-cta-secondary{flex:1;min-width:120px;padding:.6rem .9rem;background:#fff;',
        'color:#374151;border:1.5px solid #d1d5db;border-radius:.55rem;font-size:.85rem;',
        'font-weight:600;cursor:pointer;transition:background .18s;text-align:center;}',
      '.ci-cta-secondary:hover{background:#f9fafb;border-color:#9ca3af;}',
      '.ci-result-unknown{font-size:.82rem;color:#6b7280;margin:.3rem 0 0;line-height:1.5;}',
    ].join('');
    document.head.appendChild(style);
  }

  var _CHIPS = [
    { label: 'Electrónica', query: 'smartphone' },
    { label: 'Ropa', query: 'ropa' },
    { label: 'Calzado', query: 'zapatillas' },
    { label: 'Hogar', query: 'electrodomestico' },
    { label: 'Juguetes', query: 'juguete' },
    { label: 'Herramientas', query: 'herramienta' },
  ];

  var _PREFILL_KEY = 'crbox_calc_prefill';
  var _PREFILL_TTL = 15 * 60 * 1000;

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function mount(container, opts) {
    _injectCss();
    opts = opts || {};
    var calcRedirect = opts.calcRedirect !== false;
    var showUrl      = opts.showUrl !== false;
    var showPrice    = opts.showPrice !== false;
    var compact      = !!opts.compact;
    var placeholder  = opts.placeholder || '¿Qué producto te gustaría traer?';

    var wrap = document.createElement('div');
    wrap.className = 'ci-wrap' + (compact ? ' ci-compact' : '');

    var headingEl = document.createElement('p');
    headingEl.className = 'ci-heading';
    headingEl.textContent = '¿Qué te gustaría traer?';
    wrap.appendChild(headingEl);

    var subEl = document.createElement('p');
    subEl.className = 'ci-sub';
    subEl.textContent = 'Escríbenos qué producto quieres comprar en USA y te mostramos categoría, arancel estimado y si hay algún requisito especial.';
    wrap.appendChild(subEl);

    var inputRow = document.createElement('div');
    inputRow.className = 'ci-input-row';

    var inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.className = 'ci-input';
    inputEl.placeholder = placeholder;
    inputEl.maxLength = 200;
    inputEl.setAttribute('autocomplete', 'off');
    inputEl.setAttribute('aria-label', 'Nombre del producto');
    inputRow.appendChild(inputEl);

    var analyzeBtn = document.createElement('button');
    analyzeBtn.type = 'button';
    analyzeBtn.className = 'ci-btn';
    analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Consultar';
    analyzeBtn.disabled = true;
    inputRow.appendChild(analyzeBtn);
    wrap.appendChild(inputRow);

    if (!compact) {
      var chipsWrap = document.createElement('div');
      chipsWrap.className = 'ci-chips';
      _CHIPS.forEach(function (c) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'ci-chip';
        chip.textContent = c.label;
        chip.addEventListener('click', function () {
          document.querySelectorAll('.ci-chip').forEach(function (ch) { ch.classList.remove('active'); });
          chip.classList.add('active');
          inputEl.value = c.query;
          analyzeBtn.disabled = false;
          _runAnalysis();
        });
        chipsWrap.appendChild(chip);
      });
      wrap.appendChild(chipsWrap);
    }

    var extraFieldsVisible = false;
    var extraFieldsEl = null;
    var urlInput = null;
    var priceInput = null;

    if (showUrl || showPrice) {
      var expandRow = document.createElement('div');
      expandRow.className = 'ci-expand-row';
      var expandToggle = document.createElement('button');
      expandToggle.type = 'button';
      expandToggle.className = 'ci-expand-toggle';
      expandToggle.innerHTML = '<i class="fas fa-plus" style="font-size:.65rem;margin-right:.25rem;"></i>Agregar URL o precio aproximado';
      expandRow.appendChild(expandToggle);
      wrap.appendChild(expandRow);

      extraFieldsEl = document.createElement('div');
      extraFieldsEl.className = 'ci-extra-fields';
      extraFieldsEl.style.display = 'none';

      if (showUrl) {
        var urlWrap = document.createElement('div');
        urlWrap.className = 'ci-field-wrap';
        var urlLabel = document.createElement('label');
        urlLabel.className = 'ci-field-label';
        urlLabel.textContent = 'URL del producto (opcional)';
        urlInput = document.createElement('input');
        urlInput.type = 'url';
        urlInput.className = 'ci-field-input';
        urlInput.placeholder = 'https://www.amazon.com/dp/...';
        urlInput.maxLength = 500;
        urlWrap.appendChild(urlLabel);
        urlWrap.appendChild(urlInput);
        extraFieldsEl.appendChild(urlWrap);
      }

      if (showPrice) {
        var priceWrap = document.createElement('div');
        priceWrap.className = 'ci-field-wrap';
        var priceLabel = document.createElement('label');
        priceLabel.className = 'ci-field-label';
        priceLabel.textContent = 'Precio aprox. (USD, opcional)';
        priceInput = document.createElement('input');
        priceInput.type = 'number';
        priceInput.className = 'ci-field-input';
        priceInput.placeholder = 'Ej: 150';
        priceInput.min = '0';
        priceInput.step = '0.01';
        priceInput.inputMode = 'decimal';
        priceWrap.appendChild(priceLabel);
        priceWrap.appendChild(priceInput);
        extraFieldsEl.appendChild(priceWrap);
      }

      wrap.appendChild(extraFieldsEl);

      expandToggle.addEventListener('click', function () {
        extraFieldsVisible = !extraFieldsVisible;
        extraFieldsEl.style.display = extraFieldsVisible ? '' : 'none';
        expandToggle.innerHTML = extraFieldsVisible
          ? '<i class="fas fa-minus" style="font-size:.65rem;margin-right:.25rem;"></i>Ocultar campos adicionales'
          : '<i class="fas fa-plus" style="font-size:.65rem;margin-right:.25rem;"></i>Agregar URL o precio aproximado';
      });
    }

    var resultEl = document.createElement('div');
    resultEl.className = 'ci-result';
    resultEl.style.display = 'none';
    wrap.appendChild(resultEl);

    if (typeof container === 'string') {
      container = document.getElementById(container);
    }
    if (container) container.appendChild(wrap);

    inputEl.addEventListener('input', function () {
      analyzeBtn.disabled = (this.value.trim().length < 2);
      if (resultEl.style.display !== 'none') {
        resultEl.style.display = 'none';
        resultEl.innerHTML = '';
      }
    });

    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !analyzeBtn.disabled) { e.preventDefault(); _runAnalysis(); }
    });
    analyzeBtn.addEventListener('click', _runAnalysis);

    function _runAnalysis() {
      var name = inputEl.value.trim();
      if (name.length < 2) return;
      if (typeof CRBOXProductClassifier === 'undefined') return;

      analyzeBtn.disabled = true;
      analyzeBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Consultando…';
      resultEl.style.display = 'none';
      resultEl.innerHTML = '';

      CRBOXProductClassifier.classify(name).then(function (result) {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Consultar';
        if (!result) return;
        _renderResult(result, name);
      }).catch(function () {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Consultar';
      });
    }

    function _renderResult(result, name) {
      resultEl.innerHTML = '';
      resultEl.style.display = '';

      var approxPrice = priceInput ? (parseFloat(priceInput.value) || 0) : 0;

      if (result.displayName && result.displayName !== 'Revisión manual requerida') {
        var catLine = document.createElement('div');
        catLine.className = 'ci-result-cat';
        catLine.innerHTML = '<i class="fas fa-tag"></i> ' + _esc(result.displayName);
        if (result.estimatedRange) {
          catLine.innerHTML += '<span class="ci-result-range">'
            + '<i class="fas fa-percent" style="font-size:.65rem;color:#9ca3af;"></i>'
            + _esc(result.estimatedRange) + ' arancel est.</span>';
        }
        resultEl.appendChild(catLine);
      }

      if (result.customerMessage && !CRBOXProductClassifier.hasRisk(result)) {
        var msgEl = document.createElement('p');
        msgEl.className = 'ci-result-msg';
        msgEl.textContent = result.customerMessage;
        resultEl.appendChild(msgEl);
      }

      if (result.brainCategoryId === 'unknown_manual_review' && !result.displayName) {
        var unknownEl = document.createElement('p');
        unknownEl.className = 'ci-result-unknown';
        unknownEl.textContent = result.customerMessage || 'No encontramos esta categoría automáticamente. Un asesor CRBOX revisará tu solicitud.';
        resultEl.appendChild(unknownEl);
      }

      if (CRBOXProductClassifier.hasRisk(result)) {
        CRBOXProductClassifier.showComplianceNotice(resultEl, result);
      }

      var actions = document.createElement('div');
      actions.className = 'ci-result-actions';

      var ctaCalc = document.createElement('button');
      ctaCalc.type = 'button';
      ctaCalc.className = 'ci-cta-secondary';
      ctaCalc.innerHTML = '<i class="fas fa-calculator" style="margin-right:.3rem;font-size:.8rem;"></i>Calcular impuesto';
      ctaCalc.addEventListener('click', function () {
        if (calcRedirect) {
          try {
            var prefill = {
              name:     name,
              legacyCode: result.legacyCode || '',
              brainResult: result,
              approxPrice: approxPrice || 0,
              _ts: Date.now(),
            };
            localStorage.setItem(_PREFILL_KEY, JSON.stringify(prefill));
          } catch (e) {}
          window.location.href = 'calculadora.html';
        } else if (typeof opts.onCalcTax === 'function') {
          opts.onCalcTax(name, result);
        }
      });

      var ctaQuote = document.createElement('button');
      ctaQuote.type = 'button';
      ctaQuote.className = 'ci-cta-primary';
      ctaQuote.innerHTML = '<i class="fas fa-shopping-cart" style="margin-right:.3rem;font-size:.8rem;"></i>Solicitar compra';
      ctaQuote.addEventListener('click', function () {
        if (typeof opts.onRequestQuote === 'function') {
          opts.onRequestQuote(name, approxPrice, result);
        }
      });

      actions.appendChild(ctaCalc);
      actions.appendChild(ctaQuote);
      resultEl.appendChild(actions);
    }

    return {
      focus: function () { if (inputEl) inputEl.focus(); },
      setValue: function (v) { inputEl.value = v || ''; analyzeBtn.disabled = (inputEl.value.trim().length < 2); },
    };
  }

  /**
   * Read and consume the crbox_calc_prefill key from localStorage.
   * Returns the prefill object if it exists and is fresh (< TTL), else null.
   * Always clears the key after reading.
   */
  function readCalcPrefill() {
    try {
      var raw = localStorage.getItem(_PREFILL_KEY);
      if (!raw) return null;
      localStorage.removeItem(_PREFILL_KEY);
      var obj = JSON.parse(raw);
      if (!obj || !obj._ts) return null;
      if (Date.now() - obj._ts > _PREFILL_TTL) return null;
      return obj;
    } catch (e) {
      return null;
    }
  }

  global.ConciergeIntake = {
    mount: mount,
    readCalcPrefill: readCalcPrefill,
  };

})(window);
