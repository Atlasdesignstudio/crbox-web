#!/usr/bin/env python3
"""Task #384 — Product Brain Expansion Batch 5 (25 rows → push total past 700)."""
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

BATCH5 = [

  { 'productKey':'tablet_android_basica', 'productName':'Tablet Android / Samsung Tab A / Lenovo Tab', 'categoryId':'tablets_ereaders',
    'aliases':['tablet android','samsung tab a9','lenovo tab m10','android tablet barata'],
    'misspellings':['tableta android'],
    'englishTerms':['android tablet','samsung galaxy tab a9','lenovo tab m10 plus'],
    'spanishTerms':['tableta android','tablet económica'],
    'ecommerceTerms':['Samsung Galaxy Tab A9+','Lenovo Tab M10 Plus (3rd Gen)'],
    'commonSearchPhrases':['tablet android precio','samsung tab comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'kindle_paperwhite', 'productName':'Kindle Paperwhite / Kindle Oasis / E-Reader', 'categoryId':'tablets_ereaders',
    'aliases':['kindle paperwhite','kindle oasis','e-reader','kobo libra'],
    'misspellings':['kindle paperwhite amazon'],
    'englishTerms':['kindle paperwhite signature edition','kobo libra 2'],
    'spanishTerms':['lector de libros electrónico','kindle'],
    'ecommerceTerms':['Kindle Paperwhite Signature Edition','Kobo Libra 2 E-Reader'],
    'commonSearchPhrases':['kindle paperwhite precio','e-reader comprar'],
    'riskOverrideFlags':['battery_possible'], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'calentador_agua_portatil', 'productName':'Calentador Agua Portátil / Tankless / Camping', 'categoryId':'home_kitchen_appliances',
    'aliases':['calentador agua portátil','tankless water heater','camping water heater'],
    'misspellings':['calentador de agua portatil'],
    'englishTerms':['portable water heater','tankless instant water heater'],
    'spanishTerms':['calentador de agua portátil','ducha portátil'],
    'ecommerceTerms':['Eccotemp L5 Portable Outdoor Tankless Water Heater','FOGATTI Tankless Water Heater'],
    'commonSearchPhrases':['calentador agua portátil precio'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'impresora_3d_basica', 'productName':'Impresora 3D / Creality Ender / Bambu Lab', 'categoryId':'computers_main_parts',
    'aliases':['impresora 3d','creality ender 3','bambu lab x1','3d printer'],
    'misspellings':['impresora 3D creality'],
    'englishTerms':['3d printer','creality ender 3 v3','bambu lab x1 carbon'],
    'spanishTerms':['impresora 3d','impresora tridimensional'],
    'ecommerceTerms':['Creality Ender-3 V3 SE 3D Printer','Bambu Lab X1-Carbon 3D Printer'],
    'commonSearchPhrases':['impresora 3d precio','creality ender comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'filamento_pla', 'productName':'Filamento PLA / PETG / ABS / 3D Printing', 'categoryId':'computers_main_parts',
    'aliases':['filamento pla','petg filament','abs filament','hatchbox pla','overture pla'],
    'misspellings':['filamento para impresora 3d'],
    'englishTerms':['pla filament 1kg','petg filament','overture pla plus'],
    'spanishTerms':['filamento pla','filamento para impresora 3d'],
    'ecommerceTerms':['Hatchbox PLA 1.75mm 1kg','Overture PETG Filament 1kg'],
    'commonSearchPhrases':['filamento pla precio','petg filament comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'calculadora_financiera', 'productName':'Calculadora Financiera / HP 12C / Texas BA II', 'categoryId':'computer_accessories',
    'aliases':['calculadora financiera','hp 12c','texas ba ii','calculadora hp'],
    'misspellings':['calculadora financiera hp'],
    'englishTerms':['financial calculator','hp 12c platinum','texas instruments ba ii plus'],
    'spanishTerms':['calculadora financiera','calculadora para finanzas'],
    'ecommerceTerms':['HP 12C Financial Calculator','Texas Instruments BA II Plus Financial Calculator'],
    'commonSearchPhrases':['calculadora financiera precio','hp 12c comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'casco_moto', 'productName':'Casco Motocicleta / Shoei / AGV / Bell', 'categoryId':'automotive_simple_accessories',
    'aliases':['casco moto','shoei','agv','bell helmet','casco de motocicleta'],
    'misspellings':['casco de moto'],
    'englishTerms':['motorcycle helmet','shoei rf-sr2','agv k6s'],
    'spanishTerms':['casco de motocicleta','casco moto'],
    'ecommerceTerms':['Shoei RF-SR2 Full-Face Helmet','AGV K6S Helmet','Bell Qualifier DLX MIPS'],
    'commonSearchPhrases':['casco moto precio','shoei comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'guantes_moto', 'productName':'Guantes Moto / Riding Gloves / Alpinestars', 'categoryId':'automotive_simple_accessories',
    'aliases':['guantes moto','alpinestars gloves','dainese gloves','riding gloves'],
    'misspellings':['guantes de moto'],
    'englishTerms':['motorcycle gloves','alpinestars sp-8 v3','dainese air master'],
    'spanishTerms':['guantes de moto','guantes de motociclista'],
    'ecommerceTerms':["Alpinestars SP-8 V3 Gloves","Dainese Air Master Gloves"],
    'commonSearchPhrases':['guantes moto precio','alpinestars comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'perfume_importado', 'productName':'Perfume / Colonia Importada / Dior / Chanel', 'categoryId':'beauty_skincare_personal_care',
    'aliases':['perfume importado','colonia dior','chanel perfume','versace eros','creed aventus'],
    'misspellings':['perfume importado dior'],
    'englishTerms':['perfume','dior sauvage edp','chanel no. 5'],
    'spanishTerms':['perfume importado','colonia'],
    'ecommerceTerms':["Dior Sauvage EDP 100ml","Chanel No. 5 EDP 50ml","Creed Aventus EDP"],
    'commonSearchPhrases':['perfume dior precio','chanel perfume comprar'],
    'riskOverrideFlags':['liquid','aerosol'],
    'customerHint':'Los perfumes son líquidos inflamables — pueden tener restricciones de transporte.',
    'adminHint':'Revisar normativa de líquidos inflamables.' },

  { 'productKey':'colonia_hombre', 'productName':'Colonia Hombre / Paco Rabanne / Armani / Bleu', 'categoryId':'beauty_skincare_personal_care',
    'aliases':['colonia hombre','paco rabanne','armani acqua di gio','bleu de chanel'],
    'misspellings':['colonia para hombre'],
    'englishTerms':["paco rabanne 1 million","armani acqua di gio","bleu de chanel"],
    'spanishTerms':['colonia para hombre','fragancia masculina'],
    'ecommerceTerms':["Paco Rabanne 1 Million EDT 100ml","Armani Acqua di Giò EDP 75ml"],
    'commonSearchPhrases':['colonia hombre precio','acqua di gio comprar'],
    'riskOverrideFlags':['liquid','aerosol'],
    'customerHint':'Los perfumes son líquidos inflamables — pueden tener restricciones de transporte.',
    'adminHint':'Revisar normativa de líquidos inflamables.' },

  { 'productKey':'maquina_depilacion_laser', 'productName':'Dispositivo Depilación Láser / IPL / Braun Silk Expert', 'categoryId':'beauty_devices',
    'aliases':['depilación láser hogar','ipl device','braun silk expert','ulike laser'],
    'misspellings':['depilacion laser casera'],
    'englishTerms':['ipl hair removal','braun silk expert pro 5','ulike laser hair removal'],
    'spanishTerms':['depiladora láser hogar','dispositivo ipl'],
    'ecommerceTerms':["Braun Silk Expert Pro 5 IPL","Ulike Air3 IPL Hair Removal"],
    'commonSearchPhrases':['depilación láser hogar precio','ipl comprar'],
    'riskOverrideFlags':['medical'], 'customerHint':'', 'adminHint':'Verificar clasificación médica.' },

  { 'productKey':'pantuflas_ugg', 'productName':'Pantuflas / UGG / Slipper / Sherpa', 'categoryId':'footwear_complete',
    'aliases':['pantuflas','ugg slipper','sherpa slipper','house shoes'],
    'misspellings':['pantuflas ugg'],
    'englishTerms':['slippers','ugg ansley slippers','minnetonka sherpa'],
    'spanishTerms':['pantuflas','zapatillas de casa'],
    'ecommerceTerms':['UGG Ansley Slippers','Minnetonka Cally Slipper','Amazon Essentials Sherpa Slipper'],
    'commonSearchPhrases':['pantuflas precio','ugg slipper comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'camiseta_vintage', 'productName':'Camiseta Vintage / Oversized / Graphic Tee', 'categoryId':'clothing_general',
    'aliases':['camiseta vintage','graphic tee','oversized tee','vintage t-shirt'],
    'misspellings':['camiseta vintage oversized'],
    'englishTerms':['vintage graphic tee','oversized t-shirt'],
    'spanishTerms':['camiseta vintage','remera oversize'],
    'ecommerceTerms':["Hanes Originals Superweight T-Shirt","Uniqlo UT Graphic T-Shirt"],
    'commonSearchPhrases':['camiseta vintage precio','graphic tee comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'disco_externo_ssd', 'productName':'Disco Externo SSD / Samsung T7 / Seagate', 'categoryId':'storage_memory',
    'aliases':['disco externo ssd','samsung t7','seagate backup plus','portable ssd'],
    'misspellings':['disco duro externo ssd'],
    'englishTerms':['portable ssd','samsung t7 portable ssd','seagate firecuda ssd'],
    'spanishTerms':['disco externo ssd','almacenamiento portátil ssd'],
    'ecommerceTerms':['Samsung T7 Shield Portable SSD 1TB','Seagate FireCuda Gaming SSD 1TB'],
    'commonSearchPhrases':['disco externo ssd precio','samsung t7 comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'lector_nfc', 'productName':'Lector NFC / RFID / ACR122U', 'categoryId':'computer_accessories',
    'aliases':['lector nfc','rfid reader','acr122u','nfc writer'],
    'misspellings':['lector nfc rfid'],
    'englishTerms':['nfc reader writer','acr122u nfc reader'],
    'spanishTerms':['lector nfc','lector rfid'],
    'ecommerceTerms':['ACS ACR122U NFC Reader','MFRC522 RFID Card Reader'],
    'commonSearchPhrases':['lector nfc precio','acr122u comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'bicicleta_spinning', 'productName':'Bicicleta Spinning / Stationary / Peloton / NordicTrack', 'categoryId':'sports_fitness_physical',
    'aliases':['bicicleta spinning','bicicleta estacionaria','peloton','nordictrack s22i'],
    'misspellings':['bicicleta de spinning'],
    'englishTerms':['spin bike','stationary bike','peloton bike'],
    'spanishTerms':['bicicleta estacionaria','ciclo indoor'],
    'ecommerceTerms':['NordicTrack Commercial S22i Studio Cycle','Schwinn IC4 Indoor Cycling Bike'],
    'commonSearchPhrases':['bicicleta spinning precio','nordictrack comprar'],
    'riskOverrideFlags':[], 'customerHint':'El cálculo puede variar por el peso considerable.', 'adminHint':'Verificar peso y dimensiones.' },

  { 'productKey':'tapete_cocina_anti', 'productName':'Tapete Antifatiga / Kitchen Mat / Anti-Fatigue', 'categoryId':'home_kitchen_appliances',
    'aliases':['tapete antifatiga','kitchen mat','anti-fatigue mat','tapete de cocina'],
    'misspellings':['tapete anti fatiga'],
    'englishTerms':['anti-fatigue kitchen mat','standing desk mat'],
    'spanishTerms':['tapete antifatiga','alfombra de cocina'],
    'ecommerceTerms':["Topo Comfort Mat by Ergodriven","ComfiLife Anti Fatigue Floor Mat"],
    'commonSearchPhrases':['tapete antifatiga precio','kitchen mat comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'pistola_masaje', 'productName':'Pistola de Masaje / Theragun / Hypervolt', 'categoryId':'medicines_medical_products',
    'aliases':['pistola masaje','theragun','hypervolt','massage gun','percussive massager'],
    'misspellings':['pistola de masaje'],
    'englishTerms':['massage gun','theragun prime','hyperice hypervolt 2'],
    'spanishTerms':['pistola de masaje','masajeador percusivo'],
    'ecommerceTerms':['Theragun Prime Plus','Hyperice Hypervolt 2 Pro'],
    'commonSearchPhrases':['pistola masaje precio','theragun comprar'],
    'riskOverrideFlags':['battery_possible'], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'set_destornilladores', 'productName':'Set Destornilladores / iFixit / Wiha / Precision', 'categoryId':'tools_hardware_common',
    'aliases':['set destornilladores','wiha','ifixit','precision screwdriver set'],
    'misspellings':['set de destornilladores'],
    'englishTerms':['screwdriver set','wiha insulated screwdriver set','ifixit pro tech toolkit'],
    'spanishTerms':['juego de destornilladores','set de puntas'],
    'ecommerceTerms':['iFixit Pro Tech Toolkit 70-piece','Wiha 26193 Insulated Screwdriver Set'],
    'commonSearchPhrases':['set destornilladores precio','ifixit toolkit comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'reloj_garmin_gps', 'productName':'Reloj GPS / Garmin Fenix / Forerunner', 'categoryId':'watches_jewelry',
    'aliases':['garmin fenix','garmin forerunner','gps watch','reloj gps running'],
    'misspellings':['garmin fenix reloj'],
    'englishTerms':['garmin fenix 7','garmin forerunner 965','gps running watch'],
    'spanishTerms':['reloj gps garmin','reloj deportivo gps'],
    'ecommerceTerms':['Garmin Fenix 7 Sapphire Solar','Garmin Forerunner 965'],
    'commonSearchPhrases':['garmin fenix precio','reloj gps comprar'],
    'riskOverrideFlags':['battery_possible'], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'silla_ergonomica_lujo', 'productName':'Silla Ergonómica / Herman Miller / Steelcase', 'categoryId':'office_stationery_art',
    'aliases':['silla ergonómica','herman miller aeron','steelcase leap','silla gaming ergonómica'],
    'misspellings':['silla ergonomica herman miller'],
    'englishTerms':['ergonomic office chair','herman miller aeron','steelcase leap v2'],
    'spanishTerms':['silla ergonómica premium','silla de oficina ergonómica'],
    'ecommerceTerms':['Herman Miller Aeron Chair','Steelcase Leap V2 Ergonomic Chair'],
    'commonSearchPhrases':['silla ergonómica precio','herman miller comprar'],
    'riskOverrideFlags':[], 'customerHint':'El cálculo puede variar por el tamaño y peso.', 'adminHint':'Verificar peso y dimensiones.' },

  { 'productKey':'grabadora_voz', 'productName':'Grabadora de Voz / Zoom H / Tascam / Dictaphone', 'categoryId':'microphones_audio_pro',
    'aliases':['grabadora voz','zoom h4n','tascam dr-40x','dictaphone','voice recorder'],
    'misspellings':['grabadora de voz zoom'],
    'englishTerms':['voice recorder','zoom h4n pro','tascam dr-40x'],
    'spanishTerms':['grabadora de voz','dictáfono'],
    'ecommerceTerms':['Zoom H4n Pro Portable Multitrack Recorder','Tascam DR-40X Four-Track Digital Audio Recorder'],
    'commonSearchPhrases':['grabadora voz precio','zoom h4n comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'impresora_etiquetas', 'productName':'Impresora de Etiquetas / Dymo / Brother QL', 'categoryId':'computer_accessories',
    'aliases':['impresora etiquetas','dymo labelwriter','brother ql','label printer'],
    'misspellings':['impresora de etiquetas dymo'],
    'englishTerms':['label printer','dymo labelwriter 550','brother ql-820nwbc'],
    'spanishTerms':['impresora de etiquetas','impresora de código de barras'],
    'ecommerceTerms':['Dymo LabelWriter 550','Brother QL-820NWBc Label Printer'],
    'commonSearchPhrases':['impresora etiquetas precio','dymo comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'medias_compresion', 'productName':'Medias de Compresión / Compression Socks / CEP', 'categoryId':'clothing_general',
    'aliases':['medias compresión','compression socks','cep socks','medias de vuelo'],
    'misspellings':['medias de compresion'],
    'englishTerms':['compression socks','cep compression socks','travel compression socks'],
    'spanishTerms':['medias de compresión','calcetines de compresión'],
    'ecommerceTerms':['CEP Run 3.0 Compression Socks','Sockwell Circulator Compression Socks'],
    'commonSearchPhrases':['medias compresión precio','compression socks comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

  { 'productKey':'set_cubos_rubik', 'productName':'Cubo de Rubik / Speed Cube / GAN / MoYu', 'categoryId':'toys_common',
    'aliases':['cubo rubik','speed cube','gan 356','moyu rs3m','puzzle cube'],
    'misspellings':['cubo de rubik','speed cubo'],
    'englishTerms':["rubik's cube","speed cube","gan 356 m pro"],
    'spanishTerms':['cubo de rubik','cubo mágico'],
    'ecommerceTerms':["GAN 356 M Pro 3x3 Speed Cube","MoYu RS3M 2020 Speed Cube"],
    'commonSearchPhrases':['cubo rubik precio','speed cube comprar'],
    'riskOverrideFlags':[], 'customerHint':'', 'adminHint':'' },

]

# ── Insert into JS ────────────────────────────────────────────────────────────
JS_MARKER = '    // ════════════════ TASK #384 EXPANSION BATCH 4 ════════════════'

with open('js/product-categories.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

insert_pos = js_content.find(JS_MARKER)
if insert_pos == -1:
    print('ERROR: JS marker not found', file=sys.stderr); sys.exit(1)

new_js_block = '\n    // ════════════════ TASK #384 EXPANSION BATCH 5 ════════════════\n'
new_js_block += '\n'.join(row_to_js(r) for r in BATCH5)
new_js_block += '\n'

js_new = js_content[:insert_pos] + new_js_block + js_content[insert_pos:]

with open('js/product-categories.js', 'w', encoding='utf-8') as f:
    f.write(js_new)

print(f'JS: inserted {len(BATCH5)} rows in batch 5')

# ── Insert into JSON ──────────────────────────────────────────────────────────
with open('data/product-brain.json', 'r', encoding='utf-8') as f:
    json_data = json.load(f)

for r in BATCH5:
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
