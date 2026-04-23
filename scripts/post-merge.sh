#!/bin/bash
set -e

# Inject the GTM container ID (defined once in gtm.config.json) into all
# public HTML pages.
#
# Run this script:
#   - After every merge (runs automatically as the post-merge hook)
#   - Before every deployment / publish
#   - Whenever the GTM container ID in gtm.config.json is changed
#
# To change the GTM container ID: edit gtm.config.json, then run this script.
node scripts/inject-gtm.js

echo "Post-merge setup complete."
