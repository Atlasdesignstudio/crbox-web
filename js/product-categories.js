/**
 * product-categories.js — CRBOX Shared Product Category Data Module
 * Exposes window.PRODUCT_CATEGORIES as the single source of truth for all
 * category data across the public quote page, client portal, and admin tool.
 *
 * ── Official Costa Rica tariff data sources ──────────────────────────────────
 * The authoritative source for import duties and taxes in Costa Rica is:
 *   • Sistema Arancelario Centroamericano (SAC)
 *   • Dirección General de Aduanas (DGA) — https://www.hacienda.go.cr/
 *   • TICA (Tecnología de Información para el Control Aduanero)
 *   • Ministerio de Hacienda — https://www.hacienda.go.cr/contenido/13202-arancel
 *
 * ── Current data status ───────────────────────────────────────────────────────
 * All rates in this file are CRBOX internal reference estimates (source:
 * "local_estimated"). They are composite effective rates that include
 * aranceles + IVA (13%) + selective consumption taxes where applicable,
 * cross-referenced with publicly available Hacienda/DGA category data.
 *
 * These rates are NOT a substitute for official TICA consultation.
 * The data structure is designed to accept official SAC/TICA rates
 * without UI changes — set source to "official_tica" on each entry
 * and populate the rate once the official dataset is integrated.
 *
 * ── Product Brain extension ───────────────────────────────────────────────────
 * window.PRODUCT_BRAIN_CATEGORIES  — 53 enriched spec categories
 * window.PRODUCT_PRODUCTS          — product-level rows for AI/search
 * window.ProductBrainVersion       — version string
 * window.CATEGORY_BY_ID            — index: brainId → category object
 * window.PRODUCT_TO_CATEGORY_INDEX — index: productKey → brainId
 * window.KEYWORD_INDEX             — index: keyword → [brainId, ...]
 * window.RISK_FLAG_INDEX           — index: flag → [brainId, ...]
 *
 * ── Data structure per entry ─────────────────────────────────────────────────
 * {
 *   id:                 string   — same as code, unique key
 *   code:               string   — used by tariff-adapter and calculator engine
 *   name:               string   — human-readable display name (Spanish)
 *   group:              string   — optgroup / category family label
 *   aliases:            string[] — natural-language search terms
 *   dutyRate: null, totalEstimatedRate: number   — composite rate (0–1, e.g. 0.13 = 13%)
 *   source:             string   — "local_estimated" | "official_tica"
 *   requiresPermit:     boolean  — true if item may need special permit/docs
 *   needsReview:        boolean  — true if categorization needs sales review
 * }
 */
(function () {
  'use strict';

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 1 — PRODUCT_CATEGORIES (backward-compatible flat list)
  // Codes consumed by tariff-adapter.js, calculator-engine.js, cotizar.html.
  // DO NOT remove or rename any existing code without updating those consumers.
  // ════════════════════════════════════════════════════════════════════════════

  var CATEGORIES = [

    // ── Electrónica ───────────────────────────────────────────────────────────
    {
      id: 'celulares', code: 'celulares',
      name: 'Celulares y Smartphones',
      group: 'Electrónica',
      aliases: ['celular', 'smartphone', 'teléfono', 'iphone', 'samsung', 'android', 'móvil', 'phone'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'telefonos', code: 'telefonos',
      name: 'Teléfonos',
      group: 'Electrónica',
      aliases: ['teléfono', 'telefono', 'teléfonos fijos', 'teléfono de casa', 'landline', 'inalámbrico'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'computadora', code: 'computadora',
      name: 'Computadoras y Laptops',
      group: 'Electrónica',
      aliases: ['laptop', 'notebook', 'computadora', 'pc', 'macbook', 'computador', 'computadora portátil', 'computer'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'tableta_electronica', code: 'tableta_electronica',
      name: 'Tabletas y iPads',
      group: 'Electrónica',
      aliases: ['tablet', 'tableta', 'ipad', 'kindle', 'surface'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'consola_videojuegos', code: 'consola_videojuegos',
      name: 'Consolas de Videojuegos',
      group: 'Electrónica',
      aliases: ['consola', 'playstation', 'ps5', 'ps4', 'xbox', 'nintendo', 'switch', 'gaming', 'videojuegos'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'camara', code: 'camara',
      name: 'Cámaras y Video',
      group: 'Electrónica',
      aliases: ['cámara', 'camera', 'dslr', 'mirrorless', 'gopro', 'webcam', 'videocámara', 'fotografía'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'auricular_telefono', code: 'auricular_telefono',
      name: 'Audífonos y Accesorios de Audio',
      group: 'Electrónica',
      aliases: ['audífonos', 'auriculares', 'headphones', 'earbuds', 'airpods', 'headset', 'micrófono'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'bocina', code: 'bocina',
      name: 'Bocinas y Equipos de Sonido',
      group: 'Electrónica',
      aliases: ['bocina', 'parlante', 'speaker', 'bose', 'jbl', 'sonido', 'bluetooth speaker'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'televisor', code: 'televisor',
      name: 'Televisores',
      group: 'Electrónica',
      aliases: ['televisor', 'tv', 'smart tv', 'pantalla', 'led', 'oled', 'qled', '4k'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'monitor', code: 'monitor',
      name: 'Monitores de Computadora',
      group: 'Electrónica',
      aliases: ['monitor', 'pantalla pc', 'display', 'monitor gaming', 'monitor 4k'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'procesador', code: 'procesador',
      name: 'Procesadores / CPU',
      group: 'Electrónica',
      aliases: ['procesador', 'cpu', 'intel', 'amd', 'ryzen', 'chip'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'disco_duro', code: 'disco_duro',
      name: 'Discos Duros y SSD',
      group: 'Electrónica',
      aliases: ['disco duro', 'ssd', 'hdd', 'nvme', 'almacenamiento', 'hard drive'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'memoria', code: 'memoria',
      name: 'Memorias RAM y Tarjetas de Memoria',
      group: 'Electrónica',
      aliases: ['memoria', 'ram', 'microsd', 'memoria sd', 'tarjeta de memoria', 'usb', 'flash drive'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'tarjeta_video_sonido', code: 'tarjeta_video_sonido',
      name: 'Tarjetas de Video y Sonido',
      group: 'Electrónica',
      aliases: ['tarjeta de video', 'gpu', 'gráficos', 'nvidia', 'radeon', 'tarjeta de sonido'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'tarjeta_madre', code: 'tarjeta_madre',
      name: 'Tarjeta Madre (Motherboard)',
      group: 'Electrónica',
      aliases: ['tarjeta madre', 'motherboard', 'mainboard', 'placa base'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'teclado_computadora', code: 'teclado_computadora',
      name: 'Teclado de Computadora',
      group: 'Electrónica',
      aliases: ['teclado', 'keyboard', 'mouse', 'teclado mecánico', 'teclado gaming'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'router', code: 'router',
      name: 'Routers y Equipos de Red',
      group: 'Electrónica',
      aliases: ['router', 'wifi', 'internet', 'módem', 'switch red', 'access point', 'red'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'impresora', code: 'impresora',
      name: 'Impresoras y Escáneres',
      group: 'Electrónica',
      aliases: ['impresora', 'printer', 'escáner', 'scanner', 'plotter', 'impresora laser', 'impresora de tinta'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'accesorios_impresora', code: 'accesorios_impresora',
      name: 'Accesorios de Impresora',
      group: 'Electrónica',
      aliases: ['tinta', 'tóner', 'cartucho', 'ink', 'toner', 'accesorios impresora'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'fotocopiadora', code: 'fotocopiadora',
      name: 'Fotocopiadoras',
      group: 'Electrónica',
      aliases: ['fotocopiadora', 'copiadora', 'multifuncional', 'copier'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'cargador', code: 'cargador',
      name: 'Cargadores y Cables',
      group: 'Electrónica',
      aliases: ['cargador', 'charger', 'cable usb', 'cable lightning', 'cable tipo c', 'power bank'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'adaptador', code: 'adaptador',
      name: 'Adaptadores y Conversores',
      group: 'Electrónica',
      aliases: ['adaptador', 'convertidor', 'hub usb', 'adaptador hdmi', 'dongle'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'fuente_poder', code: 'fuente_poder',
      name: 'Fuentes de Poder',
      group: 'Electrónica',
      aliases: ['fuente de poder', 'psu', 'power supply', 'ups', 'regulador'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'case_cpu', code: 'case_cpu',
      name: 'Cases / Gabinetes de PC',
      group: 'Electrónica',
      aliases: ['case', 'gabinete', 'chasis', 'torre pc', 'tower case'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'ventiladores_computadora', code: 'ventiladores_computadora',
      name: 'Ventiladores y Cooling para PC',
      group: 'Electrónica',
      aliases: ['fan', 'ventilador pc', 'cooling', 'cooler', 'disipador', 'water cooling'],
      dutyRate: null, totalEstimatedRate: 0.2430, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'control_remoto', code: 'control_remoto',
      name: 'Controles Remotos',
      group: 'Electrónica',
      aliases: ['control remoto', 'remote', 'mando', 'joystick', 'gamepad'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'antena', code: 'antena',
      name: 'Antenas',
      group: 'Electrónica',
      aliases: ['antena', 'antenna', 'antena tv', 'antena wifi'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'radio_comunicacion', code: 'radio_comunicacion',
      name: 'Radio de Comunicación',
      group: 'Electrónica',
      aliases: ['radio', 'walkie talkie', 'radio comunicación', 'intercomunicador', 'handy'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'llave_maya', code: 'llave_maya',
      name: 'Llaves Maya / Electrónicas',
      group: 'Electrónica',
      aliases: ['llave maya', 'key fob', 'llave electrónica', 'llave de carro'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'software', code: 'software',
      name: 'Software / Programas',
      group: 'Electrónica',
      aliases: ['software', 'programa', 'licencia', 'antivirus', 'windows', 'office'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'calculadora', code: 'calculadora',
      name: 'Calculadoras',
      group: 'Electrónica',
      aliases: ['calculadora', 'calculator', 'calculadora científica', 'calculadora gráfica'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'equipo_sonido', code: 'equipo_sonido',
      name: 'Equipo de Sonido',
      group: 'Electrónica',
      aliases: ['equipo de sonido', 'sistema de sonido', 'stereo', 'componente', 'mini componente'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'equipo_karaoke', code: 'equipo_karaoke',
      name: 'Equipo de Karaoke',
      group: 'Electrónica',
      aliases: ['karaoke', 'equipo karaoke', 'micrófono karaoke'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'home_teather', code: 'home_teather',
      name: 'Home Theater',
      group: 'Electrónica',
      aliases: ['home theater', 'cine en casa', 'soundbar', 'barra de sonido', 'surround'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'amplificador', code: 'amplificador',
      name: 'Amplificadores de Audio',
      group: 'Electrónica',
      aliases: ['amplificador', 'amplifier', 'amp', 'pre-amplificador'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'amplificador_grabador', code: 'amplificador_grabador',
      name: 'Amplificador / Grabador',
      group: 'Electrónica',
      aliases: ['amplificador grabador', 'grabadora', 'recorder', 'grabador de voz'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'parlantes', code: 'parlantes',
      name: 'Parlantes / Altavoces',
      group: 'Electrónica',
      aliases: ['parlantes', 'altavoces', 'subwoofer', 'woofer', 'tweeter'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'ipod_mp3_mp4', code: 'ipod_mp3_mp4',
      name: 'iPod / MP3 / MP4',
      group: 'Electrónica',
      aliases: ['ipod', 'mp3', 'mp4', 'reproductor de música', 'music player'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'diskman_walkman', code: 'diskman_walkman',
      name: 'Discman / Walkman',
      group: 'Electrónica',
      aliases: ['discman', 'walkman', 'cd player portátil'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'lector_dvd_cd', code: 'lector_dvd_cd',
      name: 'Reproductores DVD/CD',
      group: 'Electrónica',
      aliases: ['dvd player', 'cd player', 'lector dvd', 'reproductor dvd'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'reproductor_bluray', code: 'reproductor_bluray',
      name: 'Reproductores Blu-ray',
      group: 'Electrónica',
      aliases: ['blu-ray', 'bluray', 'blu ray player', 'reproductor blu-ray'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'proyector_video', code: 'proyector_video',
      name: 'Proyectores de Video',
      group: 'Electrónica',
      aliases: ['proyector', 'projector', 'beamer', 'proyector led', 'proyector 4k'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'video_monitor', code: 'video_monitor',
      name: 'Monitor de Video / Vigilancia',
      group: 'Electrónica',
      aliases: ['monitor de video', 'cámara de seguridad', 'dvr', 'nvr', 'cctv', 'vigilancia'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'cds', code: 'cds',
      name: 'Libros, CDs y Medios Físicos',
      group: 'Electrónica',
      aliases: ['cd', 'dvd', 'disco', 'media', 'musica física', 'películas fisicas'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'dvds', code: 'dvds',
      name: 'DVDs',
      group: 'Electrónica',
      aliases: ['dvd', 'dvds', 'disco dvd', 'pelicula dvd'],
      dutyRate: null, totalEstimatedRate: 0.2430, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'quemador_cd_dvd', code: 'quemador_cd_dvd',
      name: 'Quemadoras CD/DVD',
      group: 'Electrónica',
      aliases: ['quemadora', 'grabadora cd', 'grabadora dvd', 'optical drive'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'electr_otro', code: 'electr_otro',
      name: 'Otro — Electrónica',
      group: 'Electrónica',
      aliases: ['otro electrónica', 'electrónica no listada'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: true,
    },

    // ── Ropa y Accesorios ─────────────────────────────────────────────────────
    {
      id: 'ropa', code: 'ropa',
      name: 'Ropa y Calzado',
      group: 'Ropa y Accesorios',
      aliases: ['ropa', 'clothes', 'clothing', 'calzado', 'zapatos', 'vestimenta', 'camisa', 'pantalón', 'vestido'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'zapatos', code: 'zapatos',
      name: 'Zapatos',
      group: 'Ropa y Accesorios',
      aliases: ['zapatos', 'shoes', 'tenis', 'sneakers', 'botas', 'sandalias', 'zapatillas'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'anteojos', code: 'anteojos',
      name: 'Anteojos y Gafas',
      group: 'Ropa y Accesorios',
      aliases: ['anteojos', 'gafas', 'lentes', 'sunglasses', 'lentes de sol', 'espejuelos'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'cinturon', code: 'cinturon',
      name: 'Cinturones y Bolsos',
      group: 'Ropa y Accesorios',
      aliases: ['cinturón', 'belt', 'bolso', 'bag', 'cartera', 'correa'],
      dutyRate: null, totalEstimatedRate: 0.4278, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'maletines_bolsos', code: 'maletines_bolsos',
      name: 'Maletines y Bolsos',
      group: 'Ropa y Accesorios',
      aliases: ['maletin', 'bolso', 'mochila', 'backpack', 'purse', 'handbag', 'tote'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'gorras', code: 'gorras',
      name: 'Gorras y Sombreros',
      group: 'Ropa y Accesorios',
      aliases: ['gorra', 'sombrero', 'hat', 'cap', 'beanie', 'cachorra'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'joyeria_bisuteria', code: 'joyeria_bisuteria',
      name: 'Joyería y Bisutería',
      group: 'Ropa y Accesorios',
      aliases: ['joyería', 'bisutería', 'collar', 'pulsera', 'anillo', 'aretes', 'jewelry', 'oro', 'plata'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'relojes', code: 'relojes',
      name: 'Relojes',
      group: 'Ropa y Accesorios',
      aliases: ['reloj', 'watch', 'smartwatch', 'apple watch', 'reloj deportivo'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'pelucas', code: 'pelucas',
      name: 'Pelucas y Extensiones',
      group: 'Ropa y Accesorios',
      aliases: ['peluca', 'wig', 'extensiones de cabello', 'hair extensions'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'ropa_otro', code: 'ropa_otro',
      name: 'Otro — Ropa y Accesorios',
      group: 'Ropa y Accesorios',
      aliases: ['otro ropa', 'accesorio no listado'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: true,
    },

    // ── Hogar y Jardín ────────────────────────────────────────────────────────
    {
      id: 'electrodomesticos', code: 'electrodomesticos',
      name: 'Electrodomésticos',
      group: 'Hogar y Jardín',
      aliases: ['electrodoméstico', 'appliance', 'lavadora', 'secadora', 'lavavajillas', 'microondas', 'horno'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'refrigerador', code: 'refrigerador',
      name: 'Refrigeradoras y Congeladores',
      group: 'Hogar y Jardín',
      aliases: ['refrigerador', 'refrigeradora', 'nevera', 'frigorífico', 'congelador', 'fridge'],
      dutyRate: null, totalEstimatedRate: 0.68, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'aspiradora', code: 'aspiradora',
      name: 'Aspiradoras y Limpieza',
      group: 'Hogar y Jardín',
      aliases: ['aspiradora', 'vacuum', 'robot aspiradora', 'roomba', 'mopa eléctrica'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'colchon', code: 'colchon',
      name: 'Colchones',
      group: 'Hogar y Jardín',
      aliases: ['colchón', 'mattress', 'colchoneta', 'colchón memory foam'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'muebles', code: 'muebles',
      name: 'Muebles y Decoración',
      group: 'Hogar y Jardín',
      aliases: ['mueble', 'furniture', 'silla', 'mesa', 'sofá', 'escritorio', 'estante', 'sillón'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'herramientas', code: 'herramientas',
      name: 'Herramientas',
      group: 'Hogar y Jardín',
      aliases: ['herramienta', 'tool', 'taladro', 'sierra', 'martillo', 'destornillador', 'llave', 'tools'],
      dutyRate: null, totalEstimatedRate: 0.2430, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'lampara', code: 'lampara',
      name: 'Lámparas y Luces',
      group: 'Hogar y Jardín',
      aliases: ['lámpara', 'luz', 'light', 'foco', 'iluminación', 'led strip', 'tira led'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'alfombra', code: 'alfombra',
      name: 'Alfombras y Tapetes',
      group: 'Hogar y Jardín',
      aliases: ['alfombra', 'tapete', 'rug', 'carpet', 'tapiz'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'sabanas', code: 'sabanas',
      name: 'Sábanas y Ropa de Cama',
      group: 'Hogar y Jardín',
      aliases: ['sábana', 'ropa de cama', 'almohada', 'cobija', 'edredón', 'bedding', 'pillow'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'ollas_sartenes', code: 'ollas_sartenes',
      name: 'Ollas, Sartenes y Utensilios de Cocina',
      group: 'Hogar y Jardín',
      aliases: ['olla', 'sartén', 'cookware', 'utensilio de cocina', 'cuchillos', 'batería de cocina'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'platos_ceramica', code: 'platos_ceramica',
      name: 'Platos y Cerámica',
      group: 'Hogar y Jardín',
      aliases: ['plato', 'cerámica', 'vajilla', 'taza', 'bowl', 'porcelana', 'dishes'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'vaso_vidrio', code: 'vaso_vidrio',
      name: 'Vasos y Cristalería',
      group: 'Hogar y Jardín',
      aliases: ['vaso', 'copa', 'cristalería', 'glassware', 'jarra', 'tarro'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'griferia', code: 'griferia',
      name: 'Grifería y Plomería',
      group: 'Hogar y Jardín',
      aliases: ['grifo', 'llave de agua', 'plomería', 'ducha', 'faucet', 'tubo', 'plumbing'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'manguera', code: 'manguera',
      name: 'Mangueras y Jardinería',
      group: 'Hogar y Jardín',
      aliases: ['manguera', 'hose', 'jardinería', 'jardín', 'regadera', 'garden'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'cables_electricos', code: 'cables_electricos',
      name: 'Cables Eléctricos',
      group: 'Hogar y Jardín',
      aliases: ['cable eléctrico', 'alambre', 'extensión eléctrica', 'multitoma', 'regleta'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'bombillos', code: 'bombillos',
      name: 'Bombillos y Focos',
      group: 'Hogar y Jardín',
      aliases: ['bombillo', 'foco', 'led', 'bulb', 'luz led', 'fluorescente'],
      dutyRate: null, totalEstimatedRate: 0.1978, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'fluorescente', code: 'fluorescente',
      name: 'Tubos Fluorescentes',
      group: 'Hogar y Jardín',
      aliases: ['fluorescente', 'tubo de luz', 'lámpara fluorescente'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'plancha_pelo', code: 'plancha_pelo',
      name: 'Planchas de Pelo',
      group: 'Hogar y Jardín',
      aliases: ['plancha de pelo', 'plancha alisadora', 'flat iron', 'rizador', 'curling iron'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'secadoras_pelo', code: 'secadoras_pelo',
      name: 'Secadoras de Pelo',
      group: 'Hogar y Jardín',
      aliases: ['secadora de pelo', 'hair dryer', 'secador', 'blow dryer'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'rasuradora_electrica', code: 'rasuradora_electrica',
      name: 'Rasuradoras Eléctricas',
      group: 'Hogar y Jardín',
      aliases: ['rasuradora', 'afeitadora', 'rasurador', 'electric shaver', 'cortadora de barba', 'trimmer'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'mixer', code: 'mixer',
      name: 'Batidoras y Licuadoras',
      group: 'Hogar y Jardín',
      aliases: ['batidora', 'licuadora', 'mixer', 'blender', 'procesadora', 'kitchen aid'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'filtro_agua', code: 'filtro_agua',
      name: 'Filtros de Agua',
      group: 'Hogar y Jardín',
      aliases: ['filtro de agua', 'purificador de agua', 'water filter', 'osmosis inversa'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'adornos', code: 'adornos',
      name: 'Adornos y Decoración',
      group: 'Hogar y Jardín',
      aliases: ['adorno', 'decoración', 'decoration', 'figura', 'cuadro', 'ornamento'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'articulos_fiesta', code: 'articulos_fiesta',
      name: 'Artículos de Fiesta',
      group: 'Hogar y Jardín',
      aliases: ['artículos de fiesta', 'decoración fiesta', 'party supplies', 'globos', 'piñata'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'panos', code: 'panos',
      name: 'Paños y Telas',
      group: 'Hogar y Jardín',
      aliases: ['paño', 'tela', 'trapo', 'toalla', 'cloth', 'fabric', 'towel'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'papel', code: 'papel',
      name: 'Papel y Artículos de Oficina',
      group: 'Hogar y Jardín',
      aliases: ['papel', 'papelería', 'stationery', 'cuaderno', 'resma', 'cartulina'],
      dutyRate: null, totalEstimatedRate: 0.2430, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'posters', code: 'posters',
      name: 'Posters y Arte',
      group: 'Hogar y Jardín',
      aliases: ['poster', 'posters', 'arte', 'impresión', 'print', 'lienzo', 'canvas art'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'maquina_coser_soldar', code: 'maquina_coser_soldar',
      name: 'Máquinas de Coser / Soldar',
      group: 'Hogar y Jardín',
      aliases: ['máquina de coser', 'sewing machine', 'soldadora', 'welder', 'máquina de soldar'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'romana', code: 'romana',
      name: 'Básculas y Romanas',
      group: 'Hogar y Jardín',
      aliases: ['báscula', 'romana', 'balanza', 'scale', 'peso', 'pesa'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'microscopio', code: 'microscopio',
      name: 'Microscopios y Lupas',
      group: 'Hogar y Jardín',
      aliases: ['microscopio', 'lupa', 'microscope', 'lente de aumento'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'hogar_otro', code: 'hogar_otro',
      name: 'Otro — Hogar y Jardín',
      group: 'Hogar y Jardín',
      aliases: ['otro hogar', 'artículo hogar no listado'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: true,
    },

    // ── Deportes y Recreación ─────────────────────────────────────────────────
    {
      id: 'bicicleta_economica', code: 'bicicleta_economica',
      name: 'Bicicleta Estándar',
      group: 'Deportes y Recreación',
      aliases: ['bicicleta', 'bike', 'bicycle', 'bici', 'bicicleta barata', 'bicicleta económica'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'bicicleta_cara', code: 'bicicleta_cara',
      name: 'Bicicleta Premium',
      group: 'Deportes y Recreación',
      aliases: ['bicicleta de montaña', 'mountain bike', 'bicicleta de ruta', 'road bike', 'bicicleta eléctrica', 'bicicleta cara'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'bola', code: 'bola',
      name: 'Artículos Deportivos',
      group: 'Deportes y Recreación',
      aliases: ['pelota', 'balón', 'bola', 'ball', 'deporte', 'equipo deportivo', 'football', 'soccer', 'basketball', 'volleyball'],
      dutyRate: null, totalEstimatedRate: 0.2430, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'raqueta', code: 'raqueta',
      name: 'Raquetas',
      group: 'Deportes y Recreación',
      aliases: ['raqueta', 'racket', 'tenis', 'badminton', 'pickleball', 'raquetbol'],
      dutyRate: null, totalEstimatedRate: 0.2430, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'patines', code: 'patines',
      name: 'Patines y Monopatín',
      group: 'Deportes y Recreación',
      aliases: ['patines', 'skates', 'monopatín', 'skateboard', 'roller skates', 'patineta'],
      dutyRate: null, totalEstimatedRate: 0.2430, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'tabla_surf', code: 'tabla_surf',
      name: 'Tablas de Surf y Acuáticos',
      group: 'Deportes y Recreación',
      aliases: ['tabla de surf', 'surfboard', 'sup', 'wakeboard', 'tabla de paddle', 'acuático'],
      dutyRate: null, totalEstimatedRate: 0.2430, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'palos_golf', code: 'palos_golf',
      name: 'Palos de Golf',
      group: 'Deportes y Recreación',
      aliases: ['palos de golf', 'golf club', 'golf', 'set de golf', 'driver golf'],
      dutyRate: null, totalEstimatedRate: 0.2430, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'cana_pescar', code: 'cana_pescar',
      name: 'Cañas de Pescar y Pesca',
      group: 'Deportes y Recreación',
      aliases: ['caña de pescar', 'fishing rod', 'pesca', 'carrete de pesca', 'anzuelo', 'fishing'],
      dutyRate: null, totalEstimatedRate: 0.2430, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'aros_bicicleta', code: 'aros_bicicleta',
      name: 'Aros y Partes de Bicicleta',
      group: 'Deportes y Recreación',
      aliases: ['aro de bicicleta', 'rueda de bicicleta', 'llanta bicicleta', 'bike wheel', 'frenos bicicleta'],
      dutyRate: null, totalEstimatedRate: 0.2430, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'sleeping_bag', code: 'sleeping_bag',
      name: 'Sacos de Dormir y Camping',
      group: 'Deportes y Recreación',
      aliases: ['saco de dormir', 'sleeping bag', 'camping', 'bolsa de dormir', 'camping gear'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'tienda_campana', code: 'tienda_campana',
      name: 'Tiendas de Campaña',
      group: 'Deportes y Recreación',
      aliases: ['tienda de campaña', 'carpa', 'tent', 'camping tent', 'toldo campaña'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'sombrilla', code: 'sombrilla',
      name: 'Sombrillas y Paraguas',
      group: 'Deportes y Recreación',
      aliases: ['sombrilla', 'paraguas', 'umbrella', 'parasol'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'tripode', code: 'tripode',
      name: 'Trípodes y Accesorios Fotográficos',
      group: 'Deportes y Recreación',
      aliases: ['trípode', 'tripod', 'monopie', 'gimbal', 'estabilizador', 'soporte cámara'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'sombrilla_fotografia', code: 'sombrilla_fotografia',
      name: 'Sombrillas de Fotografía',
      group: 'Deportes y Recreación',
      aliases: ['sombrilla fotografía', 'softbox', 'luz estudio', 'studio light', 'reflector foto'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'lente_camara', code: 'lente_camara',
      name: 'Lentes de Cámara',
      group: 'Deportes y Recreación',
      aliases: ['lente', 'objetivo', 'lens', 'lente 50mm', 'lente zoom', 'lente gran angular'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'binoculares', code: 'binoculares',
      name: 'Binoculares y Telescopios',
      group: 'Deportes y Recreación',
      aliases: ['binoculares', 'prismáticos', 'telescopio', 'binoculars', 'telescope'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'deporte_otro', code: 'deporte_otro',
      name: 'Otro — Deportes y Recreación',
      group: 'Deportes y Recreación',
      aliases: ['otro deportes', 'artículo deportivo no listado'],
      dutyRate: null, totalEstimatedRate: 0.2430, source: 'local_estimated', requiresPermit: false, needsReview: true,
    },

    // ── Bebé y Niños ──────────────────────────────────────────────────────────
    {
      id: 'coche_bebe', code: 'coche_bebe',
      name: 'Coches de Bebé y Accesorios',
      group: 'Bebé y Niños',
      aliases: ['coche de bebé', 'carreola', 'stroller', 'pram', 'carriola', 'accesorios bebé'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'juguetes', code: 'juguetes',
      name: 'Juguetes',
      group: 'Bebé y Niños',
      aliases: ['juguete', 'toy', 'lego', 'muñeca', 'peluche', 'juego infantil', 'toys', 'hot wheels'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'silla_bebe_carro', code: 'silla_bebe_carro',
      name: 'Silla de Bebé para Carro',
      group: 'Bebé y Niños',
      aliases: ['silla de bebé', 'silla de carro bebé', 'car seat', 'sillita', 'asiento infantil'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'juego_mesa', code: 'juego_mesa',
      name: 'Juegos de Mesa',
      group: 'Bebé y Niños',
      aliases: ['juego de mesa', 'board game', 'rompecabezas', 'puzzle', 'monopoly', 'ajedrez'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'bebe_otro', code: 'bebe_otro',
      name: 'Otro — Bebé y Niños',
      group: 'Bebé y Niños',
      aliases: ['otro bebé', 'artículo niños no listado', 'otro niños'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: true,
    },

    // ── Repuestos de Vehículos ────────────────────────────────────────────────
    {
      id: 'vehiculos', code: 'vehiculos',
      name: 'Repuestos de Vehículos — General',
      group: 'Repuestos de Vehículos',
      aliases: ['repuestos', 'autopartes', 'repuestos de carro', 'car parts', 'refacciones', 'vehículo'],
      dutyRate: null, totalEstimatedRate: 0.43, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'amortiguadores', code: 'amortiguadores',
      name: 'Amortiguadores',
      group: 'Repuestos de Vehículos',
      aliases: ['amortiguador', 'shock absorber', 'muelle', 'resorte'],
      dutyRate: null, totalEstimatedRate: 0.4278, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'aros_carro_moto', code: 'aros_carro_moto',
      name: 'Aros de Carro/Moto',
      group: 'Repuestos de Vehículos',
      aliases: ['aro', 'llanta', 'rueda', 'rim', 'wheel', 'rin', 'aro de moto', 'aro de carro'],
      dutyRate: null, totalEstimatedRate: 0.4278, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'partes_carroceria', code: 'partes_carroceria',
      name: 'Partes de Carrocería',
      group: 'Repuestos de Vehículos',
      aliases: ['carrocería', 'body parts', 'guardafango', 'capó', 'bumper', 'cofre', 'panel'],
      dutyRate: null, totalEstimatedRate: 0.4278, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'suspension_carro', code: 'suspension_carro',
      name: 'Suspensión de Carro',
      group: 'Repuestos de Vehículos',
      aliases: ['suspensión', 'suspension', 'rotula', 'barra estabilizadora', 'brazo suspensión'],
      dutyRate: null, totalEstimatedRate: 0.4278, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'suspension_moto', code: 'suspension_moto',
      name: 'Suspensión de Moto',
      group: 'Repuestos de Vehículos',
      aliases: ['suspensión moto', 'horquilla moto', 'amortiguador moto', 'moto suspension'],
      dutyRate: null, totalEstimatedRate: 0.4278, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'bujias', code: 'bujias',
      name: 'Bujías',
      group: 'Repuestos de Vehículos',
      aliases: ['bujía', 'spark plug', 'bujía carro', 'bujía moto'],
      dutyRate: null, totalEstimatedRate: 0.4278, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'cluth', code: 'cluth',
      name: 'Clutch / Embrague',
      group: 'Repuestos de Vehículos',
      aliases: ['clutch', 'embrague', 'disco de clutch', 'kit de clutch'],
      dutyRate: null, totalEstimatedRate: 0.4278, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'molduras_vehiculo', code: 'molduras_vehiculo',
      name: 'Molduras de Vehículo',
      group: 'Repuestos de Vehículos',
      aliases: ['moldura', 'trim', 'moldura de carro', 'deflector'],
      dutyRate: null, totalEstimatedRate: 0.4278, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'mufla', code: 'mufla',
      name: 'Muflas / Escapes',
      group: 'Repuestos de Vehículos',
      aliases: ['mufla', 'escape', 'tubo de escape', 'muffler', 'silenciador', 'catalizador'],
      dutyRate: null, totalEstimatedRate: 0.4278, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'radiador', code: 'radiador',
      name: 'Radiadores',
      group: 'Repuestos de Vehículos',
      aliases: ['radiador', 'radiator', 'enfriador', 'intercooler', 'anticongelante'],
      dutyRate: null, totalEstimatedRate: 0.4278, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'filtro_aceite_aire', code: 'filtro_aceite_aire',
      name: 'Filtros de Aceite y Aire',
      group: 'Repuestos de Vehículos',
      aliases: ['filtro de aceite', 'filtro de aire', 'oil filter', 'air filter', 'filtro combustible'],
      dutyRate: null, totalEstimatedRate: 0.2430, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'llantas_vehiculo', code: 'llantas_vehiculo',
      name: 'Llantas y Neumáticos',
      group: 'Repuestos de Vehículos',
      aliases: ['llanta', 'neumático', 'tire', 'goma', 'caucho'],
      dutyRate: null, totalEstimatedRate: 0.2430, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'luces_carro', code: 'luces_carro',
      name: 'Luces de Carro',
      group: 'Repuestos de Vehículos',
      aliases: ['luces de carro', 'faros', 'focos de carro', 'led carro', 'luz trasera', 'headlights'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'retrovisor', code: 'retrovisor',
      name: 'Retrovisores',
      group: 'Repuestos de Vehículos',
      aliases: ['retrovisor', 'espejo de carro', 'mirror car', 'espejo lateral'],
      dutyRate: null, totalEstimatedRate: 0.1978, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'parabrisas', code: 'parabrisas',
      name: 'Parabrisas',
      group: 'Repuestos de Vehículos',
      aliases: ['parabrisas', 'windshield', 'vidrio de carro', 'glass car'],
      dutyRate: null, totalEstimatedRate: 0.1978, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'rack_carro', code: 'rack_carro',
      name: 'Rack para Carro',
      group: 'Repuestos de Vehículos',
      aliases: ['rack', 'portabicicletas', 'roof rack', 'portaequipaje', 'car rack'],
      dutyRate: null, totalEstimatedRate: 0.4878, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'arrancador', code: 'arrancador',
      name: 'Arrancadores',
      group: 'Repuestos de Vehículos',
      aliases: ['arrancador', 'motor de arranque', 'starter', 'alternador'],
      dutyRate: null, totalEstimatedRate: 0.4278, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'pinon', code: 'pinon',
      name: 'Piñones y Transmisión',
      group: 'Repuestos de Vehículos',
      aliases: ['piñón', 'transmisión', 'engranaje', 'gear', 'sprocket'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'valvulas', code: 'valvulas',
      name: 'Válvulas',
      group: 'Repuestos de Vehículos',
      aliases: ['válvula', 'valve', 'válvula de motor', 'válvula neumática'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'baterias', code: 'baterias',
      name: 'Baterías de Carro',
      group: 'Repuestos de Vehículos',
      aliases: ['batería de carro', 'batería', 'acumulador', 'car battery', 'batería auto'],
      dutyRate: null, totalEstimatedRate: 0.4238, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'bomba_aceite_agua', code: 'bomba_aceite_agua',
      name: 'Bombas de Aceite/Agua',
      group: 'Repuestos de Vehículos',
      aliases: ['bomba de aceite', 'bomba de agua', 'water pump', 'oil pump'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'gata_hidraulica', code: 'gata_hidraulica',
      name: 'Gatas Hidráulicas',
      group: 'Repuestos de Vehículos',
      aliases: ['gata hidráulica', 'jack', 'gato hidráulico', 'floor jack', 'elevador de carro'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'alarma', code: 'alarma',
      name: 'Alarmas de Vehículo',
      group: 'Repuestos de Vehículos',
      aliases: ['alarma', 'alarma de carro', 'car alarm', 'sistema de seguridad carro'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'radio_carro', code: 'radio_carro',
      name: 'Radio de Carro',
      group: 'Repuestos de Vehículos',
      aliases: ['radio de carro', 'estéreo de carro', 'car stereo', 'autoradio', 'pantalla de carro'],
      dutyRate: null, totalEstimatedRate: 0.4927, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'casco_seguridad', code: 'casco_seguridad',
      name: 'Cascos de Seguridad',
      group: 'Repuestos de Vehículos',
      aliases: ['casco', 'helmet', 'casco de moto', 'casco de bicicleta', 'casco de seguridad'],
      dutyRate: null, totalEstimatedRate: 0.29, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'repuestos_vehiculo', code: 'repuestos_vehiculo',
      name: 'Repuestos de Vehículo — Otros',
      group: 'Repuestos de Vehículos',
      aliases: ['repuesto vehiculo', 'pieza de carro', 'auto parts', 'car part', 'moto part'],
      dutyRate: null, totalEstimatedRate: 0.43, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'vehic_otro', code: 'vehic_otro',
      name: 'Otro — Vehículos',
      group: 'Repuestos de Vehículos',
      aliases: ['otro vehículos', 'repuesto no listado', 'otro carro'],
      dutyRate: null, totalEstimatedRate: 0.43, source: 'local_estimated', requiresPermit: false, needsReview: true,
    },

    // ── Salud y Belleza ───────────────────────────────────────────────────────
    {
      id: 'salud_belleza', code: 'salud_belleza',
      name: 'Salud y Belleza',
      group: 'Salud y Belleza',
      aliases: ['salud', 'belleza', 'cosméticos', 'maquillaje', 'perfume', 'crema', 'skincare', 'beauty', 'makeup'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'suplementos', code: 'suplementos',
      name: 'Suplementos Alimenticios',
      group: 'Salud y Belleza',
      aliases: ['suplemento', 'proteína', 'vitamina', 'supplement', 'protein powder', 'whey', 'creatina', 'omega 3'],
      dutyRate: null, totalEstimatedRate: 0.13, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'lente_contacto', code: 'lente_contacto',
      name: 'Lentes de Contacto',
      group: 'Salud y Belleza',
      aliases: ['lente de contacto', 'contact lens', 'lentillas', 'lentes correctivos'],
      dutyRate: null, totalEstimatedRate: 0.1978, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },

    // ── Libros y Medios ───────────────────────────────────────────────────────
    {
      id: 'libros', code: 'libros',
      name: 'Libros',
      group: 'Libros y Medios',
      aliases: ['libro', 'book', 'books', 'textbook', 'novela', 'revista', 'manual', 'ebook'],
      dutyRate: null, totalEstimatedRate: 0.01, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },

    // ── Música e Instrumentos ─────────────────────────────────────────────────
    {
      id: 'guitarra_acustica', code: 'guitarra_acustica',
      name: 'Guitarra Acústica',
      group: 'Música e Instrumentos',
      aliases: ['guitarra acústica', 'guitarra', 'acoustic guitar', 'guitar'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'guitarra_electrica', code: 'guitarra_electrica',
      name: 'Guitarra Eléctrica',
      group: 'Música e Instrumentos',
      aliases: ['guitarra eléctrica', 'electric guitar', 'bajo eléctrico', 'bass guitar'],
      dutyRate: null, totalEstimatedRate: 0.2430, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'teclado_musical', code: 'teclado_musical',
      name: 'Teclado Musical / Piano',
      group: 'Música e Instrumentos',
      aliases: ['teclado musical', 'piano', 'keyboard musical', 'piano eléctrico', 'sintetizador'],
      dutyRate: null, totalEstimatedRate: 0.2430, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'instrumentos_musicales', code: 'instrumentos_musicales',
      name: 'Instrumentos Musicales',
      group: 'Música e Instrumentos',
      aliases: ['instrumento musical', 'batería', 'drums', 'flauta', 'violín', 'trompeta', 'saxofón', 'music instrument'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },

    // ── Videojuegos ───────────────────────────────────────────────────────────
    {
      id: 'video_juegos', code: 'video_juegos',
      name: 'Videojuegos (Juegos)',
      group: 'Videojuegos y Entretenimiento',
      aliases: ['videojuego', 'juego', 'game', 'ps5 game', 'xbox game', 'nintendo switch game', 'pc game'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },

    // ── Nuevos códigos Product Brain (solo tariff-lookup, sin UI existente) ──
    // Estos códigos son usados por PRODUCT_BRAIN_CATEGORIES. Se agregan aquí
    // para que tariff-adapter.js pueda resolver tasas si son enviadas al calc.
    {
      id: 'storage_memory', code: 'storage_memory',
      name: 'Almacenamiento y Memoria',
      group: 'Electrónica',
      aliases: ['ssd externo', 'microsd', 'usb', 'pendrive', 'memoria'],
      dutyRate: null, totalEstimatedRate: 0.14, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'computer_accessories', code: 'computer_accessories',
      name: 'Accesorios de Computadora',
      group: 'Electrónica',
      aliases: ['teclado', 'mouse', 'webcam', 'hub', 'docking'],
      dutyRate: null, totalEstimatedRate: 0.1413, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'lithium_batteries', code: 'lithium_batteries',
      name: 'Baterías de Litio y Power Banks',
      group: 'Especial',
      aliases: ['power bank', 'batería externa', 'litio', 'jump starter'],
      dutyRate: null, totalEstimatedRate: null, source: 'local_estimated', requiresPermit: true, needsReview: true,
    },
    {
      id: 'regulated_telecom', code: 'regulated_telecom',
      name: 'Equipos de Telecomunicación',
      group: 'Regulado',
      aliases: ['walkie talkie', 'satelital', 'radio uhf', 'antena especializada'],
      dutyRate: null, totalEstimatedRate: null, source: 'local_estimated', requiresPermit: true, needsReview: true,
    },
    {
      id: 'microphones_audio', code: 'microphones_audio',
      name: 'Micrófonos y Audio Profesional',
      group: 'Electrónica',
      aliases: ['micrófono', 'interfaz audio', 'mezcladora'],
      dutyRate: null, totalEstimatedRate: 0.14, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'gaming_physical', code: 'gaming_physical',
      name: 'Accesorios Físicos Gaming',
      group: 'Gaming',
      aliases: ['silla gaming', 'escritorio gaming', 'volante gaming'],
      dutyRate: null, totalEstimatedRate: 0.29, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'clothing_accessories', code: 'clothing_accessories',
      name: 'Accesorios de Vestir',
      group: 'Moda',
      aliases: ['gorra', 'sombrero', 'bufanda', 'guantes textiles', 'corbata'],
      dutyRate: null, totalEstimatedRate: 0.29, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'footwear_parts', code: 'footwear_parts',
      name: 'Partes y Accesorios de Calzado',
      group: 'Moda',
      aliases: ['plantillas', 'cordones', 'suelas'],
      dutyRate: null, totalEstimatedRate: null, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'beauty_fragrance', code: 'beauty_fragrance',
      name: 'Perfumes y Fragancias',
      group: 'Belleza',
      aliases: ['perfume', 'fragancia', 'colonia', 'eau de toilette', 'body mist'],
      dutyRate: null, totalEstimatedRate: 0.29, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'beauty_makeup', code: 'beauty_makeup',
      name: 'Maquillaje y Cosméticos',
      group: 'Belleza',
      aliases: ['maquillaje', 'labial', 'mascara', 'esmalte', 'base'],
      dutyRate: null, totalEstimatedRate: 0.29, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'beauty_devices', code: 'beauty_devices',
      name: 'Aparatos de Belleza',
      group: 'Belleza',
      aliases: ['secadora pelo', 'plancha pelo', 'rasuradora', 'depiladora'],
      dutyRate: null, totalEstimatedRate: 0.29, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'medicines_medical', code: 'medicines_medical',
      name: 'Medicamentos y Productos Médicos',
      group: 'Salud / Regulado',
      aliases: ['medicamento', 'oxímetro', 'glucómetro', 'nebulizador'],
      dutyRate: null, totalEstimatedRate: null, source: 'local_estimated', requiresPermit: true, needsReview: true,
    },
    {
      id: 'home_decor', code: 'home_decor',
      name: 'Hogar, Decoración y Organización',
      group: 'Hogar',
      aliases: ['organizador', 'decoración', 'sábanas', 'cortinas', 'vajilla'],
      dutyRate: null, totalEstimatedRate: 0.29, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'chemicals_aerosols', code: 'chemicals_aerosols',
      name: 'Químicos, Aerosoles y Adhesivos',
      group: 'Regulado',
      aliases: ['aerosol', 'pintura', 'pegamento', 'resina', 'solvente'],
      dutyRate: null, totalEstimatedRate: null, source: 'local_estimated', requiresPermit: true, needsReview: true,
    },
    {
      id: 'automotive_accessories', code: 'automotive_accessories',
      name: 'Accesorios Automotrices',
      group: 'Automotriz',
      aliases: ['dashcam', 'cámara retroceso', 'radio carro', 'luces LED carro'],
      dutyRate: null, totalEstimatedRate: null, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'sports_outdoor', code: 'sports_outdoor',
      name: 'Bicicletas, Pesca y Outdoor',
      group: 'Deportes',
      aliases: ['bicicleta montaña', 'smartwatch deportivo', 'pesca', 'surf'],
      dutyRate: null, totalEstimatedRate: null, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'drones_rc', code: 'drones_rc',
      name: 'Drones y Control Remoto',
      group: 'Regulado',
      aliases: ['drone', 'dron', 'dji', 'carro rc', 'control remoto'],
      dutyRate: null, totalEstimatedRate: null, source: 'local_estimated', requiresPermit: true, needsReview: true,
    },
    {
      id: 'pet_accessories', code: 'pet_accessories',
      name: 'Accesorios para Mascotas',
      group: 'Mascotas',
      aliases: ['collar mascota', 'arnés mascota', 'cama mascota', 'comedero'],
      dutyRate: null, totalEstimatedRate: 0.29, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'pet_food_review', code: 'pet_food_review',
      name: 'Alimentos y Suplementos para Mascotas',
      group: 'Mascotas / Regulado',
      aliases: ['comida mascota', 'dog food', 'cat food', 'suplemento mascota'],
      dutyRate: null, totalEstimatedRate: null, source: 'local_estimated', requiresPermit: true, needsReview: true,
    },
    {
      id: 'office_stationery', code: 'office_stationery',
      name: 'Papelería, Oficina y Arte',
      group: 'Oficina',
      aliases: ['cuaderno', 'agenda', 'lápices', 'marcadores', 'silla oficina'],
      dutyRate: null, totalEstimatedRate: 0.29, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'watches_jewelry', code: 'watches_jewelry',
      name: 'Relojes y Joyería',
      group: 'Moda / Lujo',
      aliases: ['reloj', 'joyería', 'anillo', 'collar', 'pulsera', 'aretes'],
      dutyRate: null, totalEstimatedRate: null, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'eyewear_medical', code: 'eyewear_medical',
      name: 'Lentes de Contacto y Óptica Médica',
      group: 'Salud / Regulado',
      aliases: ['lentes de contacto', 'solución lentes', 'gotas ojos'],
      dutyRate: null, totalEstimatedRate: null, source: 'local_estimated', requiresPermit: true, needsReview: true,
    },
    {
      id: 'food_beverages', code: 'food_beverages',
      name: 'Alimentos y Bebidas',
      group: 'Alimentos / Regulado',
      aliases: ['snacks', 'chocolate', 'café', 'té', 'alimentos'],
      dutyRate: null, totalEstimatedRate: null, source: 'local_estimated', requiresPermit: true, needsReview: true,
    },
    {
      id: 'alcohol_tobacco', code: 'alcohol_tobacco',
      name: 'Alcohol, Tabaco, Vape y Nicotina',
      group: 'Restringido',
      aliases: ['vino', 'cerveza', 'licor', 'tabaco', 'vape', 'nicotina'],
      dutyRate: null, totalEstimatedRate: null, source: 'local_estimated', requiresPermit: true, needsReview: true,
    },
    {
      id: 'plants_seeds', code: 'plants_seeds',
      name: 'Plantas, Semillas y Productos Agro',
      group: 'Agro / Regulado',
      aliases: ['semillas', 'plantas', 'fertilizante', 'sustrato'],
      dutyRate: null, totalEstimatedRate: null, source: 'local_estimated', requiresPermit: true, needsReview: true,
    },
    {
      id: 'weapons_restricted', code: 'weapons_restricted',
      name: 'Armas, Partes y Productos Tácticos',
      group: 'Prohibido / Restringido',
      aliases: ['armas', 'municiones', 'pistola co2', 'cuchillo táctico', 'taser'],
      dutyRate: null, totalEstimatedRate: null, source: 'local_estimated', requiresPermit: true, needsReview: true,
    },
    {
      id: 'dangerous_goods', code: 'dangerous_goods',
      name: 'Productos Peligrosos o Inflamables',
      group: 'Prohibido / Dangerous Goods',
      aliases: ['explosivo', 'inflamable', 'corrosivo', 'hazmat'],
      dutyRate: null, totalEstimatedRate: null, source: 'local_estimated', requiresPermit: true, needsReview: true,
    },
    {
      id: 'illegal_drugs', code: 'illegal_drugs',
      name: 'Drogas, Narcóticos y Sustancias Controladas',
      group: 'Prohibido',
      aliases: ['drogas', 'narcóticos', 'cbd', 'thc', 'marihuana'],
      dutyRate: null, totalEstimatedRate: null, source: 'local_estimated', requiresPermit: true, needsReview: true,
    },
    {
      id: 'counterfeit_goods', code: 'counterfeit_goods',
      name: 'Productos Falsificados o Réplicas',
      group: 'Restringido',
      aliases: ['réplica', 'fake', 'falsificado', 'imitación'],
      dutyRate: null, totalEstimatedRate: null, source: 'local_estimated', requiresPermit: false, needsReview: true,
    },

    // ── Otros ─────────────────────────────────────────────────────────────────
    {
      id: 'otros', code: 'otros',
      name: 'Otro (no está en la lista)',
      group: 'Otros',
      aliases: ['otro', 'no sé', 'no estoy seguro', 'other', 'miscellaneous', 'varios'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: true,
    },
  ];

  // De-duplicate by code (safety guard)
  var _seen = {};
  var DEDUPED = [];
  for (var i = 0; i < CATEGORIES.length; i++) {
    var entry = CATEGORIES[i];
    if (!_seen[entry.code]) {
      _seen[entry.code] = true;
      DEDUPED.push(entry);
    }
  }

  window.PRODUCT_CATEGORIES = DEDUPED;

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 2 — PRODUCT_BRAIN_CATEGORIES (53 enriched spec categories)
  // Full schema: id, code, displayName, categoryGroup, subCategory, aliases,
  // keywords, misspellings, exampleProducts, estimatedDAI, vatRate,
  // law6946Rate, totalEstimatedRate, estimatedRange, source,
  // automaticEstimateAllowed, manualReviewRequired, regulatedProduct,
  // restrictedProduct, forbiddenProduct, riskFlags, possiblePermits,
  // possibleInstitutions, customerMessage, adminNotes, actionForCustomer,
  // actionForAdmin, confidenceLevel.
  // ════════════════════════════════════════════════════════════════════════════

  var BRAIN_CATS = [
    // 1
    { id:'phones_smartphones', code:'celulares', displayName:'Celulares', categoryGroup:'Electrónica', subCategory:'Comunicación',
      aliases:['celular','smartphone','iphone','ifon','aifon','iphon','samsung','galaxy','pixel','xiaomi','android','telefono','mobile phone'],
      keywords:['celular','smartphone','iphone','samsung','android','teléfono'],
      commonSearches:['iphone 15','samsung galaxy','celular barato'],
      misspellings:['ifon','aifon','iphon','celullar','samzung'],
      exampleProducts:['iPhone','Samsung Galaxy','Google Pixel','Xiaomi phone','Motorola phone','Android phone','celular básico'],
      estimatedDAI:0, vatRate:13, law6946Rate:1, totalEstimatedRate:0.14, estimatedRange:'~14%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Celulares. Esta categoría suele pagar aproximadamente 14% en impuestos. El monto final puede variar según el valor declarado y la validación final.',
      adminNotes:'Validar teléfonos satelitales o equipos de telecomunicación no comunes.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 2
    { id:'tablets_ereaders', code:'tableta_electronica', displayName:'Tablets y lectores electrónicos', categoryGroup:'Electrónica', subCategory:'Computación',
      aliases:['tablet','ipad','kindle','e-reader','ereader','lector electronico','surface','tableta'],
      keywords:['tablet','ipad','kindle','ereader','tableta'],
      commonSearches:['ipad','tablet android','kindle'],
      misspellings:['tablett','tablea'],
      exampleProducts:['iPad','Samsung Galaxy Tab','Amazon Fire tablet','Kindle','Kobo','e-reader'],
      estimatedDAI:0, vatRate:13, law6946Rate:1, totalEstimatedRate:0.14, estimatedRange:'~14%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Tablets o lectores electrónicos. Esta categoría suele pagar aproximadamente 14% en impuestos.',
      adminNotes:'Revisar modelos con conectividad celular si aplica.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 3
    { id:'computers_main_parts', code:'computadora', displayName:'Computadoras y partes principales', categoryGroup:'Electrónica', subCategory:'Computación',
      aliases:['laptop','notebook','macbook','computadora','pc','desktop','monitor','ssd','ram','gpu','tarjeta grafica','motherboard','procesador','cpu'],
      keywords:['laptop','computadora','macbook','monitor','ssd','ram','gpu'],
      commonSearches:['laptop gaming','macbook','computadora escritorio','monitor 4k'],
      misspellings:['labtop','computaodra'],
      exampleProducts:['Laptop','MacBook','Chromebook','gaming laptop','desktop PC','mini PC','all-in-one','monitor','motherboard','procesador','GPU','SSD'],
      estimatedDAI:0, vatRate:13, law6946Rate:1, totalEstimatedRate:0.14, estimatedRange:'~14%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Computadoras o partes principales. Esta categoría suele pagar aproximadamente 14% en impuestos.',
      adminNotes:'Diferenciar partes principales de accesorios simples.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 4
    { id:'storage_memory', code:'storage_memory', displayName:'Almacenamiento y memoria', categoryGroup:'Electrónica', subCategory:'Computación',
      aliases:['ssd','hdd','disco duro','hard drive','sd card','microsd','usb drive','ram','pendrive','memoria usb'],
      keywords:['ssd','hdd','microsd','usb','pendrive','ram'],
      commonSearches:['ssd 1tb','tarjeta microsd','usb memoria'],
      misspellings:['micro sd','microsde'],
      exampleProducts:['SSD','HDD','disco duro externo','disco duro interno','tarjeta SD','microSD','USB drive','RAM','pendrive'],
      estimatedDAI:0, vatRate:13, law6946Rate:1, totalEstimatedRate:0.14, estimatedRange:'~14%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a almacenamiento o memoria. Esta categoría suele pagar aproximadamente 14% en impuestos.',
      adminNotes:'Validar si viene dentro de otro equipo o como parte individual.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 5
    { id:'computer_accessories', code:'computer_accessories', displayName:'Accesorios de computadora', categoryGroup:'Electrónica', subCategory:'Accesorios PC',
      aliases:['keyboard','teclado','mouse','hub','dock','webcam','cable','hdmi','ethernet'],
      keywords:['teclado','mouse','webcam','hub','dock','hdmi'],
      commonSearches:['teclado mecánico','mouse gaming','webcam hd','hub usb'],
      misspellings:['keybord','raton','webcan'],
      exampleProducts:['Teclado mecánico','mouse gaming','webcam','hub USB','docking station','cable HDMI','capturadora','tarjeta WiFi','ventilador PC'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'~14%–29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Accesorios de computadora. Esta categoría suele pagar entre 14% y 29% en impuestos, según el tipo exacto.',
      adminNotes:'Si se requiere estimación única, usar rango o revisión si es ambiguo.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'medium' },
    // 6
    { id:'chargers_cables_adapters', code:'cargador', displayName:'Cargadores, cables y adaptadores', categoryGroup:'Electrónica', subCategory:'Accesorios',
      aliases:['charger','cargador','cable','usb c','usb-c','lightning','magsafe','adapter','adaptador'],
      keywords:['cargador','cable','adaptador','usb','magsafe'],
      commonSearches:['cargador iphone','cable usb-c','cargador rápido'],
      misspellings:['charjer','cargaodor'],
      exampleProducts:['Cargador rápido USB-C','cargador MagSafe','cargador laptop','cable Lightning','cable USB-C','cable micro USB','adaptador USB-C a HDMI','adaptador viaje'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'~15%–29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Cargadores, cables o adaptadores. Esta categoría suele pagar entre 15% y 29% en impuestos, según el tipo exacto.',
      adminNotes:'Revisar si es cargador, cable simple, adaptador o dispositivo electrónico.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'medium' },
    // 7
    { id:'lithium_batteries_powerbanks', code:'lithium_batteries', displayName:'Baterías y power banks', categoryGroup:'Especial / Riesgo transporte', subCategory:'Baterías',
      aliases:['powerbank','power bank','bateria externa','portable charger','lithium battery','litio','jumpstarter','power station'],
      keywords:['powerbank','bateria','litio','power station'],
      commonSearches:['power bank carga rápida','batería externa','jump starter'],
      misspellings:['powe bank','bateria extrena'],
      exampleProducts:['Power bank','batería externa','batería MagSafe','jump starter','UPS','power station','batería litio grande'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'Variable',
      source:'local_estimated', automaticEstimateAllowed:false, manualReviewRequired:true,
      regulatedProduct:true, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['contains_lithium_battery','special_transport','dangerous_goods_possible'],
      possiblePermits:['transporte especial batería litio'], possibleInstitutions:['MOPT','carrier aereo'],
      customerMessage:'Detectamos que este producto podría incluir una batería de litio. Estos productos suelen requerir revisión porque pueden tener condiciones especiales de transporte.',
      adminNotes:'Revisar capacidad Wh/mAh, transporte aéreo/marítimo, carrier y empaque.',
      actionForCustomer:'Compartir link, modelo, capacidad de batería si aparece y cantidad.',
      actionForAdmin:'Revisar restricciones de transporte y dangerous goods.', confidenceLevel:'high' },
    // 8
    { id:'networking_equipment', code:'router', displayName:'Redes y conectividad', categoryGroup:'Electrónica', subCategory:'Redes',
      aliases:['router','wifi','mesh','repeater','repetidor','switch','modem','módem','access point'],
      keywords:['router','wifi','modem','mesh','repetidor'],
      commonSearches:['router wifi','mesh wifi','extensor wifi'],
      misspellings:['routher','ruoter','wi fi'],
      exampleProducts:['Router WiFi','sistema mesh WiFi','repetidor WiFi','switch red','módem','access point'],
      estimatedDAI:0, vatRate:13, law6946Rate:1, totalEstimatedRate:0.14, estimatedRange:'~14%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['telecom_possible'], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Redes y conectividad. Esta categoría suele pagar aproximadamente 14% en impuestos.',
      adminNotes:'Radios, antenas especializadas y telecom profesional deben revisarse.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 9
    { id:'regulated_telecom', code:'regulated_telecom', displayName:'Equipos de telecomunicación', categoryGroup:'Regulado', subCategory:'Telecom',
      aliases:['satellite phone','telefono satelital','walkie','walkie talkie','radio','antenna','antena','telecom'],
      keywords:['satelital','walkie','radio','antena','telecom'],
      commonSearches:['walkie talkie','teléfono satelital','radio VHF'],
      misspellings:['walky talky','walki talki'],
      exampleProducts:['Teléfono satelital','radio comunicación','walkie talkie','antena especializada','radio VHF','radio UHF','transmisor'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'Variable',
      source:'local_estimated', automaticEstimateAllowed:false, manualReviewRequired:true,
      regulatedProduct:true, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['telecom','permit_possible','radiofrequency_possible'],
      possiblePermits:['permiso SUTEL','permiso MICITT'], possibleInstitutions:['SUTEL','MICITT'],
      customerMessage:'Este producto requiere revisión antes de cotizarlo automáticamente. Algunos equipos de telecomunicación pueden necesitar validación o permisos.',
      adminNotes:'Revisar SUTEL/MICITT o autoridad aplicable si corresponde.',
      actionForCustomer:'Compartir link y especificaciones técnicas del equipo.',
      actionForAdmin:'Validar regulación SUTEL/MICITT.', confidenceLevel:'high' },
    // 10
    { id:'headphones_audio_personal', code:'auricular_telefono', displayName:'Audífonos y audio personal', categoryGroup:'Electrónica', subCategory:'Audio',
      aliases:['audifonos','audífonos','airpods','earbuds','headphones','headset','bluetooth headphones','cascos'],
      keywords:['audífonos','airpods','earbuds','headphones','headset'],
      commonSearches:['airpods','audífonos bluetooth','headset gaming'],
      misspellings:['airpod','earpod','audifonos'],
      exampleProducts:['Audífonos cableados','audífonos Bluetooth','AirPods','earbuds','headset gaming','over-ear headphones','in-ear headphones'],
      estimatedDAI:1, vatRate:13, law6946Rate:1, totalEstimatedRate:0.15, estimatedRange:'~15%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Audífonos o audio personal. Esta categoría suele pagar aproximadamente 15% en impuestos.',
      adminNotes:'Distinguir de equipos de audio grandes.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 11
    { id:'speakers_home_audio', code:'bocina', displayName:'Bocinas y audio para hogar', categoryGroup:'Electrónica', subCategory:'Audio',
      aliases:['bocina','speaker','speakers','parlantes','soundbar','barra sonido','subwoofer'],
      keywords:['bocina','speaker','soundbar','subwoofer','parlante'],
      commonSearches:['bocina bluetooth','barra sonido','subwoofer'],
      misspellings:['bozina','speker'],
      exampleProducts:['Bocina Bluetooth','parlantes','bocinas escritorio','barra sonido','subwoofer','amplificador','tocadiscos'],
      estimatedDAI:1, vatRate:13, law6946Rate:1, totalEstimatedRate:0.15, estimatedRange:'~15%–29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Bocinas o audio para hogar. Esta categoría suele pagar entre 15% y 29% en impuestos, según el tipo exacto.',
      adminNotes:'Bocinas simples ~15%; equipos grandes pueden variar.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'medium' },
    // 12
    { id:'microphones_audio_pro', code:'microphones_audio', displayName:'Micrófonos y audio profesional', categoryGroup:'Electrónica', subCategory:'Audio Profesional',
      aliases:['microfono','micrófono','microphone','lavalier','interfaz audio','audio interface','mezcladora'],
      keywords:['micrófono','interfaz audio','mezcladora','lavalier'],
      commonSearches:['micrófono usb','micrófono podcast','interfaz audio'],
      misspellings:['microfono','mezclado'],
      exampleProducts:['Micrófono USB','micrófono lavalier','interfaz audio','mezcladora audio'],
      estimatedDAI:0, vatRate:13, law6946Rate:1, totalEstimatedRate:0.14, estimatedRange:'~14%–29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Audio profesional o micrófonos. Algunos equipos suelen pagar aproximadamente 14%, aunque puede variar.',
      adminNotes:'Interfaz o mezcladora puede requerir tasa variable según clasificación.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'medium' },
    // 13
    { id:'cameras_photo_video', code:'camara', displayName:'Cámaras, fotografía y video', categoryGroup:'Electrónica', subCategory:'Fotografía',
      aliases:['camara','cámara','camera','dslr','mirrorless','gopro','action camera','lens','lente','tripod','tripode','gimbal'],
      keywords:['cámara','dslr','mirrorless','gopro','lente','trípode'],
      commonSearches:['cámara dslr','gopro','cámara mirrorless','lente 50mm'],
      misspellings:['camara','cámra','goproo'],
      exampleProducts:['Cámara DSLR','cámara mirrorless','cámara compacta','GoPro','cámara instantánea','lente cámara','trípode','gimbal','softbox'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'~14%–29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Cámaras, fotografía o video. Esta categoría puede pagar entre 14% y 29% en impuestos, según el tipo exacto.',
      adminNotes:'Revisar cámara completa vs accesorio.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'medium' },
    // 14
    { id:'tv_projectors_streaming', code:'televisor', displayName:'Televisores, proyectores y streaming', categoryGroup:'Electrónica', subCategory:'Pantallas',
      aliases:['tv','televisor','television','smart tv','projector','proyector','roku','fire tv','apple tv','chromecast'],
      keywords:['televisor','tv','smart tv','proyector','roku','chromecast'],
      commonSearches:['smart tv 55','proyector 4k','roku streaming'],
      misspellings:['televsior','proyetor','cromcast'],
      exampleProducts:['Televisor','smart TV','proyector','mini proyector','Roku','Fire TV','Apple TV','Chromecast','Blu-ray player'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'~14%–29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Televisores, proyectores o streaming. Esta categoría puede pagar entre 14% y 29% en impuestos.',
      adminNotes:'Revisar tamaño, tipo y uso.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'medium' },
    // 15
    { id:'gaming_consoles_electronics', code:'consola_videojuegos', displayName:'Consolas y gaming electrónico', categoryGroup:'Gaming', subCategory:'Consolas',
      aliases:['playstation','ps5','xbox','nintendo','switch','steam deck','consola','controller','control','joycon','meta quest','vr'],
      keywords:['consola','ps5','xbox','nintendo','switch','steam deck','vr'],
      commonSearches:['ps5','xbox series x','nintendo switch','steam deck'],
      misspellings:['pleistation','x box','nintedo'],
      exampleProducts:['PS5','Xbox Series','Nintendo Switch','Steam Deck','control PS','control Xbox','Joy-Con','Meta Quest','visor VR','dock Switch'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'~14%–29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['battery_possible'], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Consolas o accesorios gaming. Esta categoría puede pagar entre 14% y 29% en impuestos.',
      adminNotes:'VR o equipos con batería/conectividad pueden requerir revisión.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'medium' },
    // 16
    { id:'gaming_physical_accessories', code:'gaming_physical', displayName:'Accesorios físicos gaming', categoryGroup:'Gaming', subCategory:'Accesorios',
      aliases:['gaming chair','silla gamer','silla gaming','gaming desk','volante gaming'],
      keywords:['silla gaming','escritorio gaming','volante gaming','mousepad'],
      commonSearches:['silla gamer','escritorio gamer','volante gaming'],
      misspellings:['silla gamers'],
      exampleProducts:['Silla gaming','escritorio gaming','volante gaming','pedales gaming','joystick','mousepad gaming','figura gaming'],
      estimatedDAI:15, vatRate:13, law6946Rate:1, totalEstimatedRate:0.29, estimatedRange:'~29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Accesorios físicos gaming. Esta categoría suele pagar aproximadamente 29% en impuestos.',
      adminNotes:'Distinguir de electrónicos gaming.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 17
    { id:'clothing_general', code:'ropa', displayName:'Ropa', categoryGroup:'Moda', subCategory:'Ropa',
      aliases:['ropa','clothing','clothes','shirt','t-shirt','camiseta','camisa','blouse','hoodie','pants','pantalones','jeans','dress','vestido','underwear'],
      keywords:['ropa','camiseta','jeans','pantalón','hoodie','vestido'],
      commonSearches:['camiseta','jeans','hoodie nike','ropa deportiva'],
      misspellings:['camizeta','t shirt'],
      exampleProducts:['Camiseta','jeans','hoodie','sweatshirt','jacket','blazer','vestido','leggings','boxer','pijama','bikini','ropa deportiva','ropa térmica'],
      estimatedDAI:15, vatRate:13, law6946Rate:1, totalEstimatedRate:0.29, estimatedRange:'~29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Ropa. Esta categoría suele pagar aproximadamente 29% en impuestos. El monto final puede variar según material, composición y tipo de prenda.',
      adminNotes:'Clasificación puede variar por tejido, material y confección.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 18
    { id:'clothing_accessories', code:'clothing_accessories', displayName:'Accesorios de vestir', categoryGroup:'Moda', subCategory:'Accesorios',
      aliases:['cap','hat','gorra','sombrero','beanie','scarf','bufanda','gloves','guantes','belt','cinturon','cinturón'],
      keywords:['gorra','sombrero','bufanda','guantes','cinturón'],
      commonSearches:['gorra beanie','bufanda invierno','cinturón cuero'],
      misspellings:['gora','bufsanda'],
      exampleProducts:['Gorra','sombrero','beanie','bufanda','guantes textiles','guantes cuero','corbata','pañuelo','cinturón textil','cinturón cuero'],
      estimatedDAI:15, vatRate:13, law6946Rate:1, totalEstimatedRate:0.29, estimatedRange:'~29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Accesorios de vestir. Esta categoría suele pagar aproximadamente 29% en impuestos.',
      adminNotes:'Cuero puede variar.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 19
    { id:'footwear_complete', code:'zapatos', displayName:'Calzado', categoryGroup:'Moda', subCategory:'Calzado',
      aliases:['zapatos','tenis','tennis','sneakers','shoes','footwear','botas','boots','sandalias','sandals','crocs','heels','tacones'],
      keywords:['zapatos','tenis','sneakers','botas','sandalias','calzado'],
      commonSearches:['tenis nike','zapatos cuero','botas montaña','sandalias'],
      misspellings:['snikers','sneackers','zandalias'],
      exampleProducts:['Tenis deportivos','sneakers','zapatos cuero','zapatos vestir','botas montaña','botas trabajo','Crocs','sandalias','zapatos fútbol','tacones'],
      estimatedDAI:15, vatRate:13, law6946Rate:1, totalEstimatedRate:0.29, estimatedRange:'~29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Calzado. Esta categoría suele pagar aproximadamente 29% en impuestos. El monto final puede variar según material y tipo de suela.',
      adminNotes:'Validar zapatos de seguridad, ortopédicos o partes.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 20
    { id:'footwear_parts_accessories', code:'footwear_parts', displayName:'Partes y accesorios de calzado', categoryGroup:'Moda', subCategory:'Accesorios calzado',
      aliases:['insoles','plantillas','laces','cordones','suelas','shoe sole','shoe cleaner'],
      keywords:['plantillas','cordones','suelas'],
      commonSearches:['plantillas ortopédicas','cordones','limpiador zapatillas'],
      misspellings:['cordonez','plantias'],
      exampleProducts:['Plantillas','cordones','suelas','cremas para zapatos','kit limpieza zapatos'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'~20%–29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['chemical_possible'], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Partes o accesorios de calzado. Esta categoría puede pagar entre 20% y 29% en impuestos.',
      adminNotes:'Suelas ~20%; kits químicos revisar.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'medium' },
    // 21
    { id:'beauty_fragrance', code:'beauty_fragrance', displayName:'Perfumes y fragancias', categoryGroup:'Belleza', subCategory:'Fragancias',
      aliases:['perfume','parfum','fragrance','fragancia','cologne','colonia','edt','edp','body mist'],
      keywords:['perfume','fragancia','colonia','eau de toilette'],
      commonSearches:['perfume hombre','perfume mujer','colonia','body mist'],
      misspellings:['perfum','fragrancia','colonya'],
      exampleProducts:['Perfume','eau de toilette','eau de parfum','body mist','fragancia','colonia'],
      estimatedDAI:15, vatRate:13, law6946Rate:1, totalEstimatedRate:0.29, estimatedRange:'~29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['liquid','flammable_possible','cosmetic_possible'], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Perfumes o fragancias. Esta categoría suele pagar aproximadamente 29% en impuestos. Puede requerir revisión si son cantidades comerciales.',
      adminNotes:'Revisar cantidad, alcohol/inflamabilidad y transporte.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 22
    { id:'beauty_makeup_cosmetics', code:'beauty_makeup', displayName:'Maquillaje y cosméticos', categoryGroup:'Belleza', subCategory:'Maquillaje',
      aliases:['makeup','maquillaje','makillaje','lip gloss','labial','mascara','rímel','rimel','eyeliner','delineador','foundation','blush','esmalte'],
      keywords:['maquillaje','labial','mascara','eyeliner','base','esmalte'],
      commonSearches:['maquillaje','labial','máscara pestañas','esmalte uñas'],
      misspellings:['makillaje','maquillage','rimel'],
      exampleProducts:['Labial','lip gloss','máscara pestañas','delineador','sombras ojos','base','corrector','polvo compacto','esmalte uñas','kit manicure','brochas'],
      estimatedDAI:15, vatRate:13, law6946Rate:1, totalEstimatedRate:0.29, estimatedRange:'~29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['cosmetic_possible','sanitary_possible','liquid_possible'], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Maquillaje o cosméticos. Esta categoría suele pagar aproximadamente 29% en impuestos.',
      adminNotes:'Líquidos, aerosoles o ingredientes activos pueden requerir revisión.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 23
    { id:'beauty_skincare_personal_care', code:'salud_belleza', displayName:'Skincare y cuidado personal', categoryGroup:'Belleza', subCategory:'Skincare',
      aliases:['skincare','skin care','crema','serum','sérum','retinol','hyaluronic','sunscreen','protector solar','shampoo','champu','champú','deodorant'],
      keywords:['skincare','crema','sérum','shampoo','desodorante','protector solar'],
      commonSearches:['crema facial','sérum vitamina c','shampoo','protector solar'],
      misspellings:['champu','serun'],
      exampleProducts:['Crema facial','sérum','retinol','ácido hialurónico','protector solar','shampoo','acondicionador','desodorante','pasta dental','exfoliante','gel baño'],
      estimatedDAI:15, vatRate:13, law6946Rate:1, totalEstimatedRate:0.29, estimatedRange:'~29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['cosmetic_possible','sanitary_possible'], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Cuidado personal o skincare. Esta categoría suele pagar aproximadamente 29% en impuestos.',
      adminNotes:'Ingredientes activos/medicinales pueden requerir revisión.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 24
    { id:'beauty_devices', code:'beauty_devices', displayName:'Aparatos de belleza y cuidado personal', categoryGroup:'Belleza', subCategory:'Dispositivos belleza',
      aliases:['hair dryer','secadora','straightener','plancha pelo','curler','rizadora','shaver','rasuradora','electric toothbrush'],
      keywords:['secadora','plancha pelo','rasuradora','depiladora','cepillo dental eléctrico'],
      commonSearches:['secadora de pelo','plancha cabello','rasuradora eléctrica','depiladora'],
      misspellings:['secaodra','planca pelo'],
      exampleProducts:['Cepillo dental eléctrico','rasuradora eléctrica','secadora pelo','plancha pelo','rizadora','máquina cortar pelo','depiladora','masajeador eléctrico'],
      estimatedDAI:15, vatRate:13, law6946Rate:1, totalEstimatedRate:0.29, estimatedRange:'~29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['battery_possible'], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Aparatos de belleza o cuidado personal. Esta categoría suele pagar aproximadamente 29% en impuestos.',
      adminNotes:'Si tiene batería integrada, revisar transporte si corresponde.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 25
    { id:'supplements_vitamins_nutrition', code:'suplementos', displayName:'Suplementos y vitaminas', categoryGroup:'Salud / Regulado', subCategory:'Suplementos',
      aliases:['protein','proteina','proteína','whey','creatine','creatina','pre workout','vitamins','vitaminas','melatonin','melatonina','magnesium','magnesio','suplemento'],
      keywords:['suplemento','proteína','vitamina','creatina','omega 3'],
      commonSearches:['proteína whey','creatina','vitaminas','suplemento fitness'],
      misspellings:['protenia','suplements','wey protein'],
      exampleProducts:['Proteína whey','creatina','pre-workout','BCAA','colágeno','omega 3','multivitamínicos','melatonina','probióticos','ashwagandha'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'Variable',
      source:'local_estimated', automaticEstimateAllowed:false, manualReviewRequired:true,
      regulatedProduct:true, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['supplement','sanitary_review'],
      possiblePermits:['registro sanitario','permiso CCSS'], possibleInstitutions:['CCSS','Ministerio de Salud'],
      customerMessage:'Este producto requiere revisión antes de cotizarlo automáticamente. Los suplementos pueden necesitar permisos, registro sanitario o validación especial.',
      adminNotes:'No calcular como final automático. Requiere revisión sanitaria/documental.',
      actionForCustomer:'Compartir link, ingredientes, cantidad y presentación.',
      actionForAdmin:'Revisar requisitos sanitarios y viabilidad courier.', confidenceLevel:'high' },
    // 26
    { id:'medicines_medical_products', code:'medicines_medical', displayName:'Medicamentos y productos médicos', categoryGroup:'Salud / Regulado', subCategory:'Medicamentos',
      aliases:['medicine','medicamento','medication','receta','prescription','medical','oxímetro','oximeter','nebulizer','glucómetro'],
      keywords:['medicamento','oxímetro','glucómetro','nebulizador','equipo médico'],
      commonSearches:['medicamento','oxímetro','tensiómetro','equipo médico'],
      misspellings:['medicamente','oximetro'],
      exampleProducts:['Medicamento OTC','crema medicinal','termómetro digital','tensiómetro','oxímetro','nebulizador','glucómetro','test embarazo','faja ortopédica','rodillera'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'Variable',
      source:'local_estimated', automaticEstimateAllowed:false, manualReviewRequired:true,
      regulatedProduct:true, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['medical','sanitary_review','prescription_possible'],
      possiblePermits:['registro sanitario','permiso Ministerio Salud'], possibleInstitutions:['Ministerio de Salud','CCSS'],
      customerMessage:'Este producto requiere revisión antes de cotizarlo automáticamente. Los medicamentos o equipos médicos pueden requerir permisos o validación especial.',
      adminNotes:'Revisión obligatoria. No calcular final automático.',
      actionForCustomer:'Compartir link, uso, cantidad y si requiere receta.',
      actionForAdmin:'Escalar a revisión sanitaria/documental.', confidenceLevel:'high' },
    // 27
    { id:'home_kitchen_appliances', code:'electrodomesticos', displayName:'Electrodomésticos pequeños y cocina', categoryGroup:'Hogar', subCategory:'Cocina',
      aliases:['coffee maker','cafetera','espresso','air fryer','freidora','blender','licuadora','microwave','microondas'],
      keywords:['cafetera','air fryer','licuadora','microondas','horno','tostadora'],
      commonSearches:['air fryer','cafetera espresso','licuadora','olla arrocera'],
      misspellings:['airfryer','cafeterra'],
      exampleProducts:['Cafetera','espresso machine','tostadora','air fryer','licuadora','batidora','olla arrocera','slow cooker','hervidor eléctrico','microondas','horno eléctrico'],
      estimatedDAI:15, vatRate:13, law6946Rate:1, totalEstimatedRate:0.29, estimatedRange:'~29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Electrodomésticos pequeños o cocina. Esta categoría suele pagar aproximadamente 29% en impuestos.',
      adminNotes:'Electrodomésticos grandes o especiales pueden variar.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 28
    { id:'home_decor_storage', code:'home_decor', displayName:'Hogar, decoración y organización', categoryGroup:'Hogar', subCategory:'Decoración',
      aliases:['home','hogar','decor','decoración','organizer','organizador','kitchenware','vajilla','sarten','sartén','towel','toalla','sheets','sabanas','sábanas'],
      keywords:['decoración','organizador','vajilla','sábanas','cortinas','alfombra'],
      commonSearches:['organizadores cocina','sábanas algodón','decoración pared'],
      misspellings:['decoracion','oragnizador'],
      exampleProducts:['Set cuchillos','vajilla cerámica','vasos','tazas','botella térmica','organizadores','contenedores','cortinas','sábanas','toallas','almohada','edredón','tiras LED','cuadro','espejo decorativo'],
      estimatedDAI:15, vatRate:13, law6946Rate:1, totalEstimatedRate:0.29, estimatedRange:'~29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Hogar, decoración u organización. Esta categoría suele pagar aproximadamente 29% en impuestos.',
      adminNotes:'Cuchillos, químicos, velas o líquidos pueden requerir revisión.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 29
    { id:'tools_hardware_common', code:'herramientas', displayName:'Herramientas y ferretería', categoryGroup:'Herramientas', subCategory:'Herramientas',
      aliases:['tools','herramientas','drill','taladro','saw','sierra','screwdriver','destornillador','hammer','martillo','hardware','ferreteria','ferretería'],
      keywords:['herramientas','taladro','sierra','destornillador','ferretería'],
      commonSearches:['taladro inalámbrico','sierra circular','set herramientas','multímetro'],
      misspellings:['talador','dreil'],
      exampleProducts:['Taladro eléctrico','taladro inalámbrico','sierra circular','sierra caladora','lijadora','Dremel','multímetro','nivel láser','set herramientas manuales','brocas','cerraduras','guantes trabajo'],
      estimatedDAI:15, vatRate:13, law6946Rate:1, totalEstimatedRate:0.29, estimatedRange:'~29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['battery_possible','chemical_possible'], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Herramientas o ferretería. Esta categoría suele pagar aproximadamente 29% en impuestos. Puede variar si incluye batería o químicos.',
      adminNotes:'Herramientas con batería, aerosoles o químicos requieren revisión.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 30
    { id:'chemicals_aerosols_adhesives', code:'chemicals_aerosols', displayName:'Químicos, aerosoles y adhesivos', categoryGroup:'Regulado / Dangerous Goods', subCategory:'Químicos',
      aliases:['chemical','químico','quimico','aerosol','paint','pintura','glue','pegamento','epoxy','resin','resina','solvent','pesticide'],
      keywords:['aerosol','pintura','pegamento','solvente','resina','pesticida'],
      commonSearches:['aerosol pintura','pegamento fuerte','resina epoxi','solvente'],
      misspellings:['aerozol','pegamente'],
      exampleProducts:['Pintura','aerosol pintura','pegamento fuerte','resina epóxica','solvente','fertilizante','pesticida','aerosoles','pinturas inflamables'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'Variable',
      source:'local_estimated', automaticEstimateAllowed:false, manualReviewRequired:true,
      regulatedProduct:true, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['chemical','aerosol','flammable_possible','special_transport'],
      possiblePermits:['permiso DGME','permiso SETENA'], possibleInstitutions:['SETENA','DGME','MINAE'],
      customerMessage:'Detectamos que este producto podría ser aerosol, inflamable o contener químicos. CRBOX debe revisarlo antes de confirmar si puede enviarse.',
      adminNotes:'No calcular final automático. Revisar dangerous goods.',
      actionForCustomer:'Compartir link, ficha técnica/SDS si existe, cantidad y presentación.',
      actionForAdmin:'Revisar peligrosidad, dangerous goods y carrier.', confidenceLevel:'high' },
    // 31
    { id:'automotive_simple_accessories', code:'automotive_accessories', displayName:'Accesorios automotrices', categoryGroup:'Automotriz', subCategory:'Accesorios auto',
      aliases:['car accessory','accesorios carro','auto accessory','dashcam','car radio','alfombras carro','luces carro'],
      keywords:['dashcam','cámara retroceso','radio carro','alfombra carro','luces LED carro'],
      commonSearches:['cámara retroceso','dashcam','radio carro android'],
      misspellings:['dash cam','camara retroceso'],
      exampleProducts:['Cámara retroceso','dashcam','radio carro','pantalla carro','alfombras carro','forros asiento','luces LED carro','escobillas','cargador carro','compresor aire portátil','cera carro'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'~15%–29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Accesorios automotrices. Esta categoría suele pagar entre 15% y 29% en impuestos.',
      adminNotes:'Diferenciar accesorios simples de repuestos críticos.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'medium' },
    // 32
    { id:'automotive_parts_review', code:'vehiculos', displayName:'Repuestos automotrices y moto', categoryGroup:'Automotriz', subCategory:'Repuestos',
      aliases:['auto parts','repuesto carro','repuestos','car part','brake pads','pastillas freno','sensor','llantas','rims','aros','motorcycle parts'],
      keywords:['repuesto','autopartes','frenos','sensor','llantas','aros'],
      commonSearches:['pastillas freno','filtro aceite','sensor oxígeno','aros de carro'],
      misspellings:['repuetos','autopartes'],
      exampleProducts:['Filtro aceite','pastillas freno','discos freno','bujías','sensor oxígeno','sensor MAF','sensor ABS','llantas','aros','casco moto','guantes moto','luces moto'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'Variable',
      source:'local_estimated', automaticEstimateAllowed:false, manualReviewRequired:true,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['automotive_part_review'], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Este producto requiere revisión antes de cotizarlo automáticamente. Los repuestos pueden variar mucho según tipo, uso y clasificación.',
      adminNotes:'Validar clasificación, peso, dimensiones y manejo especial.',
      actionForCustomer:'Compartir link del producto y número de parte si disponible.',
      actionForAdmin:'Revisar clasificación arancelaria y tasa correcta.', confidenceLevel:'medium' },
    // 33
    { id:'sports_fitness_physical', code:'bola', displayName:'Deportes y fitness', categoryGroup:'Deportes', subCategory:'Fitness',
      aliases:['fitness','gym','gimnasio','yoga mat','dumbbells','mancuernas','kettlebell','resistance bands','raqueta','pelota'],
      keywords:['yoga mat','mancuernas','gimnasio','fitness','raqueta','pelota'],
      commonSearches:['yoga mat','mancuernas','bandas resistencia','guantes gym'],
      misspellings:['yoaga mat','manquernas'],
      exampleProducts:['Yoga mat','mancuernas','kettlebell','bandas resistencia','guantes gimnasio','botella deportiva','sleeping bag','linterna','pelota fútbol','raqueta tenis','raqueta pádel'],
      estimatedDAI:15, vatRate:13, law6946Rate:1, totalEstimatedRate:0.29, estimatedRange:'~29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Deportes o fitness. Esta categoría suele pagar aproximadamente 29% en impuestos.',
      adminNotes:'Electrónicos deportivos pueden variar.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 34
    { id:'sports_outdoor_variable', code:'sports_outdoor', displayName:'Bicicletas, pesca y outdoor especializado', categoryGroup:'Deportes', subCategory:'Outdoor',
      aliases:['bike','bicicleta','cycling','pesca','fishing','surf','smartwatch deportivo','sports watch'],
      keywords:['bicicleta','pesca','surf','smartwatch','outdoor'],
      commonSearches:['bicicleta de montaña','caña de pescar','smartwatch deportivo','tabla surf'],
      misspellings:['bicicltea','pezca'],
      exampleProducts:['Bicicleta','casco bicicleta','luces bicicleta','reloj deportivo','smartwatch deportivo','banda frecuencia cardiaca','equipo pesca','señuelos pesca','caña pesca','tabla surf'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'~14%–29% / Variable',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['battery_possible'], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Outdoor, bicicleta o pesca. Esta categoría puede variar según el tipo exacto de producto.',
      adminNotes:'Bicicletas, pesca y electrónicos deportivos pueden requerir revisión.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'medium' },
    // 35
    { id:'toys_common', code:'juguetes', displayName:'Juguetes', categoryGroup:'Juguetes', subCategory:'Juguetes',
      aliases:['toy','toys','juguete','lego','muñeca','doll','plush','peluche','puzzle','board game'],
      keywords:['juguete','lego','muñeca','peluche','puzzle','juego de mesa'],
      commonSearches:['LEGO','muñeca Barbie','juego de mesa','peluche'],
      misspellings:['leggo','puzle','jugete'],
      exampleProducts:['LEGO','bloques construcción','muñeca','peluche','figura acción','carrito juguete','tren eléctrico','juego mesa','puzzle','scooter infantil','bicicleta infantil','patines','slime'],
      estimatedDAI:15, vatRate:13, law6946Rate:1, totalEstimatedRate:0.29, estimatedRange:'~29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['battery_possible'], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Juguetes. Esta categoría suele pagar aproximadamente 29% en impuestos.',
      adminNotes:'Drones, armas de juguete o baterías deben revisarse.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 36
    { id:'drones_rc_review', code:'drones_rc', displayName:'Drones y productos de control remoto', categoryGroup:'Regulado / Electrónica', subCategory:'Drones',
      aliases:['drone','dron','rc','remote control','control remoto','quadcopter'],
      keywords:['drone','dron','control remoto','quadcopter','rc'],
      commonSearches:['drone DJI','drone cámara','carro RC'],
      misspellings:['droon','drones'],
      exampleProducts:['Drone','dron','dron juguete','juguete control remoto','carro RC','avión RC','helicóptero RC','cámara drone'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'Variable',
      source:'local_estimated', automaticEstimateAllowed:false, manualReviewRequired:true,
      regulatedProduct:true, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['drone','lithium_battery','radiofrequency_possible'],
      possiblePermits:['permiso CETAC','permiso DGAC'], possibleInstitutions:['CETAC','DGAC','SUTEL'],
      customerMessage:'Detectamos que este producto parece ser un drone o equipo de control remoto. Puede requerir revisión por batería, radiofrecuencia o regulación especial.',
      adminNotes:'Revisar batería, radiofrecuencia y restricciones.',
      actionForCustomer:'Compartir link, modelo y especificaciones.',
      actionForAdmin:'Revisar regulación DGAC/CETAC y batería.', confidenceLevel:'high' },
    // 37
    { id:'baby_items', code:'coche_bebe', displayName:'Bebé y artículos infantiles', categoryGroup:'Bebé', subCategory:'Bebé',
      aliases:['baby','bebé','stroller','coche bebé','car seat','silla bebé','biberon','biberón','pacifier','chupón'],
      keywords:['bebé','coche bebé','silla bebé','biberón','chupón'],
      commonSearches:['coche de bebé','silla de carro bebé','monitor bebé'],
      misspellings:['coche bebe','silla bebe'],
      exampleProducts:['Coche bebé','silla carro bebé','cuna portátil','monitor bebé','biberón','chupón','esterilizador','pañalera','mochila bebé','ropa bebé'],
      estimatedDAI:15, vatRate:13, law6946Rate:1, totalEstimatedRate:0.29, estimatedRange:'~29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Artículos de bebé. Esta categoría suele pagar aproximadamente 29% en impuestos.',
      adminNotes:'Alimentos, suplementos o medicina bebé requieren revisión.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 38
    { id:'pet_accessories', code:'pet_accessories', displayName:'Accesorios para mascotas', categoryGroup:'Mascotas', subCategory:'Accesorios mascotas',
      aliases:['pet','mascota','dog','cat','collar mascota','arnés','pet toy','dog bed'],
      keywords:['mascota','collar','arnés','cama mascota','juguete mascota'],
      commonSearches:['collar perro','cama gato','comedero automático'],
      misspellings:['juguet perro'],
      exampleProducts:['Juguete mascota','collar mascota','arnés mascota','correa mascota','cama mascota','comedero','fuente agua mascota','cepillo mascota'],
      estimatedDAI:15, vatRate:13, law6946Rate:1, totalEstimatedRate:0.29, estimatedRange:'~29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Accesorios para mascotas. Esta categoría suele pagar aproximadamente 29% en impuestos.',
      adminNotes:'Alimentos/suplementos mascota requieren revisión.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 39
    { id:'pet_food_supplements_review', code:'pet_food_review', displayName:'Alimentos y suplementos para mascotas', categoryGroup:'Mascotas / Regulado', subCategory:'Alimentos mascotas',
      aliases:['pet food','dog food','cat food','comida perro','comida gato','suplemento mascota'],
      keywords:['comida mascota','alimento perro','alimento gato','suplemento mascota'],
      commonSearches:['comida para perro','alimento premium gatos'],
      misspellings:['comida perro','comida gato'],
      exampleProducts:['Comida mascota','suplemento mascota','vitaminas mascota','shampoo medicinal mascota','treats','dog food','cat food'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'Variable',
      source:'local_estimated', automaticEstimateAllowed:false, manualReviewRequired:true,
      regulatedProduct:true, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['pet_food','veterinary_review','sanitary_review'],
      possiblePermits:['permiso SENASA'], possibleInstitutions:['SENASA','Ministerio de Agricultura'],
      customerMessage:'Este producto requiere revisión antes de cotizarlo automáticamente. Alimentos o suplementos para mascotas pueden requerir validación sanitaria.',
      adminNotes:'Revisar SENASA/sanitario si aplica.',
      actionForCustomer:'Compartir link, tipo de alimento y marca.',
      actionForAdmin:'Revisar requisitos SENASA.', confidenceLevel:'high' },
    // 40
    { id:'books_printed_material', code:'cds', displayName:'Libros y material impreso', categoryGroup:'Libros / Oficina', subCategory:'Libros',
      aliases:['book','libro','magazine','revista','comic','manga'],
      keywords:['libro','revista','comic','manga','material impreso'],
      commonSearches:['libro inglés','manga','comic','revista'],
      misspellings:['livro','comik'],
      exampleProducts:['Libro','revista','comic','manga','material impreso','manual','catálogo'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'Variable/bajo',
      source:'local_estimated', automaticEstimateAllowed:false, manualReviewRequired:true,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['printed_material_review'], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Este producto puede tener tratamiento distinto según el tipo de material impreso. Requiere revisión para evitar una estimación incorrecta.',
      adminNotes:'Validar tratamiento aplicable.',
      actionForCustomer:'Compartir link o título del producto.',
      actionForAdmin:'Validar si aplica exención o tasa reducida.', confidenceLevel:'medium' },
    // 41
    { id:'office_stationery_art', code:'office_stationery', displayName:'Papelería, oficina y arte', categoryGroup:'Oficina / Arte', subCategory:'Papelería',
      aliases:['stationery','papeleria','papelería','notebook','cuaderno','agenda','planner','pen','lápices','art supplies'],
      keywords:['cuaderno','agenda','lápices','brochas','oficina','arte'],
      commonSearches:['cuaderno','agenda planner','set lápices de color','silla de oficina'],
      misspellings:['papeleria','agend','lapices'],
      exampleProducts:['Cuaderno','agenda','planner','lapiceros','marcadores','lápices color','pinceles','papel dibujo','tijeras','silla oficina','escritorio pequeño','soporte laptop','pizarra blanca'],
      estimatedDAI:15, vatRate:13, law6946Rate:1, totalEstimatedRate:0.29, estimatedRange:'~29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['chemical_possible'], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Papelería, oficina o arte. Esta categoría suele pagar aproximadamente 29% en impuestos.',
      adminNotes:'Pinturas, marcadores especiales, aerosoles o químicos revisar.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 42
    { id:'bags_luggage_accessories', code:'cinturon', displayName:'Bolsos, maletas y accesorios', categoryGroup:'Moda / Accesorios', subCategory:'Bolsos y maletas',
      aliases:['bag','bolso','purse','handbag','tote','backpack','mochila','wallet','billetera','luggage','maleta','suitcase'],
      keywords:['bolso','mochila','maleta','billetera','cartera'],
      commonSearches:['mochila','bolso de mano','maleta viaje','billetera cuero'],
      misspellings:['mochilla','mochia','bolsoa'],
      exampleProducts:['Bolso cuero','tote bag','mochila','billetera cuero','billetera sintética','maleta carry-on','maleta grande','neceser','paraguas','llaveros'],
      estimatedDAI:15, vatRate:13, law6946Rate:1, totalEstimatedRate:0.29, estimatedRange:'~29%',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:[], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Bolsos, maletas o accesorios. Esta categoría suele pagar aproximadamente 29% en impuestos.',
      adminNotes:'Cuero o lujo puede requerir validación.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'high' },
    // 43
    { id:'watches_jewelry', code:'watches_jewelry', displayName:'Relojes y joyería', categoryGroup:'Moda / Lujo', subCategory:'Relojes / Joyería',
      aliases:['watch','reloj','smartwatch','jewelry','joyeria','joyería','ring','anillo','necklace','collar','bracelet','pulsera','earrings'],
      keywords:['reloj','smartwatch','joyería','anillo','collar','pulsera','aretes'],
      commonSearches:['reloj hombre','apple watch','joyería plata','anillo'],
      misspellings:['joyeria','relioj','smatchwatch'],
      exampleProducts:['Reloj analógico','reloj digital','smartwatch','correa reloj','joyería fantasía','joyería plata','joyería oro','anillo','collar','pulsera','aretes'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'~15%–29% / Variable',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['high_value_possible','precious_metal_possible'], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Relojes o joyería. Esta categoría puede variar según material, valor y tipo de producto.',
      adminNotes:'Metales preciosos/alto valor requieren revisión.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'medium' },
    // 44
    { id:'eyewear_optical', code:'anteojos', displayName:'Lentes y óptica', categoryGroup:'Moda / Salud', subCategory:'Óptica',
      aliases:['glasses','lentes','sunglasses','gafas','eyewear','monturas'],
      keywords:['lentes','gafas','anteojos','monturas','lentes de sol'],
      commonSearches:['lentes de sol','gafas Ray-Ban','monturas lentes'],
      misspellings:['lente','anteojo','gazas'],
      exampleProducts:['Lentes sol','lentes ópticos','monturas lentes','estuche lentes','gafas deportivas'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'~15%–29% / Variable',
      source:'local_estimated', automaticEstimateAllowed:true, manualReviewRequired:false,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['optical_possible','sanitary_possible'], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'Detectamos que este producto pertenece a Lentes u óptica. Esta categoría puede variar según si son lentes de sol, monturas u ópticos.',
      adminNotes:'Lentes contacto/soluciones pueden requerir revisión sanitaria.',
      actionForCustomer:'', actionForAdmin:'', confidenceLevel:'medium' },
    // 45
    { id:'eyewear_medical_contact_lenses', code:'eyewear_medical', displayName:'Lentes de contacto y óptica médica', categoryGroup:'Salud / Regulado', subCategory:'Óptica médica',
      aliases:['contact lenses','lentes contacto','solution contacts','solución lentes','artificial tears'],
      keywords:['lentes de contacto','solución lentes','gotas ojos'],
      commonSearches:['lentes de contacto','solución lentes','gotas ojos'],
      misspellings:['lentes contacto','solucion lentes'],
      exampleProducts:['Lentes contacto','solución lentes contacto','lágrimas artificiales','gotas ojos','lentes ópticos medicados'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'Variable',
      source:'local_estimated', automaticEstimateAllowed:false, manualReviewRequired:true,
      regulatedProduct:true, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['optical_medical','sanitary_review'],
      possiblePermits:['registro sanitario'], possibleInstitutions:['Ministerio de Salud'],
      customerMessage:'Este producto puede requerir revisión sanitaria u óptica antes de importarse.',
      adminNotes:'Revisar sanitario/óptico.',
      actionForCustomer:'Compartir link y tipo de producto.',
      actionForAdmin:'Revisar sanitario/óptico.', confidenceLevel:'high' },
    // 46
    { id:'food_beverages_review', code:'food_beverages', displayName:'Alimentos y bebidas', categoryGroup:'Alimentos / Regulado', subCategory:'Alimentos',
      aliases:['food','comida','snacks','chocolate','candy','dulces','coffee','café','tea','té','sauce','salsa'],
      keywords:['alimentos','snacks','chocolate','café','bebida','salsa'],
      commonSearches:['snacks americanos','café importado','chocolate','salsas'],
      misspellings:['snaks','chocolat'],
      exampleProducts:['Snacks','chocolate','dulces','galletas','café','té','salsas','especias','bebida energética'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'Variable',
      source:'local_estimated', automaticEstimateAllowed:false, manualReviewRequired:true,
      regulatedProduct:true, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['food','sanitary_review'],
      possiblePermits:['permiso SENASA','registro sanitario'], possibleInstitutions:['SENASA','Ministerio de Salud'],
      customerMessage:'Este producto requiere revisión antes de cotizarlo automáticamente. Los alimentos y bebidas pueden requerir validación sanitaria.',
      adminNotes:'Validar si puede ingresar por courier y requisitos sanitarios.',
      actionForCustomer:'Compartir link, tipo de producto y cantidad.',
      actionForAdmin:'Validar si puede ingresar por courier y requisitos SENASA.', confidenceLevel:'high' },
    // 47
    { id:'alcohol_tobacco_vape_review', code:'alcohol_tobacco', displayName:'Alcohol, tabaco, vape y nicotina', categoryGroup:'Restringido', subCategory:'Alcohol / Tabaco',
      aliases:['alcohol','wine','vino','beer','cerveza','liquor','licor','tobacco','tabaco','vape','nicotine','nicotina'],
      keywords:['alcohol','vino','cerveza','licor','tabaco','vape','nicotina'],
      commonSearches:['vino tinto','cerveza importada','vape'],
      misspellings:['alchol','tabacco','vap'],
      exampleProducts:['Alcohol','vino','cerveza','licor','tabaco','cigarros','vape','líquido vape','nicotina'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'Variable',
      source:'local_estimated', automaticEstimateAllowed:false, manualReviewRequired:true,
      regulatedProduct:true, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['alcohol','tobacco','nicotine','restricted_possible'],
      possiblePermits:['permiso MINSA','permiso MEIC'], possibleInstitutions:['MINSA','MEIC','Hacienda'],
      customerMessage:'Este producto requiere revisión antes de cotizarlo automáticamente. Alcohol, tabaco, vape o nicotina pueden tener restricciones, permisos o impuestos especiales.',
      adminNotes:'Validar si CRBOX acepta el producto.',
      actionForCustomer:'Compartir link, tipo de producto y cantidad.',
      actionForAdmin:'Validar política CRBOX y requisitos.', confidenceLevel:'high' },
    // 48
    { id:'plants_seeds_agro_review', code:'plants_seeds', displayName:'Plantas, semillas y productos agro', categoryGroup:'Agro / Regulado', subCategory:'Agro',
      aliases:['seeds','semillas','plants','plantas','soil','tierra','fertilizer','fertilizante','pesticide','pesticida'],
      keywords:['semillas','plantas','fertilizante','sustrato'],
      commonSearches:['semillas','plantas','fertilizante'],
      misspellings:['semias','planata'],
      exampleProducts:['Semillas','plantas','tierra','sustrato','fertilizantes','pesticidas'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'Variable',
      source:'local_estimated', automaticEstimateAllowed:false, manualReviewRequired:true,
      regulatedProduct:true, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['agro','phytosanitary_review'],
      possiblePermits:['permiso fitosanitario SFE','permiso SENASA'], possibleInstitutions:['SFE','SENASA','MAG'],
      customerMessage:'Este producto requiere revisión antes de cotizarlo automáticamente. Plantas, semillas o productos agro pueden requerir permisos fitosanitarios.',
      adminNotes:'Validar fitosanitario/SFE si aplica.',
      actionForCustomer:'Compartir link y tipo de producto.',
      actionForAdmin:'Validar fitosanitario/SFE.', confidenceLevel:'high' },
    // 49
    { id:'weapons_restricted', code:'weapons_restricted', displayName:'Armas, partes y productos tácticos', categoryGroup:'Prohibido / Restringido', subCategory:'Armas',
      aliases:['gun','firearm','weapon','arma','municiones','ammunition','tactical knife','cuchillo tactico','cuchillo táctico','taser'],
      keywords:['armas','municiones','pistola','cuchillo táctico','taser'],
      commonSearches:['pistola CO2','cuchillo táctico','balines'],
      misspellings:['arma','municion'],
      exampleProducts:['Armas fuego','partes armas','municiones','balines','pistolas CO2','cuchillos tácticos','taser','brass knuckles','silenciadores'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'Restricted',
      source:'local_estimated', automaticEstimateAllowed:false, manualReviewRequired:true,
      regulatedProduct:true, restrictedProduct:true, forbiddenProduct:true,
      riskFlags:['weapon','restricted_item'],
      possiblePermits:['permiso DGA','permiso MINGOB'], possibleInstitutions:['DGA','MINGOB'],
      customerMessage:'Este producto puede pertenecer a una categoría restringida, como armas, partes de armas, municiones o artículos tácticos. CRBOX debe revisarlo antes de confirmar.',
      adminNotes:'No calcular automáticamente. Escalar a revisión.',
      actionForCustomer:'Compartir link y descripción del producto.',
      actionForAdmin:'Escalar a revisión según política CRBOX.', confidenceLevel:'high' },
    // 50
    { id:'dangerous_goods', code:'dangerous_goods', displayName:'Productos peligrosos o inflamables', categoryGroup:'Prohibido / Dangerous Goods', subCategory:'Dangerous Goods',
      aliases:['hazmat','hazardous','dangerous goods','inflamable','explosive','explosivo','corrosive','corrosivo'],
      keywords:['explosivo','inflamable','corrosivo','dangerous goods','hazmat'],
      commonSearches:['productos inflamables','explosivos','corrosivos'],
      misspellings:['explosibo','inflamale'],
      exampleProducts:['Explosivos','productos inflamables','corrosivos','aerosoles peligrosos','baterías grandes','fuegos artificiales','gases comprimidos'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'Restricted / Variable',
      source:'local_estimated', automaticEstimateAllowed:false, manualReviewRequired:true,
      regulatedProduct:true, restrictedProduct:true, forbiddenProduct:false,
      riskFlags:['dangerous_goods','flammable','explosive','corrosive','special_transport'],
      possiblePermits:['permiso especial transporte'], possibleInstitutions:['MOPT','SETENA'],
      customerMessage:'Este producto puede tener restricciones de transporte, seguridad o permisos. CRBOX debe revisarlo antes de confirmar si puede enviarse.',
      adminNotes:'Revisar dangerous goods y restricciones de carrier.',
      actionForCustomer:'Compartir link y ficha técnica/SDS.',
      actionForAdmin:'Revisar dangerous goods y carrier.', confidenceLevel:'high' },
    // 51
    { id:'illegal_drugs_controlled_substances', code:'illegal_drugs', displayName:'Drogas, narcóticos y sustancias controladas', categoryGroup:'Prohibido', subCategory:'Prohibido',
      aliases:['drugs','narcotics','droga','controlled substance','thc','cbd','marihuana'],
      keywords:['drogas','narcóticos','sustancias controladas','CBD','THC'],
      commonSearches:['CBD','marihuana'],
      misspellings:['drogas','narcotificos'],
      exampleProducts:['Drogas ilegales','narcóticos','psicotrópicos','sustancias controladas'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'Prohibited',
      source:'local_estimated', automaticEstimateAllowed:false, manualReviewRequired:true,
      regulatedProduct:true, restrictedProduct:true, forbiddenProduct:true,
      riskFlags:['prohibited','controlled_substance'],
      possiblePermits:[], possibleInstitutions:['IAFA','Poder Judicial','DGA'],
      customerMessage:'Este producto puede estar prohibido o restringido. CRBOX no debe cotizarlo automáticamente.',
      adminNotes:'Bloquear/escalar según política.',
      actionForCustomer:'Contactar a CRBOX directamente para consulta.',
      actionForAdmin:'Escalar según política CRBOX. No cotizar.', confidenceLevel:'high' },
    // 52
    { id:'counterfeit_goods', code:'counterfeit_goods', displayName:'Productos falsificados o réplicas', categoryGroup:'Restringido', subCategory:'Falsificaciones',
      aliases:['fake','replica','réplica','counterfeit','falso','imitación','imitacion'],
      keywords:['réplica','falso','falsificado','imitación','fake'],
      commonSearches:['réplica bolso','fake watches','imitación marca'],
      misspellings:['replica','imitacion'],
      exampleProducts:['Réplicas','fake designer bags','fake watches','counterfeit shoes','imitación marca'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'Restricted',
      source:'local_estimated', automaticEstimateAllowed:false, manualReviewRequired:true,
      regulatedProduct:true, restrictedProduct:true, forbiddenProduct:false,
      riskFlags:['counterfeit','trademark_risk'],
      possiblePermits:[], possibleInstitutions:['DGA','TICA'],
      customerMessage:'Este producto puede estar relacionado con mercancía falsificada o réplica. CRBOX debe revisarlo antes de confirmar si puede transportarse.',
      adminNotes:'Revisar política y riesgo marcario.',
      actionForCustomer:'Compartir link del producto.',
      actionForAdmin:'Revisar política CRBOX y riesgo marcario.', confidenceLevel:'high' },
    // 53
    { id:'unknown_manual_review', code:'otros', displayName:'Producto por revisar', categoryGroup:'Fallback', subCategory:'Desconocido',
      aliases:['unknown','other','otro','no sé','no se','no estoy seguro'],
      keywords:['otro','no sé','desconocido','no identificado'],
      commonSearches:['otro producto','no sé qué es'],
      misspellings:['otero'],
      exampleProducts:['Producto no identificado','categoría no encontrada','otro','producto ambiguo'],
      estimatedDAI:null, vatRate:13, law6946Rate:1, totalEstimatedRate:null, estimatedRange:'Variable',
      source:'local_estimated', automaticEstimateAllowed:false, manualReviewRequired:true,
      regulatedProduct:false, restrictedProduct:false, forbiddenProduct:false,
      riskFlags:['unknown'], possiblePermits:[], possibleInstitutions:[],
      customerMessage:'No encontramos una categoría suficientemente clara para este producto. CRBOX debe revisarlo para evitar una estimación incorrecta.',
      adminNotes:'Fallback seguro para productos no identificados.',
      actionForCustomer:'Compartir link o descripción del producto.',
      actionForAdmin:'Clasificar manualmente.', confidenceLevel:'low' },
  ];

  window.PRODUCT_BRAIN_CATEGORIES = BRAIN_CATS;

  // ── Merge Brain fields into every PRODUCT_CATEGORIES entry ─────────────────
  // Pass 1: direct match by id/code.
  // Pass 2: legacy-code fallback table — maps every legacy PRODUCT_CATEGORIES
  //         code that has no direct Brain match to the most appropriate Brain
  //         category id so ALL 177 entries receive the full field set.
  // DEDUPED entries are live object refs identical to window.PRODUCT_CATEGORIES,
  // so mutations here are reflected immediately on window.PRODUCT_CATEGORIES.
  (function _mergeBrainIntoCats() {
    // Build direct lookup from Brain category id and code.
    var brainMap = {};
    BRAIN_CATS.forEach(function (bc) {
      brainMap[bc.id] = bc;
      if (bc.code && bc.code !== bc.id) { brainMap[bc.code] = bc; }
    });

    // Legacy PRODUCT_CATEGORIES code → Brain category id fallback.
    // Covers every code that has no Brain entry of its own.
    var LEGACY_MAP = {
      // ── Phones / Electronics ──────────────────────────────────────────────
      telefonos:                 'phones_smartphones',
      // ── Computers / Parts ─────────────────────────────────────────────────
      procesador:                'computers_main_parts',
      disco_duro:                'storage_memory',
      memoria:                   'storage_memory',
      tarjeta_video_sonido:      'computers_main_parts',
      tarjeta_madre:             'computers_main_parts',
      fuente_poder:              'computers_main_parts',
      case_cpu:                  'computers_main_parts',
      quemador_cd_dvd:           'computers_main_parts',
      // ── Computer Accessories ──────────────────────────────────────────────
      monitor:                   'computer_accessories',
      teclado_computadora:       'computer_accessories',
      ventiladores_computadora:  'computer_accessories',
      control_remoto:            'computer_accessories',
      // ── Printers (no dedicated Brain cat → closest match) ────────────────
      impresora:                 'computer_accessories',
      accesorios_impresora:      'computer_accessories',
      fotocopiadora:             'computer_accessories',
      // ── Chargers / Cables ─────────────────────────────────────────────────
      adaptador:                 'chargers_cables_adapters',
      // ── Networking ────────────────────────────────────────────────────────
      antena:                    'networking_equipment',
      radio_comunicacion:        'networking_equipment',
      llave_maya:                'networking_equipment',
      // ── Software / Digital (no dedicated Brain cat → fallback) ──────────
      software:                  'unknown_manual_review',
      dvds:                      'unknown_manual_review',
      video_juegos:              'gaming_consoles_electronics',
      // ── Audio / Home Theater ─────────────────────────────────────────────
      equipo_sonido:             'speakers_home_audio',
      equipo_karaoke:            'speakers_home_audio',
      home_teather:              'speakers_home_audio',
      amplificador:              'speakers_home_audio',
      parlantes:                 'speakers_home_audio',
      amplificador_grabador:     'microphones_audio_pro',
      ipod_mp3_mp4:              'headphones_audio_personal',
      diskman_walkman:           'headphones_audio_personal',
      // ── TV / Streaming / Projectors ───────────────────────────────────────
      lector_dvd_cd:             'tv_projectors_streaming',
      reproductor_bluray:        'tv_projectors_streaming',
      proyector_video:           'tv_projectors_streaming',
      video_monitor:             'tv_projectors_streaming',
      // ── Cameras / Photo ───────────────────────────────────────────────────
      tripode:                   'cameras_photo_video',
      sombrilla_fotografia:      'cameras_photo_video',
      lente_camara:              'cameras_photo_video',
      binoculares:               'cameras_photo_video',
      // ── Clothing / Accessories ────────────────────────────────────────────
      pelucas:                   'clothing_general',
      ropa_otro:                 'clothing_general',
      gorras:                    'clothing_accessories',
      maletines_bolsos:          'bags_luggage_accessories',
      joyeria_bisuteria:         'watches_jewelry',
      relojes:                   'watches_jewelry',
      // ── Home Appliances / Kitchen ─────────────────────────────────────────
      refrigerador:              'home_kitchen_appliances',
      aspiradora:                'home_kitchen_appliances',
      ollas_sartenes:            'home_kitchen_appliances',
      mixer:                     'home_kitchen_appliances',
      filtro_agua:               'home_kitchen_appliances',
      // ── Home Décor / Storage ─────────────────────────────────────────────
      colchon:                   'home_decor_storage',
      muebles:                   'home_decor_storage',
      lampara:                   'home_decor_storage',
      alfombra:                  'home_decor_storage',
      sabanas:                   'home_decor_storage',
      platos_ceramica:           'home_decor_storage',
      vaso_vidrio:               'home_decor_storage',
      bombillos:                 'home_decor_storage',
      fluorescente:              'home_decor_storage',
      adornos:                   'home_decor_storage',
      articulos_fiesta:          'home_decor_storage',
      panos:                     'home_decor_storage',
      sombrilla:                 'home_decor_storage',
      // ── Tools / Hardware ─────────────────────────────────────────────────
      griferia:                  'tools_hardware_common',
      manguera:                  'tools_hardware_common',
      cables_electricos:         'tools_hardware_common',
      maquina_coser_soldar:      'tools_hardware_common',
      romana:                    'tools_hardware_common',
      gata_hidraulica:           'tools_hardware_common',
      // ── Beauty / Personal Care ────────────────────────────────────────────
      plancha_pelo:              'beauty_devices',
      secadoras_pelo:            'beauty_devices',
      rasuradora_electrica:      'beauty_devices',
      // ── Office / Stationery ───────────────────────────────────────────────
      calculadora:               'office_stationery_art',
      papel:                     'office_stationery_art',
      posters:                   'office_stationery_art',
      libros:                    'office_stationery_art',
      // ── Medical ───────────────────────────────────────────────────────────
      microscopio:               'medicines_medical_products',
      lente_contacto:            'eyewear_optical',
      // ── Sports / Fitness ─────────────────────────────────────────────────
      bicicleta_economica:       'sports_outdoor_variable',
      bicicleta_cara:            'sports_outdoor_variable',
      raqueta:                   'sports_fitness_physical',
      tabla_surf:                'sports_outdoor_variable',
      palos_golf:                'sports_outdoor_variable',
      cana_pescar:               'sports_outdoor_variable',
      aros_bicicleta:            'sports_outdoor_variable',
      tienda_campana:            'sports_outdoor_variable',
      casco_seguridad:           'sports_outdoor_variable',
      deporte_otro:              'sports_outdoor_variable',
      patines:                   'toys_common',
      sleeping_bag:              'sports_fitness_physical',
      // ── Baby / Kids ───────────────────────────────────────────────────────
      silla_bebe_carro:          'baby_items',
      bebe_otro:                 'baby_items',
      juego_mesa:                'toys_common',
      // ── Automotive Parts (review) ─────────────────────────────────────────
      amortiguadores:            'automotive_parts_review',
      aros_carro_moto:           'automotive_parts_review',
      partes_carroceria:         'automotive_parts_review',
      suspension_carro:          'automotive_parts_review',
      suspension_moto:           'automotive_parts_review',
      bujias:                    'automotive_parts_review',
      cluth:                     'automotive_parts_review',
      molduras_vehiculo:         'automotive_parts_review',
      mufla:                     'automotive_parts_review',
      radiador:                  'automotive_parts_review',
      filtro_aceite_aire:        'automotive_parts_review',
      llantas_vehiculo:          'automotive_parts_review',
      parabrisas:                'automotive_parts_review',
      arrancador:                'automotive_parts_review',
      pinon:                     'automotive_parts_review',
      valvulas:                  'automotive_parts_review',
      bomba_aceite_agua:         'automotive_parts_review',
      repuestos_vehiculo:        'automotive_parts_review',
      vehic_otro:                'automotive_parts_review',
      // ── Automotive Simple Accessories ─────────────────────────────────────
      luces_carro:               'automotive_simple_accessories',
      retrovisor:                'automotive_simple_accessories',
      rack_carro:                'automotive_simple_accessories',
      alarma:                    'automotive_simple_accessories',
      radio_carro:               'automotive_simple_accessories',
      // ── Batteries ─────────────────────────────────────────────────────────
      baterias:                  'lithium_batteries_powerbanks',
      // ── Musical Instruments (no dedicated Brain cat → manual review) ─────
      guitarra_acustica:         'unknown_manual_review',
      guitarra_electrica:        'unknown_manual_review',
      teclado_musical:           'unknown_manual_review',
      instrumentos_musicales:    'unknown_manual_review',
      // ── Fallback ──────────────────────────────────────────────────────────
      electr_otro:               'unknown_manual_review',
      hogar_otro:                'unknown_manual_review',
    };

    var BRAIN_FIELDS = [
      'displayName','categoryGroup','subCategory','keywords','commonSearches',
      'misspellings','exampleProducts','estimatedDAI','vatRate','law6946Rate',
      'estimatedRange','automaticEstimateAllowed','manualReviewRequired',
      'regulatedProduct','restrictedProduct','forbiddenProduct','riskFlags',
      'possiblePermits','possibleInstitutions','customerMessage','adminNotes',
      'actionForCustomer','actionForAdmin','confidenceLevel',
    ];

    DEDUPED.forEach(function (cat) {
      // Pass 1: direct match on Brain id or code.
      var bc = brainMap[cat.id] || brainMap[cat.code] || null;
      // Pass 2: legacy code fallback.
      if (!bc) {
        var fallbackId = LEGACY_MAP[cat.id] || LEGACY_MAP[cat.code] || null;
        if (fallbackId) { bc = brainMap[fallbackId] || null; }
      }
      if (bc) {
        BRAIN_FIELDS.forEach(function (f) {
          if (bc[f] !== undefined) { cat[f] = bc[f]; }
        });
        // Tag the entry so callers can detect the merge origin.
        if (!cat._brainId) { cat._brainId = bc.id; }
      }
    });
  }());

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 3 — PRODUCT_PRODUCTS (product-level rows)
  // productKey, productName, categoryId, aliases, misspellings,
  // englishTerms, spanishTerms, riskOverrideFlags, customerHint, adminHint
  // ════════════════════════════════════════════════════════════════════════════

  var PRODUCTS = [
    // Phones
    { productKey:'iphone',         productName:'iPhone',                    categoryId:'phones_smartphones',         aliases:['iphone','apple phone'],                       misspellings:['ifon','aifon','iphon'],        englishTerms:['iphone'],              spanishTerms:['celular apple'],          riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'samsung_galaxy', productName:'Samsung Galaxy',            categoryId:'phones_smartphones',         aliases:['samsung galaxy','galaxy s','galaxy a'],        misspellings:['samzung','galxy'],            englishTerms:['samsung galaxy'],       spanishTerms:['celular samsung'],        riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'google_pixel',   productName:'Google Pixel',              categoryId:'phones_smartphones',         aliases:['google pixel','pixel phone'],                  misspellings:['gogle pixel'],                englishTerms:['pixel'],               spanishTerms:['celular google'],         riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'xiaomi_phone',   productName:'Xiaomi / Motorola / Android',categoryId:'phones_smartphones',        aliases:['xiaomi','motorola','android phone'],            misspellings:['shiaomi','motorrola'],        englishTerms:['xiaomi','motorola'],    spanishTerms:['celular android'],        riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Tablets
    { productKey:'ipad',           productName:'iPad',                      categoryId:'tablets_ereaders',           aliases:['ipad','ipad pro','ipad air','ipad mini'],       misspellings:['ippad','ipadd'],              englishTerms:['ipad'],                spanishTerms:['tableta apple'],          riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'samsung_tab',    productName:'Samsung Galaxy Tab',        categoryId:'tablets_ereaders',           aliases:['samsung tab','galaxy tab','android tablet'],    misspellings:['tableta samsung'],            englishTerms:['samsung tab'],          spanishTerms:['tableta samsung'],        riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'kindle',         productName:'Kindle / E-reader',         categoryId:'tablets_ereaders',           aliases:['kindle','kobo','e-reader','lector electrónico'],misspellings:['kindl','kinle'],              englishTerms:['kindle','kobo'],        spanishTerms:['lector electrónico'],     riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Computers
    { productKey:'laptop',         productName:'Laptop / Notebook',         categoryId:'computers_main_parts',       aliases:['laptop','notebook','portátil'],                 misspellings:['labtop','latop'],             englishTerms:['laptop','notebook'],    spanishTerms:['computadora portátil'],   riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'macbook',        productName:'MacBook',                   categoryId:'computers_main_parts',       aliases:['macbook','macbook pro','macbook air'],          misspellings:['macbok','macbuk'],            englishTerms:['macbook'],             spanishTerms:['laptop apple'],           riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'chromebook',     productName:'Chromebook',                categoryId:'computers_main_parts',       aliases:['chromebook'],                                  misspellings:['crombuk','cromebook'],        englishTerms:['chromebook'],          spanishTerms:['chromebook'],             riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'gaming_laptop',  productName:'Laptop Gaming',             categoryId:'computers_main_parts',       aliases:['gaming laptop','laptop gamer'],                 misspellings:['labtop gaming'],              englishTerms:['gaming laptop'],        spanishTerms:['laptop gaming'],          riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'desktop_pc',     productName:'PC de escritorio',          categoryId:'computers_main_parts',       aliases:['desktop','pc','torre pc'],                      misspellings:['computaodra escritorio'],    englishTerms:['desktop pc'],          spanishTerms:['computadora escritorio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'monitor',        productName:'Monitor de Computadora',    categoryId:'computers_main_parts',       aliases:['monitor','pantalla pc','display'],              misspellings:['monito'],                     englishTerms:['monitor','display'],   spanishTerms:['monitor','pantalla pc'],  riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'gpu',            productName:'Tarjeta Gráfica / GPU',     categoryId:'computers_main_parts',       aliases:['gpu','nvidia','amd radeon','tarjeta gráfica'],  misspellings:['tarjeta grafica'],            englishTerms:['gpu','graphics card'], spanishTerms:['tarjeta de video'],       riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Storage
    { productKey:'ssd_externo',    productName:'SSD / Disco Duro Externo',  categoryId:'storage_memory',             aliases:['ssd externo','disco duro externo'],             misspellings:['ssd extrno'],                 englishTerms:['external ssd'],        spanishTerms:['disco duro externo'],     riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'microsd',        productName:'Tarjeta microSD / SD',      categoryId:'storage_memory',             aliases:['microsd','tarjeta sd','memory card'],           misspellings:['micro sd'],                   englishTerms:['microsd','sd card'],   spanishTerms:['tarjeta de memoria'],     riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'usb_pendrive',   productName:'USB / Pendrive',            categoryId:'storage_memory',             aliases:['usb','pendrive','flash drive'],                 misspellings:['pen drive'],                  englishTerms:['usb drive'],           spanishTerms:['usb','memoria usb'],      riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // PC Accessories
    { productKey:'teclado_mec',    productName:'Teclado Mecánico',          categoryId:'computer_accessories',       aliases:['teclado mecánico','mechanical keyboard'],       misspellings:['teclado mecanico','keybord'], englishTerms:['mechanical keyboard'], spanishTerms:['teclado mecánico'],       riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'mouse_gaming',   productName:'Mouse Gaming',              categoryId:'computer_accessories',       aliases:['mouse gaming','ratón gaming'],                  misspellings:['mause','raton gaming'],       englishTerms:['gaming mouse'],        spanishTerms:['mouse gaming'],           riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'webcam',         productName:'Webcam',                    categoryId:'computer_accessories',       aliases:['webcam','cámara web'],                          misspellings:['webcan','webcaem'],           englishTerms:['webcam'],              spanishTerms:['cámara web'],             riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'hub_usb',        productName:'Hub USB / Docking Station', categoryId:'computer_accessories',       aliases:['hub usb','docking station'],                    misspellings:['docking'],                    englishTerms:['usb hub','docking'],   spanishTerms:['hub usb'],                riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cable_hdmi',     productName:'Cable HDMI',                categoryId:'computer_accessories',       aliases:['cable hdmi','hdmi'],                            misspellings:['cable hdm'],                  englishTerms:['hdmi cable'],          spanishTerms:['cable hdmi'],             riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Chargers
    { productKey:'cargador_usbc',  productName:'Cargador USB-C / Rápido',   categoryId:'chargers_cables_adapters',   aliases:['cargador usb-c','cargador rápido'],             misspellings:['cargaodor'],                  englishTerms:['fast charger'],        spanishTerms:['cargador rápido'],        riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cable_lightning',productName:'Cable Lightning',           categoryId:'chargers_cables_adapters',   aliases:['cable lightning','cable iphone'],               misspellings:['lightining'],                 englishTerms:['lightning cable'],     spanishTerms:['cable para iphone'],      riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'adaptador_hdmi', productName:'Adaptador USB-C a HDMI',    categoryId:'chargers_cables_adapters',   aliases:['adaptador hdmi','usb c a hdmi'],                misspellings:['adaptaodor hdmi'],            englishTerms:['usb-c to hdmi'],       spanishTerms:['adaptador usb-c hdmi'],   riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Batteries
    { productKey:'powerbank',      productName:'Power Bank / Batería externa',categoryId:'lithium_batteries_powerbanks',aliases:['power bank','powerbank','batería externa'], misspellings:['powe bank'],                  englishTerms:['power bank'],          spanishTerms:['batería externa'],        riskOverrideFlags:['contains_lithium_battery'], customerHint:'Puede tener condiciones especiales de transporte.', adminHint:'Revisar capacidad mAh/Wh.' },
    { productKey:'jump_starter',   productName:'Jump Starter',              categoryId:'lithium_batteries_powerbanks',aliases:['jump starter','arrancador portátil'],          misspellings:['jumpstarter'],                englishTerms:['jump starter'],        spanishTerms:['arrancador portátil'],    riskOverrideFlags:['contains_lithium_battery','special_transport'], customerHint:'', adminHint:'Revisar capacidad y restricciones aéreas.' },
    // Networking
    { productKey:'router_wifi',    productName:'Router WiFi',               categoryId:'networking_equipment',       aliases:['router wifi','wifi router'],                    misspellings:['routher'],                    englishTerms:['wifi router'],         spanishTerms:['router wifi'],            riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'mesh_wifi',      productName:'Sistema Mesh WiFi',         categoryId:'networking_equipment',       aliases:['mesh wifi','sistema mesh','eero'],              misspellings:['messh wifi'],                 englishTerms:['mesh wifi system'],    spanishTerms:['sistema mesh wifi'],      riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Telecom
    { productKey:'walkie_talkie',  productName:'Walkie Talkie / Radio',     categoryId:'regulated_telecom',          aliases:['walkie talkie','radio comunicación','handy'],   misspellings:['walky talky'],                englishTerms:['walkie talkie'],       spanishTerms:['walkie talkie'],          riskOverrideFlags:['telecom','radiofrequency_possible'], customerHint:'', adminHint:'Revisar SUTEL.' },
    // Audio
    { productKey:'airpods',        productName:'AirPods / Earbuds',         categoryId:'headphones_audio_personal',  aliases:['airpods','earbuds'],                            misspellings:['airpod','earpod'],            englishTerms:['airpods','earbuds'],   spanishTerms:['audífonos apple'],        riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'headset_gaming', productName:'Headset Gaming',            categoryId:'headphones_audio_personal',  aliases:['headset gaming','audífonos gamer'],             misspellings:['headset gamig'],              englishTerms:['gaming headset'],      spanishTerms:['audífonos gaming'],       riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'bocina_bt',      productName:'Bocina Bluetooth',          categoryId:'speakers_home_audio',        aliases:['bocina bluetooth','speaker bluetooth'],          misspellings:['bozina'],                     englishTerms:['bluetooth speaker'],   spanishTerms:['bocina bluetooth'],       riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'soundbar',       productName:'Soundbar / Barra de Sonido',categoryId:'speakers_home_audio',        aliases:['soundbar','barra de sonido'],                   misspellings:['suonbar'],                    englishTerms:['soundbar'],            spanishTerms:['barra de sonido'],        riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'microfono_usb',  productName:'Micrófono USB / Podcast',   categoryId:'microphones_audio_pro',      aliases:['micrófono usb','micrófono podcast'],            misspellings:['microfono usb'],              englishTerms:['usb microphone'],      spanishTerms:['micrófono podcast'],      riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Cameras
    { productKey:'camara_dslr',    productName:'Cámara DSLR / Mirrorless',  categoryId:'cameras_photo_video',        aliases:['cámara dslr','cámara mirrorless'],              misspellings:['camara dslr'],                englishTerms:['dslr camera'],         spanishTerms:['cámara réflex'],          riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'gopro',          productName:'GoPro / Cámara acción',     categoryId:'cameras_photo_video',        aliases:['gopro','cámara acción','action cam'],           misspellings:['goproo'],                     englishTerms:['gopro'],               spanishTerms:['cámara de acción'],       riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // TV
    { productKey:'smart_tv',       productName:'Smart TV',                  categoryId:'tv_projectors_streaming',    aliases:['smart tv','televisor','tv 4k'],                 misspellings:['televisisor'],                englishTerms:['smart tv'],            spanishTerms:['televisor'],              riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'streaming_box',  productName:'Roku / Fire TV / Apple TV', categoryId:'tv_projectors_streaming',    aliases:['roku','fire tv','apple tv','chromecast'],       misspellings:['cromcast'],                   englishTerms:['roku','chromecast'],   spanishTerms:['dispositivo streaming'],  riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Gaming
    { productKey:'ps5',            productName:'PlayStation 5',             categoryId:'gaming_consoles_electronics',aliases:['ps5','playstation 5'],                          misspellings:['pleistation','ps 5'],         englishTerms:['ps5'],                 spanishTerms:['playstation 5'],          riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'xbox_series',    productName:'Xbox Series X/S',           categoryId:'gaming_consoles_electronics',aliases:['xbox','xbox series x'],                         misspellings:['x box'],                      englishTerms:['xbox series x'],       spanishTerms:['xbox'],                   riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'nintendo_switch',productName:'Nintendo Switch',           categoryId:'gaming_consoles_electronics',aliases:['nintendo switch','switch','nintendo oled'],     misspellings:['nintedo switch'],             englishTerms:['nintendo switch'],     spanishTerms:['switch nintendo'],        riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'steam_deck',     productName:'Steam Deck',                categoryId:'gaming_consoles_electronics',aliases:['steam deck'],                                   misspellings:['steamdeck'],                  englishTerms:['steam deck'],          spanishTerms:['consola portátil'],       riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'silla_gaming',   productName:'Silla Gaming',              categoryId:'gaming_physical_accessories',aliases:['silla gaming','silla gamer'],                   misspellings:['silla gamers'],               englishTerms:['gaming chair'],        spanishTerms:['silla gaming'],           riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Clothing
    { productKey:'camiseta',       productName:'Camiseta / T-shirt',        categoryId:'clothing_general',           aliases:['camiseta','t-shirt','camisa'],                  misspellings:['camizeta'],                   englishTerms:['t-shirt','shirt'],     spanishTerms:['camiseta','camisa'],      riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'jeans',          productName:'Jeans / Pantalón',          categoryId:'clothing_general',           aliases:['jeans','pantalón','vaqueros'],                  misspellings:['yeans'],                      englishTerms:['jeans','pants'],       spanishTerms:['jeans','pantalón'],       riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'hoodie',         productName:'Hoodie / Sudadera',         categoryId:'clothing_general',           aliases:['hoodie','sudadera','sweatshirt'],               misspellings:['hudi'],                       englishTerms:['hoodie'],              spanishTerms:['sudadera'],               riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'leggings',       productName:'Leggings / Ropa deportiva', categoryId:'clothing_general',           aliases:['leggings','ropa deportiva','jogger'],           misspellings:['leggins','legings'],          englishTerms:['leggings'],            spanishTerms:['leggings'],               riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'gorra',          productName:'Gorra / Sombrero / Beanie', categoryId:'clothing_accessories',       aliases:['gorra','sombrero','beanie','cap'],              misspellings:['gora','somrero'],             englishTerms:['cap','hat','beanie'],  spanishTerms:['gorra','sombrero'],       riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'tenis',          productName:'Tenis / Sneakers',          categoryId:'footwear_complete',          aliases:['tenis','sneakers','zapatillas','running shoes'], misspellings:['snikers','sneackers'],        englishTerms:['sneakers','shoes'],    spanishTerms:['tenis','zapatillas'],     riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'zapatos_cuero',  productName:'Zapatos de cuero',          categoryId:'footwear_complete',          aliases:['zapatos cuero','zapatos formales'],             misspellings:['zapato cuero'],               englishTerms:['leather shoes'],       spanishTerms:['zapatos de cuero'],       riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'botas',          productName:'Botas',                     categoryId:'footwear_complete',          aliases:['botas','boots','botas de montaña'],             misspellings:['bota'],                       englishTerms:['boots'],               spanishTerms:['botas'],                  riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'crocs_sandalias',productName:'Crocs / Sandalias',         categoryId:'footwear_complete',          aliases:['crocs','sandalias','chanclas','flip flops'],    misspellings:['zandalias','crocks'],         englishTerms:['crocs','sandals'],     spanishTerms:['crocs','sandalias'],      riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Beauty
    { productKey:'perfume',        productName:'Perfume / Fragancia',       categoryId:'beauty_fragrance',           aliases:['perfume','eau de toilette','fragancia'],        misspellings:['perfum','fragrancia'],        englishTerms:['perfume','fragrance'], spanishTerms:['perfume','fragancia'],    riskOverrideFlags:['liquid','flammable_possible'], customerHint:'', adminHint:'Revisar cantidades y alcohol.' },
    { productKey:'maquillaje',     productName:'Maquillaje / Labial',       categoryId:'beauty_makeup_cosmetics',    aliases:['maquillaje','labial','lip gloss'],              misspellings:['makillaje'],                  englishTerms:['makeup','lipstick'],   spanishTerms:['maquillaje','labial'],    riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'rimel',          productName:'Máscara de Pestañas / Rímel',categoryId:'beauty_makeup_cosmetics',   aliases:['máscara pestañas','rimel','rímel','mascara'],   misspellings:['rimel'],                      englishTerms:['mascara'],             spanishTerms:['máscara de pestañas'],   riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'esmalte_unas',   productName:'Esmalte de Uñas',           categoryId:'beauty_makeup_cosmetics',    aliases:['esmalte','esmalte de uñas','nail polish'],     misspellings:['esmalde'],                    englishTerms:['nail polish'],         spanishTerms:['esmalte de uñas'],        riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'crema_facial',   productName:'Crema Facial / Sérum',      categoryId:'beauty_skincare_personal_care',aliases:['crema facial','sérum','serum'],              misspellings:['serun'],                      englishTerms:['serum','moisturizer'], spanishTerms:['crema facial','sérum'],   riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'shampoo',        productName:'Shampoo / Acondicionador',  categoryId:'beauty_skincare_personal_care',aliases:['shampoo','champú','acondicionador'],          misspellings:['champu'],                     englishTerms:['shampoo'],             spanishTerms:['champú','acondicionador'],riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'protector_solar',productName:'Protector Solar',           categoryId:'beauty_skincare_personal_care',aliases:['protector solar','sunscreen','spf'],          misspellings:['protetor solar'],             englishTerms:['sunscreen','spf'],     spanishTerms:['protector solar'],        riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'secadora_pelo',  productName:'Secadora de Pelo',          categoryId:'beauty_devices',             aliases:['secadora de pelo','hair dryer'],                misspellings:['secaodra pelo'],              englishTerms:['hair dryer'],          spanishTerms:['secadora de pelo'],       riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'plancha_pelo',   productName:'Plancha de Pelo / Rizadora',categoryId:'beauty_devices',             aliases:['plancha de pelo','flat iron','rizadora'],       misspellings:['planca pelo'],                englishTerms:['flat iron'],           spanishTerms:['plancha de pelo'],        riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'rasuradora_el',  productName:'Rasuradora Eléctrica',      categoryId:'beauty_devices',             aliases:['rasuradora','afeitadora','shaver','trimmer'],   misspellings:['rasuraodra'],                 englishTerms:['electric shaver'],     spanishTerms:['rasuradora'],             riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Supplements
    { productKey:'proteina_whey',  productName:'Proteína Whey / Polvo',     categoryId:'supplements_vitamins_nutrition',aliases:['proteína whey','whey protein'],             misspellings:['protenia','wey protein'],     englishTerms:['whey protein'],        spanishTerms:['proteína whey'],          riskOverrideFlags:['supplement','sanitary_review'], customerHint:'Requiere revisión.', adminHint:'Revisar sanitario.' },
    { productKey:'creatina',       productName:'Creatina',                  categoryId:'supplements_vitamins_nutrition',aliases:['creatina','creatine'],                       misspellings:['creatinna'],                  englishTerms:['creatine'],            spanishTerms:['creatina'],               riskOverrideFlags:['supplement'], customerHint:'', adminHint:'' },
    { productKey:'vitaminas',      productName:'Vitaminas / Multivitamínicos',categoryId:'supplements_vitamins_nutrition',aliases:['vitaminas','multivitamínicos','vitamina c'],misspellings:['bitaminas'],                  englishTerms:['vitamins'],            spanishTerms:['vitaminas'],              riskOverrideFlags:['supplement'], customerHint:'', adminHint:'' },
    { productKey:'melatonina',     productName:'Melatonina',                categoryId:'supplements_vitamins_nutrition',aliases:['melatonina','melatonin'],                    misspellings:['melatonina'],                 englishTerms:['melatonin'],           spanishTerms:['melatonina'],             riskOverrideFlags:['supplement','sanitary_review'], customerHint:'', adminHint:'Revisar sanitario.' },
    // Medical
    { productKey:'oximetro',       productName:'Oxímetro',                  categoryId:'medicines_medical_products', aliases:['oxímetro','oximeter','pulsioxímetro'],          misspellings:['oximetro'],                   englishTerms:['oximeter'],            spanishTerms:['oxímetro'],               riskOverrideFlags:['medical'], customerHint:'', adminHint:'' },
    { productKey:'termometro',     productName:'Termómetro Digital',        categoryId:'medicines_medical_products', aliases:['termómetro','thermometer'],                     misspellings:['termometro'],                 englishTerms:['thermometer'],         spanishTerms:['termómetro'],             riskOverrideFlags:['medical'], customerHint:'', adminHint:'' },
    // Home appliances
    { productKey:'cafetera',       productName:'Cafetera / Espresso',       categoryId:'home_kitchen_appliances',    aliases:['cafetera','espresso machine','nespresso'],      misspellings:['cafeterra'],                  englishTerms:['coffee maker'],        spanishTerms:['cafetera'],               riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'air_fryer',      productName:'Air Fryer',                 categoryId:'home_kitchen_appliances',    aliases:['air fryer','freidora de aire','airfryer'],      misspellings:['airfryer'],                   englishTerms:['air fryer'],           spanishTerms:['freidora de aire'],       riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'licuadora',      productName:'Licuadora / Blender',       categoryId:'home_kitchen_appliances',    aliases:['licuadora','blender','batidora'],               misspellings:['licuaodra'],                  englishTerms:['blender'],             spanishTerms:['licuadora'],              riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'microondas',     productName:'Microondas',                categoryId:'home_kitchen_appliances',    aliases:['microondas','microwave'],                       misspellings:['microhondas'],                englishTerms:['microwave'],           spanishTerms:['microondas'],             riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Home decor
    { productKey:'organizador',    productName:'Organizadores / Hogar',     categoryId:'home_decor_storage',         aliases:['organizador','contenedor','decoración hogar'],  misspellings:['oragnizador'],                englishTerms:['organizer'],           spanishTerms:['organizador'],            riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'sabanas_toallas',productName:'Sábanas / Toallas',         categoryId:'home_decor_storage',         aliases:['sábanas','toallas','cobija','edredón'],         misspellings:['sabanas'],                    englishTerms:['sheets','towels'],     spanishTerms:['sábanas','toallas'],      riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Tools
    { productKey:'taladro',        productName:'Taladro / Drill',           categoryId:'tools_hardware_common',      aliases:['taladro','drill','taladro inalámbrico'],        misspellings:['talador'],                    englishTerms:['drill'],               spanishTerms:['taladro'],                riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'sierra',         productName:'Sierra Circular / Caladora',categoryId:'tools_hardware_common',      aliases:['sierra circular','sierra caladora'],            misspellings:['ciearra'],                    englishTerms:['circular saw'],        spanishTerms:['sierra circular'],        riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'set_herramientas',productName:'Set de Herramientas',      categoryId:'tools_hardware_common',      aliases:['set herramientas','kit herramientas'],          misspellings:['kit herramientas'],           englishTerms:['tool set'],            spanishTerms:['set de herramientas'],    riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Chemicals
    { productKey:'aerosol',        productName:'Aerosol / Pintura spray',   categoryId:'chemicals_aerosols_adhesives',aliases:['aerosol','pintura spray','spray paint'],       misspellings:['aerozol'],                    englishTerms:['aerosol','spray paint'],spanishTerms:['aerosol'],                riskOverrideFlags:['aerosol','flammable_possible'], customerHint:'', adminHint:'Revisar DG.' },
    { productKey:'resina',         productName:'Resina Epóxica / Pegamento',categoryId:'chemicals_aerosols_adhesives',aliases:['resina epóxica','epoxy','pegamento fuerte'],    misspellings:['epoxica'],                    englishTerms:['epoxy'],               spanishTerms:['resina epóxica'],         riskOverrideFlags:['chemical'], customerHint:'', adminHint:'Revisar ficha técnica.' },
    // Auto accessories
    { productKey:'dashcam',        productName:'Dashcam / Cámara retroceso',categoryId:'automotive_simple_accessories',aliases:['dashcam','cámara retroceso'],                 misspellings:['dash cam'],                   englishTerms:['dashcam'],             spanishTerms:['dashcam'],                riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'radio_carro',    productName:'Radio de Carro Android',    categoryId:'automotive_simple_accessories',aliases:['radio carro','pantalla carro','car stereo'],   misspellings:['radio carro'],                englishTerms:['car stereo'],          spanishTerms:['radio de carro'],         riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Auto parts
    { productKey:'pastillas_freno',productName:'Pastillas de Freno',        categoryId:'automotive_parts_review',    aliases:['pastillas de freno','brake pads'],              misspellings:['pastillas freno'],            englishTerms:['brake pads'],          spanishTerms:['pastillas de freno'],     riskOverrideFlags:['automotive_part_review'], customerHint:'', adminHint:'Validar clasificación.' },
    { productKey:'sensor_auto',    productName:'Sensor Automotriz',         categoryId:'automotive_parts_review',    aliases:['sensor oxígeno','sensor maf','sensor abs'],     misspellings:['sencor'],                     englishTerms:['oxygen sensor'],       spanishTerms:['sensor de oxígeno'],      riskOverrideFlags:['automotive_part_review'], customerHint:'', adminHint:'Validar clasificación.' },
    // Sports
    { productKey:'yoga_mat',       productName:'Yoga Mat',                  categoryId:'sports_fitness_physical',    aliases:['yoga mat','colchoneta yoga'],                   misspellings:['yoaga mat'],                  englishTerms:['yoga mat'],            spanishTerms:['colchoneta yoga'],        riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'mancuernas',     productName:'Mancuernas / Pesas',        categoryId:'sports_fitness_physical',    aliases:['mancuernas','dumbbells','pesas'],               misspellings:['manquernas'],                 englishTerms:['dumbbells'],           spanishTerms:['mancuernas'],             riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'raqueta',        productName:'Raqueta Tenis / Pádel',     categoryId:'sports_fitness_physical',    aliases:['raqueta tenis','raqueta pádel'],                misspellings:['raqueta'],                    englishTerms:['tennis racket'],       spanishTerms:['raqueta de tenis'],       riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'bicicleta_montana',productName:'Bicicleta montaña / ruta',categoryId:'sports_outdoor_variable',   aliases:['bicicleta de montaña','mountain bike'],         misspellings:['bicicltea'],                  englishTerms:['mountain bike'],       spanishTerms:['bicicleta de montaña'],  riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'smartwatch_dep', productName:'Smartwatch Deportivo',      categoryId:'sports_outdoor_variable',   aliases:['smartwatch deportivo','reloj deportivo','garmin'],misspellings:['smatchwatch'],               englishTerms:['sports watch'],        spanishTerms:['smartwatch deportivo'],   riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'equipo_pesca',   productName:'Equipo de Pesca',           categoryId:'sports_outdoor_variable',   aliases:['caña de pescar','equipo pesca','carrete'],      misspellings:['caña pescar'],                englishTerms:['fishing rod'],         spanishTerms:['caña de pescar'],         riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Toys
    { productKey:'lego',           productName:'LEGO / Bloques construcción',categoryId:'toys_common',               aliases:['lego','bloques','lego set'],                    misspellings:['leggo','legos'],              englishTerms:['lego'],                spanishTerms:['lego'],                   riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'muneca_peluche', productName:'Muñeca / Peluche',          categoryId:'toys_common',                aliases:['muñeca','peluche','doll','barbie'],             misspellings:['muneca','peluch'],            englishTerms:['doll','plush toy'],    spanishTerms:['muñeca','peluche'],       riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'juego_mesa',     productName:'Juego de Mesa / Puzzle',    categoryId:'toys_common',                aliases:['juego de mesa','board game','puzzle'],          misspellings:['puzle'],                      englishTerms:['board game','puzzle'], spanishTerms:['juego de mesa'],          riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Drones
    { productKey:'drone',          productName:'Drone / DJI',               categoryId:'drones_rc_review',           aliases:['drone','dron','dji','quadcopter'],              misspellings:['droon'],                      englishTerms:['drone','quadcopter'],  spanishTerms:['dron'],                   riskOverrideFlags:['drone','lithium_battery','radiofrequency_possible'], customerHint:'Requiere revisión especial.', adminHint:'Revisar DGAC y batería.' },
    { productKey:'carro_rc',       productName:'Carro RC / Control Remoto', categoryId:'drones_rc_review',           aliases:['carro rc','control remoto','rc car'],           misspellings:['carro control remoto'],       englishTerms:['rc car'],              spanishTerms:['carro RC'],               riskOverrideFlags:['radiofrequency_possible'], customerHint:'', adminHint:'Revisar radiofrecuencia.' },
    // Baby
    { productKey:'coche_bebe',     productName:'Coche de Bebé / Stroller',  categoryId:'baby_items',                 aliases:['coche de bebé','stroller','carriola'],          misspellings:['coche bebe'],                 englishTerms:['stroller'],            spanishTerms:['coche de bebé'],          riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'silla_carro_bebe',productName:'Silla de Bebé para Carro', categoryId:'baby_items',                 aliases:['silla de bebé carro','car seat'],               misspellings:['silla bebe'],                 englishTerms:['car seat'],            spanishTerms:['silla para bebé'],        riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'biberon',        productName:'Biberón / Chupón',          categoryId:'baby_items',                 aliases:['biberón','chupón','biberon','pacifier'],        misspellings:['biberone','chupoon'],         englishTerms:['baby bottle'],         spanishTerms:['biberón','chupón'],       riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Pets
    { productKey:'collar_mascota', productName:'Collar / Arnés para Mascota',categoryId:'pet_accessories',            aliases:['collar mascota','arnés mascota','dog collar'],  misspellings:['arnes'],                      englishTerms:['dog collar','harness'],spanishTerms:['collar de mascota'],      riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cama_mascota',   productName:'Cama para Mascota',         categoryId:'pet_accessories',            aliases:['cama mascota','cama perro','dog bed'],          misspellings:['cama masocta'],               englishTerms:['dog bed'],             spanishTerms:['cama de mascota'],        riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'comida_mascota', productName:'Comida para Mascota',       categoryId:'pet_food_supplements_review',aliases:['comida mascota','dog food','cat food'],          misspellings:['comida perro'],               englishTerms:['dog food','cat food'], spanishTerms:['comida para mascota'],    riskOverrideFlags:['pet_food','sanitary_review'], customerHint:'Requiere revisión.', adminHint:'Revisar SENASA.' },
    // Books
    { productKey:'libro',          productName:'Libro / Manual',            categoryId:'books_printed_material',     aliases:['libro','book','manual','textbook'],             misspellings:['livro'],                      englishTerms:['book'],                spanishTerms:['libro'],                  riskOverrideFlags:['printed_material_review'], customerHint:'', adminHint:'Validar tratamiento arancelario.' },
    { productKey:'manga_comic',    productName:'Manga / Comic',             categoryId:'books_printed_material',     aliases:['manga','comic','cómic'],                        misspellings:['comik','maga'],               englishTerms:['manga','comic book'],  spanishTerms:['manga','cómic'],          riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Office
    { productKey:'cuaderno',       productName:'Cuaderno / Agenda',         categoryId:'office_stationery_art',      aliases:['cuaderno','agenda','planner'],                  misspellings:['agend'],                      englishTerms:['notebook','planner'],  spanishTerms:['cuaderno','agenda'],      riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'lapices',        productName:'Lápices / Marcadores',      categoryId:'office_stationery_art',      aliases:['lápices','marcadores','colored pencils'],       misspellings:['lapices'],                    englishTerms:['colored pencils'],     spanishTerms:['lápices de color'],       riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'silla_oficina',  productName:'Silla de Oficina',          categoryId:'office_stationery_art',      aliases:['silla de oficina','office chair'],              misspellings:['silla ofisina'],              englishTerms:['office chair'],        spanishTerms:['silla de oficina'],       riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Bags
    { productKey:'mochila',        productName:'Mochila / Bolso',           categoryId:'bags_luggage_accessories',   aliases:['mochila','bolso','backpack','purse'],           misspellings:['mochilla','mochia'],          englishTerms:['backpack','bag'],      spanishTerms:['mochila','bolso'],        riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'maleta',         productName:'Maleta de Viaje',           categoryId:'bags_luggage_accessories',   aliases:['maleta','suitcase','luggage'],                  misspellings:['valija'],                     englishTerms:['suitcase','luggage'],  spanishTerms:['maleta de viaje'],        riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'billetera',      productName:'Billetera / Cartera',       categoryId:'bags_luggage_accessories',   aliases:['billetera','cartera','wallet'],                 misspellings:['biieltera'],                  englishTerms:['wallet'],              spanishTerms:['billetera'],              riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // Watches / Jewelry
    { productKey:'reloj',          productName:'Reloj Analógico / Digital', categoryId:'watches_jewelry',            aliases:['reloj','watch','reloj analógico'],              misspellings:['relioj'],                     englishTerms:['watch'],               spanishTerms:['reloj'],                  riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'joyeria',        productName:'Joyería Plata / Oro',       categoryId:'watches_jewelry',            aliases:['joyería','anillo','collar joyería','aretes'],   misspellings:['joyeria'],                    englishTerms:['jewelry'],             spanishTerms:['joyería'],                riskOverrideFlags:['precious_metal_possible'], customerHint:'', adminHint:'Metales preciosos: revisar.' },
    // Eyewear
    { productKey:'lentes_sol',     productName:'Lentes de Sol',             categoryId:'eyewear_optical',            aliases:['lentes de sol','gafas','sunglasses'],           misspellings:['gazas'],                      englishTerms:['sunglasses'],          spanishTerms:['lentes de sol'],          riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'monturas',       productName:'Monturas / Lentes Ópticos', categoryId:'eyewear_optical',            aliases:['monturas','lentes ópticos','frames'],           misspellings:['monturras'],                  englishTerms:['eyeglass frames'],     spanishTerms:['monturas'],               riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'lentes_contacto',productName:'Lentes de Contacto',        categoryId:'eyewear_medical_contact_lenses',aliases:['lentes de contacto','contact lenses'],      misspellings:['lentilals'],                  englishTerms:['contact lenses'],     spanishTerms:['lentes de contacto'],    riskOverrideFlags:['optical_medical','sanitary_review'], customerHint:'Requiere revisión.', adminHint:'Revisar sanitario.' },
    // Food
    { productKey:'snacks',         productName:'Snacks / Chocolates',       categoryId:'food_beverages_review',      aliases:['snacks','chocolate','dulces','galletas'],       misspellings:['snaks'],                      englishTerms:['snacks','candy'],      spanishTerms:['snacks','dulces'],        riskOverrideFlags:['food','sanitary_review'], customerHint:'Requiere revisión.', adminHint:'Validar SENASA.' },
    { productKey:'cafe',           productName:'Café / Té importado',       categoryId:'food_beverages_review',      aliases:['café','coffee','té','tea'],                     misspellings:['cafe'],                       englishTerms:['coffee','tea'],        spanishTerms:['café','té'],              riskOverrideFlags:['food'], customerHint:'', adminHint:'' },
    // Alcohol / Tobacco
    { productKey:'vino',           productName:'Vino / Cerveza / Licor',    categoryId:'alcohol_tobacco_vape_review',aliases:['vino','cerveza','licor','alcohol','wine'],      misspellings:['alchol'],                     englishTerms:['wine','beer','liquor'],spanishTerms:['vino','cerveza','licor'],  riskOverrideFlags:['alcohol','restricted_possible'], customerHint:'Requiere revisión.', adminHint:'Validar política CRBOX.' },
    { productKey:'vape',           productName:'Vape / Nicotina',           categoryId:'alcohol_tobacco_vape_review',aliases:['vape','e-cigarette','nicotina','juul'],         misspellings:['vap'],                        englishTerms:['vape','e-cigarette'],  spanishTerms:['vape'],                   riskOverrideFlags:['nicotine','restricted_possible'], customerHint:'Requiere revisión.', adminHint:'Validar política CRBOX.' },
    // Plants
    { productKey:'semillas',       productName:'Semillas / Plantas / Agro', categoryId:'plants_seeds_agro_review',   aliases:['semillas','plantas','seeds','fertilizante'],    misspellings:['semias'],                     englishTerms:['seeds','plants'],      spanishTerms:['semillas','plantas'],     riskOverrideFlags:['agro','phytosanitary_review'], customerHint:'Requiere revisión.', adminHint:'Validar fitosanitario SFE.' },
    // Weapons
    { productKey:'pistola_co2',    productName:'Pistola CO2 / Táctica',     categoryId:'weapons_restricted',         aliases:['pistola co2','cuchillo táctico','airsoft','balines'],misspellings:['pistola'],               englishTerms:['co2 gun','airsoft'],   spanishTerms:['pistola CO2'],            riskOverrideFlags:['weapon','restricted_item'], customerHint:'Puede ser restringido.', adminHint:'Escalar a revisión.' },
    // Dangerous goods
    { productKey:'explosivos',        productName:'Explosivos / Inflamables',       categoryId:'dangerous_goods',                aliases:['explosivo','inflamable','peligroso','hazmat'],          misspellings:['explosibo'],                        englishTerms:['explosive','flammable'],        spanishTerms:['explosivo','inflamable'],         riskOverrideFlags:['dangerous_goods','flammable'],         customerHint:'Restricciones de transporte.',          adminHint:'Revisar DG y carrier.' },
    // Fallback
    { productKey:'desconocido',       productName:'Producto no identificado',        categoryId:'unknown_manual_review',           aliases:['otro','no sé','no identificado'],                       misspellings:[],                                   englishTerms:['other','unknown'],              spanishTerms:['otro'],                           riskOverrideFlags:['unknown'],                             customerHint:'Comparta el link de su producto para revisión.', adminHint:'Clasificar manualmente.' },

    // ── Additional clothing rows ────────────────────────────────────────────
    { productKey:'camisa_formal',     productName:'Camisa Formal / Blusa',          categoryId:'clothing_general',                aliases:['camisa formal','camisa lino','blusa','polo'],           misspellings:['camiza','blouza'],                   englishTerms:['dress shirt','blouse','polo'],  spanishTerms:['camisa formal','blusa'],          riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'vestido',           productName:'Vestido',                         categoryId:'clothing_general',                aliases:['vestido casual','vestido formal','dress'],              misspellings:['bestido'],                           englishTerms:['dress'],                       spanishTerms:['vestido'],                        riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'pantalon_deportivo',productName:'Pantalón Deportivo / Jogger',    categoryId:'clothing_general',                aliases:['jogger','pantalón deportivo','sweatpants'],             misspellings:['pantalon deportivo'],                englishTerms:['sweatpants','jogger'],          spanishTerms:['pantalón deportivo'],             riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'ropa_interior',     productName:'Ropa Interior / Boxer / Brasier',categoryId:'clothing_general',                aliases:['boxer','calzoncillos','brasier','bra','underwear'],     misspellings:['boxers'],                            englishTerms:['underwear','boxer','bra'],      spanishTerms:['ropa interior','brasier'],        riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'medias_calcetines', productName:'Medias / Calcetines',            categoryId:'clothing_general',                aliases:['medias','calcetines','socks'],                          misspellings:['calzetines','medeas'],               englishTerms:['socks'],                       spanishTerms:['calcetines','medias'],            riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'traje_bano',        productName:'Traje de Baño / Bikini',         categoryId:'clothing_general',                aliases:['traje baño','bikini','bañador','swimwear'],             misspellings:['bañador','bikinis'],                 englishTerms:['swimwear','swimsuit','bikini'],  spanishTerms:['traje de baño','bikini'],         riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'abrigo_jacket',     productName:'Abrigo / Jacket / Blazer',       categoryId:'clothing_general',                aliases:['abrigo','jacket','blazer','chaqueta','coat'],           misspellings:['chaqueta'],                          englishTerms:['jacket','coat','blazer'],       spanishTerms:['abrigo','chaqueta'],              riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'pijama',            productName:'Pijama / Bata',                  categoryId:'clothing_general',                aliases:['pijama','pyjamas','bata','ropa dormir'],                misspellings:['pijamas','piyama'],                  englishTerms:['pajamas','pyjamas'],            spanishTerms:['pijama','bata'],                  riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional clothing accessories rows ─────────────────────────────────
    { productKey:'bufanda_guantes',   productName:'Bufanda / Guantes / Corbata',    categoryId:'clothing_accessories',            aliases:['bufanda','guantes','corbata','scarf','gloves'],         misspellings:['corbatta','bufandas'],               englishTerms:['scarf','gloves','tie'],         spanishTerms:['bufanda','guantes'],              riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'cinturon',          productName:'Cinturón / Belt',                categoryId:'clothing_accessories',            aliases:['cinturón','cinturon','belt','correa'],                  misspellings:['zinturon'],                          englishTerms:['belt'],                        spanishTerms:['cinturón'],                       riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional footwear rows ──────────────────────────────────────────────
    { productKey:'zapatos_running',   productName:'Zapatos Running / Fútbol',       categoryId:'footwear_complete',               aliases:['zapatos running','zapatos fútbol','spikes','track shoes'],misspellings:['runnig shoes'],                    englishTerms:['running shoes','cleats'],       spanishTerms:['zapatos de fútbol','zapatos running'], riskOverrideFlags:[],                                 customerHint:'',                                      adminHint:'' },
    { productKey:'tacones',           productName:'Tacones / Zapatos Plataforma',   categoryId:'footwear_complete',               aliases:['tacones','zapatos plataforma','heels','pumps'],         misspellings:['takones'],                           englishTerms:['heels','pumps','platform shoes'],spanishTerms:['tacones','zapatos de plataforma'],riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'pantuflas',         productName:'Pantuflas / Zapatos bebé',       categoryId:'footwear_complete',               aliases:['pantuflas','slippers','zapatos bebé','zapatos niño'],   misspellings:['pantufas'],                          englishTerms:['slippers','baby shoes'],        spanishTerms:['pantuflas','zapatos de niño'],    riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional headphones rows ────────────────────────────────────────────
    { productKey:'headphones_cable',  productName:'Audífonos Cableados / Over-ear', categoryId:'headphones_audio_personal',       aliases:['audífonos cableados','over-ear headphones','cascos'],   misspellings:['audifonos'],                         englishTerms:['over-ear headphones','wired headphones'],spanishTerms:['audífonos cableados'],      riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional speakers rows ──────────────────────────────────────────────
    { productKey:'amplificador',      productName:'Amplificador / Subwoofer',       categoryId:'speakers_home_audio',             aliases:['amplificador','subwoofer','receiver','parlantes escritorio'],misspellings:['amplficador'],                   englishTerms:['amplifier','subwoofer','receiver'],spanishTerms:['amplificador','subwoofer'],       riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'tocadiscos',        productName:'Tocadiscos / Barra de Sonido',   categoryId:'speakers_home_audio',             aliases:['tocadiscos','turntable','soundbar barra'],              misspellings:['tocadisco'],                         englishTerms:['turntable','record player'],    spanishTerms:['tocadiscos'],                     riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional microphone row ─────────────────────────────────────────────
    { productKey:'interfaz_audio',    productName:'Interfaz de Audio / Mezcladora', categoryId:'microphones_audio_pro',           aliases:['interfaz audio','audio interface','mezcladora','mixer'],  misspellings:['intrefaz audio'],                   englishTerms:['audio interface','mixer'],      spanishTerms:['interfaz de audio','mezcladora'], riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'Puede requerir clasificación variable.' },

    // ── Additional camera rows ────────────────────────────────────────────────
    { productKey:'camara_instantanea',productName:'Cámara Instantánea',             categoryId:'cameras_photo_video',             aliases:['cámara instantánea','instax','polaroid'],               misspellings:['camara instantanea'],                englishTerms:['instant camera','polaroid'],    spanishTerms:['cámara instantánea'],             riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'lente_camara',      productName:'Lente de Cámara / Filtro',       categoryId:'cameras_photo_video',             aliases:['lente cámara','lente 50mm','filtro lente','lens'],       misspellings:['lente camara'],                      englishTerms:['camera lens','lens filter'],    spanishTerms:['lente de cámara'],                riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'tripode_gimbal',    productName:'Trípode / Gimbal / Monopod',     categoryId:'cameras_photo_video',             aliases:['trípode','gimbal','monopod','soporte cámara'],          misspellings:['tripode','gimble'],                  englishTerms:['tripod','gimbal'],              spanishTerms:['trípode','estabilizador'],        riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'luz_fotografia',    productName:'Luz de Fotografía / Softbox',    categoryId:'cameras_photo_video',             aliases:['luz fotografía','softbox','reflector','ring light'],     misspellings:['luz fotografia'],                    englishTerms:['softbox','ring light'],         spanishTerms:['luz de fotografía','softbox'],    riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional TV / streaming row ─────────────────────────────────────────
    { productKey:'proyector',         productName:'Proyector / Mini Proyector',     categoryId:'tv_projectors_streaming',         aliases:['proyector','mini proyector','projector','pantalla proyector'],misspellings:['proyetor'],                    englishTerms:['projector'],                   spanishTerms:['proyector'],                      riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional gaming rows ────────────────────────────────────────────────
    { productKey:'control_ps',        productName:'Control PlayStation / Xbox',     categoryId:'gaming_consoles_electronics',     aliases:['control ps5','control xbox','mando','gamepad'],          misspellings:['controler'],                         englishTerms:['controller','gamepad'],         spanishTerms:['control','mando'],                riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'meta_quest',        productName:'Meta Quest / Visor VR',          categoryId:'gaming_consoles_electronics',     aliases:['meta quest','oculus','vr headset','visor vr'],          misspellings:['meta cuest','okuluss'],              englishTerms:['meta quest','vr headset'],      spanishTerms:['visor vr','meta quest'],          riskOverrideFlags:['battery_possible'],                    customerHint:'',                                      adminHint:'Revisar batería y radiofrecuencia.' },
    { productKey:'volante_gaming',    productName:'Volante / Joystick Gaming',      categoryId:'gaming_physical_accessories',     aliases:['volante gaming','joystick','flight stick','pedales gaming'],misspellings:['bolante gaming'],                 englishTerms:['racing wheel','joystick'],      spanishTerms:['volante gaming','joystick'],      riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'mousepad_gaming',   productName:'Mousepad Gaming / Grande',       categoryId:'gaming_physical_accessories',     aliases:['mousepad gaming','mouse pad grande','desk mat'],        misspellings:['mouse pad'],                         englishTerms:['gaming mousepad','desk mat'],   spanishTerms:['mousepad gaming'],                riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional networking row ─────────────────────────────────────────────
    { productKey:'modem_switch',      productName:'Módem / Switch de Red',          categoryId:'networking_equipment',            aliases:['módem','modem','switch red','access point'],            misspellings:['modem'],                             englishTerms:['modem','network switch'],       spanishTerms:['módem','switch de red'],          riskOverrideFlags:['telecom_possible'],                    customerHint:'',                                      adminHint:'' },

    // ── Additional charger rows ───────────────────────────────────────────────
    { productKey:'cable_usbc',        productName:'Cable USB-C / Micro USB',        categoryId:'chargers_cables_adapters',        aliases:['cable usb-c','cable micro usb','cable de carga'],        misspellings:['cable usbc'],                        englishTerms:['usb-c cable','micro usb cable'],spanishTerms:['cable de carga'],                 riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'cargador_magsafe',  productName:'Cargador MagSafe / Laptop',      categoryId:'chargers_cables_adapters',        aliases:['cargador magsafe','cargador laptop','charger laptop'],   misspellings:['magsafe'],                           englishTerms:['magsafe charger','laptop charger'],spanishTerms:['cargador laptop'],              riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional battery rows ───────────────────────────────────────────────
    { productKey:'power_station',     productName:'Power Station / UPS portátil',   categoryId:'lithium_batteries_powerbanks',    aliases:['power station','estación energía','portable generator','ups'],misspellings:['powe station'],                 englishTerms:['power station','portable ups'],  spanishTerms:['estación de energía'],            riskOverrideFlags:['contains_lithium_battery','special_transport'], customerHint:'Puede tener condiciones especiales de transporte.', adminHint:'Revisar capacidad Wh y restricciones.' },

    // ── Additional storage row ────────────────────────────────────────────────
    { productKey:'ram_memoria',       productName:'Memoria RAM / DIMM',             categoryId:'storage_memory',                  aliases:['memoria ram','ram','dimm','so-dimm'],                   misspellings:['RAM memoria'],                       englishTerms:['ram','memory module'],          spanishTerms:['memoria RAM'],                    riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional computer accessories rows ──────────────────────────────────
    { productKey:'teclado_inalambrico',productName:'Teclado Inalámbrico / Trackpad',categoryId:'computer_accessories',            aliases:['teclado inalámbrico','wireless keyboard','trackpad'],   misspellings:['teclado inalaambrico'],              englishTerms:['wireless keyboard','trackpad'], spanishTerms:['teclado inalámbrico'],            riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'adaptador_ethernet',productName:'Adaptador Ethernet / Capturadora',categoryId:'computer_accessories',           aliases:['adaptador ethernet','capturadora video','video capture'],misspellings:['adaptador eternet'],               englishTerms:['ethernet adapter','video capture'],spanishTerms:['adaptador ethernet'],           riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'cooler_cpu',        productName:'Cooler CPU / Ventilador PC',     categoryId:'computer_accessories',            aliases:['cooler cpu','ventilador pc','fan pc','gabinete'],       misspellings:['cooler'],                            englishTerms:['cpu cooler','pc fan'],          spanishTerms:['cooler cpu','ventilador PC'],     riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional home appliance rows ────────────────────────────────────────
    { productKey:'tostadora',         productName:'Tostadora / Sandwichera / Waffle',categoryId:'home_kitchen_appliances',        aliases:['tostadora','sandwichera','waffle maker','oven toast'],  misspellings:['tostdora'],                          englishTerms:['toaster','sandwich maker'],     spanishTerms:['tostadora','sandwichera'],        riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'hervidor',          productName:'Hervidor / Olla Eléctrica',       categoryId:'home_kitchen_appliances',        aliases:['hervidor','kettle','olla arrocera','slow cooker'],       misspellings:['herbidor'],                          englishTerms:['kettle','rice cooker'],         spanishTerms:['hervidor','olla arrocera'],        riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'extractor_jugos',   productName:'Extractor de Jugos / Balanza',   categoryId:'home_kitchen_appliances',        aliases:['extractor jugos','juicer','balanza cocina','kitchen scale'],misspellings:['extractor de jugos'],             englishTerms:['juicer','kitchen scale'],       spanishTerms:['extractor de jugos'],             riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional home decor rows ────────────────────────────────────────────
    { productKey:'vajilla_cubiertos', productName:'Vajilla / Cubiertos / Vasos',    categoryId:'home_decor_storage',              aliases:['vajilla','cubiertos','vasos','platos','tazas'],          misspellings:['bajilla'],                           englishTerms:['dishes','cutlery','glasses'],   spanishTerms:['vajilla','cubiertos','vasos'],    riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'cortinas',          productName:'Cortinas / Alfombra / Almohada', categoryId:'home_decor_storage',              aliases:['cortinas','alfombra','almohada','curtains','rug'],       misspellings:['kortinas'],                          englishTerms:['curtains','rug','pillow'],      spanishTerms:['cortinas','alfombra','almohada'], riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'lampara_decorativa',productName:'Lámpara / Tira LED / Decoración',categoryId:'home_decor_storage',              aliases:['lámpara','tiras led','decoración pared','cuadro'],       misspellings:['lampara'],                           englishTerms:['lamp','led strip','wall art'],  spanishTerms:['lámpara','tiras LED','decoración'],riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'difusor_vela',      productName:'Difusor / Vela / Aromaterapia',  categoryId:'home_decor_storage',              aliases:['difusor aroma','vela decorativa','aromaterapia'],        misspellings:['difusor'],                           englishTerms:['diffuser','candle','aromatherapy'],spanishTerms:['difusor','vela'],              riskOverrideFlags:['liquid','flammable_possible'],         customerHint:'',                                      adminHint:'Líquidos/velas: revisar transporte.' },

    // ── Additional tools rows ─────────────────────────────────────────────────
    { productKey:'destornillador_el', productName:'Destornillador Eléctrico / Dremel',categoryId:'tools_hardware_common',        aliases:['destornillador eléctrico','dremel','lijadora','pulidora'],misspellings:['destornillador electrico'],         englishTerms:['electric screwdriver','dremel'],spanishTerms:['destornillador eléctrico'],       riskOverrideFlags:['battery_possible'],                    customerHint:'',                                      adminHint:'' },
    { productKey:'pistola_silicon',   productName:'Pistola de Silicón / Calor',     categoryId:'tools_hardware_common',           aliases:['pistola silicón','pistola calor','hot glue gun'],        misspellings:['pistola silicon'],                   englishTerms:['glue gun','heat gun'],          spanishTerms:['pistola de silicón'],             riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'multimetro',        productName:'Multímetro / Nivel Láser',       categoryId:'tools_hardware_common',           aliases:['multímetro','nivel láser','tester voltaje'],             misspellings:['multimetro'],                        englishTerms:['multimeter','laser level'],     spanishTerms:['multímetro','nivel láser'],       riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional automotive accessory rows ─────────────────────────────────
    { productKey:'alfombra_carro',    productName:'Alfombras / Forros de Carro',    categoryId:'automotive_simple_accessories',   aliases:['alfombras carro','forros asiento','cobertor volante'],  misspellings:['alfombra carro'],                    englishTerms:['car mats','seat covers'],       spanishTerms:['alfombras de carro'],             riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'soporte_celular',   productName:'Soporte Celular / Cargador Auto',categoryId:'automotive_simple_accessories',   aliases:['soporte celular carro','cargador carro','car mount'],    misspellings:['soporte celullar'],                  englishTerms:['car phone mount','car charger'], spanishTerms:['soporte para celular en carro'],  riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'compresor_aire',    productName:'Compresor de Aire Portátil',     categoryId:'automotive_simple_accessories',   aliases:['compresor aire','air compressor','inflador'],            misspellings:['comprensor'],                        englishTerms:['portable air compressor'],      spanishTerms:['compresor de aire portátil'],     riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional automotive parts rows ─────────────────────────────────────
    { productKey:'filtro_aceite',     productName:'Filtro de Aceite / Aire / Bujías',categoryId:'automotive_parts_review',       aliases:['filtro aceite','filtro aire','bujías','spark plugs'],   misspellings:['filtro aceite'],                     englishTerms:['oil filter','air filter','spark plugs'],spanishTerms:['filtro de aceite','bujías'],    riskOverrideFlags:['automotive_part_review'],               customerHint:'Requiere revisión.',                    adminHint:'Validar clasificación.' },
    { productKey:'llantas_aros',      productName:'Llantas / Aros / Casco Moto',    categoryId:'automotive_parts_review',         aliases:['llantas','aros','tires','rims','casco moto','motorcycle helmet'],misspellings:['gomas'],                     englishTerms:['tires','rims','motorcycle helmet'],spanishTerms:['llantas','aros','casco moto'],    riskOverrideFlags:['automotive_part_review'],               customerHint:'Requiere revisión.',                    adminHint:'Validar clasificación y dimensiones.' },

    // ── Additional sports rows ────────────────────────────────────────────────
    { productKey:'kettlebell',        productName:'Kettlebell / Guantes Gimnasio',  categoryId:'sports_fitness_physical',         aliases:['kettlebell','guantes gimnasio','cinturón gimnasio'],     misspellings:['ketlbell'],                          englishTerms:['kettlebell','gym gloves'],      spanishTerms:['kettlebell','guantes de gimnasio'],riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'pelota',            productName:'Pelota Fútbol / Basketball / Tenis',categoryId:'sports_fitness_physical',      aliases:['pelota fútbol','pelota basketball','pelota tenis','balón'],misspellings:['pelota'],                          englishTerms:['soccer ball','basketball','tennis ball'],spanishTerms:['pelota','balón'],            riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'mochila_hiking',    productName:'Mochila Hiking / Sleeping Bag',  categoryId:'sports_fitness_physical',         aliases:['mochila hiking','sleeping bag','tienda campaña','headlamp'],misspellings:['mochila hiking'],                 englishTerms:['hiking backpack','sleeping bag'],spanishTerms:['mochila de camping','saco de dormir'],riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'natacion',          productName:'Accesorios de Natación',         categoryId:'sports_fitness_physical',         aliases:['gafas natación','aletas','tabla natación','swimming'],   misspellings:['natacion'],                          englishTerms:['swimming goggles','swim fins'],  spanishTerms:['gafas de natación','aletas'],     riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional outdoor/bike rows ──────────────────────────────────────────
    { productKey:'casco_bicicleta',   productName:'Casco / Accesorios Bicicleta',   categoryId:'sports_outdoor_variable',         aliases:['casco bicicleta','luces bicicleta','candado bicicleta'], misspellings:['casco bici'],                        englishTerms:['bike helmet','bike lights'],     spanishTerms:['casco de bicicleta','luces bici'],riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'banda_cardiaca',    productName:'Banda Cardíaca / Gafas deportivas',categoryId:'sports_outdoor_variable',       aliases:['banda cardíaca','heart rate monitor','gafas deportivas'],misspellings:['banda cardiaca'],                   englishTerms:['heart rate monitor','sports glasses'],spanishTerms:['banda cardíaca'],              riskOverrideFlags:['battery_possible'],                    customerHint:'',                                      adminHint:'' },

    // ── Additional toy rows ───────────────────────────────────────────────────
    { productKey:'figura_accion',     productName:'Figura de Acción / Coleccionable',categoryId:'toys_common',                   aliases:['figura acción','action figure','funko pop','coleccionable'],misspellings:['figura accion'],                  englishTerms:['action figure','funko pop'],     spanishTerms:['figura de acción','coleccionable'],riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'patineta',          productName:'Patineta / Scooter / Patines',    categoryId:'toys_common',                    aliases:['patineta','scooter','skateboard','patines','skate'],    misspellings:['skeitboard'],                        englishTerms:['skateboard','scooter','rollerblade'],spanishTerms:['patineta','scooter','patines'],riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'set_arte_infantil', productName:'Set Arte Infantil / Plastilina',  categoryId:'toys_common',                    aliases:['set arte','plastilina','slime','crayon','crayones'],    misspellings:['plastelina'],                        englishTerms:['art set','clay','slime'],       spanishTerms:['set de arte','plastilina'],        riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional baby rows ──────────────────────────────────────────────────
    { productKey:'cuna_portatil',     productName:'Cuna Portátil / Monitor Bebé',   categoryId:'baby_items',                     aliases:['cuna portátil','monitor bebé','baby monitor','pack n play'],misspellings:['cuna portatil'],                 englishTerms:['portable crib','baby monitor'], spanishTerms:['cuna portátil','monitor de bebé'],riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'panalera',          productName:'Pañalera / Mochila Bebé',        categoryId:'baby_items',                     aliases:['pañalera','mochila bebé','diaper bag'],                 misspellings:['panialera'],                         englishTerms:['diaper bag','baby backpack'],   spanishTerms:['pañalera','mochila de bebé'],     riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional pet accessory rows ─────────────────────────────────────────
    { productKey:'juguete_mascota',   productName:'Juguete Mascota / Rascador',     categoryId:'pet_accessories',                aliases:['juguete mascota','rascador gato','pet toy','cepillo mascota'],misspellings:['juguete perro'],               englishTerms:['pet toy','cat scratcher'],      spanishTerms:['juguete para mascota'],           riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'fuente_mascota',    productName:'Fuente Agua / Comedero Mascota', categoryId:'pet_accessories',                aliases:['fuente agua mascota','comedero mascota','pet fountain'],  misspellings:['fuente mascota'],                    englishTerms:['pet fountain','pet feeder'],    spanishTerms:['fuente de agua para mascotas'],   riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional supplement rows ────────────────────────────────────────────
    { productKey:'omega3_colageno',   productName:'Omega 3 / Colágeno / BCAA',      categoryId:'supplements_vitamins_nutrition',  aliases:['omega 3','colágeno','bcaa','aminoácidos','collagen'],    misspellings:['omega3','colageno'],                 englishTerms:['omega 3','collagen','bcaa'],    spanishTerms:['omega 3','colágeno'],             riskOverrideFlags:['supplement','sanitary_review'],        customerHint:'Requiere revisión.',                    adminHint:'Revisar sanitario.' },
    { productKey:'pre_workout',       productName:'Pre-Workout / Electrolitos',      categoryId:'supplements_vitamins_nutrition',  aliases:['pre-workout','preworkout','electrolitos','electrolytes'], misspellings:['preworkout'],                        englishTerms:['pre-workout','electrolytes'],   spanishTerms:['pre-workout','electrolitos'],     riskOverrideFlags:['supplement','sanitary_review'],        customerHint:'Requiere revisión.',                    adminHint:'Revisar sanitario.' },

    // ── Additional medical rows ───────────────────────────────────────────────
    { productKey:'tensiometro',       productName:'Tensiómetro / Glucómetro',       categoryId:'medicines_medical_products',       aliases:['tensiómetro','glucómetro','blood pressure monitor'],    misspellings:['tensiometro','glucometro'],           englishTerms:['blood pressure monitor','glucometer'],spanishTerms:['tensiómetro','glucómetro'],    riskOverrideFlags:['medical'],                             customerHint:'',                                      adminHint:'Revisar si requiere registro sanitario.' },
    { productKey:'nebulizador',       productName:'Nebulizador / Jeringas / Test',  categoryId:'medicines_medical_products',       aliases:['nebulizador','jeringas','test embarazo','test covid'],   misspellings:['nebulizaor'],                        englishTerms:['nebulizer','syringes','pregnancy test'],spanishTerms:['nebulizador','jeringas'],      riskOverrideFlags:['medical','sanitary_review'],           customerHint:'Requiere revisión.',                    adminHint:'Revisión obligatoria.' },

    // ── Additional office rows ────────────────────────────────────────────────
    { productKey:'calculadora_tijeras',productName:'Calculadora / Tijeras / Regla', categoryId:'office_stationery_art',           aliases:['calculadora','tijeras','regla','compass'],              misspellings:['calculaodra'],                       englishTerms:['calculator','scissors','ruler'],spanishTerms:['calculadora','tijeras'],          riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'canvas_pinceles',   productName:'Canvas / Pinceles / Arte',       categoryId:'office_stationery_art',           aliases:['canvas','pinceles','papel dibujo','art supplies'],       misspellings:['canvass'],                           englishTerms:['canvas','art brushes','drawing paper'],spanishTerms:['canvas','pinceles'],          riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },
    { productKey:'escritorio',        productName:'Escritorio / Soporte Laptop',    categoryId:'office_stationery_art',           aliases:['escritorio pequeño','soporte laptop','laptop stand','desk'],misspellings:['escritoiro'],                    englishTerms:['small desk','laptop stand'],    spanishTerms:['escritorio','soporte para laptop'],riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional bags/luggage rows ──────────────────────────────────────────
    { productKey:'bolso_cuero',       productName:'Bolso de Cuero / Tote Bag',      categoryId:'bags_luggage_accessories',        aliases:['bolso cuero','tote bag','bolsa de mano','clutch'],       misspellings:['bolso cuero'],                       englishTerms:['leather bag','tote bag','clutch'],spanishTerms:['bolso de cuero','tote'],         riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'Cuero puede requerir validación.' },
    { productKey:'neceser',           productName:'Neceser / Estuche Viaje',        categoryId:'bags_luggage_accessories',        aliases:['neceser','estuche viaje','pouch','travel kit'],          misspellings:['nezeser'],                           englishTerms:['travel pouch','cosmetic bag'],  spanishTerms:['neceser','estuche de viaje'],     riskOverrideFlags:[],                                      customerHint:'',                                      adminHint:'' },

    // ── Additional watches/jewelry rows ──────────────────────────────────────
    { productKey:'smartwatch_gen',    productName:'Smartwatch / Correa Reloj',      categoryId:'watches_jewelry',                 aliases:['smartwatch','apple watch','galaxy watch','correa reloj'], misspellings:['smarthwatch'],                      englishTerms:['smartwatch','watch band'],      spanishTerms:['smartwatch','correa de reloj'],   riskOverrideFlags:['battery_possible'],                    customerHint:'',                                      adminHint:'' },
    { productKey:'anillo_aretes',     productName:'Anillo / Aretes / Pulsera',      categoryId:'watches_jewelry',                 aliases:['anillo','aretes','pulsera','collar joyería'],            misspellings:['arete'],                             englishTerms:['ring','earrings','bracelet'],   spanishTerms:['anillo','aretes','pulsera'],      riskOverrideFlags:['precious_metal_possible'],             customerHint:'',                                      adminHint:'Metales preciosos: revisar.' },

    // ── Additional eyewear row ────────────────────────────────────────────────
    { productKey:'gafas_deportivas',  productName:'Gafas Deportivas / Ópticos',     categoryId:'eyewear_optical',                 aliases:['gafas deportivas','lentes ópticos medicados','frames'],  misspellings:['gafas'],                             englishTerms:['sports glasses','optical frames'],spanishTerms:['gafas deportivas'],              riskOverrideFlags:['optical_possible'],                    customerHint:'',                                      adminHint:'' },

    // ── Additional food/beverage rows ─────────────────────────────────────────
    { productKey:'salsas_especias',   productName:'Salsas / Especias / Bebida energética',categoryId:'food_beverages_review',    aliases:['salsas','especias','condimentos','bebida energética'],   misspellings:['sauces'],                            englishTerms:['sauces','spices','energy drink'],spanishTerms:['salsas','especias'],             riskOverrideFlags:['food','sanitary_review'],               customerHint:'Requiere revisión.',                    adminHint:'Validar SENASA.' },

    // ── Additional alcohol/tobacco rows ──────────────────────────────────────
    { productKey:'tabaco_cigarros',   productName:'Tabaco / Cigarros / Nicotina',   categoryId:'alcohol_tobacco_vape_review',     aliases:['tabaco','cigarros','nicotina','cigarrillos','tobacco'],  misspellings:['tabaco'],                            englishTerms:['tobacco','cigarettes','nicotine'],spanishTerms:['tabaco','cigarros'],             riskOverrideFlags:['tobacco','nicotine','restricted_possible'],customerHint:'Requiere revisión.',                    adminHint:'Validar política CRBOX.' },

    // ── Additional plants row ─────────────────────────────────────────────────
    { productKey:'fertilizante',      productName:'Fertilizante / Pesticida / Sustrato',categoryId:'plants_seeds_agro_review',  aliases:['fertilizante','pesticida','sustrato','tierra','soil'],   misspellings:['fertilisante'],                      englishTerms:['fertilizer','pesticide','soil'],spanishTerms:['fertilizante','pesticida'],       riskOverrideFlags:['agro','phytosanitary_review','chemical'],customerHint:'Requiere revisión.',                    adminHint:'Validar fitosanitario SFE.' },

    // ── Additional weapons rows ───────────────────────────────────────────────
    { productKey:'arma_fuego_partes', productName:'Arma de Fuego / Municiones',     categoryId:'weapons_restricted',              aliases:['arma fuego','pistola','rifle','municiones','balines'],   misspellings:['arma'],                              englishTerms:['firearm','ammunition','gun'],    spanishTerms:['arma de fuego','municiones'],     riskOverrideFlags:['weapon','restricted_item'],             customerHint:'Puede ser restringido.',                adminHint:'No calcular automáticamente. Escalar.' },
    { productKey:'electroshock',      productName:'Electroshock / Taser / Espada',  categoryId:'weapons_restricted',              aliases:['electroshock','taser','espada','brass knuckles'],        misspellings:['electrochock'],                      englishTerms:['taser','stun gun','sword'],      spanishTerms:['electroshock','taser'],           riskOverrideFlags:['weapon','restricted_item'],             customerHint:'Puede ser restringido.',                adminHint:'Escalar a revisión.' },

    // ── Additional dangerous goods rows ──────────────────────────────────────
    { productKey:'fuegos_artificiales',productName:'Fuegos Artificiales / Gas Comprimido',categoryId:'dangerous_goods',         aliases:['fuegos artificiales','pirotecnia','gas comprimido','propano'],misspellings:['fuegos artificales'],            englishTerms:['fireworks','compressed gas'],    spanishTerms:['fuegos artificiales','gas comprimido'],riskOverrideFlags:['dangerous_goods','explosive','special_transport'],customerHint:'Restricciones de transporte.',adminHint:'Revisar DG y restricciones carrier.' },

    // ── Additional illegal drugs row ──────────────────────────────────────────
    { productKey:'sustancia_controlada',productName:'Sustancia Controlada / CBD',  categoryId:'illegal_drugs_controlled_substances',aliases:['thc','cbd','cannabis','marihuana','droga'],           misspellings:['canabis'],                           englishTerms:['cbd','thc','cannabis'],          spanishTerms:['cannabis','sustancia controlada'],riskOverrideFlags:['prohibited','controlled_substance'],   customerHint:'Este producto puede estar prohibido.',  adminHint:'Bloquear según política.' },

    // ── Additional counterfeit row ────────────────────────────────────────────
    { productKey:'replica_falso',     productName:'Réplica / Producto Falsificado', categoryId:'counterfeit_goods',               aliases:['réplica','fake','imitación','falsificado','counterfeit'],misspellings:['replica'],                          englishTerms:['replica','fake','counterfeit'],  spanishTerms:['réplica','falsificado'],          riskOverrideFlags:['counterfeit','trademark_risk'],        customerHint:'Puede ser restringido.',                adminHint:'Revisar política y riesgo marcario.' },
    { productKey:'explosivos_inflamables', productName:'Explosivos / Inflamables / DG', categoryId:'dangerous_goods',             aliases:['explosivo','inflamable','peligroso','hazmat','producto peligroso'],misspellings:['explosibo'],              englishTerms:['explosive','flammable','hazmat'],spanishTerms:['explosivo','producto peligroso'], riskOverrideFlags:['dangerous_goods','flammable','explosive'],customerHint:'Restricciones de transporte.',     adminHint:'Revisar DG y restricciones carrier.' },





    // ════════════════ TASK #384 EXPANSION BATCH 5 ════════════════
    { productKey:'tablet_android_basica', productName:'Tablet Android / Samsung Tab A / Lenovo Tab', categoryId:'tablets_ereaders', aliases:['tablet android','samsung tab a9','lenovo tab m10','android tablet barata'], misspellings:['tableta android'], englishTerms:['android tablet','samsung galaxy tab a9','lenovo tab m10 plus'], spanishTerms:['tableta android','tablet económica'], ecommerceTerms:['Samsung Galaxy Tab A9+','Lenovo Tab M10 Plus (3rd Gen)'], commonSearchPhrases:['tablet android precio','samsung tab comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'kindle_paperwhite', productName:'Kindle Paperwhite / Kindle Oasis / E-Reader', categoryId:'tablets_ereaders', aliases:['kindle paperwhite','kindle oasis','e-reader','kobo libra'], misspellings:['kindle paperwhite amazon'], englishTerms:['kindle paperwhite signature edition','kobo libra 2'], spanishTerms:['lector de libros electrónico','kindle'], ecommerceTerms:['Kindle Paperwhite Signature Edition','Kobo Libra 2 E-Reader'], commonSearchPhrases:['kindle paperwhite precio','e-reader comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'calentador_agua_portatil', productName:'Calentador Agua Portátil / Tankless / Camping', categoryId:'home_kitchen_appliances', aliases:['calentador agua portátil','tankless water heater','camping water heater'], misspellings:['calentador de agua portatil'], englishTerms:['portable water heater','tankless instant water heater'], spanishTerms:['calentador de agua portátil','ducha portátil'], ecommerceTerms:['Eccotemp L5 Portable Outdoor Tankless Water Heater','FOGATTI Tankless Water Heater'], commonSearchPhrases:['calentador agua portátil precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'impresora_3d_basica', productName:'Impresora 3D / Creality Ender / Bambu Lab', categoryId:'computers_main_parts', aliases:['impresora 3d','creality ender 3','bambu lab x1','3d printer'], misspellings:['impresora 3D creality'], englishTerms:['3d printer','creality ender 3 v3','bambu lab x1 carbon'], spanishTerms:['impresora 3d','impresora tridimensional'], ecommerceTerms:['Creality Ender-3 V3 SE 3D Printer','Bambu Lab X1-Carbon 3D Printer'], commonSearchPhrases:['impresora 3d precio','creality ender comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'filamento_pla', productName:'Filamento PLA / PETG / ABS / 3D Printing', categoryId:'computers_main_parts', aliases:['filamento pla','petg filament','abs filament','hatchbox pla','overture pla'], misspellings:['filamento para impresora 3d'], englishTerms:['pla filament 1kg','petg filament','overture pla plus'], spanishTerms:['filamento pla','filamento para impresora 3d'], ecommerceTerms:['Hatchbox PLA 1.75mm 1kg','Overture PETG Filament 1kg'], commonSearchPhrases:['filamento pla precio','petg filament comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'calculadora_financiera', productName:'Calculadora Financiera / HP 12C / Texas BA II', categoryId:'computer_accessories', aliases:['calculadora financiera','hp 12c','texas ba ii','calculadora hp'], misspellings:['calculadora financiera hp'], englishTerms:['financial calculator','hp 12c platinum','texas instruments ba ii plus'], spanishTerms:['calculadora financiera','calculadora para finanzas'], ecommerceTerms:['HP 12C Financial Calculator','Texas Instruments BA II Plus Financial Calculator'], commonSearchPhrases:['calculadora financiera precio','hp 12c comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'casco_moto', productName:'Casco Motocicleta / Shoei / AGV / Bell', categoryId:'automotive_simple_accessories', aliases:['casco moto','shoei','agv','bell helmet','casco de motocicleta'], misspellings:['casco de moto'], englishTerms:['motorcycle helmet','shoei rf-sr2','agv k6s'], spanishTerms:['casco de motocicleta','casco moto'], ecommerceTerms:['Shoei RF-SR2 Full-Face Helmet','AGV K6S Helmet','Bell Qualifier DLX MIPS'], commonSearchPhrases:['casco moto precio','shoei comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'guantes_moto', productName:'Guantes Moto / Riding Gloves / Alpinestars', categoryId:'automotive_simple_accessories', aliases:['guantes moto','alpinestars gloves','dainese gloves','riding gloves'], misspellings:['guantes de moto'], englishTerms:['motorcycle gloves','alpinestars sp-8 v3','dainese air master'], spanishTerms:['guantes de moto','guantes de motociclista'], ecommerceTerms:['Alpinestars SP-8 V3 Gloves','Dainese Air Master Gloves'], commonSearchPhrases:['guantes moto precio','alpinestars comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'perfume_importado', productName:'Perfume / Colonia Importada / Dior / Chanel', categoryId:'beauty_skincare_personal_care', aliases:['perfume importado','colonia dior','chanel perfume','versace eros','creed aventus'], misspellings:['perfume importado dior'], englishTerms:['perfume','dior sauvage edp','chanel no. 5'], spanishTerms:['perfume importado','colonia'], ecommerceTerms:['Dior Sauvage EDP 100ml','Chanel No. 5 EDP 50ml','Creed Aventus EDP'], commonSearchPhrases:['perfume dior precio','chanel perfume comprar'], riskOverrideFlags:['liquid','aerosol'], customerHint:'Los perfumes son líquidos inflamables — pueden tener restricciones de transporte.', adminHint:'Revisar normativa de líquidos inflamables.' },
    { productKey:'colonia_hombre', productName:'Colonia Hombre / Paco Rabanne / Armani / Bleu', categoryId:'beauty_skincare_personal_care', aliases:['colonia hombre','paco rabanne','armani acqua di gio','bleu de chanel'], misspellings:['colonia para hombre'], englishTerms:['paco rabanne 1 million','armani acqua di gio','bleu de chanel'], spanishTerms:['colonia para hombre','fragancia masculina'], ecommerceTerms:['Paco Rabanne 1 Million EDT 100ml','Armani Acqua di Giò EDP 75ml'], commonSearchPhrases:['colonia hombre precio','acqua di gio comprar'], riskOverrideFlags:['liquid','aerosol'], customerHint:'Los perfumes son líquidos inflamables — pueden tener restricciones de transporte.', adminHint:'Revisar normativa de líquidos inflamables.' },
    { productKey:'maquina_depilacion_laser', productName:'Dispositivo Depilación Láser / IPL / Braun Silk Expert', categoryId:'beauty_devices', aliases:['depilación láser hogar','ipl device','braun silk expert','ulike laser'], misspellings:['depilacion laser casera'], englishTerms:['ipl hair removal','braun silk expert pro 5','ulike laser hair removal'], spanishTerms:['depiladora láser hogar','dispositivo ipl'], ecommerceTerms:['Braun Silk Expert Pro 5 IPL','Ulike Air3 IPL Hair Removal'], commonSearchPhrases:['depilación láser hogar precio','ipl comprar'], riskOverrideFlags:['medical'], customerHint:'', adminHint:'Verificar clasificación médica.' },
    { productKey:'pantuflas_ugg', productName:'Pantuflas / UGG / Slipper / Sherpa', categoryId:'footwear_complete', aliases:['pantuflas','ugg slipper','sherpa slipper','house shoes'], misspellings:['pantuflas ugg'], englishTerms:['slippers','ugg ansley slippers','minnetonka sherpa'], spanishTerms:['pantuflas','zapatillas de casa'], ecommerceTerms:['UGG Ansley Slippers','Minnetonka Cally Slipper','Amazon Essentials Sherpa Slipper'], commonSearchPhrases:['pantuflas precio','ugg slipper comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'camiseta_vintage', productName:'Camiseta Vintage / Oversized / Graphic Tee', categoryId:'clothing_general', aliases:['camiseta vintage','graphic tee','oversized tee','vintage t-shirt'], misspellings:['camiseta vintage oversized'], englishTerms:['vintage graphic tee','oversized t-shirt'], spanishTerms:['camiseta vintage','remera oversize'], ecommerceTerms:['Hanes Originals Superweight T-Shirt','Uniqlo UT Graphic T-Shirt'], commonSearchPhrases:['camiseta vintage precio','graphic tee comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'disco_externo_ssd', productName:'Disco Externo SSD / Samsung T7 / Seagate', categoryId:'storage_memory', aliases:['disco externo ssd','samsung t7','seagate backup plus','portable ssd'], misspellings:['disco duro externo ssd'], englishTerms:['portable ssd','samsung t7 portable ssd','seagate firecuda ssd'], spanishTerms:['disco externo ssd','almacenamiento portátil ssd'], ecommerceTerms:['Samsung T7 Shield Portable SSD 1TB','Seagate FireCuda Gaming SSD 1TB'], commonSearchPhrases:['disco externo ssd precio','samsung t7 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'lector_nfc', productName:'Lector NFC / RFID / ACR122U', categoryId:'computer_accessories', aliases:['lector nfc','rfid reader','acr122u','nfc writer'], misspellings:['lector nfc rfid'], englishTerms:['nfc reader writer','acr122u nfc reader'], spanishTerms:['lector nfc','lector rfid'], ecommerceTerms:['ACS ACR122U NFC Reader','MFRC522 RFID Card Reader'], commonSearchPhrases:['lector nfc precio','acr122u comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'bicicleta_spinning', productName:'Bicicleta Spinning / Stationary / Peloton / NordicTrack', categoryId:'sports_fitness_physical', aliases:['bicicleta spinning','bicicleta estacionaria','peloton','nordictrack s22i'], misspellings:['bicicleta de spinning'], englishTerms:['spin bike','stationary bike','peloton bike'], spanishTerms:['bicicleta estacionaria','ciclo indoor'], ecommerceTerms:['NordicTrack Commercial S22i Studio Cycle','Schwinn IC4 Indoor Cycling Bike'], commonSearchPhrases:['bicicleta spinning precio','nordictrack comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el peso considerable.', adminHint:'Verificar peso y dimensiones.' },
    { productKey:'tapete_cocina_anti', productName:'Tapete Antifatiga / Kitchen Mat / Anti-Fatigue', categoryId:'home_kitchen_appliances', aliases:['tapete antifatiga','kitchen mat','anti-fatigue mat','tapete de cocina'], misspellings:['tapete anti fatiga'], englishTerms:['anti-fatigue kitchen mat','standing desk mat'], spanishTerms:['tapete antifatiga','alfombra de cocina'], ecommerceTerms:['Topo Comfort Mat by Ergodriven','ComfiLife Anti Fatigue Floor Mat'], commonSearchPhrases:['tapete antifatiga precio','kitchen mat comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'pistola_masaje', productName:'Pistola de Masaje / Theragun / Hypervolt', categoryId:'medicines_medical_products', aliases:['pistola masaje','theragun','hypervolt','massage gun','percussive massager'], misspellings:['pistola de masaje'], englishTerms:['massage gun','theragun prime','hyperice hypervolt 2'], spanishTerms:['pistola de masaje','masajeador percusivo'], ecommerceTerms:['Theragun Prime Plus','Hyperice Hypervolt 2 Pro'], commonSearchPhrases:['pistola masaje precio','theragun comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'set_destornilladores', productName:'Set Destornilladores / iFixit / Wiha / Precision', categoryId:'tools_hardware_common', aliases:['set destornilladores','wiha','ifixit','precision screwdriver set'], misspellings:['set de destornilladores'], englishTerms:['screwdriver set','wiha insulated screwdriver set','ifixit pro tech toolkit'], spanishTerms:['juego de destornilladores','set de puntas'], ecommerceTerms:['iFixit Pro Tech Toolkit 70-piece','Wiha 26193 Insulated Screwdriver Set'], commonSearchPhrases:['set destornilladores precio','ifixit toolkit comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'reloj_garmin_gps', productName:'Reloj GPS / Garmin Fenix / Forerunner', categoryId:'watches_jewelry', aliases:['garmin fenix','garmin forerunner','gps watch','reloj gps running'], misspellings:['garmin fenix reloj'], englishTerms:['garmin fenix 7','garmin forerunner 965','gps running watch'], spanishTerms:['reloj gps garmin','reloj deportivo gps'], ecommerceTerms:['Garmin Fenix 7 Sapphire Solar','Garmin Forerunner 965'], commonSearchPhrases:['garmin fenix precio','reloj gps comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'silla_ergonomica_lujo', productName:'Silla Ergonómica / Herman Miller / Steelcase', categoryId:'office_stationery_art', aliases:['silla ergonómica','herman miller aeron','steelcase leap','silla gaming ergonómica'], misspellings:['silla ergonomica herman miller'], englishTerms:['ergonomic office chair','herman miller aeron','steelcase leap v2'], spanishTerms:['silla ergonómica premium','silla de oficina ergonómica'], ecommerceTerms:['Herman Miller Aeron Chair','Steelcase Leap V2 Ergonomic Chair'], commonSearchPhrases:['silla ergonómica precio','herman miller comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño y peso.', adminHint:'Verificar peso y dimensiones.' },
    { productKey:'grabadora_voz', productName:'Grabadora de Voz / Zoom H / Tascam / Dictaphone', categoryId:'microphones_audio_pro', aliases:['grabadora voz','zoom h4n','tascam dr-40x','dictaphone','voice recorder'], misspellings:['grabadora de voz zoom'], englishTerms:['voice recorder','zoom h4n pro','tascam dr-40x'], spanishTerms:['grabadora de voz','dictáfono'], ecommerceTerms:['Zoom H4n Pro Portable Multitrack Recorder','Tascam DR-40X Four-Track Digital Audio Recorder'], commonSearchPhrases:['grabadora voz precio','zoom h4n comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'impresora_etiquetas', productName:'Impresora de Etiquetas / Dymo / Brother QL', categoryId:'computer_accessories', aliases:['impresora etiquetas','dymo labelwriter','brother ql','label printer'], misspellings:['impresora de etiquetas dymo'], englishTerms:['label printer','dymo labelwriter 550','brother ql-820nwbc'], spanishTerms:['impresora de etiquetas','impresora de código de barras'], ecommerceTerms:['Dymo LabelWriter 550','Brother QL-820NWBc Label Printer'], commonSearchPhrases:['impresora etiquetas precio','dymo comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'medias_compresion', productName:'Medias de Compresión / Compression Socks / CEP', categoryId:'clothing_general', aliases:['medias compresión','compression socks','cep socks','medias de vuelo'], misspellings:['medias de compresion'], englishTerms:['compression socks','cep compression socks','travel compression socks'], spanishTerms:['medias de compresión','calcetines de compresión'], ecommerceTerms:['CEP Run 3.0 Compression Socks','Sockwell Circulator Compression Socks'], commonSearchPhrases:['medias compresión precio','compression socks comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'set_cubos_rubik', productName:'Cubo de Rubik / Speed Cube / GAN / MoYu', categoryId:'toys_common', aliases:['cubo rubik','speed cube','gan 356','moyu rs3m','puzzle cube'], misspellings:['cubo de rubik','speed cubo'], englishTerms:['rubik\'s cube','speed cube','gan 356 m pro'], spanishTerms:['cubo de rubik','cubo mágico'], ecommerceTerms:['GAN 356 M Pro 3x3 Speed Cube','MoYu RS3M 2020 Speed Cube'], commonSearchPhrases:['cubo rubik precio','speed cube comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // ════════════════ TASK #384 EXPANSION BATCH 4 ════════════════
    { productKey:'oneplus_nord', productName:'OnePlus Nord / CE / Lite', categoryId:'phones_smartphones', aliases:['oneplus nord','nord ce','oneplus lite'], misspellings:['one plus nord'], englishTerms:['oneplus nord 3','oneplus nord ce 3 lite'], spanishTerms:['celular oneplus nord'], ecommerceTerms:['OnePlus Nord 3 5G','OnePlus Nord CE 3 Lite'], commonSearchPhrases:['oneplus nord precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'ram_ddr5', productName:'Memoria RAM DDR5 / DDR4 / DIMM', categoryId:'computers_main_parts', aliases:['ram ddr5','ram ddr4','memoria ram','16gb ddr5','corsair ram'], misspellings:['memoria ram ddr 5'], englishTerms:['ddr5 ram','16gb ddr5','corsair vengeance ddr5'], spanishTerms:['memoria ram','ram para pc'], ecommerceTerms:['Corsair Vengeance DDR5 32GB','G.Skill Ripjaws V DDR4 16GB'], commonSearchPhrases:['ram ddr5 precio','memoria ram comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'caja_pc_gaming', productName:'Case / Chasis PC Gaming / ATX / Mid-Tower', categoryId:'computers_main_parts', aliases:['case pc','chasis pc','mid tower case','lian li','corsair 4000d'], misspellings:['case de pc gaming'], englishTerms:['pc case atx','mid tower','lian li lancool 216'], spanishTerms:['gabinete pc','chasis gaming'], ecommerceTerms:['Lian Li Lancool 216','Corsair 4000D Airflow','NZXT H510'], commonSearchPhrases:['case pc precio','chasis gaming comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'amplificador_hi_fi', productName:'Amplificador Hi-Fi / Stereo / NAD / Denon', categoryId:'speakers_home_audio', aliases:['amplificador hi-fi','stereo amplifier','nad amplifier','denon receiver'], misspellings:['amplificador hifi'], englishTerms:['stereo amplifier','nad d3045','denon pma-600ne'], spanishTerms:['amplificador de audio','amplificador estéreo'], ecommerceTerms:['NAD D 3045 Hybrid Digital Amplifier','Denon PMA-600NE Stereo Integrated Amplifier'], commonSearchPhrases:['amplificador hi-fi precio','nad amplifier comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'barra_sonido', productName:'Barra de Sonido / Soundbar / Samsung HW / Sonos Arc', categoryId:'speakers_home_audio', aliases:['barra de sonido','soundbar','samsung hw','sonos arc','lg soundbar'], misspellings:['sound bar samsung'], englishTerms:['soundbar','samsung hw-q990c','sonos arc'], spanishTerms:['barra de sonido','soundbar para tv'], ecommerceTerms:['Samsung HW-Q990C Soundbar','Sonos Arc Soundbar','LG S75Q Soundbar'], commonSearchPhrases:['barra de sonido precio','sonos arc comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'objetivo_lente', productName:'Objetivo / Lente Intercambiable / 50mm', categoryId:'cameras_photo_video', aliases:['objetivo cámara','lente 50mm','lente intercambiable','sigma art lens'], misspellings:['objetivo de camara'], englishTerms:['camera lens','50mm lens','sigma 35mm art'], spanishTerms:['objetivo para cámara','lente de cámara'], ecommerceTerms:['Sigma 35mm f/1.4 DG DN Art','Sony FE 50mm f/1.8','Tamron 17-70mm f/2.8'], commonSearchPhrases:['objetivo 50mm precio','sigma art lens comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'filtro_nd_foto', productName:'Filtros ND / CPL / UV para Cámara', categoryId:'cameras_photo_video', aliases:['filtros nd','cpl filter','uv filter','variable nd filter'], misspellings:['filtro nd camara'], englishTerms:['nd filter','circular polarizer','variable nd filter'], spanishTerms:['filtro nd','filtro polarizador'], ecommerceTerms:['PolarPro VND Mist Filter','Tiffen Variable ND Filter','B+W 82mm XS-Pro UV'], commonSearchPhrases:['filtro nd precio','cpl filter comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'chaleco_acolchado', productName:'Chaleco Acolchado / Puffer Vest / Patagonia', categoryId:'clothing_general', aliases:['chaleco acolchado','puffer vest','chaleco sin mangas','patagonia vest'], misspellings:['chaleco acolchado sin mangas'], englishTerms:['puffer vest','down vest','patagonia down sweater vest'], spanishTerms:['chaleco acolchado','chaleco pluma'], ecommerceTerms:['Patagonia Men\'s Down Sweater Vest','The North Face Aconcagua 3 Vest'], commonSearchPhrases:['chaleco acolchado precio','puffer vest comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'conjunto_nino', productName:'Ropa Niño / Conjunto Infantil / Gap Kids', categoryId:'clothing_general', aliases:['ropa niño','conjunto infantil','gap kids','ropa para niños'], misspellings:['ropa de niño'], englishTerms:['kids clothing set','gap kids outfit'], spanishTerms:['ropa para niños','conjunto infantil'], ecommerceTerms:['Carter\'s 3-Piece Baby Set','Gap Kids Cargo Jogger'], commonSearchPhrases:['ropa niño precio','gap kids comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'toner_coreano', productName:'Tónico / Toner Coreano / COSRX / Some By Mi', categoryId:'beauty_skincare_personal_care', aliases:['tónico coreano','cosrx toner','some by mi','korean toner','essence skincare'], misspellings:['toner coreano'], englishTerms:['korean toner','cosrx propolis toner','some by mi aha bha pha'], spanishTerms:['tónico coreano','esencia skincare'], ecommerceTerms:['COSRX Advanced Snail 96 Mucin Power Essence','Some By Mi AHA BHA PHA Toner'], commonSearchPhrases:['toner coreano precio','cosrx comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'bloqueador_corporal', productName:'Bloqueador Corporal / Body Sunscreen / SPF', categoryId:'beauty_skincare_personal_care', aliases:['bloqueador corporal','body sunscreen','spf loción corporal'], misspellings:['bloqueador solar corporal'], englishTerms:['body sunscreen spf 30','mineral body sunscreen'], spanishTerms:['bloqueador solar corporal','protector solar loción'], ecommerceTerms:['Banana Boat Sport SPF 50+ Body Lotion','Neutrogena Beach Defense SPF 70'], commonSearchPhrases:['bloqueador corporal precio','body sunscreen comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'tinte_cabello', productName:'Tinte de Cabello / Olaplex / L\'Oreal', categoryId:'beauty_skincare_personal_care', aliases:['tinte cabello','loreal colorista','olaplex hair tint','hair dye'], misspellings:['tinte de pelo'], englishTerms:['hair dye','l\'oreal colorista','olaplex no. 4 bond maintenance shampoo'], spanishTerms:['tinte de cabello','coloración capilar'], ecommerceTerms:['L\'Oreal Colorista Hair Color','Olaplex No. 4 Bond Maintenance Shampoo'], commonSearchPhrases:['tinte cabello precio','olaplex comprar'], riskOverrideFlags:['chemical'], customerHint:'', adminHint:'' },
    { productKey:'aceite_esencial', productName:'Aceite Esencial / Lavanda / Eucalipto / doTERRA', categoryId:'beauty_skincare_personal_care', aliases:['aceite esencial','doterra','aceite lavanda','aceite eucalipto','essential oil'], misspellings:['aceite esencial lavanda'], englishTerms:['essential oil','doterra lavender','eucalyptus essential oil'], spanishTerms:['aceite esencial','aceite de lavanda'], ecommerceTerms:['doTERRA Lavender Essential Oil 15ml','Plant Therapy Eucalyptus Globulus'], commonSearchPhrases:['aceite esencial precio','doterra comprar'], riskOverrideFlags:['liquid'], customerHint:'', adminHint:'' },
    { productKey:'freidora_doble', productName:'Freidora de Aire Doble / Ninja DualZone', categoryId:'home_kitchen_appliances', aliases:['freidora doble','ninja dual zone','air fryer dual','cosori dual basket'], misspellings:['freidora doble air fryer'], englishTerms:['dual zone air fryer','ninja foodi dual zone'], spanishTerms:['freidora de aire doble','air fryer doble canasta'], ecommerceTerms:['Ninja DualZone Air Fryer DZ401','COSORI Dual Blaze 13-Qt Air Fryer'], commonSearchPhrases:['freidora doble precio','ninja dual zone comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'set_bowls_ceramica', productName:'Set de Bowls / Ensaladera / Cerámica Artesanal', categoryId:'home_kitchen_appliances', aliases:['set bowls','ensaladera ceramica','ceramic bowl set','artisan bowls'], misspellings:['set de bowls'], englishTerms:['ceramic bowl set','salad bowl set'], spanishTerms:['juego de bowls','ensaladera'], ecommerceTerms:['Le Creuset 4-Piece Stoneware Bowl Set','Fiesta Dinnerware Set'], commonSearchPhrases:['set bowls precio','ceramic bowl comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cortinas_black_out', productName:'Cortinas Blackout / Room Darkening', categoryId:'home_decor_storage', aliases:['cortinas blackout','room darkening','cortinas oscurecimiento'], misspellings:['cortinas black out'], englishTerms:['blackout curtains','room darkening curtains'], spanishTerms:['cortinas blackout','cortinas de oscurecimiento'], ecommerceTerms:['NICETOWN Full Blackout Curtain Panels','Deconovo Blackout Curtains'], commonSearchPhrases:['cortinas blackout precio','room darkening comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'alfombra_sala', productName:'Alfombra / Rug / Area Rug / 5x8', categoryId:'home_decor_storage', aliases:['alfombra sala','area rug','tapete grande','8x10 rug'], misspellings:['alfombra de sala'], englishTerms:['area rug 5x8','shag rug','bohemian rug'], spanishTerms:['alfombra para sala','tapete'], ecommerceTerms:['Safavieh Hudson Shag Rug 5\'x8\'','Ruggable Washable Indoor/Outdoor Rug'], commonSearchPhrases:['alfombra sala precio','area rug comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño y peso.', adminHint:'Verificar dimensiones y peso.' },
    { productKey:'cajonera_madera', productName:'Cajonera / Dresser / IKEA / Malm', categoryId:'home_decor_storage', aliases:['cajonera madera','dresser','malm ikea','chest of drawers'], misspellings:['cajonera de madera'], englishTerms:['dresser','chest of drawers','ikea malm dresser'], spanishTerms:['cajonera','cómoda de cajones'], ecommerceTerms:['IKEA MALM 6-Drawer Dresser','HOMFA Modern Dresser'], commonSearchPhrases:['cajonera precio','dresser comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por las dimensiones y peso.', adminHint:'Verificar dimensiones.' },
    { productKey:'pelota_basketball', productName:'Pelota de Baloncesto / Spalding / Wilson', categoryId:'sports_fitness_physical', aliases:['pelota baloncesto','basketball','spalding','wilson ncaa ball'], misspellings:['pelota de basketball'], englishTerms:['basketball','spalding nba official game ball'], spanishTerms:['balón de baloncesto','pelota de básquet'], ecommerceTerms:['Spalding NBA Indoor/Outdoor Basketball','Wilson NBA DRV Series Basketball'], commonSearchPhrases:['pelota baloncesto precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'red_pickleball', productName:'Pickleball / Raqueta / Set Completo', categoryId:'sports_fitness_physical', aliases:['pickleball','raqueta pickleball','paddle pickleball','pickleball set'], misspellings:['pickelball'], englishTerms:['pickleball paddle','pickleball set','selkirk pickleball'], spanishTerms:['pickleball','paleta de pickleball'], ecommerceTerms:['Selkirk PRIME S2 Pickleball Paddle','HEAD Radical Tour Pickleball Paddle'], commonSearchPhrases:['pickleball precio','paddle pickleball comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'linterna_camping', productName:'Linterna LED / Headlamp / Black Diamond', categoryId:'sports_outdoor_variable', aliases:['linterna led','headlamp','linterna frontal','black diamond headlamp'], misspellings:['linterna frontal camping'], englishTerms:['headlamp led','black diamond spot headlamp','rechargeable lantern'], spanishTerms:['linterna frontal','lámpara de cabeza'], ecommerceTerms:['Black Diamond Spot 400 Headlamp','Goal Zero Lighthouse 600 Lantern'], commonSearchPhrases:['linterna headlamp precio','black diamond comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'chaleco_hidratacion', productName:'Chaleco de Hidratación / Camelbak / Osprey', categoryId:'sports_outdoor_variable', aliases:['chaleco hidratación','hydration vest','camelbak hydration','osprey hydration'], misspellings:['chaleco de hidratacion'], englishTerms:['hydration vest','camelbak circuit vest','osprey duro lt 1.5'], spanishTerms:['chaleco de hidratación','mochila hidratación'], ecommerceTerms:['CamelBak Circuit Vest 1.5L','Osprey Duro LT 1.5 Running Pack'], commonSearchPhrases:['chaleco hidratación precio','camelbak vest comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cuna_bebe', productName:'Cuna de Bebé / Bassinet / SNOO', categoryId:'baby_items', aliases:['cuna bebé','bassinet','snoo smart sleeper','cuna portátil'], misspellings:['cuna de bebe'], englishTerms:['baby crib','bassinet','snoo smart sleeper','portable bassinet'], spanishTerms:['cuna de bebé','moisés'], ecommerceTerms:['SNOO Smart Sleeper Bassinet','Graco Dream Suite Bassinet','HALO BassiNest Swivel Sleeper'], commonSearchPhrases:['cuna bebé precio','bassinet comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño y peso.', adminHint:'Verificar dimensiones.' },
    { productKey:'libro_cuentos', productName:'Libro Cuentos / Board Books / Dr. Seuss', categoryId:'books_printed_material', aliases:['libro cuentos niños','board book','dr seuss','eric carle book'], misspellings:['libro de cuentos'], englishTerms:['children\'s book','board book','dr. seuss'], spanishTerms:['libro de cuentos','cuento infantil'], ecommerceTerms:['The Very Hungry Caterpillar Board Book','Oh, the Places You\'ll Go! Dr. Seuss'], commonSearchPhrases:['libro cuentos niños precio','dr seuss comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'aspiradora_carro', productName:'Aspiradora para Carro / Handheld Car Vac', categoryId:'automotive_simple_accessories', aliases:['aspiradora carro','car vacuum','handheld vacuum carro','black decker auto vac'], misspellings:['aspiradora de carro'], englishTerms:['car vacuum cleaner','handheld cordless vacuum'], spanishTerms:['aspiradora portátil para carro'], ecommerceTerms:['ThisWorx Car Vacuum Cleaner','BLACK+DECKER Handheld Cordless Vacuum'], commonSearchPhrases:['aspiradora carro precio'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'organizador_carro', productName:'Organizador Maletero / Trunk Organizer', categoryId:'automotive_simple_accessories', aliases:['organizador maletero','trunk organizer','organizador de carro'], misspellings:['organizador de maletero'], englishTerms:['trunk organizer','car trunk storage','back seat organizer'], spanishTerms:['organizador de maletero','organizador para auto'], ecommerceTerms:['Fortem Car Trunk Organizer','Drive Auto Products Car Trunk Organizer'], commonSearchPhrases:['organizador maletero precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'juego_ps5_fisico', productName:'Juego Físico PS5 / Xbox / Switch', categoryId:'gaming_physical_accessories', aliases:['juego ps5','xbox game disc','switch game card','videojuego físico'], misspellings:['juego de ps5'], englishTerms:['ps5 game disc','xbox series game','nintendo switch game card'], spanishTerms:['juego físico ps5','videojuego ps5'], ecommerceTerms:['Marvel\'s Spider-Man 2 PS5','Zelda: Tears of the Kingdom Switch'], commonSearchPhrases:['juego ps5 precio','videojuego físico comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'palanca_arcade_usb', productName:'Control USB / Gamepad / 8BitDo / Xbox USB', categoryId:'gaming_physical_accessories', aliases:['control usb','gamepad','8bitdo','xbox controller usb','dualshock usb'], misspellings:['control para pc usb'], englishTerms:['usb gamepad','8bitdo ultimate','xbox controller for pc'], spanishTerms:['control para pc','gamepad usb'], ecommerceTerms:['8BitDo Ultimate Bluetooth Controller','Microsoft Xbox Wireless Controller'], commonSearchPhrases:['control usb precio','8bitdo comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'proteina_barra', productName:'Barras de Proteína / RxBar / Quest Bar', categoryId:'supplements_vitamins_nutrition', aliases:['barras proteína','rxbar','quest bar','protein bar','kind bar'], misspellings:['barra de proteina'], englishTerms:['protein bar','rxbar','quest bar'], spanishTerms:['barra de proteína','snack proteico'], ecommerceTerms:['RxBar Protein Bars 12-Pack','Quest Protein Bars Variety Pack'], commonSearchPhrases:['barras proteína precio','rxbar comprar'], riskOverrideFlags:['food','sanitary_review'], customerHint:'Los alimentos importados pueden requerir revisión sanitaria.', adminHint:'Validar SENASA/MINSA.' },
    { productKey:'bcaa', productName:'BCAA / Aminoácidos Ramificados / Xtend', categoryId:'supplements_vitamins_nutrition', aliases:['bcaa','aminoácidos ramificados','xtend bcaa','intra workout'], misspellings:['bcaa aminoacidos'], englishTerms:['bcaa','branched chain amino acids','scivation xtend'], spanishTerms:['aminoácidos bcaa','bcaa en polvo'], ecommerceTerms:['Scivation Xtend BCAA 90 Servings','NOW Sports Branched Chain Amino Acids'], commonSearchPhrases:['bcaa precio','aminoácidos comprar'], riskOverrideFlags:['supplement','sanitary_review'], customerHint:'Los suplementos pueden requerir validación sanitaria.', adminHint:'Revisar CCSS/MINSA.' },
    { productKey:'pluma_estilografica', productName:'Pluma Estilográfica / Fountain Pen / Lamy', categoryId:'office_stationery_art', aliases:['pluma estilográfica','fountain pen','lamy safari','pilot metropolitan'], misspellings:['pluma estilograsfica'], englishTerms:['fountain pen','lamy safari','pilot metropolitan'], spanishTerms:['pluma estilográfica','pluma fuente'], ecommerceTerms:['Lamy Safari Fountain Pen','Pilot Metropolitan Fountain Pen'], commonSearchPhrases:['pluma estilográfica precio','lamy safari comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'rotuladores_markers', productName:'Rotuladores / Markers / Copic / Tombow', categoryId:'office_stationery_art', aliases:['rotuladores','markers','copic markers','tombow dual brush','mildliner'], misspellings:['rotuladores copic'], englishTerms:['copic markers','tombow dual brush pens','zebra mildliner'], spanishTerms:['rotuladores de colores','marcadores copic'], ecommerceTerms:['Copic Sketch Marker Set 12pc','Tombow 56185 Dual Brush Pen Art Markers'], commonSearchPhrases:['copic markers precio','tombow comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'conversor_video', productName:'Conversor / Capturadora Video / AV to HDMI', categoryId:'computer_accessories', aliases:['conversor av hdmi','video converter','rca to hdmi','av to hdmi adapter'], misspellings:['conversor de video'], englishTerms:['av to hdmi converter','video capture card usb'], spanishTerms:['conversor de video','adaptador av a hdmi'], ecommerceTerms:['Elgato Video Capture','AGPtek RCA to HDMI Converter'], commonSearchPhrases:['conversor av hdmi precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'altavoz_portatil_resistente', productName:'Bocina Resistente al Agua / JBL Xtreme / Sony XB', categoryId:'speakers_home_audio', aliases:['bocina resistente agua','jbl xtreme','sony xb33','waterproof speaker'], misspellings:['bocina resistente al agua'], englishTerms:['waterproof bluetooth speaker','jbl xtreme 3','sony srs-xb43'], spanishTerms:['bocina resistente al agua','parlante impermeable'], ecommerceTerms:['JBL Xtreme 3 Portable Bluetooth Speaker','Sony SRS-XB43 Portable Bluetooth Speaker'], commonSearchPhrases:['bocina waterproof precio','jbl xtreme comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'camara_360_vehiculo', productName:'Cámara 360° Vehículo / Surround View', categoryId:'automotive_simple_accessories', aliases:['cámara 360 carro','surround view camera','360 car camera','bird view'], misspellings:['camara 360 vehiculo'], englishTerms:['360 degree car camera','bird eye view camera'], spanishTerms:['cámara 360 para carro','vista de pájaro carro'], ecommerceTerms:['AMTIFO A7 4K Backup Camera','Wolfbox G840H 4K Dash Cam 360'], commonSearchPhrases:['cámara 360 carro precio'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'extintor_miniatura', productName:'Extintor Miniatura / Fire Blanket / First Aid', categoryId:'automotive_simple_accessories', aliases:['extintor miniatura','fire blanket','kit primeros auxilios auto','car first aid'], misspellings:['extintor de carro'], englishTerms:['car fire extinguisher','first aid kit car','fire blanket'], spanishTerms:['extintor para carro','kit primeros auxilios'], ecommerceTerms:['Amerex B417 First Aid Kit','PrepAuto Emergency Kit'], commonSearchPhrases:['extintor carro precio','first aid kit auto comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'set_pinceles', productName:'Set de Pinceles / Brochas / Princeton / Silver Brush', categoryId:'office_stationery_art', aliases:['set pinceles','brochas pintura','princeton brushes','watercolor brush set'], misspellings:['set de pinceles pintura'], englishTerms:['paint brush set','watercolor brushes','princeton velvetouch'], spanishTerms:['juego de pinceles','brochas para pintar'], ecommerceTerms:['Princeton Velvetouch 12-Piece Mixed Media Set','Silver Brush Black Velvet Watercolor'], commonSearchPhrases:['pinceles pintura precio','brush set comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'manguera_jardin', productName:'Manguera de Jardín / Expandable Hose / Nozzle', categoryId:'tools_hardware_common', aliases:['manguera jardín','expandable hose','manguera expandible','garden hose'], misspellings:['manguera de jardin'], englishTerms:['expandable garden hose','garden hose 50ft'], spanishTerms:['manguera de jardín','manguera expandible'], ecommerceTerms:['Flexi Hose 75ft Expandable Garden Hose','Giraffe Tools Expandable Garden Hose'], commonSearchPhrases:['manguera jardín precio','expandable hose comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'juego_ajedrez', productName:'Juego de Ajedrez / Chess Set / Premium', categoryId:'toys_common', aliases:['juego ajedrez','chess set','ajedrez de madera','staunton chess'], misspellings:['juego de ajedrez'], englishTerms:['chess set','wooden chess set','staunton chess'], spanishTerms:['juego de ajedrez','ajedrez'], ecommerceTerms:['Yellow Mountain Imports Wooden Chess Set','The House of Staunton Supreme Chess Set'], commonSearchPhrases:['ajedrez precio','chess set comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'almohadilla_calefactora', productName:'Almohadilla Calefactora / Heating Pad / TENS', categoryId:'medicines_medical_products', aliases:['almohadilla calefactora','heating pad','cojín calentador','electric heat pad'], misspellings:['almohadilla calefactora eléctrica'], englishTerms:['heating pad','electric heating pad','moist heat pad'], spanishTerms:['almohadilla eléctrica','cojín de calor'], ecommerceTerms:['Pure Enrichment PureRelief XL Heating Pad','Sunbeam Standard Heating Pad'], commonSearchPhrases:['almohadilla calefactora precio','heating pad comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'aceite_motor', productName:'Aceite de Motor / Mobil 1 / Castrol / Synthetic', categoryId:'automotive_simple_accessories', aliases:['aceite motor','mobil 1','castrol edge','aceite sintético motor'], misspellings:['aceite de motor sintético'], englishTerms:['motor oil','mobil 1 full synthetic','castrol edge'], spanishTerms:['aceite de motor','lubricante motor'], ecommerceTerms:['Mobil 1 Full Synthetic Motor Oil 5W-30','Castrol Edge Full Synthetic 0W-20'], commonSearchPhrases:['aceite motor precio','mobil 1 comprar'], riskOverrideFlags:['chemical','liquid'], customerHint:'', adminHint:'Revisar restricciones de líquidos y químicos.' },
    { productKey:'sofa_pequeno', productName:'Sofá Pequeño / Loveseat / Chaise / Futon', categoryId:'home_decor_storage', aliases:['sofá pequeño','loveseat','chaise lounge','futon','sofa compacto'], misspellings:['sofa pequeño'], englishTerms:['loveseat sofa','futon sofa bed','chaise lounge'], spanishTerms:['sofá pequeño','loveseat'], ecommerceTerms:['DHP Emily Futon Sofa Bed','ZINUS Shalini Sofa'], commonSearchPhrases:['loveseat precio','futon comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar significativamente por el tamaño y peso.', adminHint:'Verificar dimensiones — puede ser artículo de grandes dimensiones.' },
    { productKey:'deshumidificador', productName:'Deshumidificador / Dehumidifier / Frigidaire', categoryId:'home_decor_storage', aliases:['deshumidificador','dehumidifier','frigidaire dehumidifier','portable dehumidifier'], misspellings:['deshumidificador eléctrico'], englishTerms:['dehumidifier','frigidaire 35-pint dehumidifier'], spanishTerms:['deshumidificador'], ecommerceTerms:['Frigidaire FGAC5044W1 Dehumidifier','hOmeLabs 4,500 Sq. Ft. Dehumidifier'], commonSearchPhrases:['deshumidificador precio','dehumidifier comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'faja_abdomen', productName:'Faja Reductora / Waist Trainer / Body Shaper', categoryId:'clothing_general', aliases:['faja reductora','waist trainer','body shaper','faja adelgazante'], misspellings:['faja de abdomen'], englishTerms:['waist trainer','body shaper','compression garment'], spanishTerms:['faja reductora','modeladora'], ecommerceTerms:['Rago Style 6210 Body Briefer','YIANNA Waist Trainer Belt'], commonSearchPhrases:['faja reductora precio','waist trainer comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'extension_cabello', productName:'Extensiones de Cabello / Clip In / Halo', categoryId:'beauty_skincare_personal_care', aliases:['extensiones cabello','clip in extensions','halo hair extensions','remy hair'], misspellings:['extensiones de cabello'], englishTerms:['hair extensions clip in','halo hair extension','remy hair'], spanishTerms:['extensiones de cabello','mechones de cabello'], ecommerceTerms:['ZALA Clip In Hair Extensions','Luxy Hair Clip-In Hair Extensions'], commonSearchPhrases:['extensiones cabello precio','clip in extensions comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'planta_suculenta_set', productName:'Set de Suculentas / Cactus / Mini Plantas', categoryId:'plants_seeds_agro_review', aliases:['set suculentas','mini cactus pack','planta suculenta set','miniature plants'], misspellings:['set de suculentas'], englishTerms:['succulent set','mini cactus collection','assorted succulents'], spanishTerms:['set de suculentas','colección de cactus'], ecommerceTerms:['Leaf & Clay Succulent Collection 20-Pack','Mountain Crest Gardens Succulent Set'], commonSearchPhrases:['set suculentas precio','suculentas comprar'], riskOverrideFlags:['agro','phytosanitary_review'], customerHint:'Las plantas vivas requieren revisión fitosanitaria para ingresar a Costa Rica.', adminHint:'Validar SFE/SENASA — fitosanitario obligatorio.' },
    { productKey:'sombrero_sol', productName:'Sombrero de Sol / Hat / Bucket Hat / Porkpie', categoryId:'clothing_accessories', aliases:['sombrero sol','sun hat','bucket hat','porkpie hat','sombrero de playa'], misspellings:['sombrero de sol'], englishTerms:['sun hat','bucket hat','wide brim sun hat'], spanishTerms:['sombrero de sol','sombrero de playa'], ecommerceTerms:['Sunday Afternoons Ultra Adventure Hat','Carhartt Bucket Hat'], commonSearchPhrases:['sombrero sol precio','bucket hat comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'pesas_tobilleras', productName:'Pesas Tobilleras / Muñequeras / Ankle Weights', categoryId:'sports_fitness_physical', aliases:['pesas tobilleras','ankle weights','pesas muñecas','wrist weights'], misspellings:['pesas de tobillo'], englishTerms:['ankle weights','wrist weights'], spanishTerms:['pesas para tobillos','pesas tobilleras'], ecommerceTerms:['Bala Bangles Ankle Weights','REEHUT Ankle Weights 2-Pack'], commonSearchPhrases:['pesas tobilleras precio','ankle weights comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'taza_termica_cafe', productName:'Taza Térmica Café / To-Go Mug / Thermos', categoryId:'home_kitchen_appliances', aliases:['taza térmica café','travel mug','coffee to-go','yeti travel mug'], misspellings:['taza termica para cafe'], englishTerms:['travel coffee mug','insulated travel mug'], spanishTerms:['taza de café para llevar','taza térmica'], ecommerceTerms:['Contigo Autoseal West Loop Travel Mug','YETI Rambler 14oz Travel Mug'], commonSearchPhrases:['taza café térmica precio','travel mug comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'luz_amanecer', productName:'Lámpara Amanecer / Wake-Up Light / Philips HF', categoryId:'home_decor_storage', aliases:['lámpara amanecer','wake-up light','philips hf3520','sunrise alarm'], misspellings:['lampara amanecer'], englishTerms:['wake-up light','sunrise alarm clock','philips smartsleep'], spanishTerms:['lámpara de amanecer','despertador luz solar'], ecommerceTerms:['Philips SmartSleep Wake-Up Light HF3520','Hatch Restore 2 Sound Machine'], commonSearchPhrases:['lámpara amanecer precio','wake-up light comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'robot_cocina_cortar', productName:'Procesador de Alimentos / Cortadora / Cuisinart', categoryId:'home_kitchen_appliances', aliases:['procesador alimentos','food processor','cuisinart','cortadora de vegetales'], misspellings:['procesador de alimentos cuisinart'], englishTerms:['food processor','cuisinart dlc-8sy','ninja express chop'], spanishTerms:['procesador de alimentos','picadora eléctrica'], ecommerceTerms:['Cuisinart DFP-14BCNY 14-Cup Food Processor','Ninja Express Chop NJ110GR'], commonSearchPhrases:['procesador alimentos precio','cuisinart comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // ════════════════ TASK #384 EXPANSION BATCH 3 ════════════════
    { productKey:'pixel_9', productName:'Google Pixel 9 / 9 Pro', categoryId:'phones_smartphones', aliases:['pixel 9','google pixel 9','pixel 9 pro','pixel 9 pro xl'], misspellings:['gogle pixel 9'], englishTerms:['google pixel 9','pixel 9 pro xl'], spanishTerms:['celular google pixel 9'], ecommerceTerms:['Google Pixel 9 Pro','Google Pixel 9 128GB'], commonSearchPhrases:['pixel 9 precio','google pixel 9 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'smartwatch_generic', productName:'Smartwatch Genérico / Fitbit / Amazfit', categoryId:'watches_jewelry', aliases:['smartwatch','fitbit charge','amazfit gtr','reloj inteligente barato'], misspellings:['smart watch'], englishTerms:['fitbit charge 6','amazfit gtr 4','generic smartwatch'], spanishTerms:['reloj inteligente','smartwatch barato'], ecommerceTerms:['Fitbit Charge 6','Amazfit GTR 4','Xiaomi Smart Band 8'], commonSearchPhrases:['smartwatch barato precio','fitbit charge comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'cargador_solar_panel', productName:'Panel Solar Portátil / Cargador Solar 100W', categoryId:'chargers_cables_adapters', aliases:['panel solar portátil','cargador solar 100w','solar panel folding'], misspellings:['panel solar portatil'], englishTerms:['portable solar panel','100w solar charger'], spanishTerms:['panel solar portátil','cargador solar para camping'], ecommerceTerms:['BigBlue 28W Solar Panel','Jackery SolarSaga 100W'], commonSearchPhrases:['panel solar portátil precio','cargador solar comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'funda_laptop_sleeve', productName:'Funda Laptop / Sleeve / Maletín', categoryId:'bags_luggage_accessories', aliases:['funda laptop','laptop sleeve','maletín laptop','laptop bag 15'], misspellings:['funda para laptop'], englishTerms:['laptop sleeve 15 inch','laptop briefcase'], spanishTerms:['funda para laptop','maletín'], ecommerceTerms:['Tomtoc Laptop Sleeve 15"','Incase Icon Sleeve','Waterfield Designs Laptop Case'], commonSearchPhrases:['funda laptop precio','laptop sleeve comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'chaqueta_cuero', productName:'Chaqueta de Cuero / Leather Jacket / Moto', categoryId:'clothing_general', aliases:['chaqueta cuero','leather jacket','chaqueta motociclista','biker jacket'], misspellings:['chaqueta de cuero'], englishTerms:['leather jacket','biker jacket','moto jacket'], spanishTerms:['chaqueta de cuero','chamarra de cuero'], ecommerceTerms:['Schott NYC Perfecto Leather Motorcycle Jacket','AllSaints Cora Leather Jacket'], commonSearchPhrases:['chaqueta cuero precio','leather jacket comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'sueter_tejido', productName:'Suéter Tejido / Knit Sweater / Cardigan', categoryId:'clothing_general', aliases:['suéter tejido','knit sweater','cardigan','jersey de punto'], misspellings:['sueter tejido'], englishTerms:['knit sweater','chunky cardigan','crewneck sweater'], spanishTerms:['suéter de punto','cardigan tejido'], ecommerceTerms:['Everlane The Alpaca Crew','Mango Mohair-Effect Sweater'], commonSearchPhrases:['suéter tejido precio','cardigan comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'tela_lino_seda', productName:'Ropa de Lino / Seda / Blusa Elegante', categoryId:'clothing_general', aliases:['blusa seda','camisa lino','linen shirt','silk blouse'], misspellings:['blusa de seda'], englishTerms:['linen shirt','silk blouse','linen pants'], spanishTerms:['camisa de lino','blusa de seda'], ecommerceTerms:['Quince 100% European Linen Shirt','Equipment Silk Blouse'], commonSearchPhrases:['camisa lino precio','silk blouse comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'ropa_maternidad', productName:'Ropa Maternidad / Embarazo / Nursing', categoryId:'clothing_general', aliases:['ropa maternidad','maternity clothes','ropa embarazo','nursing bra'], misspellings:['ropa de maternidad'], englishTerms:['maternity dress','nursing bra','pregnancy clothes'], spanishTerms:['ropa de maternidad','ropa para embarazadas'], ecommerceTerms:['Seraphine Maternity Dress','Kindred Bravely Sublime Nursing Bra'], commonSearchPhrases:['ropa maternidad precio','maternity dress comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'uniforme_escolar', productName:'Uniforme Escolar / Polo Escolar / Pants', categoryId:'clothing_general', aliases:['uniforme escolar','polo escolar','pantalón escolar','school uniform'], misspellings:['uniforme de escuela'], englishTerms:['school uniform','school polo shirt','school pants'], spanishTerms:['uniforme escolar','polo escolar'], ecommerceTerms:['French Toast School Uniform Polo','Amazon Essentials School Polo'], commonSearchPhrases:['uniforme escolar precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'sarten_ceramica', productName:'Sartén de Cerámica / Always Pan / Our Place', categoryId:'home_kitchen_appliances', aliases:['sartén cerámica','always pan','our place pan','ceramic non-stick'], misspellings:['sarten ceramica'], englishTerms:['ceramic pan','our place always pan','non-stick ceramic'], spanishTerms:['sartén de cerámica','sartén antiadherente cerámica'], ecommerceTerms:['Our Place Always Pan 2.0','GreenPan Valencia Pro Ceramic'], commonSearchPhrases:['sartén cerámica precio','always pan comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'jarra_agua_filtro', productName:'Jarra Filtro Agua / Brita / ZeroWater', categoryId:'home_kitchen_appliances', aliases:['jarra filtro agua','brita filter','zerowater','pitcher filter'], misspellings:['jarra de filtro agua'], englishTerms:['water filter pitcher','brita standard pitcher'], spanishTerms:['jarra con filtro','jarra purificadora'], ecommerceTerms:['Brita Standard Water Filter Pitcher','ZeroWater 10-Cup Pitcher'], commonSearchPhrases:['jarra filtro agua precio','brita comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'thermomix_rival', productName:'Robot de Cocina / Ninja Foodi / Thermomix', categoryId:'home_kitchen_appliances', aliases:['thermomix','robot cocina','ninja foodi','magimix cook expert'], misspellings:['thermolix','robot de cocina'], englishTerms:['cooking robot','ninja foodi xl 14-in-1'], spanishTerms:['robot de cocina','cocina inteligente'], ecommerceTerms:['Ninja Foodi 14-in-1 8-qt. XL','Magimix Cook Expert'], commonSearchPhrases:['robot cocina precio','ninja foodi comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'vaporera_comida', productName:'Vaporera / Food Steamer / Olla de Vapor', categoryId:'home_kitchen_appliances', aliases:['vaporera','food steamer','olla de vapor','bamboo steamer'], misspellings:['vaporera de comida'], englishTerms:['food steamer','electric steamer','bamboo steamer set'], spanishTerms:['vaporera','cocedor al vapor'], ecommerceTerms:['Hamilton Beach Digital 2-Tier Steamer','COMFEE 6.5QT Steamer'], commonSearchPhrases:['vaporera precio','food steamer comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'tabla_madera_corte', productName:'Tabla de Cortar Madera / Cutting Board / Teak', categoryId:'home_kitchen_appliances', aliases:['tabla de cortar madera','cutting board','tabla teak','chopping board'], misspellings:['tabla de cortar'], englishTerms:['wood cutting board','teak cutting board','large chopping board'], spanishTerms:['tabla de cortar','tabla de madera para cortar'], ecommerceTerms:['Teakhaus Wood Cutting Board','OXO Good Grips Plastic Cutting Board'], commonSearchPhrases:['tabla de cortar precio','cutting board comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'pelota_futbol', productName:'Pelota de Fútbol / Adidas Brazuca / Nike', categoryId:'sports_fitness_physical', aliases:['pelota fútbol','balón fútbol','adidas brazuca','nike football'], misspellings:['pelota de futbol'], englishTerms:['soccer ball','adidas tiro league ball'], spanishTerms:['balón de fútbol','pelota de fútbol'], ecommerceTerms:['Adidas Tiro League Soccer Ball','Nike Flight Soccer Ball'], commonSearchPhrases:['pelota fútbol precio','balón adidas comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'patines_inline', productName:'Patines en Línea / Rollerblade / Quad Skates', categoryId:'sports_outdoor_variable', aliases:['patines en línea','rollerblade','inline skates','quad skates'], misspellings:['patines en linea'], englishTerms:['inline skates','rollerblade','quad roller skates'], spanishTerms:['patines en línea','patines quad'], ecommerceTerms:['Rollerblade Macroblade 84','Impala Quad Roller Skate'], commonSearchPhrases:['patines precio','rollerblade comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cuerda_escalar', productName:'Cuerda de Escalar / Arnés / Mosquetón', categoryId:'sports_outdoor_variable', aliases:['cuerda escalar','arnés escalada','mosquetón','climbing rope'], misspellings:['cuerda de escalar'], englishTerms:['climbing rope dynamic','harness climbing','carabiner'], spanishTerms:['cuerda de escalar','arnés de escalada'], ecommerceTerms:['Black Diamond 9.6mm Dry Rock Rope','Petzl Sama Harness'], commonSearchPhrases:['cuerda escalar precio','arnés escalada comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'raqueta_padel', productName:'Raqueta de Pádel / Bullpadel / Nox', categoryId:'sports_fitness_physical', aliases:['raqueta padel','bullpadel','nox padel','head padel','padel racket'], misspellings:['raqueta de pádel'], englishTerms:['padel racket','bullpadel vertex','nox ml10'], spanishTerms:['raqueta de pádel'], ecommerceTerms:['Bullpadel Vertex 03 Hybrid','NOX ML10 Shotgun'], commonSearchPhrases:['raqueta pádel precio','bullpadel comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'colchoneta_piscina', productName:'Flotador / Colchoneta Piscina / Pool Float', categoryId:'sports_outdoor_variable', aliases:['flotador piscina','colchoneta piscina','pool float','inflable piscina'], misspellings:['flotador de piscina'], englishTerms:['pool float','inflatable pool lounge'], spanishTerms:['flotador de piscina','colchoneta inflable'], ecommerceTerms:['Intex Mega Chill Inflatable Floating Cooler','SunSplash Pool Float'], commonSearchPhrases:['flotador piscina precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'guantes_pesas', productName:'Guantes para Pesas / Gym Gloves / Straps', categoryId:'sports_fitness_physical', aliases:['guantes pesas','gym gloves','lifting straps','grip gloves'], misspellings:['guantes para el gym'], englishTerms:['weight lifting gloves','lifting straps','gym grip pads'], spanishTerms:['guantes para pesas','straps de pesas'], ecommerceTerms:['Harbinger Pro Wrist-Wrap Weightlifting Gloves','Bear KompleX Hand Grips'], commonSearchPhrases:['guantes pesas precio','lifting straps comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'pañales_importados', productName:'Pañales / Diapers / Huggies / Pampers Premium', categoryId:'baby_items', aliases:['pañales importados','huggies premium','pampers pure','diapers newborn'], misspellings:['pañales premium'], englishTerms:['diapers','huggies special delivery','pampers pure'], spanishTerms:['pañales','pañales premium'], ecommerceTerms:['Huggies Special Delivery Diapers','Pampers Pure Protection Diapers'], commonSearchPhrases:['pañales importados precio','pampers pure comprar'], riskOverrideFlags:['food_adjacent'], customerHint:'Los artículos de higiene para bebé pueden requerir validación sanitaria.', adminHint:'Validar CCSS/MINSA para higiene de bebé.' },
    { productKey:'leche_formula', productName:'Fórmula / Leche de Bebé / Similac', categoryId:'baby_items', aliases:['fórmula bebé','leche de bebé','similac','enfamil','leche maternizada'], misspellings:['formula de bebe'], englishTerms:['baby formula','similac advance','enfamil neuropro'], spanishTerms:['fórmula para bebé','leche maternizada'], ecommerceTerms:['Similac Advance Infant Formula','Enfamil NeuroPro Baby Formula'], commonSearchPhrases:['fórmula bebé precio','similac comprar'], riskOverrideFlags:['food','sanitary_review'], customerHint:'Los alimentos para bebés requieren revisión sanitaria especial.', adminHint:'Validar CCSS/MINSA — alimento para bebé.' },
    { productKey:'juguete_musical_bebe', productName:'Juguete Musical Bebé / Piano Infantil', categoryId:'baby_items', aliases:['juguete musical bebé','piano infantil','vtech baby','fisher price musical'], misspellings:['juguete musical de bebe'], englishTerms:['baby musical toy','vtech learn and dance piano'], spanishTerms:['juguete musical para bebé','piano de juguete'], ecommerceTerms:['VTech Learn & Dance Interactive Zoo','Fisher-Price Kick and Play Piano Gym'], commonSearchPhrases:['juguete musical bebé precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'ventilador_torre', productName:'Ventilador Torre / Dyson Fan / Honeywell', categoryId:'home_decor_storage', aliases:['ventilador torre','dyson fan','honeywell tower fan','bladeless fan'], misspellings:['ventilador de torre'], englishTerms:['tower fan','dyson pure cool','honeywell quietset'], spanishTerms:['ventilador de torre','ventilador sin aspas'], ecommerceTerms:['Dyson Pure Cool TP09','Honeywell QuietSet 40-Inch Tower Fan'], commonSearchPhrases:['ventilador torre precio','dyson fan comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'pesas_kettlebell_set', productName:'Set Kettlebells / Bumper Plates / Barbell', categoryId:'sports_fitness_physical', aliases:['kettlebell set','bumper plates','barbell set','barra olímpica'], misspellings:['kettlebell de hierro'], englishTerms:['kettlebell set','bumper plate set','olympic barbell'], spanishTerms:['set de kettlebells','platos bumper'], ecommerceTerms:['Rep Fitness Kettlebell Set','Rogue Bumper Plates','CAP Barbell Olympic Barbell'], commonSearchPhrases:['kettlebell precio','bumper plates comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el peso considerable.', adminHint:'Verificar peso total.' },
    { productKey:'patineta_skate', productName:'Patineta / Skateboard / Longboard', categoryId:'sports_outdoor_variable', aliases:['patineta','skateboard','longboard','cruiser board'], misspellings:['skateboard tabla'], englishTerms:['skateboard','longboard','penny board'], spanishTerms:['patineta','skateboard'], ecommerceTerms:['Powell Golden Dragon Complete Skateboard','Loaded Boards Dervish Sama Longboard'], commonSearchPhrases:['patineta precio','skateboard comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'generador_electrico', productName:'Generador Eléctrico Portátil / Inverter', categoryId:'tools_hardware_common', aliases:['generador eléctrico','portable generator','inverter generator','honda generator'], misspellings:['generador electrico'], englishTerms:['portable inverter generator','honda eu2200i'], spanishTerms:['generador portátil','planta eléctrica'], ecommerceTerms:['Honda EU2200i Portable Inverter Generator','Champion 3500W Generator'], commonSearchPhrases:['generador eléctrico precio','planta eléctrica comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño y peso.', adminHint:'Verificar peso y dimensiones.' },
    { productKey:'lavadora_portatil', productName:'Lavadora Portátil / Mini Washer / Spin Dryer', categoryId:'home_kitchen_appliances', aliases:['lavadora portátil','mini washer','spin dryer','lavadora de mesa'], misspellings:['lavadora portatil'], englishTerms:['portable washing machine','mini washer','spin dryer portable'], spanishTerms:['lavadora portátil','lavadora compacta'], ecommerceTerms:['COMFEE Portable Washing Machine','Black+Decker Twin Tub Portable'], commonSearchPhrases:['lavadora portátil precio','mini washer comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'secadora_portatil', productName:'Secadora Portátil / Cloth Dryer / Rack', categoryId:'home_kitchen_appliances', aliases:['secadora portátil','portable dryer','secadora ropa pequeña'], misspellings:['secadora portatil'], englishTerms:['portable clothes dryer','compact dryer'], spanishTerms:['secadora portátil','secadora compacta'], ecommerceTerms:['ZENY Portable Compact Electric Tumble Dryer','Costway FP10039'], commonSearchPhrases:['secadora portátil precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'estacion_energia', productName:'Estación de Energía Portátil / Jackery / EcoFlow', categoryId:'lithium_batteries_powerbanks', aliases:['estación energía','jackery','ecoflow delta','portable power station','generador solar'], misspellings:['estacion de energia'], englishTerms:['portable power station','jackery explorer','ecoflow delta 2'], spanishTerms:['estación de energía portátil','batería de respaldo grande'], ecommerceTerms:['Jackery Explorer 1000 Pro','EcoFlow DELTA 2','Bluetti AC200P'], commonSearchPhrases:['estación energía precio','jackery comprar'], riskOverrideFlags:['contains_lithium_battery','dangerous_goods'], customerHint:'Las estaciones de energía contienen baterías de litio grandes — pueden tener restricciones de transporte aéreo.', adminHint:'Revisar capacidad Wh y normativa DG. Muy probablemente no aceptable por avión.' },
    { productKey:'tablet_educativa_ninos', productName:'Tablet Educativa Niños / Amazon Kids / LeapFrog', categoryId:'tablets_ereaders', aliases:['tablet niños','amazon kids tablet','leapfrog','fire kids','tablet infantil'], misspellings:['tablet educativa niños'], englishTerms:['kids tablet','amazon fire kids','leapfrog epic academy'], spanishTerms:['tablet para niños','tablet educativa'], ecommerceTerms:['Amazon Fire HD 8 Kids Tablet','LeapFrog LeapPad Academy'], commonSearchPhrases:['tablet niños precio','amazon fire kids comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'teclado_piano_midi', productName:'Teclado MIDI / Piano Digital / Yamaha P', categoryId:'microphones_audio_pro', aliases:['teclado midi','piano digital','yamaha p145','roland fp30','midi keyboard'], misspellings:['teclado MIDI piano'], englishTerms:['midi keyboard','yamaha p-145 digital piano','roland fp-30x'], spanishTerms:['piano digital','teclado midi'], ecommerceTerms:['Yamaha P-145 Digital Piano','Roland FP-30X Digital Piano','Arturia MiniLab 3'], commonSearchPhrases:['piano digital precio','teclado midi comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el peso.', adminHint:'Verificar peso.' },
    { productKey:'bateria_aaa_aa', productName:'Baterías AA / AAA / 9V / Recargables', categoryId:'chargers_cables_adapters', aliases:['baterías aa','baterías aaa','baterías recargables','eneloop','duracell'], misspellings:['baterias recargables'], englishTerms:['rechargeable batteries aa','eneloop pro','duracell batteries'], spanishTerms:['pilas recargables','baterías aa'], ecommerceTerms:['Panasonic eneloop pro AA 4-Pack','Duracell Optimum AA 12-Pack'], commonSearchPhrases:['pilas recargables precio','eneloop comprar'], riskOverrideFlags:['contains_lithium_battery'], customerHint:'Las baterías de litio pueden requerir revisión adicional para transporte.', adminHint:'Revisar tipo y restricciones.' },
    { productKey:'bano_pies_electrico', productName:'Baño de Pies Eléctrico / Foot Spa / Masajeador', categoryId:'beauty_devices', aliases:['baño pies eléctrico','foot spa','masajeador pies','foot massager'], misspellings:['baño de pies electrico'], englishTerms:['electric foot spa','foot massager bath'], spanishTerms:['baño de pies eléctrico','masajeador de pies'], ecommerceTerms:['Conair Waterfall Foot Spa','HOMEDICS Foot Spa'], commonSearchPhrases:['baño pies eléctrico precio','foot spa comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'epiladora_depilacion', productName:'Epiladora Eléctrica / Wax Kit / Depilación', categoryId:'beauty_devices', aliases:['epiladora eléctrica','wax kit','depilación cera','epilator braun'], misspellings:['epiladora electrica'], englishTerms:['epilator','waxing kit','braun epilator'], spanishTerms:['epiladora','kit de depilación con cera'], ecommerceTerms:['Braun Silk-épil 9 Epilator','WAXKISS Professional Waxing Kit'], commonSearchPhrases:['epiladora precio','wax kit comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'corrector_postura', productName:'Corrector de Postura / Back Brace / Lumbar', categoryId:'medicines_medical_products', aliases:['corrector postura','back brace','faja lumbar','posture corrector'], misspellings:['corrector de postura'], englishTerms:['posture corrector','lumbar back brace','posture support'], spanishTerms:['corrector de postura','faja lumbar'], ecommerceTerms:['ComfyBrace Posture Corrector','Mueller Lumbar Support Back Brace'], commonSearchPhrases:['corrector postura precio','faja lumbar comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'energy_drink', productName:'Bebida Energizante / Ghost / Prime / C4', categoryId:'food_beverages_review', aliases:['bebida energizante','ghost energy','prime hydration','c4 energy drink'], misspellings:['bebida energética'], englishTerms:['energy drink','ghost energy','prime hydration drink'], spanishTerms:['bebida energizante','bebida deportiva'], ecommerceTerms:['Ghost Energy Drink Case','Prime Hydration Variety Pack','C4 Energy Carbonated'], commonSearchPhrases:['ghost energy precio','prime drink comprar'], riskOverrideFlags:['food','sanitary_review'], customerHint:'Los alimentos importados pueden requerir revisión sanitaria.', adminHint:'Validar SENASA/MINSA.' },
    { productKey:'chocolate_fino', productName:'Chocolate Fino / Belga / Lindt / Godiva', categoryId:'food_beverages_review', aliases:['chocolate belga','lindt chocolate','godiva','chocolate gourmet'], misspellings:['chocolate fino belga'], englishTerms:['belgian chocolate','godiva gift box','lindt lindor'], spanishTerms:['chocolate fino','chocolates de regalo'], ecommerceTerms:['Godiva Chocolatier Gift Box','Lindt Excellence Dark Chocolate Bar'], commonSearchPhrases:['chocolate belga precio','godiva comprar'], riskOverrideFlags:['food','sanitary_review'], customerHint:'Los alimentos importados pueden requerir revisión sanitaria.', adminHint:'Validar SENASA/MINSA.' },
    { productKey:'te_importado', productName:'Té Importado / Organic / Sencha / Oolong', categoryId:'food_beverages_review', aliases:['té importado','té orgánico','sencha','oolong','puerh tea'], misspellings:['te organico importado'], englishTerms:['organic green tea','oolong tea','premium loose leaf tea'], spanishTerms:['té orgánico','té importado'], ecommerceTerms:['Ippodo Yame Gyokuro','Harney & Sons Hot Cinnamon Spice'], commonSearchPhrases:['té orgánico precio','oolong comprar'], riskOverrideFlags:['food','sanitary_review'], customerHint:'Los alimentos importados pueden requerir revisión sanitaria.', adminHint:'Validar SENASA/MINSA.' },
    { productKey:'aceite_cocina_importado', productName:'Aceite de Cocina / Oliva / Aguacate / MCT', categoryId:'food_beverages_review', aliases:['aceite de oliva','aceite aguacate','mct oil','olive oil importado'], misspellings:['aceite de oliva importado'], englishTerms:['extra virgin olive oil','avocado oil','mct oil'], spanishTerms:['aceite de oliva','aceite de aguacate'], ecommerceTerms:['California Olive Ranch EVOO','Chosen Foods 100% Pure Avocado Oil'], commonSearchPhrases:['aceite de oliva precio','aceite aguacate comprar'], riskOverrideFlags:['food','sanitary_review'], customerHint:'Los alimentos importados pueden requerir revisión sanitaria.', adminHint:'Validar SENASA/MINSA.' },
    { productKey:'medicamento_otc', productName:'Medicamento OTC / Ibuprofen / Vitamina D Rx', categoryId:'medicines_medical_products', aliases:['medicamento otc','ibuprofen','tylenol','allergy medicine','antihistamine'], misspellings:['medicamento OTC'], englishTerms:['otc medication','ibuprofen','allergy medicine'], spanishTerms:['medicamento sin receta','ibuprofeno importado'], ecommerceTerms:['Advil Ibuprofen 200mg 300ct','Claritin 24 Hour Non-Drowsy Allergy'], commonSearchPhrases:['ibuprofeno importado precio'], riskOverrideFlags:['medical','sanitary_review'], customerHint:'Los medicamentos importados requieren revisión sanitaria y pueden necesitar receta médica.', adminHint:'Revisar CCSS/MINSA — medicamentos con o sin receta.' },
    { productKey:'aceite_cbd', productName:'Aceite CBD / Hemp / Cannabidiol', categoryId:'alcohol_tobacco_vape_review', aliases:['aceite cbd','cbd oil','hemp oil','cannabidiol','cbd gummies'], misspellings:['acite cbd'], englishTerms:['cbd oil','hemp extract','cbd gummies'], spanishTerms:['aceite de cbd','cáñamo cbd'], ecommerceTerms:['Charlotte\'s Web CBD Oil','CBDistillery Full Spectrum CBD Oil'], commonSearchPhrases:['aceite cbd precio','cbd oil comprar'], riskOverrideFlags:['controlled_substance_possible','restricted_possible'], customerHint:'El CBD puede estar restringido en Costa Rica — requiere revisión especial.', adminHint:'Revisar normativa nacional para CBD/cannabidiol.' },
    { productKey:'gas_butano', productName:'Gas Butano / Cilindro / Camping Gas', categoryId:'dangerous_goods', aliases:['gas butano','camping gas','gas canister','gas isobutano'], misspellings:['gas butano camping'], englishTerms:['butane gas canister','camping fuel','isobutane canister'], spanishTerms:['gas butano','cilindro de gas para camping'], ecommerceTerms:['MSR IsoPro Canister Fuel','Snow Peak GigaPower Fuel'], commonSearchPhrases:['gas butano precio','camping gas comprar'], riskOverrideFlags:['dangerous_goods','flammable','special_transport'], customerHint:'Este producto es inflamable y tiene restricciones especiales de transporte.', adminHint:'Revisar normativa DG — gas inflamable.' },
    { productKey:'planta_viva', productName:'Planta Viva / Suculenta / Cactus / Tropical', categoryId:'plants_seeds_agro_review', aliases:['planta viva','suculenta','cactus','monstera','planta tropical importada'], misspellings:['planta viva importada'], englishTerms:['live plant','succulent','cactus','tropical plant'], spanishTerms:['planta viva','suculenta importada'], ecommerceTerms:['Costa Farms Monstera Deliciosa','Rooted Succulent Collection'], commonSearchPhrases:['planta viva precio','suculenta comprar'], riskOverrideFlags:['agro','phytosanitary_review'], customerHint:'Las plantas vivas requieren revisión fitosanitaria obligatoria para ingresar a Costa Rica.', adminHint:'Validar SFE/SENASA — fitosanitario obligatorio para plantas vivas.' },
    { productKey:'streaming_deck_elgato', productName:'Stream Deck / Elgato / Macro Pad', categoryId:'gaming_physical_accessories', aliases:['stream deck','elgato stream deck','macro pad','control panel streaming'], misspellings:['elgato stream deck'], englishTerms:['elgato stream deck mk.2','stream deck mini'], spanishTerms:['stream deck','panel de control streaming'], ecommerceTerms:['Elgato Stream Deck MK.2','Elgato Stream Deck Mini'], commonSearchPhrases:['stream deck precio','elgato deck comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'llave_seguridad', productName:'Llave de Seguridad / Cerradura Inteligente / Smart Lock', categoryId:'networking_equipment', aliases:['cerradura inteligente','smart lock','schlage encode','august lock'], misspellings:['smart lock inteligente'], englishTerms:['smart lock','schlage encode','august wifi smart lock'], spanishTerms:['cerradura inteligente','candado smart'], ecommerceTerms:['Schlage Encode Plus Smart WiFi Deadbolt','August Wi-Fi Smart Lock'], commonSearchPhrases:['cerradura inteligente precio','smart lock comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cargador_bicicleta_electrica', productName:'Cargador Bicicleta Eléctrica / Scooter Eléctrico', categoryId:'chargers_cables_adapters', aliases:['cargador ebike','scooter eléctrico cargador','e-bike charger'], misspellings:['cargador de ebike'], englishTerms:['ebike charger','electric scooter charger'], spanishTerms:['cargador para bicicleta eléctrica','cargador scooter'], ecommerceTerms:['Rad Power Bikes RadRunner Charger','Xiaomi Electric Scooter Charger'], commonSearchPhrases:['cargador ebike precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'scooter_electrico', productName:'Scooter Eléctrico / Patineta Eléctrica / Xiaomi', categoryId:'sports_outdoor_variable', aliases:['scooter eléctrico','patineta eléctrica','xiaomi scooter','ninebot segway'], misspellings:['scooter electrico'], englishTerms:['electric scooter','xiaomi mi electric scooter'], spanishTerms:['scooter eléctrico','patineta eléctrica'], ecommerceTerms:['Xiaomi Electric Scooter 4 Pro','Segway Ninebot KickScooter MAX G30LP'], commonSearchPhrases:['scooter eléctrico precio','xiaomi scooter comprar'], riskOverrideFlags:['contains_lithium_battery'], customerHint:'Los scooters eléctricos contienen baterías de litio — pueden tener restricciones de transporte.', adminHint:'Revisar normativa DG y Wh de la batería.' },
    { productKey:'tazas_mug', productName:'Tazas / Mug Térmico / Stanley / YETI', categoryId:'home_kitchen_appliances', aliases:['mug térmico','stanley tumbler','yeti mug','termos café'], misspellings:['stanley cup','yeti taza'], englishTerms:['tumbler','stanley quencher','yeti rambler mug'], spanishTerms:['vaso térmico','mug stanley'], ecommerceTerms:['Stanley Quencher H2.0 40oz','YETI Rambler 20oz Mug','Hydro Flask Coffee Mug'], commonSearchPhrases:['stanley tumbler precio','yeti mug comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'mochila_senderismo', productName:'Mochila Senderismo / Osprey / Gregory / 40L', categoryId:'bags_luggage_accessories', aliases:['mochila senderismo','osprey','gregory backpack','hiking backpack 40l'], misspellings:['mochila de senderismo'], englishTerms:['hiking backpack','osprey atmos ag 65','gregory paragon 58'], spanishTerms:['mochila de senderismo','mochila para montaña'], ecommerceTerms:['Osprey Atmos AG 65 Backpack','Gregory Paragon 58 Backpack'], commonSearchPhrases:['mochila senderismo precio','osprey backpack comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'soporte_telefono_escritorio', productName:'Soporte Celular Escritorio / Magnetic Stand', categoryId:'computer_accessories', aliases:['soporte celular escritorio','phone stand','magnetic phone stand','desk phone holder'], misspellings:['soporte de celular escritorio'], englishTerms:['phone desk stand','magnetic phone holder desktop'], spanishTerms:['soporte de celular','sostenedor para celular'], ecommerceTerms:['Lamicall Phone Stand','Anker 3-in-1 MagSafe Charging Stand'], commonSearchPhrases:['soporte celular escritorio precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'teclado_gaming_rgb', productName:'Teclado RGB / Hotswap / Corsair / Ducky', categoryId:'computer_accessories', aliases:['teclado rgb','hotswap keyboard','corsair k70','ducky one 3','keychron q'], misspellings:['teclado rgb gaming'], englishTerms:['rgb gaming keyboard','hot-swap keyboard','corsair k70 rgb'], spanishTerms:['teclado gamer rgb','teclado mecánico rgb'], ecommerceTerms:['Corsair K70 RGB Pro','Ducky One 3 TKL','Keychron Q1 Pro'], commonSearchPhrases:['teclado rgb precio','corsair k70 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cámara_espejo_dslr', productName:'Cámara DSLR / Reflex / Canon EOS / Nikon D', categoryId:'cameras_photo_video', aliases:['cámara dslr','cámara reflex','canon eos rebel','nikon d3500','nikon d7500'], misspellings:['cámara réflex'], englishTerms:['dslr camera','canon eos rebel t8i','nikon d7500'], spanishTerms:['cámara réflex','cámara dslr'], ecommerceTerms:['Canon EOS Rebel T8i DSLR','Nikon D3500 DSLR Camera'], commonSearchPhrases:['cámara dslr precio','canon rebel comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'bateria_laptop', productName:'Batería de Laptop / Reemplazo / OEM', categoryId:'lithium_batteries_powerbanks', aliases:['batería laptop','laptop battery replacement','batería de repuesto laptop'], misspellings:['bateria de laptop'], englishTerms:['laptop replacement battery','oem laptop battery'], spanishTerms:['batería de repuesto para laptop'], ecommerceTerms:['Anker 45W Laptop Battery Replacement','Lenovo ThinkPad Battery'], commonSearchPhrases:['batería laptop repuesto precio'], riskOverrideFlags:['contains_lithium_battery'], customerHint:'Las baterías de litio pueden requerir revisión adicional para transporte.', adminHint:'Revisar capacidad Wh y normativa de transporte.' },
    { productKey:'smart_tv_box', productName:'Android TV Box / NVIDIA Shield / Apple TV', categoryId:'tv_projectors_streaming', aliases:['android tv box','nvidia shield','apple tv','kodi box','tv stick android'], misspellings:['android tv stick'], englishTerms:['android tv box','nvidia shield pro','google tv dongle'], spanishTerms:['caja android tv','decodificador android'], ecommerceTerms:['NVIDIA Shield TV Pro','Google Chromecast with Google TV 4K','Formuler Z11 Pro Max'], commonSearchPhrases:['android tv box precio','nvidia shield comprar'], riskOverrideFlags:['telecom_possible'], customerHint:'', adminHint:'Verificar homologación SUTEL.' },
    { productKey:'selfie_stick', productName:'Selfie Stick / Palo Selfie / Trípode Portátil', categoryId:'cameras_photo_video', aliases:['selfie stick','palo selfie','selfie palo','mini tripod phone'], misspellings:['palo de selfie'], englishTerms:['selfie stick','mini tripod selfie'], spanishTerms:['palo de selfie','palo para fotos'], ecommerceTerms:['GorillaPod Mini Tripod','UBeesize Phone Tripod with Remote'], commonSearchPhrases:['selfie stick precio','palo selfie comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'pantallas_acrilico', productName:'Pantalla Acrílica / Separador / Desk Divider', categoryId:'office_stationery_art', aliases:['pantalla acrílica','desk divider','separador escritorio','office partition'], misspellings:['pantalla acrilica'], englishTerms:['acrylic desk divider','desk partition screen'], spanishTerms:['pantalla de escritorio','separador de oficina'], ecommerceTerms:['Luxor Acrylic Desktop Divider','Fab Glass Acrylic Sneeze Guard'], commonSearchPhrases:['separador escritorio precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'caja_herramientas', productName:'Caja de Herramientas / Tool Chest / Stanley', categoryId:'tools_hardware_common', aliases:['caja herramientas','tool chest','caja stanley','tool box'], misspellings:['caja de herramientas'], englishTerms:['tool chest','stanley tool box','portable tool storage'], spanishTerms:['caja de herramientas','maletín de herramientas'], ecommerceTerms:['Stanley FatMax Tool Chest','Husky 46 in. 9-Drawer Mobile Workbench'], commonSearchPhrases:['caja herramientas precio','tool chest comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el peso.', adminHint:'Verificar peso.' },
    { productKey:'detector_metales', productName:'Detector de Metales / Garrett / Minelab', categoryId:'tools_hardware_common', aliases:['detector metales','metal detector','garrett ace','minelab equinox'], misspellings:['detector de metales'], englishTerms:['metal detector','garrett ace 400','minelab equinox 800'], spanishTerms:['detector de metales'], ecommerceTerms:['Garrett ACE 400 Metal Detector','Minelab EQUINOX 800'], commonSearchPhrases:['detector metales precio','garrett ace comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'termo_stanley', productName:'Termo / Stanley / YETI / Camelbak', categoryId:'home_kitchen_appliances', aliases:['termo stanley','yeti rambler','camelbak insulated','thermos bottle'], misspellings:['termo stanley cup'], englishTerms:['insulated water bottle','stanley classic bottle','yeti rambler 36oz'], spanishTerms:['termo','botella térmica'], ecommerceTerms:['Stanley Classic Legendary Bottle 1.5qt','YETI Rambler 36oz Bottle','Hydro Flask 32oz Wide Mouth'], commonSearchPhrases:['termo stanley precio','yeti rambler comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'maletin_cuero', productName:'Maletín de Cuero / Laptop Bag Formal', categoryId:'bags_luggage_accessories', aliases:['maletín cuero','leather briefcase','laptop bag formal','maletín ejecutivo'], misspellings:['maletin de cuero'], englishTerms:['leather briefcase','laptop messenger bag'], spanishTerms:['maletín de cuero','maletín ejecutivo'], ecommerceTerms:['Samsonite Classic Business Slim Briefcase','Tumi Alpha 3 Briefcase'], commonSearchPhrases:['maletín cuero precio','leather briefcase comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cuaderno_leuchtturm', productName:'Cuaderno Leuchtturm / Moleskine / Rhodia', categoryId:'office_stationery_art', aliases:['cuaderno leuchtturm','moleskine','rhodia','libreta premium'], misspellings:['cuaderno moleskine'], englishTerms:['leuchtturm1917 notebook','moleskine classic notebook'], spanishTerms:['cuaderno leuchtturm','libreta moleskine'], ecommerceTerms:['Leuchtturm1917 Medium A5 Hardcover Notebook','Moleskine Classic Ruled Notebook'], commonSearchPhrases:['moleskine precio','leuchtturm1917 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'collar_cuero_perro', productName:'Collar de Cuero / Personalizado / Luxury Pet', categoryId:'pet_accessories', aliases:['collar cuero perro','luxury pet collar','personalizado collar mascota'], misspellings:['collar de cuero para perro'], englishTerms:['leather dog collar','personalized pet collar'], spanishTerms:['collar de cuero para perro','collar personalizado'], ecommerceTerms:['Orvis Personalized Dog Collar','Soft Touch Collars Leather Collar'], commonSearchPhrases:['collar cuero perro precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'gafas_vr', productName:'Gafas VR / Meta Quest / PlayStation VR', categoryId:'gaming_consoles_electronics', aliases:['gafas vr','meta quest','psvr2','oculus quest','realidad virtual'], misspellings:['gafas de realidad virtual'], englishTerms:['vr headset','meta quest 3','psvr2'], spanishTerms:['gafas de realidad virtual','visor vr'], ecommerceTerms:['Meta Quest 3 128GB','PlayStation VR2'], commonSearchPhrases:['meta quest 3 precio','vr headset comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'auriculares_sony_ze', productName:'Sony LinkBuds / WF-1000XM5 / Inear', categoryId:'headphones_audio_personal', aliases:['sony linkbuds','sony wf 1000xm5','sony inear','sony truly wireless'], misspellings:['sony wf1000xm5'], englishTerms:['sony wf-1000xm5','sony linkbuds s'], spanishTerms:['audífonos sony inalámbricos','sony wf'], ecommerceTerms:['Sony WF-1000XM5 True Wireless','Sony LinkBuds S'], commonSearchPhrases:['sony wf1000xm5 precio','sony linkbuds comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'mini_frigorifico', productName:'Mini Refrigerador / Fridge / Beverage Cooler', categoryId:'home_kitchen_appliances', aliases:['mini refrigerador','mini fridge','beverage cooler','pequeño refrigerador'], misspellings:['mini refrigerador'], englishTerms:['mini fridge','compact refrigerator','beverage cooler'], spanishTerms:['mini refrigerador','frigobar'], ecommerceTerms:['Frigidaire EFMIS129 Mini Portable Compact Personal Fridge','hOmeLabs Beverage Refrigerator'], commonSearchPhrases:['mini fridge precio','frigobar comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño y peso.', adminHint:'Verificar dimensiones y peso.' },
    { productKey:'silla_escritorio_basica', productName:'Silla de Escritorio / Task Chair / Office Depot', categoryId:'office_stationery_art', aliases:['silla escritorio','task chair','silla de oficina básica','office chair'], misspellings:['silla de escritorio'], englishTerms:['office desk chair','task chair','computer chair'], spanishTerms:['silla de escritorio','silla de oficina'], ecommerceTerms:['Amazon Basics Ergonomic Adjustable Chair','HON Ignition Task Chair'], commonSearchPhrases:['silla escritorio precio','office chair comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño.', adminHint:'Verificar dimensiones.' },
    // ════════════════ TASK #384 EXPANSION BATCH 2 ════════════════
    { productKey:'microfono_usb_alt', productName:'Micrófono USB / Blue Yeti / Podcast', categoryId:'microphones_audio_pro', aliases:['micrófono usb','blue yeti','podcast mic','rode nt-usb','shure mv7'], misspellings:['microfono usb','micro usb'], englishTerms:['usb microphone','blue yeti','shure mv7'], spanishTerms:['micrófono usb','micrófono podcast'], ecommerceTerms:['Blue Yeti USB Microphone','Shure MV7 Podcast Mic','Rode NT-USB Mini'], commonSearchPhrases:['micrófono usb precio','blue yeti comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'microfono_condensador', productName:'Micrófono de Condensador / XLR / Audio Interface', categoryId:'microphones_audio_pro', aliases:['micrófono condensador','xlr mic','audio interface','focusrite scarlett'], misspellings:['microfono condensador','focusrite scarlet'], englishTerms:['condenser microphone','focusrite scarlett solo','audio interface'], spanishTerms:['micrófono de condensador','interfaz de audio'], ecommerceTerms:['Audio-Technica AT2020','Focusrite Scarlett Solo 4th Gen','Rode NT1 5th Gen'], commonSearchPhrases:['micrófono condensador precio','focusrite scarlett comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'interfaz_audio_alt', productName:'Interfaz de Audio / Focusrite / PreSonus', categoryId:'microphones_audio_pro', aliases:['interfaz audio','audio interface','focusrite','presonus audiobox','universal audio'], misspellings:['interfaz de audio focusrite'], englishTerms:['audio interface','focusrite scarlett 2i2','presonus audiobox'], spanishTerms:['interfaz de audio','tarjeta de sonido externa'], ecommerceTerms:['Focusrite Scarlett 2i2 4th Gen','PreSonus AudioBox USB 96'], commonSearchPhrases:['interfaz audio precio','focusrite 2i2 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'controlador_dj', productName:'Controlador DJ / Pioneer / Native Instruments', categoryId:'microphones_audio_pro', aliases:['controlador dj','pioneer dj','ddj-400','native instruments','traktor'], misspellings:['controlador de dj'], englishTerms:['dj controller','pioneer ddj-400','native instruments traktor kontrol'], spanishTerms:['controlador dj','mixer dj'], ecommerceTerms:['Pioneer DJ DDJ-400','Native Instruments Traktor Kontrol S4 MK3'], commonSearchPhrases:['controlador dj precio','pioneer ddj-400 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'lentes_contacto_alt', productName:'Lentes de Contacto / Acuvue / Alcon', categoryId:'eyewear_medical_contact_lenses', aliases:['lentes de contacto','contact lenses','acuvue oasys','alcon air optix'], misspellings:['lentes contacto'], englishTerms:['contact lenses','acuvue oasys','daily contacts'], spanishTerms:['lentes de contacto','pupilentes'], ecommerceTerms:['Acuvue Oasys 1-Day','Alcon Dailies AquaComfort Plus'], commonSearchPhrases:['lentes de contacto precio','acuvue comprar'], riskOverrideFlags:['medical','sanitary_review'], customerHint:'Los lentes de contacto son dispositivos médicos y pueden requerir revisión sanitaria.', adminHint:'Verificar si requiere prescripción y registro sanitario.' },
    { productKey:'lentes_lectura', productName:'Lentes de Lectura / Blue Light Glasses', categoryId:'eyewear_optical', aliases:['lentes de lectura','blue light glasses','antireflejos','gafas luz azul'], misspellings:['lentes de leer'], englishTerms:['reading glasses','blue light blocking glasses'], spanishTerms:['gafas para leer','lentes para computadora'], ecommerceTerms:['Foster Grant Reading Glasses','Felix Gray Blue Light Glasses'], commonSearchPhrases:['lentes de lectura precio','blue light glasses comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'comida_perro_premium', productName:'Comida Premium Perro / Royal Canin / Orijen', categoryId:'pet_food_supplements_review', aliases:['comida perro premium','royal canin','orijen','blue buffalo','dog food premium'], misspellings:['royal canin perro'], englishTerms:['premium dog food','royal canin','orijen original'], spanishTerms:['comida premium para perro','alimento premium canino'], ecommerceTerms:['Royal Canin Medium Adult Dry Dog Food','Orijen Original Dry Dog Food'], commonSearchPhrases:['comida premium perro precio','royal canin comprar'], riskOverrideFlags:['food','sanitary_review'], customerHint:'Los alimentos importados para mascotas pueden requerir revisión sanitaria.', adminHint:'Validar SENASA para alimentos de mascotas.' },
    { productKey:'comida_gato_premium', productName:'Comida Premium Gato / Purina Pro Plan / Hills', categoryId:'pet_food_supplements_review', aliases:['comida gato premium','purina pro plan','hills science diet','wet cat food'], misspellings:['purina pro plan gato'], englishTerms:['hill\'s science diet cat','purina pro plan cat'], spanishTerms:['comida premium para gato','alimento premium felino'], ecommerceTerms:['Hill\'s Science Diet Adult Cat Food','Purina Pro Plan Wet Cat Food'], commonSearchPhrases:['comida premium gato precio','hills gato comprar'], riskOverrideFlags:['food','sanitary_review'], customerHint:'Los alimentos importados para mascotas pueden requerir revisión sanitaria.', adminHint:'Validar SENASA.' },
    { productKey:'suplemento_mascota', productName:'Suplemento Mascota / Articulaciones / Omega', categoryId:'pet_food_supplements_review', aliases:['suplemento mascotas','omega para perro','glucosamina perro','pet supplement'], misspellings:['suplemento para mascotas'], englishTerms:['dog joint supplement','omega 3 for dogs','pet vitamins'], spanishTerms:['suplemento para mascotas','omega para perros'], ecommerceTerms:['Zesty Paws Mobility Bites','Nutramax Dasuquin with MSM'], commonSearchPhrases:['suplemento mascota precio'], riskOverrideFlags:['supplement','sanitary_review'], customerHint:'Los suplementos para mascotas pueden requerir revisión sanitaria.', adminHint:'Validar SENASA.' },
    { productKey:'juguete_mascota_alt', productName:'Juguete Mascota / Kong / Chew Toy', categoryId:'pet_accessories', aliases:['juguete perro','kong dog','chew toy','ball launcher','fetch toy'], misspellings:['juguete de perro'], englishTerms:['dog toy','kong dog toy','chew toy'], spanishTerms:['juguete para perro','juguete para gato'], ecommerceTerms:['KONG Classic Dog Toy','Chuckit! Ultra Ball','ZippyPaws Skinny Peltz'], commonSearchPhrases:['juguete perro precio','kong dog comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'comedero_automatico', productName:'Comedero Automático / Pet Feeder / Fountain', categoryId:'pet_accessories', aliases:['comedero automático','pet feeder','fuente agua gato','automatic feeder'], misspellings:['comedero automatico mascota'], englishTerms:['automatic pet feeder','pet water fountain'], spanishTerms:['comedero automático','bebedero fuente para gato'], ecommerceTerms:['PetSafe Automatic Pet Feeder','Catit Flower Fountain'], commonSearchPhrases:['comedero automático precio','pet feeder comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'planta_artificial', productName:'Planta Artificial / Decoración / Succulents', categoryId:'home_decor_storage', aliases:['plantas artificiales','planta decorativa','succulents artificiales','faux plant'], misspellings:['plantas artificiales decoracion'], englishTerms:['artificial plant','faux succulent','fake plant decor'], spanishTerms:['plantas artificiales','plantas decorativas'], ecommerceTerms:['Nearly Natural 5-ft Fiddle Leaf','IKEA FEJKA Artificial Plant'], commonSearchPhrases:['planta artificial precio','plantas decorativas comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'tierra_sustrato', productName:'Tierra / Sustrato Especial / Musgo', categoryId:'plants_seeds_agro_review', aliases:['sustrato especial','musgo sphagnum','tierra para orquídeas','perlita'], misspellings:['sustrato para plantas'], englishTerms:['sphagnum moss','orchid potting mix','perlite'], spanishTerms:['sustrato para plantas','tierra especial'], ecommerceTerms:['Miracle-Gro Orchid Potting Mix','Hoffman Horticultural Perlite'], commonSearchPhrases:['sustrato especial precio','musgo sphagnum comprar'], riskOverrideFlags:['agro','phytosanitary_review'], customerHint:'Los sustratos y materiales de origen vegetal pueden requerir revisión fitosanitaria.', adminHint:'Validar SFE/SENASA.' },
    { productKey:'gorra_snapback', productName:'Gorra / Snapback / Cap / Beanie', categoryId:'clothing_accessories', aliases:['gorra snapback','snapback','beanie','gorra nueva era','hat cap'], misspellings:['gorra snap back'], englishTerms:['snapback cap','fitted hat','beanie hat','new era cap'], spanishTerms:['gorra','cachucha','gorro beanie'], ecommerceTerms:['New Era 59FIFTY Fitted Cap','Carhartt Acrylic Watch Hat'], commonSearchPhrases:['gorra snapback precio','new era cap comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cinturon_cuero', productName:'Cinturón / Belt / Piel / Coach', categoryId:'clothing_accessories', aliases:['cinturón cuero','belt leather','cinturón de cuero','correa'], misspellings:['cinturon cuero'], englishTerms:['leather belt','dress belt'], spanishTerms:['cinturón de cuero','correa'], ecommerceTerms:['Levi\'s Men\'s Reversible Casual Jeans Belt','Coach Men\'s Harness Buckle Cut-To-Size Belt'], commonSearchPhrases:['cinturón precio','belt cuero comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'bufanda_lana', productName:'Bufanda / Scarf / Lana / Cachmere', categoryId:'clothing_accessories', aliases:['bufanda lana','scarf','bufanda cashmere','pañoleta'], misspellings:['bufanda de lana'], englishTerms:['wool scarf','cashmere scarf'], spanishTerms:['bufanda','pañoleta'], ecommerceTerms:['Acne Studios Scarf','Uniqlo Heattech Inner Scarf'], commonSearchPhrases:['bufanda precio','scarf cashmere comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'guantes_invierno', productName:'Guantes de Invierno / Touchscreen Gloves', categoryId:'clothing_accessories', aliases:['guantes invierno','touchscreen gloves','guantes táctiles'], misspellings:['guantes de invierno'], englishTerms:['winter gloves','touchscreen gloves'], spanishTerms:['guantes de invierno','guantes de pantalla táctil'], ecommerceTerms:['Mujjo Full Leather Touchscreen Gloves','The North Face Etip Gloves'], commonSearchPhrases:['guantes invierno precio','touchscreen gloves comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'funda_iphone', productName:'Funda iPhone / Case / MagSafe Compatible', categoryId:'phones_smartphones', aliases:['funda iphone','case iphone','magsafe case','phone case','carcasa iphone'], misspellings:['funda de iphone'], englishTerms:['iphone case','magsafe compatible case','clear case iphone'], spanishTerms:['funda para iphone','carcasa iphone'], ecommerceTerms:['Apple Clear Case with MagSafe','Casetify Impact Case','OtterBox Defender'], commonSearchPhrases:['funda iphone 15 precio','case magsafe comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'protector_pantalla', productName:'Protector de Pantalla / Vidrio Templado', categoryId:'phones_smartphones', aliases:['protector pantalla','vidrio templado','screen protector','tempered glass'], misspellings:['protector de pantalla'], englishTerms:['tempered glass screen protector','screen protector'], spanishTerms:['protector de pantalla','vidrio templado'], ecommerceTerms:['amFilm 2-Pack Tempered Glass','Belkin UltraGlass Screen Protector'], commonSearchPhrases:['protector pantalla precio','vidrio templado comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'soporte_celular_auto', productName:'Soporte Celular / Car Mount / Magnético', categoryId:'automotive_simple_accessories', aliases:['soporte celular auto','car mount','soporte magnético carro','phone holder car'], misspellings:['soporte para celular en carro'], englishTerms:['car phone mount','magnetic phone holder'], spanishTerms:['soporte para celular en carro','sostenedor celular'], ecommerceTerms:['Anker Car Phone Mount','iOttie Easy One Touch 5'], commonSearchPhrases:['soporte celular carro precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'lente_telefono', productName:'Lente para Teléfono / Clip Lens / Wide Angle', categoryId:'cameras_photo_video', aliases:['lente teléfono','clip lens','wide angle phone','macro lens phone'], misspellings:['lente de celular'], englishTerms:['clip-on phone lens','wide angle smartphone lens'], spanishTerms:['lente para teléfono','lente gran angular celular'], ecommerceTerms:['Moment Wide Lens 18mm','Moment Macro Lens 10x'], commonSearchPhrases:['lente para teléfono precio','clip lens comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'tripode_fotografia', productName:'Trípode Fotográfico / Gorilla Pod / Travel', categoryId:'cameras_photo_video', aliases:['trípode','gorilla pod','tripod','tripié cámara'], misspellings:['tripode fotografia','tripie'], englishTerms:['camera tripod','gorilla pod','travel tripod'], spanishTerms:['trípode','tripié cámara'], ecommerceTerms:['GorillaPod 3K Pro','Peak Design Travel Tripod','Joby GripTight Pro'], commonSearchPhrases:['trípode precio','gorilla pod comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'microfono_lavalier', productName:'Micrófono Lavalier / DJI Mic / Rode', categoryId:'microphones_audio_pro', aliases:['micrófono lavalier','lav mic','dji mic','rode wireless go','clip mic'], misspellings:['microfono lavalier'], englishTerms:['lavalier microphone','dji mic mini','rode wireless go 2'], spanishTerms:['micrófono de solapa','lav mic'], ecommerceTerms:['DJI Mic Mini','Rode Wireless GO II','Movo LV4-O'], commonSearchPhrases:['micrófono lavalier precio','dji mic comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'gimbal_celular', productName:'Gimbal para Celular / DJI OM / Hohem', categoryId:'cameras_photo_video', aliases:['gimbal celular','dji om 6','estabilizador celular','phone stabilizer'], misspellings:['gimbal de celular'], englishTerms:['phone gimbal','dji om 6','hohem isteady'], spanishTerms:['gimbal para celular','estabilizador de teléfono'], ecommerceTerms:['DJI OM 6 Smartphone Gimbal','Hohem iSteady M6'], commonSearchPhrases:['gimbal celular precio','dji om 6 comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'ring_light', productName:'Ring Light / Aro de Luz / Streaming Light', categoryId:'cameras_photo_video', aliases:['ring light','aro de luz','led ring light','streaming light'], misspellings:['ring lite'], englishTerms:['ring light','led ring light'], spanishTerms:['aro de luz','ring light'], ecommerceTerms:['Neewer 18-inch Ring Light Kit','Elgato Key Light'], commonSearchPhrases:['ring light precio','aro de luz comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'teclado_bluetooth_tablet', productName:'Teclado Bluetooth / Logitech Keys-To-Go', categoryId:'computer_accessories', aliases:['teclado bluetooth','logitech keys to go','teclado inalámbrico tablet'], misspellings:['teclado bluetooh'], englishTerms:['bluetooth keyboard','logitech keys-to-go','folding keyboard'], spanishTerms:['teclado inalámbrico','teclado bluetooth'], ecommerceTerms:['Logitech Keys-To-Go 2','Logitech MX Keys Mini','Microsoft Designer Compact Keyboard'], commonSearchPhrases:['teclado bluetooth precio','logitech mx keys comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'ups_regulador', productName:'UPS / Regulador de Voltaje / APC', categoryId:'computer_accessories', aliases:['ups','regulador voltaje','apc ups','no break','back-ups'], misspellings:['regulador de voltaje'], englishTerms:['ups battery backup','voltage regulator','apc back-ups'], spanishTerms:['ups','regulador de voltaje','no-break'], ecommerceTerms:['APC Back-UPS 600VA','CyberPower CP1500PFCLCD'], commonSearchPhrases:['ups precio','regulador voltaje comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'extension_electrica', productName:'Extensión Eléctrica / Power Strip / Surge Protector', categoryId:'computer_accessories', aliases:['extensión eléctrica','power strip','regleta','surge protector','extensión con USB'], misspellings:['extension electrica'], englishTerms:['power strip','surge protector','extension cord with usb'], spanishTerms:['extensión eléctrica','regleta con USB'], ecommerceTerms:['Anker PowerStrip 6-Outlet','Tripp Lite 8-Outlet Surge Protector'], commonSearchPhrases:['extensión eléctrica precio','power strip comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'camara_seguridad_ip', productName:'Cámara de Seguridad IP / WiFi / TP-Link Tapo', categoryId:'networking_equipment', aliases:['cámara seguridad ip','cámara wifi','tapo camera','wyze cam','reolink'], misspellings:['camara de seguridad ip'], englishTerms:['ip security camera','wifi camera','tp-link tapo'], spanishTerms:['cámara de seguridad wifi','cámara ip'], ecommerceTerms:['TP-Link Tapo C310','Reolink E1 Outdoor','Wyze Cam v3'], commonSearchPhrases:['cámara seguridad wifi precio','tapo camera comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'nas_storage', productName:'NAS / Network Storage / Synology', categoryId:'storage_memory', aliases:['nas synology','qnap','network attached storage','servidor nas'], misspellings:['nas storage'], englishTerms:['nas server','synology ds223','qnap ts-233'], spanishTerms:['almacenamiento en red','nas'], ecommerceTerms:['Synology DiskStation DS223','QNAP TS-233'], commonSearchPhrases:['nas precio','synology comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'ropa_outdoor_gore', productName:'Chaqueta Outdoor / Gore-Tex / North Face', categoryId:'sports_outdoor_variable', aliases:['chaqueta gore-tex','north face jacket','patagonia','chaqueta outdoor'], misspellings:['chaqueta gore tex'], englishTerms:['gore-tex jacket','waterproof jacket','north face resolve'], spanishTerms:['chaqueta impermeable','cortaviento'], ecommerceTerms:['The North Face Resolve 2 Jacket','Patagonia Torrentshell 3L'], commonSearchPhrases:['chaqueta gore-tex precio','north face comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'camisa_hawaiana', productName:'Camisa Hawaiana / Resort Wear / Tropical', categoryId:'clothing_general', aliases:['camisa hawaiana','hawaiian shirt','camisa tropical','aloha shirt'], misspellings:['camisa hawaiiana'], englishTerms:['hawaiian shirt','aloha shirt','resort shirt'], spanishTerms:['camisa hawaiana','camisa floral'], ecommerceTerms:['Reyn Spooner Classic Fit Hawaiian Shirt','Tommy Bahama Camp Shirt'], commonSearchPhrases:['camisa hawaiana precio','aloha shirt comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'ropa_termica', productName:'Ropa Térmica / Base Layer / Smartwool', categoryId:'clothing_general', aliases:['ropa térmica','base layer','smartwool','merino wool base','thermal underwear'], misspellings:['ropa termica'], englishTerms:['thermal base layer','merino wool shirt','smartwool base layer'], spanishTerms:['ropa interior térmica','base layer'], ecommerceTerms:['Smartwool Merino 150 Base Layer','Icebreaker 200 Oasis Crew'], commonSearchPhrases:['ropa térmica precio','base layer merino comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'pantalon_cargo', productName:'Pantalón Cargo / Tactical / Multi-bolsillo', categoryId:'clothing_general', aliases:['pantalón cargo','cargo pants','pantalón táctico','pantalón multi bolsillo'], misspellings:['pantalon cargo'], englishTerms:['cargo pants','tactical pants'], spanishTerms:['pantalón cargo','pantalón con muchos bolsillos'], ecommerceTerms:['Carhartt Men\'s Rugged Flex Rigby Cargo Pant','5.11 Tactical Stryke Pant'], commonSearchPhrases:['pantalón cargo precio','cargo pants comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'traje_bano_alt', productName:'Traje de Baño / Bikini / Bañador', categoryId:'clothing_general', aliases:['traje de baño','bikini','bañador','swimsuit','traje baño mujer'], misspellings:['traje de baño'], englishTerms:['swimsuit','bikini','swim trunks'], spanishTerms:['traje de baño','bañador'], ecommerceTerms:['Cupshe One-Piece Swimsuit','Speedo Endurance+ Swimsuit','O\'Neill Board Shorts'], commonSearchPhrases:['traje de baño precio','bikini comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'medias_socks_pack', productName:'Medias / Calcetines Pack / Bombas Socks', categoryId:'clothing_general', aliases:['medias pack','calcetines bombas','bombas socks','lululemon socks'], misspellings:['calcetines pack'], englishTerms:['socks multipack','bombas ankle socks'], spanishTerms:['medias pack','calcetines'], ecommerceTerms:['Bombas Ankle Socks 4-Pack','Lululemon Power Stride Ankle Socks'], commonSearchPhrases:['calcetines pack precio','bombas socks comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'aceite_rosehip', productName:'Aceite Facial / Rosehip / Argan / Bakuchiol', categoryId:'beauty_skincare_personal_care', aliases:['aceite rosehip','aceite facial','argan oil','bakuchiol oil','rosehip oil'], misspellings:['aceite de rosa mosqueta'], englishTerms:['rosehip seed oil','argan oil','facial oil'], spanishTerms:['aceite de rosa mosqueta','aceite facial'], ecommerceTerms:['Trilogy Certified Pure Rosehip Oil','Josie Maran 100% Pure Argan Oil'], commonSearchPhrases:['aceite rosehip precio','argan oil comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'exfoliante_corporal', productName:'Exfoliante Corporal / Scrub / AHA BHA', categoryId:'beauty_skincare_personal_care', aliases:['exfoliante corporal','body scrub','aha bha exfoliant','scrub azucar'], misspellings:['exfoliante corporal'], englishTerms:['body scrub','aha exfoliant','bha toner'], spanishTerms:['exfoliante corporal','scrub de azúcar'], ecommerceTerms:['Tree Hut Shea Sugar Scrub','Paula\'s Choice BHA Exfoliant'], commonSearchPhrases:['exfoliante corporal precio','body scrub comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'crema_manos_lujo', productName:'Crema de Manos Lujo / L\'Occitane / Aesop', categoryId:'beauty_skincare_personal_care', aliases:['crema manos l\'occitane','aesop hand cream','crema de manos lujo'], misspellings:['crema de manos'], englishTerms:['l\'occitane hand cream','aesop resurrection aromatique hand balm'], spanishTerms:['crema de manos de lujo'], ecommerceTerms:['L\'Occitane Shea Butter Hand Cream 150ml','Aesop Resurrection Hand Balm'], commonSearchPhrases:['crema manos l\'occitane precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'shampoo_seco', productName:'Shampoo Seco / Dry Shampoo / Batiste', categoryId:'beauty_skincare_personal_care', aliases:['shampoo seco','dry shampoo','batiste','not your mothers dry shampoo'], misspellings:['shampoo en seco'], englishTerms:['dry shampoo','batiste dry shampoo'], spanishTerms:['shampoo seco','champú en seco'], ecommerceTerms:['Batiste Dry Shampoo Original','Living Proof Perfect Hair Day Dry Shampoo'], commonSearchPhrases:['shampoo seco precio','dry shampoo comprar'], riskOverrideFlags:['aerosol'], customerHint:'Aerosol — puede tener restricciones de transporte.', adminHint:'Revisar normativa aerosoles.' },
    { productKey:'kit_unas', productName:'Kit Uñas / Nail Art / Gel UV / Polygel', categoryId:'beauty_makeup_cosmetics', aliases:['kit uñas gel','polygel kit','nail art','lampara uñas uv'], misspellings:['kit de uñas'], englishTerms:['nail art kit','polygel nail kit','uv led nail lamp'], spanishTerms:['kit de uñas','gel para uñas'], ecommerceTerms:['Makartt Polygel Nail Kit','LKE Gel Nail Polish Set'], commonSearchPhrases:['kit uñas gel precio','polygel comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'dermapen', productName:'Dermapen / Microneedling / Dermaroller', categoryId:'beauty_devices', aliases:['dermapen','microneedling','dermaroller','dr pen'], misspellings:['derma pen'], englishTerms:['dermapen','microneedling pen','dermaroller 0.5mm'], spanishTerms:['dermapen','microagujamiento'], ecommerceTerms:['Dr. Pen Ultima A6 Pro','DermaBoss Derma Roller'], commonSearchPhrases:['dermapen precio','dermaroller comprar'], riskOverrideFlags:['medical'], customerHint:'Este dispositivo médico-estético puede requerir revisión.', adminHint:'Verificar clasificación médica o cosmética.' },
    { productKey:'led_mask', productName:'Mascarilla LED / Red Light Therapy', categoryId:'beauty_devices', aliases:['mascarilla led','led therapy mask','luz roja facial','red light mask'], misspellings:['mascara led facial'], englishTerms:['led face mask','red light therapy device'], spanishTerms:['mascarilla de luz led','terapia de luz roja'], ecommerceTerms:['Currentbody Skin LED Light Therapy Mask','Project E Beauty LED Mask'], commonSearchPhrases:['mascarilla led precio','red light therapy comprar'], riskOverrideFlags:['medical'], customerHint:'', adminHint:'Verificar clasificación médica.' },
    { productKey:'colchon_importado', productName:'Colchón / Topper / Memory Foam', categoryId:'home_decor_storage', aliases:['colchón','topper colchón','memory foam mattress','casper mattress'], misspellings:['colchon de memoria'], englishTerms:['memory foam mattress','mattress topper','bed in a box'], spanishTerms:['colchón de espuma','topper para cama'], ecommerceTerms:['Casper Original Foam Mattress','Lucid 2-inch Memory Foam Topper'], commonSearchPhrases:['colchón memory foam precio','mattress topper comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño y peso del artículo.', adminHint:'Verificar dimensiones y peso.' },
    { productKey:'almohada_ergonomica', productName:'Almohada Ergonómica / Cervical / Coop', categoryId:'home_decor_storage', aliases:['almohada ergonómica','cervical pillow','coop home goods','memory foam pillow'], misspellings:['almohada ergonomica'], englishTerms:['cervical pillow','adjustable memory foam pillow'], spanishTerms:['almohada cervical','almohada ergonómica'], ecommerceTerms:['Coop Home Goods Original Pillow','Tempur-Pedic TEMPUR-Cloud Pillow'], commonSearchPhrases:['almohada ergonómica precio','cervical pillow comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'set_cubiertos_acero', productName:'Set Cubiertos Acero / Vajilla / WMF', categoryId:'home_kitchen_appliances', aliases:['set cubiertos','vajilla','wmf','christofle','cubiertos acero inox'], misspellings:['juego de cubiertos'], englishTerms:['flatware set','cutlery set stainless'], spanishTerms:['juego de cubiertos','vajilla'], ecommerceTerms:['WMF Spaten 6-Piece Flatware Set','Oneida 18/10 Stainless Flatware'], commonSearchPhrases:['set cubiertos precio','vajilla comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'freidora_smoker', productName:'Parrilla / Smoker / Weber / Kamado', categoryId:'home_kitchen_appliances', aliases:['parrilla weber','smoker bbq','kamado','parrilla de carbón'], misspellings:['parrilla webers'], englishTerms:['weber grill','smoker bbq','kamado grill'], spanishTerms:['parrilla','asador bbq'], ecommerceTerms:['Weber Original Kettle 22"','Char-Broil Offset Smoker'], commonSearchPhrases:['parrilla precio','weber grill comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño y peso.', adminHint:'Verificar peso y dimensiones.' },
    { productKey:'maquina_coser', productName:'Máquina de Coser / Singer / Brother', categoryId:'home_kitchen_appliances', aliases:['máquina de coser','singer','brother cs6000i','sewing machine'], misspellings:['maquina de cocer'], englishTerms:['sewing machine','singer simple','brother cs6000i'], spanishTerms:['máquina de coser'], ecommerceTerms:['Singer 4452 Heavy Duty Sewing Machine','Brother CS6000i Computerized'], commonSearchPhrases:['máquina de coser precio','singer comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'organizador_cables', productName:'Organizador de Cables / Cable Management', categoryId:'home_decor_storage', aliases:['organizador cables','cable management','canaleta cables','velcro cables'], misspellings:['organizador de cables'], englishTerms:['cable organizer','cable management box','velcro cable ties'], spanishTerms:['organizador de cables','canaleta'], ecommerceTerms:['BLUELOUNGE CableBox','Joto Cable Organizer Box'], commonSearchPhrases:['organizador cables precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'lampara_escritorio', productName:'Lámpara Escritorio / LED / Arquitecto', categoryId:'home_decor_storage', aliases:['lámpara escritorio','desk lamp','lámpara led escritorio','lamp benq'], misspellings:['lampara de escritorio'], englishTerms:['desk lamp led','architect floor lamp'], spanishTerms:['lámpara de escritorio','lámpara de trabajo'], ecommerceTerms:['BenQ ScreenBar Monitor Lamp','TaoTronics LED Desk Lamp'], commonSearchPhrases:['lámpara escritorio precio','desk lamp comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'tabla_surf', productName:'Tabla de Surf / Bodyboard / Paddle Board', categoryId:'sports_outdoor_variable', aliases:['tabla surf','surfboard','bodyboard','paddle board sup'], misspellings:['tabla de surf'], englishTerms:['surfboard','foam surfboard','paddle board sup'], spanishTerms:['tabla de surf','paddle board'], ecommerceTerms:['Wavestorm 8\' Classic Foam Surfboard','iROCKER All Around 11\' SUP'], commonSearchPhrases:['tabla surf precio','paddle board comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño.', adminHint:'Verificar dimensiones.' },
    { productKey:'esquis_snowboard', productName:'Esquís / Snowboard / Botas Snowboard', categoryId:'sports_outdoor_variable', aliases:['snowboard','esquís','botas snowboard','ski gear'], misspellings:['snowboard tabla'], englishTerms:['snowboard','ski equipment','burton snowboard'], spanishTerms:['snowboard','esquís'], ecommerceTerms:['Burton Custom Snowboard','Rossignol Experience 86 Ti Skis'], commonSearchPhrases:['snowboard precio','ski gear comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño.', adminHint:'Verificar dimensiones.' },
    { productKey:'zapatillas_trail', productName:'Zapatillas Trail Running / Salomon / Hoka', categoryId:'footwear_complete', aliases:['zapatillas trail','salomon trail','hoka clifton','trail running shoes'], misspellings:['zapatillas de trail'], englishTerms:['trail running shoes','salomon speedcross 6','hoka clifton 9'], spanishTerms:['zapatillas trail','zapatos de montaña'], ecommerceTerms:['Salomon Speedcross 6 Trail','Hoka Clifton 9','Brooks Cascadia 17'], commonSearchPhrases:['zapatillas trail precio','salomon comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'mancuernas_hierro', productName:'Mancuernas / Kettlebell / Hierro Fundido', categoryId:'sports_fitness_physical', aliases:['mancuernas','dumbbells','kettlebell','pesas hierro fundido'], misspellings:['mancuernas de hierro'], englishTerms:['dumbbells set','kettlebell cast iron'], spanishTerms:['mancuernas','pesas de hierro'], ecommerceTerms:['CAP Barbell Rubber Hex Dumbbell Pair','Kettlebell Kings 35 lb'], commonSearchPhrases:['mancuernas precio','dumbbells comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el peso considerable.', adminHint:'Verificar peso total.' },
    { productKey:'yoga_mat_alt', productName:'Mat de Yoga / Pilates / Cork Mat', categoryId:'sports_fitness_physical', aliases:['yoga mat','mat yoga','mat pilates','lululemon mat','manduka mat'], misspellings:['mat de yoga'], englishTerms:['yoga mat','non-slip yoga mat','manduka prolite'], spanishTerms:['colchoneta yoga','mat de yoga'], ecommerceTerms:['Lululemon The Reversible Mat 5mm','Manduka PRO Yoga Mat'], commonSearchPhrases:['yoga mat precio','manduka mat comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'zapatillas_baloncesto', productName:'Zapatillas Baloncesto / Nike LeBron / KD', categoryId:'footwear_complete', aliases:['zapatillas baloncesto','basketball shoes','nike lebron','kd shoes','adidas dame'], misspellings:['zapatillas de basketball'], englishTerms:['basketball shoes','nike lebron xx','kobe 6 protro'], spanishTerms:['zapatillas de baloncesto','tenis de baloncesto'], ecommerceTerms:['Nike LeBron XX','Adidas Harden Vol. 7','Nike Zoom KD16'], commonSearchPhrases:['zapatillas baloncesto precio','nike lebron comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'bicicleta_electrica', productName:'Bicicleta Eléctrica / E-bike / Rad Power', categoryId:'sports_outdoor_variable', aliases:['bicicleta eléctrica','e-bike','rad power bikes','ebike','veloped'], misspellings:['bicicleta electrica'], englishTerms:['electric bike','e-bike','rad power bikes radrunner'], spanishTerms:['bicicleta eléctrica','e-bike'], ecommerceTerms:['Rad Power Bikes RadRunner 3 Plus','Aventon Pace 500.3'], commonSearchPhrases:['bicicleta eléctrica precio','e-bike comprar'], riskOverrideFlags:['contains_lithium_battery'], customerHint:'Las bicicletas eléctricas contienen batería de litio — pueden requerir revisión de transporte.', adminHint:'Revisar normativa DG y capacidad Wh de la batería.' },
    { productKey:'camara_trasera', productName:'Cámara Trasera / Reverse Camera / 360°', categoryId:'automotive_simple_accessories', aliases:['cámara trasera','reverse camera','backup camera','cámara 360 carro'], misspellings:['camara de reversa'], englishTerms:['backup camera','reverse camera','360 degree car camera'], spanishTerms:['cámara de reversa','cámara trasera auto'], ecommerceTerms:['AMTIFO FHD Backup Camera','Garmin BC 50 Wireless Backup Camera'], commonSearchPhrases:['cámara trasera carro precio','backup camera comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'asiento_carro_nino', productName:'Silla de Carro Niño / Car Seat / Maxi-Cosi', categoryId:'baby_items', aliases:['silla carro niño','car seat','maxi-cosi','chicco car seat','silla bebé carro'], misspellings:['silla de carro niño'], englishTerms:['convertible car seat','infant car seat','maxi-cosi pria'], spanishTerms:['silla de auto para bebé','silla de carro'], ecommerceTerms:['Maxi-Cosi Pria All-in-One','Chicco KeyFit 35','Graco 4Ever DLX'], commonSearchPhrases:['silla carro niño precio','car seat comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cargador_carro', productName:'Cargador Rápido para Carro / Dual USB-C', categoryId:'automotive_simple_accessories', aliases:['cargador para carro','car charger','cargador usb carro','car fast charger'], misspellings:['cargador de carro'], englishTerms:['car charger','dual usb-c car charger','fast charge car adapter'], spanishTerms:['cargador para carro','adaptador usb carro'], ecommerceTerms:['Anker 40W Dual USB-C Car Charger','Belkin Car Charger Dual USB'], commonSearchPhrases:['cargador carro precio','car charger comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'filtro_aceite_alt', productName:'Filtro de Aceite / Air Filter / Cabin Filter', categoryId:'automotive_parts_review', aliases:['filtro aceite','oil filter','air filter carro','cabin air filter'], misspellings:['filtro de aceite'], englishTerms:['oil filter','engine air filter','cabin air filter'], spanishTerms:['filtro de aceite','filtro de aire'], ecommerceTerms:['Bosch 3500 Premium FILTECH Oil Filter','K&N High Performance Air Filter'], commonSearchPhrases:['filtro aceite precio','oil filter comprar'], riskOverrideFlags:['automotive_part_review'], customerHint:'Requiere revisión por clasificación arancelaria.', adminHint:'Validar clasificación.' },
    { productKey:'steering_wheel', productName:'Volante Racing / Logitech G29 / Fanatec', categoryId:'gaming_physical_accessories', aliases:['volante gaming','logitech g29','fanatec','racing wheel','pedals'], misspellings:['volante de racing'], englishTerms:['racing wheel','logitech g29','fanatec podium'], spanishTerms:['volante de carreras','racing wheel'], ecommerceTerms:['Logitech G29 Driving Force','Thrustmaster T248'], commonSearchPhrases:['volante gaming precio','logitech g29 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'arcade_joystick', productName:'Arcade Stick / Joystick / Hitbox', categoryId:'gaming_physical_accessories', aliases:['arcade stick','joystick','hitbox controller','fighting stick'], misspellings:['arcade stik'], englishTerms:['arcade stick','fighting joystick','hitbox controller'], spanishTerms:['arcade stick','palanca de juego'], ecommerceTerms:['Razer Kitsune Arcade Controller','Hori Real Arcade Pro 4 Kai'], commonSearchPhrases:['arcade stick precio','joystick comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'gaming_router', productName:'Router Gaming / ASUS ROG / Killer WiFi', categoryId:'networking_equipment', aliases:['router gaming','asus rog router','rog rapture','killer wifi router'], misspellings:['router gaming asus'], englishTerms:['gaming router','asus rog rapture gt-ax11000'], spanishTerms:['router para gaming','router gaming'], ecommerceTerms:['ASUS ROG Rapture GT-AX11000','Netgear Nighthawk Pro Gaming XR1000'], commonSearchPhrases:['router gaming precio','rog rapture comprar'], riskOverrideFlags:['telecom_possible'], customerHint:'', adminHint:'Verificar homologación SUTEL.' },
    { productKey:'captura_elgato', productName:'Tarjeta Captura / Elgato / Razer Ripsaw', categoryId:'gaming_physical_accessories', aliases:['captura elgato','elgato hd60','razer ripsaw','capture card','tarjeta captura'], misspellings:['elgato captura'], englishTerms:['capture card','elgato 4k60 pro','razer ripsaw hd'], spanishTerms:['tarjeta de captura','capturadora de video'], ecommerceTerms:['Elgato 4K60 Pro MK.2','Razer Ripsaw HD USB Capture Card'], commonSearchPhrases:['capture card precio','elgato comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'juguete_madera', productName:'Juguete de Madera / Montessori / Hape', categoryId:'toys_common', aliases:['juguete madera','montessori juguete madera','hape toys','wooden toys'], misspellings:['juguete de madera montessori'], englishTerms:['wooden montessori toys','hape play'], spanishTerms:['juguete de madera','juguete montessori'], ecommerceTerms:['Hape Quadrilla Marble Run','Melissa & Doug Shape Sorting Cube'], commonSearchPhrases:['juguete madera precio','montessori toy comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'figura_coleccion', productName:'Figura Coleccionable / Funko Pop / Nendoroid', categoryId:'toys_common', aliases:['funko pop','nendoroid','figura coleccionable','action figure'], misspellings:['funko pops'], englishTerms:['funko pop vinyl','nendoroid figure','action figure'], spanishTerms:['figura coleccionable','funko pop'], ecommerceTerms:['Funko Pop Vinyl Figure','Good Smile Nendoroid'], commonSearchPhrases:['funko pop precio','figura coleccionable comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'lego_ideas', productName:'LEGO Ideas / Creator Expert / UCS', categoryId:'toys_common', aliases:['lego ideas','lego creator expert','lego ucs','lego adulto coleccionista'], misspellings:['lego ideas set'], englishTerms:['lego ideas','lego creator expert','lego ucs set'], spanishTerms:['lego ideas','lego coleccionable'], ecommerceTerms:['LEGO Ideas Vincent van Gogh - The Starry Night','LEGO Creator Expert Eiffel Tower'], commonSearchPhrases:['lego ideas precio','lego creator expert comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'hamaca_bebe', productName:'Hamaca Bebé / Bouncer / Baby Swing', categoryId:'baby_items', aliases:['hamaca bebé','bouncer bebé','baby swing','columpio bebé'], misspellings:['hamaca de bebe'], englishTerms:['baby bouncer','baby swing','mamaroo'], spanishTerms:['mecedora bebé','hamaca para bebé'], ecommerceTerms:['4moms MamaRoo 4 Infant Seat','Fisher-Price Snugapuppy Deluxe Bouncer'], commonSearchPhrases:['bouncer bebé precio','mamaroo comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'monitor_bebe', productName:'Monitor de Bebé / Baby Monitor / Nanit', categoryId:'baby_items', aliases:['monitor bebé','baby monitor','nanit','owlet cam','hello baby monitor'], misspellings:['monitor de bebe'], englishTerms:['baby monitor','nanit pro camera','eufy spaceview'], spanishTerms:['monitor para bebé','intercomunicador bebé'], ecommerceTerms:['Nanit Pro Smart Baby Monitor','Eufy SpaceView Baby Monitor'], commonSearchPhrases:['monitor bebé precio','nanit comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'omega3', productName:'Omega-3 / Fish Oil / Krill Oil', categoryId:'supplements_vitamins_nutrition', aliases:['omega 3','fish oil','krill oil','aceite de pescado'], misspellings:['omega3 fish oil'], englishTerms:['omega-3 fish oil','krill oil supplement'], spanishTerms:['omega 3','aceite de pescado'], ecommerceTerms:['Nordic Naturals Ultimate Omega','Sports Research Krill Oil'], commonSearchPhrases:['omega 3 precio','fish oil comprar'], riskOverrideFlags:['supplement','sanitary_review'], customerHint:'Los suplementos pueden requerir validación sanitaria.', adminHint:'Revisar CCSS/MINSA.' },
    { productKey:'probioticos', productName:'Probióticos / Lactobacillus / Garden of Life', categoryId:'supplements_vitamins_nutrition', aliases:['probióticos','probiotics','lactobacillus','garden of life probiotics'], misspellings:['probioticos'], englishTerms:['probiotics supplement','garden of life dr. formulated'], spanishTerms:['probióticos','flora intestinal'], ecommerceTerms:['Garden of Life Dr. Formulated Probiotics','Ritual Synbiotic+'], commonSearchPhrases:['probióticos precio','probiotics comprar'], riskOverrideFlags:['supplement','sanitary_review'], customerHint:'Los suplementos pueden requerir validación sanitaria.', adminHint:'Revisar CCSS/MINSA.' },
    { productKey:'pre_workout_alt', productName:'Pre-Workout / Energizante Deportivo', categoryId:'supplements_vitamins_nutrition', aliases:['pre workout','pre-workout','cellucor c4','ghost pre workout'], misspellings:['pre workout deportivo'], englishTerms:['pre-workout supplement','cellucor c4 pre-workout'], spanishTerms:['pre-entrenamiento','energizante deportivo'], ecommerceTerms:['Cellucor C4 Original Pre Workout','Ghost Legend Pre-Workout'], commonSearchPhrases:['pre workout precio','c4 comprar'], riskOverrideFlags:['supplement','sanitary_review'], customerHint:'Este suplemento puede requerir validación sanitaria.', adminHint:'Revisar CCSS/MINSA para estimulantes.' },
    { productKey:'glutamina', productName:'Glutamina / L-Glutamine / Recuperación', categoryId:'supplements_vitamins_nutrition', aliases:['glutamina','l-glutamine','glutamine powder'], misspellings:['glutamina powder'], englishTerms:['l-glutamine','glutamine supplement'], spanishTerms:['glutamina','glutamina en polvo'], ecommerceTerms:['NOW Sports L-Glutamine Powder 1lb','Optimum Nutrition Glutamine'], commonSearchPhrases:['glutamina precio','l-glutamine comprar'], riskOverrideFlags:['supplement','sanitary_review'], customerHint:'Los suplementos pueden requerir validación sanitaria.', adminHint:'Revisar CCSS/MINSA.' },
    { productKey:'vitamina_c_supl', productName:'Vitamina C / Zinc / Immune Support', categoryId:'supplements_vitamins_nutrition', aliases:['vitamina c','zinc supplement','immune support vitamins','vitamin c 1000mg'], misspellings:['vitamina C zinc'], englishTerms:['vitamin c 1000mg','zinc supplement','immune support'], spanishTerms:['vitamina c','soporte inmune'], ecommerceTerms:['Nature\'s Way Vitamin C 1000mg','Thorne Zinc Picolinate'], commonSearchPhrases:['vitamina c precio','zinc supplement comprar'], riskOverrideFlags:['supplement','sanitary_review'], customerHint:'Los suplementos pueden requerir validación sanitaria.', adminHint:'Revisar CCSS/MINSA.' },
    { productKey:'ashwagandha', productName:'Ashwagandha / Adaptógenos / Nootropics', categoryId:'supplements_vitamins_nutrition', aliases:['ashwagandha','adaptógenos','nootropics','lion mane mushroom','shilajit'], misspellings:['ashwagandha supplement'], englishTerms:['ashwagandha ksm-66','lion\'s mane mushroom'], spanishTerms:['ashwagandha','adaptógenos'], ecommerceTerms:['KSM-66 Ashwagandha','Four Sigmatic Lion\'s Mane Elixir'], commonSearchPhrases:['ashwagandha precio','nootropics comprar'], riskOverrideFlags:['supplement','sanitary_review'], customerHint:'Los suplementos pueden requerir validación sanitaria.', adminHint:'Revisar CCSS/MINSA para adaptógenos.' },
    { productKey:'nebulizador_alt', productName:'Nebulizador / Inhalador / CPAP', categoryId:'medicines_medical_products', aliases:['nebulizador','inhalador','cpap machine','nebulizer'], misspellings:['nebulizador médico'], englishTerms:['nebulizer','cpap machine','portable nebulizer'], spanishTerms:['nebulizador','inhalador'], ecommerceTerms:['Omron NE-C801 Nebulizer','Drive Medical IntelliPAP AutoCPAP'], commonSearchPhrases:['nebulizador precio','cpap comprar'], riskOverrideFlags:['medical','sanitary_review'], customerHint:'Los dispositivos médicos pueden requerir registro sanitario.', adminHint:'Verificar registro CCSS/MINSA.' },
    { productKey:'termometro_digital', productName:'Termómetro Digital / Infrarrojo / Frente', categoryId:'medicines_medical_products', aliases:['termómetro digital','termómetro infrarrojo','termómetro de frente','digital thermometer'], misspellings:['termometro digital'], englishTerms:['digital thermometer','infrared forehead thermometer'], spanishTerms:['termómetro digital','termómetro de frente'], ecommerceTerms:['Braun No-Touch Forehead Thermometer','Withings Thermo Smart Temporal'], commonSearchPhrases:['termómetro precio','termómetro infrarrojo comprar'], riskOverrideFlags:['medical'], customerHint:'', adminHint:'Verificar clasificación médica.' },
    { productKey:'colchoneta_viscoelastica', productName:'Colchón Viscoelástico / Ortopédico / Emma', categoryId:'home_decor_storage', aliases:['colchón viscoelástico','emma mattress','nectar mattress','colchón ortopédico'], misspellings:['colchon viscoelastico'], englishTerms:['memory foam mattress','emma mattress','nectar memory foam'], spanishTerms:['colchón de espuma viscoelástica','colchón ortopédico'], ecommerceTerms:['Emma Original Mattress','Nectar Memory Foam Mattress'], commonSearchPhrases:['colchón viscoelástico precio','emma mattress comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño y peso.', adminHint:'Verificar dimensiones y peso.' },
    { productKey:'teclado_numerico', productName:'Teclado Numérico / Numpad / Calculator', categoryId:'computer_accessories', aliases:['teclado numérico','numpad','numpad bluetooth','ten key numpad'], misspellings:['numpad teclado'], englishTerms:['numeric keypad','numpad bluetooth','ten key'], spanishTerms:['teclado numérico','numpad'], ecommerceTerms:['Jelly Comb Wireless Numeric Keypad','Logitech MX Keys Plus'], commonSearchPhrases:['teclado numérico precio','numpad comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'monitor_arm_dual', productName:'Brazo Doble Monitor / Ergotron LX Dual', categoryId:'computer_accessories', aliases:['brazo doble monitor','dual monitor arm','ergotron dual','soporte doble pantalla'], misspellings:['brazo de monitor doble'], englishTerms:['dual monitor arm','ergotron lx dual desk mount'], spanishTerms:['soporte doble monitor','brazo para dos monitores'], ecommerceTerms:['Ergotron LX Dual Stacking Arm','Vivo Dual LCD Monitor Mount'], commonSearchPhrases:['brazo doble monitor precio','dual monitor arm comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'iphone_15', productName:'iPhone 15 / 15 Plus / 15 Pro Max', categoryId:'phones_smartphones', aliases:['iphone 15','iphone 15 pro','iphone 15 pro max','apple iphone 15'], misspellings:['iphon 15','iphone15 pro'], englishTerms:['iphone 15','iphone 15 pro max','apple iphone 15 plus'], spanishTerms:['celular apple iphone 15','iphone 15 pro'], ecommerceTerms:['Apple iPhone 15 Pro Max 256GB','Apple iPhone 15 128GB'], commonSearchPhrases:['iphone 15 precio','iphone 15 pro max comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'iphone_16', productName:'iPhone 16 / 16 Pro / 16 Pro Max', categoryId:'phones_smartphones', aliases:['iphone 16','iphone 16 pro','iphone 16 pro max'], misspellings:['iphone16','iphon 16'], englishTerms:['iphone 16','iphone 16 pro max'], spanishTerms:['celular apple iphone 16'], ecommerceTerms:['Apple iPhone 16 Pro Max','Apple iPhone 16 128GB'], commonSearchPhrases:['iphone 16 precio','iphone 16 pro max comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'samsung_s25', productName:'Samsung Galaxy S25 / S25 Ultra', categoryId:'phones_smartphones', aliases:['samsung s25','galaxy s25','s25 ultra','samsung galaxy s25'], misspellings:['sansung s25','galaxy s 25'], englishTerms:['samsung galaxy s25','galaxy s25 ultra'], spanishTerms:['celular samsung s25'], ecommerceTerms:['Samsung Galaxy S25 Ultra','Samsung Galaxy S25+'], commonSearchPhrases:['samsung s25 precio','galaxy s25 ultra comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cargador_magsafe_15w', productName:'Cargador MagSafe 15W / iPhone USB-C', categoryId:'chargers_cables_adapters', aliases:['magsafe 15w','cargador magsafe','apple 20w adapter','apple charger'], misspellings:['magsafe cargador'], englishTerms:['apple magsafe 15w charger','apple 20w usb-c adapter'], spanishTerms:['cargador magsafe apple','adaptador apple'], ecommerceTerms:['Apple MagSafe Charger 15W','Apple 20W USB-C Power Adapter'], commonSearchPhrases:['magsafe 15w precio','apple charger comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'audifonos_osito', productName:'Audífonos Niños / Kids Headphones / Puro Sound', categoryId:'headphones_audio_personal', aliases:['audífonos niños','kids headphones','puro sound labs','headset infantil'], misspellings:['audifonos de niños'], englishTerms:['kids headphones','volume limited headphones for kids'], spanishTerms:['audífonos para niños','cascos infantiles'], ecommerceTerms:['Puro Sound Labs BT2200 Kids Headphones','JLab JBuddies Studio Wired Kids'], commonSearchPhrases:['audífonos niños precio','kids headphones comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'mochila_gaming', productName:'Mochila Gamer / Laptop Bag / ASUS ROG Bag', categoryId:'bags_luggage_accessories', aliases:['mochila gamer','asus rog bag','razer tactical bag','laptop bag gaming'], misspellings:['mochila gaming'], englishTerms:['gaming laptop bag','asus rog backpack','razer tactical backpack'], spanishTerms:['mochila para gamer','mochila laptop gaming'], ecommerceTerms:['ASUS ROG Ranger BP4701 Backpack','Razer Rogue 17 Backpack V3'], commonSearchPhrases:['mochila gamer precio','rog backpack comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'guitarra_electrica', productName:'Guitarra Eléctrica / Fender / Gibson', categoryId:'microphones_audio_pro', aliases:['guitarra eléctrica','fender stratocaster','gibson les paul','guitarra electrica'], misspellings:['guitarra electrica fender'], englishTerms:['electric guitar','fender player stratocaster','gibson les paul standard'], spanishTerms:['guitarra eléctrica'], ecommerceTerms:['Fender Player Stratocaster','Gibson Les Paul Standard','Epiphone Les Paul Standard'], commonSearchPhrases:['guitarra eléctrica precio','fender stratocaster comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño y peso.', adminHint:'Verificar dimensiones.' },
    { productKey:'alcohol_isopropilico', productName:'Alcohol Isopropílico / IPA / Limpieza', categoryId:'chemicals_aerosols_adhesives', aliases:['alcohol isopropílico','isopropyl alcohol','ipa 99','alcohol limpieza electrónica'], misspellings:['alcohol isopropilico'], englishTerms:['isopropyl alcohol 99%','ipa cleaning solution'], spanishTerms:['alcohol isopropílico','IPA para electrónica'], ecommerceTerms:['MG Chemicals 824-1L IPA','Amazon Basics 99% Isopropyl Alcohol'], commonSearchPhrases:['alcohol isopropílico precio'], riskOverrideFlags:['chemical','flammable'], customerHint:'Este producto es inflamable y puede tener restricciones de transporte.', adminHint:'Revisar normativa de líquidos inflamables.' },
    { productKey:'soldadura_estano', productName:'Soldadura de Estaño / Flux / Rework Station', categoryId:'chemicals_aerosols_adhesives', aliases:['soldadura estaño','solder wire','flux paste','rework station'], misspellings:['soldadura de estaño'], englishTerms:['solder wire','rosin flux paste','hot air rework station'], spanishTerms:['soldadura de estaño','pasta de flux'], ecommerceTerms:['Kester 44 Rosin Core Solder','Amtech NC-559-V2-TF Flux'], commonSearchPhrases:['soldadura estaño precio','flux paste comprar'], riskOverrideFlags:['chemical'], customerHint:'', adminHint:'' },
    { productKey:'libro_recetas', productName:'Libro de Recetas / Cookbook / Ottolenghi', categoryId:'books_printed_material', aliases:['libro recetas','cookbook','ottolenghi','libro cocina'], misspellings:['libro de recetas'], englishTerms:['cookbook','ottolenghi jerusalem','salt fat acid heat'], spanishTerms:['libro de cocina','recetario'], ecommerceTerms:['Salt Fat Acid Heat by Samin Nosrat','Ottolenghi Simple'], commonSearchPhrases:['libro de recetas precio','cookbook comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'papel_fotografia', productName:'Papel Fotográfico / Impresión / Canon Papel', categoryId:'office_stationery_art', aliases:['papel fotográfico','photo paper','canon foto papel','epson photo paper'], misspellings:['papel fotografico'], englishTerms:['photo paper glossy','inkjet photo paper'], spanishTerms:['papel fotográfico','papel para fotos'], ecommerceTerms:['Canon Photo Paper Plus Glossy II','Epson S041271 Photo Paper'], commonSearchPhrases:['papel fotográfico precio','photo paper comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'tinta_impresora', productName:'Tinta / Cartucho de Tinta / Tóner', categoryId:'office_stationery_art', aliases:['tinta impresora','cartucho tinta','tóner','ink cartridge'], misspellings:['tinta para impresora'], englishTerms:['ink cartridge','laser toner','printer ink'], spanishTerms:['tinta para impresora','cartucho de tinta'], ecommerceTerms:['HP 65XL Black Ink Cartridge','Canon PG-245XL Ink'], commonSearchPhrases:['tinta impresora precio','cartucho tinta comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'pintura_acrilica', productName:'Pintura Acrílica / Óleo / Golden / Winsor', categoryId:'office_stationery_art', aliases:['pintura acrílica','pintura al óleo','golden acrylics','winsor newton'], misspellings:['pintura acrilica'], englishTerms:['acrylic paint set','oil paint','golden heavy body acrylics'], spanishTerms:['pintura acrílica','pintura al óleo'], ecommerceTerms:['Golden Heavy Body Acrylic 5oz','Winsor & Newton Artist Oil 37ml'], commonSearchPhrases:['pintura acrílica precio','golden acrylics comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'destornillador_electrico', productName:'Destornillador Eléctrico / iFixit / Wowstick', categoryId:'tools_hardware_common', aliases:['destornillador eléctrico','wowstick','ifixit precision','electric screwdriver'], misspellings:['destonillador electrico'], englishTerms:['electric screwdriver','wowstick 1f+','ifixit precision driver'], spanishTerms:['destornillador eléctrico','atornillador automático'], ecommerceTerms:['Wowstick 1F+ Electric Screwdriver','iFixit Pro Tech Toolkit'], commonSearchPhrases:['destornillador eléctrico precio','wowstick comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'medidor_laser', productName:'Medidor Láser / Distanciómetro / Bosch', categoryId:'tools_hardware_common', aliases:['medidor láser','distanciómetro','laser measure','bosch glm'], misspellings:['medidor laser'], englishTerms:['laser distance meter','bosch glm 50','laser tape measure'], spanishTerms:['medidor láser','distanciómetro'], ecommerceTerms:['Bosch GLM 50 Laser Measure','Leica DISTO D2'], commonSearchPhrases:['medidor láser precio','bosch glm comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'reloj_smartwatch_samsung', productName:'Samsung Galaxy Watch / Gear', categoryId:'watches_jewelry', aliases:['samsung galaxy watch','galaxy watch 6','galaxy watch ultra','samsung gear'], misspellings:['samsung galaxy watch 6'], englishTerms:['samsung galaxy watch 6','galaxy watch ultra'], spanishTerms:['samsung galaxy watch','reloj samsung'], ecommerceTerms:['Samsung Galaxy Watch 6 Classic','Samsung Galaxy Watch Ultra'], commonSearchPhrases:['samsung galaxy watch precio','galaxy watch comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'drone_accesorios', productName:'Accesorios Dron / ND Filters / Extra Batteries', categoryId:'drones_rc_review', aliases:['accesorios dron','nd filters dron','baterías extra dji','drone accessories'], misspellings:['accesorios de dron'], englishTerms:['drone nd filter set','dji mini 4 pro accessories','extra drone battery'], spanishTerms:['accesorios para dron','filtros nd dji'], ecommerceTerms:['DJI Mini 4 Pro ND Filters Set','DJI Fly More Combo Extra Battery'], commonSearchPhrases:['accesorios dron precio'], riskOverrideFlags:['battery_possible'], customerHint:'Contiene baterías de litio — puede requerir revisión de transporte.', adminHint:'Revisar Wh de baterías.' },
    { productKey:'ropa_bebe_set', productName:'Ropa Recién Nacido / Bodysuit / Set Bebé', categoryId:'baby_items', aliases:['ropa bebé','bodysuit bebé','set ropa recién nacido','newborn clothes'], misspellings:['ropa de bebe'], englishTerms:['newborn baby clothes','baby bodysuit set'], spanishTerms:['ropa para bebé recién nacido','bodys bebé'], ecommerceTerms:['Carter\'s Baby Newborn 7-Piece Set','Gerber Onesies Bodysuits 8-Pack'], commonSearchPhrases:['ropa bebé precio','bodysuit bebé comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'monitor_presion', productName:'Tensiómetro / Monitor de Presión Arterial', categoryId:'medicines_medical_products', aliases:['tensiómetro','monitor presión arterial','blood pressure monitor','omron bp'], misspellings:['tensionmetro'], englishTerms:['blood pressure monitor','automatic bp cuff'], spanishTerms:['tensiómetro','monitor de presión arterial'], ecommerceTerms:['Omron Platinum Blood Pressure Monitor','Withings BPM Connect'], commonSearchPhrases:['tensiómetro precio','monitor presión comprar'], riskOverrideFlags:['medical'], customerHint:'', adminHint:'Verificar clasificación médica.' },
    { productKey:'ropa_ciclismo_set', productName:'Conjunto Ciclismo / Bib Shorts / Jersey', categoryId:'sports_outdoor_variable', aliases:['conjunto ciclismo','bib shorts','jersey ciclismo','cycling kit'], misspellings:['conjunto de ciclismo'], englishTerms:['cycling bib shorts','cycling jersey','cycling kit'], spanishTerms:['culote ciclismo','camiseta ciclismo'], ecommerceTerms:['Castelli Free Aero Race 4 Bib Short','Rapha Core Cargo Bib Short'], commonSearchPhrases:['conjunto ciclismo precio','bib shorts comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'zapatillas_running', productName:'Zapatillas Running / Nike Pegasus / ASICS Gel', categoryId:'footwear_complete', aliases:['zapatillas running','nike pegasus','asics gel nimbus','brooks ghost'], misspellings:['zapatillas de correr'], englishTerms:['running shoes','nike air zoom pegasus','asics gel-nimbus 25'], spanishTerms:['tenis para correr','zapatillas de running'], ecommerceTerms:['Nike Air Zoom Pegasus 40','ASICS Gel-Nimbus 25','Brooks Ghost 15'], commonSearchPhrases:['zapatillas running precio','nike pegasus comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'whey_isolate', productName:'Proteína Whey Isolate / Zero Carb', categoryId:'supplements_vitamins_nutrition', aliases:['whey isolate','proteína isolada','dymatize iso 100','isopure whey'], misspellings:['whey isolate proteina'], englishTerms:['whey protein isolate','dymatize iso 100','isopure zero carb'], spanishTerms:['proteína isolada','whey aislado'], ecommerceTerms:['Dymatize ISO 100 Hydrolyzed 5lb','Isopure Zero Carb 3lb'], commonSearchPhrases:['whey isolate precio','iso 100 comprar'], riskOverrideFlags:['supplement','sanitary_review'], customerHint:'Los suplementos pueden requerir validación sanitaria.', adminHint:'Revisar CCSS/MINSA.' },
    { productKey:'streaming_mic_setup', productName:'Setup Streaming / Arm + Mic + Pop Filter', categoryId:'microphones_audio_pro', aliases:['setup streaming','arm micrófono','pop filter','mic boom arm','rode psa1'], misspellings:['setup de streaming'], englishTerms:['microphone boom arm','pop filter','rode psa1 studio arm'], spanishTerms:['brazo de micrófono','filtro pop'], ecommerceTerms:['Rode PSA1 Boom Arm','InnoGear Microphone Arm','Mudder Pop Filter'], commonSearchPhrases:['brazo micrófono precio','rode psa1 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'walkie_talkie_civil', productName:'Walkie Talkie Civil / PMR / FRS', categoryId:'regulated_telecom', aliases:['walkie talkie','radio frs','pmr446','motorola talkabout'], misspellings:['walkie talkie civil'], englishTerms:['walkie talkie','frs radio','motorola talkabout'], spanishTerms:['radio de comunicación','walkie-talkie'], ecommerceTerms:['Motorola Solutions T800 Talkabout Radio','Midland GXT1000VP4'], commonSearchPhrases:['walkie talkie precio','radio frs comprar'], riskOverrideFlags:['telecom_possible'], customerHint:'Los radios de comunicación pueden requerir revisión de la SUTEL.', adminHint:'Verificar normativa SUTEL para PMR/FRS.' },
    { productKey:'libro_desarrollo_personal', productName:'Libro Desarrollo Personal / Finanzas / Mindset', categoryId:'books_printed_material', aliases:['libro desarrollo personal','libro finanzas','mindset libro','atomic habits libro'], misspellings:['libro de desarrollo personal'], englishTerms:['self help book','personal finance book','atomic habits'], spanishTerms:['libro de desarrollo personal','libro de finanzas'], ecommerceTerms:['Atomic Habits by James Clear','The Psychology of Money','Deep Work'], commonSearchPhrases:['libro atomic habits precio','desarrollo personal libro comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'repelente_mosquitos', productName:'Repelente Mosquitos / DEET / Citronella', categoryId:'chemicals_aerosols_adhesives', aliases:['repelente mosquitos','deet spray','citronella','off spray'], misspellings:['repelente de mosquitos'], englishTerms:['mosquito repellent','deet spray','off deep woods'], spanishTerms:['repelente de mosquitos','spray anti-mosquitos'], ecommerceTerms:['OFF! Deep Woods Insect Repellent','Sawyer Products Premium Insect Repellent'], commonSearchPhrases:['repelente mosquitos precio','deet comprar'], riskOverrideFlags:['aerosol','chemical'], customerHint:'Aerosol — puede tener restricciones de transporte.', adminHint:'Revisar normativa aerosoles y pesticidas.' },
    { productKey:'headset_oficina', productName:'Headset para Oficina / Jabra / Poly / Teams', categoryId:'headphones_audio_personal', aliases:['headset oficina','jabra evolve','poly voyager','microsoft teams headset'], misspellings:['headset de oficina'], englishTerms:['office headset','jabra evolve2 55','poly voyager focus 2'], spanishTerms:['audífono para oficina','headset para llamadas'], ecommerceTerms:['Jabra Evolve2 55 MS','Poly Voyager Focus 2 UC','Logitech Zone Wireless Plus'], commonSearchPhrases:['headset oficina precio','jabra evolve comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'luz_uv_desinfeccion', productName:'Luz UV Desinfección / UV Sanitizer', categoryId:'medicines_medical_products', aliases:['luz uv','uv sanitizer','germicidal uv lamp','desinfección uv'], misspellings:['luz UV desinfectante'], englishTerms:['uv sanitizer','germicidal uv light','uv-c light'], spanishTerms:['lámpara uv germicida','desinfección luz uv'], ecommerceTerms:['PhoneSoap Go UV Sanitizer','GermAwayUV Portable Wand'], commonSearchPhrases:['luz uv precio','uv sanitizer comprar'], riskOverrideFlags:['medical'], customerHint:'', adminHint:'Verificar clasificación.' },
    { productKey:'cable_hdmi_alt', productName:'Cable HDMI / 4K / 8K / Mini HDMI', categoryId:'computer_accessories', aliases:['cable hdmi','hdmi 4k','mini hdmi','hdmi 2.1','cable hdmi gaming'], misspellings:['cable HDMI 4k'], englishTerms:['hdmi 2.1 cable','4k hdmi cable','mini hdmi to hdmi'], spanishTerms:['cable hdmi','cable de video hdmi'], ecommerceTerms:['Belkin HDMI 2.1 Cable','Monoprice Ultra 8K Certified HDMI Cable'], commonSearchPhrases:['cable hdmi 4k precio','hdmi 2.1 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'altavoz_smart', productName:'Altavoz Inteligente / HomePod / Echo Studio', categoryId:'speakers_home_audio', aliases:['altavoz inteligente','homepod','echo studio','smart speaker'], misspellings:['altavoz smart'], englishTerms:['smart speaker','apple homepod','amazon echo studio'], spanishTerms:['altavoz inteligente','bocina inteligente'], ecommerceTerms:['Apple HomePod (2nd generation)','Amazon Echo Studio'], commonSearchPhrases:['homepod precio','smart speaker comprar'], riskOverrideFlags:['telecom_possible'], customerHint:'', adminHint:'' },
    { productKey:'tablet_graficos_xp_pen', productName:'Tableta XP-Pen / Huion / Gaomon', categoryId:'computer_accessories', aliases:['xp-pen','huion kamvas','gaomon','tableta gráfica xp pen'], misspellings:['xp pen tableta'], englishTerms:['xp-pen artist 12','huion kamvas pro 13'], spanishTerms:['tableta gráfica xp-pen','xp pen'], ecommerceTerms:['XP-PEN Artist 12 (2nd Gen)','Huion Kamvas 13 Gen 3'], commonSearchPhrases:['xp-pen precio','huion kamvas comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'patron_costura', productName:'Patrón de Costura / Tela / Hilo / Bordado', categoryId:'office_stationery_art', aliases:['patrón costura','tela importada','hilo bordado','embroidery kit'], misspellings:['patron de costura'], englishTerms:['sewing pattern','embroidery kit','fabric hilo'], spanishTerms:['patrón de costura','kit de bordado'], ecommerceTerms:['Simplicity Sewing Pattern','Bucilla Stamped Cross Stitch Kit'], commonSearchPhrases:['patrón costura precio','embroidery kit comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    // ════════════════ TASK #384 EXPANSION ROWS ════════════════
    { productKey:'iphone_14', productName:'iPhone 14 / 14 Plus', categoryId:'phones_smartphones', aliases:['iphone 14','iphone 14 plus','apple iphone 14'], misspellings:['iphone14','iphon 14','aiphone 14'], englishTerms:['iphone 14','iphone 14 plus'], spanishTerms:['celular apple','teléfono apple'], ecommerceTerms:['Apple iPhone 14','iPhone 14 128GB'], commonSearchPhrases:['comprar iphone 14','iphone 14 precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'iphone_14_pro', productName:'iPhone 14 Pro / Pro Max', categoryId:'phones_smartphones', aliases:['iphone 14 pro','iphone 14 pro max','iphone pro max'], misspellings:['iphone14pro','iphone pro mas'], englishTerms:['iphone 14 pro','iphone 14 pro max'], spanishTerms:['celular apple pro'], ecommerceTerms:['Apple iPhone 14 Pro','iPhone 14 Pro Max 256GB'], commonSearchPhrases:['iphone 14 pro max precio','iphone pro max costa rica'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'samsung_s24', productName:'Samsung Galaxy S24 / S24+', categoryId:'phones_smartphones', aliases:['samsung s24','galaxy s24','s24 ultra','samsung galaxy s24'], misspellings:['sansung s24','galaxy s 24'], englishTerms:['samsung galaxy s24','s24 ultra'], spanishTerms:['celular samsung s24','samsung s24 ultra'], ecommerceTerms:['Samsung Galaxy S24','Samsung S24 Ultra 256GB'], commonSearchPhrases:['samsung s24 precio','galaxy s24 ultra comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'samsung_s23', productName:'Samsung Galaxy S23 / S23+', categoryId:'phones_smartphones', aliases:['samsung s23','galaxy s23','s23 ultra'], misspellings:['sansung s23'], englishTerms:['samsung galaxy s23','s23 ultra'], spanishTerms:['celular samsung s23'], ecommerceTerms:['Samsung Galaxy S23','Galaxy S23 Ultra'], commonSearchPhrases:['samsung s23 ultra precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'google_pixel_alt', productName:'Google Pixel 8 / 8 Pro', categoryId:'phones_smartphones', aliases:['google pixel','pixel 8','pixel 8 pro','pixel 7a'], misspellings:['gogle pixel','pixel8'], englishTerms:['google pixel 8','pixel 8 pro'], spanishTerms:['celular google','pixel google'], ecommerceTerms:['Google Pixel 8','Pixel 8 Pro 256GB'], commonSearchPhrases:['google pixel precio','pixel 8 pro comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'motorola_moto', productName:'Motorola Moto G / Edge', categoryId:'phones_smartphones', aliases:['motorola','moto g','motorola edge','moto edge'], misspellings:['motorola moto g'], englishTerms:['motorola moto g','motorola edge'], spanishTerms:['celular motorola','moto g power'], ecommerceTerms:['Motorola Moto G84','Moto G Power'], commonSearchPhrases:['motorola moto g precio','celular motorola barato'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'xiaomi_redmi', productName:'Xiaomi Redmi / Note', categoryId:'phones_smartphones', aliases:['xiaomi','redmi','redmi note','xiaomi 13t'], misspellings:['xiomi','redmi note 12'], englishTerms:['xiaomi redmi','redmi note 12'], spanishTerms:['celular xiaomi','redmi pro'], ecommerceTerms:['Xiaomi Redmi Note 12','Redmi 12'], commonSearchPhrases:['xiaomi redmi note precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'oneplus', productName:'OnePlus / Nothing Phone', categoryId:'phones_smartphones', aliases:['oneplus','one plus','nothing phone','oneplus 12'], misspellings:['one plus 12'], englishTerms:['oneplus 12','nothing phone 2'], spanishTerms:['celular oneplus'], ecommerceTerms:['OnePlus 12','Nothing Phone (2)'], commonSearchPhrases:['oneplus 12 precio','nothing phone comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'flip_phone', productName:'Samsung Z Flip / Fold / Motorola Razr', categoryId:'phones_smartphones', aliases:['z flip','samsung fold','motorola razr','flip phone','zfold'], misspellings:['z flop','galaxy fold'], englishTerms:['samsung z flip','galaxy z fold','motorola razr'], spanishTerms:['teléfono plegable','celular plegable'], ecommerceTerms:['Samsung Galaxy Z Flip5','Galaxy Z Fold5'], commonSearchPhrases:['celular plegable samsung precio','galaxy z flip comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'celular_chino', productName:'Celular Chino / Marca No Conocida', categoryId:'phones_smartphones', aliases:['celular chino','oppo','vivo','tecno','itel','infinix'], misspellings:['celular chino barato'], englishTerms:['oppo reno','vivo v29','tecno spark'], spanishTerms:['celular chino','oppo reno'], ecommerceTerms:['OPPO Reno10','Vivo V29','Tecno Spark 20'], commonSearchPhrases:['celular chino barato','oppo precio costa rica'], riskOverrideFlags:[], customerHint:'', adminHint:'Validar marca/modelo.' },
    { productKey:'ipad_air', productName:'iPad Air / iPad Mini', categoryId:'tablets_ereaders', aliases:['ipad air','ipad mini','ipad mini 6','apple ipad'], misspellings:['ipad aire','i pad mini'], englishTerms:['ipad air','ipad mini 6'], spanishTerms:['tableta apple','ipad apple'], ecommerceTerms:['Apple iPad Air 5th Gen','iPad Mini 6 64GB'], commonSearchPhrases:['ipad air precio','ipad mini comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'ipad_pro', productName:'iPad Pro 11" / 12.9"', categoryId:'tablets_ereaders', aliases:['ipad pro','ipad pro 11','ipad pro 12.9','ipad pro m2'], misspellings:['ipad pro m 2'], englishTerms:['ipad pro 11','ipad pro 12.9'], spanishTerms:['tableta profesional apple'], ecommerceTerms:['Apple iPad Pro 11-inch M2','iPad Pro 12.9 256GB'], commonSearchPhrases:['ipad pro precio','ipad pro m2 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'samsung_tab', productName:'Samsung Galaxy Tab S / A', categoryId:'tablets_ereaders', aliases:['samsung tab','galaxy tab','galaxy tab s9','samsung tab a'], misspellings:['samsung tablet','galaxy tab s 9'], englishTerms:['samsung galaxy tab s9','galaxy tab a9'], spanishTerms:['tableta samsung','tablet samsung'], ecommerceTerms:['Samsung Galaxy Tab S9','Tab A9 Plus'], commonSearchPhrases:['samsung galaxy tab precio','tablet samsung comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'kindle_alt', productName:'Amazon Kindle / Kindle Paperwhite', categoryId:'tablets_ereaders', aliases:['kindle','kindle paperwhite','amazon kindle','kindle oasis','ebook reader'], misspellings:['kinle','kindel'], englishTerms:['amazon kindle','kindle paperwhite 11th gen'], spanishTerms:['lector de libros','ebook reader kindle'], ecommerceTerms:['Amazon Kindle Paperwhite','Kindle Colorsoft'], commonSearchPhrases:['kindle precio','kindle paperwhite comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'android_tablet', productName:'Tablet Android / Lenovo / Huawei', categoryId:'tablets_ereaders', aliases:['tablet lenovo','lenovo tab','huawei matepad','android tablet'], misspellings:['tableta andorid'], englishTerms:['lenovo tab p12','huawei matepad 11'], spanishTerms:['tableta android'], ecommerceTerms:['Lenovo Tab P12','Huawei MatePad 11'], commonSearchPhrases:['tablet lenovo precio','tablet android barata'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'macbook_air', productName:'MacBook Air M2 / M3', categoryId:'computers_main_parts', aliases:['macbook air','macbook air m2','macbook air m3','apple laptop'], misspellings:['mackbook air','macbook aer'], englishTerms:['macbook air m2','macbook air m3'], spanishTerms:['laptop apple','computadora apple'], ecommerceTerms:['Apple MacBook Air 13-inch M2','MacBook Air M3 8GB'], commonSearchPhrases:['macbook air precio','macbook air m2 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'macbook_pro', productName:'MacBook Pro 14" / 16" M3', categoryId:'computers_main_parts', aliases:['macbook pro','macbook pro m3','macbook pro 14','macbook pro 16'], misspellings:['mackbook pro','macbook pro m 3'], englishTerms:['macbook pro 14','macbook pro 16 m3'], spanishTerms:['laptop profesional apple'], ecommerceTerms:['Apple MacBook Pro 14-inch M3','MacBook Pro 16 M3 Pro'], commonSearchPhrases:['macbook pro precio','macbook pro m3 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'dell_laptop', productName:'Dell XPS / Inspiron / Latitude', categoryId:'computers_main_parts', aliases:['dell xps','dell inspiron','dell latitude','laptop dell'], misspellings:['del xps','dell insperion'], englishTerms:['dell xps 15','dell inspiron 15'], spanishTerms:['laptop dell','computadora dell'], ecommerceTerms:['Dell XPS 15','Dell Inspiron 15 3000'], commonSearchPhrases:['laptop dell precio','dell xps comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'hp_laptop', productName:'HP Spectre / Envy / Pavilion', categoryId:'computers_main_parts', aliases:['hp spectre','hp envy','hp pavilion','laptop hp'], misspellings:['hp spectere'], englishTerms:['hp spectre x360','hp envy 16'], spanishTerms:['laptop hp','computadora hp'], ecommerceTerms:['HP Spectre x360','HP Envy 16'], commonSearchPhrases:['laptop hp precio','hp envy comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'lenovo_laptop', productName:'Lenovo ThinkPad / IdeaPad / Legion', categoryId:'computers_main_parts', aliases:['lenovo thinkpad','lenovo ideapad','lenovo legion','laptop lenovo'], misspellings:['lenovo tinkpad'], englishTerms:['lenovo thinkpad x1','lenovo ideapad 5'], spanishTerms:['laptop lenovo','computadora lenovo'], ecommerceTerms:['Lenovo ThinkPad X1 Carbon','Lenovo IdeaPad 5'], commonSearchPhrases:['laptop lenovo precio','lenovo thinkpad comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'asus_laptop', productName:'ASUS ROG / ZenBook / VivoBook', categoryId:'computers_main_parts', aliases:['asus rog','asus zenbook','asus vivobook','laptop asus gaming'], misspellings:['asus zennbook'], englishTerms:['asus rog strix','asus zenbook 14'], spanishTerms:['laptop asus','asus gaming'], ecommerceTerms:['ASUS ROG Strix G16','ASUS ZenBook 14 OLED'], commonSearchPhrases:['asus rog precio','laptop gaming asus'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'gaming_laptop_alt', productName:'Laptop Gaming / MSI / Razer', categoryId:'computers_main_parts', aliases:['laptop gaming','msi gaming laptop','razer blade','alienware'], misspellings:['gaming latop'], englishTerms:['msi katana','razer blade 15','alienware m16'], spanishTerms:['laptop gamer','computadora gaming'], ecommerceTerms:['MSI Katana 15','Razer Blade 15','Alienware m16 R1'], commonSearchPhrases:['laptop gaming precio','laptop gamer comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'chromebook_alt', productName:'Chromebook / ChromeOS', categoryId:'computers_main_parts', aliases:['chromebook','chrome book','laptop chrome os'], misspellings:['cromebook'], englishTerms:['chromebook','google chrome os laptop'], spanishTerms:['chromebook'], ecommerceTerms:['HP Chromebook 14','Lenovo Chromebook Flex 5'], commonSearchPhrases:['chromebook precio','chromebook para estudiantes'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'mac_desktop', productName:'Mac Mini / Mac Studio / iMac', categoryId:'computers_main_parts', aliases:['mac mini','mac studio','imac','apple desktop'], misspellings:['mac mini m2','imac m3'], englishTerms:['mac mini m2','mac studio m2 max','imac 24'], spanishTerms:['computadora apple escritorio'], ecommerceTerms:['Apple Mac Mini M2','Mac Studio M2 Max','iMac 24-inch M3'], commonSearchPhrases:['mac mini precio','imac comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'mini_pc', productName:'Mini PC / NUC / Beelink', categoryId:'computers_main_parts', aliases:['mini pc','beelink','nuc intel','mini computadora'], misspellings:['mini pc beelink'], englishTerms:['intel nuc','beelink mini pc'], spanishTerms:['mini computadora','pc mini'], ecommerceTerms:['Beelink Mini S12 Pro','Intel NUC 12'], commonSearchPhrases:['mini pc precio','beelink comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'raspberry_pi', productName:'Raspberry Pi / Arduino', categoryId:'computers_main_parts', aliases:['raspberry pi','arduino','raspberry pi 5','microcontroller'], misspellings:['rasberry pi','rasperry pi'], englishTerms:['raspberry pi 5','arduino uno','raspberry pi 4'], spanishTerms:['raspberry pi','arduino'], ecommerceTerms:['Raspberry Pi 5 4GB','Arduino UNO R4'], commonSearchPhrases:['raspberry pi precio','arduino comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'monitor_4k', productName:'Monitor 4K / 27" / 32"', categoryId:'computer_accessories', aliases:['monitor 4k','monitor 27 pulgadas','pantalla 4k','monitor lg 4k'], misspellings:['monitor 4K','monitór'], englishTerms:['4k monitor 27 inch','ultra hd monitor'], spanishTerms:['monitor 4K','pantalla 4k'], ecommerceTerms:['LG 27UK850-W','Dell U2723D','Samsung 32" 4K'], commonSearchPhrases:['monitor 4k precio','monitor 27 pulgadas comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'monitor_gaming', productName:'Monitor Gaming 144Hz / 240Hz', categoryId:'computer_accessories', aliases:['monitor gaming','monitor 144hz','monitor 240hz','monitor gamer'], misspellings:['monitor gamer 144'], englishTerms:['gaming monitor 144hz','1440p gaming monitor'], spanishTerms:['monitor gamer','pantalla gaming'], ecommerceTerms:['ASUS TUF VG27AQ','LG 27GP850-B','Alienware AW2723DF'], commonSearchPhrases:['monitor gaming 144hz precio','monitor gamer comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'monitor_ultrawide', productName:'Monitor Ultrawide / Curvo', categoryId:'computer_accessories', aliases:['monitor ultrawide','monitor curvo','ultrawide 34','34 pulgadas curvo'], misspellings:['ultra wide monitor'], englishTerms:['ultrawide monitor','curved gaming monitor'], spanishTerms:['monitor curvo','ultrawide'], ecommerceTerms:['LG 34WP65C-B','Samsung 34" Odyssey G5'], commonSearchPhrases:['monitor ultrawide precio','monitor curvo comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'monitor_portatil', productName:'Monitor Portátil / USB-C', categoryId:'computer_accessories', aliases:['monitor portátil','monitor usb-c','pantalla portatil'], misspellings:['monitor portatil'], englishTerms:['portable monitor','usb-c display'], spanishTerms:['monitor portátil','pantalla portátil'], ecommerceTerms:['ASUS ZenScreen MB16ACE','Lepow 15.6 Portable Monitor'], commonSearchPhrases:['monitor portátil precio','monitor usb-c comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'tablet_dibujo', productName:'Tableta de Dibujo / Wacom', categoryId:'computer_accessories', aliases:['tableta dibujo','wacom','tableta gráfica','huion'], misspellings:['wakon','tableta de dibujo'], englishTerms:['drawing tablet','wacom intuos','huion kamvas'], spanishTerms:['tableta gráfica','tableta de dibujo'], ecommerceTerms:['Wacom Intuos Pro','Huion Kamvas 13'], commonSearchPhrases:['tableta de dibujo precio','wacom comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'mouse_gaming_alt', productName:'Mouse Gaming / Logitech / Razer', categoryId:'computer_accessories', aliases:['mouse gaming','ratón gaming','logitech g pro','razer deathadder'], misspellings:['mouse gamer'], englishTerms:['gaming mouse','logitech g502','razer basilisk'], spanishTerms:['ratón gamer','mouse gamer'], ecommerceTerms:['Logitech G Pro X Superlight','Razer DeathAdder V3'], commonSearchPhrases:['mouse gaming precio','logitech g pro comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'teclado_gaming', productName:'Teclado Mecánico Gaming / Inalámbrico', categoryId:'computer_accessories', aliases:['teclado mecánico','teclado gaming','keyboard mechanical','keychron'], misspellings:['teclado mecanico'], englishTerms:['mechanical keyboard','gaming keyboard','keychron k2'], spanishTerms:['teclado mecánico','teclado gamer'], ecommerceTerms:['Keychron K2','Logitech G915 TKL','Razer BlackWidow V3'], commonSearchPhrases:['teclado mecánico precio','keychron comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'webcam_hd', productName:'Webcam / Cámara Web HD / 4K', categoryId:'computer_accessories', aliases:['webcam','cámara web','logitech c920','webcam 1080p'], misspellings:['web cam'], englishTerms:['webcam hd','1080p webcam','4k webcam'], spanishTerms:['cámara web','webcam'], ecommerceTerms:['Logitech C920','Logitech Brio 4K','Razer Kiyo Pro'], commonSearchPhrases:['webcam precio','webcam 1080p comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'hub_usb_alt', productName:'Hub USB / Dock Station', categoryId:'computer_accessories', aliases:['hub usb','dock station','usb hub','hub usbc','docking station'], misspellings:['hub usb-c'], englishTerms:['usb hub','usb-c dock','docking station'], spanishTerms:['concentrador usb','hub usb'], ecommerceTerms:['Anker 7-in-1 USB-C Hub','Caldigit TS4 Dock'], commonSearchPhrases:['hub usb precio','dock station comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'impresora_laser', productName:'Impresora Laser / Tinta / Multifuncional', categoryId:'computer_accessories', aliases:['impresora laser','impresora tinta','impresora multifuncional','brother laser','hp laserjet'], misspellings:['impressora'], englishTerms:['laser printer','inkjet printer','all-in-one printer'], spanishTerms:['impresora','impresora multifuncional'], ecommerceTerms:['Brother HL-L2350DW','HP LaserJet Pro','Canon Pixma'], commonSearchPhrases:['impresora precio','impresora laser comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'soporte_laptop', productName:'Soporte Laptop / Arm Monitor', categoryId:'computer_accessories', aliases:['soporte laptop','laptop stand','arm monitor','soporte monitor'], misspellings:['soporte lap top'], englishTerms:['laptop stand','monitor arm'], spanishTerms:['soporte laptop','soporte monitor'], ecommerceTerms:['Ergotron LX Monitor Arm','Lamicall Laptop Stand'], commonSearchPhrases:['soporte laptop precio','arm monitor comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'ssd_nvme', productName:'SSD NVMe M.2 / PCIe', categoryId:'storage_memory', aliases:['ssd nvme','m.2 ssd','ssd m2','samsung 990 pro'], misspellings:['ssd nvme m2'], englishTerms:['nvme ssd','m.2 pcie ssd'], spanishTerms:['disco ssd nvme','ssd interno'], ecommerceTerms:['Samsung 990 Pro 1TB NVMe','WD Black SN850X'], commonSearchPhrases:['ssd nvme precio','m.2 ssd comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'ssd_portatil', productName:'SSD Portátil / Externo / Samsung T7', categoryId:'storage_memory', aliases:['ssd portátil','ssd externo','samsung t7','sandisk extreme ssd'], misspellings:['ssd portatil'], englishTerms:['portable ssd','external ssd'], spanishTerms:['ssd externo','disco sólido portátil'], ecommerceTerms:['Samsung T7 Shield 1TB','SanDisk Extreme V2'], commonSearchPhrases:['ssd externo precio','samsung t7 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'hdd_externo', productName:'Disco Duro Externo HDD / 2TB / 4TB', categoryId:'storage_memory', aliases:['disco duro externo','hdd externo','2tb hdd','seagate expansion'], misspellings:['disco duro exterrno'], englishTerms:['external hard drive','2tb hdd'], spanishTerms:['disco duro externo'], ecommerceTerms:['Seagate Expansion 2TB','WD Elements 4TB'], commonSearchPhrases:['disco duro externo precio','hdd 2tb comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'microsd_alt', productName:'MicroSD / SD Card / Memory Card', categoryId:'storage_memory', aliases:['microsd','micro sd','sd card','memoria microsd','sandisk ultra'], misspellings:['micro sd card'], englishTerms:['microsd card','sd memory card'], spanishTerms:['memoria microsd','tarjeta de memoria'], ecommerceTerms:['SanDisk 256GB Ultra microSD','Samsung Evo Plus'], commonSearchPhrases:['microsd precio','sd card comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'usb_flash', productName:'USB Flash Drive / Memoria USB', categoryId:'storage_memory', aliases:['usb flash','memoria usb','pendrive','usb stick','flash drive'], misspellings:['pen drive','pendrive 64gb'], englishTerms:['usb flash drive','thumb drive'], spanishTerms:['memoria usb','pendrive'], ecommerceTerms:['SanDisk Ultra Fit 128GB','Kingston DataTraveler'], commonSearchPhrases:['memoria usb precio','pendrive comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cargador_gan', productName:'Cargador GaN / 65W / 100W', categoryId:'chargers_cables_adapters', aliases:['cargador gan','charger 65w','cargador 100w','anker charger','baseus gan'], misspellings:['cargador gann'], englishTerms:['gan charger','65w usb-c charger'], spanishTerms:['cargador gan','cargador rápido'], ecommerceTerms:['Anker 735 GaN Charger 65W','Baseus 65W GaN'], commonSearchPhrases:['cargador gan precio','cargador 65w comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cable_usbc_240w', productName:'Cable USB-C 240W / Carga Rápida', categoryId:'chargers_cables_adapters', aliases:['cable usb-c 240w','cable carga rapida','cable tipo c'], misspellings:['cable usbc 240'], englishTerms:['usb-c 240w cable','fast charge cable'], spanishTerms:['cable de carga rápida'], ecommerceTerms:['Anker USB-C 240W Cable','Baseus 100W USB-C'], commonSearchPhrases:['cable usb-c 240w precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cable_lightning_alt', productName:'Cable Lightning / iPhone Cable', categoryId:'chargers_cables_adapters', aliases:['cable lightning','cable iphone','lightning cable'], misspellings:['cable lightining'], englishTerms:['lightning cable','iphone charging cable'], spanishTerms:['cable para iphone','cable lightning'], ecommerceTerms:['Apple Lightning Cable','Anker Lightning Cable'], commonSearchPhrases:['cable lightning precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cargador_inalambrico', productName:'Cargador Inalámbrico / MagSafe / Qi', categoryId:'chargers_cables_adapters', aliases:['cargador inalámbrico','magsafe','qi charger','wireless charger','cargador qi'], misspellings:['cargador inalambrico'], englishTerms:['wireless charger','magsafe charger','qi pad'], spanishTerms:['cargador inalámbrico','cargador magsafe'], ecommerceTerms:['Apple MagSafe Charger','Anker 15W Wireless Charger'], commonSearchPhrases:['cargador inalámbrico precio','magsafe comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'power_bank_grande', productName:'Power Bank 20000mAh / 30000mAh', categoryId:'lithium_batteries_powerbanks', aliases:['power bank 20000','batería portátil 20000','anker powerbank'], misspellings:['powerbank 20000'], englishTerms:['20000mah power bank','portable charger'], spanishTerms:['batería portátil grande'], ecommerceTerms:['Anker 737 Power Bank 24000mAh','Baseus 20000mAh'], commonSearchPhrases:['power bank 20000 precio','batería portátil comprar'], riskOverrideFlags:['contains_lithium_battery'], customerHint:'Este producto contiene batería de litio y puede requerir revisión adicional para transporte.', adminHint:'Revisar capacidad Wh y restricciones de transporte aéreo.' },
    { productKey:'power_bank_solar', productName:'Power Bank Solar / Cargador Solar', categoryId:'lithium_batteries_powerbanks', aliases:['power bank solar','cargador solar','solar charger'], misspellings:['solar powerbank'], englishTerms:['solar power bank','solar charger'], spanishTerms:['cargador solar','batería solar portátil'], ecommerceTerms:['BigBlue 28W Solar Charger','Blavor Solar Power Bank'], commonSearchPhrases:['cargador solar precio','power bank solar comprar'], riskOverrideFlags:['contains_lithium_battery'], customerHint:'Contiene batería de litio — puede requerir revisión de transporte.', adminHint:'Revisar Wh y normativa de transporte aéreo.' },
    { productKey:'router_ax', productName:'Router WiFi 6 / AX / TP-Link', categoryId:'networking_equipment', aliases:['router wifi 6','router ax','tp-link ax','asus router','wifi 6e router'], misspellings:['router wifi6'], englishTerms:['wifi 6 router','ax3000 router'], spanishTerms:['router wifi','enrutador wifi 6'], ecommerceTerms:['TP-Link Archer AX73','ASUS RT-AX88U','Netgear Nighthawk'], commonSearchPhrases:['router wifi 6 precio','router ax3000 comprar'], riskOverrideFlags:['telecom_possible'], customerHint:'', adminHint:'Verificar homologación SUTEL.' },
    { productKey:'mesh_wifi_alt', productName:'Mesh WiFi / Eero / Google Nest WiFi', categoryId:'networking_equipment', aliases:['mesh wifi','eero','google nest wifi','orbi','deco tp-link'], misspellings:['mesh wifi system'], englishTerms:['mesh wifi system','eero pro 6e'], spanishTerms:['sistema wifi malla','mesh wifi'], ecommerceTerms:['Amazon Eero Pro 6E','Google Nest WiFi Pro','TP-Link Deco XE75'], commonSearchPhrases:['mesh wifi precio','eero comprar'], riskOverrideFlags:['telecom_possible'], customerHint:'', adminHint:'Verificar homologación SUTEL.' },
    { productKey:'switch_red', productName:'Switch de Red / PoE / Managed', categoryId:'networking_equipment', aliases:['switch red','switch poe','managed switch','unmanaged switch'], misspellings:['switch de red'], englishTerms:['network switch','poe switch'], spanishTerms:['switch de red'], ecommerceTerms:['TP-Link TL-SG108','Ubiquiti UniFi Switch Lite 16 PoE'], commonSearchPhrases:['switch poe precio','switch de red comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'airpods_alt', productName:'AirPods / AirPods 3ra Gen', categoryId:'headphones_audio_personal', aliases:['airpods','airpods 3','apple earbuds','audifonos apple'], misspellings:['air pods','erpods','aipods'], englishTerms:['airpods 3rd gen','apple earbuds'], spanishTerms:['audífonos apple','airpods'], ecommerceTerms:['Apple AirPods 3rd Generation'], commonSearchPhrases:['airpods precio','airpods 3 comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'airpods_pro', productName:'AirPods Pro 2da Gen', categoryId:'headphones_audio_personal', aliases:['airpods pro','airpods pro 2','apple airpods pro'], misspellings:['airpods pro 2da gen','air pods pro'], englishTerms:['airpods pro 2nd gen','apple anc earbuds'], spanishTerms:['airpods pro segunda gen'], ecommerceTerms:['Apple AirPods Pro (2nd generation)'], commonSearchPhrases:['airpods pro precio','airpods pro 2 comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'airpods_max', productName:'AirPods Max / Over-Ear Apple', categoryId:'headphones_audio_personal', aliases:['airpods max','apple headphones','over-ear apple'], misspellings:['airpod max'], englishTerms:['airpods max','apple over-ear headphones'], spanishTerms:['audífonos over-ear apple'], ecommerceTerms:['Apple AirPods Max'], commonSearchPhrases:['airpods max precio','apple headphones comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'sony_wh1000xm', productName:'Sony WH-1000XM5 / XM4 (ANC)', categoryId:'headphones_audio_personal', aliases:['sony wh1000xm5','sony xm5','sony xm4','sony headphones anc'], misspellings:['sony wh 1000xm5','sony xm 5'], englishTerms:['sony wh-1000xm5','sony noise canceling headphones'], spanishTerms:['audífonos sony anc','sony cancelación de ruido'], ecommerceTerms:['Sony WH-1000XM5','Sony WH-1000XM4'], commonSearchPhrases:['sony xm5 precio','sony wh1000xm5 comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'bose_headphones', productName:'Bose QuietComfort / Ultra Earbuds', categoryId:'headphones_audio_personal', aliases:['bose qc45','bose quietcomfort','bose ultra earbuds','bose earphones'], misspellings:['bose qc 45'], englishTerms:['bose quietcomfort 45','bose ultra earbuds'], spanishTerms:['audífonos bose','bose cancelación ruido'], ecommerceTerms:['Bose QuietComfort 45','Bose QuietComfort Ultra Earbuds'], commonSearchPhrases:['bose qc45 precio','bose earbuds comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'jbl_earbuds', productName:'JBL Earbuds / Tune / Live', categoryId:'headphones_audio_personal', aliases:['jbl earbuds','jbl tune','jbl live','samsung earbuds jbl'], misspellings:['jbl ear buds'], englishTerms:['jbl tune 230nc','jbl live pro 2'], spanishTerms:['audífonos jbl','jbl inalámbricos'], ecommerceTerms:['JBL Tune 230NC TWS','JBL Live Pro 2'], commonSearchPhrases:['jbl earbuds precio','jbl tune comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'samsung_galaxy_buds', productName:'Samsung Galaxy Buds / Buds Pro', categoryId:'headphones_audio_personal', aliases:['galaxy buds','samsung buds','galaxy buds pro','samsung earbuds'], misspellings:['galaxy buds 2 pro'], englishTerms:['samsung galaxy buds 2 pro','galaxy buds fe'], spanishTerms:['audífonos samsung','galaxy buds'], ecommerceTerms:['Samsung Galaxy Buds2 Pro','Galaxy Buds FE'], commonSearchPhrases:['galaxy buds precio','samsung buds comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'bocina_jbl', productName:'Bocina JBL Charge / Flip / Xtreme', categoryId:'speakers_home_audio', aliases:['bocina jbl','jbl charge','jbl flip','jbl xtreme','jbl go','parlante jbl'], misspellings:['bocina JBL','parlante jbl flip'], englishTerms:['jbl charge 5','jbl flip 6','jbl xtreme 3'], spanishTerms:['bocina bluetooth jbl','parlante jbl'], ecommerceTerms:['JBL Charge 5','JBL Flip 6','JBL Xtreme 3'], commonSearchPhrases:['bocina jbl precio','jbl charge 5 comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'bocina_marshall', productName:'Bocina Marshall / UE Wonderboom', categoryId:'speakers_home_audio', aliases:['bocina marshall','marshall speaker','ue wonderboom','ultimate ears'], misspellings:['marshall bocina'], englishTerms:['marshall stanmore','ue wonderboom 3'], spanishTerms:['bocina marshall','parlante marshall'], ecommerceTerms:['Marshall Stanmore III','UE Wonderboom 3'], commonSearchPhrases:['bocina marshall precio','marshall stanmore comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'bocina_sonos', productName:'Bocina Sonos / Bose SoundLink', categoryId:'speakers_home_audio', aliases:['sonos','bose soundlink','bose speaker','sonos era'], misspellings:['sonos era 100'], englishTerms:['sonos era 100','bose soundlink flex'], spanishTerms:['bocina sonos','parlante premium'], ecommerceTerms:['Sonos Era 100','Bose SoundLink Flex'], commonSearchPhrases:['sonos precio','bose soundlink comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'sony_alpha', productName:'Cámara Sony Alpha / ZV / A6700', categoryId:'cameras_photo_video', aliases:['sony alpha','sony a7','sony zv-e10','sony a6700','sony mirrorless'], misspellings:['sony alfa'], englishTerms:['sony alpha a7 iv','sony zv-e10','sony a6700'], spanishTerms:['cámara sony','sony sin espejo'], ecommerceTerms:['Sony Alpha A7 IV','Sony ZV-E10','Sony A6700'], commonSearchPhrases:['sony alpha precio','sony zv-e10 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'canon_eos', productName:'Cámara Canon EOS / R / Rebel', categoryId:'cameras_photo_video', aliases:['canon eos','canon r50','canon r7','canon rebel'], misspellings:['canon eos R50'], englishTerms:['canon eos r50','canon r7','canon rebel t8i'], spanishTerms:['cámara canon'], ecommerceTerms:['Canon EOS R50','Canon EOS R7','Canon Rebel T8i'], commonSearchPhrases:['canon eos precio','canon r50 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'dji_osmo', productName:'DJI Osmo Pocket / Action Camera', categoryId:'cameras_photo_video', aliases:['dji osmo','dji pocket','dji action 4','osmo pocket 3'], misspellings:['dji osmo pocket 3'], englishTerms:['dji osmo pocket 3','dji action 4'], spanishTerms:['cámara de acción dji','dji osmo pocket'], ecommerceTerms:['DJI Osmo Pocket 3','DJI Action 4'], commonSearchPhrases:['dji pocket 3 precio','dji action 4 comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'gopro_alt', productName:'GoPro Hero / Max', categoryId:'cameras_photo_video', aliases:['gopro','go pro','gopro hero 12','gopro max','action cam'], misspellings:['go pro hero 12'], englishTerms:['gopro hero 12','gopro max 360'], spanishTerms:['cámara gopro','gopro deportiva'], ecommerceTerms:['GoPro HERO12 Black','GoPro Max 360'], commonSearchPhrases:['gopro precio','gopro hero 12 comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'insta360', productName:'Insta360 / Cámara 360', categoryId:'cameras_photo_video', aliases:['insta360','cámara 360','insta 360','theta camera'], misspellings:['insta 360'], englishTerms:['insta360 x3','360 degree camera'], spanishTerms:['cámara 360','insta360'], ecommerceTerms:['Insta360 X3','Insta360 ONE RS'], commonSearchPhrases:['insta360 precio','cámara 360 comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'fire_tv', productName:'Amazon Fire TV Stick / Apple TV / Roku', categoryId:'tv_projectors_streaming', aliases:['fire tv','fire stick','apple tv','roku','chromecast'], misspellings:['firestick','fire stick 4k'], englishTerms:['amazon fire tv stick 4k','apple tv 4k','roku streaming stick'], spanishTerms:['streaming stick','tv stick'], ecommerceTerms:['Amazon Fire TV Stick 4K Max','Apple TV 4K 3rd Gen','Roku Streaming Stick 4K'], commonSearchPhrases:['fire tv stick precio','apple tv 4k comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'tv_oled', productName:'TV OLED / QLED / 55" / 65"', categoryId:'tv_projectors_streaming', aliases:['tv oled','televisor oled','lg oled','samsung qled','tv 55 pulgadas'], misspellings:['televisor oled 55'], englishTerms:['oled tv 55 inch','qled 65 inch'], spanishTerms:['televisor oled','tv 55 pulgadas'], ecommerceTerms:['LG C3 55" OLED','Samsung 65" QN90C QLED'], commonSearchPhrases:['tv oled precio','televisor 55 pulgadas comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el peso y dimensiones del equipo.', adminHint:'Verificar dimensiones y peso para flete.' },
    { productKey:'mini_proyector', productName:'Proyector Portátil / Mini Proyector', categoryId:'tv_projectors_streaming', aliases:['mini proyector','proyector portátil','pocket projector','nebula capsule'], misspellings:['mini proyetor'], englishTerms:['mini projector','portable projector','anker nebula capsule'], spanishTerms:['proyector portátil','mini proyector'], ecommerceTerms:['Anker Nebula Capsule 3','XGIMI Halo+'], commonSearchPhrases:['mini proyector precio','proyector portátil comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'ps5_alt', productName:'PlayStation 5 / PS5 Slim', categoryId:'gaming_consoles_electronics', aliases:['ps5','playstation 5','ps5 slim','sony ps5'], misspellings:['play station 5','ps 5'], englishTerms:['playstation 5','ps5 disc edition'], spanishTerms:['consola ps5','play 5'], ecommerceTerms:['Sony PlayStation 5','PS5 Slim Disc Edition'], commonSearchPhrases:['ps5 precio','playstation 5 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'xbox_series_alt', productName:'Xbox Series X / S', categoryId:'gaming_consoles_electronics', aliases:['xbox series x','xbox series s','xbox'], misspellings:['xbox series x/s'], englishTerms:['xbox series x','xbox series s'], spanishTerms:['consola xbox','xbox'], ecommerceTerms:['Microsoft Xbox Series X','Xbox Series S'], commonSearchPhrases:['xbox series x precio','xbox series s comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'nintendo_switch_alt', productName:'Nintendo Switch / OLED / Lite', categoryId:'gaming_consoles_electronics', aliases:['nintendo switch','switch oled','switch lite','nintendo'], misspellings:['nitendo switch','nintendo swith'], englishTerms:['nintendo switch oled','nintendo switch lite'], spanishTerms:['consola nintendo switch','switch nintendo'], ecommerceTerms:['Nintendo Switch OLED','Nintendo Switch Lite'], commonSearchPhrases:['nintendo switch precio','switch oled comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'steam_deck_alt', productName:'Steam Deck / Steam Deck OLED', categoryId:'gaming_consoles_electronics', aliases:['steam deck','steam deck oled','valve steam deck'], misspellings:['steamdeck'], englishTerms:['steam deck oled','valve steam deck'], spanishTerms:['steam deck','consola portátil pc gaming'], ecommerceTerms:['Steam Deck OLED 512GB'], commonSearchPhrases:['steam deck precio','steam deck oled comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'gaming_headset', productName:'Gaming Headset / Auriculares Gamer', categoryId:'gaming_physical_accessories', aliases:['gaming headset','headset gamer','astro a50','hyperx cloud','steelseries arctis'], misspellings:['headset gaming'], englishTerms:['gaming headset','astro a50','hyperx cloud alpha'], spanishTerms:['audífonos gamer','headset para gaming'], ecommerceTerms:['Astro A50 Wireless','HyperX Cloud Alpha','SteelSeries Arctis Nova Pro'], commonSearchPhrases:['headset gaming precio','auriculares gamer comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'silla_gaming_alt', productName:'Silla Gaming / Secretlab / DXRacer', categoryId:'gaming_physical_accessories', aliases:['silla gaming','secretlab','dxracer','silla gamer','noblechairs'], misspellings:['silla gammer'], englishTerms:['gaming chair','secretlab titan','dxracer series'], spanishTerms:['silla gamer','silla gaming ergonómica'], ecommerceTerms:['Secretlab Titan Evo 2022','DXRacer Formula Series'], commonSearchPhrases:['silla gaming precio','silla gamer comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el peso y dimensiones.', adminHint:'Verificar peso/dimensiones para flete.' },
    { productKey:'camiseta_grafica', productName:'Camiseta Gráfica / Estampada', categoryId:'clothing_general', aliases:['camiseta gráfica','camiseta estampada','graphic tee','camiseta diseño'], misspellings:['camizeta grafica'], englishTerms:['graphic tee','printed t-shirt'], spanishTerms:['camiseta gráfica','remera estampada'], ecommerceTerms:['Graphic Tee','Custom Print T-Shirt'], commonSearchPhrases:['camiseta gráfica precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'hoodie_champion', productName:'Sudadera / Hoodie / Pullover', categoryId:'clothing_general', aliases:['sudadera','hoodie','pullover','sweatshirt','buzo'], misspellings:['hudie','sudadera hoodie'], englishTerms:['hoodie','sweatshirt','pullover'], spanishTerms:['sudadera con capucha','buzo','hoodie'], ecommerceTerms:['Champion Reverse Weave Hoodie','Nike Sportswear Hoodie'], commonSearchPhrases:['sudadera precio','hoodie comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'jean_denim', productName:'Jeans / Pantalón Denim / Levis', categoryId:'clothing_general', aliases:['jeans','jean','levis','denim pants','pantalón denim'], misspellings:['jins','jeens'], englishTerms:['jeans','denim jeans','levis 501'], spanishTerms:['pantalón de mezclilla','jean'], ecommerceTerms:['Levi\'s 501 Original Fit','Wrangler Regular Fit Jeans'], commonSearchPhrases:['jeans precio','levis 501 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'leggins', productName:'Leggings / Mallas Deportivas / Lululemon', categoryId:'clothing_general', aliases:['leggings','mallas deportivas','lululemon','yoga pants','tights'], misspellings:['legins','legins'], englishTerms:['leggings','yoga pants','athletic tights'], spanishTerms:['mallas deportivas','leggings'], ecommerceTerms:['Lululemon Align Pant','Gymshark Vital Seamless Leggings'], commonSearchPhrases:['leggings precio','lululemon comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'shorts_deportivos', productName:'Shorts / Bermuda Deportiva', categoryId:'clothing_general', aliases:['shorts','bermuda','shorts deportivos','gym shorts'], misspellings:['short deportivo'], englishTerms:['athletic shorts','gym shorts'], spanishTerms:['shorts deportivos','bermuda'], ecommerceTerms:['Nike Dri-FIT Shorts','Gymshark Speed 5" Shorts'], commonSearchPhrases:['shorts deportivos precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'camisa_polo', productName:'Camisa Polo / Lacoste / Ralph Lauren', categoryId:'clothing_general', aliases:['camisa polo','polo shirt','lacoste','ralph lauren polo'], misspellings:['polo shirt lacoste'], englishTerms:['polo shirt','pique polo'], spanishTerms:['camisa polo'], ecommerceTerms:['Lacoste Men\'s Polo','Ralph Lauren Classic Fit Polo'], commonSearchPhrases:['camisa polo precio','polo lacoste comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'conjunto_deportivo', productName:'Conjunto Deportivo / Jogger Set', categoryId:'clothing_general', aliases:['conjunto deportivo','jogger set','tracksuit','conjunto gym'], misspellings:['conjunto deportibo'], englishTerms:['tracksuit','jogger set'], spanishTerms:['conjunto deportivo','juego deportivo'], ecommerceTerms:['Nike Tech Fleece Full-Zip Hoodie & Joggers Set','Adidas 3-Stripes Tracksuit'], commonSearchPhrases:['conjunto deportivo precio','tracksuit comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'oversized_tshirt', productName:'Camiseta Oversized / Unisex', categoryId:'clothing_general', aliases:['camiseta oversized','oversized tee','camiseta ancha','unisex shirt'], misspellings:['over size tshirt'], englishTerms:['oversized t-shirt','boxy tee'], spanishTerms:['camiseta oversize','camiseta ancha'], ecommerceTerms:['Gildan Heavyweight T-Shirt','H&M Oversized Tee'], commonSearchPhrases:['camiseta oversized precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'ropa_interior_pack', productName:'Pack Ropa Interior / Calvin Klein', categoryId:'clothing_general', aliases:['pack ropa interior','calvin klein underwear','pack boxer','pack calzoncillos'], misspellings:['calzoncillo pack'], englishTerms:['underwear multipack','boxer briefs pack'], spanishTerms:['pack ropa interior','calzoncillos pack'], ecommerceTerms:['Calvin Klein 3-Pack Boxer Briefs','Tommy Hilfiger 3-Pack Trunks'], commonSearchPhrases:['pack ropa interior precio','calvin klein underwear comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'pijama_conjunto', productName:'Pijama / Conjunto de Dormir', categoryId:'clothing_general', aliases:['pijama conjunto','pijama set','conjunto dormir','sleepwear'], misspellings:['pijamas'], englishTerms:['pajama set','sleepwear'], spanishTerms:['pijama','conjunto para dormir'], ecommerceTerms:['Amazon Essentials Flannel Pajama Set'], commonSearchPhrases:['pijama precio','conjunto de dormir comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'vestido_zara', productName:'Vestido Casual / Formal / Mini', categoryId:'clothing_general', aliases:['vestido casual','vestido mini','vestido formal','summer dress'], misspellings:['bestido casual'], englishTerms:['casual dress','midi dress','wrap dress'], spanishTerms:['vestido casual','vestido de verano'], ecommerceTerms:['Zara Midi Dress','ASOS Wrap Dress'], commonSearchPhrases:['vestido precio','vestido casual comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'blazer_formal', productName:'Blazer / Saco / Traje', categoryId:'clothing_general', aliases:['blazer','saco','traje hombre','suit jacket'], misspellings:['blazeer'], englishTerms:['blazer','suit jacket'], spanishTerms:['blazer','saco formal'], ecommerceTerms:['Men\'s Slim Fit Blazer','Women\'s Office Blazer'], commonSearchPhrases:['blazer precio','saco formal comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'nike_air_force', productName:'Nike Air Force 1 / Air Max', categoryId:'footwear_complete', aliases:['nike air force 1','af1','air force one','nike air max 90'], misspellings:['nike air force1','air force 1'], englishTerms:['nike air force 1','air max 270'], spanishTerms:['tenis nike','zapatillas nike'], ecommerceTerms:['Nike Air Force 1 \'07','Nike Air Max 270'], commonSearchPhrases:['nike air force precio','af1 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'adidas_ultraboost', productName:'Adidas Ultraboost / Stan Smith', categoryId:'footwear_complete', aliases:['adidas ultraboost','ultra boost','adidas stan smith','adidas yeezy'], misspellings:['adidas ultra boost'], englishTerms:['adidas ultraboost 23','adidas stan smith'], spanishTerms:['tenis adidas','zapatillas adidas'], ecommerceTerms:['Adidas Ultraboost 23','Adidas Stan Smith'], commonSearchPhrases:['adidas ultraboost precio','stan smith comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'new_balance', productName:'New Balance 990 / 574 / 327', categoryId:'footwear_complete', aliases:['new balance','nb 990','new balance 574','new balance 327'], misspellings:['new balanse'], englishTerms:['new balance 990','new balance 574'], spanishTerms:['tenis new balance'], ecommerceTerms:['New Balance 990v6','New Balance 574 Core'], commonSearchPhrases:['new balance precio','nb 990 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'jordan', productName:'Air Jordan 1 / 4 / Nike Jordan', categoryId:'footwear_complete', aliases:['jordan 1','air jordan','jordan 4','jordan retro'], misspellings:['jordan 1 retro'], englishTerms:['air jordan 1 retro high','jordan 4 retro'], spanishTerms:['jordan 1','tenis jordan'], ecommerceTerms:['Air Jordan 1 Retro High OG','Jordan 4 Retro'], commonSearchPhrases:['jordan 1 precio','air jordan comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'vans_converse', productName:'Vans Old Skool / Converse Chuck Taylor', categoryId:'footwear_complete', aliases:['vans old skool','converse chuck taylor','vans','converse all star'], misspellings:['converse chuk taylor','vans oldskool'], englishTerms:['vans old skool','converse chuck taylor all star'], spanishTerms:['vans','converse'], ecommerceTerms:['Vans Old Skool','Converse Chuck Taylor All Star'], commonSearchPhrases:['vans precio','converse comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'crocs', productName:'Crocs / Clogs / Jibbitz', categoryId:'footwear_complete', aliases:['crocs','crocs classic','crocs jibbitz','foam clogs'], misspellings:['cros','crocs clasicos'], englishTerms:['crocs classic clog','crocs jibbitz charms'], spanishTerms:['crocs','zuecos crocs'], ecommerceTerms:['Crocs Classic Clog','Crocs Jibbitz Charms'], commonSearchPhrases:['crocs precio','crocs classic comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'ugg_botas', productName:'UGG Boots / Timberland / Dr. Martens', categoryId:'footwear_complete', aliases:['ugg boots','timberland','dr martens','botas ugg','bota timberland'], misspellings:['ugg bots','timberlan boots'], englishTerms:['ugg classic boots','timberland 6-inch boots','dr martens 1460'], spanishTerms:['botas ugg','botas timberland'], ecommerceTerms:['UGG Classic Short Boot','Timberland Premium 6-Inch Boot','Dr. Martens 1460'], commonSearchPhrases:['ugg boots precio','timberland comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'birkenstock', productName:'Birkenstock / Sandalia Ergonómica', categoryId:'footwear_complete', aliases:['birkenstock','birken','sandalia birkenstock','arizona birkenstock'], misspellings:['birkensctock'], englishTerms:['birkenstock arizona','birkenstock boston'], spanishTerms:['sandalia birkenstock'], ecommerceTerms:['Birkenstock Arizona Soft Footbed','Birkenstock Boston'], commonSearchPhrases:['birkenstock precio','birken comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'mochila_jansport', productName:'Mochila JanSport / Herschel / North Face', categoryId:'bags_luggage_accessories', aliases:['mochila jansport','jansport','herschel','north face backpack','mochila escolar'], misspellings:['jansport mochila'], englishTerms:['jansport superbreak','herschel little america','north face borealis'], spanishTerms:['mochila escolar','mochila jansport'], ecommerceTerms:['JanSport SuperBreak Backpack','Herschel Little America','The North Face Borealis'], commonSearchPhrases:['mochila jansport precio','herschel backpack comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'maleta_cabina', productName:'Maleta Cabina / Carry-on / 20"', categoryId:'bags_luggage_accessories', aliases:['maleta cabina','carry on','maleta 20 pulgadas','maleta de mano'], misspellings:['maleta carryon'], englishTerms:['carry-on luggage','spinner suitcase 20'], spanishTerms:['maleta de cabina','maleta de mano'], ecommerceTerms:['Samsonite Omni 2 20"','Away Carry-On','American Tourister 20"'], commonSearchPhrases:['maleta cabina precio','carry on comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'maleta_grande', productName:'Maleta Grande / 28" / 30" Samsonite', categoryId:'bags_luggage_accessories', aliases:['maleta grande','maleta 28 pulgadas','maleta samsonite','luggage large'], misspellings:['maleta granda'], englishTerms:['checked luggage 28 inch','large suitcase'], spanishTerms:['maleta de viaje grande'], ecommerceTerms:['Samsonite Freeform 28"','Ricardo Beverly Hills 30"'], commonSearchPhrases:['maleta grande precio','maleta samsonite comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño y peso.', adminHint:'Verificar dimensiones y peso.' },
    { productKey:'rinonera_fanny', productName:'Riñonera / Fanny Pack / Crossbody', categoryId:'bags_luggage_accessories', aliases:['riñonera','fanny pack','crossbody bag','marsupio'], misspellings:['riñonera fanny'], englishTerms:['fanny pack','crossbody bag'], spanishTerms:['riñonera','bolso cruzado'], ecommerceTerms:['Lululemon Everywhere Belt Bag','Nike Heritage Fanny Pack'], commonSearchPhrases:['riñonera precio','fanny pack comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'tote_canvas', productName:'Tote Bag / Bolso Canvas / Ecológico', categoryId:'bags_luggage_accessories', aliases:['tote bag','bolso canvas','canvas tote','shopping bag'], misspellings:['tot bag'], englishTerms:['canvas tote bag','reusable shopping bag'], spanishTerms:['bolso tote','bolsa ecológica'], ecommerceTerms:['Baggu Standard Bag','Trader Joe Canvas Tote'], commonSearchPhrases:['tote bag precio','bolso canvas comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'fossil_casio', productName:'Reloj Fossil / Casio / Citizen', categoryId:'watches_jewelry', aliases:['reloj fossil','casio','citizen watch','casio g-shock','fossil gen 6'], misspellings:['casio g shock'], englishTerms:['fossil gen 6','casio g-shock','citizen eco-drive'], spanishTerms:['reloj fossil','reloj casio'], ecommerceTerms:['Fossil Gen 6 Smartwatch','Casio G-Shock GA2100','Citizen Eco-Drive'], commonSearchPhrases:['reloj fossil precio','casio g-shock comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'pulsera_pandora', productName:'Pulsera Pandora / Charms', categoryId:'watches_jewelry', aliases:['pulsera pandora','pandora charm','pandora bracelet'], misspellings:['pandora pulsera'], englishTerms:['pandora charm bracelet','pandora moments'], spanishTerms:['pulsera pandora','charms pandora'], ecommerceTerms:['Pandora Moments Charm Bracelet','Pandora Silver Charm'], commonSearchPhrases:['pulsera pandora precio','pandora comprar'], riskOverrideFlags:['precious_metal_possible'], customerHint:'', adminHint:'Metales preciosos: revisar.' },
    { productKey:'set_bisuteria', productName:'Set Bisutería / Joyería Fina / Chapada', categoryId:'watches_jewelry', aliases:['set bisutería','joyería chapada','bijouterie','collar aretes juego'], misspellings:['bisuteria set'], englishTerms:['jewelry set','fashion jewelry','demi-fine jewelry'], spanishTerms:['set de joyería','bisutería fina'], ecommerceTerms:['Mejuri Gold Necklace','Kendra Scott Jewelry Set'], commonSearchPhrases:['joyería fina precio','set bisutería comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'perfume_versace', productName:'Perfume Versace / Dior / Chanel', categoryId:'beauty_fragrance', aliases:['perfume versace','versace eros','dior sauvage','chanel n5','perfume hombre'], misspellings:['perfume versache','dior saubage'], englishTerms:['versace eros cologne','dior sauvage edp'], spanishTerms:['perfume de hombre','colonia versace'], ecommerceTerms:['Versace Eros EDT 100ml','Dior Sauvage EDP'], commonSearchPhrases:['perfume versace precio','dior sauvage comprar'], riskOverrideFlags:['liquid'], customerHint:'Los perfumes son líquidos y deben declararse correctamente.', adminHint:'Revisar ml y restricciones de transporte de líquidos.' },
    { productKey:'perfume_mujer', productName:'Perfume Mujer / Chanel / Carolina Herrera', categoryId:'beauty_fragrance', aliases:['perfume mujer','chanel chance','carolina herrera 212','good girl perfume','perfume dama'], misspellings:['perfume dama'], englishTerms:['chanel chance eau tendre','carolina herrera good girl'], spanishTerms:['perfume de mujer','colonia mujer'], ecommerceTerms:['Chanel Chance Eau Tendre EDP','Carolina Herrera Good Girl'], commonSearchPhrases:['perfume mujer precio','chanel chance comprar'], riskOverrideFlags:['liquid'], customerHint:'Los perfumes son líquidos y deben declararse correctamente.', adminHint:'Revisar ml y restricciones de líquidos.' },
    { productKey:'perfume_arabe', productName:'Perfume Árabe / Oud / Lattafa', categoryId:'beauty_fragrance', aliases:['perfume árabe','oud','lattafa','arabiyat','bakhoor','attar'], misspellings:['perfume arabe','latafa'], englishTerms:['arabic perfume','oud fragrance','lattafa perfume'], spanishTerms:['perfume árabe','oud perfume'], ecommerceTerms:['Lattafa Ameer Al Oudh','Ajmal Oud Perfume'], commonSearchPhrases:['perfume árabe precio','oud comprar'], riskOverrideFlags:['liquid'], customerHint:'Los perfumes son líquidos — declarar correctamente.', adminHint:'Revisar ml y restricciones de líquidos.' },
    { productKey:'body_mist', productName:'Body Mist / Body Splash / Desodorante', categoryId:'beauty_fragrance', aliases:['body mist','body splash','desodorante importado','victoria secret body mist'], misspellings:['body splash victoria'], englishTerms:['victoria\'s secret body mist','body splash'], spanishTerms:['body mist','splash corporal'], ecommerceTerms:['Victoria\'s Secret Pure Seduction Body Mist'], commonSearchPhrases:['body mist precio','body splash comprar'], riskOverrideFlags:['liquid'], customerHint:'', adminHint:'Revisar ml y aerosol/líquido.' },
    { productKey:'colonia_set', productName:'Set Colonia / Gift Set / Coffret', categoryId:'beauty_fragrance', aliases:['set colonia','gift set perfume','coffret','cologne gift set'], misspellings:['set de colonia'], englishTerms:['cologne gift set','perfume gift box'], spanishTerms:['set de perfume','regalo colonia'], ecommerceTerms:['Polo Ralph Lauren Gift Set','Nautica Voyage Gift Set'], commonSearchPhrases:['set perfume precio','regalo cologne comprar'], riskOverrideFlags:['liquid'], customerHint:'Contiene líquidos — declarar correctamente.', adminHint:'Revisar ml totales.' },
    { productKey:'base_maquillaje', productName:'Base de Maquillaje / Foundation', categoryId:'beauty_makeup_cosmetics', aliases:['base maquillaje','foundation','base liquida','fenty beauty foundation'], misspellings:['base de maquillaje'], englishTerms:['foundation','liquid foundation'], spanishTerms:['base de maquillaje','base líquida'], ecommerceTerms:['Fenty Beauty Pro Filter Foundation','Charlotte Tilbury Airbrush Foundation'], commonSearchPhrases:['base maquillaje precio','foundation comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'paleta_sombras', productName:'Paleta de Sombras / Eyeshadow Palette', categoryId:'beauty_makeup_cosmetics', aliases:['paleta sombras','eyeshadow palette','paleta naked','urban decay'], misspellings:['paleta de sombras'], englishTerms:['eyeshadow palette','naked palette'], spanishTerms:['paleta de sombras','paleta de ojos'], ecommerceTerms:['Urban Decay Naked3 Palette','Too Faced Natural Love Palette'], commonSearchPhrases:['paleta sombras precio','eyeshadow palette comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'labial_lujo', productName:'Labial / Charlotte Tilbury / MAC', categoryId:'beauty_makeup_cosmetics', aliases:['labial','charlotte tilbury','mac lipstick','labial rojo','lipstick'], misspellings:['Charlotte Tilbury lipstick'], englishTerms:['lipstick','charlotte tilbury pillow talk','mac ruby woo'], spanishTerms:['labial','pintalabios'], ecommerceTerms:['Charlotte Tilbury Matte Revolution Lipstick','MAC Ruby Woo'], commonSearchPhrases:['labial charlotte tilbury precio','mac lipstick comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'mascara_rímel', productName:'Máscara de Pestañas / Rímel', categoryId:'beauty_makeup_cosmetics', aliases:['máscara pestañas','rímel','mascara','benefit mascara','too faced mascara'], misspellings:['mascara de pestañas','rimel'], englishTerms:['mascara','volumizing mascara'], spanishTerms:['máscara de pestañas','rímel'], ecommerceTerms:['Too Faced Better Than Sex Mascara','Benefit BADgal BANG! Mascara'], commonSearchPhrases:['máscara pestañas precio','rímel comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'setting_spray', productName:'Setting Spray / Fijador Maquillaje', categoryId:'beauty_makeup_cosmetics', aliases:['setting spray','fijador maquillaje','urban decay setting spray'], misspellings:['setting espray'], englishTerms:['setting spray','makeup fixer'], spanishTerms:['fijador de maquillaje','spray fijador'], ecommerceTerms:['Urban Decay All Nighter Setting Spray','NYX Bare With Me Setting Spray'], commonSearchPhrases:['setting spray precio','fijador maquillaje comprar'], riskOverrideFlags:['liquid'], customerHint:'', adminHint:'Aerosol/líquido — revisar transporte.' },
    { productKey:'contorno_bronzer', productName:'Contorno / Bronzer / Iluminador', categoryId:'beauty_makeup_cosmetics', aliases:['contorno','bronzer','iluminador','highlighter','nars blush'], misspellings:['bronzer contorno'], englishTerms:['bronzer','contour powder','highlighter'], spanishTerms:['bronzer','contorno','iluminador'], ecommerceTerms:['NARS Blush','Charlotte Tilbury Flawless Filter'], commonSearchPhrases:['bronzer precio','iluminador comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'serum_vitamina_c', productName:'Sérum Vitamina C / The Ordinary', categoryId:'beauty_skincare_personal_care', aliases:['sérum vitamina c','vitamin c serum','the ordinary vitamin c','skinceuticals ce ferulic'], misspellings:['serum vitamina C'], englishTerms:['vitamin c serum','ascorbic acid serum'], spanishTerms:['sérum vitamina c','suero vitamina c'], ecommerceTerms:['The Ordinary Vitamin C Suspension 23%','SkinCeuticals C E Ferulic'], commonSearchPhrases:['sérum vitamina c precio','vitamin c serum comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'retinol', productName:'Retinol / Retinoid / Anti-aging', categoryId:'beauty_skincare_personal_care', aliases:['retinol','retinoid','anti-age serum','tretinoin cream'], misspellings:['retinoide'], englishTerms:['retinol serum','retinoid cream'], spanishTerms:['retinol','crema anti-edad'], ecommerceTerms:['The Ordinary Retinol 0.5%','RoC Retinol Correxion'], commonSearchPhrases:['retinol precio','retinol serum comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'protector_solar_alt', productName:'Protector Solar SPF 50 / Supergoop', categoryId:'beauty_skincare_personal_care', aliases:['protector solar','spf 50','sunscreen','supergoop','isntree sun cream'], misspellings:['protector solar spf50'], englishTerms:['sunscreen spf 50','mineral sunscreen'], spanishTerms:['protector solar','bloqueador solar'], ecommerceTerms:['Supergoop Unseen Sunscreen SPF 40','ISNTREE Hyaluronic Acid Sun Cream'], commonSearchPhrases:['protector solar spf 50 precio','supergoop comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'acido_hialuronico', productName:'Ácido Hialurónico / Niacinamide Sérum', categoryId:'beauty_skincare_personal_care', aliases:['ácido hialurónico','hyaluronic acid','niacinamide','the ordinary niacinamide'], misspellings:['acido hialuronico','niacinamida'], englishTerms:['hyaluronic acid serum','niacinamide serum'], spanishTerms:['sérum ácido hialurónico','niacinamida'], ecommerceTerms:['The Ordinary Hyaluronic Acid 2% + B5','The Ordinary Niacinamide 10% + Zinc'], commonSearchPhrases:['ácido hialurónico precio','niacinamide comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'crema_hidratante', productName:'Crema Hidratante / Moisturizer / CeraVe', categoryId:'beauty_skincare_personal_care', aliases:['crema hidratante','moisturizer','cerave moisturizer','neutrogena hydro boost'], misspellings:['crema hidratante cerave'], englishTerms:['moisturizer','face cream','hydrating cream'], spanishTerms:['crema hidratante','humectante facial'], ecommerceTerms:['CeraVe Moisturizing Cream','Neutrogena Hydro Boost Water Gel'], commonSearchPhrases:['crema hidratante precio','cerave comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'mascarilla_facial', productName:'Mascarilla Facial / Sheet Mask', categoryId:'beauty_skincare_personal_care', aliases:['mascarilla facial','sheet mask','face mask','korean face mask'], misspellings:['mascarilla de cara'], englishTerms:['sheet mask','korean skincare mask'], spanishTerms:['mascarilla facial','máscara de hidratación'], ecommerceTerms:['COSRX Snail Mucin Sheet Mask','Innisfree My Real Squeeze Mask'], commonSearchPhrases:['mascarilla facial precio','sheet mask comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'limpiador_facial_skin', productName:'Limpiador Facial / Foam Cleanser', categoryId:'beauty_skincare_personal_care', aliases:['limpiador facial','cleanser','foam cleanser','cerave cleanser'], misspellings:['limpador facial'], englishTerms:['facial cleanser','foaming face wash'], spanishTerms:['limpiador facial','espuma limpiadora'], ecommerceTerms:['CeraVe Foaming Facial Cleanser','La Roche-Posay Toleriane'], commonSearchPhrases:['limpiador facial precio','cleanser comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'plancha_ghd', productName:'Plancha GHD / Dyson / Babyliss', categoryId:'beauty_devices', aliases:['plancha ghd','ghd platinum','dyson straightener','babyliss'], misspellings:['plancha ghd platinum'], englishTerms:['ghd platinum+ straightener','dyson corrale'], spanishTerms:['plancha de pelo ghd','alisador dyson'], ecommerceTerms:['GHD Platinum+ Straightener','Dyson Corrale'], commonSearchPhrases:['plancha ghd precio','dyson corrale comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'rizador', productName:'Rizador / Ondulador / Curling Iron', categoryId:'beauty_devices', aliases:['rizador','curling iron','ondulador','rulos electricos'], misspellings:['rizador de pelo'], englishTerms:['curling iron','hair curler wand'], spanishTerms:['rizador de pelo','ondulador'], ecommerceTerms:['Remington Pro 1" Curling Wand','Beachwaver Pro'], commonSearchPhrases:['rizador precio','curling iron comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'secadora_dyson', productName:'Secadora Dyson Supersonic / Airwrap', categoryId:'beauty_devices', aliases:['secadora dyson','dyson supersonic','dyson airwrap','dyson hair dryer'], misspellings:['dyson supersonik'], englishTerms:['dyson supersonic hair dryer','dyson airwrap'], spanishTerms:['secadora dyson','dyson supersonic'], ecommerceTerms:['Dyson Supersonic Hair Dryer','Dyson Airwrap Multi-Styler'], commonSearchPhrases:['dyson supersonic precio','dyson airwrap comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'depiladora_ipl', productName:'Depiladora IPL / Laser / Epiladora', categoryId:'beauty_devices', aliases:['depiladora ipl','laser hair removal','epiladora braun','silk expert'], misspellings:['depiladora laser'], englishTerms:['ipl hair removal device','laser epilator'], spanishTerms:['depiladora láser','depiladora ipl'], ecommerceTerms:['Braun Silk Expert Pro 5','Ulike Air 3 IPL'], commonSearchPhrases:['depiladora ipl precio','silk expert comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'masajeador_facial', productName:'Masajeador Facial / Gua Sha / Rodillo de Jade', categoryId:'beauty_devices', aliases:['masajeador facial','gua sha','rodillo jade','face roller','nuface'], misspellings:['guasha','rodillo de jade'], englishTerms:['jade roller','gua sha tool','facial roller'], spanishTerms:['rodillo de jade','masajeador facial'], ecommerceTerms:['NuFACE Mini Facial Toning Device','Stacked Skincare Gua Sha'], commonSearchPhrases:['masajeador facial precio','gua sha comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cafetera_nespresso', productName:'Cafetera Nespresso / Vertuo', categoryId:'home_kitchen_appliances', aliases:['nespresso','cafetera nespresso','vertuo','nespresso vertuo','nespresso original'], misspellings:['nespreso','nespresso vertuo next'], englishTerms:['nespresso vertuo','nespresso pod coffee machine'], spanishTerms:['cafetera nespresso','máquina nespresso'], ecommerceTerms:['Nespresso Vertuo Next','Nespresso VertuoPlus'], commonSearchPhrases:['nespresso precio','cafetera nespresso comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cafetera_breville', productName:'Cafetera Breville / De\'Longhi / Espresso', categoryId:'home_kitchen_appliances', aliases:['cafetera breville','de\'longhi','cafetera espresso','máquina espresso manual'], misspellings:['breville cafetera','delonghi'], englishTerms:['breville barista express','de\'longhi dedica'], spanishTerms:['cafetera espresso manual'], ecommerceTerms:['Breville Barista Express','De\'Longhi Dedica Espresso Machine'], commonSearchPhrases:['máquina espresso precio','breville comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'air_fryer_alt', productName:'Air Fryer / Freidora de Aire', categoryId:'home_kitchen_appliances', aliases:['air fryer','freidora de aire','ninja air fryer','cosori air fryer'], misspellings:['airfryer','air frier'], englishTerms:['air fryer','ninja air fryer','cosori air fryer pro'], spanishTerms:['freidora de aire','air fryer'], ecommerceTerms:['Ninja AF101 Air Fryer','COSORI Air Fryer Pro LE'], commonSearchPhrases:['air fryer precio','freidora de aire comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'licuadora_vitamix', productName:'Licuadora Vitamix / Ninja / Blender', categoryId:'home_kitchen_appliances', aliases:['licuadora vitamix','vitamix','ninja blender','nutribullet'], misspellings:['vitamix licuadora'], englishTerms:['vitamix blender','ninja professional blender','nutribullet pro'], spanishTerms:['licuadora vitamix','licuadora de alta potencia'], ecommerceTerms:['Vitamix E310 Explorian','Ninja BL610 Professional'], commonSearchPhrases:['licuadora vitamix precio','ninja blender comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'instant_pot', productName:'Instant Pot / Olla Eléctrica / Rice Cooker', categoryId:'home_kitchen_appliances', aliases:['instant pot','olla presión eléctrica','rice cooker','olla arrocera eléctrica'], misspellings:['instantpot'], englishTerms:['instant pot duo','rice cooker','pressure cooker'], spanishTerms:['olla de presión eléctrica','olla arrocera'], ecommerceTerms:['Instant Pot Duo 7-in-1','Zojirushi NS-ZCC10 Rice Cooker'], commonSearchPhrases:['instant pot precio','olla presión comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'batidora_kitchenaid', productName:'Batidora KitchenAid / Stand Mixer', categoryId:'home_kitchen_appliances', aliases:['kitchenaid','batidora kitchenaid','stand mixer','kitchen aid'], misspellings:['kitchenaid stand mixer','kitchen aid batidora'], englishTerms:['kitchenaid artisan stand mixer','stand mixer 5qt'], spanishTerms:['batidora de pedestal','kitchenaid'], ecommerceTerms:['KitchenAid Artisan Series 5-Qt. Stand Mixer'], commonSearchPhrases:['kitchenaid precio','batidora kitchenaid comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el peso del equipo.', adminHint:'Verificar peso.' },
    { productKey:'freidora_aceite', productName:'Freidora de Aceite / Deep Fryer', categoryId:'home_kitchen_appliances', aliases:['freidora aceite','deep fryer','freidora eléctrica'], misspellings:['freidora de aceite'], englishTerms:['deep fryer','electric fryer'], spanishTerms:['freidora de aceite','freidora eléctrica'], ecommerceTerms:['T-fal FR8000 Oil Filtration Ultimate EZ Clean','Hamilton Beach Deep Fryer'], commonSearchPhrases:['freidora aceite precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cuchillos_chef', productName:'Cuchillos Chef / Set Cuchillos / Wusthof', categoryId:'home_kitchen_appliances', aliases:['cuchillos chef','set cuchillos','wusthof','victorinox','knife set'], misspellings:['wusthof cuchillos'], englishTerms:['wusthof classic chef\'s knife','victorinox fibrox pro'], spanishTerms:['cuchillo de chef','set de cuchillos'], ecommerceTerms:['Wusthof Classic 8-Inch Chef\'s Knife','Victorinox Fibrox Pro 8-Inch'], commonSearchPhrases:['cuchillos chef precio','wusthof comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'aspiradora_dyson', productName:'Aspiradora Dyson / Robot Roomba / Shark', categoryId:'home_kitchen_appliances', aliases:['aspiradora dyson','roomba','robot aspiradora','dyson v15','dyson v11'], misspellings:['aspirdora dyson'], englishTerms:['dyson v15 detect','irobot roomba','shark vacuum'], spanishTerms:['aspiradora dyson','robot aspiradora'], ecommerceTerms:['Dyson V15 Detect','iRobot Roomba i7+','Shark IZ163H'], commonSearchPhrases:['aspiradora dyson precio','roomba comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cafetera_moka', productName:'Cafetera Moka / French Press / Chemex', categoryId:'home_kitchen_appliances', aliases:['cafetera moka','moka pot','french press','chemex','aeropress'], misspellings:['moca pot','french pres'], englishTerms:['moka pot','french press','chemex pour over'], spanishTerms:['cafetera de moca','prensa francesa'], ecommerceTerms:['Bialetti Moka Express','Bodum Brazil French Press'], commonSearchPhrases:['cafetera moka precio','french press comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'organizador_closet', productName:'Organizador Closet / Cubo / Cajones', categoryId:'home_decor_storage', aliases:['organizador closet','cubos organizadores','organizador ropa','drawer organizer'], misspellings:['organizador de closet'], englishTerms:['closet organizer','drawer organizer','storage cubes'], spanishTerms:['organizador de ropa','organizador closet'], ecommerceTerms:['SONGMICS Closet Organizer','SimpleHouseware Stackable Shoe Rack'], commonSearchPhrases:['organizador closet precio','drawer organizer comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'sabanas_lujo', productName:'Sábanas / Juego de Cama / Bamboo', categoryId:'home_decor_storage', aliases:['sábanas','juego de cama','bamboo sheets','sábanas de lujo'], misspellings:['sabanas bambu'], englishTerms:['bamboo bed sheets','luxury bed sheets'], spanishTerms:['sábanas de bambú','juego de cama'], ecommerceTerms:['Ettitude Bamboo Sheets','Brooklinen Luxe Core Sheet Set'], commonSearchPhrases:['sábanas bamboo precio','juego de cama comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'espejo_deco', productName:'Espejo Decorativo / Espejo Baño', categoryId:'home_decor_storage', aliases:['espejo decorativo','espejo de pared','mirror','espejo baño'], misspellings:['espejo decorativo grande'], englishTerms:['decorative mirror','wall mirror','bathroom mirror'], spanishTerms:['espejo de pared','espejo decorativo'], ecommerceTerms:['ANDY STAR Gold Mirror','Uttermost Gita Oval Mirror'], commonSearchPhrases:['espejo decorativo precio','espejo de pared comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'Verificar embalaje/frágil.' },
    { productKey:'cuadro_arte', productName:'Cuadro / Arte / Canvas Wall Art', categoryId:'home_decor_storage', aliases:['cuadro','arte pared','wall art','canvas art','poster enmarcado'], misspellings:['cuadro de pared'], englishTerms:['canvas wall art','framed poster','wall decor'], spanishTerms:['cuadro decorativo','arte de pared'], ecommerceTerms:['Minted Fine Art Print','Society6 Canvas Print'], commonSearchPhrases:['cuadro decorativo precio','wall art comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'purificador_aire', productName:'Purificador de Aire / Dyson / Levoit', categoryId:'home_decor_storage', aliases:['purificador aire','air purifier','dyson fan','levoit air purifier'], misspellings:['purificador de aire'], englishTerms:['air purifier','hepa air purifier'], spanishTerms:['purificador de aire'], ecommerceTerms:['Levoit Core 300 Air Purifier','Dyson HP09 Purifier Hot+Cool'], commonSearchPhrases:['purificador de aire precio','levoit comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'humidificador_deco', productName:'Humidificador / Difusor de Aromas', categoryId:'home_decor_storage', aliases:['humidificador','difusor aromas','aromatherapy diffuser','cool mist humidifier'], misspellings:['humidificador difusor'], englishTerms:['humidifier','cool mist humidifier'], spanishTerms:['humidificador','difusor de aceites'], ecommerceTerms:['LEVOIT Classic 300 Humidifier','URPOWER 500ml Diffuser'], commonSearchPhrases:['humidificador precio','difusor aromas comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'tira_led_rgb', productName:'Tira LED RGB / Smart Light / Govee', categoryId:'home_decor_storage', aliases:['tira led','tira rgb','govee led','led strip','luz rgb'], misspellings:['tiras led rgb'], englishTerms:['led strip lights','rgb led light'], spanishTerms:['tira de luces led','tira rgb'], ecommerceTerms:['Govee RGBIC LED Strip Lights','Philips Hue Gradient Lightstrip'], commonSearchPhrases:['tira led precio','govee led comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'taladro_dewalt', productName:'Taladro DeWalt / Milwaukee / Makita', categoryId:'tools_hardware_common', aliases:['taladro dewalt','dewalt drill','milwaukee drill','makita taladro'], misspellings:['taladro dewalt 20v'], englishTerms:['dewalt drill','milwaukee m18 drill'], spanishTerms:['taladro inalámbrico','taladro dewalt'], ecommerceTerms:['DeWalt DCD771C2 20V Drill','Milwaukee M18 Fuel Drill'], commonSearchPhrases:['taladro dewalt precio','milwaukee drill comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'set_llaves', productName:'Set Llaves / Toolkit / Ratchet', categoryId:'tools_hardware_common', aliases:['set llaves','toolkit','ratchet set','llave inglesa','socket set'], misspellings:['set de llaves'], englishTerms:['socket set','ratchet set','combination wrench set'], spanishTerms:['set de llaves','juego de herramientas'], ecommerceTerms:['Craftsman 230-Piece Mechanics Tool Set','GEARWRENCH 44-Piece Socket Set'], commonSearchPhrases:['set herramientas precio','socket set comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'sierra_caladora', productName:'Sierra Caladora / Circular / Jigsaw', categoryId:'tools_hardware_common', aliases:['sierra caladora','jigsaw','sierra circular','reciprocating saw'], misspellings:['sierra caladora dewalt'], englishTerms:['jigsaw','circular saw','dewalt jigsaw'], spanishTerms:['sierra caladora','sierra circular'], ecommerceTerms:['DeWalt DCS331B Jigsaw','Makita 5007MGA Circular Saw'], commonSearchPhrases:['sierra caladora precio','jigsaw comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'pintura_spray', productName:'Pintura en Spray / Aerosol / Rustoleum', categoryId:'chemicals_aerosols_adhesives', aliases:['pintura spray','spray paint','rustoleum','aerosol pintura'], misspellings:['spray paint rustoleum'], englishTerms:['spray paint','aerosol paint'], spanishTerms:['pintura en aerosol','spray pintura'], ecommerceTerms:['Rust-Oleum 327908 Spray Paint','Krylon K05160202'], commonSearchPhrases:['pintura spray precio'], riskOverrideFlags:['aerosol','flammable','chemical'], customerHint:'Este producto es aerosol y puede requerir revisión adicional para transporte.', adminHint:'Revisar normativa de aerosoles y transporte.' },
    { productKey:'resina_epoxi', productName:'Resina Epóxica / UV Resin / Adhesivo', categoryId:'chemicals_aerosols_adhesives', aliases:['resina epóxica','uv resin','epoxy resin','pegamento fuerte','loctite'], misspellings:['resina epoxica'], englishTerms:['epoxy resin','uv resin','two-part epoxy'], spanishTerms:['resina epóxica','pegamento epóxico'], ecommerceTerms:['ArtResin Epoxy Resin','Alumilite Amazing Clear Cast'], commonSearchPhrases:['resina epóxica precio','uv resin comprar'], riskOverrideFlags:['chemical','resin'], customerHint:'Este tipo de producto puede requerir revisión adicional por su composición química.', adminHint:'Revisar composición y restricciones de transporte.' },
    { productKey:'dashcam', productName:'Dashcam / Cámara Delantera / Blackvue', categoryId:'automotive_simple_accessories', aliases:['dashcam','cámara dash','blackvue','nextbase','cámara frontal carro'], misspellings:['dash cam'], englishTerms:['dash cam','dashcam front rear'], spanishTerms:['cámara para carro','dashcam'], ecommerceTerms:['BlackVue DR970X-2CH','Nextbase 622GW'], commonSearchPhrases:['dashcam precio','cámara carro comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'gps_vehicular', productName:'GPS Vehicular / Garmin / TomTom', categoryId:'automotive_simple_accessories', aliases:['gps carro','garmin gps','tomtom','navegador vehicular'], misspellings:['gps carros'], englishTerms:['garmin drive smart','gps navigation system'], spanishTerms:['gps vehicular','navegador gps'], ecommerceTerms:['Garmin DriveSmart 66','Garmin Drive 52'], commonSearchPhrases:['gps vehicular precio','garmin gps comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'obd2_bluetooth', productName:'OBD2 Scanner / Bluetooth Diagnóstico', categoryId:'automotive_simple_accessories', aliases:['obd2','obd2 scanner','bluetooth obd','diagnóstico carro'], misspellings:['obd 2 scanner'], englishTerms:['obd2 scanner','bluetooth obd2'], spanishTerms:['escáner obd2','diagnóstico de carro'], ecommerceTerms:['BlueDriver Bluetooth Pro OBDII Scan Tool','FIXD Sensor'], commonSearchPhrases:['obd2 precio','scanner diagnóstico carro comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'tapetes_3d_auto', productName:'Tapetes 3D / WeatherTech / Alfombras Auto', categoryId:'automotive_simple_accessories', aliases:['tapetes 3d','weathertech','alfombras carro 3d','floor mats'], misspellings:['tapetes 3d carro'], englishTerms:['weathertech floor mats','3d car mats'], spanishTerms:['tapetes para carro','alfombras 3d'], ecommerceTerms:['WeatherTech FloorLiner','Husky Liners X-Act Contour'], commonSearchPhrases:['tapetes 3d carro precio','weathertech comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'jump_starter_alt', productName:'Jump Starter / Arrancador Portátil', categoryId:'automotive_simple_accessories', aliases:['jump starter','arrancador portátil','jump start','batería arranque portátil'], misspellings:['jump stater'], englishTerms:['jump starter','portable car battery jumper'], spanishTerms:['arrancador portátil','auxiliar de arranque'], ecommerceTerms:['NOCO Boost Plus GB40','Clore Automotive Jump-N-Carry'], commonSearchPhrases:['jump starter precio','arrancador portátil comprar'], riskOverrideFlags:['contains_lithium_battery'], customerHint:'Contiene batería de litio — puede requerir revisión de transporte.', adminHint:'Revisar capacidad Wh y normativa de transporte.' },
    { productKey:'detailing_kit', productName:'Kit Detailing / Pulidora / Car Wash', categoryId:'automotive_simple_accessories', aliases:['kit detailing','car polish','pulidora auto','car detailing','chemical guys'], misspellings:['kit de detailing'], englishTerms:['car detailing kit','car polish','clay bar kit'], spanishTerms:['kit de detailing','pulidora de autos'], ecommerceTerms:['Chemical Guys HOL_ECS_400 Kit','Mothers CMX Ceramic Spray Coating'], commonSearchPhrases:['detailing kit precio','chemical guys comprar'], riskOverrideFlags:['chemical'], customerHint:'', adminHint:'' },
    { productKey:'luz_led_auto', productName:'Luces LED / HID / Faros Auto', categoryId:'automotive_parts_review', aliases:['luces led carro','hid kit','faros led','headlight bulbs'], misspellings:['luces led auto'], englishTerms:['led headlights','hid conversion kit'], spanishTerms:['luces led para carro','faros led'], ecommerceTerms:['Opt7 H11 LED Headlight Bulbs','Kensun HID Conversion Kit'], commonSearchPhrases:['luces led auto precio','faros led comprar'], riskOverrideFlags:['automotive_part_review'], customerHint:'Requiere revisión por clasificación arancelaria.', adminHint:'Validar clasificación.' },
    { productKey:'frenos_pastillas', productName:'Pastillas de Freno / Discos', categoryId:'automotive_parts_review', aliases:['pastillas freno','discos freno','brake pads','rotors'], misspellings:['pastillas de frenos'], englishTerms:['brake pads','brake rotors'], spanishTerms:['pastillas de freno','discos de freno'], ecommerceTerms:['Brembo P85101N Brake Pads','EBC Brakes UD838'], commonSearchPhrases:['pastillas freno precio','brake pads comprar'], riskOverrideFlags:['automotive_part_review'], customerHint:'Requiere revisión.', adminHint:'Validar clasificación arancelaria.' },
    { productKey:'pesas_ajustables', productName:'Pesas Ajustables / Bowflex SelectTech', categoryId:'sports_fitness_physical', aliases:['pesas ajustables','bowflex selecttech','mancuernas ajustables','adjustable dumbbells'], misspellings:['pesas ajustables bowflex'], englishTerms:['adjustable dumbbells','bowflex selecttech 552'], spanishTerms:['pesas ajustables','mancuernas ajustables'], ecommerceTerms:['Bowflex SelectTech 552','NordicTrack Select-A-Weight'], commonSearchPhrases:['pesas ajustables precio','bowflex comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el peso del equipo.', adminHint:'Verificar peso.' },
    { productKey:'bicicleta_estatica', productName:'Bicicleta Estática / Peloton / Spinning', categoryId:'sports_fitness_physical', aliases:['bicicleta estática','peloton','spinning bike','indoor cycle'], misspellings:['bicicleta estatica'], englishTerms:['stationary bike','peloton bike','indoor cycling'], spanishTerms:['bicicleta estática','bicicleta spinning'], ecommerceTerms:['Peloton Bike','Sunny Health & Fitness Bike','NordicTrack S22i'], commonSearchPhrases:['bicicleta estática precio','peloton comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño y peso del equipo.', adminHint:'Verificar dimensiones y peso.' },
    { productKey:'cinta_correr', productName:'Cinta para Correr / Treadmill', categoryId:'sports_fitness_physical', aliases:['cinta correr','treadmill','caminadora eléctrica','trotadora'], misspellings:['cinta de caminar'], englishTerms:['treadmill','folding treadmill'], spanishTerms:['caminadora','cinta de correr'], ecommerceTerms:['NordicTrack Commercial 1750','Horizon Fitness T101'], commonSearchPhrases:['cinta correr precio','treadmill comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño y peso.', adminHint:'Verificar dimensiones y peso.' },
    { productKey:'bandas_resistencia', productName:'Bandas de Resistencia / Loops / Fitness Bands', categoryId:'sports_fitness_physical', aliases:['bandas resistencia','resistance bands','bandas elásticas','fitness loops'], misspellings:['bandas de resistencia'], englishTerms:['resistance bands','loop bands'], spanishTerms:['bandas de resistencia','bandas elásticas'], ecommerceTerms:['Fit Simplify Resistance Loop Exercise Bands','Whatafit Resistance Bands Set'], commonSearchPhrases:['bandas resistencia precio','resistance bands comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'rodillo_espuma', productName:'Rodillo Foam / Foam Roller / Recovery', categoryId:'sports_fitness_physical', aliases:['foam roller','rodillo espuma','rodillo masaje','recovery roller'], misspellings:['foam roller deportivo'], englishTerms:['foam roller','muscle recovery roller'], spanishTerms:['rodillo de espuma','rodillo de masaje'], ecommerceTerms:['TriggerPoint GRID Foam Roller','Amazon Basics High-Density Foam Roller'], commonSearchPhrases:['foam roller precio','rodillo espuma comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'guantes_box', productName:'Guantes de Box / MMA / Wraps', categoryId:'sports_fitness_physical', aliases:['guantes box','boxing gloves','guantes mma','hand wraps'], misspellings:['guantes de boxeo'], englishTerms:['boxing gloves','mma gloves'], spanishTerms:['guantes de boxeo','guantes mma'], ecommerceTerms:['Everlast Pro Style Boxing Gloves','Hayabusa T3 Boxing Gloves'], commonSearchPhrases:['guantes boxeo precio','boxing gloves comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'garmin_running', productName:'Garmin Forerunner / Fenix / GPS Running', categoryId:'sports_fitness_physical', aliases:['garmin forerunner','garmin fenix','garmin gps reloj','running watch'], misspellings:['garmin fenix 7'], englishTerms:['garmin forerunner 965','garmin fenix 7'], spanishTerms:['reloj garmin deportivo','garmin running'], ecommerceTerms:['Garmin Forerunner 965','Garmin Fénix 7S'], commonSearchPhrases:['garmin precio','garmin forerunner comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'ropa_running', productName:'Ropa Running / Deportiva Nike Dri-FIT', categoryId:'sports_fitness_physical', aliases:['ropa running','nike dri-fit','camiseta técnica','running gear'], misspellings:['ropa de running'], englishTerms:['running gear','dri-fit shirt','athletic wear'], spanishTerms:['ropa deportiva de running','camiseta técnica'], ecommerceTerms:['Nike Dri-FIT Run Division Miler','Adidas Adizero Running Shirt'], commonSearchPhrases:['ropa running precio','nike dri-fit comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'carpa_camping', productName:'Carpa / Tienda de Campaña / REI', categoryId:'sports_outdoor_variable', aliases:['carpa camping','tienda campaña','camping tent','backpacking tent'], misspellings:['carpa de camping'], englishTerms:['camping tent','2-person backpacking tent'], spanishTerms:['carpa de camping','tienda de campaña'], ecommerceTerms:['REI Co-op Passage 2 Tent','MSR Hubba Hubba NX 2-Person Tent'], commonSearchPhrases:['carpa camping precio','tienda campaña comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño.', adminHint:'Verificar dimensiones.' },
    { productKey:'bicicleta_mtb', productName:'Bicicleta MTB / Ruta / Urbana', categoryId:'sports_outdoor_variable', aliases:['bicicleta mtb','mountain bike','bicicleta de ruta','bicicleta urbana'], misspellings:['bici mtb'], englishTerms:['mountain bike','road bicycle','commuter bike'], spanishTerms:['bicicleta de montaña','bici mtb'], ecommerceTerms:['Trek Marlin 5 Mountain Bike','Specialized Sirrus X 2.0'], commonSearchPhrases:['bicicleta mtb precio','mountain bike comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño y peso.', adminHint:'Verificar dimensiones.' },
    { productKey:'casco_ciclismo', productName:'Casco Ciclismo / MTB / Helmet', categoryId:'sports_outdoor_variable', aliases:['casco ciclismo','bike helmet','casco mtb','giro helmet'], misspellings:['casco de bicicleta'], englishTerms:['cycling helmet','mtb helmet'], spanishTerms:['casco de ciclismo','casco bicicleta'], ecommerceTerms:['Giro Register MIPS Bike Helmet','Bell Stratus MIPS Road Helmet'], commonSearchPhrases:['casco ciclismo precio','bike helmet comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'saco_dormir', productName:'Saco de Dormir / 0°C / Marmot', categoryId:'sports_outdoor_variable', aliases:['saco dormir','sleeping bag','sleeping bag -10','marmot sleeping bag'], misspellings:['saco de dormir camping'], englishTerms:['sleeping bag','marmot sleeping bag 0°c'], spanishTerms:['saco de dormir','bolsa de dormir'], ecommerceTerms:['Marmot Trestles Elite Eco 15','NEMO Disco 15 Sleeping Bag'], commonSearchPhrases:['saco dormir precio','sleeping bag comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'smartwatch_polar', productName:'Smartwatch Polar / Suunto / Coros', categoryId:'sports_outdoor_variable', aliases:['polar watch','suunto','coros','smartwatch deportivo polar'], misspellings:['polar smartwatch'], englishTerms:['polar vantage v3','suunto 9 peak','coros pace 3'], spanishTerms:['reloj deportivo polar','smartwatch deportivo'], ecommerceTerms:['Polar Vantage V3','Suunto 9 Peak Pro','COROS PACE 3'], commonSearchPhrases:['polar smartwatch precio','suunto comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'lego_city', productName:'LEGO City / Creator / Classic', categoryId:'toys_common', aliases:['lego city','lego creator','lego classic','lego set'], misspellings:['legos city','lego citi'], englishTerms:['lego city set','lego creator 3-in-1'], spanishTerms:['lego','set de lego'], ecommerceTerms:['LEGO City Police Station','LEGO Creator 3-in-1'], commonSearchPhrases:['lego precio','lego city comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'lego_technic', productName:'LEGO Technic / Star Wars / Harry Potter', categoryId:'toys_common', aliases:['lego technic','lego star wars','lego harry potter','lego adultos'], misspellings:['lego technic ferrari'], englishTerms:['lego technic bugatti','lego star wars millennium falcon'], spanishTerms:['lego technic','lego star wars'], ecommerceTerms:['LEGO Technic Bugatti Bolide','LEGO Star Wars Millennium Falcon'], commonSearchPhrases:['lego technic precio','lego star wars comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'hot_wheels', productName:'Hot Wheels / Matchbox / Colección Carros', categoryId:'toys_common', aliases:['hot wheels','hotwheels','matchbox','carritos coleccionables'], misspellings:['hot wels'], englishTerms:['hot wheels','matchbox car'], spanishTerms:['hot wheels','carritos coleccionables'], ecommerceTerms:['Hot Wheels 20-Car Gift Pack','Hot Wheels Premium Car Culture'], commonSearchPhrases:['hot wheels precio','hot wheels colección comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'barbie', productName:'Barbie / Muñeca / Fashionista', categoryId:'toys_common', aliases:['barbie','muñeca barbie','barbie fashionista','barbie set'], misspellings:['barbi'], englishTerms:['barbie doll','barbie fashionista'], spanishTerms:['muñeca barbie','barbie'], ecommerceTerms:['Barbie Fashionista Doll','Barbie Dream House'], commonSearchPhrases:['barbie precio','muñeca barbie comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'nerf_gun', productName:'Pistola Nerf / Blaster / Elite', categoryId:'toys_common', aliases:['nerf','pistola nerf','nerf elite','nerf blaster','nerf rival'], misspellings:['nerf gun elite'], englishTerms:['nerf elite 2.0','nerf rival'], spanishTerms:['pistola nerf','nerf'], ecommerceTerms:['Nerf Elite 2.0 Commander RD-6','Nerf Rival Prometheus MXVIII-20K'], commonSearchPhrases:['nerf precio','nerf elite comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'rc_carro', productName:'Carro RC / Control Remoto / Traxxas', categoryId:'toys_common', aliases:['carro rc','carro control remoto','traxxas','rc car','remote control car'], misspellings:['carro de control remoto'], englishTerms:['rc car','traxxas slash','remote control car'], spanishTerms:['carro de control remoto','carro rc'], ecommerceTerms:['Traxxas Slash 2WD','Redcat Racing Everest-10'], commonSearchPhrases:['carro rc precio','control remoto carro comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'juego_mesa_adulto', productName:'Juego de Mesa / Catan / Monopoly', categoryId:'toys_common', aliases:['juego de mesa','catan','monopoly','carcassonne','ticket to ride'], misspellings:['juego de meza'], englishTerms:['board game','catan','ticket to ride'], spanishTerms:['juego de mesa','catan'], ecommerceTerms:['Catan The Board Game','Ticket to Ride Board Game','Wingspan'], commonSearchPhrases:['juego de mesa precio','catan comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'dji_mini_3', productName:'DJI Mini 3 Pro / Mini 4 Pro', categoryId:'drones_rc_review', aliases:['dji mini 3','dji mini 4','dji mini pro','dji drone mini'], misspellings:['dji mini3 pro'], englishTerms:['dji mini 4 pro','dji mini 3 pro'], spanishTerms:['dron dji mini','dji mini pro'], ecommerceTerms:['DJI Mini 4 Pro','DJI Mini 3 Pro'], commonSearchPhrases:['dji mini 4 pro precio','dji mini comprar'], riskOverrideFlags:['drone_review','battery_possible'], customerHint:'Los drones requieren revisión especial — incluye batería de litio y puede necesitar registro.', adminHint:'Revisar DGAC/CETAC y restricciones de drones.' },
    { productKey:'dji_air', productName:'DJI Air 3 / DJI Mavic 3 Classic', categoryId:'drones_rc_review', aliases:['dji air 3','dji mavic 3','dji air drone','dji air 2s'], misspellings:['dji air3'], englishTerms:['dji air 3','dji mavic 3 classic'], spanishTerms:['dron dji air','dji mavic'], ecommerceTerms:['DJI Air 3','DJI Mavic 3 Classic'], commonSearchPhrases:['dji air 3 precio','dji mavic 3 comprar'], riskOverrideFlags:['drone_review','battery_possible'], customerHint:'Los drones requieren revisión especial — incluye batería de litio.', adminHint:'Revisar DGAC/CETAC y restricciones.' },
    { productKey:'dji_fpv', productName:'DJI FPV / Drone Racing', categoryId:'drones_rc_review', aliases:['dji fpv','fpv drone','drone racing','freestyle drone'], misspellings:['drone fpv'], englishTerms:['dji fpv combo','fpv racing drone'], spanishTerms:['dron fpv','dron carreras'], ecommerceTerms:['DJI FPV Combo','Geprc Cinelog25 FPV'], commonSearchPhrases:['dji fpv precio','fpv drone comprar'], riskOverrideFlags:['drone_review','battery_possible'], customerHint:'Los drones requieren revisión especial.', adminHint:'Revisar normativa DGAC y restricciones aduanales.' },
    { productKey:'coche_bebe_alt', productName:'Coche Bebé / Carrito / Stroller', categoryId:'baby_items', aliases:['coche bebé','carrito bebé','stroller','uppababy vista','bugaboo'], misspellings:['coche de bebe'], englishTerms:['baby stroller','pram','uppababy vista'], spanishTerms:['coche de bebé','carriola'], ecommerceTerms:['UPPAbaby Vista V2','Bugaboo Butterfly','Baby Trend Expedition'], commonSearchPhrases:['coche bebé precio','stroller comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño.', adminHint:'Verificar dimensiones y peso.' },
    { productKey:'andador_bebe', productName:'Andador Bebé / Baby Walker', categoryId:'baby_items', aliases:['andador bebé','baby walker','caminador bebé'], misspellings:['andador de bebe'], englishTerms:['baby walker','activity walker'], spanishTerms:['andador de bebé','caminador'], ecommerceTerms:['Baby Trend Walker','VTech Sit-to-Stand Learning Walker'], commonSearchPhrases:['andador bebé precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'juguete_sensorial', productName:'Juguete Sensorial / Developmental Toy', categoryId:'baby_items', aliases:['juguete sensorial','montessori toy','developmental toy','juguete bebé educativo'], misspellings:['juguetes sensoriales'], englishTerms:['sensory toys','montessori baby toys'], spanishTerms:['juguete sensorial','juguetes montessori'], ecommerceTerms:['Lovevery Play Kit','Manhattan Toy Winkel Rattle'], commonSearchPhrases:['juguete sensorial precio','montessori toy comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'mordedor_bebe', productName:'Mordedor / Chupón / Tetina Bebé', categoryId:'baby_items', aliases:['mordedor','chupón','tetina bebé','pacifier','teether'], misspellings:['chupon bebe'], englishTerms:['baby pacifier','teething toy'], spanishTerms:['chupón','mordedor de bebé'], ecommerceTerms:['Philips Avent Soother','Sophie La Girafe Teether'], commonSearchPhrases:['chupón precio','mordedor bebé comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'silla_alta', productName:'Silla Alta / Trona / High Chair', categoryId:'baby_items', aliases:['silla alta bebé','trona bebé','high chair','silla para comer bebé'], misspellings:['silla alta de bebe'], englishTerms:['high chair','convertible high chair'], spanishTerms:['silla alta para bebé','trona'], ecommerceTerms:['Graco Blossom 6-in-1 Convertible High Chair','IKEA ANTILOP High Chair'], commonSearchPhrases:['silla alta bebé precio','high chair comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cama_mascota_alt', productName:'Cama Mascota / Ortopédica / Dog Bed', categoryId:'pet_accessories', aliases:['cama mascota','cama perro','dog bed','pet bed ortopédica'], misspellings:['cama de mascota'], englishTerms:['dog bed','orthopedic dog bed'], spanishTerms:['cama para perro','cama mascota'], ecommerceTerms:['Big Barker Pillow Top Orthopedic Dog Bed','Casper Dog Bed'], commonSearchPhrases:['cama perro precio','dog bed comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'arnés_perro', productName:'Arnés / Collar / Correa Mascota', categoryId:'pet_accessories', aliases:['arnés perro','collar perro','correa','harness dog','leash dog'], misspellings:['arnes de perro'], englishTerms:['dog harness','dog leash','collar dog'], spanishTerms:['arnés para perro','collar y correa'], ecommerceTerms:['Ruffwear Front Range Harness','PetSafe Easy Walk Harness'], commonSearchPhrases:['arnés perro precio','dog harness comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'transportadora_mascota', productName:'Transportadora Mascota / Carrier / Kennel', categoryId:'pet_accessories', aliases:['transportadora mascota','carrier gato','kennel','travel carrier pet'], misspellings:['transportadora de mascota'], englishTerms:['pet carrier','dog crate','cat carrier'], spanishTerms:['transportadora para mascotas','kennel'], ecommerceTerms:['Petmate Two Door Training Retreat Kennel','Sherpa Travel Original Deluxe Carrier'], commonSearchPhrases:['transportadora mascota precio','pet carrier comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'libro_tapa_dura', productName:'Libro Tapa Dura / Bestseller', categoryId:'books_printed_material', aliases:['libro','libros','book','hardcover book','bestseller'], misspellings:['libros tapa dura'], englishTerms:['hardcover book','bestseller book'], spanishTerms:['libro de tapa dura','libro'], ecommerceTerms:['Atomic Habits Hardcover','The Psychology of Money'], commonSearchPhrases:['libro precio','bestseller comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'manga_comic_alt', productName:'Manga / Cómic / Novela Gráfica', categoryId:'books_printed_material', aliases:['manga','comic','novela gráfica','graphic novel','anime manga'], misspellings:['manga libro'], englishTerms:['manga','graphic novel','comic book'], spanishTerms:['manga','cómic'], ecommerceTerms:['One Piece Vol. 1','Naruto Manga Box Set','Watchmen Graphic Novel'], commonSearchPhrases:['manga precio','cómic comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'silla_ergonomica', productName:'Silla Ergonómica / Herman Miller / Steelcase', categoryId:'office_stationery_art', aliases:['silla ergonómica','herman miller','steelcase','silla de oficina'], misspellings:['silla ergonomica'], englishTerms:['ergonomic chair','herman miller aeron','steelcase leap'], spanishTerms:['silla ergonómica','silla de trabajo'], ecommerceTerms:['Herman Miller Aeron','Steelcase Leap V2','Branch Ergonomic Chair'], commonSearchPhrases:['silla ergonómica precio','herman miller comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el peso.', adminHint:'Verificar peso y dimensiones.' },
    { productKey:'agenda_planner', productName:'Agenda / Planner / Bullet Journal', categoryId:'office_stationery_art', aliases:['agenda','planner','bullet journal','cuaderno agenda'], misspellings:['aganda','planer'], englishTerms:['planner','bullet journal','daily planner'], spanishTerms:['agenda','planificador'], ecommerceTerms:['Leuchtturm1917 Bullet Journal','Passion Planner Weekly','Moleskine Planner'], commonSearchPhrases:['agenda precio','planner comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'lapices_art', productName:'Lápices de Colores / Prismacolor / Posca', categoryId:'office_stationery_art', aliases:['lápices colores','prismacolor','posca markers','crayones profesionales'], misspellings:['lapices de colores prismacolor'], englishTerms:['prismacolor premier colored pencils','posca paint markers'], spanishTerms:['lápices de colores','marcadores posca'], ecommerceTerms:['Prismacolor Premier 150-Piece Set','Posca PC-5M Medium Tip Markers'], commonSearchPhrases:['prismacolor precio','posca markers comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'whey_optimum', productName:'Proteína Whey Optimum Nutrition / Gold Standard', categoryId:'supplements_vitamins_nutrition', aliases:['whey protein','gold standard whey','optimum nutrition','proteína gold standard'], misspellings:['gold standard whey protein'], englishTerms:['optimum nutrition gold standard whey','whey protein powder'], spanishTerms:['proteína de suero','proteína whey'], ecommerceTerms:['Optimum Nutrition Gold Standard 100% Whey 5lbs','ON Gold Standard Whey'], commonSearchPhrases:['whey protein precio','gold standard comprar'], riskOverrideFlags:['supplement','sanitary_review'], customerHint:'Este tipo de suplemento puede requerir validación sanitaria antes de importarse.', adminHint:'Revisar CCSS/MINSA para suplementos importados.' },
    { productKey:'creatina_mono', productName:'Creatina Monohidratada / Micronizada', categoryId:'supplements_vitamins_nutrition', aliases:['creatina','creatine monohydrate','creatina micronizada','creatine powder'], misspellings:['creatina monohidratada'], englishTerms:['creatine monohydrate','micronized creatine'], spanishTerms:['creatina','creatina monohidratada'], ecommerceTerms:['Optimum Nutrition Micronized Creatine','Thorne Creatine'], commonSearchPhrases:['creatina precio','creatine comprar'], riskOverrideFlags:['supplement','sanitary_review'], customerHint:'Este suplemento puede requerir validación sanitaria.', adminHint:'Revisar CCSS/MINSA.' },
    { productKey:'colageno_polvo', productName:'Colágeno en Polvo / Vital Proteins', categoryId:'supplements_vitamins_nutrition', aliases:['colágeno en polvo','vital proteins','collagen peptides','colágeno hidrolizado'], misspellings:['colageno en polvo'], englishTerms:['collagen peptides','vital proteins collagen'], spanishTerms:['colágeno hidrolizado','péptidos de colágeno'], ecommerceTerms:['Vital Proteins Collagen Peptides 20oz','Great Lakes Grass-Fed Collagen'], commonSearchPhrases:['colágeno precio','vital proteins comprar'], riskOverrideFlags:['supplement','sanitary_review'], customerHint:'Los suplementos pueden requerir validación sanitaria.', adminHint:'Revisar CCSS/MINSA.' },
    { productKey:'vitamina_d3_k2', productName:'Vitamina D3 + K2 / Multivitamínico', categoryId:'supplements_vitamins_nutrition', aliases:['vitamina d3','vitamina k2','d3 k2','multivitamínico'], misspellings:['vitamina d3 k2'], englishTerms:['vitamin d3 k2','multivitamin'], spanishTerms:['vitamina d3','multivitamínico'], ecommerceTerms:['NatureWise Vitamin D3 5000IU','Garden of Life Vitamin D3+K2'], commonSearchPhrases:['vitamina d3 precio','multivitamínico comprar'], riskOverrideFlags:['supplement','sanitary_review'], customerHint:'Los suplementos pueden requerir validación sanitaria.', adminHint:'Revisar CCSS/MINSA.' },
    { productKey:'magnesio_glicin', productName:'Magnesio Glicinato / Taurato / Sleep', categoryId:'supplements_vitamins_nutrition', aliases:['magnesio glicinato','magnesium glycinate','magnesio para dormir'], misspellings:['magnesio glicinato'], englishTerms:['magnesium glycinate','magnesium taurate'], spanishTerms:['magnesio glicinato'], ecommerceTerms:['Pure Encapsulations Magnesium Glycinate','Thorne Magnesium Bisglycinate'], commonSearchPhrases:['magnesio glicinato precio'], riskOverrideFlags:['supplement','sanitary_review'], customerHint:'Los suplementos pueden requerir validación sanitaria.', adminHint:'Revisar CCSS/MINSA.' },
    { productKey:'monitor_glucosa', productName:'Monitor de Glucosa / Glucómetro CGM', categoryId:'medicines_medical_products', aliases:['glucómetro','monitor glucosa','glucometer','libre dexcom cgm'], misspellings:['glucometro'], englishTerms:['glucose monitor','continuous glucose monitor'], spanishTerms:['glucómetro','monitor de azúcar en sangre'], ecommerceTerms:['Dexcom G6 CGM','Abbott FreeStyle Libre 3'], commonSearchPhrases:['glucómetro precio','monitor de glucosa comprar'], riskOverrideFlags:['medical','sanitary_review'], customerHint:'Los dispositivos médicos pueden requerir revisión sanitaria.', adminHint:'Revisar si requiere registro sanitario ante CCSS/MINSA.' },
    { productKey:'tens_masajeador', productName:'TENS / Estimulador Muscular / Compex', categoryId:'medicines_medical_products', aliases:['tens','estimulador muscular','compex','ems device','muscle stimulator'], misspellings:['tens muscular'], englishTerms:['tens unit','muscle stimulator','compex sport elite'], spanishTerms:['estimulador muscular tens','compex'], ecommerceTerms:['Compex Sport Elite Muscle Stimulator','iReliev TENS Unit'], commonSearchPhrases:['tens precio','estimulador muscular comprar'], riskOverrideFlags:['medical'], customerHint:'Los dispositivos médicos pueden requerir revisión.', adminHint:'Verificar si requiere registro sanitario.' },
    { productKey:'medias_compresion_alt', productName:'Medias de Compresión / Travel Socks', categoryId:'medicines_medical_products', aliases:['medias compresión','compression socks','medias de viaje','travel compression'], misspellings:['medias de compresion'], englishTerms:['compression socks','compression stockings'], spanishTerms:['medias de compresión','calcetines de compresión'], ecommerceTerms:['CEP Compression Calf Sleeves','Sockwell Elevation Graduated Compression'], commonSearchPhrases:['medias compresión precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cafe_gourmet', productName:'Café de Especialidad / Gourmet / Single Origin', categoryId:'food_beverages_review', aliases:['café gourmet','café de especialidad','single origin coffee','kopi luwak'], misspellings:['cafe gourmet'], englishTerms:['specialty coffee','single origin','gourmet coffee beans'], spanishTerms:['café de especialidad','café gourmet'], ecommerceTerms:['Blue Bottle Coffee Subscription','Onyx Coffee Lab Washed Ethiopia'], commonSearchPhrases:['café gourmet precio','café especialidad comprar'], riskOverrideFlags:['food','sanitary_review'], customerHint:'Los alimentos importados pueden requerir revisión sanitaria.', adminHint:'Validar SENASA/MINSA para alimentos.' },
    { productKey:'proteina_vegana', productName:'Proteína Vegana / Plant-Based / Pea Protein', categoryId:'food_beverages_review', aliases:['proteína vegana','plant protein','pea protein','proteína de chícharo'], misspellings:['proteina vegana'], englishTerms:['plant-based protein','pea protein powder'], spanishTerms:['proteína vegana','proteína de guisante'], ecommerceTerms:['Garden of Life Sport Organic Plant-Based Protein','Orgain Organic Plant Protein'], commonSearchPhrases:['proteína vegana precio','plant protein comprar'], riskOverrideFlags:['food','sanitary_review'], customerHint:'Los alimentos importados pueden requerir revisión sanitaria.', adminHint:'Validar SENASA/MINSA.' },
    { productKey:'matcha', productName:'Matcha Ceremonial / Té Verde / Japón', categoryId:'food_beverages_review', aliases:['matcha','té matcha','matcha en polvo','ceremonial grade matcha'], misspellings:['matxa'], englishTerms:['ceremonial grade matcha','japanese green tea powder'], spanishTerms:['matcha','té verde en polvo'], ecommerceTerms:['Ippodo Matcha Kiri no Oto','Encha Organic Matcha'], commonSearchPhrases:['matcha precio','matcha ceremonial comprar'], riskOverrideFlags:['food','sanitary_review'], customerHint:'Los alimentos importados pueden requerir revisión sanitaria.', adminHint:'Validar SENASA/MINSA.' },
    { productKey:'hot_sauce', productName:'Salsa Picante / Hot Sauce / Tabasco', categoryId:'food_beverages_review', aliases:['salsa picante','hot sauce','tabasco','cholula','valentina salsa'], misspellings:['salsa picante importada'], englishTerms:['hot sauce','tabasco sauce','cholula'], spanishTerms:['salsa picante','salsa hot'], ecommerceTerms:['Tabasco Original Sauce','Cholula Original Hot Sauce'], commonSearchPhrases:['salsa picante precio','hot sauce comprar'], riskOverrideFlags:['food','sanitary_review'], customerHint:'Los alimentos importados pueden requerir revisión sanitaria.', adminHint:'Validar SENASA/MINSA.' },
    { productKey:'vino_importado', productName:'Vino / Whisky / Licor Importado', categoryId:'alcohol_tobacco_vape_review', aliases:['vino importado','whisky','licor','alcohol importado'], misspellings:['vino importado bottle'], englishTerms:['wine','whiskey','spirits'], spanishTerms:['vino','whisky','licor'], ecommerceTerms:['Johnnie Walker Black Label','Château Margaux Wine'], commonSearchPhrases:['whisky precio','vino importado comprar'], riskOverrideFlags:['alcohol','restricted_possible'], customerHint:'El alcohol importado requiere revisión y puede tener restricciones.', adminHint:'Validar política CRBOX y Hacienda para alcohol.' },
    { productKey:'vape_pods', productName:'Vape / Pod / E-liquid / Elf Bar', categoryId:'alcohol_tobacco_vape_review', aliases:['vape pods','elf bar','pod vape','e-liquid','disposable vape'], misspellings:['vape bar'], englishTerms:['vape pod','elf bar','disposable vape','e-liquid'], spanishTerms:['vape desechable','pod de vape'], ecommerceTerms:['Elf Bar BC5000','Lost Mary BM5000'], commonSearchPhrases:['elf bar precio','vape pod comprar'], riskOverrideFlags:['nicotine','restricted_possible'], customerHint:'Este producto puede estar restringido — requiere revisión.', adminHint:'Validar política CRBOX para nicotina y vapes.' },
    { productKey:'semillas_hortalizas', productName:'Semillas de Hortalizas / Flores / Jardín', categoryId:'plants_seeds_agro_review', aliases:['semillas hortalizas','vegetable seeds','flower seeds','semillas de jardín'], misspellings:['semillas de plantas'], englishTerms:['vegetable seeds','heirloom seeds','flower seeds'], spanishTerms:['semillas de hortalizas','semillas de flores'], ecommerceTerms:['Burpee Heirloom Tomato Seeds','American Meadows Wildflower Seeds'], commonSearchPhrases:['semillas hortalizas precio'], riskOverrideFlags:['agro','phytosanitary_review'], customerHint:'Las semillas requieren revisión fitosanitaria para importarse a Costa Rica.', adminHint:'Validar SFE/SENASA para fitosanitario.' },
    { productKey:'radio_amateur', productName:'Radio Amateur / HAM / Baofeng', categoryId:'regulated_telecom', aliases:['radio amateur','ham radio','baofeng','walkie talkie pro','hf radio'], misspellings:['radio hamm'], englishTerms:['ham radio','baofeng uv-5r','amateur radio transceiver'], spanishTerms:['radio amateur','baofeng'], ecommerceTerms:['Baofeng UV-5R Ham Radio','Yaesu FT-60R Dual Band'], commonSearchPhrases:['baofeng precio','radio ham comprar'], riskOverrideFlags:['telecom_review','regulated_product'], customerHint:'Los equipos de radio pueden requerir licencia y revisión de la SUTEL.', adminHint:'Revisar normativa SUTEL para telecom.' },
    { productKey:'signal_booster', productName:'Amplificador Señal / Celular Booster', categoryId:'regulated_telecom', aliases:['amplificador señal','cell booster','signal booster','repetidor señal'], misspellings:['amplificador de señal'], englishTerms:['cell signal booster','cellular amplifier'], spanishTerms:['amplificador de señal celular'], ecommerceTerms:['WeBoost Home Studio','Cel-Fi Go X Signal Booster'], commonSearchPhrases:['amplificador señal precio','signal booster comprar'], riskOverrideFlags:['telecom_review','regulated_product'], customerHint:'Los amplificadores de señal requieren revisión especial.', adminHint:'Revisión SUTEL obligatoria.' },
    { productKey:'bateria_litio_grande', productName:'Batería Litio Grande / 100Wh+ / E-bike', categoryId:'dangerous_goods', aliases:['batería litio grande','ebike battery','100wh battery','batería bicicleta eléctrica'], misspellings:['bateria litio grande'], englishTerms:['lithium battery 100wh','ebike lithium battery'], spanishTerms:['batería de litio grande','batería para bicicleta eléctrica'], ecommerceTerms:['Bosch PowerTube 625 E-Bike Battery','BBSHD Ebike Battery 52V'], commonSearchPhrases:['batería ebike precio'], riskOverrideFlags:['dangerous_goods','contains_lithium_battery','special_transport'], customerHint:'Las baterías de litio grandes tienen restricciones especiales de transporte.', adminHint:'Revisar capacidad Wh y normativa DG para transporte aéreo. Puede ser no aceptable.' },
    { productKey:'cuchillo_tactico', productName:'Cuchillo Táctico / Navaja / Pocket Knife', categoryId:'weapons_restricted', aliases:['cuchillo táctico','navaja','pocket knife','tactical knife','mora knife'], misspellings:['cuchillo tactico'], englishTerms:['tactical knife','pocket knife','folding knife'], spanishTerms:['navaja táctica','cuchillo plegable'], ecommerceTerms:['Benchmade Bugout','Spyderco Paramilitary 2','Mora Companion HD'], commonSearchPhrases:['cuchillo táctico precio','pocket knife comprar'], riskOverrideFlags:['weapon','restricted_item'], customerHint:'Este tipo de producto puede estar restringido — requiere revisión.', adminHint:'Escalar a revisión manual. Validar política CRBOX y normativa.' },
    { productKey:'arco_flecha', productName:'Arco y Flecha / Crossbow / Ballesta', categoryId:'weapons_restricted', aliases:['arco flecha','ballesta','crossbow','bow and arrow'], misspellings:['arco y flecha deportivo'], englishTerms:['compound bow','crossbow','archery set'], spanishTerms:['arco y flecha','ballesta deportiva'], ecommerceTerms:['Bear Archery Cruzer G2','Barnett Whitetail Pro STR Crossbow'], commonSearchPhrases:['arco flecha precio','ballesta comprar'], riskOverrideFlags:['weapon','restricted_item'], customerHint:'Este producto puede estar restringido. Requiere revisión.', adminHint:'Escalar a revisión. Validar normativa nacional.' },
    { productKey:'reloj_replica', productName:'Reloj Réplica / Imitación Rolex / AP', categoryId:'counterfeit_goods', aliases:['rolex falso','réplica rolex','reloj imitación','ap royal oak replica'], misspellings:['replica rolex'], englishTerms:['replica watch','fake rolex','counterfeit watch'], spanishTerms:['reloj réplica','imitación rolex'], ecommerceTerms:['Replica Rolex Submariner','Fake AP Royal Oak'], commonSearchPhrases:['rolex replica precio'], riskOverrideFlags:['counterfeit','trademark_risk'], customerHint:'Los productos de imitación/réplica pueden ser retenidos en aduana.', adminHint:'Bloquear. Riesgo marcario y legal severo.' },
    { productKey:'alexa_echo', productName:'Amazon Echo / Alexa / Echo Dot', categoryId:'networking_equipment', aliases:['amazon echo','alexa','echo dot','echo studio','smart speaker amazon'], misspellings:['amazon alexa echo'], englishTerms:['amazon echo dot','alexa smart speaker'], spanishTerms:['bocina amazon alexa','echo dot'], ecommerceTerms:['Amazon Echo Dot (5th Gen)','Amazon Echo Studio'], commonSearchPhrases:['alexa precio','echo dot comprar'], riskOverrideFlags:['telecom_possible'], customerHint:'', adminHint:'' },
    { productKey:'google_nest', productName:'Google Nest Hub / Nest Mini', categoryId:'networking_equipment', aliases:['google nest','nest hub','nest mini','google home mini'], misspellings:['google nest hub'], englishTerms:['google nest hub 2nd gen','nest mini'], spanishTerms:['google nest hub','asistente google'], ecommerceTerms:['Google Nest Hub (2nd gen)','Google Nest Mini'], commonSearchPhrases:['google nest precio','nest hub comprar'], riskOverrideFlags:['telecom_possible'], customerHint:'', adminHint:'' },
    { productKey:'ring_doorbell', productName:'Ring Doorbell / Nest Camera / Smart Security', categoryId:'networking_equipment', aliases:['ring doorbell','nest camera','ring video doorbell','smart doorbell'], misspellings:['ring door bell'], englishTerms:['ring video doorbell','nest cam outdoor'], spanishTerms:['timbre inteligente ring','cámara ring'], ecommerceTerms:['Ring Video Doorbell Pro 2','Google Nest Cam (outdoor)'], commonSearchPhrases:['ring doorbell precio','ring comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'robot_aspirador', productName:'Robot Aspirador / Roomba / Roborock', categoryId:'home_kitchen_appliances', aliases:['robot aspiradora','roomba','roborock','robot vacuum','aspiradora robot'], misspellings:['robot aspiradora roborock'], englishTerms:['robot vacuum','roomba i7','roborock s8'], spanishTerms:['aspiradora robot','roomba'], ecommerceTerms:['iRobot Roomba j7+','Roborock S8 Pro Ultra'], commonSearchPhrases:['robot aspiradora precio','roomba comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'apple_pencil', productName:'Apple Pencil / Stylus para iPad', categoryId:'computer_accessories', aliases:['apple pencil','stylus ipad','apple pencil 2','lápiz apple'], misspellings:['apple pensil'], englishTerms:['apple pencil 2nd gen','ipad stylus'], spanishTerms:['lápiz para ipad','apple pencil'], ecommerceTerms:['Apple Pencil (2nd Generation)','Apple Pencil USB-C'], commonSearchPhrases:['apple pencil precio','stylus ipad comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'smart_watch_apple', productName:'Apple Watch Series 9 / Ultra 2', categoryId:'watches_jewelry', aliases:['apple watch','apple watch series 9','apple watch ultra','apple watch se'], misspellings:['apple watch series9','apple wacht'], englishTerms:['apple watch series 9','apple watch ultra 2','apple watch se'], spanishTerms:['apple watch','reloj apple'], ecommerceTerms:['Apple Watch Series 9 45mm','Apple Watch Ultra 2'], commonSearchPhrases:['apple watch precio','apple watch series 9 comprar'], riskOverrideFlags:['battery_possible'], customerHint:'', adminHint:'' },
    { productKey:'ipad_pencil_combo', productName:'iPad + Funda / Keyboard Case', categoryId:'tablets_ereaders', aliases:['ipad con funda','ipad keyboard case','magic keyboard ipad','smart folio'], misspellings:['ipad con teclado'], englishTerms:['ipad magic keyboard','apple smart folio','ipad keyboard case'], spanishTerms:['ipad con teclado','funda con teclado para ipad'], ecommerceTerms:['Apple Magic Keyboard for iPad','Logitech Combo Touch iPad'], commonSearchPhrases:['ipad keyboard precio','magic keyboard ipad comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'projector_laser', productName:'Proyector Láser 4K / Epson / BenQ', categoryId:'tv_projectors_streaming', aliases:['proyector láser','projector 4k','epson proyector','benq 4k projector'], misspellings:['proyector laser 4k'], englishTerms:['4k laser projector','epson home cinema','benq tk850'], spanishTerms:['proyector láser 4k','proyector cine en casa'], ecommerceTerms:['Epson Home Cinema 5050UB','BenQ TK850'], commonSearchPhrases:['proyector 4k precio','proyector láser comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el peso y tamaño.', adminHint:'Verificar dimensiones.' },
    { productKey:'lentes_sol_alt', productName:'Lentes de Sol / Ray-Ban / Oakley', categoryId:'eyewear_optical', aliases:['lentes de sol','ray-ban','oakley','gafas de sol','sunglasses'], misspellings:['lentes de sol ray ban'], englishTerms:['sunglasses','ray-ban wayfarer','oakley frogskins'], spanishTerms:['gafas de sol','lentes de sol'], ecommerceTerms:['Ray-Ban New Wayfarer RB2132','Oakley Frogskins OO9013'], commonSearchPhrases:['ray-ban precio','lentes de sol comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'lentes_progresivos', productName:'Lentes Progresivos / Recetados / Montura', categoryId:'eyewear_medical_contact_lenses', aliases:['lentes progresivos','gafas recetadas','monturas','lentes correctivos'], misspellings:['lentes progresivos'], englishTerms:['progressive lenses','prescription glasses','eyeglass frames'], spanishTerms:['lentes progresivos','gafas con receta'], ecommerceTerms:['Warby Parker Prescription Glasses','Zenni Optical Rimless Frames'], commonSearchPhrases:['lentes progresivos precio','gafas recetadas comprar'], riskOverrideFlags:['optical_possible','medical'], customerHint:'Los lentes médicos pueden requerir prescripción y revisión.', adminHint:'Verificar si requiere prescripción médica.' },
    { productKey:'sudadera_universitaria', productName:'Sudadera Universitaria / Champion / Russell', categoryId:'clothing_general', aliases:['sudadera universitaria','college hoodie','champion eco','russell athletic'], misspellings:['sudadera universitaria champion'], englishTerms:['college sweatshirt','champion reverse weave'], spanishTerms:['sudadera universitaria','buzo universitario'], ecommerceTerms:['Champion Reverse Weave Crew','Russell Athletic Dri-Power Fleece'], commonSearchPhrases:['sudadera universitaria precio','champion hoodie comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'ropa_yoga_pilates', productName:'Ropa Yoga / Pilates / Alo Yoga', categoryId:'clothing_general', aliases:['ropa yoga','alo yoga','lululemon yoga','conjunto yoga','legging yoga'], misspellings:['ropa de yoga'], englishTerms:['yoga clothes','alo yoga','yoga leggings'], spanishTerms:['ropa de yoga','conjunto de yoga'], ecommerceTerms:['Alo Yoga High-Waist Airbrush Legging','lululemon Wunder Train'], commonSearchPhrases:['ropa yoga precio','alo yoga comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'bolso_lujo', productName:'Bolso de Lujo / Designer Bag / Michael Kors', categoryId:'bags_luggage_accessories', aliases:['bolso lujo','michael kors','coach bag','kate spade','designer bag'], misspellings:['bolso de lujo'], englishTerms:['designer handbag','michael kors purse','coach bag'], spanishTerms:['bolso de diseñador','bolso de lujo'], ecommerceTerms:['Michael Kors Jet Set Tote','Coach Tabby Shoulder Bag'], commonSearchPhrases:['bolso michael kors precio','designer bag comprar'], riskOverrideFlags:['precious_metal_possible'], customerHint:'El cálculo puede variar para artículos de lujo.', adminHint:'Validar valor declarado y posible lujo/suntuario.' },
    { productKey:'mochila_antiturbo', productName:'Mochila Anti-Robo / Anti-Theft Backpack', categoryId:'bags_luggage_accessories', aliases:['mochila anti-robo','anti-theft backpack','mochila seguridad','tumi backpack'], misspellings:['mochila antirobo'], englishTerms:['anti-theft backpack','laptop backpack with lock'], spanishTerms:['mochila anti-robo','mochila de seguridad'], ecommerceTerms:['Pacsafe Venturesafe X30','Tumi Alpha 3 Backpack'], commonSearchPhrases:['mochila anti-robo precio'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'kindle_fire_tablet', productName:'Kindle Fire HD / Kids Tablet', categoryId:'tablets_ereaders', aliases:['kindle fire','amazon fire hd','fire tablet kids','fire hd 10'], misspellings:['kindle fire hd'], englishTerms:['amazon fire hd 10','kindle fire tablet'], spanishTerms:['tablet amazon fire','kindle fire'], ecommerceTerms:['Amazon Fire HD 10','Amazon Fire 7 Kids Tablet'], commonSearchPhrases:['kindle fire precio','amazon fire tablet comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'gpu_rtx', productName:'GPU / Tarjeta Gráfica RTX 4080 / RX 7900', categoryId:'computers_main_parts', aliases:['gpu','tarjeta gráfica','rtx 4080','rtx 4090','rx 7900 xt','graphics card'], misspellings:['tarjeta grafica rtx'], englishTerms:['nvidia rtx 4080','amd rx 7900 xt','graphics card'], spanishTerms:['tarjeta gráfica','tarjeta de video rtx'], ecommerceTerms:['NVIDIA GeForce RTX 4080','AMD Radeon RX 7900 XTX','ASUS ROG Strix RTX 4090'], commonSearchPhrases:['rtx 4080 precio','tarjeta gráfica comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'procesador_intel', productName:'Procesador Intel / AMD Ryzen / CPU', categoryId:'computers_main_parts', aliases:['procesador intel','ryzen','cpu intel','i7','i9','ryzen 7'], misspellings:['procesador intell','ryzen 7'], englishTerms:['intel core i9 14900k','amd ryzen 7 7800x3d'], spanishTerms:['procesador intel','cpu amd ryzen'], ecommerceTerms:['Intel Core i9-14900K','AMD Ryzen 7 7800X3D','Intel Core i7-13700K'], commonSearchPhrases:['procesador intel precio','ryzen 7 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'placa_madre', productName:'Placa Madre / Motherboard / ASUS ROG', categoryId:'computers_main_parts', aliases:['placa madre','motherboard','mainboard','asus rog strix motherboard'], misspellings:['placa madre motherboard'], englishTerms:['motherboard','asus rog strix z790-e'], spanishTerms:['placa madre','motherboard'], ecommerceTerms:['ASUS ROG Strix Z790-E Gaming WiFi','MSI MEG Z790 ACE'], commonSearchPhrases:['placa madre precio','motherboard comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'fuente_poder_pc', productName:'Fuente de Poder / PSU / Modular', categoryId:'computers_main_parts', aliases:['fuente poder','psu','power supply','corsair psu','modular psu'], misspellings:['fuente de poder pc'], englishTerms:['power supply unit','modular psu','corsair rm850x'], spanishTerms:['fuente de poder','fuente pc'], ecommerceTerms:['Corsair RM850x 850W','EVGA SuperNOVA 850 G6'], commonSearchPhrases:['fuente poder precio','psu comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'auricular_gaming', productName:'Auricular / Headphones Sony / Audio-Technica', categoryId:'headphones_audio_personal', aliases:['auriculares sony','audio technica','sennheiser audifonos','hd 650'], misspellings:['audio technica audifonos'], englishTerms:['audio-technica ath-m50x','sennheiser hd 650','sony mdr-7506'], spanishTerms:['audífonos profesionales','auriculares estudio'], ecommerceTerms:['Audio-Technica ATH-M50x','Sennheiser HD 650','Sony MDR-7506'], commonSearchPhrases:['audio technica precio','sennheiser hd 650 comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'pad_qi2', productName:'Pad de Carga Inalámbrica / Qi2 / MagSafe Stand', categoryId:'chargers_cables_adapters', aliases:['pad qi2','cargador magsafe stand','qi2 charger','magnetic wireless charger'], misspellings:['pad qi 2'], englishTerms:['qi2 wireless charger','magsafe charging stand'], spanishTerms:['cargador inalámbrico qi2','stand magsafe'], ecommerceTerms:['Anker 3-in-1 Cube with MagSafe','Belkin BoostCharge Pro 3-in-1'], commonSearchPhrases:['qi2 charger precio','magsafe stand comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'botas_trabajo', productName:'Botas de Trabajo / Safety Boots / Caterpillar', categoryId:'footwear_complete', aliases:['botas trabajo','safety boots','botas cat','caterpillar boots','botas punta acero'], misspellings:['botas de trabajo'], englishTerms:['work boots','safety toe boots','caterpillar boots'], spanishTerms:['botas de trabajo','botas de seguridad'], ecommerceTerms:['Caterpillar Men\'s Second Shift Boot','Timberland PRO Pit Boss'], commonSearchPhrases:['botas trabajo precio','safety boots comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'zapatilla_minimalista', productName:'Zapatilla Minimalista / Vibram / Barefoot', categoryId:'footwear_complete', aliases:['zapatilla minimalista','barefoot shoes','vibram fivefingers','xero shoes'], misspellings:['zapato minimalista'], englishTerms:['minimalist shoes','barefoot running shoes','vibram fivefingers'], spanishTerms:['zapatilla descalza','zapatilla minimalista'], ecommerceTerms:['Vibram FiveFingers V-Run','Xero Shoes Prio'], commonSearchPhrases:['zapatillas minimalistas precio','barefoot shoes comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'raqueta_tenis', productName:'Raqueta de Tenis / Padel / Wilson', categoryId:'sports_fitness_physical', aliases:['raqueta tenis','wilson raqueta','babolat','raqueta padel','padel racket'], misspellings:['raqueta de tenis wilson'], englishTerms:['tennis racket','padel racket','wilson blade 98'], spanishTerms:['raqueta de tenis','raqueta de padel'], ecommerceTerms:['Wilson Blade 98 v8','Babolat Pure Aero','Bullpadel Hack 03'], commonSearchPhrases:['raqueta tenis precio','wilson blade comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'set_cuidado_bebe', productName:'Set Cuidado Bebé / Grooming Kit', categoryId:'baby_items', aliases:['set cuidado bebé','baby grooming kit','kit higiene bebé','frida baby'], misspellings:['kit cuidado de bebe'], englishTerms:['baby grooming kit','frida baby nasal aspirator'], spanishTerms:['set de higiene bebé','kit de cuidado bebé'], ecommerceTerms:['Frida Baby Essentials Kit','NoseFrida The Snotsucker'], commonSearchPhrases:['kit cuidado bebé precio','frida baby comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'stand_mixer_baking', productName:'Moldes Repostería / Utensilios Pastelería', categoryId:'home_kitchen_appliances', aliases:['moldes repostería','utensilios pastelería','baking pans','cake pans'], misspellings:['moldes de reposteria'], englishTerms:['baking pans set','cake molds','pastry tools'], spanishTerms:['moldes para repostería','utensilios de pastelería'], ecommerceTerms:['Wilton Performance Baking Pans Set','Nordic Ware Bundt Pan'], commonSearchPhrases:['moldes repostería precio','baking pans comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'impresora_3d', productName:'Impresora 3D / Bambu Lab / Creality', categoryId:'computer_accessories', aliases:['impresora 3d','bambu lab','creality ender','3d printer'], misspellings:['impresora 3d bambu'], englishTerms:['3d printer','bambu lab p1s','creality ender 3'], spanishTerms:['impresora 3d','bambu lab'], ecommerceTerms:['Bambu Lab P1S','Creality Ender 3 V3'], commonSearchPhrases:['impresora 3d precio','bambu lab comprar'], riskOverrideFlags:[], customerHint:'', adminHint:'' },
    { productKey:'cortadora_plasma', productName:'Cortadora Plasma / Soldadora / Welder', categoryId:'tools_hardware_common', aliases:['cortadora plasma','soldadora','welder','mig welder','plasma cutter'], misspellings:['soldadora mig'], englishTerms:['plasma cutter','mig welder','tig welder'], spanishTerms:['soldadora','cortadora de plasma'], ecommerceTerms:['Lincoln Electric MIG Welder','Hypertherm Powermax 45 XP'], commonSearchPhrases:['soldadora precio','plasma cutter comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el tamaño y peso.', adminHint:'Verificar peso.' },
    { productKey:'barra_dominadas', productName:'Barra de Dominadas / Pull-Up Bar / Power Rack', categoryId:'sports_fitness_physical', aliases:['barra dominadas','pull up bar','power rack','squat rack'], misspellings:['barra de dominadas'], englishTerms:['pull-up bar','power rack','squat cage'], spanishTerms:['barra de dominadas','rack de sentadillas'], ecommerceTerms:['Rogue R-3 Power Rack','Iron Gym Total Upper Body Workout Bar'], commonSearchPhrases:['barra dominadas precio','power rack comprar'], riskOverrideFlags:[], customerHint:'El cálculo puede variar por el peso.', adminHint:'Verificar peso y dimensiones.' },
    { productKey:'producto_no_identificado', productName:'Producto no identificado (alias)', categoryId:'unknown_manual_review',  aliases:['otro','no identificado','producto desconocido','unknown'],     misspellings:[],                                   englishTerms:['other','unknown'],              spanishTerms:['otro','no identificado'],          riskOverrideFlags:['unknown'],                             customerHint:'Comparta el link o descripción para revisión más precisa.', adminHint:'Clasificar manualmente.' },
  ];

  window.PRODUCT_PRODUCTS = PRODUCTS;

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 4 — VERSION
  // ════════════════════════════════════════════════════════════════════════════

  window.ProductBrainVersion = '2026-CRBOX-local-estimated-v2';

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 5 — HELPER INDEXES
  // Built once at load time for O(1) / O(k) lookups at runtime.
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * CATEGORY_BY_ID — index: brainCategoryId → category object
   * Covers both PRODUCT_BRAIN_CATEGORIES and PRODUCT_CATEGORIES by code.
   */
  var CATEGORY_BY_ID = {};
  BRAIN_CATS.forEach(function (cat) {
    CATEGORY_BY_ID[cat.id] = cat;
    if (cat.code && cat.code !== cat.id) {
      CATEGORY_BY_ID[cat.code] = cat;
    }
  });
  DEDUPED.forEach(function (cat) {
    if (!CATEGORY_BY_ID[cat.code]) {
      CATEGORY_BY_ID[cat.code] = cat;
    }
  });
  window.CATEGORY_BY_ID = CATEGORY_BY_ID;

  /**
   * PRODUCT_TO_CATEGORY_INDEX — index: productKey → brainCategoryId
   */
  var PRODUCT_TO_CATEGORY_INDEX = {};
  PRODUCTS.forEach(function (p) {
    PRODUCT_TO_CATEGORY_INDEX[p.productKey] = p.categoryId;
  });
  window.PRODUCT_TO_CATEGORY_INDEX = PRODUCT_TO_CATEGORY_INDEX;

  /**
   * KEYWORD_INDEX — index: normalized-keyword → [brainCategoryId, ...]
   * Built from aliases, keywords, misspellings, and commonSearches.
   */
  var KEYWORD_INDEX = {};
  function _addKw(word, catId) {
    var key = word.toLowerCase().trim();
    if (!key) return;
    if (!KEYWORD_INDEX[key]) KEYWORD_INDEX[key] = [];
    if (KEYWORD_INDEX[key].indexOf(catId) === -1) KEYWORD_INDEX[key].push(catId);
  }
  BRAIN_CATS.forEach(function (cat) {
    (cat.aliases || []).forEach(function (a) { _addKw(a, cat.id); });
    (cat.keywords || []).forEach(function (k) { _addKw(k, cat.id); });
    (cat.misspellings || []).forEach(function (m) { _addKw(m, cat.id); });
    (cat.commonSearches || []).forEach(function (s) { _addKw(s, cat.id); });
    _addKw(cat.displayName, cat.id);
  });
  PRODUCTS.forEach(function (p) {
    (p.aliases || []).forEach(function (a) { _addKw(a, p.categoryId); });
    (p.misspellings || []).forEach(function (m) { _addKw(m, p.categoryId); });
    (p.englishTerms || []).forEach(function (e) { _addKw(e, p.categoryId); });
    (p.spanishTerms || []).forEach(function (s) { _addKw(s, p.categoryId); });
    _addKw(p.productName, p.categoryId);
  });
  window.KEYWORD_INDEX = KEYWORD_INDEX;

  /**
   * RISK_FLAG_INDEX — index: riskFlag → [brainCategoryId, ...]
   */
  var RISK_FLAG_INDEX = {};
  function _addFlag(flag, catId) {
    if (!flag) return;
    if (!RISK_FLAG_INDEX[flag]) RISK_FLAG_INDEX[flag] = [];
    if (RISK_FLAG_INDEX[flag].indexOf(catId) === -1) RISK_FLAG_INDEX[flag].push(catId);
  }
  BRAIN_CATS.forEach(function (cat) {
    (cat.riskFlags || []).forEach(function (f) { _addFlag(f, cat.id); });
  });
  PRODUCTS.forEach(function (p) {
    (p.riskOverrideFlags || []).forEach(function (f) { _addFlag(f, p.categoryId); });
  });
  window.RISK_FLAG_INDEX = RISK_FLAG_INDEX;

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 6 — UTILITY FUNCTIONS
  // All exposed on window.ProductBrain namespace.
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Normalize text: lowercase, trim, collapse whitespace, remove accents.
   * @param {string} text
   * @returns {string}
   */
  function normalizeText(text) {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Get a Product Brain category by its id or code.
   * @param {string} id
   * @returns {object|null}
   */
  function getCategoryById(id) {
    return CATEGORY_BY_ID[id] || CATEGORY_BY_ID[normalizeText(id)] || null;
  }

  /**
   * Search products by a free-text query.
   * Returns an array of { product, category } objects sorted by relevance.
   * @param {string} query
   * @param {number} [limit=10]
   * @returns {Array<{product: object, category: object}>}
   */
  function searchProducts(query, limit) {
    var q = normalizeText(query);
    if (!q) return [];
    var catIds = KEYWORD_INDEX[q] || [];
    // Also try word-by-word match for multi-word queries
    var words = q.split(' ');
    if (words.length > 1) {
      words.forEach(function (w) {
        (KEYWORD_INDEX[w] || []).forEach(function (id) {
          if (catIds.indexOf(id) === -1) catIds.push(id);
        });
      });
    }
    var results = [];
    catIds.forEach(function (catId) {
      var cat = CATEGORY_BY_ID[catId];
      PRODUCTS.forEach(function (p) {
        if (p.categoryId === catId) {
          results.push({ product: p, category: cat });
        }
      });
    });
    return results.slice(0, limit || 10);
  }

  /**
   * Classify a free-text product query to the best-matching Product Brain category.
   * Returns the category object or null.
   * @param {string} query
   * @returns {object|null}
   */
  function classifyLocal(query) {
    var q = normalizeText(query);
    if (!q) return null;
    // Exact keyword match
    if (KEYWORD_INDEX[q] && KEYWORD_INDEX[q].length > 0) {
      return CATEGORY_BY_ID[KEYWORD_INDEX[q][0]] || null;
    }
    // Word-by-word with scoring
    var words = q.split(' ');
    var scores = {};
    words.forEach(function (w) {
      if (w.length < 2) return;
      (KEYWORD_INDEX[w] || []).forEach(function (catId) {
        scores[catId] = (scores[catId] || 0) + 1;
      });
    });
    var best = null;
    var bestScore = 0;
    Object.keys(scores).forEach(function (catId) {
      if (scores[catId] > bestScore) {
        bestScore = scores[catId];
        best = catId;
      }
    });
    if (best) return CATEGORY_BY_ID[best] || null;
    // Fallback
    return CATEGORY_BY_ID['unknown_manual_review'] || null;
  }

  /**
   * Get the customer-facing message for a category.
   * @param {string} categoryId
   * @returns {string}
   */
  function getCustomerMessage(categoryId) {
    var cat = getCategoryById(categoryId);
    return cat && cat.customerMessage ? cat.customerMessage : '';
  }

  /**
   * Get admin notes for a category.
   * @param {string} categoryId
   * @returns {string}
   */
  function getAdminNotes(categoryId) {
    var cat = getCategoryById(categoryId);
    return cat && cat.adminNotes ? cat.adminNotes : '';
  }

  /**
   * Check if a category requires manual review.
   * @param {string} categoryId
   * @returns {boolean}
   */
  function isManualReview(categoryId) {
    var cat = getCategoryById(categoryId);
    return !!(cat && cat.manualReviewRequired);
  }

  /**
   * Check if a category is forbidden or restricted.
   * @param {string} categoryId
   * @returns {boolean}
   */
  function isForbiddenOrRestricted(categoryId) {
    var cat = getCategoryById(categoryId);
    return !!(cat && (cat.forbiddenProduct || cat.restrictedProduct));
  }

  /**
   * Get risk flags for a category.
   * @param {string} categoryId
   * @returns {string[]}
   */
  function getRiskFlags(categoryId) {
    var cat = getCategoryById(categoryId);
    return (cat && cat.riskFlags) ? cat.riskFlags : [];
  }

  /**
   * Export PRODUCT_BRAIN_CATEGORIES as a JSON string.
   * @returns {string}
   */
  function exportJSON() {
    try {
      return JSON.stringify({
        version: window.ProductBrainVersion,
        categories: BRAIN_CATS,
        products: PRODUCTS,
      }, null, 2);
    } catch (e) {
      return '{}';
    }
  }

  /**
   * Export PRODUCT_BRAIN_CATEGORIES as a CSV string.
   * Columns: id, code, displayName, categoryGroup, totalEstimatedRate,
   *          manualReviewRequired, regulatedProduct, restrictedProduct,
   *          forbiddenProduct, riskFlags, customerMessage
   * @returns {string}
   */
  function exportCSV() {
    var header = ['id','code','displayName','categoryGroup','totalEstimatedRate',
                  'manualReviewRequired','regulatedProduct','restrictedProduct',
                  'forbiddenProduct','riskFlags','customerMessage'];
    var rows = [header.join(',')];
    BRAIN_CATS.forEach(function (cat) {
      var row = [
        cat.id,
        cat.code,
        '"' + (cat.displayName || '').replace(/"/g, '""') + '"',
        '"' + (cat.categoryGroup || '').replace(/"/g, '""') + '"',
        cat.totalEstimatedRate !== null ? cat.totalEstimatedRate : '',
        cat.manualReviewRequired ? 'true' : 'false',
        cat.regulatedProduct ? 'true' : 'false',
        cat.restrictedProduct ? 'true' : 'false',
        cat.forbiddenProduct ? 'true' : 'false',
        '"' + (cat.riskFlags || []).join(';') + '"',
        '"' + (cat.customerMessage || '').replace(/"/g, '""') + '"',
      ];
      rows.push(row.join(','));
    });
    return rows.join('\n');
  }

  /**
   * window.ProductBrain — public utility namespace
   */
  window.ProductBrain = {
    version:               window.ProductBrainVersion,
    normalizeText:         normalizeText,
    getCategoryById:       getCategoryById,
    searchProducts:        searchProducts,
    classifyLocal:         classifyLocal,
    getCustomerMessage:    getCustomerMessage,
    getAdminNotes:         getAdminNotes,
    isManualReview:        isManualReview,
    isForbiddenOrRestricted: isForbiddenOrRestricted,
    getRiskFlags:          getRiskFlags,
    exportJSON:            exportJSON,
    exportCSV:             exportCSV,
  };

  // ── Direct window exports for utility functions ─────────────────────────────
  // Spec requires these to be available as window.getCategoryById, etc.
  // window.ProductBrain.* namespace is also kept for namespaced access.
  window.getCategoryById          = getCategoryById;
  window.searchProducts           = searchProducts;
  window.classifyLocal            = classifyLocal;
  window.normalizeText            = normalizeText;
  window.getCustomerMessage       = getCustomerMessage;
  window.getAdminNotes            = getAdminNotes;
  window.isManualReview           = isManualReview;
  window.isForbiddenOrRestricted  = isForbiddenOrRestricted;
  window.getRiskFlags             = getRiskFlags;
  window.exportCSV                = exportCSV;
  window.exportJSON               = exportJSON;

})();
