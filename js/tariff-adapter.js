/**
 * tariff-adapter.js
 * Single source-of-truth for all tax/duty rate lookups.
 *
 * Reads category/rate data from PRODUCT_CATEGORIES (product-categories.js).
 * product-categories.js MUST be loaded before this file on every page.
 *
 * Each lookup returns { rate: Number|null, source: String, pct: String|null, message?: String }
 * where source is one of:
 *   "local_estimated"       — rates derived from local reference data (default)
 *   "official_tica"         — rate obtained from the Costa Rica DGA/TICA system
 *   "user_override"         — rate manually entered or overridden by the user
 *   "manual_review_required"— category has no numeric rate; requires manual CRBOX quote
 *                             (rate and pct are null; message contains the customer-facing text)
 *
 * To swap in official TICA data later, populate the OFFICIAL_RATES map and
 * set source to "official_tica". No UI changes are required.
 */

const TARIFF_ADAPTER = (function () {

  // ── Build rate lookup from PRODUCT_CATEGORIES ────────────────────────────
  // product-categories.js must be loaded first. The guard below is a
  // safety net only — the normal path always loads the module in order.
  var _rateMap = {};
  // Set of category codes that have no numeric rate and require manual quoting.
  // When a lookup hits one of these, we return a signal instead of silently
  // applying the 29.95% "otros" fallback, which would mislead the user.
  var _manualReviewCodes = {};

  if (typeof PRODUCT_CATEGORIES !== 'undefined' && Array.isArray(PRODUCT_CATEGORIES)) {
    PRODUCT_CATEGORIES.forEach(function (cat) {
      if (!cat.code) return;
      if (typeof cat.totalEstimatedRate === 'number') {
        _rateMap[cat.code] = cat.totalEstimatedRate;
      } else if (cat.requiresPermit || cat.needsReview) {
        // null rate + regulated flag → needs manual review
        _manualReviewCodes[cat.code] = true;
      }
    });
  } else {
    console.error(
      '[CRBOX] tariff-adapter: PRODUCT_CATEGORIES is not defined. ' +
      'Ensure product-categories.js is loaded before tariff-adapter.js. ' +
      'Using minimal fallback rates.'
    );
    // Minimal fallback so the page does not crash entirely.
    _rateMap = {
      celulares: 0.14, computadora: 0.14, tableta_electronica: 0.14,
      ropa: 0.2995, zapatos: 0.2995, electrodomesticos: 0.4927,
      televisor: 0.4927, vehiculos: 0.43, salud_belleza: 0.2995,
      suplementos: 0.13, libros: 0.01, otros: 0.2995,
    };
  }

  /**
   * Placeholder for official TICA rates.
   * When integration with TICA/DGA is ready, populate this map with entries
   * keyed by the same codes as PRODUCT_CATEGORIES and set source = "official_tica".
   */
  const OFFICIAL_RATES = {};

  /**
   * Get the tariff rate for a given category code.
   *
   * @param {string} categoryCode - The category key (e.g. "celulares")
   * @param {string|null} [userOverrideRate] - Optional user-supplied rate (0–1)
   * @returns {{ rate: number, source: "local_estimated"|"official_tica"|"user_override", pct: string }}
   */
  function getTariffRate(categoryCode, userOverrideRate) {
    if (userOverrideRate !== undefined && userOverrideRate !== null) {
      const r = parseFloat(userOverrideRate);
      if (!isNaN(r) && r >= 0) {
        return { rate: r, source: 'user_override', pct: (r * 100).toFixed(2) + '%' };
      }
    }

    if (OFFICIAL_RATES[categoryCode] !== undefined) {
      const r = OFFICIAL_RATES[categoryCode];
      return { rate: r, source: 'official_tica', pct: (r * 100).toFixed(2) + '%' };
    }

    // If this code is flagged as requiring manual review and has no rate,
    // return a special signal instead of silently applying the otros fallback.
    if (_rateMap[categoryCode] === undefined && _manualReviewCodes[categoryCode]) {
      return { rate: null, source: 'manual_review_required', pct: null,
               message: 'Este producto requiere cotización manual. Contáctenos para un estimado.' };
    }
    const fallback = _rateMap['otros'] !== undefined ? _rateMap['otros'] : 0.2995;
    const r = _rateMap[categoryCode] !== undefined ? _rateMap[categoryCode] : fallback;
    return { rate: r, source: 'local_estimated', pct: (r * 100).toFixed(2) + '%' };
  }

  /**
   * Returns all category codes available in the current rate table.
   * @returns {string[]}
   */
  function getCategoryCodes() {
    return Object.keys(_rateMap);
  }

  /**
   * Returns true if the category requires manual quoting (no numeric rate).
   * @param {string} categoryCode
   * @returns {boolean}
   */
  function requiresManualReview(categoryCode) {
    return !!_manualReviewCodes[categoryCode];
  }

  return { getTariffRate, getCategoryCodes, requiresManualReview };
})();
