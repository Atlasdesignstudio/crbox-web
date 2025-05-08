/**
 * CRBOX Dashboard JavaScript
 * Enhanced dashboard functionality with modern UX features
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all dashboard components
    initStickyHeader();
    initMobileMenu();
    initTabNavigation();
    initCounterAnimation();
    initNotifications();
    initCopyFunctions();
    initAnimations();
    initToggleActivityView(); // Nuevo: Toggle entre vistas con/sin actividad
    initPackageConsolidation(); // Nuevo: Para la funcionalidad de consolidación
    initAccessibility();
    
    // Show welcome message with personalized greeting
    showWelcomeMessage();
});

/**
 * Función para alternar entre vistas de actividad
 * (con actividad / sin actividad)
 */
function initToggleActivityView() {
    // El botón "Actualizar" podría alternar las vistas para demostración
    const refreshButton = document.querySelector('button.text-sm.text-gray-500');
    const withDataView = document.getElementById('activity-with-data');
    const emptyView = document.getElementById('activity-empty');
    
    if (refreshButton && withDataView && emptyView) {
        let showingData = true; // Por defecto, mostramos la vista con datos
        
        refreshButton.addEventListener('click', function() {
            showingData = !showingData;
            
            if (showingData) {
                withDataView.classList.remove('hidden');
                emptyView.classList.add('hidden');
            } else {
                withDataView.classList.add('hidden');
                emptyView.classList.remove('hidden');
            }
            
            // Muestra un toast al actualizar
            showToast('Actividad actualizada', 'info');
        });
    }
}

/**
 * Initialize sticky header behavior
 */
function initStickyHeader() {
    const header = document.querySelector('.sticky-header');
    const tabBar = document.querySelector('.bg-white.border-b');
    
    if (!header) return;
    
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add shadow when scrolling down
        if (scrollTop > 10) {
            header.classList.add('sticky-active');
            if (tabBar) tabBar.classList.add('sticky-active');
        } else {
            header.classList.remove('sticky-active');
            if (tabBar) tabBar.classList.remove('sticky-active');
        }
        
        lastScrollTop = scrollTop;
    });
}

/**
 * Initialize mobile menu toggle
 */
function initMobileMenu() {
    const menuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (!menuButton || !mobileMenu) return;
    
    menuButton.addEventListener('click', function() {
        // Toggle menu visibility with animation
        if (mobileMenu.classList.contains('hidden')) {
            menuButton.innerHTML = '<i class="fas fa-times text-xl"></i>';
            mobileMenu.classList.remove('hidden');
            
            // Animate menu appearance
            setTimeout(() => {
                mobileMenu.style.opacity = '1';
                mobileMenu.style.transform = 'translateY(0)';
            }, 10);
        } else {
            menuButton.innerHTML = '<i class="fas fa-bars text-xl"></i>';
            
            // Animate menu disappearance
            mobileMenu.style.opacity = '0';
            mobileMenu.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                mobileMenu.classList.add('hidden');
            }, 300);
        }
    });
    
    // Close mobile menu on window resize if it becomes unnecessary
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 768 && !mobileMenu.classList.contains('hidden')) {
            menuButton.innerHTML = '<i class="fas fa-bars text-xl"></i>';
            mobileMenu.classList.add('hidden');
            mobileMenu.style.opacity = '0';
        }
    });
}

/**
 * Initialize tab navigation with smooth animations
 */
function initTabNavigation() {
    const tabLinks = document.querySelectorAll('.whitespace-nowrap.px-6.py-4');
    
    if (tabLinks.length === 0) return;
    
    tabLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            if (!this.classList.contains('border-orange-600')) {
                const hoverLine = this.querySelector('span');
                if (hoverLine) {
                    hoverLine.style.transform = 'scale-x-100';
                }
            }
        });
        
        link.addEventListener('mouseleave', function() {
            if (!this.classList.contains('border-orange-600')) {
                const hoverLine = this.querySelector('span');
                if (hoverLine) {
                    hoverLine.style.transform = 'scale-x-0';
                }
            }
        });
    });
}

/**
 * Animate counters with smooth counting effect
 */
