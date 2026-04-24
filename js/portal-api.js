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
    d.setMonth(d.getMonth() - (monthsBack || 3));
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
    if (!token) return Promise.reject(new Error('No token'));

    var email = CRBOXAuth.getEmail();
    if (!email) return Promise.reject(new Error('Email not found in session'));

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
  // Sends postedituser, clears cache, re-fetches and returns fresh userInfo.
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
      return res.json();
    }).then(function (data) {
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

    var start = formatDate(startDate || _defaultStartDate(3));
    var end   = formatDate(endDate   || _defaultEndDate());
    var track = (tracking && tracking.trim()) ? tracking.trim() : '*';
    var stat  = (status   && status.trim())   ? status.trim()   : '*';

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

    var start = formatDate(startDate || _defaultStartDate(3));
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
  // data.Message === 'OK' means instructions were sent.
  function recoverPassword(email) {
    return fetch(BASE + '/getuserpasswordrecovery/' + encodeURIComponent(email))
      .then(function (res) {
        if (!res.ok) throw new Error('recoverPassword failed: ' + res.status);
        return res.json();
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
    defaultStartDate:   _defaultStartDate,
    defaultEndDate:     _defaultEndDate
  };

}(window));
