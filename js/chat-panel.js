/**
 * chat-panel.js
 * CRBox Gemini-powered AI chat assistant.
 * Depends on: chat-calculator.js, chat-quote.js (loaded via same page).
 */
(function (global) {
  'use strict';

  var MAX_HISTORY     = 10;
  var MAX_MSG_CHARS   = 500;
  var GREETING_DELAY = 3500;
  var CHAT_ENDPOINT = '/api/chat';

  var _history = [];
  var _open = false;
  var _greeted = false;
  var _pending = false;

  var $bubble, $backdrop, $panel, $messages, $input, $send, $typing, $close;

  // ── Page slug detection ───────────────────────────────────────────────────
  function _pageSlug() {
    var p = (location.pathname || '').replace(/.*\//, '').replace(/\.html$/, '') || 'index';
    return p;
  }

  // ── Build DOM ─────────────────────────────────────────────────────────────
  function _buildPanel() {
    // Floating bubble
    $bubble = document.createElement('button');
    $bubble.id = 'crbox-chat-bubble';
    $bubble.setAttribute('aria-label', 'Abrir asistente de chat CRBox');
    $bubble.innerHTML = '<i class="fas fa-comment-dots"></i><span class="crbox-bubble-dot" id="crbox-bubble-dot"></span>';

    // Mobile backdrop
    $backdrop = document.createElement('div');
    $backdrop.id = 'crbox-chat-backdrop';
    $backdrop.setAttribute('aria-hidden', 'true');

    // Panel
    $panel = document.createElement('div');
    $panel.id = 'crbox-chat-panel';
    $panel.setAttribute('role', 'dialog');
    $panel.setAttribute('aria-label', 'Asistente CRBox');
    $panel.setAttribute('aria-modal', 'true');

    // Header
    var header = document.createElement('div');
    header.id = 'crbox-chat-header';
    header.innerHTML = [
      '<div class="crbox-chat-header-logo"><i class="fas fa-box"></i></div>',
      '<div class="crbox-chat-header-info">',
        '<div class="crbox-chat-header-title">Asistente CRBox</div>',
        '<div class="crbox-chat-header-sub"><span class="crbox-online-dot"></span>En línea — respuesta inmediata</div>',
      '</div>',
    ].join('');
    $close = document.createElement('button');
    $close.id = 'crbox-chat-close';
    $close.setAttribute('aria-label', 'Cerrar chat');
    $close.innerHTML = '<i class="fas fa-times"></i>';
    header.appendChild($close);
    $panel.appendChild(header);

    // Messages
    $messages = document.createElement('div');
    $messages.id = 'crbox-chat-messages';
    $messages.setAttribute('aria-live', 'polite');
    $messages.setAttribute('aria-atomic', 'false');
    $typing = document.createElement('div');
    $typing.id = 'crbox-typing-indicator';
    $typing.setAttribute('aria-label', 'El asistente está escribiendo');
    $typing.innerHTML = '<div class="crbox-typing-dot"></div><div class="crbox-typing-dot"></div><div class="crbox-typing-dot"></div>';
    $messages.appendChild($typing);
    $panel.appendChild($messages);

    // Input bar
    var bar = document.createElement('div');
    bar.id = 'crbox-chat-input-bar';
    $input = document.createElement('textarea');
    $input.id = 'crbox-chat-input';
    $input.setAttribute('rows', '1');
    $input.setAttribute('maxlength', '600');
    $input.setAttribute('placeholder', 'Escribe tu pregunta…');
    $input.setAttribute('aria-label', 'Mensaje al asistente');
    $send = document.createElement('button');
    $send.id = 'crbox-chat-send';
    $send.setAttribute('aria-label', 'Enviar mensaje');
    $send.innerHTML = '<i class="fas fa-paper-plane"></i>';
    bar.appendChild($input);
    bar.appendChild($send);
    $panel.appendChild(bar);

    document.body.appendChild($bubble);
    document.body.appendChild($backdrop);
    document.body.appendChild($panel);

    _bindEvents();
    _scheduleGreeting();
  }

  // ── Events ────────────────────────────────────────────────────────────────
  function _bindEvents() {
    $bubble.addEventListener('click', _togglePanel);
    $close.addEventListener('click', _closePanel);
    $backdrop.addEventListener('click', _closePanel);
    $send.addEventListener('click', _sendMessage);
    $input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendMessage(); }
    });
    $input.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 110) + 'px';
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _open) _closePanel();
    });
  }

  // ── Panel open/close ──────────────────────────────────────────────────────
  function _openPanel() {
    if (_open) return;
    _open = true;
    _hideDot();
    $bubble.setAttribute('aria-expanded', 'true');
    if (window.innerWidth <= 600) {
      $backdrop.classList.add('open');
      requestAnimationFrame(function () { $backdrop.classList.add('visible'); });
    }
    $panel.classList.add('open');
    setTimeout(function () { $input.focus(); }, 350);
  }

  function _closePanel() {
    if (!_open) return;
    _open = false;
    $bubble.setAttribute('aria-expanded', 'false');
    $panel.classList.remove('open');
    $backdrop.classList.remove('visible');
    setTimeout(function () { $backdrop.classList.remove('open'); }, 250);
  }

  function _togglePanel() { _open ? _closePanel() : _openPanel(); }

  // ── Dot notification ──────────────────────────────────────────────────────
  function _showDot() {
    var dot = document.getElementById('crbox-bubble-dot');
    if (dot) dot.classList.add('visible');
  }
  function _hideDot() {
    var dot = document.getElementById('crbox-bubble-dot');
    if (dot) dot.classList.remove('visible');
  }

  // ── FAQ pills ─────────────────────────────────────────────────────────────
  var FAQ_PILLS = [
    '¿Cuánto cuesta un envío?',
    '¿Cómo funciona el casillero?',
    '¿Cuánto tarda en llegar?',
    '¿Cómo rastreo mi paquete?'
  ];

  function _removeFAQPills() {
    var existing = document.getElementById('crbox-faq-pills');
    if (existing) existing.parentNode.removeChild(existing);
  }

  function _appendFAQPills() {
    _removeFAQPills();
    var wrap = document.createElement('div');
    wrap.id = 'crbox-faq-pills';
    FAQ_PILLS.forEach(function (q) {
      var btn = document.createElement('button');
      btn.className = 'crbox-faq-pill';
      btn.textContent = q;
      btn.type = 'button';
      btn.addEventListener('click', function () {
        _removeFAQPills();
        $input.value = q;
        _sendMessage();
      });
      wrap.appendChild(btn);
    });
    $messages.insertBefore(wrap, $typing);
    _scrollBottom();
  }

  // ── Greeting — uses CRBOX_KNOWLEDGE.page_map when available ─────────────
  function _scheduleGreeting() {
    setTimeout(function () {
      if (_greeted || _open) return;
      _greeted = true;
      var slug = _pageSlug();
      var msg = _greetingForPage(slug);
      if (!_open) _showDot();
      _appendAIMessage(msg);
      _appendFAQPills();
    }, GREETING_DELAY);
  }

  function _greetingForPage(slug) {
    var kb = (typeof CRBOX_KNOWLEDGE !== 'undefined') ? CRBOX_KNOWLEDGE : null;
    if (kb && kb.page_map && kb.page_map[slug] && kb.page_map[slug].greeting) {
      return kb.page_map[slug].greeting;
    }
    var defaults = {
      'tarifas':       '¡Hola! Veo que estás revisando las tarifas. ¿Quieres que calcule el costo de tu envío?',
      'calculadora':   '¡Hola! Puedo ayudarte a entender el resultado de la calculadora o responder preguntas sobre tu envío.',
      'cotizar':       '¡Hola! ¿Necesitas ayuda para completar tu solicitud de compra por encargo?',
      'servicios':     '¡Hola! Estoy aquí para explicarte cualquiera de nuestros servicios. ¿En qué te ayudo?',
      'como-funciona': '¡Hola! ¿Tienes alguna duda sobre el proceso de envío de CRBOX?',
      'contacto':      '¡Hola! ¿Puedo ayudarte antes de que escribas al equipo?',
      'index':         '¡Hola! Soy el Asistente CRBox. Puedo resolver tus dudas sobre envíos, tarifas y servicios. ¿En qué te ayudo?',
    };
    return defaults[slug] || '¡Hola! Soy el Asistente CRBox. ¿En qué te puedo ayudar hoy?';
  }

  // ── Message rendering ─────────────────────────────────────────────────────
  function _appendUserMessage(text) {
    var wrap = document.createElement('div');
    wrap.className = 'crbox-msg user';
    var bubble = document.createElement('div');
    bubble.className = 'crbox-msg-bubble';
    bubble.textContent = text;
    wrap.appendChild(bubble);
    $messages.insertBefore(wrap, $typing);
    _scrollBottom();
  }

  function _appendAIMessage(text, widget, deeplink) {
    var wrap = document.createElement('div');
    wrap.className = 'crbox-msg ai';
    var bubble = document.createElement('div');
    bubble.className = 'crbox-msg-bubble';
    bubble.innerHTML = _formatText(text);
    wrap.appendChild(bubble);

    if (widget) {
      wrap.appendChild(widget);
    }

    if (deeplink && deeplink.url && deeplink.label) {
      var safeUrl = _sanitizeDeeplink(String(deeplink.url || '').trim());
      if (safeUrl) {
        var a = document.createElement('a');
        a.href = safeUrl;
        a.className = 'crbox-msg-deeplink';
        a.rel = 'noopener noreferrer';
        a.innerHTML = '<i class="fas fa-arrow-right" style="font-size:.65rem;"></i>' + _esc(deeplink.label);
        wrap.appendChild(a);
      }
    }

    $messages.insertBefore(wrap, $typing);
    _scrollBottom();
  }

  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _sanitizeDeeplink(url) {
    if (!url) return null;
    var s = String(url).trim();
    if (/^\/[^/\\]/.test(s) || /^[a-zA-Z0-9_\-]+\.html(\?[^<>"]*)?$/.test(s)) return s;
    return null;
  }

  function _formatText(text) {
    return _esc(text).replace(/\n/g, '<br>');
  }

  function _showTyping() {
    $typing.classList.add('visible');
    _scrollBottom();
  }
  function _hideTyping() { $typing.classList.remove('visible'); }

  function _scrollBottom() {
    $messages.scrollTop = $messages.scrollHeight;
  }

  // ── Build inline widget from AI widget payload ────────────────────────────
  function _buildWidget(widgetPayload) {
    if (!widgetPayload || !widgetPayload.type) return null;
    var type = widgetPayload.type;
    var data = widgetPayload.data || {};

    if (type === 'calculator' && global.CHAT_CALCULATOR) {
      return CHAT_CALCULATOR.createCalcWidget(data.weight, data.category);
    }
    if (type === 'quote-form' && global.CHAT_QUOTE) {
      return CHAT_QUOTE.createQuoteWidget({ url: data.url });
    }
    if (type === 'compliance') {
      return _buildComplianceWidget(data);
    }
    return null;
  }

  function _buildComplianceWidget(data) {
    var cls = (data.classification || 'allowed').toLowerCase();
    var labelMap = { allowed: 'Permitido', restricted: 'Restringido', prohibited: 'Prohibido' };
    var iconMap  = { allowed: 'fa-check-circle', restricted: 'fa-exclamation-triangle', prohibited: 'fa-ban' };
    var el = document.createElement('div');
    el.className = 'crbox-widget-compliance';
    var badge = document.createElement('div');
    badge.className = 'crbox-compliance-badge ' + cls;
    badge.innerHTML = '<i class="fas ' + (iconMap[cls] || 'fa-info-circle') + '"></i>' + (labelMap[cls] || cls);
    var item = document.createElement('div');
    item.className = 'crbox-compliance-item';
    item.textContent = data.item || '';
    var reason = document.createElement('div');
    reason.className = 'crbox-compliance-reason';
    reason.textContent = data.reason || '';
    el.appendChild(badge);
    if (data.item) el.appendChild(item);
    if (data.reason) el.appendChild(reason);
    if (data.note) {
      var note = document.createElement('div');
      note.className = 'crbox-compliance-note';
      note.textContent = data.note;
      el.appendChild(note);
    }
    return el;
  }

  // ── Send message ──────────────────────────────────────────────────────────
  function _sendMessage() {
    var text = $input.value.trim().slice(0, MAX_MSG_CHARS);
    if (!text || _pending) return;

    _removeFAQPills();
    _openPanel();
    _appendUserMessage(text);
    _history.push({ role: 'user', text: text });
    if (_history.length > MAX_HISTORY) _history = _history.slice(-MAX_HISTORY);

    $input.value = '';
    $input.style.height = 'auto';
    $send.disabled = true;
    _pending = true;
    _showTyping();

    var slug = _pageSlug();
    var kb = (typeof CRBOX_KNOWLEDGE !== 'undefined') ? CRBOX_KNOWLEDGE : null;
    var pageInfo = (kb && kb.page_map && kb.page_map[slug]) ? kb.page_map[slug] : null;

    // 20 s timeout — Gemini can be slow but anything beyond this is hung.
    var _ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var _timer = _ctrl ? setTimeout(function () { _ctrl.abort(); }, 20000) : null;

    fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: _history,
        page: slug,
        context: pageInfo,
      }),
      signal: _ctrl ? _ctrl.signal : undefined,
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      _hideTyping();
      var reply = (data && data.reply) || 'Lo siento, no pude procesar tu consulta. Intenta de nuevo.';
      var widget = _buildWidget(data && data.widget);
      var deeplink = data && data.deeplink;
      _appendAIMessage(reply, widget, deeplink);
      _history.push({ role: 'assistant', text: reply });
      if (_history.length > MAX_HISTORY) _history = _history.slice(-MAX_HISTORY);
    })
    .catch(function (err) {
      _hideTyping();
      var msg = (err && err.name === 'AbortError')
        ? 'La consulta tomó demasiado tiempo. Intenta de nuevo o contáctanos por WhatsApp.'
        : 'Hubo un error de conexión. Por favor intenta de nuevo o contáctanos por WhatsApp.';
      _appendAIMessage(msg);
    })
    .finally(function () {
      if (_timer) clearTimeout(_timer);
      _pending = false;
      $send.disabled = false;
      $input.focus();
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _buildPanel);
    } else {
      _buildPanel();
    }
  }

  global.CRBOX_CHAT = { init: init, open: _openPanel, close: _closePanel };
  init();

})(window);
