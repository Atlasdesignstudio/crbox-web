# Project Overview

Static HTML/CSS/JS website. No framework, no build pipeline, no package dependencies.

## GTM Container ID

The Google Tag Manager container ID is defined in a single place:

```
gtm.config.json  →  { "containerId": "GTM-XXXXXXXXX" }
```

To change the container ID:
1. Edit `containerId` in `gtm.config.json`
2. Run `node scripts/inject-gtm.js`

The script updates all six public HTML pages automatically. It must also be run before every deployment.

## Public Pages

| File | Purpose |
|------|---------|
| index.html | Home |
| servicios.html | Services |
| como-funciona.html | How it works |
| tarifas.html | Pricing |
| calculadora.html | Calculator |
| contacto.html | Contact |

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/inject-gtm.js` | Injects GTM container ID from config into all public pages |
| `scripts/post-merge.sh` | Post-merge hook — runs inject-gtm.js automatically |

## Docs

Additional documentation lives in the `docs/` directory.
