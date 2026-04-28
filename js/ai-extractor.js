'use strict';

(function (global) {

    var EXTRACT_ENDPOINT = '/api/ai/extract';

    var CONFIDENCE_HIGH = 0.90;
    var CONFIDENCE_MED  = 0.70;

    function _removeBadgesFromEl(el) {
        if (!el || !el.parentNode) return;
        var existing = el.parentNode.querySelectorAll('.ai-badge');
        existing.forEach(function (b) { b.parentNode.removeChild(b); });
    }

    function _attachBadge(el, type) {
        _removeBadgesFromEl(el);
        var badge = document.createElement('span');
        badge.className = type === 'verify' ? 'ai-badge ai-badge-verify' : 'ai-badge ai-badge-confirm';
        badge.textContent = type === 'verify' ? 'Verificar' : 'Confirmar';
        el.parentNode.insertBefore(badge, el.nextSibling);
    }

    function _showBanner(container, type, message) {
        if (!container || !container.querySelector) return null;
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
        if (!container || !container.querySelector) return;
        var b = container.querySelector('.ai-extract-banner');
        if (b) b.parentNode.removeChild(b);
    }

    function clearExtractionBadges(formFields) {
        var fields = formFields || {};
        [fields.fName, fields.fValue, fields.fCategory].forEach(function (el) {
            if (!el) return;
            _removeBadgesFromEl(el);
            el.removeAttribute('data-ai-suggested');
            el.removeAttribute('data-ai-field');
            el.style.color = '';
        });
    }

    function _applyProductName(el, fieldResult) {
        if (!el || !fieldResult) return false;
        var provenance = fieldResult.provenance;
        var confidence = fieldResult.confidence || 0;
        var value      = fieldResult.value;

        if (provenance === 'missing' || value === null || value === undefined) return false;

        el.value = String(value);
        el.dataset.aiSuggested = '1';
        el.dataset.aiField = 'product_name';

        var needsConfirm = (provenance === 'needs_confirmation' || confidence < CONFIDENCE_MED);
        _attachBadge(el, needsConfirm ? 'confirm' : 'verify');

        if (needsConfirm || confidence < CONFIDENCE_HIGH) {
            el.style.color = '#9ca3af';
            el.addEventListener('input', function onInput() {
                el.style.color = '';
                el.removeEventListener('input', onInput);
            });
        }
        return true;
    }

    function _applyDeclaredValue(el, fieldResult) {
        if (!el || !fieldResult) return false;
        var provenance = fieldResult.provenance;
        var confidence = fieldResult.confidence || 0;
        var value      = fieldResult.value;

        if (provenance === 'missing' || value === null || value === undefined) return false;
        if (confidence < CONFIDENCE_MED) return false;

        el.value = String(value);
        el.dataset.aiSuggested = '1';
        el.dataset.aiField = 'declared_value';
        _attachBadge(el, 'confirm');
        el.style.color = '#9ca3af';
        el.addEventListener('input', function onInput() {
            el.style.color = '';
            el.removeEventListener('input', onInput);
        });
        return true;
    }

    function _applyCategory(el, fieldResult) {
        if (!el || !fieldResult) return false;
        var provenance = fieldResult.provenance;
        var confidence = fieldResult.confidence || 0;
        var value      = fieldResult.value;

        if (provenance === 'missing' || value === null || value === undefined) return false;
        if (confidence < CONFIDENCE_MED) return false;

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

        el.dataset.aiSuggested = '1';
        el.dataset.aiField = 'category';
        el.dataset.aiConfirmed = '0';
        _attachBadge(el, 'verify');

        el.addEventListener('change', function onCatChange() {
            el.dataset.aiConfirmed = '1';
            _removeBadgesFromEl(el);
            el.removeEventListener('change', onCatChange);
        });

        return true;
    }

    function _showConfirmCheckbox(wrapper) {
        if (!wrapper) return;
        wrapper.style.display = 'flex';
        var chk = wrapper.querySelector('input[type=checkbox]');
        if (chk) chk.checked = false;
    }

    function _hideConfirmCheckbox(wrapper) {
        if (!wrapper) return;
        wrapper.style.display = 'none';
        var chk = wrapper.querySelector('input[type=checkbox]');
        if (chk) chk.checked = true;
    }

    function runExtraction(url, formFields) {
        var bannerTarget   = formFields.bannerTarget;
        var fName          = formFields.fName;
        var fValue         = formFields.fValue;
        var fCategory      = formFields.fCategory;
        var confirmWrapper = formFields.confirmWrapper;

        _showBanner(bannerTarget, 'loading', 'Analizando el enlace del producto…');
        clearExtractionBadges(formFields);

        return fetch(EXTRACT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url }),
        }).then(function (resp) {
            return resp.json();
        }).then(function (result) {
            if (!result || result.page_readable === false) {
                var msg;
                if (result && result.error === 'rate_limit') {
                    msg = 'Límite de consultas alcanzado. Inténtalo más tarde.';
                } else {
                    msg = 'No pudimos leer esta página automáticamente. Ingresa los datos del producto manualmente.';
                }
                _showBanner(bannerTarget, 'error', msg);
                document.dispatchEvent(new CustomEvent('ai:extraction-complete', {
                    detail: { url: url, result: result, filledCount: 0 }
                }));
                return result;
            }

            var fields = result.fields || {};
            var filledCount = 0;

            filledCount += _applyProductName(fName, fields.product_name) ? 1 : 0;
            filledCount += _applyDeclaredValue(fValue, fields.declared_value_usd) ? 1 : 0;
            filledCount += _applyCategory(fCategory, fields.category) ? 1 : 0;

            if (filledCount === 0) {
                _showBanner(bannerTarget, 'error',
                    'No pudimos leer esta página automáticamente. Ingresa los datos del producto manualmente.');
                document.dispatchEvent(new CustomEvent('ai:extraction-complete', {
                    detail: { url: url, result: result, filledCount: 0 }
                }));
                return result;
            }

            var partial = result.partial || filledCount < 3;
            if (partial) {
                _showBanner(bannerTarget, 'partial',
                    'Revisamos la página y completamos los datos que encontramos. Verifica que todo sea correcto antes de enviar.');
            } else {
                _showBanner(bannerTarget, 'success',
                    'Datos extraídos automáticamente. Verifica que todo sea correcto antes de enviar.');
            }

            _showConfirmCheckbox(confirmWrapper);

            document.dispatchEvent(new CustomEvent('ai:extraction-complete', {
                detail: { url: url, result: result, filledCount: filledCount }
            }));
            return result;
        }).catch(function (err) {
            _removeBanner(bannerTarget);
            document.dispatchEvent(new CustomEvent('ai:extraction-complete', {
                detail: { url: url, result: null, filledCount: 0 }
            }));
            return null;
        });
    }

    function resetExtraction(formFields) {
        var bannerTarget   = formFields.bannerTarget;
        var confirmWrapper = formFields.confirmWrapper;

        _removeBanner(bannerTarget);
        clearExtractionBadges(formFields);
        _hideConfirmCheckbox(confirmWrapper);
    }

    global.CRBOXAIExtractor = {
        runExtraction:        runExtraction,
        clearExtractionBadges: clearExtractionBadges,
        resetExtraction:      resetExtraction,
        run:                  runExtraction,
        reset:                resetExtraction,
    };

})(window);
