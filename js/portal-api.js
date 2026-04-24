// portal-api.js — CRBOX client portal API module
// Wraps all authenticated portal endpoints:
//   getUserInfo, updateProfile, getPackages, getBills, recoverPassword
// Requires auth.js to be loaded first (CRBOXAuth must be available).

(function (global) {
  'use strict';

  var BASE = 'https://clients.crbox.cr/api/crboxwebapi';

  // ─── Session-level cache ──────────────────────────────────────────────────
  var _userInfoCache = null;

  function clearUserInfoCache() {
    _userInfoCache = null;
  }

  // ─── Date helper → DD-MM-YYYY ─────────────────────────────────────────────
  function formatDate(date) {
    var d = (date instanceof Date) ? date : new Date(date);
    var dd   = String(d.getDate()).padStart(2, '0');
    var mm   = String(d.getMonth() + 1).padStart(2, '0');
    var yyyy = d.getFullYear();
    return dd + '-' + mm + '-' + yyyy;
  }

  // Polyfill String.prototype.padStart for older environments
  if (!String.prototype.padStart) {
    String.prototype.padStart = function (targetLen, padStr) {
      var str = String(this);
      padStr = padStr === undefined ? ' ' : String(padStr);
      while (str.length < targetLen) { str = padStr + str; }
      return str;
    };
  }

  // ─── Date range helpers ───────────────────────────────────────────────────
  function _defaultEndDate() {
    return new Date();
  }
  function _defaultStartDate(monthsBack) {
    var d = new Date();
    d.setMonth(d.getMonth() - (monthsBack || 1));
    return d;
  }
  // 30-day window (used as the default across all pages)
  function _last30Days() {
    var d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }

  // ─── getUserInfo ──────────────────────────────────────────────────────────
  // Resolves with the getuserinfo JSON object.
  // Signature: getUserInfo(email?, token?, opts?)
  //   All args optional — falls back to CRBOXAuth globals when omitted.
  // Uses a session-level cache; pass opts = { forceRefresh: true } to bypass.
  function getUserInfo(emailArg, tokenArg, optsArg) {
    // Support legacy single-arg call: getUserInfo(opts)
    var opts = (emailArg && typeof emailArg === 'object') ? emailArg : (optsArg || {});
    var email = (emailArg && typeof emailArg === 'string') ? emailArg : CRBOXAuth.getEmail();
    var token = (tokenArg && typeof tokenArg === 'string') ? tokenArg : CRBOXAuth.getToken();

    if (_userInfoCache && !opts.forceRefresh) {
      return Promise.resolve(_userInfoCache);
    }

    if (!token) {
      // Not logged in — auth gate in auth.js will redirect; reject cleanly.
      return Promise.reject(new Error('Sesión no iniciada. Por favor inicia sesión.'));
    }

    if (!email) {
      // Token present but email missing → half-authenticated session; clear and redirect.
      CRBOXAuth.clearToken();
      if (window.location.pathname.indexOf('login') === -1) {
        window.location.replace('login.html');
      }
      return Promise.reject(new Error('No se encontró el correo de sesión. Por favor inicia sesión de nuevo.'));
    }

    return fetch(BASE + '/getuserinfo/' + encodeURIComponent(email), {
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function (res) {
      if (!res.ok) throw new Error('No se pudo obtener la información de tu cuenta (' + res.status + ').');
      return res.json();
    }).then(function (data) {
      _userInfoCache = data;
      return data;
    });
  }

  // ─── updateProfile ────────────────────────────────────────────────────────
  // Sends postedituser. Only clears cache + re-fetches when StatusResult==="OK".
  // Rejects with an Error (message in Spanish) on API-level failure.
  // payload should be a pre-built URLSearchParams string
  // (use CRBOXAuth.buildUpdateProfilePayload).
  function updateProfile(payload) {
    var token = CRBOXAuth.getToken();
    if (!token) return Promise.reject(new Error('Sesión no iniciada. Por favor inicia sesión.'));

    return fetch(BASE + '/postedituser', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': 'Bearer ' + token
      },
      body: payload
    }).then(function (res) {
      if (!res.ok) throw new Error('Error al guardar el perfil (' + res.status + ').');
      return res.json();
    }).then(function (data) {
      var sr = data && (data.StatusResult || data.statusResult || '');
      if (sr !== 'OK') {
        var msg = (data && (data.Message || data.message)) || 'No se pudo guardar el perfil. Intenta de nuevo.';
        return Promise.reject(new Error(msg));
      }
      clearUserInfoCache();
      return getUserInfo({ forceRefresh: true }).then(function (info) {
        return { apiResponse: data, userInfo: info };
      });
    });
  }

  // ─── getPackages ──────────────────────────────────────────────────────────
  // idConsignee: numeric casillero id
  // startDate / endDate: Date objects (or strings parseable by new Date())
  // tracking: tracking number filter or '' for all
  // status: status filter or '' for all
  function getPackages(idConsignee, startDate, endDate, tracking, status) {
    var token = CRBOXAuth.getToken();
    if (!token) return Promise.reject(new Error('Sesión no iniciada. Por favor inicia sesión.'));

    var start = formatDate(startDate || _last30Days());
    var end   = formatDate(endDate   || _defaultEndDate());
    var track = (tracking && String(tracking).trim() && String(tracking).trim() !== '*') ? String(tracking).trim() : 'null';
    var stat  = (status   && String(status).trim())   ? String(status).trim()   : '1000';

    var url = BASE + '/getuserpackages/' +
      idConsignee + '/' +
      start + '/' +
      end   + '/' +
      encodeURIComponent(track) + '/' +
      encodeURIComponent(stat);

    return fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function (res) {
      if (!res.ok) throw new Error('No se pudieron cargar los paquetes (' + res.status + ').');
      return res.json();
    });
  }

  // ─── getBills ─────────────────────────────────────────────────────────────
  // email: account email
  // startDate / endDate: Date objects
  function getBills(email, startDate, endDate) {
    var token = CRBOXAuth.getToken();
    if (!token) return Promise.reject(new Error('Sesión no iniciada. Por favor inicia sesión.'));

    var start = formatDate(startDate || _last30Days());
    var end   = formatDate(endDate   || _defaultEndDate());

    var url = BASE + '/getfacturas/' +
      encodeURIComponent(email) + '/' +
      start + '/' +
      end;

    return fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function (res) {
      if (!res.ok) throw new Error('No se pudieron cargar las facturas (' + res.status + ').');
      return res.json();
    });
  }

  // ─── recoverPassword ──────────────────────────────────────────────────────
  // GET endpoint — no auth required.
  // Resolves {ok: true|false, message: string}; only rejects on network errors.
  function recoverPassword(email) {
    return fetch(BASE + '/getuserpasswordrecovery/' + encodeURIComponent(email))
      .then(function (res) {
        if (!res.ok) throw new Error('Error de red al recuperar contraseña (' + res.status + ').');
        return res.json();
      })
      .then(function (data) {
        var msg = (data && (data.Message || data.message || '')).toUpperCase();
        return { ok: msg === 'OK', message: data && (data.Message || data.message || '') };
      });
  }

  // ─── Centralized field accessors ──────────────────────────────────────────
  // Single source of truth for the confirmed `getuserpackages` and `getfacturas`
  // response shapes. Every renderer must read through these helpers so we
  // never reintroduce scattered guessed field-name fallback chains.

  // Status id → canonical Spanish label (legacy CRBOX status set).
  var STATUS_ID_NAME = {
    1: 'MIAMI',
    2: 'SJO',
    3: 'CARGADO',
    4: 'EN TRÁNSITO',
    5: 'CRBOX',
    6: 'EN ESPERA',
    7: 'ENTREGADO'
  };

  // Status ids that count as "still in transit toward the customer"
  // — i.e. not yet sitting in CRBOX (5) and not yet delivered (7).
  // Used by the dashboard "Paquetes en camino" derivation.
  var IN_TRANSIT_STATUS_IDS = [1, 2, 3, 4, 6];

  // Defensible event-line per known statusId. Used by the dashboard
  // "Actividad reciente" feed. Anything outside this map is skipped.
  var STATUS_ID_EVENT = {
    1: 'Recibido en Miami',
    2: 'Recibido en SJO',
    3: 'Cargado para envío',
    4: 'En tránsito hacia Costa Rica',
    5: 'Listo para retirar en CRBOX',
    6: 'En espera',
    7: 'Entregado'
  };

  function _num(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = Number(v);
    return isNaN(n) ? null : n;
  }
  function _str(v) {
    if (v === null || v === undefined) return '';
    return String(v);
  }

  // mapPackage: normalize one row of the getuserpackages response.
  function mapPackage(raw) {
    if (!raw || typeof raw !== 'object') raw = {};
    var statusId = _num(raw.statusId);
    return {
      idwarehousereceipt:      raw.idwarehousereceipt || null,
      statusId:                statusId,
      statusName:              _str(raw.statusName),
      number:                  _str(raw.number),
      receiveddatetime:        raw.receiveddatetime || '',
      createdDate:             raw.createdDate || '',
      trackingNumber:          _str(raw.trackingNumber),
      shipperName:             _str(raw.shipperName),
      totalpieces:             _num(raw.totalpieces),
      totalweight:             _num(raw.totalweight),
      totalvolume:             _num(raw.totalvolume),
      totalvolumetricweight:   _num(raw.totalvolumetricweight),
      carrierName:             _str(raw.carrierName),
      consigneeNotes:          _str(raw.consigneeNotes),
      consigneeSucursalName:   _str(raw.consigneeSucursalName),
      masterAirShipmentNumber: _str(raw.masterAirShipmentNumber),
      airShipmentNumber:       _str(raw.airShipmentNumber),
      descripcion:             _str(raw.descripcion),
      invoicesCount:           _num(raw.invoicesCount),
      hasPackage:              raw.hasPackage === true || raw.hasPackage === 'true',
      impresoFactura:          raw.impresoFactura === true || raw.impresoFactura === 'true',
      consolidadoFactura:      raw.consolidadoFactura === true || raw.consolidadoFactura === 'true',
      emision:                 _str(raw.emision),
      montofactura:            _num(raw.montofactura),
      descripcionfactura:      _str(raw.descripcionfactura),
      // Convenience derived fields
      bestDate:                raw.receiveddatetime || raw.createdDate || '',
      canonicalStatus:         (statusId && STATUS_ID_NAME[statusId]) || _str(raw.statusName).toUpperCase()
    };
  }

  // mapRecibo: normalize one entry inside Factura.Recibos[].
  function mapRecibo(raw) {
    if (!raw || typeof raw !== 'object') raw = {};
    var status = raw.status || {};
    var shipper = raw.shipper || {};
    var carrierInfo = raw.carrierinformation || {};
    var carrier = carrierInfo.carrier || {};
    return {
      number:                _str(raw.number),
      receiveddatetime:      raw.receiveddatetime || '',
      totalweight:           _num(raw.totalweight),
      totalvolume:           _num(raw.totalvolume),
      totalvolumetricweight: _num(raw.totalvolumetricweight),
      statusname:            _str(status.statusname),
      shippername:           _str(shipper.shippername),
      carriername:           _str(carrier.carriername)
    };
  }

  // mapBill: normalize one row of the getfacturas response.
  function mapBill(raw) {
    if (!raw || typeof raw !== 'object') raw = {};
    var f = raw.Factura || {};
    var mas = f.masterAirShipment || {};
    var disc = f.descuentoCorporativo || {};
    var recArr = Array.isArray(raw.Recibos) ? raw.Recibos : [];
    return {
      factura:                 _str(f.factura),
      billedDate:              f.billedDate || '',
      createdDate:             f.createdDate || '',
      masterAirShipmentNumber: _str(mas.masterairshipmentnumber || mas.masterAirShipmentNumber),
      weigth:                  _num(f.weigth),
      cantidadBultos:          _num(f.cantidadBultos),
      total:                   _num(f.total),
      descuentoNombre:         _str(disc._nombre || disc.nombre),
      isInvoiced:              f.isInvoiced === true || f.isInvoiced === 'true',
      recibos:                 recArr.map(mapRecibo),
      // Convenience derived
      bestDate:                f.billedDate || f.createdDate || ''
    };
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  global.CRBOXPortalAPI = {
    getUserInfo:        getUserInfo,
    clearUserInfoCache: clearUserInfoCache,
    updateProfile:      updateProfile,
    getPackages:        getPackages,
    getBills:           getBills,
    recoverPassword:    recoverPassword,
    formatDate:         formatDate,
    last30Days:         _last30Days,
    defaultStartDate:   _defaultStartDate,
    defaultEndDate:     _defaultEndDate,
    // Field accessors
    mapPackage:           mapPackage,
    mapBill:              mapBill,
    mapRecibo:            mapRecibo,
    STATUS_ID_NAME:       STATUS_ID_NAME,
    IN_TRANSIT_STATUS_IDS: IN_TRANSIT_STATUS_IDS,
    STATUS_ID_EVENT:      STATUS_ID_EVENT
  };

}(window));
