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
            // Hide the "Afíliate Gratis" link that sits immediately before the dropdown
            var prev = userDropdown.previousElementSibling;
            if (prev && prev.tagName === 'A' && String(prev.getAttribute('href') || '').indexOf('afiliate') !== -1) {
                prev.style.display = 'none';
            }

            // Replace the entire user-circle dropdown with a single "Dashboard" CTA
            var dashLink = document.createElement('a');
            dashLink.href = 'dashboard.html';
            dashLink.className = 'secondary-btn flex items-center gap-2';
            dashLink.style.textDecoration = 'none';
            dashLink.innerHTML = '<i class="fas fa-tachometer-alt"></i><span>Dashboard</span>';
            userDropdown.parentNode.replaceChild(dashLink, userDropdown);

            // Inject admin link for prueba@crbox.cr only
            if (isAdmin) {
                var adminLink = document.createElement('a');
                adminLink.href = '#';
                adminLink.className = 'secondary-btn flex items-center gap-2';
                adminLink.style.textDecoration = 'none';
                adminLink.style.marginLeft = '8px';
                adminLink.style.cursor = 'pointer';
                adminLink.innerHTML = '<i class="fas fa-shield-alt"></i><span>Panel Admin</span>';
                adminLink.addEventListener('click', function (e) {
                    e.preventDefault();
                    _goAdminPortal();
                });
                dashLink.parentNode.insertBefore(adminLink, dashLink.nextSibling);
            }
        }

        // ── Mobile menu ───────────────────────────────────────────────────────
        var mobileMenu = document.getElementById('mobile-menu');
        if (!mobileMenu) return;

        // Hide every "Afíliate Gratis" link in the mobile menu
        mobileMenu.querySelectorAll('a[href="afiliate.html"]').forEach(function (el) {
            el.style.display = 'none';
        });

        // Insert a "Dashboard" CTA inside the button group (div with Calcular Envío)
        var calcLink = mobileMenu.querySelector('a[href="calculadora.html"]');
        if (calcLink && calcLink.parentNode && !calcLink.parentNode.querySelector('a[href="dashboard.html"]')) {
            var mobileDash = document.createElement('a');
            mobileDash.href = 'dashboard.html';
            mobileDash.className = calcLink.className;
            mobileDash.style.textDecoration = 'none';
            mobileDash.textContent = 'Dashboard';
            calcLink.parentNode.appendChild(mobileDash);

            // Inject mobile admin link for prueba@crbox.cr only
            if (isAdmin) {
                var mobileAdmin = document.createElement('a');
                mobileAdmin.href = '#';
                mobileAdmin.className = calcLink.className;
                mobileAdmin.style.textDecoration = 'none';
                mobileAdmin.style.cursor = 'pointer';
                mobileAdmin.textContent = 'Panel Admin';
                mobileAdmin.addEventListener('click', function (e) {
                    e.preventDefault();
                    _goAdminPortal();
                });
                calcLink.parentNode.appendChild(mobileAdmin);
            }
        }
    });
}());
