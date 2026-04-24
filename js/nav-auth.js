(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        var auth = window.CRBoxAuth;
        if (!auth || !auth.isLoggedIn()) return;

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
        }
    });
}());
