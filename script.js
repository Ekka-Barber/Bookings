// config.js
const config = {
    firebase: {
        apiKey: "AIzaSyA0Syrv4XH88PTzQUaZlZMJ_85n8",
        authDomain: "ekka-barbershop.firebaseapp.com",
        databaseURL: "https://ekka-barbershop-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "ekka-barbershop",
        storageBucket: "ekka-barbershop.firebasestorage.app",
        messagingSenderId: "726879506857",
        appId: "1:726879506857:web:497e0576037a3bcf8d74b8",
        measurementId: "G-56KKZKQ6TK"
    },
    
    business: {
        workingHours: {
            start: "12:00",
            end: "23:59"
        },
        appointmentDuration: 30, // minutes
        phoneNumber: "966599791440", // WhatsApp number
        maxServicesPerBooking: 5,
        timeSlotInterval: 30, // minutes
        bufferTime: 15, // minutes between appointments
    },
    
    dateFormat: {
        display: {
            ar: {
                datetime: "DD/MM/YYYY hh:mm A",
                date: "DD/MM/YYYY",
                time: "hh:mm A"
            },
            en: {
                datetime: "MM/DD/YYYY hh:mm A",
                date: "MM/DD/YYYY",
                time: "hh:mm A"
            }
        },
        server: "YYYY-MM-DD HH:mm"
    },

    // Cache durations
    cache: {
        categories: 5 * 60 * 1000, // 5 minutes
        barbers: 2 * 60 * 1000,    // 2 minutes
        availability: 1 * 60 * 1000 // 1 minute
    }
};

// state.js
class BookingState {
    constructor() {
        // Core state
        this.currentStep = 1;
        this.maxSteps = 4;
        this.currentLanguage = this.getInitialLanguage();
        this.loading = false;
        this.error = null;

        // Selection state
        this.selectedServices = new Map();
        this.selectedDateTime = null;
        this.selectedBarber = null;
        this.customerDetails = {
            name: '',
            phone: ''
        };

        // Data state
        this.categories = new Map();
        this.barbers = new Map();
        this.availableTimeSlots = [];

        // Cache state
        this.cache = {
            categories: null,
            barbers: null,
            lastFetch: {
                categories: 0,
                barbers: 0
            }
        };

        // Observer pattern
        this.observers = new Set();
        
        // Initialize state from localStorage if available
        this.loadPersistedState();
    }

    // Language Management
    getInitialLanguage() {
        const saved = localStorage.getItem('preferred_language');
        const browser = navigator.language.startsWith('ar') ? 'ar' : 'en';
        return saved || browser;
    }

    setLanguage(lang) {
        if (lang !== this.currentLanguage && (lang === 'ar' || lang === 'en')) {
            this.currentLanguage = lang;
            localStorage.setItem('preferred_language', lang);
            document.documentElement.lang = lang;
            document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
            this.notifyObservers();
        }
    }

    // State Management
    setState(updates) {
        let hasChanges = false;
        for (const [key, value] of Object.entries(updates)) {
            if (this[key] !== value) {
                this[key] = value;
                hasChanges = true;
            }
        }
        if (hasChanges) {
            this.persistState();
            this.notifyObservers();
        }
    }

    // Observer Pattern
    subscribe(observer) {
        this.observers.add(observer);
        return () => this.observers.delete(observer);
    }

    notifyObservers() {
        for (const observer of this.observers) {
            observer(this);
        }
    }

