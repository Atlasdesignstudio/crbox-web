/**
 * tariff-adapter.js
 * Single source-of-truth for all tax/duty rate lookups.
 *
 * Each lookup returns { rate: Number, source: String, label: String }
 * where source is one of:
 *   "local_estimated"  — rates derived from local reference data (default)
 *   "official_tica"    — rate obtained from the Costa Rica DGA/TICA system
 *   "user_override"    — rate manually entered or overridden by the user
 *
 * To swap in official TICA data later, update the OFFICIAL_RATES map and
 * set source to "official_tica". No UI changes are required.
 */

const TARIFF_ADAPTER = (function () {

  /**
   * Local estimated rates by category code.
   * These are composite effective rates covering aranceles + IVA (13%),
   * selective consumption taxes, and other applicable duties.
   * Source: CRBOX internal reference table, cross-referenced with
   * publicly available Hacienda/DGA category data.
   * NOT a substitute for official TICA consultation.
   */
  const LOCAL_RATES = {
    accesorios_impresora: 0.13,
    adaptador: 0.13,
    adornos: 0.2995,
    alarma: 0.1413,
    alfombra: 0.2995,
    amortiguadores: 0.4278,
    amplificador: 0.1413,
    amplificador_grabador: 0.4927,
    antena: 0.1413,
    anteojos: 0.2995,
    aros_bicicleta: 0.2430,
    aros_carro_moto: 0.4278,
    arrancador: 0.4278,
    articulos_fiesta: 0.2995,
    aspiradora: 0.4927,
    auricular_telefono: 0.1413,
    baterias: 0.4238,
    bicicleta_economica: 0.13,
    bicicleta_cara: 0.2995,
    binoculares: 0.2995,
    bocina: 0.1413,
    bola: 0.2430,
    bomba_aceite_agua: 0.1413,
    bombillos: 0.1978,
    bujias: 0.4278,
    cables_electricos: 0.2995,
    calculadora: 0.13,
    camara: 0.1413,
    cana_pescar: 0.2430,
    cargador: 0.1413,
    casco_seguridad: 0.29,
    case_cpu: 0.2995,
    cds: 0.1413,
    celulares: 0.13,
    cinturon: 0.4278,
    cluth: 0.4278,
    coche_bebe: 0.2995,
    colchon: 0.2995,
    computadora: 0.13,
    consola_videojuegos: 0.4927,
    control_remoto: 0.1413,
    cortinas: 0.2995,
    disco_duro: 0.13,
    diskman_walkman: 0.4927,
    dvds: 0.2430,
    electrodomesticos: 0.4927,
    equipo_sonido: 0.4927,
    equipo_karaoke: 0.4927,
    filtro_aceite_aire: 0.2430,
    filtro_agua: 0.1413,
    fluorescente: 0.2995,
    fotocopiadora: 0.1413,
    fuente_poder: 0.1413,
    gata_hidraulica: 0.1413,
    gorras: 0.2995,
    griferia: 0.2995,
    guitarra_acustica: 0.2995,
    guitarra_electrica: 0.2430,
    herramientas: 0.2430,
    home_teather: 0.4927,
    impresora: 0.13,
    instrumentos_musicales: 0.2995,
    ipod_mp3_mp4: 0.4927,
    joyeria_bisuteria: 0.2995,
    juego_mesa: 0.2995,
    juguetes: 0.2995,
    lampara: 0.2995,
    lector_dvd_cd: 0.4927,
    lente_contacto: 0.1978,
    lente_camara: 0.1413,
    libros: 0.01,
    llantas_vehiculo: 0.2430,
    llave_maya: 0.13,
    luces_carro: 0.1413,
    maletines_bolsos: 0.2995,
    manguera: 0.2995,
    maquina_coser_soldar: 0.1413,
    memoria: 0.13,
    microscopio: 0.1413,
    mixer: 0.4927,
    molduras_vehiculo: 0.4278,
    monitor: 0.13,
    muebles: 0.2995,
    mufla: 0.4278,
    ollas_sartenes: 0.2995,
    palos_golf: 0.2430,
    panos: 0.2995,
    papel: 0.2430,
    parabrisas: 0.1978,
    parlantes: 0.1413,
    partes_carroceria: 0.4278,
    patines: 0.2430,
    pelucas: 0.2995,
    pinon: 0.1413,
    plancha_pelo: 0.4927,
    platos_ceramica: 0.2995,
    posters: 0.2995,
    procesador: 0.13,
    proyector_video: 0.4927,
    quemador_cd_dvd: 0.4927,
    rack_carro: 0.4878,
    radiador: 0.4278,
    radio_carro: 0.4927,
    radio_comunicacion: 0.13,
    raqueta: 0.2430,
    rasuradora_electrica: 0.4927,
    refrigerador: 0.68,
    relojes: 0.2995,
    reproductor_bluray: 0.4927,
    repuestos_vehiculo: 0.43,
    retrovisor: 0.1978,
    romana: 0.1413,
    ropa: 0.2995,
    router: 0.13,
    sabanas: 0.2995,
    secadoras_pelo: 0.4927,
    silla_bebe_carro: 0.13,
    sleeping_bag: 0.2995,
    software: 0.13,
    sombrilla: 0.2995,
    sombrilla_fotografia: 0.2995,
    suspension_carro: 0.4278,
    suspension_moto: 0.4278,
    tabla_surf: 0.2430,
    tableta_electronica: 0.13,
    tarjeta_video_sonido: 0.13,
    tarjeta_madre: 0.13,
    teclado_musical: 0.2430,
    teclado_computadora: 0.13,
    telefonos: 0.13,
    televisor: 0.4927,
    tienda_campana: 0.2995,
    tripode: 0.2995,
    valvulas: 0.1413,
    vaso_vidrio: 0.2995,
    ventiladores_computadora: 0.2430,
    video_juegos: 0.1413,
    video_monitor: 0.4927,
    zapatos: 0.2995,
    // ── Additional category keys used by cotizar form ─────────────────────
    salud_belleza: 0.2995,
    suplementos:   0.13,
    vehiculos:     0.43,
    // ── Per-optgroup "otro" aliases (C-14) — all map to the base otros rate
    electr_otro:   0.2995,
    ropa_otro:     0.2995,
    hogar_otro:    0.2995,
    deporte_otro:  0.2430,
    bebe_otro:     0.2995,
    vehic_otro:    0.43,
    otros: 0.2995
  };

  /**
   * Placeholder for official TICA rates.
   * When integration with TICA/DGA is ready, populate this map.
   * Keys match LOCAL_RATES for direct substitution.
   */
  const OFFICIAL_RATES = {};

  /**
   * Get the tariff rate for a given category code.
   *
   * @param {string} categoryCode - The category key (e.g. "celulares")
   * @param {string|null} [userOverrideRate] - Optional user-supplied rate (0–1)
   * @returns {{ rate: number, source: "local_estimated"|"official_tica"|"user_override", pct: string }}
   */
  function getTariffRate(categoryCode, userOverrideRate) {
    if (userOverrideRate !== undefined && userOverrideRate !== null) {
      const r = parseFloat(userOverrideRate);
      if (!isNaN(r) && r >= 0) {
        return { rate: r, source: 'user_override', pct: (r * 100).toFixed(2) + '%' };
      }
    }

    if (OFFICIAL_RATES[categoryCode] !== undefined) {
      const r = OFFICIAL_RATES[categoryCode];
      return { rate: r, source: 'official_tica', pct: (r * 100).toFixed(2) + '%' };
    }

    const r = LOCAL_RATES[categoryCode] !== undefined
      ? LOCAL_RATES[categoryCode]
      : LOCAL_RATES['otros'];

    return { rate: r, source: 'local_estimated', pct: (r * 100).toFixed(2) + '%' };
  }

  /**
   * Returns all category codes available in the local table.
   * @returns {string[]}
   */
  function getCategoryCodes() {
    return Object.keys(LOCAL_RATES);
  }

  return { getTariffRate, getCategoryCodes };
})();
