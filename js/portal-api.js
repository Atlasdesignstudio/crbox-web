// portal-api.js — CRBOX client portal API module
// Wraps all authenticated portal endpoints:
//   getUserInfo, updateProfile, getPackages, getPackagesRDS, getBills, recoverPassword
// Requires auth.js to be loaded first (CRBOXAuth must be available).
//
// Error classification:
//   401 / 403 responses → error.isAuthError = true
//     The server actively rejected the token. Page code should clear session
//     and redirect to login. auth.js / portal page catch handlers do this.
//   All other failures (network, 5xx, timeouts) → error.isAuthError = false
//     Treat as transient. Show a retry prompt; do NOT log the user out.

(function (global) {
  'use strict';

  var BASE = 'https://clients.crbox.cr/api/crboxwebapi';

  // ─── Session-level cache ──────────────────────────────────────────────────
  var _userInfoCache = null;

  function clearUserInfoCache() {
    _userInfoCache = null;
  }

  // ─── Auth-error helper ────────────────────────────────────────────────────
  // Called on any 401/403 response from an authenticated endpoint.
  // Clears the session, redirects to login, and returns an error with
  // isAuthError=true so callers know not to update the UI (redirect is
  // already in flight). All authenticated calls use this helper so the
  // behaviour is consistent regardless of which endpoint rejects the token.
  function _handleAuthFailure(status) {
    if (window.CRBOX && CRBOX.track) { try { CRBOX.track.session_expired(); } catch (_e) {} }
    CRBOXAuth.clearToken();
    if (window.location.pathname.indexOf('login') === -1) {
      window.location.replace('login.html?msg=session-expired');
    }
    var err = new Error('Tu sesión expiró. Por favor inicia sesión de nuevo. (' + status + ')');
    err.isAuthError = true;
    err.status = status;
    return err;
  }

  function _isAuthStatus(status) {
    return status === 401 || status === 403;
  }

  // ─── Centralized fetch wrapper ─────────────────────────────────────────────
  // Single internal entry point for all portal API calls.
  //   url      — the endpoint URL
  //   opts     — standard fetch options (method, headers, body, signal, …)
  //   config   — {
  //                timeout?  : ms before abort (default 15 000)
  //                retries?  : automatic retries for transient 5xx (default 1)
  //                skipAuth? : true = do not add Authorization header
  //              }
  //
  // What this wrapper does:
  //   • Attaches 'Authorization: Bearer <token>' unless skipAuth=true
  //   • Enforces a configurable timeout via AbortController
  //   • Automatically retries once (1 s delay) on transient 5xx responses
  //   • Calls _handleAuthFailure on 401/403 and rethrows with isAuthError=true
  //   • Classifies errors into: auth_error | transient | client | timeout | network
  //   • NEVER logs token values
  //
  // Returns the raw Response so each caller can parse the body as needed.
  function _request(url, opts, config) {
    config = config || {};
    var ms       = (config.timeout  != null) ? config.timeout  : 15000;
    var retries  = (config.retries  != null) ? config.retries  : 1;
    var skipAuth = config.skipAuth || false;

    function _attempt(attemptsLeft) {
      var ctrl  = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = (ctrl && ms > 0) ? setTimeout(function () { ctrl.abort(); }, ms) : null;

      var fetchOpts = Object.assign({}, opts || {});
      if (ctrl) fetchOpts.signal = ctrl.signal;

      if (!skipAuth) {
        var tok = CRBOXAuth.getToken();
        if (tok) {
          fetchOpts.headers = Object.assign(
            { 'Authorization': 'Bearer ' + tok, 'Accept': 'application/json' },
            fetchOpts.headers || {}
          );
        }
      }

      return fetch(url, fetchOpts).then(function (res) {
        if (timer) clearTimeout(timer);
        if (_isAuthStatus(res.status)) throw _handleAuthFailure(res.status);

        // Transient server error — retry if we have attempts left
        if (res.status >= 500 && attemptsLeft > 0) {
          return new Promise(function (resolve) { setTimeout(resolve, 1000); })
            .then(function () { return _attempt(attemptsLeft - 1); });
        }

        // Final attempt also returned 5xx — throw a classified transient error
        // so callers don't silently accept a broken response.
        if (res.status >= 500) {
          var se = new Error('Error del servidor. Intenta de nuevo más tarde.');
          se.isAuthError   = false;
          se.errorCategory = 'transient';
          se.status        = res.status;
          throw se;
        }

        // Classify client errors (4xx except auth) as 'client' so callers know
        // not to retry and can surface the server's error body to the user.
        if (res.status >= 400) {
          res._errorCategory = 'client';
        }

        return res;
      }).catch(function (err) {
        if (timer) clearTimeout(timer);
        if (err && err.isAuthError) throw err;

        var isAbort = err && (err.name === 'AbortError' || err.name === 'TimeoutError');
        if (isAbort) {
          var te = new Error('La solicitud tardó demasiado. Verifica tu conexión e intenta de nuevo.');
          te.isTimeout      = true;
          te.isAuthError    = false;
          te.errorCategory  = 'timeout';
          throw te;
        }

        // Retry transient network failures (not AbortErrors, which are intentional)
        if (attemptsLeft > 0 && !err.isAuthError) {
          return new Promise(function (resolve) { setTimeout(resolve, 1000); })
            .then(function () { return _attempt(attemptsLeft - 1); });
        }

        var ne = err || new Error('Error de red. Verifica tu conexión e intenta de nuevo.');
        ne.isAuthError   = false;
        ne.errorCategory = ne.errorCategory || 'network';
        throw ne;
      });
    }

    return _attempt(retries);
  }

  // ─── Safe JSON parser ─────────────────────────────────────────────────────
  // Wraps Response.json() so malformed or empty bodies never throw an
  // unhandled exception. Returns null when the body cannot be parsed.
  function _parseJSON(res) {
    if (!res) return Promise.resolve(null);
    return res.json().catch(function () { return null; });
  }

  // ─── Classified response error ────────────────────────────────────────────
  // Creates a thrown Error that carries errorCategory / status / isAuthError
  // so downstream catch handlers can branch without losing the classification
  // that _request() stamped onto the Response object.
  // Usage:  if (!res.ok) throw _responseError(res, 'Mensaje en español.');
  function _responseError(res, msg) {
    var e = new Error(msg || 'Error inesperado (' + res.status + ').');
    e.status        = res && res.status;
    e.isAuthError   = false;
    e.errorCategory = (res && res._errorCategory) || (res && res.status >= 500 ? 'transient' : 'client');
    return e;
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
  // 30-day window (the historical default for packages, where activity is
  // continuous — most customers receive packages every few days).
  function _last30Days() {
    var d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }
  // N-month window. Used by surfaces whose activity is sparser than
  // packages (e.g. facturas, which are issued at the cadence the
  // courier closes shipments — typically far less often than once a
  // month). 30 days is too narrow for those surfaces and routinely
  // returned an empty list even for customers with a healthy invoice
  // history. The bills page now defaults to a 6-month window so the
  // initial render has a realistic chance of returning real rows.
  function _lastNMonths(n) {
    var d = new Date();
    d.setMonth(d.getMonth() - (n || 6));
    return d;
  }

  // ─── getUserInfo ──────────────────────────────────────────────────────────
  // Resolves with the getuserinfo JSON object.
  // Signature: getUserInfo(email?, token?, opts?)
  //   All args optional — falls back to CRBOXAuth globals when omitted.
  // Uses a session-level cache; pass opts = { forceRefresh: true } to bypass.
  //
  // Error handling:
  //   401/403 → clears session + redirects to login (definitive auth failure)
  //   Other failures → rejects with a plain Error (transient; page shows retry)
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
      // Token present but email missing → incoherent; clear and redirect.
      if (window.CRBOX && CRBOX.track) { try { CRBOX.track.session_expired(); } catch (_e) {} }
      CRBOXAuth.clearToken();
      if (window.location.pathname.indexOf('login') === -1) {
        window.location.replace('login.html?msg=session-expired');
      }
      return Promise.reject(new Error('No se encontró el correo de sesión. Por favor inicia sesión de nuevo.'));
    }

    // ── Server-side proxy fallback for getUserInfo ─────────────────────────
    // Called when the direct browser fetch returns non-JSON (e.g. HTML redirect
    // on a dev origin) or throws a transient network/CORS error. The proxy makes
    // the same request Python→CRBOX server-to-server, bypassing origin issues.
    // Errors are tagged _fromProxy=true so the outer catch does not retry.
    function _tryUserInfoProxy() {
      return fetch('/api/userinfo-proxy?email=' + encodeURIComponent(email), {
        headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' }
      }).then(function (r) {
        if (!r.ok) {
          if (r.status === 401 || r.status === 403) throw _handleAuthFailure(r.status);
          var pe = new Error('No se pudo obtener la información de tu cuenta (' + r.status + ').');
          pe.isAuthError = false; pe._fromProxy = true; throw pe;
        }
        return r.json().catch(function () {
          var pe2 = new Error('No se pudo obtener la información de tu cuenta (respuesta inválida).');
          pe2.isAuthError = false; pe2._fromProxy = true; throw pe2;
        });
      }).then(function (data) {
        if (!data) {
          var ne = new Error('No se pudo obtener la información de tu cuenta.');
          ne.isAuthError = false; ne._fromProxy = true; throw ne;
        }
        _userInfoCache = data;
        return data;
      }).catch(function (err) {
        if (err && err._fromProxy) throw err;
        var ne2 = err || new Error('Error de red al obtener la información de tu cuenta.');
        ne2.isAuthError = false; ne2._fromProxy = true; throw ne2;
      });
    }

    return _request(BASE + '/getuserinfo/' + encodeURIComponent(email), {}, {})
    .then(function (res) {
      if (!res.ok) {
        throw _responseError(res, 'No se pudo obtener la información de tu cuenta (' + res.status + '). Intenta de nuevo.');
      }
      return _parseJSON(res);
    }).then(function (data) {
      if (data !== null) {
        _userInfoCache = data;
        return data;
      }
      // Direct call returned non-JSON body (e.g. HTML on this origin) → use proxy.
      return _tryUserInfoProxy();
    }).catch(function (err) {
      if (err && err.isAuthError) throw err;
      if (err && err._fromProxy) throw err;  // proxy already failed — do not retry
      // Direct call threw a transient/network error → try server-side proxy.
      return _tryUserInfoProxy();
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

    return _request(BASE + '/postedituser', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload
    }, {}).then(function (res) {
      if (!res.ok) throw _responseError(res, 'Error al guardar el perfil (' + res.status + ').');
      return _parseJSON(res);
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

    // ── Server-side proxy fallback for getPackages ─────────────────────────
    // Called when the direct browser fetch returns non-JSON or throws a
    // transient error. The proxy makes the same request Python→CRBOX,
    // bypassing any origin-based response differences.
    // A valid empty array [] from CRBOX is returned as-is (honest empty state).
    function _tryPackagesProxy() {
      var qs = '?id='       + encodeURIComponent(String(idConsignee)) +
               '&start='    + encodeURIComponent(start) +
               '&end='      + encodeURIComponent(end)   +
               '&tracking=' + encodeURIComponent(track) +
               '&status='   + encodeURIComponent(stat);
      return fetch('/api/packages-proxy' + qs, {
        headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' }
      }).then(function (r) {
        if (!r.ok) {
          if (r.status === 401 || r.status === 403) throw _handleAuthFailure(r.status);
          var pe = new Error('No se pudieron cargar los paquetes (' + r.status + ').');
          pe.isAuthError = false; pe._fromProxy = true; throw pe;
        }
        return r.json().catch(function () {
          var pe2 = new Error('No se pudieron cargar los paquetes (respuesta inválida del servidor).');
          pe2.isAuthError = false; pe2._fromProxy = true; throw pe2;
        });
      }).catch(function (err) {
        if (err && err._fromProxy) throw err;
        var ne = err || new Error('Error de red en proxy de paquetes.');
        ne.isAuthError = false; ne._fromProxy = true; throw ne;
      });
    }

    return _request(url, {}, {}).then(function (res) {
      if (!res.ok) throw _responseError(res, 'No se pudieron cargar los paquetes (' + res.status + '). Intenta de nuevo.');
      return _parseJSON(res);
    }).then(function (data) {
      if (data !== null) return data;
      // Direct call returned non-JSON body → fall back to server-side proxy.
      return _tryPackagesProxy();
    }).catch(function (err) {
      if (err && err.isAuthError) throw err;
      if (err && err._fromProxy) throw err;  // proxy already failed — do not retry
      // Direct call threw a transient/network error → try server-side proxy.
      return _tryPackagesProxy();
    });
  }

  // ─── formatDateISO ────────────────────────────────────────────────────────
  // Return a YYYY-MM-DD string from a Date object (or anything new Date() accepts).
  // Used internally by getPackagesRDS because the RDS endpoint expects ISO dates,
  // while the legacy formatDate() produces DD-MM-YYYY.
  function formatDateISO(d) {
    var dt = (d instanceof Date) ? d : new Date(d);
    var y  = dt.getFullYear();
    var m  = String(dt.getMonth() + 1).padStart(2, '0');
    var day = String(dt.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  // ─── getPackagesRDS ───────────────────────────────────────────────────────
  // Calls /api/portal/my-packages — the portal-safe, RDS-backed endpoint.
  //
  // Auth: sends the portal Bearer token + X-Casillero-Email header.
  //       The server resolves idConsignee from the verified email.
  //       Never sends idConsignee from the client.
  //
  // Returns a raw array of package objects whose field names match the legacy
  // getuserpackages convention, so the existing mis-paquetes envelope-unwrapper
  // and mapPackage() work without modification.
  //
  // Error behaviour mirrors the error classification contract at the top of this
  // module:
  //   401/403 → error.isAuthError = true  (caller must not fall back — session dead)
  //   All other failures → error.isAuthError = false  (caller may fall back to legacy)
  //
  // startDate / endDate: Date objects (forwarded to formatDateISO)
  // tracking: tracking number prefix filter, '' or 'null' for all
  // status: status code string, '' or '1000' for all statuses
  function getPackagesRDS(startDate, endDate, tracking, status) {
    var token = CRBOXAuth.getToken ? CRBOXAuth.getToken() : '';
    var email = CRBOXAuth.getEmail ? CRBOXAuth.getEmail() : '';
    if (!token) {
      var noTokErr = new Error('Sesión no iniciada. Por favor inicia sesión.');
      noTokErr.isAuthError = true;
      return Promise.reject(noTokErr);
    }
    if (!email) {
      var noEmailErr = new Error('No se pudo obtener el email de la sesión.');
      noEmailErr.isAuthError = false;
      return Promise.reject(noEmailErr);
    }

    var start = formatDateISO(startDate || _last30Days());
    var end   = formatDateISO(endDate   || _defaultEndDate());

    var qs = '?start=' + encodeURIComponent(start) +
             '&end='   + encodeURIComponent(end);

    // Status: '1000' is the legacy "all" sentinel — omit the param (server default is all)
    var statStr = (status && String(status).trim()) ? String(status).trim() : '';
    if (statStr && statStr !== '1000') {
      qs += '&status=' + encodeURIComponent(statStr);
    }

    // Tracking: 'null' is the legacy "no filter" sentinel — omit the param
    var trackStr = (tracking && String(tracking).trim() && String(tracking).trim() !== 'null')
      ? String(tracking).trim() : '';
    if (trackStr) {
      qs += '&tracking=' + encodeURIComponent(trackStr);
    }

    return fetch('/api/portal/my-packages' + qs, {
      headers: {
        'Authorization':     'Bearer ' + token,
        'X-Casillero-Email': email,
        'Accept':            'application/json'
      }
    }).then(function (r) {
      if (r.status === 401 || r.status === 403) {
        throw _handleAuthFailure(r.status);
      }
      if (!r.ok) {
        var e = new Error('RDS packages endpoint returned ' + r.status + '.');
        e.isAuthError = false;
        e._rdsStatus  = r.status;
        throw e;
      }
      return r.json().catch(function () {
        var je = new Error('RDS packages response was not valid JSON.');
        je.isAuthError = false;
        throw je;
      });
    }).then(function (data) {
      // Unwrap the { ok, source, packages: [...] } envelope
      if (!data || typeof data !== 'object') {
        var se = new Error('RDS packages response had unexpected shape.');
        se.isAuthError = false;
        throw se;
      }
      if (!Array.isArray(data.packages)) {
        var ae = new Error('RDS packages response missing packages array.');
        ae.isAuthError = false;
        throw ae;
      }
      return data.packages;
    }).catch(function (err) {
      // Re-throw everything — caller decides whether to fall back.
      // Auth errors must NOT be swallowed.
      if (!err) {
        var ne = new Error('Unknown RDS packages error.');
        ne.isAuthError = false;
        throw ne;
      }
      throw err;
    });
  }

  // Accept bare arrays or common .NET envelope wrappers. Centralized
  // here so page code only ever consumes mapped bills.
  function _unwrapBillsEnvelope(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    var keys = ['Facturas', 'facturas', 'Bills', 'bills', 'data', 'Data', 'Result', 'result'];
    for (var i = 0; i < keys.length; i++) {
      if (Array.isArray(data[keys[i]])) return data[keys[i]];
    }
    if (data.Factura && typeof data.Factura === 'object') return [data];
    return [];
  }

  // ─── getBills ─────────────────────────────────────────────────────────────
  // email: account email; startDate / endDate: Date objects
  // Returns mapped bills array (page never sees raw payload).
  function getBills(email, startDate, endDate) {
    var token = CRBOXAuth.getToken();
    if (!token) return Promise.reject(new Error('Sesión no iniciada. Por favor inicia sesión.'));

    var start = formatDate(startDate || _lastNMonths(6));
    var end   = formatDate(endDate   || _defaultEndDate());

    var url = BASE + '/getfacturas/' +
      encodeURIComponent(email) + '/' + start + '/' + end;

    return _request(url, {}, {}).then(function (res) {
      if (!res.ok) throw _responseError(res, 'No se pudieron cargar las facturas (' + res.status + '). Intenta de nuevo.');
      return _parseJSON(res);
    }).then(function (data) {
      var raw = _unwrapBillsEnvelope(data);
      return raw.map(function (r) { return mapBill(r); });
    });
  }

  // ─── getBillsRDS ──────────────────────────────────────────────────────────
  // Calls /api/portal/invoices-rds — the portal-safe, RDS-backed endpoint.
  //
  // Auth: sends the portal Bearer token + X-Casillero-Email header.
  //       The server resolves idConsignee from the verified email.
  //       Never sends idConsignee from the client.
  //
  // Returns a mapped bills array (page never sees raw payload).  Each element
  // is the output of mapBill(), identical in shape to getBills().
  //
  // Error behaviour mirrors the error-classification contract at the top of
  // this module:
  //   401/403 → error.isAuthError = true  (caller must not fall back — session dead)
  //   All other failures → error.isAuthError = false  (caller may fall back to legacy)
  //
  // startDate / endDate: Date objects (forwarded to formatDateISO)
  function getBillsRDS(startDate, endDate) {
    var token = CRBOXAuth.getToken ? CRBOXAuth.getToken() : '';
    var email = CRBOXAuth.getEmail ? CRBOXAuth.getEmail() : '';
    if (!token) {
      var noTokErr = new Error('Sesión no iniciada. Por favor inicia sesión.');
      noTokErr.isAuthError = true;
      return Promise.reject(noTokErr);
    }
    if (!email) {
      var noEmailErr = new Error('No se pudo obtener el email de la sesión.');
      noEmailErr.isAuthError = false;
      return Promise.reject(noEmailErr);
    }

    var start = formatDateISO(startDate || _lastNMonths(6));
    var end   = formatDateISO(endDate   || _defaultEndDate());

    var qs = '?start=' + encodeURIComponent(start) +
             '&end='   + encodeURIComponent(end);

    return fetch('/api/portal/invoices-rds' + qs, {
      headers: {
        'Authorization':     'Bearer ' + token,
        'X-Casillero-Email': email,
        'Accept':            'application/json'
      }
    }).then(function (r) {
      if (r.status === 401 || r.status === 403) {
        throw _handleAuthFailure(r.status);
      }
      if (!r.ok) {
        var e = new Error('RDS invoices endpoint returned ' + r.status + '.');
        e.isAuthError = false;
        e._rdsStatus  = r.status;
        throw e;
      }
      return r.json().catch(function () {
        var je = new Error('RDS invoices response was not valid JSON.');
        je.isAuthError = false;
        throw je;
      });
    }).then(function (data) {
      if (!data || typeof data !== 'object') {
        var se = new Error('RDS invoices response had unexpected shape.');
        se.isAuthError = false;
        throw se;
      }
      if (!Array.isArray(data.facturas)) {
        var ae = new Error('RDS invoices response missing facturas array.');
        ae.isAuthError = false;
        throw ae;
      }
      return data.facturas.map(function (r) { return mapBill(r); });
    }).catch(function (err) {
      if (!err) {
        var ne = new Error('Unknown RDS invoices error.');
        ne.isAuthError = false;
        throw ne;
      }
      throw err;
    });
  }

  // ─── saveBill ─────────────────────────────────────────────────────────────
  // Step 1 of the invoice upload flow.
  // Routes exclusively through POST /api/proxy/saveBill, which this server
  // forwards to the legacy WordPress installation at LEGACY_WORDPRESS_IP
  // (bypassing the DNS change).  WordPress stores the file permanently and
  // returns an absolute https://crbox.cr/wp-content/uploads/... URL.
  // No local-storage fallback — Replit's filesystem is ephemeral and must
  // never write file URLs into CRBOX production records.
  // Rejects with err.step = 'saveBill' so the caller can show a specific message.
  function saveBill(email, file, wrId) {
    var token = CRBOXAuth.getToken();
    if (!token) {
      var noAuthErr = new Error('Sesión no iniciada. Por favor inicia sesión.');
      noAuthErr.step = 'saveBill';
      return Promise.reject(noAuthErr);
    }

    function _makeFormData() {
      var fd = new FormData();
      fd.append('email',   String(email || ''));
      fd.append('invoice', file);
      fd.append('wr_id',   String(wrId  || ''));
      return fd;
    }

    function _doUpload(endpoint) {
      return _request(endpoint, {
        method: 'POST',
        headers: { 'X-Casillero-Email': String(email || '') },
        body: _makeFormData(),
      }, { timeout: 30000 }).then(function (res) {
        if (!res.ok) {
          return res.text().then(function (txt) {
            var detail = '';
            try { var j = JSON.parse(txt); detail = j.message || j.error || ''; }
            catch (_) { detail = txt.length < 200 ? txt.trim() : ''; }
            var msg = 'No se pudo subir el archivo de factura (' + res.status + ').' +
                      (detail ? ' ' + detail : ' Intenta de nuevo.');
            var err = new Error(msg);
            err.step = 'saveBill';
            err._httpStatus = res.status;
            throw err;
          });
        }
        return res.json().catch(function () {
          var e = new Error('Respuesta inesperada del servidor. Intenta de nuevo.');
          e.step = 'saveBill';
          throw e;
        });
      }).then(function (data) {
        if (!data || !data.url) {
          var e2 = new Error('El servidor no devolvió la URL del archivo subido. Intenta de nuevo.');
          e2.step = 'saveBill';
          throw e2;
        }
        // WordPress URLs are already absolute (https://crbox.cr/...);
        // local paths are relative (/uploads/invoices/...) and need an origin prefix.
        var absUrl = (data.url.indexOf('http') === 0)
          ? data.url
          : ((typeof window !== 'undefined' && window.location && window.location.origin)
              ? window.location.origin + data.url
              : data.url);
        return { url: absUrl, type: data.type, file: data.file };
      });
    }

    // Route exclusively through the WordPress proxy — no local-storage fallback.
    // If the proxy fails, surface the error to the user; do not write ephemeral
    // local paths into CRBOX production records.
    return _doUpload('/api/proxy/saveBill').catch(function (err) {
      err.step = 'saveBill';
      throw err;
    });
  }

  // ─── deleteInvoiceUpload ──────────────────────────────────────────────────
  // Best-effort cleanup: removes an orphaned invoice file when createPurchaseBill
  // fails after saveBill succeeded.  Errors are swallowed since this is cleanup,
  // not critical path.
  function deleteInvoiceUpload(filename) {
    if (!filename) return;
    var token = CRBOXAuth.getToken();
    var email = CRBOXAuth.getEmail ? CRBOXAuth.getEmail() : '';
    if (!token || !email) return;
    _request('/api/invoice-upload/' + encodeURIComponent(filename), {
      method: 'DELETE',
      headers: { 'X-Casillero-Email': email },
    }, { timeout: 10000 }).catch(function () { /* best-effort cleanup */ });
  }

  // ─── createPurchaseBill ───────────────────────────────────────────────────
  // Step 2 of the invoice upload flow.
  // Creates the purchase-bill record in the CRBOX system.
  // payload: { ClientInvoiceText, Descripcion, FileLocation, Monto,
  //            NumeroFactura, WRId }
  // Rejects with err.step = 'createPurchaseBill' on failure.
  function createPurchaseBill(payload) {
    var token = CRBOXAuth.getToken();
    if (!token) {
      var noTokenErr = new Error('Sesión no iniciada. Por favor inicia sesión.');
      noTokenErr.step = 'createPurchaseBill';
      return Promise.reject(noTokenErr);
    }

    var body = new URLSearchParams();
    // Use payload[k] ?? '' so numeric 0 values (e.g. Monto=0) are preserved as '0',
    // not silently dropped by the falsy coercion of || ''.
    Object.keys(payload).forEach(function (k) {
      var v = payload[k];
      body.append(k, (v !== null && v !== undefined) ? String(v) : '');
    });

    return _request(BASE + '/postcreatepurchasebill', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }, {}).then(function (res) {
      if (!res.ok) {
        var err = _responseError(res, 'No se pudo registrar la factura en el sistema (' + res.status + '). El archivo ya fue subido pero el registro falló.');
        err.step = 'createPurchaseBill';
        throw err;
      }
      return _parseJSON(res);
    }).then(function (data) {
      var sr = data && (data.StatusResult || data.statusResult || '');
      if (sr !== 'OK') {
        var msg = (data && (data.Message || data.message)) || 'No se pudo registrar la factura.';
        var err2 = new Error(msg + ' El archivo ya fue subido pero el registro falló.');
        err2.step = 'createPurchaseBill';
        err2.apiData = data;
        throw err2;
      }
      return data;
    });
  }

  // ─── getPurchaseBills ─────────────────────────────────────────────────────
  // Returns the raw array of purchase bills for a given warehouseReceiptId.
  // Each item includes: IdPurchaseBill, FileLocation, FileTextContent,
  // NumeroFactura, Monto, Descripcion, CreatedDate.
  function getPurchaseBills(warehouseReceiptId) {
    var token = CRBOXAuth.getToken();
    if (!token) {
      var e = new Error('Sesión no iniciada.');
      e.step = 'getPurchaseBills';
      return Promise.reject(e);
    }
    return _request(
      BASE + '/getpurchasebills/' + encodeURIComponent(String(warehouseReceiptId)),
      { method: 'GET' }, {}
    ).then(function (res) {
      if (!res.ok) {
        var err = _responseError(res, 'No se pudieron obtener las facturas (' + res.status + ').');
        err.step = 'getPurchaseBills';
        throw err;
      }
      return _parseJSON(res);
    });
  }

  // ─── deletePurchaseBill ───────────────────────────────────────────────────
  // Deletes the purchase bill for the given warehouseReceiptId / email pair.
  // Uses the client-facing GET endpoint — no admin credentials required.
  // Resolves with the raw response on StatusResult === "OK"; rejects otherwise.
  // IMPORTANT: does NOT log warehouseReceiptId, email, or any PII.
  function deletePurchaseBill(warehouseReceiptId, email) {
    var token = CRBOXAuth.getToken();
    if (!token) {
      var e = new Error('Sesión no iniciada.');
      e.step = 'deletePurchaseBill';
      return Promise.reject(e);
    }
    // Email is placed raw (not %40-encoded) in the URL path — the CRBOX API
    // matches it as a plain string and rejects percent-encoded variants.
    var _wrIdSafe = encodeURIComponent(String(warehouseReceiptId));
    var _emailSafe = String(email); // intentionally not encodeURIComponent
    return _request(
      BASE + '/getdeletepurchasebill/' + _wrIdSafe + '/' + _emailSafe,
      { method: 'GET' }, {}
    ).then(function (res) {
      if (!res.ok) {
        console.warn('[CRBOX] deletePurchaseBill HTTP error:', res.status, res.statusText);
        var err = _responseError(res, 'No se pudo eliminar la factura (' + res.status + ').');
        err.step = 'deletePurchaseBill';
        throw err;
      }
      return _parseJSON(res);
    }).then(function (data) {
      console.log('[CRBOX] deletePurchaseBill response:', JSON.stringify(data));
      var sr = data && (data.StatusResult || data.statusResult || '');
      if (sr !== 'OK') {
        var msg = (data && (data.Message || data.message)) || 'No se pudo eliminar la factura.';
        console.warn('[CRBOX] deletePurchaseBill StatusResult not OK — msg:', msg, '— raw:', JSON.stringify(data));
        var err2 = new Error(msg);
        err2.step = 'deletePurchaseBill';
        err2.apiData = data;
        throw err2;
      }
      return data;
    });
  }

  // ─── recoverPassword ──────────────────────────────────────────────────────
  // GET endpoint — no auth required.
  // Resolves {ok: true|false, message: string}; only rejects on network errors.
  function recoverPassword(email) {
    return _request(BASE + '/getuserpasswordrecovery/' + encodeURIComponent(email), {}, { skipAuth: true })
      .then(function (res) {
        if (!res.ok) throw _responseError(res, 'Error de red al recuperar contraseña (' + res.status + ').');
        return _parseJSON(res);
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
  var IN_TRANSIT_STATUS_IDS = [1, 2, 3, 4];

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
      invoiceFileUrl:          _str(raw.fileLocation || raw.FileLocation || raw.invoiceFileUrl || raw.InvoiceFileUrl || raw.invoiceurl || raw.InvoiceUrl || ''),
      numerofactura:           _str(raw.numerofactura || raw.NumeroFactura || raw.invoiceNumber || raw.InvoiceNumber || ''),
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
      trackingnumber:        _str(raw.trackingnumber || raw.trackingNumber || carrierInfo.trackingnumber || ''),
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
      volumentricWeigth:       _num(f.volumentricWeigth),
      cantidadBultos:          _num(f.cantidadBultos),
      total:                   _num(f.total),
      descuentoNombre:         _str(disc._nombre || disc.nombre),
      isInvoiced:              f.isInvoiced === true || f.isInvoiced === 'true',
      invoiceFileUrl:          _str(f.fileLocation || f.FileLocation || f.invoiceFileUrl || f.InvoiceFileUrl || f.pdfUrl || f.PdfUrl || ''),
      recibos:                 recArr.map(mapRecibo),
      // Convenience derived
      bestDate:                f.billedDate || f.createdDate || ''
    };
  }

  // ─── _mapRdsProfile ───────────────────────────────────────────────────────
  // Maps the RDS portal profile shape (from /api/portal/profile-rds) into the
  // legacy-compatible getUserInfo shape that _applyProfile in mi-cuenta.html
  // already handles.  _applyProfile itself requires no changes.
  //
  // Key mapping decisions (documented in docs/rds-profile-frontend-wiring.md):
  //   identificationnumber  ← identificationNumberMasked (****<last4>)
  //   phones[].phonenumber  ← phones[].phoneMasked       (****<last4>)
  //   sucursal._name        ← branch.name
  //   idconsignee           ← idConsignee (numeric CRBOX portal ID, not codigoFacturacion)
  //
  // PendingDiscount has no column in the consignee table, so the discount badge
  // in mi-cuenta.html is hidden for RDS-sourced profiles.  This is correct.
  function _mapRdsProfile(profile) {
    if (!profile || typeof profile !== 'object') return {};
    var phones = (profile.phones || []).map(function (p) {
      return {
        phonenumber: p.phoneMasked || '',
        phoneType:   p.phoneType   || '',
        isPrimary:   p.isPrimary   || false
      };
    });
    var addresses = (profile.addresses || []).map(function (a) {
      return {
        address1: a.address1 || '',
        Address1: a.address1 || '',
        address2: a.address2 || '',
        Address2: a.address2 || '',
        city:     a.city     || '',
        City:     a.city     || '',
        province: a.province || '',
        Province: a.province || ''
      };
    });
    return {
      _source: 'rds',
      Consignee: {
        consigneename:        profile.name      || '',
        ConsigneeName:        profile.name      || '',
        consigneelastname1:   profile.lastName1 || '',
        ConsigneeLastName1:   profile.lastName1 || '',
        consigneelastname2:   profile.lastName2 || '',
        ConsigneeLastName2:   profile.lastName2 || '',
        idconsignee:          profile.idConsignee,
        IdConsignee:          profile.idConsignee,
        email:                profile.email     || '',
        Email:                profile.email     || '',
        identificationtype:   profile.identificationType || '',
        IdentificationType:   profile.identificationType || '',
        identificationnumber: profile.identificationNumberMasked || '',
        IdentificationNumber: profile.identificationNumberMasked || '',
        receivesNewsletter:   profile.receivesNewsletter,
        ReceivesNewsletter:   profile.receivesNewsletter,
        sucursal: {
          _name:       (profile.branch && profile.branch.name) || '',
          _idsucursal: (profile.branch && profile.branch.id)   || null
        },
        phones: phones
      },
      Addresses: addresses
    };
  }

  // ─── getProfileRDS ────────────────────────────────────────────────────────
  // Calls /api/portal/profile-rds — the portal-safe, RDS-backed profile endpoint.
  //
  // Auth: sends the portal Bearer token + X-Casillero-Email header.
  //       The server resolves identity from the validated CRBOX API response.
  //       Never sends idConsignee from the client.
  //
  // Returns a normalized profile object compatible with _applyProfile in
  // mi-cuenta.html (same shape as the legacy getUserInfo response via
  // _mapRdsProfile).
  //
  // Error behaviour mirrors the contract at the top of this module:
  //   401/403 → error.isAuthError = true  (caller must not fall back — session dead)
  //   All other failures → error.isAuthError = false  (caller may fall back to legacy)
  function getProfileRDS() {
    var token = CRBOXAuth.getToken ? CRBOXAuth.getToken() : '';
    var email = CRBOXAuth.getEmail ? CRBOXAuth.getEmail() : '';
    if (!token) {
      var noTokErr = new Error('Sesión no iniciada. Por favor inicia sesión.');
      noTokErr.isAuthError = true;
      return Promise.reject(noTokErr);
    }
    if (!email) {
      var noEmailErr = new Error('No se pudo obtener el email de la sesión.');
      noEmailErr.isAuthError = false;
      return Promise.reject(noEmailErr);
    }

    return fetch('/api/portal/profile-rds', {
      headers: {
        'Authorization':     'Bearer ' + token,
        'X-Casillero-Email': email,
        'Accept':            'application/json'
      }
    }).then(function (r) {
      if (r.status === 401 || r.status === 403) {
        throw _handleAuthFailure(r.status);
      }
      if (!r.ok) {
        var e = new Error('RDS profile endpoint returned ' + r.status + '.');
        e.isAuthError = false;
        e._rdsStatus  = r.status;
        throw e;
      }
      return r.json().catch(function () {
        var je = new Error('RDS profile response was not valid JSON.');
        je.isAuthError = false;
        throw je;
      });
    }).then(function (data) {
      if (!data || typeof data !== 'object' || !data.profile) {
        var se = new Error('RDS profile response had unexpected shape.');
        se.isAuthError = false;
        throw se;
      }
      // Expose raw profile for QA inspection — no raw PII (all masked server-side)
      window.__crboxRdsProfileRaw = data.profile;
      return _mapRdsProfile(data.profile);
    }).catch(function (err) {
      if (!err) {
        var ne = new Error('Unknown RDS profile error.');
        ne.isAuthError = false;
        throw ne;
      }
      throw err;
    });
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  global.CRBOXPortalAPI = {
    getUserInfo:          getUserInfo,
    clearUserInfoCache:   clearUserInfoCache,
    updateProfile:        updateProfile,
    getPackages:          getPackages,
    getPackagesRDS:       getPackagesRDS,
    getBills:             getBills,
    getBillsRDS:          getBillsRDS,
    getProfileRDS:        getProfileRDS,
    saveBill:             saveBill,
    deleteInvoiceUpload:  deleteInvoiceUpload,
    createPurchaseBill:   createPurchaseBill,
    getPurchaseBills:     getPurchaseBills,
    deletePurchaseBill:   deletePurchaseBill,
    recoverPassword:      recoverPassword,
    formatDate:           formatDate,
    formatDateISO:        formatDateISO,
    last30Days:           _last30Days,
    lastNMonths:          _lastNMonths,
    defaultStartDate:     _defaultStartDate,
    defaultEndDate:       _defaultEndDate,
    // Field accessors
    mapPackage:           mapPackage,
    mapBill:              mapBill,
    mapRecibo:            mapRecibo,
    STATUS_ID_NAME:       STATUS_ID_NAME,
    IN_TRANSIT_STATUS_IDS: IN_TRANSIT_STATUS_IDS,
    STATUS_ID_EVENT:      STATUS_ID_EVENT
  };

}(window));
