'use strict';

(function (global) {

    var EXTRACT_ENDPOINT  = '/api/ai/extract';
    var CONFIDENCE_HIGH   = 0.90;   // amber Verificar, no action needed
    var CONFIDENCE_MED    = 0.70;   // amber/red Confirmar, action required

    // ── Label badge helpers ────────────────────────────────────────────────

    function _findLabel(el) {
        if (!el || !el.id) return null;
        return document.querySelector('label[for="' + el.id + '"]');
    }

    function _removeBadgesFromLabel(labelEl) {
        if (!labelEl) return;
        labelEl.querySelectorAll('.ai-badge').forEach(function (b) {
            b.parentNode.removeChild(b);
        });
    }

    function _attachBadge(el, type) {
        var labelEl = _findLabel(el);
        if (!labelEl) return;
        _removeBadgesFromLabel(labelEl);
        var badge = document.createElement('span');
        badge.className = type === 'verify'
            ? 'ai-badge ai-badge-verify'
            : 'ai-badge ai-badge-confirm';
        badge.textContent = type === 'verify' ? 'Verificar' : 'Confirmar';
        labelEl.appendChild(badge);
    }

    function _removeBadge(el) {
        _removeBadgesFromLabel(_findLabel(el));
    }

    // ── Banner helpers ─────────────────────────────────────────────────────

    function _showBanner(container, type, message) {
        if (!container || !container.querySelector) return null;
        var existing = container.querySelector('.ai-extract-banner');
        if (existing) existing.parentNode.removeChild(existing);

        var banner = document.createElement('div');
        banner.className = 'ai-extract-banner ai-banner-' + type;

        var icon = document.createElement('i');
        icon.className = (type === 'loading')  ? 'fas fa-circle-notch fa-spin' :
                         (type === 'success')  ? 'fas fa-magic' :
                         (type === 'partial')  ? 'fas fa-exclamation-triangle' :
                         (type === 'neutral')  ? 'fas fa-info-circle' :
                                                 'fas fa-times-circle';

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

    // ── Field-level confirm tracking ────────────────────────────────────────
    // Each field that gets a red "Confirmar" badge is added here.
    // The caller calls _allConfirmed() before submit.
    // fieldId -> confirmed boolean

    function _makeConfirmTracker() {
        var state = {};
        return {
            require: function (el) {
                if (!el || !el.id) return;
                state[el.id] = false;
                el.addEventListener('click', function _onConfirmClick() {
                    state[el.id] = true;
                    _removeBadge(el);
                    el.style.color = '';
                    el.removeEventListener('click', _onConfirmClick);
                    if (el.tagName === 'SELECT') {
                        el.addEventListener('change', function _onCatChange() {
                            state[el.id] = true;
                            el.removeEventListener('change', _onCatChange);
                        });
                    }
                });
                if (el.tagName === 'SELECT') {
                    el.addEventListener('change', function _onCatChange() {
                        state[el.id] = true;
                        _removeBadge(el);
                        el.removeEventListener('change', _onCatChange);
                    });
                }
            },
            allConfirmed: function () {
                return Object.keys(state).every(function (k) { return state[k]; });
            },
            unconfirmedIds: function () {
                return Object.keys(state).filter(function (k) { return !state[k]; });
            },
            clear: function () { state = {}; },
        };
    }

    // Module-level tracker shared across extractions
    var _confirmTracker = _makeConfirmTracker();

    // ── Last extraction result (for submission snapshot) ─────────────────
    var _lastExtractionResult = null;

    // ── Public: clearExtractionBadges ─────────────────────────────────────

    function clearExtractionBadges(formFields) {
        var fields = formFields || {};
        [fields.fName, fields.fValue, fields.fCategory, fields.fWeight,
         fields.fLength, fields.fWidth, fields.fHeight].forEach(function (el) {
            if (!el) return;
            _removeBadge(el);
            delete el.dataset.aiSuggested;
            delete el.dataset.aiField;
            delete el.dataset.aiConfirmed;
            el.style.color = '';
        });
        // Remove any physical-data hint notes
        var _anchorEl = fields.fWeight || fields.fLength || null;
        if (_anchorEl) {
            var _container = _anchorEl.parentNode;
            var _limit = 8;
            while (_container && _limit-- > 0) {
                if (_container.classList && _container.classList.contains('mb-0')) break;
                _container = _container.parentNode;
            }
            if (_container && _container.querySelector) {
                var _note = _container.querySelector('.ai-physical-note');
                if (_note) _note.parentNode.removeChild(_note);
            }
        }
        _confirmTracker.clear();
    }

    // ── Field apply helpers ────────────────────────────────────────────────

    function _applyProductName(el, fieldResult) {
        if (!el || !fieldResult) return false;
        var provenance = fieldResult.provenance;
        var confidence = fieldResult.confidence || 0;
        var value      = fieldResult.value;

        if (provenance === 'missing' || value === null || value === undefined) return false;

        el.value = String(value);
        el.dataset.aiSuggested = '1';
        el.dataset.aiField     = 'product_name';

        // Spec 9.2-9.3: <0.70 or needs_confirmation => red Confirmar (require action)
        //                >=0.70 extracted/inferred   => amber Verificar (visual only)
        var needsConfirm = (provenance === 'needs_confirmation' || confidence < CONFIDENCE_MED);

        el.style.color = needsConfirm ? '#9ca3af' : '';
        el.addEventListener('input', function onInput() {
            el.style.color = '';
            el.removeEventListener('input', onInput);
        });

        if (needsConfirm) {
            _attachBadge(el, 'confirm');
            _confirmTracker.require(el);
        } else {
            _attachBadge(el, 'verify');
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
        el.dataset.aiField     = 'declared_value';
        el.style.color = '#9ca3af';
        el.addEventListener('input', function onInput() {
            el.style.color = '';
            el.removeEventListener('input', onInput);
        });
        _attachBadge(el, 'confirm');
        _confirmTracker.require(el);
        return true;
    }

    function _applyCategory(el, fieldResult, categoryMap) {
        if (!el || !fieldResult) return false;
        var provenance = fieldResult.provenance;
        var confidence = fieldResult.confidence || 0;
        var value      = fieldResult.value;

        if (provenance === 'missing' || value === null || value === undefined) return false;

        var strVal = String(value);
        if (categoryMap && categoryMap[strVal]) {
            strVal = categoryMap[strVal];
        }

        var found = false;
        for (var i = 0; i < el.options.length; i++) {
            if (el.options[i].value === strVal) {
                el.value = strVal;
                found = true;
                break;
            }
        }
        if (!found) return false;

        el.dataset.aiSuggested = '1';
        el.dataset.aiField     = 'category';
        el.dataset.aiConfirmed = '0';

        var needsConfirm = (provenance === 'needs_confirmation' || confidence < CONFIDENCE_MED);
        _attachBadge(el, needsConfirm ? 'confirm' : 'verify');

        el.addEventListener('change', function onCatChange() {
            el.dataset.aiConfirmed = '1';
            _removeBadge(el);
            el.removeEventListener('change', onCatChange);
        });
        return true;
    }

    function _applyWeight(el, fieldResult) {
        if (!el || !fieldResult) return false;
        var provenance = fieldResult.provenance;
        var confidence = fieldResult.confidence || 0;
        var value      = fieldResult.value;

        if (provenance === 'missing' || value === null || value === undefined) return false;
        if (confidence < CONFIDENCE_MED) return false;

        el.value = String(parseFloat(value).toFixed(2));
        el.dataset.aiSuggested = '1';
        el.dataset.aiField     = 'weight_kg';
        el.style.color = '#9ca3af';
        el.addEventListener('input', function onInput() {
            el.style.color = '';
            el.removeEventListener('input', onInput);
        });
        _attachBadge(el, 'confirm');
        _confirmTracker.require(el);
        return true;
    }

    function _applyDimensions(elLength, elWidth, elHeight, fieldResult) {
        if (!fieldResult) return false;
        var provenance = fieldResult.provenance;
        var confidence = fieldResult.confidence || 0;
        var value      = fieldResult.value;

        if (provenance === 'missing' || value === null || value === undefined) return false;
        if (confidence < CONFIDENCE_MED) return false;

        // value should be {length, width, height}
        var dims = null;
        if (typeof value === 'object' && !Array.isArray(value)) {
            dims = value;
        }
        if (!dims) return false;

        var filled = false;
        if (elLength && dims.length != null) {
            elLength.value = String(parseFloat(dims.length).toFixed(1));
            elLength.dataset.aiSuggested = '1';
            elLength.dataset.aiField     = 'dimension_length';
            elLength.style.color = '#9ca3af';
            elLength.addEventListener('input', function onInput() {
                elLength.style.color = '';
                elLength.removeEventListener('input', onInput);
            });
            _attachBadge(elLength, 'confirm');
            _confirmTracker.require(elLength);
            filled = true;
        }
        if (elWidth && dims.width != null) {
            elWidth.value = String(parseFloat(dims.width).toFixed(1));
            elWidth.dataset.aiSuggested = '1';
            elWidth.dataset.aiField     = 'dimension_width';
            elWidth.style.color = '#9ca3af';
            elWidth.addEventListener('input', function onInput() {
                elWidth.style.color = '';
                elWidth.removeEventListener('input', onInput);
            });
            _attachBadge(elWidth, 'confirm');
            _confirmTracker.require(elWidth);
            filled = true;
        }
        if (elHeight && dims.height != null) {
            elHeight.value = String(parseFloat(dims.height).toFixed(1));
            elHeight.dataset.aiSuggested = '1';
            elHeight.dataset.aiField     = 'dimension_height';
            elHeight.style.color = '#9ca3af';
            elHeight.addEventListener('input', function onInput() {
                elHeight.style.color = '';
                elHeight.removeEventListener('input', onInput);
            });
            _attachBadge(elHeight, 'confirm');
            _confirmTracker.require(elHeight);
            filled = true;
        }
        return filled;
    }

    // Show a small "from product page — confirm" note beneath the physical data section.
    // Pass convertedFromUS=true when any field was converted from imperial units.
    function _showPhysicalNote(anchorEl, convertedFromUS) {
        if (!anchorEl) return;
        // Walk up to find the mb-0 wrapper that contains all physical fields
        var container = anchorEl.parentNode;
        var limit = 8;
        while (container && limit-- > 0) {
            if (container.classList && container.classList.contains('mb-0')) break;
            container = container.parentNode;
        }
        if (!container || !container.classList || !container.classList.contains('mb-0')) {
            container = anchorEl.parentNode;
        }
        if (container.querySelector && container.querySelector('.ai-physical-note')) return;
        var note = document.createElement('p');
        note.className = 'ai-physical-note';
        note.style.cssText = 'font-size:.74rem;color:#d97706;margin-top:.5rem;line-height:1.4;';
        var text = 'Datos físicos extraídos de la página del producto — confirma antes de enviar.';
        if (convertedFromUS) {
            text += ' <strong>Convertido de unidades americanas (lbs/pulgadas) a kg/cm.</strong>';
        }
        note.innerHTML = '<i class="fas fa-info-circle" style="margin-right:.3rem;"></i>' + text;
        container.appendChild(note);
    }

    // Returns true when the given field result carries a US source unit (lbs, oz, in).
    function _isUSUnit(fieldResult) {
        if (!fieldResult) return false;
        var u = (fieldResult.source_unit || '').toLowerCase();
        return u === 'lbs' || u === 'lb' || u === 'oz' || u === 'in';
    }

    // ── Confirm checkbox helpers ─────────────────────────────────────────

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

    // ── Public: runExtraction ─────────────────────────────────────────────

    function runExtraction(url, formFields) {
        var bannerTarget   = formFields.bannerTarget;
        var fName          = formFields.fName;
        var fValue         = formFields.fValue;
        var fCategory      = formFields.fCategory;
        var fWeight        = formFields.fWeight   || null;
        var fLength        = formFields.fLength   || null;
        var fWidth         = formFields.fWidth    || null;
        var fHeight        = formFields.fHeight   || null;
        var confirmWrapper = formFields.confirmWrapper;
        var categoryMap    = formFields.categoryMap || null;

        _showBanner(bannerTarget, 'loading', 'Analizando el enlace del producto…');
        clearExtractionBadges(formFields);

        return fetch(EXTRACT_ENDPOINT, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ url: url }),
        }).then(function (resp) {
            return resp.json();
        }).then(function (result) {

            // Rate limit — check before page_readable
            if (result && result.error === 'rate_limit') {
                _showBanner(bannerTarget, 'neutral',
                    'Límite de consultas alcanzado. Inténtalo más tarde.');
                document.dispatchEvent(new CustomEvent('ai:extraction-complete', {
                    detail: { url: url, result: result, filledCount: 0, dataSource: null }
                }));
                return result;
            }

            // Unreadable page
            if (!result || result.page_readable === false) {
                _lastExtractionResult = null;
                _showBanner(bannerTarget, 'neutral',
                    'No pudimos leer esta página automáticamente. Ingresa los datos del producto manualmente.');
                document.dispatchEvent(new CustomEvent('ai:extraction-complete', {
                    detail: { url: url, result: result, filledCount: 0, dataSource: null }
                }));
                return result;
            }

            var fields      = result.fields || {};
            var filledCount = 0;

            filledCount += _applyProductName(fName,   fields.product_name)       ? 1 : 0;
            filledCount += _applyDeclaredValue(fValue, fields.declared_value_usd) ? 1 : 0;
            filledCount += _applyCategory(fCategory,  fields.category, categoryMap) ? 1 : 0;

            var physicalFilled = false;
            if (_applyWeight(fWeight, fields.weight_kg)) {
                filledCount += 1;
                physicalFilled = true;
            }
            if (_applyDimensions(fLength, fWidth, fHeight, fields.dimensions_cm)) {
                filledCount += 1;
                physicalFilled = true;
            }
            if (physicalFilled) {
                var convertedFromUS = _isUSUnit(fields.weight_kg) || _isUSUnit(fields.dimensions_cm);
                _showPhysicalNote(fWeight || fLength || fWidth || fHeight, convertedFromUS);
            }

            if (filledCount === 0) {
                _lastExtractionResult = null;
                _showBanner(bannerTarget, 'neutral',
                    'No pudimos leer esta página automáticamente. Ingresa los datos del producto manualmente.');
                document.dispatchEvent(new CustomEvent('ai:extraction-complete', {
                    detail: { url: url, result: result, filledCount: 0, dataSource: null }
                }));
                return result;
            }

            _lastExtractionResult = result;
            var partial    = result.partial || filledCount < 3;
            var dataSource = partial ? 'ai_partial' : 'ai_extracted';

            if (partial) {
                _showBanner(bannerTarget, 'partial',
                    'Revisamos la página y completamos los datos que encontramos. Verifica que todo sea correcto antes de enviar.');
            } else {
                _showBanner(bannerTarget, 'success',
                    'Datos extraídos automáticamente. Verifica que todo sea correcto antes de enviar.');
            }

            _showConfirmCheckbox(confirmWrapper);

            document.dispatchEvent(new CustomEvent('ai:extraction-complete', {
                detail: { url: url, result: result, filledCount: filledCount, dataSource: dataSource }
            }));
            return result;

        }).catch(function () {
            _lastExtractionResult = null;
            _showBanner(bannerTarget, 'neutral',
                'No pudimos leer esta página automáticamente. Ingresa los datos del producto manualmente.');
            document.dispatchEvent(new CustomEvent('ai:extraction-complete', {
                detail: { url: url, result: null, filledCount: 0, dataSource: null }
            }));
            return null;
        });
    }

    // ── Public: allFieldsConfirmed ────────────────────────────────────────
    // Returns {ok, unconfirmedIds} — call before submit to check per-field state.

    function allFieldsConfirmed() {
        return {
            ok:            _confirmTracker.allConfirmed(),
            unconfirmedIds: _confirmTracker.unconfirmedIds(),
        };
    }

    // ── Public: resetExtraction ───────────────────────────────────────────

    function resetExtraction(formFields) {
        _lastExtractionResult = null;
        _removeBanner(formFields.bannerTarget);
        clearExtractionBadges(formFields);
        _hideConfirmCheckbox(formFields.confirmWrapper);
    }

    // ── Public: getLastResult ─────────────────────────────────────────────
    // Returns the full AIExtractionResult from the most recent successful
    // extraction, or null. Used by submission handlers to persist the snapshot.

    function getLastResult() {
        return _lastExtractionResult;
    }

    global.CRBOXAIExtractor = {
        runExtraction:         runExtraction,
        clearExtractionBadges: clearExtractionBadges,
        resetExtraction:       resetExtraction,
        allFieldsConfirmed:    allFieldsConfirmed,
        getLastResult:         getLastResult,
        run:                   runExtraction,
        reset:                 resetExtraction,
    };

})(window);
