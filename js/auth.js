// auth.js — CRBOX shared authentication module
// Handles token storage, session management, header auth-state display,
// login, registration, and profile-payload scaffolding.
//
// API routing: direct fetch to clients.crbox.cr (CORS confirmed from browser).

(function (global) {
  'use strict';

  // ─── Storage keys ─────────────────────────────────────────────────────────
  var KEY_TOKEN      = 'crbox_access_token';
  var KEY_EXPIRES_AT = 'crbox_expires_at';
  var KEY_REMEMBER   = 'crbox_remember';
  var KEY_EMAIL      = 'crbox_email';

  // ─── API endpoints (direct to CRBOX backend) ─────────────────────────────
  var LOGIN_URL    = 'https://clients.crbox.cr/authtoken';
  var REGISTER_URL = 'https://test.clients.crbox.cr/api/crboxwebapi/postregisteruser';

  // ─── Sucursal ID map (confirmed values) ───────────────────────────────────
  var SUCURSAL_ID_MAP = {
    sabana_norte:       1,
    guadalupe:         12,
    domicilio:         13,
    guachipelin_escazu: 14
  };

  // ─── Storage helpers ──────────────────────────────────────────────────────
  function _store(remember) {
    return remember ? localStorage : sessionStorage;
  }

  function _getRemember() {
    return localStorage.getItem(KEY_REMEMBER) === 'true';
  }

  // ─── Token management ─────────────────────────────────────────────────────

  function saveToken(token, expiresIn, remember) {
    var store = _store(remember);
    var expiresAt = Date.now() + (expiresIn * 1000);
    store.setItem(KEY_TOKEN, token);
    store.setItem(KEY_EXPIRES_AT, String(expiresAt));
    localStorage.setItem(KEY_REMEMBER, remember ? 'true' : 'false');
  }

  function saveEmail(email, remember) {
    _store(remember).setItem(KEY_EMAIL, email);
  }

  function getEmail() {
    var remember = _getRemember();
    return _store(remember).getItem(KEY_EMAIL) || localStorage.getItem(KEY_EMAIL) || sessionStorage.getItem(KEY_EMAIL) || '';
  }

  function getToken() {
    var remember = _getRemember();
    var store = _store(remember);
    var token = store.getItem(KEY_TOKEN);
    var expiresAt = parseInt(store.getItem(KEY_EXPIRES_AT) || '0', 10);
    if (!token) return null;
    if (Date.now() > expiresAt) {
      clearToken();
      return null;
    }
    return token;
  }

  function clearToken() {
    [localStorage, sessionStorage].forEach(function (s) {
      s.removeItem(KEY_TOKEN);
      s.removeItem(KEY_EXPIRES_AT);
      s.removeItem(KEY_EMAIL);
    });
    localStorage.removeItem(KEY_REMEMBER);
  }

  function isLoggedIn() {
    return getToken() !== null;
  }

  function getAuthHeader() {
    var token = getToken();
    return token ? ('Bearer ' + token) : null;
  }

  // ─── Logout ───────────────────────────────────────────────────────────────
  function logout() {
    clearToken();
    window.location.href = 'index.html';
  }

  // ─── Login ────────────────────────────────────────────────────────────────
  function doLogin(email, password, remember) {
    var body = new URLSearchParams({
      grant_type: 'password',
      username:   email,
      password:   password
    }).toString();

    return fetch(LOGIN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (err) {
          var msg = (err && err.error_description) || (err && err.error) || null;
          throw new Error(msg || 'Credenciales incorrectas. Verifique su correo y contraseña.');
        });
      }
      return res.json();
    }).then(function (data) {
      if (!data.access_token) {
        throw new Error('Respuesta inesperada del servidor. Intente de nuevo.');
      }
      saveToken(data.access_token, data.expires_in || 86399, remember);
      saveEmail(email, remember);
      return data.access_token;
    });
  }

  // ─── Registration ─────────────────────────────────────────────────────────
  function doRegister(payloadString) {
    return fetch(REGISTER_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    payloadString
    }).then(function (res) {
      return res.json();
    }).then(function (data) {
      if (!data || !data.StatusResult) {
        throw new Error('Respuesta inesperada del servidor. Intente de nuevo.');
      }
      return data;
    });
  }

  // ─── Update Profile payload builder ───────────────────────────────────────
  // Builds the URL-encoded body for the postedituser endpoint.
  // profileData is populated from getuserinfo (with user edits merged in).
  function buildUpdateProfilePayload(profileData) {
    var params = new URLSearchParams();
    params.set('Consignee.IdConsignee',          String(profileData.idConsignee || profileData.idconsignee || ''));
    params.set('Token',                          getToken() || '');
    params.set('Consignee.ConsigneeName',         profileData.firstName    || profileData.consigneename     || '');
    params.set('Consignee.ConsigneeLastName1',    profileData.lastName1    || profileData.consigneelastname1 || '');
    params.set('Consignee.ConsigneeLastName2',    profileData.lastName2    || profileData.consigneelastname2 || '');
    params.set('Consignee.Email',                 profileData.email        || '');
    params.set('ConfirmEmail',                    profileData.email        || '');
    params.set('Consignee.IdentificationNumber',  profileData.idNumber     || profileData.identificationnumber || '');
    params.set('Consignee.IdentificationType',    profileData.idType       || profileData.identificationtype   || '');
    params.set('Consignee.IsCompany',             '0');
    params.set('Consignee.ResidenceCountry',      profileData.country      || profileData.residencecountry      || 'CR');
    params.set('Consignee.ReceivesNewsletter',    profileData.newsletter   ? 'true' : 'false');
    params.set('Consignee.Responsabilidad',       '0');
    params.set('Consignee.AlternativeEmail',      profileData.alternativeEmail  || profileData.alternativeemail  || '');
    params.set('Consignee.ContactName1',          profileData.contactName1      || profileData.contactname1      || '');
    params.set('Consignee.ContactName2',          profileData.contactName2      || profileData.contactname2      || '');
    params.set('Consignee.IdResponsabilidad',     '');
    params.set('Consignee.BirthDate',             '');
    var sucursalId = (profileData.sucursal && (profileData.sucursal.idSucursal || profileData.sucursal._idsucursal)) || '';
    params.set('Consignee.Sucursal.IdSucursal',   String(sucursalId));
    params.set('CompanyCode',                     profileData.companyCode  || '');
    params.set('Phones',                          JSON.stringify(profileData.phones    || []));
    params.set('Addresses',                       JSON.stringify(profileData.addresses || []));
    return params.toString();
  }

  // ─── Header auth-state ────────────────────────────────────────────────────
  function updateHeaderAuthState() {
    var dropdownMenu = document.getElementById('user-dropdown-menu');
    if (!dropdownMenu) return;

    if (isLoggedIn()) {
      dropdownMenu.innerHTML =
        '<div class="py-2 px-4">' +
          '<a href="dashboard.html" class="flex items-center w-full px-2 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-md transition-colors duration-150">' +
            '<i class="fas fa-tachometer-alt mr-3 text-orange-500"></i>' +
            '<span>Dashboard</span>' +
          '</a>' +
        '</div>' +
        '<div class="py-2 px-4">' +
          '<button id="header-logout-btn" class="flex w-full items-center px-2 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-md transition-colors duration-150">' +
            '<i class="fas fa-sign-out-alt mr-3 text-orange-500"></i>' +
            '<span>Cerrar Sesión</span>' +
          '</button>' +
        '</div>';

      var logoutBtn = document.getElementById('header-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', function () { logout(); });
      }

      var mobileAuthSection = document.querySelector('#mobile-menu .border-t');
      if (mobileAuthSection) {
        var linkPair = mobileAuthSection.querySelector('.flex.space-x-2');
        var textLabel = mobileAuthSection.querySelector('p.text-sm');
        if (linkPair) {
          if (textLabel) textLabel.textContent = 'Sesión activa';
          linkPair.innerHTML =
            '<a href="dashboard.html" class="flex-1 flex items-center justify-center py-2 px-4 bg-orange-50 border border-orange-200 rounded-md text-orange-700 hover:bg-orange-100 transition-colors duration-200">' +
              '<i class="fas fa-tachometer-alt mr-2"></i>' +
              '<span>Dashboard</span>' +
            '</a>' +
            '<button id="mobile-header-logout-btn" class="flex-1 flex items-center justify-center py-2 px-4 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-colors duration-200">' +
              '<i class="fas fa-sign-out-alt mr-2"></i>' +
              '<span>Salir</span>' +
            '</button>';
          var mobileLogoutBtn = document.getElementById('mobile-header-logout-btn');
          if (mobileLogoutBtn) {
            mobileLogoutBtn.addEventListener('click', function () { logout(); });
          }
        }
      }

      var dashLogout = document.getElementById('logout-button');
      var dashMobileLogout = document.getElementById('mobile-logout-button');
      if (dashLogout) {
        dashLogout.addEventListener('click', function (e) { e.preventDefault(); logout(); });
      }
      if (dashMobileLogout) {
        dashMobileLogout.addEventListener('click', function (e) { e.preventDefault(); logout(); });
      }
    }
  }

  var PROTECTED_PAGES = ['dashboard.html', 'mis-paquetes.html', 'mi-cuenta.html', 'mis-facturas.html'];

  function enforceAuthGate() {
    var path = window.location.pathname;
    var page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    if (PROTECTED_PAGES.indexOf(page) !== -1 && !isLoggedIn()) {
      window.location.replace('login.html');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    enforceAuthGate();
    updateHeaderAuthState();
  });

  // ─── Public API ───────────────────────────────────────────────────────────
  global.CRBOXAuth = {
    saveToken:                 saveToken,
    saveEmail:                 saveEmail,
    getEmail:                  getEmail,
    getToken:                  getToken,
    clearToken:                clearToken,
    isLoggedIn:                isLoggedIn,
    getAuthHeader:             getAuthHeader,
    logout:                    logout,
    doLogin:                   doLogin,
    doRegister:                doRegister,
    buildUpdateProfilePayload: buildUpdateProfilePayload,
    updateHeaderAuthState:     updateHeaderAuthState,
    SUCURSAL_ID_MAP:           SUCURSAL_ID_MAP
  };

}(window));
