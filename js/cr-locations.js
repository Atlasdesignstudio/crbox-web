// cr-locations.js — INEC numeric code helpers for Costa Rica addresses
// Used by auth.js and afiliate.html to build the Addresses payload for the
// CRBOX registration API, which requires INEC province/canton/district codes.
//
// API routing:
// auth.js sends all login/register/update requests through same-origin proxy
// endpoints defined in server.py (/api/auth/*) which forward to the CRBOX
// backend — no direct cross-origin fetch from the browser.

(function (global) {
  'use strict';

  // ─── Province codes (INEC standard) ──────────────────────────────────────────
  var PROVINCE_CODES = {
    san_jose:   '1',
    alajuela:   '2',
    cartago:    '3',
    heredia:    '4',
    guanacaste: '5',
    puntarenas: '6',
    limon:      '7'
  };

  // ─── Canton order per province (normalized keys, 1-indexed INEC position) ────
  // Order matches the official INEC canton numbering within each province.
  // Keys are lower-case ASCII (accents stripped, spaces → underscore).
  var CANTON_ORDER = {
    san_jose: [
      'central', 'escazu', 'desamparados', 'puriscal', 'tarrazu',
      'aserri', 'mora', 'goicoechea', 'santa_ana', 'alajuelita',
      'vazquez_de_coronado', 'tibas', 'moravia', 'montes_de_oca',
      'turrubares', 'dota', 'curridabat', 'perez_zeledon',
      'leon_cortes', 'acosta'
    ],
    alajuela: [
      'central', 'san_ramon', 'grecia', 'san_mateo', 'atenas',
      'naranjo', 'palmares', 'poas', 'orotina', 'san_carlos',
      'zarcero', 'sarchi', 'upala', 'los_chiles', 'guatuso',
      'rio_cuarto'
    ],
    cartago: [
      'central', 'paraiso', 'la_union', 'jimenez', 'turrialba',
      'alvarado', 'oreamuno', 'el_guarco'
    ],
    heredia: [
      'central', 'barva', 'santo_domingo', 'santa_barbara',
      'san_rafael', 'san_isidro', 'belen', 'flores',
      'san_pablo', 'sarapiqui'
    ],
    guanacaste: [
      'liberia', 'nicoya', 'santa_cruz', 'bagaces', 'carrillo',
      'canas', 'abangares', 'tilaran', 'nandayure', 'la_cruz',
      'hojancha'
    ],
    puntarenas: [
      'central', 'esparza', 'buenos_aires', 'montes_de_oro',
      'osa', 'quepos', 'golfito', 'coto_brus', 'parrita',
      'corredores', 'garabito'
    ],
    limon: [
      'central', 'pococi', 'siquirres', 'talamanca',
      'matina', 'guacimo'
    ]
  };

  // ─── Phone type mapping (form value → API object) ────────────────────────────
  // Derived from the confirmed Postman sample: idphonetype 1 = "Celular".
  // Other types are educated guesses; backend should confirm.
  var PHONE_TYPES = {
    movil:   { idphonetype: 1, type: 'Celular' },
    casa:    { idphonetype: 2, type: 'Casa' },
    oficina: { idphonetype: 3, type: 'Oficina' },
    otro:    { idphonetype: 4, type: 'Otro' }
  };

  // ─── Address type mapping (form value → API object) ──────────────────────────
  // Derived from the confirmed Postman sample: idaddresstype 1 = "Casa".
  var ADDRESS_TYPES = {
    casa:    { idaddresstype: 1, type: 'Casa' },
    oficina: { idaddresstype: 2, type: 'Oficina' },
    otro:    { idaddresstype: 3, type: 'Otro' }
  };

  // ─── Identification type mapping ─────────────────────────────────────────────
  // Confirmed from Postman: "Cedula ó Residencia" is the backend string for cedula.
  // "Juridica" is the backend string for Costa Rican company cédula jurídica.
  // DIMEX and Pasaporte values are educated guesses — validate with backend.
  var ID_TYPES = {
    nacional:  'Cedula ó Residencia',
    dimex:     'DIMEX',
    pasaporte: 'Pasaporte',
    juridica:  'Juridica'
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  // Normalize a string to a lowercase ASCII key (strips accents, replaces spaces).
  function normalizeKey(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
  }

  // Returns the INEC province code string ("1"–"7"), or null if unknown.
  function getProvinceCode(provinceValue) {
    var key = normalizeKey(provinceValue);
    return PROVINCE_CODES[key] || null;
  }

  // Returns the 1-indexed INEC canton position within its province as a string,
  // or null if the canton is not found.
  function getCantonIndex(provinceValue, cantonValue) {
    var pKey = normalizeKey(provinceValue);
    var cKey = normalizeKey(cantonValue);
    var list = CANTON_ORDER[pKey];
    if (!list) return null;
    var idx = list.indexOf(cKey);
    return idx === -1 ? null : String(idx + 1);
  }

  // Returns the 1-indexed district position within its canton as a string.
  // districtList must be the districts array from the locationDatabase object
  // (array of {value, label} objects already loaded on the page).
  // Returns "0" if not found (barrio default).
  function getDistrictIndex(districtList, districtValue) {
    if (!districtList || !districtValue) return '0';
    var key = normalizeKey(districtValue);
    for (var i = 0; i < districtList.length; i++) {
      if (normalizeKey(districtList[i].value) === key) {
        return String(i + 1);
      }
    }
    return '0';
  }

  // Returns the phone type API object, or a safe default.
  function getPhoneType(formValue) {
    return PHONE_TYPES[formValue] || { idphonetype: 1, type: 'Celular' };
  }

  // Returns the address type API object, or a safe default.
  function getAddressType(formValue) {
    return ADDRESS_TYPES[formValue] || { idaddresstype: 1, type: 'Casa' };
  }

  // Returns the backend identification type string.
  function getIdentificationType(formValue) {
    return ID_TYPES[formValue] || 'Cedula ó Residencia';
  }

  // ─── Public API ──────────────────────────────────────────────────────────────
  global.CRLocations = {
    getProvinceCode:      getProvinceCode,
    getCantonIndex:       getCantonIndex,
    getDistrictIndex:     getDistrictIndex,
    getPhoneType:         getPhoneType,
    getAddressType:       getAddressType,
    getIdentificationType: getIdentificationType,
    normalizeKey:         normalizeKey
  };

}(window));
