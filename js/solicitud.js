// solicitud.js — CRBOX Portal Solicitud Detail View
// Requires: auth.js, portal-api.js
(function () {
  'use strict';

  var _casilleroId = null;
  var _userEmail   = '';
  var _scbId       = null;

  var STATUS_LABELS = {
    enviada:                 'Enviada',
    en_revision:             'En revisión',
    respondida:              'Respondida',
    pendiente_compra_crbox:  'Compra por CRBOX',
    pendiente_compra_cliente:'Compra propia',
    completada:              'Completada',
    cancelada:               'Cancelada',
    expirada:                'Expirada'
  };

  var STATUS_COLORS = {
    enviada:                 { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-400' },
    en_revision:             { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400' },
    respondida:              { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-400' },
    pendiente_compra_crbox:  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400' },
    pendiente_compra_cliente:{ bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-400' },
    completada:              { bg: 'bg-gray-100',  text: 'text-gray-600',   border: 'border-gray-200',   dot: 'bg-gray-400' },
    cancelada:               { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-400' },
    expirada:                { bg: 'bg-gray-100',  text: 'text-gray-500',   border: 'border-gray-200',   dot: 'bg-gray-300' }
  };

  var CATEGORY_LABELS = {
    ropa:                'Ropa y calzado',
    electronico:         'Electrónico',
    computadora:         'Computadoras',
    celular:             'Celulares',
    auricular_telefono:  'Auriculares',
    electrodomestico:    'Electrodoméstico',
    cosmetico:           'Cosméticos',
    suplemento:          'Suplementos',
    libro:               'Libros',
    juguete:             'Juguetes',
    herramienta:         'Herramientas',
    equipo_medico:       'Equipo médico',
    deportivo:           'Deportivo',
    otros:               'Otros'
  };

  var SERVICE_LABELS = { aereo: 'Aéreo', maritimo: 'Marítimo' };
  var ACTOR_LABELS   = { system: 'Sistema', sales: 'CRBOX', user: 'Tú' };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function statusBadge(status) {
    var c = STATUS_COLORS[status] || { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' };
    var label = STATUS_LABELS[status] || status;
    return (
      '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ' +
      c.bg + ' ' + c.text + ' ' + c.border + '">' +
      '<span class="w-2 h-2 rounded-full flex-shrink-0 ' + c.dot + '"></span>' +
      label + '</span>'
    );
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      var dd = String(d.getDate()).padStart(2, '0');
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      var yyyy = d.getFullYear();
      var hh = String(d.getHours()).padStart(2, '0');
      var min = String(d.getMinutes()).padStart(2, '0');
      return dd + '/' + mm + '/' + yyyy + ' ' + hh + ':' + min;
    } catch (e) { return iso; }
  }

  function formatDateShort(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      var dd = String(d.getDate()).padStart(2, '0');
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      var yyyy = d.getFullYear();
      return dd + '/' + mm + '/' + yyyy;
    } catch (e) { return iso; }
  }

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function _show(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function _hide(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }

  function _showToast(msg, ok) {
    var toastC = document.getElementById('toast-container');
    if (!toastC) return;
    var t = document.createElement('div');
    t.className = 'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ' +
      (ok !== false ? 'bg-gray-900 text-white' : 'bg-red-700 text-white');
    var icon = ok !== false ? 'fa-check-circle text-green-400' : 'fa-exclamation-circle text-red-200';
    t.innerHTML = '<i class="fas ' + icon + '"></i> ' + esc(msg);
    toastC.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4000);
  }

  // ─── API calls ──────────────────────────────────────────────────────────────

  function _authHeaders() {
    return {
      'Authorization': 'Bearer ' + CRBOXAuth.getToken(),
      'X-Casillero-Email': _userEmail
    };
  }

  function fetchSolicitud(scbId) {
    return fetch('/api/solicitudes/' + encodeURIComponent(scbId), {
      headers: _authHeaders()
    }).then(function (res) {
      if (res.status === 401) {
        CRBOXAuth.clearToken();
        window.location.replace('login.html?msg=session-expired');
        return null;
      }
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Error ' + res.status);
      return res.json();
    }).then(function (data) {
      return (data && data.solicitud) ? data.solicitud : null;
    });
  }

  function _postJSON(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, _authHeaders()),
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().then(function (d) { return { status: res.status, data: d }; });
    });
  }

  // ─── Response-JSON renderer ─────────────────────────────────────────────────

  function _renderResponseBlock(resp, userEmail) {
    if (!resp) return false;
    var parsed = resp;
    if (typeof resp === 'string') {
      try { parsed = JSON.parse(resp); } catch (e) { return false; }
    }

    var hasContent = false;

    if (parsed.confirmed_shipping_price_usd != null) {
      var price = Number(parsed.confirmed_shipping_price_usd);
      _setText('resp-price', isNaN(price) ? String(parsed.confirmed_shipping_price_usd) : '$' + price.toFixed(2) + ' USD');
      _show('resp-price-row');
      hasContent = true;
    }
    if (parsed.availability) {
      _setText('resp-avail', parsed.availability);
      _show('resp-avail-row');
      hasContent = true;
    }
    if (parsed.delivery_timeline) {
      _setText('resp-timeline', parsed.delivery_timeline);
      _show('resp-timeline-row');
      hasContent = true;
    }
    if (parsed.conditions) {
      _setText('resp-conditions', parsed.conditions);
      _show('resp-conditions-row');
      hasContent = true;
    }
    if (parsed.customer_message) {
      _setText('resp-message', parsed.customer_message);
      _show('resp-message-row');
      hasContent = true;
    }

    var respEmailEl = document.getElementById('resp-email');
    if (respEmailEl) respEmailEl.textContent = userEmail || '';

    return hasContent;
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  function renderSolicitud(sol) {
    if (!sol) return;
    var status = sol.status || 'enviada';

    // Title
    document.title = 'CRBOX | ' + sol.id + ' | Solicitud de compra';

    // Header
    var idEl = document.getElementById('sol-id');
    var badgeEl = document.getElementById('sol-badge');
    var dateEl  = document.getElementById('sol-date');
    if (idEl)    idEl.textContent = sol.id;
    if (badgeEl) badgeEl.innerHTML = statusBadge(status);
    if (dateEl)  dateEl.textContent = formatDateShort(sol.submitted_at);

    // Product card
    _setText('sol-product-name', sol.product_name || '—');
    _setText('sol-category', CATEGORY_LABELS[sol.category] || sol.category || 'Otros');
    _setText('sol-value', sol.declared_value_usd != null ? '$' + Number(sol.declared_value_usd).toFixed(2) + ' USD' : '—');
    _setText('sol-service', SERVICE_LABELS[sol.service_type] || 'Aéreo');

    var urlEl = document.getElementById('sol-url');
    if (urlEl) {
      if (sol.product_url) {
        urlEl.innerHTML = '<a href="' + esc(sol.product_url) + '" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-800 underline break-all text-sm">' + esc(sol.product_url.replace(/https?:\/\//i, '').substring(0, 60)) + (sol.product_url.length > 60 ? '…' : '') + '</a>';
      } else {
        urlEl.textContent = 'No proporcionada';
        urlEl.className = 'text-gray-400 text-sm';
      }
    }

    var weightEl = document.getElementById('sol-weight');
    if (weightEl) weightEl.textContent = sol.weight_kg ? sol.weight_kg + ' kg' : 'No especificado';

    var dimsEl = document.getElementById('sol-dims');
    if (dimsEl) {
      if (sol.length_cm && sol.width_cm && sol.height_cm) {
        dimsEl.textContent = 'L' + sol.length_cm + ' × W' + sol.width_cm + ' × H' + sol.height_cm + ' cm';
      } else {
        dimsEl.textContent = 'No especificadas';
      }
    }

    var notesEl = document.getElementById('sol-notes');
    if (notesEl) {
      if (sol.customer_notes) {
        notesEl.textContent = sol.customer_notes;
        notesEl.parentElement && notesEl.parentElement.classList.remove('hidden');
      } else {
        notesEl.parentElement && notesEl.parentElement.classList.add('hidden');
      }
    }

    // ── Status panels ─────────────────────────────────────────────────────────
    var allPanels = ['panel-reviewing', 'panel-responded', 'panel-pending-crbox',
                     'panel-pending-cliente', 'panel-completed'];
    allPanels.forEach(_hide);

    if (status === 'enviada' || status === 'en_revision') {
      _show('panel-reviewing');

    } else if (status === 'respondida') {
      _show('panel-responded');
      // Try to render response_json
      var hasResp = _renderResponseBlock(sol.response_json, _userEmail);
      if (hasResp) {
        _show('resp-block');
        _hide('resp-fallback');
      } else {
        _hide('resp-block');
        var emailNoticeEl = document.getElementById('panel-responded-email');
        if (emailNoticeEl) emailNoticeEl.textContent = _userEmail;
      }

    } else if (status === 'pendiente_compra_crbox') {
      _show('panel-pending-crbox');

    } else if (status === 'pendiente_compra_cliente') {
      _show('panel-pending-cliente');
      // Pre-fill tracking number if already saved
      var trackingInput = document.getElementById('tracking-input');
      if (trackingInput && sol.expected_tracking_number) {
        trackingInput.value = sol.expected_tracking_number;
      }

    } else if (status === 'completada' || status === 'cancelada' || status === 'expirada') {
      _show('panel-completed');
    }

    // ── Linked package ────────────────────────────────────────────────────────
    if (sol.linked_package_id) {
      var linkEl = document.getElementById('linked-package-link');
      if (linkEl) {
        linkEl.textContent = '#' + sol.linked_package_id;
        linkEl.href = 'mis-paquetes.html';
      }
      _show('panel-linked-package');
    } else {
      _hide('panel-linked-package');
    }

    // ── WhatsApp button (only for enviada and en_revision) ────────────────────
    var waBtn = document.getElementById('btn-whatsapp');
    if (waBtn) {
      if (status === 'enviada' || status === 'en_revision') {
        var waText = encodeURIComponent('Hola CRBOX, tengo una consulta sobre mi solicitud de compra ' + sol.id + '.');
        waBtn.href = 'https://wa.me/50689794418?text=' + waText;
        waBtn.classList.remove('hidden');
      } else {
        waBtn.classList.add('hidden');
      }
    }

    // ── Cancel button (only for enviada) ──────────────────────────────────────
    var cancelBtn = document.getElementById('btn-cancel-solicitud');
    if (cancelBtn) {
      if (status === 'enviada') {
        cancelBtn.classList.remove('hidden');
        cancelBtn.classList.add('inline-flex');
      } else {
        cancelBtn.classList.add('hidden');
        cancelBtn.classList.remove('inline-flex');
      }
    }
    var cancelConfirmRow = document.getElementById('cancel-confirm-row');
    if (cancelConfirmRow) cancelConfirmRow.classList.add('hidden');

    // ── Duplicate button ──────────────────────────────────────────────────────
    var dupBtn = document.getElementById('btn-duplicate');
    if (dupBtn) dupBtn.href = 'mis-solicitudes.html?dup=' + encodeURIComponent(sol.id);
    var dupNoticeLink = document.getElementById('link-dup-notice');
    if (dupNoticeLink) dupNoticeLink.href = 'mis-solicitudes.html?dup=' + encodeURIComponent(sol.id);

    // ── Timeline ──────────────────────────────────────────────────────────────
    var timeline = document.getElementById('sol-timeline');
    if (timeline && sol.history && sol.history.length > 0) {
      timeline.innerHTML = sol.history.map(function (h, i) {
        var isFirst = i === 0;
        var actor = ACTOR_LABELS[h.changed_by] || h.changed_by || 'Sistema';
        var label = STATUS_LABELS[h.to_status] || h.to_status;
        var c = STATUS_COLORS[h.to_status] || { dot: 'bg-gray-300', text: 'text-gray-600' };
        return (
          '<div class="flex gap-3 ' + (isFirst ? '' : 'mt-1') + '">' +
            '<div class="flex flex-col items-center">' +
              '<div class="w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ' + c.dot + (isFirst ? ' ring-2 ring-offset-1 ring-current' : '') + '"></div>' +
              (i < sol.history.length - 1 ? '<div class="w-0.5 flex-1 bg-gray-200 mt-1"></div>' : '') +
            '</div>' +
            '<div class="flex-1 pb-3">' +
              '<div class="flex flex-wrap items-baseline gap-2">' +
                '<span class="text-sm font-semibold text-gray-800">' + esc(label) + '</span>' +
                '<span class="text-xs text-gray-400">por ' + esc(actor) + '</span>' +
              '</div>' +
              '<p class="text-xs text-gray-500 mt-0.5">' + formatDate(h.changed_at) + '</p>' +
              (h.note ? '<p class="text-xs text-gray-600 mt-1 bg-gray-50 rounded px-2 py-1">' + esc(h.note) + '</p>' : '') +
            '</div>' +
          '</div>'
        );
      }).join('');
    } else if (timeline) {
      timeline.innerHTML = '<p class="text-sm text-gray-400">Sin historial disponible.</p>';
    }
  }

  // ─── Intent handler ─────────────────────────────────────────────────────────

  function _wireIntentButton(btnId, intentValue) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (btn.disabled) return;

      var allBtns = ['btn-intent-crbox', 'btn-intent-cliente', 'btn-intent-cancel'];
      allBtns.forEach(function (id) {
        var b = document.getElementById(id);
        if (b) b.disabled = true;
      });
      btn.textContent = 'Guardando...';

      var errEl = document.getElementById('intent-error');
      if (errEl) errEl.classList.add('hidden');

      _postJSON('/api/solicitudes/' + encodeURIComponent(_scbId) + '/intent', { intent: intentValue })
        .then(function (result) {
          if (result.data && result.data.ok) {
            return fetchSolicitud(_scbId).then(function (freshSol) {
              if (freshSol) renderSolicitud(freshSol);
            });
          } else {
            var msg = (result.data && result.data.error) || 'No se pudo guardar. Intenta de nuevo.';
            if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
            allBtns.forEach(function (id) {
              var b = document.getElementById(id);
              if (b) b.disabled = false;
            });
            // Restore original label
            if (btnId === 'btn-intent-crbox') btn.textContent = 'Quiero que CRBOX compre por mí';
            else if (btnId === 'btn-intent-cliente') btn.textContent = 'Yo realizaré la compra';
            else btn.textContent = 'No deseo continuar con esta solicitud';
          }
        })
        .catch(function () {
          if (errEl) { errEl.textContent = 'Error de conexión. Intenta de nuevo.'; errEl.classList.remove('hidden'); }
          allBtns.forEach(function (id) {
            var b = document.getElementById(id);
            if (b) b.disabled = false;
          });
          if (btnId === 'btn-intent-crbox') btn.textContent = 'Quiero que CRBOX compre por mí';
          else if (btnId === 'btn-intent-cliente') btn.textContent = 'Yo realizaré la compra';
          else btn.textContent = 'No deseo continuar con esta solicitud';
        });
    });
  }

  // ─── Tracking handler ───────────────────────────────────────────────────────

  function _wireTrackingButton() {
    var saveBtn = document.getElementById('btn-save-tracking');
    if (!saveBtn) return;
    saveBtn.addEventListener('click', function () {
      if (saveBtn.disabled) return;
      var input = document.getElementById('tracking-input');
      var tracking = input ? input.value.trim() : '';
      if (!tracking) {
        var errEl = document.getElementById('tracking-error');
        if (errEl) { errEl.textContent = 'Ingresa el número de seguimiento.'; errEl.classList.remove('hidden'); }
        return;
      }
      saveBtn.disabled = true;
      var origText = saveBtn.textContent;
      saveBtn.textContent = 'Guardando...';
      _hide('tracking-error');
      _hide('tracking-saved-notice');

      _postJSON('/api/solicitudes/' + encodeURIComponent(_scbId) + '/tracking', { tracking_number: tracking })
        .then(function (result) {
          saveBtn.disabled = false;
          saveBtn.textContent = origText;
          if (result.data && result.data.ok) {
            _show('tracking-saved-notice');
          } else {
            var msg = (result.data && result.data.error) || 'No se pudo guardar. Intenta de nuevo.';
            var errEl = document.getElementById('tracking-error');
            if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
          }
        })
        .catch(function () {
          saveBtn.disabled = false;
          saveBtn.textContent = origText;
          var errEl = document.getElementById('tracking-error');
          if (errEl) { errEl.textContent = 'Error de conexión. Intenta de nuevo.'; errEl.classList.remove('hidden'); }
        });
    });
  }

  // ─── Cancel solicitud flow ──────────────────────────────────────────────────

  function _wireCancelFlow() {
    var cancelBtn        = document.getElementById('btn-cancel-solicitud');
    var cancelConfirm    = document.getElementById('cancel-confirm-row');
    var cancelConfirmYes = document.getElementById('btn-cancel-confirm-yes');
    var cancelConfirmNo  = document.getElementById('btn-cancel-confirm-no');

    if (cancelBtn && cancelConfirm) {
      cancelBtn.addEventListener('click', function () {
        cancelConfirm.classList.remove('hidden');
        cancelBtn.classList.add('hidden');
        cancelBtn.classList.remove('inline-flex');
      });
    }
    if (cancelConfirmNo && cancelConfirm && cancelBtn) {
      cancelConfirmNo.addEventListener('click', function () {
        cancelConfirm.classList.add('hidden');
        cancelBtn.classList.remove('hidden');
        cancelBtn.classList.add('inline-flex');
      });
    }
    if (cancelConfirmYes) {
      cancelConfirmYes.addEventListener('click', function () {
        cancelConfirmYes.disabled = true;
        cancelConfirmYes.textContent = 'Cancelando...';
        fetch('/api/solicitudes/' + encodeURIComponent(_scbId) + '/cancel', {
          method: 'POST',
          headers: _authHeaders()
        }).then(function (res) {
          return res.json().then(function (d) { return { status: res.status, data: d }; });
        }).then(function (result) {
          if (result.data && result.data.ok) {
            return fetchSolicitud(_scbId).then(function (freshSol) {
              if (cancelConfirm) cancelConfirm.classList.add('hidden');
              if (freshSol) renderSolicitud(freshSol);
              _showToast('Solicitud cancelada correctamente.');
            });
          } else {
            var errMsg = (result.data && result.data.error) || 'No se pudo cancelar. Intenta de nuevo.';
            cancelConfirmYes.disabled = false;
            cancelConfirmYes.textContent = 'Sí, cancelar';
            var errEl = document.createElement('p');
            errEl.className = 'text-xs text-red-700 mt-1 w-full';
            errEl.textContent = errMsg;
            cancelConfirm.appendChild(errEl);
            setTimeout(function () { if (errEl.parentNode) errEl.parentNode.removeChild(errEl); }, 5000);
          }
        }).catch(function () {
          cancelConfirmYes.disabled = false;
          cancelConfirmYes.textContent = 'Sí, cancelar';
        });
      });
    }
  }

  // ─── Init ────────────────────────────────────────────────────────────────────

  function init() {
    if (!CRBOXAuth.isLoggedIn()) return;

    var params = new URLSearchParams(window.location.search);
    _scbId = params.get('id');

    if (!_scbId || !/^SCB-\d+$/.test(_scbId)) {
      window.location.replace('mis-solicitudes.html');
      return;
    }

    var loadingEl  = document.getElementById('sol-loading');
    var contentEl  = document.getElementById('sol-content');
    var errorEl    = document.getElementById('sol-error');
    var notFoundEl = document.getElementById('sol-not-found');

    CRBOXPortalAPI.getUserInfo().then(function (info) {
      var c = (info && info.Consignee) ? info.Consignee : (info || {});
      _casilleroId = c.idconsignee || c.IdConsignee || null;
      _userEmail   = CRBOXAuth.getEmail() || c.email || c.Email || '';

      var fname = c.consigneename || c.ConsigneeName || '';
      var mobileNameEl = document.getElementById('mobile-user-name');
      var mobileCasEl  = document.getElementById('mobile-casillero-badge');
      var headerNameEl = document.getElementById('header-user-name');
      if (mobileNameEl) mobileNameEl.textContent = fname || _userEmail;
      if (mobileCasEl)  mobileCasEl.textContent  = 'Casillero #' + (_casilleroId || '—');
      if (headerNameEl) headerNameEl.textContent  = fname || _userEmail;

      return fetchSolicitud(_scbId);
    }).then(function (sol) {
      if (loadingEl) loadingEl.classList.add('hidden');

      if (!sol) {
        if (notFoundEl) notFoundEl.classList.remove('hidden');
        return;
      }

      if (contentEl) contentEl.classList.remove('hidden');
      renderSolicitud(sol);
    }).catch(function (err) {
      if (err && err.isAuthError) return;
      if (loadingEl) loadingEl.classList.add('hidden');
      if (errorEl)   errorEl.classList.remove('hidden');
      console.warn('[Solicitud] init error:', err);
    });

    // Wire all interactive flows
    _wireIntentButton('btn-intent-crbox',   'crbox');
    _wireIntentButton('btn-intent-cliente', 'cliente');
    _wireIntentButton('btn-intent-cancel',  'cancel');
    _wireTrackingButton();
    _wireCancelFlow();

    // Mobile menu
    var mobileMenuBtn = document.getElementById('mobile-menu-button');
    var mobileMenu    = document.getElementById('mobile-menu');
    if (mobileMenuBtn && mobileMenu) {
      mobileMenuBtn.addEventListener('click', function () {
        var isHidden = mobileMenu.classList.contains('hidden');
        if (isHidden) {
          mobileMenu.classList.remove('hidden');
          mobileMenuBtn.querySelector('i').className = 'fas fa-times text-xl';
        } else {
          mobileMenu.classList.add('hidden');
          mobileMenuBtn.querySelector('i').className = 'fas fa-bars text-xl';
        }
      });
    }

    // Logout
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
      var headerNameEl = document.getElementById('header-user-name');
      var mobileNameEl = document.getElementById('mobile-user-name');
      if (headerNameEl) headerNameEl.textContent = fname || CRBOXAuth.getEmail();
      if (mobileNameEl) mobileNameEl.textContent = fname || CRBOXAuth.getEmail();
    }).catch(function(){});
  });

}());