function initCounterAnimation() {
    const counters = document.querySelectorAll('.counter-animation');
    
    if (counters.length === 0) return;
    
    const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const targetText = counter.innerText;
                
                // Check if it's a fraction (for consolidated packages)
                if (targetText.includes('/')) {
                    const parts = targetText.split('/');
                    const current = parseInt(parts[0], 10);
                    const total = parseInt(parts[1], 10);
                    
                    let count = 0;
                    const duration = 1500; // Duration in milliseconds
                    const increment = current / (duration / 16); // 60fps
                    
                    const updateCount = () => {
                        if (count < current) {
                            count += increment;
                            if (count > current) count = current;
                            
                            counter.innerText = Math.floor(count) + '/' + total;
                            requestAnimationFrame(updateCount);
                        }
                    };
                    
                    updateCount();
                } else {
                    // Regular number or percentage
                    const target = parseInt(targetText.replace(/\D/g,''), 10);
                    const isPercentage = targetText.includes('%');
                    
                    let count = 0;
                    const duration = 1500; // Duration in milliseconds
                    const increment = target / (duration / 16); // 60fps
                    
                    const updateCount = () => {
                        if (count < target) {
                            count += increment;
                            if (count > target) count = target;
                            
                            counter.innerText = isPercentage ? 
                                Math.floor(count) + '%' : 
                                Math.floor(count);
                            
                            requestAnimationFrame(updateCount);
                        }
                    };
                    
                    updateCount();
                }
                
                // Stop observing once animation is triggered
                observer.unobserve(counter);
            }
        });
    }, options);
    
    counters.forEach(counter => {
        observer.observe(counter);
    });
}

/**
 * Initialize notification system
 */
function initNotifications() {
    // Setup notification closure functionality
    const notificationCloseButtons = document.querySelectorAll('.notification-close');
    
    notificationCloseButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const notification = this.closest('.rounded-xl');
            
            if (notification) {
                // Animate notification removal
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(10px)';
                
                setTimeout(() => {
                    notification.style.height = notification.offsetHeight + 'px';
                    notification.style.overflow = 'hidden';
                    
                    setTimeout(() => {
                        notification.style.height = '0';
                        notification.style.margin = '0';
                        notification.style.padding = '0';
                        
                        setTimeout(() => {
                            notification.remove();
                            
                            // Update notification badge counts
                            updateNotificationBadges();
                        }, 300);
                    }, 100);
                }, 300);
            }
        });
    });
    
    // Create function to show new notifications
    window.showNotification = function(title, message, type = 'info', autoDismiss = true) {
        const notificationsContainer = document.querySelector('.p-6:has(.rounded-xl.bg-blue-50)') || 
                                       document.querySelector('.p-6');
        if (!notificationsContainer) return;
        
        // Map notification types to styles
        const typeStyles = {
            'info': {
                bg: 'bg-blue-50',
                border: 'border-blue-100',
                iconBg: 'bg-blue-100',
                iconColor: 'text-blue-500',
                titleColor: 'text-blue-800',
                textColor: 'text-blue-600',
                badgeBg: 'bg-blue-100',
                badgeColor: 'text-blue-500'
            },
            'success': {
                bg: 'bg-green-50',
                border: 'border-green-100',
                iconBg: 'bg-green-100',
                iconColor: 'text-green-500',
                titleColor: 'text-green-800',
                textColor: 'text-green-600',
                badgeBg: 'bg-green-100',
                badgeColor: 'text-green-500'
            },
            'warning': {
                bg: 'bg-yellow-50',
                border: 'border-yellow-100',
                iconBg: 'bg-yellow-100',
                iconColor: 'text-yellow-500',
                titleColor: 'text-yellow-800',
                textColor: 'text-yellow-600',
                badgeBg: 'bg-yellow-100',
                badgeColor: 'text-yellow-500'
            },
            'error': {
                bg: 'bg-red-50',
                border: 'border-red-100',
                iconBg: 'bg-red-100',
                iconColor: 'text-red-500',
                titleColor: 'text-red-800',
                textColor: 'text-red-600',
                badgeBg: 'bg-red-100',
                badgeColor: 'text-red-500'
            }
        };
        
        const style = typeStyles[type] || typeStyles.info;
        const icon = type === 'success' ? 'fa-check-circle' : 
                     type === 'warning' ? 'fa-exclamation-triangle' : 
                     type === 'error' ? 'fa-times-circle' : 'fa-info-circle';
        
        const date = new Date();
        const formattedDate = `${date.getDate()} ${date.toLocaleString('default', { month: 'long' })}, ${date.getFullYear()}`;
        
        // Create notification HTML
        const notification = document.createElement('div');
        notification.className = `rounded-xl ${style.bg} border ${style.border} p-5 flex items-start hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 mb-4 opacity-0 translate-x-10`;
        notification.innerHTML = `
            <div class="${style.iconColor} mr-4 ${style.iconBg} p-3 rounded-full">
                <i class="fas ${icon} text-xl"></i>
            </div>
            <div class="flex-1">
                <div class="flex justify-between items-start mb-1">
                    <h3 class="font-semibold ${style.titleColor}">${title}</h3>
                    <span class="text-xs ${style.badgeColor} ${style.badgeBg} px-2 py-1 rounded-full">Nuevo</span>
                </div>
                <p class="${style.textColor} mb-2">${message}</p>
                <div class="flex justify-between items-center mt-3">
                    <span class="text-xs ${style.badgeColor}">Publicado: ${formattedDate}</span>
                    <button class="text-xs flex items-center ${style.titleColor} hover:${style.iconColor} notification-close">
                        <i class="fas fa-check-circle mr-1"></i>
                        Marcar como leído
                    </button>
                </div>
            </div>
        `;
        
        // Insert notification at the top of the container
        notificationsContainer.prepend(notification);
        
        // Animate notification appearance
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Add click handler to close button
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const notif = this.closest('.rounded-xl');
                
                if (notif) {
                    // Animate notification removal
                    notif.style.opacity = '0';
                    notif.style.transform = 'translateX(10px)';
                    
                    setTimeout(() => {
                        notif.style.height = notif.offsetHeight + 'px';
                        notif.style.overflow = 'hidden';
                        
                        setTimeout(() => {
                            notif.style.height = '0';
                            notif.style.margin = '0';
                            notif.style.padding = '0';
                            
                            setTimeout(() => {
                                notif.remove();
                                
                                // Update notification badge counts
                                updateNotificationBadges();
                            }, 300);
                        }, 100);
                    }, 300);
                }
            });
        }
        
        // Update notification badges
        updateNotificationBadges();
        
        // Auto-dismiss notification if enabled
        if (autoDismiss) {
            setTimeout(() => {
                if (notification && document.body.contains(notification)) {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateX(10px)';
                    
                    setTimeout(() => {
                        notification.style.height = notification.offsetHeight + 'px';
                        notification.style.overflow = 'hidden';
                        
                        setTimeout(() => {
                            notification.style.height = '0';
                            notification.style.margin = '0';
                            notification.style.padding = '0';
                            
                            setTimeout(() => {
                                notification.remove();
                                
                                // Update notification badge counts
                                updateNotificationBadges();
                            }, 300);
                        }, 100);
                    }, 300);
                }
            }, 8000); // Dismiss after 8 seconds
        }
        
        return notification;
    };
}

