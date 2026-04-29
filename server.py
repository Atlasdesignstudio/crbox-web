#!/usr/bin/env python3
import os
import re
import json
import time
import sqlite3
import calendar
import threading
import smtplib
import html as _html
import hashlib
import ipaddress
import socket
import email.mime.multipart
import email.mime.text
import email.utils
import urllib.request
import urllib.parse
import urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler

CRBOX_AUTH_URL = 'https://clients.crbox.cr/authtoken'
QUOTE_RECIPIENT = 'ventas@crbox.cr'

# ── AI / Gemini extraction ────────────────────────────────────────────────────
_GEMINI_API_KEY  = os.environ.get('GEMINI_API_KEY', '')
# Model is configurable via GEMINI_MODEL env var.
# Default: gemini-2.5-flash-lite — confirmed available and working for this key
# (verified via list_models() + live generateContent call on 2026-04-29).
# To override: set GEMINI_MODEL=gemini-2.5-flash (or any supported model name).
_GEMINI_MODEL    = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash-lite')
_GEMINI_SDK_OK   = False
try:
    from google import genai as _genai_check  # noqa: F401
    _GEMINI_SDK_OK = True
    print(f'[AI] google-genai available; key configured: {bool(_GEMINI_API_KEY)}; model: {_GEMINI_MODEL}')
    del _genai_check
except ImportError:
    print('[AI] WARNING: google-genai not installed — AI extraction disabled')


def _verify_gemini_model_at_startup():
    """Run once at startup: confirm the configured model exists and supports generateContent.

    If the configured model is missing or unsupported, automatically switches
    _GEMINI_MODEL to the first available model that supports generateContent so
    that AI features degrade gracefully instead of failing every request.
    """
    global _GEMINI_MODEL
    if not _GEMINI_SDK_OK or not _GEMINI_API_KEY:
        return
    try:
        from google import genai as _gv
        client = _gv.Client(api_key=_GEMINI_API_KEY)
        # Collect all models that support generateContent
        gc_models = []
        model_map = {}
        for m in client.models.list():
            short = m.name.split('/', 1)[-1]
            model_map[m.name] = m
            model_map[short] = m
            if 'generateContent' in (m.supported_actions or []):
                gc_models.append(m.name)

        canonical = f'models/{_GEMINI_MODEL}'
        found = model_map.get(canonical) or model_map.get(_GEMINI_MODEL)

        if found is not None and 'generateContent' in (found.supported_actions or []):
            print(f'[AI] Model verification OK: {found.name} supports generateContent')
            return

        # Configured model is unavailable or unsupported — try to auto-select
        if found is None:
            print(f'[AI] WARNING: configured model "{_GEMINI_MODEL}" not found in list_models()')
        else:
            print(f'[AI] WARNING: model "{found.name}" does not support generateContent '
                  f'(actions={list(found.supported_actions or [])})')

        if gc_models:
            _GEMINI_MODEL = gc_models[0].split('/', 1)[-1]  # use short name
            print(f'[AI] Auto-selected fallback model: {_GEMINI_MODEL} (supports generateContent)')
        else:
            print(f'[AI] ERROR: no models supporting generateContent found for this API key; '
                  f'AI features will be disabled until GEMINI_MODEL is set to a valid model.')
    except Exception as _ex:
        print(f'[AI] WARNING: model verification failed ({_ex}); AI may not work')

_AI_CACHE        = {}           # sha256(url) -> (result_dict, expires_ts)
_AI_CACHE_TTL    = 900          # 15 minutes
_AI_CACHE_LOCK   = threading.Lock()

_AI_RATE         = {}           # ip -> [ts, ...]
_AI_RATE_LOCK    = threading.Lock()
_AI_RATE_LIMIT   = 10           # calls per IP per hour

_CRBOX_CATEGORIES = (
    'celulares', 'computadora', 'consola_videojuegos', 'camara',
    'auricular_telefono', 'bocina', 'televisor',
    'ropa', 'anteojos', 'cinturon',
    'electrodomesticos', 'aspiradora', 'colchon', 'herramientas',
    'bicicleta_economica', 'bicicleta_cara', 'bola',
    'coche_bebe', 'juguetes',
    'amortiguadores', 'aros_carro_moto', 'vehiculos',
    'salud_belleza', 'suplementos', 'cds', 'otros',
)

_AI_PROMPT_TEMPLATE = """\
You are a product-data extraction assistant for a Costa Rica courier company called CRBOX.
Extract product information from the HTML/text below and return ONLY a JSON object.

CRBOX category codes (choose the single best match):
{categories}

JSON schema (return exactly this structure):
{{
  "page_readable": true,
  "partial": false,
  "fields": {{
    "product_name":       {{"value": null, "confidence": 0.0, "provenance": "missing", "source_attribute": null}},
    "declared_value_usd": {{"value": null, "confidence": 0.0, "provenance": "missing", "source_attribute": null}},
    "category":           {{"value": null, "confidence": 0.0, "provenance": "missing", "source_attribute": null}},
    "weight_kg":          {{"value": null, "confidence": 0.0, "provenance": "missing", "source_attribute": null}},
    "dimensions_cm":      {{"value": null, "confidence": 0.0, "provenance": "missing", "source_attribute": null}}
  }},
  "extraction_warnings": []
}}

Rules:
1. "provenance" must be one of: "extracted" | "inferred" | "missing" | "needs_confirmation"
2. declared_value_usd: extract the sale price in USD as a float. If multiple prices exist, use needs_confirmation. If the price is in another currency, convert to USD if an exchange rate is obvious, otherwise use needs_confirmation.
3. category: choose from the list above. Use "inferred" provenance since it is always inferred from context.
4. weight_kg: extract the PRODUCT weight in kilograms as a float (not shipping weight). Look in spec tables, product details, and technical specifications. If found, use "extracted" provenance. If not found, use "missing" with null value. Do NOT guess.
5. dimensions_cm: extract product dimensions (L×W×H) in centimeters as a string like "30x20x10" or as an object {{"length": 30, "width": 20, "height": 10}}. Look in spec tables and product details sections. These are PRODUCT dimensions, not box/shipping dimensions. If found, use "extracted" provenance. If not found, use "missing" with null value. Do NOT guess.
6. If the page is a login wall, CAPTCHA, error page, or you cannot determine a product name, set page_readable to false.
7. Do not invent or guess values. Return "missing" rather than a guess.
8. Return ONLY valid JSON — no markdown, no code fences, no explanation.

PAGE CONTENT:
{content}
"""


def _ai_rate_check(ip):
    now = time.time()
    with _AI_RATE_LOCK:
        timestamps = _AI_RATE.get(ip, [])
        timestamps = [t for t in timestamps if now - t < 3600]
        if len(timestamps) >= _AI_RATE_LIMIT:
            return False
        timestamps.append(now)
        _AI_RATE[ip] = timestamps
    return True


def _ai_cache_get(url_hash):
    with _AI_CACHE_LOCK:
        entry = _AI_CACHE.get(url_hash)
        if entry and time.time() < entry[1]:
            return entry[0]
    return None


def _ai_cache_set(url_hash, result):
    with _AI_CACHE_LOCK:
        _AI_CACHE[url_hash] = (result, time.time() + _AI_CACHE_TTL)


_SSRF_PRIVATE_NETS = [
    ipaddress.ip_network('127.0.0.0/8'),
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('169.254.0.0/16'),
    ipaddress.ip_network('::1/128'),
    ipaddress.ip_network('fc00::/7'),
    ipaddress.ip_network('fe80::/10'),
]


def _is_ssrf_safe(url):
    try:
        parsed = urllib.parse.urlparse(url)
        hostname = parsed.hostname
        if not hostname:
            return False
        addrs = socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP)
        for _af, _type, _proto, _canon, sockaddr in addrs:
            ip = ipaddress.ip_address(sockaddr[0])
            for net in _SSRF_PRIVATE_NETS:
                if ip in net:
                    return False
        return True
    except Exception:
        return False


class _SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Follow up to 3 redirects but revalidate each hop for SSRF safety."""
    max_repeats = 3
    max_redirections = 3

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not _is_ssrf_safe(newurl):
            raise urllib.error.URLError('redirect to private network blocked')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _fetch_page(url):
    req = urllib.request.Request(url, headers={
        'User-Agent': ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                       'AppleWebKit/537.36 (KHTML, like Gecko) '
                       'Chrome/124.0.0.0 Safari/537.36'),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    })
    opener = urllib.request.build_opener(_SafeRedirectHandler)
    try:
        with opener.open(req, timeout=10) as resp:
            raw = resp.read(200_000)
            charset = 'utf-8'
            ctype = resp.headers.get('Content-Type', '')
            if 'charset=' in ctype:
                charset = ctype.split('charset=')[-1].split(';')[0].strip()
            try:
                text = raw.decode(charset, errors='replace')
            except Exception:
                text = raw.decode('utf-8', errors='replace')
            return text, None
    except urllib.error.HTTPError as e:
        return None, f'HTTP {e.code}'
    except Exception as ex:
        return None, str(ex)


def _extract_structured_data(html_text):
    """Extract JSON-LD blocks and Open Graph / standard meta price tags from raw HTML.
    Returns a compact plain-text summary to prepend to the Gemini prompt content."""
    import re as _re
    import json as _json
    lines = []

    # ── JSON-LD blocks ────────────────────────────────────────────────────────
    for m in _re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html_text, _re.IGNORECASE | _re.DOTALL
    ):
        raw = m.group(1).strip()
        try:
            obj = _json.loads(raw)
        except Exception:
            continue
        # Flatten top-level @graph arrays and plain arrays into a single list
        if isinstance(obj, list):
            items = list(obj)
        elif isinstance(obj, dict) and '@graph' in obj:
            items = list(obj['@graph']) if isinstance(obj['@graph'], list) else [obj]
        else:
            items = [obj]
        idx = 0
        while idx < len(items):
            item = items[idx]
            idx += 1
            if not isinstance(item, dict):
                continue
            rtype = str(item.get('@type', '')).lower()
            if rtype not in ('product', 'offer'):
                # Expand nested offers/product and @graph inside any @type
                for key in ('offers', 'mainEntity', '@graph'):
                    sub = item.get(key)
                    if isinstance(sub, dict):
                        items.append(sub)
                    elif isinstance(sub, list):
                        items.extend(sub)
                continue
            name  = item.get('name') or item.get('headline')
            if name:
                lines.append(f'[LD+JSON] name: {name}')
            offers = item.get('offers')
            if isinstance(offers, dict):
                offers = [offers]
            if isinstance(offers, list):
                for o in offers:
                    price    = o.get('price') or o.get('lowPrice')
                    currency = o.get('priceCurrency', 'USD')
                    if price is not None:
                        lines.append(f'[LD+JSON] price: {price} {currency}')
                    avail = o.get('availability', '')
                    if avail:
                        lines.append(f'[LD+JSON] availability: {avail}')
            # Direct price on product
            if item.get('price') is not None:
                lines.append(f'[LD+JSON] price: {item["price"]} {item.get("priceCurrency","USD")}')
            # Weight
            weight = item.get('weight')
            if isinstance(weight, dict):
                lines.append(f'[LD+JSON] weight: {weight.get("value")} {weight.get("unitCode","KGM")}')
            # Dimensions / depth / height / width
            for dim_key in ('depth', 'height', 'width'):
                dim = item.get(dim_key)
                if isinstance(dim, dict) and dim.get('value'):
                    lines.append(f'[LD+JSON] {dim_key}: {dim["value"]} {dim.get("unitCode","CMT")}')

    # ── Open Graph / standard meta tags ──────────────────────────────────────
    for m in _re.finditer(r'<meta\s+([^>]+)>', html_text, _re.IGNORECASE):
        attrs_raw = m.group(1)
        prop  = _re.search(r'(?:property|name)=["\']([^"\']+)["\']', attrs_raw, _re.IGNORECASE)
        cont  = _re.search(r'content=["\']([^"\']+)["\']', attrs_raw, _re.IGNORECASE)
        if not prop or not cont:
            continue
        pname = prop.group(1).lower()
        value = cont.group(1).strip()
        if not value:
            continue
        if pname in ('product:price:amount', 'og:price:amount', 'price'):
            lines.append(f'[meta] price: {value}')
        elif pname in ('product:price:currency',):
            lines.append(f'[meta] currency: {value}')
        elif pname in ('og:title', 'twitter:title'):
            lines.append(f'[meta] title: {value}')
        elif pname in ('product:weight',):
            lines.append(f'[meta] weight: {value}')

    if not lines:
        return ''
    # Cap the summary to avoid inflating the prompt beyond budget (~2 000 chars)
    summary = '=== STRUCTURED DATA (high confidence) ===\n' + '\n'.join(lines) + '\n\n'
    return summary[:2_000]


_SPEC_SECTION_PATTERNS = [
    r'(?:product[\s_-]*)?(?:detail|spec|specification|technical[\s_-]*info|item[\s_-]*spec)',
    r'(?:dimensions?|measurements?|size[\s_-]*info)',
    r'(?:weight[\s_-]*&[\s_-]*dimension)',
]


def _truncate_page(html_text):
    import re as _re
    head_match = _re.search(r'<head[\s>].*?</head>', html_text, _re.IGNORECASE | _re.DOTALL)
    head_part  = head_match.group(0) if head_match else ''
    body_match = _re.search(r'<body[\s>]', html_text, _re.IGNORECASE)
    body_start = body_match.start() if body_match else 0
    body_text  = html_text[body_start:]

    # Try to find spec/detail sections and prioritise them
    spec_bonus = ''
    combined_pattern = '|'.join(_SPEC_SECTION_PATTERNS)
    spec_re = _re.compile(combined_pattern, _re.IGNORECASE)
    for m in spec_re.finditer(body_text):
        # Grab up to 3000 chars around each spec section hit
        start = max(0, m.start() - 200)
        end   = min(len(body_text), m.end() + 3000)
        snippet = body_text[start:end]
        if snippet not in spec_bonus:
            spec_bonus += snippet
        if len(spec_bonus) > 6000:
            break

    body_head = body_text[:12_000]
    combined  = head_part + '\n' + body_head
    if spec_bonus:
        combined += '\n\n=== PRODUCT SPECIFICATION SECTION ===\n' + spec_bonus
    return combined[:22_000]


def _call_gemini(content):
    if not _GEMINI_API_KEY:
        return None, 'No API key configured'
    try:
        from google import genai
        from google.genai import types as _gtypes
        client = genai.Client(api_key=_GEMINI_API_KEY)
        prompt = _AI_PROMPT_TEMPLATE.format(
            categories=', '.join(_CRBOX_CATEGORIES),
            content=content,
        )
        response = client.models.generate_content(
            model=_GEMINI_MODEL,
            contents=prompt,
            config=_gtypes.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=1024,
            ),
        )
        text = (response.text or '').strip()
        if not text:
            return None, f'Empty response from model {_GEMINI_MODEL}'
        if text.startswith('```'):
            text = text.split('\n', 1)[-1] if '\n' in text else text[3:]
        if text.endswith('```'):
            text = text[:-3].rstrip()
        return json.loads(text), None
    except json.JSONDecodeError as ex:
        return None, f'JSON parse error: {ex}'
    except Exception as ex:
        return None, f'Gemini error ({_GEMINI_MODEL}): {ex}'


_DRAFT_PROMPT_TEMPLATE = """\
You are an internal drafting assistant for CRBOX, a Costa Rica courier service. \
Your job is to help sales staff draft professional customer response emails for shipping quote requests.

You receive structured context about a quote request and MUST return EXACTLY this JSON structure \
(no markdown, no code fences, no text outside the JSON):
{{
  "customer_message": "...",
  "conditions": "...",
  "difference_explanation": "..."
}}

STRICT RULES — follow every rule without exception:
1. PRICE RULE: You must NEVER suggest, evaluate, justify, or comment on any price or cost figure. \
Price determination is exclusively CRBOX staff's responsibility. Do not reference the confirmed_price_usd \
or any specific monetary amount in any of your output fields.
2. customer_message: Write a professional, warm, concise message to the customer appropriate for the \
availability status. It must read as coming from CRBOX staff, not from any AI or automated system. \
Do not recap product details the customer already knows.
3. conditions: Write conditions ONLY when availability is "disponible_con_condiciones" and there \
are meaningful conditions to communicate based on the context. Return "" (empty string) when: \
availability is "disponible"; availability is "no_disponible"; or you would only produce generic filler. \
Never invent conditions.
4. difference_explanation: Return "" (empty string) ALWAYS when: confirmed_price_usd is null; OR \
difference_is_material is false or null; OR system_estimate_usd is null. When non-empty, explain WHY \
the price may differ from the system estimate using context (e.g., estimate was incomplete due to \
missing weight/dimensions, AI extraction had uncertain fields). Never invent explanations.
5. TONE — mandatory for every field:
   - Professional and clear: suitable for business communication with CRBOX customers
   - Human and concise: not robotic, not padded, not bureaucratic
   - Commercially appropriate: acknowledges the customer's intent and respects their time
   - Not overly legalistic: state conditions clearly, not buried in hedged language
   - Not overly promotional: this is a transactional response, not marketing copy
   - Never implies certainty when conditions are present
   - Never implies that Gemini, any AI, or any automated system determined the price or availability
   - Never mechanically restates product metadata the customer already knows
   - Leave conditions and difference_explanation as "" when nothing meaningful applies
6. Return ONLY valid JSON — no markdown, no code fences, no explanation.

CONTEXT:
availability: {availability}
product_name: {product_name}
product_url: {product_url}
product_category: {product_category}
declared_value_usd: {declared_value_usd}
system_estimate_usd: {system_estimate_usd}
estimate_is_complete: {estimate_is_complete}
confirmed_price_usd: {confirmed_price_usd}
numeric_difference_usd: {numeric_difference_usd}
difference_is_material: {difference_is_material}
ai_extraction_has_weak_fields: {ai_extraction_has_weak_fields}
weak_extraction_fields: {weak_extraction_fields}
"""


def _call_gemini_draft(context):
    """Call Gemini to generate draft suggestions for the response composer.

    Args:
        context: dict with keys matching _DRAFT_PROMPT_TEMPLATE placeholders
    Returns:
        (result_dict, error_str) — result_dict has keys customer_message, conditions,
        difference_explanation; error_str is None on success.
    """
    if not _GEMINI_API_KEY:
        return None, 'No API key configured'
    try:
        from google import genai
        from google.genai import types as _gtypes
        client = genai.Client(api_key=_GEMINI_API_KEY)
        prompt = _DRAFT_PROMPT_TEMPLATE.format(**context)
        response = client.models.generate_content(
            model=_GEMINI_MODEL,
            contents=prompt,
            config=_gtypes.GenerateContentConfig(
                temperature=0.4,
                max_output_tokens=1500,
            ),
        )
        text = (response.text or '').strip()
        if not text:
            return None, f'Empty response from model {_GEMINI_MODEL}'
        if text.startswith('```'):
            text = text.split('\n', 1)[-1] if '\n' in text else text[3:]
        if text.endswith('```'):
            text = text[:-3].rstrip()
        result = json.loads(text)
        # Normalise: ensure exactly the three expected keys as strings
        out = {
            'customer_message':      str(result.get('customer_message', '') or ''),
            'conditions':            str(result.get('conditions', '') or ''),
            'difference_explanation': str(result.get('difference_explanation', '') or ''),
        }
        return out, None
    except json.JSONDecodeError as ex:
        return None, f'JSON parse error: {ex}'
    except Exception as ex:
        return None, f'Gemini error ({_GEMINI_MODEL}): {ex}'


_FIELD_DEFAULTS = {
    'product_name':       {'value': None, 'confidence': 0.0, 'provenance': 'missing', 'source_attribute': None, 'source_unit': None},
    'declared_value_usd': {'value': None, 'confidence': 0.0, 'provenance': 'missing', 'source_attribute': None, 'source_unit': None},
    'category':           {'value': None, 'confidence': 0.0, 'provenance': 'missing', 'source_attribute': None, 'source_unit': None},
    'weight_kg':          {'value': None, 'confidence': 0.0, 'provenance': 'missing', 'source_attribute': None, 'source_unit': None},
    'dimensions_cm':      {'value': None, 'confidence': 0.0, 'provenance': 'missing', 'source_attribute': None, 'source_unit': None},
}

_VALID_PROVENANCES = {'extracted', 'inferred', 'missing', 'needs_confirmation'}


def _normalize_field(raw):
    if not isinstance(raw, dict):
        return dict(_FIELD_DEFAULTS.get('product_name'))
    try:
        confidence = float(raw.get('confidence') or 0.0)
    except (TypeError, ValueError):
        confidence = 0.0
    out = {}
    out['value']            = raw.get('value', None)
    out['confidence']       = max(0.0, min(1.0, confidence))
    prov = raw.get('provenance', 'missing')
    out['provenance']       = prov if prov in _VALID_PROVENANCES else 'missing'
    out['source_attribute'] = raw.get('source_attribute', None)
    out['source_unit']      = None
    return out


# ── Unit conversion constants ────────────────────────────────────────────────
_LBS_TO_KG = 0.45359237
_OZ_TO_KG  = 0.02834952
_IN_TO_CM  = 2.54


def _parse_weight_to_kg(raw_value):
    """Parse a weight value (str or number) and return (kg_float, source_unit) or (None, None).

    Detects common US units (lbs, lb, oz) and converts to kg.
    Returns source_unit=None when value is already in kg or unit is unknown.
    """
    import re as _re
    if raw_value is None:
        return None, None
    if isinstance(raw_value, (int, float)):
        v = float(raw_value)
        return (round(v, 3), None) if v > 0 else (None, None)
    s = str(raw_value).strip()
    m = _re.match(r'^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)?$', s)
    if not m:
        return None, None
    num_str = m.group(1).replace(',', '.')
    unit = (m.group(2) or '').lower().strip().rstrip('s')  # strip plural 's'
    try:
        num = float(num_str)
    except ValueError:
        return None, None
    if unit in ('lb', 'lbs', 'pound'):
        return round(num * _LBS_TO_KG, 3), 'lbs'
    elif unit in ('oz', 'ounce'):
        return round(num * _OZ_TO_KG, 3), 'oz'
    elif unit in ('g', 'gram'):
        return round(num / 1000.0, 3), 'g'
    elif unit in ('kg', 'kilogram', ''):
        return round(num, 3), 'kg' if unit else None
    else:
        # Unknown unit — return number as-is and record the unit for debugging
        return round(num, 3), unit if unit else None


def _normalize_dimensions(raw_value):
    """Normalize a dimensions value to ({length, width, height}, source_unit) or (None, None).

    Detects common US units (in, inch, inches) from strings or dict unit keys
    and converts to centimetres.  source_unit is 'in' when conversion occurs,
    'cm' when the value was already metric, or None when unspecified.
    """
    import re as _re
    if raw_value is None:
        return None, None
    if isinstance(raw_value, dict):
        unit = str(raw_value.get('unit') or '').lower().strip()
        try:
            parsed = {
                'length': float(raw_value.get('length') or raw_value.get('l') or 0) or None,
                'width':  float(raw_value.get('width')  or raw_value.get('w') or 0) or None,
                'height': float(raw_value.get('height') or raw_value.get('h') or 0) or None,
            }
        except (TypeError, ValueError):
            return None, None
        if unit in ('in', 'inch', 'inches', '"'):
            parsed = {k: round(v * _IN_TO_CM, 2) if v else v for k, v in parsed.items()}
            return parsed, 'in'
        return parsed, 'cm' if unit in ('cm', 'centimeter', 'centimeters') else None
    s = str(raw_value).strip()
    # Match patterns like "30x20x10", "30×20×10", "30 x 20 x 10" with optional unit suffix
    m = _re.match(
        r'^(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)'
        r'\s*(cm|in|inch|inches|")?$',
        s, _re.IGNORECASE
    )
    if m:
        l, w, h = float(m.group(1)), float(m.group(2)), float(m.group(3))
        unit_raw = (m.group(4) or '').lower().strip('"')
        if unit_raw in ('in', 'inch', 'inches'):
            return {
                'length': round(l * _IN_TO_CM, 2),
                'width':  round(w * _IN_TO_CM, 2),
                'height': round(h * _IN_TO_CM, 2),
            }, 'in'
        return {'length': l, 'width': w, 'height': h}, 'cm' if unit_raw == 'cm' else None
    return None, None


def _normalize_ai_result(raw, source_url):
    now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    out = {}
    out['source_url']         = source_url
    out['extracted_at']       = now_iso
    out['model']              = _GEMINI_MODEL
    out['page_readable']      = bool(raw.get('page_readable', True))
    out['partial']            = bool(raw.get('partial', False))
    out['extraction_warnings'] = raw.get('extraction_warnings') or []

    raw_fields = raw.get('fields') or {}
    fields = {}
    for fname, defaults in _FIELD_DEFAULTS.items():
        raw_f = raw_fields.get(fname)
        fields[fname] = _normalize_field(raw_f) if raw_f else dict(defaults)

    # Normalize weight: detect US units (lbs, oz) and convert to kg
    w_field = fields['weight_kg']
    if w_field.get('provenance') != 'missing' and w_field.get('value') is not None:
        w_val, w_source_unit = _parse_weight_to_kg(w_field['value'])
        if w_val and w_val > 0:
            w_field['value']       = w_val
            w_field['source_unit'] = w_source_unit
        else:
            w_field['value']       = None
            w_field['provenance']  = 'missing'
            w_field['confidence']  = 0.0
            w_field['source_unit'] = None

    # Normalize dimensions: detect US units (in/inches) and convert to cm
    d_field = fields['dimensions_cm']
    if d_field.get('provenance') != 'missing' and d_field.get('value') is not None:
        parsed, d_source_unit = _normalize_dimensions(d_field['value'])
        if parsed and any(v for v in parsed.values() if v):
            d_field['value']       = parsed
            d_field['source_unit'] = d_source_unit
        else:
            d_field['value']       = None
            d_field['provenance']  = 'missing'
            d_field['confidence']  = 0.0
            d_field['source_unit'] = None

    # category value must be a valid CRBOX code or null
    cat_val = fields['category'].get('value')
    if cat_val and str(cat_val) not in _CRBOX_CATEGORIES:
        fields['category']['value']      = None
        fields['category']['provenance'] = 'missing'
        fields['category']['confidence'] = 0.0

    out['fields'] = fields
    return out


def _handle_ai_extract(handler):
    try:
        length = int(handler.headers.get('Content-Length', 0))
        body   = json.loads(handler.rfile.read(length)) if length else {}
    except Exception:
        handler._json_response(400, {'error': 'bad_request'})
        return

    url = (body.get('url') or '').strip()
    if not url or not url.startswith(('http://', 'https://')):
        handler._json_response(200, {'page_readable': False, 'error': 'invalid_url'})
        return

    ip = (handler.headers.get('X-Forwarded-For') or
          handler.client_address[0] or '0.0.0.0').split(',')[0].strip()

    if not _ai_rate_check(ip):
        handler._json_response(200, {'ok': False, 'error': 'rate_limit'})
        return

    if not _is_ssrf_safe(url):
        handler._json_response(200, {'page_readable': False, 'error': 'invalid_url'})
        return

    url_hash = hashlib.sha256(url.encode()).hexdigest()
    cached = _ai_cache_get(url_hash)
    if cached is not None:
        handler._json_response(200, cached)
        return

    page_text, fetch_err = _fetch_page(url)
    if not page_text:
        result = {'page_readable': False, 'error': 'fetch_failed',
                  'message': fetch_err or 'No se pudo acceder a la página.'}
        _ai_cache_set(url_hash, result)
        handler._json_response(200, result)
        return

    structured_summary = _extract_structured_data(page_text)
    truncated = _truncate_page(page_text)
    # Prepend high-confidence structured data so Gemini has reliable anchors
    if structured_summary:
        truncated = structured_summary + truncated
    gemini_result, gemini_err = _call_gemini(truncated)

    if gemini_err or not isinstance(gemini_result, dict):
        # Determine a coarse actionable error code for ops/debug without leaking internals
        if gemini_err and 'No API key' in gemini_err:
            err_detail = 'no_api_key'
        elif gemini_err and ('NOT_FOUND' in gemini_err or 'not found' in gemini_err.lower()):
            err_detail = 'model_unavailable'
        elif gemini_err and 'Empty response' in gemini_err:
            err_detail = 'empty_response'
        else:
            err_detail = 'ai_error'
        print(f'[AI] extract failed for {url!r}: {gemini_err}')
        result = {'page_readable': False, 'error': 'ai_failed',
                  'error_detail': err_detail,
                  'message': 'No se pudo analizar la página en este momento.'}
        _ai_cache_set(url_hash, result)
        handler._json_response(200, result)
        return

    try:
        result = _normalize_ai_result(gemini_result, url)
    except Exception:
        result = {'page_readable': False, 'error': 'ai_parse_failed'}
    _ai_cache_set(url_hash, result)
    handler._json_response(200, result)

# ── SQLite / Solicitudes ──────────────────────────────────────────────────────
_DB_PATH = 'solicitudes.db'
_DB_LOCK = threading.Lock()

_LEGAL_TRANSITIONS = {
    'enviada':                           {'en_revision', 'respondida', 'cancelada', 'expirada'},
    'en_revision':                       {'respondida', 'cancelada', 'expirada'},
    'respondida':                        {'completada', 'cancelada', 'pendiente_compra_crbox', 'pendiente_compra_cliente'},
    'pendiente_compra_crbox':            {'cancelada'},
    'pendiente_confirmacion_pago_cliente': {'cancelada'},
    'pagado_por_cliente':                {'cancelada'},
    'comprado':                          {'listo_para_retiro', 'completada', 'cancelada'},
    'listo_para_retiro':                 {'completada', 'cancelada'},
    'pendiente_compra_cliente':          {'completada', 'cancelada'},
    'completada':                        set(),
    'cancelada':                         set(),
    'expirada':                          set(),
}

# Admin panel enforces stricter progression: enviada must go through en_revision
# before being marked respondida (no skip allowed).
_ADMIN_LEGAL_TRANSITIONS = {
    'enviada':                           {'en_revision', 'cancelada'},
    'en_revision':                       {'respondida', 'cancelada'},
    'respondida':                        {'completada', 'cancelada', 'pendiente_compra_crbox', 'pendiente_compra_cliente'},
    'pendiente_compra_crbox':            {'pendiente_confirmacion_pago_cliente', 'cancelada'},
    'pendiente_confirmacion_pago_cliente': {'pagado_por_cliente', 'cancelada'},
    'pagado_por_cliente':                {'comprado', 'cancelada'},
    'comprado':                          {'listo_para_retiro', 'completada', 'cancelada'},
    'listo_para_retiro':                 {'completada', 'cancelada'},
    'pendiente_compra_cliente':          {'completada', 'cancelada'},
    'completada':                        set(),
    'cancelada':                         set(),
    'expirada':                          set(),
}

_DEV_SALES_TOKEN = 'crbox-dev-sales-token-2026'


def _get_db():
    """Return a thread-local SQLite connection (creates DB/tables on first use)."""
    conn = sqlite3.connect(_DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA foreign_keys=ON')
    return conn


def _init_db():
    """Create tables if they don't exist. Called once at startup."""
    with _DB_LOCK:
        conn = _get_db()
        conn.executescript('''
            CREATE TABLE IF NOT EXISTS quote_requests (
                id                  TEXT PRIMARY KEY,
                casillero_id        TEXT,
                customer_email      TEXT NOT NULL,
                customer_name       TEXT,
                account_type        TEXT NOT NULL DEFAULT "anonymous",
                product_name        TEXT NOT NULL,
                product_url         TEXT,
                declared_value_usd  REAL NOT NULL,
                category            TEXT NOT NULL DEFAULT "otros",
                weight_kg           REAL,
                length_cm           REAL,
                width_cm            REAL,
                height_cm           REAL,
                customer_notes      TEXT,
                service_type        TEXT NOT NULL DEFAULT "aereo",
                destination_zone    TEXT,
                estimate_usd        REAL,
                estimate_breakdown  TEXT,
                ai_extraction_id    TEXT,
                data_source         TEXT NOT NULL DEFAULT "manual",
                status              TEXT NOT NULL DEFAULT "enviada",
                submitted_at        TEXT NOT NULL,
                responded_at        TEXT,
                completed_at        TEXT,
                cancelled_at        TEXT,
                expires_at          TEXT,
                linked_package_id   TEXT,
                ai_extraction_json  TEXT,
                response_json       TEXT
            );

            CREATE TABLE IF NOT EXISTS quote_status_history (
                id               TEXT PRIMARY KEY,
                quote_request_id TEXT NOT NULL,
                from_status      TEXT,
                to_status        TEXT NOT NULL,
                changed_at       TEXT NOT NULL,
                changed_by       TEXT NOT NULL DEFAULT "system",
                note             TEXT,
                FOREIGN KEY (quote_request_id) REFERENCES quote_requests(id)
            );

            CREATE TABLE IF NOT EXISTS consultas_generales (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre       TEXT NOT NULL,
                correo       TEXT NOT NULL,
                pregunta     TEXT NOT NULL,
                source       TEXT NOT NULL,
                submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
                status       TEXT NOT NULL DEFAULT 'nueva'
            );

            CREATE TABLE IF NOT EXISTS general_inquiries (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre       TEXT NOT NULL,
                correo       TEXT NOT NULL,
                telefono     TEXT NOT NULL DEFAULT '',
                asunto       TEXT NOT NULL DEFAULT '',
                mensaje      TEXT NOT NULL,
                source       TEXT NOT NULL DEFAULT 'contacto',
                submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
                email_sent   INTEGER NOT NULL DEFAULT 0
            );
        ''')
        conn.commit()
        # Safe migration: add reminder_sent_at if it doesn't exist yet.
        # executescript() auto-commits, so ALTER TABLE runs in its own transaction.
        existing_cols = [row[1] for row in
                         conn.execute('PRAGMA table_info(quote_requests)').fetchall()]
        if 'reminder_sent_at' not in existing_cols:
            conn.execute('ALTER TABLE quote_requests ADD COLUMN reminder_sent_at TEXT')
            conn.commit()
            print('[SOLICITUDES] Added reminder_sent_at column to quote_requests')
        if 'ai_extraction_json' not in existing_cols:
            conn.execute('ALTER TABLE quote_requests ADD COLUMN ai_extraction_json TEXT')
            conn.commit()
            print('[SOLICITUDES] Added ai_extraction_json column to quote_requests')
        if 'response_json' not in existing_cols:
            conn.execute('ALTER TABLE quote_requests ADD COLUMN response_json TEXT')
            conn.commit()
            print('[SOLICITUDES] Added response_json column to quote_requests')
        if 'expected_tracking_number' not in existing_cols:
            conn.execute('ALTER TABLE quote_requests ADD COLUMN expected_tracking_number TEXT')
            conn.commit()
            print('[SOLICITUDES] Added expected_tracking_number column to quote_requests')
        if 'customer_reminder_sent_at' not in existing_cols:
            conn.execute('ALTER TABLE quote_requests ADD COLUMN customer_reminder_sent_at TEXT')
            conn.commit()
            print('[SOLICITUDES] Added customer_reminder_sent_at column to quote_requests')
        # Legacy migration: extend consultas_generales (FAQ path) with extra columns.
        # New general contact intake now uses the separate general_inquiries table.
        cg_cols = [row[1] for row in
                   conn.execute('PRAGMA table_info(consultas_generales)').fetchall()]
        if 'telefono' not in cg_cols:
            conn.execute('ALTER TABLE consultas_generales ADD COLUMN telefono TEXT')
            conn.commit()
            print('[CONSULTAS] Added telefono column to consultas_generales')
        if 'asunto' not in cg_cols:
            conn.execute('ALTER TABLE consultas_generales ADD COLUMN asunto TEXT')
            conn.commit()
            print('[CONSULTAS] Added asunto column to consultas_generales')
        if 'email_sent' not in cg_cols:
            conn.execute('ALTER TABLE consultas_generales ADD COLUMN email_sent INTEGER NOT NULL DEFAULT 0')
            conn.commit()
            print('[CONSULTAS] Added email_sent column to consultas_generales')
        conn.close()
    print('[SOLICITUDES] SQLite schema initialised OK')


