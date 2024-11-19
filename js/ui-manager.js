import { state } from './state.js';
import { firebaseService } from './firebase-service.js';

// ui-manager.js
class UIManager {

    handleLogoDirection() {
        const logo = document.querySelector('.site-logo');
        if (!logo) return;

        const isRTL = this.state.language === 'ar';
        const logoSrc = isRTL ? 
            logo.dataset.logoRtl : 
            logo.dataset.logoLtr;

        if (logoSrc) {
            logo.src = logoSrc;
        }
    }
    constructor(state, firebaseService) {
        this.state = state;
        this.firebase = firebaseService;
        this.elements = this.initializeElements();
        this.setupStateObserver();
        this.setupEventListeners();
        this.activeTimeouts = new Set();
        this.animationDuration = 300;
    }

    initializeElements() {
        return {
            steps: {
                progress: document.querySelectorAll('.progress-step'),
                content: document.querySelectorAll('.booking-step')
            },
            navigation: {
                prev: document.querySelector('.prev-btn'),
                next: document.querySelector('.next-btn')
            },
            grids: {
                categories: document.querySelector('.categories-services-grid'),
                timeSlots: document.querySelector('.time-slots-grid'),
                barbers: document.querySelector('.barbers-grid')
            },
            forms: {
                booking: document.getElementById('booking-form'),
                name: document.getElementById('customer-name'),
                phone: document.getElementById('customer-phone')
            },
            summary: {
                container: document.querySelector('.booking-summary'),
                content: document.querySelector('.summary-content'),
                toggle: document.querySelector('.toggle-summary')
            },
            datePicker: document.getElementById('appointment-date'),
            languageButtons: document.querySelectorAll('.language-option'),
            loadingOverlay: document.querySelector('.loading-overlay'),
            toastContainer: this.createToastContainer()
        };
    }

    setupStateObserver() {
        this.state.subscribe(() => {
            this.updateUI();
        });
    }

