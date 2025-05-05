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
            
            if (href !== '#') {
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
    
    // Simulación de slider de testimonios (sin librería)
    const testimonialPrev = document.querySelector('.testimonial-prev');
    const testimonialNext = document.querySelector('.testimonial-next');
    const testimonialWrapper = document.querySelector('.swiper-wrapper');
    
    if (testimonialPrev && testimonialNext && testimonialWrapper) {
        let currentSlide = 0;
        const slides = document.querySelectorAll('.swiper-slide');
        
        if (slides.length > 0) {
            const slideWidth = slides[0].offsetWidth;
            const slideCount = slides.length;
            
            testimonialPrev.addEventListener('click', function() {
                if (currentSlide > 0) {
                    currentSlide--;
                    updateSliderPosition();
                }
            });
            
            testimonialNext.addEventListener('click', function() {
                if (currentSlide < slideCount - 1) {
                    currentSlide++;
                    updateSliderPosition();
                }
            });
            
            function updateSliderPosition() {
                testimonialWrapper.style.transform = `translateX(-${currentSlide * slideWidth}px)`;
            }
            
            // Auto slide cada 5 segundos
            setInterval(function() {
                currentSlide = (currentSlide + 1) % slideCount;
                updateSliderPosition();
            }, 5000);
        }
    }
    
    // Efecto parallax para fondo del hero
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        window.addEventListener('scroll', function() {
            const scrollPosition = window.pageYOffset;
            if (scrollPosition < 800) { // Solo aplicar en la parte superior
                heroSection.style.backgroundPositionY = scrollPosition * 0.5 + 'px';
            }
        });
    }
    
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
    
    // Calculadora simple
    const calcularBtn = document.getElementById('calcular-btn');
    
    if (calcularBtn) {
        const pesoInput = document.getElementById('peso-calc');
        const valorInput = document.getElementById('valor-calc');
        const resultadoCalculo = document.getElementById('resultado-calculo');
        const costoTotal = document.getElementById('costo-total');
        
        calcularBtn.addEventListener('click', function() {
            const peso = parseFloat(pesoInput.value) || 0;
            const valor = parseFloat(valorInput.value) || 0;
            
            if (peso <= 0 || valor <= 0) {
                alert('Por favor ingrese un peso y valor válidos');
                return;
            }
            
            // Cálculo simplificado
            let tarifaPorLibra = 3.50;
            if (peso > 20) tarifaPorLibra = 2.75;
            else if (peso > 10) tarifaPorLibra = 3.00;
            else if (peso > 5) tarifaPorLibra = 3.25;
            
            let costoFlete = peso * tarifaPorLibra;
            let manejo = peso <= 5 ? 5 : (peso <= 10 ? 5 : (peso <= 20 ? 7.5 : 10));
            let seguro = valor * 0.01;
            let impuestos = (valor + costoFlete + seguro) * 0.13;
            let entrega = 3.50;
            
            let total = costoFlete + manejo + seguro + impuestos + entrega;
            
            costoTotal.textContent = total.toFixed(2);
            resultadoCalculo.classList.remove('hidden');
        });
    }
    
    // Contador de estadísticas
    const counters = document.querySelectorAll('.counter-element');
    
    if (counters.length > 0) {
        const startCounting = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const target = parseInt(counter.getAttribute('data-target'));
                    const duration = 2500; // ms
                    const increment = target / (duration / 16);
                    let current = 0;
                    
                    const updateCounter = () => {
                        current += increment;
                        if (current < target) {
                            counter.textContent = Math.ceil(current);
                            requestAnimationFrame(updateCounter);
                        } else {
                            counter.textContent = target;
                        }
                    };
                    
                    updateCounter();
                    observer.unobserve(counter);
                }
            });
        };
        
        const counterObserver = new IntersectionObserver(startCounting, {
            threshold: 0.3
        });
        
        counters.forEach(counter => {
            counterObserver.observe(counter);
        });
    }
});