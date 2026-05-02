/**
 * enviar-juntos.js — CRBOX "Enviar paquetes juntos" grouping flow
 *
 * Groups are stored server-side (per authenticated user) via:
 *   GET    /api/package-groups         — load on init
 *   POST   /api/package-groups         — create group
 *   PATCH  /api/package-groups/<id>    — update group
 *   DELETE /api/package-groups/<id>    — delete group
 *
 * An in-memory cache (_groups) is kept for synchronous reads.
 * Writes are optimistic: the cache is updated immediately and the API
 * call happens in the background. On failure a toast is shown and the
 * cache is reloaded from the server.
 *
 * localStorage (key: crbox_package_groups_v1) is used only as a
 * one-time fallback when the server is unreachable on first load.
 *
 * Group schema:
 * {
 *   id:                   string (UUID-like),
 *   groupName:            string,
 *   expectedPackageCount: number,
 *   notes:                string,
 *   status:               'waiting_for_packages'|'invoices_pending'|'ready_to_confirm'|'confirmation_sent'|'closed',
 *   packages:             Array<{ idwarehousereceipt, trackingNumber, number, carrierName, bestDate, statusId, invoicesCount }>,
 *   createdAt:            ISO string,
 *   updatedAt:            ISO string,
 *   confirmedAt:          ISO string|null,
 *   closedAt:             ISO string|null
 * }
 */
