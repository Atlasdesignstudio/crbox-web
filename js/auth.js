// auth.js — CRBOX shared authentication module
// Handles token storage, session management, header auth-state display,
// login, registration, and update-profile scaffolding.
//
// CORS decision:
// The Postman collection confirmed the backend returns:
//   Access-Control-Allow-Origin: https://crbox.cr  (exact match)
//   Access-Control-Allow-Credentials: true
// on OPTIONS preflights from the crbox.cr origin.
// Browser CORS policy allows direct fetch from https://crbox.cr to
// https://clients.crbox.cr provided those headers are present at runtime.
//
// Architecture note: if live browser testing (from the deployed crbox.cr origin)
// reveals a CORS error not visible in Postman, route the requests through
// server.py proxy handlers (e.g. POST /api/proxy/login, /api/proxy/register)
// rather than changing this file's fetch calls — only the base URLs would
// need to change.

(function (global) {
  'use strict';

  // ─── Storage keys ─────────────────────────────────────────────────────────
  var KEY_TOKEN      = 'crbox_access_token';
  var KEY_EXPIRES_AT = 'crbox_expires_at';
  var KEY_REMEMBER   = 'crbox_remember';

  // ─── API endpoints ────────────────────────────────────────────────────────
  var LOGIN_URL    = 'https://clients.crbox.cr/authtoken';
  var REGISTER_URL = 'https://test.clients.crbox.cr/api/crboxwebapi/postregisteruser';
  var UPDATE_URL   = 'https://test.clients.crbox.cr/api/crboxwebapi/postedituser';

  // ─── PENDING_BACKEND_CONFIRMATION ─────────────────────────────────────────
  // None of these values are confirmed backend truth. Each is either:
  //   - an untested assumption that may be incorrect, or
  //   - a known unknown that blocks safe implementation.
  // Do NOT change these values without backend confirmation.
  //
  // newAddressId / newPhoneId:
  //   Confirmed Postman samples show real backend-assigned DB IDs (42476, 80770).
  //   Whether sending 0 is valid for a NEW registration is NOT confirmed.
  //   These fields are included with value 0 because omitting them entirely
  //   may also be invalid — this is untested. Must be validated with backend.
  //
  // sucursalIdMap:
  //   The form collects "sabana_norte" / "guadalupe" / "domicilio" strings
  //   but the API expects a numeric IdSucursal. All values below are UNKNOWN.
  //   A guard at submit time blocks the request if the resolved value is null.
  var PENDING_BACKEND_CONFIRMATION = {
    newAddressId: 0,   // UNCONFIRMED — must be validated with backend before production
    newPhoneId:   0,   // UNCONFIRMED — must be validated with backend before production
    sucursalIdMap: {
      sabana_norte: null,  // UNKNOWN — backend confirmation required
      guadalupe:    null,  // UNKNOWN — backend confirmation required
      domicilio:    null   // UNKNOWN — backend confirmation required
    }
  };

  // ─── Storage helpers ──────────────────────────────────────────────────────
  function _store(remember) {
    return remember ? localStorage : sessionStorage;
  }

  function _getRemember() {
    return localStorage.getItem(KEY_REMEMBER) === 'true';
  }

  // ─── Token management ─────────────────────────────────────────────────────

  // Persist a token received from the login endpoint.
  // expiresIn is the server value in seconds (typically 86399).
  function saveToken(token, expiresIn, remember) {
    var store = _store(remember);
    var expiresAt = Date.now() + (expiresIn * 1000);
    store.setItem(KEY_TOKEN, token);
    store.setItem(KEY_EXPIRES_AT, String(expiresAt));
    // Always record the remember preference in localStorage so other pages
    // can find the token in the right store on reload.
    localStorage.setItem(KEY_REMEMBER, remember ? 'true' : 'false');
  }

  // Return the stored token if it exists and has not expired.
  // Returns null and clears storage on expiry.
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

  // Clear all auth state from both storage locations (defensive).
  function clearToken() {
    [localStorage, sessionStorage].forEach(function (s) {
      s.removeItem(KEY_TOKEN);
      s.removeItem(KEY_EXPIRES_AT);
    });
    localStorage.removeItem(KEY_REMEMBER);
  }

  // Returns true if a valid (non-expired) token is present.
  function isLoggedIn() {
    return getToken() !== null;
  }

  // Returns the Authorization header value to attach to authenticated requests.
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
  // Returns a Promise that resolves with the access_token string on success,
  // or rejects with an Error. The caller is responsible for UI state.
  //
  // Note: the failed-login response shape from the API is not yet confirmed
  // (see task-53.md §Minimum remaining backend confirmations).
  // The handler catches any non-2xx status and treats it as a generic error.
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
        // The exact error body shape is unconfirmed; try to parse JSON anyway.
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
      return data.access_token;
    });
  }

  // ─── Registration ─────────────────────────────────────────────────────────
  // Accepts a pre-built URLSearchParams (or plain string) payload and POSTs
  // to the register endpoint. Resolves with the parsed response body, or
  // rejects on network error. The caller must check res.StatusResult.
  function doRegister(payloadString) {
    return fetch(REGISTER_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    payloadString
    }).then(function (res) {
      // The register endpoint always returns HTTP 200; success is determined
      // by StatusResult in the body, not the HTTP status code.
      return res.json();
    }).then(function (data) {
      if (!data || !data.StatusResult) {
        throw new Error('Respuesta inesperada del servidor. Intente de nuevo.');
      }
      return data;
    });
  }

  // ─── Update Profile scaffold ───────────────────────────────────────────────
  // ACTIVATION BLOCKED — cannot be wired to any UI until a "GET current user"
  // endpoint returns IdConsignee, idaddress, idphone, and IdSucursal (all
  // backend-assigned values unavailable at registration time).
  // See task-53.md §Update Profile for the full field mapping and endpoint notes.
  //
  // This function DOES build and return the correct encoded payload string given
  // a profileData object populated from the future GET-user response. It is
  // intentionally not called from anywhere in the codebase until that endpoint
  // is confirmed.
  //
  // Expected profileData shape (from a future GET-user endpoint):
  //   { idConsignee, token, firstName, lastName1, lastName2?, email,
  //     idNumber, idType, country, newsletter, companyCode?, alternativeEmail?,
  //     contactName1?, contactName2?,
  //     phones: [ { idphone, phonenumber, phoneextension, isactive, isprimary,
  //                 phonetype: { idphonetype, type, ... }, consignees: null } ],
  //     addresses: [ { idaddress, line1, line2, city, zipcode, isactive,
  //                    isprimary, provincia, canton, distrito, barrio, direccion,
  //                    state: {...}, addresstype: {...} } ],
  //     sucursal: { idSucursal } }
  function buildUpdateProfilePayload(profileData) {
    var params = new URLSearchParams();
    params.set('Consignee.IdConsignee',          String(profileData.idConsignee));
    params.set('Token',                          profileData.token || getToken() || '');
    params.set('Consignee.ConsigneeName',         profileData.firstName);
    params.set('Consignee.ConsigneeLastName1',    profileData.lastName1);
    params.set('Consignee.ConsigneeLastName2',    profileData.lastName2  || '');
    params.set('Consignee.Email',                 profileData.email);
    params.set('ConfirmEmail',                    profileData.email);
    params.set('Consignee.IdentificationNumber',  profileData.idNumber);
    params.set('Consignee.IdentificationType',    profileData.idType);
    params.set('Consignee.IsCompany',             '0');
    params.set('Consignee.ResidenceCountry',      profileData.country      || 'CR');
    params.set('Consignee.ReceivesNewsletter',    profileData.newsletter   ? 'true' : 'false');
    params.set('Consignee.Responsabilidad',       '0');
    params.set('Consignee.AlternativeEmail',      profileData.alternativeEmail || '');
    params.set('Consignee.ContactName1',          profileData.contactName1 || '');
    params.set('Consignee.ContactName2',          profileData.contactName2 || '');
    params.set('Consignee.IdResponsabilidad',     '');
    params.set('Consignee.BirthDate',             '');
    params.set('Consignee.Sucursal.IdSucursal',   String(profileData.sucursal.idSucursal));
    params.set('CompanyCode',                     profileData.companyCode  || '');
    params.set('Phones',                          JSON.stringify(profileData.phones    || []));
    params.set('Addresses',                       JSON.stringify(profileData.addresses || []));
    return params.toString();
  }

  // ─── Header auth-state ────────────────────────────────────────────────────
  // Runs on DOMContentLoaded. If the user is logged in, replaces the
  // "Iniciar Sesión / Crear Cuenta" links in the desktop user-dropdown
  // with a logout button. The dropdown open/close animation and the mobile
  // is-open pattern are left completely untouched — only inner HTML swaps.
  function updateHeaderAuthState() {
    var dropdownMenu = document.getElementById('user-dropdown-menu');
    if (!dropdownMenu) return;

    if (isLoggedIn()) {
      // Replace link content with logout option — preserve all wrapper divs
      // and the dropdown's toggle mechanics (handled by existing inline scripts).
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

      // Also update mobile menu auth section if it uses the login/register
      // link pattern (public pages only; dashboard pages have their own layout).
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

      // Dashboard pages: wire logout buttons that already exist in the HTML.
      var dashLogout = document.getElementById('logout-button');
      var dashMobileLogout = document.getElementById('mobile-logout-button');
      if (dashLogout) {
        dashLogout.addEventListener('click', function () { logout(); });
      }
      if (dashMobileLogout) {
        dashMobileLogout.addEventListener('click', function () { logout(); });
      }
    }
  }

  // Protected dashboard pages — redirect to login if session is missing or expired.
  // getToken() already clears an expired session before returning null.
  var PROTECTED_PAGES = ['dashboard.html', 'mis-paquetes.html', 'mi-cuenta.html', 'mis-facturas.html'];

  function enforceAuthGate() {
    var path = window.location.pathname;
    var page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    if (PROTECTED_PAGES.indexOf(page) !== -1 && !isLoggedIn()) {
      window.location.replace('login.html');
    }
  }

  // Run header update and auth gate on every page load.
  document.addEventListener('DOMContentLoaded', function () {
    enforceAuthGate();
    updateHeaderAuthState();
  });

  // ─── Public API ───────────────────────────────────────────────────────────
  global.CRBOXAuth = {
    saveToken:              saveToken,
    getToken:               getToken,
    clearToken:             clearToken,
    isLoggedIn:             isLoggedIn,
    getAuthHeader:          getAuthHeader,
    logout:                 logout,
    doLogin:                doLogin,
    doRegister:             doRegister,
    buildUpdateProfilePayload: buildUpdateProfilePayload,
    updateHeaderAuthState:  updateHeaderAuthState,
    PENDING:                PENDING_BACKEND_CONFIRMATION
  };

}(window));
