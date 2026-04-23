/**
 * CRBOX — Centralized SEO & Entity Configuration
 *
 * Single source of truth for business entity facts.
 * All values here must match visible content on the site.
 *
 * HOW TO USE
 * ----------
 * 1. Replace gtmId with your real Google Tag Manager container ID.
 * 2. When business facts change (phone, hours, address) update ONLY this file.
 * 3. Update the matching inline JSON-LD blocks in each HTML page to stay in sync.
 * 4. The analytics.js tracker may read CRBOX_CONFIG.tracking for event taxonomy.
 *
 * NOTE: Inline JSON-LD in HTML pages is the active structured data. This file
 * is authoritative documentation for those values, not a runtime JSON-LD emitter.
 */

window.CRBOX_CONFIG = {
    gtmId: 'GTM-XXXXXXX',

    site: {
        name: 'CRBOX',
        domain: 'https://crbox.cr',
        defaultOgImage: 'https://crbox.cr/img/fotoindex.png',
        locale: 'es_CR',
        language: 'es'
    },

    organization: {
        '@type': ['Organization', 'LocalBusiness'],
        name: 'CRBOX',
        url: 'https://crbox.cr/',
        logo: 'https://crbox.cr/img/crbox-logo.png',
        image: 'https://crbox.cr/img/fotoindex.png',
        description: 'Casillero virtual en Miami y servicio de courier para compras en USA con entrega en Costa Rica.',
        telephone: '+506-4000-1114',
        email: {
            sales: 'ventas@crbox.cr',
            support: 'servicioalcliente@crbox.cr'
        },
        address: {
            '@type': 'PostalAddress',
            streetAddress: '50 metros al Oeste del ICE, Edificio Torres del Parque, planta baja, Local #6',
            addressLocality: 'Sabana Norte',
            addressRegion: 'San José',
            addressCountry: 'CR'
        },
        openingHours: [
            { days: ['Monday','Tuesday','Wednesday','Thursday','Friday'], opens: '07:00', closes: '16:30' },
            { days: ['Saturday'], opens: '09:00', closes: '12:30' }
        ],
        sameAs: []
    },

    tracking: {
        eventPrefix: 'crbox_',
        conversionEvents: ['cta_afiliate_click', 'contact_form_submit', 'calculator_result']
    },

    privatePages: [
        '/login.html',
        '/afiliate.html',
        '/dashboard.html',
        '/mis-paquetes.html',
        '/mis-facturas.html',
        '/mi-cuenta.html'
    ],

    publicPages: [
        { path: '/index.html', canonical: 'https://crbox.cr/' },
        { path: '/servicios.html', canonical: 'https://crbox.cr/servicios.html' },
        { path: '/como-funciona.html', canonical: 'https://crbox.cr/como-funciona.html' },
        { path: '/tarifas.html', canonical: 'https://crbox.cr/tarifas.html' },
        { path: '/calculadora.html', canonical: 'https://crbox.cr/calculadora.html' },
        { path: '/contacto.html', canonical: 'https://crbox.cr/contacto.html' }
    ]
};