(function (global) {
  'use strict';

  /* ─── In-memory cache (populated from server on init) ───── */
  var STORAGE_KEY = 'crbox_package_groups_v1';  // kept for fallback read only
  var _groups = [];

  function _load() { return _groups; }
  function _save(groups) { _groups = groups; }

  /* ─── Auth headers (mirror pattern from _handleSendConfirmation) ─── */
  function _apiHeaders() {
    var email = (window.CRBOXAuth && CRBOXAuth.getEmail ? CRBOXAuth.getEmail() : '') || '';
    var token = (window.CRBOXAuth && CRBOXAuth.getToken ? CRBOXAuth.getToken() : '') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      'X-Casillero-Email': email
    };
  }

  /* ─── Generic API call helper ───────────────────────────── */
  function _apiCall(method, path, body) {
    var opts = { method: method, headers: _apiHeaders() };
    if (body !== undefined) opts.body = JSON.stringify(body);
    return fetch(path, opts).then(function (res) { return res.json(); });
  }

  /* ─── Reload cache from server then re-render ───────────── */
  function _reloadFromServer() {
    _apiCall('GET', '/api/package-groups').then(function (data) {
      if (data && data.ok && Array.isArray(data.groups)) {
        _groups = data.groups;
        renderSection();
      }
    }).catch(function () {});
  }

  function _uuid() {
    return 'grp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }
  function _now() { return new Date().toISOString(); }

  /* ─── Status labels ─────────────────────────────────────── */
  var STATUS_LABEL = {
    waiting_for_packages: 'Esperando paquetes',
    invoices_pending:     'Facturas pendientes',
    ready_to_confirm:     'Listo para confirmar',
    confirmation_sent:    'Confirmado — en proceso',
    closed:               'Cerrado'
  };
  var STATUS_CLASS = {
    waiting_for_packages: 'ej-status-waiting',
    invoices_pending:     'ej-status-invoices',
    ready_to_confirm:     'ej-status-confirm',
    confirmation_sent:    'ej-status-confirmed',
    closed:               'ej-status-closed'
  };
  var STATUS_ICON = {
    waiting_for_packages: 'fa-clock',
    invoices_pending:     'fa-file-invoice',
    ready_to_confirm:     'fa-check-circle',
    confirmation_sent:    'fa-hourglass-half',
    closed:               'fa-lock'
  };

  /* ─── Package global pool (set by page after API load) ─── */
  var _allPackages = [];   // raw mapped packages from portal-api

  /* ─── UI state ─── */
  var _expandedCards  = {};  // groupId → true/false; default = expanded
  var _historyExpanded = false; // "Historial de envíos" section collapsed by default
  var _postCreatePkg  = null; // package to auto-add after creating a group from the add-to-group row flow

  /* ─── Auto-assign session state ─── */
  var _SEEN_MIAMI_KEY      = 'crbox_seen_miami_ids';
  var _AUTO_ADDED_KEY      = 'crbox_auto_added_groups';
  var _AMBIGUOUS_KEY       = 'crbox_ambiguous_miami_pkgs';

  /* Load auto-added map from sessionStorage so in-card strips survive reloads */
  var _autoAddedByGroup = (function () {
    try { return JSON.parse(sessionStorage.getItem(_AUTO_ADDED_KEY) || '{}') || {}; }
    catch (_e) { return {}; }
  }());

  /* Load ambiguous packages from sessionStorage so the banner survives reloads */
  var _ambiguousNewMiamiPkgs = (function () {
    try { return JSON.parse(sessionStorage.getItem(_AMBIGUOUS_KEY) || '[]') || []; }
    catch (_e) { return []; }
  }());

  /* ─── Package ID normalizer — always returns a string ─── */
  function _pid(x) { return String(x == null ? '' : x); }

  /* ─── DOM helpers ───────────────────────────────────────── */
  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function _el(id) { return document.getElementById(id); }
  function _setHTML(id, html) { var e = _el(id); if (e) e.innerHTML = html; }

  /* ─── Modal helpers ─────────────────────────────────────── */
  function _openModal(overlay) {
    if (!overlay) return;
    overlay.classList.add('ej-open');
    document.body.style.overflow = 'hidden';
  }
  function _closeModal(overlay) {
    if (!overlay) return;
    overlay.classList.remove('ej-open');
    document.body.style.overflow = '';
  }
  function _closeAll() {
    document.querySelectorAll('.ej-modal-overlay.ej-open')
      .forEach(function (o) { _closeModal(o); });
  }

  /* ─── Groups CRUD ───────────────────────────────────────── */
  function getAllGroups() { return _load(); }

  function getActiveGroups() {
    return _load().filter(function (g) {
      return g.status !== 'closed' && g.status !== 'confirmation_sent';
    });
  }

  function createGroup(groupName, expectedPackageCount, notes) {
    var groups = _load();
    var g = {
      id: _uuid(),
      groupName: groupName,
      expectedPackageCount: Number(expectedPackageCount) || 1,
      notes: notes || '',
      status: 'waiting_for_packages',
      packages: [],
      createdAt: _now(),
      updatedAt: _now(),
      confirmedAt: null
    };
    groups.unshift(g);
    _save(groups);
    /* Persist to server in background (optimistic UI already updated) */
    _apiCall('POST', '/api/package-groups', g).then(function (data) {
      if (!data || !data.ok) {
        _showToast('No se pudo guardar el grupo en el servidor.', 'error');
        _reloadFromServer();
      }
    }).catch(function () {
      _showToast('No se pudo guardar el grupo. Verifica tu conexión.', 'error');
      _reloadFromServer();
    });
    return g;
  }

  function _updateGroup(id, patch) {
    var groups = _load();
    var idx = groups.findIndex(function (g) { return g.id === id; });
    if (idx < 0) return null;
    Object.assign(groups[idx], patch, { updatedAt: _now() });
    _save(groups);
    var updated = groups[idx];
    /* Persist to server in background (optimistic UI already updated) */
    _apiCall('PATCH', '/api/package-groups/' + id, updated).then(function (data) {
      if (!data || !data.ok) {
        _showToast('No se pudo guardar el cambio en el servidor.', 'error');
        _reloadFromServer();
      }
    }).catch(function () {
      _showToast('No se pudo guardar el cambio. Verifica tu conexión.', 'error');
      _reloadFromServer();
    });
    return updated;
  }

  function addPackagesToGroup(groupId, pkgObjs) {
    var g = _load().find(function (x) { return x.id === groupId; });
    if (!g) return null;
    var existingIds = new Set(g.packages.map(function (p) { return _pid(p.idwarehousereceipt); }));
    var toAdd = pkgObjs.filter(function (p) { return !existingIds.has(_pid(p.idwarehousereceipt)); });
    var updated = (g.packages || []).concat(toAdd);
    return _updateGroup(groupId, { packages: updated });
  }

  function removePackageFromGroup(groupId, pkgId) {
    var g = _load().find(function (x) { return x.id === groupId; });
    if (!g) return;
    _updateGroup(groupId, {
      packages: g.packages.filter(function (p) { return _pid(p.idwarehousereceipt) !== _pid(pkgId); })
    });
  }

  function deleteGroup(groupId) {
    _save(_load().filter(function (g) { return g.id !== groupId; }));
    /* Remove from server in background */
    _apiCall('DELETE', '/api/package-groups/' + groupId).then(function (data) {
      if (!data || !data.ok) {
        _showToast('No se pudo cancelar el grupo en el servidor.', 'error');
        _reloadFromServer();
      }
    }).catch(function () {
      _showToast('No se pudo cancelar el grupo. Verifica tu conexión.', 'error');
      _reloadFromServer();
    });
  }

  function advanceToInvoices(groupId) {
    return _updateGroup(groupId, { status: 'invoices_pending' });
  }

  function markReadyToConfirm(groupId) {
    return _updateGroup(groupId, { status: 'ready_to_confirm' });
  }

  function markConfirmationSent(groupId) {
    return _updateGroup(groupId, { status: 'confirmation_sent', confirmedAt: _now() });
  }

  function markGroupClosed(groupId) {
    return _updateGroup(groupId, { status: 'closed', closedAt: _now() });
  }

  /* ─── Which packages are already in an active group ─────── */
  function getLockedPackageIds() {
    var locked = new Set();
    getActiveGroups().forEach(function (g) {
      (g.packages || []).forEach(function (p) {
        if (p.idwarehousereceipt) locked.add(_pid(p.idwarehousereceipt));
      });
    });
    return locked;
  }

  /* ─── Date formatting ────────────────────────────────────── */
  function _fmtDate(s) {
    if (!s) return '—';
    try {
      var d = new Date(s);
      return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) { return String(s).slice(0, 10); }
  }
  function _fmtTs(s) {
    if (!s) return '—';
    try {
      var d = new Date(s);
      return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }) +
             ' ' + d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
    } catch (_) { return String(s).slice(0, 16).replace('T', ' '); }
  }

  /* ─── Progress helpers ───────────────────────────────────── */
  function _progressPct(group) {
    var cnt = (group.packages || []).length;
    var exp = group.expectedPackageCount || 1;
    return Math.min(100, Math.round((cnt / exp) * 100));
  }
  function _progressClass(pct) {
    if (pct >= 100) return 'ej-complete';
    if (pct >= 70) return 'ej-almost';
    return '';
  }

  /* ─── Step indicator ─────────────────────────────────────── */
  function _stepsHTML(currentStatus) {
    var steps = [
      { key: 'waiting_for_packages', label: 'Agregar paquetes' },
      { key: 'invoices_pending',     label: 'Verificar facturas' },
      { key: 'ready_to_confirm',     label: 'Confirmar' },
      { key: 'confirmation_sent',    label: 'Confirmado' }
    ];
    var order = steps.map(function (s) { return s.key; });
    var activeIdx = order.indexOf(currentStatus);
    var stepNum  = activeIdx + 1;
    var totalSteps = steps.length;
    var html = '<div class="ej-steps">';
    steps.forEach(function (s, i) {
      var isDone   = i < activeIdx;
      var isActive = i === activeIdx;
      var cls = isDone ? 'ej-step ej-step-done' : (isActive ? 'ej-step ej-step-active' : 'ej-step');
      html += '<div class="' + cls + '">' +
        '<div class="ej-step-dot">' + (isDone ? '<i class="fas fa-check"></i>' : String(i + 1)) + '</div>' +
        '<span>' + s.label + '</span>' +
        '</div>';
      if (i < steps.length - 1) html += '<div class="ej-step-connector"></div>';
    });
    // Explicit "Paso X de Y" counter below the step strip
    html += '</div>';
    if (activeIdx >= 0) {
      html += '<p style="text-align:right;font-size:0.72rem;color:#7c3aed;font-weight:600;' +
        'margin:-0.25rem 1.25rem 0.25rem;opacity:0.8">Paso ' + stepNum + ' de ' + totalSteps + '</p>';
    }
    return html;
  }

  /* ─── Invoice status badge ───────────────────────────────── */
  function _invoiceBadge(pkg) {
    var cnt = pkg.invoicesCount;
    if (cnt === null || cnt === undefined) {
      return '<span class="ej-inv-badge ej-inv-unk"><i class="fas fa-question"></i> Desconocido</span>';
    }
    if (Number(cnt) > 0) {
      return '<span class="ej-inv-badge ej-inv-ok"><i class="fas fa-check"></i> Subida</span>';
    }
    return '<span class="ej-inv-badge ej-inv-warn"><i class="fas fa-exclamation-triangle"></i> Pendiente</span>';
  }

  /* ─── Render a single group card ─────────────────────────── */
  function _renderGroupCard(group) {
    var cnt  = (group.packages || []).length;
    var exp  = group.expectedPackageCount;
    var pct  = _progressPct(group);
    var pcls = _progressClass(pct);
    var isReadOnly = group.status === 'confirmation_sent' || group.status === 'closed';
    var statusLabel = STATUS_LABEL[group.status] || group.status;
    var statusCls   = STATUS_CLASS[group.status] || 'ej-status-waiting';
    var statusIcon  = STATUS_ICON[group.status]  || 'fa-circle';

    /* Build a live status lookup so we can detect post-addition status changes */
    var _liveLookup = {};
    _allPackages.forEach(function (p) { _liveLookup[_pid(p.idwarehousereceipt)] = p; });

    /* Expand/collapse state — default expanded */
    var isExpanded = (_expandedCards[group.id] !== false);

    var isClosed = group.status === 'closed';
    var html = '<div class="ej-group-card' + (isReadOnly ? ' ej-confirmed' : '') + (isClosed ? ' ej-closed-card-wrap' : '') + '" id="ej-card-' + _esc(group.id) + '">';

    /* Step indicator */
    if (!isReadOnly) html += _stepsHTML(group.status);

    /* Card header */
    html += '<div class="ej-group-card-header">' +
      '<div>' +
        '<p class="ej-group-name">' + _esc(group.groupName) + '</p>' +
        '<p class="ej-group-meta">Creado ' + _fmtDate(group.createdAt) +
          (group.notes ? ' · <em>' + _esc(group.notes) + '</em>' : '') + '</p>' +
      '</div>' +
      '<div class="ej-card-header-right">' +
        '<span class="ej-group-status-badge ' + statusCls + '">' +
          '<i class="fas ' + statusIcon + '"></i> ' + _esc(statusLabel) +
        '</span>' +
        (!isReadOnly ?
          '<button class="ej-btn-edit-group ej-icon-btn" aria-label="Editar grupo" ' +
            'data-gid="' + _esc(group.id) + '" title="Editar nombre y notas">' +
            '<i class="fas fa-pencil-alt"></i>' +
          '</button>' : '') +
        (cnt > 0 ?
          '<button class="ej-btn-toggle-card ej-icon-btn" aria-label="' + (isExpanded ? 'Colapsar' : 'Expandir') + '" ' +
            'data-gid="' + _esc(group.id) + '">' +
            '<i class="fas ' + (isExpanded ? 'fa-chevron-up' : 'fa-chevron-down') + '"></i>' +
          '</button>' : '') +
      '</div>' +
    '</div>';

    /* ── SUCCESS state ── */
    if (group.status === 'confirmation_sent') {
      html += '<div class="px-5 pb-5">' +
        '<div class="ej-confirmed-card">' +
          '<div class="ej-confirmed-icon"><i class="fas fa-hourglass-half"></i></div>' +
          '<p class="ej-confirmed-title">Confirmado — en proceso</p>' +
          '<p class="ej-confirmed-desc">Tu solicitud fue enviada a CRBOX. Nuestro equipo está revisando las facturas y coordinando el envío del grupo.</p>' +
          '<p class="ej-confirmed-ts"><i class="fas fa-check-circle"></i> Confirmado el ' + _fmtTs(group.confirmedAt) + '</p>' +
        '</div>' +
        '<div class="ej-confirmed-actions">' +
          '<button class="ej-btn ej-btn-outline ej-btn-sm ej-btn-view-summary" data-gid="' + _esc(group.id) + '">' +
            '<i class="fas fa-list"></i> <span class="ej-btn-label">Ver resumen</span>' +
          '</button>' +
          '<button class="ej-btn ej-btn-purple ej-btn-sm ej-btn-create-new">' +
            '<i class="fas fa-plus"></i> <span class="ej-btn-label">Crear nuevo grupo</span>' +
          '</button>' +
          '<button class="ej-btn ej-btn-ghost ej-btn-sm ej-btn-mark-closed" data-gid="' + _esc(group.id) + '" ' +
            'title="Mover al historial una vez que CRBOX procesó el envío">' +
            '<i class="fas fa-archive"></i> <span class="ej-btn-label">Marcar como procesado</span>' +
          '</button>' +
        '</div>' +
      '</div>';
      html += '</div>';
      return html;
    }

    /* ── CLOSED state ── */
    if (group.status === 'closed') {
      html += '<div class="px-5 pb-5">' +
        '<div class="ej-closed-card">' +
          '<div class="ej-closed-icon"><i class="fas fa-check-double"></i></div>' +
          '<p class="ej-closed-title">Envío procesado</p>' +
          '<p class="ej-closed-desc">Este grupo fue procesado por CRBOX y archivado.</p>' +
          (group.confirmedAt ? '<p class="ej-confirmed-ts" style="justify-content:center"><i class="fas fa-calendar-check"></i> Confirmado el ' + _fmtTs(group.confirmedAt) + '</p>' : '') +
        '</div>' +
      '</div>';
      html += '</div>';
      return html;
    }

    /* ── Progress bar ── */
    html += '<div class="ej-progress-wrap">' +
      '<div class="ej-progress-label">' +
        '<span>' + cnt + ' de ' + exp + ' paquetes agregados ' +
          (pct >= 100 ? '<span class="ej-progress-checkmark"><i class="fas fa-check-circle"></i></span>' : '') +
        '</span>' +
        '<strong>' + pct + '%</strong>' +
      '</div>' +
      '<div class="ej-progress-track">' +
        '<div class="ej-progress-fill ' + pcls + '" style="width:' + pct + '%"></div>' +
      '</div>' +
    '</div>';

    /* ── In-card auto-added notification strip ── */
    if (!isReadOnly && _autoAddedByGroup[group.id] && _autoAddedByGroup[group.id].length > 0) {
      var autoEntries = _autoAddedByGroup[group.id];
      html += '<div class="ej-auto-added-strip" data-gid="' + _esc(group.id) + '">' +
        '<i class="fas fa-magic"></i>' +
        '<div class="ej-auto-added-text">' +
          '<strong>' + autoEntries.length +
            (autoEntries.length === 1 ? ' paquete agregado automáticamente' : ' paquetes agregados automáticamente') +
          '</strong>' +
          ' — ' + autoEntries.map(function (x) { return _esc(x.tracking); }).join(', ') +
        '</div>' +
        '<button class="ej-btn-dismiss-auto-add ej-icon-btn" data-gid="' + _esc(group.id) + '" ' +
          'title="Descartar" aria-label="Descartar notificación">' +
          '<i class="fas fa-times" style="font-size:0.7rem"></i>' +
        '</button>' +
      '</div>';
    }

    /* ── Card-level amber banner when any grouped package changed status ── */
    if (!isReadOnly && cnt > 0) {
      var changedPkgs = (group.packages || []).filter(function (p) {
        var livePkg = _liveLookup[_pid(p.idwarehousereceipt)];
        var sid = livePkg ? livePkg.statusId : p.statusId;
        return (sid !== undefined && sid !== null && sid !== 1);
      });
      if (changedPkgs.length > 0) {
        html += '<div style="margin:0 1.25rem 0.75rem;background:#fffbeb;border:1px solid #fbbf24;' +
          'border-radius:0.6rem;padding:0.6rem 0.9rem;display:flex;align-items:flex-start;gap:0.6rem;">' +
          '<i class="fas fa-exclamation-triangle" style="color:#d97706;flex-shrink:0;margin-top:0.15rem"></i>' +
          '<div style="font-size:0.82rem;color:#92400e;">' +
            '<strong>' + changedPkgs.length + (changedPkgs.length === 1 ? ' paquete' : ' paquetes') + ' cambió de estado.</strong> ' +
            'Uno o más paquetes en este grupo ya no están en Miami. Verifica con CRBOX antes de continuar.' +
          '</div>' +
        '</div>';
      }
    }

    /* ── Packages in group ── */
    if (cnt > 0) {
      html += '<div class="ej-pkg-list"' + (isExpanded ? '' : ' style="display:none"') + '>';
      (group.packages || []).forEach(function (p) {
        // Reconcile stored statusId against live pool; fall back to snapshot if package
        // has not yet been loaded (first render before API returns)
        var livePkg   = _liveLookup[_pid(p.idwarehousereceipt)];
        var liveStatusId = livePkg ? livePkg.statusId : p.statusId;
        var warn = (liveStatusId !== undefined && liveStatusId !== null && liveStatusId !== 1);
        html += '<div class="ej-pkg-row' + (warn ? ' ej-pkg-warn' : '') + '">' +
          '<span class="status-badge status-badge-blue" style="font-size:0.7rem;padding:0.15rem 0.5rem">MIAMI</span>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="ej-pkg-tracking">' + _esc(p.trackingNumber || p.number || '—') + '</div>' +
            '<div class="ej-pkg-sub">' + _esc([p.number, p.carrierName].filter(Boolean).join(' · ')) + '</div>' +
          '</div>' +
          '<span class="ej-pkg-sub">' + _fmtDate(p.bestDate) + '</span>' +
          (isReadOnly ? '' :
            '<button class="ej-pkg-remove ej-btn-remove-pkg" aria-label="Quitar paquete"' +
              ' data-gid="' + _esc(group.id) + '" data-pid="' + _esc(String(p.idwarehousereceipt)) + '">' +
              '<i class="fas fa-times"></i>' +
            '</button>') +
          (warn ? '<span title="Este paquete cambió de estado" class="text-yellow-500 text-xs ml-1"><i class="fas fa-exclamation-triangle"></i></span>' : '') +
        '</div>';
      });
      html += '</div>';
    }

    /* ── Action buttons per status ── */
    html += '<div class="ej-group-actions">';

    if (group.status === 'waiting_for_packages') {
      html += '<button class="ej-btn ej-btn-purple ej-btn-sm ej-btn-add-pkgs" data-gid="' + _esc(group.id) + '">' +
        '<i class="fas fa-plus"></i> <span class="ej-btn-label">Agregar paquetes en Miami</span></button>';
      if (cnt > 0) {
        html += '<button class="ej-btn ej-btn-outline ej-btn-sm ej-btn-prepare" data-gid="' + _esc(group.id) + '">' +
          '<i class="fas fa-clipboard-check"></i> <span class="ej-btn-label">Preparar grupo</span></button>';
      }
    }

    if (group.status === 'invoices_pending') {
      html += '<button class="ej-btn ej-btn-primary ej-btn-sm ej-btn-invoice-step" data-gid="' + _esc(group.id) + '">' +
        '<i class="fas fa-file-invoice"></i> <span class="ej-btn-label">Verificar facturas</span></button>';
      html += '<button class="ej-btn ej-btn-ghost ej-btn-sm ej-btn-back-add" data-gid="' + _esc(group.id) + '">' +
        '<i class="fas fa-arrow-left"></i> <span class="ej-btn-label">Agregar más</span></button>';
    }

    if (group.status === 'ready_to_confirm') {
      html += '<button class="ej-btn ej-btn-primary ej-btn-sm ej-btn-invoice-step" data-gid="' + _esc(group.id) + '">' +
        '<i class="fas fa-paper-plane"></i> <span class="ej-btn-label">Enviar confirmación</span></button>';
    }

    if (!isReadOnly) {
      html += '<button class="ej-btn ej-btn-danger-outline ej-btn-delete-group" data-gid="' + _esc(group.id) + '">' +
        '<i class="fas fa-trash-alt"></i> Cancelar grupo</button>';
    }

    html += '</div></div>'; // close actions + card
    return html;
  }

  /* ─── Render full section body ───────────────────────────── */
  function renderSection() {
    var container = _el('ej-group-list-container');
    if (!container) return;

    /* Prune ambiguous-banner list: remove packages no longer in Miami or already locked */
    if (_ambiguousNewMiamiPkgs.length > 0) {
      var lockedNow = getLockedPackageIds();
      var miamiNow = new Set(
        _allPackages.filter(function (p) { return p.statusId === 1; })
                    .map(function (p) { return _pid(p.idwarehousereceipt); })
      );
      var ambigBefore = _ambiguousNewMiamiPkgs.length;
      _ambiguousNewMiamiPkgs = _ambiguousNewMiamiPkgs.filter(function (p) {
        var pid = _pid(p.idwarehousereceipt);
        return miamiNow.has(pid) && !lockedNow.has(pid);
      });
      if (_ambiguousNewMiamiPkgs.length !== ambigBefore) _saveAmbiguous();
    }

    /* Prune stale auto-added entries: remove refs to packages no longer in group */
    var allGrps = getAllGroups();
    var autoAddedChanged = false;
    Object.keys(_autoAddedByGroup).forEach(function (gid) {
      var grp = allGrps.find(function (g) { return g.id === gid; });
      if (!grp) { delete _autoAddedByGroup[gid]; autoAddedChanged = true; return; }
      var pkgIds = new Set((grp.packages || []).map(function (p) { return _pid(p.idwarehousereceipt); }));
      var before = _autoAddedByGroup[gid].length;
      _autoAddedByGroup[gid] = _autoAddedByGroup[gid].filter(function (x) { return pkgIds.has(x.pid); });
      if (_autoAddedByGroup[gid].length === 0) { delete _autoAddedByGroup[gid]; autoAddedChanged = true; }
      else if (_autoAddedByGroup[gid].length !== before) { autoAddedChanged = true; }
    });
    if (autoAddedChanged) _saveAutoAdded();

    var groups = getAllGroups();
    var nonClosedGroups = groups.filter(function (g) { return g.status !== 'closed'; });
    var closedGroups    = groups.filter(function (g) { return g.status === 'closed'; });
    if (groups.length === 0) {
      container.innerHTML =
        '<div class="ej-empty-state">' +
          '<div class="ej-empty-icon"><i class="fas fa-layer-group"></i></div>' +
          '<p class="ej-empty-title">Aún no tienes grupos de envío</p>' +
          '<p class="ej-empty-desc">Crea un grupo para organizar los paquetes que quieres que CRBOX procese juntos.</p>' +
          '<button class="ej-btn ej-btn-purple" id="ej-create-btn-empty">' +
            '<i class="fas fa-plus"></i> <span class="ej-btn-label">Crear mi primer grupo</span>' +
          '</button>' +
        '</div>';
      var emptyBtn = _el('ej-create-btn-empty');
      if (emptyBtn) emptyBtn.addEventListener('click', openCreateModal);
    } else {
      // Summary bar: counter excludes closed groups
      var confirmedGroups = nonClosedGroups.filter(function (g) { return g.status === 'confirmation_sent'; });
      var openGroups      = nonClosedGroups.filter(function (g) { return g.status !== 'confirmation_sent'; });
      var counterParts = [];
      if (openGroups.length > 0) {
        counterParts.push(openGroups.length + (openGroups.length === 1 ? ' grupo activo' : ' grupos activos'));
      }
      if (confirmedGroups.length > 0) {
        counterParts.push(confirmedGroups.length + ' en proceso');
      }
      if (counterParts.length === 0 && closedGroups.length > 0) {
        counterParts.push('Sin grupos activos');
      } else if (counterParts.length === 0) {
        counterParts.push(nonClosedGroups.length + (nonClosedGroups.length === 1 ? ' grupo en total' : ' grupos en total'));
      }
      var counterText = counterParts.join(' · ');
      var summaryBar =
        '<div class="ej-groups-summary-bar" style="display:flex;align-items:center;justify-content:space-between;' +
          'padding:0.55rem 1.25rem;background:#f5f3ff;border-bottom:1px solid #ede9fe;font-size:0.85rem;">' +
          '<span style="color:#5b21b6;font-weight:600;">' +
            '<i class="fas fa-layer-group mr-1"></i> ' + counterText +
          '</span>' +
          '<button class="ej-btn ej-btn-outline ej-btn-sm ej-btn-ver-grupos" id="ej-ver-mis-grupos-btn">' +
            '<i class="fas fa-chevron-down mr-1"></i>Ver mis grupos' +
          '</button>' +
        '</div>';
      /* Section-level banner: new Miami packages with multiple eligible groups */
      var ambigHtml = '';
      if (_ambiguousNewMiamiPkgs.length > 0) {
        var ambigCount = _ambiguousNewMiamiPkgs.length;
        var firstAmbigPkg = _ambiguousNewMiamiPkgs[0];
        ambigHtml =
          '<div class="ej-ambiguous-banner" id="ej-ambiguous-banner">' +
            '<i class="fas fa-exclamation-circle" style="flex-shrink:0"></i>' +
            '<div class="ej-ambiguous-text">' +
              '<strong>' + ambigCount + (ambigCount === 1 ? ' nuevo paquete en Miami sin grupo' : ' nuevos paquetes en Miami sin grupo') + '</strong>' +
              ' — agrégalo manualmente.' +
            '</div>' +
            '<button class="ej-btn-open-selector-ambig ej-btn ej-btn-outline ej-btn-sm" ' +
              'data-pid="' + _esc(_pid(firstAmbigPkg.idwarehousereceipt)) + '">' +
              '<i class="fas fa-plus"></i> Agregar' +
            '</button>' +
            '<button class="ej-btn-dismiss-ambig ej-icon-btn" title="Descartar" aria-label="Descartar notificación">' +
              '<i class="fas fa-times" style="font-size:0.7rem"></i>' +
            '</button>' +
          '</div>';
      }

      var html = summaryBar + ambigHtml + '<div class="ej-group-list">';
      nonClosedGroups.forEach(function (g) { html += _renderGroupCard(g); });
      html += '</div>';

      // History section for closed groups
      if (closedGroups.length > 0) {
        html += '<div class="ej-history-section" id="ej-history-section">' +
          '<button class="ej-history-toggle" id="ej-history-toggle-btn" aria-expanded="' + _historyExpanded + '">' +
            '<span class="ej-history-toggle-left">' +
              '<i class="fas fa-history"></i>' +
              ' Historial de envíos' +
              ' <span class="ej-history-count">' + closedGroups.length + '</span>' +
            '</span>' +
            '<i class="fas ' + (_historyExpanded ? 'fa-chevron-up' : 'fa-chevron-down') + ' ej-history-chevron"></i>' +
          '</button>' +
          '<div class="ej-history-list" id="ej-history-list"' + (_historyExpanded ? '' : ' style="display:none"') + '>';
        closedGroups.forEach(function (g) { html += _renderGroupCard(g); });
        html += '</div>' +
        '</div>';
      }

      container.innerHTML = html;
      var verBtn = _el('ej-ver-mis-grupos-btn');
      if (verBtn) {
        verBtn.addEventListener('click', function () {
          var firstCard = container.querySelector('.ej-group-card');
          if (firstCard) firstCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    }
    _updateDashboardCard();
  }

  /* ─── Dashboard card update ──────────────────────────────── */
  function _updateDashboardCard() {
    var countEl = _el('ej-dash-group-count');
    if (!countEl) return;
    var active = getActiveGroups();
    if (active.length === 0) {
      countEl.textContent = 'Sin grupos activos';
    } else {
      countEl.textContent = active.length + (active.length === 1 ? ' grupo activo' : ' grupos activos');
    }
  }

  /* ─── Create Group modal ─────────────────────────────────── */
  function openCreateModal() {
    var overlay = _el('ej-create-modal-overlay');
    if (!overlay) return;
    // Reset form
    var form = _el('ej-create-form');
    if (form) form.reset();
    var errEl = _el('ej-create-error');
    if (errEl) errEl.textContent = '';
    _openModal(overlay);
    setTimeout(function () {
      var inp = _el('ej-create-group-name');
      if (inp) inp.focus();
    }, 260);
  }

  function _handleCreateSubmit() {
    var nameEl = _el('ej-create-group-name');
    var cntEl  = _el('ej-create-group-count');
    var notesEl = _el('ej-create-group-notes');
    var errEl   = _el('ej-create-error');
    var name = (nameEl ? nameEl.value.trim() : '');
    var cnt  = parseInt(cntEl ? cntEl.value : '1', 10);
    if (!name) { if (errEl) errEl.textContent = 'Escribe un nombre para el grupo.'; return; }
    if (!cnt || cnt < 1) { if (errEl) errEl.textContent = 'Indica cuántos paquetes esperas.'; return; }
    var notes = notesEl ? notesEl.value.trim() : '';
    var newGroup = createGroup(name, cnt, notes);
    // Auto-attach package carried over from the "add-to-group" row button flow
    if (_postCreatePkg && newGroup) {
      addPackagesToGroup(newGroup.id, [{
        idwarehousereceipt: _postCreatePkg.idwarehousereceipt,
        trackingNumber:     _postCreatePkg.trackingNumber,
        number:             _postCreatePkg.number,
        carrierName:        _postCreatePkg.carrierName,
        bestDate:           _postCreatePkg.bestDate,
        statusId:           _postCreatePkg.statusId,
        invoicesCount:      _postCreatePkg.invoicesCount
      }]);
      _postCreatePkg = null;
    }
    _closeModal(_el('ej-create-modal-overlay'));
    renderSection();
    _showToast('Grupo "' + name + '" creado correctamente.', 'success');
  }

  /* ─── Package Selector modal ─────────────────────────────── */
  var _selectorGroupId = null;
  var _selectedPkgIds = new Set();

  function openPackageSelector(groupId) {
    _selectorGroupId = groupId;
    _selectedPkgIds = new Set();
    // Always reset confirm button to disabled on each open
    var selBtn = _el('ej-selector-confirm-btn');
    if (selBtn) selBtn.disabled = true;
    _renderSelectorList();
    _openModal(_el('ej-selector-modal-overlay'));
  }

  function _renderSelectorList() {
    var listEl = _el('ej-selector-list');
    if (!listEl) return;
    var locked = getLockedPackageIds();
    var group  = getAllGroups().find(function (g) { return g.id === _selectorGroupId; });
    var ownIds = new Set(group ? (group.packages || []).map(function (p) { return _pid(p.idwarehousereceipt); }) : []);

    var miamiPkgs = _allPackages.filter(function (p) { return p.statusId === 1; });

    if (miamiPkgs.length === 0) {
      listEl.innerHTML =
        '<div class="ej-empty-state" style="padding:1.5rem">' +
          '<div class="ej-empty-icon"><i class="fas fa-map-marker-alt"></i></div>' +
          '<p class="ej-empty-title">No tienes paquetes en Miami</p>' +
          '<p class="ej-empty-desc">Los paquetes deben haber llegado a nuestras instalaciones en Miami para poder agregarlos a un grupo. El estado en tu casillero aparecerá como "MIAMI".</p>' +
        '</div>';
      return;
    }

    var html = '';
    miamiPkgs.forEach(function (p) {
      var pid = _pid(p.idwarehousereceipt);  // always a string
      var isOwn      = ownIds.has(pid);
      var isLocked   = !isOwn && locked.has(pid);
      var isSelected = _selectedPkgIds.has(pid);
      var disabledCls = isLocked ? ' ej-disabled' : '';
      var selectedCls = isSelected ? ' ej-selected' : '';
      html += '<div class="ej-sel-row' + disabledCls + selectedCls + '" data-pid="' + _esc(pid) + '">';
      if (isLocked) {
        html += '<div class="ej-sel-lock ej-tooltip"><i class="fas fa-lock"></i>' +
          '<span class="ej-tooltip-text">Este paquete ya pertenece a otro grupo.</span></div>';
      } else {
        html += '<div class="ej-check-ring"><i class="fas fa-check"></i></div>';
      }
      html += '<span class="status-badge status-badge-blue" style="font-size:0.68rem;padding:0.1rem 0.45rem;flex-shrink:0">MIAMI</span>' +
        '<div class="ej-sel-info">' +
          '<div class="ej-sel-tracking">' + _esc(p.trackingNumber || '—') + '</div>' +
          '<div class="ej-sel-sub">' + _esc([p.number, p.carrierName].filter(Boolean).join(' · ')) + '</div>' +
        '</div>' +
        '<div class="ej-sel-date">' + _fmtDate(p.bestDate) + '</div>' +
      '</div>';
    });
    listEl.innerHTML = html;

    // Delegation for row clicks
    listEl.onclick = function (e) {
      var row = e.target.closest('.ej-sel-row');
      if (!row || row.classList.contains('ej-disabled')) return;
      var pid = row.dataset.pid;
      if (_selectedPkgIds.has(pid)) {
        _selectedPkgIds.delete(pid);
        row.classList.remove('ej-selected');
      } else {
        _selectedPkgIds.add(pid);
        row.classList.add('ej-selected');
      }
      _el('ej-selector-confirm-btn').disabled = (_selectedPkgIds.size === 0);
    };
  }

  function _handleSelectorConfirm() {
    if (!_selectorGroupId || _selectedPkgIds.size === 0) return;
    var toAdd = _allPackages.filter(function (p) {
      return _selectedPkgIds.has(_pid(p.idwarehousereceipt));
    }).map(function (p) {
      return {
        idwarehousereceipt: p.idwarehousereceipt,
        trackingNumber:     p.trackingNumber,
        number:             p.number,
        carrierName:        p.carrierName,
        bestDate:           p.bestDate,
        statusId:           p.statusId,
        invoicesCount:      p.invoicesCount
      };
    });
    addPackagesToGroup(_selectorGroupId, toAdd);
    _closeModal(_el('ej-selector-modal-overlay'));
    renderSection();
    _showToast(toAdd.length + (toAdd.length === 1 ? ' paquete agregado' : ' paquetes agregados') + ' al grupo.', 'success');
  }

  /* ─── Add to group modal (from table row) ────────────────── */
  var _pendingPkg = null;

  function openAddToGroupModal(pkg) {
    // Block if package already belongs to an active group
    if (pkg && getLockedPackageIds().has(_pid(pkg.idwarehousereceipt))) {
      _showToast('Este paquete ya pertenece a otro grupo activo.', 'warning');
      return;
    }
    _pendingPkg = pkg;
    var el = _el('ej-addto-group-list');
    if (!el) return;
    var groups = getActiveGroups().filter(function (g) {
      return g.status === 'waiting_for_packages';
    });
    if (groups.length === 0) {
      el.innerHTML =
        '<p class="text-sm text-gray-500 text-center py-4">No tienes grupos activos. Crea uno primero.</p>';
    } else {
      el.innerHTML = groups.map(function (g) {
        var cnt = (g.packages || []).length;
        return '<button class="ej-sel-row w-full text-left ej-btn-pick-group" data-gid="' + _esc(g.id) + '">' +
          '<div class="ej-check-ring"><i class="fas fa-check"></i></div>' +
          '<div class="ej-sel-info">' +
            '<div class="ej-sel-tracking">' + _esc(g.groupName) + '</div>' +
            '<div class="ej-sel-sub">' + cnt + ' de ' + g.expectedPackageCount + ' paquetes</div>' +
          '</div>' +
        '</button>';
      }).join('');
      el.onclick = function (e) {
        var btn = e.target.closest('.ej-btn-pick-group');
        if (!btn) return;
        var gid = btn.dataset.gid;
        _doAddToGroup(gid);
      };
    }
    _openModal(_el('ej-addto-modal-overlay'));
  }

  function _doAddToGroup(groupId) {
    if (!_pendingPkg) return;
    // Safety-net: reject if package is already locked to another group
    if (getLockedPackageIds().has(_pid(_pendingPkg.idwarehousereceipt))) {
      _pendingPkg = null;
      _closeModal(_el('ej-addto-modal-overlay'));
      _showToast('Este paquete ya pertenece a otro grupo activo.', 'warning');
      return;
    }
    addPackagesToGroup(groupId, [{
      idwarehousereceipt: _pendingPkg.idwarehousereceipt,
      trackingNumber:     _pendingPkg.trackingNumber,
      number:             _pendingPkg.number,
      carrierName:        _pendingPkg.carrierName,
      bestDate:           _pendingPkg.bestDate,
      statusId:           _pendingPkg.statusId,
      invoicesCount:      _pendingPkg.invoicesCount
    }]);
    _pendingPkg = null;
    _closeModal(_el('ej-addto-modal-overlay'));
    renderSection();
    _showToast('Paquete agregado al grupo.', 'success');
  }

  /* ─── Prepare group (warning step) ──────────────────────── */
  function openPrepareModal(groupId) {
    var group = getAllGroups().find(function (g) { return g.id === groupId; });
    if (!group) return;
    var cnt = (group.packages || []).length;
    var exp = group.expectedPackageCount;
    if (cnt >= exp) {
      // All packages present — skip warning, go straight to invoice step
      advanceToInvoices(groupId);
      renderSection();
      openInvoiceModal(groupId);
      return;
    }
    // Show warning
    var bodyEl = _el('ej-prepare-modal-body');
    if (bodyEl) {
      bodyEl.innerHTML =
        '<div class="ej-warning-card">' +
          '<div class="ej-warning-title"><i class="fas fa-exclamation-triangle"></i> Paquetes incompletos</div>' +
          '<p class="ej-warning-desc">Este grupo tiene <strong>' + cnt + ' de ' + exp + '</strong> paquetes esperados. ' +
          'Puedes esperar a que llegue' + (exp - cnt === 1 ? ' el paquete restante' : ' los ' + (exp - cnt) + ' paquetes restantes') +
          ', o continuar con los paquetes actuales.</p>' +
        '</div>';
    }
    var continueBtn = _el('ej-prepare-continue-btn');
    if (continueBtn) {
      continueBtn.textContent = 'Continuar con ' + cnt + ' ' + (cnt === 1 ? 'paquete' : 'paquetes');
      continueBtn.onclick = function () {
        _closeModal(_el('ej-prepare-modal-overlay'));
        advanceToInvoices(groupId);
        renderSection();
        openInvoiceModal(groupId);
      };
    }
    var waitBtn = _el('ej-prepare-wait-btn');
    if (waitBtn) {
      waitBtn.onclick = function () { _closeModal(_el('ej-prepare-modal-overlay')); };
    }
    _openModal(_el('ej-prepare-modal-overlay'));
  }

  /* ─── Invoice step modal ─────────────────────────────────── */
  var _invoiceGroupId = null;

  function openInvoiceModal(groupId) {
    _invoiceGroupId = groupId;
    var group = getAllGroups().find(function (g) { return g.id === groupId; });
    if (!group) return;

    var pkgs = group.packages || [];
    var pendingCount = pkgs.filter(function (p) {
      return p.invoicesCount !== null && p.invoicesCount !== undefined && Number(p.invoicesCount) === 0;
    }).length;

    /* Build invoice checklist */
    var listEl = _el('ej-invoice-list');
    if (listEl) {
      if (pkgs.length === 0) {
        listEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-3">No hay paquetes en este grupo.</p>';
      } else {
        listEl.innerHTML = pkgs.map(function (p) {
          var cnt = p.invoicesCount;
          var isPending = (cnt !== null && cnt !== undefined && Number(cnt) === 0);
          var isUnknown = (cnt === null || cnt === undefined);
          var pid = _esc(_pid(p.idwarehousereceipt));
          var html = '<div class="ej-inv-pkg-block">' +
            '<div class="ej-invoice-row' + (isPending ? ' ej-invoice-row-pending' : '') + '">' +
              _invoiceBadge(p) +
              '<div class="ej-inv-info">' +
                '<div class="ej-inv-tracking">' + _esc(p.trackingNumber || '—') + '</div>' +
                '<div class="ej-inv-sub">' + _esc([p.number, p.carrierName].filter(Boolean).join(' · ')) + '</div>' +
              '</div>' +
            '</div>';
          if (isPending) {
            html += '<label class="ej-inv-ack-row" for="ej-inv-row-chk-' + pid + '">' +
              '<input type="checkbox" id="ej-inv-row-chk-' + pid + '" class="ej-inv-pending-chk" data-pid="' + pid + '">' +
              '<span>Entiendo que este paquete no tiene factura subida</span>' +
            '</label>';
          } else if (isUnknown) {
            html += '<div class="ej-inv-unk-note"><i class="fas fa-info-circle"></i> No hay datos de factura disponibles para este paquete.</div>';
          }
          html += '</div>';
          return html;
        }).join('');
      }
    }

    /* Summary line visibility */
    var summaryEl = _el('ej-invoice-summary');
    if (summaryEl) summaryEl.style.display = pendingCount > 0 ? '' : 'none';

    /* Restore main checkbox state */
    var chk = _el('ej-invoice-confirm-check');
    var alreadyReady = group.status === 'ready_to_confirm';
    if (chk) chk.checked = alreadyReady;

    /* Error area reset */
    var errEl = _el('ej-invoice-error');
    if (errEl) errEl.innerHTML = '';

    /* Update step indicator */
    var stepsEl = _el('ej-invoice-steps');
    if (stepsEl) stepsEl.innerHTML = _stepsHTML(group.status);

    /* Set initial button state */
    _updateInvoiceSendBtn();

    _openModal(_el('ej-invoice-modal-overlay'));
  }

  function _updateInvoiceSendBtn() {
    var mainChk = _el('ej-invoice-confirm-check');
    var sendBtn = _el('ej-invoice-send-btn');
    if (!mainChk || !sendBtn) return;

    var pendingChks = document.querySelectorAll('#ej-invoice-list .ej-inv-pending-chk');
    var totalPending = pendingChks.length;
    var checkedPending = 0;
    pendingChks.forEach(function (c) { if (c.checked) checkedPending++; });

    var allAcknowledged = (totalPending === 0) || (checkedPending === totalPending);
    var canSend = mainChk.checked && allAcknowledged;
    sendBtn.disabled = !canSend;

    /* Update summary line */
    var summaryEl = _el('ej-invoice-summary');
    if (summaryEl && totalPending > 0) {
      var group = _invoiceGroupId ? getAllGroups().find(function (g) { return g.id === _invoiceGroupId; }) : null;
      var pkgs = group ? (group.packages || []) : [];
      var totalPkgs = pkgs.length;
      /* Count strictly: only packages where invoicesCount > 0 */
      var withInvoice = pkgs.filter(function (p) {
        return p.invoicesCount !== null && p.invoicesCount !== undefined && Number(p.invoicesCount) > 0;
      }).length;
      var html = '<span class="ej-inv-sum-ok"><i class="fas fa-check-circle"></i> ' + withInvoice + ' de ' + totalPkgs + ' paquetes con factura</span>';
      if (checkedPending > 0) {
        html += ' · <span class="ej-inv-sum-warn">' + checkedPending + ' sin factura (reconocido)</span>';
      }
      summaryEl.innerHTML = html;
    }

    /* Sync group status so the card-level CTA matches the modal gate:
     * only promote to ready_to_confirm when the send button is actually unblocked */
    if (_invoiceGroupId) {
      var nextStatus = canSend ? 'ready_to_confirm' : 'invoices_pending';
      _updateGroup(_invoiceGroupId, { status: nextStatus });
      var stepsEl = _el('ej-invoice-steps');
      if (stepsEl) stepsEl.innerHTML = _stepsHTML(nextStatus);
    }
  }

  function _handleInvoiceCheckChange() {
    _updateInvoiceSendBtn();
  }

  /* ─── Confirmation email POST ────────────────────────────── */
  function _handleSendConfirmation() {
    var groupId = _invoiceGroupId;
    var group = getAllGroups().find(function (g) { return g.id === groupId; });
    if (!group) return;

    var sendBtn = _el('ej-invoice-send-btn');
    if (sendBtn) {
      sendBtn.classList.add('ej-loading');
      sendBtn.disabled = true;
    }
    var errEl = _el('ej-invoice-error');
    if (errEl) errEl.innerHTML = '';

    // Gather user info from CRBOXAuth / cached DOM elements
    var email      = (window.CRBOXAuth && CRBOXAuth.getEmail ? CRBOXAuth.getEmail() : '') || '';
    var lockerNum  = (_el('ej-locker-cache')    ? _el('ej-locker-cache').textContent.trim()    : '') || '—';
    var clientName = (_el('ej-user-name-cache') ? _el('ej-user-name-cache').textContent.trim() : '') || '';
    var phone      = '—';
    var token      = (window.CRBOXAuth && CRBOXAuth.getToken ? CRBOXAuth.getToken() : '') || '';

    var payload = {
      groupName:            group.groupName,
      expectedPackageCount: group.expectedPackageCount,
      notes:                group.notes,
      lockerNumber:         lockerNum,
      clientName:           clientName,
      clientEmail:          email,
      phone:                phone,
      confirmedAt:          new Date().toISOString(),
      packages:             group.packages
    };

    fetch('/api/package-group-confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'X-Casillero-Email': email
      },
      body: JSON.stringify(payload)
    })
    .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
    .then(function (r) {
      if (sendBtn) { sendBtn.classList.remove('ej-loading'); }
      if (r.ok && r.data.ok) {
        markConfirmationSent(groupId);
        _closeModal(_el('ej-invoice-modal-overlay'));
        renderSection();
        _showToast('Confirmación enviada a CRBOX. Nuestro equipo revisará tu solicitud.', 'success');
      } else {
        _showSendError(group, r.data.error || 'Error al enviar. Intenta de nuevo.');
        if (sendBtn) sendBtn.disabled = false;
      }
    })
    .catch(function (err) {
      if (sendBtn) { sendBtn.classList.remove('ej-loading'); sendBtn.disabled = false; }
      _showSendError(group, 'No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.');
    });
  }

  function _showSendError(group, message) {
    var errEl = _el('ej-invoice-error');
    if (!errEl) return;
    var subject = encodeURIComponent(
      'Cliente solicita enviar paquetes juntos — ' + group.groupName);
    var body = encodeURIComponent(
      'Grupo: ' + group.groupName + '\n' +
      'Paquetes: ' + (group.packages || []).length + ' de ' + group.expectedPackageCount + '\n' +
      'Notas: ' + (group.notes || 'Ninguna') + '\n\n' +
      'Paquetes:\n' +
      (group.packages || []).map(function (p) {
        return '- ' + (p.trackingNumber || p.number || '?') + ' (' + (p.carrierName || '?') + ')';
      }).join('\n'));
    errEl.innerHTML =
      '<div class="ej-error-card mt-3">' +
        '<div class="ej-error-title"><i class="fas fa-exclamation-circle"></i> No se pudo enviar</div>' +
        '<div class="ej-error-desc">' + _esc(message) + '<br><br>' +
          'Puedes escribirnos directamente: ' +
          '<a href="mailto:facturas@crbox.cr?subject=' + subject + '&body=' + body + '">' +
            'facturas@crbox.cr</a>' +
        '</div>' +
      '</div>';
  }

  /* ─── Confirmation summary modal ─────────────────────────── */
  function openSummaryModal(groupId) {
    var group = getAllGroups().find(function (g) { return g.id === groupId; });
    if (!group) return;
    var bodyEl = _el('ej-summary-body');
    if (!bodyEl) return;
    var pkgs = group.packages || [];

    /* Prominent confirmation timestamp banner */
    var html =
      '<div class="ej-summary-confirmed-banner">' +
        '<i class="fas fa-check-circle"></i>' +
        '<span>Confirmado el <strong>' + _fmtTs(group.confirmedAt) + '</strong></span>' +
      '</div>';

    /* Group metadata */
    html +=
      '<table class="ej-summary-table mb-4">' +
        '<tr><th>Nombre del grupo</th><td>' + _esc(group.groupName) + '</td></tr>' +
        (group.notes ? '<tr><th>Notas</th><td>' + _esc(group.notes) + '</td></tr>' : '') +
        '<tr><th>Paquetes incluidos</th><td>' + pkgs.length + ' de ' + group.expectedPackageCount + ' esperados</td></tr>' +
      '</table>';

    /* Package list table */
    if (pkgs.length === 0) {
      html += '<p class="text-sm text-gray-500 text-center py-3">No hay paquetes registrados en este grupo.</p>';
    } else {
      html +=
        '<p class="text-sm font-semibold text-gray-700 mb-2">Paquetes en el grupo:</p>' +
        '<div class="ej-summary-pkg-wrap">' +
          '<table class="ej-summary-pkg-table">' +
            '<thead><tr>' +
              '<th>#</th>' +
              '<th>Tracking</th>' +
              '<th>Carrier</th>' +
              '<th>Fecha esperada</th>' +
            '</tr></thead>' +
            '<tbody>' +
            pkgs.map(function (p, i) {
              return '<tr>' +
                '<td class="ej-spkg-num">' + (i + 1) + '</td>' +
                '<td class="ej-spkg-tracking">' + _esc(p.trackingNumber || p.number || '—') + '</td>' +
                '<td class="ej-spkg-carrier">' + _esc(p.carrierName || '—') + '</td>' +
                '<td class="ej-spkg-date">' + _fmtDate(p.bestDate) + '</td>' +
              '</tr>';
            }).join('') +
            '</tbody>' +
          '</table>' +
        '</div>';
    }

    bodyEl.innerHTML = html;
    _openModal(_el('ej-summary-modal-overlay'));
  }

  /* ─── Edit Group modal ───────────────────────────────────── */
  var _editGroupId = null;

  function openEditModal(groupId) {
    var group = getAllGroups().find(function (g) { return g.id === groupId; });
    if (!group) return;
    _editGroupId = groupId;
    var nameEl  = _el('ej-edit-group-name');
    var notesEl = _el('ej-edit-group-notes');
    var errEl   = _el('ej-edit-error');
    if (nameEl)  nameEl.value  = group.groupName || '';
    if (notesEl) notesEl.value = group.notes     || '';
    if (errEl)   errEl.textContent = '';
    _openModal(_el('ej-edit-modal-overlay'));
    setTimeout(function () {
      if (nameEl) nameEl.focus();
    }, 260);
  }

  function _handleEditSubmit() {
    var nameEl  = _el('ej-edit-group-name');
    var notesEl = _el('ej-edit-group-notes');
    var errEl   = _el('ej-edit-error');
    var name  = (nameEl  ? nameEl.value.trim()  : '');
    var notes = (notesEl ? notesEl.value.trim() : '');
    if (!name) {
      if (errEl) errEl.textContent = 'El nombre del grupo no puede estar vacío.';
      return;
    }
    _updateGroup(_editGroupId, { groupName: name, notes: notes });
    _closeModal(_el('ej-edit-modal-overlay'));
    renderSection();
    _showToast('Grupo actualizado correctamente.', 'success');
  }

  /* ─── Delete group confirm ───────────────────────────────── */
  function openDeleteConfirm(groupId) {
    var group = getAllGroups().find(function (g) { return g.id === groupId; });
    if (!group) return;
    var bodyEl = _el('ej-delete-body');
    if (bodyEl) {
      bodyEl.innerHTML =
        '<p class="text-sm text-gray-600">¿Confirmas que deseas cancelar el grupo <strong>' +
        _esc(group.groupName) + '</strong>? Esta acción no se puede deshacer.</p>';
    }
    var confirmBtn = _el('ej-delete-confirm-btn');
    if (confirmBtn) {
      confirmBtn.onclick = function () {
        deleteGroup(groupId);
        _closeAll();
        renderSection();
        _showToast('Grupo cancelado.', 'info');
      };
    }
    _openModal(_el('ej-delete-modal-overlay'));
  }

  /* ─── Auto-assign helpers ────────────────────────────────── */
  function _saveSeenMiamiIds(set) {
    try { sessionStorage.setItem(_SEEN_MIAMI_KEY, JSON.stringify(Array.from(set))); }
    catch (_e) {}
  }

  function _saveAutoAdded() {
    try { sessionStorage.setItem(_AUTO_ADDED_KEY, JSON.stringify(_autoAddedByGroup)); }
    catch (_e) {}
  }

  function _saveAmbiguous() {
    try { sessionStorage.setItem(_AMBIGUOUS_KEY, JSON.stringify(_ambiguousNewMiamiPkgs)); }
    catch (_e) {}
  }

  function _checkAutoAssign() {
    var miamiPkgs = _allPackages.filter(function (p) { return p.statusId === 1; });

    /* ── Prevent retroactive assignment on first session load ──────────
     * On first call the sessionStorage key is absent (rawSeen === null).
     * We must only seed the baseline when we have a real package snapshot;
     * if packages haven't loaded yet (_allPackages empty / miamiPkgs empty)
     * we skip writing the key entirely and return — the next call that has
     * actual package data will create the baseline. This avoids a race where
     * init() fires _checkAutoAssign() before setPackages() has been called,
     * which would seed an empty set and then treat all Miami packages as
     * "newly arrived" when setPackages() finally runs. */
    var rawSeen = null;
    try { rawSeen = sessionStorage.getItem(_SEEN_MIAMI_KEY); } catch (_e) {}

    if (rawSeen === null) {
      if (_allPackages.length === 0) {
        /* Package data not yet loaded at all — defer seeding to the next call.
         * We must not write an empty seen set here or a future Miami transition
         * would be treated as baseline instead of "newly arrived". */
        return false;
      }
      /* First call with real package data loaded. Seed current Miami IDs
       * (may be an empty set) and bail — no auto-assignment on first load.
       * This correctly handles both cases:
       *   (a) packages loaded, 0 Miami → seed empty set; next Miami arrival detected
       *   (b) packages loaded, N Miami → seed those IDs; no retroactive assignment */
      var seed = new Set();
      miamiPkgs.forEach(function (p) { seed.add(_pid(p.idwarehousereceipt)); });
      _saveSeenMiamiIds(seed);
      return false;
    }

    var seen;
    try { seen = new Set(JSON.parse(rawSeen)); } catch (_e) { seen = new Set(); }

    var newlyArrived = miamiPkgs.filter(function (p) { return !seen.has(_pid(p.idwarehousereceipt)); });

    /* Always update seen set so future calls don't re-detect these */
    miamiPkgs.forEach(function (p) { seen.add(_pid(p.idwarehousereceipt)); });
    _saveSeenMiamiIds(seen);

    if (newlyArrived.length === 0) return false;

    var locked = getLockedPackageIds();
    var unassigned = newlyArrived.filter(function (p) { return !locked.has(_pid(p.idwarehousereceipt)); });
    if (unassigned.length === 0) return false;

    /* ── Fix: enforce capacity per package, not per batch ──
     * Track remaining slots locally and decrement after each successful
     * add so that a group cannot be overfilled when several packages
     * arrive in the same cycle. Re-evaluate eligibility before every
     * assignment using this local counter. */
    var capacityLeft = {};
    getActiveGroups().forEach(function (g) {
      if (g.status === 'waiting_for_packages') {
        var remaining = g.expectedPackageCount - (g.packages || []).length;
        if (remaining > 0) capacityLeft[g.id] = remaining;
      }
    });

    var didChange = false;
    _ambiguousNewMiamiPkgs = [];

    unassigned.forEach(function (pkg) {
      /* Re-evaluate eligible groups using the up-to-date capacity counters */
      var currentEligible = getActiveGroups().filter(function (g) {
        return g.status === 'waiting_for_packages' &&
               capacityLeft[g.id] > 0;
      });

      if (currentEligible.length === 0) return; // no room anywhere — skip

      if (currentEligible.length === 1) {
        var grp = currentEligible[0];
        addPackagesToGroup(grp.id, [{
          idwarehousereceipt: pkg.idwarehousereceipt,
          trackingNumber:     pkg.trackingNumber,
          number:             pkg.number,
          carrierName:        pkg.carrierName,
          bestDate:           pkg.bestDate,
          statusId:           pkg.statusId,
          invoicesCount:      pkg.invoicesCount
        }]);
        /* Decrement local counter so later iterations respect capacity */
        capacityLeft[grp.id] = (capacityLeft[grp.id] || 1) - 1;
        if (!_autoAddedByGroup[grp.id]) _autoAddedByGroup[grp.id] = [];
        var tracking = pkg.trackingNumber || pkg.number || '?';
        var pkgId = _pid(pkg.idwarehousereceipt);
        _autoAddedByGroup[grp.id].push({ pid: pkgId, tracking: tracking });
        _saveAutoAdded();
        didChange = true;
        /* Undo toast — 5 second window */
        (function (groupId, pid) {
          _showUndoToast(
            '1 paquete agregado automáticamente al grupo',
            function () {
              removePackageFromGroup(groupId, pid);
              if (_autoAddedByGroup[groupId]) {
                _autoAddedByGroup[groupId] = _autoAddedByGroup[groupId].filter(function (x) { return x.pid !== pid; });
                if (_autoAddedByGroup[groupId].length === 0) delete _autoAddedByGroup[groupId];
              }
              _saveAutoAdded();
              renderSection();
            }
          );
        }(grp.id, pkgId));
      } else {
        /* Multiple groups eligible — flag for manual assignment */
        _ambiguousNewMiamiPkgs.push(pkg);
        didChange = true;
      }
    });

    if (didChange) _saveAmbiguous();
    return didChange;
  }

  /* ─── Toast ──────────────────────────────────────────────── */
  function _showUndoToast(msg, undoCb) {
    var container = _el('toast-container');
    if (!container) return;
    var div = document.createElement('div');
    div.className = 'flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium bg-indigo-600 toast-enter max-w-xs';
    div.innerHTML = '<i class="fas fa-magic" style="flex-shrink:0"></i>' +
      '<span style="flex:1">' + _esc(msg) + '</span>' +
      '<button class="ej-undo-btn" style="background:none;border:1px solid rgba(255,255,255,0.6);' +
        'border-radius:0.375rem;color:#fff;font-size:0.75rem;font-weight:700;padding:0.2rem 0.55rem;' +
        'cursor:pointer;white-space:nowrap;flex-shrink:0">Deshacer</button>';
    container.appendChild(div);
    var undone = false;
    var undoBtn = div.querySelector('.ej-undo-btn');
    if (undoBtn) {
      undoBtn.addEventListener('click', function () {
        undone = true;
        undoCb();
        div.classList.remove('toast-enter');
        div.classList.add('toast-exit');
        setTimeout(function () { div.remove(); }, 400);
      });
    }
    setTimeout(function () {
      if (!undone) {
        div.classList.remove('toast-enter');
        div.classList.add('toast-exit');
        setTimeout(function () { div.remove(); }, 400);
      }
    }, 5000);
  }

  function _showToast(msg, type) {
    var container = _el('toast-container');
    if (!container) return;
    var colors = {
      success: 'bg-green-500',
      info:    'bg-blue-500',
      error:   'bg-red-500',
      warning: 'bg-amber-500'
    };
    var icons = {
      success: 'fa-check-circle',
      info:    'fa-info-circle',
      error:   'fa-times-circle',
      warning: 'fa-exclamation-triangle'
    };
    var div = document.createElement('div');
    div.className = 'flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ' +
      (colors[type] || 'bg-gray-700') + ' toast-enter max-w-xs';
    div.innerHTML = '<i class="fas ' + (icons[type] || 'fa-info-circle') + '"></i>' +
      '<span>' + _esc(msg) + '</span>';
    container.appendChild(div);
    setTimeout(function () {
      div.classList.remove('toast-enter');
      div.classList.add('toast-exit');
      setTimeout(function () { div.remove(); }, 400);
    }, 3500);
  }

  /* ─── Event delegation on section ───────────────────────── */
  function _bindSectionEvents() {
    var section = _el('enviar-juntos-section');
    if (!section) return;
    section.addEventListener('click', function (e) {
      var btn;
      /* Remove package */
      btn = e.target.closest('.ej-btn-remove-pkg');
      if (btn) {
        var gid = btn.dataset.gid;
        var pid = btn.dataset.pid;
        removePackageFromGroup(gid, pid);
        renderSection();
        return;
      }
      /* Add packages selector */
      btn = e.target.closest('.ej-btn-add-pkgs');
      if (btn) { openPackageSelector(btn.dataset.gid); return; }
      /* Prepare */
      btn = e.target.closest('.ej-btn-prepare');
      if (btn) { openPrepareModal(btn.dataset.gid); return; }
      /* Invoice / confirm step */
      btn = e.target.closest('.ej-btn-invoice-step');
      if (btn) { openInvoiceModal(btn.dataset.gid); return; }
      /* Back to add packages */
      btn = e.target.closest('.ej-btn-back-add');
      if (btn) {
        _updateGroup(btn.dataset.gid, { status: 'waiting_for_packages' });
        renderSection();
        return;
      }
      /* Edit group name / notes */
      btn = e.target.closest('.ej-btn-edit-group');
      if (btn) { openEditModal(btn.dataset.gid); return; }
      /* Delete */
      btn = e.target.closest('.ej-btn-delete-group');
      if (btn) { openDeleteConfirm(btn.dataset.gid); return; }
      /* View summary */
      btn = e.target.closest('.ej-btn-view-summary');
      if (btn) { openSummaryModal(btn.dataset.gid); return; }
      /* Create new group (from confirmed card CTA) */
      btn = e.target.closest('.ej-btn-create-new');
      if (btn) { openCreateModal(); return; }
      /* Mark confirmation_sent group as closed/processed */
      btn = e.target.closest('.ej-btn-mark-closed');
      if (btn) {
        markGroupClosed(btn.dataset.gid);
        _historyExpanded = true; // reveal history section so user sees where it went
        renderSection();
        _showToast('Grupo archivado en el historial.', 'success');
        return;
      }
      /* Toggle history section */
      btn = e.target.closest('#ej-history-toggle-btn');
      if (btn) {
        _historyExpanded = !_historyExpanded;
        var histList = _el('ej-history-list');
        var histChevron = btn.querySelector('.ej-history-chevron');
        if (histList) histList.style.display = _historyExpanded ? '' : 'none';
        if (histChevron) histChevron.className = 'fas ' + (_historyExpanded ? 'fa-chevron-up' : 'fa-chevron-down') + ' ej-history-chevron';
        btn.setAttribute('aria-expanded', String(_historyExpanded));
        return;
      }
      /* Dismiss auto-added in-card strip */
      btn = e.target.closest('.ej-btn-dismiss-auto-add');
      if (btn) {
        var dismissGid = btn.dataset.gid;
        delete _autoAddedByGroup[dismissGid];
        _saveAutoAdded();
        renderSection();
        return;
      }
      /* Dismiss ambiguous banner */
      btn = e.target.closest('.ej-btn-dismiss-ambig');
      if (btn) {
        _ambiguousNewMiamiPkgs = [];
        _saveAmbiguous();
        renderSection();
        return;
      }
      /* Open package selector from ambiguous banner shortcut */
      btn = e.target.closest('.ej-btn-open-selector-ambig');
      if (btn) {
        var firstAmbigPid = btn.dataset.pid;
        var firstAmbigPkg = _ambiguousNewMiamiPkgs[0] ||
          _allPackages.find(function (p) { return _pid(p.idwarehousereceipt) === firstAmbigPid; });
        if (firstAmbigPkg) {
          _ambiguousNewMiamiPkgs = [];
          _saveAmbiguous();
          openAddToGroupModal(firstAmbigPkg);
        }
        return;
      }

      /* Expand / collapse card package list */
      btn = e.target.closest('.ej-btn-toggle-card');
      if (btn) {
        var togGid = btn.dataset.gid;
        var isNowExpanded = (_expandedCards[togGid] !== false);
        _expandedCards[togGid] = !isNowExpanded;
        // Toggle inline without full re-render for smooth UX
        var card = _el('ej-card-' + togGid);
        if (card) {
          var pkgList = card.querySelector('.ej-pkg-list');
          if (pkgList) pkgList.style.display = _expandedCards[togGid] ? '' : 'none';
          var icon = btn.querySelector('i');
          if (icon) {
            icon.className = _expandedCards[togGid] ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
          }
          btn.setAttribute('aria-label', _expandedCards[togGid] ? 'Colapsar' : 'Expandir');
        }
        return;
      }
    });
  }

  /* ─── Bootstrap ──────────────────────────────────────────── */
  function init(opts) {
    opts = opts || {};
    if (opts.packages) _allPackages = opts.packages;

    /* Bind create-group button */
    var createBtn = _el('ej-create-btn');
    if (createBtn) createBtn.addEventListener('click', function () { openCreateModal(); });

    /* Bind all modal close buttons (any child click — icon or button itself) */
    document.querySelectorAll('.ej-modal-close').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _closeModal(btn.closest('.ej-modal-overlay'));
      });
    });
    /* Clicking the dark overlay backdrop closes the modal */
    document.querySelectorAll('.ej-modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) _closeModal(overlay);
      });
    });
    /* Prevent clicks inside the modal card from bubbling up to the overlay */
    document.querySelectorAll('.ej-modal').forEach(function (m) {
      m.addEventListener('click', function (e) { e.stopPropagation(); });
    });

    /* Create form submit */
    var createForm = _el('ej-create-form');
    if (createForm) {
      createForm.addEventListener('submit', function (e) {
        e.preventDefault();
        _handleCreateSubmit();
      });
    }

    /* Selector confirm */
    var selBtn = _el('ej-selector-confirm-btn');
    if (selBtn) {
      selBtn.disabled = true;
      selBtn.addEventListener('click', _handleSelectorConfirm);
    }

    /* Add-to-group: create new group option — carries the pending package forward */
    var addtoNewBtn = _el('ej-addto-create-new-btn');
    if (addtoNewBtn) {
      addtoNewBtn.addEventListener('click', function () {
        _postCreatePkg = _pendingPkg;  // carry package into create flow
        _pendingPkg = null;
        _closeModal(_el('ej-addto-modal-overlay'));
        openCreateModal();
      });
    }

    /* Edit group form submit */
    var editForm = _el('ej-edit-form');
    if (editForm) {
      editForm.addEventListener('submit', function (e) {
        e.preventDefault();
        _handleEditSubmit();
      });
    }

    /* Invoice checkbox */
    var invCheck = _el('ej-invoice-confirm-check');
    if (invCheck) invCheck.addEventListener('change', _handleInvoiceCheckChange);

    /* Per-row pending acknowledgment checkboxes (delegated — elements are dynamic) */
    var invList = _el('ej-invoice-list');
    if (invList) {
      invList.addEventListener('change', function (e) {
        if (e.target && e.target.classList.contains('ej-inv-pending-chk')) {
          _updateInvoiceSendBtn();
        }
      });
    }

    /* Invoice send button */
    var invSend = _el('ej-invoice-send-btn');
    if (invSend) invSend.addEventListener('click', _handleSendConfirmation);

    /* Bind section-level events */
    _bindSectionEvents();

    /* Load groups from server, then render.
     * Falls back to localStorage if the request fails (e.g. not logged in yet
     * or network error), so the section still renders with whatever was cached.
     */
    _apiCall('GET', '/api/package-groups')
      .then(function (data) {
        if (data && data.ok && Array.isArray(data.groups)) {
          _groups = data.groups;

          /* One-time migration: carry over any groups that exist in localStorage
           * but are not yet on the server. This check runs whenever localStorage
           * has entries, making it safe after partial migrations — only groups
           * whose id is not already on the server are uploaded. Groups are
           * removed from localStorage one-by-one as each POST succeeds, so a
           * partial failure on one load does not abandon the successful ones on
           * the next. When all localStorage entries are migrated the key is gone
           * and this block becomes a no-op. */
          var stored;
          try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
          catch (_e) { stored = []; }

          if (stored.length > 0) {
            var serverIds = new Set(data.groups.map(function (g) { return g.id; }));
            var toUpload = stored.filter(function (g) { return !serverIds.has(g.id); });

            if (toUpload.length === 0) {
              /* Every localStorage group is already on the server — safe to clear */
              localStorage.removeItem(STORAGE_KEY);
              return;
            }

            /* Upload each missing group; on individual success remove it from
             * the pending localStorage list so a later retry only re-tries
             * the ones that actually failed. */
            var pending = stored.slice(); // copy to mutate safely
            var uploadPromises = toUpload.map(function (g) {
              return _apiCall('POST', '/api/package-groups', g).then(function (resp) {
                if (resp && resp.ok) {
                  pending = pending.filter(function (p) { return p.id !== g.id; });
                }
              }).catch(function () { /* leave this group in pending */ });
            });

            return Promise.all(uploadPromises).then(function () {
              if (pending.length === 0) {
                localStorage.removeItem(STORAGE_KEY);
              } else {
                /* Persist only the groups that still need to be migrated */
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pending)); }
                catch (_e) {}
              }
              /* Re-fetch so _groups reflects the current server state */
              return _apiCall('GET', '/api/package-groups').then(function (refreshed) {
                if (refreshed && refreshed.ok && Array.isArray(refreshed.groups)) {
                  _groups = refreshed.groups;
                }
              }).catch(function () {});
            });
          }
        } else {
          /* Server responded but not OK — fall back to localStorage */
          try { _groups = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
          catch (_e) { _groups = []; }
        }
      }, function () {
        /* Network / auth failure — fall back to localStorage */
        try { _groups = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
        catch (_e) { _groups = []; }
      })
      .then(function () {
        _checkAutoAssign();
        renderSection();
      });
  }

  /* ─── Public API ─────────────────────────────────────────── */
  global.CRBOXEnviarJuntos = {
    init:               init,
    renderSection:      renderSection,
    openCreateModal:    openCreateModal,
    openAddToGroupModal: openAddToGroupModal,
    getActiveGroups:    getActiveGroups,
    getAllGroups:       getAllGroups,
    setPackages:        function (pkgs) {
      _allPackages = pkgs;
      var changed = _checkAutoAssign();
      if (changed) renderSection();
    }
  };

}(window));