    // Navigation
    canGoNext() {
        switch (this.currentStep) {
            case 1:
                return this.selectedServices.size > 0 && 
                       this.selectedServices.size <= config.business.maxServicesPerBooking;
            case 2:
                return this.selectedDateTime !== null && 
                       this.validateDateTime(this.selectedDateTime);
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
        if (this.canGoNext() && this.currentStep < this.maxSteps) {
            try {
                this.setState({ loading: true });
                
                // Pre-load data for next step
                switch (this.currentStep) {
                    case 1:
                        await this.preloadTimeSlots();
                        break;
                    case 2:
                        await this.preloadBarbers();
                        break;
                }

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
        return false;
    }

    goToPreviousStep() {
        if (this.canGoPrevious()) {
            this.setState({ currentStep: this.currentStep - 1 });
            return true;
        }
        return false;
    }

    // Service Management
    toggleService(serviceId, serviceData) {
        const updatedServices = new Map(this.selectedServices);
        
        if (updatedServices.has(serviceId)) {
            updatedServices.delete(serviceId);
        } else {
            if (updatedServices.size >= config.business.maxServicesPerBooking) {
                throw new Error(
                    this.currentLanguage === 'ar' 
                        ? `لا يمكن اختيار أكثر من ${config.business.maxServicesPerBooking} خدمات`
                        : `Cannot select more than ${config.business.maxServicesPerBooking} services`
                );
            }
            updatedServices.set(serviceId, serviceData);
        }
        
        this.setState({ 
            selectedServices: updatedServices,
            // Reset subsequent selections when services change
            selectedDateTime: null,
            selectedBarber: null
        });
    }

    // State Persistence
    persistState() {
        const stateToSave = {
            currentStep: this.currentStep,
            currentLanguage: this.currentLanguage,
            selectedServices: Array.from(this.selectedServices.entries()),
            selectedDateTime: this.selectedDateTime,
            selectedBarber: this.selectedBarber,
            customerDetails: this.customerDetails
        };
        
        localStorage.setItem('bookingState', JSON.stringify(stateToSave));
    }

    loadPersistedState() {
        try {
            const saved = localStorage.getItem('bookingState');
            if (saved) {
                const parsed = JSON.parse(saved);
                
                // Restore Map objects
                const restoredServices = new Map(parsed.selectedServices || []);
                
                this.setState({
                    currentStep: parsed.currentStep || 1,
                    currentLanguage: parsed.currentLanguage || this.currentLanguage,
                    selectedServices: restoredServices,
                    selectedDateTime: parsed.selectedDateTime || null,
                    selectedBarber: parsed.selectedBarber || null,
                    customerDetails: parsed.customerDetails || { name: '', phone: '' }
                });
            }
        } catch (error) {
            console.error('Error loading persisted state:', error);
            localStorage.removeItem('bookingState');
        }
    }

    // Reset
    reset() {
        this.setState({
            currentStep: 1,
            selectedServices: new Map(),
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
}

// Create and export instances
const state = new BookingState();
export { config, state };
// firebase-service.js
class FirebaseService {
    constructor(config, state) {
        // Initialize Firebase with retries
        this.initializeFirebase(config.firebase);
        this.state = state;
        this.db = null;
        this.activeSubscriptions = new Map();
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
    }

    async initializeFirebase(firebaseConfig) {
        let attempts = 0;
        while (attempts < this.retryAttempts) {
            try {
                if (!firebase.apps.length) {
                    firebase.initializeApp(firebaseConfig);
                }
                this.db = firebase.database();
                await this.db.ref('.info/connected').once('value');
                console.log('Firebase initialized successfully');
                this.setupConnectionMonitoring();
                return;
            } catch (error) {
                attempts++;
                if (attempts === this.retryAttempts) {
                    throw new Error(
                        this.state.currentLanguage === 'ar'
                            ? 'فشل الاتصال بالخادم. يرجى المحاولة مرة أخرى'
                            : 'Failed to connect to server. Please try again'
                    );
                }
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempts));
            }
        }
    }

    setupConnectionMonitoring() {
        this.db.ref('.info/connected').on('value', (snap) => {
            if (snap.val() === true) {
                this.onConnected();
            } else {
                this.onDisconnected();
            }
        });
    }

    onConnected() {
        document.dispatchEvent(new CustomEvent('connection-status', {
            detail: { 
                status: 'connected',
                message: this.state.currentLanguage === 'ar' 
                    ? 'تم استعادة الاتصال'
                    : 'Connection restored'
            }
        }));
    }

    onDisconnected() {
        document.dispatchEvent(new CustomEvent('connection-status', {
            detail: { 
                status: 'disconnected',
                message: this.state.currentLanguage === 'ar'
                    ? 'فقدان الاتصال. جاري المحاولة مرة أخرى...'
                    : 'Connection lost. Retrying...'
            }
        }));
    }

    async fetchWithRetry(operation) {
        let attempts = 0;
        while (attempts < this.retryAttempts) {
            try {
                return await operation();
            } catch (error) {
                attempts++;
                if (attempts === this.retryAttempts) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempts));
            }
        }
    }

    // Categories and Services
    async loadCategories() {
        const now = Date.now();
        
        // Check cache first
        if (this.state.cache.categories && 
            (now - this.state.cache.lastFetch.categories) < config.cache.categories) {
            return this.state.cache.categories;
        }

        try {
            const snapshot = await this.fetchWithRetry(() => 
                this.db.ref('categories').once('value')
            );
            
            const categories = snapshot.val() || {};
            
            // Update cache
            this.state.cache.categories = categories;
            this.state.cache.lastFetch.categories = now;
            
            return categories;
        } catch (error) {
            console.error('Error loading categories:', error);
            throw new Error(
                this.state.currentLanguage === 'ar'
                    ? 'فشل تحميل الخدمات. يرجى المحاولة مرة أخرى'
                    : 'Failed to load services. Please try again'
            );
        }
    }

    // Barbers Management
    async loadBarbers() {
        const now = Date.now();
        
        // Check cache first
        if (this.state.cache.barbers && 
            (now - this.state.cache.lastFetch.barbers) < config.cache.barbers) {
            return this.state.cache.barbers;
        }

        try {
            const snapshot = await this.fetchWithRetry(() => 
                this.db.ref('barbers').once('value')
            );
            
            const barbers = snapshot.val() || {};
            const activeBarbers = Object.entries(barbers)
                .filter(([_, barber]) => barber.active)
                .reduce((acc, [id, barber]) => ({
                    ...acc,
                    [id]: barber
                }), {});

            // Update cache
            this.state.cache.barbers = activeBarbers;
            this.state.cache.lastFetch.barbers = now;
            
            return activeBarbers;
        } catch (error) {
            console.error('Error loading barbers:', error);
            throw new Error(
                this.state.currentLanguage === 'ar'
                    ? 'فشل تحميل قائمة الحلاقين. يرجى المحاولة مرة أخرى'
                    : 'Failed to load barbers. Please try again'
            );
        }
    }

    // Availability Checking
    async checkBarberAvailability(barberId, dateTime, duration) {
        try {
            const date = new Date(dateTime);
            const dateStr = date.toISOString().split('T')[0];
            
            const snapshot = await this.fetchWithRetry(() =>
                this.db.ref('bookings')
                    .orderByChild('barberId')
                    .equalTo(barberId)
                    .once('value')
            );
            
            const bookings = snapshot.val() || {};
            const selectedTime = date.getTime();
            const selectedEndTime = selectedTime + (duration * 60 * 1000);
            
            // Check working hours
            const barber = (await this.loadBarbers())[barberId];
            if (!this.isWithinWorkingHours(date, barber.working_hours)) {
                return false;
            }

            // Check existing bookings
            const hasConflict = Object.values(bookings).some(booking => {
                if (booking.status === 'cancelled') return false;
                if (new Date(booking.dateTime).toISOString().split('T')[0] !== dateStr) return false;
                
                const bookingStart = new Date(booking.dateTime).getTime();
                const bookingEnd = bookingStart + (booking.totalDuration * 60 * 1000);
                
                // Add buffer time
                const bufferedStart = bookingStart - (config.business.bufferTime * 60 * 1000);
                const bufferedEnd = bookingEnd + (config.business.bufferTime * 60 * 1000);
                
                return (selectedTime < bufferedEnd && selectedEndTime > bufferedStart);
            });

            return !hasConflict;
        } catch (error) {
            console.error('Error checking availability:', error);
            throw new Error(
                this.state.currentLanguage === 'ar'
                    ? 'فشل التحقق من التوفر. يرجى المحاولة مرة أخرى'
                    : 'Failed to check availability. Please try again'
            );
        }
    }

    isWithinWorkingHours(date, workingHours) {
        const time = date.getHours() * 60 + date.getMinutes();
        const [startHour, startMin] = workingHours.start.split(':').map(Number);
        const [endHour, endMin] = workingHours.end.split(':').map(Number);
        
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;
        
        return time >= startTime && time <= endTime;
    }

    // Real-time Availability Updates
    subscribeToAvailabilityUpdates(barberId, date, callback) {
        const dateStr = new Date(date).toISOString().split('T')[0];
        const subscriptionKey = `availability_${barberId}_${dateStr}`;
        
        // Cleanup existing subscription if any
        this.unsubscribe(subscriptionKey);
        
        const subscription = this.db.ref('bookings')
            .orderByChild('barberId')
            .equalTo(barberId)
            .on('value', snapshot => {
                const bookings = snapshot.val() || {};
                const unavailableTimes = Object.values(bookings)
                    .filter(booking => {
                        const bookingDate = new Date(booking.dateTime)
                            .toISOString()
                            .split('T')[0];
                        return bookingDate === dateStr && booking.status !== 'cancelled';
                    })
                    .map(booking => ({
                        start: new Date(booking.dateTime).getTime(),
                        end: new Date(booking.dateTime).getTime() + 
                             (booking.totalDuration * 60 * 1000)
                    }));
                
                callback(unavailableTimes);
            });
        
        this.activeSubscriptions.set(subscriptionKey, {
            ref: this.db.ref('bookings'),
            callback: subscription
        });
        
        return () => this.unsubscribe(subscriptionKey);
    }

    // Booking Creation
    async createBooking(bookingData) {
        try {
            // Final availability check
            const isAvailable = await this.checkBarberAvailability(
                bookingData.barberId,
                bookingData.dateTime,
                bookingData.totalDuration
            );

            if (!isAvailable) {
                throw new Error(
                    this.state.currentLanguage === 'ar'
                        ? 'عذراً، هذا الموعد لم يعد متاحاً'
                        : 'Sorry, this time slot is no longer available'
                );
            }

            // Add booking
            const newBookingRef = await this.fetchWithRetry(() =>
                this.db.ref('bookings').push({
                    ...bookingData,
                    status: 'pending',
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                })
            );

            return newBookingRef.key;
        } catch (error) {
            console.error('Error creating booking:', error);
            throw new Error(
                this.state.currentLanguage === 'ar'
                    ? 'فشل إنشاء الحجز. يرجى المحاولة مرة أخرى'
                    : 'Failed to create booking. Please try again'
            );
        }
    }

    // Cleanup
    unsubscribe(key) {
        const subscription = this.activeSubscriptions.get(key);
        if (subscription) {
            subscription.ref.off('value', subscription.callback);
            this.activeSubscriptions.delete(key);
        }
    }

    cleanup() {
        // Cleanup all active subscriptions
        this.activeSubscriptions.forEach((_, key) => this.unsubscribe(key));
        this.activeSubscriptions.clear();
        
        // Cleanup connection monitoring
        if (this.db) {
            this.db.ref('.info/connected').off();
        }
    }
}

export const firebaseService = new FirebaseService(config, state);
// booking-manager.js
class BookingManager {
    constructor(state, firebaseService, uiManager) {
        this.state = state;
        this.firebase = firebaseService;
        this.ui = uiManager;
        this.timeSlots = [];
        this.availabilitySubscriptions = new Map();
        
        this.initializeBookingProcess();
        this.setupEventListeners();
    }

    async initializeBookingProcess() {
        try {
            this.ui.showLoading(true);
            await Promise.all([
                this.loadCategories(),
                this.loadBarbers()
            ]);
            this.ui.showLoading(false);
        } catch (error) {
            this.handleError(error);
            this.ui.showLoading(false);
        }
    }

    setupEventListeners() {
        // Service selection
        document.querySelectorAll('.service-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const serviceId = e.currentTarget.dataset.serviceId;
                this.handleServiceSelection(serviceId);
            });
        });

        // Date selection
        const dateInput = document.getElementById('appointment-date');
        if (dateInput) {
            dateInput.addEventListener('change', (e) => {
                this.handleDateSelection(e.target.value);
            });
        }