    setupEventListeners() {
        // Navigation
        this.elements.navigation.prev?.addEventListener('click', () => this.handleNavigation('prev'));
        this.elements.navigation.next?.addEventListener('click', () => this.handleNavigation('next'));

        // Category and Service Selection
        this.elements.grids.categories?.addEventListener('click', (e) => {
            const categoryHeader = e.target.closest('.category-header');
            if (categoryHeader) {
                this.toggleCategory(categoryHeader.closest('.category'));
                return;
            }

            const serviceCard = e.target.closest('.service-card');
            if (serviceCard) {
                this.handleServiceSelection(serviceCard);
            }
        });

        // Date and Time Selection
        this.elements.datePicker?.addEventListener('change', (e) => {
            this.handleDateSelection(e.target.value);
        });

        this.elements.grids.timeSlots?.addEventListener('click', (e) => {
            const timeSlot = e.target.closest('.time-slot');
            if (timeSlot && !timeSlot.disabled) {
                this.handleTimeSlotSelection(timeSlot);
            }
        });

        // Barber Selection
        this.elements.grids.barbers?.addEventListener('click', (e) => {
            const barberCard = e.target.closest('.barber-card');
            if (barberCard && !barberCard.classList.contains('unavailable')) {
                this.handleBarberSelection(barberCard);
            }
        });

        // Form Validation
        this.elements.forms.name?.addEventListener('input', (e) => {
            this.validateField(e.target, 'name');
        });

        this.elements.forms.phone?.addEventListener('input', (e) => {
            this.validateField(e.target, 'phone');
        });

        // Summary Toggle
        this.elements.summary.toggle?.addEventListener('click', () => {
            this.toggleSummary();
        });

        // Language Switching
        this.elements.languageButtons?.forEach(button => {
            button.addEventListener('click', () => {
                this.handleLanguageChange(button.dataset.lang);
            });
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state?.step) {
                this.state.setState({ currentStep: e.state.step });
            }
        });
    }

    // UI Update Methods
    updateUI() {

        this.handleLogoDirection();  // Added for logo direction        this.updateSteps();
        this.updateNavigationButtons();
        this.updateSummary();
        this.updateLanguageButtons();
        this.updateDirectionality();
    }

    updateSteps() {
        const { currentStep } = this.state;
        const progressSteps = this.elements.steps.progress;
        const contentSteps = this.elements.steps.content;

        progressSteps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.toggle('active', stepNumber === currentStep);
            step.classList.toggle('completed', stepNumber < currentStep);

            const circle = step.querySelector('.step-circle');
            if (circle) {
                if (stepNumber < currentStep) {
                    circle.innerHTML = '✓';
                    circle.setAttribute('aria-label', 'Completed');
                } else {
                    circle.textContent = stepNumber;
                }
            }
        });

        contentSteps.forEach((content, index) => {
            const stepNumber = index + 1;
            if (stepNumber === currentStep) {
                this.showStepContent(content);
            } else {
                this.hideStepContent(content);
            }
        });

        this.updateProgressBar(currentStep);
    }

    async showStepContent(element) {
        // Ensure element is displayed before animating
        element.style.display = 'block';
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        element.classList.add('active');
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Announce to screen readers
        this.announceStepChange(element);
    }

    hideStepContent(element) {
        element.classList.remove('active');
        
        const timeout = setTimeout(() => {
            if (!element.classList.contains('active')) {
                element.style.display = 'none';
            }
        }, this.animationDuration);

        this.activeTimeouts.add(timeout);
    }

    updateProgressBar(currentStep) {
        const progress = ((currentStep - 1) / (this.state.maxSteps - 1)) * 100;
        const progressLine = document.querySelector('.progress-line');
        if (progressLine) {
            progressLine.style.setProperty('--progress', `${progress}%`);
        }
    }

    updateNavigationButtons() {
        const { prev, next } = this.elements.navigation;
        
        if (prev) {
            const canGoPrevious = this.state.canGoPrevious();
            prev.disabled = !canGoPrevious;
            prev.setAttribute('aria-disabled', !canGoPrevious);
        }
        
        if (next) {
            const canGoNext = this.state.canGoNext();
            next.disabled = !canGoNext;
            next.setAttribute('aria-disabled', !canGoNext);
            
            // Update button text based on step
            const isLastStep = this.state.currentStep === this.state.maxSteps;
            next.textContent = this.translate(isLastStep ? 'confirm_booking' : 'next');
        }
    }

    // Category and Service Selection Methods
    toggleCategory(category) {
        const services = category.querySelector('.category-services');
        const toggle = category.querySelector('.category-toggle');
        const isExpanded = services.getAttribute('aria-expanded') === 'true';

        services.setAttribute('aria-expanded', !isExpanded);
        category.classList.toggle('open');
        toggle.textContent = isExpanded ? '+' : '-';
        
        if (!isExpanded) {
            const height = services.scrollHeight;
            services.style.height = '0';
            services.offsetHeight; // Force reflow
            services.style.height = `${height}px`;
            
            services.addEventListener('transitionend', () => {
                services.style.height = 'auto';
            }, { once: true });
        } else {
            services.style.height = `${services.scrollHeight}px`;
            services.offsetHeight; // Force reflow
            services.style.height = '0';
        }
    }

    handleServiceSelection(card) {
        try {
            const serviceId = card.dataset.serviceId;
            const service = this.findServiceById(serviceId);
            
            if (!service) {
                throw new Error(this.translate('service_not_found'));
            }

            this.state.toggleService(serviceId, service);
            this.updateServiceCardUI(card);
            this.updateSummary();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    findServiceById(serviceId) {
        for (const [_, category] of this.state.categories) {
            if (category.services?.[serviceId]) {
                return {
                    id: serviceId,
                    ...category.services[serviceId]
                };
            }
        }
        return null;
    }

    updateServiceCardUI(card) {
        const serviceId = card.dataset.serviceId;
        const isSelected = this.state.selectedServices.has(serviceId);
        
        card.classList.toggle('selected', isSelected);
        card.setAttribute('aria-pressed', isSelected);
        
        const indicator = card.querySelector('.service-selected-icon');
        if (indicator) {
            indicator.style.transform = isSelected ? 'scale(1)' : 'scale(0)';
        }
    }

    // Date and Time Selection Methods
    async handleDateSelection(date) {
        if (!date) return;

        try {
            this.showLoading(true);
            const timeSlots = await this.generateTimeSlots(date);
            this.state.setState({ selectedDate: date });
            this.renderTimeSlots(timeSlots);
            this.setupAvailabilitySubscriptions(date);
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async generateTimeSlots(date) {
        const slots = [];
        const selectedDate = new Date(date);
        const totalDuration = this.calculateTotalDuration();

        const [startHour, startMin] = CONFIG.business.workingHours.start.split(':');
        const [endHour, endMin] = CONFIG.business.workingHours.end.split(':');

        let currentSlot = new Date(selectedDate);
        currentSlot.setHours(parseInt(startHour), parseInt(startMin), 0, 0);

        const endTime = new Date(selectedDate);
        endTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0);

        while (currentSlot < endTime) {
            if (currentSlot > new Date()) {
                slots.push({
                    time: currentSlot.toTimeString().slice(0, 5),
                    available: true
                });
            }
            
            currentSlot = new Date(currentSlot.getTime() + 
                               CONFIG.business.timeSlotInterval * 60000);
        }

        return slots;
    }

    // Toast Notifications
    showToast(message, type = 'success', duration = 5000) {
        const toast = this.createToastElement(message, type);
        this.elements.toastContainer.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));

        const dismissTimeout = setTimeout(() => this.dismissToast(toast), duration);
        toast.dataset.timeoutId = dismissTimeout;
        this.activeTimeouts.add(dismissTimeout);

        return toast;
    }

    createToastElement(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-message">${message}</div>
                <button class="toast-close" aria-label="${this.translate('close')}">×</button>
            </div>
            <div class="toast-progress"></div>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.dismissToast(toast);
        });

        return toast;
    }

    dismissToast(toast) {
        clearTimeout(parseInt(toast.dataset.timeoutId));
        toast.classList.add('hiding');
        
        toast.addEventListener('animationend', () => {
            toast.remove();
            if (this.elements.toastContainer.children.length === 0) {
                this.elements.toastContainer.remove();
            }
        });
    }

    // Loading State Management
    showLoading(show) {
        const overlay = this.elements.loadingOverlay;
        if (!overlay) return;

        overlay.classList.toggle('active', show);
        overlay.setAttribute('aria-hidden', !show);
        
        if (show) {
            overlay.querySelector('.loading-text').textContent = 
                this.translate('loading');
        }
    }

    // Cleanup
    cleanup() {
        this.activeTimeouts.forEach(clearTimeout);
        this.activeTimeouts.clear();
        
        // Remove event listeners
        this.elements.grids.categories?.replaceWith(
            this.elements.grids.categories.cloneNode(true)
        );
        
        this.elements.toastContainer?.remove();
        this.elements.loadingOverlay?.remove();
        
        // Stop all animations
        document.getAnimations().forEach(animation => animation.cancel());
    }

    // Translation Helper
    translate(key) {
        const translations = {
            loading: {
                en: 'Loading...',
                ar: 'جاري التحميل...'
            },
            next: {
                en: 'Next',
                ar: 'التالي'
            },
            confirm_booking: {
                en: 'Confirm Booking',
                ar: 'تأكيد الحجز'
            },
            close: {
                en: 'Close',
                ar: 'إغلاق'
            },
            service_not_found: {
                en: 'Service not found',
                ar: 'الخدمة غير موجودة'
            }
            // Add more translations as needed
        };

        return translations[key]?.[this.state.language] || key;
    }
}

export const uiManager = new UIManager(state, firebaseService);
