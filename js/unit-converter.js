// unit-converter.js — CRBOX shared unit conversion utilities
// Exposes window.UnitConverter
(function () {
  'use strict';

  function convertInToCm(val) {
    var v = parseFloat(val);
    return isNaN(v) ? 0 : +(v * 2.54).toFixed(2);
  }

  function convertCmToIn(val) {
    var v = parseFloat(val);
    return isNaN(v) ? 0 : +(v / 2.54).toFixed(2);
  }

  function convertLbToKg(val) {
    var v = parseFloat(val);
    return isNaN(v) ? 0 : +(v * 0.45359237).toFixed(3);
  }

  function convertKgToLb(val) {
    var v = parseFloat(val);
    return isNaN(v) ? 0 : +(v / 0.45359237).toFixed(3);
  }

  // Convert a displayed value from `unit` to canonical storage unit (kg or cm).
  // unitType: 'weight' → canonical kg; 'dim' → canonical cm
  // Returns null when val is empty/zero/negative.
  function toCanonical(val, unitType, unit) {
    var v = parseFloat(val);
    if (isNaN(v) || v <= 0) return null;
    if (unitType === 'weight') {
      return unit === 'lb' ? convertLbToKg(v) : v;
    }
    if (unitType === 'dim') {
      return unit === 'in' ? convertInToCm(v) : v;
    }
    return v;
  }

  // Convert from canonical (kg/cm) to a display unit. Returns '' for empty/zero.
  function fromCanonical(val, unitType, unit) {
    var v = parseFloat(val);
    if (isNaN(v) || v <= 0) return '';
    if (unitType === 'weight') {
      return unit === 'lb' ? String(convertKgToLb(v)) : String(v);
    }
    if (unitType === 'dim') {
      return unit === 'in' ? String(convertCmToIn(v)) : String(v);
    }
    return String(v);
  }

  // Normalize all physical inputs to canonical units in one call.
  //
  // opts.length, opts.width, opts.height  — raw display strings (cm or in)
  // opts.weight                           — raw display string (kg or lb)
  // opts.dimensionUnit                    — 'cm' | 'in'
  // opts.weightUnit                       — 'kg' | 'lb'
  //
  // Returns:
  //   length_cm, width_cm, height_cm, weight_kg  — canonical numbers (null when blank)
  //   length_input, width_input, height_input, weight_input — original display strings
  //   dimension_unit, weight_unit  — the unit that was active
  function normalizePhysicalInputs(opts) {
    var dimUnit = opts.dimensionUnit || 'cm';
    var wgtUnit = opts.weightUnit    || 'kg';

    var lengthRaw  = opts.length  != null ? String(opts.length)  : '';
    var widthRaw   = opts.width   != null ? String(opts.width)   : '';
    var heightRaw  = opts.height  != null ? String(opts.height)  : '';
    var weightRaw  = opts.weight  != null ? String(opts.weight)  : '';

    return {
      length_cm:      toCanonical(lengthRaw,  'dim',    dimUnit),
      width_cm:       toCanonical(widthRaw,   'dim',    dimUnit),
      height_cm:      toCanonical(heightRaw,  'dim',    dimUnit),
      weight_kg:      toCanonical(weightRaw,  'weight', wgtUnit),
      length_input:   lengthRaw,
      width_input:    widthRaw,
      height_input:   heightRaw,
      weight_input:   weightRaw,
      dimension_unit: dimUnit,
      weight_unit:    wgtUnit,
    };
  }

  // Wire up a unit toggle container.
  //
  // opts.container  {HTMLElement}  wrapping element with [data-unit] children
  // opts.inputs     {Array}        [{ el: HTMLInputElement }] — all share the same unitType
  // opts.unitType   {'weight'|'dim'}  determines conversion direction
  // opts.onChange   {Function}     optional callback(newUnit)
  //
  // Returns { getUnit(), setUnit(unit) }
  function setupUnitToggle(opts) {
    var container = opts.container;
    var inputs    = opts.inputs    || [];
    var unitType  = opts.unitType  || 'weight';
    var onChange  = opts.onChange  || null;

    var activeBtn = container.querySelector('.unit-btn-active');
    var currentUnit = activeBtn
      ? activeBtn.getAttribute('data-unit')
      : (container.querySelector('[data-unit]')
          ? container.querySelector('[data-unit]').getAttribute('data-unit')
          : (unitType === 'weight' ? 'kg' : 'cm'));

    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-unit]');
      if (!btn || !container.contains(btn)) return;
      var newUnit = btn.getAttribute('data-unit');
      if (newUnit === currentUnit) return;

      // Convert existing values before switching unit label
      inputs.forEach(function (inp) {
        var el = inp.el;
        if (!el) return;
        var v = parseFloat(el.value);
        if (!isNaN(v) && v > 0) {
          var canonical = toCanonical(v, unitType, currentUnit);
          if (canonical !== null) {
            el.value = fromCanonical(canonical, unitType, newUnit);
          }
        }
      });

      currentUnit = newUnit;

      container.querySelectorAll('[data-unit]').forEach(function (b) {
        var active = b.getAttribute('data-unit') === newUnit;
        b.classList.toggle('unit-btn-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      if (onChange) onChange(newUnit);
    });

    return {
      getUnit: function () { return currentUnit; },
      setUnit: function (unit) {
        var btn = container.querySelector('[data-unit="' + unit + '"]');
        if (btn && unit !== currentUnit) btn.click();
      }
    };
  }

  window.UnitConverter = {
    convertInToCm:           convertInToCm,
    convertCmToIn:           convertCmToIn,
    convertLbToKg:           convertLbToKg,
    convertKgToLb:           convertKgToLb,
    toCanonical:             toCanonical,
    fromCanonical:           fromCanonical,
    normalizePhysicalInputs: normalizePhysicalInputs,
    setup:                   setupUnitToggle,
  };
})();
