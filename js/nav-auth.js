(function () {
    'use strict';

    var ADMIN_EMAILS = [
        'prueba@crbox.cr',
        'ventas@crbox.cr',
        'compras@crbox.cr',
        'servicioalcliente@crbox.cr',
        'esteban@crbox.cr'
    ];

    // Pages that are inside the authenticated client portal.
    // On these pages a logged-in non-admin user is already in their account
    // context — no "go to Dashboard" CTA should be injected.
    var PORTAL_PAGES = [
        'dashboard.html',
        'mis-paquetes.html',
        'mis-facturas.html',
        'mis-solicitudes.html',
        'mi-cuenta.html'
    ];

    function _isPortalPage() {
        var page = (window.location.pathname.split('/').pop() || '').split('?')[0];
        return PORTAL_PAGES.indexOf(page) !== -1;
    }

    function _goAdminPortal() {
        var auth = window.CRBOXAuth;
        if (!auth) { window.location.href = '/admin/login'; return; }
        var authHeader = auth.getAuthHeader();
        var email      = auth.getEmail();
        if (!authHeader || !email) { window.location.href = '/admin/login'; return; }
        fetch('/admin/portal-login', {
            method:   'GET',
            redirect: 'manual',
            headers: {
                'Authorization':     authHeader,
                'X-Casillero-Email': email
            }
        }).then(function (res) {
            if (res.type === 'opaqueredirect' || res.status === 302) {
                window.location.href = '/admin/solicitudes';
            } else {
                window.location.href = '/admin/login';
            }
        }).catch(function () {
            window.location.href = '/admin/login';
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var auth = window.CRBOXAuth;
        if (!auth || !auth.isLoggedIn()) return;

        var isAdmin  = (ADMIN_EMAILS.indexOf((auth.getEmail() || '').toLowerCase()) !== -1);
        var inPortal = _isPortalPage();

        // ── Desktop ───────────────────────────────────────────────────────────
        var userDropdown = document.getElementById('user-dropdown');
        if (userDropdown) {
            // Always hide the "Afíliate Gratis" link next to the dropdown
            var prev = userDropdown.previousElementSibling;
            if (prev && prev.tagName === 'A' && String(prev.getAttribute('href') || '').indexOf('afiliate') !== -1) {
                prev.style.display = 'none';
            }

            if (isAdmin) {
                // Admin accounts — inject a minimal circle icon button beside the user dropdown.
                var adminBtn = document.createElement('a');
                adminBtn.href = '#';
                adminBtn.title = 'Panel Admin';
                adminBtn.setAttribute('aria-label', 'Panel Admin');
                adminBtn.style.cssText = [
                    'display:inline-flex;align-items:center;justify-content:center;',
                    'width:36px;height:36px;border-radius:50%;',
                    'background:#FF6B00;color:#fff;',
                    'border:none;text-decoration:none;cursor:pointer;',
                    'margin-left:8px;flex-shrink:0;',
                    'box-shadow:0 2px 8px rgba(255,107,0,0.35);',
                    'transition:background 0.18s,box-shadow 0.18s;'
                ].join('');
                adminBtn.innerHTML = '<i class="fas fa-shield-alt" style="font-size:14px;pointer-events:none;"></i>';
                adminBtn.addEventListener('mouseenter', function () {
                    this.style.background = '#E85500';
                    this.style.boxShadow = '0 4px 14px rgba(255,107,0,0.45)';
                });
                adminBtn.addEventListener('mouseleave', function () {
                    this.style.background = '#FF6B00';
                    this.style.boxShadow = '0 2px 8px rgba(255,107,0,0.35)';
                });
                adminBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    _goAdminPortal();
                });
                userDropdown.parentNode.insertBefore(adminBtn, userDropdown.nextSibling);

            } else if (inPortal) {
                // Normal user already inside the portal — keep the existing
                // user-dropdown (name chip + dropdown menu) intact.
                // No redundant "Dashboard" or admin CTA is shown here.

            } else {
                // Normal user on a public page — replace the dropdown with a
                // "Dashboard" link so they can enter the portal easily.
                var dashLink = document.createElement('a');
                dashLink.href = 'dashboard.html';
                dashLink.className = 'secondary-btn flex items-center gap-2';
                dashLink.style.textDecoration = 'none';
                dashLink.innerHTML = '<i class="fas fa-th-large"></i><span>Dashboard</span>';
                userDropdown.parentNode.replaceChild(dashLink, userDropdown);
            }
        }

        // ── Mobile menu ───────────────────────────────────────────────────────
        var mobileMenu = document.getElementById('mobile-menu');
        if (!mobileMenu) return;

        // Always hide "Afíliate Gratis" links in the mobile menu
        mobileMenu.querySelectorAll('a[href="afiliate.html"]').forEach(function (el) {
            el.style.display = 'none';
        });

        var calcLink = mobileMenu.querySelector('a[href="calculadora.html"]');
        if (calcLink && calcLink.parentNode) {
            if (isAdmin) {
                // prueba@crbox.cr — inject Panel Admin link on every page
                if (!calcLink.parentNode.querySelector('.nav-admin-mobile')) {
                    var mobileAdmin = document.createElement('a');
                    mobileAdmin.href = '#';
                    mobileAdmin.className = calcLink.className + ' nav-admin-mobile';
                    mobileAdmin.style.cssText = 'text-decoration:none;cursor:pointer;';
                    mobileAdmin.textContent = 'Panel Admin';
                    mobileAdmin.addEventListener('click', function (e) {
                        e.preventDefault();
                        _goAdminPortal();
                    });
                    calcLink.parentNode.appendChild(mobileAdmin);
                }
            } else if (!inPortal) {
                // Normal user on a public page — inject "Dashboard" link
                if (!calcLink.parentNode.querySelector('a[href="dashboard.html"]')) {
                    var mobileDash = document.createElement('a');
                    mobileDash.href = 'dashboard.html';
                    mobileDash.className = calcLink.className;
                    mobileDash.style.textDecoration = 'none';
                    mobileDash.textContent = 'Dashboard';
                    calcLink.parentNode.appendChild(mobileDash);
                }
            }
            // Normal user already in the portal — no injection needed
        }
    });
}());