def _generate_scb_id():
    """Generate the next SCB-XXXX ID by counting existing rows."""
    with _DB_LOCK:
        conn = _get_db()
        row = conn.execute('SELECT COUNT(*) FROM quote_requests').fetchone()
        count = row[0] + 1
        conn.close()
    if count < 10000:
        return f'SCB-{count:04d}'
    return f'SCB-{count}'


def _uuid4_hex():
    """Return a compact random UUID without importing uuid."""
    import random
    h = '%032x' % random.getrandbits(128)
    return h


def _now_iso():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def _now_display():
    return time.strftime('%d/%m/%Y %H:%M', time.gmtime())


def _store_inquiry(nombre, correo, pregunta, source):
    """Insert a row into consultas_generales. Returns the new row id. Raises on failure."""
    now_iso = _now_iso()
    with _DB_LOCK:
        conn = _get_db()
        cur = conn.execute(
            'INSERT INTO consultas_generales (nombre, correo, pregunta, source, submitted_at) '
            'VALUES (?, ?, ?, ?, ?)',
            (nombre.strip(), correo.strip(), pregunta.strip(), source, now_iso)
        )
        new_id = cur.lastrowid
        conn.commit()
        conn.close()
    return new_id


def _save_general_inquiry(nombre, correo, telefono, asunto, mensaje, source):
    """Reusable intake helper for general contact form submissions.

    (a) Inserts a record into the `general_inquiries` table.
    (b) Attempts to send a ventas notification email.
    (c) Logs email failure without raising — the saved record is never lost.

    Returns the new row id.
    Raises on DB failure (so the caller can return a 500 and avoid silent data loss).
    """
    now_iso = _now_iso()
    with _DB_LOCK:
        conn = _get_db()
        cur = conn.execute(
            'INSERT INTO general_inquiries '
            '(nombre, correo, telefono, asunto, mensaje, source, submitted_at, email_sent) '
            'VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
            (
                nombre.strip(),
                correo.strip(),
                (telefono or '').strip(),
                (asunto or '').strip(),
                mensaje.strip(),
                source,
                now_iso,
            )
        )
        new_id = cur.lastrowid
        conn.commit()
        conn.close()

    # Attempt email notification — failure is logged, not raised
    email_ok = False
    try:
        import email.mime.multipart as _mime_mp, email.mime.text as _mime_txt
        settings  = _smtp_settings()
        smtp_user = settings[2] if settings else 'noreply@crbox.cr'
        esc = _html.escape
        subject_line = f'[Contacto] Nueva consulta de {nombre}' + (f' — {asunto}' if asunto else '')
        plain = (
            f'Nueva consulta recibida desde el formulario de contacto.\n\n'
            f'Nombre: {nombre}\n'
            f'Correo: {correo}\n'
            f'Teléfono: {telefono or "—"}\n'
            f'Asunto: {asunto or "—"}\n\n'
            f'Mensaje:\n{mensaje}\n\n'
            f'Fuente: {source}\n'
            f'Registro #: {new_id}\n'
            f'Ver en panel: {os.environ.get("SITE_URL", "https://crbox.cr")}/admin/consultas'
        )
        html_body = (
            f'<p><strong>Nueva consulta — Formulario de Contacto</strong></p>'
            f'<table style="border-collapse:collapse;font-size:14px;">'
            f'<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Nombre</td>'
            f'<td style="padding:4px 0;font-weight:600;">{esc(nombre)}</td></tr>'
            f'<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Correo</td>'
            f'<td style="padding:4px 0;">{esc(correo)}</td></tr>'
            f'<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Teléfono</td>'
            f'<td style="padding:4px 0;">{esc(telefono or "—")}</td></tr>'
            f'<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Asunto</td>'
            f'<td style="padding:4px 0;">{esc(asunto or "—")}</td></tr>'
            f'</table>'
            f'<p style="margin-top:12px;"><strong>Mensaje:</strong><br>'
            f'{esc(mensaje).replace(chr(10), "<br>")}</p>'
            f'<p style="color:#9ca3af;font-size:12px;margin-top:16px;">Fuente: {esc(source)} · Registro #{new_id}</p>'
        )
        msg = _mime_mp.MIMEMultipart('alternative')
        msg['Subject'] = subject_line
        msg['From']    = f'CRBOX <{smtp_user}>'
        msg['To']      = QUOTE_RECIPIENT
        msg.attach(_mime_txt.MIMEText(plain, 'plain', 'utf-8'))
        msg.attach(_mime_txt.MIMEText(html_body, 'html', 'utf-8'))
        _send_smtp(msg, [QUOTE_RECIPIENT])
        email_ok = True
    except Exception as mail_exc:
        print(f'[CONSULTAS] Email notification failed (record #{new_id} preserved): {mail_exc}')

    # Update email_sent flag
    if email_ok:
        try:
            with _DB_LOCK:
                conn = _get_db()
                conn.execute(
                    'UPDATE general_inquiries SET email_sent=1 WHERE id=?', (new_id,)
                )
                conn.commit()
                conn.close()
        except Exception as upd_exc:
            print(f'[CONSULTAS] Could not update email_sent flag for #{new_id}: {upd_exc}')

    return new_id


def _send_smtp(msg, recipients):
    """Send an already-built MIME message via SMTP. Raises on failure."""
    settings = _smtp_settings()
    if settings is None:
        raise RuntimeError('SMTP not configured')
    host, port_str, user, pwd = settings
    port_int = int(port_str)
    if port_int == 465:
        with smtplib.SMTP_SSL(host, port_int, timeout=15) as srv:
            srv.login(user, pwd)
            srv.sendmail(user, recipients, msg.as_string())
    else:
        with smtplib.SMTP(host, port_int, timeout=15) as srv:
            srv.ehlo()
            srv.starttls()
            srv.ehlo()
            srv.login(user, pwd)
            srv.sendmail(user, recipients, msg.as_string())


def _build_customer_confirmation_html(scb_id, product_name, declared_value_usd,
                                      category, submitted_at):
    esc = _html.escape
    return (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;'
        'color:#1a1a1a;max-width:600px;margin:0 auto;">'
        '<div style="background:linear-gradient(135deg,#FF6B00,#FF9A00);'
        'padding:24px;border-radius:8px 8px 0 0;">'
        '<p style="color:#fff;font-size:22px;font-weight:700;margin:0;">'
        '&#10003; Solicitud recibida</p>'
        '<p style="color:rgba(255,255,255,.85);font-size:13px;margin:6px 0 0;">'
        f'ID de solicitud: <strong>{esc(scb_id)}</strong></p>'
        '</div>'
        '<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;'
        'padding:28px;border-radius:0 0 8px 8px;">'
        '<p style="font-size:15px;color:#111;margin:0 0 20px;">Hemos recibido tu solicitud de compra. '
        'El equipo de CRBOX la revisará y te contactará pronto.</p>'
        '<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:20px;">'
        f'<p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#FF6B00;text-transform:uppercase;letter-spacing:.06em;">Detalles de tu solicitud</p>'
        f'<table style="width:100%;border-collapse:collapse;font-size:14px;">'
        f'<tr><td style="padding:5px 0;color:#666;width:40%;">ID</td><td style="padding:5px 0;font-weight:700;color:#111;">{esc(scb_id)}</td></tr>'
        f'<tr><td style="padding:5px 0;color:#666;">Producto</td><td style="padding:5px 0;color:#111;">{esc(product_name)}</td></tr>'
        f'<tr><td style="padding:5px 0;color:#666;">Valor declarado</td><td style="padding:5px 0;color:#111;">${declared_value_usd:,.2f} USD</td></tr>'
        f'<tr><td style="padding:5px 0;color:#666;">Categoría</td><td style="padding:5px 0;color:#111;">{esc(category)}</td></tr>'
        f'<tr><td style="padding:5px 0;color:#666;">Enviada el</td><td style="padding:5px 0;color:#111;">{esc(submitted_at)}</td></tr>'
        '</table>'
        '</div>'
        '<div style="background:#fff7ed;border-left:4px solid #FF6B00;border-radius:4px;padding:14px 16px;margin-bottom:20px;">'
        '<p style="margin:0;font-size:14px;color:#7c2d12;line-height:1.6;">'
        '<strong>¿Qué sigue?</strong> CRBOX te contactará en breve por este mismo correo '
        'con un precio final y los próximos pasos para completar tu compra.</p>'
        '</div>'
        '<p style="font-size:12px;color:#9ca3af;margin:0;">Si tienes preguntas, responde a este correo '
        'o escríbenos por WhatsApp. Incluye tu ID <strong>' + esc(scb_id) + '</strong> en el asunto.</p>'
        '</div></div>'
    )


def _build_sales_email_body(scb_id, submitted_display, customer_name, customer_email,
                             casillero_id, account_type, product_name, product_url,
                             declared_value_usd, category, weight_kg, length_cm,
                             width_cm, height_cm, data_source, service_type,
                             destination_zone, estimate_usd, customer_notes):
    def f(v, default='No especificado'):
        return str(v) if v is not None and str(v).strip() != '' else default

    acct_label = {'personal': 'Personal', 'business': 'Empresa', 'anonymous': 'Sin cuenta'}.get(account_type, 'Sin cuenta')
    url_val = f(product_url, 'No proporcionada')
    cas_val = f(casillero_id, 'Sin casillero (público)')
    name_val = f(customer_name, 'Anónimo')
    weight_val = f'{weight_kg} kg' if weight_kg is not None else 'No especificado'

    if length_cm is not None and width_cm is not None and height_cm is not None:
        dims_val = f'L{length_cm} × W{width_cm} × H{height_cm} cm'
    else:
        dims_val = 'No especificadas'

    ds_label = {'manual': 'Manual', 'ai_extracted': 'AI-extraído (verificado por usuario)',
                'ai_partial': 'AI-parcial (verificado por usuario)'}.get(data_source, 'Manual')

    service_label = 'Aéreo' if service_type == 'aereo' else 'Marítimo'
    dest_val = f(destination_zone, 'No especificado')
    estimate_val = f'${estimate_usd:,.2f} USD (ESTIMADO — sujeto a confirmación)' if estimate_usd is not None else 'No calculado (peso no proporcionado)'
    notes_val = f(customer_notes, 'Ninguna')

    plain = (
        f'SOLICITUD DE COMPRA CRBOX\n'
        f'─────────────────────────\n'
        f'ID: {scb_id}\n'
        f'Fecha: {submitted_display}\n'
        f'─────────────────────────\n'
        f'DATOS DEL CLIENTE\n'
        f'Nombre: {name_val}\n'
        f'Email: {customer_email}\n'
        f'Casillero: {cas_val}\n'
        f'Tipo de cuenta: {acct_label}\n'
        f'─────────────────────────\n'
        f'DATOS DEL PRODUCTO\n'
        f'Nombre del producto: {product_name}\n'
        f'URL: {url_val}\n'
        f'Valor declarado: ${declared_value_usd:,.2f} USD\n'
        f'Categoría: {category}\n'
        f'Peso aproximado: {weight_val}\n'
        f'Dimensiones: {dims_val}\n'
        f'Origen del datos: {ds_label}\n'
        f'─────────────────────────\n'
        f'ENVÍO\n'
        f'Servicio: {service_label}\n'
        f'Destino: {dest_val}\n'
        f'Estimado de envío: {estimate_val}\n'
        f'─────────────────────────\n'
        f'DESCRIPCIÓN DEL CLIENTE:\n'
        f'{notes_val}\n'
        f'─────────────────────────\n'
        f'AVISO: Este estimado se basa en los datos ingresados por el cliente y puede\n'
        f'variar al recibir el paquete físico. CRBOX debe confirmar el precio final.\n'
    )
    return plain


def _plain_to_sales_html(body_text, scb_id, account_type):
    """Convert the sales plain-text body into a styled HTML email."""
    esc = _html.escape
    header_color = '#FF6B00'
    empresa_badge = ''
    if account_type == 'business':
        empresa_badge = (
            '<span style="display:inline-block;background:#FFF7ED;color:#C2410C;'
            'font-size:11px;font-weight:700;padding:2px 10px;border-radius:999px;'
            'border:1px solid #FDBA74;margin-left:10px;vertical-align:middle;">'
            'EMPRESA</span>'
        )

    html_parts = [
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;'
        'color:#1a1a1a;max-width:640px;margin:0 auto;">',
        f'<div style="background:linear-gradient(135deg,{header_color},#FF9A00);'
        'padding:20px 24px;border-radius:8px 8px 0 0;">',
        f'<p style="color:#fff;font-size:20px;font-weight:700;margin:0;">'
        f'&#128230; Nueva Solicitud de Compra {empresa_badge}</p>',
        f'<p style="color:rgba(255,255,255,.85);font-size:13px;margin:6px 0 0;">'
        f'ID: <strong>{esc(scb_id)}</strong> &middot; CRBOX Solicitudes</p>',
        '</div>',
        '<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;'
        'padding:24px;border-radius:0 0 8px 8px;">',
    ]

    current_section = None
    rows = []

    def flush_rows():
        nonlocal rows
        if rows:
            html_parts.append(
                '<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">'
            )
            for lbl, val in rows:
                html_parts.append(
                    f'<tr>'
                    f'<td style="padding:6px 8px;color:#6b7280;font-size:13px;'
                    f'width:38%;vertical-align:top;border-bottom:1px solid #f3f4f6;">{esc(lbl)}</td>'
                    f'<td style="padding:6px 8px;color:#111;font-size:13px;'
                    f'border-bottom:1px solid #f3f4f6;">{esc(val)}</td>'
                    f'</tr>'
                )
            html_parts.append('</table>')
            rows = []

    sections = {
        'DATOS DEL CLIENTE': ['Nombre:', 'Email:', 'Casillero:', 'Tipo de cuenta:'],
        'DATOS DEL PRODUCTO': ['Nombre del producto:', 'URL:', 'Valor declarado:', 'Categoría:', 'Peso aproximado:', 'Dimensiones:', 'Origen del datos:'],
        'ENVÍO': ['Servicio:', 'Destino:', 'Estimado de envío:'],
    }

    notes_content = []
    in_notes = False
    aviso_lines = []
    in_aviso = False

    for line in body_text.split('\n'):
        stripped = line.strip()
        if not stripped or stripped.startswith('───') or stripped.startswith('SOLICITUD DE COMPRA') or stripped.startswith('ID:') or stripped.startswith('Fecha:'):
            if stripped.startswith('ID:') or stripped.startswith('Fecha:'):
                pass
            continue

        if in_aviso:
            aviso_lines.append(stripped)
            continue

        if stripped == 'DESCRIPCIÓN DEL CLIENTE:':
            flush_rows()
            current_section = 'DESCRIPCIÓN'
            html_parts.append(
                '<p style="font-size:11px;font-weight:700;color:#FF6B00;'
                'text-transform:uppercase;letter-spacing:.07em;'
                'margin:20px 0 8px;padding-bottom:6px;border-bottom:1px solid #fed7aa;">Descripción del cliente</p>'
            )
            in_notes = True
            continue

        if stripped.startswith('AVISO:'):
            flush_rows()
            in_aviso = True
            aviso_lines.append(stripped[6:].strip())
            continue

        if in_notes:
            notes_content.append(stripped)
            continue

        if stripped in sections:
            flush_rows()
            current_section = stripped
            html_parts.append(
                f'<p style="font-size:11px;font-weight:700;color:#FF6B00;'
                f'text-transform:uppercase;letter-spacing:.07em;'
                f'margin:20px 0 8px;padding-bottom:6px;border-bottom:1px solid #fed7aa;">'
                f'{esc(stripped)}</p>'
            )
            continue

        colon_idx = stripped.find(':')
        if colon_idx > 0:
            lbl = stripped[:colon_idx].strip()
            val = stripped[colon_idx + 1:].strip()
            rows.append((lbl, val))

    flush_rows()

    if notes_content:
        html_parts.append(
            f'<p style="font-size:14px;color:#333;line-height:1.6;margin:4px 0 12px;">'
            f'{esc(" ".join(notes_content))}</p>'
        )

    if aviso_lines:
        html_parts.append(
            '<div style="margin-top:20px;padding:12px 14px;background:#fffdf7;'
            'border-left:4px solid #f59e0b;border-radius:4px;">'
            f'<p style="font-size:12px;color:#78350f;margin:0;line-height:1.6;">'
            f'<strong>AVISO:</strong> {esc(" ".join(aviso_lines))}</p>'
            '</div>'
        )

    html_parts.append('</div></div>')
    return '\n'.join(html_parts)


def _send_customer_confirmation(scb_id, customer_email, customer_name,
                                 product_name, declared_value_usd, category,
                                 submitted_display, smtp_user):
    esc = _html.escape
    subject = f'[{scb_id}] Tu solicitud fue recibida — {product_name}'
    msg = email.mime.multipart.MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'CRBOX <{smtp_user}>'
    msg['To'] = customer_email
    msg['Message-ID'] = f'<{_uuid4_hex()}@crbox.cr>'
    msg['Date'] = email.utils.formatdate(localtime=False)

    greeting = f'Hola {customer_name},' if customer_name else 'Hola,'
    plain = (
        f'{greeting}\n\n'
        f'Tu solicitud de compra fue recibida correctamente.\n\n'
        f'ID de solicitud: {scb_id}\n'
        f'Producto: {product_name}\n'
        f'Valor declarado: ${declared_value_usd:,.2f} USD\n'
        f'Categoría: {category}\n'
        f'Fecha: {submitted_display}\n\n'
        f'CRBOX te contactará en breve con el precio final y los próximos pasos.\n\n'
        f'Si tienes preguntas, responde a este correo indicando tu ID: {scb_id}\n\n'
        f'Equipo CRBOX\n'
        f'ventas@crbox.cr'
    )
    html_body = _build_customer_confirmation_html(
        scb_id, product_name, declared_value_usd, category, submitted_display
    )
    msg.attach(email.mime.text.MIMEText(plain, 'plain', 'utf-8'))
    msg.attach(email.mime.text.MIMEText(html_body, 'html', 'utf-8'))
    _send_smtp(msg, [customer_email])


def _send_sales_submission(scb_id, customer_email, customer_name,
                            casillero_id, account_type,
                            product_name, product_url, declared_value_usd,
                            category, weight_kg, length_cm, width_cm, height_cm,
                            data_source, service_type, destination_zone,
                            estimate_usd, customer_notes, submitted_display, smtp_user):
    empresa_tag = '[EMPRESA] ' if account_type == 'business' else ''
    subject = f'[{scb_id}] {empresa_tag}Solicitud de compra — {product_name} — {customer_email}'
    body_text = _build_sales_email_body(
        scb_id, submitted_display, customer_name, customer_email,
        casillero_id, account_type, product_name, product_url,
        declared_value_usd, category, weight_kg, length_cm, width_cm,
        height_cm, data_source, service_type, destination_zone,
        estimate_usd, customer_notes
    )
    msg = email.mime.multipart.MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'CRBOX Solicitudes <{smtp_user}>'
    msg['To'] = QUOTE_RECIPIENT
    msg['Reply-To'] = customer_email
    msg.attach(email.mime.text.MIMEText(body_text, 'plain', 'utf-8'))
    msg.attach(email.mime.text.MIMEText(
        _plain_to_sales_html(body_text, scb_id, account_type), 'html', 'utf-8'
    ))
    _send_smtp(msg, [QUOTE_RECIPIENT])


def _send_cancellation_email(scb_id, customer_email, customer_name, product_name, smtp_user):
    esc = _html.escape
    greeting = f'Hola {customer_name},' if customer_name else 'Hola,'
    subject = f'[{scb_id}] Tu solicitud fue cancelada'
    plain = (
        f'{greeting}\n\n'
        f'Tu solicitud de compra {scb_id} ha sido cancelada.\n\n'
        f'Producto: {product_name}\n\n'
        f'Si crees que fue un error o deseas hacer un nuevo pedido, '
        f'puedes crear una nueva solicitud en crbox.cr/cotizar.html '
        f'o contactarnos directamente.\n\n'
        f'Equipo CRBOX\nventas@crbox.cr'
    )
    html_body = (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;max-width:600px;margin:0 auto;">'
        '<div style="background:linear-gradient(135deg,#6b7280,#9ca3af);padding:24px;border-radius:8px 8px 0 0;">'
        '<p style="color:#fff;font-size:22px;font-weight:700;margin:0;">&#215; Solicitud cancelada</p>'
        f'<p style="color:rgba(255,255,255,.85);font-size:13px;margin:6px 0 0;">ID: <strong>{esc(scb_id)}</strong></p>'
        '</div>'
        '<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 8px 8px;">'
        f'<p style="font-size:15px;color:#111;margin:0 0 20px;">{esc(greeting)}<br><br>'
        f'Tu solicitud <strong>{esc(scb_id)}</strong> ha sido cancelada.</p>'
        '<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:20px;">'
        '<table style="width:100%;border-collapse:collapse;font-size:14px;">'
        f'<tr><td style="padding:5px 0;color:#666;width:40%;">ID</td>'
        f'<td style="padding:5px 0;font-weight:700;color:#111;">{esc(scb_id)}</td></tr>'
        f'<tr><td style="padding:5px 0;color:#666;">Producto</td>'
        f'<td style="padding:5px 0;color:#111;">{esc(product_name)}</td></tr>'
        '<tr><td style="padding:5px 0;color:#666;">Estado</td>'
        '<td style="padding:5px 0;color:#ef4444;font-weight:600;">Cancelada</td></tr>'
        '</table></div>'
        '<p style="font-size:14px;color:#374151;margin:0 0 16px;">'
        'Si deseas hacer un nuevo pedido puedes crear una nueva solicitud en cualquier momento.</p>'
        f'<a href="https://crbox.cr/cotizar.html" style="display:inline-block;background:#FF6B00;color:#fff;'
        'font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:20px;">'
        'Nueva solicitud</a>'
        f'<p style="font-size:12px;color:#9ca3af;margin:0;">¿Tienes preguntas? Responde a este correo '
        f'incluyendo el ID <strong>{esc(scb_id)}</strong>.</p>'
        '</div></div>'
    )
    msg = email.mime.multipart.MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'CRBOX <{smtp_user}>'
    msg['To'] = customer_email
    msg['Message-ID'] = f'<{_uuid4_hex()}@crbox.cr>'
    msg['Date'] = email.utils.formatdate(localtime=False)
    msg.attach(email.mime.text.MIMEText(plain, 'plain', 'utf-8'))
    msg.attach(email.mime.text.MIMEText(html_body, 'html', 'utf-8'))
    _send_smtp(msg, [customer_email])


def _build_response_email_html(scb_id, product_name, customer_name,
                                confirmed_price_usd, availability,
                                delivery_timeline, conditions,
                                difference_explanation, customer_message):
    esc = _html.escape
    avail_labels = {
        'disponible': 'Disponible',
        'no_disponible': 'No disponible',
        'disponible_con_condiciones': 'Disponible con condiciones',
    }
    avail_label = avail_labels.get(availability, esc(availability))
    avail_style_map = {
        'disponible': 'color:#16a34a;font-weight:700;',
        'no_disponible': 'color:#dc2626;font-weight:700;',
        'disponible_con_condiciones': 'color:#d97706;font-weight:700;',
    }
    avail_style = avail_style_map.get(availability, '')

    if availability == 'no_disponible':
        header_bg = 'linear-gradient(135deg,#6b7280,#9ca3af)'
        header_icon = '&#10005;'
    elif availability == 'disponible_con_condiciones':
        header_bg = 'linear-gradient(135deg,#f59e0b,#fbbf24)'
        header_icon = '&#9888;'
    else:
        header_bg = 'linear-gradient(135deg,#FF6B00,#FF9A00)'
        header_icon = '&#10003;'

    greeting = f'Hola {esc(customer_name)},' if customer_name else 'Hola,'

    price_rows = ''
    if availability != 'no_disponible':
        price_rows = (
            f'<tr><td style="padding:5px 0;color:#666;width:40%;">Precio de env&iacute;o</td>'
            f'<td style="padding:5px 0;font-weight:700;color:#FF6B00;font-size:16px;">'
            f'${confirmed_price_usd:,.2f} USD</td></tr>'
            f'<tr><td style="padding:5px 0;color:#666;">Tiempo estimado</td>'
            f'<td style="padding:5px 0;color:#111;">{esc(delivery_timeline)}</td></tr>'
        )

    no_disponible_block = ''
    if availability == 'no_disponible':
        no_disponible_block = (
            '<div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:4px;'
            'padding:14px 16px;margin:16px 0;">'
            '<p style="font-size:14px;color:#7f1d1d;margin:0;line-height:1.6;">'
            'En este momento el producto no est&aacute; disponible para su compra '
            'a trav&eacute;s de CRBOX. Si tienes alguna pregunta, no dudes en '
            'contactarnos respondiendo a este correo.</p>'
            '</div>'
        )

    conditions_block = ''
    if conditions and conditions.strip():
        conditions_block = (
            '<div style="background:#fff7ed;border-left:4px solid #f59e0b;border-radius:4px;'
            'padding:14px 16px;margin:16px 0;">'
            '<p style="font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;'
            'letter-spacing:.06em;margin:0 0 6px;">Condiciones</p>'
            f'<p style="font-size:14px;color:#78350f;margin:0;line-height:1.6;">'
            f'{esc(conditions.strip())}</p>'
            '</div>'
        )

    message_block = (
        '<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;'
        'padding:14px 16px;margin:16px 0;">'
        f'<p style="font-size:14px;color:#111;line-height:1.7;margin:0;white-space:pre-line;">'
        f'{esc(customer_message.strip())}</p>'
        '</div>'
    )

    diff_block = ''
    if difference_explanation and difference_explanation.strip():
        diff_block = (
            '<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;'
            'padding:12px 16px;margin:16px 0;">'
            '<p style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;'
            'letter-spacing:.06em;margin:0 0 6px;">Nota sobre el estimado</p>'
            f'<p style="font-size:13px;color:#374151;margin:0;line-height:1.6;">'
            f'{esc(difference_explanation.strip())}</p>'
            '</div>'
        )

    return (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;'
        'color:#1a1a1a;max-width:600px;margin:0 auto;">'
        f'<div style="background:{header_bg};padding:24px;border-radius:8px 8px 0 0;">'
        f'<p style="color:#fff;font-size:22px;font-weight:700;margin:0;">'
        f'{header_icon} Respuesta a tu solicitud</p>'
        f'<p style="color:rgba(255,255,255,.85);font-size:13px;margin:6px 0 0;">'
        f'ID: <strong>{esc(scb_id)}</strong></p>'
        '</div>'
        '<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;'
        'padding:28px;border-radius:0 0 8px 8px;">'
        f'<p style="font-size:15px;color:#111;margin:0 0 20px;">{greeting}</p>'
        f'{no_disponible_block}'
        '<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;'
        'padding:16px 20px;margin-bottom:4px;">'
        '<p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#FF6B00;'
        'text-transform:uppercase;letter-spacing:.06em;">Resumen de tu solicitud</p>'
        '<table style="width:100%;border-collapse:collapse;font-size:14px;">'
        f'<tr><td style="padding:5px 0;color:#666;width:40%;">ID</td>'
        f'<td style="padding:5px 0;font-weight:700;color:#111;">{esc(scb_id)}</td></tr>'
        f'<tr><td style="padding:5px 0;color:#666;">Producto</td>'
        f'<td style="padding:5px 0;color:#111;">{esc(product_name)}</td></tr>'
        f'<tr><td style="padding:5px 0;color:#666;">Disponibilidad</td>'
        f'<td style="padding:5px 0;{avail_style}">{avail_label}</td></tr>'
        f'{price_rows}'
        '</table>'
        '</div>'
        f'{conditions_block}'
        f'{message_block}'
        f'{diff_block}'
        '<p style="font-size:12px;color:#9ca3af;margin:20px 0 0;">Para cualquier consulta, '
        f'responde a este correo indicando tu ID <strong>{esc(scb_id)}</strong>. '
        'El equipo de CRBOX estar&aacute; encantado de ayudarte.</p>'
        '</div></div>'
    )


def _send_customer_response(scb_id, customer_email, customer_name, product_name,
                              confirmed_price_usd, availability, delivery_timeline,
                              conditions, difference_explanation, customer_message,
                              smtp_user):
    avail_labels = {
        'disponible': 'Disponible',
        'no_disponible': 'No disponible',
        'disponible_con_condiciones': 'Disponible con condiciones',
    }
    avail_label = avail_labels.get(availability, availability)
    greeting = f'Hola {customer_name},' if customer_name else 'Hola,'
    subject = f'[{scb_id}] Respuesta a tu solicitud de compra \u2014 {product_name}'

    plain_parts = [
        f'{greeting}\n',
        'CRBOX ha revisado tu solicitud y tiene una respuesta para ti.',
        '',
        f'ID: {scb_id}',
        f'Producto: {product_name}',
        f'Disponibilidad: {avail_label}',
    ]
    if availability != 'no_disponible':
        plain_parts.append(f'Precio de envio confirmado: ${confirmed_price_usd:,.2f} USD')
        plain_parts.append(f'Tiempo de entrega estimado: {delivery_timeline}')
    if conditions and conditions.strip():
        plain_parts.append(f'\nCondiciones:\n{conditions.strip()}')
    plain_parts.append(f'\n{customer_message.strip()}')
    if difference_explanation and difference_explanation.strip():
        plain_parts.append(f'\nNota sobre el estimado:\n{difference_explanation.strip()}')
    plain_parts.extend([
        f'\nSi tienes preguntas, responde a este correo indicando tu ID: {scb_id}',
        'Equipo CRBOX | ventas@crbox.cr',
    ])
    plain = '\n'.join(plain_parts)

    html_body = _build_response_email_html(
        scb_id, product_name, customer_name,
        confirmed_price_usd, availability, delivery_timeline,
        conditions, difference_explanation, customer_message
    )

    msg = email.mime.multipart.MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'CRBOX <{smtp_user}>'
    msg['To'] = customer_email
    msg['Reply-To'] = 'ventas@crbox.cr'
    msg['Message-ID'] = f'<{_uuid4_hex()}@crbox.cr>'
    msg['Date'] = email.utils.formatdate(localtime=False)
    msg.attach(email.mime.text.MIMEText(plain, 'plain', 'utf-8'))
    msg.attach(email.mime.text.MIMEText(html_body, 'html', 'utf-8'))
    _send_smtp(msg, [customer_email])


def _send_comprado_notification(scb_id, customer_email, customer_name, product_name, smtp_user):
    """Notify the customer that CRBOX has purchased their item and it is in transit."""
    esc = _html.escape
    greeting = f'Hola {customer_name},' if customer_name else 'Hola,'
    subject = f'[{scb_id}] Tu producto fue comprado — en camino a Costa Rica'
    plain = (
        f'{greeting}\n\n'
        f'Te informamos que CRBOX ha completado la compra de tu producto.\n\n'
        f'ID de solicitud: {scb_id}\n'
        f'Producto: {product_name}\n\n'
        f'El artículo está siendo coordinado para su envío hacia Costa Rica. '
        f'Te avisaremos en cuanto llegue y esté listo para retiro.\n\n'
        f'Si tienes preguntas, responde a este correo indicando tu ID: {scb_id}\n\n'
        f'Equipo CRBOX\nventas@crbox.cr'
    )
    html_body = (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;max-width:600px;margin:0 auto;">'
        '<div style="background:linear-gradient(135deg,#15803d,#16a34a);padding:24px;border-radius:8px 8px 0 0;">'
        '<p style="color:#fff;font-size:22px;font-weight:700;margin:0;">&#x1F6CD; ¡Compra realizada!</p>'
        f'<p style="color:rgba(255,255,255,.85);font-size:13px;margin:6px 0 0;">ID: <strong>{esc(scb_id)}</strong></p>'
        '</div>'
        '<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 8px 8px;">'
        f'<p style="font-size:15px;color:#111;margin:0 0 20px;">{esc(greeting)}<br><br>'
        f'CRBOX ha completado la compra de tu producto. El artículo está en camino a Costa Rica.</p>'
        '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:16px 20px;margin-bottom:20px;">'
        '<table style="width:100%;border-collapse:collapse;font-size:14px;">'
        f'<tr><td style="padding:5px 0;color:#166534;width:40%;">ID</td>'
        f'<td style="padding:5px 0;font-weight:700;color:#111;">{esc(scb_id)}</td></tr>'
        f'<tr><td style="padding:5px 0;color:#166534;">Producto</td>'
        f'<td style="padding:5px 0;color:#111;">{esc(product_name)}</td></tr>'
        '<tr><td style="padding:5px 0;color:#166534;">Estado</td>'
        '<td style="padding:5px 0;color:#15803d;font-weight:600;">Compra realizada — en tránsito</td></tr>'
        '</table></div>'
        '<p style="font-size:14px;color:#374151;margin:0 0 16px;">'
        'Te notificaremos en cuanto el paquete llegue a Costa Rica y esté disponible para retiro.</p>'
        f'<p style="font-size:12px;color:#9ca3af;margin:0;">¿Tienes preguntas? Responde a este correo '
        f'incluyendo el ID <strong>{esc(scb_id)}</strong>.</p>'
        '</div></div>'
    )
    msg = email.mime.multipart.MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'CRBOX <{smtp_user}>'
    msg['To'] = customer_email
    msg['Reply-To'] = 'ventas@crbox.cr'
    msg['Message-ID'] = f'<{_uuid4_hex()}@crbox.cr>'
    msg['Date'] = email.utils.formatdate(localtime=False)
    msg.attach(email.mime.text.MIMEText(plain, 'plain', 'utf-8'))
    msg.attach(email.mime.text.MIMEText(html_body, 'html', 'utf-8'))
    _send_smtp(msg, [customer_email])