/**
 * Update notification badge counts throughout the UI
 */
function updateNotificationBadges() {
    const notificationElements = document.querySelectorAll('.rounded-xl.bg-blue-50, .rounded-xl.bg-green-50, .rounded-xl.bg-red-50, .rounded-xl.bg-yellow-50');
    const count = notificationElements.length;
    
    const badges = document.querySelectorAll('.text-sm.text-gray-500 span');
    badges.forEach(badge => {
        if (badge.classList.contains('rounded-full')) {
            badge.textContent = count > 0 ? `${count} ${count === 1 ? 'nueva' : 'nuevas'}` : 'No hay';
            badge.style.display = count > 0 ? 'inline-block' : 'none';
        }
    });
}

/**
 * Initialize copy to clipboard functionality
 */
function initCopyFunctions() {
    // Copy casillero number
    const copyBtn = document.getElementById('copy-casillero');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const casilleroNumber = '50628595';
            copyToClipboard(casilleroNumber, this, '<i class="far fa-copy mr-1"></i> Copiar', '<i class="fas fa-check mr-1"></i> ¡Copiado!');
            showToast('Número de casillero copiado al portapapeles', 'success');
        });
    }
    
    // Copy address
    const copyAddressBtn = document.getElementById('copy-address-btn');
    if (copyAddressBtn) {
        copyAddressBtn.addEventListener('click', function() {
            // Construir la dirección completa
            const name = "Mathias Meneses";
            const address = "8155 NW 68TH ST";
            const city = "Miami";
            const state = "Florida";
            const zip = "33166";
            const phone = "305 882 1718";
            
            const fullAddress = `${name}\n${address}\n${city}, ${state} ${zip}\n${phone}\nCasillero: 50628595`;
            
            copyToClipboard(fullAddress, this, '<i class="far fa-copy mr-2"></i> Copiar dirección', '<i class="fas fa-check mr-2"></i> ¡Copiado!');
            showToast('Dirección copiada al portapapeles', 'success');
        });
    }
}

