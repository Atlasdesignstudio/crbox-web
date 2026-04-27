# Costa Rica Official Tariff Integration — Research & Architecture

**Status:** Architecture prepared. Live integration not yet wired.  
**Last reviewed:** April 2026

---

## 1. The TICA System

**TICA** (Tecnología de Información para el Control Aduanero) is the electronic customs management system operated by the **Dirección General de Aduanas (DGA)** of the **Ministerio de Hacienda** of Costa Rica.

TICA manages all import/export declarations, tariff classifications (SA codes), duty rates, and tax collection for goods entering Costa Rica. It is the single authoritative source for customs tariff data in the country.

---

## 2. Public Access Points

### 2.1 Arancel Consultation (hacienda.go.cr)

The Ministerio de Hacienda publishes a publicly accessible tariff consultation tool at:

```
https://www.hacienda.go.cr/contenido/13170-consulta-de-arancel
```

This allows lookup of:
- HS/SA tariff codes (8-digit Costa Rican subheadings)
- Arancel de Aduanas (customs duty percentage)
- IVA (13% VAT applied to CIF + customs duty)
- Selective consumption taxes (Impuesto Selectivo de Consumo, ISC) where applicable
- Specific levies (e.g. for vehicles, alcoholic beverages, fuels)

**Access:** Public, no registration required. Browser-based form only.

### 2.2 VUCE (Ventanilla Única de Comercio Exterior)

```
https://www.vuce.go.cr/
```

VUCE is the single window for trade permits and import licenses. It requires business registration and is not relevant to consumer-facing rate lookups.

### 2.3 TICA Direct API

There is **no publicly documented REST API** for TICA as of April 2026. Direct API access requires:
- Formal registration with DGA as a customs agent or authorized third party
- Written request to DGA for system-to-system integration
- Compliance with DGA's technical security requirements

**Recommendation:** Do not attempt direct TICA API integration without DGA authorization. Use the periodic import approach described in Section 4.

---

## 3. Rate Structure for Consumer Courier Goods

For the categories handled by CRBOX (consumer electronics, clothing, accessories, automotive parts, etc.), the effective tax burden on a CIF value is composed of:

| Component | Rate | Notes |
|---|---|---|
| Arancel (customs duty) | 0%–45% | Varies by HS code |
| IVA (VAT) | 13% | Applied to CIF + customs duty |
| ISC (selective consumption) | 0%–100%+ | Only on specific goods (audio/video, refrigerators, etc.) |
| Specific duties | Fixed amounts | Rare for courier goods |

The `local_estimated` rates in `js/tariff-adapter.js` are **composite effective rates** that approximate the combined burden (arancel + IVA + ISC where applicable). They are cross-referenced from CRBOX internal experience and publicly available Hacienda data, but they are **not a substitute for official TICA consultation**.

---

## 4. Recommended Sync Architecture

### Option A: Periodic Static Import (Recommended)

1. A staff member or automated script visits the Hacienda arancel tool quarterly (or when rate changes are announced).
2. Rates for CRBOX's ~120 product categories are extracted and validated.
3. The `OFFICIAL_RATES` map in `js/tariff-adapter.js` is updated.
4. The source flag is changed to `"official_tica"` for verified rates.
5. The `local_estimated` rates remain as fallback for any categories not yet verified.

**Advantages:** No API dependency, no DGA registration required, low maintenance, transparent.  
**Disadvantages:** Manual effort, potential for rates to drift between sync cycles.

### Option B: Scraping with Validation (Advanced)

1. A serverless function (e.g. on Cloudflare Workers or a lightweight server) periodically fetches the Hacienda arancel page for specific HS codes.
2. Results are parsed, validated against known ranges, and stored in a JSON file served alongside the calculator.
3. The tariff adapter fetches this JSON on load and populates `OFFICIAL_RATES`.

**Advantages:** Closer to real-time, reduces manual effort.  
**Disadvantages:** Fragile (depends on Hacienda HTML structure), requires server component, needs rate-change detection logic.

### Option C: DGA Direct Integration (Future)

If CRBOX registers as a DGA-authorized broker or customs agent:
1. DGA may grant system-to-system access credentials.
2. Live lookups via TICA web services become possible.
3. Source flag becomes `"official_tica"` in real time.

**Recommended for:** Phase 2 of business expansion, not a current requirement.

---

## 5. Rate-Change Handling

- Costa Rica publishes tariff changes in the official gazette (*La Gaceta*) before they take effect.
- Sign up for Hacienda/DGA alerts at: `https://www.hacienda.go.cr/`
- When changes are announced, update `OFFICIAL_RATES` in the tariff adapter before the effective date.
- The UI provenance labels (`local_estimated` / `official_tica`) automatically communicate confidence level to users; no UI changes needed when rates are updated.

---

## 6. Fallback Behavior

The tariff adapter is designed so that:
- If `OFFICIAL_RATES` is empty (current state), all lookups fall back to `LOCAL_RATES` with `source: "local_estimated"`.
- If a category code is not found in either map, the `otros` rate (29.95%) is used as the default, which is a conservative mid-range estimate.
- If a user manually inputs a rate, `source: "user_override"` takes highest precedence.

**Swapping in official data requires only changes to `js/tariff-adapter.js` — no UI changes.**

---

## 7. No Invented Rates Policy

Under no circumstances should estimated rates be presented as official government rates. All `local_estimated` figures must be labeled clearly in the UI (amber badge: "Estimado — categoría local") and linked to a tooltip explaining they are not official customs data. This is enforced in the UI layer and non-negotiable.
