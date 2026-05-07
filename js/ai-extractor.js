'use strict';

(function (global) {

    var EXTRACT_ENDPOINT  = '/api/ai/extract';
    var CONFIDENCE_HIGH   = 0.90;
    var CONFIDENCE_MED    = 0.70;

    // ── Step loader (replaces the simple spinner during analysis) ─────────────

    var _stepTimers = [];

    function _clearStepTimers() {
        _stepTimers.forEach(function (t) { clearTimeout(t); });
        _stepTimers = [];
    }

    function _advanceStep(loader, activeIdx) {
        if (!loader) return;
        loader.querySelectorAll('.ai-step-row').forEach(function (row, i) {
            var icon = row.querySelector('.ai-step-icon i');
            if (i < activeIdx) {
                row.className = 'ai-step-row ai-step-done';
                if (icon) { icon.className = 'fas fa-check'; }
            } else if (i === activeIdx) {
                row.className = 'ai-step-row ai-step-active';
                if (icon) { icon.className = 'fas fa-circle-notch fa-spin'; }
            } else {
                row.className = 'ai-step-row ai-step-pending';
                if (icon) { icon.className = 'fas fa-circle'; }
            }
        });
    }

    function _showStepLoader(container) {
        if (!container) return null;
        _removeStepLoader(container);
        var steps = [
            'Identificando el producto\u2026',
            'Verificando restricciones de importaci\u00f3n\u2026',
            'Completando datos del formulario\u2026'
        ];
        var loader = document.createElement('div');
        loader.className = 'ai-step-loader';
        steps.forEach(function (text, i) {
            var row = document.createElement('div');
            row.className = 'ai-step-row ai-step-pending';
            row.dataset.step = i;
            var icon = document.createElement('span');
            icon.className = 'ai-step-icon';
            icon.innerHTML = '<i class="fas fa-circle"></i>';
            var label = document.createElement('span');
            label.className = 'ai-step-label';
            label.textContent = text;
            row.appendChild(icon);
            row.appendChild(label);
            loader.appendChild(row);
        });
        container.insertBefore(loader, container.firstChild);
        _advanceStep(loader, 0);
        _stepTimers.push(setTimeout(function () { _advanceStep(loader, 1); }, 1300));
        _stepTimers.push(setTimeout(function () { _advanceStep(loader, 2); }, 2600));
        return loader;
    }

    function _removeStepLoader(container) {
        _clearStepTimers();
        if (!container) return;
        var loader = container.querySelector('.ai-step-loader');
        if (loader) loader.parentNode.removeChild(loader);
    }

    // ── Compliance card ────────────────────────────────────────────────────────

    function _showComplianceCard(container, compliance) {
        if (!container || !compliance) return null;
        _removeComplianceCard(container);

        var cls     = (compliance.classification || 'ALLOWED').toUpperCase();
        var reason  = compliance.reason || '';
        var verdict = compliance.verdict || 'safe';

        if (cls === 'ALLOWED') return null;

        var cfg = {
            RESTRICTED: {
                cardCls:  'ai-compliance-restricted',
                icon:     'fas fa-exclamation-triangle',
                title:    'Este producto requiere gesti\u00f3n especial',
                footer:   'CRBOX verificar\u00e1 los requisitos contigo antes de proceder con el env\u00edo.',
            },
            COURIER_RESTRICTED: {
                cardCls:  'ai-compliance-courier',
                icon:     'fas fa-info-circle',
                title:    'Restricci\u00f3n operativa del courier',
                footer:   'Este tipo de art\u00edculo puede requerir manejo especial o generar cargos adicionales.',
            },
            PROHIBITED: {
                cardCls:  'ai-compliance-prohibited',
                icon:     'fas fa-ban',
                title:    'Este producto no puede ser importado a Costa Rica',
                footer:   'Si crees que es un error o tienes dudas, cont\u00e1ctanos antes de realizar tu compra.',
            },
        };

        var c = cfg[cls] || cfg['RESTRICTED'];

        var card = document.createElement('div');
        card.className = 'ai-compliance-card ' + c.cardCls;

        var iconWrap = document.createElement('div');
        iconWrap.className = 'ai-compliance-icon';
        iconWrap.innerHTML = '<i class="' + c.icon + '"></i>';

        var body = document.createElement('div');
        body.className = 'ai-compliance-body';

        var titleEl = document.createElement('p');
        titleEl.className = 'ai-compliance-title';
        titleEl.textContent = c.title;

        var reasonEl = document.createElement('p');
        reasonEl.className = 'ai-compliance-reason';
        reasonEl.textContent = reason;

        var footerEl = document.createElement('p');
        footerEl.className = 'ai-compliance-footer';
        footerEl.textContent = c.footer;

        body.appendChild(titleEl);
        if (reason) body.appendChild(reasonEl);
        body.appendChild(footerEl);
        card.appendChild(iconWrap);
        card.appendChild(body);
        container.appendChild(card);
        return card;
    }

    function _removeComplianceCard(container) {
        if (!container) return;
        var card = container.querySelector('.ai-compliance-card');
        if (card) card.parentNode.removeChild(card);
    }

    // ── Label badge helpers ────────────────────────────────────────────────────

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
        if (type === 'verify') {
            badge.className = 'ai-badge ai-badge-verify';
            badge.textContent = 'Verificar';
        } else if (type === 'estimated') {
            badge.className = 'ai-badge ai-badge-estimated';
            badge.textContent = 'Estimado';
        } else {
            badge.className = 'ai-badge ai-badge-confirm';
            badge.textContent = 'Confirmar';
        }
        labelEl.appendChild(badge);
    }

    function _removeBadge(el) {
        _removeBadgesFromLabel(_findLabel(el));
    }

    // ── Banner helpers ─────────────────────────────────────────────────────────

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

    // ── Field-level confirm tracking ───────────────────────────────────────────

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

    var _confirmTracker = _makeConfirmTracker();
    var _lastExtractionResult = null;

    // ── Internal: clear values that were filled by a previous AI extraction ──────
    // Called at the START of every new runExtraction so that a failed extraction
    // never leaves stale AI-suggested text in the form fields.

    function _clearAiFilledValues(formFields) {
        var fields = formFields || {};
        [fields.fName, fields.fValue, fields.fCategory, fields.fWeight,
         fields.fLength, fields.fWidth, fields.fHeight].forEach(function (el) {
            if (!el) return;
            // Only wipe values the AI itself wrote — user-typed values are left alone.
            if (el.dataset.aiSuggested === '1') {
                el.value = '';
            }
        });
    }

    // ── Public: clearExtractionBadges ──────────────────────────────────────────

    function clearExtractionBadges(formFields) {
        var fields = formFields || {};
        [fields.fName, fields.fValue, fields.fCategory, fields.fWeight,
         fields.fLength, fields.fWidth, fields.fHeight].forEach(function (el) {
            if (!el) return;
            _removeBadge(el);
            el.style.borderStyle = '';
            delete el.dataset.aiSuggested;
            delete el.dataset.aiField;
            delete el.dataset.aiConfirmed;
            el.style.color = '';
        });
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
        if (fields.complianceTarget) _removeComplianceCard(fields.complianceTarget);
        _confirmTracker.clear();
    }

    // ── Field apply helpers ────────────────────────────────────────────────────

    function _applyProductName(el, fieldResult) {
        if (!el || !fieldResult) return false;
        var provenance = fieldResult.provenance;
        var confidence = fieldResult.confidence || 0;
        var value      = fieldResult.value;

        if (provenance === 'missing' || value === null || value === undefined) return false;

        el.value = String(value);
        el.dataset.aiSuggested = '1';
        el.dataset.aiField     = 'product_name';

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
        if (categoryMap && categoryMap[strVal]) { strVal = categoryMap[strVal]; }

        var found = false;
        for (var i = 0; i < el.options.length; i++) {
            if (el.options[i].value === strVal) { el.value = strVal; found = true; break; }
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

        var isEstimated = (provenance === 'estimated' || provenance === 'search');
        if (!isEstimated && confidence < CONFIDENCE_MED) return false;

        el.value = String(parseFloat(value).toFixed(2));
        el.dataset.aiSuggested = '1';
        el.dataset.aiField     = 'weight_kg';
        el.style.color = '#9ca3af';
        if (isEstimated) {
            el.style.borderStyle = 'dashed';
        }
        el.addEventListener('input', function onInput() {
            el.style.color = '';
            el.style.borderStyle = '';
            el.removeEventListener('input', onInput);
        });
        _attachBadge(el, isEstimated ? 'estimated' : 'confirm');
        if (!isEstimated) _confirmTracker.require(el);
        return true;
    }

    function _applyDimensions(elLength, elWidth, elHeight, fieldResult) {
        if (!fieldResult) return false;
        var provenance = fieldResult.provenance;
        var confidence = fieldResult.confidence || 0;
        var value      = fieldResult.value;

        if (provenance === 'missing' || value === null || value === undefined) return false;

        var isEstimated = (provenance === 'estimated' || provenance === 'search');
        if (!isEstimated && confidence < CONFIDENCE_MED) return false;

        var dims = null;
        if (typeof value === 'object' && !Array.isArray(value)) { dims = value; }
        if (!dims) return false;

        var filled = false;
        [[elLength, dims.length, 'dimension_length'],
         [elWidth,  dims.width,  'dimension_width'],
         [elHeight, dims.height, 'dimension_height']].forEach(function (triple) {
            var el = triple[0], dimVal = triple[1], fieldName = triple[2];
            if (!el || dimVal == null) return;
            el.value = String(parseFloat(dimVal).toFixed(1));
            el.dataset.aiSuggested = '1';
            el.dataset.aiField     = fieldName;
            el.style.color = '#9ca3af';
            if (isEstimated) { el.style.borderStyle = 'dashed'; }
            el.addEventListener('input', function onInput() {
                el.style.color = '';
                el.style.borderStyle = '';
                el.removeEventListener('input', onInput);
            });
            _attachBadge(el, isEstimated ? 'estimated' : 'confirm');
            if (!isEstimated) _confirmTracker.require(el);
            filled = true;
        });
        return filled;
    }

    function _showPhysicalNote(anchorEl, convertedFromUS, isEstimated) {
        if (!anchorEl) return;
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
        var text, color;
        if (isEstimated) {
            color = '#6b7280';
            text  = 'Peso y medidas <strong>estimados</strong> seg\u00fan el tipo de producto \u2014 actualiza cuando recibas el paquete.';
        } else {
            color = '#d97706';
            text  = 'Datos f\u00edsicos extra\u00eddos de la p\u00e1gina del producto \u2014 confirma antes de enviar.';
            if (convertedFromUS) {
                text += ' <strong>Convertido de unidades americanas (lbs/pulgadas) a kg/cm.</strong>';
            }
        }
        note.style.cssText = 'font-size:.74rem;color:' + color + ';margin-top:.5rem;line-height:1.4;';
        note.innerHTML = '<i class="fas fa-info-circle" style="margin-right:.3rem;"></i>' + text;
        container.appendChild(note);
    }

    function _isUSUnit(fieldResult) {
        if (!fieldResult) return false;
        var u = (fieldResult.source_unit || '').toLowerCase();
        return u === 'lbs' || u === 'lb' || u === 'oz' || u === 'in';
    }

    // ── Confirm checkbox helpers ───────────────────────────────────────────────

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

    // ── Public: runExtraction ──────────────────────────────────────────────────

    function runExtraction(url, formFields) {
        var bannerTarget      = formFields.bannerTarget;
        var complianceTarget  = formFields.complianceTarget || null;
        var fName             = formFields.fName;
        var fValue            = formFields.fValue;
        var fCategory         = formFields.fCategory;
        var fWeight           = formFields.fWeight   || null;
        var fLength           = formFields.fLength   || null;
        var fWidth            = formFields.fWidth    || null;
        var fHeight           = formFields.fHeight   || null;
        var confirmWrapper    = formFields.confirmWrapper;
        var categoryMap       = formFields.categoryMap || null;

        _showStepLoader(bannerTarget);
        if (complianceTarget) _removeComplianceCard(complianceTarget);
        _clearAiFilledValues(formFields);   // wipe stale AI values before the new request lands
        clearExtractionBadges(formFields);

        var _ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var _tmr  = _ctrl ? setTimeout(function () { _ctrl.abort(); }, 12000) : null;

        return fetch(EXTRACT_ENDPOINT, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ url: url }),
            signal:  _ctrl ? _ctrl.signal : undefined,
        }).then(function (resp) {
            if (_tmr) clearTimeout(_tmr);
            return resp.json();
        }).then(function (result) {
            _removeStepLoader(bannerTarget);

            if (result && result.error === 'rate_limit') {
                _showBanner(bannerTarget, 'neutral',
                    'L\u00edmite de consultas alcanzado. Inténtalo más tarde.');
                document.dispatchEvent(new CustomEvent('ai:extraction-complete', {
                    detail: { url: url, result: result, filledCount: 0, dataSource: null }
                }));
                return result;
            }

            if (!result || result.page_readable === false) {
                _lastExtractionResult = null;
                _showBanner(bannerTarget, 'neutral',
                    'No pudimos completar los datos automáticamente. Puedes ingresarlos manualmente.');
                document.dispatchEvent(new CustomEvent('ai:extraction-complete', {
                    detail: { url: url, result: result, filledCount: 0, dataSource: null }
                }));
                return result;
            }

            // Show compliance card (if not ALLOWED)
            if (complianceTarget && result.compliance) {
                _showComplianceCard(complianceTarget, result.compliance);
            }

            // Disable submit if PROHIBITED
            if (result.compliance && result.compliance.verdict === 'do_not_ship') {
                var submitBtns = document.querySelectorAll('[type=submit], #btn-sticky-submit');
                submitBtns.forEach(function (btn) {
                    btn.disabled = true;
                    btn.dataset.aiProhibited = '1';
                });
            }

            var fields      = result.fields || {};
            var filledCount = 0;

            filledCount += _applyProductName(fName,   fields.product_name)        ? 1 : 0;
            filledCount += _applyDeclaredValue(fValue, fields.declared_value_usd)  ? 1 : 0;
            filledCount += _applyCategory(fCategory,  fields.category, categoryMap) ? 1 : 0;

            var physicalFilled    = false;
            var physicalEstimated = false;

            if (_applyWeight(fWeight, fields.weight_kg)) {
                filledCount += 1;
                physicalFilled = true;
                var wProv = (fields.weight_kg || {}).provenance;
                if (wProv === 'estimated' || wProv === 'search') physicalEstimated = true;
            }
            if (_applyDimensions(fLength, fWidth, fHeight, fields.dimensions_cm)) {
                filledCount += 1;
                physicalFilled = true;
                var dProv = (fields.dimensions_cm || {}).provenance;
                if (dProv === 'estimated' || dProv === 'search') physicalEstimated = true;
            }
            if (physicalFilled) {
                var convertedFromUS = _isUSUnit(fields.weight_kg) || _isUSUnit(fields.dimensions_cm);
                _showPhysicalNote(fWeight || fLength || fWidth || fHeight,
                                  convertedFromUS, physicalEstimated);
            }

            if (filledCount === 0) {
                _lastExtractionResult = null;
                _showBanner(bannerTarget, 'neutral',
                    'No pudimos completar los datos automáticamente. Puedes ingresarlos manualmente.');
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
                    'Datos completados automáticamente (parcial). Revisa y completa los campos que faltan antes de enviar.');
            } else {
                _showBanner(bannerTarget, 'success',
                    'Datos completados automáticamente. Verifica que todo sea correcto antes de enviar.');
            }

            _showConfirmCheckbox(confirmWrapper);

            document.dispatchEvent(new CustomEvent('ai:extraction-complete', {
                detail: { url: url, result: result, filledCount: filledCount, dataSource: dataSource }
            }));
            return result;

        }).catch(function (err) {
            if (_tmr) clearTimeout(_tmr);
            _removeStepLoader(bannerTarget);
            _lastExtractionResult = null;
            var isAbort = err && (err.name === 'AbortError' || err.name === 'TimeoutError');
            _showBanner(bannerTarget, 'neutral',
                isAbort
                    ? 'La extracción tardó demasiado. Puedes completar los datos manualmente.'
                    : 'No pudimos completar los datos automáticamente. Puedes ingresarlos manualmente.');
            document.dispatchEvent(new CustomEvent('ai:extraction-complete', {
                detail: { url: url, result: null, filledCount: 0, dataSource: null }
            }));
            if (confirmWrapper) _hideConfirmCheckbox(confirmWrapper);
            return null;
        });
    }

    // ── Public: allFieldsConfirmed ─────────────────────────────────────────────

    function allFieldsConfirmed() {
        return {
            ok:             _confirmTracker.allConfirmed(),
            unconfirmedIds: _confirmTracker.unconfirmedIds(),
        };
    }

    // ── Public: resetExtraction ────────────────────────────────────────────────

    function resetExtraction(formFields) {
        _lastExtractionResult = null;
        _removeStepLoader(formFields.bannerTarget);
        _removeBanner(formFields.bannerTarget);
        _removeComplianceCard(formFields.complianceTarget || null);
        clearExtractionBadges(formFields);
        _hideConfirmCheckbox(formFields.confirmWrapper);
        // Re-enable any submit buttons that were disabled for prohibited items
        document.querySelectorAll('[data-ai-prohibited]').forEach(function (btn) {
            btn.disabled = false;
            delete btn.dataset.aiProhibited;
        });
    }

    // ── Public: getLastResult ──────────────────────────────────────────────────

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
