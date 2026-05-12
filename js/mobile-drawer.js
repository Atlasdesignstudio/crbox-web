// js/mobile-drawer.js — CRBOX Mobile Side Drawer  v1
// Self-contained IIFE. No external dependencies at load time.
// Reads auth state lazily (on first open) from window.CRBOXAuth.
(function () {
  'use strict';

  if (window.__crboxDrawerInit) return;
  window.__crboxDrawerInit = true;

  // ── Config ────────────────────────────────────────────────────────────────────
  var ADMIN_EMAIL  = 'prueba@crbox.cr';
  var PORTAL_PAGES = ['dashboard.html', 'mis-paquetes.html', 'mis-facturas.html',
                      'mis-solicitudes.html', 'mi-cuenta.html'];

  var PUBLIC_NAV = [
    { label: 'Servicios',      href: 'servicios.html',      icon: 'fa-concierge-bell' },
    { label: 'Cómo Funciona',  href: 'como-funciona.html',  icon: 'fa-route' },
    { label: 'Tarifas',        href: 'tarifas.html',        icon: 'fa-dollar-sign' },
    { label: 'Calculadora',    href: 'calculadora.html',    icon: 'fa-calculator' },
    { label: 'Cotizar',        href: 'cotizar.html',        icon: 'fa-shopping-cart' },
    { label: 'Contacto',       href: 'contacto.html',       icon: 'fa-envelope' },
  ];

  var PORTAL_NAV = [
    { label: 'Dashboard',      href: 'dashboard.html',       icon: 'fa-tachometer-alt' },
    { label: 'Mis Paquetes',   href: 'mis-paquetes.html',    icon: 'fa-box' },
    { label: 'Mis Facturas',   href: 'mis-facturas.html',    icon: 'fa-file-invoice-dollar' },
    { label: 'Cotizaciones',   href: 'mis-solicitudes.html', icon: 'fa-shopping-bag' },
    { label: 'Mi Cuenta',      href: 'mi-cuenta.html',       icon: 'fa-user-cog' },
  ];

  // ── State ──────────────────────────────────────────────────────────────────────
  var _page      = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0];
  var _wrap      = null;
  var _built     = false;
  var _prevFocus = null;

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function _inPortal() { return PORTAL_PAGES.indexOf(_page) !== -1; }
  function _auth()     { return window.CRBOXAuth || null; }
  function _esc(s)     { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function _link(item) {
    var active = (item.href === _page);
    var cls = 'crbox-drawer-link' + (active ? ' crbox-drawer-link--active' : '');
    return '<a href="' + _esc(item.href) + '" class="' + cls + '"'
      + (active ? ' aria-current="page"' : '')
      + '><i class="fas ' + _esc(item.icon) + '"></i><span>' + _esc(item.label) + '</span></a>';
  }

  // ── Build header (orange) ─────────────────────────────────────────────────────
  function _buildHead() {
    var a = _auth();
    if (a && a.isLoggedIn()) {
      var nameEl = document.getElementById('mobile-user-name');
      var subEl  = document.getElementById('mobile-casillero-badge');
      var name   = (nameEl && nameEl.textContent.trim() && nameEl.textContent.trim() !== 'Cargando...')
                   ? nameEl.textContent.trim() : (a.getEmail ? a.getEmail() : 'Usuario CRBOX');
      var sub    = (subEl && subEl.textContent.trim() && subEl.textContent.trim() !== 'Casillero #—')
                   ? subEl.textContent.trim() : 'Usuario CRBOX';
      return '<div class="crbox-dh">'
        + '<a href="index.html" class="crbox-dh-logo-wrap" tabindex="-1">'
        + '<img src="img/crbox-logo.png" alt="CRBOX" class="crbox-dh-logo"></a>'
        + '<div class="crbox-dh-user">'
        + '<div class="crbox-dh-avatar"><i class="fas fa-user"></i></div>'
        + '<div class="crbox-dh-info">'
        + '<div class="crbox-dh-name" id="crbox-dh-name">' + _esc(name) + '</div>'
        + '<div class="crbox-dh-sub"  id="crbox-dh-sub">'  + _esc(sub)  + '</div>'
        + '</div></div></div>';
    }
    return '<div class="crbox-dh">'
      + '<a href="index.html" class="crbox-dh-logo-wrap" tabindex="-1">'
      + '<img src="img/crbox-logo.png" alt="CRBOX" class="crbox-dh-logo"></a>'
      + '<p class="crbox-dh-tagline">Tu casillero en Miami.<br>Compra en USA, recibí en Costa Rica.</p>'
      + '<div class="crbox-dh-btns">'
      + '<a href="login.html" class="crbox-dh-btn crbox-dh-btn--solid">'
      + '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión</a>'
      + '<a href="afiliate.html" class="crbox-dh-btn crbox-dh-btn--outline">'
      + '<i class="fas fa-user-plus"></i> Afíliate</a>'
      + '</div></div>';
  }

  // ── Build body (nav rows) ─────────────────────────────────────────────────────
  function _buildBody() {
    var a        = _auth();
    var loggedIn = a && a.isLoggedIn();
    var isAdmin  = loggedIn && a.getEmail && a.getEmail() === ADMIN_EMAIL;
    var inPortal = _inPortal();
    var html     = '<div class="crbox-db">';

    if (inPortal) {
      html += '<div class="crbox-db-label">Mi Portal</div>';
      PORTAL_NAV.forEach(function (item) { html += _link(item); });
      if (isAdmin) {
        html += '<button class="crbox-drawer-link" id="crbox-d-admin">'
          + '<i class="fas fa-shield-alt"></i><span>Panel Admin</span></button>';
      }
      html += '<div class="crbox-db-sep" role="separator"></div>';
      html += '<button class="crbox-drawer-link crbox-drawer-link--danger" id="crbox-d-logout">'
        + '<i class="fas fa-sign-out-alt"></i><span>Cerrar Sesión</span></button>';
      html += '<div class="crbox-db-sep" role="separator"></div>';
      html += '<div class="crbox-db-label">Información</div>';
      PUBLIC_NAV.forEach(function (item) { html += _link(item); });
    } else {
      PUBLIC_NAV.forEach(function (item) { html += _link(item); });
      if (loggedIn) {
        html += '<div class="crbox-db-sep" role="separator"></div>';
        if (isAdmin) {
          html += '<button class="crbox-drawer-link" id="crbox-d-admin">'
            + '<i class="fas fa-shield-alt"></i><span>Panel Admin</span></button>';
        } else {
          html += '<div class="crbox-db-dash-cta-wrap">'
            + '<a href="dashboard.html" class="crbox-db-dash-cta">'
            + '<i class="fas fa-tachometer-alt"></i><span>Ir al Dashboard</span></a>'
            + '</div>';
          html += '<button class="crbox-drawer-link crbox-drawer-link--danger" id="crbox-d-logout-public">'
            + '<i class="fas fa-sign-out-alt"></i><span>Cerrar Sesión</span></button>';
        }
      }
    }

    html += '</div>';
    html += '<div class="crbox-df">'
      + '<a href="calculadora.html" class="crbox-df-cta">'
      + '<i class="fas fa-calculator"></i> Calcular Envío</a>'
      + '</div>';
    return html;
  }

  // ── Inject drawer into DOM (once) ─────────────────────────────────────────────
  function _build() {
    if (_built) return;
    _built = true;

    var wrap = document.createElement('div');
    wrap.id        = 'crbox-drawer-wrap';
    wrap.className = 'crbox-drawer-wrap';
    wrap.setAttribute('role',        'dialog');
    wrap.setAttribute('aria-modal',  'true');
    wrap.setAttribute('aria-label',  'Menú de navegación');
    wrap.setAttribute('aria-hidden', 'true');

    wrap.innerHTML =
      '<div class="crbox-drawer-backdrop" id="crbox-d-backdrop"></div>'
      + '<button class="crbox-drawer-x" id="crbox-d-close" aria-label="Cerrar menú">'
      + '<i class="fas fa-times"></i></button>'
      + '<nav class="crbox-drawer-panel" id="crbox-d-panel" tabindex="-1">'
      + _buildHead()
      + _buildBody()
      + '</nav>';

    document.body.appendChild(wrap);
    _wrap = wrap;

    document.getElementById('crbox-d-backdrop').addEventListener('click', _close);
    document.getElementById('crbox-d-close').addEventListener('click', _close);

    wrap.querySelectorAll('a[href]').forEach(function (el) {
      el.addEventListener('click', _close);
    });

    var logoutBtn = wrap.querySelector('#crbox-d-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        _close();
        var real = document.getElementById('mobile-logout-button');
        if (real)                        real.click();
        else if (_auth() && _auth().logout) _auth().logout();
      });
    }

    var logoutPublicBtn = wrap.querySelector('#crbox-d-logout-public');
    if (logoutPublicBtn) {
      logoutPublicBtn.addEventListener('click', function () {
        _close();
        var real = document.getElementById('mobile-logout-button');
        if (real)                        real.click();
        else if (_auth() && _auth().logout) _auth().logout();
      });
    }

    var adminBtn = wrap.querySelector('#crbox-d-admin');
    if (adminBtn) {
      adminBtn.addEventListener('click', function () { _close(); _goAdmin(); });
    }
  }

  function _goAdmin() {
    var a = _auth();
    if (!a) { window.location.href = '/admin/login'; return; }
    var hdr   = a.getAuthHeader && a.getAuthHeader();
    var email = a.getEmail      && a.getEmail();
    if (!hdr || !email) { window.location.href = '/admin/login'; return; }
    fetch('/admin/portal-login', {
      method: 'GET', redirect: 'manual',
      headers: { 'Authorization': hdr, 'X-Casillero-Email': email }
    }).then(function (r) {
      window.location.href = (r.type === 'opaqueredirect' || r.status === 302)
        ? '/admin/solicitudes' : '/admin/login';
    }).catch(function () { window.location.href = '/admin/login'; });
  }

  // ── Refresh dynamic user info on every open ───────────────────────────────────
  function _refreshHead() {
    if (!_wrap) return;
    var a = _auth();
    if (!a || !a.isLoggedIn()) return;
    var nameEl = document.getElementById('mobile-user-name');
    var subEl  = document.getElementById('mobile-casillero-badge');
    var dn = _wrap.querySelector('#crbox-dh-name');
    var ds = _wrap.querySelector('#crbox-dh-sub');
    if (dn && nameEl && nameEl.textContent.trim() && nameEl.textContent.trim() !== 'Cargando...')
      dn.textContent = nameEl.textContent.trim();
    if (ds && subEl && subEl.textContent.trim() && subEl.textContent.trim() !== 'Casillero #—')
      ds.textContent = subEl.textContent.trim();
  }

  // ── Open ──────────────────────────────────────────────────────────────────────
  function _open() {
    _build();
    _prevFocus = document.activeElement;
    _refreshHead();
    _wrap.setAttribute('aria-hidden', 'false');
    _wrap.classList.add('is-open');
    document.body.classList.add('crbox-drawer-open');
    var panel = document.getElementById('crbox-d-panel');
    if (panel) setTimeout(function () { panel.focus({ preventScroll: true }); }, 60);
  }

  // ── Close ─────────────────────────────────────────────────────────────────────
  function _close() {
    if (!_wrap || !_wrap.classList.contains('is-open')) return;
    _wrap.classList.remove('is-open');
    _wrap.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('crbox-drawer-open');
    if (_prevFocus) { try { _prevFocus.focus({ preventScroll: true }); } catch (e) {} }

    var btn = document.getElementById('mobile-menu-button');
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Abrir menú');
      var icon = btn.querySelector('i');
      if (icon) {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
      }
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────────
  window.CRBOXDrawer = {
    open:   _open,
    close:  _close,
    isOpen: function () { return !!(_wrap && _wrap.classList.contains('is-open')); }
  };

  // ── Init on DOMContentLoaded ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('mobile-menu-button');
    if (!btn) return;

    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'crbox-drawer-wrap');
    if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', 'Abrir menú');

    btn.addEventListener('click', function () {
      var icon = btn.querySelector('i');
      if (window.CRBOXDrawer.isOpen()) {
        _close();
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', 'Abrir menú');
        if (icon) { icon.classList.remove('fa-times'); icon.classList.add('fa-bars'); }
      } else {
        _open();
        btn.setAttribute('aria-expanded', 'true');
        btn.setAttribute('aria-label', 'Cerrar menú');
        if (icon) { icon.classList.remove('fa-bars'); icon.classList.add('fa-times'); }
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && window.CRBOXDrawer.isOpen()) {
        _close();
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', 'Abrir menú');
      }
    });
  });

}());
