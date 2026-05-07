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
  // DEDUPED entries are the same live objects as window.PRODUCT_CATEGORIES,
  // so mutating them here enriches window.PRODUCT_CATEGORIES in place with
  // all Product Brain spec fields (displayName, categoryGroup, customerMessage,
  // adminNotes, riskFlags, manualReviewRequired, regulatedProduct, etc.).
  (function _mergeBrainIntoCats() {
    var brainMap = {};
    BRAIN_CATS.forEach(function (bc) {
      brainMap[bc.id] = bc;
      if (bc.code && bc.code !== bc.id) { brainMap[bc.code] = bc; }
    });
    var BRAIN_FIELDS = [
      'displayName','categoryGroup','subCategory','keywords','commonSearches',
      'misspellings','exampleProducts','estimatedDAI','vatRate','law6946Rate',
      'estimatedRange','automaticEstimateAllowed','manualReviewRequired',
      'regulatedProduct','restrictedProduct','forbiddenProduct','riskFlags',
      'possiblePermits','possibleInstitutions','customerMessage','adminNotes',
      'actionForCustomer','actionForAdmin','confidenceLevel',
    ];
    DEDUPED.forEach(function (cat) {
      var bc = brainMap[cat.id] || brainMap[cat.code] || null;
      if (bc) {
        BRAIN_FIELDS.forEach(function (f) {
          if (bc[f] !== undefined) { cat[f] = bc[f]; }
        });
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
    { productKey:'producto_no_identificado', productName:'Producto no identificado (alias)', categoryId:'unknown_manual_review',  aliases:['otro','no identificado','producto desconocido','unknown'],     misspellings:[],                                   englishTerms:['other','unknown'],              spanishTerms:['otro','no identificado'],          riskOverrideFlags:['unknown'],                             customerHint:'Comparta el link o descripción para revisión más precisa.', adminHint:'Clasificar manualmente.' },
  ];

  window.PRODUCT_PRODUCTS = PRODUCTS;

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 4 — VERSION
  // ════════════════════════════════════════════════════════════════════════════

  window.ProductBrainVersion = '2026-CRBOX-local-estimated-v1';

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
