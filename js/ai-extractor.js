'use strict';

(function (global) {

    var EXTRACT_ENDPOINT = '/api/ai/extract';

    var CONFIDENCE_HIGH   = 0.90;
    var CONFIDENCE_MED    = 0.70;

    function _badge(type, label) {
        var b = document.createElement('span');
        b.className = type === 'verify' ? 'ai-badge ai-badge-verify' : 'ai-badge ai-badge-confirm';
        b.setAttribute('aria-label', label);
        b.textContent = type === 'verify' ? 'Verificar' : 'Confirmar';
        return b;
    }

    function _removeBadge(el) {
        var container = el.parentNode;
        if (!container) return;
        var existing = container.querySelectorAll('.ai-badge');
        existing.forEach(function (b) { b.parentNode.removeChild(b); });
    }

    function _attachBadge(el, type) {
        _removeBadge(el);
        var label = type === 'verify'
            ? 'Dato sugerido por IA — verifica que sea correcto'
            : 'Dato requiere confirmación — toca para confirmar';
        var badge = _badge(type, label);
        el.parentNode.insertBefore(badge, el.nextSibling);
    }

    function _applyField(el, fieldResult, opts) {
        if (!el || !fieldResult) return false;

        var provenance  = fieldResult.provenance;
        var confidence  = fieldResult.confidence || 0;
        var value       = fieldResult.value;

        if (provenance === 'missing' || value === null || value === undefined) return false;

        var shouldFill  = confidence >= CONFIDENCE_MED;
        var badgeType   = null;

        if (provenance === 'needs_confirmation') {
            badgeType = 'confirm';
            shouldFill = true;
        } else if (provenance === 'inferred') {
            badgeType = 'verify';
        } else if (provenance === 'extracted') {
            if (confidence >= CONFIDENCE_HIGH) {
                badgeType = 'verify';
            } else if (confidence >= CONFIDENCE_MED) {
                badgeType = 'confirm';
            } else {
                shouldFill = false;
            }
        }

        if (!shouldFill) {
            if (value !== null) {
                var hint = String(value);
                if (opts && opts.prefix) hint = opts.prefix + hint;
                el.placeholder = hint;
            }
            return false;
        }

        if (opts && opts.isSelect) {
            var strVal = String(value);
            var found  = false;
            for (var i = 0; i < el.options.length; i++) {
                if (el.options[i].value === strVal) {
                    el.value = strVal;
                    found = true;
                    break;
                }
            }
            if (!found) return false;
            if (badgeType) _attachBadge(el, badgeType);
            el.dataset.aiSuggested = '1';
            return true;
        }

        var displayVal = String(value);
        if (opts && opts.prefix) displayVal = opts.prefix + displayVal;
        el.value = displayVal;
        if (badgeType) _attachBadge(el, badgeType);
        el.dataset.aiSuggested = '1';

        if (confidence < CONFIDENCE_HIGH) {
            el.style.color = '#9ca3af';
            el.addEventListener('input', function onInput() {
                el.style.color = '';
                el.removeEventListener('input', onInput);
            });
        }

        return true;
    }

    function _showBanner(container, type, message) {
        var existing = container.querySelector('.ai-extract-banner');
        if (existing) existing.parentNode.removeChild(existing);

        var banner = document.createElement('div');
        banner.className = 'ai-extract-banner ai-banner-' + type;

        var icon = document.createElement('i');
        if (type === 'loading') {
            icon.className = 'fas fa-circle-notch fa-spin';
        } else if (type === 'success') {
            icon.className = 'fas fa-magic';
        } else if (type === 'partial') {
            icon.className = 'fas fa-exclamation-triangle';
        } else {
            icon.className = 'fas fa-times-circle';
        }

        var text = document.createElement('span');
        text.textContent = message;

        banner.appendChild(icon);
        banner.appendChild(text);
        container.insertBefore(banner, container.firstChild);

        return banner;
    }

    function _removeBanner(container) {
        var b = container.querySelector('.ai-extract-banner');
        if (b) b.parentNode.removeChild(b);
    }

    function _clearAiState(fields) {
        fields.forEach(function (el) {
            if (!el) return;
            el.removeAttribute('data-ai-suggested');
            el.style.color = '';
            _removeBadge(el);
        });
    }

    function _showConfirmCheckbox(checkboxContainer, onRequiredChange) {
        checkboxContainer.style.display = '';
        var chk = checkboxContainer.querySelector('input[type=checkbox]');
        if (chk) {
            chk.checked = false;
            chk.addEventListener('change', onRequiredChange);
        }
    }

    function _hideConfirmCheckbox(checkboxContainer) {
        checkboxContainer.style.display = 'none';
        var chk = checkboxContainer.querySelector('input[type=checkbox]');
        if (chk) chk.checked = true;
    }

    async function runExtraction(config) {
        var url            = config.url;
        var bannerTarget   = config.bannerTarget;
        var fName          = config.fName;
        var fValue         = config.fValue;
        var fCategory      = config.fCategory;
        var confirmWrapper = config.confirmWrapper;
        var onRequiredChange = config.onRequiredChange || function () {};

        _showBanner(bannerTarget, 'loading', 'Analizando el enlace del producto…');
        _clearAiState([fName, fValue, fCategory]);

        var result;
        try {
            var resp = await fetch(EXTRACT_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url }),
            });
            result = await resp.json();
        } catch (e) {
            _removeBanner(bannerTarget);
            return;
        }

        if (!result || result.page_readable === false) {
            if (result && result.error === 'rate_limited') {
                _showBanner(bannerTarget, 'error', result.message || 'Límite de consultas alcanzado.');
            } else {
                _showBanner(bannerTarget, 'error',
                    'No pudimos leer esta página. Ingresa los datos manualmente.');
            }
            return;
        }

        var fields = result.fields || {};
        var filledCount = 0;

        filledCount += _applyField(fName,  fields.product_name,  {}) ? 1 : 0;
        filledCount += _applyField(fValue, fields.declared_value_usd,
            { prefix: '' }) ? 1 : 0;
        filledCount += _applyField(fCategory, fields.category,
            { isSelect: true }) ? 1 : 0;

        if (filledCount === 0) {
            _showBanner(bannerTarget, 'partial',
                'No pudimos extraer datos de esta página. Ingresa los datos manualmente.');
            return;
        }

        var partial = result.partial || filledCount < 3;
        if (partial) {
            _showBanner(bannerTarget, 'partial',
                'Encontramos algunos datos. Revisa y completa los que faltan.');
        } else {
            _showBanner(bannerTarget, 'success',
                'Datos extraídos automáticamente. Por favor verifica antes de enviar.');
        }

        if (confirmWrapper) {
            _showConfirmCheckbox(confirmWrapper, onRequiredChange);
        }
    }

    function resetExtraction(config) {
        var bannerTarget   = config.bannerTarget;
        var fName          = config.fName;
        var fValue         = config.fValue;
        var fCategory      = config.fCategory;
        var confirmWrapper = config.confirmWrapper;

        _removeBanner(bannerTarget);
        _clearAiState([fName, fValue, fCategory]);

        if (confirmWrapper) {
            _hideConfirmCheckbox(confirmWrapper);
        }
    }

    global.CRBOXAIExtractor = {
        run:   runExtraction,
        reset: resetExtraction,
    };

})(window);
