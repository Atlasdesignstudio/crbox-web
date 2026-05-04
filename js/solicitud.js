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
    pendiente_compra_crbox:                'Compra por CRBOX',
    pendiente_confirmacion_pago_cliente:   'Confirmación de pago',
    pagado_por_cliente:                    'Pago confirmado',
    comprado:                              'Compra realizada',
    listo_para_retiro:                     'Listo para retiro',
    pendiente_compra_cliente:              'Compra propia',
    completada:              'Completada',
    cancelada:               'Cancelada',
    expirada:                'Expirada'
  };

  var STATUS_COLORS = {
    enviada:                              { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-400' },
    en_revision:                          { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400' },
    respondida:                           { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-400' },
    pendiente_compra_crbox:               { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400' },
    pendiente_confirmacion_pago_cliente:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400' },
    pagado_por_cliente:                   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-400' },
    comprado:                             { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-400' },
    listo_para_retiro:                    { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400' },
    pendiente_compra_cliente:             { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-400' },
    completada:                           { bg: 'bg-gray-100',  text: 'text-gray-600',   border: 'border-gray-200',   dot: 'bg-gray-400' },
    cancelada:                            { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-400' },
    expirada:                             { bg: 'bg-gray-100',  text: 'text-gray-500',   border: 'border-gray-200',   dot: 'bg-gray-300' }
  };

  var CATEGORY_LABELS = {
    celulares:            'Celulares y Smartphones',
    computadora:          'Computadoras y Laptops',
    tableta_electronica:  'Tabletas y iPads',
    consola_videojuegos:  'Consolas de Videojuegos',
    camara:               'Cámaras y Video',
    auricular_telefono:   'Audífonos y Accesorios Audio',
    bocina:               'Bocinas y Equipos de Sonido',
    televisor:            'Televisores',
    ropa:                 'Ropa y Calzado',
    anteojos:             'Anteojos y Gafas',
    cinturon:             'Cinturones y Bolsos',
    electrodomesticos:    'Electrodomésticos',
    aspiradora:           'Aspiradora y Limpieza',
    colchon:              'Colchones y Muebles',
    herramientas:         'Herramientas',
    bicicleta_economica:  'Bicicleta estándar',
    bicicleta_cara:       'Bicicleta premium',
    bola:                 'Artículos Deportivos',
    coche_bebe:           'Coches de Bebé y Accesorios',
    juguetes:             'Juguetes',
    amortiguadores:       'Amortiguadores',
    aros_carro_moto:      'Aros de Carro/Moto',
    vehiculos:            'Repuestos en General',
    salud_belleza:        'Salud y Belleza',
    suplementos:          'Suplementos',
    cds:                  'Libros, CDs y Medios',
    electr_otro:          'Otro — Electrónica',
    ropa_otro:            'Otro — Ropa y Accesorios',
    hogar_otro:           'Otro — Hogar',
    deporte_otro:         'Otro — Deportes',
    bebe_otro:            'Otro — Bebé y Niños',
    vehic_otro:           'Otro — Vehículos',
    otros:                'Otros',
    // Legacy keys for older records
    ropa_calzado:         'Ropa y Calzado',
    celular:              'Celulares',
    electrodomestico:     'Electrodomésticos',
    electronico:          'Electrónica',
    cosmetico:            'Cosméticos',
    suplemento:           'Suplementos',
    libro:                'Libros',
    juguete:              'Juguetes',
    herramienta:          'Herramientas',
    equipo_medico:        'Equipo Médico',
    deportivo:            'Deportivo'
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
      esc(label) + '</span>'
    );
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      var dd = String(d.getUTCDate()).padStart(2, '0');
      var mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      var yyyy = d.getUTCFullYear();
      var hh = String(d.getUTCHours()).padStart(2, '0');
      var min = String(d.getUTCMinutes()).padStart(2, '0');
      return dd + '/' + mm + '/' + yyyy + ' ' + hh + ':' + min;
    } catch (e) { return iso; }
  }

  function formatDateShort(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      var dd = String(d.getUTCDate()).padStart(2, '0');
      var mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      var yyyy = d.getUTCFullYear();
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

  // ─── normalizeQuoteResponse ──────────────────────────────────────────────────
  // Returns parsed quoteResponse if portalResponseVisible===true, else null.
  // Accepts response_json, quoteResponse, or responseJson key variants.
  // Never throws.

  function normalizeQuoteResponse(raw) {
    var parsed = raw;
    if (!parsed) return null;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch(e) { return null; }
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if (parsed.portalResponseVisible !== true) return null;
    return parsed;
  }

  // ─── Quote response renderers (Task #360) ───────────────────────────────────

  function _fmtUsd(v) {
    var n = Number(v);
    return isNaN(n) ? '—' : '$' + n.toFixed(2) + ' USD';
  }

  function _qrBdRow(label, value, note) {
    var noteHtml = note
      ? ' <span style="font-size:.65rem;color:#9ca3af;font-weight:400;">' + esc(note) + '</span>'
      : '';
    return '<div class="qr-bd-row"><span class="qr-bd-label">' + esc(label) + noteHtml + '</span>'
      + '<span class="qr-bd-value">' + esc(value) + '</span></div>';
  }

  function _renderSingleProductBreakdown(calc) {
    if (!calc) return '';
    var name      = calc.name || 'Producto';
    var cat       = CATEGORY_LABELS[calc.category] || calc.category || 'Otros';
    var isVol     = calc.weight_mode === 'volumetrico';
    var realKg    = calc.real_weight_kg != null ? Number(calc.real_weight_kg).toFixed(3) + ' kg' : '—';
    var billKg    = calc.billable_weight_kg != null ? Number(calc.billable_weight_kg).toFixed(3) + ' kg' : '—';
    var wModeLabel= isVol ? 'volumétrico' : 'real';
    var declVal   = calc.declared_value_usd != null ? _fmtUsd(calc.declared_value_usd) : '—';
    var delivVal  = (calc.delivery != null && Number(calc.delivery) > 0)
                    ? _fmtUsd(calc.delivery) : 'No aplica';

    // Applied-weight pill: highlight the active mode
    var weightBadge = isVol
      ? '<span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:999px;'
        + 'font-size:.64rem;font-weight:700;padding:.1rem .45rem;margin-left:.35rem;">'
        + 'Volumétrico aplicado</span>'
      : '<span style="background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:999px;'
        + 'font-size:.64rem;font-weight:700;padding:.1rem .45rem;margin-left:.35rem;">'
        + 'Peso real aplicado</span>';

    var rows = '';
    rows += _qrBdRow('Flete aéreo',        _fmtUsd(calc.freight));
    rows += _qrBdRow('Combustible (19%)',   _fmtUsd(calc.fuel));
    rows += _qrBdRow('Manejo',             _fmtUsd(calc.handling));
    rows += _qrBdRow('Impuestos / Aduana', _fmtUsd(calc.taxes), 'impuesto local estimado');
    rows += _qrBdRow('Seguro',             _fmtUsd(calc.insurance));
    rows += _qrBdRow('Entrega (CR)',       delivVal);

    var html = '<div class="px-4 pb-3 pt-2">';
    html += '<div style="border-radius:.75rem;border:1px solid #e5e7eb;overflow:hidden;">';
    // Product header
    html += '<div style="background:#f8fafc;padding:.6rem 1rem;border-bottom:1px solid #e5e7eb;">';
    html += '<p style="font-size:.82rem;font-weight:700;color:#1f2937;margin:0;">' + esc(name) + '</p>';
    html += '<p style="font-size:.72rem;color:#6b7280;margin:.1rem 0 0;">' + esc(cat);
    if (calc.declared_value_usd != null) {
      html += ' &middot; Valor declarado: ' + esc(declVal);
    }
    html += '</p></div>';
    // Three weight rows — always show real, volumetric, and applied
    var volKg = calc.volumetric_weight_kg != null
                ? Number(calc.volumetric_weight_kg).toFixed(3) + ' kg' : '—';
    html += '<div style="background:#fff;padding:.45rem 1rem;border-bottom:1px solid #f3f4f6;">';
    html += '<div style="display:flex;flex-wrap:wrap;gap:.5rem .9rem;align-items:center;">';
    html += '<span style="font-size:.72rem;color:#6b7280;">Peso real: '
      + '<strong style="color:#374151;">' + esc(realKg) + '</strong></span>';
    html += '<span style="font-size:.72rem;color:#6b7280;">Peso volumétrico: '
      + '<strong style="color:#374151;">' + esc(volKg) + '</strong></span>';
    html += '<span style="font-size:.72rem;color:#6b7280;">Peso de cobro: '
      + '<strong style="color:#374151;">' + esc(billKg) + '</strong>' + weightBadge + '</span>';
    html += '</div></div>';
    // Line items
    html += '<div style="background:#fff;padding:.5rem 1rem;">' + rows + '</div>';
    // Disclosure row
    html += '<div style="background:#f8fafc;padding:.45rem 1rem;border-top:1px solid #f3f4f6;">';
    html += '<p style="font-size:.67rem;color:#9ca3af;margin:0;line-height:1.5;">'
      + '<i class="fas fa-info-circle" style="margin-right:.3rem;"></i>'
      + '¿Por qué este es el precio? El flete se calcula sobre el peso de cobro '
      + '(el mayor entre peso real y volumétrico), según la categoría arancelaria y la zona de destino.</p>';
    html += '</div>';
    // Total
    html += '<div style="background:#fff7ed;padding:.55rem 1rem;border-top:2px solid #1e293b;">';
    html += '<div class="qr-bd-total-row">'
      + '<span class="qr-bd-total-label">Total de envío</span>'
      + '<span class="qr-bd-total-value">' + esc(_fmtUsd(calc.total)) + '</span></div>';
    html += '</div>';
    html += '</div></div>';
    return html;
  }

  function _renderConsolidatedBreakdown(qr, perCalcs) {
    var con        = qr.consolidated || {};
    var n          = perCalcs.length;
    var grandTotal = con.grand_total_usd != null
                     ? con.grand_total_usd : (qr.confirmed_shipping_price_usd || 0);
    var totalDecl  = con.total_declared_value != null ? _fmtUsd(con.total_declared_value) : '—';
    var totalRealKg= con.total_real_weight_kg != null
                     ? Number(con.total_real_weight_kg).toFixed(3) + ' kg' : '—';
    var isVol      = con.weight_mode === 'volumetrico';
    var billKg     = con.billable_weight_kg != null
                     ? Number(con.billable_weight_kg).toFixed(3) + ' kg' : '—';
    var wModeLabel = isVol ? 'volumétrico' : 'real';

    // Determine if we have consolidated line items
    var hasConLineitems = con.freight != null || con.fuel != null || con.handling != null;

    var html = '<div class="px-4 pb-2 pt-2">';

    // ── Consolidated summary card
    html += '<div style="border-radius:.75rem;border:1.5px solid #fed7aa;overflow:hidden;margin-bottom:.75rem;">';
    html += '<div style="background:linear-gradient(135deg,#1e293b,#374155);padding:.65rem 1rem;">';
    html += '<p style="font-size:.6rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;'
      + 'color:rgba(255,255,255,.4);margin:0 0 .15rem;">Resumen consolidado de la cotización</p>';
    html += '<p style="font-size:.85rem;font-weight:700;color:#fff;margin:0;">'
      + n + ' producto' + (n !== 1 ? 's' : '') + ' en un bulto</p>';
    html += '</div>';

    // Summary rows
    html += '<div style="background:#fff;padding:.65rem 1rem;">';
    var totalVolKg = con.total_volumetric_weight_kg != null
                     ? Number(con.total_volumetric_weight_kg).toFixed(3) + ' kg' : '—';
    html += _qrBdRow('Número de productos', String(n));
    html += _qrBdRow('Valor declarado total', totalDecl);
    html += _qrBdRow('Peso total real', totalRealKg);
    html += _qrBdRow('Peso total volumétrico', totalVolKg);
    if (billKg !== '—') {
      html += _qrBdRow('Peso de cobro consolidado (' + esc(wModeLabel) + ')', billKg);
    }
    html += '</div>';

    // Consolidated line items (only when stored from calculator)
    if (hasConLineitems) {
      var delivVal = (con.delivery != null && Number(con.delivery) > 0)
                     ? _fmtUsd(con.delivery) : 'No aplica';
      html += '<div style="background:#fafafa;padding:.5rem 1rem;border-top:1px solid #f3f4f6;">';
      html += '<p style="font-size:.67rem;font-weight:700;text-transform:uppercase;'
        + 'letter-spacing:.07em;color:#9ca3af;margin:0 0 .3rem;">Desglose del envío consolidado</p>';
      html += _qrBdRow('Flete aéreo',        _fmtUsd(con.freight));
      html += _qrBdRow('Combustible (19%)',   _fmtUsd(con.fuel));
      html += _qrBdRow('Manejo',             _fmtUsd(con.handling));
      html += _qrBdRow('Impuestos / Aduana', _fmtUsd(con.taxes), 'impuesto local estimado');
      html += _qrBdRow('Seguro',             _fmtUsd(con.insurance));
      html += _qrBdRow('Entrega (CR)',       delivVal);
      html += '</div>';
    }

    if (con.savings_usd && Number(con.savings_usd) > 0) {
      html += '<div style="background:#f0fdf4;padding:.4rem 1rem;border-top:1px solid #dcfce7;">';
      html += '<span style="font-size:.78rem;color:#15803d;font-weight:600;">'
        + '&#10003; Ahorro vs. envíos individuales: ' + esc(_fmtUsd(con.savings_usd)) + '</span>';
      html += '</div>';
    }

    // Grand total bar
    html += '<div style="background:#fff7ed;padding:.55rem 1rem;border-top:2px solid #1e293b;">';
    html += '<div class="qr-bd-total-row">'
      + '<span class="qr-bd-total-label">Total de envío (consolidado)</span>'
      + '<span class="qr-bd-total-value">' + esc(_fmtUsd(grandTotal)) + '</span></div>';
    html += '</div></div>';

    // ── Per-product accordion
    html += '<details style="border-radius:.75rem;border:1px solid #e5e7eb;overflow:hidden;" open>';
    html += '<summary style="padding:.65rem 1rem;background:#f8fafc;cursor:pointer;list-none;'
      + 'display:flex;align-items:center;justify-content:space-between;user-select:none;">';
    html += '<span style="font-size:.82rem;font-weight:700;color:#1f2937;">'
      + 'Detalle por producto (envío individual)</span>';
    html += '<span style="font-size:.72rem;color:#9ca3af;">&#9662; toca para plegar</span>';
    html += '</summary>';
    perCalcs.forEach(function(calc, idx) {
      html += '<div style="border-top:1px solid #f3f4f6;">';
      html += '<div style="padding:.35rem 1rem .1rem;background:#fff;">';
      html += '<p style="font-size:.72rem;font-weight:700;text-transform:uppercase;'
        + 'letter-spacing:.07em;color:#9ca3af;margin:0;">'
        + esc(String(idx + 1) + '. ' + (calc.name || 'Producto ' + (idx + 1))) + '</p></div>';
      html += _renderSingleProductBreakdown(calc);
      html += '</div>';
    });
    html += '</details>';
    html += '</div>';
    return html;
  }

  function _renderPaymentBlock() {
    return '<div class="qr-payment-block">'
      + '<p style="font-size:.78rem;font-weight:700;color:#1f2937;margin:0 0 .5rem;">'
      + 'Cómo realizar el pago</p>'
      + '<div style="display:flex;flex-direction:column;gap:.45rem;">'
      + '<div style="display:flex;align-items:flex-start;gap:.65rem;">'
      + '<span style="font-size:.9rem;margin-top:.05rem;">&#128241;</span>'
      + '<div><p style="font-size:.78rem;font-weight:600;color:#374151;margin:0;">Sinpe Móvil</p>'
      + '<p style="font-size:.72rem;color:#6b7280;margin:0;">8979-4418 &mdash; CRBOX</p></div></div>'
      + '<div style="display:flex;align-items:flex-start;gap:.65rem;">'
      + '<span style="font-size:.9rem;margin-top:.05rem;">&#127981;</span>'
      + '<div><p style="font-size:.78rem;font-weight:600;color:#374151;margin:0;">Transferencia bancaria</p>'
      + '<p style="font-size:.72rem;color:#6b7280;margin:0;">'
      + 'Contáctanos para obtener los datos bancarios</p>'
      + '</div></div></div></div>';
  }

  function _renderCtaRow(scbId) {
    var waText = encodeURIComponent(
      'Hola CRBOX, tengo una consulta sobre mi cotización ' + scbId + '.'
    );
    return '<div class="qr-cta-row">'
      + '<a href="https://wa.me/50689794418?text=' + waText + '" target="_blank" '
      + 'rel="noopener noreferrer" '
      + 'style="display:inline-flex;align-items:center;gap:.5rem;padding:.6rem 1rem;'
      + 'border-radius:.75rem;font-size:.82rem;font-weight:600;'
      + 'background:#16a34a;color:#fff;text-decoration:none;">'
      + '<i class="fab fa-whatsapp"></i> Contactar por WhatsApp</a>'
      + '<a href="mailto:ventas@crbox.cr?subject='
      + encodeURIComponent('Consulta sobre cotización ' + scbId) + '" '
      + 'style="display:inline-flex;align-items:center;gap:.5rem;padding:.6rem 1rem;'
      + 'border-radius:.75rem;font-size:.82rem;font-weight:600;'
      + 'background:#fff;border:1px solid #e5e7eb;color:#374151;text-decoration:none;">'
      + '<i class="fas fa-envelope" style="font-size:.8rem;"></i> Responder por correo</a>'
      + '</div>';
  }

  function _renderQuoteResponse(sol, qr) {
    var section = document.getElementById('qr-section');
    if (!section) { console.warn('[QR] #qr-section not found'); return; }

    var perCalcs = qr.perProductCalculations || [];
    var isMulti  = perCalcs.length > 1;

    var respondedAt    = formatDate(qr.sent_at || sol.responded_at || '');
    var avail          = qr.availability || '';
    var AVAIL_LABELS   = { disponible: 'Disponible', no_disponible: 'No disponible',
                           disponible_con_condiciones: 'Disponible con condiciones' };
    var availLabel     = AVAIL_LABELS[avail] || avail;
    var delivTL        = qr.delivery_timeline || '';
    var conditions     = qr.conditions || '';
    var custMsg        = qr.customer_message || '';
    var confirmedPrice = qr.confirmed_shipping_price_usd;

    // Availability badge colors
    var availBg = { disponible: '#f0fdf4', no_disponible: '#fef2f2',
                    disponible_con_condiciones: '#fffbeb' };
    var availFg = { disponible: '#15803d', no_disponible: '#dc2626',
                    disponible_con_condiciones: '#d97706' };
    var availBdr= { disponible: '#86efac', no_disponible: '#fca5a5',
                    disponible_con_condiciones: '#fde68a' };
    var availDot= { disponible: '#22c55e', no_disponible: '#ef4444',
                    disponible_con_condiciones: '#f59e0b' };

    var html = '<div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">';

    // ── Header
    html += '<div class="qr-section-hdr">';
    html += '<div style="width:1.85rem;height:1.85rem;background:linear-gradient(135deg,#16a34a,#22c55e);'
      + 'border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;'
      + 'box-shadow:0 2px 6px rgba(22,163,74,.25);">'
      + '<i class="fas fa-check text-white" style="font-size:.7rem;"></i></div>';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">';
    html += '<p style="font-size:.875rem;font-weight:700;color:#fff;margin:0;">'
      + 'Cotización respondida por CRBOX</p>';
    // Quote status badge
    html += '<span style="display:inline-flex;align-items:center;padding:.1rem .55rem;'
      + 'border-radius:999px;font-size:.65rem;font-weight:700;letter-spacing:.04em;'
      + 'background:rgba(255,255,255,.15);color:rgba(255,255,255,.9);border:1px solid rgba(255,255,255,.25);">'
      + 'COTIZACIÓN COMPLETADA</span>';
    html += '</div>';
    html += '<p style="font-size:.72rem;color:rgba(255,255,255,.5);margin:.15rem 0 0;">'
      + esc(sol.id) + ' &middot; ' + esc(respondedAt) + '</p>';
    html += '</div></div>';

    // ── Availability + timeline chips
    html += '<div style="padding:.75rem 1.25rem .25rem;display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;">';
    html += '<span style="display:inline-flex;align-items:center;gap:.4rem;padding:.2rem .7rem;'
      + 'border-radius:999px;font-size:.78rem;font-weight:600;'
      + 'background:' + (availBg[avail] || '#f9fafb') + ';'
      + 'color:' + (availFg[avail] || '#374151') + ';'
      + 'border:1px solid ' + (availBdr[avail] || '#e5e7eb') + ';">'
      + '<span style="width:.45rem;height:.45rem;border-radius:50%;'
      + 'background:' + (availDot[avail] || '#9ca3af') + ';'
      + 'display:inline-block;flex-shrink:0;"></span>' + esc(availLabel) + '</span>';
    if (delivTL) {
      html += '<span style="font-size:.78rem;color:#6b7280;">'
        + '<i class="fas fa-clock" style="margin-right:.3rem;font-size:.7rem;"></i>'
        + esc(delivTL) + '</span>';
    }
    html += '</div>';

    // ── Grand total hero
    if (confirmedPrice != null) {
      html += '<div class="qr-price-total">';
      html += '<div style="width:2.4rem;height:2.4rem;background:linear-gradient(135deg,#ea580c,#f97316);'
        + 'border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;'
        + 'box-shadow:0 2px 8px rgba(234,88,12,.3);">'
        + '<i class="fas fa-tag text-white" style="font-size:.75rem;"></i></div>';
      html += '<div>'
        + '<div style="font-size:1.45rem;font-weight:800;color:#ea580c;letter-spacing:-.02em;line-height:1;">'
        + esc(_fmtUsd(confirmedPrice)) + '</div>'
        + '<div style="font-size:.72rem;color:#c2410c;margin-top:.15rem;font-weight:500;">'
        + 'Precio total de envío confirmado</div></div>';
      html += '</div>';
    }

    // ── Customer message
    if (custMsg) {
      html += '<div style="margin:.75rem 1.25rem .25rem;">';
      html += '<p style="font-size:.7rem;font-weight:700;text-transform:uppercase;'
        + 'letter-spacing:.07em;color:#9ca3af;margin:0 0 .35rem;">Mensaje de CRBOX</p>';
      html += '<p style="font-size:.875rem;color:#1f2937;line-height:1.6;background:#f9fafb;'
        + 'border:1px solid #f3f4f6;border-radius:.75rem;padding:.75rem 1rem;margin:0;">'
        + esc(custMsg) + '</p></div>';
    }

    // ── Conditions
    if (conditions) {
      html += '<div style="margin:.5rem 1.25rem .25rem;">';
      html += '<p style="font-size:.7rem;font-weight:700;text-transform:uppercase;'
        + 'letter-spacing:.07em;color:#9ca3af;margin:0 0 .25rem;">Condiciones</p>';
      html += '<p style="font-size:.82rem;color:#374151;line-height:1.55;margin:0;">'
        + esc(conditions) + '</p></div>';
    }

    // ── Breakdown section header
    html += '<div style="margin:1rem 1.25rem 0;border-top:1px solid #f3f4f6;padding-top:.75rem;">';
    html += '<p style="font-size:.7rem;font-weight:700;text-transform:uppercase;'
      + 'letter-spacing:.08em;color:#6b7280;margin:0;">'
      + '<i class="fas fa-calculator" style="margin-right:.35rem;"></i>Desglose de costos</p></div>';

    // ── Breakdown (single or consolidated)
    if (!perCalcs.length) {
      html += '<p style="font-size:.82rem;color:#9ca3af;padding:.75rem 1.25rem;">'
        + 'Desglose no disponible.</p>';
    } else if (isMulti) {
      html += _renderConsolidatedBreakdown(qr, perCalcs);
    } else {
      html += _renderSingleProductBreakdown(perCalcs[0]);
    }

    // ── Disclaimer
    var discBase = 'Esta cotización fue preparada por el equipo de CRBOX con base en la '
      + 'información del producto, peso, dimensiones, categoría arancelaria, modalidad de '
      + 'entrega y costos operativos aplicables.';
    var discMulti = isMulti
      ? ' Como esta solicitud incluye varios productos, agrupamos los cálculos para mostrarte '
        + 'un resumen total y el detalle individual de cada producto.'
      : '';
    html += '<div class="qr-disclaimer">' + esc(discBase + discMulti) + '</div>';

    // ── Payment instructions
    html += _renderPaymentBlock();

    // ── Support CTAs
    html += _renderCtaRow(sol.id);

    html += '</div>';
    section.innerHTML = html;
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
      var _priceStr = isNaN(price) ? String(parsed.confirmed_shipping_price_usd) : '$' + price.toFixed(2) + ' USD';
      _setText('resp-price', _priceStr);
      _show('resp-price-row');
      // Price hero display
      var _heroValEl = document.getElementById('resp-price-hero-val');
      var _heroEl    = document.getElementById('resp-price-hero');
      if (_heroValEl) _heroValEl.textContent = _priceStr;
      if (_heroEl)    _heroEl.classList.remove('hidden');
      hasContent = true;
    }
    if (parsed.availability) {
      var _availLabels = {
        disponible: 'Disponible',
        no_disponible: 'No disponible',
        disponible_con_condiciones: 'Disponible con condiciones'
      };
      _setText('resp-avail', _availLabels[parsed.availability] || parsed.availability);
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

    // Render itemized breakdown if present
    if (parsed.quote_breakdown) {
      _renderBreakdown(parsed.quote_breakdown);
    }

    return hasContent;
  }

  var _BD_LINE_LABELS = {
    freight:  'Flete aéreo',
    fuel:     'Combustible (19%)',
    handling: 'Manejo',
    taxes:    'Impuestos / Aduana',
    insurance:'Seguro',
    delivery: 'Entrega (CR)'
  };

  function _renderBreakdown(bd) {
    var section = document.getElementById('resp-breakdown-section');
    var tableEl = document.getElementById('resp-breakdown-table');
    var totalEl = document.getElementById('resp-breakdown-total');
    if (!section || !tableEl) return;
    var products = bd.products || [];
    if (!products.length) return;

    tableEl.innerHTML = products.map(function(p, idx) {
      var name = p.name || ('Producto ' + (idx + 1));
      var ship = (p.shipping_usd != null) ? '$' + Number(p.shipping_usd).toFixed(2) + ' USD' : '—';
      var meta = [];
      if (p.weight_kg) meta.push(p.weight_kg + ' kg');
      if (p.declared_value_usd) meta.push('valor $' + Number(p.declared_value_usd).toFixed(2));

      var det = p.details || {};
      var lineKeys = ['freight','fuel','handling','taxes','insurance','delivery'];
      var hasDetails = lineKeys.some(function(k) { return det[k] != null; });
      var lineItemsHtml = '';
      if (hasDetails) {
        lineItemsHtml = lineKeys.filter(function(k) { return det[k] != null; }).map(function(k) {
          return '<div class="flex justify-between text-xs text-green-700 py-0.5">'
            + '<span>' + esc(_BD_LINE_LABELS[k] || k) + '</span>'
            + '<span class="font-medium ml-4">$' + Number(det[k]).toFixed(2) + ' USD</span>'
            + '</div>';
        }).join('');
      }

      var summaryMeta = meta.length ? ' <span class="font-normal text-green-600 text-xs">' + esc(meta.join(' · ')) + '</span>' : '';
      return '<details class="border border-green-100 rounded-xl mb-2 last:mb-0 overflow-hidden" open>'
        + '<summary class="flex justify-between items-center px-3 py-2 bg-green-50 cursor-pointer list-none">'
        + '<span class="text-xs font-semibold text-green-900">' + esc(name) + summaryMeta + '</span>'
        + '<span class="text-xs font-bold text-green-800 whitespace-nowrap ml-4">' + esc(ship) + '</span>'
        + '</summary>'
        + (lineItemsHtml
            ? '<div class="px-3 pb-2 pt-1">' + lineItemsHtml + '</div>'
            : '')
        + '</details>';
    }).join('');

    if (bd.grand_total_usd != null) {
      totalEl.textContent = 'Total envío estimado: $' + Number(bd.grand_total_usd).toFixed(2) + ' USD';
    }
    section.classList.remove('hidden');
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

    // Product card — parse multi-product array if present
    var _solProducts = [];
    if (sol.products) {
      try {
        var _pp = typeof sol.products === 'string' ? JSON.parse(sol.products) : sol.products;
        if (Array.isArray(_pp) && _pp.length > 0) _solProducts = _pp;
      } catch (e) {}
    }

    if (_solProducts.length > 1) {
      var singleEl = document.getElementById('sol-single-product');
      if (singleEl) singleEl.classList.add('hidden');
      var titleEl = document.getElementById('sol-product-title');
      if (titleEl) titleEl.textContent = _solProducts.length + ' productos';
      var multiEl = document.getElementById('sol-multi-products');
      if (multiEl) {
        multiEl.innerHTML = _solProducts.map(function (p, i) {
          var pName = esc(p.name || ('Producto ' + (i + 1)));
          var pCat  = esc(CATEGORY_LABELS[p.category] || p.category || 'Otros');
          var pVal  = p.declared_value_usd != null ? '$' + Number(p.declared_value_usd).toFixed(2) + ' USD' : '—';
          var pUrl  = p.url || '';
          var urlHtml = pUrl
            ? '<a href="' + esc(pUrl) + '" target="_blank" rel="noopener noreferrer" '
              + 'class="text-blue-600 hover:text-blue-800 underline break-all text-xs">'
              + esc(pUrl.replace(/https?:\/\//i, '').substring(0, 55))
              + (pUrl.length > 55 ? '…' : '') + '</a>'
            : '<span class="text-gray-400 text-xs">No proporcionada</span>';
          return '<details class="border border-gray-100 rounded-xl mb-2 last:mb-0 overflow-hidden" open>'
            + '<summary class="flex justify-between items-center px-4 py-2.5 bg-gray-50 '
            + 'cursor-pointer list-none select-none">'
            + '<span class="text-sm font-semibold text-gray-900">' + (i + 1) + '. ' + pName + '</span>'
            + '<span class="text-xs font-medium text-gray-500 ml-3 whitespace-nowrap">' + esc(pVal) + '</span>'
            + '</summary>'
            + '<div class="px-4 py-2">'
            + '<div class="detail-row"><span class="detail-label">Categoría</span>'
            + '<span class="detail-value">' + pCat + '</span></div>'
            + '<div class="detail-row"><span class="detail-label">Valor declarado</span>'
            + '<span class="detail-value font-semibold text-gray-900">' + esc(pVal) + '</span></div>'
            + '<div class="detail-row"><span class="detail-label">Enlace</span>'
            + '<span class="detail-value">' + urlHtml + '</span></div>'
            + '</div>'
            + '</details>';
        }).join('');
        multiEl.classList.remove('hidden');
      }
    } else {
      var _p0 = _solProducts.length === 1 ? _solProducts[0] : null;
      _setText('sol-product-name', (_p0 ? (_p0.name || sol.product_name) : sol.product_name) || '—');
      var _cat0 = _p0 ? (_p0.category || sol.category) : sol.category;
      _setText('sol-category', CATEGORY_LABELS[_cat0] || _cat0 || 'Otros');
      var _val0 = (_p0 != null && _p0.declared_value_usd != null) ? _p0.declared_value_usd : sol.declared_value_usd;
      _setText('sol-value', _val0 != null ? '$' + Number(_val0).toFixed(2) + ' USD' : '—');

      var urlEl = document.getElementById('sol-url');
      if (urlEl) {
        var _pUrl = (_solProducts.length === 1 ? (_solProducts[0].url || sol.product_url) : sol.product_url) || '';
        if (_pUrl) {
          urlEl.innerHTML = '<a href="' + esc(_pUrl) + '" target="_blank" rel="noopener noreferrer" '
            + 'class="text-blue-600 hover:text-blue-800 underline break-all text-sm">'
            + esc(_pUrl.replace(/https?:\/\//i, '').substring(0, 60))
            + (_pUrl.length > 60 ? '…' : '') + '</a>';
        } else {
          urlEl.textContent = 'No proporcionada';
          urlEl.className = 'text-gray-400 text-sm';
        }
      }
    }

    _setText('sol-service', SERVICE_LABELS[sol.service_type] || 'Aéreo');

    // S-2: Destination zone
    var ZONE_LABELS = {
      sanjose: 'San José', heredia: 'Heredia', alajuela: 'Alajuela',
      cartago: 'Cartago', guanacaste: 'Guanacaste', puntarenas: 'Puntarenas', limon: 'Limón'
    };
    var destEl  = document.getElementById('sol-destination');
    var destRow = document.getElementById('sol-destination-row');
    if (destEl) {
      var dz = sol.destination_zone || '';
      if (dz) {
        destEl.textContent = ZONE_LABELS[dz] || dz;
        if (destRow) destRow.classList.remove('hidden');
      } else {
        if (destRow) destRow.classList.add('hidden');
      }
    }

    // S-1: Weight — hide row when absent
    var weightEl  = document.getElementById('sol-weight');
    var weightRow = document.getElementById('sol-weight-row');
    if (weightEl) {
      if (sol.weight_kg) {
        weightEl.textContent = sol.weight_kg + ' kg';
        if (weightRow) weightRow.classList.remove('hidden');
      } else {
        if (weightRow) weightRow.classList.add('hidden');
      }
    }

    // S-1: Dimensions — hide row when absent
    var dimsEl  = document.getElementById('sol-dims');
    var dimsRow = document.getElementById('sol-dims-row');
    if (dimsEl) {
      if (sol.length_cm && sol.width_cm && sol.height_cm) {
        dimsEl.textContent = 'L' + sol.length_cm + ' × W' + sol.width_cm + ' × H' + sol.height_cm + ' cm';
        if (dimsRow) dimsRow.classList.remove('hidden');
      } else {
        if (dimsRow) dimsRow.classList.add('hidden');
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
                     'panel-confirm-payment', 'panel-payment-confirmed', 'panel-comprado',
                     'panel-listo-para-retiro', 'panel-pending-cliente', 'panel-completed'];
    allPanels.forEach(_hide);

    if (status === 'enviada' || status === 'en_revision') {
      _show('panel-reviewing');

    } else if (status === 'respondida') {
      _show('panel-responded');
      // Normalize from all possible key variants
      var _rawResp = sol.response_json || sol.quoteResponse || sol.responseJson;
      var _qr = normalizeQuoteResponse(_rawResp);

      if (_qr && _qr.perProductCalculations && _qr.perProductCalculations.length > 0) {
        // Task #360: rich portal breakdown
        _hide('resp-block');
        _hide('resp-fallback');
        try {
          _renderQuoteResponse(sol, _qr);
          _show('qr-section');
        } catch(e) {
          console.warn('[Solicitud] _renderQuoteResponse error:', e);
          var qrEl = document.getElementById('qr-section');
          if (qrEl) {
            qrEl.innerHTML = '<div class="flex items-start gap-3 bg-green-50 border border-green-200 '
              + 'rounded-2xl px-5 py-4"><i class="fas fa-envelope text-green-500 mt-0.5 '
              + 'flex-shrink-0"></i><div><p class="text-sm text-green-900 font-semibold mb-0.5">'
              + 'CRBOX respondió a esta solicitud</p><p class="text-sm text-green-800">'
              + 'Revisa tu correo para ver los detalles del precio final.</p></div></div>';
            _show('qr-section');
          }
        }
        // Show intent section for available responses
        var _avail = _qr.availability || '';
        if (_avail !== 'no_disponible' && _avail !== '') {
          _show('resp-intent-section');
        }

      } else {
        // Ungated or no structured data — truthful email fallback
        // (never render a partial/broken legacy block)
        _hide('resp-block');
        _hide('qr-section');
        var emailNoticeEl = document.getElementById('panel-responded-email');
        if (emailNoticeEl) emailNoticeEl.textContent = _userEmail;
        // Show intent section if we can determine availability from legacy shape
        try {
          var _lgParsed = typeof _rawResp === 'string'
            ? JSON.parse(_rawResp) : (_rawResp || {});
          var _lgAvail = _lgParsed.availability || '';
          if (_lgAvail && _lgAvail !== 'no_disponible') {
            _show('resp-intent-section');
          }
        } catch(e) {}
      }

    } else if (status === 'pendiente_compra_crbox') {
      _show('panel-pending-crbox');

    } else if (status === 'pendiente_confirmacion_pago_cliente') {
      _show('panel-confirm-payment');

    } else if (status === 'pagado_por_cliente') {
      _show('panel-payment-confirmed');

    } else if (status === 'comprado') {
      _show('panel-comprado');

    } else if (status === 'listo_para_retiro') {
      _show('panel-listo-para-retiro');

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

    // ── Timeline — S-4: reverse to chronological (oldest → newest) ───────────
    var timeline = document.getElementById('sol-timeline');
    if (timeline && sol.history && sol.history.length > 0) {
      var histArr = sol.history.slice().reverse();
      timeline.innerHTML = histArr.map(function (h, i) {
        var isLatest = i === histArr.length - 1;
        var actor = ACTOR_LABELS[h.changed_by] || h.changed_by || 'Sistema';
        var label = STATUS_LABELS[h.to_status] || h.to_status;
        var c = STATUS_COLORS[h.to_status] || { dot: 'bg-gray-300', text: 'text-gray-600' };
        return (
          '<div class="flex gap-3 ' + (i > 0 ? 'mt-1' : '') + '">' +
            '<div class="flex flex-col items-center">' +
              '<div class="w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ' + c.dot + (isLatest ? ' ring-2 ring-offset-1 ring-current' : '') + '"></div>' +
              (i < histArr.length - 1 ? '<div class="w-0.5 flex-1 bg-gray-200 mt-1"></div>' : '') +
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
          mobileMenuBtn.setAttribute('aria-expanded', 'true');
        } else {
          mobileMenu.classList.add('hidden');
          mobileMenuBtn.querySelector('i').className = 'fas fa-bars text-xl';
          mobileMenuBtn.setAttribute('aria-expanded', 'false');
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