        // Time slot selection
        document.querySelector('.time-slots-grid')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('time-slot')) {
                this.handleTimeSlotSelection(e.target.dataset.time);
            }
        });

        // Barber selection
        document.querySelector('.barbers-grid')?.addEventListener('click', (e) => {
            const barberCard = e.target.closest('.barber-card');
            if (barberCard && !barberCard.classList.contains('unavailable')) {
                this.handleBarberSelection(barberCard.dataset.barberId);
            }
        });

        // Form inputs
        const nameInput = document.getElementById('customer-name');
        const phoneInput = document.getElementById('customer-phone');

        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                this.handleCustomerInput('name', e.target.value);
            });
        }

        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                this.handleCustomerInput('phone', e.target.value);
            });
        }

        // Connection status
        document.addEventListener('connection-status', (e) => {
            this.handleConnectionStatus(e.detail);
        });
    }

    async loadCategories() {
        try {
            const categories = await this.firebase.loadCategories();
            this.state.setState({ categories: new Map(Object.entries(categories)) });
            this.ui.renderCategories(categories);
        } catch (error) {
            this.handleError(error);
        }
    }

    async loadBarbers() {
        try {
            const barbers = await this.firebase.loadBarbers();
            this.state.setState({ barbers: new Map(Object.entries(barbers)) });
        } catch (error) {
            this.handleError(error);
        }
    }

    handleServiceSelection(serviceId) {
        try {
            const service = this.findServiceById(serviceId);
            if (!service) {
                throw new Error(
                    this.state.currentLanguage === 'ar' 
                        ? 'الخدمة غير موجودة'
                        : 'Service not found'
                );
            }

            this.state.toggleService(serviceId, service);
            this.ui.updateServiceSelection(serviceId);
            this.ui.updateSummary();
            
            // Reset subsequent selections when services change
            if (this.state.selectedDateTime) {
                this.resetTimeSelection();
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    async handleDateSelection(date) {
        try {
            if (!date) return;

            this.ui.showLoading(true);
            const timeSlots = await this.generateTimeSlots(date);
            this.timeSlots = timeSlots;
            
            this.ui.renderTimeSlots(timeSlots);
            this.setupAvailabilitySubscriptions(date);
            
            this.ui.showLoading(false);
        } catch (error) {
            this.handleError(error);
            this.ui.showLoading(false);
        }
    }

    async handleTimeSlotSelection(time) {
        try {
            const selectedDateTime = `${this.state.selectedDate} ${time}`;
            
            if (!this.validateDateTime(selectedDateTime)) {
                throw new Error(
                    this.state.currentLanguage === 'ar'
                        ? 'الوقت المحدد غير صالح'
                        : 'Invalid time selection'
                );
            }

            this.state.setState({ selectedDateTime });
            await this.loadAvailableBarbers(selectedDateTime);
            
            this.ui.updateTimeSelection(time);
            this.ui.updateSummary();
        } catch (error) {
            this.handleError(error);
        }
    }

    async handleBarberSelection(barberId) {
        try {
            const barber = this.state.barbers.get(barberId);
            if (!barber) {
                throw new Error(
                    this.state.currentLanguage === 'ar'
                        ? 'الحلاق غير موجود'
                        : 'Barber not found'
                );
            }

            // Check availability again
            const isAvailable = await this.firebase.checkBarberAvailability(
                barberId,
                this.state.selectedDateTime,
                this.calculateTotalDuration()
            );

            if (!isAvailable) {
                throw new Error(
                    this.state.currentLanguage === 'ar'
                        ? 'عذراً، هذا الموعد لم يعد متاحاً'
                        : 'Sorry, this time slot is no longer available'
                );
            }

            this.state.setState({ selectedBarber: { id: barberId, ...barber } });
            this.ui.updateBarberSelection(barberId);
            this.ui.updateSummary();
        } catch (error) {
            this.handleError(error);
        }
    }

    handleCustomerInput(field, value) {
        try {
            const updates = {
                ...this.state.customerDetails,
                [field]: value.trim()
            };

            this.state.setState({ customerDetails: updates });
            this.validateCustomerDetails(field, value.trim());
            this.ui.updateNavigationButtons();
        } catch (error) {
            this.handleError(error);
        }
    }

    async handleBookingSubmission() {
        try {
            this.ui.showLoading(true);

            if (!this.validateBookingData()) {
                throw new Error(
                    this.state.currentLanguage === 'ar'
                        ? 'يرجى التأكد من صحة جميع البيانات'
                        : 'Please ensure all data is valid'
                );
            }

            const bookingData = this.prepareBookingData();
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

    handleConnectionStatus({ status, message }) {
        if (status === 'connected') {
            this.ui.showToast(message, 'success');
            this.refreshCurrentData();
        } else {
            this.ui.showToast(message, 'error');
        }
    }

    async refreshCurrentData() {
        if (this.state.currentStep === 1) {
            await this.loadCategories();
        } else if (this.state.currentStep === 2 && this.state.selectedDate) {
            await this.handleDateSelection(this.state.selectedDate);
        } else if (this.state.currentStep === 3 && this.state.selectedDateTime) {
            await this.loadAvailableBarbers(this.state.selectedDateTime);
        }
    }

    // Utility Methods
    findServiceById(serviceId) {
        for (const [_, category] of this.state.categories) {
            if (category.services && category.services[serviceId]) {
                return {
                    id: serviceId,
                    ...category.services[serviceId]
                };
            }
        }
        return null;
    }

    calculateTotalDuration() {
        return Array.from(this.state.selectedServices.values())
            .reduce((total, service) => {
                const duration = parseInt(service.duration);
                return total + (isNaN(duration) ? 0 : duration);
            }, 0);
    }

    calculateTotalPrice() {
        return Array.from(this.state.selectedServices.values())
            .reduce((total, service) => total + service.price, 0);
    }

    async generateTimeSlots(date) {
        const slots = [];
        const selectedDate = new Date(date);
        const totalDuration = this.calculateTotalDuration();

        // Get working hours from config
        const [startHour, startMin] = config.business.workingHours.start.split(':').map(Number);
        const [endHour, endMin] = config.business.workingHours.end.split(':').map(Number);

        let currentSlot = new Date(selectedDate);
        currentSlot.setHours(startHour, startMin, 0, 0);

        const endTime = new Date(selectedDate);
        endTime.setHours(endHour, endMin, 0, 0);

        while (currentSlot < endTime) {
            // Check if slot is in the future
            if (currentSlot > new Date()) {
                slots.push({
                    time: currentSlot.toTimeString().slice(0, 5),
                    available: true
                });
            }

            // Increment by config.business.timeSlotInterval
            currentSlot = new Date(currentSlot.getTime() + config.business.timeSlotInterval * 60000);
        }

        return slots;
    }

    validateDateTime(dateTime) {
        const selectedDate = new Date(dateTime);
        const now = new Date();

        // Check if date is in the future
        if (selectedDate <= now) {
            return false;
        }

        // Check working hours
        const hours = selectedDate.getHours();
        const minutes = selectedDate.getMinutes();
        const [startHour, startMin] = config.business.workingHours.start.split(':').map(Number);
        const [endHour, endMin] = config.business.workingHours.end.split(':').map(Number);

        const timeInMinutes = hours * 60 + minutes;
        const startInMinutes = startHour * 60 + startMin;
        const endInMinutes = endHour * 60 + endMin;

        return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
    }

    validateCustomerDetails(field, value) {
        const errors = {
            name: '',
            phone: ''
        };

        if (field === 'name' || field === undefined) {
            if (!value && !this.state.customerDetails.name) {
                errors.name = this.state.currentLanguage === 'ar'
                    ? 'الاسم مطلوب'
                    : 'Name is required';
            } else if ((value || this.state.customerDetails.name).length < 3) {
                errors.name = this.state.currentLanguage === 'ar'
                    ? 'يجب أن يكون الاسم 3 أحرف على الأقل'
                    : 'Name must be at least 3 characters';
            }
        }

        if (field === 'phone' || field === undefined) {
            const phoneRegex = /^05[0-9]{8}$/;
            if (!value && !this.state.customerDetails.phone) {
                errors.phone = this.state.currentLanguage === 'ar'
                    ? 'رقم الجوال مطلوب'
                    : 'Phone number is required';
            } else if (!phoneRegex.test(value || this.state.customerDetails.phone)) {
                errors.phone = this.state.currentLanguage === 'ar'
                    ? 'يجب أن يبدأ رقم الجوال بـ 05 ويتكون من 10 أرقام'
                    : 'Phone number must start with 05 and be 10 digits';
            }
        }

        this.ui.showValidationErrors(errors);
        return !errors.name && !errors.phone;
    }

    handleError(error) {
        console.error('Booking error:', error);
        this.ui.showToast(error.message, 'error');
    }

    cleanup() {
        // Clean up subscriptions
        this.availabilitySubscriptions.forEach(subscription => subscription());
        this.availabilitySubscriptions.clear();
    }
}

export const bookingManager = new BookingManager(state, firebaseService, uiManager);
// ui-manager.js
class UIManager {
    constructor(state) {
        this.state = state;
        this.elements = this.initializeElements();
        this.setupStateObserver();
        this.setupEventListeners();
        this.animationDuration = 300; // ms
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
            forms: {
                booking: document.getElementById('booking-form'),
                name: document.getElementById('customer-name'),
                phone: document.getElementById('customer-phone')
            },
            grids: {
                categories: document.querySelector('.categories-services-grid'),
                timeSlots: document.querySelector('.time-slots-grid'),
                barbers: document.querySelector('.barbers-grid')
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
        // Navigation buttons
        this.elements.navigation.prev?.addEventListener('click', () => {
            this.handleNavigation('prev');
        });

        this.elements.navigation.next?.addEventListener('click', () => {
            this.handleNavigation('next');
        });

        // Summary toggle
        this.elements.summary.toggle?.addEventListener('click', () => {
            this.toggleSummary();
        });

        // Language switcher
        this.elements.languageButtons?.forEach(button => {
            button.addEventListener('click', () => {
                this.handleLanguageChange(button.dataset.lang);
            });
        });

        // Form validation
        this.elements.forms.name?.addEventListener('input', (e) => {
            this.validateField(e.target, 'name');
        });

        this.elements.forms.phone?.addEventListener('input', (e) => {
            this.validateField(e.target, 'phone');
        });

        // Handle back/forward browser buttons
        window.addEventListener('popstate', (e) => {
            if (e.state?.step) {
                this.state.setState({ currentStep: e.state.step });
            }
        });
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        container.setAttribute('role', 'alert');
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
        return container;
    }

    // Basic UI Updates
    updateUI() {
        this.updateSteps();
        this.updateNavigationButtons();
        this.updateSummary();
        this.updateLanguage();
    }
}
// ui-manager.js - Part 2
class UIManager {
    // ... (previous code)

    updateSteps() {
        const { currentStep } = this.state;

        // Update progress indicators
        this.elements.steps.progress.forEach((step, index) => {
            const stepNumber = index + 1;
            
            // Update classes
            step.classList.toggle('active', stepNumber === currentStep);
            step.classList.toggle('completed', stepNumber < currentStep);
            
            // Update accessibility attributes
            step.setAttribute('aria-current', stepNumber === currentStep ? 'step' : 'false');
            step.setAttribute('aria-completed', stepNumber < currentStep ? 'true' : 'false');
            
            // Update step number display
            const stepCircle = step.querySelector('.step-circle');
            if (stepCircle) {
                if (stepNumber < currentStep) {
                    stepCircle.innerHTML = '<span class="step-check">✓</span>';
                } else {
                    stepCircle.textContent = stepNumber;
                }
            }
        });

        // Update step content with animation
        this.elements.steps.content.forEach((content, index) => {
            const stepNumber = index + 1;
            if (stepNumber === currentStep) {
                this.showStepContent(content);
            } else {
                this.hideStepContent(content);
            }
        });

        // Update URL without refreshing
        this.updateURL(currentStep);
    }

    async showStepContent(element) {
        // Ensure element is displayed before animating
        element.style.display = 'block';
        
        // Wait for next frame to ensure display change is processed
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // Add active class to trigger animation
        element.classList.add('active');
        
        // Scroll into view smoothly
        element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
        });

        // Announce to screen readers
        this.announceStepChange(element);
    }

    hideStepContent(element) {
        // Remove active class to trigger fade out
        element.classList.remove('active');
        
        // Hide element after animation completes
        setTimeout(() => {
            if (!element.classList.contains('active')) {
                element.style.display = 'none';
            }
        }, this.animationDuration);
    }

    updateNavigationButtons() {
        const { prev, next } = this.elements.navigation;
        
        if (prev) {
            const canGoPrevious = this.state.canGoPrevious();
            prev.disabled = !canGoPrevious;
            prev.setAttribute('aria-disabled', !canGoPrevious);
            prev.classList.toggle('disabled', !canGoPrevious);
        }
        
        if (next) {
            const canGoNext = this.state.canGoNext();
            next.disabled = !canGoNext;
            next.setAttribute('aria-disabled', !canGoNext);
            next.classList.toggle('disabled', !canGoNext);
            
            // Update button text based on step
            const isLastStep = this.state.currentStep === this.state.maxSteps;
            next.textContent = this.translate(isLastStep ? 'Confirm Booking' : 'Next');
            
            // Add loading state if needed
            next.classList.toggle('loading', this.state.loading);
        }
    }

    handleNavigation(direction) {
        if (direction === 'prev' && this.state.canGoPrevious()) {
            this.navigateToPreviousStep();
        } else if (direction === 'next' && this.state.canGoNext()) {
            this.navigateToNextStep();
        }
    }

    async navigateToNextStep() {
        try {
            // Show loading state
            this.showLoadingButton('next');
            
            // Validate current step
            if (!this.validateCurrentStep()) {
                return;
            }

            // Attempt to move to next step
            const success = await this.state.goToNextStep();
            
            if (success) {
                // Animate progress bar
                this.animateProgress();
                
                // Pre-load data for next step if needed
                await this.preloadNextStepData();
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoadingButton('next');
        }
    }

    navigateToPreviousStep() {
        if (this.state.goToPreviousStep()) {
            this.animateProgress(true);
        }
    }

    updateURL(step) {
        const url = new URL(window.location);
        url.searchParams.set('step', step);
        window.history.pushState({ step }, '', url);
    }

    animateProgress(reverse = false) {
        const progressLine = document.querySelector('.progress-line');
        if (!progressLine) return;

        const currentStep = this.state.currentStep;
        const totalSteps = this.state.maxSteps;
        const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;

        progressLine.style.width = `${progress}%`;
    }

    validateCurrentStep() {
        switch (this.state.currentStep) {
            case 1:
                return this.validateServicesSelection();
            case 2:
                return this.validateDateTime();
            case 3:
                return this.validateBarberSelection();
            case 4:
                return this.validateCustomerDetails();
            default:
                return true;
        }
    }

    announceStepChange(element) {
        const announcement = element.getAttribute('aria-label') || 
                           element.querySelector('h2')?.textContent;
        
        if (announcement) {
            const announcer = document.createElement('div');
            announcer.className = 'visually-hidden';
            announcer.setAttribute('aria-live', 'polite');
            announcer.textContent = announcement;
            document.body.appendChild(announcer);
            
            setTimeout(() => announcer.remove(), 1000);
        }
    }

    showLoadingButton(buttonType) {
        const button = this.elements.navigation[buttonType];
        if (button) {
            button.classList.add('loading');
            button.disabled = true;
        }
    }

    hideLoadingButton(buttonType) {
        const button = this.elements.navigation[buttonType];
        if (button) {
            button.classList.remove('loading');
            button.disabled = !this.state[buttonType === 'next' ? 'canGoNext' : 'canGoPrevious']();
        }
    }

    async preloadNextStepData() {
        const nextStep = this.state.currentStep + 1;
        switch (nextStep) {
            case 2:
                await this.preloadDateTimeData();
                break;
            case 3:
                await this.preloadBarberData();
                break;
            case 4:
                this.focusFirstFormField();
                break;
        }
    }
}
// ui-manager.js - Part 3
class UIManager {
    // ... (previous code)

    validateField(input, fieldType) {
        const value = input.value.trim();
        const errorElement = input.nextElementSibling;
        let isValid = true;
        let errorMessage = '';

        switch (fieldType) {
            case 'name':
                if (value.length < 3) {
                    isValid = false;
                    errorMessage = this.state.currentLanguage === 'ar' 
                        ? 'يجب أن يكون الاسم 3 أحرف على الأقل'
                        : 'Name must be at least 3 characters';
                }
                break;

            case 'phone':
                const phoneRegex = /^05[0-9]{8}$/;
                if (!phoneRegex.test(value)) {
                    isValid = false;
                    errorMessage = this.state.currentLanguage === 'ar'
                        ? 'يجب أن يبدأ رقم الجوال بـ 05 ويتكون من 10 أرقام'
                        : 'Phone number must start with 05 and be 10 digits';
                }
                break;
        }

        this.updateFieldValidationUI(input, errorElement, isValid, errorMessage);
        this.updateFormValidationState();
        return isValid;
    }

    validateServicesSelection() {
        const selectedServices = this.state.selectedServices;
        
        if (selectedServices.size === 0) {
            this.showToast(
                this.state.currentLanguage === 'ar'
                    ? 'الرجاء اختيار خدمة واحدة على الأقل'
                    : 'Please select at least one service',
                'error'
            );
            return false;
        }

        if (selectedServices.size > config.business.maxServicesPerBooking) {
            this.showToast(
                this.state.currentLanguage === 'ar'
                    ? `لا يمكن اختيار أكثر من ${config.business.maxServicesPerBooking} خدمات`
                    : `Cannot select more than ${config.business.maxServicesPerBooking} services`,
                'error'
            );
            return false;
        }

        return true;
    }

    validateDateTime() {
        if (!this.state.selectedDateTime) {
            this.showToast(
                this.state.currentLanguage === 'ar'
                    ? 'الرجاء اختيار موعد'
                    : 'Please select an appointment time',
                'error'
            );
            return false;
        }

        const selectedDate = new Date(this.state.selectedDateTime);
        const now = new Date();

        if (selectedDate <= now) {
            this.showToast(
                this.state.currentLanguage === 'ar'
                    ? 'الرجاء اختيار موعد في المستقبل'
                    : 'Please select a future date and time',
                'error'
            );
            return false;
        }

        return true;
    }

    validateBarberSelection() {
        if (!this.state.selectedBarber) {
            this.showToast(
                this.state.currentLanguage === 'ar'
                    ? 'الرجاء اختيار حلاق'
                    : 'Please select a barber',
                'error'
            );
            return false;
        }
        return true;
    }

    validateCustomerDetails() {
        const { name, phone } = this.state.customerDetails;
        let isValid = true;

        // Name validation
        if (name.length < 3) {
            this.showFieldError(
                'name',
                this.state.currentLanguage === 'ar'
                    ? 'يجب أن يكون الاسم 3 أحرف على الأقل'
                    : 'Name must be at least 3 characters'
            );
            isValid = false;
        }

        // Phone validation
        const phoneRegex = /^05[0-9]{8}$/;
        if (!phoneRegex.test(phone)) {
            this.showFieldError(
                'phone',
                this.state.currentLanguage === 'ar'
                    ? 'يجب أن يبدأ رقم الجوال بـ 05 ويتكون من 10 أرقام'
                    : 'Phone number must start with 05 and be 10 digits'
            );
            isValid = false;
        }

        return isValid;
    }

    updateFieldValidationUI(input, errorElement, isValid, errorMessage) {
        input.classList.toggle('error', !isValid);
        input.setAttribute('aria-invalid', !isValid);
        
        if (errorElement) {
            errorElement.textContent = errorMessage;
            errorElement.classList.toggle('visible', !isValid);
        }

        // Update parent form-group styling
        const formGroup = input.closest('.form-group');
        if (formGroup) {
            formGroup.classList.toggle('has-error', !isValid);
        }
    }

    updateFormValidationState() {
        const isValid = Array.from(this.elements.forms.booking.elements)
            .every(element => !element.classList.contains('error'));
            
        this.elements.forms.booking.classList.toggle('is-valid', isValid);
        this.elements.navigation.next.disabled = !isValid;
    }

    showFieldError(fieldName, message) {
        const input = this.elements.forms[fieldName];
        const errorElement = input?.nextElementSibling;
        
        if (input && errorElement) {
            this.updateFieldValidationUI(input, errorElement, false, message);
            input.focus();
        }
    }

    resetFormValidation() {
        const forms = this.elements.forms;
        if (!forms.booking) return;

        Array.from(forms.booking.elements).forEach(element => {
            element.classList.remove('error');
            element.setAttribute('aria-invalid', 'false');
            
            const errorElement = element.nextElementSibling;
            if (errorElement?.classList.contains('error-message')) {
                errorElement.textContent = '';
                errorElement.classList.remove('visible');
            }

            const formGroup = element.closest('.form-group');
            if (formGroup) {
                formGroup.classList.remove('has-error');
            }
        });

        forms.booking.classList.remove('is-valid');
    }

    focusFirstFormField() {
        setTimeout(() => {
            const firstInput = this.elements.forms.booking?.querySelector('input:not([disabled])');
            if (firstInput) {
                firstInput.focus();
            }
        }, this.animationDuration);
    }

    handleFormSubmission = async (event) => {
        event.preventDefault();
        
        if (!this.validateCustomerDetails()) {
            return;
        }

        try {
            this.showLoading(true);
            await this.state.submitBooking();
            
            this.showToast(
                this.state.currentLanguage === 'ar'
                    ? 'تم حجز موعدك بنجاح'
                    : 'Your appointment has been booked successfully',
                'success'
            );
            
            this.resetForm();
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    resetForm() {
        this.elements.forms.booking?.reset();
        this.resetFormValidation();
        this.state.reset();
        this.updateUI();
    }
}
// ui-manager.js - Part 4
class UIManager {
    // ... (previous code)

    // Categories and Services Rendering
    renderCategories(categories) {
        if (!this.elements.grids.categories) return;

        this.elements.grids.categories.innerHTML = '';
        
        Object.entries(categories).forEach(([categoryId, category]) => {
            const categoryElement = this.createCategoryElement(categoryId, category);
            this.elements.grids.categories.appendChild(categoryElement);
        });

        // Setup category interactions after rendering
        this.setupCategoryInteractions();
    }

    createCategoryElement(categoryId, category) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';
        categoryDiv.dataset.categoryId = categoryId;

        categoryDiv.innerHTML = `
            <div class="category-header">
                <span class="category-title">
                    ${category[this.state.currentLanguage]}
                </span>
                <span class="category-toggle" role="button" tabindex="0">
                    <span class="visually-hidden">
                        ${this.translate('Toggle Category')}
                    </span>
                    +
                </span>
            </div>
            <div class="category-services" aria-expanded="false">
                ${this.generateServicesHTML(category.services)}
            </div>
        `;

        return categoryDiv;
    }

    generateServicesHTML(services) {
        return Object.entries(services).map(([serviceId, service]) => `
            <div class="service-card ${this.state.selectedServices.has(serviceId) ? 'selected' : ''}"
                 data-service-id="${serviceId}"
                 role="button"
                 tabindex="0"
                 aria-pressed="${this.state.selectedServices.has(serviceId)}"
                 aria-label="${service[`name_${this.state.currentLanguage}`]}"
            >
                <div class="service-name">
                    ${service[`name_${this.state.currentLanguage}`]}
                </div>
                <div class="service-details">
                    ${service[`description_${this.state.currentLanguage}`] || ''}
                </div>
                <div class="service-info">
                    <span class="service-duration">
                        <i class="icon-clock"></i>
                        ${this.formatDuration(service.duration)}
                    </span>
                    <span class="service-price">
                        ${service.price} ${this.translate('SAR')}
                    </span>
                </div>
                <div class="service-selected-indicator" aria-hidden="true">✓</div>
            </div>
        `).join('');
    }

    setupCategoryInteractions() {
        this.elements.grids.categories.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => this.toggleCategory(header));
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleCategory(header);
                }
            });
        });

        // Setup service card interactions
        this.elements.grids.categories.querySelectorAll('.service-card').forEach(card => {
            this.setupServiceCardInteractions(card);
        });
    }

    // Time Slots Rendering
    renderTimeSlots(slots) {
        if (!this.elements.grids.timeSlots) return;

        this.elements.grids.timeSlots.innerHTML = '';
        
        const timeSlotsList = document.createElement('div');
        timeSlotsList.className = 'time-slots-grid';
        timeSlotsList.setAttribute('role', 'group');
        timeSlotsList.setAttribute('aria-label', this.translate('Available Time Slots'));

        slots.forEach(slot => {
            const timeSlotElement = this.createTimeSlotElement(slot);
            timeSlotsList.appendChild(timeSlotElement);
        });

        this.elements.grids.timeSlots.appendChild(timeSlotsList);
        this.setupTimeSlotInteractions();
    }

    createTimeSlotElement(slot) {
        const button = document.createElement('button');
        button.className = `time-slot ${slot.available ? '' : 'unavailable'}`;
        button.dataset.time = slot.time;
        button.disabled = !slot.available;
        button.setAttribute('type', 'button');
        button.setAttribute('aria-label', this.formatTimeSlotLabel(slot));

        const timeDisplay = document.createElement('span');
        timeDisplay.className = 'time-display';
        timeDisplay.textContent = this.formatTime(slot.time);

        if (!slot.available) {
            const unavailableIndicator = document.createElement('span');
            unavailableIndicator.className = 'unavailable-indicator';
            unavailableIndicator.setAttribute('aria-hidden', 'true');
            button.appendChild(unavailableIndicator);
        }

        button.appendChild(timeDisplay);
        return button;
    }

    // Barbers Rendering
    renderBarbers(barbers) {
        if (!this.elements.grids.barbers) return;

        this.elements.grids.barbers.innerHTML = '';
        
        Object.entries(barbers).forEach(([barberId, barber]) => {
            const barberElement = this.createBarberElement(barberId, barber);
            this.elements.grids.barbers.appendChild(barberElement);
        });

        this.setupBarberInteractions();
    }

    createBarberElement(barberId, barber) {
        const isSelected = this.state.selectedBarber?.id === barberId;
        const isAvailable = barber.available !== false;

        const barberCard = document.createElement('div');
        barberCard.className = `barber-card ${isSelected ? 'selected' : ''} ${isAvailable ? '' : 'unavailable'}`;
        barberCard.dataset.barberId = barberId;
        barberCard.setAttribute('role', 'button');
        barberCard.setAttribute('tabindex', isAvailable ? '0' : '-1');
        barberCard.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        barberCard.setAttribute('aria-disabled', !isAvailable);

        barberCard.innerHTML = `
            <div class="barber-avatar">
                <span class="barber-initials">
                    ${this.getBarberInitials(barber[`name_${this.state.currentLanguage}`])}
                </span>
            </div>
            <div class="barber-info">
                <div class="barber-name">
                    ${barber[`name_${this.state.currentLanguage}`]}
                </div>
                <div class="barber-schedule">
                    ${this.formatWorkingHours(barber.working_hours)}
                </div>
            </div>
            <div class="barber-status" aria-hidden="true"></div>
        `;

        return barberCard;
    }

    // Utility Methods for Rendering
    formatDuration(duration) {
        const match = duration.match(/^(\d+)([mh])$/);
        if (!match) return duration;

        const [_, value, unit] = match;
        if (unit === 'h') {
            return this.state.currentLanguage === 'ar'
                ? `${value} ساعة`
                : `${value} hour${value === '1' ? '' : 's'}`;
        }
        return this.state.currentLanguage === 'ar'
            ? `${value} دقيقة`
            : `${value} min`;
    }

    formatTimeSlotLabel(slot) {
        const timeString = this.formatTime(slot.time);
        const availability = slot.available
            ? this.translate('Available')
            : this.translate('Not Available');
        
        return `${timeString} - ${availability}`;
    }

    getBarberInitials(name) {
        return name
            .split(' ')
            .map(part => part[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    formatWorkingHours(hours) {
        return `${this.formatTime(hours.start)} - ${this.formatTime(hours.end)}`;
    }
}
// ui-manager.js - Part 5
class UIManager {
    // ... (previous code)

    // Category Interactions
    setupCategoryInteractions() {
        const categories = this.elements.grids.categories.querySelectorAll('.category');
        
        categories.forEach(category => {
            const header = category.querySelector('.category-header');
            const toggle = category.querySelector('.category-toggle');
            const services = category.querySelector('.category-services');

            // Click handling
            header.addEventListener('click', () => {
                this.toggleCategory(category);
            });

            // Keyboard navigation
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleCategory(category);
                }
            });

            // Setup service interactions
            const serviceCards = services.querySelectorAll('.service-card');
            serviceCards.forEach(card => this.setupServiceCardInteractions(card));
        });
    }

    toggleCategory(category) {
        const services = category.querySelector('.category-services');
        const toggle = category.querySelector('.category-toggle');
        const isExpanded = services.getAttribute('aria-expanded') === 'true';

        // Update UI
        services.setAttribute('aria-expanded', !isExpanded);
        category.classList.toggle('open');
        
        // Update toggle icon and text
        toggle.textContent = isExpanded ? '+' : '-';
        toggle.setAttribute('aria-label', 
            this.translate(isExpanded ? 'Expand Category' : 'Collapse Category')
        );

        // Animate height
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

    // Service Card Interactions
    setupServiceCardInteractions(card) {
        card.addEventListener('click', () => this.handleServiceSelection(card));
        
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.handleServiceSelection(card);
            }
        });

        // Touch feedback
        card.addEventListener('touchstart', () => {
            card.classList.add('touch-active');
        }, { passive: true });

        card.addEventListener('touchend', () => {
            card.classList.remove('touch-active');
        });
    }

    handleServiceSelection(card) {
        const serviceId = card.dataset.serviceId;
        
        try {
            // Trigger service selection in state
            this.state.toggleService(serviceId);
            
            // Update UI
            this.updateServiceCard(card);
            this.updateSummary();
            
            // Provide feedback
            this.showSelectionFeedback(card);
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    updateServiceCard(card) {
        const serviceId = card.dataset.serviceId;
        const isSelected = this.state.selectedServices.has(serviceId);
        
        // Update visual state
        card.classList.toggle('selected', isSelected);
        card.setAttribute('aria-pressed', isSelected);
        
        // Animate selection indicator
        const indicator = card.querySelector('.service-selected-indicator');
        if (indicator) {
            indicator.style.transform = isSelected ? 'scale(1)' : 'scale(0)';
        }
    }

    // Time Slot Interactions
    setupTimeSlotInteractions() {
        const slots = this.elements.grids.timeSlots.querySelectorAll('.time-slot');
        
        slots.forEach(slot => {
            if (!slot.disabled) {
                slot.addEventListener('click', () => this.handleTimeSlotSelection(slot));
                
                slot.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.handleTimeSlotSelection(slot);
                    }
                });
            }
        });
    }

    handleTimeSlotSelection(slot) {
        const time = slot.dataset.time;
        
        // Update state
        this.state.setSelectedTime(time);
        
        // Update UI
        this.updateTimeSlotSelection(slot);
        this.updateSummary();
        
        // Load available barbers
        this.loadAvailableBarbers(time);
    }

    updateTimeSlotSelection(selectedSlot) {
        // Remove selection from all slots
        this.elements.grids.timeSlots.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('selected');
            slot.setAttribute('aria-pressed', 'false');
        });
        
        // Add selection to chosen slot
        if (selectedSlot) {
            selectedSlot.classList.add('selected');
            selectedSlot.setAttribute('aria-pressed', 'true');
        }
    }

    // Barber Selection Interactions
    setupBarberInteractions() {
        const barberCards = this.elements.grids.barbers.querySelectorAll('.barber-card:not(.unavailable)');
        
        barberCards.forEach(card => {
            card.addEventListener('click', () => this.handleBarberSelection(card));
            
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleBarberSelection(card);
                }
            });

            // Hover effects
            card.addEventListener('mouseenter', () => {
                if (!card.classList.contains('unavailable')) {
                    card.classList.add('hover');
                }
            });

            card.addEventListener('mouseleave', () => {
                card.classList.remove('hover');
            });
        });
    }

    handleBarberSelection(card) {
        const barberId = card.dataset.barberId;
        
        try {
            // Update state
            this.state.setSelectedBarber(barberId);
            
            // Update UI
            this.updateBarberSelection(card);
            this.updateSummary();
            
            // Show selection feedback
            this.showSelectionFeedback(card);
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    updateBarberSelection(selectedCard) {
        // Remove selection from all cards
        this.elements.grids.barbers.querySelectorAll('.barber-card').forEach(card => {
            card.classList.remove('selected');
            card.setAttribute('aria-pressed', 'false');
        });
        
        // Add selection to chosen card
        if (selectedCard) {
            selectedCard.classList.add('selected');
            selectedCard.setAttribute('aria-pressed', 'true');
        }
    }

    // Selection Feedback
    showSelectionFeedback(element) {
        // Visual feedback
        element.classList.add('feedback');
        setTimeout(() => element.classList.remove('feedback'), 300);
        
        // Haptic feedback (if available)
        if (window.navigator.vibrate) {
            window.navigator.vibrate(50);
        }
        
        // Sound feedback (if enabled)
        this.playSelectionSound();
    }

    playSelectionSound() {
        // Only play if user hasn't disabled sounds
        if (localStorage.getItem('enableSounds') !== 'false') {
            const audio = new Audio('assets/sounds/select.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {}); // Ignore errors if audio fails to play
        }
    }

    // State Updates
    updateUIFromState() {
        // Update all UI elements based on current state
        this.updateServiceSelections();
        this.updateTimeSelection();
        this.updateBarberSelection();
        this.updateSummary();
        this.updateNavigationButtons();
    }

    updateServiceSelections() {
        const serviceCards = this.elements.grids.categories.querySelectorAll('.service-card');
        serviceCards.forEach(card => {
            const serviceId = card.dataset.serviceId;
            this.updateServiceCard(card);
        });
    }

    updateTimeSelection() {
        const { selectedDateTime } = this.state;
        if (selectedDateTime) {
            const time = new Date(selectedDateTime).toTimeString().slice(0, 5);
            const slot = this.elements.grids.timeSlots.querySelector(`[data-time="${time}"]`);
            if (slot) {
                this.updateTimeSlotSelection(slot);
            }
        }
    }

    updateBarberSelection() {
        const { selectedBarber } = this.state;
        if (selectedBarber) {
            const card = this.elements.grids.barbers.querySelector(`[data-barber-id="${selectedBarber.id}"]`);
            if (card) {
                this.updateBarberSelection(card);
            }
        }
    }
}
// ui-manager.js - Part 6
class UIManager {
    // ... (previous code)

    // Summary Box Management
    updateSummary() {
        const { selectedServices, selectedDateTime, selectedBarber } = this.state;
        
        // Generate summary sections
        const sections = {
            services: this.generateServicesSummary(selectedServices),
            datetime: this.generateDateTimeSummary(selectedDateTime),
            barber: this.generateBarberSummary(selectedBarber),
            total: this.generateTotalSummary(selectedServices)
        };

        // Update summary content
        this.renderSummary(sections);
        
        // Show/hide summary box based on content
        this.toggleSummaryVisibility(selectedServices.size > 0);
        
        // Animate updates
        this.animateSummaryUpdates();
    }

    generateServicesSummary(services) {
        if (services.size === 0) return '';

        return `
            <div class="summary-section services-summary" data-aos="fade-up">
                <h4 class="summary-section-title">
                    ${this.translate('Selected Services')}
                </h4>
                <div class="summary-services">
                    ${Array.from(services.values()).map(service => `
                        <div class="summary-service-item" data-service-id="${service.id}">
                            <div class="service-info">
                                <span class="service-name">
                                    ${service[`name_${this.state.currentLanguage}`]}
                                </span>
                                <span class="service-duration">
                                    ${this.formatDuration(service.duration)}
                                </span>
                            </div>
                            <span class="service-price">
                                ${this.formatPrice(service.price)}
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateDateTimeSummary(dateTime) {
        if (!dateTime) return '';

        return `
            <div class="summary-section datetime-summary" data-aos="fade-up" data-aos-delay="100">
                <h4 class="summary-section-title">
                    ${this.translate('Appointment Time')}
                </h4>
                <div class="summary-datetime">
                    <div class="date-display">
                        <i class="icon-calendar"></i>
                        ${this.formatDate(dateTime)}
                    </div>
                    <div class="time-display">
                        <i class="icon-clock"></i>
                        ${this.formatTime(dateTime)}
                    </div>
                </div>
            </div>
        `;
    }

    generateBarberSummary(barber) {
        if (!barber) return '';

        return `
            <div class="summary-section barber-summary" data-aos="fade-up" data-aos-delay="200">
                <h4 class="summary-section-title">
                    ${this.translate('Selected Barber')}
                </h4>
                <div class="summary-barber">
                    <div class="barber-avatar">
                        <span class="barber-initials">
                            ${this.getBarberInitials(barber[`name_${this.state.currentLanguage}`])}
                        </span>
                    </div>
                    <div class="barber-info">
                        <div class="barber-name">
                            ${barber[`name_${this.state.currentLanguage}`]}
                        </div>
                        <div class="barber-schedule">
                            ${this.formatWorkingHours(barber.working_hours)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateTotalSummary(services) {
        if (services.size === 0) return '';

        const total = Array.from(services.values())
            .reduce((sum, service) => sum + service.price, 0);

        return `
            <div class="summary-total" data-aos="fade-up" data-aos-delay="300">
                <div class="total-row">
                    <span class="total-label">${this.translate('Total')}</span>
                    <span class="total-amount">${this.formatPrice(total)}</span>
                </div>
                <div class="total-note">
                    ${this.translate('Including VAT')}
                </div>
            </div>
        `;
    }

    renderSummary(sections) {
        const summaryContent = this.elements.summary.content;
        
        // Create temporary container for smooth transition
        const tempContainer = document.createElement('div');
        tempContainer.className = 'summary-content-temp';
        tempContainer.innerHTML = Object.values(sections).join('');

        // Fade out current content
        summaryContent.style.opacity = '0';
        
        // After fade out, update content and fade in
        setTimeout(() => {
            summaryContent.innerHTML = tempContainer.innerHTML;
            summaryContent.style.opacity = '1';
            
            // Initialize any new animations
            this.initializeSummaryAnimations();
        }, 300);
    }

    toggleSummaryVisibility(show) {
        const { container } = this.elements.summary;
        
        if (show && container.classList.contains('hidden')) {
            container.classList.remove('hidden');
            container.setAttribute('aria-hidden', 'false');
            
            // Animate in
            requestAnimationFrame(() => {
                container.style.transform = 'translateY(0)';
            });
        } else if (!show && !container.classList.contains('hidden')) {
            container.style.transform = 'translateY(100%)';
            
            // After animation, hide completely
            setTimeout(() => {
                container.classList.add('hidden');
                container.setAttribute('aria-hidden', 'true');
            }, 300);
        }
    }

    // Toast Notifications
    showToast(message, type = 'success', duration = 5000) {
        const toast = this.createToastElement(message, type);
        this.elements.toastContainer.appendChild(toast);

        // Animate entrance
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Setup auto-dismiss
        const dismissTimeout = setTimeout(() => {
            this.dismissToast(toast);
        }, duration);

        // Store timeout ID for potential early dismissal
        toast.dataset.timeoutId = dismissTimeout;

        // Setup manual dismiss
        const closeButton = toast.querySelector('.toast-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                clearTimeout(dismissTimeout);
                this.dismissToast(toast);
            });
        }

        // Setup swipe to dismiss on mobile
        this.setupToastSwipeDismiss(toast);

        return toast;
    }

    createToastElement(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');

        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    ${this.getToastIcon(type)}
                </div>
                <div class="toast-message">${message}</div>
                <button class="toast-close" aria-label="${this.translate('Close')}">
                    <span aria-hidden="true">×</span>
                </button>
            </div>
            <div class="toast-progress"></div>
        `;

        return toast;
    }

    dismissToast(toast) {
        // Clear any existing timeout
        const timeoutId = toast.dataset.timeoutId;
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        // Animate out
        toast.classList.add('hiding');
        
        // Remove after animation
        toast.addEventListener('animationend', () => {
            toast.remove();
            
            // If no more toasts, remove container
            if (this.elements.toastContainer.children.length === 0) {
                this.elements.toastContainer.remove();
            }
        });
    }

    setupToastSwipeDismiss(toast) {
        let startX;
        let currentX;
        let isDragging = false;

        toast.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            toast.style.transition = 'none';
        }, { passive: true });

        toast.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            currentX = e.touches[0].clientX;
            const deltaX = currentX - startX;
            
            // Limit swipe to one direction based on RTL
            const isRTL = this.state.currentLanguage === 'ar';
            if ((isRTL && deltaX < 0) || (!isRTL && deltaX > 0)) return;
            
            toast.style.transform = `translateX(${deltaX}px)`;
        }, { passive: true });

        toast.addEventListener('touchend', () => {
            if (!isDragging) return;
            
            isDragging = false;
            toast.style.transition = '';
            
            const deltaX = currentX - startX;
            if (Math.abs(deltaX) > toast.offsetWidth * 0.5) {
                this.dismissToast(toast);
            } else {
                toast.style.transform = '';
            }
        });
    }

    getToastIcon(type) {
        switch (type) {
            case 'success':
                return '<svg>...</svg>'; // Success icon SVG
            case 'error':
                return '<svg>...</svg>'; // Error icon SVG
            case 'warning':
                return '<svg>...</svg>'; // Warning icon SVG
            default:
                return '<svg>...</svg>'; // Info icon SVG
        }
    }
}
// ui-manager.js - Part 7
class UIManager {
    // ... (previous code)

