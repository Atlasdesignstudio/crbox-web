// auth.js — CRBOX shared authentication module
// Handles token storage, session management, header auth-state display,
// login, registration, and profile-payload scaffolding.
//
// API routing: direct fetch to clients.crbox.cr (CORS confirmed from browser).
//
// Session persistence notes (updated):
// - Tokens are ALWAYS written to localStorage (never exclusively to
//   sessionStorage). Mobile browsers (Safari iOS) wipe sessionStorage when
//   the app is closed; writing there exclusively caused the most common
//   "half-logged-in" breakage path.
// - "Remember Me" controls expiry length only:
//     remember = true  → 30 days
//     remember = false → API-provided expiry (default ~24 h)
// - pageshow (bfcache restore) and visibilitychange listeners re-validate
//   the session so Safari iOS back-navigation never shows a stale state.
// - clearToken() also wipes the getUserInfo cache (via CRBOXPortalAPI when
//   available) so stale profile data cannot survive a genuine session reset.

(function (global) {
  'use strict';

  // ─── Storage keys ─────────────────────────────────────────────────────────
  var KEY_TOKEN      = 'crbox_access_token';
  var KEY_EXPIRES_AT = 'crbox_expires_at';
  var KEY_REMEMBER   = 'crbox_remember';
  var KEY_EMAIL      = 'crbox_email';

  // ─── API endpoints (direct to CRBOX backend) ─────────────────────────────
  var LOGIN_URL    = 'https://clients.crbox.cr/authtoken';
  var REGISTER_URL = 'https://clients.crbox.cr/api/crboxwebapi/postregisteruser';

  // ─── Sucursal ID map (confirmed values) ───────────────────────────────────
  var SUCURSAL_ID_MAP = {
    sabana_norte:       1,
    guadalupe:         12,
    domicilio:         13,
    guachipelin_escazu: 14,
    guachipelín: 14
  };

  // ─── PENDING compat shim ──────────────────────────────────────────────────
  // afiliate.html references CRBOXAuth.PENDING.* — keep this mapping alive.
  var PENDING = {
    newPhoneId:   0,
    newAddressId: 0,
    sucursalIdMap: SUCURSAL_ID_MAP
  };

  // ─── Token management ─────────────────────────────────────────────────────
  // Tokens are ALWAYS stored in localStorage. sessionStorage is wiped by
  // mobile browsers on app close, which was causing the half-login bug.
  // "Remember Me" only changes how long the token lives:
  //   remember = true  → 30 days
  //   remember = false → API-provided expiry (typically ~24 h)

  function saveToken(token, expiresIn, remember) {
    var sessionSeconds = expiresIn || 86399;
    var persistSeconds = remember ? (30 * 24 * 3600) : sessionSeconds;
    var expiresAt = Date.now() + (persistSeconds * 1000);
    localStorage.setItem(KEY_TOKEN, token);
    localStorage.setItem(KEY_EXPIRES_AT, String(expiresAt));
    localStorage.setItem(KEY_REMEMBER, remember ? 'true' : 'false');
  }

  function saveEmail(email) {
    localStorage.setItem(KEY_EMAIL, email);
  }

  function getEmail() {
    return localStorage.getItem(KEY_EMAIL) ||
           sessionStorage.getItem(KEY_EMAIL) || // migration: old sessions
           '';
  }

  function getToken() {
    var token = localStorage.getItem(KEY_TOKEN) ||
                sessionStorage.getItem(KEY_TOKEN); // migration: old sessions
    if (!token) return null;

    // Prefer localStorage expiry; fall back to sessionStorage for old sessions
    var expiresAt = parseInt(
      localStorage.getItem(KEY_EXPIRES_AT) ||
      sessionStorage.getItem(KEY_EXPIRES_AT) || '0',
      10
    );
    if (Date.now() > expiresAt) {
      clearToken();
      return null;
    }
    return token;
  }

  // ─── User-specific data keys wiped on logout ─────────────────────────────
  // These keys hold shipment/package data that belongs to the logged-in user.
  // Clearing them prevents a subsequent user on the same device from seeing
  // stale data from the previous session.
  var USER_DATA_KEYS = [
    'crbox_calc_prefill',
    'crbox_seen_miami_ids',
    'crbox_auto_added_groups',
    'crbox_ambiguous_miami_pkgs',
    'crbox_onboarding',
    'crbox_display_name',
    'crbox_casillero_num',
    'crbox_pkg_cache',
    'crbox_cached_id_consignee'
  ];

  function clearToken() {
    [localStorage, sessionStorage].forEach(function (s) {
      s.removeItem(KEY_TOKEN);
      s.removeItem(KEY_EXPIRES_AT);
      s.removeItem(KEY_EMAIL);
    });
    localStorage.removeItem(KEY_REMEMBER);
    // Wipe user-specific shipment/package data and onboarding flags
    USER_DATA_KEYS.forEach(function (k) { localStorage.removeItem(k); });
    // Wipe cached profile data so stale info cannot survive a session reset
    if (typeof CRBOXPortalAPI !== 'undefined' &&
        typeof CRBOXPortalAPI.clearUserInfoCache === 'function') {
      CRBOXPortalAPI.clearUserInfoCache();
    }
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
    if (window.CRBOX && CRBOX.track) { try { CRBOX.track.logout(); } catch (_e) {} }
    clearToken();
    window.location.href = 'index.html';
  }

  // ─── Login ────────────────────────────────────────────────────────────────
  // ─── Login error → safe category mapper ──────────────────────────────────
  function _loginErrorCategory(err) {
    var msg = (err && err.message) ? err.message.toLowerCase() : '';
    if (msg.indexOf('credenciales') !== -1 || msg.indexOf('invalid') !== -1 ||
        msg.indexOf('incorrect') !== -1 || msg.indexOf('contraseña') !== -1) {
      return 'invalid_credentials';
    }
    if (msg.indexOf('network') !== -1 || msg.indexOf('conexión') !== -1 ||
        msg.indexOf('connection') !== -1 || msg.indexOf('failed to fetch') !== -1) {
      return 'network';
    }
    return 'unknown';
  }

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
      saveEmail(email);
      if (window.CRBOX && CRBOX.track) {
        try { CRBOX.track.login_success(); } catch (e) {}
      }
      return data.access_token;
    }).catch(function (err) {
      if (window.CRBOX && CRBOX.track) {
        try { CRBOX.track.login_error(_loginErrorCategory(err)); } catch (e) {}
      }
      throw err;
    });
  }

  // ─── Registration ─────────────────────────────────────────────────────────
  // The CRBOX registration endpoint requires a Bearer token from a service
  // account. We fetch it from our own server-side proxy (/crbox-svc-token)
  // so credentials never appear in client-side code. The proxy reads
  // CRBOX_SVC_EMAIL / CRBOX_SVC_PASSWORD env vars and returns only the token.
  function _getSvcToken() {
    return fetch('/crbox-svc-token', { method: 'POST' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.access_token) {
          throw new Error((data && data.error) || 'No se pudo obtener el token de servicio.');
        }
        return data.access_token;
      });
  }

  // ─── Registration error → safe category mapper ───────────────────────────
  function _registerErrorCategory(err) {
    var msg = (err && err.message) ? err.message.toLowerCase() : '';
    if (msg.indexOf('duplicate') !== -1 || msg.indexOf('duplicado') !== -1 ||
        msg.indexOf('ya existe') !== -1 || msg.indexOf('email') !== -1) {
      return 'duplicate_email';
    }
    if (msg.indexOf('network') !== -1 || msg.indexOf('conexión') !== -1 ||
        msg.indexOf('failed to fetch') !== -1) {
      return 'network';
    }
    if (msg.indexOf('validaci') !== -1 || msg.indexOf('invalid') !== -1) {
      return 'validation';
    }
    return 'unknown';
  }

  function doRegister(payloadString) {
    return _getSvcToken().then(function (svcToken) {
      return fetch(REGISTER_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/x-www-form-urlencoded',
          'Authorization': 'Bearer ' + svcToken
        },
        body: payloadString
      });
    }).then(function (res) {
      return res.json();
    }).then(function (data) {
      if (!data || !data.StatusResult) {
        var srvMsg = data && (data.ExceptionMessage || data.Message);
        console.warn('[CRBOX] Registration: unexpected response (no StatusResult):', JSON.stringify(data));
        throw new Error(srvMsg
          ? 'El servicio de registro no está disponible temporalmente. Intente de nuevo en unos minutos.'
          : 'Respuesta inesperada del servidor. Intente de nuevo.');
      }
      if (data.StatusResult !== 'OK') {
        console.warn('[CRBOX] Registration rejected — StatusResult:', data.StatusResult, '| Message:', data.Message || '(none)');
      }
      return data;
    });
  }

  // ─── Update Profile payload builder ───────────────────────────────────────
  // rawApiResponse = full raw getuserinfo response ({ Consignee: {...}, Phones, Addresses, ... })
  // formEdits      = optional flat overrides from form inputs:
  //   { firstName, lastName1, email, idType, idNumber, password, confirmPassword }
  // password / confirmPassword are only included when non-empty (optional update).
  function buildUpdateProfilePayload(rawApiResponse, formEdits) {
    formEdits = formEdits || {};
    // Normalise: accept both raw (has .Consignee) and flat objects
    var c = (rawApiResponse && rawApiResponse.Consignee) ? rawApiResponse.Consignee : (rawApiResponse || {});

    var firstName  = formEdits.firstName  || c.consigneename     || c.ConsigneeName     || '';
    var lastName1  = formEdits.lastName1  || c.consigneelastname1 || c.ConsigneeLastName1 || '';
    var lastName2  =                         c.consigneelastname2 || c.ConsigneeLastName2 || '';
    var email      = formEdits.email      || c.email    || c.Email    || getEmail() || '';
    var idType     = formEdits.idType     || c.identificationtype   || c.IdentificationType   || '';
    var idNumber   = formEdits.idNumber   || c.identificationnumber || c.IdentificationNumber || '';
    var idCons     = String(c.idconsignee || c.IdConsignee || '');
    var birthDate  = c.birthDate          || c.BirthDate           || '';
    var altEmail   = c.alternativeEmail   || c.AlternativeEmail    || '';
    var country    = c.residenceCountry   || c.ResidenceCountry    || 'CR';
    var contact1   = c.contactName1       || c.ContactName1        || '';
    var contact2   = c.contactName2       || c.ContactName2        || '';
    var isCompany  = c.isCompany          || c.IsCompany           || 0;
    var newsletter = (typeof formEdits.receivesNewsletter === 'boolean')
      ? formEdits.receivesNewsletter
      : (c.receivesNewsletter || c.ReceivesNewsletter || false);
    var responsab  = c.responsabilidad    || c.Responsabilidad     || 0;
    var idResp     = c.idResponsabilidad  || c.IdResponsabilidad   || '';
    var omitir     = c.omitirReceptor     || c.OmitirReceptor      || false;

    var sucursal   = c.sucursal || c.Sucursal || {};
    var sucursalId = sucursal._idsucursal || sucursal.IdSucursal || sucursal.idSucursal || '';

    // Preserve nested phones/addresses from the raw response (keep real IDs)
    var raw        = rawApiResponse || {};
    var phones     = (raw.Phones    || c.phones    || []).slice(); // shallow clone
    var addresses  = raw.Addresses || c.addresses || [];

    // Merge phone edit back into the first phone record
    var editedPhone = formEdits.phone || '';
    if (editedPhone) {
      if (phones.length > 0) {
        phones[0] = Object.assign({}, phones[0], { phonenumber: editedPhone });
      } else {
        phones = [{ idphone: 0, phonenumber: editedPhone }];
      }
    }

    var params = new URLSearchParams();
    params.set('Consignee.IdConsignee',          idCons);
    params.set('Token',                          getToken() || '');
    params.set('Consignee.ConsigneeName',         firstName);
    params.set('Consignee.ConsigneeLastName1',    lastName1);
    params.set('Consignee.ConsigneeLastName2',    lastName2);
    params.set('Consignee.Email',                 email);
    params.set('ConfirmEmail',                    email);
    params.set('Consignee.IdentificationNumber',  idNumber);
    params.set('Consignee.IdentificationType',    idType);
    params.set('Consignee.IsCompany',             isCompany ? 'true' : 'false');
    params.set('Consignee.ResidenceCountry',      country);
    params.set('Consignee.ReceivesNewsletter',    newsletter ? 'true' : 'false');
    params.set('Consignee.Responsabilidad',       String(responsab));
    params.set('Consignee.AlternativeEmail',      altEmail);
    params.set('Consignee.ContactName1',          contact1);
    params.set('Consignee.ContactName2',          contact2);
    params.set('Consignee.IdResponsabilidad',     String(idResp));
    params.set('Consignee.BirthDate',             birthDate);
    params.set('Consignee.OmitirReceptor',        omitir ? 'true' : 'false');
    params.set('Consignee.Sucursal.IdSucursal',   String(sucursalId));
    params.set('CompanyCode',                     raw.CompanyCode || '');
    params.set('Phones',                          JSON.stringify(phones));
    params.set('Addresses',                       JSON.stringify(addresses));
    // Password is optional — only include when the user explicitly provides it
    var pw      = formEdits.password        || '';
    var pwConf  = formEdits.confirmPassword || pw;
    if (pw) {
      params.set('Password',        pw);
      params.set('ConfirmPassword', pwConf);
    }
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
            '<i class="fas fa-border-all mr-3 text-orange-500"></i>' +
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
              '<i class="fas fa-border-all mr-2"></i>' +
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

  var PROTECTED_PAGES = ['dashboard.html', 'mis-paquetes.html', 'mi-cuenta.html', 'mis-facturas.html', 'mis-solicitudes.html', 'solicitud.html'];

  // ─── Auth gate ────────────────────────────────────────────────────────────
  // Validates all four token/email partial-state combinations:
  //   token + email (not expired)  → proceed normally
  //   token only, no email         → clear + redirect (incoherent)
  //   email only, no token         → clear + redirect (expired/missing)
  //   neither                      → redirect cleanly
  function enforceAuthGate() {
    var path = window.location.pathname;
    var page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    if (PROTECTED_PAGES.indexOf(page) === -1) return;

    var token = getToken(); // null if expired or absent
    var email = getEmail();

    // Both absent → clean redirect
    if (!token && !email) {
      window.location.replace('login.html');
      return;
    }
    // Token without email, or email without token → incoherent state; clear + redirect
    if (!token || !email) {
      if (window.CRBOX && CRBOX.track) { try { CRBOX.track.session_expired(); } catch (_e) {} }
      clearToken();
      window.location.replace('login.html?msg=session-expired');
      return;
    }
    // Both present and token not expired → proceed
  }

  // ─── Portal header dropdown toggle ───────────────────────────────────────
  // Public pages each have their own inline dropdown handler; this function
  // only activates on portal pages so it never double-binds.
  var PORTAL_PAGES = ['dashboard.html', 'mis-paquetes.html', 'mis-facturas.html', 'mi-cuenta.html', 'mis-solicitudes.html', 'solicitud.html'];

  function initPortalDropdown() {
    var path = window.location.pathname;
    var page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    if (PORTAL_PAGES.indexOf(page) === -1) return;

    var btn  = document.getElementById('user-menu-button');
    var menu = document.getElementById('user-dropdown-menu');
    if (!btn || !menu) return;

    function openMenu() {
      menu.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
      menu.classList.add('opacity-100', 'scale-100');
      btn.setAttribute('aria-expanded', 'true');
    }
    function closeMenu() {
      menu.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
      menu.classList.remove('opacity-100', 'scale-100');
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.contains('pointer-events-none') ? openMenu() : closeMenu();
    });

    document.addEventListener('click', function (e) {
      if (!menu.classList.contains('pointer-events-none') &&
          !btn.contains(e.target) && !menu.contains(e.target)) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    enforceAuthGate();
    updateHeaderAuthState();
    initPortalDropdown();
  });

  // ─── Safari iOS bfcache restore ───────────────────────────────────────────
  // Pages restored from bfcache do not fire DOMContentLoaded; enforceAuthGate
  // must re-run to catch sessions that expired while the tab was in cache.
  // If the session is still valid we dispatch 'crbox:pageresume' so portal
  // pages can rehydrate profile data.
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return; // not a bfcache restore
    var path = window.location.pathname;
    var page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    if (PROTECTED_PAGES.indexOf(page) === -1) return;
    // Re-validate session
    var token = getToken();
    var email = getEmail();
    if (!token || !email) {
      if (window.CRBOX && CRBOX.track) { try { CRBOX.track.session_expired(); } catch (_e) {} }
      clearToken();
      window.location.replace('login.html?msg=session-expired');
      return;
    }
    // Session still valid — notify page scripts so they can rehydrate
    try {
      window.dispatchEvent(new CustomEvent('crbox:pageresume', { detail: { reason: 'bfcache' } }));
    } catch (_) {}
  });

  // ─── Tab visibility re-check ─────────────────────────────────────────────
  // When the tab becomes visible after being hidden (e.g., user switches back
  // from another app on mobile), re-validate the session.
  // If invalid → clear + redirect. If valid → dispatch crbox:pageresume
  // so portal pages can silently rehydrate profile data.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    var path = window.location.pathname;
    var page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    if (PROTECTED_PAGES.indexOf(page) === -1) return;
    var token = getToken();
    var email = getEmail();
    if (!token || !email) {
      if (window.CRBOX && CRBOX.track) { try { CRBOX.track.session_expired(); } catch (_e) {} }
      clearToken();
      window.location.replace('login.html?msg=session-expired');
      return;
    }
    // Session still valid — notify page scripts so they can rehydrate
    try {
      window.dispatchEvent(new CustomEvent('crbox:pageresume', { detail: { reason: 'visibilitychange' } }));
    } catch (_) {}
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
    SUCURSAL_ID_MAP:           SUCURSAL_ID_MAP,
    PENDING:                   PENDING,
    _registerErrorCategory:    _registerErrorCategory
  };

}(window));
