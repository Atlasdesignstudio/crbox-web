document.addEventListener('DOMContentLoaded', function() {
    const calculateBtn = document.getElementById('calculate-btn');
    const resultSection = document.getElementById('result-section');
    
    const serviceTypeSelect = document.getElementById('service-type');
    const weightInput = document.getElementById('weight');
    const purchaseValueInput = document.getElementById('purchase-value');
    const destinationSelect = document.getElementById('destination');
    
    const shippingCostEl = document.getElementById('shipping-cost');
    const fuelSurchargeEl = document.getElementById('fuel-surcharge'); // Nuevo elemento para recargo por combustible
    const handlingCostEl = document.getElementById('handling-cost');
    const taxCostEl = document.getElementById('tax-cost');
    const deliveryCostEl = document.getElementById('delivery-cost');
    const totalCostEl = document.getElementById('total-cost');
    const weightAppliedEl = document.getElementById('weight-applied');
    
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
        fuelSurchargeEl.textContent = `$${costs.fuelSurcharge.toFixed(2)}`; // Mostrar recargo por combustible
        handlingCostEl.textContent = `$${costs.handling.toFixed(2)}`;
        taxCostEl.textContent = `$${costs.taxes.toFixed(2)}`;
        deliveryCostEl.textContent = `$${costs.delivery.toFixed(2)}`;
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
        
        // Calcular impuestos estimados (base 13% + factor adicional por tipo de producto)
        const cifValue = purchaseValue + shippingCost;
        let baseTax = cifValue * 0.13;
        
        // Factor adicional basado en el tipo de producto (si está disponible)
        const packageContentSelect = document.getElementById('package-content');
        if (packageContentSelect) {
            const packageContent = packageContentSelect.value;
            let taxFactor = 1.0;
            
            switch (packageContent) {
                case 'electronico':
                    taxFactor = 1.3; // 30% adicional para electrónicos
                    break;
                case 'ropa':
                    taxFactor = 1.15; // 15% adicional para ropa
                    break;
                case 'repuestos':
                    taxFactor = 1.1; // 10% adicional para repuestos
                    break;
                case 'suplementos':
                    taxFactor = 1.05; // 5% adicional para suplementos
                    break;
                default:
                    taxFactor = 1.0;
            }
            
            taxesEstimate = baseTax * taxFactor;
        } else {
            taxesEstimate = baseTax;
        }
        
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
        
        // Calcular costo total incluyendo recargo por combustible
        const totalCost = shippingCost + fuelSurcharge + handlingCost + taxesEstimate + deliveryCost;
        
        return {
            shipping: shippingCost,
            fuelSurcharge: fuelSurcharge,
            handling: handlingCost,
            taxes: taxesEstimate,
            delivery: deliveryCost,
            total: totalCost,
            volumetricWeight: volumetricWeight,
            applicableWeight: applicableWeight
        };
    }
});