// Configuration
const CONFIG = {
    firebase: {
        apiKey: "AIzaSyA0Syrv4XH88PTzQUaZlZMJ_85n8",
        authDomain: "ekka-barbershop.firebaseapp.com",
        databaseURL: "https://ekka-barbershop-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "ekka-barbershop",
        storageBucket: "ekka-barbershop.firebasestorage.app",
        messagingSenderId: "726879506857",
        appId: "1:726879506857:web:497e0576037a3bcf8d74b8"
    },
    business: {
        workingHours: {
            start: "08:00",
            end: "23:59"
        },
        appointmentDuration: 30,
        timeSlotInterval: 30,
        bufferTime: 15,
        maxServicesPerBooking: 5
    },
    cache: {
        duration: {
            categories: 5 * 60 * 1000,  // 5 minutes
            barbers: 2 * 60 * 1000,     // 2 minutes
            availability: 1 * 60 * 1000  // 1 minute
        }
    }
};

// Utility functions
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

const formatCurrency = (amount, locale = 'ar-SA', currency = 'SAR') => {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
};

const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${remainingMinutes}m`;
};

// Firebase Service
class FirebaseService {
    constructor() {
        this.db = null;
        this.activeSubscriptions = new Map();
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.cache = new Map();
    }

    async initializeFirebase() {
        try {
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js');
            const { getDatabase } = await import('https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js');

            const app = initializeApp(CONFIG.firebase);
            this.db = getDatabase(app);

            await this.testConnection();
            this.setupConnectionMonitoring();
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            throw new Error('Failed to initialize Firebase');
        }
    }

    async testConnection() {
        let attempts = 0;
        while (attempts < this.retryAttempts) {
            try {
                await this.db.ref('.info/connected').once('value');
                return true;
            } catch (error) {
                attempts++;
                if (attempts === this.retryAttempts) throw error;
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempts));
            }
        }
    }

    setupConnectionMonitoring() {
        this.db.ref('.info/connected').on('value', (snapshot) => {
            const isConnected = snapshot.val() === true;
            document.dispatchEvent(new CustomEvent('connection-status', {
                detail: { 
                    status: isConnected ? 'connected' : 'disconnected',
                    message: isConnected ? 'Connection restored' : 'Connection lost. Retrying...'
                }
            }));
        });
    }

    async fetchWithCache(path, duration) {
        const cacheKey = `${path}_${duration}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp < duration)) {
            return cached.data;
        }

        try {
            const snapshot = await this.db.ref(path).once('value');
            const data = snapshot.val();
            
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            
            return data;
        } catch (error) {
            console.error(`Error fetching ${path}:`, error);
            throw error;
        }
    }

    async getCategories() {
        return this.fetchWithCache('categories', CONFIG.cache.duration.categories);
    }

    async getBarbers() {
        const barbers = await this.fetchWithCache('barbers', CONFIG.cache.duration.barbers);
        return Object.entries(barbers)
            .filter(([_, barber]) => barber.active)
            .reduce((acc, [id, barber]) => ({...acc, [id]: barber}), {});
    }

    subscribeToBarberAvailability(barberId, date, callback) {
        const dateStr = new Date(date).toISOString().split('T')[0];
        const subscriptionKey = `availability_${barberId}_${dateStr}`;

        this.unsubscribe(subscriptionKey);

        const subscription = this.db.ref('bookings')
            .orderByChild('barberId')
            .equalTo(barberId)
            .on('value', snapshot => {
                const bookings = snapshot.val() || {};
                const unavailableTimes = this.processBookingsForAvailability(bookings, dateStr);
                callback(unavailableTimes);
            });

        this.activeSubscriptions.set(subscriptionKey, {
            ref: this.db.ref('bookings'),
            callback: subscription
        });

        return () => this.unsubscribe(subscriptionKey);
    }

    processBookingsForAvailability(bookings, dateStr) {
        return Object.values(bookings)
            .filter(booking => {
                const bookingDate = new Date(booking.dateTime).toISOString().split('T')[0];
                return bookingDate === dateStr && booking.status !== 'cancelled';
            })
            .map(booking => ({
                start: new Date(booking.dateTime).getTime(),
                end: new Date(booking.dateTime).getTime() + 
                     (booking.duration * 60 * 1000) + 
                     (CONFIG.business.bufferTime * 60 * 1000)
            }));
    }

    async createBooking(bookingData) {
        try {
            const newBookingRef = await this.db.ref('bookings').push({
                ...bookingData,
                status: 'pending',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            return newBookingRef.key;
        } catch (error) {
            console.error('Error creating booking:', error);
            throw error;
        }
    }

    unsubscribe(key) {
        const subscription = this.activeSubscriptions.get(key);
        if (subscription) {
            subscription.ref.off('value', subscription.callback);
            this.activeSubscriptions.delete(key);
        }
    }

    cleanup() {
        this.activeSubscriptions.forEach((_, key) => this.unsubscribe(key));
        this.activeSubscriptions.clear();
        this.db?.ref('.info/connected').off();
        this.cache.clear();
    }
}

// Booking State
class BookingState {
    constructor() {
        this.currentStep = 1;
        this.maxSteps = 4;
        this.language = this.getInitialLanguage();
        this.loading = false;
        this.error = null;
        this.selectedServices = new Map();
        this.selectedDate = null;
        this.selectedTime = null;
        this.selectedDateTime = null;
        this.selectedBarber = null;
        this.customerDetails = {
            name: '',
            phone: ''
        };
        this.categories = new Map();
        this.barbers = new Map();
        this.availableTimeSlots = [];
        this.observers = new Set();
        this.initialize();
    }

    initialize() {
        this.loadPersistedState();
        this.setupLanguageObserver();
        this.initializeDirectionality();
    }

    getInitialLanguage() {
        const saved = localStorage.getItem('preferred_language');
        const browser = navigator.language.startsWith('ar') ? 'ar' : 'en';
        return saved || browser;
    }

    setupLanguageObserver() {
        const observer = new MutationObserver(() => {
            const htmlLang = document.documentElement.lang;
            if (htmlLang && htmlLang !== this.language) {
                this.setLanguage(htmlLang);
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['lang']
        });
    }

    initializeDirectionality() {
        document.documentElement.dir = this.language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = this.language;
    }

    setState(updates, notify = true) {
        let hasChanges = false;
        
        Object.entries(updates).forEach(([key, value]) => {
            if (this[key] !== value) {
                this[key] = value;
                hasChanges = true;
            }
        });

        if (hasChanges && notify) {
            this.persistState();
            this.notifyObservers();
        }
    }

    setLanguage(lang) {
        if (lang !== this.language && (lang === 'ar' || lang === 'en')) {
            this.setState({ language: lang });
            localStorage.setItem('preferred_language', lang);
            this.initializeDirectionality();
        }
    }

    toggleService(serviceId, serviceData) {
        const updatedServices = new Map(this.selectedServices);
        
        if (updatedServices.has(serviceId)) {
            updatedServices.delete(serviceId);
        } else {
            if (updatedServices.size >= CONFIG.business.maxServicesPerBooking) {
                throw new Error(
                    this.language === 'ar' 
                        ? `لا يمكن اختيار أكثر من ${CONFIG.business.maxServicesPerBooking} خدمات`
                        : `Cannot select more than ${CONFIG.business.maxServicesPerBooking} services`
                );
            }
            updatedServices.set(serviceId, serviceData);
        }
        
        this.setState({
            selectedServices: updatedServices,
            selectedDateTime: null,
            selectedBarber: null
        });
    }

    setSelectedDate(date) {
        this.setState({
            selectedDate: date,
            selectedTime: null,
            selectedDateTime: null,
            selectedBarber: null
        });
    }

    setSelectedTime(time) {
        if (!this.selectedDate) return;
        
        const dateTime = new Date(`${this.selectedDate}T${time}`);
        this.setState({
            selectedTime: time,
            selectedDateTime: dateTime.toISOString(),
            selectedBarber: null
        });
    }

    setSelectedBarber(barberId) {
        const barber = this.barbers.get(barberId);
        if (!barber) {
            throw new Error('Invalid barber selection');
        }
        this.setState({ selectedBarber: { id: barberId, ...barber } });
    }

    canGoNext() {
        switch (this.currentStep) {
            case 1:
                return this.selectedServices.size > 0 && 
                       this.selectedServices.size <= CONFIG.business.maxServicesPerBooking;
            case 2:
                return this.selectedDateTime !== null;
            case 3:
                return this.selectedBarber !== null;
            case 4:
                return this.validateCustomerDetails();
            default:
                return false;
        }
    }

    canGoPrevious() {
        return this.currentStep > 1;
    }

    async goToNextStep() {
        if (!this.canGoNext() || this.currentStep >= this.maxSteps) return false;

        try {
            this.setState({ loading: true });
            await this.preloadNextStepData();
            this.setState({
                currentStep: this.currentStep + 1,
                loading: false
            });
            return true;
        } catch (error) {
            this.setState({
                error: error.message,
                loading: false
            });
            return false;
        }
    }

    goToPreviousStep() {
        if (!this.canGoPrevious()) return false;
        this.setState({ currentStep: this.currentStep - 1 });
        return true;
    }

    validateCustomerDetails() {
        const { name, phone } = this.customerDetails;
        const phoneRegex = /^05[0-9]{8}$/;
        
        return name.length >= 3 && phoneRegex.test(phone);
    }

    validateDateTime(dateTime) {
        const selected = new Date(dateTime);
        const now = new Date();

        if (selected <= now) return false;

        const hours = selected.getHours();
        const minutes = selected.getMinutes();
        const [startHour, startMin] = CONFIG.business.workingHours.start.split(':').map(Number);
        const [endHour, endMin] = CONFIG.business.workingHours.end.split(':').map(Number);

        const timeInMinutes = hours * 60 + minutes;
        const startInMinutes = startHour * 60 + startMin;
        const endInMinutes = endHour * 60 + endMin;

        return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
    }

    subscribe(observer) {
        this.observers.add(observer);
        return () => this.observers.delete(observer);
    }

    notifyObservers() {
        this.observers.forEach(observer => observer(this));
    }

    persistState() {
        const stateToSave = {
            currentStep: this.currentStep,
            language: this.language,
            selectedServices: Array.from(this.selectedServices.entries()),
            selectedDate: this.selectedDate,
            selectedTime: this.selectedTime,
            selectedDateTime: this.selectedDateTime,
            selectedBarber: this.selectedBarber,
            customerDetails: this.customerDetails
        };
        
        localStorage.setItem('bookingState', JSON.stringify(stateToSave));
    }

    loadPersistedState() {
        try {
            const saved = localStorage.getItem('bookingState');
            if (!saved) return;

            const parsed = JSON.parse(saved);
            
            const restoredServices = new Map(parsed.selectedServices || []);
            
            this.setState({
                currentStep: parsed.currentStep || 1,
                language: parsed.language || this.language,
                selectedServices: restoredServices,
                selectedDate: parsed.selectedDate || null,
                selectedTime: parsed.selectedTime || null,
                selectedDateTime: parsed.selectedDateTime || null,
                selectedBarber: parsed.selectedBarber || null,
                customerDetails: parsed.customerDetails || { name: '', phone: '' }
            }, false);
        } catch (error) {
            console.error('Error loading persisted state:', error);
            localStorage.removeItem('bookingState');
        }
    }

    reset() {
        this.setState({
            currentStep: 1,
            selectedServices: new Map(),
            selectedDate: null,
            selectedTime: null,
            selectedDateTime: null,
            selectedBarber: null,
            customerDetails: {
                name: '',
                phone: ''
            },
            error: null
        });
        localStorage.removeItem('bookingState');
    }

    async preloadNextStepData() {
        const nextStep = this.currentStep + 1;
        switch (nextStep) {
            case 2:
                await this.preloadTimeSlots();
                break;
            case 3:
                await this.preloadBarbers();
                break;
        }
    }

    async preloadTimeSlots() {
        // Implementation will be added in the UI Manager
    }

    async preloadBarbers() {
        // Implementation will be added in the UI Manager
    }
}

// UI Manager
class UIManager {
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
        this.elements.navigation.prev?.addEventListener('click', () => this.handleNavigation('prev'));
        this.elements.navigation.next?.addEventListener('click', () => this.handleNavigation('next'));

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

        this.elements.datePicker?.addEventListener('change', (e) => {
            this.handleDateSelection(e.target.value);
        });

        this.elements.grids.timeSlots?.addEventListener('click', (e) => {
            const timeSlot = e.target.closest('.time-slot');
            if (timeSlot && !timeSlot.disabled) {
                this.handleTimeSlotSelection(timeSlot);
            }
        });

        this.elements.grids.barbers?.addEventListener('click', (e) => {
            const barberCard = e.target.closest('.barber-card');
            if (barberCard && !barberCard.classList.contains('unavailable')) {
                this.handleBarberSelection(barberCard);
            }
        });

        this.elements.forms.name?.addEventListener('input', (e) => {
            this.validateField(e.target, 'name');
        });

        this.elements.forms.phone?.addEventListener('input', (e) => {
            this.validateField(e.target, 'phone');
        });

        this.elements.summary.toggle?.addEventListener('click', () => {
            this.toggleSummary();
        });

        this.elements.languageButtons?.forEach(button => {
            button.addEventListener('click', () => {
                this.handleLanguageChange(button.dataset.lang);
            });
        });

        window.addEventListener('popstate', (e) => {
            if (e.state?.step) {
                this.state.setState({ currentStep: e.state.step });
            }
        });
    }

    updateUI() {
        this.updateSteps();
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
        element.style.display = 'block';
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        element.classList.add('active');
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
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
            
            const isLastStep = this.state.currentStep === this.state.maxSteps;
            next.textContent = this.translate(isLastStep ? 'confirm_booking' : 'next');
        }
    }

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

    cleanup() {
        this.activeTimeouts.forEach(clearTimeout);
        this.activeTimeouts.clear();
        
        this.elements.grids.categories?.replaceWith(
            this.elements.grids.categories.cloneNode(true)
        );
        
        this.elements.toastContainer?.remove();
        this.elements.loadingOverlay?.remove();
        
        document.getAnimations().forEach(animation => animation.cancel());
    }

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
        };

        return translations[key]?.[this.state.language] || key;
    }
}

