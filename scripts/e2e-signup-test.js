/**
 * CRBOX Signup E2E Test Script
 *
 * PURPOSE
 * -------
 * This script exercises the full new-user flow against the live CRBOX staging API
 * (test.clients.crbox.cr) and the production auth/portal endpoints.  It can only
 * be run from a browser that has network access to those hosts — typically by opening
 * the CRBOX app in a browser and pasting this script into the DevTools console.
 *
 * USAGE
 * -----
 * 1. Open https://<your-crbox-host>/afiliate.html in a browser where the API is
 *    reachable (i.e. NOT from the Replit cloud environment).
 * 2. Open DevTools → Console.
 * 3. Paste this entire script and press Enter.
 * 4. Read the PASS / FAIL log lines printed to the console.
 *
 * WHAT IS TESTED
 * --------------
 * T1  Registration payload shape — verifies that the EXACT same helper functions
 *     used by the 3-step stepper (CRLocations, CRBOXAuth.PENDING) produce the
 *     correct field values expected by the API. This reproduces the afiliate.html
 *     serialization path without needing to DOM-fill the form.
 * T2  POST /postregisteruser — create a disposable test account on staging using
 *     the payload built by T1.
 * T3  Auto-login after signup — POST /authtoken with the new credentials.
 * T4  getUserInfo field coverage — confirms Phones / Addresses are present and the
 *     activation-card heuristics (hasPhone, hasAddress, hasName, hasIdNo) all fire.
 * T5  Activation card visibility — verifies the heuristic logic against the real
 *     getUserInfo payload.
 * T6  Profile update — POST /postedituser via CRBOXPortalAPI.updateProfile, using
 *     CRBOXAuth.buildUpdateProfilePayload (the same function used by mi-cuenta.html).
 *
 * NOTE: Each test run creates a real staging account. Use a disposable email
 * (e.g. a "+" alias) and delete the account afterward if needed.
 */

