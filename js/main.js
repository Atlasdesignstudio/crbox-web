document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Simple tracking form
    const trackingForm = document.querySelector('.tracking-form');
    if (trackingForm) {
        trackingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Implementar lógica de tracking
            alert('Funcionalidad de tracking en desarrollo');
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            if (href !== '#' && !this.id.endsWith('-btn')) {
                e.preventDefault();
                
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80,
                        behavior: 'smooth'
                    });
                    
                    // Close mobile menu if open
                    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                        mobileMenu.classList.add('hidden');
                    }
                }
            }
        });
    });

    // Slide-in animations on scroll
    const elements = document.querySelectorAll('.animated-element');
    
    function checkInView() {
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < window.innerHeight - elementVisible) {
                element.classList.add('visible');
            }
        });
    }
    
    window.addEventListener('scroll', checkInView);
    checkInView(); // Check on load
    
    // Back to top button
    const backToTopButton = document.getElementById('back-to-top');
    
    if (backToTopButton) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                backToTopButton.classList.remove('opacity-0', 'invisible');
                backToTopButton.classList.add('opacity-100', 'visible');
            } else {
                backToTopButton.classList.add('opacity-0', 'invisible');
                backToTopButton.classList.remove('opacity-100', 'visible');
            }
        });
        
        backToTopButton.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // NUEVA IMPLEMENTACIÓN DE TABS - COMPLETAMENTE REESCRITA
    function initTabs() {
        // Tabs específicos que sabemos que existen en la página
        const tabsConfig = {
            'tab-calcular-btn': 'tab-calcular',
            'tab-peso-btn': 'tab-peso',
            'tab-manejo-btn': 'tab-manejo', 
            'tab-valores-btn': 'tab-valores'
        };
        
        // Para cada configuración de pestaña
        Object.entries(tabsConfig).forEach(([btnId, contentId]) => {
            const btn = document.getElementById(btnId);
            const content = document.getElementById(contentId);
            
            if (!btn || !content) {
                console.error(`Tab button or content missing: ${btnId} -> ${contentId}`);
                return;
            }
            
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Desactivar todos los botones
                Object.keys(tabsConfig).forEach(id => {
                    const button = document.getElementById(id);
                    if (button) {
                        button.classList.remove('border-orange-600', 'text-orange-600');
                        button.classList.add('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300');
                    }
                });
                
                // Activar este botón
                this.classList.add('border-orange-600', 'text-orange-600');
                this.classList.remove('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300');
                
                // Ocultar todos los contenidos
                Object.values(tabsConfig).forEach(id => {
                    const tabContent = document.getElementById(id);
                    if (tabContent) tabContent.classList.add('hidden');
                });
                
                // Mostrar este contenido
                content.classList.remove('hidden');
                
                console.log(`Tab clicked: ${btnId} -> showing ${contentId}`);
            });
        });
    }
    
    // Inicializar tabs
    initTabs();
    
    // Elementos para cambiar entre calculadoras aérea y marítima
    const toggleAero = document.getElementById('toggle-aero');
    const toggleMaritimo = document.getElementById('toggle-maritimo');
    const aeroCalculator = document.getElementById('aero-calculator');
    const maritimoCalculator = document.getElementById('maritimo-calculator');
    
    // Cambiar entre calculadoras si están presentes en la página
    if (toggleAero && toggleMaritimo && aeroCalculator && maritimoCalculator) {
        toggleAero.addEventListener('click', function() {
            // Activar botón
            toggleAero.style.backgroundColor = 'white';
            toggleAero.style.color = '#FF6B00';
            toggleAero.style.border = 'none';
            toggleMaritimo.style.backgroundColor = 'transparent';
            toggleMaritimo.style.color = 'white';
            toggleMaritimo.style.border = '2px solid white';
            
            // Mostrar calculadora
            aeroCalculator.classList.remove('hidden');
            maritimoCalculator.classList.add('hidden');
        });
        
        toggleMaritimo.addEventListener('click', function() {
            // Activar botón
            toggleMaritimo.style.backgroundColor = 'white';
            toggleMaritimo.style.color = '#FF6B00';
            toggleMaritimo.style.border = 'none';
            toggleAero.style.backgroundColor = 'transparent';
            toggleAero.style.color = 'white';
            toggleAero.style.border = '2px solid white';
            
            // Mostrar calculadora
            maritimoCalculator.classList.remove('hidden');
            aeroCalculator.classList.add('hidden');
        });
    }
    
    // Calculadora Aérea
    const aeroCalculateBtn = document.getElementById('aero-calculate-btn');
    const aeroResultSection = document.getElementById('aero-result-section');
    
    if (aeroCalculateBtn && aeroResultSection) {
        aeroCalculateBtn.addEventListener('click', function() {
            // Obtener valores
            const packageContent = document.getElementById('aero-package-content').value;
            const weight = parseFloat(document.getElementById('aero-weight').value) || 0;
            const purchaseValue = parseFloat(document.getElementById('aero-purchase-value').value) || 0;
            const length = parseFloat(document.getElementById('aero-length').value) || 0;
            const width = parseFloat(document.getElementById('aero-width').value) || 0;
            const height = parseFloat(document.getElementById('aero-height').value) || 0;
            const destination = document.getElementById('aero-destination').value;
            
            // Calcular peso volumétrico (fórmula: largo x ancho x alto en cm / 6000)
            let volumetricWeight = 0;
            if (length && width && height) {
                volumetricWeight = (length * width * height) / 6000;
            }
            
            // Determinar cuál peso aplicar
            const applicableWeight = Math.max(weight, volumetricWeight);
            
            // Calcular tarifa por peso (Aéreo)
            let shipping = 0;
            if (applicableWeight <= 0.5) shipping = 5;
            else if (applicableWeight <= 1) shipping = 7;
            else if (applicableWeight <= 2) shipping = 11;
            else if (applicableWeight <= 3) shipping = 15;
            else if (applicableWeight <= 4) shipping = 19;
            else if (applicableWeight <= 5) shipping = 23;
            else if (applicableWeight <= 6) shipping = 27;
            else if (applicableWeight <= 7) shipping = 32;
            else if (applicableWeight <= 8) shipping = 36;
            else if (applicableWeight <= 9) shipping = 40;
            else if (applicableWeight <= 10) shipping = 44;
            else if (applicableWeight <= 11) shipping = 48;
            else if (applicableWeight <= 12) shipping = 52;
            else if (applicableWeight <= 13) shipping = 56;
            else if (applicableWeight <= 14) shipping = 60;
            else if (applicableWeight <= 15) shipping = 64;
            else if (applicableWeight <= 16) shipping = 68;
            else if (applicableWeight <= 17) shipping = 72;
            else if (applicableWeight <= 18) shipping = 76;
            else if (applicableWeight <= 19) shipping = 80;
            else if (applicableWeight <= 20) shipping = 84;
            else if (applicableWeight <= 100) shipping = 84 + ((applicableWeight - 20) * 3);
            else shipping = 84 + ((100 - 20) * 3) + ((applicableWeight - 100) * 2.3);
            
            // Calcular cargo por manejo
            let handling = 0;
            if (purchaseValue < 20) handling = 1.5;
            else if (purchaseValue <= 30) handling = 3.5;
            else if (purchaseValue <= 50) handling = 5.5;
            else if (purchaseValue <= 100) handling = 7;
            else if (purchaseValue <= 200) handling = 14;
            else if (purchaseValue <= 500) handling = 35;
            else if (purchaseValue <= 1000) handling = 45;
            else if (purchaseValue <= 2500) handling = 100;
            else if (purchaseValue <= 5000) handling = 125;
            else if (purchaseValue <= 10000) handling = 150;
            else if (purchaseValue <= 15000) handling = 175;
            else handling = purchaseValue * 0.005; // 0.5% del valor
            
            // Calcular impuestos aproximados (13% del valor CIF)
            const cifValue = purchaseValue + shipping;
            let taxes = cifValue * 0.13;
            
            // Factor de impuestos adicionales según el tipo de producto
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
            taxes *= taxFactor;
            
            // Calcular costo de entrega según destino y peso
            let delivery = 0;
            if (destination === 'sanjose' || destination === 'alajuela' || destination === 'heredia') {
                if (applicableWeight <= 10) delivery = 5;
                else if (applicableWeight <= 20) delivery = 7;
                else if (applicableWeight <= 50) delivery = 12;
                else delivery = 15;
            } else if (destination === 'cartago') {
                if (applicableWeight <= 10) delivery = 10;
                else if (applicableWeight <= 20) delivery = 15;
                else if (applicableWeight <= 50) delivery = 18;
                else delivery = 20;
            } else {
                // Zonas alejadas
                if (applicableWeight <= 10) delivery = 15;
                else if (applicableWeight <= 20) delivery = 20;
                else if (applicableWeight <= 50) delivery = 25;
                else delivery = 30;
            }
            
            // Calcular costo total
            const total = shipping + handling + taxes + delivery;
            
            // Actualizar resultados
            document.getElementById('aero-shipping-cost').textContent = '$' + shipping.toFixed(2);
            document.getElementById('aero-handling-cost').textContent = '$' + handling.toFixed(2);
            document.getElementById('aero-tax-cost').textContent = '$' + taxes.toFixed(2);
            document.getElementById('aero-delivery-cost').textContent = '$' + delivery.toFixed(2);
            document.getElementById('aero-total-cost').textContent = '$' + total.toFixed(2);
            
            // Mostrar el peso aplicado
            if (volumetricWeight > weight) {
                document.getElementById('aero-weight-applied').textContent = 'Peso aplicado: ' + applicableWeight.toFixed(2) + ' kg (volumétrico)';
            } else {
                document.getElementById('aero-weight-applied').textContent = 'Peso aplicado: ' + applicableWeight.toFixed(2) + ' kg (real)';
            }
            
            // Mostrar sección de resultados con animación
            aeroResultSection.classList.remove('hidden');
            
            // Desplazar a los resultados
            aeroResultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }
    
    // Calculadora Marítima
    const maritimoCalculateBtn = document.getElementById('maritimo-calculate-btn');
    const maritimoResultSection = document.getElementById('maritimo-result-section');
    
    if (maritimoCalculateBtn && maritimoResultSection) {
        maritimoCalculateBtn.addEventListener('click', function() {
            // Obtener valores
            const packageContent = document.getElementById('maritimo-package-content').value;
            const purchaseValue = parseFloat(document.getElementById('maritimo-purchase-value').value) || 0;
            const length = parseFloat(document.getElementById('maritimo-length').value) || 0;
            const width = parseFloat(document.getElementById('maritimo-width').value) || 0;
            const height = parseFloat(document.getElementById('maritimo-height').value) || 0;
            const destination = document.getElementById('maritimo-destination').value;
            const serviceType = document.getElementById('maritimo-service-type').value;
            
            // Calcular volumen en pies cúbicos
            // Fórmula: (largo x ancho x alto en cm) / 28316.85 (convertir de cm3 a pies cúbicos)
            let cubicFeet = 0;
            if (length && width && height) {
                cubicFeet = (length * width * height) / 28316.85;
            }
            
            // Calcular costo de flete marítimo
            let shipping = 0;
            if (serviceType === 'regular') {
                shipping = cubicFeet * 18; // $18 por pie cúbico regular
            } else if (serviceType === 'large') {
                shipping = cubicFeet * 16; // $16 por pie cúbico para volúmenes grandes
            } else {
                // Contenedor completo - se muestra como cotización especial
                shipping = cubicFeet * 14; // Valor aproximado, sugiriendo contactar para cotización exacta
            }
            
            // Calcular costo de manejo y documentación
            let handling = 0;
            if (purchaseValue <= 1000) {
                handling = 45;
            } else if (purchaseValue <= 2500) {
                handling = 100;
            } else if (purchaseValue <= 5000) {
                handling = 125;
            } else if (purchaseValue <= 10000) {
                handling = 150;
            } else if (purchaseValue <= 15000) {
                handling = 175;
            } else {
                handling = purchaseValue * 0.005; // 0.5% del valor
            }
            
            // Añadir documentación y gastos administrativos
            handling += 50; // Documentación, B/L, etc.
            
            // Calcular impuestos aproximados (13% del valor CIF)
            const cifValue = purchaseValue + shipping;
            let taxes = cifValue * 0.13;
            
            // Factor de impuestos adicionales según el tipo de producto
            let taxFactor = 1.0;
            switch (packageContent) {
                case 'electronico':
                    taxFactor = 1.3; // 30% adicional para electrónicos
                    break;
                case 'muebles':
                    taxFactor = 1.1; // 10% adicional para muebles
                    break;
                case 'vehiculos':
                    taxFactor = 1.4; // 40% adicional para repuestos de vehículos
                    break;
                default:
                    taxFactor = 1.0;
            }
            taxes *= taxFactor;
            
            // Calcular costo de entrega según destino
            let delivery = 0;
            // Tarifas más altas para entrega marítima por volumen/peso
            if (destination === 'sanjose' || destination === 'alajuela' || destination === 'heredia') {
                if (cubicFeet <= 50) delivery = 30;
                else if (cubicFeet <= 100) delivery = 50;
                else delivery = 80;
            } else if (destination === 'cartago') {
                if (cubicFeet <= 50) delivery = 40;
                else if (cubicFeet <= 100) delivery = 60;
                else delivery = 100;
            } else {
                // Zonas alejadas
                if (cubicFeet <= 50) delivery = 60;
                else if (cubicFeet <= 100) delivery = 90;
                else delivery = 120;
            }
            
            // Calcular costo total
            const total = shipping + handling + taxes + delivery;
            
            // Calcular tiempo estimado
            let tiempo = "6-7 días";
            if (serviceType === 'container') {
                tiempo = "Por confirmar";
            }
            
            // Actualizar resultados
            document.getElementById('maritimo-volume').textContent = cubicFeet.toFixed(2) + ' pies cúbicos';
            document.getElementById('maritimo-shipping-cost').textContent = '$' + shipping.toFixed(2);
            document.getElementById('maritimo-handling-cost').textContent = '$' + handling.toFixed(2);
            document.getElementById('maritimo-tax-cost').textContent = '$' + taxes.toFixed(2);
            document.getElementById('maritimo-delivery-cost').textContent = '$' + delivery.toFixed(2);
            document.getElementById('maritimo-time').textContent = tiempo;
            document.getElementById('maritimo-total-cost').textContent = '$' + total.toFixed(2);
            
            // Mostrar notas adicionales según el tipo de servicio
            if (serviceType === 'container') {
                document.getElementById('maritimo-notes').textContent = 'Para contenedores completos, contactar para cotización exacta.';
            } else {
                document.getElementById('maritimo-notes').textContent = 'El tiempo de tránsito aproximado es de 6-7 días desde Miami.';
            }
            
            // Mostrar sección de resultados con animación
            maritimoResultSection.classList.remove('hidden');
            
            // Desplazar a los resultados
            maritimoResultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }
    
    // Calculadora rápida (para la página de tarifas)
    const calcularBtn = document.getElementById('calcular-btn');
    const resultadoCalculo = document.getElementById('resultado-calculo');
    
    if (calcularBtn && resultadoCalculo) {
        calcularBtn.addEventListener('click', function() {
            // Obtener valores
            const peso = parseFloat(document.getElementById('peso').value) || 0;
            const largo = parseFloat(document.getElementById('largo').value) || 0;
            const ancho = parseFloat(document.getElementById('ancho').value) || 0;
            const alto = parseFloat(document.getElementById('alto').value) || 0;
            const valor = parseFloat(document.getElementById('valor').value) || 0;
            const ubicacion = document.getElementById('ubicacion').value;
            
            // Calcular peso volumétrico
            const pesoVolumetrico = (largo * ancho * alto) / 6000;
            
            // Determinar cuál peso aplicar
            const pesoAplicable = Math.max(peso, pesoVolumetrico);
            
            // Calcular tarifa por peso
            let tarifaPeso = 0;
            if (pesoAplicable <= 0.5) tarifaPeso = 5;
            else if (pesoAplicable <= 1) tarifaPeso = 7;
            else if (pesoAplicable <= 2) tarifaPeso = 11;
            else if (pesoAplicable <= 3) tarifaPeso = 15;
            else if (pesoAplicable <= 4) tarifaPeso = 19;
            else if (pesoAplicable <= 5) tarifaPeso = 23;
            else if (pesoAplicable <= 6) tarifaPeso = 27;
            else if (pesoAplicable <= 7) tarifaPeso = 32;
            else if (pesoAplicable <= 8) tarifaPeso = 36;
            else if (pesoAplicable <= 9) tarifaPeso = 40;
            else if (pesoAplicable <= 10) tarifaPeso = 44;
            else if (pesoAplicable <= 11) tarifaPeso = 48;
            else if (pesoAplicable <= 12) tarifaPeso = 52;
            else if (pesoAplicable <= 13) tarifaPeso = 56;
            else if (pesoAplicable <= 14) tarifaPeso = 60;
            else if (pesoAplicable <= 15) tarifaPeso = 64;
            else if (pesoAplicable <= 16) tarifaPeso = 68;
            else if (pesoAplicable <= 17) tarifaPeso = 72;
            else if (pesoAplicable <= 18) tarifaPeso = 76;
            else if (pesoAplicable <= 19) tarifaPeso = 80;
            else if (pesoAplicable <= 20) tarifaPeso = 84;
            else if (pesoAplicable <= 100) tarifaPeso = 84 + ((pesoAplicable - 20) * 3);
            else tarifaPeso = 84 + ((100 - 20) * 3) + ((pesoAplicable - 100) * 2.3);
            
            // Calcular cargo por manejo
            let cargoManejo = 0;
            if (valor < 20) cargoManejo = 1.5;
            else if (valor <= 30) cargoManejo = 3.5;
            else if (valor <= 50) cargoManejo = 5.5;
            else if (valor <= 100) cargoManejo = 7;
            else if (valor <= 200) cargoManejo = 14;
            else if (valor <= 500) cargoManejo = 35;
            else if (valor <= 1000) cargoManejo = 45;
            else if (valor <= 2500) cargoManejo = 100;
            else if (valor <= 5000) cargoManejo = 125;
            else if (valor <= 10000) cargoManejo = 150;
            else if (valor <= 15000) cargoManejo = 175;
            else cargoManejo = valor * 0.005; // 0.5% del valor
            
            // Calcular costo de entrega
            let costoEntrega = 0;
            if (ubicacion === 'sanjose' || ubicacion === 'heredia' || ubicacion === 'alajuela') {
                if (pesoAplicable <= 10) costoEntrega = 5;
                else if (pesoAplicable <= 20) costoEntrega = 7;
                else if (pesoAplicable <= 50) costoEntrega = 12;
                else costoEntrega = 15; // para pesos mayores
            } else if (ubicacion === 'cartago') {
                if (pesoAplicable <= 10) costoEntrega = 10;
                else if (pesoAplicable <= 20) costoEntrega = 15;
                else if (pesoAplicable <= 50) costoEntrega = 18;
                else costoEntrega = 20; // para pesos mayores
            } else {
                costoEntrega = 20; // zonas alejadas, tarifa mínima
            }
            
            // Calcular costo total
            const costoTotal = tarifaPeso + cargoManejo + costoEntrega;
            
            // Mostrar resultados
            document.getElementById('peso-aplicable').textContent = pesoAplicable.toFixed(2) + ' kg' + (pesoVolumetrico > peso ? ' (volumétrico)' : ' (real)');
            document.getElementById('tarifa-peso').textContent = '$' + tarifaPeso.toFixed(2);
            document.getElementById('cargo-manejo').textContent = '$' + cargoManejo.toFixed(2);
            document.getElementById('costo-entrega').textContent = '$' + costoEntrega.toFixed(2);
            document.getElementById('costo-total').textContent = '$' + costoTotal.toFixed(2);
            
            // Mostrar resultado
            resultadoCalculo.classList.remove('hidden');
            
            // Scroll to results
            resultadoCalculo.scrollIntoView({behavior: 'smooth', block: 'nearest'});
        });
    }
    
    // Animate elements when they come into view
    const animateElements = document.querySelectorAll('.animate-on-scroll');
    
    function checkAnimateElements() {
        animateElements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementPosition < windowHeight - 50) {
                element.classList.add('animated');
            }
        });
    }
    
    if (animateElements.length > 0) {
        window.addEventListener('scroll', checkAnimateElements);
        checkAnimateElements(); // Initial check
    }
    
    // Tooltips (para futuros elementos con información adicional)
    const tooltipTriggers = document.querySelectorAll('[data-tooltip]');
    
    tooltipTriggers.forEach(trigger => {
        trigger.addEventListener('mouseenter', function() {
            const tooltipText = this.getAttribute('data-tooltip');
            
            const tooltip = document.createElement('div');
            tooltip.classList.add('tooltip');
            tooltip.textContent = tooltipText;
            
            document.body.appendChild(tooltip);
            
            const triggerRect = this.getBoundingClientRect();
            tooltip.style.top = (triggerRect.bottom + window.scrollY + 10) + 'px';
            tooltip.style.left = (triggerRect.left + window.scrollX + triggerRect.width/2 - tooltip.offsetWidth/2) + 'px';
            
            setTimeout(() => {
                tooltip.classList.add('show');
            }, 10);
            
            this.addEventListener('mouseleave', function onMouseLeave() {
                tooltip.classList.remove('show');
                
                setTimeout(() => {
                    document.body.removeChild(tooltip);
                }, 300);
                
                this.removeEventListener('mouseleave', onMouseLeave);
            });
        });
    });
});