    // Formatting Utilities
    formatPrice(price) {
        return new Intl.NumberFormat(
            this.state.currentLanguage === 'ar' ? 'ar-SA' : 'en-US',
            {
                style: 'currency',
                currency: 'SAR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }
        ).format(price);
    }

    formatDate(dateTime) {
        const date = new Date(dateTime);
        return date.toLocaleDateString(
            this.state.currentLanguage === 'ar' ? 'ar-SA' : 'en-US',
            {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }
        );
    }

    formatTime(time) {
        if (typeof time === 'string' && time.includes(':')) {
            // Handle time string format (HH:mm)
            const [hours, minutes] = time.split(':');
            const date = new Date();
            date.setHours(parseInt(hours), parseInt(minutes));
            return this.formatTimeFromDate(date);
        } else if (time instanceof Date) {
            // Handle Date object
            return this.formatTimeFromDate(time);
        }
        return time; // Return as is if format not recognized
    }

    formatTimeFromDate(date) {
        return date.toLocaleTimeString(
            this.state.currentLanguage === 'ar' ? 'ar-SA' : 'en-US',
            {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }
        );
    }

    formatDurationForDisplay(duration) {
        // Parse duration string (e.g., "90m" or "1h 30m")
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        
        if (this.state.currentLanguage === 'ar') {
            const parts = [];
            if (hours > 0) {
                parts.push(`${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`);
            }
            if (minutes > 0) {
                parts.push(`${minutes} دقيقة`);
            }
            return parts.join(' و ');
        } else {
            const parts = [];
            if (hours > 0) {
                parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
            }
            if (minutes > 0) {
                parts.push(`${minutes} min`);
            }
            return parts.join(' ');
        }
    }

    // Animation Helpers
    animateElement(element, animationName, duration = 300) {
        return new Promise(resolve => {
            element.classList.add(animationName);
            
            const cleanup = () => {
                element.classList.remove(animationName);
                element.removeEventListener('animationend', onAnimationEnd);
                resolve();
            };

            const onAnimationEnd = (event) => {
                if (event.target === element) {
                    cleanup();
                }
            };

            element.addEventListener('animationend', onAnimationEnd);
            
            // Failsafe: cleanup after duration + 100ms buffer
            setTimeout(cleanup, duration + 100);
        });
    }

    // Accessibility Helpers
    announceToScreenReader(message, priority = 'polite') {
        const announcer = document.createElement('div');
        announcer.className = 'sr-only';
        announcer.setAttribute('aria-live', priority);
        announcer.textContent = message;
        
        document.body.appendChild(announcer);
        
        // Remove after announcement
        setTimeout(() => {
            announcer.remove();
        }, 1000);
    }

    // Device Detection and Adaptation
    isMobileDevice() {
        return window.innerWidth <= 768 || 
               ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0);
    }

