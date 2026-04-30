(function () {
  /* ── 1. Inject scoped styles once ───────────────────────────── */
  if (!document.getElementById('crb-footer-styles')) {
    var s = document.createElement('style');
    s.id = 'crb-footer-styles';
    s.textContent = [
      '#crb-footer{background:#0f172a;color:#e2e8f0;font-family:inherit;margin-top:0;}',
      '#crb-footer a{text-decoration:none;}',

      /* top section */
      '.crb-ft-top{max-width:1280px;margin:0 auto;padding:64px 32px 52px;}',
      '.crb-ft-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1.2fr;gap:48px;align-items:start;}',

      /* column label */
      '.crb-ft-label{font-size:10.5px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#FF6B00;margin-bottom:20px;display:block;}',

      /* brand column */
      '.crb-ft-brand{font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#fff;margin-bottom:14px;}',
      '.crb-ft-tagline{font-size:13.5px;line-height:1.65;color:#64748b;margin-bottom:28px;}',
      '.crb-ft-social{display:flex;gap:10px;}',
      '.crb-ft-social a{width:34px;height:34px;border-radius:8px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;color:#64748b;font-size:14px;transition:background 0.2s,color 0.2s;}',
      '.crb-ft-social a:hover{background:rgba(255,107,0,0.12);color:#FF6B00;}',

      /* nav links */
      '.crb-ft-nav{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0;}',
      '.crb-ft-nav li a{display:flex;align-items:center;gap:8px;font-size:14px;color:#94a3b8;padding:6px 0;transition:color 0.2s;}',
      '.crb-ft-nav li a:hover{color:#FF6B00;}',
      '.crb-ft-nav li a .crb-ft-arrow{font-size:9px;color:#FF6B00;opacity:0.6;flex-shrink:0;}',

      /* contact channels */
      '.crb-ft-channel{display:flex;align-items:center;gap:13px;padding:6px 0;}',
      '.crb-ft-ch-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px;}',
      '.crb-ft-ch-icon.tel{background:rgba(255,107,0,0.1);color:#FF6B00;}',
      '.crb-ft-ch-icon.wa{background:rgba(37,211,102,0.1);color:#25D366;}',
      '.crb-ft-ch-icon.email{background:rgba(255,107,0,0.1);color:#FF6B00;}',
      '.crb-ft-ch-lbl{font-size:11px;color:#475569;margin-bottom:2px;font-weight:500;letter-spacing:0.3px;}',
      '.crb-ft-ch-val{font-size:13.5px;color:#94a3b8;transition:color 0.2s;line-height:1;}',
      '.crb-ft-channel:hover .crb-ft-ch-val{color:#FF6B00;}',

      /* locations */
      '.crb-ft-locations{display:flex;flex-direction:column;gap:18px;}',
      '.crb-ft-loc-name{font-size:13px;font-weight:600;color:#cbd5e1;margin-bottom:5px;}',
      '.crb-ft-loc-hours{font-size:12px;color:#64748b;line-height:1.6;}',
      '.crb-ft-loc-tz{font-size:11px;color:#475569;display:block;margin-top:1px;}',

      /* divider */
      '.crb-ft-divider{border:none;border-top:1px solid rgba(255,255,255,0.065);margin:0;}',

      /* bottom bar */
      '.crb-ft-bottom{max-width:1280px;margin:0 auto;padding:18px 32px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;}',
      '.crb-ft-copy{font-size:12px;color:#334155;margin:0;}',
      '.crb-ft-legal{display:flex;gap:24px;}',
      '.crb-ft-legal a{font-size:12px;color:#475569;transition:color 0.2s;}',
      '.crb-ft-legal a:hover{color:#94a3b8;}',

      /* ── Mobile ─────────────────────────────────────────────── */
      '@media(max-width:1024px){',
      '  .crb-ft-grid{grid-template-columns:1fr 1fr;gap:36px;}',
      '}',
      '@media(max-width:600px){',
      '  .crb-ft-top{padding:48px 20px 40px;}',
      '  .crb-ft-grid{grid-template-columns:1fr;gap:36px;}',
      '  .crb-ft-bottom{padding:16px 20px;flex-direction:column;align-items:flex-start;gap:10px;}',
      '  .crb-ft-legal{gap:20px;}',
      '  .crb-ft-channel{padding:8px 0;}',
      '  .crb-ft-ch-icon{width:38px;height:38px;}',
      '  .crb-ft-nav li a{padding:8px 0;font-size:15px;}',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ── 2. Footer HTML ─────────────────────────────────────────── */
  var html = '\
<footer id="crb-footer">\
  <div class="crb-ft-top">\
    <div class="crb-ft-grid">\
\
      <!-- Brand -->\
      <div>\
        <div class="crb-ft-brand">CRBOX</div>\
        <p class="crb-ft-tagline">Tu casillero virtual en Miami.\u00a0Compras en USA con entrega en Costa Rica.</p>\
        <div class="crb-ft-social">\
          <a href="#" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>\
          <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>\
          <a href="https://wa.me/50689794418" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="fab fa-whatsapp"></i></a>\
        </div>\
      </div>\
\
      <!-- Quick links -->\
      <div>\
        <span class="crb-ft-label">Navegaci\u00f3n</span>\
        <ul class="crb-ft-nav">\
          <li><a href="/servicios.html"><span class="crb-ft-arrow"><i class="fas fa-chevron-right"></i></span>Servicios</a></li>\
          <li><a href="/como-funciona.html"><span class="crb-ft-arrow"><i class="fas fa-chevron-right"></i></span>C\u00f3mo Funciona</a></li>\
          <li><a href="/tarifas.html"><span class="crb-ft-arrow"><i class="fas fa-chevron-right"></i></span>Tarifas</a></li>\
          <li><a href="/calculadora.html"><span class="crb-ft-arrow"><i class="fas fa-chevron-right"></i></span>Calculadora</a></li>\
          <li><a href="/afiliate.html"><span class="crb-ft-arrow"><i class="fas fa-chevron-right"></i></span>Af\u00edliate</a></li>\
          <li><a href="/contacto.html"><span class="crb-ft-arrow"><i class="fas fa-chevron-right"></i></span>Contacto</a></li>\
        </ul>\
      </div>\
\
      <!-- Contact channels -->\
      <div>\
        <span class="crb-ft-label">Contacto</span>\
        <a href="tel:40001114" class="crb-ft-channel">\
          <div class="crb-ft-ch-icon tel"><i class="fas fa-phone"></i></div>\
          <div><div class="crb-ft-ch-lbl">Tel\u00e9fono</div><span class="crb-ft-ch-val">4000-1114</span></div>\
        </a>\
        <a href="https://wa.me/50689794418" target="_blank" rel="noopener" class="crb-ft-channel">\
          <div class="crb-ft-ch-icon wa"><i class="fab fa-whatsapp"></i></div>\
          <div><div class="crb-ft-ch-lbl">WhatsApp</div><span class="crb-ft-ch-val">+506\u20118979-4418</span></div>\
        </a>\
        <a href="mailto:servicioalcliente@crbox.cr" class="crb-ft-channel">\
          <div class="crb-ft-ch-icon email"><i class="fas fa-envelope"></i></div>\
          <div><div class="crb-ft-ch-lbl">Correo</div><span class="crb-ft-ch-val" style="font-size:12.5px;word-break:break-all;">servicioalcliente@crbox.cr</span></div>\
        </a>\
      </div>\
\
      <!-- Locations + hours -->\
      <div>\
        <span class="crb-ft-label">Sucursales</span>\
        <div class="crb-ft-locations">\
          <div>\
            <div class="crb-ft-loc-name">Sabana Norte</div>\
            <div class="crb-ft-loc-hours">Lun\u2013Vie: 7:00 am \u2013 4:30 pm</div>\
          </div>\
          <div>\
            <div class="crb-ft-loc-name">Calle Blancos</div>\
            <div class="crb-ft-loc-hours">Lun\u2013Vie: 7:00 am \u2013 4:30 pm<br>S\u00e1b: 9:00 am \u2013 12:30 pm</div>\
          </div>\
          <div>\
            <div class="crb-ft-loc-name">Miami, FL</div>\
            <div class="crb-ft-loc-hours">Lun\u2013Vie: 8:00 am \u2013 5:00 pm<span class="crb-ft-loc-tz">Hora del Este (ET)</span></div>\
          </div>\
        </div>\
      </div>\
\
    </div>\
  </div>\
\
  <hr class="crb-ft-divider">\
\
  <div class="crb-ft-bottom">\
    <p class="crb-ft-copy">\u00a9 2025 CRBOX. Todos los derechos reservados.</p>\
    <div class="crb-ft-legal">\
      <a href="/terminos.html">T\u00e9rminos y Condiciones</a>\
      <a href="/privacidad.html">Pol\u00edtica de Privacidad</a>\
    </div>\
  </div>\
</footer>';

  /* ── 3. Inject into placeholder ─────────────────────────────── */
  function inject() {
    var el = document.getElementById('site-footer');
    if (el) el.outerHTML = html;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
