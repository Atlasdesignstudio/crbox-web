/* ═══════════════════════════════════════════════════════════════
   CQChat — CRBOX Mobile Chat Concierge (≤640px)
   Conversational quote flow replacing the form-based UI on mobile.
   Desktop experience is completely unchanged.
═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';
    if (window.innerWidth > 640) return;

    /* ── CRBOX facts (KB-aware, with reliable fallbacks) ── */
    var KB = (typeof CRBOX_KNOWLEDGE !== 'undefined' && CRBOX_KNOWLEDGE) || {};
    var SVC = (KB.services) || {};
    var CRBOX = {
        transitAereo:    (SVC.carga_aerea    && SVC.carga_aerea.transit_days)    || '2–4 días hábiles',
        transitMaritimo: (SVC.carga_maritima && SVC.carga_maritima.transit_days) || '6–7 días hábiles',
        clients:         (KB.company && KB.company.clients) ? KB.company.clients.toLocaleString() + '+' : '33,000+',
        years:           (KB.company && KB.company.experience_years) || '20',
        registerUrl:     'mi-cuenta.html',
        whatsapp:        (KB.company && KB.company.whatsapp) || 'https://wa.me/50689794418',
    };

    /* ── State ── */
    var S = {
        phase:        'intro',
        products:     [],
        serviceType:  'aereo',
        destination:  '',
        customerName: '',
        email:        '',
        notes:        '',
    };

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
    function scrollBot() { setTimeout(function(){ msgsEl.scrollTop = msgsEl.scrollHeight; }, 60); }
    function ucFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
    function fmtUSD(n)  { return (n||0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}); }
    function normalizeQ(q) {
        q = q.trim();
        if (!/^(quiero|deseo|necesito|busco|quisiera|traer|comprar)/i.test(q) && q.length < 60)
            q = 'quiero traer ' + q;
        return q;
    }

    /* ── Category helpers ── */
    var _EMOJI = {
        celulares:'📱', computadora:'💻', tableta_electronica:'📱',
        consola_videojuegos:'🎮', camara:'📷', auricular_telefono:'🎧',
        bocina:'🔊', televisor:'📺', ropa:'👗', calzado:'👟',
        anteojos:'🕶️', electrodomesticos:'🏠', herramientas:'🔧',
        bicicleta_economica:'🚲', bicicleta_cara:'🚴', bola:'⚽',
        juguetes:'🧸', salud_belleza:'💄', suplementos:'💪',
        colchon:'🛏️', vehiculos:'🚗',
    };
    var _LABEL = {
        celulares:'Celulares', computadora:'Laptops & PCs',
        tableta_electronica:'Tabletas', consola_videojuegos:'Consolas de Videojuegos',
        camara:'Cámaras y Video', auricular_telefono:'Audífonos y Audio',
        bocina:'Bocinas', televisor:'Televisores', ropa:'Ropa y Moda',
        calzado:'Calzado', anteojos:'Óptica', electrodomesticos:'Electrodomésticos',
        herramientas:'Herramientas', bola:'Artículos Deportivos', juguetes:'Juguetes',
        salud_belleza:'Salud y Belleza', suplementos:'Suplementos',
        colchon:'Muebles y Hogar', vehiculos:'Vehículos y Repuestos',
    };
    var _RELATED = {
        celulares:           ['AirPods Pro', 'cargador MagSafe', 'Apple Watch', 'funda protectora'],
        computadora:         ['mouse inalámbrico', 'teclado Bluetooth', 'mochila para laptop', 'monitor'],
        tableta_electronica: ['Apple Pencil', 'teclado para tablet', 'funda con teclado'],
        consola_videojuegos: ['mando adicional', 'audífonos gaming', 'juego físico'],
        calzado:             ['ropa deportiva', 'mochila deportiva', 'medias premium'],
        ropa:                ['calzado', 'cinturón de cuero', 'lentes de sol'],
        auricular_telefono:  ['celular', 'bocina portátil', 'cargador rápido'],
        bocina:              ['audífonos inalámbricos', 'subwoofer portátil'],
        televisor:           ['soporte de pared', 'soundbar', 'Apple TV 4K'],
        electrodomesticos:   ['accesorio de cocina', 'filtro de repuesto'],
        suplementos:         ['proteína extra', 'vitaminas', 'pre-workout', 'shaker'],
        salud_belleza:       ['crema hidratante', 'perfume importado', 'maquillaje'],
        juguetes:            ['pilas recargables', 'juego adicional'],
        herramientas:        ['brocas extra', 'caja de herramientas'],
        camara:              ['tarjeta SD', 'trípode portátil', 'lente adicional'],
    };
    function catEmoji(c) { return _EMOJI[c] || '📦'; }
    function catLabel(c) { return _LABEL[c] || 'Producto general'; }
    function getRelated(c) { return (_RELATED[c] || ['accesorios relacionados']).slice(0, 2); }

    /* ── Province data ── */
    var PROVS = [
        {v:'sanjose',l:'San José'},{v:'heredia',l:'Heredia'},
        {v:'alajuela',l:'Alajuela'},{v:'cartago',l:'Cartago'},
        {v:'guanacaste',l:'Guanacaste'},{v:'puntarenas',l:'Puntarenas'},
        {v:'limon',l:'Limón'},
    ];
    function provLabel(v) { var p = PROVS.find(function(x){ return x.v===v; }); return p ? p.l : v; }

    /* ── Render helpers ── */
    var _typingEl = null;

    function addRow(html, type) {
        var row = document.createElement('div');
        row.className = 'cqc-row ' + type + ' cqc-in';
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
        var row = document.createElement('div');
        row.className = 'cqc-actions cqc-in';
        btns.forEach(function(b) {
            var el = document.createElement('button');
            el.type = 'button';
            el.className = 'cqc-btn ' + (b.cls || '');
            el.textContent = b.label;
            el.addEventListener('click', function() {
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
        var row = document.createElement('div');
        row.className = 'cqc-row bot cqc-in';
        row.innerHTML = '<div class="cqc-mini-av">CR</div>'
            + '<div class="cqc-typing"><span></span><span></span><span></span></div>';
        msgsEl.appendChild(row);
        _typingEl = row;
        scrollBot();
    }
    function hideTyping()    { if (_typingEl) { _typingEl.remove(); _typingEl = null; } }
    function say(html)       { return addRow(html, 'bot'); }
    function inputVisible(v) { if (inputBar) inputBar.classList.toggle('cqc-hidden', !v); }

    /* ── Cart bottom sheet ── */
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
            d.innerHTML = '<div class="cqc-si-icon">' + catEmoji(p.category) + '</div>'
                + '<div class="cqc-si-body">'
                + '<div class="cqc-si-name">' + esc(p.name) + '</div>'
                + '<div class="cqc-si-price">$' + fmtUSD(p.declared_value_usd) + ' USD</div>'
                + '</div>';
            sheetWrap.appendChild(d);
        });
        var total = S.products.reduce(function(s, p){ return s + (p.declared_value_usd || 0); }, 0);
        if (footerTot) footerTot.textContent = '~$' + fmtUSD(total) + ' USD';
    }

    function openSheet()  {
        renderSheet();
        if (overlay) overlay.style.display = '';
        if (sheet)   sheet.classList.add('cqc-open');
    }
    function closeSheet() {
        if (overlay) overlay.style.display = 'none';
        if (sheet)   sheet.classList.remove('cqc-open');
    }
    function flashSheet() { openSheet(); setTimeout(closeSheet, 2600); }

    if (cartBtn) cartBtn.addEventListener('click', openSheet);
    (function(){
        var sc = document.getElementById('cqc-sheet-close');
        var dr = document.getElementById('cqc-drag-row');
        if (sc) sc.addEventListener('click', closeSheet);
        if (dr) dr.addEventListener('click', closeSheet);
        if (overlay) overlay.addEventListener('click', closeSheet);
    })();

    /* ═══════════════════════════════════════════
       PHASE: GREETING
    ═══════════════════════════════════════════ */
    function phaseGreeting() {
        var h = new Date().getHours();
        var greet = h < 12 ? '¡Buenos días! ☀️' : h < 18 ? '¡Buenas tardes! 👋' : '¡Buenas noches! 🌙';
        say(greet + ' Soy el asistente de cotización de <strong>CRBOX</strong> — '
            + 'el courier de confianza de más de <strong>' + esc(CRBOX.clients) + '</strong> clientes en Costa Rica con '
            + '<strong>' + esc(CRBOX.years) + ' años</strong> de experiencia. '
            + 'Cuéntame, ¿qué querés traer de USA hoy?');

        setTimeout(function() {
            var chips = [
                {l:'📱 Celular',   q:'celular smartphone'},
                {l:'💻 Laptop',    q:'laptop computadora'},
                {l:'🎮 Consola',   q:'consola videojuegos'},
                {l:'👟 Calzado',   q:'zapatos sneakers'},
                {l:'💪 Suplementos', q:'suplementos proteína'},
                {l:'⌚ Smartwatch', q:'smartwatch Apple Watch'},
            ];
            var r = addRow(
                '<div style="font-size:.75rem;color:#9ca3af;margin-bottom:.38rem;">Populares esta semana:</div>'
                + '<div class="cqc-chip-row">'
                + chips.map(function(c){
                    return '<button type="button" class="cqc-chip-pill" data-q="' + esc(c.q) + '">' + c.l + '</button>';
                }).join('') + '</div>',
                'bot'
            );
            r.querySelectorAll('.cqc-chip-pill').forEach(function(b){
                b.addEventListener('click', function(){ startClassify(this.getAttribute('data-q')); });
            });
            S.phase = 'intro';
            inputVisible(true);
            if (inputEl) setTimeout(function(){ inputEl.focus(); }, 350);
        }, 540);
    }

    /* ═══════════════════════════════════════════
       PHASE: CLASSIFY
    ═══════════════════════════════════════════ */
    function startClassify(query) {
        if (S.phase === 'classifying') return;
        S.phase = 'classifying';
        inputVisible(false);
        addRow(query, 'user');
        setTimeout(function() {
            showTyping();
            var render = function(result) {
                hideTyping();
                S.current = {
                    name:       query,
                    category:   (result && result.category) || 'otros',
                    brainResult: result || null,
                };
                showProductCard(S.current, result);
            };
            if (typeof CRBOXProductClassifier !== 'undefined') {
                CRBOXProductClassifier.classify(normalizeQ(query))
                    .then(render).catch(function(){ render(null); });
            } else {
                setTimeout(function(){ render(null); }, 700);
            }
        }, 380);
    }

    /* ═══════════════════════════════════════════
       PRODUCT CARD
    ═══════════════════════════════════════════ */
    function showProductCard(prod, result) {
        S.phase = 'awaiting-price';
        var cat      = (result && result.category) || prod.category || 'otros';
        var label    = result && result.label ? result.label : ucFirst(prod.name);
        var taxRange = result && result.estimatedRange ? result.estimatedRange : null;
        var docsReq  = result && result.documentsRequired && result.documentsRequired.length;
        var hasInfo  = result && result.category && result.category !== 'otros';
        var unknown  = !result || result.status === 'unknown';

        /* Warm, concierge-quality intro */
        var intro;
        if (hasInfo && taxRange) {
            intro = '¡Excelente elección! 🎯 Podemos traerte <strong>' + esc(label) + '</strong> directo de Miami. '
                + 'El arancel orientativo para esta categoría es <strong>~' + esc(taxRange) + '</strong> del valor declarado. '
                + 'Ingresá el precio aproximado y te mostramos el estimado de impuestos.';
        } else if (hasInfo) {
            intro = '¡Con gusto cotizamos <strong>' + esc(label) + '</strong>! '
                + 'Ingresá el precio aproximado en USD y el equipo CRBOX calcula los impuestos exactos para vos.';
        } else {
            intro = 'Podemos traer <strong>' + esc(prod.name) + '</strong> para vos. '
                + 'Ingresá el precio aproximado y un asesor CRBOX te confirma impuestos y requisitos '
                + 'en menos de 24 horas. 📧';
        }
        say(intro);

        /* Info tags */
        var tags = '';
        if (taxRange && !unknown) tags += '<span class="cqc-tag tax"><i class="fas fa-percentage" style="font-size:.55rem"></i> ~' + esc(taxRange) + '</span>';
        if (docsReq) tags += '<span class="cqc-tag docs"><i class="fas fa-file-alt" style="font-size:.55rem"></i> Requiere documentos</span>';
        if (!taxRange && !docsReq && !unknown && hasInfo) tags += '<span class="cqc-tag ok"><i class="fas fa-check" style="font-size:.55rem"></i> Sin restricciones especiales</span>';
        if (unknown) tags += '<span class="cqc-tag warn"><i class="fas fa-search" style="font-size:.55rem"></i> Un asesor CRBOX lo revisa</span>';

        var cid = 'cqpi' + Date.now(), eid = 'cqpe' + Date.now();
        addRow(
            '<div class="cqc-prod-head">'
            + '<div class="cqc-prod-icon">' + catEmoji(cat) + '</div>'
            + '<div><div class="cqc-prod-name">' + esc(label) + '</div>'
            + '<div class="cqc-prod-cat">' + esc(catLabel(cat)) + '</div></div></div>'
            + (tags ? '<div class="cqc-tags">' + tags + '</div>' : '')
            + '<div class="cqc-price-row">'
            + '<span class="cqc-price-cur">USD $</span>'
            + '<input type="number" id="' + cid + '" class="cqc-price-inp" '
            + 'placeholder="0.00" min="0" step="0.01" inputmode="decimal">'
            + '</div>'
            + '<div id="' + eid + '" class="cqc-inp-err">'
            + '<i class="fas fa-exclamation-circle"></i> Ingresá un precio mayor a cero.</div>',
            'wide'
        );

        var pi = document.getElementById(cid);
        if (pi) {
            setTimeout(function(){ pi.focus(); }, 200);
            pi.addEventListener('keydown', function(e){
                if (e.key === 'Enter') { e.preventDefault(); confirmPrice(prod, result, label, cat, cid, eid); }
            });
        }
        addActions([
            { label: '✓ Agregar a solicitud', cls: 'primary',
              fn: function(){ confirmPrice(prod, result, label, cat, cid, eid); }
            },
            { label: '✕ Buscar otra cosa', cls: 'secondary',
              fn: function(){ say('Claro, cuéntame — ¿qué otro producto te gustaría cotizar?'); phaseIntro(); }
            },
        ]);
    }

    function confirmPrice(prod, result, label, cat, cid, eid) {
        var inp   = document.getElementById(cid);
        var err   = document.getElementById(eid);
        var price = inp ? parseFloat(inp.value) : 0;
        if (!price || price <= 0) { if(err) err.style.display=''; if(inp) inp.focus(); return; }
        if (err) err.style.display = 'none';

        var isFirst = S.products.length === 0;
        S.products.push({
            id: Date.now(), name: label || prod.name, category: cat || 'otros',
            declared_value_usd: price, url: '',
            aiDataSource: result ? 'ai' : 'manual',
            brainClassification: result || null, clarification: '',
        });
        updateCart();
        addRow((label || prod.name) + ' — $' + fmtUSD(price) + ' USD', 'user');

        /* Flash the cart sheet briefly so user discovers it */
        setTimeout(flashSheet, 550);

        setTimeout(function() {
            say('¡Listo! <strong>' + esc(label || prod.name) + '</strong> quedó en tu solicitud. '
                + 'Tocá la bolsita 🛍️ arriba para verla en cualquier momento.');

            if (isFirst) {
                /* First product: consolidation tip + category-aware suggestions */
                var rel = getRelated(cat);
                setTimeout(function() {
                    addRow(
                        '<div class="cqc-tip">'
                        + '💡 <strong>Tip CRBOX:</strong> Podés consolidar varios artículos en un solo envío '
                        + 'y el flete base se cobra <strong>una sola vez</strong>. Generalmente sale mucho más '
                        + 'económico que enviar cada cosa por separado — y el proceso aduanero es el mismo.'
                        + '</div>'
                        + '<div style="margin-top:.55rem;font-size:.83rem;color:#4b5563;line-height:1.5;">'
                        + 'Clientes que traen <strong>' + esc(label || prod.name) + '</strong> también cotizaron: '
                        + rel.map(function(r){ return '<strong>' + esc(r) + '</strong>'; }).join(' y ') + '. '
                        + '¿Querés aprovechar el envío y agregar algo más?'
                        + '</div>',
                        'bot'
                    );
                    setTimeout(function() {
                        addActions([
                            { label: '➕ Sí, agregar más productos', cls: '',
                              fn: function(){ say('¡Perfecto! ¿Qué otro artículo querés incluir?'); phaseIntro(); }
                            },
                            { label: '✓ Ya terminé', cls: 'primary', fn: phaseReview },
                        ]);
                        S.phase = 'more';
                    }, 200);
                }, 680);
            } else {
                /* Subsequent products */
                var n = S.products.length;
                say('Ya tenés <strong>' + n + ' producto' + (n > 1 ? 's' : '') + '</strong> en tu solicitud. '
                    + '¿Querés agregar algo más o ya terminaste?');
                addActions([
                    { label: '➕ Agregar más', cls: '',
                      fn: function(){ say('¡Perfecto! ¿Qué otro artículo querés incluir?'); phaseIntro(); }
                    },
                    { label: '✓ Ya terminé', cls: 'primary', fn: phaseReview },
                ]);
                S.phase = 'more';
            }
        }, 360);
    }

    function phaseIntro() {
        S.phase = 'intro';
        inputVisible(true);
        if (inputEl) { inputEl.value = ''; setTimeout(function(){ inputEl.focus(); }, 120); }
    }

    /* ═══════════════════════════════════════════
       PHASE: REVIEW — summary before shipping
    ═══════════════════════════════════════════ */
    function phaseReview() {
        S.phase = 'review';
        inputVisible(false);
        showTyping();
        setTimeout(function() {
            hideTyping();
            var total = S.products.reduce(function(s, p){ return s + (p.declared_value_usd || 0); }, 0);
            var items = S.products.map(function(p) {
                return '<div class="cqc-summary-item">'
                    + '<div class="cqc-summary-icon">' + catEmoji(p.category) + '</div>'
                    + '<div class="cqc-summary-body">'
                    + '<div class="cqc-summary-name">' + esc(p.name) + '</div>'
                    + '<div class="cqc-summary-price">$' + fmtUSD(p.declared_value_usd) + ' USD</div>'
                    + '</div></div>';
            }).join('');

            say('¡Perfecto! Aquí está el resumen de tu solicitud:');

            setTimeout(function() {
                addRow(
                    '<div style="font-size:.74rem;font-weight:700;color:#9ca3af;letter-spacing:.06em;'
                    + 'text-transform:uppercase;margin-bottom:.52rem;">📋 Resumen de cotización</div>'
                    + items
                    + '<div class="cqc-summary-total">'
                    + '<span class="cqc-summary-total-lbl">Valor declarado total</span>'
                    + '<span class="cqc-summary-total-val">~$' + fmtUSD(total) + ' USD</span>'
                    + '</div>',
                    'wide'
                );
                setTimeout(function() {
                    say('¿Todo bien? Ahora solo necesito saber a qué <strong>provincia</strong> enviamos '
                        + 'y el tipo de envío que preferís. 🚚');
                    setTimeout(phaseShipping, 500);
                }, 320);
            }, 280);
        }, 700);
    }

    /* ═══════════════════════════════════════════
       PHASE: SHIPPING
    ═══════════════════════════════════════════ */
    function phaseShipping() {
        S.phase = 'shipping';
        var gid = 'cqpg' + Date.now(), eid = 'cqpe2' + Date.now();

        var wRow = addRow(
            '<div style="font-size:.8rem;font-weight:700;color:#374151;margin-bottom:.52rem;">'
            + '<i class="fas fa-map-marker-alt" style="color:#FF6B00;margin-right:.32rem;"></i>Provincia de entrega</div>'
            + '<div class="cqc-prov-grid" id="' + gid + '">'
            + PROVS.map(function(p, i) {
                var wide = (i === 6) ? ' prov-wide' : '';
                return '<button type="button" class="cqc-prov-btn' + wide + '" data-val="' + p.v + '">' + p.l + '</button>';
            }).join('')
            + '</div>'
            + '<div style="font-size:.8rem;font-weight:700;color:#374151;margin:.82rem 0 .46rem;">'
            + '<i class="fas fa-shipping-fast" style="color:#FF6B00;margin-right:.32rem;"></i>Tipo de envío</div>'
            + '<div class="cqc-svc-row">'
            + '<button type="button" class="cqc-svc-opt sel" data-svc="aereo">✈️ Aéreo'
            + '<span style="font-size:.64rem;font-weight:400;display:block;opacity:.75;">'
            + esc(CRBOX.transitAereo) + '</span></button>'
            + '<button type="button" class="cqc-svc-opt" data-svc="maritimo">🚢 Marítimo'
            + '<span style="font-size:.64rem;font-weight:400;display:block;opacity:.75;">'
            + esc(CRBOX.transitMaritimo) + '</span></button>'
            + '</div>'
            + '<div id="' + eid + '" class="cqc-inp-err" style="margin-top:.32rem;">'
            + '<i class="fas fa-exclamation-circle"></i> Seleccioná una provincia primero.</div>',
            'wide'
        );

        var grid = document.getElementById(gid);
        if (grid) grid.querySelectorAll('.cqc-prov-btn').forEach(function(b){
            b.addEventListener('click', function(){
                grid.querySelectorAll('.cqc-prov-btn').forEach(function(x){ x.classList.remove('sel'); });
                this.classList.add('sel');
                S.destination = this.getAttribute('data-val');
            });
        });
        wRow.querySelectorAll('.cqc-svc-opt').forEach(function(b){
            b.addEventListener('click', function(){
                wRow.querySelectorAll('.cqc-svc-opt').forEach(function(x){ x.classList.remove('sel'); });
                this.classList.add('sel');
                S.serviceType = this.getAttribute('data-svc');
            });
        });

        addActions([{
            label: 'Confirmar y continuar →', cls: 'primary',
            fn: function() {
                var errEl = document.getElementById(eid);
                if (!S.destination) { if(errEl) errEl.style.display=''; return; }
                if (errEl) errEl.style.display = 'none';
                var svcLabel = S.serviceType === 'aereo' ? 'Aéreo ✈️' : 'Marítimo 🚢';
                addRow(provLabel(S.destination) + ' · ' + svcLabel, 'user');
                phaseContact();
            }
        }]);
    }

    /* ═══════════════════════════════════════════
       PHASE: CONTACT
    ═══════════════════════════════════════════ */
    function phaseContact() {
        S.phase = 'contact';
        showTyping();
        setTimeout(function() {
            hideTyping();
            var svcTxt = S.serviceType === 'aereo'
                ? 'aéreo (' + CRBOX.transitAereo + ')'
                : 'marítimo (' + CRBOX.transitMaritimo + ')';
            say('¡Genial! Envío <strong>' + svcTxt + '</strong> a <strong>'
                + esc(provLabel(S.destination)) + '</strong>. '
                + 'Solo necesito tus datos de contacto para enviarte la cotización completa. 📧');

            setTimeout(function() {
                var nid = 'cqfn'+Date.now(), mid = 'cqfm'+Date.now(),
                    oid = 'cqfo'+Date.now(), eid = 'cqfe'+Date.now(), sid = 'cqfs'+Date.now();
                addRow(
                    '<div class="cqc-form-field">'
                    + '<label class="cqc-lbl" for="'+nid+'">Nombre '
                    + '<span style="color:#9ca3af;font-weight:400;">(opcional)</span></label>'
                    + '<input type="text" id="'+nid+'" class="cqc-finp" '
                    + 'placeholder="¿Cómo te llamamos?" autocomplete="name" maxlength="120">'
                    + '</div>'
                    + '<div class="cqc-form-field">'
                    + '<label class="cqc-lbl" for="'+mid+'">Correo electrónico '
                    + '<span style="color:#ef4444;">*</span></label>'
                    + '<input type="email" id="'+mid+'" class="cqc-finp" '
                    + 'placeholder="tucorreo@ejemplo.com" autocomplete="email" inputmode="email">'
                    + '<div id="'+eid+'" class="cqc-finp-err">'
                    + '<i class="fas fa-exclamation-circle"></i> Ingresá un correo electrónico válido.</div>'
                    + '</div>'
                    + '<div class="cqc-form-field">'
                    + '<label class="cqc-lbl" for="'+oid+'">Notas adicionales '
                    + '<span style="color:#9ca3af;font-weight:400;">(opcional)</span></label>'
                    + '<input type="text" id="'+oid+'" class="cqc-finp" '
                    + 'placeholder="Color, talla, modelo específico…" maxlength="300">'
                    + '</div>'
                    + '<button type="button" id="'+sid+'" class="cqc-submit-cta">'
                    + '<i class="fas fa-paper-plane"></i> Enviar solicitud</button>'
                    + '<div style="display:flex;align-items:center;justify-content:center;'
                    + 'gap:.3rem;margin-top:.42rem;">'
                    + '<i class="fas fa-lock" style="font-size:.62rem;color:#9ca3af;"></i>'
                    + '<span style="font-size:.7rem;color:#9ca3af;">'
                    + 'Solo CRBOX usa esta información para contactarte.</span></div>',
                    'wide'
                );
                var sb = document.getElementById(sid), em = document.getElementById(mid);
                if (sb) sb.addEventListener('click', function(){ submitQuote(nid,mid,oid,eid,sid); });
                if (em) {
                    setTimeout(function(){ em.focus(); }, 180);
                    em.addEventListener('keydown', function(e){
                        if (e.key === 'Enter') { e.preventDefault(); submitQuote(nid,mid,oid,eid,sid); }
                    });
                }
            }, 360);
        }, 580);
    }

    /* ═══════════════════════════════════════════
       SUBMIT
    ═══════════════════════════════════════════ */
    async function submitQuote(nid, mid, oid, eid, sid) {
        var em  = document.getElementById(mid),
            nm  = document.getElementById(nid),
            no  = document.getElementById(oid),
            err = document.getElementById(eid),
            sb  = document.getElementById(sid);

        var email = (em ? em.value : '').trim();
        if (!email || !isEmail(email)) {
            if (em) { em.classList.add('err'); em.focus(); }
            if (err) err.style.display = '';
            return;
        }
        if (em)  em.classList.remove('err');
        if (err) err.style.display = 'none';

        S.customerName = nm ? nm.value.trim() : '';
        S.email        = email;
        S.notes        = no ? no.value.trim() : '';

        if (sb) { sb.disabled = true; sb.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Enviando…'; }
        S.phase = 'submitting';

        var products = S.products.map(function(p) {
            return {
                name: p.name, category: p.category || 'otros',
                declared_value_usd: p.declared_value_usd || 0, url: p.url || '',
                data_source: p.aiDataSource || 'manual',
                brain_classification: p.brainClassification || null,
                customer_clarification: p.clarification || '',
            };
        });
        var p0 = products[0] || {};
        var payload = {
            products: products, product_name: p0.name || '',
            declared_value_usd: p0.declared_value_usd || 0,
            category: p0.category || 'otros', product_url: p0.url || '',
            service_type: S.serviceType, destination_zone: S.destination,
            customer_email: S.email, account_type: 'anonymous',
            data_source: (S.products[0] && S.products[0].aiDataSource) || 'manual',
        };
        if (S.customerName) payload.customer_name = S.customerName;
        if (S.notes)        payload.customer_notes = S.notes;

        try {
            var res  = await fetch('/api/solicitudes', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            var data = await res.json();

            if (res.ok && data.ok && data.id) {
                S.phase = 'done';
                if (sb) { sb.style.background='#22c55e'; sb.innerHTML='<i class="fas fa-check"></i> ¡Solicitud enviada!'; }

                setTimeout(function() {
                    var fn = S.customerName ? S.customerName.split(' ')[0] : '';
                    say(
                        (fn ? '¡Listo, <strong>' + esc(fn) + '</strong>! ' : '¡Listo! ')
                        + '🎉 Tu solicitud fue enviada con éxito. El equipo CRBOX te escribirá a '
                        + '<strong>' + esc(S.email) + '</strong> en menos de <strong>24 horas</strong> '
                        + 'con la cotización completa. Tu número de referencia es '
                        + '<strong>#' + esc(data.id) + '</strong>.'
                    );

                    /* Casillero CTA after a moment */
                    setTimeout(function() {
                        say('Por cierto, si querés hacer más compras en USA de forma sencilla en el futuro…');
                        setTimeout(function() {
                            addRow(
                                '<div class="cqc-casillero-card">'
                                + '<div class="cqc-cas-label">🏠 Servicio gratuito CRBOX</div>'
                                + '<div class="cqc-cas-title">Abrí tu casillero virtual en Miami</div>'
                                + '<div class="cqc-cas-desc">'
                                + 'Obtenés una <strong style="color:#f1f5f9;">dirección real en Miami — 100% GRATIS</strong>, '
                                + 'sin cuota mensual ni inscripción. Comprás en Amazon, BestBuy, Apple o cualquier tienda de USA '
                                + 'y CRBOX gestiona el envío, los trámites aduaneros y la entrega a tu puerta en Costa Rica.'
                                + '</div>'
                                + '<a href="' + esc(CRBOX.registerUrl) + '" class="cqc-cas-btn">'
                                + '<i class="fas fa-box-open"></i> Abrir mi casillero gratis</a>'
                                + '</div>',
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
        if (!val || S.phase !== 'intro') return;
        inputEl.value = '';
        startClassify(val);
    }
    if (sendBtn) sendBtn.addEventListener('click', handleSend);
    if (inputEl) inputEl.addEventListener('keydown', function(e){
        if (e.key === 'Enter') { e.preventDefault(); handleSend(); }
    });

    /* ── Boot ── */
    window.scrollTo(0, 0);
    setTimeout(phaseGreeting, 80);

})();