// Booking Manager
class BookingManager {
    constructor(state, firebaseService, uiManager) {
        this.state = state;
        this.firebase = firebaseService;
        this.ui = uiManager;
        this.flatpickr = null;
        this.availabilitySubscriptions = new Map();
        
        this.initialize();
    }

    async initialize() {
        try {
            this.ui.showLoading(true);
            await Promise.all([
                this.initializeCategories(),
                this.initializeBarbers(),
                this.initializeCalendar()
            ]);
            this.setupRealTimeUpdates();
            this.ui.showLoading(false);
        } catch (error) {
            this.handleError(error);
            this.ui.showLoading(false);
        }
    }

    async initializeCategories() {
        const categories = await this.firebase.getCategories();
        this.state.setState({ categories: new Map(Object.entries(categories)) });
        this.ui.renderCategories(categories);
    }

async initializeBarbers() {
    const barbers = await this.firebase.getBarbers();
    this.state.setState({ barbers: new Map(Object.entries(barbers)) });
}



```javascript project="Ekka Barbershop" file="script.js" type="react"
// Configuration
const CONFIG = {
    firebase: {
        apiKey: "AIzaSyA0Syrv4XH88PTzQUaZlZMJ_85n8",
        authDomain: "ekka-barbershop.firebaseapp.com",
        databaseURL: "https://ekka-barbershop-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "ekka-barbershop",
        storageBucket: "ekka-barbershop.firebasestorage.app",
        messagingSenderId: "726879506857",
        appId: "1:726879506857:web:497e0576037a3bcf8d74b8"
    },
    business: {
        workingHours: {
            start: "08:00",
            end: "23:59"
        },
        appointmentDuration: 30,
        timeSlotInterval: 30,
        bufferTime: 15,
        maxServicesPerBooking: 5
    },
    cache: {
        duration: {
            categories: 5 * 60 * 1000,  // 5 minutes
            barbers: 2 * 60 * 1000,     // 2 minutes
            availability: 1 * 60 * 1000  // 1 minute
        }
    }
};

// Utility functions
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

const formatCurrency = (amount, locale = 'ar-SA', currency = 'SAR') => {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
};

const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${remainingMinutes}m`;
};