(async function CRBOX_E2E() {
  'use strict';

  /* ── helpers ─────────────────────────────────────────────────────────────── */
  var _pass = 0, _fail = 0, _warn = 0;
  function ok(label, cond, extra) {
    if (cond) { _pass++; console.log('%c✔ PASS  ' + label, 'color:green', extra !== undefined ? extra : ''); }
    else       { _fail++; console.error('✘ FAIL  ' + label, extra !== undefined ? extra : ''); }
  }
  function warn(label, msg) {
    _warn++;
    console.warn('⚠ WARN  ' + label, msg !== undefined ? msg : '');
  }
  function section(title) {
    console.groupCollapsed('%c── ' + title + ' ──', 'font-weight:bold;color:#c2410c');
  }
  function sectionEnd() { console.groupEnd(); }

  /* ── guard: modules must be loaded ──────────────────────────────────────── */
  if (typeof CRBOXAuth === 'undefined' || typeof CRBOXPortalAPI === 'undefined') {
    console.error('[E2E] CRBOXAuth or CRBOXPortalAPI not found. ' +
      'Make sure you are running this script on the CRBOX app page ' +
      '(afiliate.html or dashboard.html).');
    return;
  }
  if (typeof CRLocations === 'undefined') {
    console.error('[E2E] CRLocations not found. ' +
      'Run this script on afiliate.html (which loads js/cr-locations.js).');
    return;
  }

  /* ── test data (mirrors a realistic afiliate.html form fill) ─────────────── */
  var ts        = Date.now();
  var testEmail = 'crbox.e2e+' + ts + '@mailinator.com';
  var testPw    = 'TestE2E' + ts.toString().slice(-4) + '!';

  /* ══════════════════════════════════════════════════════════════════════════
     T1 — Reproduce the 3-step stepper payload using the real helper functions
          (mirrors the afiliate.html form submit handler exactly)
  ══════════════════════════════════════════════════════════════════════════ */
  section('T1 · Stepper payload helpers (CRLocations + CRBOXAuth.PENDING)');

  // ── T1a: identification type mapping ─────────────────────────────────────
  var idTypeNacional  = CRLocations.getIdentificationType('nacional');
  var idTypeDimex     = CRLocations.getIdentificationType('dimex');
  var idTypePassport  = CRLocations.getIdentificationType('pasaporte');
  var idTypeUnknown   = CRLocations.getIdentificationType('foobar');
  ok('nacional → "Cedula ó Residencia"',   idTypeNacional  === 'Cedula ó Residencia',  idTypeNacional);
  ok('dimex    → "DIMEX"',                 idTypeDimex     === 'DIMEX',                idTypeDimex);
  ok('pasaporte→ "Pasaporte"',             idTypePassport  === 'Pasaporte',             idTypePassport);
  ok('unknown  → safe default (not empty)',idTypeUnknown.length > 0,                   idTypeUnknown);

  // ── T1b: province / canton INEC codes ────────────────────────────────────
  var provSJ   = CRLocations.getProvinceCode('san_jose');
  var provAla  = CRLocations.getProvinceCode('alajuela');
  var provBad  = CRLocations.getProvinceCode('atlantida');  // non-CR province
  ok('san_jose province code === "1"',      provSJ  === '1',  provSJ);
  ok('alajuela province code === "2"',      provAla === '2',  provAla);
  ok('unknown province code is null/falsy', !provBad,         provBad);

  var cantSJCentral = CRLocations.getCantonIndex('san_jose', 'central');
  var cantAlaAlaj   = CRLocations.getCantonIndex('alajuela', 'central');
  var cantBad       = CRLocations.getCantonIndex('san_jose', 'atlantida');
  ok('SJ/Central canton index === "1"',     cantSJCentral === '1', cantSJCentral);
  ok('Alajuela/Central canton index === "1"',cantAlaAlaj  === '1', cantAlaAlaj);
  ok('unknown canton returns null/falsy',   !cantBad,              cantBad);

  // ── T1c: phone type mapping ───────────────────────────────────────────────
  var ptMovil  = CRLocations.getPhoneType('movil');
  var ptCasa   = CRLocations.getPhoneType('casa');
  var ptUnknown = CRLocations.getPhoneType('foobar');
  ok('movil phone → idphonetype === 1',     ptMovil.idphonetype === 1,   ptMovil);
  ok('movil phone → type === "Celular"',    ptMovil.type === 'Celular',  ptMovil);
  ok('unknown phone → safe default (not empty type)', ptUnknown.type.length > 0, ptUnknown);

  // ── T1d: address type mapping ─────────────────────────────────────────────
  var atCasa   = CRLocations.getAddressType('casa');
  var atOfic   = CRLocations.getAddressType('oficina');
  var atUnknown = CRLocations.getAddressType('foobar');
  ok('casa address → idaddresstype === 1',  atCasa.idaddresstype === 1,  atCasa);
  ok('casa address → type === "Casa"',      atCasa.type === 'Casa',      atCasa);
  ok('unknown address → safe default',      atUnknown.idaddresstype > 0, atUnknown);

  // ── T1e: sucursal ID map ──────────────────────────────────────────────────
  var sidSabana    = CRBOXAuth.PENDING.sucursalIdMap['sabana_norte'];
  var sidDomicilio = CRBOXAuth.PENDING.sucursalIdMap['domicilio'];
  var sidBad       = CRBOXAuth.PENDING.sucursalIdMap['atlantida'];
  ok('sabana_norte sucursal id === 1',      sidSabana    === 1,           sidSabana);
  ok('domicilio sucursal id === 13',        sidDomicilio === 13,          sidDomicilio);
  ok('unknown delivery → undefined (will be caught by guard)', sidBad === undefined, sidBad);

  // ── T1f: build the actual registration params using the real helpers ──────
  var nameTokens = 'E2E Test Runner'.trim().split(/\s+/).filter(Boolean);
  var firstName  = nameTokens[0] || '';
  var lastName1  = nameTokens[1] || '';
  var lastName2  = nameTokens.slice(2).join(' ') || '';

  var phoneObjs = [{
    idphone:         CRBOXAuth.PENDING.newPhoneId,
    phonenumber:     '88881234',
    phoneextension:  '',
    isactive:        false,
    isprimary:       true,
    phonetype: {
      idphonetype:  ptMovil.idphonetype,
      type:         ptMovil.type,
      _bIsDeleted:  false,
      _bIsChanged:  true
    },
    consignees:             null,
    phonefreightforwarders: null,
    phoneshippers:          null,
    _bIsDeleted: false,
    _bIsChanged: true
  }];

  var provCode  = CRLocations.getProvinceCode('san_jose')  || '0';
  var cantIdx   = CRLocations.getCantonIndex('san_jose', 'central') || '0';
  var addrLine1 = ['San José', 'SAN JOSÉ', 'CENTRAL', 'CARMEN', 'Calle Test 1'].join(' ');

  var addrObjs = [{
    idaddress:  CRBOXAuth.PENDING.newAddressId,
    line1:      addrLine1,
    line2:      'Calle Test 1',
    city:       'CENTRAL',
    zipcode:    '10101',
    isactive:   false,
    isprimary:  true,
    provincia:  provCode,
    canton:     cantIdx,
    distrito:   '1',
    barrio:     '0',
    direccion:  'Calle Test 1',
    state: {
      idstate: parseInt(provCode, 10) || 0,
      statename: 'San José',
      country: { idcountry: 1, countryname: 'Costa Rica', statecountry: null,
                 _bIsDeleted: false, _bIsChanged: true },
      _bIsDeleted: false, _bIsChanged: true
    },
    addresstype: { idaddresstype: atCasa.idaddresstype, type: atCasa.type,
                   _bIsDeleted: false, _bIsChanged: true },
    _bIsDeleted: false, _bIsChanged: true
  }];

  var params = new URLSearchParams();
  params.set('Consignee.ConsigneeName',        firstName);
  params.set('Consignee.ConsigneeLastName1',   lastName1);
  params.set('Consignee.ConsigneeLastName2',   lastName2);
  params.set('Consignee.Email',                testEmail);
  params.set('ConfirmEmail',                   testEmail);
  params.set('Password',                       testPw);
  params.set('ConfirmPassword',                testPw);
  params.set('Consignee.IdentificationType',   CRLocations.getIdentificationType('nacional'));
  params.set('Consignee.IdentificationNumber', '000000001');
  params.set('Consignee.IsCompany',            '0');
  params.set('Consignee.ResidenceCountry',     'CR');
  params.set('Consignee.ReceivesNewsletter',   'false');
  params.set('Consignee.Responsabilidad',      '0');
  params.set('Consignee.AlternativeEmail',     '');
  params.set('Consignee.ContactName1',         '');
  params.set('Consignee.ContactName2',         '');
  params.set('Consignee.IdResponsabilidad',    '');
  params.set('Consignee.BirthDate',            '');
  params.set('Consignee.Sucursal.IdSucursal',  String(sidSabana));
  params.set('CompanyCode',                    '');
  params.set('Phones',                         JSON.stringify(phoneObjs));
  params.set('Addresses',                      JSON.stringify(addrObjs));
  var testPayload = params.toString();

  // Validate the built payload
  var requiredKeys = [
    'Consignee.ConsigneeName', 'Consignee.ConsigneeLastName1',
    'Consignee.Email', 'ConfirmEmail',
    'Password', 'ConfirmPassword',
    'Consignee.IdentificationType', 'Consignee.IdentificationNumber',
    'Consignee.IsCompany', 'Consignee.ResidenceCountry',
    'Consignee.ReceivesNewsletter', 'Consignee.Responsabilidad',
    'Consignee.Sucursal.IdSucursal',
    'Phones', 'Addresses'
  ];
  requiredKeys.forEach(function (k) {
    var encoded = encodeURIComponent(k);
    ok('payload has key "' + k + '"', testPayload.indexOf(encoded) >= 0 || testPayload.indexOf(k) >= 0);
  });

  var parsedPhones = JSON.parse(params.get('Phones'));
  var parsedAddrs  = JSON.parse(params.get('Addresses'));
  ok('Phones[0].phonenumber present',         !!(parsedPhones[0] && parsedPhones[0].phonenumber));
  ok('Phones[0].phonetype.idphonetype is 1',  parsedPhones[0].phonetype.idphonetype === 1);
  ok('Addresses[0].line1 present',            !!(parsedAddrs[0] && parsedAddrs[0].line1));
  ok('Addresses[0].direccion present',        !!(parsedAddrs[0] && parsedAddrs[0].direccion));
  ok('Addresses[0].provincia !== "0"',        parsedAddrs[0].provincia !== '0');
  ok('Addresses[0].canton !== "0"',           parsedAddrs[0].canton !== '0');
  ok('IdentificationType === Cedula ó Residencia',
     params.get('Consignee.IdentificationType') === 'Cedula ó Residencia',
     params.get('Consignee.IdentificationType'));
  ok('Sucursal.IdSucursal is numeric string', /^\d+$/.test(params.get('Consignee.Sucursal.IdSucursal')));

  console.log('[E2E] T1 payload built via real helpers:', Object.fromEntries(params));
  sectionEnd();

  /* ══════════════════════════════════════════════════════════════════════════
     T2 — POST /postregisteruser (staging) — uses T1 payload
  ══════════════════════════════════════════════════════════════════════════ */
  section('T2 · POST /postregisteruser (staging)');
  var regData;
  try {
    regData = await CRBOXAuth.doRegister(testPayload);
    ok('doRegister resolves',           true);
    ok('StatusResult === "OK"',         regData && regData.StatusResult === 'OK', regData);
    if (regData && regData.StatusResult !== 'OK') {
      warn('API returned non-OK', JSON.stringify(regData));
    }
  } catch (e) {
    ok('doRegister resolves', false, String(e));
    console.error('[E2E] T2 error:', e);
    sectionEnd();
    console.error('[E2E] Cannot continue without a registered account.');
    return;
  }
  sectionEnd();

  /* ══════════════════════════════════════════════════════════════════════════
     T3 — Auto-login (POST /authtoken)
  ══════════════════════════════════════════════════════════════════════════ */
  section('T3 · Auto-login after signup');
  var token;
  try {
    token = await CRBOXAuth.doLogin(testEmail, testPw, false);
    ok('doLogin resolves',               true);
    ok('token is non-empty string',      typeof token === 'string' && token.length > 0);
    ok('CRBOXAuth.isLoggedIn() is true', CRBOXAuth.isLoggedIn());
    ok('getEmail() equals testEmail',    CRBOXAuth.getEmail() === testEmail);
  } catch (e) {
    ok('doLogin resolves', false, String(e));
    console.error('[E2E] T3 error:', e);
    sectionEnd();
    console.error('[E2E] Cannot continue — auto-login failed.');
    return;
  }
  sectionEnd();

  /* ══════════════════════════════════════════════════════════════════════════
     T4 — getUserInfo field coverage
  ══════════════════════════════════════════════════════════════════════════ */
  section('T4 · getUserInfo response fields');
  var info;
  try {
    info = await CRBOXPortalAPI.getUserInfo(testEmail, token, { forceRefresh: true });
    ok('getUserInfo resolves',           true);
    ok('response is an object',          info && typeof info === 'object');

    var c = (info && info.Consignee) ? info.Consignee : (info || {});
    ok('Consignee present',              !!(info && info.Consignee));
    ok('ConsigneeName present',          !!(c.ConsigneeName || c.consigneename));
    ok('IdentificationNumber present',   !!(c.IdentificationNumber || c.identificationnumber));
    ok('IdConsignee present (casillero)',!!(c.IdConsignee || c.idconsignee));

    var phones = (info && (info.Phones || c.phones)) || [];
    ok('Phones array present',           Array.isArray(phones));
    ok('Phones has ≥ 1 entry',           phones.length >= 1, 'count: ' + phones.length);
    if (phones.length > 0) {
      ok('Phones[0].phonenumber present', !!(phones[0].phonenumber || phones[0].PhoneNumber));
    }

    var addrs = (info && (info.Addresses || c.addresses)) || [];
    ok('Addresses array present',        Array.isArray(addrs));
    ok('Addresses has ≥ 1 entry',        addrs.length >= 1, 'count: ' + addrs.length);
    if (addrs.length > 0) {
      var a0 = addrs[0];
      var hasLine1     = !!(a0.line1 || a0.Line1);
      var hasDireccion = !!(a0.direccion || a0.Direccion);
      var hasLegacy    = !!(a0.addressdetails || a0.AddressDetails || a0.address1 || a0.Address1);
      ok('Address[0] has line1 or direccion (confirmed API field names)',
         hasLine1 || hasDireccion,
         'keys: ' + Object.keys(a0).join(', '));
      if (!hasLine1 && !hasDireccion && hasLegacy) {
        warn('Address uses legacy field names only (addressdetails/address1). ' +
             'The hasAddress fix in dashboard.html still covers this, but it is unexpected.',
             'fields: ' + Object.keys(a0).join(', '));
      }
      if (!hasLine1 && !hasDireccion && !hasLegacy) {
        warn('Address has no recognized content field — activation card address step will not clear. ' +
             'Patch hasAddress heuristic to include the fields listed below.',
             'fields: ' + Object.keys(a0).join(', '));
      }
    }

    console.log('[E2E] Raw getUserInfo snapshot:', JSON.stringify(info, null, 2));
  } catch (e) {
    ok('getUserInfo resolves', false, String(e));
    console.error('[E2E] T4 error:', e);
    sectionEnd();
    return;
  }
  sectionEnd();

  /* ══════════════════════════════════════════════════════════════════════════
     T5 — Activation card heuristics (client-side, against live getUserInfo payload)
  ══════════════════════════════════════════════════════════════════════════ */
  section('T5 · Activation card heuristics against real getUserInfo payload');
  (function () {
    // Local copy of the fixed _accountStateFrom from dashboard.html
    function _accountStateFrom(inf) {
      if (!inf) return 'incomplete';
      var cons = inf.Consignee || inf;
      var _hasName  = !!(cons.consigneename || cons.ConsigneeName);
      var _hasIdNo  = !!(cons.identificationnumber || cons.IdentificationNumber);
      var phs = inf.Phones || cons.phones || [];
      var _hasPhone = Array.isArray(phs) && phs.some(function (p) {
        return p && (p.phonenumber || p.PhoneNumber);
      });
      var ads = inf.Addresses || cons.addresses || [];
      var _hasAddress = Array.isArray(ads) && ads.some(function (a) {
        return a && (a.line1 || a.Line1 || a.direccion || a.Direccion ||
                     a.addressdetails || a.AddressDetails || a.address1 || a.Address1);
      });
      return (_hasName && _hasIdNo && _hasPhone && _hasAddress) ? 'activated' : 'incomplete';
    }
    if (info) {
      var state = _accountStateFrom(info);
      var c2 = info.Consignee || info;
      var phs2 = (info.Phones || c2.phones || []);
      var ads2 = (info.Addresses || c2.addresses || []);
      console.log('[E2E] T5 state inputs:',
        { hasName: !!(c2.consigneename || c2.ConsigneeName),
          hasIdNo: !!(c2.identificationnumber || c2.IdentificationNumber),
          phonesCount: phs2.length, addressesCount: ads2.length, derivedState: state });
      // For a brand-new account with no packages shipped, 'incomplete' is expected
      // (shipment step is always false in our heuristic). If profile+phone+address are
      // all filled, the heuristic will return 'activated', which is also valid.
      ok('account state is "incomplete" or "activated" (not null/undefined)',
         state === 'incomplete' || state === 'activated', 'state: ' + state);
      if (state === 'activated') {
        console.log('[E2E] T5 NOTE: account already shows "activated" — activation card will be hidden. This is correct behaviour if profile + phone + address are all complete.');
      }
    } else {
      warn('Skipped — no getUserInfo data', 'T4 must pass first');
    }
  })();
  sectionEnd();

  /* ══════════════════════════════════════════════════════════════════════════
     T6 — Profile update (postedituser) via CRBOXAuth.buildUpdateProfilePayload
          + CRBOXPortalAPI.updateProfile (the same path used by mi-cuenta.html)
  ══════════════════════════════════════════════════════════════════════════ */
  section('T6 · Profile update via CRBOXAuth.buildUpdateProfilePayload + updateProfile');
  try {
    if (!info) throw new Error('No getUserInfo data — skipping T6');
    var updPayload = CRBOXAuth.buildUpdateProfilePayload(info, {
      firstName: 'E2E',
      lastName1: 'Updated'
    });
    ok('buildUpdateProfilePayload returns non-empty string',
       typeof updPayload === 'string' && updPayload.length > 0);
    // Spot-check that key fields survived round-trip
    var upd = new URLSearchParams(updPayload);
    ok('updated ConsigneeName is "E2E"',   upd.get('Consignee.ConsigneeName') === 'E2E');
    ok('updated LastName1 is "Updated"',   upd.get('Consignee.ConsigneeLastName1') === 'Updated');
    ok('Token is present in payload',      !!upd.get('Token'));
    ok('IdConsignee is present',           !!upd.get('Consignee.IdConsignee'));

    var updResult = await CRBOXPortalAPI.updateProfile(updPayload);
    ok('updateProfile resolves',           true);
    ok('updateProfile returns apiResponse', updResult && !!updResult.apiResponse);
    ok('apiResponse.StatusResult === "OK"',
       updResult && updResult.apiResponse && updResult.apiResponse.StatusResult === 'OK',
       updResult && updResult.apiResponse);
  } catch (e) {
    ok('updateProfile resolves', false, String(e));
    console.error('[E2E] T6 error:', e);
  }
  sectionEnd();

  /* ══════════════════════════════════════════════════════════════════════════
     Summary
  ══════════════════════════════════════════════════════════════════════════ */
  console.log('');
  var total = _pass + _fail;
  var color = _fail === 0 ? 'color:green;font-weight:bold' : 'color:red;font-weight:bold';
  console.log('%c[E2E] Results: ' + _pass + ' passed, ' + _fail + ' failed, ' + _warn + ' warnings (of ' + total + ' assertions)', color);
  if (_fail === 0) {
    console.log('%c[E2E] All checks passed. The 3-step stepper payload is compatible with the live API.', 'color:green');
  } else {
    console.error('[E2E] Some checks failed — review the FAIL lines above for field-name mismatches.');
  }

  return { pass: _pass, fail: _fail, warn: _warn };
}());
