'use strict';

/**
 * CRBOXProductClassifier — AI-First Product Classification Pipeline.
 *
 * Single source of truth for all product classification across:
 *   cotizar.html, calculadora.html, client portal (solicitud.html),
 *   admin panel, and the chat assistant.
 *
 * Pipeline:
 *   1. Local keyword/alias matching against PRODUCT_BRAIN_CATEGORIES (zero-latency).
 *   2. POST /api/ai/classify — server-side brain match + optional Gemini AI fallback.
 *
 * Unknowns always resolve to the `unknown_manual_review` brain category
 * — never a hard failure or null result.
 *
 * Public API (all methods on window.CRBOXProductClassifier):
 *   classify(name, opts)                → Promise<result>
 *   analyze(name, opts)                 → Promise<result>  (alias for classify)
 *   analyzeUrlResult(extractorResult)   → Promise<result>
 *   validateGeminiCategory(code)        → result|null
 *   suggest(name, catEl, barEl, noticeEl, onApplied)
 *   applyToProductCard(opts, result)
 *   buildCustomerClassificationView(result) → HTMLElement|null
 *   buildAdminClassificationView(result)    → HTMLElement|null
 *   showComplianceNotice(container, result) → HTMLElement|null
 *   removeComplianceNotice(container)
 *   shouldAllowAutomaticEstimate(result) → boolean
 *   getMissingFields(result)             → string[]
 *   hasRisk(result)                      → boolean
 *   riskLevel(result)                    → 'none'|'regulated'|'restricted'|'forbidden'
 *   clearCache()
 *
 * Requires: js/product-categories.js (for PRODUCT_BRAIN_CATEGORIES local matching).
 * Load order: product-categories.js → product-classifier.js → inline scripts.
 */

