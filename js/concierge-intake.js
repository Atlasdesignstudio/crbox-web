/**
 * concierge-intake.js — CRBox Concierge-Style AI Product Intake
 *
 * Renders a warm "¿Qué te gustaría traer?" block with quick-pick chips,
 * optional URL field (used as classification context), optional price field
 * (used for dollar-amount tax estimates), classify() integration, and a
 * results card with category, price-aware tax copy, compliance notice,
 * and two CTAs.
 *
 * Public API:
 *   ConciergeIntake.mount(container, opts)      → { focus, setValue }
 *   ConciergeIntake.readCalcPrefill()           → prefill object | null
 *
 * opts:
 *   onRequestQuote(name, approxPrice, classResult)  — "Solicitar compra" CTA
 *   onCalcTax(name, classResult)                    — "Calcular impuesto" (no redirect)
 *   calcRedirect   {boolean}  default true  — CTA navigates to calculadora.html
 *   showUrl        {boolean}  default true  — show optional URL field
 *   showPrice      {boolean}  default true  — show optional price field
 *   placeholder    {string}   — input placeholder override
 *   compact        {boolean}  default false — smaller padding, no chips
 *
 * Requires: product-classifier.js + product-categories.js loaded before this.
 * No build step; injects own CSS into <head> on first call.
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
        'box-shadow:0 4px 20px rgba(0,0,0,.07);padding:1.5rem 1.5rem 1.25rem;margin-bottom:1rem;}',
      '.ci-wrap.ci-compact{padding:1rem 1rem .85rem;border-radius:.75rem;}',
      '.ci-heading{font-size:1.2rem;font-weight:700;color:#111827;margin:0 0 .25rem;}',
      '.ci-wrap.ci-compact .ci-heading{font-size:1rem;}',
      '.ci-sub{font-size:.83rem;color:#6b7280;margin:0 0 .9rem;line-height:1.5;}',
      '.ci-wrap.ci-compact .ci-sub{margin-bottom:.65rem;font-size:.8rem;}',
      '.ci-input-row{display:flex;gap:.5rem;align-items:center;}',
      '.ci-input{flex:1;padding:.7rem 1rem;border:1.5px solid #d1d5db;border-radius:.6rem;',
        'font-size:.95rem;color:#111827;transition:border-color .18s;outline:none;min-width:0;}',
      '.ci-input:focus{border-color:#FF6B00;box-shadow:0 0 0 3px rgba(255,107,0,.13);}',
      '.ci-btn{flex-shrink:0;padding:.7rem 1.1rem;background:#FF6B00;color:#fff;border:none;',
        'border-radius:.6rem;font-size:.88rem;font-weight:700;cursor:pointer;',
        'transition:background .2s,transform .1s;white-space:nowrap;}',
      '.ci-btn:hover{background:#E05A00;transform:translateY(-1px);}',
      '.ci-btn:disabled{background:#d1d5db;color:#9ca3af;cursor:not-allowed;transform:none;}',
      '.ci-chips{display:flex;flex-wrap:wrap;gap:.4rem;margin:.65rem 0 0;}',
      '.ci-chip{padding:.26rem .65rem;background:#f3f4f6;color:#374151;border:1.5px solid #e5e7eb;',
        'border-radius:99px;font-size:.77rem;cursor:pointer;transition:all .15s;user-select:none;}',
      '.ci-chip:hover,.ci-chip.ci-active{background:#fff7ed;border-color:#fdba74;color:#9a3412;font-weight:600;}',
      '.ci-expand-row{margin-top:.55rem;}',
      '.ci-expand-toggle{background:none;border:none;color:#6b7280;font-size:.78rem;',
        'cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:2px;}',
      '.ci-expand-toggle:hover{color:#374151;}',
      '.ci-extra-fields{margin-top:.5rem;display:grid;grid-template-columns:1fr 1fr;gap:.5rem;}',
      '@media(max-width:480px){.ci-extra-fields{grid-template-columns:1fr;}}',
      '.ci-field-wrap{display:flex;flex-direction:column;gap:.2rem;}',
      '.ci-field-label{font-size:.74rem;color:#6b7280;font-weight:500;}',
      '.ci-field-input{padding:.5rem .75rem;border:1.5px solid #d1d5db;border-radius:.5rem;',
        'font-size:.85rem;color:#111827;outline:none;transition:border-color .18s;}',
      '.ci-field-input:focus{border-color:#FF6B00;box-shadow:0 0 0 2px rgba(255,107,0,.12);}',
      '.ci-result{margin-top:.9rem;padding:1rem 1.1rem;background:#f9fafb;border:1px solid #e5e7eb;',
        'border-radius:.75rem;animation:ci-fadein .25s ease;}',
      '@keyframes ci-fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}',
      '.ci-result-cat{display:inline-flex;align-items:center;gap:.35rem;font-size:.82rem;',
        'color:#374151;font-weight:600;margin-bottom:.3rem;}',
      '.ci-result-cat i{color:#f97316;font-size:.75rem;}',
      '.ci-result-range{display:inline-flex;align-items:center;gap:.25rem;font-size:.78rem;',
        'color:#6b7280;margin-left:.55rem;}',
      '.ci-result-msg{font-size:.8rem;color:#374151;margin:.35rem 0 0;line-height:1.55;}',
      '.ci-result-hint{font-size:.76rem;color:#9ca3af;margin:.3rem 0 0;line-height:1.5;',
        'font-style:italic;}',
      '.ci-result-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.85rem;}',
      '.ci-cta-primary{flex:1;min-width:130px;padding:.6rem .9rem;background:#FF6B00;color:#fff;',
        'border:none;border-radius:.55rem;font-size:.85rem;font-weight:700;cursor:pointer;',
        'transition:background .18s;text-align:center;}',
      '.ci-cta-primary:hover{background:#E05A00;}',
      '.ci-cta-secondary{flex:1;min-width:130px;padding:.6rem .9rem;background:#fff;',
        'color:#374151;border:1.5px solid #d1d5db;border-radius:.55rem;font-size:.85rem;',
        'font-weight:600;cursor:pointer;transition:background .18s;text-align:center;}',
      '.ci-cta-secondary:hover{background:#f9fafb;border-color:#9ca3af;}',
      '.ci-skip-link{display:block;text-align:center;margin-top:.65rem;font-size:.78rem;color:#9ca3af;}',
      '.ci-skip-link a{color:#9ca3af;text-decoration:underline;text-underline-offset:2px;}',
      '.ci-skip-link a:hover{color:#6b7280;}',
    ].join('');
    document.head.appendChild(style);
  }

  var _CHIPS = [
    { label: 'Electrónica 💻', query: 'smartphone' },
    { label: 'Ropa 👗', query: 'ropa' },
    { label: 'Calzado 👟', query: 'zapatillas' },
    { label: 'Hogar 🏠', query: 'electrodomestico' },
    { label: 'Juguetes 🧸', query: 'juguete' },
    { label: 'Herramientas 🔧', query: 'herramienta' },
  ];

  var _PREFILL_KEY = 'crbox_calc_prefill';
  var _PREFILL_TTL = 15 * 60 * 1000;

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Try to derive a human-readable product name from a URL path.
   * Works for Amazon, eBay, and generic slug-based URLs.
   */
  function _nameFromUrl(rawUrl) {
    try {
      var url = rawUrl;
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      var u = new URL(url);
      var host = u.hostname.replace(/^www\./, '');
      var path = u.pathname;
      var searchParams = u.searchParams;

      // Amazon: /dp/ASIN/product-slug or title in search param
      if (/amazon\./i.test(host)) {
        var pq = searchParams.get('k') || searchParams.get('s') || '';
        if (pq.length > 3) return pq.replace(/\+/g, ' ').trim().substring(0, 80);
        // /dp/ASIN/product-name-slug
        var parts = path.split('/').filter(Boolean);
        for (var i = 0; i < parts.length; i++) {
          if (/^[A-Z0-9]{10}$/.test(parts[i]) && parts[i + 1]) {
            return parts[i + 1].replace(/-/g, ' ').substring(0, 80);
          }
        }
      }

      // eBay: /itm/product-title/itemId
      if (/ebay\./i.test(host)) {
        var m = path.match(/\/itm\/([^\/]+)/);
        if (m) return decodeURIComponent(m[1]).replace(/-/g, ' ').substring(0, 80);
      }

      // Generic: find longest path segment that looks like a product slug
      var segs = path.split('/').filter(function (s) {
        return s.length > 5 && /[a-zA-Z]/.test(s) && !/^\d+$/.test(s);
      });
      segs.sort(function (a, b) { return b.length - a.length; });
      if (segs[0]) {
        return decodeURIComponent(segs[0])
          .replace(/[-_+]+/g, ' ')
          .replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9\s]/g, ' ')
          .replace(/\s+/g, ' ').trim().substring(0, 80);
      }
    } catch (e) {}
    return '';
  }

  /**
   * Parse an estimatedRange string like "13%–20%" into dollar amounts.
   * Returns {low, high} strings, or null if unparseable.
   */
  function _taxDollars(rangeStr, price) {
    if (!rangeStr || price <= 0) return null;
    var m = rangeStr.match(/(\d+(?:\.\d+)?)\s*%?\s*[-–—]\s*(\d+(?:\.\d+)?)%?/);
    if (m) {
      var lo = parseFloat(m[1]) / 100 * price;
      var hi = parseFloat(m[2]) / 100 * price;
      return { low: Math.round(lo), high: Math.round(hi) };
    }
    var m2 = rangeStr.match(/(\d+(?:\.\d+)?)%/);
    if (m2) {
      var est = parseFloat(m2[1]) / 100 * price;
      return { low: Math.round(est), high: Math.round(est) };
    }
    return null;
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
    subEl.textContent = 'Escríbenos qué quieres comprar en USA y te mostramos categoría, arancel estimado y si hay algún requisito especial.';
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
          chipsWrap.querySelectorAll('.ci-chip').forEach(function (ch) { ch.classList.remove('ci-active'); });
          chip.classList.add('ci-active');
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
      expandToggle.innerHTML = '<i class="fas fa-plus" style="font-size:.65rem;margin-right:.25rem;"></i>Agregar URL o precio (mejora el análisis)';
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
        urlLabel.textContent = 'URL del producto (mejora la clasificación)';
        urlInput = document.createElement('input');
        urlInput.type = 'url';
        urlInput.className = 'ci-field-input';
        urlInput.placeholder = 'https://www.amazon.com/dp/...';
        urlInput.maxLength = 500;

        // When URL is pasted and name is empty, try to auto-populate
        urlInput.addEventListener('change', function () {
          var url = (this.value || '').trim();
          if (url && inputEl.value.trim().length < 2) {
            var hint = _nameFromUrl(url);
            if (hint && hint.length >= 3) {
              inputEl.value = hint;
              analyzeBtn.disabled = false;
            }
          }
        });
        urlInput.addEventListener('blur', function () {
          var url = (this.value || '').trim();
          if (url && inputEl.value.trim().length < 2) {
            var hint = _nameFromUrl(url);
            if (hint && hint.length >= 3) {
              inputEl.value = hint;
              analyzeBtn.disabled = false;
            }
          }
        });

        urlWrap.appendChild(urlLabel);
        urlWrap.appendChild(urlInput);
        extraFieldsEl.appendChild(urlWrap);
      }

      if (showPrice) {
        var priceWrap = document.createElement('div');
        priceWrap.className = 'ci-field-wrap';
        var priceLabel = document.createElement('label');
        priceLabel.className = 'ci-field-label';
        priceLabel.textContent = 'Precio aprox. en USD (calcula impuesto en dólares)';
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
          : '<i class="fas fa-plus" style="font-size:.65rem;margin-right:.25rem;"></i>Agregar URL o precio (mejora el análisis)';
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

    function _getContext() {
      var name = inputEl.value.trim();
      var url  = urlInput  ? (urlInput.value || '').trim()  : '';
      var price = priceInput ? (parseFloat(priceInput.value) || 0) : 0;

      // If name is short but URL provided, try to enrich with URL-derived name
      if (name.length < 2 && url) {
        var hint = _nameFromUrl(url);
        if (hint && hint.length >= 3) {
          name = hint;
          inputEl.value = hint;
          analyzeBtn.disabled = false;
        }
      }

      // Build enriched classify query: product name + URL-derived hint (if different)
      var classifyQuery = name;
      if (url && name.length >= 2) {
        var urlHint = _nameFromUrl(url);
        if (urlHint && urlHint.toLowerCase().indexOf(name.toLowerCase()) === -1
            && name.toLowerCase().indexOf(urlHint.toLowerCase()) === -1) {
          classifyQuery = name + ' ' + urlHint;
        }
      }

      return { name: name, classifyQuery: classifyQuery, url: url, price: price };
    }

    function _runAnalysis() {
      var ctx = _getContext();
      if (ctx.name.length < 2) return;
      if (typeof CRBOXProductClassifier === 'undefined') return;

      analyzeBtn.disabled = true;
      analyzeBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Consultando…';
      resultEl.style.display = 'none';
      resultEl.innerHTML = '';

      CRBOXProductClassifier.classify(ctx.classifyQuery).then(function (result) {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Consultar';
        if (!result) return;
        _renderResult(result, ctx.name, ctx.price);
      }).catch(function () {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Consultar';
      });
    }

    function _renderResult(result, name, approxPrice) {
      resultEl.innerHTML = '';
      resultEl.style.display = '';

      var hasKnownCategory = result.displayName && result.displayName !== 'Revisión manual requerida';

      // Category + range badge
      if (hasKnownCategory) {
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

      // Price-aware tax copy
      if (hasKnownCategory && result.estimatedRange) {
        if (approxPrice > 0) {
          var td = _taxDollars(result.estimatedRange, approxPrice);
          if (td) {
            var dollarEl = document.createElement('p');
            dollarEl.className = 'ci-result-msg';
            var dollarText = td.low === td.high
              ? '<strong>~$' + td.low + ' USD</strong> en impuestos'
              : '<strong>~$' + td.low + '–$' + td.high + ' USD</strong> en impuestos';
            dollarEl.innerHTML = '<i class="fas fa-coins" style="color:#f59e0b;margin-right:.3rem;font-size:.75rem;"></i>'
              + 'En Costa Rica pagarías aprox. ' + dollarText + ' por este artículo.';
            resultEl.appendChild(dollarEl);
          }
        } else {
          var hintEl = document.createElement('p');
          hintEl.className = 'ci-result-hint';
          hintEl.innerHTML = '<i class="fas fa-lightbulb" style="font-size:.72rem;margin-right:.25rem;"></i>'
            + 'Agrega el precio aprox. para ver el estimado de impuestos en dólares.';
          resultEl.appendChild(hintEl);
        }
      }

      // General customer message (no risk)
      if (result.customerMessage && !CRBOXProductClassifier.hasRisk(result)) {
        var msgEl = document.createElement('p');
        msgEl.className = 'ci-result-msg';
        msgEl.textContent = result.customerMessage;
        resultEl.appendChild(msgEl);
      }

      // Unknown category
      if (!hasKnownCategory) {
        var unknownEl = document.createElement('p');
        unknownEl.className = 'ci-result-msg';
        unknownEl.textContent = result.customerMessage
          || 'No encontramos esta categoría automáticamente. Un asesor CRBOX la revisará al recibir tu solicitud.';
        resultEl.appendChild(unknownEl);
      }

      // Compliance notice (restricted / regulated / forbidden)
      if (CRBOXProductClassifier.hasRisk(result)) {
        CRBOXProductClassifier.showComplianceNotice(resultEl, result);
      }

      // CTAs
      var actions = document.createElement('div');
      actions.className = 'ci-result-actions';

      var ctaCalc = document.createElement('button');
      ctaCalc.type = 'button';
      ctaCalc.className = 'ci-cta-secondary';
      ctaCalc.innerHTML = '<i class="fas fa-calculator" style="margin-right:.3rem;font-size:.8rem;"></i>Calcular impuesto';
      ctaCalc.addEventListener('click', function () {
        if (calcRedirect) {
          try {
            localStorage.setItem(_PREFILL_KEY, JSON.stringify({
              name: name, legacyCode: result.legacyCode || '',
              brainResult: result, approxPrice: approxPrice || 0,
              _ts: Date.now(),
            }));
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
      setValue: function (v) {
        inputEl.value = v || '';
        analyzeBtn.disabled = (inputEl.value.trim().length < 2);
      },
    };
  }

  /**
   * Read and consume the crbox_calc_prefill key from localStorage.
   * Returns the prefill object if fresh (< TTL), else null. Always clears.
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

  global.ConciergeIntake = { mount: mount, readCalcPrefill: readCalcPrefill };

})(window);
