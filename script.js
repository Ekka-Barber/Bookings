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
        this.app = null;
        this.db = null;
        this.activeSubscriptions = new Map();
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.cache = new Map();
        this.firebase = window.firebaseModules;
    }

    async initializeFirebase() {
        try {
            if (!this.firebase) {
                throw new Error('Firebase SDK not loaded');
            }
            
            this.app = this.firebase.initializeApp(CONFIG.firebase);
            this.db = this.firebase.getDatabase(this.app);

            await this.testConnection();
            this.setupConnectionMonitoring();
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            throw new Error('Failed to initialize Firebase');
        }
    }

    async testConnection() {
        try {
            const connectedRef = this.firebase.ref(this.db, '.info/connected');
            const snapshot = await this.firebase.get(connectedRef);
            return snapshot.val() === true;
        } catch (error) {
            console.error('Connection test failed:', error);
            throw error;
        }
    }

    setupConnectionMonitoring() {
        const connectedRef = this.firebase.ref(this.db, '.info/connected');
        this.firebase.onValue(connectedRef, (snapshot) => {
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
            const dbRef = this.firebase.ref(this.db, path);
            const snapshot = await this.firebase.get(dbRef);
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
        try {
            const barbers = await this.fetchWithCache('barbers', CONFIG.cache.duration.barbers);
            return Object.entries(barbers)
                .filter(([_, barber]) => barber.active)
                .reduce((acc, [id, barber]) => ({...acc, [id]: barber}), {});
        } catch (error) {
            console.error('Error fetching barbers:', error);
            throw error;
        }
    }

    subscribeToBarberAvailability(barberId, date, callback) {
        const dateStr = new Date(date).toISOString().split('T')[0];
        const subscriptionKey = `availability_${barberId}_${dateStr}`;

        this.unsubscribe(subscriptionKey);

        const bookingsRef = this.firebase.ref(this.db, 'bookings');
        const bookingsQuery = this.firebase.query(
            bookingsRef,
            this.firebase.orderByChild('barberId'),
            this.firebase.equalTo(barberId)
        );

        const unsubscribe = this.firebase.onValue(bookingsQuery, snapshot => {
            const bookings = snapshot.val() || {};
            const unavailableTimes = this.processBookingsForAvailability(bookings, dateStr);
            callback(unavailableTimes);
        });

        this.activeSubscriptions.set(subscriptionKey, unsubscribe);
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
            const bookingsRef = this.firebase.ref(this.db, 'bookings');
            const newBookingRef = this.firebase.push(bookingsRef);
            await this.firebase.set(newBookingRef, {
                ...bookingData,
                status: 'pending',
                createdAt: new Date().toISOString()
            });
            return newBookingRef.key;
        } catch (error) {
            console.error('Error creating booking:', error);
            throw error;
        }
    }

    unsubscribe(key) {
        const unsubscribe = this.activeSubscriptions.get(key);
        if (unsubscribe) {
            unsubscribe();
            this.activeSubscriptions.delete(key);
        }
    }

    cleanup() {
        this.activeSubscriptions.forEach(unsubscribe => unsubscribe());
        this.activeSubscriptions.clear();
        
        if (this.db) {
            const connectedRef = this.firebase.ref(this.db, '.info/connected');
            this.firebase.off(connectedRef);
        }
        
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

    createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        container.setAttribute('role', 'alert');
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
        return container;
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
            
            // Initialize Firebase first
            await this.firebase.initializeFirebase();
            
            // Then load data
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
        try {
            const categories = await this.firebase.getCategories();
            this.state.setState({ categories: new Map(Object.entries(categories)) });
            this.ui.renderCategories(categories);
        } catch (error) {
            console.error('Error initializing categories:', error);
            throw error;
        }
    }

    async initializeBarbers() {
        try {
            const barbers = await this.firebase.getBarbers();
            this.state.setState({ barbers: new Map(Object.entries(barbers)) });
            return barbers;
        } catch (error) {
            console.error('Error initializing barbers:', error);
            throw error;
        }
    }

    initializeCalendar() {
        const datePickerElement = this.ui.elements.datePicker;
        if (!datePickerElement) return;

        const options = {
            minDate: 'today',
            maxDate: new Date().fp_incr(30),
            disable: [
                date => this.isDateDisabled(date)
            ],
            locale: this.state.language === 'ar' ? Arabic : English,
            onChange: selected => this.handleDateChange(selected)
        };

        this.flatpickr = datePickerElement._flatpickr || flatpickr(datePickerElement, options);
    }

    setupRealTimeUpdates() {
        this.state.barbers.forEach((barber, barberId) => {
            if (!barber.active) return;
            
            const unsubscribe = this.firebase.subscribeToBarberAvailability(
                barberId,
                this.state.selectedDate || new Date(),
                (unavailableTimes) => {
                    if (this.state.selectedDate) {
                        this.updateAvailability(unavailableTimes);
                    }
                }
            );
            
            this.availabilitySubscriptions.set(barberId, unsubscribe);
        });
    }

    updateAvailability(bookings) {
        const timeSlots = this.ui.elements.grids.timeSlots?.querySelectorAll('.time-slot') || [];
        timeSlots.forEach(slot => {
            const timeStr = slot.dataset.time;
            const unavailable = this.isTimeSlotUnavailable(timeStr, bookings);
            slot.classList.toggle('unavailable', unavailable);
            slot.disabled = unavailable;
        });
    }

    isTimeSlotUnavailable(timeStr, bookings) {
        if (!this.state.selectedDate) return true;
        
        const slotTime = new Date(`${this.state.selectedDate}T${timeStr}`);
        const totalDuration = this.calculateTotalDuration();
        const slotEnd = new Date(slotTime.getTime() + (totalDuration * 60000));

        return bookings.some(booking => {
            const bookingStart = new Date(booking.start);
            const bookingEnd = new Date(booking.end);
            return (slotTime < bookingEnd && slotEnd > bookingStart);
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
            // Add other holiday dates
        ];
        return holidays.includes(date.toISOString().split('T')[0]);
    }

    hasAvailableBarbers(date) {
        return Array.from(this.state.barbers.values()).some(barber => {
            return barber.active && this.isBarberWorkingOnDay(barber, date.getDay());
        });
    }

    isBarberWorkingOnDay(barber, dayOfWeek) {
        return !barber.workingDays || barber.workingDays[dayOfWeek] !== false;
    }

    async handleDateChange(selectedDates) {
        const selectedDate = selectedDates[0];
        if (!selectedDate) return;

        try {
            this.ui.showLoading(true);
            const dateStr = selectedDate.toISOString().split('T')[0];
            this.state.setSelectedDate(dateStr);
            
            const timeSlots = await this.generateTimeSlots(selectedDate);
            this.ui.renderTimeSlots(timeSlots);
            
            this.setupRealTimeUpdates();
        } catch (error) {
            this.handleError(error);
        } finally {
            this.ui.showLoading(false);
        }
    }

    async generateTimeSlots(date) {
        const slots = [];
        const [startHour, startMin] = CONFIG.business.workingHours.start.split(':').map(Number);
        const [endHour, endMin] = CONFIG.business.workingHours.end.split(':').map(Number);

        let currentSlot = new Date(date);
        currentSlot.setHours(startHour, startMin, 0, 0);

        const endTime = new Date(date);
        endTime.setHours(endHour, endMin, 0, 0);

        while (currentSlot < endTime) {
            if (currentSlot > new Date()) {
                slots.push({
                    time: currentSlot.toTimeString().slice(0, 5),
                    available: true
                });
            }
            currentSlot = new Date(currentSlot.getTime() + (CONFIG.business.timeSlotInterval * 60000));
        }

        return slots;
    }

    calculateTotalDuration() {
        return Array.from(this.state.selectedServices.values())
            .reduce((total, service) => total + parseInt(service.duration || '0'), 0);
    }

    calculateTotalPrice() {
        return Array.from(this.state.selectedServices.values())
            .reduce((total, service) => total + (service.price || 0), 0);
    }

    handleError(error) {
        console.error('Booking error:', error);
        this.ui.showToast(error.message || 'An unexpected error occurred', 'error');
    }

    cleanup() {
        if (this.flatpickr) {
            this.flatpickr.destroy();
            this.flatpickr = null;
        }

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

            // Initialize Firebase first
            await this.firebase.initializeFirebase();
            console.log('Firebase initialized successfully');

            // Then initialize the rest of the application
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
            const [categories, barbers] = await Promise.all([
                this.firebase.getCategories(),
                this.firebase.getBarbers()
            ]);

            this.state.setState({ 
                categories: new Map(Object.entries(categories)),
                barbers: new Map(Object.entries(barbers))
            });

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
        await this.ui.initializeElements();
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
            query.addListener(e => this.handleResponsiveChange(device, e.matches));
            this.handleResponsiveChange(device, query.matches);
        });
    }

    handleResponsiveChange(device, matches) {
        if (matches) {
            document.body.dataset.device = device;
            this.ui.updateLayoutForDevice?.(device);
        }
    }

    async initializeBookingSteps() {
        const steps = [
            'services',
            'datetime',
            'barber',
            'confirmation'
        ];

        for (const step of steps) {
            await this.initializeStep(step);
        }
    }

    async initializeStep(step) {
        const stepElement = document.getElementById(`step-${step}`);
        if (!stepElement) return;

        switch (step) {
            case 'services':
                await this.ui.renderServices();
                break;
            case 'datetime':
                this.bookingManager.initializeCalendar();
                break;
            case 'barber':
                await this.ui.renderBarbers();
                break;
            case 'confirmation':
                this.ui.setupConfirmationForm();
                break;
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

    setupFocusTraps() {
        const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const modals = document.querySelectorAll('.modal');

        modals.forEach(modal => {
            const focusableContent = modal.querySelectorAll(focusableElements);
            const firstFocusable = focusableContent[0];
            const lastFocusable = focusableContent[focusableContent.length - 1];

            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey && document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    } else if (!e.shiftKey && document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            });
        });
    }

    handleEscapeKey() {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            this.ui.closeModal(activeModal);
        }
    }

    initializeSummaryBox() {
        const summaryBox = document.querySelector('.booking-summary');
        if (summaryBox) {
            this.setupSummaryBoxPosition();
            this.setupSummaryBoxResizing();
        }
    }

    setupSummaryBoxPosition() {
        const summary = document.querySelector('.booking-summary');
        if (!summary) return;

        const updatePosition = () => {
            const rect = document.querySelector('.container').getBoundingClientRect();
            const right = window.innerWidth - rect.right;
            summary.style.right = `${right}px`;
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
    }

    setupSummaryBoxResizing() {
        const resizer = document.createElement('div');
        resizer.className = 'summary-resizer';
        document.querySelector('.booking-summary')?.appendChild(resizer);

        let startX, startWidth;

        const startResize = (e) => {
            startX = e.clientX;
            startWidth = parseInt(document.documentElement.style.getPropertyValue('--summary-width'), 10);
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
        };

        const resize = (e) => {
            const diff = startX - e.clientX;
            const newWidth = startWidth + diff;
            document.documentElement.style.setProperty('--summary-width', `${newWidth}px`);
        };

        const stopResize = () => {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
        };

        resizer.addEventListener('mousedown', startResize);
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
            this.state.language === 'ar'
                ? 'فشل في تحميل التطبيق. يرجى تحديث الصفحة أو المحاولة لاحقًا'
                : 'Failed to load the application. Please refresh or try again later',
            'error'
        );
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
        window.removeEventListener('resize', this.setupSummaryBoxPosition);
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new BookingApplication();
    app.initialize().catch(error => {
        console.error('Failed to initialize application:', error);
    });
});
