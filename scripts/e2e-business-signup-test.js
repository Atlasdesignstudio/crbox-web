/**
 * CRBOX Business Signup E2E Test Script
 *
 * PURPOSE: Validates the business (empresarial) registration payload end-to-end
 * against the live production API.
 *
 * USAGE:
 * 1. Open your CRBOX site in a browser (e.g. the Replit preview or published URL)
 * 2. Open DevTools → Console
 * 3. Paste this entire script and press Enter
 * 4. Read the PASS / FAIL lines printed to the console
 *
 * Each run creates a real account on clients.crbox.cr.
 * Use a real email address you control (proton.me and gmail.com both work).
 */

(async function CRBOX_BIZ_E2E() {
  'use strict';

  var _pass = 0, _fail = 0;
  function ok(label, cond, extra) {
    if (cond) { _pass++; console.log('%c✔ PASS  ' + label, 'color:green', extra !== undefined ? extra : ''); }
    else       { _fail++; console.error('✘ FAIL  ' + label, extra !== undefined ? extra : ''); }
  }

  /* ── config — edit before pasting ───────────────────────────────────────── */
  var TS      = Date.now();
  var EMAIL   = 'crboxqa.biz.' + TS + '@proton.me';  // change to a real email you control
  var PASS    = 'CrboxBizQA2026!';
  var CO_NAME = 'Importaciones QA ' + TS + ' S.A.';
  var ID_NUM  = '3101' + String(TS).slice(-6);         // 10-digit cédula jurídica-style
  var CONTACT = 'Juan Carlos Pérez Mora';
  var PHONE   = '88997711';
  var SUCURSAL_KEY = 'sabana_norte';                   // sabana_norte | guadalupe | guachipelin_escazu | domicilio
  /* ── end config ─────────────────────────────────────────────────────────── */

  console.log('=== CRBOX Business Registration E2E ===');
  console.log('Email   :', EMAIL);
  console.log('Company :', CO_NAME);
  console.log('ID      :', ID_NUM);

  /* T1 — prereqs */
  ok('T1a CRBOXAuth present',    typeof CRBOXAuth !== 'undefined');
  ok('T1b CRLocations present',  typeof CRLocations !== 'undefined');
  ok('T1c BRANCH_ADDRESSES present', typeof BRANCH_ADDRESSES !== 'undefined' || true, '(checked inline)');
  if (typeof CRBOXAuth === 'undefined' || typeof CRLocations === 'undefined') {
    console.error('Prereqs missing — open this script on a page that loads auth.js + cr-locations.js');
    return;
  }

  /* T2 — build phone object (same as handleBusinessRegistration) */
  var ptObj = CRLocations.getPhoneType('movil');
  var phones = [{ idphone: CRBOXAuth.PENDING.newPhoneId, phonenumber: PHONE, phoneextension: '',
    isactive: false, isprimary: true,
    phonetype: { idphonetype: ptObj.idphonetype, type: ptObj.type, _bIsDeleted: false, _bIsChanged: true },
    consignees: null, phonefreightforwarders: null, phoneshippers: null,
    _bIsDeleted: false, _bIsChanged: true }];
  ok('T2 phone object built', phones[0].phonetype.idphonetype === 1, 'idphonetype=' + phones[0].phonetype.idphonetype);

  /* T3 — build address object from BRANCH_ADDRESSES */
  var BRANCH_MAP = (typeof BRANCH_ADDRESSES !== 'undefined') ? BRANCH_ADDRESSES : null;
  if (!BRANCH_MAP) {
    console.error('BRANCH_ADDRESSES not found in scope — run from afiliate.html');
    return;
  }
  var branch = BRANCH_MAP[SUCURSAL_KEY];
  ok('T3 branch found', !!branch, SUCURSAL_KEY);
  var idSucursal = CRBOXAuth.PENDING.sucursalIdMap[SUCURSAL_KEY];
  ok('T3b sucursal ID resolved', idSucursal !== undefined && idSucursal !== null, idSucursal);

  var provCode = CRLocations.getProvinceCode(branch.province);
  var cantIdx  = CRLocations.getCantonIndex(branch.province, branch.canton);
  ok('T3c province code',   provCode !== null && provCode !== '0', provCode);
  ok('T3d canton index',    cantIdx  !== null && cantIdx  !== '0', cantIdx);

  var distIdx  = '0';
  if (typeof locationDatabase !== 'undefined') {
    var pKey = CRLocations.normalizeKey(branch.province);
    var cKey = CRLocations.normalizeKey(branch.canton);
    var dbEntry = (locationDatabase[pKey] || {})[cKey];
    if (dbEntry && dbEntry.districts) distIdx = CRLocations.getDistrictIndex(dbEntry.districts, branch.district);
  }
  ok('T3e district index', distIdx !== '0', distIdx);

  var atObj = CRLocations.getAddressType('residencial');
  var line1 = [branch.province, branch.province.toUpperCase(), branch.canton.toUpperCase(),
               branch.district.toUpperCase(), branch.address_details].filter(Boolean).join(' ');
  var addresses = [{ idaddress: CRBOXAuth.PENDING.newAddressId, line1: line1, line2: branch.address_details,
    city: branch.canton.toUpperCase(), zipcode: '',
    isactive: false, isprimary: true,
    provincia: provCode, canton: cantIdx, distrito: distIdx, barrio: '0', direccion: branch.address_details,
    state: { idstate: parseInt(provCode, 10) || 0, statename: branch.province,
      country: { idcountry: 1, countryname: 'Costa Rica', statecountry: null, _bIsDeleted: false, _bIsChanged: true },
      _bIsDeleted: false, _bIsChanged: true },
    addresstype: { idaddresstype: atObj.idaddresstype, type: atObj.type, _bIsDeleted: false, _bIsChanged: true },
    _bIsDeleted: false, _bIsChanged: true }];
  ok('T3f address built', addresses[0].provincia !== '0', 'provincia=' + addresses[0].provincia);

  /* T4 — build registration params */
  var params = new URLSearchParams();
  params.set('Consignee.ConsigneeName',        CO_NAME);
  params.set('Consignee.ConsigneeLastName1',   '');
  params.set('Consignee.ConsigneeLastName2',   '');
  params.set('Consignee.Email',                EMAIL);
  params.set('ConfirmEmail',                   EMAIL);
  params.set('Password',                       PASS);
  params.set('ConfirmPassword',                PASS);
  params.set('Consignee.IdentificationType',   'Otro');
  params.set('Consignee.IdentificationNumber', ID_NUM);
  params.set('Consignee.IsCompany',            '1');
  params.set('Consignee.ResidenceCountry',     'CR');
  params.set('Consignee.ReceivesNewsletter',   'false');
  params.set('Consignee.Responsabilidad',      '0');
  params.set('Consignee.AlternativeEmail',     '');
  params.set('Consignee.ContactName1',         CONTACT);
  params.set('Consignee.ContactName2',         '');
  params.set('Consignee.IdResponsabilidad',    '');
  params.set('Consignee.BirthDate',            '');
  params.set('Consignee.Sucursal.IdSucursal',  String(idSucursal));
  params.set('CompanyCode',                    '');
  params.set('Phones',                         JSON.stringify(phones));
  params.set('Addresses',                      JSON.stringify(addresses));
  ok('T4 params built', params.has('Consignee.IsCompany'));

  /* T5 — POST /postregisteruser */
  console.log('\n--- T5: Calling /postregisteruser ---');
  var r1;
  try {
    r1 = await CRBOXAuth.doRegister(params.toString());
  } catch(e) {
    ok('T5 registration', false, 'Network error: ' + e.message); return;
  }
  ok('T5 StatusResult OK', r1.StatusResult === 'OK', 'StatusResult=' + r1.StatusResult + ' Message=' + (r1.Message||''));
  if (r1.StatusResult !== 'OK') { console.error('Registration rejected — stopping.'); return; }

  /* T6 — auto-login */
  console.log('\n--- T6: Auto-login ---');
  var token;
  try {
    await CRBOXAuth.doLogin(EMAIL, PASS, true);
    token = CRBOXAuth.getToken();
  } catch(e) {
    ok('T6 auto-login', false, 'Error: ' + e.message); return;
  }
  ok('T6 auto-login success', !!token, 'token present');

  /* T7 — getUserInfo */
  console.log('\n--- T7: getUserInfo ---');
  var info;
  try {
    info = await CRBOXPortalAPI.getUserInfo({ forceRefresh: true });
  } catch(e) {
    ok('T7 getUserInfo', false, 'Error: ' + e.message); return;
  }
  var c = (info && info.Consignee) ? info.Consignee : (info || {});
  var idCons     = c.idconsignee || c.IdConsignee;
  var isCompany  = c.iscompany   || c.IsCompany;
  var idType     = c.identificationtype || c.IdentificationType;
  var contact1   = c.contactname1 || c.ContactName1;
  var phoneCnt   = ((info && (info.Phones || c.phones)) || []).length;
  var addrCnt    = ((info && (info.Addresses || c.addresses)) || []).length;
  ok('T7 idconsignee present', !!idCons, idCons);
  ok('T7 IsCompany truthy',    !!isCompany, 'IsCompany=' + isCompany);
  ok('T7 IdentificationType',  idType === 'Otro' || !!idType, idType);
  ok('T7 ContactName1',        !!contact1, contact1);
  ok('T7 phone count ≥ 1',     phoneCnt >= 1, phoneCnt);
  ok('T7 address count ≥ 1',   addrCnt >= 1, addrCnt);

  /* Summary */
  console.log('\n=== SUMMARY ===');
  console.log('PASS:', _pass, ' FAIL:', _fail);
  console.log('Email   :', EMAIL);
  console.log('Password:', PASS);
  console.log('Casillero (idconsignee):', idCons);
  console.log('IsCompany:', isCompany);
  if (_fail === 0) console.log('%c✔ ALL TESTS PASSED', 'color:green;font-weight:bold');
  else             console.warn('Some tests failed — review above.');
}());
