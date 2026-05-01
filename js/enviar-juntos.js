/**
 * enviar-juntos.js — CRBOX "Enviar paquetes juntos" grouping flow
 *
 * Data is stored client-side in localStorage (key: crbox_package_groups_v1).
 * NOTE: This is NOT official CRBOX backend data. Groups are a client-side
 * workflow aid. The only server interaction is sending a confirmation email
 * via POST /api/package-group-confirm when the user finalises a group.
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
 *   confirmedAt:          ISO string|null
 * }
 */
(function (global) {
  'use strict';

  /* ─── Storage ───────────────────────────────────────────── */
  var STORAGE_KEY = 'crbox_package_groups_v1';

  function _load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (_) { return []; }
  }
  function _save(groups) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
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
    confirmation_sent:    'Confirmación enviada',
    closed:               'Cerrado'
  };
  var STATUS_CLASS = {
    waiting_for_packages: 'ej-status-waiting',
    invoices_pending:     'ej-status-invoices',
    ready_to_confirm:     'ej-status-confirm',
    confirmation_sent:    'ej-status-sent',
    closed:               'ej-status-closed'
  };
  var STATUS_ICON = {
    waiting_for_packages: 'fa-clock',
    invoices_pending:     'fa-file-invoice',
    ready_to_confirm:     'fa-check-circle',
    confirmation_sent:    'fa-paper-plane',
    closed:               'fa-lock'
  };

  /* ─── Package global pool (set by page after API load) ─── */
  var _allPackages = [];   // raw mapped packages from portal-api

  /* ─── UI state ─── */
  var _expandedCards  = {};  // groupId → true/false; default = expanded
  var _postCreatePkg  = null; // package to auto-add after creating a group from the add-to-group row flow

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
    return g;
  }

  function _updateGroup(id, patch) {
    var groups = _load();
    var idx = groups.findIndex(function (g) { return g.id === id; });
    if (idx < 0) return null;
    Object.assign(groups[idx], patch, { updatedAt: _now() });
    _save(groups);
    return groups[idx];
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
      { key: 'confirmation_sent',    label: 'Enviado' }
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

    var html = '<div class="ej-group-card' + (isReadOnly ? ' ej-confirmed' : '') + '" id="ej-card-' + _esc(group.id) + '">';

    /* Step indicator */
    if (!isReadOnly) html += _stepsHTML(group.status);

    /* Card header */
    html += '<div class="ej-group-card-header">' +
      '<div>' +
        '<p class="ej-group-name">' + _esc(group.groupName) + '</p>' +
        '<p class="ej-group-meta">Creado ' + _fmtDate(group.createdAt) +
          (group.notes ? ' · <em>' + _esc(group.notes) + '</em>' : '') + '</p>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:0.5rem;">' +
        '<span class="ej-group-status-badge ' + statusCls + '">' +
          '<i class="fas ' + statusIcon + '"></i> ' + _esc(statusLabel) +
        '</span>' +
        (cnt > 0 ?
          '<button class="ej-btn-toggle-card" aria-label="' + (isExpanded ? 'Colapsar' : 'Expandir') + '" ' +
            'data-gid="' + _esc(group.id) + '" style="background:none;border:none;cursor:pointer;color:#6b7280;padding:0.2rem 0.4rem;line-height:1">' +
            '<i class="fas ' + (isExpanded ? 'fa-chevron-up' : 'fa-chevron-down') + '"></i>' +
          '</button>' : '') +
      '</div>' +
    '</div>';

    /* ── SUCCESS state ── */
    if (group.status === 'confirmation_sent') {
      html += '<div class="px-5 pb-5">' +
        '<div class="ej-success-card">' +
          '<div class="ej-success-icon"><i class="fas fa-paper-plane"></i></div>' +
          '<p class="ej-success-title">Confirmación enviada</p>' +
          '<p class="ej-success-desc">Enviamos el detalle de este grupo a CRBOX. Nuestro equipo revisará las facturas y procesará los paquetes según disponibilidad operativa.</p>' +
          '<p class="text-xs text-green-600 mt-2">Enviado el ' + _fmtTs(group.confirmedAt) + '</p>' +
        '</div>' +
        '<div class="mt-3 flex gap-2 justify-center flex-wrap">' +
          '<button class="ej-btn ej-btn-outline ej-btn-sm ej-btn-view-summary" data-gid="' + _esc(group.id) + '">' +
            '<i class="fas fa-list"></i> <span class="ej-btn-label">Ver resumen</span>' +
          '</button>' +
          '<button class="ej-btn ej-btn-purple ej-btn-sm ej-btn-create-new">' +
            '<i class="fas fa-plus"></i> <span class="ej-btn-label">Crear nuevo grupo</span>' +
          '</button>' +
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
    var groups = getAllGroups();
    var active  = getActiveGroups();
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
      // Summary bar: group count + shortcut when at least one active group exists
      var summaryBar = '';
      if (active.length > 0) {
        summaryBar =
          '<div class="ej-groups-summary-bar" style="display:flex;align-items:center;justify-content:space-between;' +
            'padding:0.55rem 1.25rem;background:#f5f3ff;border-bottom:1px solid #ede9fe;font-size:0.85rem;">' +
            '<span style="color:#5b21b6;font-weight:600;">' +
              '<i class="fas fa-layer-group mr-1"></i> ' +
              active.length + (active.length === 1 ? ' grupo activo' : ' grupos activos') +
            '</span>' +
            '<button class="ej-btn ej-btn-outline ej-btn-sm" id="ej-ver-mis-grupos-btn" style="font-size:0.78rem;padding:0.2rem 0.7rem">' +
              '<i class="fas fa-chevron-down mr-1"></i>Ver mis grupos' +
            '</button>' +
          '</div>';
      }
      var html = summaryBar + '<div class="ej-group-list">';
      groups.forEach(function (g) { html += _renderGroupCard(g); });
      html += '</div>';
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
  function openCreateModal(targetGroupId) {
    var overlay = _el('ej-create-modal-overlay');
    if (!overlay) return;
    // Reset form
    var form = _el('ej-create-form');
    if (form) form.reset();
    var errEl = _el('ej-create-error');
    if (errEl) errEl.textContent = '';
    // Pre-fill target group for add-to-group flow (when groupId passed)
    overlay.dataset.addToGroup = targetGroupId || '';
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
      html += '<div class="ej-sel-info">' +
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

    /* Build invoice checklist */
    var listEl = _el('ej-invoice-list');
    if (listEl) {
      if ((group.packages || []).length === 0) {
        listEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-3">No hay paquetes en este grupo.</p>';
      } else {
        listEl.innerHTML = group.packages.map(function (p) {
          return '<div class="ej-invoice-row">' +
            _invoiceBadge(p) +
            '<div class="ej-inv-info">' +
              '<div class="ej-inv-tracking">' + _esc(p.trackingNumber || '—') + '</div>' +
              '<div class="ej-inv-sub">' + _esc([p.number, p.carrierName].filter(Boolean).join(' · ')) + '</div>' +
            '</div>' +
          '</div>';
        }).join('');
      }
    }

    /* Reset checkbox + button */
    var chk = _el('ej-invoice-confirm-check');
    if (chk) chk.checked = false;
    var sendBtn = _el('ej-invoice-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    /* Error area reset */
    var errEl = _el('ej-invoice-error');
    if (errEl) errEl.innerHTML = '';

    /* Update step indicator */
    var stepsEl = _el('ej-invoice-steps');
    if (stepsEl) stepsEl.innerHTML = _stepsHTML(group.status);

    _openModal(_el('ej-invoice-modal-overlay'));
  }

  function _handleInvoiceCheckChange() {
    var chk = _el('ej-invoice-confirm-check');
    var btn = _el('ej-invoice-send-btn');
    if (chk && btn) btn.disabled = !chk.checked;
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
    var html =
      '<table class="ej-summary-table mb-4">' +
        '<tr><th>Nombre del grupo</th><td>' + _esc(group.groupName) + '</td></tr>' +
        '<tr><th>Paquetes esperados</th><td>' + group.expectedPackageCount + '</td></tr>' +
        '<tr><th>Paquetes confirmados</th><td>' + (group.packages || []).length + '</td></tr>' +
        '<tr><th>Notas</th><td>' + _esc(group.notes || '—') + '</td></tr>' +
        '<tr><th>Enviado el</th><td>' + _fmtTs(group.confirmedAt) + '</td></tr>' +
      '</table>' +
      '<p class="text-sm font-semibold text-gray-700 mb-2">Paquetes en el grupo:</p>' +
      '<div class="flex flex-col gap-2">' +
      (group.packages || []).map(function (p) {
        return '<div class="ej-invoice-row">' +
          _invoiceBadge(p) +
          '<div class="ej-inv-info">' +
            '<div class="ej-inv-tracking">' + _esc(p.trackingNumber || '—') + '</div>' +
            '<div class="ej-inv-sub">' + _esc([p.number, p.carrierName, _fmtDate(p.bestDate)].filter(Boolean).join(' · ')) + '</div>' +
          '</div>' +
        '</div>';
      }).join('') +
      '</div>';
    bodyEl.innerHTML = html;
    _openModal(_el('ej-summary-modal-overlay'));
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

  /* ─── Toast ──────────────────────────────────────────────── */
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
      /* Delete */
      btn = e.target.closest('.ej-btn-delete-group');
      if (btn) { openDeleteConfirm(btn.dataset.gid); return; }
      /* View summary */
      btn = e.target.closest('.ej-btn-view-summary');
      if (btn) { openSummaryModal(btn.dataset.gid); return; }
      /* Create new group (from confirmed card CTA) */
      btn = e.target.closest('.ej-btn-create-new');
      if (btn) { openCreateModal(); return; }
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

    /* Bind all modal close buttons */
    document.querySelectorAll('.ej-modal-close, .ej-modal-overlay').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target === el) _closeModal(el.closest('.ej-modal-overlay') || el);
      });
    });
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

    /* Invoice checkbox */
    var invCheck = _el('ej-invoice-confirm-check');
    if (invCheck) invCheck.addEventListener('change', _handleInvoiceCheckChange);

    /* Invoice send button */
    var invSend = _el('ej-invoice-send-btn');
    if (invSend) invSend.addEventListener('click', _handleSendConfirmation);

    /* Bind section-level events */
    _bindSectionEvents();

    /* Initial render */
    renderSection();
  }

  /* ─── Public API ─────────────────────────────────────────── */
  global.CRBOXEnviarJuntos = {
    init:               init,
    renderSection:      renderSection,
    openCreateModal:    openCreateModal,
    openAddToGroupModal: openAddToGroupModal,
    getActiveGroups:    getActiveGroups,
    getAllGroups:       getAllGroups,
    setPackages:        function (pkgs) { _allPackages = pkgs; }
  };

}(window));
