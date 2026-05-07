#!/usr/bin/env python3
"""
Task #384 — Deduplicate productKeys.
Strategy: keep BOTH rows but rename the second occurrence with '_alt' suffix,
so the row count stays at 704 and no data is lost.
"""
import json, re

# ── Load JSON ─────────────────────────────────────────────────────────────────
with open('data/product-brain.json') as f:
    d = json.load(f)

products = d['products']

# ── Find duplicates ───────────────────────────────────────────────────────────
seen = {}
for i, p in enumerate(products):
    k = p['productKey']
    seen.setdefault(k, []).append(i)

duplicates = {k: idxs for k, idxs in seen.items() if len(idxs) > 1}
print(f'Duplicate keys found: {len(duplicates)}')

# Build a list of (original_key, new_key, second_index) tuples
all_existing_keys = set(p['productKey'] for p in products)
rename_pairs = []   # (orig_key, new_key)

for orig_key, idxs in duplicates.items():
    second_idx = idxs[1]
    new_key = orig_key + '_alt'
    while new_key in all_existing_keys:
        new_key += '2'
    all_existing_keys.add(new_key)
    products[second_idx]['productKey'] = new_key
    rename_pairs.append((orig_key, new_key))
    print(f'  JSON idx {second_idx}: {orig_key} -> {new_key}')

# ── Verify uniqueness ─────────────────────────────────────────────────────────
all_keys = [p['productKey'] for p in products]
assert len(all_keys) == len(set(all_keys)), 'STILL have duplicates!'
print(f'All {len(products)} productKeys now unique.')

# ── Write JSON ────────────────────────────────────────────────────────────────
with open('data/product-brain.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=2)
print('JSON written.')

# ── Fix JS: rename 2nd occurrence of each duplicated key ─────────────────────
with open('js/product-categories.js', encoding='utf-8') as f:
    js = f.read()

for orig_key, new_key in rename_pairs:
    pattern = f"productKey:'{orig_key}'"
    positions = [m.start() for m in re.finditer(re.escape(pattern), js)]
    if len(positions) >= 2:
        pos = positions[1]
        replacement = f"productKey:'{new_key}'"
        js = js[:pos] + replacement + js[pos + len(pattern):]
        print(f'  JS: {orig_key} -> {new_key}')
    elif len(positions) == 1:
        print(f'  JS: only 1 occurrence for {orig_key} — skipping')
    else:
        print(f'  JS: WARNING no occurrence for {orig_key}')

with open('js/product-categories.js', 'w', encoding='utf-8') as f:
    f.write(js)
print('JS written.')
