#!/usr/bin/env python3
"""Task #384 — Product Brain Expansion Batch 4 (~80 rows → push total past 700)."""
import json, sys

def q(s): return "'" + s.replace("'", "\\'") + "'"
def js_list(items): return '[' + ','.join(q(i) for i in items) + ']'

def row_to_js(r):
    parts = [
        f"productKey:{q(r['productKey'])}",
        f"productName:{q(r['productName'])}",
        f"categoryId:{q(r['categoryId'])}",
        f"aliases:{js_list(r.get('aliases',[]))}",
        f"misspellings:{js_list(r.get('misspellings',[]))}",
        f"englishTerms:{js_list(r.get('englishTerms',[]))}",
        f"spanishTerms:{js_list(r.get('spanishTerms',[]))}",
        f"ecommerceTerms:{js_list(r.get('ecommerceTerms',[]))}",
        f"commonSearchPhrases:{js_list(r.get('commonSearchPhrases',[]))}",
        f"riskOverrideFlags:{js_list(r.get('riskOverrideFlags',[]))}",
        f"customerHint:{q(r.get('customerHint',''))}",
        f"adminHint:{q(r.get('adminHint',''))}",
    ]
    return '    { ' + ', '.join(parts) + ' },'

BATCH4 = [

  # ══ PHONES ════════════════════════════════════════════════════════════════
  { 'productKey':'oneplus_nord', 'productName':'OnePlus Nord / CE / Lite', 'categoryId':'phones_smartphones',
    'aliases':['oneplus nord','nord ce','oneplus lite'],
    'misspellings':['one plus nord'],
    'englishTerms':['oneplus nord 3','oneplus nord ce 3 lite'],
    'spanishTerms':['celular oneplus nord'],
    'ecommerceTerms':['OnePlus Nord 3 5G','OnePlus Nord CE 3 Lite'],
    'commonSearchPhrases':['oneplus nord precio'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  # ══ COMPUTERS ════════════════════════════════════════════════════════════
  { 'productKey':'ram_ddr5', 'productName':'Memoria RAM DDR5 / DDR4 / DIMM', 'categoryId':'computers_main_parts',
    'aliases':['ram ddr5','ram ddr4','memoria ram','16gb ddr5','corsair ram'],
    'misspellings':['memoria ram ddr 5'],
    'englishTerms':['ddr5 ram','16gb ddr5','corsair vengeance ddr5'],
    'spanishTerms':['memoria ram','ram para pc'],
    'ecommerceTerms':['Corsair Vengeance DDR5 32GB','G.Skill Ripjaws V DDR4 16GB'],
    'commonSearchPhrases':['ram ddr5 precio','memoria ram comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'caja_pc_gaming', 'productName':'Case / Chasis PC Gaming / ATX / Mid-Tower', 'categoryId':'computers_main_parts',
    'aliases':['case pc','chasis pc','mid tower case','lian li','corsair 4000d'],
    'misspellings':['case de pc gaming'],
    'englishTerms':['pc case atx','mid tower','lian li lancool 216'],
    'spanishTerms':['gabinete pc','chasis gaming'],
    'ecommerceTerms':["Lian Li Lancool 216",'Corsair 4000D Airflow','NZXT H510'],
    'commonSearchPhrases':['case pc precio','chasis gaming comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  # ══ AUDIO ═════════════════════════════════════════════════════════════════
  { 'productKey':'amplificador_hi_fi', 'productName':'Amplificador Hi-Fi / Stereo / NAD / Denon', 'categoryId':'speakers_home_audio',
    'aliases':['amplificador hi-fi','stereo amplifier','nad amplifier','denon receiver'],
    'misspellings':['amplificador hifi'],
    'englishTerms':['stereo amplifier','nad d3045','denon pma-600ne'],
    'spanishTerms':['amplificador de audio','amplificador estéreo'],
    'ecommerceTerms':['NAD D 3045 Hybrid Digital Amplifier','Denon PMA-600NE Stereo Integrated Amplifier'],
    'commonSearchPhrases':['amplificador hi-fi precio','nad amplifier comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'barra_sonido', 'productName':'Barra de Sonido / Soundbar / Samsung HW / Sonos Arc', 'categoryId':'speakers_home_audio',
    'aliases':['barra de sonido','soundbar','samsung hw','sonos arc','lg soundbar'],
    'misspellings':['sound bar samsung'],
    'englishTerms':['soundbar','samsung hw-q990c','sonos arc'],
    'spanishTerms':['barra de sonido','soundbar para tv'],
    'ecommerceTerms':['Samsung HW-Q990C Soundbar','Sonos Arc Soundbar','LG S75Q Soundbar'],
    'commonSearchPhrases':['barra de sonido precio','sonos arc comprar'],
    'riskOverrideFlags':['battery_possible'], 'customerHint':'', 'adminHint':'' },

  # ══ CAMERAS ══════════════════════════════════════════════════════════════
  { 'productKey':'objetivo_lente', 'productName':'Objetivo / Lente Intercambiable / 50mm', 'categoryId':'cameras_photo_video',
    'aliases':['objetivo cámara','lente 50mm','lente intercambiable','sigma art lens'],
    'misspellings':['objetivo de camara'],
    'englishTerms':['camera lens','50mm lens','sigma 35mm art'],
    'spanishTerms':['objetivo para cámara','lente de cámara'],
    'ecommerceTerms':['Sigma 35mm f/1.4 DG DN Art','Sony FE 50mm f/1.8','Tamron 17-70mm f/2.8'],
    'commonSearchPhrases':['objetivo 50mm precio','sigma art lens comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'filtro_nd_foto', 'productName':'Filtros ND / CPL / UV para Cámara', 'categoryId':'cameras_photo_video',
    'aliases':['filtros nd','cpl filter','uv filter','variable nd filter'],
    'misspellings':['filtro nd camara'],
    'englishTerms':['nd filter','circular polarizer','variable nd filter'],
    'spanishTerms':['filtro nd','filtro polarizador'],
    'ecommerceTerms':['PolarPro VND Mist Filter','Tiffen Variable ND Filter','B+W 82mm XS-Pro UV'],
    'commonSearchPhrases':['filtro nd precio','cpl filter comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  # ══ CLOTHING ═════════════════════════════════════════════════════════════
  { 'productKey':'chaleco_acolchado', 'productName':'Chaleco Acolchado / Puffer Vest / Patagonia', 'categoryId':'clothing_general',
    'aliases':['chaleco acolchado','puffer vest','chaleco sin mangas','patagonia vest'],
    'misspellings':['chaleco acolchado sin mangas'],
    'englishTerms':['puffer vest','down vest','patagonia down sweater vest'],
    'spanishTerms':['chaleco acolchado','chaleco pluma'],
    'ecommerceTerms':["Patagonia Men's Down Sweater Vest",'The North Face Aconcagua 3 Vest'],
    'commonSearchPhrases':['chaleco acolchado precio','puffer vest comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'conjunto_nino', 'productName':'Ropa Niño / Conjunto Infantil / Gap Kids', 'categoryId':'clothing_general',
    'aliases':['ropa niño','conjunto infantil','gap kids','ropa para niños'],
    'misspellings':['ropa de niño'],
    'englishTerms':["kids clothing set","gap kids outfit"],
    'spanishTerms':['ropa para niños','conjunto infantil'],
    'ecommerceTerms':["Carter's 3-Piece Baby Set","Gap Kids Cargo Jogger"],
    'commonSearchPhrases':['ropa niño precio','gap kids comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  # ══ BEAUTY ═══════════════════════════════════════════════════════════════
  { 'productKey':'toner_coreano', 'productName':'Tónico / Toner Coreano / COSRX / Some By Mi', 'categoryId':'beauty_skincare_personal_care',
    'aliases':['tónico coreano','cosrx toner','some by mi','korean toner','essence skincare'],
    'misspellings':['toner coreano'],
    'englishTerms':['korean toner','cosrx propolis toner','some by mi aha bha pha'],
    'spanishTerms':['tónico coreano','esencia skincare'],
    'ecommerceTerms':['COSRX Advanced Snail 96 Mucin Power Essence','Some By Mi AHA BHA PHA Toner'],
    'commonSearchPhrases':['toner coreano precio','cosrx comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'bloqueador_corporal', 'productName':'Bloqueador Corporal / Body Sunscreen / SPF', 'categoryId':'beauty_skincare_personal_care',
    'aliases':['bloqueador corporal','body sunscreen','spf loción corporal'],
    'misspellings':['bloqueador solar corporal'],
    'englishTerms':['body sunscreen spf 30','mineral body sunscreen'],
    'spanishTerms':['bloqueador solar corporal','protector solar loción'],
    'ecommerceTerms':["Banana Boat Sport SPF 50+ Body Lotion","Neutrogena Beach Defense SPF 70"],
    'commonSearchPhrases':['bloqueador corporal precio','body sunscreen comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'tinte_cabello', 'productName':'Tinte de Cabello / Olaplex / L\'Oreal', 'categoryId':'beauty_skincare_personal_care',
    'aliases':["tinte cabello","loreal colorista",'olaplex hair tint','hair dye'],
    'misspellings':['tinte de pelo'],
    'englishTerms':["hair dye","l'oreal colorista","olaplex no. 4 bond maintenance shampoo"],
    'spanishTerms':['tinte de cabello','coloración capilar'],
    'ecommerceTerms':["L'Oreal Colorista Hair Color","Olaplex No. 4 Bond Maintenance Shampoo"],
    'commonSearchPhrases':['tinte cabello precio','olaplex comprar'],
    'riskOverrideFlags':['chemical'], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'aceite_esencial', 'productName':'Aceite Esencial / Lavanda / Eucalipto / doTERRA', 'categoryId':'beauty_skincare_personal_care',
    'aliases':['aceite esencial','doterra','aceite lavanda','aceite eucalipto','essential oil'],
    'misspellings':['aceite esencial lavanda'],
    'englishTerms':['essential oil','doterra lavender','eucalyptus essential oil'],
    'spanishTerms':['aceite esencial','aceite de lavanda'],
    'ecommerceTerms':["doTERRA Lavender Essential Oil 15ml","Plant Therapy Eucalyptus Globulus"],
    'commonSearchPhrases':['aceite esencial precio','doterra comprar'],
    'riskOverrideFlags':['liquid'], 'customerHint':'', 'adminHint':'' },

  # ══ HOME ══════════════════════════════════════════════════════════════════
  { 'productKey':'freidora_doble', 'productName':'Freidora de Aire Doble / Ninja DualZone', 'categoryId':'home_kitchen_appliances',
    'aliases':['freidora doble','ninja dual zone','air fryer dual','cosori dual basket'],
    'misspellings':['freidora doble air fryer'],
    'englishTerms':['dual zone air fryer','ninja foodi dual zone'],
    'spanishTerms':['freidora de aire doble','air fryer doble canasta'],
    'ecommerceTerms':["Ninja DualZone Air Fryer DZ401","COSORI Dual Blaze 13-Qt Air Fryer"],
    'commonSearchPhrases':['freidora doble precio','ninja dual zone comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'set_bowls_ceramica', 'productName':'Set de Bowls / Ensaladera / Cerámica Artesanal', 'categoryId':'home_kitchen_appliances',
    'aliases':['set bowls','ensaladera ceramica','ceramic bowl set','artisan bowls'],
    'misspellings':['set de bowls'],
    'englishTerms':['ceramic bowl set','salad bowl set'],
    'spanishTerms':['juego de bowls','ensaladera'],
    'ecommerceTerms':["Le Creuset 4-Piece Stoneware Bowl Set","Fiesta Dinnerware Set"],
    'commonSearchPhrases':['set bowls precio','ceramic bowl comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'cortinas_black_out', 'productName':'Cortinas Blackout / Room Darkening', 'categoryId':'home_decor_storage',
    'aliases':['cortinas blackout','room darkening','cortinas oscurecimiento'],
    'misspellings':['cortinas black out'],
    'englishTerms':['blackout curtains','room darkening curtains'],
    'spanishTerms':['cortinas blackout','cortinas de oscurecimiento'],
    'ecommerceTerms':['NICETOWN Full Blackout Curtain Panels','Deconovo Blackout Curtains'],
    'commonSearchPhrases':['cortinas blackout precio','room darkening comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'alfombra_sala', 'productName':'Alfombra / Rug / Area Rug / 5x8', 'categoryId':'home_decor_storage',
    'aliases':['alfombra sala','area rug','tapete grande','8x10 rug'],
    'misspellings':['alfombra de sala'],
    'englishTerms':['area rug 5x8','shag rug','bohemian rug'],
    'spanishTerms':['alfombra para sala','tapete'],
    'ecommerceTerms':["Safavieh Hudson Shag Rug 5'x8'","Ruggable Washable Indoor/Outdoor Rug"],
    'commonSearchPhrases':['alfombra sala precio','area rug comprar'],
    'riskOverrideFlags':[], 'customerHint':'El cálculo puede variar por el tamaño y peso.', 'adminHint':'Verificar dimensiones y peso.' },

  { 'productKey':'cajonera_madera', 'productName':'Cajonera / Dresser / IKEA / Malm', 'categoryId':'home_decor_storage',
    'aliases':['cajonera madera','dresser','malm ikea','chest of drawers'],
    'misspellings':['cajonera de madera'],
    'englishTerms':['dresser','chest of drawers','ikea malm dresser'],
    'spanishTerms':['cajonera','cómoda de cajones'],
    'ecommerceTerms':['IKEA MALM 6-Drawer Dresser','HOMFA Modern Dresser'],
    'commonSearchPhrases':['cajonera precio','dresser comprar'],
    'riskOverrideFlags':[], 'customerHint':'El cálculo puede variar por las dimensiones y peso.', 'adminHint':'Verificar dimensiones.' },

  # ══ SPORTS ═══════════════════════════════════════════════════════════════
  { 'productKey':'pelota_basketball', 'productName':'Pelota de Baloncesto / Spalding / Wilson', 'categoryId':'sports_fitness_physical',
    'aliases':['pelota baloncesto','basketball','spalding','wilson ncaa ball'],
    'misspellings':['pelota de basketball'],
    'englishTerms':['basketball','spalding nba official game ball'],
    'spanishTerms':['balón de baloncesto','pelota de básquet'],
    'ecommerceTerms':['Spalding NBA Indoor/Outdoor Basketball','Wilson NBA DRV Series Basketball'],
    'commonSearchPhrases':['pelota baloncesto precio'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'red_pickleball', 'productName':'Pickleball / Raqueta / Set Completo', 'categoryId':'sports_fitness_physical',
    'aliases':['pickleball','raqueta pickleball','paddle pickleball','pickleball set'],
    'misspellings':['pickelball'],
    'englishTerms':['pickleball paddle','pickleball set','selkirk pickleball'],
    'spanishTerms':['pickleball','paleta de pickleball'],
    'ecommerceTerms':['Selkirk PRIME S2 Pickleball Paddle','HEAD Radical Tour Pickleball Paddle'],
    'commonSearchPhrases':['pickleball precio','paddle pickleball comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'linterna_camping', 'productName':'Linterna LED / Headlamp / Black Diamond', 'categoryId':'sports_outdoor_variable',
    'aliases':['linterna led','headlamp','linterna frontal','black diamond headlamp'],
    'misspellings':['linterna frontal camping'],
    'englishTerms':['headlamp led','black diamond spot headlamp','rechargeable lantern'],
    'spanishTerms':['linterna frontal','lámpara de cabeza'],
    'ecommerceTerms':['Black Diamond Spot 400 Headlamp','Goal Zero Lighthouse 600 Lantern'],
    'commonSearchPhrases':['linterna headlamp precio','black diamond comprar'],
    'riskOverrideFlags':['battery_possible'], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'chaleco_hidratacion', 'productName':'Chaleco de Hidratación / Camelbak / Osprey', 'categoryId':'sports_outdoor_variable',
    'aliases':['chaleco hidratación','hydration vest','camelbak hydration','osprey hydration'],
    'misspellings':['chaleco de hidratacion'],
    'englishTerms':['hydration vest','camelbak circuit vest','osprey duro lt 1.5'],
    'spanishTerms':['chaleco de hidratación','mochila hidratación'],
    'ecommerceTerms':["CamelBak Circuit Vest 1.5L","Osprey Duro LT 1.5 Running Pack"],
    'commonSearchPhrases':['chaleco hidratación precio','camelbak vest comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  # ══ BABY / KIDS ═══════════════════════════════════════════════════════════
  { 'productKey':'cuna_bebe', 'productName':'Cuna de Bebé / Bassinet / SNOO', 'categoryId':'baby_items',
    'aliases':['cuna bebé','bassinet','snoo smart sleeper','cuna portátil'],
    'misspellings':['cuna de bebe'],
    'englishTerms':['baby crib','bassinet','snoo smart sleeper','portable bassinet'],
    'spanishTerms':['cuna de bebé','moisés'],
    'ecommerceTerms':['SNOO Smart Sleeper Bassinet','Graco Dream Suite Bassinet','HALO BassiNest Swivel Sleeper'],
    'commonSearchPhrases':['cuna bebé precio','bassinet comprar'],
    'riskOverrideFlags':[], 'customerHint':'El cálculo puede variar por el tamaño y peso.', 'adminHint':'Verificar dimensiones.' },

  { 'productKey':'libro_cuentos', 'productName':'Libro Cuentos / Board Books / Dr. Seuss', 'categoryId':'books_printed_material',
    'aliases':['libro cuentos niños','board book','dr seuss','eric carle book'],
    'misspellings':['libro de cuentos'],
    'englishTerms':["children's book","board book","dr. seuss"],
    'spanishTerms':['libro de cuentos','cuento infantil'],
    'ecommerceTerms':['The Very Hungry Caterpillar Board Book','Oh, the Places You\'ll Go! Dr. Seuss'],
    'commonSearchPhrases':['libro cuentos niños precio','dr seuss comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  # ══ MORE AUTOMOTIVE ════════════════════════════════════════════════════════
  { 'productKey':'aspiradora_carro', 'productName':'Aspiradora para Carro / Handheld Car Vac', 'categoryId':'automotive_simple_accessories',
    'aliases':['aspiradora carro','car vacuum','handheld vacuum carro','black decker auto vac'],
    'misspellings':['aspiradora de carro'],
    'englishTerms':['car vacuum cleaner','handheld cordless vacuum'],
    'spanishTerms':['aspiradora portátil para carro'],
    'ecommerceTerms':['ThisWorx Car Vacuum Cleaner','BLACK+DECKER Handheld Cordless Vacuum'],
    'commonSearchPhrases':['aspiradora carro precio'],
    'riskOverrideFlags':['battery_possible'], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'organizador_carro', 'productName':'Organizador Maletero / Trunk Organizer', 'categoryId':'automotive_simple_accessories',
    'aliases':['organizador maletero','trunk organizer','organizador de carro'],
    'misspellings':['organizador de maletero'],
    'englishTerms':['trunk organizer','car trunk storage','back seat organizer'],
    'spanishTerms':['organizador de maletero','organizador para auto'],
    'ecommerceTerms':["Fortem Car Trunk Organizer","Drive Auto Products Car Trunk Organizer"],
    'commonSearchPhrases':['organizador maletero precio'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  # ══ MORE GAMING ════════════════════════════════════════════════════════════
  { 'productKey':'juego_ps5_fisico', 'productName':'Juego Físico PS5 / Xbox / Switch', 'categoryId':'gaming_physical_accessories',
    'aliases':['juego ps5','xbox game disc','switch game card','videojuego físico'],
    'misspellings':['juego de ps5'],
    'englishTerms':['ps5 game disc','xbox series game','nintendo switch game card'],
    'spanishTerms':['juego físico ps5','videojuego ps5'],
    'ecommerceTerms':["Marvel's Spider-Man 2 PS5","Zelda: Tears of the Kingdom Switch"],
    'commonSearchPhrases':['juego ps5 precio','videojuego físico comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'palanca_arcade_usb', 'productName':'Control USB / Gamepad / 8BitDo / Xbox USB', 'categoryId':'gaming_physical_accessories',
    'aliases':['control usb','gamepad','8bitdo','xbox controller usb','dualshock usb'],
    'misspellings':['control para pc usb'],
    'englishTerms':['usb gamepad','8bitdo ultimate','xbox controller for pc'],
    'spanishTerms':['control para pc','gamepad usb'],
    'ecommerceTerms':['8BitDo Ultimate Bluetooth Controller','Microsoft Xbox Wireless Controller'],
    'commonSearchPhrases':['control usb precio','8bitdo comprar'],
    'riskOverrideFlags':['battery_possible'], 'customerHint':'', 'adminHint':'' },

  # ══ SUPPLEMENTS ════════════════════════════════════════════════════════════
  { 'productKey':'proteina_barra', 'productName':'Barras de Proteína / RxBar / Quest Bar', 'categoryId':'supplements_vitamins_nutrition',
    'aliases':['barras proteína','rxbar','quest bar','protein bar','kind bar'],
    'misspellings':['barra de proteina'],
    'englishTerms':['protein bar','rxbar','quest bar'],
    'spanishTerms':['barra de proteína','snack proteico'],
    'ecommerceTerms':['RxBar Protein Bars 12-Pack','Quest Protein Bars Variety Pack'],
    'commonSearchPhrases':['barras proteína precio','rxbar comprar'],
    'riskOverrideFlags':['food','sanitary_review'],
    'customerHint':'Los alimentos importados pueden requerir revisión sanitaria.',
    'adminHint':'Validar SENASA/MINSA.' },

  { 'productKey':'bcaa', 'productName':'BCAA / Aminoácidos Ramificados / Xtend', 'categoryId':'supplements_vitamins_nutrition',
    'aliases':['bcaa','aminoácidos ramificados','xtend bcaa','intra workout'],
    'misspellings':['bcaa aminoacidos'],
    'englishTerms':['bcaa','branched chain amino acids','scivation xtend'],
    'spanishTerms':['aminoácidos bcaa','bcaa en polvo'],
    'ecommerceTerms':["Scivation Xtend BCAA 90 Servings","NOW Sports Branched Chain Amino Acids"],
    'commonSearchPhrases':['bcaa precio','aminoácidos comprar'],
    'riskOverrideFlags':['supplement','sanitary_review'],
    'customerHint':'Los suplementos pueden requerir validación sanitaria.',
    'adminHint':'Revisar CCSS/MINSA.' },

  # ══ OFFICE / STATIONERY ════════════════════════════════════════════════════
  { 'productKey':'pluma_estilografica', 'productName':'Pluma Estilográfica / Fountain Pen / Lamy', 'categoryId':'office_stationery_art',
    'aliases':['pluma estilográfica','fountain pen','lamy safari','pilot metropolitan'],
    'misspellings':['pluma estilograsfica'],
    'englishTerms':['fountain pen','lamy safari','pilot metropolitan'],
    'spanishTerms':['pluma estilográfica','pluma fuente'],
    'ecommerceTerms':['Lamy Safari Fountain Pen','Pilot Metropolitan Fountain Pen'],
    'commonSearchPhrases':['pluma estilográfica precio','lamy safari comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'rotuladores_markers', 'productName':'Rotuladores / Markers / Copic / Tombow', 'categoryId':'office_stationery_art',
    'aliases':['rotuladores','markers','copic markers','tombow dual brush','mildliner'],
    'misspellings':['rotuladores copic'],
    'englishTerms':['copic markers','tombow dual brush pens','zebra mildliner'],
    'spanishTerms':['rotuladores de colores','marcadores copic'],
    'ecommerceTerms':['Copic Sketch Marker Set 12pc','Tombow 56185 Dual Brush Pen Art Markers'],
    'commonSearchPhrases':['copic markers precio','tombow comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  # ══ MISC ELECTRONICS ════════════════════════════════════════════════════
  { 'productKey':'conversor_video', 'productName':'Conversor / Capturadora Video / AV to HDMI', 'categoryId':'computer_accessories',
    'aliases':['conversor av hdmi','video converter','rca to hdmi','av to hdmi adapter'],
    'misspellings':['conversor de video'],
    'englishTerms':['av to hdmi converter','video capture card usb'],
    'spanishTerms':['conversor de video','adaptador av a hdmi'],
    'ecommerceTerms':['Elgato Video Capture','AGPtek RCA to HDMI Converter'],
    'commonSearchPhrases':['conversor av hdmi precio'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'altavoz_portatil_resistente', 'productName':'Bocina Resistente al Agua / JBL Xtreme / Sony XB', 'categoryId':'speakers_home_audio',
    'aliases':['bocina resistente agua','jbl xtreme','sony xb33','waterproof speaker'],
    'misspellings':['bocina resistente al agua'],
    'englishTerms':['waterproof bluetooth speaker','jbl xtreme 3','sony srs-xb43'],
    'spanishTerms':['bocina resistente al agua','parlante impermeable'],
    'ecommerceTerms':['JBL Xtreme 3 Portable Bluetooth Speaker','Sony SRS-XB43 Portable Bluetooth Speaker'],
    'commonSearchPhrases':['bocina waterproof precio','jbl xtreme comprar'],
    'riskOverrideFlags':['battery_possible'], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'camara_360_vehiculo', 'productName':'Cámara 360° Vehículo / Surround View', 'categoryId':'automotive_simple_accessories',
    'aliases':['cámara 360 carro','surround view camera','360 car camera','bird view'],
    'misspellings':['camara 360 vehiculo'],
    'englishTerms':['360 degree car camera','bird eye view camera'],
    'spanishTerms':['cámara 360 para carro','vista de pájaro carro'],
    'ecommerceTerms':['AMTIFO A7 4K Backup Camera','Wolfbox G840H 4K Dash Cam 360'],
    'commonSearchPhrases':['cámara 360 carro precio'],
    'riskOverrideFlags':['battery_possible'], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'extintor_miniatura', 'productName':'Extintor Miniatura / Fire Blanket / First Aid', 'categoryId':'automotive_simple_accessories',
    'aliases':['extintor miniatura','fire blanket','kit primeros auxilios auto','car first aid'],
    'misspellings':['extintor de carro'],
    'englishTerms':['car fire extinguisher','first aid kit car','fire blanket'],
    'spanishTerms':['extintor para carro','kit primeros auxilios'],
    'ecommerceTerms':['Amerex B417 First Aid Kit','PrepAuto Emergency Kit'],
    'commonSearchPhrases':['extintor carro precio','first aid kit auto comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'set_pinceles', 'productName':'Set de Pinceles / Brochas / Princeton / Silver Brush', 'categoryId':'office_stationery_art',
    'aliases':['set pinceles','brochas pintura','princeton brushes','watercolor brush set'],
    'misspellings':['set de pinceles pintura'],
    'englishTerms':['paint brush set','watercolor brushes','princeton velvetouch'],
    'spanishTerms':['juego de pinceles','brochas para pintar'],
    'ecommerceTerms':['Princeton Velvetouch 12-Piece Mixed Media Set','Silver Brush Black Velvet Watercolor'],
    'commonSearchPhrases':['pinceles pintura precio','brush set comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'manguera_jardin', 'productName':'Manguera de Jardín / Expandable Hose / Nozzle', 'categoryId':'tools_hardware_common',
    'aliases':['manguera jardín','expandable hose','manguera expandible','garden hose'],
    'misspellings':['manguera de jardin'],
    'englishTerms':['expandable garden hose','garden hose 50ft'],
    'spanishTerms':['manguera de jardín','manguera expandible'],
    'ecommerceTerms':["Flexi Hose 75ft Expandable Garden Hose","Giraffe Tools Expandable Garden Hose"],
    'commonSearchPhrases':['manguera jardín precio','expandable hose comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'juego_ajedrez', 'productName':'Juego de Ajedrez / Chess Set / Premium', 'categoryId':'toys_common',
    'aliases':['juego ajedrez','chess set','ajedrez de madera','staunton chess'],
    'misspellings':['juego de ajedrez'],
    'englishTerms':['chess set','wooden chess set','staunton chess'],
    'spanishTerms':['juego de ajedrez','ajedrez'],
    'ecommerceTerms':["Yellow Mountain Imports Wooden Chess Set","The House of Staunton Supreme Chess Set"],
    'commonSearchPhrases':['ajedrez precio','chess set comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'almohadilla_calefactora', 'productName':'Almohadilla Calefactora / Heating Pad / TENS', 'categoryId':'medicines_medical_products',
    'aliases':['almohadilla calefactora','heating pad','cojín calentador','electric heat pad'],
    'misspellings':['almohadilla calefactora eléctrica'],
    'englishTerms':['heating pad','electric heating pad','moist heat pad'],
    'spanishTerms':['almohadilla eléctrica','cojín de calor'],
    'ecommerceTerms':['Pure Enrichment PureRelief XL Heating Pad','Sunbeam Standard Heating Pad'],
    'commonSearchPhrases':['almohadilla calefactora precio','heating pad comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'aceite_motor', 'productName':'Aceite de Motor / Mobil 1 / Castrol / Synthetic', 'categoryId':'automotive_simple_accessories',
    'aliases':['aceite motor','mobil 1','castrol edge','aceite sintético motor'],
    'misspellings':['aceite de motor sintético'],
    'englishTerms':['motor oil','mobil 1 full synthetic','castrol edge'],
    'spanishTerms':['aceite de motor','lubricante motor'],
    'ecommerceTerms':["Mobil 1 Full Synthetic Motor Oil 5W-30","Castrol Edge Full Synthetic 0W-20"],
    'commonSearchPhrases':['aceite motor precio','mobil 1 comprar'],
    'riskOverrideFlags':['chemical','liquid'], 'customerHint':'', 'adminHint':'Revisar restricciones de líquidos y químicos.' },

  { 'productKey':'sofa_pequeno', 'productName':'Sofá Pequeño / Loveseat / Chaise / Futon', 'categoryId':'home_decor_storage',
    'aliases':['sofá pequeño','loveseat','chaise lounge','futon','sofa compacto'],
    'misspellings':['sofa pequeño'],
    'englishTerms':['loveseat sofa','futon sofa bed','chaise lounge'],
    'spanishTerms':['sofá pequeño','loveseat'],
    'ecommerceTerms':["DHP Emily Futon Sofa Bed","ZINUS Shalini Sofa"],
    'commonSearchPhrases':['loveseat precio','futon comprar'],
    'riskOverrideFlags':[], 'customerHint':'El cálculo puede variar significativamente por el tamaño y peso.', 'adminHint':'Verificar dimensiones — puede ser artículo de grandes dimensiones.' },

  { 'productKey':'deshumidificador', 'productName':'Deshumidificador / Dehumidifier / Frigidaire', 'categoryId':'home_decor_storage',
    'aliases':['deshumidificador','dehumidifier','frigidaire dehumidifier','portable dehumidifier'],
    'misspellings':['deshumidificador eléctrico'],
    'englishTerms':['dehumidifier','frigidaire 35-pint dehumidifier'],
    'spanishTerms':['deshumidificador'],
    'ecommerceTerms':['Frigidaire FGAC5044W1 Dehumidifier','hOmeLabs 4,500 Sq. Ft. Dehumidifier'],
    'commonSearchPhrases':['deshumidificador precio','dehumidifier comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'faja_abdomen', 'productName':'Faja Reductora / Waist Trainer / Body Shaper', 'categoryId':'clothing_general',
    'aliases':['faja reductora','waist trainer','body shaper','faja adelgazante'],
    'misspellings':['faja de abdomen'],
    'englishTerms':['waist trainer','body shaper','compression garment'],
    'spanishTerms':['faja reductora','modeladora'],
    'ecommerceTerms':["Rago Style 6210 Body Briefer","YIANNA Waist Trainer Belt"],
    'commonSearchPhrases':['faja reductora precio','waist trainer comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'extension_cabello', 'productName':'Extensiones de Cabello / Clip In / Halo', 'categoryId':'beauty_skincare_personal_care',
    'aliases':['extensiones cabello','clip in extensions','halo hair extensions','remy hair'],
    'misspellings':['extensiones de cabello'],
    'englishTerms':['hair extensions clip in','halo hair extension','remy hair'],
    'spanishTerms':['extensiones de cabello','mechones de cabello'],
    'ecommerceTerms':["ZALA Clip In Hair Extensions","Luxy Hair Clip-In Hair Extensions"],
    'commonSearchPhrases':['extensiones cabello precio','clip in extensions comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'planta_suculenta_set', 'productName':'Set de Suculentas / Cactus / Mini Plantas', 'categoryId':'plants_seeds_agro_review',
    'aliases':['set suculentas','mini cactus pack','planta suculenta set','miniature plants'],
    'misspellings':['set de suculentas'],
    'englishTerms':['succulent set','mini cactus collection','assorted succulents'],
    'spanishTerms':['set de suculentas','colección de cactus'],
    'ecommerceTerms':["Leaf & Clay Succulent Collection 20-Pack","Mountain Crest Gardens Succulent Set"],
    'commonSearchPhrases':['set suculentas precio','suculentas comprar'],
    'riskOverrideFlags':['agro','phytosanitary_review'],
    'customerHint':'Las plantas vivas requieren revisión fitosanitaria para ingresar a Costa Rica.',
    'adminHint':'Validar SFE/SENASA — fitosanitario obligatorio.' },

  { 'productKey':'sombrero_sol', 'productName':'Sombrero de Sol / Hat / Bucket Hat / Porkpie', 'categoryId':'clothing_accessories',
    'aliases':['sombrero sol','sun hat','bucket hat','porkpie hat','sombrero de playa'],
    'misspellings':['sombrero de sol'],
    'englishTerms':['sun hat','bucket hat','wide brim sun hat'],
    'spanishTerms':['sombrero de sol','sombrero de playa'],
    'ecommerceTerms':["Sunday Afternoons Ultra Adventure Hat","Carhartt Bucket Hat"],
    'commonSearchPhrases':['sombrero sol precio','bucket hat comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'pesas_tobilleras', 'productName':'Pesas Tobilleras / Muñequeras / Ankle Weights', 'categoryId':'sports_fitness_physical',
    'aliases':['pesas tobilleras','ankle weights','pesas muñecas','wrist weights'],
    'misspellings':['pesas de tobillo'],
    'englishTerms':['ankle weights','wrist weights'],
    'spanishTerms':['pesas para tobillos','pesas tobilleras'],
    'ecommerceTerms':['Bala Bangles Ankle Weights','REEHUT Ankle Weights 2-Pack'],
    'commonSearchPhrases':['pesas tobilleras precio','ankle weights comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'taza_termica_cafe', 'productName':'Taza Térmica Café / To-Go Mug / Thermos', 'categoryId':'home_kitchen_appliances',
    'aliases':['taza térmica café','travel mug','coffee to-go','yeti travel mug'],
    'misspellings':['taza termica para cafe'],
    'englishTerms':['travel coffee mug','insulated travel mug'],
    'spanishTerms':['taza de café para llevar','taza térmica'],
    'ecommerceTerms':['Contigo Autoseal West Loop Travel Mug','YETI Rambler 14oz Travel Mug'],
    'commonSearchPhrases':['taza café térmica precio','travel mug comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'luz_amanecer', 'productName':'Lámpara Amanecer / Wake-Up Light / Philips HF', 'categoryId':'home_decor_storage',
    'aliases':['lámpara amanecer','wake-up light','philips hf3520','sunrise alarm'],
    'misspellings':['lampara amanecer'],
    'englishTerms':['wake-up light','sunrise alarm clock','philips smartsleep'],
    'spanishTerms':['lámpara de amanecer','despertador luz solar'],
    'ecommerceTerms':['Philips SmartSleep Wake-Up Light HF3520','Hatch Restore 2 Sound Machine'],
    'commonSearchPhrases':['lámpara amanecer precio','wake-up light comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'robot_cocina_cortar', 'productName':'Procesador de Alimentos / Cortadora / Cuisinart', 'categoryId':'home_kitchen_appliances',
    'aliases':['procesador alimentos','food processor','cuisinart','cortadora de vegetales'],
    'misspellings':['procesador de alimentos cuisinart'],
    'englishTerms':['food processor','cuisinart dlc-8sy','ninja express chop'],
    'spanishTerms':['procesador de alimentos','picadora eléctrica'],
    'ecommerceTerms':['Cuisinart DFP-14BCNY 14-Cup Food Processor','Ninja Express Chop NJ110GR'],
    'commonSearchPhrases':['procesador alimentos precio','cuisinart comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

]

# ── Insert into JS ────────────────────────────────────────────────────────────
JS_MARKER = '    // ════════════════ TASK #384 EXPANSION BATCH 3 ════════════════'

with open('js/product-categories.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

insert_pos = js_content.find(JS_MARKER)
if insert_pos == -1:
    print('ERROR: JS marker not found', file=sys.stderr); sys.exit(1)

new_js_block = '\n    // ════════════════ TASK #384 EXPANSION BATCH 4 ════════════════\n'
new_js_block += '\n'.join(row_to_js(r) for r in BATCH4)
new_js_block += '\n'

js_new = js_content[:insert_pos] + new_js_block + js_content[insert_pos:]

with open('js/product-categories.js', 'w', encoding='utf-8') as f:
    f.write(js_new)

print(f'JS: inserted {len(BATCH4)} rows in batch 4')

# ── Insert into JSON ──────────────────────────────────────────────────────────
with open('data/product-brain.json', 'r', encoding='utf-8') as f:
    json_data = json.load(f)

for r in BATCH4:
    row = {
        'productKey': r['productKey'], 'productName': r['productName'],
        'categoryId': r['categoryId'],
        'aliases': r.get('aliases',[]), 'misspellings': r.get('misspellings',[]),
        'englishTerms': r.get('englishTerms',[]), 'spanishTerms': r.get('spanishTerms',[]),
        'ecommerceTerms': r.get('ecommerceTerms',[]),
        'commonSearchPhrases': r.get('commonSearchPhrases',[]),
        'riskOverrideFlags': r.get('riskOverrideFlags',[]),
        'customerHint': r.get('customerHint',''), 'adminHint': r.get('adminHint',''),
    }
    json_data['products'].append(row)

with open('data/product-brain.json', 'w', encoding='utf-8') as f:
    json.dump(json_data, f, ensure_ascii=False, indent=2)

print(f'JSON: now has {len(json_data["products"])} products, {len(json_data["categories"])} categories')
