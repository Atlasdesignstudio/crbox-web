/**
 * concierge-intake.js — CRBox Concierge-Style AI Product Intake
 * v3 — vibrant, animated, conversational — no Analizar button.
 *
 * Classification fires automatically:
 *   • 700 ms after the user stops typing
 *   • Immediately when a chip is tapped
 *   • 400 ms after a URL is pasted (name derived from URL slug)
 *
 * Public API:
 *   ConciergeIntake.mount(container, opts) → { focus, setValue }
 *   ConciergeIntake.readCalcPrefill()      → prefill | null
 *
 * opts:
 *   onRequestQuote(name, approxPrice, classResult)
 *   onCalcTax(name, classResult)
 *   calcRedirect   {boolean}  default true
 *   showUrl        {boolean}  default true
 *   showPrice      {boolean}  default true
 *   placeholder    {string}
 *   compact        {boolean}  default false
 *
 * Requires: product-classifier.js loaded before this.
 * No build step — injects CSS into <head> on first call.
 */
(function (global) {
  'use strict';

  /* ── CSS injection (once) ────────────────────────────────────── */
  var _cssInjected = false;

  function _injectCss() {
    if (_cssInjected) return;
    _cssInjected = true;
    var s = document.createElement('style');
    s.textContent = [
      /* Card */
      '.ci-wrap{background:#fff;border-radius:1.75rem;',
        'border:1.5px solid rgba(229,231,235,.9);',
        'box-shadow:0 8px 40px rgba(0,0,0,.07),0 2px 12px rgba(255,107,0,.07);',
        'padding:2rem 2rem 1.75rem;margin-bottom:1.25rem;',
        'animation:ci-cardin .45s cubic-bezier(.22,.61,.36,1) both;}',
      '@keyframes ci-cardin{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}',
      '.ci-wrap.ci-compact{padding:1.1rem 1.1rem .9rem;border-radius:1.1rem;}',

      /* Heading */
      '.ci-heading{font-size:1.35rem;font-weight:800;color:#111827;margin:0 0 .2rem;letter-spacing:-.025em;}',
      '.ci-wrap.ci-compact .ci-heading{font-size:1.05rem;}',
      '.ci-sub{font-size:.84rem;color:#6b7280;margin:0 0 1.15rem;line-height:1.6;}',
      '.ci-wrap.ci-compact .ci-sub{font-size:.8rem;margin-bottom:.7rem;}',

      /* ── Search wrap ── */
      '.ci-search-wrap{background:#f9fafb;border:2px solid #e5e7eb;',
        'border-radius:1.1rem;transition:border-color .2s,box-shadow .25s;overflow:hidden;}',
      '.ci-search-wrap.ci-focused{border-color:#FF6B00;box-shadow:0 0 0 4px rgba(255,107,0,.13);}',
      '.ci-search-wrap.ci-thinking{border-color:#f97316;position:relative;}',
      /* animated shimmer bar at bottom of search-wrap while thinking */
      '.ci-search-wrap.ci-thinking::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;',
        'background:linear-gradient(90deg,transparent 0%,#FF6B00 30%,#f59e0b 60%,transparent 100%);',
        'background-size:250% 100%;animation:ci-shimmer 1.1s linear infinite;}',
      '@keyframes ci-shimmer{0%{background-position:250% center}100%{background-position:-250% center}}',

      /* Main product name input */
      '.ci-input{display:block;width:100%;padding:1rem 1.15rem;border:none;background:transparent;',
        'font-size:1rem;color:#111827;outline:none;}',
      '.ci-input::placeholder{color:#b0b7c3;}',

      /* Secondary rows (URL, price) inside the search wrap */
      '.ci-sec-row{display:flex;align-items:center;gap:.55rem;',
        'padding:.5rem 1rem .6rem;border-top:1.5px solid #f0f0f0;}',
      '.ci-sec-icon{font-size:.72rem;color:#c9ced6;flex-shrink:0;}',
      '.ci-sec-input{flex:1;border:none;background:transparent;font-size:.83rem;',
        'color:#374151;outline:none;min-width:0;}',
      '.ci-sec-input::placeholder{color:#d1d5db;}',
      '.ci-url-spin{font-size:.7rem;color:#f97316;display:none;flex-shrink:0;align-items:center;gap:.25rem;}',
      '.ci-url-spin.show{display:flex;}',

      /* ── Chips ── */
      '.ci-chips{display:flex;flex-wrap:wrap;gap:.4rem;margin:1.05rem 0 0;}',
      '.ci-chip{padding:.3rem .75rem;background:#f9fafb;color:#374151;',
        'border:1.5px solid #e5e7eb;border-radius:99px;font-size:.8rem;',
        'cursor:pointer;transition:all .17s ease;user-select:none;',
        'opacity:0;animation:ci-chipin .38s ease forwards;}',
      '@keyframes ci-chipin{from{opacity:0;transform:scale(.8) translateY(5px)}to{opacity:1;transform:scale(1) translateY(0)}}',
      '.ci-chip:hover{background:#fff7ed;border-color:#fdba74;color:#c2410c;',
        'transform:translateY(-2px);box-shadow:0 4px 10px rgba(255,107,0,.18);}',
      '.ci-chip.ci-active{background:linear-gradient(135deg,#FF6B00,#f97316);border-color:#FF6B00;',
        'color:#fff;box-shadow:0 4px 14px rgba(255,107,0,.35);transform:translateY(-2px);}',

      /* ── Result card ── */
      '.ci-result{margin-top:1.1rem;border-left:4px solid #FF6B00;',
        'background:linear-gradient(135deg,#fff7ed 0%,#fff 65%);',
        'border-radius:0 1.1rem 1.1rem 0;padding:1.1rem 1.25rem;',
        'animation:ci-slideup .32s cubic-bezier(.22,.61,.36,1) both;',
        'box-shadow:0 4px 22px rgba(255,107,0,.09);}',
      '@keyframes ci-slideup{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}',

      '.ci-result-cat{display:inline-flex;align-items:center;gap:.4rem;',
        'font-size:.88rem;color:#111827;font-weight:700;margin-bottom:.35rem;}',
      '.ci-result-cat i{color:#FF6B00;font-size:.78rem;}',
      '.ci-tax-badge{display:inline-flex;align-items:center;gap:.3rem;',
        'background:#fff;border:1.5px solid #fed7aa;border-radius:99px;',
        'padding:.18rem .6rem;font-size:.76rem;font-weight:700;color:#c2410c;margin-left:.45rem;}',

      '.ci-result-msg{font-size:.82rem;color:#374151;margin:.3rem 0 0;line-height:1.6;}',
      '.ci-result-hint{font-size:.78rem;color:#9ca3af;margin:.3rem 0 0;font-style:italic;line-height:1.5;}',

      /* CTAs */
      '.ci-result-actions{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:1rem;}',
      '.ci-cta-primary{flex:1;min-width:140px;padding:.65rem 1rem;',
        'background:linear-gradient(135deg,#FF6B00,#f97316);color:#fff;border:none;',
        'border-radius:.65rem;font-size:.875rem;font-weight:700;cursor:pointer;text-align:center;',
        'box-shadow:0 4px 14px rgba(255,107,0,.28);',
        'transition:transform .17s,box-shadow .17s;}',
      '.ci-cta-primary:hover{transform:translateY(-2px);box-shadow:0 7px 20px rgba(255,107,0,.4);}',
      '.ci-cta-secondary{flex:1;min-width:140px;padding:.65rem 1rem;background:#fff;',
        'color:#374151;border:1.5px solid #d1d5db;border-radius:.65rem;font-size:.875rem;',
        'font-weight:600;cursor:pointer;text-align:center;transition:background .17s,border-color .17s;}',
      '.ci-cta-secondary:hover{background:#f9fafb;border-color:#9ca3af;}',

      '.ci-skip-link{text-align:center;margin-top:.75rem;font-size:.78rem;color:#9ca3af;}',
      '.ci-skip-link a{color:#9ca3af;text-decoration:underline;text-underline-offset:2px;}',
      '.ci-skip-link a:hover{color:#6b7280;}',
    ].join('');
    document.head.appendChild(s);
  }

  /* ── Chip definitions ──────────────────────────────────────────── */
  var _CHIPS = [
    { label: '💻 Laptop',       query: 'laptop computadora' },
    { label: '📱 Celular',      query: 'celular smartphone' },
    { label: '👟 Calzado',      query: 'tenis zapatos Nike' },
    { label: '👗 Ropa',         query: 'ropa' },
    { label: '🎮 Videojuegos',  query: 'consola videojuegos PlayStation' },
    { label: '🏠 Hogar',        query: 'electrodoméstico aspiradora' },
    { label: '⌚ Reloj',        query: 'smartwatch reloj' },
    { label: '📚 Libros',       query: 'libro' },
  ];

  var _PREFILL_KEY = 'crbox_calc_prefill';
  var _PREFILL_TTL = 15 * 60 * 1000;

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Derive a human-readable product name from a product URL */
  function _nameFromUrl(rawUrl) {
    try {
      var url = rawUrl;
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      var u = new URL(url);
      var host = u.hostname.replace(/^www\./, '');
      var path = u.pathname;
      var sp   = u.searchParams;
      if (/amazon\./i.test(host)) {
        var pq = sp.get('k') || sp.get('s') || '';
        if (pq.length > 3) return pq.replace(/\+/g, ' ').trim().substring(0, 80);
        var parts = path.split('/').filter(Boolean);
        for (var i = 0; i < parts.length; i++) {
          if (/^[A-Z0-9]{10}$/.test(parts[i]) && parts[i + 1])
            return parts[i + 1].replace(/-/g, ' ').substring(0, 80);
        }
      }
      if (/ebay\./i.test(host)) {
        var m = path.match(/\/itm\/([^\/]+)/);
        if (m) return decodeURIComponent(m[1]).replace(/-/g, ' ').substring(0, 80);
      }
      var segs = path.split('/').filter(function (s) {
        return s.length > 5 && /[a-zA-Z]/.test(s) && !/^\d+$/.test(s);
      });
      segs.sort(function (a, b) { return b.length - a.length; });
      if (segs[0])
        return decodeURIComponent(segs[0])
          .replace(/[-_+]+/g, ' ')
          .replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9\s]/g, ' ')
          .replace(/\s+/g, ' ').trim().substring(0, 80);
    } catch (e) {}
    return '';
  }

  /* Parse "13%–20%" → { low, high } dollar amounts */
  function _taxDollars(rangeStr, price) {
    if (!rangeStr || price <= 0) return null;
    var m = rangeStr.match(/(\d+(?:\.\d+)?)\s*%?\s*[-–—]\s*(\d+(?:\.\d+)?)%?/);
    if (m) return { low: Math.round(parseFloat(m[1]) / 100 * price), high: Math.round(parseFloat(m[2]) / 100 * price) };
    var m2 = rangeStr.match(/(\d+(?:\.\d+)?)%/);
    if (m2) { var e = Math.round(parseFloat(m2[1]) / 100 * price); return { low: e, high: e }; }
    return null;
  }

  /* ── mount ─────────────────────────────────────────────────────── */
  function mount(container, opts) {
    _injectCss();
    opts = opts || {};
    var calcRedirect = opts.calcRedirect !== false;
    var showUrl      = opts.showUrl !== false;
    var showPrice    = opts.showPrice !== false;
    var compact      = !!opts.compact;
    var placeholder  = opts.placeholder || '¿Qué quieres traer? Ej: AirPods Pro, tenis Nike…';

    /* Outer card */
    var wrap = document.createElement('div');
    wrap.className = 'ci-wrap' + (compact ? ' ci-compact' : '');

    var headingEl = document.createElement('p');
    headingEl.className = 'ci-heading';
    headingEl.textContent = '¿Qué te gustaría traer a Costa Rica?';
    wrap.appendChild(headingEl);

    var subEl = document.createElement('p');
    subEl.className = 'ci-sub';
    subEl.textContent = 'Cuéntanos el producto que quieres y te decimos la categoría, los impuestos estimados y cualquier detalle importante.';
    wrap.appendChild(subEl);

    /* ── Search wrap ── */
    var searchWrap = document.createElement('div');
    searchWrap.className = 'ci-search-wrap';

    var inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.className = 'ci-input';
    inputEl.placeholder = placeholder;
    inputEl.maxLength = 200;
    inputEl.setAttribute('autocomplete', 'off');
    inputEl.setAttribute('aria-label', 'Nombre del producto');
    searchWrap.appendChild(inputEl);

    /* URL row */
    var urlInput    = null;
    var urlSpinEl   = null;
    if (showUrl && !compact) {
      var urlRow  = document.createElement('div');
      urlRow.className = 'ci-sec-row';
      var urlIco  = document.createElement('i');
      urlIco.className = 'fas fa-link ci-sec-icon';
      urlInput = document.createElement('input');
      urlInput.type = 'url';
      urlInput.className = 'ci-sec-input';
      urlInput.placeholder = 'Enlace del producto (opcional — Amazon, eBay, etc.)';
      urlInput.maxLength = 500;
      urlSpinEl = document.createElement('span');
      urlSpinEl.className = 'ci-url-spin';
      urlSpinEl.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> leyendo…';
      urlRow.appendChild(urlIco);
      urlRow.appendChild(urlInput);
      urlRow.appendChild(urlSpinEl);
      searchWrap.appendChild(urlRow);
    }

    /* Price row */
    var priceInput = null;
    if (showPrice && !compact) {
      var priceRow = document.createElement('div');
      priceRow.className = 'ci-sec-row';
      var priceIco = document.createElement('i');
      priceIco.className = 'fas fa-dollar-sign ci-sec-icon';
      priceInput = document.createElement('input');
      priceInput.type = 'number';
      priceInput.className = 'ci-sec-input';
      priceInput.placeholder = 'Precio aproximado en USD (opcional)';
      priceInput.min = '0';
      priceInput.step = '0.01';
      priceInput.inputMode = 'decimal';
      priceRow.appendChild(priceIco);
      priceRow.appendChild(priceInput);
      searchWrap.appendChild(priceRow);
    }

    wrap.appendChild(searchWrap);

    /* ── Chips ── */
    var chipsWrap = null;
    if (!compact) {
      chipsWrap = document.createElement('div');
      chipsWrap.className = 'ci-chips';
      _CHIPS.forEach(function (c, i) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'ci-chip';
        chip.style.animationDelay = (i * 0.048) + 's';
        chip.textContent = c.label;
        chip.addEventListener('click', function () {
          chipsWrap.querySelectorAll('.ci-chip').forEach(function (ch) { ch.classList.remove('ci-active'); });
          chip.classList.add('ci-active');
          inputEl.value = c.query;
          _cancelDebounce();
          _runAnalysis();
        });
        chipsWrap.appendChild(chip);
      });
      wrap.appendChild(chipsWrap);
    }

    /* ── Result area ── */
    var resultEl = document.createElement('div');
    resultEl.className = 'ci-result';
    resultEl.style.display = 'none';
    wrap.appendChild(resultEl);

    /* Mount into DOM */
    if (typeof container === 'string') container = document.getElementById(container);
    if (container) container.appendChild(wrap);

    /* ── State ── */
    var _debounceTimer    = null;
    var _urlDebounceTimer = null;

    function _cancelDebounce() {
      if (_debounceTimer) { clearTimeout(_debounceTimer); _debounceTimer = null; }
    }

    /* Focus/blur → border highlight */
    [inputEl, urlInput, priceInput].forEach(function (el) {
      if (!el) return;
      el.addEventListener('focus', function () { searchWrap.classList.add('ci-focused'); });
      el.addEventListener('blur',  function () { searchWrap.classList.remove('ci-focused'); });
    });

    /* ── Auto-classify on typing (700ms debounce) ── */
    inputEl.addEventListener('input', function () {
      var val = this.value.trim();
      if (val.length < 2) {
        resultEl.style.display = 'none';
        resultEl.innerHTML = '';
        searchWrap.classList.remove('ci-thinking');
        _cancelDebounce();
        return;
      }
      if (chipsWrap) chipsWrap.querySelectorAll('.ci-chip').forEach(function (ch) { ch.classList.remove('ci-active'); });
      _cancelDebounce();
      _debounceTimer = setTimeout(_runAnalysis, 700);
    });

    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); _cancelDebounce(); _runAnalysis(); }
    });

    /* ── URL paste → derive name + auto-classify ── */
    if (urlInput) {
      var _handleUrlChange = function () {
        var url = (urlInput.value || '').trim();
        if (!url) return;
        if (urlSpinEl) urlSpinEl.classList.add('show');
        if (_urlDebounceTimer) clearTimeout(_urlDebounceTimer);
        _urlDebounceTimer = setTimeout(function () {
          var nameHint = _nameFromUrl(url);
          if (nameHint && nameHint.length >= 3 && inputEl.value.trim().length < 2) {
            inputEl.value = nameHint;
          }
          if (urlSpinEl) urlSpinEl.classList.remove('show');
          _cancelDebounce();
          _runAnalysis();
        }, 400);
      };
      urlInput.addEventListener('paste', function () { setTimeout(_handleUrlChange, 60); });
      urlInput.addEventListener('change', _handleUrlChange);
    }

    /* ── Price update → re-render result live ── */
    if (priceInput) {
      priceInput.addEventListener('input', function () {
        if (resultEl.style.display !== 'none' && resultEl._lastResult) {
          _renderResult(resultEl._lastResult, resultEl._lastName, parseFloat(this.value) || 0);
        }
      });
    }

    /* ── Build context for classify ── */
    function _getContext() {
      var name  = inputEl.value.trim();
      var url   = urlInput   ? (urlInput.value   || '').trim() : '';
      var price = priceInput ? (parseFloat(priceInput.value) || 0) : 0;
      if (name.length < 2 && url) {
        var hint = _nameFromUrl(url);
        if (hint && hint.length >= 3) { name = hint; inputEl.value = hint; }
      }
      var classifyQuery = name;
      if (url && name.length >= 2) {
        var urlHint = _nameFromUrl(url);
        if (urlHint && urlHint.toLowerCase().indexOf(name.toLowerCase()) === -1
            && name.toLowerCase().indexOf(urlHint.toLowerCase()) === -1)
          classifyQuery = name + ' ' + urlHint;
      }
      return { name: name, classifyQuery: classifyQuery, url: url, price: price };
    }

    /* ── Run classification ── */
    function _runAnalysis() {
      var ctx = _getContext();
      if (ctx.name.length < 2) return;
      if (typeof CRBOXProductClassifier === 'undefined') return;
      searchWrap.classList.add('ci-thinking');
      searchWrap.classList.remove('ci-focused');
      resultEl.style.display = 'none';
      resultEl.innerHTML = '';
      CRBOXProductClassifier.classify(ctx.classifyQuery, {
        url: ctx.url || undefined, priceUsd: ctx.price || undefined,
      }).then(function (result) {
        searchWrap.classList.remove('ci-thinking');
        if (!result) return;
        _renderResult(result, ctx.name, ctx.price);
      }).catch(function () {
        searchWrap.classList.remove('ci-thinking');
      });
    }

    /* ── Render result card ── */
    function _renderResult(result, name, approxPrice) {
      resultEl._lastResult = result;
      resultEl._lastName   = name;
      resultEl.innerHTML   = '';
      resultEl.style.display = '';

      var hasKnownCat = result.displayName && result.displayName !== 'Revisión manual requerida';

      /* Category + tariff badge */
      if (hasKnownCat) {
        var catLine = document.createElement('div');
        catLine.className = 'ci-result-cat';
        catLine.innerHTML = '<i class="fas fa-tag"></i> ' + _esc(result.displayName);
        if (result.estimatedRange) {
          catLine.innerHTML += '<span class="ci-tax-badge"><i class="fas fa-percent" style="font-size:.6rem;"></i> '
            + _esc(result.estimatedRange) + '</span>';
        }
        resultEl.appendChild(catLine);
      }

      /* Dollar tax estimate */
      if (hasKnownCat && result.estimatedRange) {
        if (approxPrice > 0) {
          var td = _taxDollars(result.estimatedRange, approxPrice);
          if (td) {
            var dollarEl = document.createElement('p');
            dollarEl.className = 'ci-result-msg';
            var dtxt = td.low === td.high ? '~$' + td.low + ' USD' : '~$' + td.low + '–$' + td.high + ' USD';
            dollarEl.innerHTML = '<i class="fas fa-coins" style="color:#f59e0b;margin-right:.3rem;font-size:.73rem;"></i>'
              + 'Pagarías aprox. <strong>' + dtxt + '</strong> en impuestos al entrar a Costa Rica.';
            resultEl.appendChild(dollarEl);
          }
        } else {
          var hintEl = document.createElement('p');
          hintEl.className = 'ci-result-hint';
          hintEl.innerHTML = '<i class="fas fa-lightbulb" style="font-size:.7rem;margin-right:.25rem;"></i>'
            + 'Agrega el precio para ver el estimado de impuestos en dólares.';
          resultEl.appendChild(hintEl);
        }
      }

      /* Customer message (no risk) */
      if (result.customerMessage && !CRBOXProductClassifier.hasRisk(result)) {
        var msgEl = document.createElement('p');
        msgEl.className = 'ci-result-msg';
        msgEl.textContent = result.customerMessage;
        resultEl.appendChild(msgEl);
      }

      /* Unknown category */
      if (!hasKnownCat) {
        var unknownEl = document.createElement('p');
        unknownEl.className = 'ci-result-msg';
        unknownEl.textContent = result.customerMessage
          || 'Un asesor CRBOX revisará este producto y te contactará con todos los detalles.';
        resultEl.appendChild(unknownEl);
      }

      /* Compliance notice */
      if (CRBOXProductClassifier.hasRisk(result)) {
        CRBOXProductClassifier.showComplianceNotice(resultEl, result);
      }

      /* CTAs */
      var actions = document.createElement('div');
      actions.className = 'ci-result-actions';

      var ctaCalc = document.createElement('button');
      ctaCalc.type = 'button';
      ctaCalc.className = 'ci-cta-secondary';
      ctaCalc.innerHTML = '<i class="fas fa-calculator" style="margin-right:.35rem;font-size:.78rem;"></i>Calcular impuestos';
      ctaCalc.addEventListener('click', function () {
        if (calcRedirect) {
          try {
            localStorage.setItem(_PREFILL_KEY, JSON.stringify({
              name: name, legacyCode: result.legacyCode || '',
              brainResult: result, approxPrice: approxPrice || 0, _ts: Date.now(),
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
      ctaQuote.innerHTML = '<i class="fas fa-shopping-cart" style="margin-right:.35rem;font-size:.78rem;"></i>Solicitar cotización';
      ctaQuote.addEventListener('click', function () {
        if (typeof opts.onRequestQuote === 'function') opts.onRequestQuote(name, approxPrice, result);
      });

      actions.appendChild(ctaCalc);
      actions.appendChild(ctaQuote);
      resultEl.appendChild(actions);
    }

    return {
      focus:    function () { if (inputEl) inputEl.focus(); },
      setValue: function (v) { inputEl.value = v || ''; },
    };
  }

  /* ── readCalcPrefill ───────────────────────────────────────────── */
  function readCalcPrefill() {
    try {
      var raw = localStorage.getItem(_PREFILL_KEY);
      if (!raw) return null;
      localStorage.removeItem(_PREFILL_KEY);
      var obj = JSON.parse(raw);
      if (!obj || !obj._ts || (Date.now() - obj._ts > _PREFILL_TTL)) return null;
      return obj;
    } catch (e) { return null; }
  }

  global.ConciergeIntake = { mount: mount, readCalcPrefill: readCalcPrefill };

})(window);
