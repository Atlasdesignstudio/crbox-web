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
      name: 'Lámparas y Luminarias',
      group: 'Hogar y Jardín',
      aliases: ['lámpara', 'luminaria', 'luz', 'foco', 'candil', 'aplique', 'iluminación'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: false,
    },
    {
      id: 'cortinas', code: 'cortinas',
      name: 'Cortinas y Persianas',
      group: 'Hogar y Jardín',
      aliases: ['cortina', 'persiana', 'blinds', 'curtain', 'toldo'],
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

    // ── Otros ─────────────────────────────────────────────────────────────────
    {
      id: 'otros', code: 'otros',
      name: 'Otro (no está en la lista)',
      group: 'Otros',
      aliases: ['otro', 'no sé', 'no estoy seguro', 'other', 'miscellaneous', 'varios'],
      dutyRate: null, totalEstimatedRate: 0.2995, source: 'local_estimated', requiresPermit: false, needsReview: true,
    },
  ];

  // De-duplicate by code (some aliases were added twice above for safety)
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
})();
