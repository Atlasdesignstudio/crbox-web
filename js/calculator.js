document.addEventListener('DOMContentLoaded', function() {
    const calculateBtn = document.getElementById('calculate-btn');
    const resultSection = document.getElementById('result-section');
    
    const serviceTypeSelect = document.getElementById('service-type');
    const weightInput = document.getElementById('weight');
    const purchaseValueInput = document.getElementById('purchase-value');
    const destinationSelect = document.getElementById('destination');
    
    const shippingCostEl = document.getElementById('shipping-cost');
    const handlingCostEl = document.getElementById('handling-cost');
    const taxCostEl = document.getElementById('tax-cost');
    const deliveryCostEl = document.getElementById('delivery-cost');
    const totalCostEl = document.getElementById('total-cost');
    
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
        handlingCostEl.textContent = `$${costs.handling.toFixed(2)}`;
        taxCostEl.textContent = `$${costs.taxes.toFixed(2)}`;
        deliveryCostEl.textContent = `$${costs.delivery.toFixed(2)}`;
        totalCostEl.textContent = `$${costs.total.toFixed(2)}`;
        
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
        
        // Calculate shipping cost based on weight and service type
        if (serviceType === 'aero') {
            // Courier aéreo rates
            if (weight <= 5) {
                shippingCost = weight * 3.50;
                handlingCost = 5.00;
            } else if (weight <= 10) {
                shippingCost = weight * 3.25;
                handlingCost = 5.00;
            } else if (weight <= 20) {
                shippingCost = weight * 3.00;
                handlingCost = 7.50;
            } else {
                shippingCost = weight * 2.75;
                handlingCost = 10.00;
            }
        } else {
            // Carga marítima rates (simplified for demo)
            // In real implementation, would calculate cubic feet based on dimensions
            const estimatedCubicFeet = weight / 10; // Simplified calculation
            shippingCost = estimatedCubicFeet * 18.00;
            handlingCost = 15.00;
        }
        
        // Calculate insurance (1% of purchase value)
        const insurance = purchaseValue * 0.01;
        
        // Calculate CIF value (Cost + Insurance + Freight)
        const cifValue = purchaseValue + shippingCost + insurance;
        
        // Estimate taxes (simplified for demo - 13% VAT on CIF value)
        taxesEstimate = cifValue * 0.13;
        
        // Calculate delivery cost based on destination
        if (destination === 'gam') {
            deliveryCost = 3.50;
        } else if (['alajuela', 'cartago', 'heredia'].includes(destination)) {
            deliveryCost = 5.00;
        } else {
            deliveryCost = 10.00;
        }
        
        // Calculate total cost
        const totalCost = shippingCost + handlingCost + taxesEstimate + deliveryCost;
        
        return {
            shipping: shippingCost,
            handling: handlingCost,
            taxes: taxesEstimate,
            delivery: deliveryCost,
            total: totalCost
        };
    }
});