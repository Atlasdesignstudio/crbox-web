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

  fetch('/knowledge/crbox-kb.json')
    .then(function (r) { return r.json(); })
    .then(function (data) { _applyKb(data); })
    .catch(function (err) {
      console.warn('[CRBox] crbox-kb.json load failed:', err);
      _applyKb({});
    });

  global.CRBOX_KNOWLEDGE = null;
  global.CRBOXKnowledgeReady = onReady;
})(window);