(function (global) {

    var CLASSIFY_ENDPOINT = '/api/ai/classify';

    var _cache    = {};
    var _inflight = {};

    // ── Text normalisation ────────────────────────────────────────────────────

    function _norm(str) {
        return (str || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function _escHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── Local matching against PRODUCT_BRAIN_CATEGORIES ───────────────────────

    function _localMatch(productName) {
        var cats = (global.PRODUCT_BRAIN_CATEGORIES || []);
        if (!cats.length) return null;

        var norm  = _norm(productName);
        if (!norm || norm.length < 2) return null;
        var words = norm.split(' ').filter(function (w) { return w.length >= 3; });

        var best      = null;
        var bestScore = 0;

        cats.forEach(function (cat) {
            if (cat.id === 'unknown_manual_review') return;
            var score = 0;

            var allTerms = (cat.aliases || []).concat(cat.misspellings || []);
            for (var i = 0; i < allTerms.length; i++) {
                var a = _norm(allTerms[i]);
                if (!a) continue;
                if (norm === a) {
                    score = Math.max(score, 130);
                } else if (a.length >= 5 && norm.startsWith(a + ' ')) {
                    score = Math.max(score, 125);
                } else if (a.length >= 4 && (' ' + norm + ' ').indexOf(' ' + a + ' ') !== -1) {
                    score = Math.max(score, 110);
                } else if (a.length >= 4 && norm.indexOf(a) !== -1) {
                    score = Math.max(score, 90);
                }
            }

            if (score < 90) {
                (cat.keywords || []).forEach(function (kw) {
                    var k = _norm(kw);
                    if (!k) return;
                    if (k.length >= 5 && norm.indexOf(k) !== -1) score = Math.max(score, 75);
                    else if (k.length >= 3 && words.some(function (w) { return w === k; })) score = Math.max(score, 65);
                });
            }

            if (score > bestScore) { bestScore = score; best = cat; }
        });

        if (!best || bestScore < 60) return null;
        var conf = bestScore >= 120 ? 'high' : bestScore >= 80 ? 'medium' : 'low';
        return _buildResult(best, conf, 'local_keyword');
    }

    // ── Build a unified result from a brain category object ───────────────────

    function _buildResult(cat, confidence, source) {
        return {
            brainCategoryId:          cat.id          || 'unknown_manual_review',
            legacyCode:               cat.code        || '',
            displayName:              cat.displayName || '',
            categoryGroup:            cat.categoryGroup || '',
            confidence:               confidence,
            source:                   source,
            automaticEstimateAllowed: cat.automaticEstimateAllowed !== false,
            manualReviewRequired:     !!cat.manualReviewRequired,
            regulatedProduct:         !!cat.regulatedProduct,
            restrictedProduct:        !!cat.restrictedProduct,
            forbiddenProduct:         !!cat.forbiddenProduct,
            riskFlags:                cat.riskFlags        || [],
            customerMessage:          cat.customerMessage  || '',
            adminNotes:               cat.adminNotes       || '',
            actionForCustomer:        cat.actionForCustomer || '',
            actionForAdmin:           cat.actionForAdmin   || '',
            estimatedRange:           cat.estimatedRange   || '',
        };
    }

    // ── Unknown/manual-review fallback ────────────────────────────────────────

    function _unknownResult(source) {
        var cats  = (global.PRODUCT_BRAIN_CATEGORIES || []);
        var uCat  = null;
        for (var i = 0; i < cats.length; i++) {
            if (cats[i].id === 'unknown_manual_review') { uCat = cats[i]; break; }
        }
        if (uCat) return _buildResult(uCat, 'low', source || 'no_match');
        return {
            brainCategoryId: 'unknown_manual_review', legacyCode: 'otros',
            displayName: 'Revisión manual requerida', categoryGroup: '',
            confidence: 'low', source: source || 'no_match',
            automaticEstimateAllowed: false, manualReviewRequired: true,
            regulatedProduct: false, restrictedProduct: false, forbiddenProduct: false,
            riskFlags: [], customerMessage: '', adminNotes: '', actionForCustomer: '',
            actionForAdmin: '', estimatedRange: '',
        };
    }

    // ── Server API call ───────────────────────────────────────────────────────

    function _apiClassify(productName) {
        var key = _norm(productName);
        if (_cache[key]) return Promise.resolve(_cache[key]);
        if (_inflight[key]) return _inflight[key];

        var ctrl  = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 9000) : null;

        var p = fetch(CLASSIFY_ENDPOINT, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ product_name: productName }),
            signal:  ctrl ? ctrl.signal : undefined,
        })
        .then(function (resp) {
            if (timer) clearTimeout(timer);
            return resp.json();
        })
        .then(function (result) {
            delete _inflight[key];
            if (result && result.brainCategoryId) {
                _cache[key] = result;
                return result;
            }
            return null;
        })
        .catch(function () {
            if (timer) clearTimeout(timer);
            delete _inflight[key];
            return null;
        });

        _inflight[key] = p;
        return p;
    }

    // ── Public: classify / analyze ────────────────────────────────────────────

    /**
     * Classify a product name. Returns a guaranteed non-null result (falls back
     * to unknown_manual_review on total failure). Never rejects.
     *
     * @param {string} productName
     * @param {object} [opts]
     *   opts.localOnly  {boolean} — skip API, use local match only
     *   opts.noFallback {boolean} — return null instead of unknown_manual_review
     * @returns {Promise<object>}
     */
    function classify(productName, opts) {
        opts = opts || {};
        var name = (productName || '').trim();
        if (!name || name.length < 2) {
            return Promise.resolve(opts.noFallback ? null : _unknownResult('empty_input'));
        }

        var local = _localMatch(name);

        if (opts.localOnly) return Promise.resolve(local || (opts.noFallback ? null : _unknownResult('local_no_match')));
        if (local && local.confidence === 'high') return Promise.resolve(local);

        return _apiClassify(name).then(function (api) {
            if (api && api.brainCategoryId && api.brainCategoryId !== 'unknown_manual_review') return api;
            if (local) return local;
            if (api && api.brainCategoryId) return api;
            return opts.noFallback ? null : _unknownResult('no_match');
        }).catch(function () {
            return local || (opts.noFallback ? null : _unknownResult('api_error'));
        });
    }

    /** Alias for classify — preferred entry point for new code. */
    function analyze(productName, opts) { return classify(productName, opts); }

    // ── Public: analyzeUrlResult ──────────────────────────────────────────────

    /**
     * Normalize a CRBOXAIExtractor result through the brain classifier.
     * Reads `fields.product_name.value` (or top-level `product_name`).
     * Returns a classification Promise, or resolves to null if no product name found.
     *
     * @param {object} extractorResult — from CRBOXAIExtractor.getLastResult()
     * @returns {Promise<object|null>}
     */
    function analyzeUrlResult(extractorResult) {
        if (!extractorResult) return Promise.resolve(null);
        var name = '';
        try {
            if (extractorResult.fields && extractorResult.fields.product_name) {
                name = extractorResult.fields.product_name.value || '';
            } else if (typeof extractorResult.product_name === 'string') {
                name = extractorResult.product_name;
            }
        } catch (e) {}
        if (!name || name.length < 2) return Promise.resolve(null);
        return classify(name);
    }

    // ── Public: validateGeminiCategory ───────────────────────────────────────

    /**
     * Validate a legacy category code (e.g. "celulares") or brain id (e.g.
     * "phones_smartphones") against the brain. Returns a result object if found,
     * or null if the code is not in the brain.
     *
     * @param {string} categoryCode  — legacy select value or brainCategoryId
     * @returns {object|null}
     */
    function validateGeminiCategory(categoryCode) {
        if (!categoryCode) return null;
        var cats = (global.PRODUCT_BRAIN_CATEGORIES || []);
        for (var i = 0; i < cats.length; i++) {
            var c = cats[i];
            if (c.code === categoryCode || c.id === categoryCode) {
                return _buildResult(c, 'high', 'validated');
            }
        }
        return null;
    }

    // ── Public: shouldAllowAutomaticEstimate ──────────────────────────────────

    /**
     * Returns true only if the brain category says automatic estimates are
     * allowed AND no manual review is required.
     */
    function shouldAllowAutomaticEstimate(result) {
        if (!result) return false;
        return !!(result.automaticEstimateAllowed && !result.manualReviewRequired);
    }

    // ── Public: getMissingFields ──────────────────────────────────────────────

    /**
     * Returns an array of field names that require manual attention.
     * Used to drive the admin review checklist.
     */
    function getMissingFields(result) {
        var fields = [];
        if (!result) return fields;
        if (result.manualReviewRequired) fields.push('category');
        if (result.regulatedProduct)     fields.push('compliance_docs');
        if (result.restrictedProduct)    fields.push('permits');
        if (result.forbiddenProduct)     fields.push('import_forbidden');
        return fields;
    }

    // ── Risk helpers ──────────────────────────────────────────────────────────

    function hasRisk(result) {
        if (!result) return false;
        return !!(result.forbiddenProduct || result.restrictedProduct ||
                  result.regulatedProduct || (result.riskFlags && result.riskFlags.length));
    }

    function riskLevel(result) {
        if (!result) return 'none';
        if (result.forbiddenProduct)  return 'forbidden';
        if (result.restrictedProduct) return 'restricted';
        if (result.regulatedProduct || (result.riskFlags && result.riskFlags.length)) return 'regulated';
        return 'none';
    }

    // ── Public: showComplianceNotice ──────────────────────────────────────────

    /**
     * Render a risk/compliance notice inside `container`. Replaces any
     * existing notice. Returns the notice element or null (no risk).
     *
     * @param {HTMLElement} container
     * @param {object}      result    — classify result
     * @returns {HTMLElement|null}
     */
    function showComplianceNotice(container, result) {
        if (!container) return null;
        var existing = container.querySelector('.pc-compliance-notice');
        if (existing) existing.parentNode.removeChild(existing);
        if (!result || !hasRisk(result)) return null;

        var level = riskLevel(result);
        var cfg = {
            forbidden:  { bg: '#fef2f2', border: '#fca5a5', icon: 'fas fa-ban',                   iconColor: '#dc2626', title: 'Este producto no puede importarse a Costa Rica' },
            restricted: { bg: '#fffbeb', border: '#fcd34d', icon: 'fas fa-exclamation-triangle',   iconColor: '#d97706', title: 'Este producto requiere gestión especial' },
            regulated:  { bg: '#eff6ff', border: '#93c5fd', icon: 'fas fa-info-circle',            iconColor: '#2563eb', title: 'Este producto puede requerir revisión' },
        };
        var c = cfg[level] || cfg.regulated;
        var el = document.createElement('div');
        el.className = 'pc-compliance-notice';
        el.style.cssText = [
            'margin-top:.75rem;padding:.75rem 1rem;border-radius:.5rem;',
            'border:1px solid ' + c.border + ';background:' + c.bg + ';',
            'display:flex;gap:.625rem;align-items:flex-start;',
            'font-size:.82rem;line-height:1.4;',
        ].join('');
        var msg = result.customerMessage || c.title;
        el.innerHTML = '<i class="' + c.icon + '" style="color:' + c.iconColor + ';margin-top:.1rem;flex-shrink:0;font-size:.85rem;"></i>'
            + '<span>' + _escHtml(msg) + '</span>';
        container.appendChild(el);
        return el;
    }

    function removeComplianceNotice(container) {
        if (!container) return;
        var el = container.querySelector('.pc-compliance-notice');
        if (el) el.parentNode.removeChild(el);
    }

    // ── Public: buildCustomerClassificationView ───────────────────────────────

    /**
     * Build a customer-facing classification view element.
     * Shows estimated tariff range and any compliance notice.
     *
     * @param {object} result — classify result
     * @returns {HTMLElement|null}
     */
    function buildCustomerClassificationView(result) {
        if (!result) return null;
        var wrap = document.createElement('div');
        wrap.className = 'pc-customer-view';

        if (result.displayName && result.displayName !== 'Revisión manual requerida') {
            var badge = document.createElement('div');
            badge.className = 'pc-category-badge';
            badge.style.cssText = 'display:inline-flex;align-items:center;gap:.35rem;font-size:.78rem;color:#6b7280;margin-bottom:.35rem;';
            badge.innerHTML = '<i class="fas fa-tag" style="color:#f97316;font-size:.72rem;"></i>'
                + '<span>Categoría: <strong style="color:#374151;">' + _escHtml(result.displayName) + '</strong></span>';
            if (result.estimatedRange) {
                badge.innerHTML += ' &nbsp;·&nbsp; <span>Arancel est.: <strong style="color:#374151;">'
                    + _escHtml(result.estimatedRange) + '</strong></span>';
            }
            wrap.appendChild(badge);
        }

        if (hasRisk(result)) showComplianceNotice(wrap, result);

        if (result.actionForCustomer) {
            var action = document.createElement('p');
            action.style.cssText = 'font-size:.78rem;color:#6b7280;margin-top:.35rem;';
            action.textContent = result.actionForCustomer;
            wrap.appendChild(action);
        }

        return wrap.children.length ? wrap : null;
    }

    // ── Public: buildAdminClassificationView ──────────────────────────────────

    /**
     * Build an admin-facing classification panel.
     * Shows brain category id, risk flags, adminNotes, actionForAdmin,
     * manualReviewRequired, missingFields.
     *
     * @param {object} result — classify result
     * @returns {HTMLElement|null}
     */
    function buildAdminClassificationView(result) {
        if (!result) return null;
        var wrap = document.createElement('div');
        wrap.className = 'pc-admin-view';
        wrap.style.cssText = 'font-size:.8rem;border:1px solid #e5e7eb;border-radius:.5rem;padding:.75rem 1rem;background:#f9fafb;margin-top:.75rem;';

        var header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;gap:.4rem;font-weight:700;color:#374151;margin-bottom:.5rem;font-size:.82rem;';
        header.innerHTML = '<i class="fas fa-robot" style="color:#f97316;font-size:.75rem;"></i> Clasificación Brain';
        wrap.appendChild(header);

        function _row(label, value, highlight) {
            if (!value) return;
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;gap:.5rem;padding:.2rem 0;border-bottom:1px solid #f3f4f6;';
            row.innerHTML = '<span style="min-width:9rem;flex-shrink:0;color:#9ca3af;font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;">'
                + _escHtml(label) + '</span>'
                + '<span style="color:' + (highlight || '#111827') + ';font-weight:500;">' + _escHtml(String(value)) + '</span>';
            wrap.appendChild(row);
        }

        _row('Categoría brain', result.brainCategoryId);
        _row('Código legacy',   result.legacyCode);
        _row('Fuente',          result.source);
        _row('Confianza',       result.confidence);

        if (result.manualReviewRequired) _row('Revisión manual', 'Requerida', '#d97706');
        if (result.regulatedProduct)     _row('Producto regulado', 'Sí', '#2563eb');
        if (result.restrictedProduct)    _row('Producto restringido', 'Sí', '#d97706');
        if (result.forbiddenProduct)     _row('Prohibido', 'Sí', '#dc2626');

        if (result.riskFlags && result.riskFlags.length) {
            _row('Flags de riesgo', result.riskFlags.join(', '), '#dc2626');
        }
        if (result.adminNotes)      _row('Notas admin',    result.adminNotes);
        if (result.actionForAdmin)  _row('Acción admin',   result.actionForAdmin);
        if (result.estimatedRange)  _row('Arancel est.',   result.estimatedRange);

        return wrap;
    }

    // ── Suggestion bar helpers ────────────────────────────────────────────────

    function _clearSuggestionBar(container) {
        if (!container) return;
        var bar = container.querySelector('.pc-suggestion-bar');
        if (bar) bar.parentNode.removeChild(bar);
    }

    function _renderSuggestionBar(result, categoryEl, barContainer, noticeContainer, onApplied) {
        if (!result || !result.legacyCode || !barContainer) return;

        var code   = result.legacyCode;
        var hasOpt = !!(categoryEl && categoryEl.querySelector('option[value="' + code + '"]'));
        if (!hasOpt) return;

        var bar = document.createElement('div');
        bar.className = 'pc-suggestion-bar';
        bar.style.cssText = [
            'margin-top:.5rem;display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;',
            'background:#fff7ed;border:1px solid #fed7aa;border-radius:.5rem;',
            'padding:.45rem .75rem;font-size:.8rem;color:#92400e;',
        ].join('');

        var icon = document.createElement('i');
        icon.className = 'fas fa-wand-magic-sparkles';
        icon.style.cssText = 'color:#f97316;font-size:.75rem;flex-shrink:0;';

        var label = document.createElement('span');
        label.style.cssText = 'flex:1;min-width:0;';
        label.innerHTML = 'Categoría sugerida: <strong>' + _escHtml(result.displayName) + '</strong>';

        var btnUse = document.createElement('button');
        btnUse.type = 'button';
        btnUse.textContent = 'Usar esta';
        btnUse.style.cssText = 'background:#f97316;color:#fff;border:none;border-radius:.35rem;font-size:.75rem;font-weight:700;padding:.25rem .6rem;cursor:pointer;white-space:nowrap;';

        var btnIgnore = document.createElement('button');
        btnIgnore.type = 'button';
        btnIgnore.textContent = 'Ignorar';
        btnIgnore.style.cssText = 'background:none;border:none;color:#a16207;font-size:.75rem;cursor:pointer;text-decoration:underline;padding:0;white-space:nowrap;';

        btnUse.addEventListener('click', function () {
            if (categoryEl) {
                categoryEl.value = code;
                categoryEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
            _clearSuggestionBar(barContainer);
            if (noticeContainer) showComplianceNotice(noticeContainer, result);
            if (typeof onApplied === 'function') onApplied(result);
        });

        btnIgnore.addEventListener('click', function () {
            _clearSuggestionBar(barContainer);
            if (noticeContainer) removeComplianceNotice(noticeContainer);
        });

        bar.appendChild(icon);
        bar.appendChild(label);
        bar.appendChild(btnUse);
        bar.appendChild(btnIgnore);
        barContainer.appendChild(bar);
    }

    // ── Public: suggest ───────────────────────────────────────────────────────

    /**
     * Run classify and inject a suggestion bar into `barContainer`.
     * Skips if `categoryEl` already has a value (still shows compliance notice).
     *
     * @param {string}      productName
     * @param {HTMLElement} categoryEl      — the <select> to apply the category to
     * @param {HTMLElement} barContainer    — element to inject the suggestion bar into
     * @param {HTMLElement} [noticeContainer] — element to show compliance notice
     * @param {function}    [onApplied]     — callback(result) when user accepts
     */
    function suggest(productName, categoryEl, barContainer, noticeContainer, onApplied) {
        if (!productName || !barContainer) return;
        _clearSuggestionBar(barContainer);
        if (noticeContainer) removeComplianceNotice(noticeContainer);

        classify(productName, { noFallback: true }).then(function (result) {
            if (!result || result.brainCategoryId === 'unknown_manual_review') return;

            if (categoryEl && categoryEl.value) {
                if (noticeContainer && hasRisk(result)) showComplianceNotice(noticeContainer, result);
                return;
            }

            if (categoryEl) _renderSuggestionBar(result, categoryEl, barContainer, noticeContainer, onApplied);
            if (noticeContainer && hasRisk(result)) showComplianceNotice(noticeContainer, result);
        });
    }

    // ── Public: applyToProductCard ────────────────────────────────────────────

    /**
     * Apply a classification result to a product card's UI elements.
     * If no category is set, shows a suggestion bar. Always shows compliance notice.
     *
     * @param {object} opts
     *   opts.categoryEl      {HTMLElement}  — the <select>
     *   opts.barContainer    {HTMLElement}  — for suggestion bar
     *   opts.noticeContainer {HTMLElement}  — for compliance notice
     *   opts.onApplied       {function}     — callback(result) when user accepts
     * @param {object} result — classify result
     */
    function applyToProductCard(opts, result) {
        opts = opts || {};
        if (!result) return;

        var catEl     = opts.categoryEl;
        var barEl     = opts.barContainer;
        var noticeEl  = opts.noticeContainer;
        var onApplied = opts.onApplied;

        if (result.brainCategoryId === 'unknown_manual_review') {
            if (noticeEl && result.customerMessage) showComplianceNotice(noticeEl, result);
            return;
        }

        if (catEl && !catEl.value && barEl) {
            _renderSuggestionBar(result, catEl, barEl, noticeEl, onApplied);
        }
        if (noticeEl && hasRisk(result)) {
            showComplianceNotice(noticeEl, result);
        }
    }

    // ── Cache ─────────────────────────────────────────────────────────────────

    function clearCache() { _cache = {}; }

    // ── Export ────────────────────────────────────────────────────────────────

    global.CRBOXProductClassifier = {
        classify:                      classify,
        analyze:                       analyze,
        analyzeUrlResult:              analyzeUrlResult,
        validateGeminiCategory:        validateGeminiCategory,
        suggest:                       suggest,
        applyToProductCard:            applyToProductCard,
        buildCustomerClassificationView: buildCustomerClassificationView,
        buildAdminClassificationView:  buildAdminClassificationView,
        showComplianceNotice:          showComplianceNotice,
        removeComplianceNotice:        removeComplianceNotice,
        shouldAllowAutomaticEstimate:  shouldAllowAutomaticEstimate,
        getMissingFields:              getMissingFields,
        hasRisk:                       hasRisk,
        riskLevel:                     riskLevel,
        clearCache:                    clearCache,
    };

})(window);
