/**
 * calculator-engine.js
 * Pure calculation engine for CRBOX air-freight shipment cost estimation.
 *
 * Exposes two functions:
 *   calcSinglePackage(item)      — cost for a single package shipment
 *   calcConsolidated(items[])    — cost when all items are consolidated
 *
 * NO formula or rate constants have been changed from the original calculator.
 * All inputs/outputs are documented below.
 */

const CALCULATOR_ENGINE = (function () {

  // ─── Freight rate table (air) ────────────────────────────────────────────
  // Source: CRBOX tariff table. Estimated, not a live government rate.
  /**
   * Returns the air-freight base cost (USD) for a given billable weight (kg).
   * @param {number} kg
   * @returns {number} freight cost in USD
   */
  function airFreightCost(kg) {
    if (kg <= 0.5) return 5;
    if (kg <= 1)   return 7;
    if (kg <= 2)   return 11;
    if (kg <= 3)   return 15;
    if (kg <= 4)   return 19;
    if (kg <= 5)   return 23;
    if (kg <= 6)   return 27;
    if (kg <= 7)   return 32;
    if (kg <= 8)   return 36;
    if (kg <= 9)   return 40;
    if (kg <= 10)  return 44;
    if (kg <= 11)  return 48;
    if (kg <= 12)  return 52;
    if (kg <= 13)  return 56;
    if (kg <= 14)  return 60;
    if (kg <= 15)  return 64;
    if (kg <= 16)  return 68;
    if (kg <= 17)  return 72;
    if (kg <= 18)  return 76;
    if (kg <= 19)  return 80;
    if (kg <= 20)  return 84;
    if (kg <= 100) return 84 + (kg - 20) * 3;
    return 84 + (100 - 20) * 3 + (kg - 100) * 2.3;
  }

  // ─── Handling tiers ─────────────────────────────────────────────────────
  /**
   * Returns the handling fee (USD) based on declared purchase value.
   * Source: CRBOX tariff table. Estimated.
   * @param {number} purchaseValue  — declared value in USD
   * @returns {number}
   */
  function handlingCost(purchaseValue) {
    if (purchaseValue < 20)    return 1.5;
    if (purchaseValue < 30)    return 3.5;
    if (purchaseValue < 50)    return 5.5;
    if (purchaseValue < 100)   return 7;
    if (purchaseValue < 200)   return 14;
    if (purchaseValue < 250)   return 25;
    if (purchaseValue < 500)   return 35;
    if (purchaseValue < 1000)  return 45;
    if (purchaseValue < 2500)  return 100;
    if (purchaseValue < 5000)  return 125;
    if (purchaseValue < 10000) return 150;
    if (purchaseValue < 15000) return 175;
    return purchaseValue * 0.005;
  }

  // ─── Delivery cost ───────────────────────────────────────────────────────
  /**
   * Returns the last-mile delivery fee (USD) based on destination zone and weight.
   * Source: CRBOX tariff table. Estimated.
   * @param {string} destination  — zone key
   * @param {number} kg           — billable weight
   * @returns {number}
   */
  function deliveryCost(destination, kg) {
    const zone = ['sanjose', 'heredia', 'alajuela'].includes(destination) ? 'central'
      : destination === 'cartago' ? 'cartago'
      : 'remote';

    if (zone === 'central') {
      if (kg <= 10)  return 5;
      if (kg <= 20)  return 7;
      if (kg <= 50)  return 12;
      return 15;
    }
    if (zone === 'cartago') {
      if (kg <= 10)  return 10;
      if (kg <= 20)  return 15;
      if (kg <= 50)  return 18;
      return 20;
    }
    // remote
    if (kg <= 10)  return 15;
    if (kg <= 20)  return 20;
    if (kg <= 50)  return 25;
    return 30;
  }

  // ─── Volumetric weight ───────────────────────────────────────────────────
  /**
   * Calculates volumetric weight from box dimensions.
   * Formula: (L × W × H cm) / 6000
   * @param {number} l  length cm
   * @param {number} w  width cm
   * @param {number} h  height cm
   * @returns {number} volumetric weight kg (0 if dimensions not provided)
   */
  function volumetricWeight(l, w, h) {
    if (l > 0 && w > 0 && h > 0) return (l * w * h) / 6000;
    return 0;
  }

  // ─── Core cost breakdown ─────────────────────────────────────────────────
  /**
   * Build cost breakdown for a given billable weight, total declared value,
   * tax rate, and destination.
   *
   * @param {number} billableKg       — the weight used for freight cost
   * @param {number} realKg           — sum of real weights
   * @param {number} volKg            — sum of volumetric weights
   * @param {number} totalValue       — total declared purchase value (USD)
   * @param {number} taxRate          — composite customs rate (0–1)
   * @param {string} destination      — destination zone key
   * @param {string} tariffSource     — provenance of tax rate
   * @returns {object} cost breakdown
   */
  function buildBreakdown(billableKg, realKg, volKg, totalValue, taxRate, destination, tariffSource) {
    const freight    = airFreightCost(billableKg);
    const fuel       = freight * 0.19;                 // 19% fuel surcharge on freight
    const handling   = handlingCost(totalValue);
    const cif        = totalValue + freight;            // CIF = purchase value + freight
    const taxes      = cif * taxRate;                  // customs duties on CIF
    const insurance  = Math.ceil(totalValue / 100);    // $1 per $100 declared value
    const delivery   = deliveryCost(destination, billableKg);
    const total      = freight + fuel + handling + taxes + insurance + delivery;
    const weightMode = billableKg === volKg ? 'volumetrico' : 'real';

    return {
      freight,
      fuel,
      handling,
      cif,
      taxes,
      insurance,
      delivery,
      total,
      billableKg,
      realKg,
      volKg,
      weightMode,
      taxRate,
      tariffSource
    };
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Calculate cost for a single-package shipment (separate, not consolidated).
   *
   * @param {object} item
   * @param {string}  item.name         — product name (for labeling)
   * @param {number}  item.value        — declared value USD
   * @param {number}  item.weight       — real weight kg
   * @param {number}  [item.length]     — length cm (for volumetric)
   * @param {number}  [item.width]      — width cm
   * @param {number}  [item.height]     — height cm
   * @param {string}  item.category     — category code for tax lookup
   * @param {string}  item.destination  — destination zone key
   * @returns {object} full cost breakdown (see buildBreakdown)
   */
  // ── Privacy-safe value bucket helpers ──────────────────────────────────────
  function _weightBucket(kg) {
    if (kg < 1)   return 'lt_1kg';
    if (kg < 5)   return '1_5kg';
    if (kg < 15)  return '5_15kg';
    if (kg < 30)  return '15_30kg';
    return 'gt_30kg';
  }

  function _valueBucket(usd) {
    if (usd < 25)   return 'lt_25';
    if (usd < 100)  return '25_100';
    if (usd < 500)  return '100_500';
    if (usd < 1000) return '500_1000';
    return 'gt_1000';
  }

  // Flag: set to true inside calcSeparate to prevent per-item events
  var _suppressNextAnalytics = false;

  function _fireCalculatorResult(breakdown, mode) {
    if (_suppressNextAnalytics) return;
    if (window.CRBOX && CRBOX.track) {
      try {
        CRBOX.track.calculator_result({
          mode:               mode || 'aereo',
          weight_bucket:      _weightBucket(breakdown.billableKg),
          value_bucket:       _valueBucket(breakdown.total || 0),
          // All CRBOX destinations are within Costa Rica — zone keys are internal
          destination_country: 'CR',
          total_usd:          Math.round((breakdown.total || 0) * 100) / 100,
          shipping_usd:       Math.round(((breakdown.freight || 0) + (breakdown.fuel || 0)) * 100) / 100,
          handling_usd:       Math.round((breakdown.handling || 0) * 100) / 100,
          taxes_usd:          Math.round((breakdown.taxes || 0) * 100) / 100
        });
      } catch (e) {}
    }
  }

  function calcSinglePackage(item) {
    const realKg = parseFloat(item.weight) || 0;
    const l = parseFloat(item.length) || 0;
    const w = parseFloat(item.width)  || 0;
    const h = parseFloat(item.height) || 0;
    const volKg = volumetricWeight(l, w, h);
    const billableKg = Math.max(realKg, volKg);
    const totalValue = parseFloat(item.value) || 0;
    const tariff = (typeof TARIFF_ADAPTER !== 'undefined')
      ? TARIFF_ADAPTER.getTariffRate(item.category)
      : { rate: 0.2995, source: 'local_estimated' };

    const breakdown = buildBreakdown(billableKg, realKg, volKg, totalValue, tariff.rate, item.destination, tariff.source);
    breakdown.destination = item.destination;
    _fireCalculatorResult(breakdown, 'aereo');
    return breakdown;
  }

  /**
   * Calculate cost for all items shipped SEPARATELY (sum of individual quotes).
   *
   * @param {object[]} items  — array of item objects (same shape as calcSinglePackage input)
   * @param {string}   destination
   * @returns {{ items: object[], subtotals: object[], total: number, grandTotal: number }}
   */
  function calcSeparate(items, destination) {
    // Suppress per-item analytics — caller fires a single aggregate event if needed
    _suppressNextAnalytics = true;
    const results = items.map(item => ({
      name: item.name,
      category: item.category || 'otros',
      ...calcSinglePackage({ ...item, destination })
    }));
    _suppressNextAnalytics = false;
    const grandTotal = results.reduce((s, r) => s + r.total, 0);
    return { results, grandTotal };
  }

  /**
   * Calculate cost for all items CONSOLIDATED into a single shipment.
   * Consolidated rule: max(sum of real weights, sum of volumetric weights)
   *
   * @param {object[]} items
   * @param {string}   destination
   * @param {string}   [categoryCode]  — primary category for consolidated tariff lookup
   *                                     defaults to the first item's category
   * @returns {object} cost breakdown + per-item weight info
   */
  function calcConsolidated(items, destination) {
    let sumReal = 0;
    let sumVol  = 0;
    let sumValue = 0;
    const itemBillables = [];

    items.forEach(item => {
      const realKg = parseFloat(item.weight) || 0;
      const l = parseFloat(item.length) || 0;
      const w = parseFloat(item.width)  || 0;
      const h = parseFloat(item.height) || 0;
      const volKg = volumetricWeight(l, w, h);
      const billable = Math.max(realKg, volKg);
      sumReal  += realKg;
      sumVol   += volKg;
      sumValue += parseFloat(item.value) || 0;
      itemBillables.push({ item, billable, realKg, volKg });
    });

    const billableKg = Math.max(sumReal, sumVol);
    const freight = airFreightCost(billableKg);

    // Determine the dominant weight axis (the one that won the max comparison).
    // Allocate freight proportionally along that axis so portions always sum to freight.
    const dominantSum = sumReal >= sumVol ? sumReal : sumVol;

    // Per-item taxes: each item's proportional CIF × its own tariff rate.
    // This handles mixed-category carts correctly.
    let sumTaxes = 0;
    let allSameSource = true;
    let firstSource = null;
    itemBillables.forEach(({ item, realKg, volKg }) => {
      const tariff = (typeof TARIFF_ADAPTER !== 'undefined')
        ? TARIFF_ADAPTER.getTariffRate(item.category)
        : { rate: 0.2995, source: 'local_estimated' };
      // Use the dominant axis weight for this item to compute its freight share
      const itemAxisKg = sumReal >= sumVol ? realKg : volKg;
      const freightPortion = dominantSum > 0 ? (itemAxisKg / dominantSum) * freight : 0;
      const itemCif = (parseFloat(item.value) || 0) + freightPortion;
      sumTaxes += itemCif * tariff.rate;
      if (!firstSource) firstSource = tariff.source;
      else if (tariff.source !== firstSource) allSameSource = false;
    });
    const tariffSource = allSameSource ? (firstSource || 'local_estimated') : 'local_estimated';

    // Build breakdown with pre-computed taxes (pass null tariffRate to signal override)
    const breakdown = buildBreakdown(billableKg, sumReal, sumVol, sumValue, 0, destination, tariffSource);
    breakdown.taxes = sumTaxes;
    breakdown.total = breakdown.freight + breakdown.fuel + breakdown.handling + sumTaxes + breakdown.insurance + breakdown.delivery;
    breakdown.taxRate = null; // mixed rates; display handled in UI
    breakdown.destination = destination;
    _fireCalculatorResult(breakdown, 'aereo');
    return breakdown;
  }

  return { calcSinglePackage, calcSeparate, calcConsolidated, airFreightCost, handlingCost, deliveryCost, volumetricWeight };
})();