// Firebase Service
class FirebaseService {
    constructor() {
        this.db = null;
        this.activeSubscriptions = new Map();
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.cache = new Map();
    }

    async initializeFirebase() {
        try {
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js');
            const { getDatabase } = await import('https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js');

            const app = initializeApp(CONFIG.firebase);
            this.db = getDatabase(app);

            await this.testConnection();
            this.setupConnectionMonitoring();
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            throw new Error('Failed to initialize Firebase');
        }
    }

    async testConnection() {
        let attempts = 0;
        while (attempts < this.retryAttempts) {
            try {
                await this.db.ref('.info/connected').once('value');
                return true;
            } catch (error) {
                attempts++;
                if (attempts === this.retryAttempts) throw error;
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempts));
            }
        }
    }

    setupConnectionMonitoring() {
        this.db.ref('.info/connected').on('value', (snapshot) => {
            const isConnected = snapshot.val() === true;
            document.dispatchEvent(new CustomEvent('connection-status', {
                detail: { 
                    status: isConnected ? 'connected' : 'disconnected',
                    message: isConnected ? 'Connection restored' : 'Connection lost. Retrying...'
                }
            }));
        });
    }

    async fetchWithCache(path, duration) {
        const cacheKey = `${path}_${duration}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp < duration)) {
            return cached.data;
        }

        try {
            const snapshot = await this.db.ref(path).once('value');
            const data = snapshot.val();
            
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            
            return data;
        } catch (error) {
            console.error(`Error fetching ${path}:`, error);
            throw error;
        }
    }

    async getCategories() {
        return this.fetchWithCache('categories', CONFIG.cache.duration.categories);
    }

    async getBarbers() {
        const barbers = await this.fetchWithCache('barbers', CONFIG.cache.duration.barbers);
        return Object.entries(barbers)
            .filter(([_, barber]) => barber.active)
            .reduce((acc, [id, barber]) => ({...acc, [id]: barber}), {});
    }

    subscribeToBarberAvailability(barberId, date, callback) {
        const dateStr = new Date(date).toISOString().split('T')[0];
        const subscriptionKey = `availability_${barberId}_${dateStr}`;

        this.unsubscribe(subscriptionKey);

        const subscription = this.db.ref('bookings')
            .orderByChild('barberId')
            .equalTo(barberId)
            .on('value', snapshot => {
                const bookings = snapshot.val() || {};
                const unavailableTimes = this.processBookingsForAvailability(bookings, dateStr);
                callback(unavailableTimes);
            });

        this.activeSubscriptions.set(subscriptionKey, {
            ref: this.db.ref('bookings'),
            callback: subscription
        });

        return () => this.unsubscribe(subscriptionKey);
    }

    processBookingsForAvailability(bookings, dateStr) {
        return Object.values(bookings)
            .filter(booking => {
                const bookingDate = new Date(booking.dateTime).toISOString().split('T')[0];
                return bookingDate === dateStr && booking.status !== 'cancelled';
            })
            .map(booking => ({
                start: new Date(booking.dateTime).getTime(),
                end: new Date(booking.dateTime).getTime() + 
                     (booking.duration * 60 * 1000) + 
                     (CONFIG.business.bufferTime * 60 * 1000)
            }));
    }

    async createBooking(bookingData) {
        try {
            const newBookingRef = await this.db.ref('bookings').push({
                ...bookingData,
                status: 'pending',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            return newBookingRef.key;
        } catch (error) {
            console.error('Error creating booking:', error);
            throw error;
        }
    }

    unsubscribe(key) {
        const subscription = this.activeSubscriptions.get(key);
        if (subscription) {
            subscription.ref.off('value', subscription.callback);
            this.activeSubscriptions.delete(key);
        }
    }

    cleanup() {
        this.activeSubscriptions.forEach((_, key) => this.unsubscribe(key));
        this.activeSubscriptions.clear();
        this.db?.ref('.info/connected').off();
        this.cache.clear();
    }
}

// Booking State
class BookingState {
    constructor() {
        this.currentStep = 1;
        this.maxSteps = 4;
        this.language = this.getInitialLanguage();
        this.loading = false;
        this.error = null;
        this.selectedServices = new Map();
        this.selectedDate = null;
        this.selectedTime = null;
        this.selectedDateTime = null;
        this.selectedBarber = null;
        this.customerDetails = {
            name: '',
            phone: ''
        };
        this.categories = new Map();
        this.barbers = new Map();
        this.availableTimeSlots = [];
        this.observers = new Set();
        this.initialize();
    }

    initialize() {
        this.loadPersistedState();
        this.setupLanguageObserver();
        this.initializeDirectionality();
    }

    getInitialLanguage() {
        const saved = localStorage.getItem('preferred_language');
        const browser = navigator.language.startsWith('ar') ? 'ar' : 'en';
        return saved || browser;
    }

    setupLanguageObserver() {
        const observer = new MutationObserver(() => {
            const htmlLang = document.documentElement.lang;
            if (htmlLang && htmlLang !== this.language) {
                this.setLanguage(htmlLang);
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['lang']
        });
    }

    initializeDirectionality() {
        document.documentElement.dir = this.language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = this.language;
    }

    setState(updates, notify = true) {
        let hasChanges = false;
        
        Object.entries(updates).forEach(([key, value]) => {
            if (this[key] !== value) {
                this[key] = value;
                hasChanges = true;
            }
        });

        if (hasChanges && notify) {
            this.persistState();
            this.notifyObservers();
        }
    }

    setLanguage(lang) {
        if (lang !== this.language && (lang === 'ar' || lang === 'en')) {
            this.setState({ language: lang });
            localStorage.setItem('preferred_language', lang);
            this.initializeDirectionality();
        }
    }

    toggleService(serviceId, serviceData) {
        const updatedServices = new Map(this.selectedServices);
        
        if (updatedServices.has(serviceId)) {
            updatedServices.delete(serviceId);
        } else {
            if (updatedServices.size >= CONFIG.business.maxServicesPerBooking) {
                throw new Error(
                    this.language === 'ar' 
                        ? `لا يمكن اختيار أكثر من ${CONFIG.business.maxServicesPerBooking} خدمات`
                        : `Cannot select more than ${CONFIG.business.maxServicesPerBooking} services`
                );
            }
            updatedServices.set(serviceId, serviceData);
        }
        
        this.setState({
            selectedServices: updatedServices,
            selectedDateTime: null,
            selectedBarber: null
        });
    }

    setSelectedDate(date) {
        this.setState({
            selectedDate: date,
            selectedTime: null,
            selectedDateTime: null,
            selectedBarber: null
        });
    }

    setSelectedTime(time) {
        if (!this.selectedDate) return;
        
        const dateTime = new Date(`${this.selectedDate}T${time}`);
        this.setState({
            selectedTime: time,
            selectedDateTime: dateTime.toISOString(),
            selectedBarber: null
        });
    }

    setSelectedBarber(barberId) {
        const barber = this.barbers.get(barberId);
        if (!barber) {
            throw new Error('Invalid barber selection');
        }
        this.setState({ selectedBarber: { id: barberId, ...barber } });
    }

    canGoNext() {
        switch (this.currentStep) {
            case 1:
                return this.selectedServices.size > 0 && 
                       this.selectedServices.size <= CONFIG.business.maxServicesPerBooking;
            case 2:
                return this.selectedDateTime !== null;
            case 3:
                return this.selectedBarber !== null;
            case 4:
                return this.validateCustomerDetails();
            default:
                return false;
        }
    }

    canGoPrevious() {
        return this.currentStep > 1;
    }

    async goToNextStep() {
        if (!this.canGoNext() || this.currentStep >= this.maxSteps) return false;

        try {
            this.setState({ loading: true });
            await this.preloadNextStepData();
            this.setState({
                currentStep: this.currentStep + 1,
                loading: false
            });
            return true;
        } catch (error) {
            this.setState({
                error: error.message,
                loading: false
            });
            return false;
        }
    }

    goToPreviousStep() {
        if (!this.canGoPrevious()) return false;
        this.setState({ currentStep: this.currentStep - 1 });
        return true;
    }

    validateCustomerDetails() {
        const { name, phone } = this.customerDetails;
        const phoneRegex = /^05[0-9]{8}$/;
        
        return name.length >= 3 && phoneRegex.test(phone);
    }

    validateDateTime(dateTime) {
        const selected = new Date(dateTime);
        const now = new Date();

        if (selected <= now) return false;

        const hours = selected.getHours();
        const minutes = selected.getMinutes();
        const [startHour, startMin] = CONFIG.business.workingHours.start.split(':').map(Number);
        const [endHour, endMin] = CONFIG.business.workingHours.end.split(':').map(Number);

        const timeInMinutes = hours * 60 + minutes;
        const startInMinutes = startHour * 60 + startMin;
        const endInMinutes = endHour * 60 + endMin;

        return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
    }

    subscribe(observer) {
        this.observers.add(observer);
        return () => this.observers.delete(observer);
    }

    notifyObservers() {
        this.observers.forEach(observer => observer(this));
    }

    persistState() {
        const stateToSave = {
            currentStep: this.currentStep,
            language: this.language,
            selectedServices: Array.from(this.selectedServices.entries()),
            selectedDate: this.selectedDate,
            selectedTime: this.selectedTime,
            selectedDateTime: this.selectedDateTime,
            selectedBarber: this.selectedBarber,
            customerDetails: this.customerDetails
        };
        
        localStorage.setItem('bookingState', JSON.stringify(stateToSave));
    }

    loadPersistedState() {
        try {
            const saved = localStorage.getItem('bookingState');
            if (!saved) return;

            const parsed = JSON.parse(saved);
            
            const restoredServices = new Map(parsed.selectedServices || []);
            
            this.setState({
                currentStep: parsed.currentStep || 1,
                language: parsed.language || this.language,
                selectedServices: restoredServices,
                selectedDate: parsed.selectedDate || null,
                selectedTime: parsed.selectedTime || null,
                selectedDateTime: parsed.selectedDateTime || null,
                selectedBarber: parsed.selectedBarber || null,
                customerDetails: parsed.customerDetails || { name: '', phone: '' }
            }, false);
        } catch (error) {
            console.error('Error loading persisted state:', error);
            localStorage.removeItem('bookingState');
        }
    }

    reset() {
        this.setState({
            currentStep: 1,
            selectedServices: new Map(),
            selectedDate: null,
            selectedTime: null,
            selectedDateTime: null,
            selectedBarber: null,
            customerDetails: {
                name: '',
                phone: ''
            },
            error: null
        });
        localStorage.removeItem('bookingState');
    }

    async preloadNextStepData() {
        const nextStep = this.currentStep + 1;
        switch (nextStep) {
            case 2:
                await this.preloadTimeSlots();
                break;
            case 3:
                await this.preloadBarbers();
                break;
        }
    }

    async preloadTimeSlots() {
        // Implementation will be added in the UI Manager
    }

    async preloadBarbers() {
        // Implementation will be added in the UI Manager
    }
}

// UI Manager
class UIManager {
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
        this.elements.navigation.prev?.addEventListener('click', () => this.handleNavigation('prev'));
        this.elements.navigation.next?.addEventListener('click', () => this.handleNavigation('next'));

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

        this.elements.datePicker?.addEventListener('change', (e) => {
            this.handleDateSelection(e.target.value);
        });

        this.elements.grids.timeSlots?.addEventListener('click', (e) => {
            const timeSlot = e.target.closest('.time-slot');
            if (timeSlot && !timeSlot.disabled) {
                this.handleTimeSlotSelection(timeSlot);
            }
        });

        this.elements.grids.barbers?.addEventListener('click', (e) => {
            const barberCard = e.target.closest('.barber-card');
            if (barberCard && !barberCard.classList.contains('unavailable')) {
                this.handleBarberSelection(barberCard);
            }
        });

        this.elements.forms.name?.addEventListener('input', (e) => {
            this.validateField(e.target, 'name');
        });

        this.elements.forms.phone?.addEventListener('input', (e) => {
            this.validateField(e.target, 'phone');
        });

        this.elements.summary.toggle?.addEventListener('click', () => {
            this.toggleSummary();
        });

        this.elements.languageButtons?.forEach(button => {
            button.addEventListener('click', () => {
                this.handleLanguageChange(button.dataset.lang);
            });
        });

        window.addEventListener('popstate', (e) => {
            if (e.state?.step) {
                this.state.setState({ currentStep: e.state.step });
            }
        });
    }

    updateUI() {
        this.updateSteps();
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
        element.style.display = 'block';
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        element.classList.add('active');
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
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
            
            const isLastStep = this.state.currentStep === this.state.maxSteps;
            next.textContent = this.translate(isLastStep ? 'confirm_booking' : 'next');
        }
    }

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

    cleanup() {
        this.activeTimeouts.forEach(clearTimeout);
        this.activeTimeouts.clear();
        
        this.elements.grids.categories?.replaceWith(
            this.elements.grids.categories.cloneNode(true)
        );
        
        this.elements.toastContainer?.remove();
        this.elements.loadingOverlay?.remove();
        
        document.getAnimations().forEach(animation => animation.cancel());
    }

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
        };

        return translations[key]?.[this.state.language] || key;
    }
}

// Booking Manager
class BookingManager {
    constructor(state, firebaseService, uiManager) {
        this.state = state;
        this.firebase = firebaseService;
        this.ui = uiManager;
        this.flatpickr = null;
        this.availabilitySubscriptions = new Map();
        
        this.initialize();
    }

    async initialize() {
        try {
            this.ui.showLoading(true);
            await Promise.all([
                this.initializeCategories(),
                this.initializeBarbers(),
                this.initializeCalendar()
            ]);
            this.setupRealTimeUpdates();
            this.ui.showLoading(false);
        } catch (error) {
            this.handleError(error);
            this.ui.showLoading(false);
        }
    }

    async initializeCategories() {
        const categories = await this.firebase.getCategories();
        this.state.setState({ categories: new Map(Object.entries(categories)) });
        this.ui.renderCategories(categories);
    }

    async initializeBarbers() {
        const barbers = await this.firebase.getBarbers();
        this.state.setState({ barbers: new Map(Object.entries(barbers)) });
    }

    initializeCalendar() {
        const datePickerElement = this.ui.elements.datePicker;
        if (!datePickerElement) return;

        this.flatpickr = flatpickr(datePickerElement, {
            minDate: 'today',
            maxDate: new Date().fp_incr(30),
            disable: [
                function(date) {
                    return this.isDateDisabled(date);
                }.bind(this)
            ],
            locale: this.state.language === 'ar' ? Arabic : English,
            onChange: this.handleDateChange.bind(this)
        });
    }

    setupRealTimeUpdates() {
        this.firebase.subscribeToBookingUpdates((bookings) => {
            this.updateAvailability(bookings);
        });

        this.firebase.subscribeToBarberUpdates((barbers) => {
            this.updateBarberAvailability(barbers);
        });
    }

    isDateDisabled(date) {
        if (date < new Date().setHours(0, 0, 0, 0)) return true;
        if (this.isHoliday(date)) return true;
        return !this.hasAvailableBarbers(date);
    }

    isHoliday(date) {
        const holidays = [
            '2024-12-25',
        ];
        
        return holidays.includes(date.toISOString().split('T')[0]);
    }

    hasAvailableBarbers(date) {
        const dayOfWeek = date.getDay();
        return Array.from(this.state.barbers.values()).some(barber => {
            return barber.active && this.isBarberWorkingOnDay(barber, dayOfWeek);
        });
    }

    isBarberWorkingOnDay(barber, dayOfWeek) {
        return barber.workingDays?.[dayOfWeek] !== false;
    }

    async handleDateChange(selectedDates) {
        const selectedDate = selectedDates[0];
        if (!selectedDate) return;

        try {
            this.ui.showLoading(true);
            
            const timeSlots = await this.generateTimeSlots(selectedDate);
            
            this.state.setSelectedDate(selectedDate.toISOString().split('T')[0]);
            this.ui.renderTimeSlots(timeSlots);
            
            this.setupAvailabilityMonitoring(selectedDate);
            
        } catch (error) {
            this.handleError(error);
        } finally {
            this.ui.showLoading(false);
        }
    }

    async generateTimeSlots(date) {
        const slots = [];
        const totalDuration = this.calculateTotalDuration();

        const [startHour, startMin] = CONFIG.business.workingHours.start.split(':').map(Number);
        const [endHour, endMin] = CONFIG.business.workingHours.end.split(':').map(Number);

        let currentSlot = new Date(date);
        currentSlot.setHours(startHour, startMin, 0, 0);

        const endTime = new Date(date);
        endTime.setHours(endHour, endMin, 0, 0);

        while (currentSlot < endTime) {
            if (currentSlot > new Date()) {
                const timeString = currentSlot.toTimeString().slice(0, 5);
                const availability = await this.checkSlotAvailability(currentSlot, totalDuration);
                
                slots.push({
                    time: timeString,
                    available: availability.available,
                    barbers: availability.availableBarbers
                });
            }

            currentSlot = new Date(currentSlot.getTime() + 
                               (CONFIG.business.timeSlotInterval * 60000));
        }

        return slots;
    }

    async checkSlotAvailability(dateTime, duration) {
        const availableBarbers = [];
        let isAvailable = false;

        for (const [barberId, barber] of this.state.barbers) {
            if (!barber.active) continue;

            const barberAvailable = await this.firebase.checkBarberAvailability(
                barberId,
                dateTime.toISOString(),
                duration
            );

            if (barberAvailable) {
                availableBarbers.push(barberId);
                isAvailable = true;
            }
        }

        return {
            available: isAvailable,
            availableBarbers
        };
    }

    setupAvailabilityMonitoring(date) {
        this.availabilitySubscriptions.forEach(unsubscribe => unsubscribe());
        this.availabilitySubscriptions.clear();

        this.state.barbers.forEach((barber, barberId) => {
            if (!barber.active) return;

            const unsubscribe = this.firebase.subscribeToBarberAvailability(
                barberId,
                date,
                (unavailableTimes) => {
                    this.updateTimeSlotAvailability(barberId, unavailableTimes);
                }
            );

            this.availabilitySubscriptions.set(barberId, unsubscribe);
        });
    }

    updateTimeSlotAvailability(barberId, unavailableTimes) {
        const timeSlots = this.ui.elements.grids.timeSlots.querySelectorAll('.time-slot');
        const totalDuration = this.calculateTotalDuration();

        timeSlots.forEach(slot => {
            const timeStr = slot.dataset.time;
            const dateTime = new Date(`${this.state.selectedDate}T${timeStr}`);
            const endTime = new Date(dateTime.getTime() + (totalDuration * 60000));

            const isConflict = unavailableTimes.some(period => {
                return (dateTime < period.end && endTime > period.start);
            });

            if (isConflict) {
                slot.dataset.unavailableBarbers = 
                    (slot.dataset.unavailableBarbers || '') + `${barberId},`;
                
                const unavailableBarbers = new Set(slot.dataset.unavailableBarbers.split(','));
                const activeBarbers = Array.from(this.state.barbers.entries())
                    .filter(([_, b]) => b.active)
                    .map(([id]) => id);

                if (unavailableBarbers.size >= activeBarbers.length) {
                    slot.disabled = true;
                    slot.classList.add('unavailable');
                }
            }
        });
    }

    async handleBookingSubmission() {
        try {
            if (!this.validateBookingData()) {
                throw new Error(this.ui.translate('invalid_booking_data'));
            }

            this.ui.showLoading(true);

            const bookingData = {
                services: Array.from(this.state.selectedServices.values()),
                dateTime: this.state.selectedDateTime,
                barberId: this.state.selectedBarber.id,
                customerDetails: this.state.customerDetails,
                totalDuration: this.calculateTotalDuration(),
                totalPrice: this.calculateTotalPrice(),
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            const bookingId = await this.firebase.createBooking(bookingData);
            
            if (bookingId) {
                await this.sendConfirmation(bookingData);
                this.state.reset();
                this.ui.showSuccessMessage();
            }

        } catch (error) {
            this.handleError(error);
        } finally {
            this.ui.showLoading(false);
        }
    }

    validateBookingData() {
        return (
            this.state.selectedServices.size > 0 &&
            this.state.selectedDateTime &&
            this.state.selectedBarber &&
            this.state.validateCustomerDetails()
        );
    }

    calculateTotalDuration() {
        return Array.from(this.state.selectedServices.values())
            .reduce((total, service) => total + (parseInt(service.duration) || 0), 0);
    }

    calculateTotalPrice() {
        return Array.from(this.state.selectedServices.values())
            .reduce((total, service) => total + service.price, 0);
    }

    async sendConfirmation(bookingData) {
        console.log('Sending confirmation for booking:', bookingData);
        // Implement actual confirmation sending logic here
    }

    handleError(error) {
        console.error('Booking error:', error);
        this.ui.showToast(error.message, 'error');
    }

    cleanup() {
        this.flatpickr?.destroy();
        this.availabilitySubscriptions.forEach(unsubscribe => unsubscribe());
        this.availabilitySubscriptions.clear();
    }
}

// Application Initialization
class BookingApplication {
    constructor() {
        this.config = CONFIG;
        this.firebase = new FirebaseService();
        this.state = new BookingState();
        this.ui = new UIManager(this.state, this.firebase);
        this.bookingManager = new BookingManager(this.state, this.firebase, this.ui);
        
        this.setupErrorBoundaries();
        this.setupPerformanceMonitoring();
    }

    async initialize() {
        try {
            console.log('Initializing Booking Application...');
            
            this.ui.showLoading(true);

            await this.firebase.initializeFirebase();
            console.log('Firebase initialized successfully');

            await Promise.all([
                this.loadInitialData(),
                this.setupLocalizations(),
                this.initializeUI()
            ]);

            this.setupServiceWorker();
            this.setupAnalytics();
            
            console.log('Booking Application initialized successfully');
            this.ui.showLoading(false);
            
        } catch (error) {
            console.error('Failed to initialize Booking Application:', error);
            this.handleInitializationError(error);
        }
    }

    async loadInitialData() {
        try {
            const categories = await this.firebase.getCategories();
            this.state.setState({ categories: new Map(Object.entries(categories)) });

            const barbers = await this.firebase.getBarbers();
            this.state.setState({ barbers: new Map(Object.entries(barbers)) });

            this.state.loadPersistedState();

        } catch (error) {
            console.error('Error loading initial data:', error);
            throw error;
        }
    }

    setupLocalizations() {
        const language = this.state.getInitialLanguage();
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';

        this.setupDateLocalization(language);
    }

    setupDateLocalization(language) {
        const dateConfig = {
            ar: {
                format: 'DD/MM/YYYY',
                firstDayOfWeek: 6,
                months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
                weekdays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
            },
            en: {
                format: 'MM/DD/YYYY',
                firstDayOfWeek: 0,
                months: ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'],
                weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            }
        };

        if (this.bookingManager.flatpickr) {
            this.bookingManager.flatpickr.set('locale', dateConfig[language]);
        }
    }

    async initializeUI() {
        this.ui.initializeElements();
        this.setupResponsiveUI();
        await this.initializeBookingSteps();
        this.setupKeyboardNavigation();
        this.initializeSummaryBox();
    }

    setupResponsiveUI() {
        const breakpoints = {
            mobile: window.matchMedia('(max-width: 767px)'),
            tablet: window.matchMedia('(min-width: 768px) and (max-width: 1023px)'),
            desktop: window.matchMedia('(min-width: 1024px)')
        };

        Object.entries(breakpoints).forEach(([device, query]) => {
            query.addListener((e) => this.handleResponsiveChange(device, e.matches));
            this.handleResponsiveChange(device, query.matches);
        });
    }

    async initializeBookingSteps() {
        const steps = [
            this.initializeServicesStep.bind(this),
            this.initializeDateTimeStep.bind(this),
            this.initializeBarberStep.bind(this),
            this.initializeConfirmationStep.bind(this)
        ];

        for (let i = 0; i < steps.length; i++) {
            await steps[i]();
        }
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }
        });

        this.setupFocusTraps();
    }

    initializeSummaryBox() {
        const summaryBox = this.ui.elements.summary.container;
        if (summaryBox) {
            this.setupSummaryBoxPosition();
            this.setupSummaryBoxResizing();
        }
    }

    setupErrorBoundaries() {
        window.onerror = (message, source, lineno, colno, error) => {
            this.handleGlobalError(error);
            return false;
        };

        window.onunhandledrejection = (event) => {
            this.handleGlobalError(event.reason);
        };
    }

    setupPerformanceMonitoring() {
        if ('PerformanceObserver' in window) {
            this.observeLoadingMetrics();
            this.observeInteractionMetrics();
        }
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful');
                })
                .catch(error => {
                    console.error('ServiceWorker registration failed:', error);
                });
        }
    }

    setupAnalytics() {
        this.trackUserInteractions();
        this.trackBookingProgress();
        this.trackErrors();
    }

    handleResponsiveChange(device, matches) {
        if (matches) {
            this.ui.updateLayoutForDevice(device);
        }
    }

    handleEscapeKey() {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            this.ui.closeModal(activeModal);
        }
    }

    handleGlobalError(error) {
        console.error('Global error:', error);
        this.ui.showToast(
            this.state.language === 'ar' 
                ? 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى' 
                : 'An unexpected error occurred. Please try again',
            'error'
        );
    }

    handleInitializationError(error) {
        this.ui.showLoading(false);
        this.ui.showToast(
            this.state.language ===
            'ar' 
                ? 'فشل في تحميل التطبيق. يرجى تحديث الصفحة أو المحاولة لاحقًا' 
                : 'Failed to load the application. Please refresh or try again later',
            'error'
        );
    }

    observeLoadingMetrics() {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                console.log(`${entry.name}: ${entry.startTime}ms`);
            }
        });
        observer.observe({ entryTypes: ['navigation', 'resource', 'paint'] });
    }

    observeInteractionMetrics() {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.interactionId) {
                    console.log(`Interaction took ${entry.duration}ms`);
                }
            }
        });
        observer.observe({ type: 'event', buffered: true });
    }

    trackUserInteractions() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, a, .interactive-element');
            if (target) {
                this.logAnalyticsEvent('user_interaction', {
                    element: target.tagName,
                    id: target.id,
                    class: target.className
                });
            }
        });
    }

    trackBookingProgress() {
        this.state.subscribe(() => {
            this.logAnalyticsEvent('booking_step_change', {
                step: this.state.currentStep,
                servicesSelected: this.state.selectedServices.size,
                dateSelected: !!this.state.selectedDate,
                barberSelected: !!this.state.selectedBarber
            });
        });
    }

    trackErrors() {
        window.addEventListener('error', (e) => {
            this.logAnalyticsEvent('error', {
                message: e.message,
                source: e.filename,
                lineno: e.lineno,
                colno: e.colno
            });
        });
    }

    logAnalyticsEvent(eventName, eventData) {
        if (typeof gtag === 'function') {
            gtag('event', eventName, eventData);
        }
    }

    cleanup() {
        this.firebase.cleanup();
        this.ui.cleanup();
        this.bookingManager.cleanup();
    }
}

// Application Initialization
document.addEventListener('DOMContentLoaded', () => {
    const app = new BookingApplication();
    app.initialize().catch(error => {
        console.error('Failed to initialize application:', error);
    });
});
