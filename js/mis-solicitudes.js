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
  var _portalAiActive     = false;
  var _portalAiDataSource = 'manual';
  var _portalTomSelect    = null;
  var _portalAutoEstimate = null;

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

  var ACTIVE_STATUSES   = ['enviada', 'en_revision', 'respondida', 'pendiente_compra_crbox',
                           'pendiente_confirmacion_pago_cliente', 'pagado_por_cliente', 'comprado',
                           'listo_para_retiro', 'pendiente_compra_cliente'];
  var ARCHIVED_STATUSES = ['completada', 'cancelada', 'expirada'];

  // ─── Category labels ────────────────────────────────────────────────────────
  var CATEGORY_LABELS = {
    accesorios_impresora: 'Accesorios de Impresora',
    adaptador:            'Adaptador',
    adornos:              'Adornos',
    alarma:               'Alarma',
    alfombra:             'Alfombra',
    amortiguadores:       'Amortiguadores',
    amplificador:         'Amplificador',
    amplificador_grabador:'Amplificador con grabador',
    antena:               'Antena',
    anteojos:             'Anteojos',
    aros_bicicleta:       'Aros de Bicicleta',
    aros_carro_moto:      'Aros de Carro/Moto',
    arrancador:           'Arrancador',
    articulos_fiesta:     'Artículos para Fiesta',
    aspiradora:           'Aspiradora',
    auricular_telefono:   'Auricular de Teléfono',
    baterias:             'Baterías laptop/celular',
    bicicleta_economica:  'Bicicleta CIF <$1000',
    bicicleta_cara:       'Bicicleta CIF $1000+',
    binoculares:          'Binoculares',
    bocina:               'Bocina / Pito',
    bola:                 'Bola deportiva',
    bomba_aceite_agua:    'Bomba de Aceite/Agua',
    bombillos:            'Bombillos',
    bujias:               'Bujías',
    cables_electricos:    'Cables Eléctricos',
    calculadora:          'Calculadora',
    camara:               'Cámara Fotográfica/Video',
    cana_pescar:          'Caña de Pescar',
    cargador:             'Cargador',
    casco_seguridad:      'Casco de Seguridad',
    case_cpu:             'Case para CPU',
    cds:                  'CDs / Discos',
    celulares:            'Celulares',
    cinturon:             'Cinturón',
    cluth:                'Clutch de Vehículo',
    coche_bebe:           'Coche de Bebé',
    colchon:              'Colchón',
    computadora:          'Computadora',
    consola_videojuegos:  'Consola de Videojuegos',
    control_remoto:       'Control Remoto',
    cortinas:             'Cortinas',
    disco_duro:           'Disco Duro',
    diskman_walkman:      'Discman / Walkman',
    dvds:                 'DVDs',
    electrodomesticos:    'Electrodomésticos',
    equipo_karaoke:       'Equipo de Karaoke',
    equipo_sonido:        'Equipo de Sonido',
    filtro_aceite_aire:   'Filtro de Aceite/Aire',
    filtro_agua:          'Filtro de Agua',
    fluorescente:         'Fluorescente / Tubo LED',
    fotocopiadora:        'Fotocopiadora',
    fuente_poder:         'Fuente de Poder',
    gata_hidraulica:      'Gata Hidráulica',
    gorras:               'Gorras',
    griferia:             'Grifería',
    guitarra_acustica:    'Guitarra Acústica',
    guitarra_electrica:   'Guitarra Eléctrica',
    herramientas:         'Herramientas',
    home_teather:         'Home Theater',
    impresora:            'Impresora',
    instrumentos_musicales:'Instrumentos Musicales',
    ipod_mp3_mp4:         'iPod / MP3 / MP4',
    joyeria_bisuteria:    'Joyería / Bisutería',
    juego_mesa:           'Juego de Mesa',
    juguetes:             'Juguetes',
    lampara:              'Lámpara',
    lector_dvd_cd:        'Lector DVD / CD',
    lente_camara:         'Lente de Cámara',
    lente_contacto:       'Lente de Contacto',
    libros:               'Libros',
    llave_maya:           'Llave Maya / Llave Inglesa',
    llantas_vehiculo:     'Llantas de Vehículo',
    luces_carro:          'Luces de Carro',
    maletines_bolsos:     'Maletines / Bolsos',
    manguera:             'Manguera',
    maquina_coser_soldar: 'Máquina de Coser/Soldar',
    memoria:              'Memoria / SSD',
    microscopio:          'Microscopio',
    mixer:                'Mixer de Audio',
    molduras_vehiculo:    'Molduras de Vehículo',
    monitor:              'Monitor',
    muebles:              'Muebles',
    mufla:                'Mufla de Escape',
    ollas_sartenes:       'Ollas / Sartenes',
    palos_golf:           'Palos de Golf',
    panos:                'Paños / Trapos',
    papel:                'Papel',
    parabrisas:           'Parabrisas',
    parlantes:            'Parlantes',
    partes_carroceria:    'Partes de Carrocería',
    patines:              'Patines',
    pelucas:              'Pelucas',
    pinon:                'Piñón',
    plancha_pelo:         'Plancha de Pelo',
    platos_ceramica:      'Platos / Cerámica',
    posters:              'Pósters / Cuadros',
    procesador:           'Procesador CPU',
    proyector_video:      'Proyector de Video',
    quemador_cd_dvd:      'Quemador CD/DVD',
    rack_carro:           'Rack de Carro',
    radiador:             'Radiador',
    radio_carro:          'Radio de Carro',
    radio_comunicacion:   'Radio de Comunicación',
    raqueta:              'Raqueta',
    rasuradora_electrica: 'Rasuradora Eléctrica',
    refrigerador:         'Refrigerador',
    relojes:              'Relojes',
    reproductor_bluray:   'Reproductor Blu-ray',
    repuestos_vehiculo:   'Repuestos de Vehículo',
    retrovisor:           'Retrovisor',
    romana:               'Romana / Báscula',
    ropa:                 'Ropa',
    router:               'Router / Switch',
    sabanas:              'Sábanas',
    secadoras_pelo:       'Secadora de Pelo',
    silla_bebe_carro:     'Silla de Bebé para Carro',
    sleeping_bag:         'Sleeping Bag / Saco de Dormir',
    software:             'Software',
    sombrilla:            'Sombrilla / Paraguas',
    sombrilla_fotografia: 'Sombrilla de Fotografía',
    suspension_carro:     'Suspensión de Carro',
    suspension_moto:      'Suspensión de Moto',
    tabla_surf:           'Tabla de Surf',
    tableta_electronica:  'Tableta / iPad',
    tarjeta_madre:        'Tarjeta Madre',
    tarjeta_video_sonido: 'Tarjeta de Video/Sonido',
    teclado_computadora:  'Teclado de Computadora',
    teclado_musical:      'Teclado Musical',
    telefonos:            'Teléfonos',
    televisor:            'Televisor',
    tienda_campana:       'Tienda de Campaña',
    tripode:              'Trípode',
    valvulas:             'Válvulas',
    vaso_vidrio:          'Vasos / Cristalería',
    ventiladores_computadora: 'Ventiladores para PC',
    video_juegos:         'Video Juegos',
    video_monitor:        'Video Monitor',
    zapatos:              'Zapatos',
    otros:                'Otros'
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
        ? 'Nueva cotización — Cuenta empresarial'
        : 'Nueva cotización';
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
    if (_portalTomSelect) { _portalTomSelect.clear(true); }
    var estimatePanelReset = document.getElementById('portal-estimate-panel');
    if (estimatePanelReset) estimatePanelReset.classList.add('hidden');
    _portalAutoEstimate = null;
    if (successEl) successEl.classList.add('hidden');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Enviar cotización';
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
    _portalAiActive     = false;
    _portalAiDataSource = 'manual';
    if (typeof CRBOXAIExtractor !== 'undefined') {
      CRBOXAIExtractor.resetExtraction({
        bannerTarget:   document.getElementById('ai-extract-banner-portal'),
        fName:          document.getElementById('form-product-name'),
        fValue:         document.getElementById('form-declared-value'),
        fCategory:      document.getElementById('form-category'),
        confirmWrapper: document.getElementById('ai-confirm-portal'),
      });
    } else {
      var aiBannerEl  = document.getElementById('ai-extract-banner-portal');
      var aiConfirmEl = document.getElementById('ai-confirm-portal');
      if (aiBannerEl)  aiBannerEl.innerHTML = '';
      if (aiConfirmEl) { aiConfirmEl.style.display = 'none'; aiConfirmEl.style.outline = ''; }
    }
  }

  function _setFormField(id, value) {
    var el = document.getElementById(id);
    if (el && value != null) el.value = value;
  }
  function _setSelectField(id, value) {
    if (id === 'form-category' && _portalTomSelect) {
      _portalTomSelect.setValue(value, true);
    } else {
      var el = document.getElementById(id);
      if (el && value) el.value = value;
    }
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
    // Attach AI extraction snapshot for admin visibility
    if (_portalAiActive && typeof CRBOXAIExtractor !== 'undefined') {
      var lastResult = CRBOXAIExtractor.getLastResult();
      if (lastResult) payload.ai_extraction_result = lastResult;
    }
    // Attach live estimate if available
    if (_portalAutoEstimate) {
      payload.estimate_usd = _portalAutoEstimate.estimate_usd;
      payload.estimate_breakdown = _portalAutoEstimate.estimate_breakdown;
    }

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
      submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Enviar cotización';
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

    // ── TomSelect for category dropdown ───────────────────────────────────────
    (function () {
      var catEl = document.getElementById('form-category');
      if (catEl && typeof TomSelect !== 'undefined') {
        _portalTomSelect = new TomSelect(catEl, {
          placeholder:       '— Buscar categoría —',
          allowEmptyOption:  true,
          maxOptions:        300,
          searchField:       ['text'],
          onChange: function () {
            _triggerPortalEstimate();
          }
        });
      }
    })();

    // ── Live estimate ─────────────────────────────────────────────────────────
    function _triggerPortalEstimate() {
      var valEl  = document.getElementById('form-declared-value');
      var catEl  = document.getElementById('form-category');
      var svcEl  = document.getElementById('form-service-type');
      var panel  = document.getElementById('portal-estimate-panel');
      var airDiv = document.getElementById('portal-estimate-air');
      var marDiv = document.getElementById('portal-estimate-maritime');

      if (!panel) return;

      var val = valEl ? parseFloat(valEl.value) : NaN;
      var cat = _portalTomSelect ? _portalTomSelect.getValue() : (catEl ? catEl.value : '');
      var svc = svcEl ? svcEl.value : 'aereo';

      var hasVal = !isNaN(val) && val > 0;
      var hasCat = !!cat;

      if (!hasVal || !hasCat) {
        panel.classList.add('hidden');
        _portalAutoEstimate = null;
        return;
      }

      panel.classList.remove('hidden');

      if (svc === 'maritimo') {
        if (airDiv) airDiv.classList.add('hidden');
        if (marDiv) marDiv.classList.remove('hidden');
        _portalAutoEstimate = null;
        return;
      }

      if (airDiv) airDiv.classList.remove('hidden');
      if (marDiv) marDiv.classList.add('hidden');

      if (typeof CRBOXCalcEngine !== 'undefined' && typeof CRBOXTariffAdapter !== 'undefined') {
        try {
          var pkg = { category: cat, declared_value_usd: val, weight_kg: 0, service_type: 'aereo' };
          var result = CRBOXCalcEngine.calcSinglePackage(pkg);
          if (result && result.ok) {
            var freight   = result.freight_usd || 0;
            var taxes     = result.taxes_usd || 0;
            var total     = result.total_usd || 0;
            var fmt = function (n) { return '$' + n.toFixed(2); };
            var peFreight = document.getElementById('pe-freight');
            var peTaxes   = document.getElementById('pe-taxes');
            var peTotal   = document.getElementById('pe-total');
            if (peFreight) peFreight.textContent = fmt(freight);
            if (peTaxes)   peTaxes.textContent   = fmt(taxes);
            if (peTotal)   peTotal.textContent    = fmt(total);
            _portalAutoEstimate = {
              estimate_usd: total,
              estimate_breakdown: {
                freight_usd: freight,
                taxes_usd:   taxes,
                total_usd:   total,
                category:    cat,
                declared_value_usd: val,
                service_type: 'aereo'
              }
            };
          } else {
            _portalAutoEstimate = null;
          }
        } catch (ex) {
          _portalAutoEstimate = null;
        }
      }
    }

    var _fValEl = document.getElementById('form-declared-value');
    var _fSvcEl = document.getElementById('form-service-type');
    if (_fValEl) _fValEl.addEventListener('input', _triggerPortalEstimate);
    if (_fSvcEl) _fSvcEl.addEventListener('change', _triggerPortalEstimate);

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

      var btnPortalAnalizar = document.getElementById('btn-ai-analizar-portal');

      var _PORTAL_CATEGORY_MAP = {
        'vehiculos':     'repuestos_vehiculo',
        'salud_belleza': 'otros',
        'suplementos':   'otros',
        'celular':       'celulares',
        'electronico':   'otros',
        'electrodomestico': 'electrodomesticos',
        'herramienta':   'herramientas',
        'juguete':       'juguetes',
        'libro':         'libros',
        'deportivo':     'bola',
        'cosmetico':     'otros',
        'suplemento':    'otros',
        'equipo_medico': 'otros',
      };

      function _doPortalAiExtract() {
        var url = (fPortalUrl.value || '').trim();
        if (!url || !url.startsWith('http')) return;
        _portalAiActive = false;
        CRBOXAIExtractor.runExtraction(url, {
          bannerTarget:   aiBanner,
          fName:          fPortalName,
          fValue:         fPortalValue,
          fCategory:      fPortalCat,
          confirmWrapper: aiConfirm,
          categoryMap:    _PORTAL_CATEGORY_MAP,
        }).then(function () {
          var b = aiBanner ? aiBanner.querySelector('.ai-extract-banner') : null;
          if (b && (b.classList.contains('ai-banner-success') ||
                    b.classList.contains('ai-banner-partial'))) {
            _portalAiActive = true;
          }
        });
      }

      if (btnPortalAnalizar) {
        btnPortalAnalizar.addEventListener('click', _doPortalAiExtract);
      }
      function _syncPortalAiSubmitGate() {
        var submitBtn   = document.getElementById('form-submit-btn');
        var confirmWrap = document.getElementById('ai-confirm-portal');
        var confirmChk  = document.getElementById('ai-confirm-chk-portal');
        var wrapVisible = confirmWrap && confirmWrap.style.display !== 'none';
        var checked     = confirmChk && confirmChk.checked;
        var shouldBlock = wrapVisible && !checked;
        if (submitBtn) {
          submitBtn.disabled         = shouldBlock;
          submitBtn.style.opacity    = shouldBlock ? '0.5' : '';
          submitBtn.style.cursor     = shouldBlock ? 'not-allowed' : '';
        }
      }
      var _portalConfirmChkEl = document.getElementById('ai-confirm-chk-portal');
      if (_portalConfirmChkEl) {
        _portalConfirmChkEl.addEventListener('change', _syncPortalAiSubmitGate);
      }
      document.addEventListener('ai:extraction-complete', function (e) {
        if (e.detail && e.detail.dataSource) {
          _portalAiDataSource = e.detail.dataSource;
        }
        setTimeout(_syncPortalAiSubmitGate, 0);
      });
      fPortalUrl.addEventListener('input', function () {
        var url = (this.value || '').trim();
        if (!url) {
          CRBOXAIExtractor.resetExtraction({
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
        var fPortalCatEl     = document.getElementById('form-category');
        if (fPortalCatEl &&
            fPortalCatEl.dataset.aiSuggested === '1' &&
            fPortalCatEl.dataset.aiConfirmed  !== '1') {
          if (errorMsg) {
            errorMsg.textContent = 'Por favor confirma la categoría del producto en el menú desplegable.';
            errorMsg.classList.remove('hidden');
          }
          fPortalCatEl.focus();
          return;
        }
        if (_portalAiActive && typeof CRBOXAIExtractor !== 'undefined') {
          var fconf = CRBOXAIExtractor.allFieldsConfirmed();
          if (!fconf.ok) {
            if (errorMsg) {
              errorMsg.textContent = 'Revisa los campos marcados con "Confirmar" antes de enviar.';
              errorMsg.classList.remove('hidden');
            }
            fconf.unconfirmedIds.forEach(function (fid) {
              var el = document.getElementById(fid);
              if (el) { el.style.outline = '2px solid #ef4444'; el.focus(); }
            });
            return;
          }
        }
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
          data_source:       _portalAiActive ? (_portalAiDataSource || 'ai_extracted') : 'manual',
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
                  submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Enviar cotización';
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
              submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Enviar cotización';
            }
          }
        }).catch(function (err) {
          if (errorMsg) {
            errorMsg.textContent = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
            errorMsg.classList.remove('hidden');
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Enviar cotización';
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