/**
 * Copy text to clipboard with visual feedback
 */
function copyToClipboard(text, button, originalHTML, successHTML) {
    if (!button || !text) return;
    
    // Store original button HTML if not provided
    if (!originalHTML) {
        originalHTML = button.innerHTML;
    }
    
    // Use modern clipboard API
    navigator.clipboard.writeText(text)
        .then(() => {
            // Show success state
            button.innerHTML = successHTML || '<i class="fas fa-check mr-2"></i> ¡Copiado!';
            
            // Return to original state after delay
            setTimeout(() => {
                button.innerHTML = originalHTML;
            }, 2000);
        })
        .catch(err => {
            console.error('Error al copiar al portapapeles:', err);
            
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                document.execCommand('copy');
                // Show success state
                button.innerHTML = successHTML || '<i class="fas fa-check mr-2"></i> ¡Copiado!';
                
                // Return to original state after delay
                setTimeout(() => {
                    button.innerHTML = originalHTML;
                }, 2000);
            } catch (err) {
                console.error('Fallback: Error al copiar al portapapeles:', err);
                showToast('Error al copiar el texto', 'error');
            }
            
            document.body.removeChild(textarea);
        });
}

/**
 * Initialize animations for various elements
 */
function initAnimations() {
    // Card hover animations
    const cards = document.querySelectorAll('.stat-card, .glass-card, .button-3d');
    
    cards.forEach(card => {
        // Add shine effect class if not present
        if (!card.classList.contains('shine-effect')) {
            card.classList.add('shine-effect');
        }
        
        // Add subtle 3D tilt effect on mouse move
        card.addEventListener('mousemove', function(e) {
            // Skip for mobile devices
            if (window.innerWidth < 768) return;
            
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Calculate rotation based on mouse position
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            
            // Apply the transform
            this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
        });
        
        // Reset transform on mouse leave
        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
            
            // Re-add hover translation for stat cards
            if (this.classList.contains('stat-card')) {
                this.style.transform = 'translateY(-5px)';
                
                // Reset after transition
                setTimeout(() => {
                    this.style.transform = '';
                }, 300);
            }
        });
    });
    
    // Button hover effects
    const buttons = document.querySelectorAll('a[href], button');
    
    buttons.forEach(button => {
        if (!button.classList.contains('button-3d') && 
            !button.closest('.notification-close') && 
            !button.closest('.custom-dropdown')) {
            
            button.addEventListener('mouseover', function() {
                this.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                
                // Only apply scale if it's a button-like element
                if (this.classList.contains('primary-btn') || 
                    this.classList.contains('bg-orange-500') ||
                    this.classList.contains('bg-blue-500') ||
                    this.classList.contains('bg-green-500')) {
                    this.style.transform = 'scale(1.05)';
                }
            });
            
            button.addEventListener('mouseout', function() {
                this.style.transform = 'scale(1)';
            });
        }
    });
    
    // Floating animation for decorative elements
    const floatingElements = document.querySelectorAll('.floating-shape');
    
    floatingElements.forEach((el, index) => {
        // Make sure animation delay is properly set
        el.style.animationDelay = `${index * 0.5}s`;
    });
}

/**
 * Initialize accessibility features
 */