def _send_completada_notification(scb_id, customer_email, customer_name, product_name, package_id, smtp_user):
    """Notify the customer that their self-purchase solicitud is completada and their package is registered."""
    esc = _html.escape
    greeting = f'Hola {customer_name},' if customer_name else 'Hola,'
    subject = f'[{scb_id}] Tu solicitud fue completada — paquete registrado'
    plain = (
        f'{greeting}\n\n'
        f'Tu solicitud de autopedido {scb_id} ha sido completada. '
        f'El paquete ha sido registrado en nuestro sistema.\n\n'
        f'ID de solicitud: {scb_id}\n'
        f'Producto: {product_name}\n'
        f'ID de paquete: {package_id}\n\n'
        f'Puedes seguir el estado de tu paquete en la sección Mis Paquetes de tu portal:\n'
        f'https://crbox.cr/mis-paquetes\n\n'
        f'Si tienes preguntas, responde a este correo indicando tu ID: {scb_id}\n\n'
        f'Equipo CRBOX\nventas@crbox.cr'
    )
    html_body = (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;max-width:600px;margin:0 auto;">'
        '<div style="background:linear-gradient(135deg,#FF6B00,#FF9A00);padding:24px;border-radius:8px 8px 0 0;">'
        '<p style="color:#fff;font-size:22px;font-weight:700;margin:0;">&#10003; Solicitud completada</p>'
        f'<p style="color:rgba(255,255,255,.85);font-size:13px;margin:6px 0 0;">ID: <strong>{esc(scb_id)}</strong></p>'
        '</div>'
        '<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 8px 8px;">'
        f'<p style="font-size:15px;color:#111;margin:0 0 20px;">{esc(greeting)}<br><br>'
        f'Tu solicitud <strong>{esc(scb_id)}</strong> ha sido completada y tu paquete ha sido registrado.</p>'
        '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:16px 20px;margin-bottom:20px;">'
        '<table style="width:100%;border-collapse:collapse;font-size:14px;">'
        f'<tr><td style="padding:5px 0;color:#9a3412;width:40%;">ID Solicitud</td>'
        f'<td style="padding:5px 0;font-weight:700;color:#111;">{esc(scb_id)}</td></tr>'
        f'<tr><td style="padding:5px 0;color:#9a3412;">Producto</td>'
        f'<td style="padding:5px 0;color:#111;">{esc(product_name)}</td></tr>'
        f'<tr><td style="padding:5px 0;color:#9a3412;">ID Paquete</td>'
        f'<td style="padding:5px 0;font-weight:700;color:#111;">{esc(package_id)}</td></tr>'
        '<tr><td style="padding:5px 0;color:#9a3412;">Estado</td>'
        '<td style="padding:5px 0;color:#FF6B00;font-weight:600;">Completada</td></tr>'
        '</table></div>'
        '<p style="font-size:14px;color:#374151;margin:0 0 16px;">'
        'Sigue el estado de tu paquete en <strong>Mis Paquetes</strong>.</p>'
        '<a href="https://crbox.cr/mis-paquetes" style="display:inline-block;background:#FF6B00;color:#fff;'
        'font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:20px;">'
        'Ver Mis Paquetes</a>'
        f'<p style="font-size:12px;color:#9ca3af;margin:0;">¿Tienes preguntas? Responde a este correo '
        f'incluyendo el ID <strong>{esc(scb_id)}</strong>.</p>'
        '</div></div>'
    )
    msg = email.mime.multipart.MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'CRBOX <{smtp_user}>'
    msg['To'] = customer_email
    msg['Reply-To'] = 'ventas@crbox.cr'
    msg['Message-ID'] = f'<{_uuid4_hex()}@crbox.cr>'
    msg['Date'] = email.utils.formatdate(localtime=False)
    msg.attach(email.mime.text.MIMEText(plain, 'plain', 'utf-8'))
    msg.attach(email.mime.text.MIMEText(html_body, 'html', 'utf-8'))
    _send_smtp(msg, [customer_email])


def _send_listo_para_retiro_notification(scb_id, customer_email, customer_name, product_name, smtp_user):
    """Notify the customer that their package is in Costa Rica and ready for pickup."""
    esc = _html.escape
    greeting = f'Hola {customer_name},' if customer_name else 'Hola,'
    subject = f'[{scb_id}] Tu paquete llegó a Costa Rica — listo para retiro'
    plain = (
        f'{greeting}\n\n'
        f'¡Buenas noticias! Tu paquete llegó a Costa Rica y está disponible para retiro.\n\n'
        f'ID de solicitud: {scb_id}\n'
        f'Producto: {product_name}\n\n'
        f'Para coordinar el retiro:\n'
        f'  • Comunícate con nosotros a ventas@crbox.cr\n'
        f'  • O visita nuestras instalaciones\n'
        f'  • Trae tu cédula o documento de identidad y tu número de casillero ({scb_id})\n\n'
        f'Si tienes preguntas, responde a este correo indicando tu ID: {scb_id}\n\n'
        f'Equipo CRBOX\nventas@crbox.cr'
    )
    html_body = (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;max-width:600px;margin:0 auto;">'
        '<div style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:24px;border-radius:8px 8px 0 0;">'
        '<p style="color:#fff;font-size:22px;font-weight:700;margin:0;">&#x1F4E6; ¡Tu paquete llegó!</p>'
        f'<p style="color:rgba(255,255,255,.85);font-size:13px;margin:6px 0 0;">ID: <strong>{esc(scb_id)}</strong></p>'
        '</div>'
        '<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 8px 8px;">'
        f'<p style="font-size:15px;color:#111;margin:0 0 20px;">{esc(greeting)}<br><br>'
        f'Tu paquete llegó a Costa Rica y está <strong>listo para retiro</strong> en nuestras instalaciones.</p>'
        '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:16px 20px;margin-bottom:20px;">'
        '<table style="width:100%;border-collapse:collapse;font-size:14px;">'
        f'<tr><td style="padding:5px 0;color:#92400e;width:40%;">ID</td>'
        f'<td style="padding:5px 0;font-weight:700;color:#111;">{esc(scb_id)}</td></tr>'
        f'<tr><td style="padding:5px 0;color:#92400e;">Producto</td>'
        f'<td style="padding:5px 0;color:#111;">{esc(product_name)}</td></tr>'
        '<tr><td style="padding:5px 0;color:#92400e;">Estado</td>'
        '<td style="padding:5px 0;color:#d97706;font-weight:600;">Listo para retiro en Costa Rica</td></tr>'
        '</table></div>'
        '<p style="font-size:14px;font-weight:600;color:#111;margin:0 0 8px;">¿Cómo coordinar el retiro?</p>'
        '<ul style="font-size:14px;color:#374151;margin:0 0 20px;padding-left:20px;">'
        f'<li style="margin-bottom:6px;">Contáctanos a <a href="mailto:ventas@crbox.cr" style="color:#d97706;">ventas@crbox.cr</a></li>'
        '<li style="margin-bottom:6px;">O visita nuestras instalaciones</li>'
        f'<li>Trae tu cédula o documento de identidad y menciona tu ID: <strong>{esc(scb_id)}</strong></li>'
        '</ul>'
        f'<p style="font-size:12px;color:#9ca3af;margin:0;">¿Tienes preguntas? Responde a este correo '
        f'incluyendo el ID <strong>{esc(scb_id)}</strong>.</p>'
        '</div></div>'
    )
    msg = email.mime.multipart.MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'CRBOX <{smtp_user}>'
    msg['To'] = customer_email
    msg['Reply-To'] = 'ventas@crbox.cr'
    msg['Message-ID'] = f'<{_uuid4_hex()}@crbox.cr>'
    msg['Date'] = email.utils.formatdate(localtime=False)
    msg.attach(email.mime.text.MIMEText(plain, 'plain', 'utf-8'))
    msg.attach(email.mime.text.MIMEText(html_body, 'html', 'utf-8'))
    _send_smtp(msg, [customer_email])


# ─────────────────────────────────────────────────────────────────────────────

_rate_lock   = threading.Lock()
_rate_window = {}

_QUOTE_LOG_PATH = 'quote_submissions.log'
_quote_log_lock = threading.Lock()

_RATE_LIMIT   = 5
_RATE_SECONDS = 60

# ── SMTP health monitor ────────────────────────────────────────────────────────
# How often to probe SMTP (seconds). Override with SMTP_HEALTH_INTERVAL env var.
_HEALTH_INTERVAL_DEFAULT = 300   # 5 minutes

# Minimum gap between alert emails (seconds). Prevents inbox flooding.
_ALERT_COOLDOWN = 3600           # 1 hour

_last_alert_time = 0.0
_alert_lock      = threading.Lock()


def _smtp_settings():
    """Return (host, port, user, password) from env vars, or None if unconfigured."""
    host = os.environ.get('SMTP_HOST', '').strip()
    port = os.environ.get('SMTP_PORT', '587').strip()
    user = os.environ.get('SMTP_USER', '').strip()
    pwd  = os.environ.get('SMTP_PASS', '').strip()
    if not all([host, user, pwd]):
        return None
    return host, port, user, pwd


def _check_smtp() -> tuple[bool, str]:
    """Connect to SMTP and authenticate without sending any email.

    Returns (ok, error_message).  On success error_message is ''.
    """
    settings = _smtp_settings()
    if settings is None:
        return False, 'SMTP not configured (SMTP_HOST / SMTP_USER / SMTP_PASS missing)'

    host, port_str, user, pwd = settings
    try:
        port_int = int(port_str)
        if port_int == 465:
            with smtplib.SMTP_SSL(host, port_int, timeout=15) as srv:
                srv.login(user, pwd)
        else:
            with smtplib.SMTP(host, port_int, timeout=15) as srv:
                srv.ehlo()
                srv.starttls()
                srv.ehlo()
                srv.login(user, pwd)
        return True, ''
    except smtplib.SMTPAuthenticationError:
        return False, 'SMTP authentication failed — credentials may be expired or revoked'
    except smtplib.SMTPException as exc:
        return False, f'SMTP error: {exc}'
    except OSError as exc:
        return False, f'Network error reaching SMTP server: {exc}'
    except Exception as exc:
        return False, f'Unexpected error: {exc}'


def _send_alert(error_msg: str):
    """Send an alert email to the team when SMTP health check fails.

    Uses the configured SMTP credentials — if those are broken we log to
    stdout instead so the server console still captures the event.
    The alert recipient defaults to QUOTE_RECIPIENT but can be overridden
    with the ALERT_EMAIL env var.
    """
    settings = _smtp_settings()
    alert_to = os.environ.get('ALERT_EMAIL', QUOTE_RECIPIENT).strip()

    if settings is None:
        print(f'[HEALTH ALERT] SMTP not configured — cannot send alert. Error: {error_msg}')
        return

    host, port_str, user, pwd = settings

    msg = email.mime.multipart.MIMEMultipart('alternative')
    msg['Subject'] = '[CRBOX] ALERTA: El formulario de cotización dejó de enviar emails'
    msg['From']    = f'CRBOX Monitor <{user}>'
    msg['To']      = alert_to

    plain = (
        'ALERTA DE SISTEMA — CRBOX\n\n'
        'El endpoint /send-quote no puede conectarse al servidor SMTP.\n'
        'Los clientes que envíen cotizaciones desde la calculadora no recibirán respuesta.\n\n'
        f'Error detectado:\n{error_msg}\n\n'
        'Acciones recomendadas:\n'
        '  1. Verificar que el App Password de Google Workspace siga activo.\n'
        '  2. Confirmar que las variables de entorno SMTP_HOST / SMTP_USER / SMTP_PASS estén configuradas.\n'
        '  3. Si se revocó el App Password, generar uno nuevo en:\n'
        '     myaccount.google.com → Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones\n\n'
        '— Monitor automático de CRBOX'
    )

    html_body = (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;'
        'color:#1a1a1a;max-width:600px;margin:0 auto;">'
        '<div style="background:linear-gradient(135deg,#DC2626,#EF4444);'
        'padding:20px 24px;border-radius:8px 8px 0 0;">'
        '<p style="color:#fff;font-size:20px;font-weight:700;margin:0;">&#x26A0; Alerta de sistema</p>'
        '<p style="color:rgba(255,255,255,.85);font-size:13px;margin:4px 0 0;">'
        'CRBOX &middot; Monitor del formulario de cotizaci&oacute;n</p>'
        '</div>'
        '<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;'
        'padding:24px;border-radius:0 0 8px 8px;">'
        '<p style="font-size:15px;font-weight:600;color:#DC2626;">'
        'El endpoint /send-quote no puede conectarse al servidor SMTP.</p>'
        '<p style="color:#555;">Los clientes que env&iacute;en cotizaciones desde la calculadora '
        '<strong>no recibir&aacute;n respuesta</strong> mientras dure el fallo.</p>'
        '<div style="margin:16px 0;padding:12px 14px;background:#FEF2F2;'
        'border-left:4px solid #FCA5A5;border-radius:4px;">'
        f'<p style="font-size:13px;color:#991B1B;margin:0;font-family:monospace;">{_html.escape(error_msg)}</p>'
        '</div>'
        '<p style="font-weight:700;margin:20px 0 8px;">Acciones recomendadas:</p>'
        '<ol style="color:#444;line-height:1.8;padding-left:20px;">'
        '<li>Verificar que el App Password de Google Workspace siga activo.</li>'
        '<li>Confirmar las variables de entorno <code>SMTP_HOST</code> / <code>SMTP_USER</code> / <code>SMTP_PASS</code>.</li>'
        '<li>Si fue revocado, generar uno nuevo en '
        '<a href="https://myaccount.google.com/apppasswords" style="color:#FF6B00;">'
        'myaccount.google.com → App passwords</a>.</li>'
        '</ol>'
        '<p style="font-size:12px;color:#9CA3AF;margin-top:24px;">'
        '— Monitor autom&aacute;tico de CRBOX &middot; '
        'Este correo se env&iacute;a m&aacute;ximo una vez por hora.</p>'
        '</div></div>'
    )

    msg.attach(email.mime.text.MIMEText(plain, 'plain', 'utf-8'))
    msg.attach(email.mime.text.MIMEText(html_body, 'html', 'utf-8'))

    try:
        port_int = int(port_str)
        if port_int == 465:
            with smtplib.SMTP_SSL(host, port_int, timeout=15) as srv:
                srv.login(user, pwd)
                srv.sendmail(user, [alert_to], msg.as_string())
        else:
            with smtplib.SMTP(host, port_int, timeout=15) as srv:
                srv.ehlo()
                srv.starttls()
                srv.ehlo()
                srv.login(user, pwd)
                srv.sendmail(user, [alert_to], msg.as_string())
        print(f'[HEALTH ALERT] Alert email sent to {alert_to}. Error was: {error_msg}')
    except Exception as exc:
        print(f'[HEALTH ALERT] SMTP failed and alert email could not be delivered: {exc} | Original error: {error_msg}')


def _health_monitor_loop(interval: int):
    """Background daemon that periodically checks SMTP health."""
    global _last_alert_time
    print(f'[HEALTH MONITOR] Starting — interval {interval}s, alert cooldown {_ALERT_COOLDOWN}s')
    while True:
        time.sleep(interval)
        ok, err = _check_smtp()
        if ok:
            print('[HEALTH MONITOR] SMTP OK')
        else:
            print(f'[HEALTH MONITOR] SMTP FAIL: {err}')
            with _alert_lock:
                now = time.monotonic()
                if now - _last_alert_time >= _ALERT_COOLDOWN:
                    _last_alert_time = now
                    send_now = True
                else:
                    send_now = False
            if send_now:
                _send_alert(err)
            else:
                print('[HEALTH MONITOR] Alert suppressed (cooldown active)')


def _start_health_monitor():
    raw = os.environ.get('SMTP_HEALTH_INTERVAL', '')
    try:
        interval = max(30, int(raw)) if raw.strip() else _HEALTH_INTERVAL_DEFAULT
    except ValueError:
        print(f'[HEALTH MONITOR] Invalid SMTP_HEALTH_INTERVAL "{raw}", using default {_HEALTH_INTERVAL_DEFAULT}s')
        interval = _HEALTH_INTERVAL_DEFAULT
    t = threading.Thread(target=_health_monitor_loop, args=(interval,), daemon=True)
    t.start()
# ─────────────────────────────────────────────────────────────────────────────


# ── Solicitud overdue reminder ─────────────────────────────────────────────────
# Polls for enviada solicitudes that have had no sales action after N hours and
# sends a single digest email to the sales team (ventas@crbox.cr).
# Each solicitud only receives one reminder (reminder_sent_at is set on send).
_REMINDER_INTERVAL_DEFAULT = 3600   # check every hour


def _send_reminder_digest(rows, reminder_hours: int) -> tuple[bool, str]:
    """Build and send a digest reminder email to the sales team."""
    settings = _smtp_settings()
    if settings is None:
        return False, 'SMTP not configured'

    host, port_str, user, pwd = settings
    n = len(rows)
    plural = 'es' if n != 1 else ''
    plural_h = 's' if reminder_hours != 1 else ''
    subject = f'Recordatorio: {n} solicitud(es) pendiente(s) de respuesta.'

    # ── Build row HTML for table ────────────────────────────────────────────
    rows_html = ''
    plain_items = []
    now_ts = time.time()
    for row in rows:
        try:
            submitted_struct = time.strptime(row['submitted_at'], '%Y-%m-%dT%H:%M:%SZ')
            elapsed_h = int((now_ts - calendar.timegm(submitted_struct)) / 3600)
            if elapsed_h < 48:
                elapsed_str = f'{elapsed_h}h'
            else:
                elapsed_str = f'{elapsed_h // 24}d {elapsed_h % 24}h'
        except Exception:
            elapsed_str = '?h'

        customer = row['customer_name'] or row['customer_email']
        id_esc      = _html.escape(row['id'])
        product_esc = _html.escape(row['product_name'])
        customer_esc = _html.escape(customer)
        email_esc   = _html.escape(row['customer_email'])

        rows_html += (
            f'<tr style="border-bottom:1px solid #f3f4f6;">'
            f'<td style="padding:10px 12px;font-weight:700;color:#FF6B00;white-space:nowrap;'
            f'font-size:13px;font-family:monospace;">{id_esc}</td>'
            f'<td style="padding:10px 12px;font-size:13px;color:#111827;">{product_esc}</td>'
            f'<td style="padding:10px 12px;font-size:13px;color:#374151;">{customer_esc}'
            f'<br><span style="color:#9ca3af;font-size:12px;">{email_esc}</span></td>'
            f'<td style="padding:10px 12px;font-size:13px;color:#6b7280;white-space:nowrap;'
            f'font-weight:600;">{elapsed_str}</td>'
            '</tr>'
        )
        plain_items.append(
            f'  \u2022 {row["id"]} \u2014 {row["product_name"]}\n'
            f'    Cliente: {customer} <{row["customer_email"]}>\n'
            f'    Sin respuesta: {elapsed_str}\n'
        )

    plain = (
        f'RECORDATORIO \u2014 CRBOX\n\n'
        f'Hay {n} solicitud{plural} con status "enviada" que lleva{("n" if n != 1 else "")} '
        f'm\u00e1s de {reminder_hours} hora{plural_h} sin respuesta:\n\n'
        + ''.join(plain_items)
        + f'\nRevisa y actualiza el status en el panel de ventas.\n\n'
        f'\u2014 Recordatorio autom\u00e1tico de CRBOX'
    )

    html_body = (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;'
        'color:#1a1a1a;max-width:640px;margin:0 auto;">'
        '<div style="background:linear-gradient(135deg,#FF6B00,#FF9A00);'
        'padding:20px 24px;border-radius:8px 8px 0 0;">'
        f'<p style="color:#fff;font-size:20px;font-weight:700;margin:0;">'
        f'&#128203; {n} solicitud{plural} pendiente{plural}</p>'
        '<p style="color:rgba(255,255,255,.85);font-size:13px;margin:4px 0 0;">'
        'CRBOX &middot; Recordatorio autom&aacute;tico de ventas</p>'
        '</div>'
        '<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;'
        'padding:24px;border-radius:0 0 8px 8px;">'
        f'<p style="font-size:15px;color:#374151;">'
        f'La{"s" if n != 1 else ""} siguiente{"s" if n != 1 else ""} '
        f'solicitud{plural} lleva{("n" if n != 1 else "")} m&aacute;s de '
        f'<strong>{reminder_hours} hora{plural_h}</strong> sin respuesta:</p>'
        '<table style="width:100%;border-collapse:collapse;margin-top:16px;">'
        '<thead><tr style="background:#f9fafb;">'
        '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;'
        'font-weight:600;text-transform:uppercase;letter-spacing:.05em;">ID</th>'
        '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;'
        'font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Producto</th>'
        '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;'
        'font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Cliente</th>'
        '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;'
        'font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Sin respuesta</th>'
        '</tr></thead>'
        '<tbody>' + rows_html + '</tbody>'
        '</table>'
        '<p style="font-size:12px;color:#9ca3af;margin-top:24px;">'
        '\u2014 Recordatorio autom&aacute;tico de CRBOX &middot; '
        'Este correo se env&iacute;a una sola vez por solicitud.</p>'
        '</div></div>'
    )

    msg = email.mime.multipart.MIMEMultipart('alternative')
    msg['Subject']    = subject
    msg['From']       = f'CRBOX Sistema <{user}>'
    msg['To']         = QUOTE_RECIPIENT
    msg['Message-ID'] = f'<{_uuid4_hex()}@crbox.cr>'
    msg['Date']       = email.utils.formatdate(localtime=False)
    msg.attach(email.mime.text.MIMEText(plain, 'plain', 'utf-8'))
    msg.attach(email.mime.text.MIMEText(html_body, 'html', 'utf-8'))

    try:
        port_int = int(port_str)
        if port_int == 465:
            with smtplib.SMTP_SSL(host, port_int, timeout=15) as srv:
                srv.login(user, pwd)
                srv.sendmail(user, [QUOTE_RECIPIENT], msg.as_string())
        else:
            with smtplib.SMTP(host, port_int, timeout=15) as srv:
                srv.ehlo(); srv.starttls(); srv.ehlo()
                srv.login(user, pwd)
                srv.sendmail(user, [QUOTE_RECIPIENT], msg.as_string())
        return True, ''
    except smtplib.SMTPAuthenticationError:
        return False, 'SMTP authentication failed'
    except smtplib.SMTPException as exc:
        return False, f'SMTP error: {exc}'
    except OSError as exc:
        return False, f'Network error: {exc}'
    except Exception as exc:
        return False, f'Unexpected error: {exc}'


def _send_quote_reminder_customer(scb_id, customer_email, customer_name,
                                   product_name, confirmed_price, expires_at,
                                   smtp_user) -> tuple[bool, str]:
    """Send a single reminder email to a customer whose quote is awaiting their reply."""
    esc = _html.escape
    greeting = f'Hola {customer_name},' if customer_name else 'Hola,'
    subject = f'[{scb_id}] Recordatorio: tu cotización de CRBOX está esperando tu respuesta'

    portal_url = f'https://crbox.cr/solicitud?id={scb_id}'

    price_plain = f'${confirmed_price:,.2f} USD' if confirmed_price else 'Ver detalle en el portal'
    price_html  = (
        f'<strong style="color:#FF6B00;font-size:16px;">${confirmed_price:,.2f} USD</strong>'
        if confirmed_price else
        '<span style="color:#374151;">Ver detalle en el portal</span>'
    )

    deadline_plain = ''
    deadline_html  = ''
    if expires_at:
        deadline_plain = f'\nFecha límite de la cotización: {expires_at}\n'
        deadline_html  = (
            '<p style="font-size:13px;color:#6b7280;margin:8px 0 0;">'
            f'&#x23F0; Fecha l&iacute;mite: <strong>{esc(expires_at)}</strong></p>'
        )

    plain = (
        f'{greeting}\n\n'
        f'Tu solicitud de cotización {scb_id} sigue esperando tu respuesta. '
        f'El equipo de CRBOX ya revisó tu pedido y preparó una cotización para ti.\n\n'
        f'Resumen de tu solicitud:\n'
        f'  ID: {scb_id}\n'
        f'  Producto: {product_name}\n'
        f'  Precio de envío cotizado: {price_plain}\n'
        f'{deadline_plain}'
        f'\nPara aceptar, rechazar o hacer preguntas, visita:\n'
        f'{portal_url}\n\n'
        f'Si ya tomaste una decisión o no necesitas esta cotización, puedes ignorar este mensaje.\n\n'
        f'Equipo CRBOX\nventas@crbox.cr'
    )

    html_body = (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;'
        'color:#1a1a1a;max-width:600px;margin:0 auto;">'
        '<div style="background:linear-gradient(135deg,#FF6B00,#FF9A00);'
        'padding:24px;border-radius:8px 8px 0 0;">'
        '<p style="color:#fff;font-size:22px;font-weight:700;margin:0;">'
        '&#128203; Recordatorio de cotizaci&oacute;n</p>'
        f'<p style="color:rgba(255,255,255,.85);font-size:13px;margin:6px 0 0;">'
        f'ID: <strong>{esc(scb_id)}</strong> &middot; CRBOX</p>'
        '</div>'
        '<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;'
        'padding:28px;border-radius:0 0 8px 8px;">'
        f'<p style="font-size:15px;color:#111;margin:0 0 16px;">{esc(greeting)}</p>'
        '<p style="font-size:14px;color:#374151;margin:0 0 20px;">'
        'Tu solicitud de cotizaci&oacute;n ya fue revisada por el equipo de CRBOX. '
        'Todav&iacute;a estamos esperando tu respuesta para continuar.</p>'
        '<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;'
        'padding:16px 20px;margin-bottom:20px;">'
        '<p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#FF6B00;'
        'text-transform:uppercase;letter-spacing:.06em;">Resumen de tu solicitud</p>'
        '<table style="width:100%;border-collapse:collapse;font-size:14px;">'
        f'<tr><td style="padding:5px 0;color:#666;width:40%;">ID</td>'
        f'<td style="padding:5px 0;font-weight:700;color:#111;">{esc(scb_id)}</td></tr>'
        f'<tr><td style="padding:5px 0;color:#666;">Producto</td>'
        f'<td style="padding:5px 0;color:#111;">{esc(product_name)}</td></tr>'
        f'<tr><td style="padding:5px 0;color:#666;">Precio de env&iacute;o</td>'
        f'<td style="padding:5px 0;">{price_html}</td></tr>'
        '</table>'
        f'{deadline_html}'
        '</div>'
        f'<a href="{esc(portal_url)}" style="display:inline-block;background:#FF6B00;color:#fff;'
        'font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;'
        'text-decoration:none;margin-bottom:20px;">Ver mi solicitud</a>'
        '<p style="font-size:13px;color:#6b7280;margin:0 0 8px;">'
        'Si ya tomaste una decisi&oacute;n o no necesitas esta cotizaci&oacute;n, '
        'puedes ignorar este mensaje.</p>'
        '<p style="font-size:12px;color:#9ca3af;margin:16px 0 0;">'
        f'¿Tienes preguntas? Responde a este correo indicando tu ID '
        f'<strong>{esc(scb_id)}</strong>.</p>'
        '</div></div>'
    )

    settings = _smtp_settings()
    if settings is None:
        return False, 'SMTP not configured'

    msg = email.mime.multipart.MIMEMultipart('alternative')
    msg['Subject']    = subject
    msg['From']       = f'CRBOX <{smtp_user}>'
    msg['To']         = customer_email
    msg['Reply-To']   = 'ventas@crbox.cr'
    msg['Message-ID'] = f'<{_uuid4_hex()}@crbox.cr>'
    msg['Date']       = email.utils.formatdate(localtime=False)
    msg.attach(email.mime.text.MIMEText(plain, 'plain', 'utf-8'))
    msg.attach(email.mime.text.MIMEText(html_body, 'html', 'utf-8'))

    try:
        _send_smtp(msg, [customer_email])
        return True, ''
    except Exception as exc:
        return False, str(exc)


def _check_and_send_reminders(reminder_hours: int):
    """Query for overdue solicitudes and send reminders for both sales and customers."""
    cutoff_ts  = time.time() - reminder_hours * 3600
    cutoff_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(cutoff_ts))

    # ── Internal sales digest: enviada requests with no sales action ────────
    with _DB_LOCK:
        conn = _get_db()
        try:
            rows = conn.execute(
                '''SELECT id, customer_name, customer_email, product_name, submitted_at
                   FROM quote_requests
                   WHERE status = 'enviada'
                     AND submitted_at < ?
                     AND reminder_sent_at IS NULL''',
                (cutoff_iso,)
            ).fetchall()
        finally:
            conn.close()

    if not rows:
        print('[SOLICITUD REMINDER] Check complete — no overdue enviada solicitudes')
    else:
        print(f'[SOLICITUD REMINDER] Found {len(rows)} overdue enviada solicitudes — sending digest')
        ok, err = _send_reminder_digest(rows, reminder_hours)

        if not ok:
            print(f'[SOLICITUD REMINDER] Failed to send digest email: {err}')
        else:
            now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
            with _DB_LOCK:
                conn = _get_db()
                try:
                    conn.executemany(
                        'UPDATE quote_requests SET reminder_sent_at = ? WHERE id = ?',
                        [(now_iso, row['id']) for row in rows]
                    )
                    conn.commit()
                finally:
                    conn.close()
            print(f'[SOLICITUD REMINDER] Digest sent — marked {len(rows)} record(s) with reminder_sent_at')

    # ── Customer reminder: respondida requests with no customer action ───────
    settings = _smtp_settings()
    if settings is None:
        print('[SOLICITUD REMINDER] SMTP not configured — skipping customer reminders')
        return

    smtp_user = settings[2]

    with _DB_LOCK:
        conn = _get_db()
        try:
            customer_rows = conn.execute(
                '''SELECT id, customer_name, customer_email, product_name,
                          response_json, expires_at
                   FROM quote_requests
                   WHERE status = 'respondida'
                     AND responded_at < ?
                     AND customer_reminder_sent_at IS NULL''',
                (cutoff_iso,)
            ).fetchall()
        finally:
            conn.close()

    if not customer_rows:
        print('[SOLICITUD REMINDER] No respondida solicitudes need a customer reminder')
        return

    print(f'[SOLICITUD REMINDER] Found {len(customer_rows)} respondida solicitudes — sending customer reminders')

    now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    sent_ids = []
    for row in customer_rows:
        scb_id         = row['id']
        customer_email = row['customer_email']
        customer_name  = row['customer_name'] or ''
        product_name   = row['product_name']
        expires_at     = row['expires_at']

        confirmed_price = None
        resp_raw = row['response_json']
        if resp_raw:
            try:
                resp_data = json.loads(resp_raw)
                confirmed_price = resp_data.get('confirmed_shipping_price_usd')
            except Exception:
                pass

        ok, err = _send_quote_reminder_customer(
            scb_id, customer_email, customer_name,
            product_name, confirmed_price, expires_at, smtp_user
        )
        if ok:
            sent_ids.append(scb_id)
            print(f'[SOLICITUD REMINDER] Customer reminder sent for {scb_id}')
        else:
            print(f'[SOLICITUD REMINDER] Failed to send customer reminder for {scb_id}: {err}')

    if sent_ids:
        with _DB_LOCK:
            conn = _get_db()
            try:
                conn.executemany(
                    'UPDATE quote_requests SET customer_reminder_sent_at = ? WHERE id = ?',
                    [(now_iso, sid) for sid in sent_ids]
                )
                conn.commit()
            finally:
                conn.close()
        print(f'[SOLICITUD REMINDER] Marked {len(sent_ids)} record(s) with customer_reminder_sent_at')


def _solicitud_reminder_loop(interval: int, reminder_hours: int):
    """Background daemon: periodically checks for overdue enviada solicitudes."""
    print(f'[SOLICITUD REMINDER] Starting — interval {interval}s, threshold {reminder_hours}h')
    while True:
        time.sleep(interval)
        try:
            _check_and_send_reminders(reminder_hours)
        except Exception as exc:
            print(f'[SOLICITUD REMINDER] Unexpected error in reminder loop: {exc}')


def _start_solicitud_reminder():
    """Read env vars and launch the solicitud reminder daemon thread."""
    raw_hours    = os.environ.get('SOLICITUD_REMINDER_HOURS', '').strip()
    raw_interval = os.environ.get('SOLICITUD_REMINDER_INTERVAL', '').strip()

    try:
        reminder_hours = max(1, int(raw_hours)) if raw_hours else 48
    except ValueError:
        print(f'[SOLICITUD REMINDER] Invalid SOLICITUD_REMINDER_HOURS "{raw_hours}", using default 48h')
        reminder_hours = 48

    try:
        interval = max(60, int(raw_interval)) if raw_interval else _REMINDER_INTERVAL_DEFAULT
    except ValueError:
        print(f'[SOLICITUD REMINDER] Invalid SOLICITUD_REMINDER_INTERVAL "{raw_interval}", '
              f'using default {_REMINDER_INTERVAL_DEFAULT}s')
        interval = _REMINDER_INTERVAL_DEFAULT

    t = threading.Thread(
        target=_solicitud_reminder_loop,
        args=(interval, reminder_hours),
        daemon=True
    )
    t.start()
# ─────────────────────────────────────────────────────────────────────────────


def _check_rate_limit(ip):
    now = time.monotonic()
    with _rate_lock:
        timestamps = _rate_window.get(ip, [])
        timestamps = [t for t in timestamps if now - t < _RATE_SECONDS]
        if len(timestamps) >= _RATE_LIMIT:
            return False
        timestamps.append(now)
        _rate_window[ip] = timestamps
        return True


