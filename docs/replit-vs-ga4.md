# CRBOX Analytics — Replit Built-in Analytics vs GA4

A practical guide to which analytics tool answers which question, and how the two layers complement each other without overlap.

---

## What Each Tool Is

### Replit Built-in Analytics (Traffic Overview)
Replit provides a lightweight traffic dashboard available in the project's Deployments panel. It shows server-side request counts, unique visitor estimates, and geographic breakdowns — all without any JavaScript on the page.

**What it measures:** HTTP requests reaching the Replit server. No user interaction, no event granularity.

### Google Analytics 4 (GA4) via GTM
GA4 is the CRBOX measurement layer. It receives structured behavioral events pushed by `js/analytics.js` through Google Tag Manager and stores them for full reporting and analysis.

**What it measures:** User interactions — clicks, scrolls, form submissions, calculator usage, section visibility — with full event parameter context.

---

## Which Tool for Which Question

| Question | Use Replit Analytics | Use GA4 |
|---------|----------------------|---------|
| Is the server getting traffic right now? | Yes | No |
| Which countries are sending requests? | Yes (rough) | Yes (accurate, user-level) |
| How many people clicked "Afíliate Gratis"? | No | Yes — `cta_afiliate_click` |
| Did the calculator run today? | No | Yes — `calculator_result` |
| Which page gets the most visits? | Yes (pageviews by URL) | Yes (with session context) |
| Are users abandoning the contact form? | No | Yes — `form_start` vs `contact_form_submit` |
| How far do visitors scroll on tarifas.html? | No | Yes — `scroll_depth` |
| Which service card gets the most clicks? | No | Yes — `service_card_click` |
| Is a deployment error causing 500 responses? | Yes (check server logs) | No |
| What is the calculator-to-signup conversion rate? | No | Yes — funnel in GA4 Explore |
| Are users on mobile or desktop? | Partial (user agent) | Yes (device category dimension) |
| Did a deploy break something? | Yes (traffic drop) | Yes (event rate drop) |

---

## Recommended Usage Pattern

### Use Replit Analytics for:
- **Health checks**: confirming the app is live and receiving traffic after a deployment.
- **Geographic sanity checks**: verifying Costa Rica is the dominant traffic source.
- **Server-level anomalies**: spotting 4xx/5xx spikes that indicate broken pages or misconfigurations.

### Use GA4 for:
- **All behavioral analysis**: what users do on the site, not just that they arrived.
- **Conversion measurement**: CTA clicks, form submissions, calculator completions.
- **Content engagement**: scroll depth, section visibility, FAQ usage.
- **Funnel analysis**: calculator_start → calculator_query → calculator_result → cta_afiliate_click.
- **Audience building**: for Google Ads and remarketing campaigns.

---

## Limitations of Each Tool

### Replit Analytics limitations
- No event tracking — only request counts.
- No session stitching — cannot tell if 10 requests came from 1 user or 10.
- No conversion attribution.
- Counts bot traffic and crawlers that pass server-side.
- Cannot filter by behavior or segment by user action.

### GA4 limitations
- Client-side only — does not count users with JavaScript disabled (a small minority).
- Blocked by ad blockers (~5–15% of users depending on audience).
- Requires GTM configuration to forward dataLayer events (see `docs/measurement-guide.md`).
- 24–48 hour processing delay for standard reports (Realtime is immediate).

---

## Data Consistency Between the Two

Expect Replit Analytics to show **higher** request counts than GA4 pageviews. The gap is normal:
- Replit counts server requests including bots, crawlers, and prefetch requests.
- GA4 counts only humans with JavaScript enabled who complete the page load.

A 20–40% gap is typical. A gap larger than 60% may indicate a GTM misconfiguration (see `docs/gtm-vs-ga4.md`).

---

## Summary

```
Replit Analytics → server health, raw traffic, geographic overview
GA4             → behavioral events, conversions, funnels, audiences
```

Neither tool replaces the other. Use Replit Analytics as a quick health indicator and GA4 as the authoritative source for all business decisions.