function initAccessibility() {
    // Add skip to content link for keyboard navigation
    const header = document.querySelector('header');
    
    if (header && !document.querySelector('.skip-to-content')) {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-to-content';
        skipLink.textContent = 'Saltar al contenido principal';
        
        document.body.insertBefore(skipLink, document.body.firstChild);
        
        // Add id to main content
        const main = document.querySelector('main');
        if (main) {
            main.id = 'main-content';
            main.setAttribute('tabindex', '-1');
        }
    }
    
    // Ensure all interactive elements have appropriate ARIA attributes
    const interactiveElements = document.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    
    interactiveElements.forEach(el => {
        // Ensure all buttons have an accessible name
        if (el.tagName === 'BUTTON' && !el.getAttribute('aria-label') && !el.textContent.trim()) {
            // Try to infer a name from icon
            const icon = el.querySelector('i');
            if (icon) {
                const iconClass = Array.from(icon.classList).find(cls => cls.startsWith('fa-'));
                if (iconClass) {
                    const name = iconClass.replace('fa-', '').replace(/-/g, ' ');
                    el.setAttribute('aria-label', name.charAt(0).toUpperCase() + name.slice(1));
                }
            }
        }
        
        // Ensure dropdown triggers have appropriate ARIA attributes
        if (el.getAttribute('aria-haspopup') && !el.getAttribute('aria-expanded')) {
            el.setAttribute('aria-expanded', 'false');
            
            el.addEventListener('click', function() {
                const expanded = this.getAttribute('aria-expanded') === 'true';
                this.setAttribute('aria-expanded', !expanded);
            });
        }
    });
    
    // Make images accessible with alt text
    document.querySelectorAll('img:not([alt])').forEach(img => {
        const parentText = img.parentElement.textContent.trim();
        let altText = 'Imagen';
        
        if (parentText) {
            altText = parentText.substring(0, 50) + (parentText.length > 50 ? '...' : '');
        } else if (img.src) {
            const filename = img.src.split('/').pop().split('?')[0];
            altText = filename.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, '');
        }
        
        img.setAttribute('alt', altText);
    });
}

/**
 * Show welcome message with personalized greeting
 */
function showWelcomeMessage() {
    // Check if this is user's first visit today
    const lastVisit = localStorage.getItem('lastVisit');
    const today = new Date().toDateString();
    
    if (lastVisit !== today) {
        // Get current time
        const now = new Date();
        const hour = now.getHours();
        
        // Determine greeting based on time of day
        let greeting = '';
        if (hour < 12) {
            greeting = '¡Buenos días';
        } else if (hour < 18) {
            greeting = '¡Buenas tardes';
        } else {
            greeting = '¡Buenas noches';
        }
        
        // Get username if available
        const usernameElement = document.querySelector('.font-medium:not(.whitespace-nowrap)');
        let username = 'Mathias';
        
        if (usernameElement && usernameElement.textContent) {
            username = usernameElement.textContent.trim();
        }
        
        // Show welcome toast
        setTimeout(() => {
            showToast(`${greeting}, ${username}! Bienvenido a tu dashboard`, 'success');
        }, 1000);
        
        // Store last visit
        localStorage.setItem('lastVisit', today);
    }
}

/**
 * Display toast notification
 */
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    
    let bgColor, textColor, icon;
    switch (type) {
        case 'success':
            bgColor = 'bg-green-500';
            textColor = 'text-white';
            icon = '<i class="fas fa-check-circle mr-2"></i>';
            break;
        case 'error':
            bgColor = 'bg-red-500';
            textColor = 'text-white';
            icon = '<i class="fas fa-exclamation-circle mr-2"></i>';
            break;
        case 'info':
            bgColor = 'bg-blue-500';
            textColor = 'text-white';
            icon = '<i class="fas fa-info-circle mr-2"></i>';
            break;
        case 'warning':
            bgColor = 'bg-yellow-500';
            textColor = 'text-white';
            icon = '<i class="fas fa-exclamation-triangle mr-2"></i>';
            break;
    }
    
    toast.className = `${bgColor} ${textColor} px-4 py-3 rounded-lg shadow-lg flex items-center opacity-0 transform translate-x-full transition-all duration-300`;
    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
        <button class="ml-auto text-white focus:outline-none" aria-label="Cerrar notificación">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animate toast entrance
    setTimeout(() => {
        toast.classList.remove('opacity-0', 'translate-x-full');
    }, 10);
    
    // Setup close button
    const closeButton = toast.querySelector('button');
    closeButton.addEventListener('click', () => {
        closeToast(toast);
    });
/**
 * Close toast with animation
 */
function closeToast(toast) {
    toast.classList.add('opacity-0', 'translate-x-full');
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.remove();
        }
    }, 300);
    
    // Auto-close after 5 seconds
    setTimeout(() => {
        if (document.body.contains(toast)) {
            closeToast(toast);
        }
    }, 5000);
}
}

/**
 * Add image preloading for better performance
 */
(function preloadImages() {
    // Preload critical images
    const criticalImages = [
        'img/crbox-logo.png',
        // Add other critical images here
    ];
    
    criticalImages.forEach(src => {
        const img = new Image();
        img.src = src;
    });
})();

/**
 * Initialize lazy loading for images
 */