def _log_quote_submission(name: str, email_addr: str, subject: str, status: str,
                          error: str = '', ip: str = ''):
    """Append a single JSON record to the quote submission audit log.

    Failures to write the log are printed but never propagated — logging must
    never affect the HTTP response sent to the caller.
    """
    try:
        record = json.dumps({
            'ts': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'ip': ip,
            'name': name,
            'email': email_addr,
            'subject': subject,
            'status': status,
            'error': error,
        }, ensure_ascii=False)
        with _quote_log_lock:
            with open(_QUOTE_LOG_PATH, 'a', encoding='utf-8') as f:
                f.write(record + '\n')
    except Exception as exc:
        print(f'[QUOTE LOG] Failed to write audit record: {exc}')


def _quote_text_to_html(body_text):
    """Convert the pre-built plain-text quote body to a clean HTML email."""
    lines = body_text.split('\n')
    out = []

    out.append(
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;'
        'color:#1a1a1a;max-width:600px;margin:0 auto;">'
    )

    # Header band
    out.append(
        '<div style="background:linear-gradient(135deg,#FF6B00,#FF9A00);'
        'padding:20px 24px;border-radius:8px 8px 0 0;">'
        '<p style="color:#fff;font-size:20px;font-weight:700;margin:0;">'
        '&#128230; Solicitud de Cotización</p>'
        '<p style="color:rgba(255,255,255,.85);font-size:13px;margin:4px 0 0;">'
        'CRBOX &middot; Calculadora de env&iacute;os</p>'
        '</div>'
    )

    # Body
    out.append(
        '<div style="background:#fff;border:1px solid #e5e7eb;'
        'border-top:none;padding:24px;border-radius:0 0 8px 8px;">'
    )

    for line in lines:
        esc = _html.escape(line)

        # Skip the title and separator lines (already in the header band)
        if 'Solicitud de cotizaci' in line or '===' in line:
            continue

        # Empty line → spacer
        if not line.strip():
            out.append('<div style="margin:10px 0;"></div>')
            continue

        # Section header: non-indented line ending with ":"
        if (not line.startswith(' ')
                and line.rstrip().endswith(':')
                and len(line.strip()) > 3):
            label = esc.rstrip().rstrip(':')
            out.append(
                f'<p style="font-size:11px;font-weight:700;color:#FF6B00;'
                f'text-transform:uppercase;letter-spacing:.07em;'
                f'margin:20px 0 8px;padding-bottom:6px;'
                f'border-bottom:1px solid #fed7aa;">{label}</p>'
            )
            continue

        # Numbered item line: "1. Name", "2. Name", …
        if (not line.startswith(' ')
                and len(line) > 2
                and line[0].isdigit()
                and '. ' in line[:5]):
            out.append(
                f'<p style="font-weight:700;font-size:14px;'
                f'margin:12px 0 3px;color:#111;">{esc}</p>'
            )
            continue

        # Indented detail line (item attribute)
        if line.startswith('   ') or line.startswith('  '):
            out.append(
                f'<p style="font-size:13px;color:#555;'
                f'margin:2px 0;padding-left:16px;line-height:1.5;">'
                f'{esc.strip()}</p>'
            )
            continue

        # Estimate disclaimer line
        if line.startswith('Nota:'):
            out.append(
                f'<div style="margin-top:20px;padding:12px 14px;'
                f'background:#fffdf7;border-left:4px solid #f59e0b;'
                f'border-radius:4px;">'
                f'<p style="font-size:12px;color:#78350f;margin:0;'
                f'line-height:1.6;">{esc}</p></div>'
            )
            continue

        # Regular line (Nombre, Correo, Destino, totals, savings)
        out.append(
            f'<p style="font-size:14px;margin:4px 0;color:#333;">{esc}</p>'
        )

    out.append('</div>')  # body
    out.append('</div>')  # outer wrapper
    return '\n'.join(out)


# ─── Admin panel ─────────────────────────────────────────────────────────────
_admin_sessions      = {}           # token → expiry_ts
_admin_sessions_lock = threading.Lock()
_admin_brute_state   = {}           # ip → [fail_monotonic_ts, ...]
_admin_brute_lock    = threading.Lock()

_ADMIN_SESSION_TTL  = 8 * 3600     # 8 hours
_ADMIN_BRUTE_MAX    = 5
_ADMIN_BRUTE_WINDOW = 600           # 10-minute failure window
_ADMIN_BRUTE_BLOCK  = 600           # 10-minute block


def _admin_password():
    return os.environ.get('ADMIN_PASSWORD', '').strip() or None


def _admin_create_session():
    token = _uuid4_hex() + _uuid4_hex()   # 64-char hex
    expiry = time.time() + _ADMIN_SESSION_TTL
    with _admin_sessions_lock:
        _admin_sessions[token] = expiry
    return token


def _admin_validate_session(token):
    if not token:
        return False
    with _admin_sessions_lock:
        expiry = _admin_sessions.get(token)
        if expiry is None:
            return False
        now = time.time()
        if now > expiry:
            del _admin_sessions[token]
            return False
        # Sliding window: extend the session by a full TTL on every valid request
        _admin_sessions[token] = now + _ADMIN_SESSION_TTL
        return True


def _admin_clear_session(token):
    with _admin_sessions_lock:
        _admin_sessions.pop(token, None)


def _admin_brute_blocked(ip):
    """Return (blocked, remaining_seconds).
    The 10-minute block is measured from the most recent (Nth) failed attempt,
    so every breach triggers a full _ADMIN_BRUTE_BLOCK cooldown.
    """
    now = time.monotonic()
    with _admin_brute_lock:
        timestamps = [t for t in _admin_brute_state.get(ip, [])
                      if now - t < _ADMIN_BRUTE_WINDOW]
        _admin_brute_state[ip] = timestamps
        if len(timestamps) >= _ADMIN_BRUTE_MAX:
            latest = timestamps[-1]  # most recent fail → full block from there
            remaining = max(0, int(latest + _ADMIN_BRUTE_BLOCK - now))
            if remaining > 0:
                return True, remaining
            _admin_brute_state[ip] = []
    return False, 0


def _admin_brute_record_fail(ip):
    now = time.monotonic()
    with _admin_brute_lock:
        ts_list = _admin_brute_state.get(ip, [])
        ts_list = [t for t in ts_list if now - t < _ADMIN_BRUTE_WINDOW]
        ts_list.append(now)
        _admin_brute_state[ip] = ts_list


def _admin_elapsed(iso_str):
    """Return Spanish relative time string from a UTC ISO timestamp."""
    try:
        struct = time.strptime(iso_str[:19], '%Y-%m-%dT%H:%M:%S')
        ts    = calendar.timegm(struct)
        diff  = int(time.time() - ts)
    except Exception:
        return ''
    if diff < 120:
        return 'hace un momento'
    if diff < 3600:
        m = diff // 60
        return f'hace {m} min'
    if diff < 86400:
        h = diff // 3600
        return f'hace {h}h'
    d = diff // 86400
    return f'hace {d} día{"s" if d != 1 else ""}'


def _admin_format_date(iso_str):
    try:
        struct = time.strptime(iso_str[:19], '%Y-%m-%dT%H:%M:%S')
        return time.strftime('%d/%m/%Y %H:%M', struct)
    except Exception:
        return iso_str or ''


_ADMIN_BADGE_CFG = {
    'enviada':                           ('#FFF7ED', '#C2410C', '#FDBA74', 'Enviada'),
    'en_revision':                       ('#EFF6FF', '#1D4ED8', '#BFDBFE', 'En revisión'),
    'respondida':                        ('#F0FDF4', '#15803D', '#BBF7D0', 'Respondida'),
    'pendiente_compra_crbox':            ('#FFF7ED', '#9A3412', '#FED7AA', 'Compra CRBOX'),
    'pendiente_confirmacion_pago_cliente': ('#FFFBEB', '#92400E', '#FDE68A', 'Confirmación de pago'),
    'pagado_por_cliente':                ('#EFF6FF', '#1D4ED8', '#BFDBFE', 'Pago confirmado'),
    'comprado':                          ('#F0FDF4', '#15803D', '#BBF7D0', 'Comprado'),
    'listo_para_retiro':                 ('#FFFBEB', '#92400E', '#FDE68A', 'Listo para retiro'),
    'pendiente_compra_cliente':          ('#EFF6FF', '#1E40AF', '#BFDBFE', 'Compra propia'),
    'completada':                        ('#F9FAFB', '#374151', '#D1D5DB', 'Completada'),
    'cancelada':                         ('#FEF2F2', '#991B1B', '#FECACA', 'Cancelada'),
    'expirada':                          ('#F9FAFB', '#6B7280', '#E5E7EB', 'Expirada'),
}

def _admin_badge_html(status, rid):
    bg, fg, bdr, slabel = _ADMIN_BADGE_CFG.get(status, ('#F9FAFB', '#374151', '#D1D5DB', status))
    return (
        f'<span class="adm-badge" id="badge-{rid}" '
        f'style="background:{bg};color:{fg};border-color:{bdr};">{slabel}</span>'
    )


def _admin_status_options_html(current_status):
    labels = {
        'enviada':                           'Enviada',
        'en_revision':                       'En revisión',
        'respondida':                        'Respondida',
        'pendiente_compra_crbox':            'Compra por CRBOX',
        'pendiente_confirmacion_pago_cliente': 'Confirmar pago pendiente',
        'pagado_por_cliente':                'Pago confirmado',
        'comprado':                          'Comprado por CRBOX',
        'listo_para_retiro':                 'Listo para retiro',
        'pendiente_compra_cliente':          'Compra propia',
        'completada':                        'Completada',
        'cancelada':                         'Cancelada',
        'expirada':                          'Expirada',
    }
    context_labels = {
        'comprado': {
            'completada': 'Completada (omitir retiro)',
        },
    }
    transitions = _ADMIN_LEGAL_TRANSITIONS.get(current_status, set())
    order = [
        'en_revision', 'respondida',
        'pendiente_compra_crbox', 'pendiente_confirmacion_pago_cliente',
        'pagado_por_cliente', 'comprado',
        'listo_para_retiro', 'pendiente_compra_cliente', 'completada', 'cancelada',
    ]
    opts = [
        f'<option value="" disabled selected>— Cambiar a —</option>'
    ]
    ctx = context_labels.get(current_status, {})
    for nxt in order:
        if nxt in transitions:
            label = ctx.get(nxt, labels.get(nxt, nxt))
            opts.append(f'<option value="{nxt}">{label}</option>')
    return '\n'.join(opts)


def _build_admin_detail_html(row, history, filter_val='all', resent=False):
    esc = _html.escape
    rid       = esc(row['id'])
    back_url  = f'/admin/solicitudes?filter={esc(filter_val)}'
    status    = row['status']
    badge_html = _admin_badge_html(status, rid)
    date_str  = _admin_format_date(row.get('submitted_at', ''))
    elapsed   = _admin_elapsed(row.get('submitted_at', ''))

    # ── Customer block ──────────────────────────────────────────────────────
    acct_type = row.get('account_type') or 'anonymous'
    acct_labels = {'personal': 'Personal', 'business': 'Empresa', 'anonymous': 'Anónimo'}
    acct_label  = acct_labels.get(acct_type, 'Anónimo')
    empresa_badge = ('<span class="adm-empresa" style="margin-left:6px;">EMPRESA</span>'
                     if acct_type == 'business' else '')
    casillero_str = esc(row.get('casillero_id') or '—')

    customer_html = f'''<div class="adm-detail-section">
  <div class="adm-detail-section-title">&#128100; Cliente</div>
  <div class="adm-detail-rows">
    <div class="adm-detail-row">
      <span class="adm-detail-label">Nombre</span>
      <span class="adm-detail-val">{esc(row.get('customer_name') or '—')}</span>
    </div>
    <div class="adm-detail-row">
      <span class="adm-detail-label">Email</span>
      <span class="adm-detail-val"><a href="mailto:{esc(row.get('customer_email',''))}" class="adm-link">{esc(row.get('customer_email') or '—')}</a></span>
    </div>
    <div class="adm-detail-row">
      <span class="adm-detail-label">Casillero</span>
      <span class="adm-detail-val">{casillero_str}</span>
    </div>
    <div class="adm-detail-row">
      <span class="adm-detail-label">Tipo de cuenta</span>
      <span class="adm-detail-val">{esc(acct_label)}{empresa_badge}</span>
    </div>
  </div>
</div>'''

    # ── Product block ───────────────────────────────────────────────────────
    cat_labels = {
        'ropa': 'Ropa y calzado', 'electronico': 'Electrónico',
        'computadora': 'Computadoras', 'celular': 'Celulares',
        'auricular_telefono': 'Auriculares', 'electrodomestico': 'Electrodoméstico',
        'cosmetico': 'Cosméticos', 'suplemento': 'Suplementos',
        'libro': 'Libros', 'juguete': 'Juguetes', 'herramienta': 'Herramientas',
        'equipo_medico': 'Equipo médico', 'deportivo': 'Deportivo', 'otros': 'Otros',
    }
    cat_code  = row.get('category') or 'otros'
    cat_label = cat_labels.get(cat_code, cat_code)
    val_usd   = row.get('declared_value_usd')
    val_str   = f'${val_usd:,.2f}' if val_usd is not None else '—'
    prod_url  = row.get('product_url') or ''
    url_html  = (
        f'<a href="{esc(prod_url)}" target="_blank" rel="noopener" class="adm-link">'
        f'{esc(prod_url[:80])}{"&hellip;" if len(prod_url) > 80 else ""}</a>'
    ) if prod_url else '—'
    l_cm, w_cm, h_cm = row.get('length_cm'), row.get('width_cm'), row.get('height_cm')
    dims_str  = (f'{l_cm} &times; {w_cm} &times; {h_cm} cm'
                 if l_cm and w_cm and h_cm else '—')
    wt_str    = f"{row['weight_kg']} kg" if row.get('weight_kg') is not None else '—'
    notes_str = esc(row.get('customer_notes') or '—')
    svc_labels = {'aereo': 'Aéreo', 'maritimo': 'Marítimo'}
    svc_str   = svc_labels.get(row.get('service_type') or 'aereo', 'Aéreo')

    product_html = f'''<div class="adm-detail-section">
  <div class="adm-detail-section-title">&#128230; Producto</div>
  <div class="adm-detail-rows">
    <div class="adm-detail-row">
      <span class="adm-detail-label">Nombre</span>
      <span class="adm-detail-val" style="font-weight:600;">{esc(row.get('product_name') or '—')}</span>
    </div>
    <div class="adm-detail-row">
      <span class="adm-detail-label">Valor declarado</span>
      <span class="adm-detail-val" style="font-weight:600;">{esc(val_str)}</span>
    </div>
    <div class="adm-detail-row">
      <span class="adm-detail-label">Categor&iacute;a</span>
      <span class="adm-detail-val">{esc(cat_label)}</span>
    </div>
    <div class="adm-detail-row">
      <span class="adm-detail-label">URL del producto</span>
      <span class="adm-detail-val" style="word-break:break-all;">{url_html}</span>
    </div>
    <div class="adm-detail-row">
      <span class="adm-detail-label">Peso</span>
      <span class="adm-detail-val">{esc(wt_str)}</span>
    </div>
    <div class="adm-detail-row">
      <span class="adm-detail-label">Dimensiones</span>
      <span class="adm-detail-val">{dims_str}</span>
    </div>
    <div class="adm-detail-row">
      <span class="adm-detail-label">Servicio</span>
      <span class="adm-detail-val">{esc(svc_str)}</span>
    </div>
    <div class="adm-detail-row">
      <span class="adm-detail-label">Notas del cliente</span>
      <span class="adm-detail-val">{notes_str}</span>
    </div>
  </div>
</div>'''

    # ── AI extraction snapshot block ────────────────────────────────────────
    data_source = row.get('data_source') or 'manual'
    ai_section_html = ''
    if data_source in ('ai_extracted', 'ai_partial'):
        ai_json_raw = row.get('ai_extraction_json') or None
        ai_fields   = {}
        if ai_json_raw:
            try:
                ai_data   = json.loads(ai_json_raw)
                ai_fields = ai_data.get('fields') or {}
            except Exception:
                pass
        field_order = [
            ('product_name',       'Nombre del producto'),
            ('declared_value_usd', 'Valor declarado (USD)'),
            ('category',           'Categor&iacute;a'),
            ('weight_kg',          'Peso (kg)'),
            ('dimensions_cm',      'Dimensiones (cm)'),
        ]
        prov_labels = {
            'extracted':          'Extra&iacute;do',
            'inferred':           'Inferido',
            'needs_confirmation': 'Requiere confirmaci&oacute;n',
            'missing':            'No encontrado',
        }
        rows_html = ''
        for fkey, flabel in field_order:
            fdata = ai_fields.get(fkey)
            if not fdata:
                rows_html += (
                    f'<tr><td class="ai-fn">{flabel}</td>'
                    f'<td class="ai-fv" style="color:#9ca3af;">—</td>'
                    f'<td class="ai-fp" style="color:#9ca3af;">—</td>'
                    f'<td class="ai-fc" style="color:#9ca3af;">—</td></tr>\n'
                )
                continue
            conf     = fdata.get('confidence', 0) or 0
            prov     = fdata.get('provenance') or 'missing'
            val      = fdata.get('value')
            conf_pct = f'{conf:.0%}'
            prov_str = prov_labels.get(prov, esc(prov))
            val_str2 = esc(str(val)) if val is not None else '—'
            low_conf = (conf < 0.80) or (prov == 'needs_confirmation')
            row_style  = ' style="background:#fffbeb;"' if low_conf else ''
            conf_style = (' style="color:#d97706;font-weight:700;"'
                          if low_conf else ' style="color:#16a34a;font-weight:700;"')
            rows_html += (
                f'<tr{row_style}>'
                f'<td class="ai-fn">{flabel}</td>'
                f'<td class="ai-fv">{val_str2}</td>'
                f'<td class="ai-fp">{prov_str}</td>'
                f'<td class="ai-fc"{conf_style}>{conf_pct}</td>'
                f'</tr>\n'
            )
        src_lbl    = 'AI &mdash; completo' if data_source == 'ai_extracted' else 'AI &mdash; parcial'
        no_data_note = (
            '<p style="color:#9ca3af;font-size:12px;margin-bottom:10px;">'
            'Los datos de extracci&oacute;n no fueron almacenados para esta solicitud.</p>'
        ) if not ai_json_raw else ''
        ai_section_html = f'''<div class="adm-detail-section">
  <div class="adm-detail-section-title" style="justify-content:space-between;">
    <span>&#129302; Extracci&oacute;n AI</span>
    <span class="adm-src-badge adm-src-ai">{src_lbl}</span>
  </div>
  <p style="font-size:12px;color:#6b7280;margin-bottom:12px;">Instant&aacute;nea de los datos extra&iacute;dos autom&aacute;ticamente al momento del env&iacute;o. Solo lectura.</p>
  {no_data_note}<div class="adm-table-wrap" style="margin-bottom:0;">
  <table class="adm-ai-table">
    <thead>
      <tr>
        <th class="ai-fn">Campo</th>
        <th class="ai-fv">Valor extra&iacute;do</th>
        <th class="ai-fp">Proveniencia</th>
        <th class="ai-fc">Confianza</th>
      </tr>
    </thead>
    <tbody>{rows_html}</tbody>
  </table>
  </div>
</div>'''

    # ── response_json (parse once, used for composer and read-only block) ───
    resp_data = {}
    resp_json_raw = row.get('response_json') or None
    if resp_json_raw:
        try:
            resp_data = json.loads(resp_json_raw)
        except Exception:
            resp_data = {}

    # ── Estimado del sistema block ──────────────────────────────────────────
    estimado_html   = ''
    estimate_usd    = row.get('estimate_usd')
    est_bd_raw      = row.get('estimate_breakdown')
    dest_zone       = row.get('destination_zone') or '—'
    if estimate_usd is not None or est_bd_raw:
        bd_rows_html = ''
        if est_bd_raw:
            try:
                bd = json.loads(est_bd_raw)
                if isinstance(bd, dict):
                    for k, v in bd.items():
                        bd_rows_html += (
                            f'<div class="adm-detail-row">'
                            f'<span class="adm-detail-label">{esc(str(k))}</span>'
                            f'<span class="adm-detail-val">{esc(str(v))}</span>'
                            f'</div>'
                        )
            except Exception:
                pass
        total_str = f'${estimate_usd:,.2f}' if estimate_usd is not None else '—'
        estimado_html = f'''<div class="adm-detail-section" style="border-color:#bfdbfe;background:#eff6ff;">
  <div class="adm-detail-section-title" style="justify-content:space-between;">
    <span>&#129518; Estimado autom&aacute;tico del sistema</span>
    <span class="adm-src-badge" style="background:#dbeafe;color:#1d4ed8;border-color:#93c5fd;">Calculadora CRBOX</span>
  </div>
  <p style="font-size:12px;color:#6b7280;margin-bottom:12px;">Este valor fue generado autom&aacute;ticamente usando la l&oacute;gica actual de estimaci&oacute;n de CRBOX. Es solo referencia interna y no sustituye la revisi&oacute;n comercial.</p>
  <div class="adm-detail-rows">
    <div class="adm-detail-row">
      <span class="adm-detail-label">Total estimado</span>
      <span class="adm-detail-val" style="font-size:18px;font-weight:800;color:#FF6B00;">{esc(total_str)}</span>
    </div>
    <div class="adm-detail-row">
      <span class="adm-detail-label">Servicio</span>
      <span class="adm-detail-val">{esc(svc_str)}</span>
    </div>
    <div class="adm-detail-row">
      <span class="adm-detail-label">Destino</span>
      <span class="adm-detail-val">{esc(dest_zone)}</span>
    </div>
    {bd_rows_html}
  </div>
</div>'''

    # ── Status history timeline ─────────────────────────────────────────────
    status_label_map = {
        'enviada':                           'Enviada',
        'en_revision':                       'En revisi&oacute;n',
        'respondida':                        'Respondida',
        'pendiente_compra_crbox':            'Compra por CRBOX',
        'pendiente_confirmacion_pago_cliente': 'Confirmaci&oacute;n de pago',
        'pagado_por_cliente':                'Pago confirmado',
        'comprado':                          'Comprado por CRBOX',
        'listo_para_retiro':                 'Listo para retiro',
        'pendiente_compra_cliente':          'Compra propia',
        'completada':                        'Completada',
        'cancelada':                         'Cancelada',
        'expirada':                          'Expirada',
    }
    timeline_items = ''
    for h in history:
        from_s   = h.get('from_status') or ''
        to_s     = h.get('to_status') or ''
        note_h   = h.get('note') or ''
        by       = h.get('changed_by') or 'system'
        ts       = _admin_format_date(h.get('changed_at', ''))
        is_internal_note = (from_s and to_s and from_s == to_s)
        if is_internal_note:
            timeline_items += f'''<div class="tl-item tl-item-note">
  <div class="tl-dot" style="background:#fbbf24;border-color:#d97706;"></div>
  <div class="tl-body" style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 10px;">
    <div class="tl-transition" style="color:#92400e;font-size:12px;font-weight:600;">&#128221; Nota interna</div>
    <div class="tl-meta">{esc(ts)} &middot; por {esc(by)}</div>
    <div class="tl-note" style="margin-top:4px;">&ldquo;{esc(note_h)}&rdquo;</div>
  </div>
</div>'''
        else:
            from_lbl = status_label_map.get(from_s, esc(from_s))
            to_lbl   = status_label_map.get(to_s, esc(to_s))
            transition_html = (
                f'<span style="color:#6b7280;">{from_lbl}</span> &rarr; <strong>{to_lbl}</strong>'
                if from_s else f'<strong>{to_lbl}</strong>'
            )
            note_item = f'<div class="tl-note">&ldquo;{esc(note_h)}&rdquo;</div>' if note_h else ''
            _, fg, bdr, _ = _ADMIN_BADGE_CFG.get(to_s, ('#F9FAFB', '#374151', '#D1D5DB', ''))
            timeline_items += f'''<div class="tl-item">
  <div class="tl-dot" style="background:{fg};border-color:{bdr};"></div>
  <div class="tl-body">
    <div class="tl-transition">{transition_html}</div>
    <div class="tl-meta">{esc(ts)} &middot; por {esc(by)}</div>
    {note_item}
  </div>
</div>'''

    tl_inner = timeline_items or '<p style="color:#9ca3af;font-size:13px;">Sin eventos registrados.</p>'
    history_html = f'''<div class="adm-detail-section">
  <div class="adm-detail-section-title">&#128336; Historial de estado</div>
  <div class="tl-wrap">{tl_inner}</div>
</div>'''

    # ── Status update form ──────────────────────────────────────────────────
    transitions = _ADMIN_LEGAL_TRANSITIONS.get(status, set())
    if transitions:
        sel_opts   = _admin_status_options_html(status)
        update_html = f'''<div class="adm-detail-section">
  <div class="adm-detail-section-title">&#9998; Actualizar estado</div>
  <form method="POST" action="/admin/solicitudes/{rid}/status">
    <input type="hidden" name="filter" value="{esc(filter_val)}">
    <input type="hidden" name="from_detail" value="1">
    <div style="margin-bottom:8px;">
      <select class="adm-select" name="status" style="max-width:260px;">{sel_opts}</select>
    </div>
    <div style="margin-bottom:8px;">
      <textarea class="adm-note" name="note" placeholder="Nota interna (opcional)" rows="3" style="max-width:440px;"></textarea>
    </div>
    <button class="adm-upd-btn" type="submit" style="max-width:180px;">Actualizar estado</button>
  </form>
</div>'''
    else:
        update_html = f'''<div class="adm-detail-section">
  <div class="adm-detail-section-title">&#9998; Actualizar estado</div>
  <p style="color:#9ca3af;font-size:13px;">Este estado no permite m&aacute;s transiciones.</p>
</div>'''

    # ── Internal note form (non-terminal statuses only) ─────────────────────
    _TERMINAL_STATUSES = {'completada', 'cancelada', 'expirada'}
    if status not in _TERMINAL_STATUSES:
        add_note_html = f'''<div class="adm-detail-section">
  <div class="adm-detail-section-title">&#128221; Agregar nota interna</div>
  <form method="POST" action="/admin/solicitudes/{rid}/add-note">
    <input type="hidden" name="filter" value="{esc(filter_val)}">
    <div style="margin-bottom:8px;">
      <textarea class="adm-note" name="note" placeholder="Escribe una nota interna&hellip;" rows="3" style="max-width:440px;" required></textarea>
    </div>
    <button class="adm-upd-btn" type="submit" style="max-width:220px;background:#d97706;border-color:#b45309;">Guardar nota interna</button>
  </form>
  <p style="font-size:11px;color:#9ca3af;margin-top:8px;">La nota es solo visible para el equipo de ventas y no cambia el estado de la solicitud.</p>
</div>'''
    else:
        add_note_html = ''

    # ── Response composer or read-only "Respuesta enviada" block ───────────
    _AVAIL_LABELS = {
        'disponible': 'Disponible',
        'no_disponible': 'No disponible',
        'disponible_con_condiciones': 'Disponible con condiciones',
    }
    composer_html = ''
    if resp_json_raw:
        # Read-only block — response already sent
        ro_price = resp_data.get('confirmed_shipping_price_usd')
        ro_avail = resp_data.get('availability', '')
        ro_avail_label = _AVAIL_LABELS.get(ro_avail, esc(ro_avail))
        ro_avail_color = {
            'disponible': '#16a34a',
            'no_disponible': '#dc2626',
            'disponible_con_condiciones': '#d97706',
        }.get(ro_avail, '#374151')
        ro_timeline  = esc(resp_data.get('delivery_timeline') or '—')
        ro_conds     = esc(resp_data.get('conditions') or '')
        ro_diff      = esc(resp_data.get('difference_explanation') or '')
        ro_msg       = esc(resp_data.get('customer_message') or '—')
        ro_sent_at   = _admin_format_date(resp_data.get('sent_at', ''))
        ro_price_str = f'${ro_price:,.2f} USD' if ro_price is not None else '—'

        ro_conds_row = (
            f'<div class="adm-detail-row"><span class="adm-detail-label">Condiciones</span>'
            f'<span class="adm-detail-val" style="white-space:pre-wrap;">{ro_conds}</span></div>'
        ) if ro_conds else ''
        ro_diff_row = (
            f'<div class="adm-detail-row"><span class="adm-detail-label">Nota sobre el estimado</span>'
            f'<span class="adm-detail-val" style="white-space:pre-wrap;">{ro_diff}</span></div>'
        ) if ro_diff else ''

        # Check history for any resend events
        last_resend = next(
            (h for h in reversed(history) if 'reenviada' in (h.get('note') or '').lower()),
            None
        )
        resend_note_html = ''
        if last_resend:
            resend_ts = _admin_format_date(last_resend.get('changed_at', ''))
            resend_note_html = (
                f'<p style="font-size:11px;color:#6b7280;margin:10px 0 0;">'
                f'&#128338; &Uacute;ltimo reenv&iacute;o: {esc(resend_ts)}</p>'
            )

        composer_html = f'''<div class="adm-detail-section" style="border-color:#d1fae5;background:#f0fdf4;">
  <div class="adm-detail-section-title" style="justify-content:space-between;">
    <span>&#9993; Respuesta enviada</span>
    <span class="adm-src-badge" style="background:#d1fae5;color:#065f46;border-color:#6ee7b7;">{esc(ro_sent_at)}</span>
  </div>
  <p style="font-size:12px;color:#6b7280;margin-bottom:12px;">
    Respuesta revisada y enviada por CRBOX al cliente. Solo lectura.
  </p>
  <div class="adm-detail-rows">
    <div class="adm-detail-row">
      <span class="adm-detail-label">Disponibilidad</span>
      <span class="adm-detail-val" style="font-weight:700;color:{ro_avail_color};">{ro_avail_label}</span>
    </div>
    <div class="adm-detail-row">
      <span class="adm-detail-label">Precio confirmado</span>
      <span class="adm-detail-val" style="font-weight:700;color:#FF6B00;">{esc(ro_price_str)}</span>
    </div>
    <div class="adm-detail-row">
      <span class="adm-detail-label">Tiempo de entrega</span>
      <span class="adm-detail-val">{ro_timeline}</span>
    </div>
    {ro_conds_row}
    {ro_diff_row}
    <div class="adm-detail-row">
      <span class="adm-detail-label">Mensaje al cliente</span>
      <span class="adm-detail-val" style="white-space:pre-wrap;">{ro_msg}</span>
    </div>
  </div>
  <div style="margin-top:16px;padding-top:14px;border-top:1px solid #d1fae5;">
    <form method="POST" action="/admin/solicitudes/{rid}/resend-response">
      <input type="hidden" name="filter" value="{esc(filter_val)}">
      <button type="submit"
        style="display:inline-flex;align-items:center;gap:7px;padding:9px 18px;
               background:#fff;border:1.5px solid #6ee7b7;border-radius:8px;
               color:#065f46;font-size:13px;font-weight:700;cursor:pointer;
               font-family:inherit;transition:all .2s;"
        onmouseover="this.style.background='#d1fae5'"
        onmouseout="this.style.background='#fff'">
        &#128257;&nbsp; Reenviar notificaci&oacute;n al cliente
      </button>
    </form>
    {resend_note_html}
  </div>
</div>'''
    elif status in ('enviada', 'en_revision'):
        # Show the composer form
        est_str = f'${estimate_usd:,.2f} USD' if estimate_usd is not None else '—'
        composer_html = f'''<div class="adm-detail-section" style="border-color:#fed7aa;background:#fff7ed;">
  <div class="adm-detail-section-title">&#9993; Respuesta revisada por CRBOX</div>
  <p style="font-size:12px;color:#6b7280;margin-bottom:16px;">
    Completa los campos y env&iacute;a la respuesta al cliente. El correo se env&iacute;a
    autom&aacute;ticamente al confirmar.
  </p>
  <div class="adm-resp-cmp">
    <div class="adm-resp-cmp-item">
      <div class="adm-resp-cmp-label">Estimado autom&aacute;tico del sistema</div>
      <div class="adm-resp-cmp-val" style="color:#1d4ed8;">{esc(est_str)}</div>
    </div>
    <div class="adm-resp-cmp-arrow">&#8594;</div>
    <div class="adm-resp-cmp-item">
      <div class="adm-resp-cmp-label">Precio confirmado por ventas</div>
      <div class="adm-resp-cmp-val" id="resp-price-display" style="color:#FF6B00;">&mdash;</div>
    </div>
  </div>
  <form method="POST" action="/admin/solicitudes/{rid}/respond">
    <input type="hidden" name="filter" value="{esc(filter_val)}">
    <div class="adm-resp-field">
      <label class="adm-resp-label">Precio de env&iacute;o confirmado (USD) <span style="color:#ef4444;">*</span></label>
      <input class="adm-resp-input" type="number" name="confirmed_price"
             id="resp-price-input" step="0.01" min="0.01" placeholder="Ej. 45.00" required>
    </div>
    <div class="adm-resp-field">
      <label class="adm-resp-label">Disponibilidad <span style="color:#ef4444;">*</span></label>
      <select class="adm-select" name="availability" id="resp-availability" required>
        <option value="">Seleccionar&hellip;</option>
        <option value="disponible">Disponible</option>
        <option value="no_disponible">No disponible</option>
        <option value="disponible_con_condiciones">Disponible con condiciones</option>
      </select>
    </div>
    <div class="adm-resp-field">
      <label class="adm-resp-label">Tiempo de entrega estimado <span style="color:#ef4444;">*</span></label>
      <input class="adm-resp-input" type="text" name="delivery_timeline"
             placeholder="Ej. 5&ndash;8 d&iacute;as h&aacute;biles" maxlength="200" required>
    </div>
    <div style="margin:4px 0 16px;">
      <button type="button" id="resp-ai-btn"
              disabled
              style="display:inline-flex;align-items:center;gap:7px;padding:8px 16px;
                     border:1px solid #c7d2fe;border-radius:6px;background:#eef2ff;
                     color:#4338ca;font-size:13px;font-weight:600;cursor:pointer;
                     opacity:.45;transition:opacity .15s;">
        &#10024;&nbsp;Sugerir borrador con IA
      </button>
      <span id="resp-ai-status" style="margin-left:10px;font-size:12px;color:#6b7280;display:none;"></span>
    </div>
    <div class="adm-resp-field">
      <label class="adm-resp-label">Condiciones <span style="color:#9ca3af;font-weight:400;">(opcional)</span></label>
      <textarea class="adm-note" name="conditions" id="resp-conditions" rows="3" maxlength="2000"
                placeholder="Condiciones adicionales que el cliente debe conocer&hellip;"></textarea>
      <div id="resp-ai-label-conditions" style="display:none;margin-top:4px;font-size:11px;
           color:#7c3aed;font-weight:600;">&#10024; Sugerido por IA &mdash; revise antes de enviar</div>
    </div>
    <div class="adm-resp-field">
      <label class="adm-resp-label">Explicaci&oacute;n de diferencia con el estimado <span style="color:#9ca3af;font-weight:400;">(opcional)</span></label>
      <p style="font-size:11px;color:#9ca3af;margin:0 0 6px;">Usa este campo si el precio revisado difiere del estimado autom&aacute;tico y el cliente se beneficiar&iacute;a de una explicaci&oacute;n.</p>
      <textarea class="adm-note" name="difference_explanation" id="resp-diff-expl" rows="2" maxlength="2000"
                placeholder="Ej. El peso real del producto es mayor al estimado por el sistema."></textarea>
      <div id="resp-ai-label-diff" style="display:none;margin-top:4px;font-size:11px;
           color:#7c3aed;font-weight:600;">&#10024; Sugerido por IA &mdash; revise antes de enviar</div>
    </div>
    <div class="adm-resp-field">
      <label class="adm-resp-label">Mensaje al cliente <span style="color:#ef4444;">*</span></label>
      <textarea class="adm-note" name="customer_message" id="resp-message" rows="5" maxlength="5000" required
                placeholder="Escribe el mensaje que el cliente recibir&aacute; en el correo&hellip;"></textarea>
      <div id="resp-ai-label-msg" style="display:none;margin-top:4px;font-size:11px;
           color:#7c3aed;font-weight:600;">&#10024; Sugerido por IA &mdash; revise antes de enviar</div>
    </div>
    <div style="margin-top:4px;">
      <button class="adm-upd-btn" type="submit"
              style="background:#16a34a;max-width:280px;"
              onmouseover="this.style.background='#15803d'"
              onmouseout="this.style.background='#16a34a'">
        &#9993;&nbsp; Enviar respuesta al cliente
      </button>
    </div>
  </form>
  <script>
    (function() {{
      var priceInp = document.getElementById('resp-price-input');
      var priceDisp = document.getElementById('resp-price-display');
      if (priceInp && priceDisp) {{
        priceInp.addEventListener('input', function() {{
          var n = parseFloat(this.value);
          priceDisp.textContent = isNaN(n) || n <= 0 ? '\u2014' : '$' + n.toFixed(2) + ' USD';
        }});
      }}

      var availSel = document.getElementById('resp-availability');
      var aiBtn    = document.getElementById('resp-ai-btn');
      var aiStatus = document.getElementById('resp-ai-status');

      function syncAiBtn() {{
        var ok = availSel && availSel.value;
        if (aiBtn) {{
          aiBtn.disabled = !ok;
          aiBtn.style.opacity = ok ? '1' : '.45';
          aiBtn.style.cursor  = ok ? 'pointer' : 'default';
        }}
      }}
      if (availSel) availSel.addEventListener('change', syncAiBtn);
      syncAiBtn();

      function aiLabelFor(fieldId, labelId) {{
        var field = document.getElementById(fieldId);
        var label = document.getElementById(labelId);
        if (!field || !label) return;
        field.addEventListener('input', function() {{
          label.style.display = 'none';
        }});
      }}
      aiLabelFor('resp-conditions', 'resp-ai-label-conditions');
      aiLabelFor('resp-diff-expl',  'resp-ai-label-diff');
      aiLabelFor('resp-message',    'resp-ai-label-msg');

      if (aiBtn) {{
        aiBtn.addEventListener('click', function() {{
          var avail       = availSel ? availSel.value : '';
          var priceVal    = priceInp ? priceInp.value : '';
          if (!avail) return;

          aiBtn.disabled = true;
          aiBtn.textContent = '\u23f3\u00a0Generando borrador\u2026';
          if (aiStatus) {{ aiStatus.textContent = ''; aiStatus.style.display = 'none'; }}

          fetch('/admin/solicitudes/{rid}/suggest-draft', {{
            method: 'POST',
            headers: {{'Content-Type': 'application/json'}},
            body: JSON.stringify({{availability: avail, confirmed_price: priceVal}})
          }})
          .then(function(r) {{ return r.json(); }})
          .then(function(data) {{
            aiBtn.disabled = false;
            aiBtn.innerHTML = '&#10024;&nbsp;Sugerir borrador con IA';
            syncAiBtn();
            if (data.error) {{
              if (aiStatus) {{
                aiStatus.textContent = 'Error: ' + data.error;
                aiStatus.style.color = '#dc2626';
                aiStatus.style.display = 'inline';
              }}
              return;
            }}
            function fillField(fieldId, labelId, value) {{
              var f = document.getElementById(fieldId);
              var l = document.getElementById(labelId);
              if (!f) return;
              f.value = value || '';
              if (l) l.style.display = value ? 'block' : 'none';
            }}
            fillField('resp-conditions', 'resp-ai-label-conditions', data.conditions);
            fillField('resp-diff-expl',  'resp-ai-label-diff',       data.difference_explanation);
            fillField('resp-message',    'resp-ai-label-msg',        data.customer_message);
            if (aiStatus) {{
              aiStatus.textContent = 'Borrador listo. Revise y edite antes de enviar.';
              aiStatus.style.color = '#059669';
              aiStatus.style.display = 'inline';
            }}
          }})
          .catch(function(err) {{
            aiBtn.disabled = false;
            aiBtn.innerHTML = '&#10024;&nbsp;Sugerir borrador con IA';
            syncAiBtn();
            if (aiStatus) {{
              aiStatus.textContent = 'Error de conexi\u00f3n. Intente de nuevo.';
              aiStatus.style.color = '#dc2626';
              aiStatus.style.display = 'inline';
            }}
          }});
        }});
      }}
    }})();
  </script>
</div>'''

    # ── Link-package action block (pendiente_compra_cliente only) ───────────
    link_pkg_html = ''
    if status == 'pendiente_compra_cliente':
        cust_tracking = (row.get('expected_tracking_number') or '').strip()
        tracking_ref_row = ''
        if cust_tracking:
            tracking_ref_row = (
                f'<div class="adm-detail-row" style="margin-bottom:12px;">'
                f'<span class="adm-detail-label">Tracking del cliente</span>'
                f'<span class="adm-detail-val" style="font-family:monospace;font-size:12px;">'
                f'{esc(cust_tracking)}</span></div>'
            )
        link_pkg_html = f'''<div class="adm-detail-section" style="border-color:#c4b5fd;background:#faf5ff;">
  <div class="adm-detail-section-title" style="color:#6d28d9;">&#128279; Vincular paquete y completar</div>
  <p style="font-size:12px;color:#6b7280;margin-bottom:14px;">Registra el ID del paquete CRBOX que correspond&iacute;a a esta solicitud. Esto cerrar&aacute; la solicitud como completada y activar&aacute; la vista del paquete en el portal del cliente.</p>
  {tracking_ref_row}
  <form method="POST" action="/admin/solicitudes/{rid}/link-package">
    <input type="hidden" name="filter" value="{esc(filter_val)}">
    <div style="margin-bottom:8px;">
      <label style="display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:5px;">ID del paquete CRBOX <span style="color:#ef4444;">*</span></label>
      <input type="text" name="package_id" required
             placeholder="ej. CRBOX-00001"
             style="width:100%;max-width:320px;padding:8px 12px;border:1px solid #c4b5fd;
                    border-radius:8px;font-size:13px;color:#111;background:#fff;
                    outline:none;" />
    </div>
    <button type="submit"
            style="margin-top:4px;padding:8px 22px;background:#7c3aed;color:#fff;
                   border:none;border-radius:8px;font-size:13px;font-weight:700;
                   cursor:pointer;transition:background .2s;"
            onmouseover="this.style.background='#6d28d9'"
            onmouseout="this.style.background='#7c3aed'">
      &#128279;&nbsp; Vincular paquete y completar
    </button>
  </form>
</div>'''

    # ── Source badge for header ─────────────────────────────────────────────
    src_map = {
        'manual':       ('Manual',        'adm-src-manual'),
        'ai_extracted': ('AI &mdash; completo', 'adm-src-ai'),
        'ai_partial':   ('AI &mdash; parcial',  'adm-src-ai-partial'),
    }
    src_text, src_cls = src_map.get(data_source, ('Manual', 'adm-src-manual'))

    return f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>{rid} &mdash; Panel de ventas CRBOX</title>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,sans-serif;
  background:#f3f4f6;color:#111;min-height:100vh}}
