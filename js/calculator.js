document.addEventListener('DOMContentLoaded', function() {
    const calculateBtn = document.getElementById('calculate-btn');
    const resultSection = document.getElementById('result-section');
    
    const serviceTypeSelect = document.getElementById('service-type');
    const weightInput = document.getElementById('weight');
    const purchaseValueInput = document.getElementById('purchase-value');
    const destinationSelect = document.getElementById('destination');
    
    const shippingCostEl = document.getElementById('shipping-cost');
    const fuelSurchargeEl = document.getElementById('fuel-surcharge');
    const handlingCostEl = document.getElementById('handling-cost');
    const taxCostEl = document.getElementById('tax-cost');
    const deliveryCostEl = document.getElementById('delivery-cost');
    const totalCostEl = document.getElementById('total-cost');
    const weightAppliedEl = document.getElementById('weight-applied');
    const insuranceCostEl = document.getElementById('insurance-cost');
    
    // Toggle visibility of dimensions based on service type
    serviceTypeSelect.addEventListener('change', function() {
        const dimensionsContainer = document.getElementById('dimensions-container');
        if (this.value === 'maritimo') {
            dimensionsContainer.classList.remove('hidden');
        } else {
            dimensionsContainer.classList.add('hidden');
        }
    });
    
    // Calculate button click handler
    calculateBtn.addEventListener('click', function() {
        const serviceType = serviceTypeSelect.value;
        const weight = parseFloat(weightInput.value) || 0;
        const purchaseValue = parseFloat(purchaseValueInput.value) || 0;
        const destination = destinationSelect.value;
        
        // Validate inputs
        if (weight <= 0 || purchaseValue <= 0) {
            alert('Por favor ingrese un peso y valor de compra válidos.');
            return;
        }
        
        // Calculate costs
        const costs = calculateCosts(serviceType, weight, purchaseValue, destination);
        
        // Update UI
        shippingCostEl.textContent = `$${costs.shipping.toFixed(2)}`;
        fuelSurchargeEl.textContent = `$${costs.fuelSurcharge.toFixed(2)}`;
        handlingCostEl.textContent = `$${costs.handling.toFixed(2)}`;
        taxCostEl.textContent = `$${costs.taxes.toFixed(2)}`;
        deliveryCostEl.textContent = `$${costs.delivery.toFixed(2)}`;
        insuranceCostEl.textContent = `$${costs.insurance.toFixed(2)}`;
        totalCostEl.textContent = `$${costs.total.toFixed(2)}`;
        
        // Mostrar el peso aplicado (si es aplicable)
        if (costs.volumetricWeight > weight) {
            weightAppliedEl.textContent = `Peso aplicado: ${costs.applicableWeight.toFixed(2)} kg (volumétrico)`;
        } else {
            weightAppliedEl.textContent = `Peso aplicado: ${costs.applicableWeight.toFixed(2)} kg (real)`;
        }
        
        // Show results
        resultSection.classList.remove('hidden');
        
        // Scroll to results
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    
    function calculateCosts(serviceType, weight, purchaseValue, destination) {
        let shippingCost = 0;
        let handlingCost = 0;
        let taxesEstimate = 0;
        let deliveryCost = 0;
        let fuelSurcharge = 0;
        let volumetricWeight = 0;
        let applicableWeight = weight;
        let insuranceCost = 0;
        
        // Calcular peso volumétrico si hay dimensiones
        const lengthInput = document.getElementById('length');
        const widthInput = document.getElementById('width');
        const heightInput = document.getElementById('height');
        
        if (lengthInput && widthInput && heightInput) {
            const length = parseFloat(lengthInput.value) || 0;
            const width = parseFloat(widthInput.value) || 0;
            const height = parseFloat(heightInput.value) || 0;
            
            if (length > 0 && width > 0 && height > 0) {
                volumetricWeight = (length * width * height) / 6000;
                applicableWeight = Math.max(weight, volumetricWeight);
            }
        }
        
        // Calculate shipping cost based on weight and service type
        if (serviceType === 'aero') {
            // Tarifa de carga aérea basada en el peso aplicable
            if (applicableWeight <= 0.5) shippingCost = 5;
            else if (applicableWeight <= 1) shippingCost = 7;
            else if (applicableWeight <= 2) shippingCost = 11;
            else if (applicableWeight <= 3) shippingCost = 15;
            else if (applicableWeight <= 4) shippingCost = 19;
            else if (applicableWeight <= 5) shippingCost = 23;
            else if (applicableWeight <= 6) shippingCost = 27;
            else if (applicableWeight <= 7) shippingCost = 32;
            else if (applicableWeight <= 8) shippingCost = 36;
            else if (applicableWeight <= 9) shippingCost = 40;
            else if (applicableWeight <= 10) shippingCost = 44;
            else if (applicableWeight <= 11) shippingCost = 48;
            else if (applicableWeight <= 12) shippingCost = 52;
            else if (applicableWeight <= 13) shippingCost = 56;
            else if (applicableWeight <= 14) shippingCost = 60;
            else if (applicableWeight <= 15) shippingCost = 64;
            else if (applicableWeight <= 16) shippingCost = 68;
            else if (applicableWeight <= 17) shippingCost = 72;
            else if (applicableWeight <= 18) shippingCost = 76;
            else if (applicableWeight <= 19) shippingCost = 80;
            else if (applicableWeight <= 20) shippingCost = 84;
            else if (applicableWeight <= 100) shippingCost = 84 + ((applicableWeight - 20) * 3);
            else shippingCost = 84 + ((100 - 20) * 3) + ((applicableWeight - 100) * 2.3);
        } else {
            // Tarifa marítima (simplificado)
            const estimatedCubicFeet = applicableWeight / 10;
            shippingCost = estimatedCubicFeet * 18.00;
        }
        
        // Calcular recargo por combustible (19% del flete)
        fuelSurcharge = shippingCost * 0.19;
        
        // Calcular cargo por manejo basado en el valor de compra con los nuevos rangos
        if (purchaseValue < 20) handlingCost = 1.5;
        else if (purchaseValue < 30) handlingCost = 3.5;
        else if (purchaseValue < 50) handlingCost = 5.5;
        else if (purchaseValue < 100) handlingCost = 7;
        else if (purchaseValue < 200) handlingCost = 14;
        else if (purchaseValue < 250) handlingCost = 25;
        else if (purchaseValue < 500) handlingCost = 35;
        else if (purchaseValue < 1000) handlingCost = 45;
        else if (purchaseValue < 2500) handlingCost = 100;
        else if (purchaseValue < 5000) handlingCost = 125;
        else if (purchaseValue < 10000) handlingCost = 150;
        else if (purchaseValue < 15000) handlingCost = 175;
        else handlingCost = purchaseValue * 0.005; // 0.5% del valor
        
        // Calcular impuestos estimados basados en el tipo de producto
        const cifValue = purchaseValue + shippingCost;
        let taxPercent = 0.13; // Valor base del impuesto (13%)
        
        // Obtener el tipo de producto seleccionado
        const packageContentSelect = document.getElementById('package-content');
        if (packageContentSelect) {
            const packageContent = packageContentSelect.value;
            
            // Mapeo de categorías y sus porcentajes de impuestos
            const taxPercentages = {
                'accesorios_impresora': 0.13,
                'adaptador': 0.13,
                'adornos': 0.2995,
                'alarma': 0.1413,
                'alfombra': 0.2995,
                'amortiguadores': 0.4278,
                'amplificador': 0.1413,
                'amplificador_grabador': 0.4927,
                'antena': 0.1413,
                'anteojos': 0.2995,
                'aros_bicicleta': 0.2430,
                'aros_carro_moto': 0.4278,
                'arrancador': 0.4278,
                'articulos_fiesta': 0.2995,
                'aspiradora': 0.4927,
                'auricular_telefono': 0.1413,
                'baterias': 0.4238,
                'bicicleta_economica': 0.13,
                'bicicleta_cara': 0.2995,
                'binoculares': 0.2995,
                'bocina': 0.1413,
                'bola': 0.2430,
                'bomba_aceite_agua': 0.1413,
                'bombillos': 0.1978,
                'bujias': 0.4278,
                'cables_electricos': 0.2995,
                'calculadora': 0.13,
                'camara': 0.1413,
                'cana_pescar': 0.2430,
                'cargador': 0.1413,
                'casco_seguridad': 0.29,
                'case_cpu': 0.2995,
                'cds': 0.1413,
                'celulares': 0.13,
                'cinturon': 0.4278,
                'cluth': 0.4278,
                'coche_bebe': 0.2995,
                'colchon': 0.2995,
                'computadora': 0.13,
                'consola_videojuegos': 0.4927,
                'control_remoto': 0.1413,
                'cortinas': 0.2995,
                'disco_duro': 0.13,
                'diskman_walkman': 0.4927,
                'dvds': 0.2430,
                'electrodomesticos': 0.4927,
                'equipo_sonido': 0.4927,
                'equipo_karaoke': 0.4927,
                'filtro_aceite_aire': 0.2430,
                'filtro_agua': 0.1413,
                'fluorescente': 0.2995,
                'fotocopiadora': 0.1413,
                'fuente_poder': 0.1413,
                'gata_hidraulica': 0.1413,
                'gorras': 0.2995,
                'griferia': 0.2995,
                'guitarra_acustica': 0.2995,
                'guitarra_electrica': 0.2430,
                'herramientas': 0.2430,
                'home_teather': 0.4927,
                'impresora': 0.13,
                'instrumentos_musicales': 0.2995,
                'ipod_mp3_mp4': 0.4927,
                'joyeria_bisuteria': 0.2995,
                'juego_mesa': 0.2995,
                'juguetes': 0.2995,
                'lampara': 0.2995,
                'lector_dvd_cd': 0.4927,
                'lente_contacto': 0.1978,
                'lente_camara': 0.1413,
                'libros': 0.01,
                'llantas_vehiculo': 0.2430,
                'llave_maya': 0.13,
                'luces_carro': 0.1413,
                'maletines_bolsos': 0.2995,
                'manguera': 0.2995,
                'maquina_coser_soldar': 0.1413,
                'memoria': 0.13,
                'microscopio': 0.1413,
                'mixer': 0.4927,
                'molduras_vehiculo': 0.4278,
                'monitor': 0.13,
                'muebles': 0.2995,
                'mufla': 0.4278,
                'ollas_sartenes': 0.2995,
                'palos_golf': 0.2430,
                'panos': 0.2995,
                'papel': 0.2430,
                'parabrisas': 0.1978,
                'parlantes': 0.1413,
                'partes_carroceria': 0.4278,
                'patines': 0.2430,
                'pelucas': 0.2995,
                'pinon': 0.1413,
                'plancha_pelo': 0.4927,
                'platos_ceramica': 0.2995,
                'posters': 0.2995,
                'procesador': 0.13,
                'proyector_video': 0.4927,
                'quemador_cd_dvd': 0.4927,
                'rack_carro': 0.4878,
                'radiador': 0.4278,
                'radio_carro': 0.4927,
                'radio_comunicacion': 0.13,
                'raqueta': 0.2430,
                'rasuradora_electrica': 0.4927,
                'refrigerador': 0.68,
                'relojes': 0.2995,
                'reproductor_bluray': 0.4927,
                'repuestos_vehículo': 0.43,
                'retrovisor': 0.1978,
                'romana': 0.1413,
                'ropa': 0.2995,
                'router': 0.13,
                'sabanas': 0.2995,
                'secadoras_pelo': 0.4927,
                'silla_bebe_carro': 0.13,
                'sleeping_bag': 0.2995,
                'software': 0.13,
                'sombrilla': 0.2995,
                'sombrilla_fotografia': 0.2995,
                'suspension_carro': 0.4278,
                'suspension_moto': 0.4278,
                'tabla_surf': 0.2430,
                'tableta_electronica': 0.13,
                'tarjeta_video_sonido': 0.13,
                'tarjeta_madre': 0.13,
                'teclado_musical': 0.2430,
                'teclado_computadora': 0.13,
                'telefonos': 0.13,
                'televisor': 0.4927,
                'tienda_campana': 0.2995,
                'tripode': 0.2995,
                'valvulas': 0.1413,
                'vaso_vidrio': 0.2995,
                'ventiladores_computadora': 0.2430,
                'video_juegos': 0.1413,
                'video_monitor': 0.4927,
                'zapatos': 0.2995,
                'otros': 0.2995
            };
            
            // Obtener el porcentaje de impuesto específico para la categoría seleccionada
            if (taxPercentages.hasOwnProperty(packageContent)) {
                taxPercent = taxPercentages[packageContent];
            } else {
                taxPercent = 0.2995; // Valor predeterminado si no se encuentra la categoría
            }
        }
        
        // Calcular los impuestos con el porcentaje específico
        taxesEstimate = cifValue * taxPercent;
        
        // Calcular costo de entrega según destino y peso
        if (destination === 'sanjose' || destination === 'heredia' || destination === 'alajuela') {
            if (applicableWeight <= 10) deliveryCost = 5;
            else if (applicableWeight <= 20) deliveryCost = 7;
            else if (applicableWeight <= 50) deliveryCost = 12;
            else deliveryCost = 15;
        } else if (destination === 'cartago') {
            if (applicableWeight <= 10) deliveryCost = 10;
            else if (applicableWeight <= 20) deliveryCost = 15;
            else if (applicableWeight <= 50) deliveryCost = 18;
            else deliveryCost = 20;
        } else {
            // Zonas alejadas
            if (applicableWeight <= 10) deliveryCost = 15;
            else if (applicableWeight <= 20) deliveryCost = 20;
            else if (applicableWeight <= 50) deliveryCost = 25;
            else deliveryCost = 30;
        }
        
        // Calcular costo del seguro ($1 por cada $100 de valor, redondeando hacia arriba)
        insuranceCost = Math.ceil(purchaseValue / 100);
        
        // Calcular costo total incluyendo recargo por combustible y seguro
        const totalCost = shippingCost + fuelSurcharge + handlingCost + taxesEstimate + deliveryCost + insuranceCost;
        
        return {
            shipping: shippingCost,
            fuelSurcharge: fuelSurcharge,
            handling: handlingCost,
            taxes: taxesEstimate,
            delivery: deliveryCost,
            insurance: insuranceCost,
            total: totalCost,
            volumetricWeight: volumetricWeight,
            applicableWeight: applicableWeight
        };
    }
});