function initLazyLoading() {
    // Check if IntersectionObserver is supported
    if ('IntersectionObserver' in window) {
        const lazyImages = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    
                    // Handle onload for fade-in effect
                    img.onload = () => {
                        img.classList.add('opacity-100');
                        img.classList.remove('opacity-0');
                    };
                    
                    imageObserver.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => {
            // Add placeholder styles
            img.classList.add('transition-opacity', 'duration-500', 'opacity-0');
            
            // Start observing
            imageObserver.observe(img);
        });
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        document.querySelectorAll('img[data-src]').forEach(img => {
            img.src = img.dataset.src;
        });
    }
}

/**
 * Initialize real-time package tracking updates
 */
function initPackageTracking() {
    // Simulated tracking updates (would be replaced with real API calls)
    // Only implement if there are actual packages to track
    const packageCount = document.querySelector('.text-3xl.font-bold.text-gray-800.counter-animation');
    
    if (packageCount && parseInt(packageCount.textContent) > 0) {
        // Start periodic updates
        const trackingInterval = setInterval(() => {
            updatePackageStatuses();
        }, 60000); // Check every minute
        
        // Initial update
        updatePackageStatuses();
    }
}

/**
 * Update package statuses with simulated data
 * This would be replaced with real API calls in production
 */
function updatePackageStatuses() {
    const packages = document.querySelectorAll('.package-item');
    
    if (packages.length === 0) return;
    
    packages.forEach(pkg => {
        const statusElement = pkg.querySelector('.status-badge');
        if (!statusElement) return;
        
        // Get current status
        const currentStatus = statusElement.textContent.trim();
        
        // Simulated status progression
        const statusProgression = [
            'Recibido en Miami',
            'En procesamiento',
            'En tránsito',
            'En aduana',
            'En ruta de entrega',
            'Entregado'
        ];
        
        const currentIndex = statusProgression.indexOf(currentStatus);
        
        // Random chance to progress status (20%)
        if (currentIndex < statusProgression.length - 1 && Math.random() < 0.2) {
            const newStatus = statusProgression[currentIndex + 1];
            
            // Update status badge
            statusElement.textContent = newStatus;
            
            // Update status class
            statusElement.className = statusElement.className.replace(/status-badge-\w+/, getStatusClass(newStatus));
            
            // Show notification
            const packageId = pkg.getAttribute('data-package-id') || 'desconocido';
            showNotification(
                'Actualización de Paquete',
                `Tu paquete #${packageId} ahora está: ${newStatus}`,
                newStatus === 'Entregado' ? 'success' : 'info'
            );
        }
    });
}

/**
 * Get appropriate status badge class based on status text
 */
function getStatusClass(status) {
    switch (status) {
        case 'Recibido en Miami':
            return 'status-badge-blue';
        case 'En procesamiento':
            return 'status-badge-purple';
        case 'En tránsito':
            return 'status-badge-yellow';
        case 'En aduana':
            return 'status-badge-orange';
        case 'En ruta de entrega':
            return 'status-badge-info';
        case 'Entregado':
            return 'status-badge-green';
        default:
            return 'status-badge-gray';
    }
}

/**
 * Initialize promotion countdown timer
 */
function initPromotionTimer() {
    // Check if there's a promotion banner
    const promotionBanner = document.querySelector('.inline-flex.items-center.ml-2.px-3.py-1.rounded-full.text-xs.font-medium.bg-orange-100.text-orange-800');
    
    if (promotionBanner) {
        // Set a random end date (for demo purposes) - 3 days from now
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 3);
        
        // Create a countdown timer element
        const timerContainer = document.createElement('span');
        timerContainer.className = 'ml-1 font-bold';
        promotionBanner.appendChild(timerContainer);
        
        // Update the timer every second
        const timerInterval = setInterval(() => {
            const now = new Date();
            const distance = endDate - now;
            
            // Calculate time units
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            // Display the timer
            timerContainer.textContent = `(${days}d ${hours}h ${minutes}m ${seconds}s)`;
            
            // If the countdown is over
            if (distance < 0) {
                clearInterval(timerInterval);
                timerContainer.textContent = '(Expirado)';
                promotionBanner.style.opacity = '0.6';
            }
        }, 1000);
    }
}

/**
 * Initialize theme toggle functionality
 */