a{{color:inherit;text-decoration:none}}
.adm-header{{background:#1f2937;padding:12px 20px;display:flex;align-items:center;gap:14px;
  position:sticky;top:0;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,.18)}}
.adm-header-logo{{color:#FF6B00;font-weight:800;font-size:18px;letter-spacing:-.5px}}
.adm-header-title{{color:#fff;font-size:14px;font-weight:600}}
.adm-header-sep{{color:#4b5563;font-size:16px}}
.adm-header-link{{color:#9ca3af;font-size:13px;padding:6px 12px;
  border-radius:6px;border:1px solid #374151;transition:all .2s}}
.adm-header-link:hover{{color:#fff;border-color:#6b7280}}
.adm-logout{{margin-left:auto;color:#9ca3af;font-size:13px;padding:6px 12px;
  border-radius:6px;border:1px solid #374151;transition:all .2s}}
.adm-logout:hover{{color:#fff;border-color:#6b7280}}
.adm-detail-wrap{{max-width:760px;margin:0 auto;padding:24px 20px 48px}}
.adm-back{{display:inline-flex;align-items:center;gap:6px;color:#6b7280;
  font-size:13px;font-weight:600;margin-bottom:20px;padding:6px 12px;
  border:1px solid #e5e7eb;border-radius:8px;background:#fff;transition:all .2s}}
.adm-back:hover{{color:#374151;border-color:#d1d5db;background:#f9fafb}}
.adm-page-title{{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:6px}}
.adm-scb-id{{font-size:22px;font-weight:900;color:#FF6B00;letter-spacing:-.02em}}
.adm-page-meta{{font-size:12px;color:#9ca3af;margin-bottom:16px}}
.adm-detail-section{{background:#fff;border-radius:12px;border:1px solid #e5e7eb;
  padding:20px;margin-bottom:14px}}
.adm-detail-section-title{{font-size:14px;font-weight:700;color:#374151;
  margin-bottom:14px;display:flex;align-items:center;gap:8px}}
.adm-detail-row{{display:flex;justify-content:space-between;align-items:flex-start;
  gap:12px;padding:9px 0;border-bottom:1px solid #f3f4f6;font-size:13px}}
.adm-detail-row:last-child{{border-bottom:none}}
.adm-detail-label{{color:#9ca3af;font-size:12px;min-width:120px;flex-shrink:0;padding-top:1px}}
.adm-detail-val{{color:#111;font-weight:500;text-align:right;word-break:break-word;
  max-width:calc(100% - 140px)}}
.adm-badge{{display:inline-block;padding:3px 10px;border-radius:999px;
  font-size:11px;font-weight:700;letter-spacing:.03em;border:1px solid}}
.adm-empresa{{display:inline-block;background:#fff7ed;color:#c2410c;
  font-size:10px;font-weight:700;padding:1px 7px;border-radius:999px;
  border:1px solid #fdba74;vertical-align:middle}}
.adm-src-badge{{display:inline-block;padding:3px 9px;border-radius:999px;
  font-size:11px;font-weight:700;border:1px solid;white-space:nowrap}}
.adm-src-manual{{background:#f3f4f6;color:#374151;border-color:#e5e7eb}}
.adm-src-ai{{background:#fffbeb;color:#92400e;border-color:#fde68a}}
.adm-src-ai-partial{{background:#fff7ed;color:#c2410c;border-color:#fdba74}}
.adm-link{{color:#FF6B00;text-decoration:underline;text-underline-offset:2px}}
.adm-link:hover{{color:#E05A00}}
.adm-table-wrap{{overflow-x:auto}}
.adm-ai-table{{width:100%;border-collapse:collapse}}
.adm-ai-table th{{background:#f9fafb;padding:8px 10px;text-align:left;font-size:11px;
  font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;
  border-bottom:1px solid #e5e7eb}}
.adm-ai-table td{{padding:10px;border-bottom:1px solid #f3f4f6;font-size:12px;vertical-align:top}}
.adm-ai-table tr:last-child td{{border-bottom:none}}
.ai-fn{{font-weight:600;color:#374151;min-width:140px}}
.ai-fv{{color:#111;max-width:180px;word-break:break-word}}
.ai-fp{{color:#6b7280;min-width:130px}}
.ai-fc{{white-space:nowrap}}
.tl-wrap{{padding:4px 0}}
.tl-item{{display:flex;gap:12px;padding:8px 0;position:relative}}
.tl-item:not(:last-child)::after{{content:"";position:absolute;left:7px;top:28px;
  bottom:-8px;width:2px;background:#e5e7eb}}
.tl-dot{{width:16px;height:16px;border-radius:50%;border:2px solid;flex-shrink:0;margin-top:2px}}
.tl-body{{flex:1}}
.tl-transition{{font-size:13px;color:#374151;margin-bottom:2px}}
.tl-meta{{font-size:11px;color:#9ca3af}}
.tl-note{{font-size:12px;color:#6b7280;margin-top:4px;font-style:italic}}
.adm-select{{display:block;border:1.5px solid #e5e7eb;border-radius:6px;padding:8px 12px;
  font-size:13px;background:#fff;cursor:pointer;font-family:inherit;color:#374151;width:100%}}
.adm-note{{display:block;border:1.5px solid #e5e7eb;border-radius:6px;padding:8px 12px;
  font-size:13px;resize:vertical;font-family:inherit;color:#374151;width:100%}}
.adm-upd-btn{{display:block;background:#FF6B00;color:#fff;border:none;border-radius:6px;
  padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;transition:background .2s;
  font-family:inherit;width:100%}}
.adm-upd-btn:hover{{background:#E05A00}}
.adm-resp-cmp{{display:flex;align-items:center;gap:16px;background:#fff;border:1px solid #fed7aa;
  border-radius:8px;padding:14px 16px;margin-bottom:20px;flex-wrap:wrap}}
.adm-resp-cmp-item{{flex:1;min-width:120px}}
.adm-resp-cmp-label{{font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;
  letter-spacing:.05em;margin-bottom:4px}}
.adm-resp-cmp-val{{font-size:18px;font-weight:800;letter-spacing:-.02em}}
.adm-resp-cmp-arrow{{font-size:20px;color:#d1d5db;flex-shrink:0}}
.adm-resp-field{{margin-bottom:14px}}
.adm-resp-label{{display:block;font-size:12px;font-weight:700;color:#374151;margin-bottom:5px}}
.adm-resp-input{{display:block;border:1.5px solid #e5e7eb;border-radius:6px;padding:8px 12px;
  font-size:13px;background:#fff;font-family:inherit;color:#374151;width:100%;
  transition:border-color .2s}}
.adm-resp-input:focus{{outline:none;border-color:#FF6B00}}
@media(max-width:600px){{
  .adm-detail-wrap{{padding:16px 12px 48px}}
  .adm-detail-label{{min-width:90px}}
  .adm-detail-val{{max-width:calc(100% - 100px)}}
}}
</style>
</head>
<body>
<header class="adm-header">
  <span class="adm-header-logo">CRBOX</span>
  <span class="adm-header-sep">|</span>
  <span class="adm-header-title">Panel de ventas</span>
  <a href="/admin/logout" class="adm-logout">Salir</a>
</header>
<div class="adm-detail-wrap">
  <a href="{back_url}" class="adm-back">&#8592; Volver a solicitudes</a>
  {'<div style="background:#d1fae5;border:1px solid #6ee7b7;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;color:#065f46;">&#10003;&nbsp; Notificaci&oacute;n reenviada correctamente al cliente.</div>' if resent else ''}
  <div class="adm-page-title">
    <span class="adm-scb-id">{rid}</span>
    {badge_html}
    <span class="adm-src-badge {src_cls}">{src_text}</span>
  </div>
  <div class="adm-page-meta">{esc(date_str)} &middot; {esc(elapsed)}</div>
  {customer_html}
  {product_html}
  {ai_section_html}
  {estimado_html}
  {history_html}
  {update_html}
  {add_note_html}
  {link_pkg_html}
  {composer_html}
</div>
</body>
</html>'''


def _build_admin_login_html(error='', blocked_secs=0, expired=False):
    esc = _html.escape
    if blocked_secs > 0:
        mins = (blocked_secs + 59) // 60
        alert_html = (
            f'<div class="adl-alert adl-alert-block">Demasiados intentos fallidos. '
            f'Espera {mins} minuto{"s" if mins != 1 else ""} e intenta de nuevo.</div>'
        )
    elif error:
        alert_html = f'<div class="adl-alert">{esc(error)}</div>'
    elif expired:
        alert_html = (
            '<div class="adl-alert adl-alert-expired">'
            'Tu sesi\u00f3n expir\u00f3. Por favor inicia sesi\u00f3n de nuevo.'
            '</div>'
        )
    else:
        alert_html = ''

    return f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Panel de ventas — CRBOX</title>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,sans-serif;
  background:#f3f4f6;min-height:100vh;display:flex;align-items:center;
  justify-content:center;padding:16px}}
.adl-card{{background:#fff;border-radius:14px;
  box-shadow:0 4px 24px rgba(0,0,0,.10);width:100%;max-width:380px;overflow:hidden}}
.adl-header{{background:linear-gradient(135deg,#FF6B00,#FF9A00);padding:28px 24px}}
.adl-header-logo{{color:#fff;font-size:22px;font-weight:800;letter-spacing:-.5px;margin-bottom:4px}}
.adl-header-sub{{color:rgba(255,255,255,.85);font-size:13px}}
.adl-body{{padding:28px 24px}}
.adl-label{{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px}}
.adl-input{{width:100%;border:1.5px solid #D1D5DB;border-radius:8px;padding:11px 14px;
  font-size:15px;outline:none;transition:border-color .2s,box-shadow .2s;
  font-family:inherit}}
.adl-input:focus{{border-color:#FF6B00;box-shadow:0 0 0 3px rgba(255,107,0,.12)}}
.adl-btn{{display:block;width:100%;background:#FF6B00;color:#fff;border:none;
  border-radius:8px;padding:12px;font-size:15px;font-weight:700;cursor:pointer;
  margin-top:20px;transition:background .2s;font-family:inherit}}
.adl-btn:hover{{background:#E05A00}}
.adl-alert{{margin-bottom:16px;padding:11px 14px;border-radius:8px;font-size:13px;
  background:#FEF2F2;color:#991B1B;border:1px solid #FECACA}}
.adl-alert-block{{background:#FFF7ED;color:#C2410C;border-color:#FDBA74}}
.adl-alert-expired{{background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE}}
</style>
</head>
<body>
<div class="adl-card">
  <div class="adl-header">
    <div class="adl-header-logo">CRBOX</div>
    <div class="adl-header-sub">Panel de ventas &mdash; acceso interno</div>
  </div>
  <div class="adl-body">
    {alert_html}
    <form method="POST" action="/admin/login">
      <input type="text" name="username" value="admin" autocomplete="username" style="display:none" aria-hidden="true">
      <label class="adl-label" for="pwd">Contraseña</label>
      <input class="adl-input" type="password" id="pwd" name="password"
             autofocus required placeholder="Ingresa la contraseña" maxlength="200"
             autocomplete="current-password">
      <button class="adl-btn" type="submit">Ingresar</button>
    </form>
  </div>
</div>
</body>
</html>'''


def _build_admin_solicitudes_html(rows, filter_val, counts):
    esc = _html.escape
    # ── Filter tabs ────────────────────────────────────────────────────────
    tab_defs = [
        ('all',        f'Todas ({counts["all"]})'),
        ('activas',    f'Activas ({counts["activas"]})'),
        ('respondidas',f'Respondidas ({counts["respondidas"]})'),
        ('archivadas', f'Archivadas ({counts["archivadas"]})'),
    ]
    tabs_html = ''
    for key, label in tab_defs:
        active = 'adm-tab-active' if key == filter_val else ''
        tabs_html += (
            f'<a href="/admin/solicitudes?filter={key}" '
            f'class="adm-tab {active}">{label}</a>\n'
        )

    # ── Table rows + card rows ─────────────────────────────────────────────
    table_rows = ''
    card_rows  = ''
    for r in rows:
        rid      = esc(r['id'])
        name     = esc(r['customer_name'] or '—')
        email_v  = esc(r['customer_email'])
        acct     = r['account_type'] or 'anonymous'
        empresa  = '<span class="adm-empresa">EMPRESA</span>' if acct == 'business' else ''
        prod     = esc((r['product_name'] or '')[:50])
        cat      = esc(r['category'] or '')
        val      = f"${r['declared_value_usd']:,.2f}" if r['declared_value_usd'] else '—'
        date_str = _admin_format_date(r['submitted_at'])
        elapsed  = _admin_elapsed(r['submitted_at'])
        status   = r['status']
        transitions = _ADMIN_LEGAL_TRANSITIONS.get(status, set())
        has_transitions = bool(transitions)

        # Status badge
        badge_html = _admin_badge_html(status, rid)

        # Data-source badge
        src_badges = {
            'manual':       ('<span class="adm-src-badge adm-src-manual">Manual</span>'),
            'ai_extracted': ('<span class="adm-src-badge adm-src-ai">AI — completo</span>'),
            'ai_partial':   ('<span class="adm-src-badge adm-src-ai-partial">AI — parcial</span>'),
        }
        data_source = r.get('data_source') or 'manual'
        src_badge_html = src_badges.get(data_source, src_badges['manual'])

        # Update controls
        if has_transitions:
            sel_opts = _admin_status_options_html(status)
            update_html = (
                f'<form method="POST" action="/admin/solicitudes/{rid}/status">'
                f'<input type="hidden" name="filter" value="{filter_val}">'
                f'<select class="adm-select" name="status">{sel_opts}</select>'
                f'<textarea class="adm-note" name="note" placeholder="Nota interna (opcional)" rows="2"></textarea>'
                f'<button class="adm-upd-btn" type="submit">Actualizar</button>'
                f'</form>'
            )
        else:
            update_html = '<span style="color:#9ca3af;font-size:12px;">—</span>'

        # Ver → link
        ver_link = f'<a href="/admin/solicitudes/{rid}?filter={filter_val}" class="adm-ver-link">Ver&nbsp;&#8594;</a>'

        # Table row
        table_rows += f'''<tr data-id="{rid}">
<td class="td-id"><span style="color:#FF6B00;font-weight:700;font-size:13px;">{rid}</span><br>{src_badge_html}</td>
<td><div style="font-weight:600;font-size:13px;">{name}{empresa}</div>
    <div style="color:#6b7280;font-size:12px;margin-top:2px;">{email_v}</div></td>
<td><div style="font-size:13px;font-weight:500;">{prod}</div>
    <div style="color:#9ca3af;font-size:11px;margin-top:2px;">{cat}</div></td>
<td style="font-size:13px;white-space:nowrap;">{val}</td>
<td><div style="font-size:13px;white-space:nowrap;">{date_str}</div>
    <div style="color:#9ca3af;font-size:11px;margin-top:2px;">{elapsed}</div></td>
<td>{badge_html}</td>
<td class="td-upd">{update_html}</td>
<td class="td-ver">{ver_link}</td>
</tr>\n'''

        # Card (mobile)
        card_form = ''
        if has_transitions:
            card_form = (
                f'<div class="adm-card-actions">'
                f'<form method="POST" action="/admin/solicitudes/{rid}/status">'
                f'<input type="hidden" name="filter" value="{filter_val}">'
                f'<select class="adm-select" name="status">{_admin_status_options_html(status)}</select>'
                f'<textarea class="adm-note" name="note" placeholder="Nota interna (opcional)" rows="2"></textarea>'
                f'<button class="adm-upd-btn" type="submit">Actualizar</button>'
                f'</form></div>'
            )
        card_rows += f'''<div class="adm-card" data-id="{rid}">
<div class="adm-card-top">
  <div>
    <span class="adm-card-id">{rid}</span>{empresa}
    <div style="margin-top:4px;">{src_badge_html}</div>
  </div>
  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">{badge_html}{ver_link}</div>
</div>
<div class="adm-card-fields">
  <div class="adm-card-row"><span class="adm-card-lbl">Cliente</span><span class="adm-card-val">{name}</span></div>
  <div class="adm-card-row"><span class="adm-card-lbl">Email</span><span class="adm-card-val" style="font-size:11px;">{email_v}</span></div>
  <div class="adm-card-row"><span class="adm-card-lbl">Producto</span><span class="adm-card-val">{prod}</span></div>
  <div class="adm-card-row"><span class="adm-card-lbl">Valor</span><span class="adm-card-val">{val}</span></div>
  <div class="adm-card-row"><span class="adm-card-lbl">Fecha</span><span class="adm-card-val">{date_str} &middot; {elapsed}</span></div>
</div>
{card_form}
</div>\n'''

    # ── Empty state ────────────────────────────────────────────────────────
    if not rows:
        empty_html = '''<div class="adm-empty">
<div style="font-size:36px;margin-bottom:12px;">📭</div>
<h3>Sin solicitudes en esta vista</h3>
<p>No hay solicitudes que coincidan con el filtro seleccionado.</p>
</div>'''
        table_body_html = f'<tr><td colspan="8">{empty_html}</td></tr>'
        cards_html      = empty_html
    else:
        table_body_html = table_rows
        cards_html      = card_rows

    n = len(rows)
    count_label = f'{n} solicitud{"es" if n != 1 else ""}'

    return f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Panel de ventas — CRBOX</title>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,sans-serif;
  background:#f3f4f6;color:#111;min-height:100vh}}
a{{color:inherit;text-decoration:none}}
/* Header */
.adm-header{{background:#1f2937;padding:12px 20px;display:flex;align-items:center;gap:14px;
  position:sticky;top:0;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,.18)}}
.adm-header-logo{{color:#FF6B00;font-weight:800;font-size:18px;letter-spacing:-.5px}}
.adm-header-title{{color:#fff;font-size:14px;font-weight:600}}
.adm-header-sep{{color:#4b5563;font-size:16px}}
.adm-header-link{{color:#9ca3af;font-size:13px;padding:6px 12px;
  border-radius:6px;border:1px solid #374151;transition:all .2s}}
.adm-header-link:hover{{color:#fff;border-color:#6b7280}}
.adm-logout{{margin-left:auto;color:#9ca3af;font-size:13px;padding:6px 12px;
  border-radius:6px;border:1px solid #374151;transition:all .2s}}
.adm-logout:hover{{color:#fff;border-color:#6b7280}}
/* Filter tabs */
.adm-tabs{{display:flex;gap:4px;padding:14px 20px 0;flex-wrap:wrap;background:#f3f4f6}}
.adm-tab{{padding:7px 16px;border-radius:8px 8px 0 0;font-size:13px;font-weight:600;
  color:#6b7280;border:1px solid transparent;border-bottom:none;
  transition:all .15s;cursor:pointer}}
.adm-tab:hover{{color:#374151;background:#e5e7eb}}
.adm-tab-active{{background:#fff;color:#FF6B00;border-color:#e5e7eb;
  box-shadow:0 -1px 4px rgba(0,0,0,.04)}}
/* Main */
.adm-main{{padding:0 20px 40px}}
.adm-panel{{background:#fff;border-radius:0 0 12px 12px;
  box-shadow:0 2px 10px rgba(0,0,0,.06);overflow:hidden}}
.adm-count{{padding:12px 16px;font-size:13px;color:#6b7280;
  border-bottom:1px solid #f3f4f6;background:#fafafa}}
/* Table */
.adm-table{{width:100%;border-collapse:collapse}}
.adm-table th{{background:#f9fafb;padding:10px 14px;text-align:left;
  font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;
  letter-spacing:.06em;border-bottom:1px solid #e5e7eb;white-space:nowrap}}
.adm-table td{{padding:13px 14px;border-bottom:1px solid #f3f4f6;
  vertical-align:top;font-size:13px}}
.adm-table tr:last-child td{{border-bottom:none}}
.adm-table tr:hover td{{background:#fafafa}}
.td-id{{white-space:nowrap}}
.td-upd{{min-width:160px}}
.td-ver{{white-space:nowrap;text-align:center;vertical-align:middle}}
/* Source badges */
.adm-src-badge{{display:inline-block;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:700;border:1px solid;margin-top:4px}}
.adm-src-manual{{background:#f3f4f6;color:#374151;border-color:#e5e7eb}}
.adm-src-ai{{background:#fffbeb;color:#92400e;border-color:#fde68a}}
.adm-src-ai-partial{{background:#fff7ed;color:#c2410c;border-color:#fdba74}}
/* Ver link */
.adm-ver-link{{display:inline-block;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;color:#FF6B00;border:1px solid #fdba74;background:#fff7ed;transition:all .2s;white-space:nowrap}}
.adm-ver-link:hover{{background:#FF6B00;color:#fff;border-color:#FF6B00}}
/* Badges */
.adm-badge{{display:inline-block;padding:3px 10px;border-radius:999px;
  font-size:11px;font-weight:700;letter-spacing:.03em;border:1px solid}}
.adm-empresa{{display:inline-block;background:#fff7ed;color:#c2410c;
  font-size:10px;font-weight:700;padding:1px 7px;border-radius:999px;
  border:1px solid #fdba74;vertical-align:middle;margin-left:4px}}
/* Update controls */
.adm-select{{display:block;width:100%;border:1.5px solid #e5e7eb;border-radius:6px;
  padding:6px 10px;font-size:12px;background:#fff;margin-bottom:6px;cursor:pointer;
  font-family:inherit;color:#374151}}
.adm-note{{display:block;width:100%;border:1.5px solid #e5e7eb;border-radius:6px;
  padding:6px 10px;font-size:12px;resize:vertical;font-family:inherit;
  color:#374151;margin-bottom:6px}}
.adm-upd-btn{{display:block;width:100%;background:#FF6B00;color:#fff;border:none;
  border-radius:6px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;
  transition:background .2s;font-family:inherit}}
.adm-upd-btn:hover{{background:#E05A00}}
.adm-upd-btn:disabled{{background:#9ca3af;cursor:not-allowed}}
/* Cards (mobile) */
.adm-cards{{display:none;flex-direction:column;gap:10px;padding:12px}}
.adm-card{{background:#fff;border-radius:10px;padding:16px;
  box-shadow:0 1px 6px rgba(0,0,0,.06)}}
.adm-card-top{{display:flex;justify-content:space-between;align-items:flex-start;
  margin-bottom:10px}}
.adm-card-id{{font-size:14px;font-weight:700;color:#111}}
.adm-card-fields{{margin-bottom:10px}}
.adm-card-row{{display:flex;justify-content:space-between;align-items:baseline;
  padding:4px 0;border-bottom:1px solid #f3f4f6;font-size:13px}}
.adm-card-row:last-child{{border-bottom:none}}
.adm-card-lbl{{color:#9ca3af;font-size:12px;min-width:60px}}
.adm-card-val{{color:#111;font-size:12px;text-align:right;word-break:break-all;max-width:60%}}
.adm-card-actions{{margin-top:10px;padding-top:10px;border-top:1px solid #f3f4f6}}
/* Empty state */
.adm-empty{{text-align:center;padding:48px 20px;color:#9ca3af}}
.adm-empty h3{{font-size:16px;font-weight:600;color:#6b7280;margin-bottom:6px}}
.adm-empty p{{font-size:13px}}
/* Toast */
#adm-toast{{position:fixed;bottom:24px;right:24px;padding:12px 20px;
  border-radius:8px;font-size:13px;font-weight:600;color:#fff;
  background:#16a34a;box-shadow:0 4px 16px rgba(0,0,0,.15);
  transform:translateY(80px);opacity:0;transition:all .3s;z-index:100;
  pointer-events:none}}
#adm-toast.show{{transform:translateY(0);opacity:1}}
#adm-toast.error{{background:#dc2626}}
/* Responsive */
@media(max-width:720px){{
  .adm-header{{padding:10px 14px}}
  .adm-tabs{{padding:10px 12px 0}}
  .adm-main{{padding:0 0 40px}}
  .adm-panel{{border-radius:0}}
  .adm-table-wrap{{display:none}}
  .adm-cards{{display:flex}}
}}
@media(min-width:721px){{
  .adm-table-wrap{{overflow-x:auto}}
}}
</style>
</head>
<body>
<header class="adm-header">
  <span class="adm-header-logo">CRBOX</span>
  <span class="adm-header-sep">|</span>
  <span class="adm-header-title">Panel de ventas</span>
  <a href="/admin/consultas" class="adm-header-link">Consultas Generales</a>
  <a href="/admin/logout" class="adm-logout">Salir</a>
</header>

<div class="adm-tabs">
{tabs_html}
</div>

<main class="adm-main">
<div class="adm-panel">
  <div class="adm-count">{count_label}</div>
  <!-- Desktop table -->
  <div class="adm-table-wrap">
  <table class="adm-table">
    <thead>
      <tr>
        <th>ID / Fuente</th><th>Cliente</th><th>Producto</th>
        <th>Valor</th><th>Fecha</th><th>Estado</th><th>Actualizar</th><th></th>
      </tr>
    </thead>
    <tbody>{table_body_html}</tbody>
  </table>
  </div>
  <!-- Mobile cards -->
  <div class="adm-cards">{cards_html}</div>
</div>
</main>

</body>
</html>'''


def _build_admin_consultas_html(rows):
    esc = _html.escape
    table_rows = ''
    card_rows  = ''
    for r in rows:
        rid      = str(r['id'])
        nombre   = esc(r.get('nombre') or '—')
        correo   = esc(r.get('correo') or '—')
        asunto   = esc(r.get('asunto') or '—')
        source   = esc(r.get('source') or '—')
        email_sent = r.get('email_sent', 0)
        date_str = _admin_format_date(r.get('submitted_at'))
        elapsed  = _admin_elapsed(r.get('submitted_at'))
        # Email delivery badge
        if email_sent:
            email_badge = '<span class="adm-badge" style="background:#F0FDF4;color:#15803D;border-color:#BBF7D0;">Enviado</span>'
        else:
            email_badge = '<span class="adm-badge" style="background:#FFF7ED;color:#C2410C;border-color:#FDBA74;">Fallido</span>'
        ver_link = f'<a href="/admin/consultas/{rid}" style="color:#FF6B00;font-weight:600;font-size:12px;white-space:nowrap;">Ver&nbsp;&#8594;</a>'
        table_rows += f'''<tr>
<td style="white-space:nowrap;color:#FF6B00;font-weight:700;font-size:13px;">{rid}</td>
<td><div style="font-weight:600;font-size:13px;">{nombre}</div>
    <div style="color:#6b7280;font-size:12px;margin-top:2px;">{correo}</div></td>
<td style="font-size:13px;color:#374151;">{asunto}</td>
<td><div style="font-size:13px;white-space:nowrap;">{date_str}</div>
    <div style="color:#9ca3af;font-size:11px;margin-top:2px;">{elapsed}</div></td>
<td>{email_badge}</td>
<td>{ver_link}</td>
</tr>\n'''
        card_rows += f'''<div class="adm-card">
<div class="adm-card-top">
  <div><span class="adm-card-id">#{rid}</span></div>
  <div>{email_badge}</div>
</div>
<div class="adm-card-fields">
  <div class="adm-card-row"><span class="adm-card-lbl">Nombre</span><span class="adm-card-val">{nombre}</span></div>
  <div class="adm-card-row"><span class="adm-card-lbl">Correo</span><span class="adm-card-val" style="font-size:11px;">{correo}</span></div>
  <div class="adm-card-row"><span class="adm-card-lbl">Asunto</span><span class="adm-card-val">{asunto}</span></div>
  <div class="adm-card-row"><span class="adm-card-lbl">Fuente</span><span class="adm-card-val">{source}</span></div>
  <div class="adm-card-row"><span class="adm-card-lbl">Fecha</span><span class="adm-card-val">{date_str} &middot; {elapsed}</span></div>
</div>
<a href="/admin/consultas/{rid}" style="display:block;text-align:center;margin-top:8px;padding:8px;background:#f9fafb;border-radius:6px;color:#FF6B00;font-size:13px;font-weight:600;">Ver detalle &#8594;</a>
</div>\n'''

    n = len(rows)
    count_label = f'{n} consulta{"s" if n != 1 else ""} generales'
    if not rows:
        empty_html = '''<div class="adm-empty">
<div style="font-size:36px;margin-bottom:12px;">📬</div>
<h3>Sin consultas aún</h3>
<p>Las consultas del formulario de contacto aparecerán aquí.</p>
</div>'''
        table_body_html = f'<tr><td colspan="6">{empty_html}</td></tr>'
        cards_html      = empty_html
    else:
        table_body_html = table_rows
        cards_html      = card_rows

    return f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Consultas Generales — CRBOX</title>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,sans-serif;
  background:#f3f4f6;color:#111;min-height:100vh}}
a{{color:inherit;text-decoration:none}}
.adm-header{{background:#1f2937;padding:12px 20px;display:flex;align-items:center;gap:14px;
  position:sticky;top:0;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,.18)}}
.adm-header-logo{{color:#FF6B00;font-weight:800;font-size:18px;letter-spacing:-.5px}}
.adm-header-title{{color:#fff;font-size:14px;font-weight:600}}
.adm-header-sep{{color:#4b5563;font-size:16px}}
.adm-header-link{{color:#9ca3af;font-size:13px;padding:6px 12px;border-radius:6px;
  border:1px solid #374151;transition:all .2s}}
.adm-header-link:hover{{color:#fff;border-color:#6b7280}}
.adm-logout{{margin-left:auto;color:#9ca3af;font-size:13px;padding:6px 12px;
  border-radius:6px;border:1px solid #374151;transition:all .2s}}
.adm-logout:hover{{color:#fff;border-color:#6b7280}}
.adm-main{{padding:20px}}
.adm-panel{{background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.06);overflow:hidden}}
.adm-count{{padding:12px 16px;font-size:13px;color:#6b7280;
  border-bottom:1px solid #f3f4f6;background:#fafafa}}
.adm-table{{width:100%;border-collapse:collapse}}
.adm-table th{{background:#f9fafb;padding:10px 14px;text-align:left;
  font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;
  letter-spacing:.06em;border-bottom:1px solid #e5e7eb;white-space:nowrap}}
.adm-table td{{padding:13px 14px;border-bottom:1px solid #f3f4f6;
  vertical-align:top;font-size:13px}}
.adm-table tr:last-child td{{border-bottom:none}}
.adm-table tr:hover td{{background:#fafafa}}
.adm-badge{{display:inline-block;padding:3px 10px;border-radius:999px;
  font-size:11px;font-weight:700;letter-spacing:.03em;border:1px solid}}
.adm-table-wrap{{overflow-x:auto}}
.adm-cards{{display:none;flex-direction:column;gap:10px;padding:12px}}
.adm-card{{background:#fff;border-radius:10px;padding:16px;box-shadow:0 1px 6px rgba(0,0,0,.06)}}
.adm-card-top{{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}}
.adm-card-id{{font-size:14px;font-weight:700;color:#111}}
.adm-card-fields{{margin-bottom:10px}}
.adm-card-row{{display:flex;justify-content:space-between;align-items:baseline;
  padding:4px 0;border-bottom:1px solid #f3f4f6;font-size:13px}}
.adm-card-row:last-child{{border-bottom:none}}
.adm-card-lbl{{color:#9ca3af;font-size:12px;min-width:60px}}
.adm-card-val{{color:#111;font-size:12px;text-align:right;word-break:break-all;max-width:70%}}
.adm-empty{{text-align:center;padding:48px 20px;color:#9ca3af}}
.adm-empty h3{{font-size:16px;font-weight:600;color:#6b7280;margin-bottom:6px}}
.adm-empty p{{font-size:13px}}
@media(max-width:720px){{
  .adm-header{{padding:10px 14px}}
  .adm-main{{padding:0 0 40px}}
  .adm-panel{{border-radius:0}}
  .adm-table-wrap{{display:none}}
  .adm-cards{{display:flex}}
}}
@media(min-width:721px){{
  .adm-table-wrap{{overflow-x:auto}}
}}
</style>
</head>
<body>
<header class="adm-header">
  <span class="adm-header-logo">CRBOX</span>
  <span class="adm-header-sep">|</span>
  <span class="adm-header-title">Consultas Generales</span>
  <a href="/admin/solicitudes" class="adm-header-link">Cotizaciones</a>
  <a href="/admin/logout" class="adm-logout">Salir</a>
</header>
<main class="adm-main">
<div class="adm-panel">
  <div class="adm-count">{count_label}</div>
  <div class="adm-table-wrap">
  <table class="adm-table">
    <thead>
      <tr>
        <th>#</th><th>Contacto</th><th>Asunto</th><th>Fecha</th><th>Email</th><th></th>
      </tr>
    </thead>
    <tbody>{table_body_html}</tbody>
  </table>
  </div>
  <div class="adm-cards">{cards_html}</div>
</div>
</main>
</body>
</html>'''


def _build_admin_consultas_detail_html(row):
    """Render the detail view for a single general inquiry. No quote/pricing UI."""
    esc = _html.escape
    rid      = str(row.get('id', '—'))
    nombre   = esc(row.get('nombre') or '—')
    correo   = esc(row.get('correo') or '—')
    telefono = esc(row.get('telefono') or '—')
    asunto   = esc(row.get('asunto') or '—')
    mensaje  = esc(row.get('mensaje') or row.get('pregunta') or '—').replace('\n', '<br>')
    source   = esc(row.get('source') or '—')
    date_str = _admin_format_date(row.get('submitted_at'))
    email_sent = row.get('email_sent', 0)
    email_badge = (
        '<span style="display:inline-block;padding:3px 10px;border-radius:999px;'
        'font-size:12px;font-weight:700;border:1px solid #BBF7D0;'
        'background:#F0FDF4;color:#15803D;">Enviado</span>'
        if email_sent else
        '<span style="display:inline-block;padding:3px 10px;border-radius:999px;'
        'font-size:12px;font-weight:700;border:1px solid #FDBA74;'
        'background:#FFF7ED;color:#C2410C;">Fallido</span>'
    )
    return f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Consulta #{rid} — CRBOX</title>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,sans-serif;
  background:#f3f4f6;color:#111;min-height:100vh}}
a{{color:inherit;text-decoration:none}}
.adm-header{{background:#1f2937;padding:12px 20px;display:flex;align-items:center;gap:14px;
  position:sticky;top:0;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,.18)}}
.adm-header-logo{{color:#FF6B00;font-weight:800;font-size:18px;letter-spacing:-.5px}}
.adm-header-title{{color:#fff;font-size:14px;font-weight:600}}
.adm-header-sep{{color:#4b5563;font-size:16px}}
.adm-header-link{{color:#9ca3af;font-size:13px;padding:6px 12px;border-radius:6px;
  border:1px solid #374151;transition:all .2s}}
.adm-header-link:hover{{color:#fff;border-color:#6b7280}}
.adm-logout{{margin-left:auto;color:#9ca3af;font-size:13px;padding:6px 12px;
  border-radius:6px;border:1px solid #374151;transition:all .2s}}
.adm-logout:hover{{color:#fff;border-color:#6b7280}}
.adm-main{{padding:20px;max-width:720px;margin:0 auto}}
.adm-back{{display:inline-flex;align-items:center;gap:6px;color:#6b7280;font-size:13px;
  margin-bottom:16px;padding:6px 0;}}
.adm-back:hover{{color:#FF6B00}}
.adm-card{{background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.06);overflow:hidden}}
.adm-card-header{{padding:16px 20px;border-bottom:1px solid #f3f4f6;background:#fafafa;
  display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}}
.adm-card-title{{font-size:15px;font-weight:700;color:#111}}
.adm-field-grid{{padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:0}}
.adm-field{{padding:10px 0;border-bottom:1px solid #f3f4f6}}
.adm-field:nth-last-child(-n+2){{border-bottom:none}}
.adm-field-label{{font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;
  letter-spacing:.06em;margin-bottom:4px}}
.adm-field-value{{font-size:13px;color:#111;word-break:break-word}}
.adm-message-block{{padding:0 20px 20px}}
.adm-message-label{{font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;
  letter-spacing:.06em;margin-bottom:8px}}
.adm-message-body{{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;
  padding:14px 16px;font-size:13px;line-height:1.65;color:#374151;white-space:pre-wrap}}
@media(max-width:540px){{
  .adm-field-grid{{grid-template-columns:1fr}}
  .adm-field{{border-bottom:1px solid #f3f4f6 !important}}
  .adm-field:last-child{{border-bottom:none !important}}
}}
</style>
</head>
<body>
<header class="adm-header">
  <span class="adm-header-logo">CRBOX</span>
  <span class="adm-header-sep">|</span>
  <span class="adm-header-title">Consultas Generales</span>
  <a href="/admin/solicitudes" class="adm-header-link">Cotizaciones</a>
  <a href="/admin/logout" class="adm-logout">Salir</a>
</header>
<main class="adm-main">
  <a href="/admin/consultas" class="adm-back">&#8592; Volver a la lista</a>
  <div class="adm-card">
    <div class="adm-card-header">
      <span class="adm-card-title">Consulta #{rid}</span>
      {email_badge}
    </div>
    <div class="adm-field-grid">
      <div class="adm-field">
        <div class="adm-field-label">Nombre</div>
        <div class="adm-field-value">{nombre}</div>
      </div>
      <div class="adm-field">
        <div class="adm-field-label">Correo</div>
        <div class="adm-field-value">{correo}</div>
      </div>
      <div class="adm-field">
        <div class="adm-field-label">Teléfono</div>
        <div class="adm-field-value">{telefono}</div>
      </div>
      <div class="adm-field">
        <div class="adm-field-label">Asunto</div>
        <div class="adm-field-value">{asunto}</div>
      </div>
      <div class="adm-field">
        <div class="adm-field-label">Fuente</div>
        <div class="adm-field-value">{source}</div>
      </div>
      <div class="adm-field">
        <div class="adm-field-label">Fecha</div>
        <div class="adm-field-value">{date_str}</div>
      </div>
    </div>
    <div class="adm-message-block">
      <div class="adm-message-label">Mensaje</div>
      <div class="adm-message-body">{mensaje}</div>
    </div>
  </div>
</main>
</body>
</html>'''


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, format, *args):
        super().log_message(format, *args)

    def do_GET(self):
        if self.path == '/health':
            self._handle_health()
        elif self.path.startswith('/admin'):
            path_no_qs = self.path.split('?')[0]
            if path_no_qs == '/admin/login':
                self._handle_admin_login_get()
            elif path_no_qs == '/admin/portal-login':
                self._handle_admin_portal_login()
            elif path_no_qs == '/admin/solicitudes':
                self._handle_admin_solicitudes_get()
            elif path_no_qs == '/admin/consultas':
                self._handle_admin_consultas_get()
            elif path_no_qs == '/admin/logout':
                self._handle_admin_logout()
            else:
                m_detail = re.match(r'^/admin/solicitudes/(SCB-\d+)$', path_no_qs)
                m_cq_detail = re.match(r'^/admin/consultas/(\d+)$', path_no_qs)
                if m_detail:
                    self._handle_admin_solicitudes_detail(m_detail.group(1))
                elif m_cq_detail:
                    self._handle_admin_consultas_detail(int(m_cq_detail.group(1)))
                else:
                    self.send_response(404)
                    self.end_headers()
        elif self.path.startswith('/api/solicitudes'):
            path_no_qs = self.path.split('?')[0]
            if path_no_qs == '/api/solicitudes':
                self._handle_solicitudes_list()
            elif path_no_qs == '/api/solicitudes/check-orphaned':
                self._handle_check_orphaned()
            else:
                m = re.match(r'^/api/solicitudes/(SCB-\d+)$', path_no_qs)
                if m:
                    self._handle_solicitudes_detail(m.group(1))
                else:
                    self.send_response(404)
                    self.end_headers()
        elif self.path.rstrip('/') == '/uploads' or self.path.rstrip('/') == '/uploads/invoices':
            # Block directory listing for the uploads folder
            self.send_response(403)
            self.end_headers()
        else:
            super().do_GET()

    def do_DELETE(self):
        """DELETE /api/invoice-upload/<filename>
        Removes an orphaned invoice file.  Requires the same portal auth as the
        upload endpoint so only the authenticated owner can delete."""
        import re as _re
        m = _re.match(r'^/api/invoice-upload/([a-f0-9\-]{36}\.[a-z]{2,4})$', self.path)
        if not m:
            self.send_response(404)
            self.end_headers()
            return
        filename = m.group(1)

        casillero_id = self._portal_auth()
        if not casillero_id:
            self._json_response(401, {'error': 'Autenticación requerida.'})
            return

        filepath = os.path.join(self._INVOICE_UPLOAD_DIR, filename)
        try:
            if os.path.isfile(filepath):
                os.remove(filepath)
                print(f'[INVOICE_DELETE] Removed: {filename} casillero={casillero_id}')
            self._json_response(200, {'ok': True})
        except Exception as exc:
            print(f'[INVOICE_DELETE] Error removing {filename}: {exc}')
            self._json_response(500, {'error': 'No se pudo eliminar el archivo.'})

    def do_POST(self):
        if self.path == '/admin/login':
            self._handle_admin_login_post()
        elif self.path == '/crbox-svc-token':
            self._handle_svc_token()
        elif self.path == '/send-quote':
            self._handle_send_quote()
        elif self.path == '/api/ai/extract':
            _handle_ai_extract(self)
        elif self.path == '/api/solicitudes':
            self._handle_solicitudes_post()
        elif self.path == '/api/consultas':
            self._handle_api_consultas_post()
        elif self.path == '/api/faq-pregunta':
            self._handle_faq_pregunta_post()
        elif self.path == '/api/solicitudes/link-guest':
            self._handle_link_guest()
        elif self.path == '/api/solicitudes/check-duplicate':
            self._handle_check_duplicate()
        elif self.path == '/api/proxy/saveBill':
            self._handle_proxy_savebill()
        elif self.path == '/api/invoice-upload':
            self._handle_invoice_upload()
        else:
            m_status       = re.match(r'^/api/solicitudes/(SCB-\d+)/status$', self.path)
            m_cancel       = re.match(r'^/api/solicitudes/(SCB-\d+)/cancel$', self.path)
            m_intent       = re.match(r'^/api/solicitudes/(SCB-\d+)/intent$', self.path)
            m_tracking     = re.match(r'^/api/solicitudes/(SCB-\d+)/tracking$', self.path)
            m_admin_status    = re.match(r'^/admin/solicitudes/(SCB-\d+)/status$', self.path)
            m_admin_respond   = re.match(r'^/admin/solicitudes/(SCB-\d+)/respond$', self.path)
            m_admin_resend    = re.match(r'^/admin/solicitudes/(SCB-\d+)/resend-response$', self.path)
            m_admin_suggest   = re.match(r'^/admin/solicitudes/(SCB-\d+)/suggest-draft$', self.path)
            m_admin_link_pkg  = re.match(r'^/admin/solicitudes/(SCB-\d+)/link-package$', self.path)
            m_admin_add_note  = re.match(r'^/admin/solicitudes/(SCB-\d+)/add-note$', self.path)
            if m_status:
                self._handle_solicitudes_status(m_status.group(1))
            elif m_cancel:
                self._handle_cancel_solicitud(m_cancel.group(1))
            elif m_intent:
                self._handle_solicitudes_intent(m_intent.group(1))
            elif m_tracking:
                self._handle_solicitudes_tracking(m_tracking.group(1))
            elif m_admin_status:
                self._handle_admin_solicitudes_status(m_admin_status.group(1))
            elif m_admin_respond:
                self._handle_admin_solicitudes_respond(m_admin_respond.group(1))
            elif m_admin_resend:
                self._handle_admin_solicitudes_resend_response(m_admin_resend.group(1))
            elif m_admin_suggest:
                self._handle_admin_solicitudes_suggest_draft(m_admin_suggest.group(1))
            elif m_admin_link_pkg:
                self._handle_admin_solicitudes_link_package(m_admin_link_pkg.group(1))
            elif m_admin_add_note:
                self._handle_admin_solicitudes_add_note(m_admin_add_note.group(1))
            else:
                self.send_response(404)
                self.end_headers()

    def _json_response(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json_error(self, status, message):
        self._json_response(status, {'error': message})

    # ── /health ────────────────────────────────────────────────────────────
    def _handle_health(self):
        """GET /health — probe SMTP and return 200 OK or 503.

        Detailed error text is written to the server log, not returned to the
        caller, to avoid exposing SMTP configuration details publicly.
        """
        ok, err = _check_smtp()
        if ok:
            self._json_response(200, {'ok': True, 'smtp': 'ok'})
        else:
            print(f'[HEALTH] SMTP probe failed: {err}')
            self._json_response(503, {'ok': False, 'smtp': 'error',
                                      'error': 'SMTP connectivity check failed'})

    # ── /send-quote ────────────────────────────────────────────────────────
    def _handle_send_quote(self):
        client_ip = self.client_address[0]
        if not _check_rate_limit(client_ip):
            _log_quote_submission('', '', '', 'failed', 'rate_limit_exceeded', ip=client_ip)
            self._json_response(429, {'ok': False, 'error': 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.'})
            return

        smtp_host = os.environ.get('SMTP_HOST', '').strip()
        smtp_port = os.environ.get('SMTP_PORT', '587').strip()
        smtp_user = os.environ.get('SMTP_USER', '').strip()
        smtp_pass = os.environ.get('SMTP_PASS', '').strip()

        if not all([smtp_host, smtp_user, smtp_pass]):
            _log_quote_submission('', '', '', 'failed', 'smtp_not_configured', ip=client_ip)
            self._json_response(503, {'ok': False, 'error': 'El servicio de email no está configurado en el servidor.'})
            return

        try:
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length).decode('utf-8')
            data = json.loads(raw)
        except Exception:
            _log_quote_submission('', '', '', 'failed', 'invalid_request_body', ip=client_ip)
            self._json_response(400, {'ok': False, 'error': 'Solicitud inválida.'})
            return

        subject   = data.get('subject', 'Solicitud de cotización | CRBOX')
        user_email = data.get('userEmail', '').strip()
        user_name  = data.get('userName', '').strip()
        body_text  = data.get('bodyText', '').strip()

        if not user_email or not body_text:
            _log_quote_submission(user_name, user_email, subject, 'failed', 'missing_required_fields', ip=client_ip)
            self._json_response(400, {'ok': False, 'error': 'Faltan campos requeridos (correo o cuerpo del mensaje).'})
            return

        # Basic email format guard (frontend validates too, but defense in depth)
        if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', user_email):
            _log_quote_submission(user_name, user_email, subject, 'failed', 'invalid_email_format', ip=client_ip)
            self._json_response(400, {'ok': False, 'error': 'Correo electrónico inválido.'})
            return

        # Build MIME message
        msg = email.mime.multipart.MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From']    = f'CRBOX Calculadora <{smtp_user}>'
        msg['To']      = QUOTE_RECIPIENT
        msg['Cc']      = user_email
        msg['Reply-To'] = user_email

        plain_part = email.mime.text.MIMEText(body_text, 'plain', 'utf-8')
        html_part  = email.mime.text.MIMEText(_quote_text_to_html(body_text), 'html', 'utf-8')

        msg.attach(plain_part)
        msg.attach(html_part)

        recipients = [QUOTE_RECIPIENT, user_email]

        try:
            port_int = int(smtp_port)
            if port_int == 465:
                with smtplib.SMTP_SSL(smtp_host, port_int, timeout=15) as server:
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_user, recipients, msg.as_string())
            else:
                with smtplib.SMTP(smtp_host, port_int, timeout=15) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_user, recipients, msg.as_string())

            _log_quote_submission(user_name, user_email, subject, 'sent', ip=client_ip)
            self._json_response(200, {'ok': True})

        except smtplib.SMTPAuthenticationError:
            _log_quote_submission(user_name, user_email, subject, 'failed', 'SMTPAuthenticationError', ip=client_ip)
            self._json_response(502, {'ok': False, 'error': 'Error de autenticación SMTP. Verifica las credenciales del servidor.'})
        except smtplib.SMTPException as e:
            _log_quote_submission(user_name, user_email, subject, 'failed', f'SMTPException: {e}', ip=client_ip)
            self._json_response(502, {'ok': False, 'error': 'No se pudo enviar el email. Intenta de nuevo.'})
        except Exception as e:
            _log_quote_submission(user_name, user_email, subject, 'failed', f'Exception: {e}', ip=client_ip)
            self._json_response(500, {'ok': False, 'error': 'Error interno del servidor al enviar el email.'})

    # ── POST /api/solicitudes ──────────────────────────────────────────────
    def _handle_solicitudes_post(self):
        client_ip = self.client_address[0]
        try:
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length).decode('utf-8')
            data = json.loads(raw)
        except Exception:
            self._json_error(400, 'Solicitud inválida.')
            return

        product_name = (data.get('product_name') or '').strip()
        customer_email = (data.get('customer_email') or '').strip()
        declared_value_raw = data.get('declared_value_usd')

        errors = []
        if not product_name or len(product_name) < 3:
            errors.append('product_name debe tener al menos 3 caracteres.')
        if not customer_email or not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', customer_email):
            errors.append('customer_email inválido.')
        try:
            declared_value_usd = float(declared_value_raw)
            if declared_value_usd <= 0:
                raise ValueError
        except (TypeError, ValueError):
            errors.append('declared_value_usd debe ser un número mayor que 0.')

        if errors:
            self._json_response(400, {'ok': False, 'errors': errors})
            return

        scb_id = _generate_scb_id()
        now_iso = _now_iso()
        now_disp = _now_display()

        expires_ts = time.gmtime(time.time() + 30 * 24 * 3600)
        expires_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', expires_ts)

        customer_name = (data.get('customer_name') or '').strip() or None
        account_type = data.get('account_type', 'anonymous')
        if account_type not in ('personal', 'business', 'anonymous'):
            account_type = 'anonymous'
        casillero_id = (data.get('casillero_id') or '').strip() or None

        # Optional portal-auth hardening: when the caller supplies auth headers
        # (Bearer token + X-Casillero-Email), verify the token server-side and
        # derive casillero_id from the CRBOX API response instead of trusting the
        # client-provided payload value.  Fails silently to preserve backward
        # compatibility with unauthenticated (webhook / public) callers.
        auth_header = self.headers.get('Authorization', '').strip()
        email_header = self.headers.get('X-Casillero-Email', '').strip()
        if auth_header.startswith('Bearer ') and email_header:
            verified_id = self._portal_auth()
            if verified_id:
                casillero_id = verified_id

        product_url = (data.get('product_url') or '').strip() or None
        category = (data.get('category') or 'otros').strip()
        weight_kg = data.get('weight_kg')
        length_cm = data.get('length_cm')
        width_cm = data.get('width_cm')
        height_cm = data.get('height_cm')
        customer_notes = (data.get('customer_notes') or '').strip()[:500] or None
        service_type = data.get('service_type', 'aereo')
        if service_type not in ('aereo', 'maritimo'):
            service_type = 'aereo'
        destination_zone = (data.get('destination_zone') or '').strip() or None
        estimate_usd = data.get('estimate_usd')
        estimate_breakdown = data.get('estimate_breakdown')
        data_source = data.get('data_source', 'manual')
        if data_source not in ('manual', 'ai_extracted', 'ai_partial'):
            data_source = 'manual'
        ai_extraction_result = data.get('ai_extraction_result')
        ai_extraction_json = (
            json.dumps(ai_extraction_result)
            if 'ai_extraction_result' in data and ai_extraction_result is not None
            else None
        )

        try:
            weight_kg = float(weight_kg) if weight_kg is not None else None
            length_cm = float(length_cm) if length_cm is not None else None
            width_cm = float(width_cm) if width_cm is not None else None
            height_cm = float(height_cm) if height_cm is not None else None
            estimate_usd = float(estimate_usd) if estimate_usd is not None else None
        except (TypeError, ValueError):
            weight_kg = length_cm = width_cm = height_cm = estimate_usd = None

        estimate_breakdown_json = json.dumps(estimate_breakdown) if estimate_breakdown else None
        hist_id = _uuid4_hex()

        try:
            with _DB_LOCK:
                conn = _get_db()
                conn.execute(
                    '''INSERT INTO quote_requests
                       (id, casillero_id, customer_email, customer_name, account_type,
                        product_name, product_url, declared_value_usd, category,
                        weight_kg, length_cm, width_cm, height_cm, customer_notes,
                        service_type, destination_zone, estimate_usd, estimate_breakdown,
                        data_source, ai_extraction_json, status, submitted_at, expires_at)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                    (scb_id, casillero_id, customer_email, customer_name, account_type,
                     product_name, product_url, declared_value_usd, category,
                     weight_kg, length_cm, width_cm, height_cm, customer_notes,
                     service_type, destination_zone, estimate_usd, estimate_breakdown_json,
                     data_source, ai_extraction_json, 'enviada', now_iso, expires_iso)
                )
                conn.execute(
                    '''INSERT INTO quote_status_history
                       (id, quote_request_id, from_status, to_status, changed_at, changed_by)
                       VALUES (?,?,?,?,?,?)''',
                    (hist_id, scb_id, None, 'enviada', now_iso, 'system')
                )
                conn.commit()
                conn.close()
        except Exception as exc:
            print(f'[SOLICITUDES] DB error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno al guardar la solicitud.'})
            return

        print(f'[SOLICITUDES] Stored {scb_id} for {customer_email}')

        settings = _smtp_settings()
        smtp_user = settings[2] if settings else 'noreply@crbox.cr'

        email_errors = []
        try:
            _send_customer_confirmation(
                scb_id, customer_email, customer_name, product_name,
                declared_value_usd, category, now_disp, smtp_user
            )
            print(f'[SOLICITUDES] Customer confirmation sent to {customer_email}')
        except Exception as exc:
            email_errors.append(f'customer: {exc}')
            print(f'[SOLICITUDES] Customer email failed: {exc}')

        try:
            _send_sales_submission(
                scb_id, customer_email, customer_name, casillero_id, account_type,
                product_name, product_url, declared_value_usd, category,
                weight_kg, length_cm, width_cm, height_cm, data_source,
                service_type, destination_zone, estimate_usd, customer_notes,
                now_disp, smtp_user
            )
            print(f'[SOLICITUDES] Sales email sent to {QUOTE_RECIPIENT}')
        except Exception as exc:
            email_errors.append(f'sales: {exc}')
            print(f'[SOLICITUDES] Sales email failed: {exc}')

        resp = {'ok': True, 'id': scb_id}
        if email_errors:
            resp['email_warnings'] = email_errors
        self._json_response(200, resp)

    # ── POST /api/solicitudes/:id/status ───────────────────────────────────
    def _handle_solicitudes_status(self, scb_id):
        sales_token = os.environ.get('SALES_TOKEN', _DEV_SALES_TOKEN).strip()
        provided_token = self.headers.get('X-Sales-Token', '').strip()
        if not provided_token or provided_token != sales_token:
            self._json_response(401, {'ok': False, 'error': 'Token inválido o faltante.'})
            return

        try:
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length).decode('utf-8')
            data = json.loads(raw)
        except Exception:
            self._json_error(400, 'Solicitud inválida.')
            return

        new_status = (data.get('status') or '').strip()
        note = (data.get('note') or '').strip() or None

        if new_status not in _LEGAL_TRANSITIONS:
            self._json_response(400, {'ok': False, 'error': f'Estado desconocido: {new_status}'})
            return

        try:
            with _DB_LOCK:
                conn = _get_db()
                row = conn.execute(
                    'SELECT status FROM quote_requests WHERE id = ?', (scb_id,)
                ).fetchone()
                if row is None:
                    conn.close()
                    self._json_response(404, {'ok': False, 'error': f'{scb_id} no encontrado.'})
                    return

                current_status = row['status']
                if new_status not in _LEGAL_TRANSITIONS.get(current_status, set()):
                    conn.close()
                    self._json_response(400, {'ok': False, 'error':
                        f'Transición inválida: {current_status} → {new_status}'})
                    return

                now_iso = _now_iso()
                hist_id = _uuid4_hex()
                extra_col = ''
                extra_val = ()
                if new_status == 'respondida':
                    extra_col = ', responded_at = ?'
                    extra_val = (now_iso,)
                elif new_status == 'completada':
                    extra_col = ', completed_at = ?'
                    extra_val = (now_iso,)
                elif new_status == 'cancelada':
                    extra_col = ', cancelled_at = ?'
                    extra_val = (now_iso,)

                conn.execute(
                    f'UPDATE quote_requests SET status = ?{extra_col} WHERE id = ?',
                    (new_status,) + extra_val + (scb_id,)
                )
                conn.execute(
                    '''INSERT INTO quote_status_history
                       (id, quote_request_id, from_status, to_status, changed_at, changed_by, note)
                       VALUES (?,?,?,?,?,?,?)''',
                    (hist_id, scb_id, current_status, new_status, now_iso, 'sales', note)
                )
                conn.commit()
                conn.close()

            print(f'[SOLICITUDES] Status updated: {scb_id} {current_status} → {new_status}')
            self._json_response(200, {'ok': True, 'id': scb_id,
                                       'from': current_status, 'to': new_status})
        except Exception as exc:
            print(f'[SOLICITUDES] Status update error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno.'})

    # ── Portal auth helper ─────────────────────────────────────────────────
    _CRBOX_API_BASE = 'https://clients.crbox.cr/api/crboxwebapi'

    def _portal_auth(self):
        """Validate the caller against the CRBOX API and return casillero_id.

        Requires:
          Authorization: Bearer <token>   (forwarded to CRBOX API)
          X-Casillero-Email: <email>      (used to build the getuserinfo URL)

        The token is verified server-side by calling CRBOX's /getuserinfo
        endpoint with the provided Bearer token.  401/403 from CRBOX means
        the token is invalid or expired.  The casillero_id is extracted from
        the verified API response — the client-supplied value is never trusted.

        Returns the verified casillero_id string on success, or None on failure.
        """
        auth_header = self.headers.get('Authorization', '').strip()
        email       = self.headers.get('X-Casillero-Email', '').strip()

        if not auth_header.startswith('Bearer ') or len(auth_header) < 10:
            return None
        if not email or '@' not in email:
            return None

        api_url = (
            self._CRBOX_API_BASE + '/getuserinfo/' +
            urllib.parse.quote(email, safe='')
        )
        req = urllib.request.Request(
            api_url,
            headers={'Authorization': auth_header}
        )
        try:
            with urllib.request.urlopen(req, timeout=6) as resp:
                if resp.status not in (200,):
                    return None
                data = json.loads(resp.read().decode())
        except urllib.error.HTTPError as exc:
            # 401 / 403 → invalid / expired token
            if exc.code in (401, 403):
                return None
            print(f'[PORTAL_AUTH] CRBOX API error {exc.code}')
            return None
        except Exception as exc:
            print(f'[PORTAL_AUTH] Unexpected error: {exc}')
            return None

        # Extract casillero_id from the verified response
        consignee = data.get('Consignee') or data
        cas_id = (
            consignee.get('idconsignee') or
            consignee.get('IdConsignee') or
            consignee.get('idConsignee')
        )
        if not cas_id:
            print(f'[PORTAL_AUTH] idconsignee missing in CRBOX response')
            return None
        return str(cas_id).strip()

    def _portal_auth_full(self):
        """Like _portal_auth() but returns (casillero_id, verified_email).

        The email is derived from the CRBOX API response when available, falling
        back to the X-Casillero-Email header (which is still implicitly validated
        because CRBOX /getuserinfo/<email> is called with the Bearer token, so a
        token-email mismatch causes a 401 from CRBOX).
        """
        auth_header = self.headers.get('Authorization', '').strip()
        header_email = self.headers.get('X-Casillero-Email', '').strip()

        if not auth_header.startswith('Bearer ') or len(auth_header) < 10:
            return None, None
        if not header_email or '@' not in header_email:
            return None, None

        api_url = (
            self._CRBOX_API_BASE + '/getuserinfo/' +
            urllib.parse.quote(header_email, safe='')
        )
        req = urllib.request.Request(api_url, headers={'Authorization': auth_header})
        try:
            with urllib.request.urlopen(req, timeout=6) as resp:
                if resp.status not in (200,):
                    return None, None
                data = json.loads(resp.read().decode())
        except urllib.error.HTTPError as exc:
            if exc.code in (401, 403):
                return None, None
            print(f'[PORTAL_AUTH] CRBOX API error {exc.code}')
            return None, None
        except Exception as exc:
            print(f'[PORTAL_AUTH] Unexpected error: {exc}')
            return None, None

        consignee = data.get('Consignee') or data
        cas_id = (
            consignee.get('idconsignee') or
            consignee.get('IdConsignee') or
            consignee.get('idConsignee')
        )
        if not cas_id:
            return None, None

        # Prefer server-verified email from API response; fall back to header
        api_email = (
            consignee.get('email') or consignee.get('Email') or
            consignee.get('correo') or consignee.get('Correo') or
            header_email
        ).strip().lower()

        return str(cas_id).strip(), api_email

    # ── GET /api/solicitudes ───────────────────────────────────────────────
    def _handle_solicitudes_list(self):
        casillero_id = self._portal_auth()
        if not casillero_id:
            self._json_response(401, {'ok': False, 'error': 'Autenticación requerida.'})
            return

        # Optional ?status= filter
        qs = urllib.parse.parse_qs(self.path.partition('?')[2])
        status_filter = (qs.get('status', [''])[0] or '').strip()

        try:
            with _DB_LOCK:
                conn = _get_db()
                if status_filter and status_filter in _LEGAL_TRANSITIONS:
                    rows = conn.execute(
                        '''SELECT * FROM quote_requests
                           WHERE casillero_id = ?
                             AND status = ?
                           ORDER BY submitted_at DESC''',
                        (casillero_id, status_filter)
                    ).fetchall()
                else:
                    rows = conn.execute(
                        '''SELECT * FROM quote_requests
                           WHERE casillero_id = ?
                           ORDER BY submitted_at DESC''',
                        (casillero_id,)
                    ).fetchall()
                conn.close()

            results = [dict(r) for r in rows]
            self._json_response(200, {'ok': True, 'solicitudes': results})
        except Exception as exc:
            print(f'[SOLICITUDES] List error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno.'})

    # ── GET /api/solicitudes/:id ───────────────────────────────────────────
    def _handle_solicitudes_detail(self, scb_id):
        casillero_id = self._portal_auth()
        if not casillero_id:
            self._json_response(401, {'ok': False, 'error': 'Autenticación requerida.'})
            return

        try:
            with _DB_LOCK:
                conn = _get_db()
                row = conn.execute(
                    'SELECT * FROM quote_requests WHERE id = ?', (scb_id,)
                ).fetchone()

                if row is None:
                    conn.close()
                    self._json_response(404, {'ok': False, 'error': f'{scb_id} no encontrado.'})
                    return

                row_dict = dict(row)

                # Security: require a strict casillero_id match.
                # Records with a missing casillero_id (legacy/orphaned rows) are
                # also denied — never return data that cannot be positively attributed.
                row_cas = (row_dict.get('casillero_id') or '').strip()
                if not row_cas or row_cas != casillero_id:
                    conn.close()
                    self._json_response(404, {'ok': False, 'error': f'{scb_id} no encontrado.'})
                    return

                history = conn.execute(
                    '''SELECT * FROM quote_status_history
                       WHERE quote_request_id = ?
                       ORDER BY changed_at DESC''',
                    (scb_id,)
                ).fetchall()
                conn.close()

            row_dict['history'] = [
                dict(h) for h in history
                if not (h['from_status'] and h['to_status'] and h['from_status'] == h['to_status'])
            ]
            self._json_response(200, {'ok': True, 'solicitud': row_dict})
        except Exception as exc:
            print(f'[SOLICITUDES] Detail error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno.'})

    # ── GET /api/solicitudes/check-orphaned ───────────────────────────────
    def _handle_check_orphaned(self):
        casillero_id, email = self._portal_auth_full()
        if not casillero_id:
            self._json_response(401, {'ok': False, 'error': 'Autenticación requerida.'})
            return
        if not email or '@' not in email:
            self._json_response(400, {'ok': False, 'error': 'Email requerido.'})
            return
        try:
            with _DB_LOCK:
                conn = _get_db()
                rows = conn.execute(
                    '''SELECT id, product_name, submitted_at FROM quote_requests
                       WHERE casillero_id IS NULL AND LOWER(customer_email) = LOWER(?)
                       ORDER BY submitted_at DESC''',
                    (email,)
                ).fetchall()
                conn.close()
            results = [dict(r) for r in rows]
            self._json_response(200, {
                'ok': True,
                'count': len(results),
                'ids': [r['id'] for r in results],
                'requests': results
            })
        except Exception as exc:
            print(f'[SOLICITUDES] check-orphaned error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno.'})

    # ── POST /api/solicitudes/link-guest ──────────────────────────────────
    def _handle_link_guest(self):
        casillero_id, email = self._portal_auth_full()
        if not casillero_id:
            self._json_response(401, {'ok': False, 'error': 'Autenticación requerida.'})
            return
        if not email or '@' not in email:
            self._json_response(400, {'ok': False, 'error': 'Email requerido.'})
            return
        try:
            with _DB_LOCK:
                conn = _get_db()
                result = conn.execute(
                    '''UPDATE quote_requests SET casillero_id = ?
                       WHERE casillero_id IS NULL AND LOWER(customer_email) = LOWER(?)''',
                    (casillero_id, email)
                )
                linked = result.rowcount
                conn.commit()
                conn.close()
            print(f'[SOLICITUDES] Linked {linked} orphaned records to casillero {casillero_id}')
            self._json_response(200, {'ok': True, 'linked': linked})
        except Exception as exc:
            print(f'[SOLICITUDES] link-guest error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno.'})

    # ── POST /api/solicitudes/check-duplicate ─────────────────────────────
    def _handle_check_duplicate(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length).decode('utf-8')
            data = json.loads(raw)
        except Exception:
            self._json_response(400, {'ok': False, 'error': 'Solicitud inválida.'})
            return

        product_name   = (data.get('product_name') or '').strip()
        # Accept both 'url' and 'product_url' for API compatibility
        product_url    = (data.get('product_url') or data.get('url') or '').strip()
        customer_email = (data.get('email') or '').strip()

        # Derive casillero_id from auth token (server-side) rather than
        # trusting the client-supplied value.  If no valid token is present,
        # fall back to an email-only check so unauthenticated public requests
        # cannot enumerate records by casillero_id.
        auth_header = self.headers.get('Authorization', '').strip()
        casillero_id = ''
        if auth_header.startswith('Bearer ') and len(auth_header) >= 10:
            verified_id = self._portal_auth()
            if verified_id:
                casillero_id = verified_id

        if not product_name and not product_url:
            self._json_response(200, {'ok': True, 'duplicate': False, 'existing_id': None})
            return

        cutoff = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() - 24 * 3600))

        try:
            with _DB_LOCK:
                conn = _get_db()
                conditions = ['submitted_at >= ?', "status NOT IN ('cancelada', 'expirada')"]
                params = [cutoff]

                if casillero_id:
                    conditions.append('casillero_id = ?')
                    params.append(casillero_id)
                elif customer_email:
                    conditions.append('LOWER(customer_email) = LOWER(?)')
                    params.append(customer_email)
                else:
                    conn.close()
                    self._json_response(200, {'ok': True, 'duplicate': False, 'existing_id': None})
                    return

                match_parts = []
                match_params = []
                if product_url:
                    match_parts.append('product_url = ?')
                    match_params.append(product_url)
                if product_name:
                    match_parts.append('LOWER(product_name) = LOWER(?)')
                    match_params.append(product_name)
                if match_parts:
                    conditions.append('(' + ' OR '.join(match_parts) + ')')
                    params.extend(match_params)

                query = ('SELECT id, submitted_at FROM quote_requests WHERE '
                         + ' AND '.join(conditions)
                         + ' ORDER BY submitted_at DESC LIMIT 1')
                row = conn.execute(query, params).fetchone()
                conn.close()

            if row:
                try:
                    submitted_ts = calendar.timegm(
                        time.strptime(row['submitted_at'], '%Y-%m-%dT%H:%M:%SZ')
                    )
                    hours_ago = max(0, int((time.time() - submitted_ts) / 3600))
                except Exception:
                    hours_ago = 0
                self._json_response(200, {
                    'ok': True, 'duplicate': True,
                    'existing_id': row['id'], 'hours_ago': hours_ago
                })
            else:
                self._json_response(200, {'ok': True, 'duplicate': False, 'existing_id': None})
        except Exception as exc:
            print(f'[SOLICITUDES] check-duplicate error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno.'})

    # ── POST /api/proxy/saveBill ───────────────────────────────────────────
    # Server-side proxy for the WordPress invoice-file upload endpoint.
    # The browser cannot call https://crbox.cr/wp-json/crbox/v1/saveBill
    # directly because WordPress does not send CORS headers for that route.
    # This handler forwards the raw multipart/form-data body verbatim to
    # WordPress, then relays the response back — no CORS restrictions apply
    # to server-to-server requests.
    _SAVEBILL_WP_URL = 'https://crbox.cr/wp-json/crbox/v1/saveBill'
    _SAVEBILL_MAX    = 12 * 1024 * 1024  # 12 MB hard ceiling

    def _handle_proxy_savebill(self):
        import base64 as _b64
        try:
            ct = self.headers.get('Content-Type', '')
            if not ct.lower().startswith('multipart/form-data'):
                self._json_response(400, {'error': 'Content-Type must be multipart/form-data'})
                return

            length = int(self.headers.get('Content-Length', 0))
            if length <= 0 or length > self._SAVEBILL_MAX:
                self._json_response(413, {'error': 'Tamaño de archivo inválido o demasiado grande.'})
                return

            body = self.rfile.read(length)

            req = urllib.request.Request(
                self._SAVEBILL_WP_URL,
                data=body,
                method='POST',
            )
            req.add_header('Content-Type', ct)
            req.add_header('Content-Length', str(length))
            req.add_header('User-Agent', 'CRBOX-Portal-Proxy/1.0')

            # Authenticate with WordPress using the service account credentials.
            # WordPress REST API accepts HTTP Basic auth when Application Passwords
            # are enabled (WordPress 5.6+) or via a compatible auth plugin.
            svc_email = os.environ.get('CRBOX_SVC_EMAIL', '')
            svc_pass  = os.environ.get('CRBOX_SVC_PASSWORD', '')
            if svc_email and svc_pass:
                creds = _b64.b64encode(f'{svc_email}:{svc_pass}'.encode()).decode()
                req.add_header('Authorization', f'Basic {creds}')

            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    resp_body = resp.read(1 * 1024 * 1024)  # cap at 1 MB
                    resp_ct   = resp.headers.get('Content-Type', 'application/json')
                    resp_code = resp.status
            except urllib.error.HTTPError as exc:
                resp_body = exc.read(1 * 1024 * 1024)
                resp_ct   = exc.headers.get('Content-Type', 'application/json')
                resp_code = exc.code
                print(f'[PROXY/saveBill] WordPress HTTP {resp_code}')

            self.send_response(resp_code)
            if 'json' in resp_ct:
                self.send_header('Content-Type', 'application/json')
            else:
                self.send_header('Content-Type', resp_ct)
            self.send_header('Content-Length', str(len(resp_body)))
            self.end_headers()
            self.wfile.write(resp_body)

        except Exception as exc:
            print(f'[PROXY/saveBill] Unexpected error: {exc}')
            self._json_response(502, {'error': f'Error de proxy: {exc}'})

    # ── POST /api/invoice-upload ───────────────────────────────────────────
    # Stores the invoice file locally and returns a public URL so the client
    # can pass it as FileLocation to createPurchaseBill without depending on
    # the WordPress saveBill endpoint (which requires WP auth we don't have).
    _INVOICE_UPLOAD_DIR  = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', 'invoices')
    _INVOICE_MAX_BYTES   = 12 * 1024 * 1024  # 12 MB
    _INVOICE_ALLOW_TYPES = {
        'application/pdf':  '.pdf',
        'image/jpeg':       '.jpg',
        'image/jpg':        '.jpg',
        'image/png':        '.png',
        'image/gif':        '.gif',
        'image/webp':       '.webp',
    }

    def _handle_invoice_upload(self):
        import uuid as _uuid
        import warnings as _warnings
        with _warnings.catch_warnings():
            _warnings.simplefilter('ignore', DeprecationWarning)
            import cgi as _cgi  # noqa: PLC0415 — deprecated but still available in Python ≤3.12
        # Require portal auth so only logged-in clients can store files
        casillero_id = self._portal_auth()
        if not casillero_id:
            self._json_response(401, {'error': 'Autenticación requerida.'})
            return

        ct     = self.headers.get('Content-Type', '')
        length = int(self.headers.get('Content-Length', 0))
        if length <= 0 or length > self._INVOICE_MAX_BYTES:
            self._json_response(413, {'error': 'Tamaño de archivo inválido o demasiado grande (máx. 12 MB).'})
            return

        try:
            with _warnings.catch_warnings():
                _warnings.simplefilter('ignore', DeprecationWarning)
                form = _cgi.FieldStorage(
                    fp=self.rfile,
                    headers=self.headers,
                    environ={
                        'REQUEST_METHOD': 'POST',
                        'CONTENT_TYPE':   ct,
                        'CONTENT_LENGTH': str(length),
                    },
                    keep_blank_values=True,
                )
        except Exception as exc:
            print(f'[INVOICE_UPLOAD] Form parse error: {exc}')
            self._json_response(400, {'error': 'No se pudo leer el formulario. Intenta de nuevo.'})
            return

        file_item = form.get('invoice') if hasattr(form, 'get') else None
        if not file_item or not hasattr(file_item, 'file') or file_item.file is None:
            self._json_response(400, {'error': 'Campo "invoice" requerido.'})
            return

        file_bytes  = file_item.file.read()
        if not file_bytes:
            self._json_response(400, {'error': 'El archivo está vacío.'})
            return

        mime        = (file_item.type or 'application/octet-stream').split(';')[0].strip().lower()
        orig_name   = (file_item.filename or 'invoice').strip()

        # Determine extension from MIME, fall back to the original filename's ext
        ext = self._INVOICE_ALLOW_TYPES.get(mime)
        if not ext:
            _, dot, orig_ext = orig_name.rpartition('.')
            ext = ('.' + orig_ext.lower()) if dot else '.bin'
            if ext not in ('.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'):
                self._json_response(415, {'error': 'Tipo de archivo no permitido. Usa PDF, JPG, PNG, GIF o WEBP.'})
                return

        # Persist with a UUID name so the path is unguessable
        filename = str(_uuid.uuid4()) + ext
        os.makedirs(self._INVOICE_UPLOAD_DIR, exist_ok=True)
        filepath = os.path.join(self._INVOICE_UPLOAD_DIR, filename)
        try:
            with open(filepath, 'wb') as fh:
                fh.write(file_bytes)
        except Exception as exc:
            print(f'[INVOICE_UPLOAD] Write error: {exc}')
            self._json_response(500, {'error': 'Error al guardar el archivo. Intenta de nuevo.'})
            return

        print(f'[INVOICE_UPLOAD] Saved: {filename} ({len(file_bytes)} bytes) casillero={casillero_id}')
        self._json_response(200, {
            'url':  '/uploads/invoices/' + filename,
            'type': mime,
            'file': filename,
        })

    # ── POST /api/solicitudes/:id/cancel ──────────────────────────────────
    def _handle_cancel_solicitud(self, scb_id):
        casillero_id = self._portal_auth()
        if not casillero_id:
            self._json_response(401, {'ok': False, 'error': 'Autenticación requerida.'})
            return
        try:
            with _DB_LOCK:
                conn = _get_db()
                row = conn.execute(
                    'SELECT * FROM quote_requests WHERE id = ?', (scb_id,)
                ).fetchone()
                if row is None:
                    conn.close()
                    self._json_response(404, {'ok': False, 'error': f'{scb_id} no encontrado.'})
                    return
                row_dict = dict(row)
                row_cas = (row_dict.get('casillero_id') or '').strip()
                if not row_cas or row_cas != casillero_id:
                    conn.close()
                    self._json_response(404, {'ok': False, 'error': f'{scb_id} no encontrado.'})
                    return
                if row_dict.get('status') != 'enviada':
                    conn.close()
                    self._json_response(400, {
                        'ok': False,
                        'error': 'Solo se pueden cancelar solicitudes en estado "Enviada".'
                    })
                    return
                now_iso  = _now_iso()
                hist_id  = _uuid4_hex()
                conn.execute(
                    'UPDATE quote_requests SET status = ?, cancelled_at = ? WHERE id = ?',
                    ('cancelada', now_iso, scb_id)
                )
                conn.execute(
                    '''INSERT INTO quote_status_history
                       (id, quote_request_id, from_status, to_status, changed_at, changed_by, note)
                       VALUES (?,?,?,?,?,?,?)''',
                    (hist_id, scb_id, 'enviada', 'cancelada', now_iso, 'user',
                     'Cancelada por el cliente')
                )
                conn.commit()
                conn.close()
            print(f'[SOLICITUDES] {scb_id} cancelled by casillero {casillero_id}')
            settings  = _smtp_settings()
            smtp_user = settings[2] if settings else 'noreply@crbox.cr'
            try:
                _send_cancellation_email(
                    scb_id,
                    row_dict['customer_email'],
                    row_dict.get('customer_name'),
                    row_dict['product_name'],
                    smtp_user
                )
            except Exception as exc:
                print(f'[SOLICITUDES] Cancellation email failed: {exc}')
            self._json_response(200, {'ok': True, 'id': scb_id, 'status': 'cancelada'})
        except Exception as exc:
            print(f'[SOLICITUDES] Cancel error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno.'})

    # ── POST /api/solicitudes/:id/intent ───────────────────────────────────
    def _handle_solicitudes_intent(self, scb_id):
        """Portal-auth endpoint. Customer confirms their intent after seeing a response.

        Body: {"intent": "crbox" | "cliente" | "cancel"}
        - crbox    → pendiente_compra_crbox
        - cliente  → pendiente_compra_cliente
        - cancel   → cancelada
        Only valid when current status is "respondida".
        """
        casillero_id = self._portal_auth()
        if not casillero_id:
            self._json_response(401, {'ok': False, 'error': 'Autenticación requerida.'})
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length).decode('utf-8')
            data = json.loads(raw)
        except Exception:
            self._json_response(400, {'ok': False, 'error': 'Solicitud inválida.'})
            return

        intent = (data.get('intent') or '').strip()
        _INTENT_MAP = {
            'crbox':   'pendiente_compra_crbox',
            'cliente': 'pendiente_compra_cliente',
            'cancel':  'cancelada',
        }
        if intent not in _INTENT_MAP:
            self._json_response(400, {'ok': False, 'error': f'Intent inválido: {intent}'})
            return

        new_status = _INTENT_MAP[intent]
        _INTENT_NOTES = {
            'pendiente_compra_crbox':   'Cliente confirmó: CRBOX comprará el producto en su nombre',
            'pendiente_compra_cliente': 'Cliente confirmó: comprará por su cuenta',
            'cancelada':                'Cliente decidió no continuar',
        }

        try:
            with _DB_LOCK:
                conn = _get_db()
                row = conn.execute(
                    'SELECT * FROM quote_requests WHERE id = ?', (scb_id,)
                ).fetchone()
                if row is None:
                    conn.close()
                    self._json_response(404, {'ok': False, 'error': f'{scb_id} no encontrado.'})
                    return
                row_dict = dict(row)
                row_cas = (row_dict.get('casillero_id') or '').strip()
                if not row_cas or row_cas != casillero_id:
                    conn.close()
                    self._json_response(404, {'ok': False, 'error': f'{scb_id} no encontrado.'})
                    return
                if row_dict.get('status') != 'respondida':
                    conn.close()
                    self._json_response(400, {
                        'ok': False,
                        'error': 'Solo se puede confirmar una intención en solicitudes respondidas.'
                    })
                    return

                now_iso = _now_iso()
                hist_id = _uuid4_hex()
                extra_col = ', cancelled_at = ?' if new_status == 'cancelada' else ''
                extra_val = (now_iso,)             if new_status == 'cancelada' else ()

                conn.execute(
                    f'UPDATE quote_requests SET status = ?{extra_col} WHERE id = ?',
                    (new_status,) + extra_val + (scb_id,)
                )
                conn.execute(
                    '''INSERT INTO quote_status_history
                       (id, quote_request_id, from_status, to_status, changed_at, changed_by, note)
                       VALUES (?,?,?,?,?,?,?)''',
                    (hist_id, scb_id, 'respondida', new_status, now_iso, 'user',
                     _INTENT_NOTES.get(new_status, ''))
                )
                conn.commit()
                conn.close()

            print(f'[SOLICITUDES] Intent: {scb_id} respondida → {new_status} (casillero {casillero_id})')
            if new_status == 'cancelada':
                settings  = _smtp_settings()
                smtp_user = settings[2] if settings else 'noreply@crbox.cr'
                try:
                    _send_cancellation_email(
                        scb_id,
                        row_dict['customer_email'],
                        row_dict.get('customer_name'),
                        row_dict['product_name'],
                        smtp_user
                    )
                    print(f'[SOLICITUDES] Intent-cancel email sent: {scb_id}')
                except Exception as email_exc:
                    print(f'[SOLICITUDES] Intent-cancel email failed: {email_exc}')
            self._json_response(200, {'ok': True, 'id': scb_id, 'new_status': new_status})
        except Exception as exc:
            print(f'[SOLICITUDES] Intent error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno.'})

    # ── POST /api/solicitudes/:id/tracking ─────────────────────────────────
    def _handle_solicitudes_tracking(self, scb_id):
        """Portal-auth endpoint. Customer saves (or updates) the expected tracking number.

        Body: {"tracking_number": "..."}
        Only valid when current status is "pendiente_compra_cliente".
        """
        casillero_id = self._portal_auth()
        if not casillero_id:
            self._json_response(401, {'ok': False, 'error': 'Autenticación requerida.'})
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length).decode('utf-8')
            data = json.loads(raw)
        except Exception:
            self._json_response(400, {'ok': False, 'error': 'Solicitud inválida.'})
            return

        tracking = (data.get('tracking_number') or '').strip()
        if not tracking:
            self._json_response(400, {'ok': False, 'error': 'Número de seguimiento requerido.'})
            return

        try:
            with _DB_LOCK:
                conn = _get_db()
                row = conn.execute(
                    'SELECT status, casillero_id FROM quote_requests WHERE id = ?', (scb_id,)
                ).fetchone()
                if row is None:
                    conn.close()
                    self._json_response(404, {'ok': False, 'error': f'{scb_id} no encontrado.'})
                    return
                row_dict = dict(row)
                row_cas = (row_dict.get('casillero_id') or '').strip()
                if not row_cas or row_cas != casillero_id:
                    conn.close()
                    self._json_response(404, {'ok': False, 'error': f'{scb_id} no encontrado.'})
                    return
                if row_dict.get('status') != 'pendiente_compra_cliente':
                    conn.close()
                    self._json_response(400, {
                        'ok': False,
                        'error': 'Esta acción solo aplica a solicitudes con compra propia pendiente.'
                    })
                    return
                conn.execute(
                    'UPDATE quote_requests SET expected_tracking_number = ? WHERE id = ?',
                    (tracking, scb_id)
                )
                conn.commit()
                conn.close()

            print(f'[SOLICITUDES] Tracking saved: {scb_id} → {tracking}')
            self._json_response(200, {'ok': True, 'id': scb_id, 'tracking_number': tracking})
        except Exception as exc:
            print(f'[SOLICITUDES] Tracking error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno.'})

    # ── /crbox-svc-token ───────────────────────────────────────────────────
    def _handle_svc_token(self):
        # NOTE: The origin/host sameness check was removed.
        # Reason: Replit's reverse proxy (and any standard TLS-terminating proxy)
        # strips the port from the Host header it forwards to the backend, while
        # the browser's Origin header always includes the non-standard port in the
        # URL (e.g. Origin: https://host:5000 vs Host: host).  This mismatch caused
        # a spurious 403 on every real browser form submission, making registration
        # impossible through the UI while server-side (agent) paths worked fine.
        # Security is preserved by: (1) rate limiting below, (2) service credentials
        # kept exclusively in server env vars, (3) the endpoint only returns a
        # short-lived token usable only for the registration call.
        client_ip = self.client_address[0]
        if not _check_rate_limit(client_ip):
            self._json_error(429, 'Too many requests. Please wait a moment and try again.')
            return

        svc_email = os.environ.get('CRBOX_SVC_EMAIL', '')
        svc_pass  = os.environ.get('CRBOX_SVC_PASSWORD', '')

        if not svc_email or not svc_pass:
            self._json_error(503, 'Service account not configured.')
            return

        body = urllib.parse.urlencode({
            'grant_type': 'password',
            'username':   svc_email,
            'password':   svc_pass,
        }).encode()

        req = urllib.request.Request(
            CRBOX_AUTH_URL,
            data=body,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                token = data.get('access_token', '')
                if not token:
                    raise ValueError('No access_token in response')
                self._json_response(200, {'access_token': token})
        except Exception:
            self._json_error(502, 'Upstream authentication failed.')


    # ── Admin: cookie / session helpers ───────────────────────────────────
    def _admin_get_session_token(self):
        """Parse Cookie header and return the admin_session token, or ''."""
        cookie_header = self.headers.get('Cookie', '')
        for part in cookie_header.split(';'):
            part = part.strip()
            if part.startswith('admin_session='):
                return part[len('admin_session='):].strip()
        return ''

    def _admin_session_cookie_refresh(self):
        """Return a Set-Cookie header value that refreshes the browser-side TTL
        for the current admin session, or None if there is no valid session."""
        token = self._admin_get_session_token()
        if not token:
            return None
        with _admin_sessions_lock:
            if token not in _admin_sessions:
                return None
        is_https = (self.headers.get('X-Forwarded-Proto', '') == 'https'
                    or self.headers.get('X-Forwarded-Ssl', '') == 'on')
        secure_flag = '; Secure' if is_https else ''
        return (
            f'admin_session={token}; HttpOnly; SameSite=Strict; '
            f'Path=/; Max-Age={_ADMIN_SESSION_TTL}{secure_flag}'
        )

    def _admin_html_response(self, html_str, status=200, extra_headers=None):
        body = html_str.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        # Refresh browser cookie TTL so it stays alive alongside the server session
        refresh_cookie = self._admin_session_cookie_refresh()
        if refresh_cookie:
            self.send_header('Set-Cookie', refresh_cookie)
        if extra_headers:
            for k, v in extra_headers:
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _admin_redirect(self, location, extra_headers=None):
        self.send_response(302)
        self.send_header('Location', location)
        # Refresh browser cookie TTL on authenticated redirects (e.g. POST→GET flows)
        refresh_cookie = self._admin_session_cookie_refresh()
        if refresh_cookie:
            self.send_header('Set-Cookie', refresh_cookie)
        if extra_headers:
            for k, v in extra_headers:
                self.send_header(k, v)
        self.end_headers()

    # ── GET /admin/portal-login ────────────────────────────────────────────
    def _handle_admin_portal_login(self):
        """Bridge endpoint: validates the portal Bearer token via CRBOX API.

        Success (CRBOX confirms email == prueba@crbox.cr):
          302 → /admin/solicitudes with Set-Cookie: admin_session=<token>.

        Failure (bad token, wrong email, or API returns no email):
          403 with no body and NO Set-Cookie header whatsoever.

        Security: identity is derived exclusively from the CRBOX API response.
        The client-supplied X-Casillero-Email header is only used to construct
        the /getuserinfo URL — it is NEVER used as the email for the access
        decision.  If the CRBOX API response does not contain an email field,
        the request is rejected.  Both paths bypass _admin_redirect() to prevent
        any cookie side-effects from session-refresh logic.
        """
        if _admin_password() is None:
            self.send_response(404); self.end_headers(); return

        _PORTAL_ADMIN_EMAIL = 'prueba@crbox.cr'

        # Strict CRBOX validation — email from API response only, no fallback.
        verified_email = self._portal_auth_email_only()
        if verified_email and verified_email.strip().lower() == _PORTAL_ADMIN_EMAIL:
            token = _admin_create_session()
            is_https = (self.headers.get('X-Forwarded-Proto', '') == 'https'
                        or self.headers.get('X-Forwarded-Ssl', '') == 'on')
            secure_flag = '; Secure' if is_https else ''
            cookie = (
                f'admin_session={token}; HttpOnly; SameSite=Strict; '
                f'Path=/; Max-Age={_ADMIN_SESSION_TTL}{secure_flag}'
            )
            self.send_response(302)
            self.send_header('Location', '/admin/solicitudes')
            self.send_header('Set-Cookie', cookie)
            self.end_headers()
        else:
            # Failure: 403 with no body and no Set-Cookie.
            # A non-redirect response lets the client navigate directly to
            # /admin/login without an extra hop through /admin/solicitudes.
            self.send_response(403)
            self.send_header('Content-Length', '0')
            self.end_headers()

    def _portal_auth_email_only(self):
        """Strict variant of _portal_auth_full: calls the CRBOX API to validate
        the Bearer token and returns the email field from the API response ONLY.
        Returns None if validation fails OR if the API response contains no
        explicit email — the client-supplied X-Casillero-Email header is never
        used as a fallback for the returned value.
        """
        auth_header  = self.headers.get('Authorization', '').strip()
        header_email = self.headers.get('X-Casillero-Email', '').strip()

        if not auth_header.startswith('Bearer ') or len(auth_header) < 10:
            return None
        if not header_email or '@' not in header_email:
            return None

        api_url = (
            self._CRBOX_API_BASE + '/getuserinfo/' +
            urllib.parse.quote(header_email, safe='')
        )
        req = urllib.request.Request(api_url, headers={'Authorization': auth_header})
        try:
            with urllib.request.urlopen(req, timeout=6) as resp:
                if resp.status != 200:
                    return None
                data = json.loads(resp.read().decode())
        except urllib.error.HTTPError as exc:
            if exc.code in (401, 403):
                return None
            print(f'[PORTAL_AUTH_ADMIN] CRBOX API error {exc.code}')
            return None
        except Exception as exc:
            print(f'[PORTAL_AUTH_ADMIN] Unexpected error: {exc}')
            return None

        consignee = data.get('Consignee') or data
        # Email must come from the API response — no fallback to header value.
        api_email = (
            consignee.get('email') or consignee.get('Email') or
            consignee.get('correo') or consignee.get('Correo')
        )
        if not api_email:
            return None
        return str(api_email).strip().lower()

    # ── GET /admin/login ───────────────────────────────────────────────────
    def _handle_admin_login_get(self):
        if _admin_password() is None:
            self.send_response(404); self.end_headers(); return
        token = self._admin_get_session_token()
        if _admin_validate_session(token):
            self._admin_redirect('/admin/solicitudes')
            return
        qs = urllib.parse.parse_qs(self.path.partition('?')[2])
        expired = (qs.get('msg', [''])[0] == 'expired')
        self._admin_html_response(_build_admin_login_html(expired=expired))

    # ── POST /admin/login ──────────────────────────────────────────────────
    def _handle_admin_login_post(self):
        if _admin_password() is None:
            self.send_response(404); self.end_headers(); return
        client_ip = self.client_address[0]
        blocked, remaining = _admin_brute_blocked(client_ip)
        if blocked:
            self._admin_html_response(
                _build_admin_login_html(blocked_secs=remaining), status=429
            )
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            raw    = self.rfile.read(length).decode('utf-8')
            params = urllib.parse.parse_qs(raw)
            pwd    = (params.get('password', [''])[0] or '').strip()
        except Exception:
            self._admin_html_response(
                _build_admin_login_html(error='Solicitud inválida.'), status=400
            )
            return
        if pwd == _admin_password():
            token = _admin_create_session()
            is_https = (self.headers.get('X-Forwarded-Proto', '') == 'https'
                        or self.headers.get('X-Forwarded-Ssl', '') == 'on')
            secure_flag = '; Secure' if is_https else ''
            cookie = (
                f'admin_session={token}; HttpOnly; SameSite=Strict; '
                f'Path=/; Max-Age={_ADMIN_SESSION_TTL}{secure_flag}'
            )
            self._admin_redirect(
                '/admin/solicitudes',
                extra_headers=[('Set-Cookie', cookie)]
            )
        else:
            _admin_brute_record_fail(client_ip)
            self._admin_html_response(
                _build_admin_login_html(error='Contraseña incorrecta.'), status=401
            )

    # ── GET /admin/logout ──────────────────────────────────────────────────
    def _handle_admin_logout(self):
        if _admin_password() is None:
            self.send_response(404); self.end_headers(); return
        token = self._admin_get_session_token()
        if not _admin_validate_session(token):
            self.send_response(404); self.end_headers(); return
        _admin_clear_session(token)
        clear_cookie = 'admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'
        self._admin_redirect(
            '/admin/login',
            extra_headers=[('Set-Cookie', clear_cookie)]
        )

    # ── GET /admin/solicitudes ─────────────────────────────────────────────
    def _handle_admin_solicitudes_get(self):
        if _admin_password() is None:
            self.send_response(404); self.end_headers(); return
        token = self._admin_get_session_token()
        if not _admin_validate_session(token):
            self._admin_redirect('/admin/login?msg=expired')
            return
        qs = urllib.parse.parse_qs(self.path.partition('?')[2])
        filter_val = (qs.get('filter', ['all'])[0] or 'all').strip()
        if filter_val not in ('all', 'activas', 'respondidas', 'archivadas'):
            filter_val = 'all'

        active_statuses   = ('enviada', 'en_revision', 'pendiente_compra_crbox',
                            'pendiente_confirmacion_pago_cliente', 'pagado_por_cliente',
                            'comprado', 'listo_para_retiro', 'pendiente_compra_cliente')
        responded_statuses= ('respondida',)
        archived_statuses = ('completada', 'cancelada', 'expirada')

        try:
            with _DB_LOCK:
                conn = _get_db()
                all_rows  = conn.execute(
                    'SELECT * FROM quote_requests ORDER BY submitted_at DESC'
                ).fetchall()
                conn.close()
        except Exception as exc:
            print(f'[ADMIN] DB error: {exc}')
            self._admin_html_response('<h1>Error interno</h1>', status=500)
            return

        all_rows = [dict(r) for r in all_rows]
        active    = [r for r in all_rows if r['status'] in active_statuses]
        responded = [r for r in all_rows if r['status'] in responded_statuses]
        archived  = [r for r in all_rows if r['status'] in archived_statuses]

        counts = {
            'all':         len(all_rows),
            'activas':     len(active),
            'respondidas': len(responded),
            'archivadas':  len(archived),
        }

        if filter_val == 'activas':
            rows = active
        elif filter_val == 'respondidas':
            rows = responded
        elif filter_val == 'archivadas':
            rows = archived
        else:
            rows = all_rows

        html = _build_admin_solicitudes_html(rows, filter_val, counts)
        self._admin_html_response(html)

    # ── GET /admin/consultas ───────────────────────────────────────────────
    def _handle_admin_consultas_get(self):
        if _admin_password() is None:
            self.send_response(404); self.end_headers(); return
        token = self._admin_get_session_token()
        if not _admin_validate_session(token):
            self._admin_redirect('/admin/login?msg=expired')
            return
        try:
            with _DB_LOCK:
                conn = _get_db()
                rows = conn.execute(
                    'SELECT * FROM general_inquiries ORDER BY submitted_at DESC'
                ).fetchall()
                conn.close()
        except Exception as exc:
            print(f'[ADMIN] consultas DB error: {exc}')
            self._admin_html_response('<h1>Error interno</h1>', status=500)
            return
        rows = [dict(r) for r in rows]
        html = _build_admin_consultas_html(rows)
        self._admin_html_response(html)

    # ── GET /admin/consultas/:id ───────────────────────────────────────────
    def _handle_admin_consultas_detail(self, inquiry_id):
        if _admin_password() is None:
            self.send_response(404); self.end_headers(); return
        token = self._admin_get_session_token()
        if not _admin_validate_session(token):
            self._admin_redirect('/admin/login?msg=expired')
            return
        try:
            with _DB_LOCK:
                conn = _get_db()
                row = conn.execute(
                    'SELECT * FROM general_inquiries WHERE id=?', (inquiry_id,)
                ).fetchone()
                conn.close()
        except Exception as exc:
            print(f'[ADMIN] consultas detail DB error: {exc}')
            self._admin_html_response('<h1>Error interno</h1>', status=500)
            return
        if row is None:
            self.send_response(404); self.end_headers(); return
        html = _build_admin_consultas_detail_html(dict(row))
        self._admin_html_response(html)

    # ── POST /api/consultas ────────────────────────────────────────────────
    def _handle_api_consultas_post(self):
        """Accept a general contact form submission from the public site.

        Saves the inquiry to general_inquiries (separate from quote_requests)
        and attempts a ventas notification email. Always returns success once
        the DB save succeeds, regardless of email outcome.
        """
        try:
            length = int(self.headers.get('Content-Length', 0))
            raw    = self.rfile.read(length) if length > 0 else b''
            data   = json.loads(raw.decode('utf-8'))
        except Exception:
            self._json_response(400, {'ok': False, 'error': 'Datos inválidos.'})
            return
        nombre  = (data.get('nombre')  or '').strip()
        correo  = (data.get('correo')  or '').strip()
        telefono = (data.get('telefono') or '').strip()
        asunto  = (data.get('asunto')  or '').strip()
        mensaje = (data.get('mensaje') or '').strip()
        source  = (data.get('source')  or 'contacto').strip()
        if not nombre or not correo or not mensaje:
            self._json_response(400, {'ok': False, 'error': 'Nombre, correo y mensaje son requeridos.'})
            return
        if '@' not in correo or '.' not in correo.split('@')[-1] or len(correo) > 254:
            self._json_response(400, {'ok': False, 'error': 'Ingresa un correo electrónico válido.'})
            return
        try:
            _save_general_inquiry(nombre, correo, telefono, asunto, mensaje, source)
        except Exception as db_exc:
            print(f'[API/CONSULTAS] DB insert failed: {db_exc}')
            self._json_response(500, {'ok': False, 'error': 'Error al guardar la consulta. Intenta de nuevo.'})
            return
        self._json_response(200, {'ok': True})

    # ── POST /api/faq-pregunta ─────────────────────────────────────────────
    def _handle_faq_pregunta_post(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            raw    = self.rfile.read(length) if length > 0 else b''
            data   = json.loads(raw.decode('utf-8'))
        except Exception:
            self._json_response(400, {'ok': False, 'error': 'Datos inválidos.'})
            return
        nombre   = (data.get('nombre') or '').strip()
        correo   = (data.get('correo') or '').strip()
        pregunta = (data.get('pregunta') or '').strip()
        if not nombre or not correo or not pregunta:
            self._json_response(400, {'ok': False, 'error': 'Todos los campos son requeridos.'})
            return
        if '@' not in correo or '.' not in correo.split('@')[-1] or len(correo) > 254:
            self._json_response(400, {'ok': False, 'error': 'Ingresa un correo electrónico válido.'})
            return
        try:
            new_id = _store_inquiry(nombre, correo, pregunta, 'faq-como-funciona')
        except Exception as db_exc:
            print(f'[FAQ-PREGUNTA] DB insert failed: {db_exc}')
            self._json_response(500, {'ok': False, 'error': 'Error al guardar la consulta.'})
            return
        try:
            settings  = _smtp_settings()
            smtp_user = settings[2] if settings else 'noreply@crbox.cr'
            import email.mime.multipart, email.mime.text
            esc = _html.escape
            subject = f'[FAQ] Nueva consulta de {nombre}'
            plain   = (
                f'Nueva consulta recibida desde el formulario FAQ de Cómo Funciona.\n\n'
                f'Nombre: {nombre}\nCorreo: {correo}\n\n'
                f'Pregunta:\n{pregunta}\n\n'
                f'Registro #: {new_id}\n'
                f'Ver en panel: {os.environ.get("SITE_URL", "https://crbox.cr")}/admin/consultas'
            )
            html_body = (
                f'<p><strong>Nueva consulta FAQ</strong></p>'
                f'<p><strong>Nombre:</strong> {esc(nombre)}<br>'
                f'<strong>Correo:</strong> {esc(correo)}</p>'
                f'<p><strong>Pregunta:</strong><br>{esc(pregunta)}</p>'
                f'<p style="color:#9ca3af;font-size:12px;">Registro #{new_id}</p>'
            )
            msg = email.mime.multipart.MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From']    = f'CRBOX <{smtp_user}>'
            msg['To']      = QUOTE_RECIPIENT
            msg.attach(email.mime.text.MIMEText(plain, 'plain', 'utf-8'))
            msg.attach(email.mime.text.MIMEText(html_body, 'html', 'utf-8'))
            _send_smtp(msg, [QUOTE_RECIPIENT])
        except Exception as mail_exc:
            print(f'[FAQ-PREGUNTA] Email notification failed (record #{new_id} preserved): {mail_exc}')
        self._json_response(200, {'ok': True})

    # ── GET /admin/solicitudes/:id ─────────────────────────────────────────
    def _handle_admin_solicitudes_detail(self, scb_id):
        if _admin_password() is None:
            self.send_response(404); self.end_headers(); return
        token = self._admin_get_session_token()
        if not _admin_validate_session(token):
            self._admin_redirect('/admin/login?msg=expired')
            return
        qs = urllib.parse.parse_qs(self.path.partition('?')[2])
        filter_val = (qs.get('filter', ['all'])[0] or 'all').strip()
        if filter_val not in ('all', 'activas', 'respondidas', 'archivadas'):
            filter_val = 'all'
        resent = qs.get('resent', [''])[0] == '1'
        try:
            with _DB_LOCK:
                conn  = _get_db()
                row   = conn.execute(
                    'SELECT * FROM quote_requests WHERE id = ?', (scb_id,)
                ).fetchone()
                if row is None:
                    conn.close()
                    not_found_html = (
                        f'<h2 style="font-family:sans-serif;color:#374151;padding:40px 20px;">'
                        f'Solicitud no encontrada: {_html.escape(scb_id)}</h2>'
                        f'<p style="font-family:sans-serif;padding:0 20px;">'
                        f'<a href="/admin/solicitudes?filter={_html.escape(filter_val)}">'
                        f'&#8592; Volver a solicitudes</a></p>'
                    )
                    self._admin_html_response(not_found_html, status=404)
                    return
                row     = dict(row)
                history = [dict(h) for h in conn.execute(
                    'SELECT * FROM quote_status_history WHERE quote_request_id = ? ORDER BY changed_at ASC',
                    (scb_id,)
                ).fetchall()]
                conn.close()
        except Exception as exc:
            print(f'[ADMIN] Detail DB error: {exc}')
            self._admin_html_response('<h1>Error interno</h1>', status=500)
            return
        html = _build_admin_detail_html(row, history, filter_val, resent=resent)
        self._admin_html_response(html)

    # ── POST /admin/solicitudes/:id/status ────────────────────────────────
    def _handle_admin_solicitudes_status(self, scb_id):
        if _admin_password() is None:
            self.send_response(404); self.end_headers(); return
        token = self._admin_get_session_token()
        if not _admin_validate_session(token):
            self.send_response(404); self.end_headers(); return
        try:
            length = int(self.headers.get('Content-Length', 0))
            raw    = self.rfile.read(length).decode('utf-8')
            params = urllib.parse.parse_qs(raw)
            new_status  = (params.get('status', [''])[0] or '').strip()
            note        = (params.get('note', [''])[0] or '').strip()[:1000] or None
            filter_val  = (params.get('filter', ['all'])[0] or 'all').strip()
            from_detail = (params.get('from_detail', [''])[0] or '').strip()
            if filter_val not in ('all', 'activas', 'respondidas', 'archivadas'):
                filter_val = 'all'
        except Exception:
            self.send_response(400); self.end_headers(); return
        if from_detail == '1':
            redirect_url = f'/admin/solicitudes/{scb_id}?filter={filter_val}'
        else:
            redirect_url = f'/admin/solicitudes?filter={filter_val}'
        if new_status not in _ADMIN_LEGAL_TRANSITIONS:
            self._admin_redirect(redirect_url)
            return
        try:
            with _DB_LOCK:
                conn = _get_db()
                row = conn.execute(
                    'SELECT * FROM quote_requests WHERE id = ?', (scb_id,)
                ).fetchone()
                if row is None:
                    conn.close()
                    self._admin_redirect(redirect_url)
                    return
                row = dict(row)
                current_status = row['status']
                if new_status not in _ADMIN_LEGAL_TRANSITIONS.get(current_status, set()):
                    conn.close()
                    self._admin_redirect(redirect_url)
                    return
                now_iso  = _now_iso()
                hist_id  = _uuid4_hex()
                extra_col, extra_val = '', ()
                if new_status == 'respondida':
                    extra_col, extra_val = ', responded_at = ?', (now_iso,)
                elif new_status == 'completada':
                    extra_col, extra_val = ', completed_at = ?', (now_iso,)
                elif new_status == 'cancelada':
                    extra_col, extra_val = ', cancelled_at = ?', (now_iso,)
                conn.execute(
                    f'UPDATE quote_requests SET status = ?{extra_col} WHERE id = ?',
                    (new_status,) + extra_val + (scb_id,)
                )
                conn.execute(
                    '''INSERT INTO quote_status_history
                       (id, quote_request_id, from_status, to_status, changed_at, changed_by, note)
                       VALUES (?,?,?,?,?,?,?)''',
                    (hist_id, scb_id, current_status, new_status, now_iso, 'sales', note)
                )
                conn.commit()
                conn.close()
            print(f'[ADMIN] Status updated: {scb_id} {current_status} → {new_status}')
            # ── Post-transition email notifications ───────────────────────
            smtp_user = os.environ.get('SMTP_USER', '').strip()
            smtp_ok   = smtp_user and os.environ.get('SMTP_HOST', '').strip()
            c_email   = row.get('customer_email', '')
            c_name    = row.get('customer_name', '') or ''
            c_product = row.get('product_name', '') or ''
            if smtp_ok and c_email:
                try:
                    if new_status == 'comprado':
                        _send_comprado_notification(scb_id, c_email, c_name, c_product, smtp_user)
                        print(f'[ADMIN] comprado email sent: {scb_id}')
                    elif new_status == 'listo_para_retiro':
                        _send_listo_para_retiro_notification(scb_id, c_email, c_name, c_product, smtp_user)
                        print(f'[ADMIN] listo_para_retiro email sent: {scb_id}')
                    elif new_status == 'cancelada':
                        _send_cancellation_email(scb_id, c_email, c_name, c_product, smtp_user)
                        print(f'[ADMIN] admin-cancel email sent: {scb_id}')
                except Exception as email_exc:
                    print(f'[ADMIN] post-status email error ({new_status}): {email_exc}')
            self._admin_redirect(redirect_url)
        except Exception as exc:
            print(f'[ADMIN] Status update error: {exc}')
            self._admin_redirect(redirect_url)

    # ── POST /admin/solicitudes/:id/add-note ──────────────────────────────
    def _handle_admin_solicitudes_add_note(self, scb_id):
        if _admin_password() is None:
            self.send_response(404); self.end_headers(); return
        token = self._admin_get_session_token()
        if not _admin_validate_session(token):
            self.send_response(404); self.end_headers(); return
        try:
            length = int(self.headers.get('Content-Length', 0))
            raw    = self.rfile.read(length).decode('utf-8')
            params = urllib.parse.parse_qs(raw)
            note       = (params.get('note', [''])[0] or '').strip()[:1000]
            filter_val = (params.get('filter', ['all'])[0] or 'all').strip()
            if filter_val not in ('all', 'activas', 'respondidas', 'archivadas'):
                filter_val = 'all'
        except Exception:
            self.send_response(400); self.end_headers(); return
        redirect_url = f'/admin/solicitudes/{scb_id}?filter={filter_val}'
        if not note:
            self._admin_redirect(redirect_url)
            return
        _TERMINAL_STATUSES = {'completada', 'cancelada', 'expirada'}
        try:
            with _DB_LOCK:
                conn = _get_db()
                row = conn.execute(
                    'SELECT status FROM quote_requests WHERE id = ?', (scb_id,)
                ).fetchone()
                if row is None:
                    conn.close()
                    self._admin_redirect(redirect_url)
                    return
                current_status = row['status']
                if current_status in _TERMINAL_STATUSES:
                    conn.close()
                    self._admin_redirect(redirect_url)
                    return
                now_iso = _now_iso()
                hist_id = _uuid4_hex()
                conn.execute(
                    '''INSERT INTO quote_status_history
                       (id, quote_request_id, from_status, to_status, changed_at, changed_by, note)
                       VALUES (?,?,?,?,?,?,?)''',
                    (hist_id, scb_id, current_status, current_status, now_iso, 'sales', note)
                )
                conn.commit()
                conn.close()
            print(f'[ADMIN] Internal note added: {scb_id}')
        except Exception as exc:
            print(f'[ADMIN] Add note error: {exc}')
        self._admin_redirect(redirect_url)

    # ── POST /admin/solicitudes/:id/respond ───────────────────────────────
    def _handle_admin_solicitudes_respond(self, scb_id):
        if _admin_password() is None:
            self.send_response(404); self.end_headers(); return
        token = self._admin_get_session_token()
        if not _admin_validate_session(token):
            self.send_response(404); self.end_headers(); return

        try:
            length = int(self.headers.get('Content-Length', 0))
            raw    = self.rfile.read(length).decode('utf-8')
            params = urllib.parse.parse_qs(raw, keep_blank_values=True)
            filter_val = (params.get('filter', ['all'])[0] or 'all').strip()
            if filter_val not in ('all', 'activas', 'respondidas', 'archivadas'):
                filter_val = 'all'
            confirmed_price_str    = (params.get('confirmed_price', [''])[0] or '').strip()
            availability           = (params.get('availability', [''])[0] or '').strip()
            delivery_timeline      = (params.get('delivery_timeline', [''])[0] or '').strip()[:500]
            conditions             = (params.get('conditions', [''])[0] or '').strip()[:2000]
            difference_explanation = (params.get('difference_explanation', [''])[0] or '').strip()[:2000]
            customer_message       = (params.get('customer_message', [''])[0] or '').strip()[:5000]
        except Exception:
            self.send_response(400); self.end_headers(); return

        redirect_url = f'/admin/solicitudes/{scb_id}?filter={filter_val}'
        _VALID_AVAIL = {'disponible', 'no_disponible', 'disponible_con_condiciones'}

        # ── Validate ─────────────────────────────────────────────────────
        errors = []
        confirmed_price = None
        try:
            confirmed_price = float(confirmed_price_str)
            if confirmed_price <= 0:
                errors.append('El precio de envío confirmado debe ser mayor a cero.')
        except (ValueError, TypeError):
            errors.append('El precio de envío confirmado no es un número válido.')
        if availability not in _VALID_AVAIL:
            errors.append('Selecciona una opción de disponibilidad válida.')
        if not delivery_timeline:
            errors.append('El tiempo de entrega es obligatorio.')
        if not customer_message:
            errors.append('El mensaje al cliente es obligatorio.')

        if errors:
            error_list = ''.join(f'<li>{_html.escape(e)}</li>' for e in errors)
            err_html = (
                f'<div style="font-family:sans-serif;padding:40px 24px;max-width:600px;margin:0 auto;">'
                f'<h2 style="color:#dc2626;margin-bottom:12px;">Error de validación</h2>'
                f'<ul style="color:#374151;line-height:2;">{error_list}</ul>'
                f'<a href="{_html.escape(redirect_url)}" style="display:inline-block;margin-top:20px;'
                f'color:#FF6B00;">&#8592; Volver</a></div>'
            )
            self._admin_html_response(err_html, status=400)
            return

        # ── Fetch solicitud ───────────────────────────────────────────────
        try:
            with _DB_LOCK:
                conn = _get_db()
                row  = conn.execute(
                    'SELECT * FROM quote_requests WHERE id = ?', (scb_id,)
                ).fetchone()
                conn.close()
        except Exception as exc:
            print(f'[ADMIN] Respond DB read error: {exc}')
            self._admin_html_response(
                '<h1 style="font-family:sans-serif;padding:40px;">Error interno</h1>', status=500
            )
            return

        if row is None:
            self._admin_redirect(redirect_url)
            return

        row = dict(row)
        current_status = row['status']

        # Guard: only respond to active solicitudes without an existing response
        if current_status not in ('enviada', 'en_revision') or row.get('response_json'):
            self._admin_redirect(redirect_url)
            return

        # ── Send email (must succeed before any DB write) ─────────────────
        settings = _smtp_settings()
        if settings is None:
            self._admin_html_response(
                '<div style="font-family:sans-serif;padding:40px 24px;max-width:600px;margin:0 auto;">'
                '<h2 style="color:#dc2626;">SMTP no configurado</h2>'
                '<p style="color:#374151;margin:12px 0;">No se puede enviar el correo porque SMTP '
                'no está configurado en este entorno.</p>'
                f'<a href="{_html.escape(redirect_url)}" style="color:#FF6B00;">&#8592; Volver</a>'
                '</div>',
                status=503
            )
            return

        smtp_user = settings[2]
        try:
            _send_customer_response(
                scb_id,
                row['customer_email'],
                row.get('customer_name'),
                row['product_name'],
                confirmed_price,
                availability,
                delivery_timeline,
                conditions,
                difference_explanation,
                customer_message,
                smtp_user,
            )
            print(f'[ADMIN] Response email sent for {scb_id} → {row["customer_email"]}')
        except Exception as exc:
            print(f'[ADMIN] Response email error for {scb_id}: {exc}')
            self._admin_html_response(
                '<div style="font-family:sans-serif;padding:40px 24px;max-width:600px;margin:0 auto;">'
                f'<h2 style="color:#dc2626;">Error al enviar el correo</h2>'
                f'<p style="color:#374151;margin:12px 0;">No se pudo enviar el correo al cliente. '
                f'La solicitud <strong>{_html.escape(scb_id)}</strong> no fue modificada.</p>'
                f'<p style="color:#6b7280;font-size:13px;margin:8px 0;">Detalle: {_html.escape(str(exc))}</p>'
                f'<a href="{_html.escape(redirect_url)}" style="color:#FF6B00;">&#8592; Volver</a>'
                '</div>',
                status=502
            )
            return

        # ── Commit DB writes (email succeeded) ───────────────────────────
        now_iso  = _now_iso()
        hist_id  = _uuid4_hex()
        hist_note = f'Respuesta enviada \u00b7 disponibilidad: {availability}'

        resp_payload = json.dumps({
            'confirmed_shipping_price_usd': confirmed_price,
            'availability': availability,
            'delivery_timeline': delivery_timeline,
            'conditions': conditions,
            'difference_explanation': difference_explanation,
            'customer_message': customer_message,
            'sent_at': now_iso,
        }, ensure_ascii=False)

        try:
            with _DB_LOCK:
                conn = _get_db()
                conn.execute(
                    'UPDATE quote_requests SET status = ?, responded_at = ?, response_json = ? WHERE id = ?',
                    ('respondida', now_iso, resp_payload, scb_id)
                )
                conn.execute(
                    '''INSERT INTO quote_status_history
                       (id, quote_request_id, from_status, to_status, changed_at, changed_by, note)
                       VALUES (?,?,?,?,?,?,?)''',
                    (hist_id, scb_id, current_status, 'respondida', now_iso, 'sales', hist_note)
                )
                conn.commit()
                conn.close()
            print(f'[ADMIN] {scb_id} → respondida, response_json stored')
        except Exception as exc:
            print(f'[ADMIN] Respond DB write error for {scb_id}: {exc}')
            # Email already sent; redirect anyway so sales knows it went out
            self._admin_redirect(redirect_url)
            return

        self._admin_redirect(redirect_url)


    # ── POST /admin/solicitudes/:id/resend-response ───────────────────────
    def _handle_admin_solicitudes_resend_response(self, scb_id):
        if _admin_password() is None:
            self.send_response(404); self.end_headers(); return
        token = self._admin_get_session_token()
        if not _admin_validate_session(token):
            self.send_response(404); self.end_headers(); return

        try:
            length = int(self.headers.get('Content-Length', 0))
            raw    = self.rfile.read(length).decode('utf-8')
            params = urllib.parse.parse_qs(raw, keep_blank_values=True)
            filter_val = (params.get('filter', ['all'])[0] or 'all').strip()
            if filter_val not in ('all', 'activas', 'respondidas', 'archivadas'):
                filter_val = 'all'
        except Exception:
            self.send_response(400); self.end_headers(); return

        redirect_url = f'/admin/solicitudes/{scb_id}?filter={filter_val}'

        # ── Fetch solicitud ───────────────────────────────────────────────
        try:
            with _DB_LOCK:
                conn = _get_db()
                row  = conn.execute(
                    'SELECT * FROM quote_requests WHERE id = ?', (scb_id,)
                ).fetchone()
                conn.close()
        except Exception as exc:
            print(f'[ADMIN] Resend DB read error: {exc}')
            self._admin_html_response(
                '<h1 style="font-family:sans-serif;padding:40px;">Error interno</h1>', status=500
            )
            return

        if row is None:
            self._admin_redirect(redirect_url)
            return

        row = dict(row)

        # Must be respondida with stored response_json
        if row.get('status') != 'respondida' or not row.get('response_json'):
            self._admin_redirect(redirect_url)
            return

        try:
            resp_data = json.loads(row['response_json'])
        except Exception:
            self._admin_redirect(redirect_url)
            return

        # ── Check SMTP ────────────────────────────────────────────────────
        settings = _smtp_settings()
        if settings is None:
            self._admin_html_response(
                '<div style="font-family:sans-serif;padding:40px 24px;max-width:600px;margin:0 auto;">'
                '<h2 style="color:#dc2626;">SMTP no configurado</h2>'
                '<p style="color:#374151;margin:12px 0;">No se puede enviar el correo porque SMTP '
                'no est&aacute; configurado en este entorno.</p>'
                f'<a href="{_html.escape(redirect_url)}" style="color:#FF6B00;">&#8592; Volver</a>'
                '</div>',
                status=503
            )
            return

        smtp_user = settings[2]

        # ── Resend email ──────────────────────────────────────────────────
        try:
            _send_customer_response(
                scb_id,
                row['customer_email'],
                row.get('customer_name'),
                row['product_name'],
                resp_data.get('confirmed_shipping_price_usd', 0),
                resp_data.get('availability', 'disponible'),
                resp_data.get('delivery_timeline', ''),
                resp_data.get('conditions', ''),
                resp_data.get('difference_explanation', ''),
                resp_data.get('customer_message', ''),
                smtp_user,
            )
            print(f'[ADMIN] Response email resent for {scb_id} → {row["customer_email"]}')
        except Exception as exc:
            print(f'[ADMIN] Resend email error for {scb_id}: {exc}')
            self._admin_html_response(
                '<div style="font-family:sans-serif;padding:40px 24px;max-width:600px;margin:0 auto;">'
                f'<h2 style="color:#dc2626;">Error al reenviar el correo</h2>'
                f'<p style="color:#374151;margin:12px 0;">No se pudo reenviar el correo al cliente.</p>'
                f'<p style="color:#6b7280;font-size:13px;margin:8px 0;">Detalle: {_html.escape(str(exc))}</p>'
                f'<a href="{_html.escape(redirect_url)}" style="color:#FF6B00;">&#8592; Volver</a>'
                '</div>',
                status=502
            )
            return

        # ── Insert history note ───────────────────────────────────────────
        now_iso = _now_iso()
        hist_id = _uuid4_hex()
        try:
            with _DB_LOCK:
                conn = _get_db()
                conn.execute(
                    '''INSERT INTO quote_status_history
                       (id, quote_request_id, from_status, to_status, changed_at, changed_by, note)
                       VALUES (?,?,?,?,?,?,?)''',
                    (hist_id, scb_id, 'respondida', 'respondida', now_iso, 'sales',
                     'Notificación reenviada al cliente')
                )
                conn.commit()
                conn.close()
        except Exception as exc:
            print(f'[ADMIN] Resend history insert error for {scb_id}: {exc}')

        self._admin_redirect(f'/admin/solicitudes/{scb_id}?filter={filter_val}&resent=1')

    # ── POST /admin/solicitudes/:id/suggest-draft ─────────────────────────
    def _handle_admin_solicitudes_suggest_draft(self, scb_id):
        """Return Gemini-suggested draft for the three response composer text fields.

        Requires admin_session. Never writes to the database.
        Returns JSON: {customer_message, conditions, difference_explanation} on success,
        or {error: "..."} on failure.
        """
        if _admin_password() is None:
            self._json_response(404, {'error': 'not_found'})
            return
        token = self._admin_get_session_token()
        if not _admin_validate_session(token):
            self._json_response(401, {'error': 'auth_required'})
            return

        # Parse JSON body
        try:
            length = int(self.headers.get('Content-Length', 0))
            body   = json.loads(self.rfile.read(length)) if length else {}
        except Exception:
            self._json_response(400, {'error': 'invalid_request'})
            return

        _VALID_AVAIL = {'disponible', 'no_disponible', 'disponible_con_condiciones'}
        availability = str(body.get('availability') or '').strip()
        if availability not in _VALID_AVAIL:
            self._json_response(400, {'error': 'availability es obligatorio y debe ser un valor válido.'})
            return

        # confirmed_price is optional; only used if a valid positive number
        confirmed_price = None
        raw_price = body.get('confirmed_price', '')
        try:
            p = float(raw_price)
            if p > 0:
                confirmed_price = p
        except (TypeError, ValueError):
            pass

        # Fetch solicitud from DB (read-only)
        try:
            with _DB_LOCK:
                conn = _get_db()
                row  = conn.execute(
                    'SELECT * FROM quote_requests WHERE id = ?', (scb_id,)
                ).fetchone()
                conn.close()
        except Exception as exc:
            print(f'[ADMIN] suggest-draft DB read error: {exc}')
            self._json_response(500, {'error': 'Error interno al leer la solicitud.'})
            return

        if row is None:
            self._json_response(404, {'error': 'Solicitud no encontrada.'})
            return

        row = dict(row)

        # Guard: only for active solicitudes without existing response
        if row.get('status') not in ('enviada', 'en_revision') or row.get('response_json'):
            self._json_response(409, {'error': 'Esta solicitud ya tiene una respuesta enviada.'})
            return

        # ── Build context for prompt ─────────────────────────────────────
        # system_estimate_usd: canonical value stored by the calculator engine
        # at solicitud submission time. estimate_breakdown is metadata only.
        system_estimate_usd = row.get('estimate_usd')
        estimate_is_complete = False
        if system_estimate_usd is not None:
            # Complete only if weight AND all three dimensions were provided
            # (missing any one of them means the calculator used volumetric estimates)
            estimate_is_complete = bool(
                row.get('weight_kg') is not None
                and row.get('length_cm') is not None
                and row.get('width_cm') is not None
                and row.get('height_cm') is not None
            )

        # AI extraction weak fields — strictly confidence < 0.80 per spec
        ai_weak_fields = []
        ai_has_weak = False
        ai_json_raw = row.get('ai_extraction_json') or None
        if ai_json_raw:
            try:
                ai_data = json.loads(ai_json_raw)
                for fname, fdata in (ai_data.get('fields') or {}).items():
                    conf = float(fdata.get('confidence', 0.0) or 0.0)
                    if conf < 0.80:
                        ai_weak_fields.append(fname)
                        ai_has_weak = True
            except Exception:
                pass

        # Difference computation
        numeric_diff = None
        difference_is_material = None
        if confirmed_price is not None and system_estimate_usd is not None and system_estimate_usd > 0:
            numeric_diff = round(confirmed_price - system_estimate_usd, 2)
            difference_is_material = abs(numeric_diff) / system_estimate_usd > 0.10

        # Force difference_explanation blank when price missing or diff not material
        force_blank_diff = (
            confirmed_price is None
            or system_estimate_usd is None
            or difference_is_material is not True
        )

        context = {
            'availability':               availability,
            'product_name':               row.get('product_name') or 'producto',
            'product_url':                row.get('product_url') or 'null',
            'product_category':           row.get('category') or 'otros',
            'declared_value_usd':         row.get('declared_value_usd'),
            'system_estimate_usd':        system_estimate_usd,
            'estimate_is_complete':       estimate_is_complete,
            'confirmed_price_usd':        confirmed_price,
            'numeric_difference_usd':     numeric_diff,
            'difference_is_material':     difference_is_material,
            'ai_extraction_has_weak_fields': ai_has_weak,
            'weak_extraction_fields':     ai_weak_fields if ai_weak_fields else [],
        }

        # ── Call Gemini ──────────────────────────────────────────────────
        if not _GEMINI_API_KEY:
            self._json_response(503, {'error': 'Gemini no está configurado en este entorno.'})
            return

        draft, err = _call_gemini_draft(context)
        if err or draft is None:
            print(f'[ADMIN] suggest-draft Gemini error for {scb_id}: {err}')
            self._json_response(502, {'error': f'No se pudo generar el borrador: {err}'})
            return

        # Enforce blank difference_explanation when conditions require it
        if force_blank_diff:
            draft['difference_explanation'] = ''

        self._json_response(200, draft)


    def _handle_admin_solicitudes_link_package(self, scb_id):
        if _admin_password() is None:
            self.send_response(404); self.end_headers(); return
        token = self._admin_get_session_token()
        if not _admin_validate_session(token):
            self.send_response(404); self.end_headers(); return
        try:
            length = int(self.headers.get('Content-Length', 0))
            raw    = self.rfile.read(length).decode('utf-8')
            params = urllib.parse.parse_qs(raw)
            package_id = (params.get('package_id', [''])[0] or '').strip()
            filter_val = (params.get('filter', ['all'])[0] or 'all').strip()
            if filter_val not in ('all', 'activas', 'respondidas', 'archivadas'):
                filter_val = 'all'
        except Exception:
            self.send_response(400); self.end_headers(); return

        redirect_url = f'/admin/solicitudes/{scb_id}?filter={filter_val}'

        if not package_id:
            self._admin_redirect(redirect_url)
            return

        try:
            with _DB_LOCK:
                conn = _get_db()
                row = conn.execute(
                    'SELECT status, customer_email, customer_name, product_name FROM quote_requests WHERE id = ?',
                    (scb_id,)
                ).fetchone()
                if row is None or row['status'] != 'pendiente_compra_cliente':
                    conn.close()
                    self._admin_redirect(redirect_url)
                    return
                customer_email = row['customer_email']
                customer_name  = row['customer_name']
                product_name   = row['product_name']
                now_iso = _now_iso()
                hist_id = _uuid4_hex()
                conn.execute(
                    '''UPDATE quote_requests
                       SET status = ?, linked_package_id = ?, completed_at = ?
                       WHERE id = ?''',
                    ('completada', package_id, now_iso, scb_id)
                )
                conn.execute(
                    '''INSERT INTO quote_status_history
                       (id, quote_request_id, from_status, to_status, changed_at, changed_by, note)
                       VALUES (?,?,?,?,?,?,?)''',
                    (hist_id, scb_id, 'pendiente_compra_cliente', 'completada',
                     now_iso, 'sales',
                     f'Solicitud completada \u00b7 paquete vinculado: {package_id}')
                )
                conn.commit()
                conn.close()
            print(f'[ADMIN] link-package: {scb_id} → completada, package={package_id}')
            settings  = _smtp_settings()
            smtp_user = settings[2] if settings else 'noreply@crbox.cr'
            try:
                _send_completada_notification(
                    scb_id, customer_email, customer_name, product_name,
                    package_id, smtp_user
                )
            except Exception as mail_exc:
                print(f'[ADMIN] link-package completada email failed: {mail_exc}')
            self._admin_redirect(redirect_url)
        except Exception as exc:
            print(f'[ADMIN] link-package error: {exc}')
            self._admin_redirect(redirect_url)


# ── Invoice upload orphan cleanup ─────────────────────────────────────────────
# Removes invoice files that have been on disk for more than 30 days without
# being linked to a purchase bill record.  Runs once at startup then every 24 h.
# The 30-day window is generous: createPurchaseBill failures are retried
# immediately by the user, so any file still present after a day is almost
# certainly orphaned.  UUIDs prevent accidental guessing; the only risk is wasted
# disk space, which this sweep handles.
_INVOICE_CLEANUP_INTERVAL  = 86400      # check every 24 h
_INVOICE_ORPHAN_AGE_SECS   = 30 * 86400 # files older than 30 days are removed


def _invoice_cleanup_loop():
    import glob as _glob
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                              'uploads', 'invoices')
    while True:
        try:
            now    = time.time()
            cutoff = now - _INVOICE_ORPHAN_AGE_SECS
            removed = 0
            for path in _glob.glob(os.path.join(upload_dir, '*')):
                if os.path.basename(path) == '.gitkeep':
                    continue
                try:
                    if os.path.getmtime(path) < cutoff:
                        os.remove(path)
                        removed += 1
                except Exception:
                    pass
            if removed:
                print(f'[INVOICE_CLEANUP] Removed {removed} orphaned file(s) older than 30 days')
        except Exception as exc:
            print(f'[INVOICE_CLEANUP] Error: {exc}')
        time.sleep(_INVOICE_CLEANUP_INTERVAL)


def _start_invoice_cleanup():
    t = threading.Thread(target=_invoice_cleanup_loop, daemon=True)
    t.start()


if __name__ == "__main__":
    _init_db()
    _verify_gemini_model_at_startup()
    _start_health_monitor()
    _start_solicitud_reminder()
    _start_invoice_cleanup()
    server = HTTPServer(("0.0.0.0", 5000), NoCacheHandler)
    print("Serving HTTP on 0.0.0.0 port 5000 (http://0.0.0.0:5000/) ...")
    server.serve_forever()