    setupTouchInteractions() {
        if (!this.isMobileDevice()) return;

        // Add touch-specific classes
        document.body.classList.add('touch-device');
        
        // Setup touch feedback
        document.addEventListener('touchstart', () => {}, {passive: true});
        
        // Disable hover effects on touch devices
        const style = document.createElement('style');
        style.textContent = `
            @media (hover: none) {
                .hover-effect {
                    display: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Error Handling
    handleError(error, context = '') {
        console.error(`UI Error ${context ? `in ${context}` : ''}:`, error);

        // Show user-friendly error message
        this.showToast(
            this.getErrorMessage(error),
            'error'
        );
    }

    getErrorMessage(error) {
        // Handle known error types
        if (error.code === 'NETWORK_ERROR') {
            return this.translate('Network Error Message');
        }
        
        if (error.code === 'VALIDATION_ERROR') {
            return this.translate('Validation Error Message');
        }
        
        // Default error message
        return this.state.currentLanguage === 'ar'
            ? 'حدث خطأ ما. الرجاء المحاولة مرة أخرى'
            : 'Something went wrong. Please try again';
    }

    // Memory Management
    cleanup() {
        // Clear all timeouts
        this.activeTimeouts.forEach(clearTimeout);
        this.activeTimeouts.clear();

        // Remove event listeners
        this.removeAllEventListeners();

        // Clear any ongoing animations
        this.stopAllAnimations();

        // Remove dynamic elements
        this.removeDynamicElements();
    }

    removeAllEventListeners() {
        // Cleanup category listeners
        this.elements.grids.categories?.querySelectorAll('.category-header')
            .forEach(header => {
                header.replaceWith(header.cloneNode(true));
            });

        // Cleanup service listeners
        this.elements.grids.categories?.querySelectorAll('.service-card')
            .forEach(card => {
                card.replaceWith(card.cloneNode(true));
            });

        // Cleanup time slot listeners
        this.elements.grids.timeSlots?.querySelectorAll('.time-slot')
            .forEach(slot => {
                slot.replaceWith(slot.cloneNode(true));
            });

        // Cleanup barber listeners
        this.elements.grids.barbers?.querySelectorAll('.barber-card')
            .forEach(card => {
                card.replaceWith(card.cloneNode(true));
            });
    }

    stopAllAnimations() {
        document.getAnimations().forEach(animation => {
            animation.cancel();
        });
    }

    removeDynamicElements() {
        // Remove toast container
        this.elements.toastContainer?.remove();

        // Remove any screen reader announcer elements
        document.querySelectorAll('.sr-only[aria-live]')
            .forEach(el => el.remove());
    }

    // Performance Optimization
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Language and Translation
    getTranslations() {
        return {
            'Network Error Message': {
                ar: 'لا يمكن الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت الخاص بك',
                en: 'Unable to connect to server. Please check your internet connection'
            },
            'Validation Error Message': {
                ar: 'يرجى التحقق من صحة جميع الحقول المطلوبة',
                en: 'Please check all required fields'
            },
            // Add more translations as needed
        };
    }

    translate(key) {
        const translations = this.getTranslations();
        return translations[key]?.[this.state.currentLanguage] || key;
    }
}

// Export the UIManager class
export { UIManager };