function initThemeToggle() {
    // Create theme toggle button if needed
    if (!document.getElementById('theme-toggle') && document.querySelector('footer')) {
        const footer = document.querySelector('footer');
        const footerContent = footer.querySelector('.container > div:last-child');
        
        if (footerContent) {
            const themeToggle = document.createElement('div');
            themeToggle.className = 'text-sm text-gray-400 flex items-center mt-2';
            themeToggle.innerHTML = `
                <span class="mr-2">Modo:</span>
                <button id="theme-toggle" class="relative inline-flex items-center px-1 py-1 rounded-full transition-colors duration-300" aria-label="Cambiar tema">
                    <span class="mr-2 text-gray-400"><i class="fas fa-sun"></i></span>
                    <div class="toggle-switch">
                        <input type="checkbox" id="theme-switch">
                        <span class="toggle-slider"></span>
                    </div>
                    <span class="ml-2 text-gray-400"><i class="fas fa-moon"></i></span>
                </button>
            `;
            
            footerContent.appendChild(themeToggle);
            
            // Set initial state based on user preference
            const themeSwitch = document.getElementById('theme-switch');
            if (themeSwitch) {
                // Check user's preferred color scheme
                const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                
                // Check for stored preference
                const storedTheme = localStorage.getItem('theme');
                
                // Set initial state
                if (storedTheme === 'dark' || (storedTheme === null && prefersDark)) {
                    themeSwitch.checked = true;
                    document.documentElement.classList.add('dark-theme');
                    applyDarkTheme();
                }
                
                // Add event listener
                themeSwitch.addEventListener('change', function() {
                    if (this.checked) {
                        document.documentElement.classList.add('dark-theme');
                        localStorage.setItem('theme', 'dark');
                        applyDarkTheme();
                    } else {
                        document.documentElement.classList.remove('dark-theme');
                        localStorage.setItem('theme', 'light');
                        applyLightTheme();
                    }
                });
            }
        }
    }
}

/**
 * Apply dark theme to the website
 */
function applyDarkTheme() {
    // Add dark theme styles
    const style = document.getElementById('theme-style');
    
    if (!style) {
        const themeStyle = document.createElement('style');
        themeStyle.id = 'theme-style';
        themeStyle.textContent = `
            body.dark-theme {
                background-color: #121212;
                color: #f5f5f5;
            }
            
            .dark-theme header,
            .dark-theme .bg-white,
            .dark-theme .sticky-header {
                background-color: #1a1a1a !important;
                color: #f5f5f5 !important;
            }
            
            .dark-theme .text-gray-700,
            .dark-theme .text-gray-800,
            .dark-theme .text-gray-900 {
                color: #e0e0e0 !important;
            }
            
            .dark-theme .text-gray-500,
            .dark-theme .text-gray-600 {
                color: #9e9e9e !important;
            }
            
            .dark-theme .border-gray-100,
            .dark-theme .border-gray-200 {
                border-color: #333333 !important;
            }
            
            .dark-theme .bg-gray-50,
            .dark-theme .bg-gray-100 {
                background-color: #1e1e1e !important;
            }
            
            .dark-theme footer.bg-gray-800 {
                background-color: #111111 !important;
            }
            
            .dark-theme .shadow-md,
            .dark-theme .shadow-lg,
            .dark-theme .shadow-xl {
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2) !important;
            }
            
            .dark-theme .glass-card {
                background-color: rgba(40, 40, 40, 0.5) !important;
                backdrop-filter: blur(8px);
                border-color: rgba(80, 80, 80, 0.3) !important;
            }
        `;
        document.head.appendChild(themeStyle);
    }
    
    document.body.classList.add('dark-theme');
}

/**
 * Apply light theme to the website
 */
function applyLightTheme() {
    document.body.classList.remove('dark-theme');
}

/**
 * Ejemplo de función para obtener datos de paquetes desde una API
 * Esta función se debe implementar según el backend real
 */
function fetchPackages() {
    // Esta es una simulación, reemplazar con llamada API real
    return new Promise((resolve, reject) => {
        // Simular retraso de red
        setTimeout(() => {
            // Datos de ejemplo
            const packages = [
                {
                    id: 'CR78945',
                    description: 'Paquete Amazon',
                    status: 'Recibido en Miami',
                    weight: '1.5',
                    dimensions: '30x20x15',
                    trackingNumber: '9374839201837465',
                    carrier: 'USPS',
                    receivedDate: '2025-05-08T10:45:00'
                },
                {
                    id: 'CR78946',
                    description: 'Ropa Zara',
                    status: 'En tránsito',
                    weight: '0.8',
                    dimensions: '25x15x10',
                    trackingNumber: '65432187659043',
                    carrier: 'FedEx',
                    receivedDate: '2025-05-07T14:32:00'
                }
            ];
            
            resolve(packages);
        }, 800);
    });
}

