(function () {
    'use strict';

    var ADMIN_EMAIL = 'prueba@crbox.cr';

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

        var isAdmin = (auth.getEmail() === ADMIN_EMAIL);

        // ── Desktop ───────────────────────────────────────────────────────────
        var userDropdown = document.getElementById('user-dropdown');
        if (userDropdown) {
            // Always hide the "Afíliate Gratis" link next to the dropdown
            var prev = userDropdown.previousElementSibling;
            if (prev && prev.tagName === 'A' && String(prev.getAttribute('href') || '').indexOf('afiliate') !== -1) {
                prev.style.display = 'none';
            }

            if (isAdmin) {
                // Admin: keep the user dropdown intact, inject Panel Admin button after it
                var adminBtn = document.createElement('a');
                adminBtn.href = '#';
                adminBtn.className = 'secondary-btn flex items-center gap-2';
                adminBtn.style.cssText = 'text-decoration:none;margin-left:8px;cursor:pointer;';
                adminBtn.innerHTML = '<i class="fas fa-shield-alt"></i><span>Panel Admin</span>';
                adminBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    _goAdminPortal();
                });
                userDropdown.parentNode.insertBefore(adminBtn, userDropdown.nextSibling);
            } else {
                // Non-admin: replace the dropdown with a Dashboard CTA
                var dashLink = document.createElement('a');
                dashLink.href = 'dashboard.html';
                dashLink.className = 'secondary-btn flex items-center gap-2';
                dashLink.style.textDecoration = 'none';
                dashLink.innerHTML = '<i class="fas fa-tachometer-alt"></i><span>Dashboard</span>';
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
                // Admin: only inject Panel Admin — no Dashboard link
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
            } else {
                // Non-admin: inject Dashboard CTA (existing behaviour)
                if (!calcLink.parentNode.querySelector('a[href="dashboard.html"]')) {
                    var mobileDash = document.createElement('a');
                    mobileDash.href = 'dashboard.html';
                    mobileDash.className = calcLink.className;
                    mobileDash.style.textDecoration = 'none';
                    mobileDash.textContent = 'Dashboard';
                    calcLink.parentNode.appendChild(mobileDash);
                }
            }
        }
    });
}());
