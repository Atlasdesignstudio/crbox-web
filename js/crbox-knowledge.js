/**
 * crbox-knowledge.js
 * Loads the canonical CRBox knowledge base from /knowledge/crbox-kb.json
 * and exposes it as the global CRBOX_KNOWLEDGE object.
 *
 * This is the single source of truth for all CRBox facts —
 * the same JSON file is read server-side by /api/chat to build the Gemini
 * system prompt, so knowledge is always consistent.
 */
(function (global) {
  'use strict';

  var _kb = null;
  var _ready = false;
  var _callbacks = [];

  function _applyKb(data) {
    _kb = data;
    _ready = true;
    global.CRBOX_KNOWLEDGE = _kb;
    _callbacks.forEach(function (fn) { try { fn(_kb); } catch (e) {} });
    _callbacks = [];
  }

  function onReady(fn) {
    if (_ready) { fn(_kb); } else { _callbacks.push(fn); }
  }

  // 8 s timeout — small JSON file, anything beyond this means the network
  // is hung. We fall back to an empty KB so callers see a "ready" event
  // instead of waiting forever.
  var _kbCtrl  = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var _kbTimer = _kbCtrl ? setTimeout(function () { _kbCtrl.abort(); }, 8000) : null;

  fetch('/knowledge/crbox-kb.json', { signal: _kbCtrl ? _kbCtrl.signal : undefined })
    .then(function (r) { return r.json(); })
    .then(function (data) { _applyKb(data); })
    .catch(function (err) {
      console.warn('[CRBox] crbox-kb.json load failed:', err && err.message);
      global.CRBOXKnowledgeFailed = true;
      _applyKb({});
    })
    .finally(function () { if (_kbTimer) clearTimeout(_kbTimer); });

  global.CRBOX_KNOWLEDGE = null;
  global.CRBOXKnowledgeFailed = false;
  global.CRBOXKnowledgeReady = onReady;
})(window);