/**
 * Ejemplo de función para obtener datos de facturas desde una API
 */
function fetchInvoices() {
    // Esta es una simulación, reemplazar con llamada API real
    return new Promise((resolve, reject) => {
        // Simular retraso de red
        setTimeout(() => {
            // Datos de ejemplo
            const invoices = [
                {
                    id: 'F-2025-0123',
                    amount: 45.50,
                    status: 'Pendiente',
                    dueDate: '2025-05-15',
                    packages: ['CR78945'],
                    createdDate: '2025-05-07T15:30:00'
                }
            ];
            
            resolve(invoices);
        }, 600);
    });
}

/**
 * Ejemplo de función para procesar un pago
 */
function processPayment(invoiceId, paymentMethod, amount) {
    // Esta es una simulación, reemplazar con llamada API real
    return new Promise((resolve, reject) => {
        // Simular retraso de red
        setTimeout(() => {
            // Simular éxito del 90% de las veces
            if (Math.random() < 0.9) {
                resolve({
                    success: true,
                    transactionId: 'TR' + Math.floor(Math.random() * 1000000),
                    invoiceId: invoiceId,
                    amount: amount,
                    date: new Date().toISOString()
                });
            } else {
                reject({
                    success: false,
                    error: 'Error procesando el pago',
                    errorCode: 'PAYMENT_ERROR'
                });
            }
        }, 1500);
    });
}

/**
 * Formatear fecha en formato legible
 * @param {string|Date} date - Fecha a formatear
 * @param {boolean} includeTime - Si se debe incluir la hora
 * @returns {string} Fecha formateada
 */
function formatDate(date, includeTime = false) {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    const day = d.getDate();
    const month = d.toLocaleString('default', { month: 'long' });
    const year = d.getFullYear();
    
    let formattedDate = `${day} ${month}, ${year}`;
    
    if (includeTime) {
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        formattedDate += ` ${hours}:${minutes}`;
    }
    
    return formattedDate;
}

/**
 * Formatear moneda
 * @param {number} amount - Cantidad a formatear
 * @param {string} currency - Código de moneda (USD, EUR, etc.)
 * @returns {string} Cantidad formateada
 */
function formatCurrency(amount, currency = 'USD') {
    if (isNaN(amount)) return '';
    
    return new Intl.NumberFormat('es-CR', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

/**
 * Formatear peso
 * @param {number|string} weight - Peso a formatear
 * @param {string} unit - Unidad (kg, lb)
 * @returns {string} Peso formateado
 */
function formatWeight(weight, unit = 'kg') {
    if (!weight) return '0 ' + unit;
    
    const numWeight = parseFloat(weight);
    if (isNaN(numWeight)) return '0 ' + unit;
    
    return numWeight.toFixed(2) + ' ' + unit;
}

/**
 * Obtener el tiempo transcurrido desde una fecha
 * @param {string|Date} date - Fecha a calcular
 * @returns {string} Tiempo transcurrido en formato legible
 */
function timeAgo(date) {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    
    const seconds = Math.floor((now - d) / 1000);
    
    // Menos de un minuto
    if (seconds < 60) {
        return 'Hace un momento';
    }
    
    // Menos de una hora
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    }
    
    // Menos de un día
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    
    // Menos de una semana
    const days = Math.floor(hours / 24);
    if (days < 7) {
        return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
    }
    
    // Formatear fecha normal
    return formatDate(d);
}

/**
 * Comprobación de carga del documento
 * Esto asegura que el script se inicialice correctamente incluso si
 * se añade después de que el documento ya se haya cargado
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initDashboard();
    });
} else {
    initDashboard();
}

/**
 * Función principal de inicialización
 */
function initDashboard() {
    // Initialize all dashboard components
    initStickyHeader();
    initMobileMenu();
    initTabNavigation();
    initCounterAnimation();
    initNotifications();
    initCopyFunctions();
    initAnimations();
    initToggleActivityView();
    initAccessibility();
    initPackageTracking();
    
    // Show welcome message with personalized greeting
    showWelcomeMessage();
    
    // Iniciar promoción (opcional)
    initPromotionTimer();
    
    // Log initialization
    console.log('CRBOX Dashboard inicializado correctamente: ' + new Date().toISOString());
}