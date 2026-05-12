/* ═══════════════════════════════════════════════════════════════
   CQChat — CRBOX Mobile Chat Concierge (≤ 640px)
   Modern conversational quote interface with local intelligence.
═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';
    if (window.innerWidth > 640) return;

    /* ── CRBOX facts (KB-aware fallbacks) ── */
    var _KB  = (typeof CRBOX_KNOWLEDGE !== 'undefined' && CRBOX_KNOWLEDGE) || {};
    var _SVC = _KB.services || {};
    var CRBOX = {
        transitAereo:    (_SVC.carga_aerea    && _SVC.carga_aerea.transit_days)    || '2–4 días hábiles',
        transitMaritimo: (_SVC.carga_maritima && _SVC.carga_maritima.transit_days) || '6–7 días hábiles',
        clients:         _KB.company ? (_KB.company.clients || 33000).toLocaleString() + '+' : '33,000+',
        years:           (_KB.company && _KB.company.experience_years) || '20',
        registerUrl:     'mi-cuenta.html',
    };

    /* ── State ── */
    var S = {
        phase: 'intro', products: [],
        serviceType: 'aereo', destination: '',
        customerName: '', email: '', notes: '',
        _returnToShipping: false,
    };
    var _lastSender = null;

    /* ── DOM ── */
    var chatEl    = document.getElementById('cq-chat');
    var msgsEl    = document.getElementById('cqc-messages');
    var inputEl   = document.getElementById('cqc-input');
    var sendBtn   = document.getElementById('cqc-send');
    var inputBar  = document.getElementById('cqc-input-bar');
    var cartBtn   = document.getElementById('cqc-cart-btn');
    var cartBadge = document.getElementById('cqc-cart-badge');
    var overlay   = document.getElementById('cqc-sheet-overlay');
    var sheet     = document.getElementById('cqc-cart-sheet');
    var sheetWrap = document.getElementById('cqc-sheet-items-wrap');
    var footerTot = document.getElementById('cqc-footer-total');
    if (!chatEl || !msgsEl) return;

    /* ── Utilities ── */
    function esc(s) {
        return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function isEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
    function scrollBot() { setTimeout(function(){ msgsEl.scrollTop = msgsEl.scrollHeight; }, 50); }
    function ucFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
    function fmtUSD(n)  { return (n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }

    /* Strips "quiero traer unos …" prefix so product card shows clean name */
    function extractCleanName(q) {
        return ucFirst(
            q.trim()
             .replace(/^(quiero\s+traer\s+|quiero\s+|deseo\s+traer\s+|deseo\s+|necesito\s+traer\s+|necesito\s+|busco\s+traer\s+|busco\s+|quisiera\s+traer\s+|quisiera\s+|traer\s+|comprar\s+)/i, '')
             .replace(/^(unos?\s+|unas?\s+|los?\s+|las?\s+|un\s+|una\s+)/i, '')
             .trim()
        );
    }

    function normalizeQ(q) {
        q = q.trim();
        if (!/^(quiero|deseo|necesito|busco|quisiera|traer|comprar)/i.test(q) && q.length < 80)
            q = 'quiero traer ' + q;
        return q;
    }

    /* ── Local keyword classifier (instant, no network needed) ── */
    var _LC = [
        [/\bnike\b|adidas\b|new\s*balance|puma\b|\bconverse\b|air\s*jordan|\bvans\b|reebok|timberland|ugg\b|\btenis\b|zapatilla|calzado\b|sneaker|zapato/i, 'calzado'],
        [/iphone|samsung\s+galaxy|galaxy\s+[sa]\d|google\s+pixel|motorola\s|oneplus|\bxiaomi\b|celular\b|smartphone\b/i, 'celulares'],
        [/\blaptop\b|macbook|lenovo\b|dell\s+xps|hp\s+envy|\basus\b|\bacer\b|thinkpad|computadora\b|notebook\b|chromebook/i, 'computadora'],
        [/\bipad\b|kindle\b|galaxy\s+tab|\btableta?\b/i, 'tableta_electronica'],
        [/ps5\b|ps4\b|playstation|\bxbox\b|nintendo\s+switch|\bconsola\b/i, 'consola_videojuegos'],
        [/\bairpods\b|\bbeats\b|sony\s+wh|sony\s+wf|\bjabra\b|sennheiser|audífono|auricular\b|headphone/i, 'auricular_telefono'],
        [/apple\s+watch|galaxy\s+watch|\bfitbit\b|\bgarmin\b|smartwatch|reloj\s+inteligente/i, 'celulares'],
        [/camiseta|pantalón\b|\bvestido\b|\babrigo\b|camisa\b|\bpolo\b|hoodie|sudadera|\bjeans\b|\bjacket\b|\bropa\b/i, 'ropa'],
        [/televisor|smart\s+tv|oled\s+tv|qled\s|tv\s+\d{2}\b|\bmonitor\b/i, 'televisor'],
        [/proteína|proteina\b|suplemento|creatina\b|\bwhey\b|bcaa\b|pre.?workout|colágeno/i, 'suplementos'],
        [/cámara|camara\b|\bcanon\b|\bnikon\b|gopro\b|mirrorless|sony\s+alpha/i, 'camara'],
        [/bocina\b|parlante\b|jbl\s+charge|jbl\s+flip|marshall\s|harman\s+kardon|bose\s+speaker/i, 'bocina'],
        [/lentes\s+de\s+sol|gafas\s+de\s+sol|rayban|ray.ban|\boakley\b/i, 'anteojos'],
        [/lavadora\b|secadora\b|microondas\b|horno\s+eléctrico|refrigerador\b|nespresso|cafetera\b|electrodoméstico/i, 'electrodomesticos'],
        [/taladro\b|\bsierra\b|\bdrill\b|dewalt\b|makita\b|\bstanley\b|herramienta\b/i, 'herramientas'],
        [/perfume\b|colonia\b|maquillaje|skincare|crema\s+facial|sérum\b|labial\b|cosmético/i, 'salud_belleza'],
        [/\bjuguete\b|\blego\b|\bbarbie\b|figura\s+de\s+acción/i, 'juguetes'],
        [/colchón|colchon\b|\bsofá\b|sillón\b|mueble\b/i, 'colchon'],
        [/mancuerna|\bpesa\b|barbell\b|\bbicicleta\b|dumbell\b/i, 'bola'],
    ];
    function localClassify(text) {
        var l = text.toLowerCase();
        for (var i = 0; i < _LC.length; i++) if (_LC[i][0].test(l)) return _LC[i][1];
        return null;
    }

    /* ── Category helpers ── */
    var _EMOJI = {
        celulares:'📱',computadora:'💻',tableta_electronica:'📱',consola_videojuegos:'🎮',
        camara:'📷',auricular_telefono:'🎧',bocina:'🔊',televisor:'📺',ropa:'👗',calzado:'👟',
        anteojos:'🕶️',electrodomesticos:'🏠',herramientas:'🔧',bicicleta_economica:'🚲',
        bicicleta_cara:'🚴',bola:'⚽',juguetes:'🧸',salud_belleza:'💄',suplementos:'💪',
        colchon:'🛏️',vehiculos:'🚗',
    };
    var _LABEL = {
        celulares:'Celulares',computadora:'Laptops & PCs',tableta_electronica:'Tabletas',
        consola_videojuegos:'Consolas de Videojuegos',camara:'Cámaras y Video',
        auricular_telefono:'Audífonos y Audio',bocina:'Bocinas',televisor:'Televisores',
        ropa:'Ropa y Moda',calzado:'Calzado',anteojos:'Óptica',
        electrodomesticos:'Electrodomésticos',herramientas:'Herramientas',
        bola:'Artículos Deportivos',juguetes:'Juguetes',salud_belleza:'Salud y Belleza',
        suplementos:'Suplementos',colchon:'Muebles y Hogar',vehiculos:'Vehículos y Repuestos',
    };
    var _RELATED = {
        celulares:['AirPods Pro','cargador MagSafe','Apple Watch','funda protectora'],
        computadora:['mouse inalámbrico','teclado Bluetooth','mochila para laptop','monitor'],
        tableta_electronica:['Apple Pencil','teclado para tablet','funda con teclado'],
        consola_videojuegos:['mando adicional','audífonos gaming','juego físico'],
        calzado:['ropa deportiva','mochila deportiva','medias premium'],
        ropa:['calzado','cinturón de cuero','lentes de sol'],
        auricular_telefono:['celular','bocina portátil','cargador rápido'],
        bocina:['audífonos inalámbricos','subwoofer portátil'],
        televisor:['soporte de pared','soundbar','Apple TV 4K'],
        electrodomesticos:['accesorio de cocina','filtro de repuesto'],
        suplementos:['proteína extra','vitaminas','pre-workout','shaker'],
        salud_belleza:['crema hidratante','perfume importado','maquillaje'],
        juguetes:['pilas recargables','juego adicional'],
        herramientas:['brocas extra','caja de herramientas'],
        camara:['tarjeta SD','trípode portátil','lente adicional'],
    };
    var _CAT_INTRO = {
        calzado:['¡Qué buen gusto! 👟','¡Excelente elección en calzado!','¡Unos buenos tenis siempre caen bien! 🔥'],
        celulares:['¡Siempre hay un buen momento para un nuevo smartphone! 📱','¡Excelente elección!'],
        computadora:['¡Una buena laptop hace toda la diferencia! 💻','¡Gran elección!'],
        consola_videojuegos:['¡A disfrutar! 🎮','¡Excelente elección gamer!'],
        ropa:['¡Siempre hay espacio para algo nuevo en el closet! 👗','¡Gran estilo!'],
        suplementos:['¡A darle al gym! 💪','¡Excelente para tu rutina!'],
        televisor:['¡Una buena tele transforma el ambiente! 📺','¡Gran upgrade!'],
        auricular_telefono:['¡Nada como un buen sonido! 🎧','¡Excelente elección de audio!'],
        bocina:['¡Que suene la música! 🔊','¡Gran elección!'],
    };
    function catEmoji(c) { return _EMOJI[c] || '📦'; }
    function catLabel(c) { return _LABEL[c] || 'Producto general'; }
    function getRelated(c) { return (_RELATED[c] || ['accesorios relacionados']).slice(0,2); }
    function catIntro(c) {
        var opts = _CAT_INTRO[c];
        if (!opts) return '¡Con gusto lo cotizamos!';
        return opts[Math.floor(Math.random() * opts.length)];
    }

    /* ── Province data ── */
    var PROVS = [
        {v:'sanjose',l:'San José'},{v:'heredia',l:'Heredia'},{v:'alajuela',l:'Alajuela'},
        {v:'cartago',l:'Cartago'},{v:'guanacaste',l:'Guanacaste'},{v:'puntarenas',l:'Puntarenas'},
        {v:'limon',l:'Limón'},
    ];
    function provLabel(v) { var p=PROVS.find(function(x){return x.v===v;}); return p?p.l:v; }

    /* ── Render helpers ── */
    var _typingEl = null;

    function addRow(html, type) {
        var row = document.createElement('div');
        var grouped = (type === 'bot') && (_lastSender === 'bot');
        if (type === 'user') { _lastSender = 'user'; }
        else if (type === 'bot') { _lastSender = 'bot'; }
        var cls = 'cqc-row ' + type + ' cqc-in' + (grouped ? ' no-av' : '');
        row.className = cls;
        if (type === 'bot') {
            row.innerHTML = '<div class="cqc-mini-av">CR</div><div class="cqc-bubble">' + html + '</div>';
        } else if (type === 'user') {
            row.innerHTML = '<div class="cqc-bubble">' + esc(html) + '</div>';
        } else {
            row.innerHTML = '<div class="cqc-widget">' + html + '</div>';
        }
        msgsEl.appendChild(row);
        scrollBot();
        return row;
    }

    function addActions(btns) {
        _lastSender = null;
        var row = document.createElement('div');
        row.className = 'cqc-actions cqc-in';
        btns.forEach(function(b) {
            var el = document.createElement('button');
            el.type = 'button';
            el.className = 'cqc-btn ' + (b.cls || '');
            el.textContent = b.label;
            el.addEventListener('click', function(){
                row.querySelectorAll('.cqc-btn').forEach(function(x){ x.disabled=true; x.style.opacity='.42'; });
                b.fn();
            });
            row.appendChild(el);
        });
        msgsEl.appendChild(row);
        scrollBot();
        return row;
    }

    function showTyping() {
        if (_lastSender !== 'bot') _lastSender = 'bot';
        var row = document.createElement('div');
        row.className = 'cqc-row bot cqc-in';
        row.innerHTML = '<div class="cqc-mini-av">CR</div>'
            + '<div class="cqc-typing"><span></span><span></span><span></span></div>';
        msgsEl.appendChild(row); _typingEl = row; scrollBot();
    }
    function hideTyping() { if (_typingEl) { _typingEl.remove(); _typingEl = null; } }
    function say(html) { return addRow(html, 'bot'); }
    function inputVisible(v) { if (inputBar) inputBar.classList.toggle('cqc-hidden', !v); }

    /* ── Cart sheet ── */
    function updateCart() {
        var n = S.products.length;
        if (cartBtn)   cartBtn.style.display = n ? 'flex' : 'none';
        if (cartBadge) cartBadge.textContent = n;
    }
    function renderSheet() {
        if (!sheetWrap) return;
        sheetWrap.innerHTML = '';
        S.products.forEach(function(p) {
            var d = document.createElement('div');
            d.className = 'cqc-sheet-item';
            d.innerHTML = '<div class="cqc-si-icon">'+catEmoji(p.category)+'</div>'
                +'<div class="cqc-si-body"><div class="cqc-si-name">'+esc(p.name)+'</div>'
                +'<div class="cqc-si-price">$'+fmtUSD(p.declared_value_usd)+' USD</div></div>';
            sheetWrap.appendChild(d);
        });
        var total = S.products.reduce(function(s,p){return s+(p.declared_value_usd||0);},0);
        if (footerTot) footerTot.textContent = '~$'+fmtUSD(total)+' USD';
    }
    function openSheet()  { renderSheet(); if(overlay) overlay.style.display=''; if(sheet) sheet.classList.add('cqc-open'); }
    function closeSheet() { if(overlay) overlay.style.display='none'; if(sheet) sheet.classList.remove('cqc-open'); }
    function flashSheet() { openSheet(); setTimeout(closeSheet, 2600); }

    if (cartBtn) cartBtn.addEventListener('click', openSheet);
    (function(){
        var sc  = document.getElementById('cqc-sheet-close');
        var dr  = document.getElementById('cqc-drag-row');
        var bk  = document.getElementById('cqc-back-to-chat');
        if (sc)      sc.addEventListener('click', closeSheet);
        if (dr)      dr.addEventListener('click', closeSheet);
        if (bk)      bk.addEventListener('click', closeSheet);
        if (overlay) overlay.addEventListener('click', closeSheet);
    })();

    /* ═══════════════════════════════════════════
       PHASE: GREETING
    ═══════════════════════════════════════════ */
    function phaseGreeting() {
        /* Single source of truth — JS renders the one and only greeting bubble. */
        say('¡Hola! 👋 Soy el asistente de <strong>CRBOX</strong> — 20+ años de experiencia sirviendo a los ticos. ¿Qué querés traer de USA hoy?');

        setTimeout(function() {
            var chips = [
                {l:'📱 Celular',      q:'celular'},
                {l:'💻 Laptop',       q:'laptop computadora'},
                {l:'🎮 Consola',      q:'consola videojuegos'},
                {l:'👟 Tenis / Zapatos', q:'new balance nike tenis'},
                {l:'💪 Suplementos',  q:'proteína suplementos'},
                {l:'⌚ Smartwatch',   q:'Apple Watch smartwatch'},
            ];
            var r = addRow(
                '<div style="font-size:.74rem;color:#9ca3af;margin-bottom:.42rem;">Populares esta semana:</div>'
                + '<div class="cqc-chip-row">'
                + chips.map(function(c){
                    return '<button type="button" class="cqc-chip-pill" data-q="'
                        + esc(c.q) + '">' + c.l + '</button>';
                }).join('') + '</div>',
                'bot'
            );
            r.querySelectorAll('.cqc-chip-pill').forEach(function(b){
                b.addEventListener('click', function(){ startClassify(this.getAttribute('data-q')); });
            });
            S.phase = 'intro';
            inputVisible(true);
            if (inputEl) setTimeout(function(){ inputEl.focus(); }, 350);
        }, 460);
    }

    /* ═══════════════════════════════════════════
       PHASE: CLASSIFY
       Combines fast local classifier with AI for best results
    ═══════════════════════════════════════════ */
    function startClassify(query) {
        if (S.phase === 'classifying') return;
        S.phase = 'classifying';
        inputVisible(false);
        _lastSender = null;
        addRow(query, 'user');

        /* Pre-classify locally for instant category detection */
        var cleanName = extractCleanName(query);
        var localCat  = localClassify(query) || localClassify(normalizeQ(query));

        setTimeout(function() {
            showTyping();
            var render = function(result) {
                hideTyping();
                /* Product label: always the clean name extracted from the user's query.
                   (result.displayName is the category name, not the specific product name.) */
                var label = cleanName;
                /* Category code: prefer Gemini/Brain legacyCode (e.g. "celulares", "ropa")
                   → local keyword fallback → 'otros'.
                   The server response uses `legacyCode` for the category code used by
                   emoji/label lookups; the old `result.category` field is no longer returned. */
                var cat = (result && result.legacyCode && result.legacyCode !== 'otros')
                    ? result.legacyCode
                    : (localCat || 'otros');
                S.current = { name: label, category: cat, brainResult: result || null };
                showProductCard(S.current, result);
            };
            if (typeof CRBOXProductClassifier !== 'undefined') {
                CRBOXProductClassifier.classify(normalizeQ(query)).then(render).catch(function(){ render(null); });
            } else {
                setTimeout(function(){ render(null); }, 700);
            }
        }, 400);
    }

    /* ═══════════════════════════════════════════
       PRODUCT CARD
    ═══════════════════════════════════════════ */
    function showProductCard(prod, result) {
        S.phase = 'awaiting-price';
        var cat      = prod.category;
        var label    = prod.name;
        /* Only show the tax rate estimate when Gemini is high-confidence about it.
           For medium/low confidence, the geminiGuidance already invites the user
           to share more details instead of displaying a potentially wrong number. */
        var rateIsHigh = result && result.rateConfidence === 'high';
        var taxRange = rateIsHigh && result.estimatedRange ? result.estimatedRange : null;
        var docsReq  = result && result.documentsRequired && result.documentsRequired.length;
        var hasInfo  = cat && cat !== 'otros';

        /* Warm intro: Gemini natural language → category-aware fallback */
        var intro;
        if (result && result.geminiGuidance) {
            /* Gemini's own words — natural, product-specific, warm.
               When rate_confidence < high, Gemini's guidance already guides the
               user toward next steps without exposing a rate. */
            intro = esc(result.geminiGuidance) + ' Ingresá el precio aproximado para ver el estimado de impuestos.';
        } else {
            var open  = hasInfo ? catIntro(cat) : '¡Con gusto lo cotizamos!';
            var emoji = catEmoji(cat);
            if (hasInfo && taxRange) {
                intro = open + ' Podemos traer <strong>' + esc(label) + '</strong> ' + emoji
                    + ' directo de Miami. Arancel orientativo: <strong>~' + esc(taxRange) + '</strong>. '
                    + 'Ingresá el precio para ver el estimado de impuestos.';
            } else if (hasInfo) {
                intro = open + ' Podemos cotizar <strong>' + esc(label) + '</strong> ' + emoji
                    + ' sin problema — ingresá el precio aproximado en USD.';
            } else {
                intro = 'Podemos traer <strong>' + esc(label) + '</strong> para vos. '
                    + 'Ingresá el precio y un asesor CRBOX te confirma impuestos y requisitos. 📧';
            }
        }
        say(intro);

        var tags = '';
        if (taxRange) tags += '<span class="cqc-tag tax"><i class="fas fa-percentage" style="font-size:.54rem"></i> ~'+esc(taxRange)+'</span>';
        if (docsReq)  tags += '<span class="cqc-tag docs"><i class="fas fa-file-alt" style="font-size:.54rem"></i> Requiere documentos</span>';
        if (!taxRange && !docsReq && hasInfo) tags += '<span class="cqc-tag ok"><i class="fas fa-check" style="font-size:.54rem"></i> Sin restricciones especiales</span>';
        if (!hasInfo) tags += '<span class="cqc-tag warn"><i class="fas fa-search" style="font-size:.54rem"></i> Revisión por asesor</span>';

        var cid = 'cqpi'+Date.now(), eid = 'cqpe'+Date.now();
        addRow(
            '<div class="cqc-prod-head">'
            +'<div class="cqc-prod-icon">'+catEmoji(cat)+'</div>'
            +'<div><div class="cqc-prod-name">'+esc(label)+'</div>'
            +'<div class="cqc-prod-cat">'+esc(catLabel(cat))+'</div></div></div>'
            +(tags?'<div class="cqc-tags">'+tags+'</div>':'')
            +'<div class="cqc-price-row">'
            +'<span class="cqc-price-cur">USD $</span>'
            +'<input type="number" id="'+cid+'" class="cqc-price-inp" placeholder="0.00" min="0" step="0.01" inputmode="decimal">'
            +'</div>'
            +'<div id="'+eid+'" class="cqc-inp-err"><i class="fas fa-exclamation-circle"></i> Ingresá un precio mayor a cero.</div>',
            'wide'
        );
        var pi = document.getElementById(cid);
        if (pi) {
            setTimeout(function(){ pi.focus(); }, 200);
            pi.addEventListener('keydown', function(e){
                if (e.key==='Enter') { e.preventDefault(); confirmPrice(prod,result,label,cat,cid,eid); }
            });
        }
        addActions([
            { label:'✓ Agregar a solicitud', cls:'primary', fn:function(){ confirmPrice(prod,result,label,cat,cid,eid); } },
            { label:'✕ Buscar otra cosa', cls:'secondary', fn:function(){ say('Claro, ¿qué otro producto querés cotizar?'); phaseIntro(); } },
        ]);
    }

    function confirmPrice(prod, result, label, cat, cid, eid) {
        var inp = document.getElementById(cid), err = document.getElementById(eid);
        var price = inp ? parseFloat(inp.value) : 0;
        if (!price || price <= 0) { if(err) err.style.display=''; if(inp) inp.focus(); return; }
        if (err) err.style.display = 'none';

        var isFirst = S.products.length === 0;
        S.products.push({
            id:Date.now(), name:label||prod.name, category:cat||'otros',
            declared_value_usd:price, url:'', aiDataSource:result?'ai':'manual',
            brainClassification:result||null, clarification:'',
        });
        updateCart();
        _lastSender = null;
        addRow((label||prod.name) + ' — $' + fmtUSD(price) + ' USD', 'user');
        setTimeout(flashSheet, 550);

        setTimeout(function() {
            say('¡Listo! <strong>' + esc(label||prod.name) + '</strong> quedó en tu solicitud 🛍️');

            /* If user was editing mid-flow, go back to review+shipping */
            if (S._returnToShipping) {
                S._returnToShipping = false;
                setTimeout(phaseReview, 400);
                return;
            }

            if (isFirst) {
                var rel = getRelated(cat);
                setTimeout(function() {
                    addRow(
                        '<div class="cqc-tip">💡 <strong>Tip CRBOX:</strong> Podés consolidar varios '
                        +'artículos en un solo envío y el flete se cobra <strong>una sola vez</strong> — '
                        +'generalmente sale mucho más económico que enviar por separado.</div>'
                        +'<div style="margin-top:.52rem;font-size:.83rem;color:#4b5563;line-height:1.5;">'
                        +'Clientes que traen <strong>'+esc(label||prod.name)+'</strong> también cotizaron: '
                        +rel.map(function(r){return '<strong>'+esc(r)+'</strong>';}).join(' y ')
                        +'. ¿Querés aprovechar el envío?</div>',
                        'bot'
                    );
                    setTimeout(function() {
                        addActions([
                            { label:'➕ Agregar más productos', cls:'',
                              fn:function(){ say('¡Perfecto! ¿Qué más querés incluir?'); phaseIntro(); }
                            },
                            { label:'✓ Ya terminé', cls:'primary', fn:phaseReview },
                        ]);
                        S.phase = 'more';
                    }, 180);
                }, 640);
            } else {
                var n = S.products.length;
                say('Ya tenés <strong>' + n + ' producto' + (n>1?'s':'') + '</strong>. ¿Querés agregar algo más?');
                addActions([
                    { label:'➕ Agregar más', cls:'', fn:function(){ say('¡Dale! ¿Qué más querés traer?'); phaseIntro(); } },
                    { label:'✓ Ya terminé', cls:'primary', fn:phaseReview },
                ]);
                S.phase = 'more';
            }
        }, 380);
    }

    function phaseIntro() {
        S.phase = 'intro';
        inputVisible(true);
        if (inputEl) { inputEl.value = ''; setTimeout(function(){ inputEl.focus(); }, 100); }
    }

    /* ═══════════════════════════════════════════
       PHASE: REVIEW (summary before shipping)
    ═══════════════════════════════════════════ */
    function phaseReview() {
        S.phase = 'review'; inputVisible(false); showTyping();
        setTimeout(function() {
            hideTyping();
            var total = S.products.reduce(function(s,p){return s+(p.declared_value_usd||0);},0);
            var items = S.products.map(function(p){
                return '<div class="cqc-summary-item">'
                    +'<div class="cqc-summary-icon">'+catEmoji(p.category)+'</div>'
                    +'<div class="cqc-summary-body"><div class="cqc-summary-name">'+esc(p.name)+'</div>'
                    +'<div class="cqc-summary-price">$'+fmtUSD(p.declared_value_usd)+' USD</div></div></div>';
            }).join('');
            say('¡Perfecto! Aquí está el resumen de tu solicitud:');
            setTimeout(function() {
                addRow(
                    '<div style="font-size:.74rem;font-weight:700;color:#9ca3af;letter-spacing:.06em;text-transform:uppercase;margin-bottom:.5rem;">📋 Resumen de cotización</div>'
                    + items
                    + '<div class="cqc-summary-total"><span class="cqc-summary-total-lbl">Valor declarado total</span>'
                    + '<span class="cqc-summary-total-val">~$'+fmtUSD(total)+' USD</span></div>',
                    'wide'
                );
                setTimeout(function() {
                    say('¿Todo bien? Ahora solo necesito la <strong>provincia de entrega</strong> y el tipo de envío. 🚚');
                    setTimeout(phaseShipping, 460);
                }, 300);
            }, 260);
        }, 680);
    }

    /* ═══════════════════════════════════════════
       PHASE: SHIPPING
    ═══════════════════════════════════════════ */
    function phaseShipping() {
        S.phase = 'shipping';
        var gid = 'cqpg'+Date.now(), eid = 'cqpe2'+Date.now();
        var wRow = addRow(
            '<div style="font-size:.8rem;font-weight:700;color:#374151;margin-bottom:.52rem;">'
            +'<i class="fas fa-map-marker-alt" style="color:#FF6B00;margin-right:.3rem;"></i>Provincia de entrega</div>'
            +'<div class="cqc-prov-grid" id="'+gid+'">'
            +PROVS.map(function(p,i){
                return '<button type="button" class="cqc-prov-btn'+(i===6?' prov-wide':'')+'" data-val="'+p.v+'">'+p.l+'</button>';
            }).join('')+'</div>'
            +'<div style="font-size:.8rem;font-weight:700;color:#374151;margin:.82rem 0 .46rem;">'
            +'<i class="fas fa-shipping-fast" style="color:#FF6B00;margin-right:.3rem;"></i>Tipo de envío</div>'
            +'<div class="cqc-svc-row">'
            +'<button type="button" class="cqc-svc-opt sel" data-svc="aereo">✈️ Aéreo'
            +'<span style="font-size:.64rem;font-weight:400;display:block;opacity:.75;">'+esc(CRBOX.transitAereo)+'</span></button>'
            +'<button type="button" class="cqc-svc-opt" data-svc="maritimo">🚢 Marítimo'
            +'<span style="font-size:.64rem;font-weight:400;display:block;opacity:.75;">'+esc(CRBOX.transitMaritimo)+'</span></button>'
            +'</div>'
            +'<div id="'+eid+'" class="cqc-inp-err" style="margin-top:.3rem;">'
            +'<i class="fas fa-exclamation-circle"></i> Seleccioná una provincia primero.</div>',
            'wide'
        );
        var grid = document.getElementById(gid);
        if (grid) grid.querySelectorAll('.cqc-prov-btn').forEach(function(b){
            b.addEventListener('click', function(){
                grid.querySelectorAll('.cqc-prov-btn').forEach(function(x){x.classList.remove('sel');});
                this.classList.add('sel'); S.destination = this.getAttribute('data-val');
            });
        });
        wRow.querySelectorAll('.cqc-svc-opt').forEach(function(b){
            b.addEventListener('click', function(){
                wRow.querySelectorAll('.cqc-svc-opt').forEach(function(x){x.classList.remove('sel');});
                this.classList.add('sel'); S.serviceType = this.getAttribute('data-svc');
            });
        });
        addActions([
            { label:'Confirmar y continuar →', cls:'primary', fn:function(){
                var errEl = document.getElementById(eid);
                if (!S.destination) { if(errEl) errEl.style.display=''; return; }
                if (errEl) errEl.style.display='none';
                addRow(provLabel(S.destination)+' · '+(S.serviceType==='aereo'?'Aéreo ✈️':'Marítimo 🚢'), 'user');
                phaseContact();
            }},
            { label:'✏️ Cambiar algo', cls:'secondary', fn: phaseEdit },
        ]);
    }

    /* ═══════════════════════════════════════════
       PHASE: EDIT — natural-language correction
    ═══════════════════════════════════════════ */
    function phaseEdit() {
        S.phase = 'editing';
        inputVisible(true);
        if (inputEl) { inputEl.value = ''; setTimeout(function(){ inputEl.focus(); }, 120); }
        _lastSender = null;
        say('Claro 👍 Escribí qué querés cambiar, agregar o preguntar:');
        scrollBot();
    }

    function reofferConfirm() {
        addActions([
            { label:'Confirmar y continuar →', cls:'primary', fn: function(){
                if (!S.destination) {
                    say('Aún necesito la <strong>provincia de entrega</strong>. 📍');
                    setTimeout(phaseShipping, 400);
                    return;
                }
                addRow(provLabel(S.destination)+' · '+(S.serviceType==='aereo'?'Aéreo ✈️':'Marítimo 🚢'), 'user');
                phaseContact();
            }},
            { label:'✏️ Cambiar algo', cls:'secondary', fn: phaseEdit },
        ]);
    }

    function handleEdit(text) {
        addRow(text, 'user');
        _lastSender = null;
        inputVisible(false);

        /* Province detection */
        var foundProv = PROVS.find(function(p){
            var lower = text.toLowerCase();
            return lower.indexOf(p.l.toLowerCase()) >= 0 || lower.indexOf(p.v.toLowerCase()) >= 0;
        });
        if (foundProv) {
            S.destination = foundProv.v;
            showTyping();
            setTimeout(function(){
                hideTyping();
                say('¡Listo! Provincia actualizada a <strong>' + esc(foundProv.l) + '</strong>. ¿Todo bien para continuar?');
                setTimeout(reofferConfirm, 350);
            }, 700);
            return;
        }

        /* Shipping type detection */
        if (/mar[ií]timo|barco|bote/i.test(text)) {
            S.serviceType = 'maritimo';
            showTyping();
            setTimeout(function(){
                hideTyping();
                say('Cambiado a envío <strong>Marítimo 🚢</strong> (' + esc(CRBOX.transitMaritimo) + '). ¿Continuamos?');
                setTimeout(reofferConfirm, 350);
            }, 700);
            return;
        }
        if (/a[eé]reo|avi[oó]n|express|r[aá]pido/i.test(text)) {
            S.serviceType = 'aereo';
            showTyping();
            setTimeout(function(){
                hideTyping();
                say('Cambiado a envío <strong>Aéreo ✈️</strong> (' + esc(CRBOX.transitAereo) + '). ¿Todo bien?');
                setTimeout(reofferConfirm, 350);
            }, 700);
            return;
        }

        /* Add / include product intent */
        if (/agrega|añade|incluye|tambi[eé]n|otro|más producto|agregar|añadir|incluir|quiero pedir|quiero traer/i.test(text)) {
            S._returnToShipping = true;
            showTyping();
            setTimeout(function(){
                hideTyping();
                say('Perfecto, ¿qué producto querés agregar?');
                setTimeout(phaseIntro, 200);
            }, 600);
            return;
        }

        /* Generic fallback — acknowledge and re-offer confirm */
        showTyping();
        setTimeout(function(){
            hideTyping();
            say('Entendido. Si hay algo más que ajustar avisame. ¿Seguimos con la solicitud?');
            setTimeout(reofferConfirm, 350);
        }, 900);
    }

    /* ═══════════════════════════════════════════
       PHASE: CONTACT
    ═══════════════════════════════════════════ */
    function phaseContact() {
        S.phase = 'contact'; showTyping();
        setTimeout(function() {
            hideTyping();
            var svcTxt = S.serviceType === 'aereo'
                ? 'aéreo (' + CRBOX.transitAereo + ')'
                : 'marítimo (' + CRBOX.transitMaritimo + ')';
            say('¡Genial! Envío <strong>' + svcTxt + '</strong> a <strong>'
                + esc(provLabel(S.destination)) + '</strong>. '
                + 'Solo necesito tus datos para enviarte la cotización. 📧');
            setTimeout(function() {
                var nid='cqfn'+Date.now(), mid='cqfm'+Date.now(),
                    oid='cqfo'+Date.now(), eid='cqfe'+Date.now(), sid='cqfs'+Date.now();
                addRow(
                    '<div class="cqc-form-field"><label class="cqc-lbl" for="'+nid+'">Nombre '
                    +'<span style="color:#9ca3af;font-weight:400;">(opcional)</span></label>'
                    +'<input type="text" id="'+nid+'" class="cqc-finp" placeholder="¿Cómo te llamamos?" autocomplete="name" maxlength="120"></div>'
                    +'<div class="cqc-form-field"><label class="cqc-lbl" for="'+mid+'">Correo electrónico '
                    +'<span style="color:#ef4444;">*</span></label>'
                    +'<input type="email" id="'+mid+'" class="cqc-finp" placeholder="tucorreo@ejemplo.com" autocomplete="email" inputmode="email">'
                    +'<div id="'+eid+'" class="cqc-finp-err"><i class="fas fa-exclamation-circle"></i> Ingresá un correo electrónico válido.</div></div>'
                    +'<div class="cqc-form-field"><label class="cqc-lbl" for="'+oid+'">Notas adicionales '
                    +'<span style="color:#9ca3af;font-weight:400;">(opcional)</span></label>'
                    +'<input type="text" id="'+oid+'" class="cqc-finp" placeholder="Color, talla, modelo específico…" maxlength="300"></div>'
                    +'<button type="button" id="'+sid+'" class="cqc-submit-cta">'
                    +'<i class="fas fa-paper-plane"></i> Enviar solicitud</button>'
                    +'<div style="display:flex;align-items:center;justify-content:center;gap:.3rem;margin-top:.42rem;">'
                    +'<i class="fas fa-lock" style="font-size:.62rem;color:#9ca3af;"></i>'
                    +'<span style="font-size:.7rem;color:#9ca3af;">Solo CRBOX usa esta información para contactarte.</span></div>',
                    'wide'
                );
                var sb = document.getElementById(sid), em = document.getElementById(mid);
                if (sb) sb.addEventListener('click', function(){ submitQuote(nid,mid,oid,eid,sid); });
                if (em) {
                    setTimeout(function(){ em.focus(); }, 180);
                    em.addEventListener('keydown', function(e){
                        if (e.key==='Enter') { e.preventDefault(); submitQuote(nid,mid,oid,eid,sid); }
                    });
                }
            }, 340);
        }, 560);
    }

    /* ═══════════════════════════════════════════
       SUBMIT
    ═══════════════════════════════════════════ */
    async function submitQuote(nid, mid, oid, eid, sid) {
        var em=document.getElementById(mid), nm=document.getElementById(nid),
            no=document.getElementById(oid), err=document.getElementById(eid),
            sb=document.getElementById(sid);
        var email = (em ? em.value : '').trim();
        if (!email || !isEmail(email)) {
            if (em) { em.classList.add('err'); em.focus(); }
            if (err) err.style.display=''; return;
        }
        if (em) em.classList.remove('err'); if (err) err.style.display='none';
        S.customerName = nm ? nm.value.trim() : '';
        S.email = email;
        S.notes = no ? no.value.trim() : '';
        if (sb) { sb.disabled=true; sb.innerHTML='<i class="fas fa-circle-notch fa-spin"></i> Enviando…'; }
        S.phase = 'submitting';
        var products = S.products.map(function(p){
            return { name:p.name, category:p.category||'otros', declared_value_usd:p.declared_value_usd||0,
                url:p.url||'', data_source:p.aiDataSource||'manual',
                brain_classification:p.brainClassification||null, customer_clarification:p.clarification||'' };
        });
        var p0 = products[0] || {};
        var payload = {
            products:products, product_name:p0.name||'', declared_value_usd:p0.declared_value_usd||0,
            category:p0.category||'otros', product_url:p0.url||'',
            service_type:S.serviceType, destination_zone:S.destination,
            customer_email:S.email, account_type:'anonymous',
            data_source:(S.products[0]&&S.products[0].aiDataSource)||'manual',
        };
        if (S.customerName) payload.customer_name = S.customerName;
        if (S.notes)        payload.customer_notes = S.notes;
        try {
            var res  = await fetch('/api/solicitudes', {
                method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload),
            });
            var data = await res.json();
            if (res.ok && data.ok && data.id) {
                S.phase = 'done';
                if (sb) { sb.style.background='#22c55e'; sb.innerHTML='<i class="fas fa-check"></i> ¡Solicitud enviada!'; }
                setTimeout(function() {
                    var fn = S.customerName ? S.customerName.split(' ')[0] : '';
                    say((fn?'¡Listo, <strong>'+esc(fn)+'</strong>! ':'¡Listo! ')
                        +'🎉 Tu solicitud fue enviada con éxito. El equipo CRBOX te escribirá a '
                        +'<strong>'+esc(S.email)+'</strong> en menos de <strong>24 horas</strong>. '
                        +'Número de referencia: <strong>#'+esc(data.id)+'</strong>.');
                    setTimeout(function() {
                        say('Por cierto, si querés hacer más compras de USA de forma aún más fácil…');
                        setTimeout(function() {
                            addRow(
                                '<div class="cqc-casillero-card">'
                                +'<div class="cqc-cas-label">🏠 Servicio gratuito CRBOX</div>'
                                +'<div class="cqc-cas-title">Abrí tu casillero virtual en Miami</div>'
                                +'<div class="cqc-cas-desc">Obtenés una <strong style="color:#f1f5f9;">dirección real en Miami — 100% GRATIS</strong>, sin cuota mensual. Comprás en Amazon, BestBuy, Apple o cualquier tienda de USA y CRBOX gestiona el envío y entrega en Costa Rica.</div>'
                                +'<a href="'+esc(CRBOX.registerUrl)+'" class="cqc-cas-btn"><i class="fas fa-box-open"></i> Abrir mi casillero gratis</a>'
                                +'</div>',
                                'wide'
                            );
                        }, 380);
                    }, 1100);
                }, 420);
            } else {
                if (sb) { sb.disabled=false; sb.innerHTML='<i class="fas fa-paper-plane"></i> Enviar solicitud'; }
                say('Hubo un inconveniente al enviar. Por favor intentá de nuevo en un momento.');
                S.phase = 'contact';
            }
        } catch(e) {
            if (sb) { sb.disabled=false; sb.innerHTML='<i class="fas fa-paper-plane"></i> Enviar solicitud'; }
            say('Parece que hay un problema de conexión. Revisá tu internet e intentá de nuevo.');
            S.phase = 'contact';
        }
    }

    /* ── Input ── */
    function handleSend() {
        var val = (inputEl ? inputEl.value : '').trim();
        if (!val) return;
        if (S.phase === 'editing') { inputEl.value = ''; handleEdit(val); return; }
        if (S.phase !== 'intro') return;
        inputEl.value = ''; startClassify(val);
    }
    if (sendBtn) sendBtn.addEventListener('click', handleSend);
    if (inputEl) inputEl.addEventListener('keydown', function(e){
        if (e.key === 'Enter') { e.preventDefault(); handleSend(); }
    });

    /* ── Boot: rAF ensures DOM is fully painted before greeting runs ── */
    requestAnimationFrame(function() {
        requestAnimationFrame(phaseGreeting);
    });

})();
