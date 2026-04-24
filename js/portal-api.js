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
  // Uses a session-level cache; pass { forceRefresh: true } to bypass.
  function getUserInfo(opts) {
    opts = opts || {};
    if (_userInfoCache && !opts.forceRefresh) {
      return Promise.resolve(_userInfoCache);
    }

    var token = CRBOXAuth.getToken();
    if (!token) {
      // Not logged in — auth gate in auth.js will redirect; reject cleanly.
      return Promise.reject(new Error('No token'));
    }

    var email = CRBOXAuth.getEmail();
    if (!email) {
      // Token present but email missing → half-authenticated session; clear and redirect.
      CRBOXAuth.clearToken();
      if (window.location.pathname.indexOf('login') === -1) {
        window.location.replace('login.html');
      }
      return Promise.reject(new Error('Email not found in session — session cleared'));
    }

    return fetch(BASE + '/getuserinfo/' + encodeURIComponent(email), {
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function (res) {
      if (!res.ok) throw new Error('getUserInfo failed: ' + res.status);
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
    if (!token) return Promise.reject(new Error('No token'));

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
    if (!token) return Promise.reject(new Error('No token'));

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
      if (!res.ok) throw new Error('getPackages failed: ' + res.status);
      return res.json();
    });
  }

  // ─── getBills ─────────────────────────────────────────────────────────────
  // email: account email
  // startDate / endDate: Date objects
  function getBills(email, startDate, endDate) {
    var token = CRBOXAuth.getToken();
    if (!token) return Promise.reject(new Error('No token'));

    var start = formatDate(startDate || _last30Days());
    var end   = formatDate(endDate   || _defaultEndDate());

    var url = BASE + '/getfacturas/' +
      encodeURIComponent(email) + '/' +
      start + '/' +
      end;

    return fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function (res) {
      if (!res.ok) throw new Error('getBills failed: ' + res.status);
      return res.json();
    });
  }

  // ─── recoverPassword ──────────────────────────────────────────────────────
  // GET endpoint — no auth required.
  // Resolves {ok: true|false, message: string}; only rejects on network errors.
  function recoverPassword(email) {
    return fetch(BASE + '/getuserpasswordrecovery/' + encodeURIComponent(email))
      .then(function (res) {
        if (!res.ok) throw new Error('recoverPassword network error: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var msg = (data && (data.Message || data.message || '')).toUpperCase();
        return { ok: msg === 'OK', message: data && (data.Message || data.message || '') };
      });
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
    defaultEndDate:     _defaultEndDate
  };

}(window));
