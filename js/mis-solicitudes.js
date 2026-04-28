// mis-solicitudes.js — CRBOX Mis Solicitudes de Compra
// Requires: auth.js, portal-api.js
(function () {
  'use strict';

  var _casilleroId = null;
  var _userEmail = '';
  var _userName = '';
  var _isCompany = false;
  var _allSolicitudes = [];

  // ─── Portal form state ──────────────────────────────────────────────────────
  var _panelHasData = false;
  var _panelSubmitted = false;
  var _dupWarningDismissedPortal = false;
  var _portalAiActive = false;

  // ── beforeunload: warn if panel has data and user navigates away ───────────
  window.addEventListener('beforeunload', function (e) {
    if (_panelHasData && !_panelSubmitted) {
      e.preventDefault();
      e.returnValue = 'Tu solicitud no ha sido enviada.';
    }
  });

  // ── Duplicate check helper ──────────────────────────────────────────────────
  function _checkDuplicatePortal(productName, productUrl) {
    var token = (typeof CRBOXAuth !== 'undefined' && CRBOXAuth.getToken) ? CRBOXAuth.getToken() : '';
    var reqHeaders = { 'Content-Type': 'application/json' };
    if (token) {
      reqHeaders['Authorization'] = 'Bearer ' + token;
      if (_userEmail) reqHeaders['X-Casillero-Email'] = _userEmail;
    }
    return fetch('/api/solicitudes/check-duplicate', {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify({
        product_name: productName,
        product_url: productUrl || ''
      })
    }).then(function (res) {
      if (!res.ok) return null;
      return res.json();
    }).catch(function () { return null; });
  }

  // ─── Status label maps ─────────────────────────────────────────────────────
  var STATUS_LABELS = {
    enviada:     'Enviada',
    en_revision: 'En revisión',
    respondida:  'Respondida',
    completada:  'Completada',
    cancelada:   'Cancelada',
    expirada:    'Expirada'
  };

  var STATUS_COLORS = {
    enviada:     { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-400' },
    en_revision: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400' },
    respondida:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-400' },
    completada:  { bg: 'bg-gray-100',  text: 'text-gray-600',   border: 'border-gray-200',   dot: 'bg-gray-400' },
    cancelada:   { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-400' },
    expirada:    { bg: 'bg-gray-100',  text: 'text-gray-500',   border: 'border-gray-200',   dot: 'bg-gray-300' }
  };

  var ACTIVE_STATUSES   = ['enviada', 'en_revision', 'respondida'];
  var ARCHIVED_STATUSES = ['completada', 'cancelada', 'expirada'];

  // ─── Category labels ────────────────────────────────────────────────────────
  var CATEGORY_LABELS = {
    ropa:            'Ropa y calzado',
    electronico:     'Electrónico',
    computadora:     'Computadoras',
    celular:         'Celulares',
    auricular_telefono: 'Auriculares',
    electrodomestico: 'Electrodoméstico',
    cosmetico:       'Cosméticos',
    suplemento:      'Suplementos',
    libro:           'Libros',
    juguete:         'Juguetes',
    herramienta:     'Herramientas',
    equipo_medico:   'Equipo médico',
    deportivo:       'Deportivo',
    otros:           'Otros'
  };

  // ─── Helper: status badge HTML ─────────────────────────────────────────────
  function statusBadge(status) {
    var c = STATUS_COLORS[status] || STATUS_COLORS.otros || { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' };
    var label = STATUS_LABELS[status] || status;
    return (
      '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ' +
      c.bg + ' ' + c.text + ' ' + c.border + '">' +
      '<span class="w-1.5 h-1.5 rounded-full flex-shrink-0 ' + c.dot + '"></span>' +
      label + '</span>'
    );
  }

  // ─── Helper: format date ───────────────────────────────────────────────────
  function formatDate(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      var dd = String(d.getDate()).padStart(2, '0');
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      var yyyy = d.getFullYear();
      return dd + '/' + mm + '/' + yyyy;
    } catch (e) { return iso; }
  }

  // ─── Helper: HTML escape ──────────────────────────────────────────────────
  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─── Helper: truncate ─────────────────────────────────────────────────────
  function trunc(str, n) {
    if (!str) return '';
    return str.length > n ? str.substring(0, n) + '…' : str;
  }

  // ─── Fetch solicitudes from local API ──────────────────────────────────────
  function fetchSolicitudes() {
    if (!_casilleroId) return Promise.resolve([]);
    var token = CRBOXAuth.getToken();
    return fetch('/api/solicitudes', {
      headers: {
        'Authorization': 'Bearer ' + token,
        'X-Casillero-Email': _userEmail
      }
    }).then(function (res) {
      if (res.status === 401) {
        CRBOXAuth.clearToken();
        window.location.replace('login.html?msg=session-expired');
        return [];
      }
      if (!res.ok) throw new Error('Error ' + res.status);
      return res.json();
    }).then(function (data) {
      return (data && data.solicitudes) ? data.solicitudes : [];
    });
  }

  // ─── Render list ───────────────────────────────────────────────────────────
  function renderList(solicitudes) {
    _allSolicitudes = solicitudes;

    var active   = solicitudes.filter(function (s) { return ACTIVE_STATUSES.indexOf(s.status) !== -1; });
    var archived = solicitudes.filter(function (s) { return ARCHIVED_STATUSES.indexOf(s.status) !== -1; });

    var activeList   = document.getElementById('solicitudes-active-list');
    var archivedList = document.getElementById('solicitudes-archived-list');
    var emptyState   = document.getElementById('solicitudes-empty');
    var activeSection   = document.getElementById('solicitudes-active-section');
    var archivedSection = document.getElementById('solicitudes-archived-section');
    var countBadge = document.getElementById('solicitudes-active-count');

    if (!activeList) return;

    if (solicitudes.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      if (activeSection) activeSection.classList.add('hidden');
      if (archivedSection) archivedSection.classList.add('hidden');
      if (countBadge) countBadge.classList.add('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    if (countBadge) {
      if (active.length > 0) {
        countBadge.textContent = active.length;
        countBadge.classList.remove('hidden');
      } else {
        countBadge.classList.add('hidden');
      }
    }

    if (activeSection) {
      if (active.length > 0) {
        activeSection.classList.remove('hidden');
        activeList.innerHTML = active.map(renderRow).join('');
      } else {
        activeSection.classList.add('hidden');
      }
    }

    if (archivedSection) {
      if (archived.length > 0) {
        archivedSection.classList.remove('hidden');
        if (archivedList) archivedList.innerHTML = archived.map(renderRow).join('');
      } else {
        archivedSection.classList.add('hidden');
      }
    }
  }

  function renderRow(sol) {
    var catLabel = esc(CATEGORY_LABELS[sol.category] || sol.category || 'Otros');
    var productName = esc(trunc(sol.product_name || '', 40));
    var productNameFull = esc(sol.product_name || '');
    var valueStr = sol.declared_value_usd != null ? '$' + Number(sol.declared_value_usd).toFixed(2) : '—';
    var safeId = esc(sol.id);
    var encodedId = encodeURIComponent(sol.id);

    return (
      '<div class="sol-row flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-gray-100 last:border-b-0 hover:bg-orange-50/40 transition-colors group" data-id="' + safeId + '">' +
        '<div class="flex-1 min-w-0">' +
          '<div class="flex flex-wrap items-center gap-2 mb-1">' +
            '<a href="solicitud.html?id=' + encodedId + '" class="font-semibold text-gray-900 hover:text-orange-600 transition-colors text-sm tracking-tight">' + safeId + '</a>' +
            statusBadge(sol.status) +
          '</div>' +
          '<p class="text-sm text-gray-700 font-medium truncate" title="' + productNameFull + '">' + productName + '</p>' +
          '<p class="text-xs text-gray-500 mt-0.5">' + catLabel + ' · ' + esc(valueStr) + ' · ' + esc(formatDate(sol.submitted_at)) + '</p>' +
        '</div>' +
        '<div class="flex items-center gap-2 flex-shrink-0">' +
          '<a href="solicitud.html?id=' + encodedId + '" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors">' +
            '<i class="fas fa-eye text-xs"></i> Ver' +
          '</a>' +
          '<button class="btn-duplicate inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors" data-id="' + safeId + '">' +
            '<i class="fas fa-copy text-xs"></i> Duplicar' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  // ─── New request form ──────────────────────────────────────────────────────
  function showNewRequestPanel(prefill) {
    var panel = document.getElementById('new-request-panel');
    var overlay = document.getElementById('new-request-overlay');
    if (!panel) return;

    // Apply business account copy variants
    var heading = document.getElementById('form-heading');
    var valueLabel = document.getElementById('form-value-label');
    var notesPlaceholder = document.getElementById('form-notes');
    var invoiceNotice = document.getElementById('form-invoice-notice');

    if (heading) {
      heading.textContent = _isCompany
        ? 'Nueva solicitud de compra — Cuenta empresarial'
        : 'Nueva solicitud de compra';
    }
    if (valueLabel) {
      valueLabel.textContent = _isCompany
        ? 'Valor del producto (USD) — para efectos aduaneros'
        : 'Valor del producto (USD)';
    }
    if (notesPlaceholder) {
      notesPlaceholder.placeholder = _isCompany
        ? 'Número de orden, referencia interna, o notas para facturación'
        : '¿Algo que CRBOX deba saber sobre este pedido?';
    }
    if (invoiceNotice) {
      if (_isCompany) {
        invoiceNotice.classList.remove('hidden');
      } else {
        invoiceNotice.classList.add('hidden');
      }
    }

    // Pre-fill email (read-only)
    var emailEl = document.getElementById('form-email-display');
    if (emailEl) emailEl.textContent = _userEmail;

    // Pre-fill from duplicate if provided
    if (prefill) {
      var dupBanner = document.getElementById('form-dup-banner');
      if (dupBanner) {
        dupBanner.classList.remove('hidden');
        var dupId = document.getElementById('form-dup-id');
        if (dupId) dupId.textContent = prefill.id;
      }
      _setFormField('form-product-name', prefill.product_name);
      _setFormField('form-product-url', prefill.product_url);
      _setFormField('form-declared-value', prefill.declared_value_usd);
      _setSelectField('form-category', prefill.category);
      _setFormField('form-weight', prefill.weight_kg);
      _setFormField('form-notes', prefill.customer_notes);
      _setSelectField('form-service-type', prefill.service_type);
    } else {
      var dupBanner = document.getElementById('form-dup-banner');
      if (dupBanner) dupBanner.classList.add('hidden');
      var form = document.getElementById('new-request-form');
      if (form) form.reset();
    }

    // Reset dup + data state when opening fresh panel
    _panelSubmitted = false;
    _dupWarningDismissedPortal = false;
    _panelHasData = !!prefill;
    var portalDupWarn = document.getElementById('portal-dup-warning');
    if (portalDupWarn) portalDupWarn.classList.add('hidden');

    panel.classList.remove('translate-x-full');
    if (overlay) overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Draft: check for saved draft and offer restore (skip when duplicating)
    _checkPortalDraftOnOpen(prefill || null);
  }

  function hideNewRequestPanel() {
    var panel = document.getElementById('new-request-panel');
    var overlay = document.getElementById('new-request-overlay');
    if (panel) panel.classList.add('translate-x-full');
    if (overlay) overlay.classList.add('hidden');
    document.body.style.overflow = '';
    // Remove ?new=1 / ?dup= params so the panel does not reopen on refresh
    var cleanUrl = window.location.pathname;
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', cleanUrl);
    }
    // Always reset to empty form state so the panel is fresh on next open,
    // regardless of whether the user closed from the success screen or mid-form.
    var formEl = document.getElementById('new-request-form');
    var successEl = document.getElementById('form-success');
    var submitBtn = document.getElementById('form-submit-btn');
    var dupBanner = document.getElementById('form-dup-banner');
    var errorMsg  = document.getElementById('form-error');
    var portalDupWarn = document.getElementById('portal-dup-warning');
    if (formEl)    { formEl.reset(); formEl.classList.remove('hidden'); }
    if (successEl) successEl.classList.add('hidden');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Enviar solicitud';
    }
    if (dupBanner) dupBanner.classList.add('hidden');
    if (errorMsg)  errorMsg.classList.add('hidden');
    if (portalDupWarn) portalDupWarn.classList.add('hidden');
    var draftBar = document.getElementById('portal-draft-bar');
    if (draftBar) draftBar.classList.add('hidden');
    _panelHasData = false;
    _panelSubmitted = false;
    _dupWarningDismissedPortal = false;
    // Reset AI state
    _portalAiActive = false;
    var aiBannerEl  = document.getElementById('ai-extract-banner-portal');
    var aiConfirmEl = document.getElementById('ai-confirm-portal');
    if (aiBannerEl)  { aiBannerEl.innerHTML = ''; }
    if (aiConfirmEl) { aiConfirmEl.style.display = 'none'; aiConfirmEl.style.outline = ''; }
  }

  function _setFormField(id, value) {
    var el = document.getElementById(id);
    if (el && value != null) el.value = value;
  }
  function _setSelectField(id, value) {
    var el = document.getElementById(id);
    if (el && value) el.value = value;
  }

  // ─── Submit new request ────────────────────────────────────────────────────
  function submitNewRequest(formData) {
    var token = CRBOXAuth.getToken();
    var payload = {
      customer_email: _userEmail,
      customer_name: _userName || '',
      casillero_id: String(_casilleroId),
      account_type: _isCompany ? 'business' : 'personal',
      product_name: formData.product_name,
      product_url: formData.product_url || null,
      declared_value_usd: parseFloat(formData.declared_value_usd),
      category: formData.category || 'otros',
      weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
      customer_notes: formData.customer_notes || null,
      service_type: formData.service_type || 'aereo',
      data_source: formData.data_source || 'manual'
    };

    return fetch('/api/solicitudes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'X-Casillero-Email': _userEmail
      },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().then(function (data) { return { status: res.status, data: data }; });
    });
  }

  // ─── Show inline success ───────────────────────────────────────────────────
  function showSubmitSuccess(scbId) {
    _clearPortalDraft();
    var form = document.getElementById('new-request-form');
    var successEl = document.getElementById('form-success');

    // Always reset submit button before hiding the form so it is fresh
    // when the user opens the panel again in the same session.
    var submitBtn = document.getElementById('form-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Enviar solicitud';
    }

    if (form) form.classList.add('hidden');
    if (successEl) {
      successEl.classList.remove('hidden');
      var idEl = document.getElementById('form-success-id');
      if (idEl) idEl.textContent = scbId;
    }
  }

  // ─── Toast ─────────────────────────────────────────────────────────────────
  function showToast(msg, type) {
    var container = document.getElementById('toast-container');
    if (!container) return;
    var colors = type === 'error'
      ? 'bg-red-600 text-white'
      : 'bg-gray-900 text-white';
    var el = document.createElement('div');
    el.className = 'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ' + colors + ' animate-fade-in-up';
    el.innerHTML = msg;
    container.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 4000);
  }

  // ─── Portal draft save helpers ─────────────────────────────────────────────
  var _PORTAL_DRAFT_FIELD_IDS = [
    'form-product-name', 'form-product-url', 'form-declared-value',
    'form-category', 'form-service-type', 'form-weight', 'form-notes',
  ];
  var _portalDraftTimer = null;

  function _portalDraftKey() {
    return _casilleroId ? 'crbox-draft-' + _casilleroId : null;
  }

  function _savePortalDraft() {
    var key = _portalDraftKey();
    if (!key) return;
    var data = {};
    _PORTAL_DRAFT_FIELD_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) data[id] = el.value;
    });
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
  }

  function _clearPortalDraft() {
    var key = _portalDraftKey();
    if (!key) return;
    try { localStorage.removeItem(key); } catch (e) {}
  }

  function _loadPortalDraft() {
    var key = _portalDraftKey();
    if (!key) return null;
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function _restorePortalDraft(data) {
    _PORTAL_DRAFT_FIELD_IDS.forEach(function (id) {
      if (data[id] == null) return;
      var el = document.getElementById(id);
      if (el) el.value = data[id];
    });
  }

  function _scheduleDraftSavePortal() {
    clearTimeout(_portalDraftTimer);
    _portalDraftTimer = setTimeout(_savePortalDraft, 500);
  }

  function _initPortalDraftSave(formEl) {
    _PORTAL_DRAFT_FIELD_IDS.forEach(function (id) {
      var el = formEl ? formEl.querySelector('#' + id) : document.getElementById(id);
      if (el) {
        el.addEventListener('input', _scheduleDraftSavePortal);
        el.addEventListener('change', _scheduleDraftSavePortal);
      }
    });
  }

  function _checkPortalDraftOnOpen(prefill) {
    if (prefill) {
      // Prefill from duplicate — suppress banner but preserve any existing draft
      return;
    }
    var draft = _loadPortalDraft();
    var bar   = document.getElementById('portal-draft-bar');
    if (!draft || !bar) return;

    var hasData = _PORTAL_DRAFT_FIELD_IDS.some(function (id) {
      return (draft[id] || '').toString().trim() !== '';
    });
    if (!hasData) { _clearPortalDraft(); return; }

    bar.classList.remove('hidden');

    // One-shot handlers so they don't stack on multiple panel opens
    var restoreBtn  = document.getElementById('portal-draft-restore-btn');
    var discardBtn  = document.getElementById('portal-draft-discard-btn');

    var _onRestore = function () {
      _restorePortalDraft(draft);
      bar.classList.add('hidden');
      restoreBtn.removeEventListener('click', _onRestore);
      discardBtn.removeEventListener('click', _onDiscard);
      _panelHasData = true;
    };
    var _onDiscard = function () {
      _clearPortalDraft();
      bar.classList.add('hidden');
      restoreBtn.removeEventListener('click', _onRestore);
      discardBtn.removeEventListener('click', _onDiscard);
    };

    restoreBtn.addEventListener('click', _onRestore);
    discardBtn.addEventListener('click', _onDiscard);
  }

  // ─── Init ──────────────────────────────────────────────────────────────────
  function init() {
    if (!CRBOXAuth.isLoggedIn()) return;

    var loadingEl  = document.getElementById('solicitudes-loading');
    var contentEl  = document.getElementById('solicitudes-content');
    var errorEl    = document.getElementById('solicitudes-error');

    CRBOXPortalAPI.getUserInfo().then(function (info) {
      var c = (info && info.Consignee) ? info.Consignee : (info || {});

      _casilleroId = c.idconsignee || c.IdConsignee || null;
      _userEmail = CRBOXAuth.getEmail() || c.email || c.Email || '';
      var fname = c.consigneename || c.ConsigneeName || '';
      var lname = c.consigneelastname1 || c.ConsigneeLastName1 || '';
      _userName = (fname + ' ' + lname).trim();
      _isCompany = !!(c.isCompany || c.IsCompany);

      // Update mobile identity
      var mobileNameEl = document.getElementById('mobile-user-name');
      var mobileCasEl  = document.getElementById('mobile-casillero-badge');
      var headerNameEl = document.getElementById('header-user-name');
      if (mobileNameEl) mobileNameEl.textContent = fname || _userEmail;
      if (mobileCasEl)  mobileCasEl.textContent  = 'Casillero #' + (_casilleroId || '—');
      if (headerNameEl) headerNameEl.textContent  = fname || _userEmail;

      return fetchSolicitudes();
    }).then(function (list) {
      if (loadingEl) loadingEl.classList.add('hidden');
      if (contentEl) contentEl.classList.remove('hidden');
      renderList(list);

      // Handle URL params
      var params = new URLSearchParams(window.location.search);
      if (params.get('new') === '1') {
        showNewRequestPanel(null);
      } else if (params.get('dup')) {
        var dupId = params.get('dup');
        var original = _allSolicitudes.filter(function (s) { return s.id === dupId; })[0];
        if (original) showNewRequestPanel(original);
      }
    }).catch(function (err) {
      if (err && err.isAuthError) return;
      if (loadingEl) loadingEl.classList.add('hidden');
      if (errorEl) errorEl.classList.remove('hidden');
      console.warn('[Mis Solicitudes] init error:', err);
    });

    // Duplicate buttons (delegated)
    var activeList   = document.getElementById('solicitudes-active-list');
    var archivedList = document.getElementById('solicitudes-archived-list');
    function onDupClick(e) {
      var btn = e.target.closest('.btn-duplicate');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      var original = _allSolicitudes.filter(function (s) { return s.id === id; })[0];
      if (original) showNewRequestPanel(original);
    }
    if (activeList)   activeList.addEventListener('click', onDupClick);
    if (archivedList) archivedList.addEventListener('click', onDupClick);

    // Nueva solicitud buttons
    document.querySelectorAll('.btn-nueva-solicitud').forEach(function (btn) {
      btn.addEventListener('click', function () { showNewRequestPanel(null); });
    });

    // Overlay + close panel
    var overlay  = document.getElementById('new-request-overlay');
    var closeBtn = document.getElementById('panel-close-btn');
    if (overlay)  overlay.addEventListener('click', hideNewRequestPanel);
    if (closeBtn) closeBtn.addEventListener('click', hideNewRequestPanel);

    // Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hideNewRequestPanel();
    });

    // Archive toggle
    var archiveToggle = document.getElementById('archive-toggle');
    var archivedContent = document.getElementById('archived-content');
    var archiveIcon = document.getElementById('archive-icon');
    if (archiveToggle && archivedContent) {
      archiveToggle.addEventListener('click', function () {
        var isHidden = archivedContent.classList.contains('hidden');
        if (isHidden) {
          archivedContent.classList.remove('hidden');
          if (archiveIcon) archiveIcon.style.transform = 'rotate(180deg)';
        } else {
          archivedContent.classList.add('hidden');
          if (archiveIcon) archiveIcon.style.transform = '';
        }
      });
    }

    // Track data changes in panel for beforeunload guard + draft save
    var formForTracking = document.getElementById('new-request-form');
    if (formForTracking) {
      formForTracking.addEventListener('input', function () { _panelHasData = true; });
      _initPortalDraftSave(formForTracking);
    }

    // Portal duplicate warning dismiss button
    var btnPortalDupDismiss = document.getElementById('btn-portal-dup-dismiss');
    if (btnPortalDupDismiss) {
      btnPortalDupDismiss.addEventListener('click', function () {
        _dupWarningDismissedPortal = true;
        var dw = document.getElementById('portal-dup-warning');
        if (dw) dw.classList.add('hidden');
        // Re-trigger submit
        var frm = document.getElementById('new-request-form');
        if (frm) frm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
    }

    // ── AI extractor wiring ───────────────────────────────────────────────────
    (function () {
      var fPortalUrl   = document.getElementById('form-product-url');
      var fPortalName  = document.getElementById('form-product-name');
      var fPortalValue = document.getElementById('form-declared-value');
      var fPortalCat   = document.getElementById('form-category');
      var aiBanner     = document.getElementById('ai-extract-banner-portal');
      var aiConfirm    = document.getElementById('ai-confirm-portal');

      if (!fPortalUrl || typeof CRBOXAIExtractor === 'undefined') return;

      var _aiTimer = null;
      fPortalUrl.addEventListener('blur', function () {
        var url = (this.value || '').trim();
        if (!url || !url.startsWith('http')) return;
        clearTimeout(_aiTimer);
        _aiTimer = setTimeout(function () {
          _portalAiActive = false;
          CRBOXAIExtractor.run({
            url:            url,
            bannerTarget:   aiBanner,
            fName:          fPortalName,
            fValue:         fPortalValue,
            fCategory:      fPortalCat,
            confirmWrapper: aiConfirm,
            onRequiredChange: function () { _portalAiActive = true; },
          }).then(function () {
            var b = aiBanner.querySelector('.ai-extract-banner');
            if (b && (b.classList.contains('ai-banner-success') ||
                      b.classList.contains('ai-banner-partial'))) {
              _portalAiActive = true;
            }
          });
        }, 300);
      });
      fPortalUrl.addEventListener('input', function () {
        var url = (this.value || '').trim();
        if (!url) {
          CRBOXAIExtractor.reset({
            bannerTarget:   aiBanner,
            fName:          fPortalName,
            fValue:         fPortalValue,
            fCategory:      fPortalCat,
            confirmWrapper: aiConfirm,
          });
          _portalAiActive = false;
        }
      });
    })();

    // Form submission
    var form = document.getElementById('new-request-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var submitBtn = document.getElementById('form-submit-btn');
        var errorMsg  = document.getElementById('form-error');

        if (errorMsg) errorMsg.classList.add('hidden');

        // AI confirm check
        var aiConfirmWrapper = document.getElementById('ai-confirm-portal');
        var aiConfirmChk     = document.getElementById('ai-confirm-chk-portal');
        if (_portalAiActive && aiConfirmWrapper && aiConfirmWrapper.style.display !== 'none') {
          if (!aiConfirmChk || !aiConfirmChk.checked) {
            aiConfirmWrapper.style.outline = '2px solid #ef4444';
            aiConfirmWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
          } else {
            aiConfirmWrapper.style.outline = '';
          }
        }

        var formData = {
          product_name:      form.querySelector('#form-product-name').value.trim(),
          product_url:       form.querySelector('#form-product-url').value.trim(),
          declared_value_usd: form.querySelector('#form-declared-value').value,
          category:          form.querySelector('#form-category').value,
          weight_kg:         form.querySelector('#form-weight').value,
          customer_notes:    form.querySelector('#form-notes').value.trim(),
          service_type:      form.querySelector('#form-service-type').value,
          data_source:       _portalAiActive ? 'ai' : 'manual',
        };

        // Duplicate check (skip if user already dismissed)
        if (!_dupWarningDismissedPortal && formData.product_name) {
          // Lock the button during the async check to prevent double-submit
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Verificando...';
          }
          _checkDuplicatePortal(formData.product_name, formData.product_url)
            .then(function (dupResult) {
              if (dupResult && dupResult.duplicate) {
                // Unlock button so user can still proceed after dismissing warning
                if (submitBtn) {
                  submitBtn.disabled = false;
                  submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Enviar solicitud';
                }
                var dw = document.getElementById('portal-dup-warning');
                var dl = document.getElementById('portal-dup-link');
                var di = document.getElementById('portal-dup-id');
                var dh = document.getElementById('portal-dup-hours');
                if (di) di.textContent = dupResult.existing_id || '';
                if (dl) {
                  dl.href = dupResult.existing_id
                    ? 'solicitud.html?id=' + encodeURIComponent(dupResult.existing_id)
                    : 'mis-solicitudes.html';
                }
                if (dh) dh.textContent = dupResult.hours_ago;
                if (dw) {
                  dw.classList.remove('hidden');
                  dw.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              } else {
                // No duplicate — proceed with actual submit
                _doPortalSubmit(formData, submitBtn, errorMsg);
              }
            });
          return;
        }

        _doPortalSubmit(formData, submitBtn, errorMsg);
      });
    }

    function _doPortalSubmit(formData, submitBtn, errorMsg) {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enviando...';
        }

        submitNewRequest(formData).then(function (result) {
          if (result.data && result.data.ok) {
            var scbId = result.data.id;
            _panelSubmitted = true;
            showSubmitSuccess(scbId);
            // Refresh the list in background
            fetchSolicitudes().then(function (list) { renderList(list); }).catch(function(){});
          } else {
            var msg = (result.data && result.data.errors && result.data.errors[0]) ||
                      (result.data && result.data.error) ||
                      'No se pudo enviar la solicitud. Intenta de nuevo.';
            if (errorMsg) {
              errorMsg.textContent = msg;
              errorMsg.classList.remove('hidden');
            }
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Enviar solicitud';
            }
          }
        }).catch(function (err) {
          if (errorMsg) {
            errorMsg.textContent = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
            errorMsg.classList.remove('hidden');
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Enviar solicitud';
          }
          console.warn('[Mis Solicitudes] submit error:', err);
        });
    }

    // "Ver mis solicitudes" after success
    var backToListBtn = document.getElementById('form-back-to-list');
    if (backToListBtn) {
      backToListBtn.addEventListener('click', function () {
        hideNewRequestPanel();
        var form = document.getElementById('new-request-form');
        var successEl = document.getElementById('form-success');
        if (form) form.classList.remove('hidden');
        if (successEl) successEl.classList.add('hidden');
        if (form) form.reset();
      });
    }

    // Mobile menu toggle (consistent with other portal pages)
    var mobileMenuBtn = document.getElementById('mobile-menu-button');
    var mobileMenu    = document.getElementById('mobile-menu');
    if (mobileMenuBtn && mobileMenu) {
      mobileMenuBtn.addEventListener('click', function () {
        var isHidden = mobileMenu.style.display === 'none' || mobileMenu.classList.contains('hidden');
        if (isHidden) {
          mobileMenu.classList.remove('hidden');
          mobileMenuBtn.querySelector('i').className = 'fas fa-times text-xl';
        } else {
          mobileMenu.classList.add('hidden');
          mobileMenuBtn.querySelector('i').className = 'fas fa-bars text-xl';
        }
      });
    }

    // Logout buttons
    var logoutBtn       = document.getElementById('logout-button');
    var mobileLogoutBtn = document.getElementById('mobile-logout-button');
    function doLogout(e) { e.preventDefault(); CRBOXAuth.logout(); }
    if (logoutBtn)       logoutBtn.addEventListener('click', doLogout);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', doLogout);
  }

  document.addEventListener('DOMContentLoaded', init);

  window.addEventListener('crbox:pageresume', function () {
    if (!CRBOXAuth.isLoggedIn()) return;
    CRBOXPortalAPI.getUserInfo({ forceRefresh: true }).then(function (info) {
      var c = (info && info.Consignee) ? info.Consignee : (info || {});
      var fname = c.consigneename || c.ConsigneeName || '';
      var mobileNameEl = document.getElementById('mobile-user-name');
      var headerNameEl = document.getElementById('header-user-name');
      if (mobileNameEl) mobileNameEl.textContent = fname || CRBOXAuth.getEmail();
      if (headerNameEl) headerNameEl.textContent  = fname || CRBOXAuth.getEmail();
    }).catch(function(){});
  });

}());
