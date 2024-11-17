// config.js
const config = {
    firebase: {
        apiKey: "YOUR_API_KEY",
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
            end: "08:00"
        },
        appointmentDuration: 30, // minutes
        phoneNumber: "966599791440", // WhatsApp number
        maxServicesPerBooking: 5
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
        server: "YYYY-MM-DD HH:mm" // Format used when saving to database
    }
};

// state.js
class BookingState {
    constructor() {
        this.currentStep = 1;
        this.maxSteps = 4;
        this.currentLanguage = 'ar';
        this.selectedServices = new Map();
        this.selectedDateTime = null;
        this.selectedBarber = null;
        this.customerDetails = {
            name: '',
            phone: ''
        };
        this.categories = new Map();
        this.barbers = new Map();
        this.observers = new Set();
    }

    // State management methods
    setState(updates) {
        let hasChanges = false;
        for (const [key, value] of Object.entries(updates)) {
            if (this[key] !== value) {
                this[key] = value;
                hasChanges = true;
            }
        }
        if (hasChanges) {
            this.notifyObservers();
        }
    }

    // Observer pattern implementation
    subscribe(observer) {
        this.observers.add(observer);
        return () => this.observers.delete(observer);
    }

    notifyObservers() {
        for (const observer of this.observers) {
            observer(this);
        }
    }

    // Navigation methods
    canGoNext() {
        switch (this.currentStep) {
            case 1:
                return this.selectedServices.size > 0;
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

    goToNextStep() {
        if (this.canGoNext() && this.currentStep < this.maxSteps) {
            this.setState({ currentStep: this.currentStep + 1 });
            return true;
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

    // Service management
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
        this.setState({ selectedServices: updatedServices });
    }

    // Validation methods
    validateCustomerDetails() {
        const { name, phone } = this.customerDetails;
        const phonePattern = /^05[0-9]{8}$/;
        return (
            name.trim().length >= 3 &&
            phonePattern.test(phone)
        );
    }

    validateDateTime(dateTime) {
        const selectedDate = new Date(dateTime);
        const now = new Date();
        
        // Check if date is in the future
        if (selectedDate <= now) {
            throw new Error(
                this.currentLanguage === 'ar'
                    ? 'يجب اختيار موعد في المستقبل'
                    : 'Please select a future date and time'
            );
        }

        // Check if within working hours
        const hours = selectedDate.getHours();
        const [startHour] = config.business.workingHours.start.split(':').map(Number);
        const [endHour] = config.business.workingHours.end.split(':').map(Number);
        
        if (hours < startHour || hours >= endHour) {
            throw new Error(
                this.currentLanguage === 'ar'
                    ? `ساعات العمل من ${config.business.workingHours.start} إلى ${config.business.workingHours.end}`
                    : `Working hours are from ${config.business.workingHours.start} to ${config.business.workingHours.end}`
            );
        }

        return true;
    }

    // Reset state
    reset() {
        this.setState({
            currentStep: 1,
            selectedServices: new Map(),
            selectedDateTime: null,
            selectedBarber: null,
            customerDetails: {
                name: '',
                phone: ''
            }
        });
    }
}

// Create and export state instance
const state = new BookingState();
export { state, config };
// utils.js
class UIManager {
    constructor(state) {
        this.state = state;
        this.elements = this.initializeElements();
        this.setupEventListeners();
        this.setupStateObserver();
    }

    // Initialize DOM element references
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
                barbers: document.querySelector('.barbers-grid')
            },
            summary: {
                container: document.querySelector('.booking-summary'),
                content: document.querySelector('.summary-content'),
                toggle: document.querySelector('.toggle-summary')
            },
            datePicker: document.getElementById('appointment-time'),
            languageButtons: document.querySelectorAll('.language-option'),
            loadingOverlay: document.querySelector('.loading-overlay')
        };
    }

    // Setup event listeners
    setupEventListeners() {
        // Navigation buttons
        this.elements.navigation.prev.addEventListener('click', () => {
            this.state.goToPreviousStep();
        });

        this.elements.navigation.next.addEventListener('click', () => {
            if (this.state.currentStep === this.state.maxSteps) {
                this.handleBookingSubmission();
            } else {
                this.state.goToNextStep();
            }
        });

        // Form inputs
        this.elements.forms.name.addEventListener('input', (e) => {
            this.state.customerDetails.name = e.target.value;
            this.validateField(e.target);
        });

        this.elements.forms.phone.addEventListener('input', (e) => {
            this.state.customerDetails.phone = e.target.value;
            this.validateField(e.target);
        });

        // Summary toggle
        this.elements.summary.toggle.addEventListener('click', () => {
            this.elements.summary.container.classList.toggle('hidden');
        });

        // Language switcher
        this.elements.languageButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.handleLanguageChange(button.dataset.lang);
            });
        });
    }

    // Setup state observer
    setupStateObserver() {
        this.state.subscribe(() => {
            this.updateUI();
        });
    }

    // UI Update methods
    updateUI() {
        this.updateSteps();
        this.updateNavigation();
        this.updateSummary();
        this.updateLanguage();
    }

    updateSteps() {
        // Update progress indicators
        this.elements.steps.progress.forEach((step, index) => {
            step.classList.toggle('active', index + 1 === this.state.currentStep);
            step.classList.toggle('completed', index + 1 < this.state.currentStep);
        });

        // Update step content visibility
        this.elements.steps.content.forEach((content, index) => {
            content.classList.toggle('active', index + 1 === this.state.currentStep);
        });
    }

    updateNavigation() {
        const { prev, next } = this.elements.navigation;
        
        // Update previous button
        prev.disabled = !this.state.canGoPrevious();
        
        // Update next button
        next.disabled = !this.state.canGoNext();
        next.textContent = this.state.currentStep === this.state.maxSteps
            ? this.translate('Confirm Booking')
            : this.translate('Next');
    }

    updateSummary() {
        const { selectedServices, selectedDateTime, selectedBarber } = this.state;
        let summaryHTML = '';

        // Services section
        if (selectedServices.size > 0) {
            summaryHTML += `
                <div class="summary-section">
                    <h4 class="summary-section-title">${this.translate('Selected Services')}</h4>
                    <div class="summary-services">
                        ${Array.from(selectedServices.values()).map(service => `
                            <div class="summary-service-item">
                                <span>${service[`name_${this.state.currentLanguage}`]}</span>
                                <span>${service.price} ${this.translate('SAR')}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Date and Time section
        if (selectedDateTime) {
            summaryHTML += `
                <div class="summary-section">
                    <h4 class="summary-section-title">${this.translate('Appointment Time')}</h4>
                    <div>${this.formatDateTime(selectedDateTime)}</div>
                </div>
            `;
        }

        // Barber section
        if (selectedBarber) {
            summaryHTML += `
                <div class="summary-section">
                    <h4 class="summary-section-title">${this.translate('Selected Barber')}</h4>
                    <div>${selectedBarber[`name_${this.state.currentLanguage}`]}</div>
                </div>
            `;
        }

        // Total section
        if (selectedServices.size > 0) {
            const total = Array.from(selectedServices.values())
                .reduce((sum, service) => sum + service.price, 0);
            
            summaryHTML += `
                <div class="summary-total">
                    <div class="total-row">
                        <span>${this.translate('Total')}</span>
                        <span>${total} ${this.translate('SAR')}</span>
                    </div>
                </div>
            `;
        }

        this.elements.summary.content.innerHTML = summaryHTML;
    }

    handleLanguageChange(lang) {
        this.state.currentLanguage = lang;
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        
        this.elements.languageButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.lang === lang);
        });

        this.updateUI();
        this.initializeDatePicker();
    }

    // Form validation
    validateField(input) {
        const errorElement = input.nextElementSibling;
        let isValid = true;
        let errorMessage = '';

        switch (input.id) {
            case 'customer-name':
                if (input.value.trim().length < 3) {
                    isValid = false;
                    errorMessage = this.translate('Name must be at least 3 characters');
                }
                break;

            case 'customer-phone':
                if (!/^05[0-9]{8}$/.test(input.value)) {
                    isValid = false;
                    errorMessage = this.translate('Please enter a valid phone number');
                }
                break;
        }

        input.classList.toggle('error', !isValid);
        errorElement.textContent = errorMessage;
        return isValid;
    }

    // Loading state
    showLoading(show = true) {
        this.elements.loadingOverlay.classList.toggle('active', show);
    }

    // Toast notifications
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-message">${message}</div>
            <button class="toast-close" aria-label="${this.translate('Close')}">&times;</button>
        `;

        const container = document.querySelector('.toast-container') || 
            (() => {
                const cont = document.createElement('div');
                cont.className = 'toast-container';
                document.body.appendChild(cont);
                return cont;
            })();

        container.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 5000);

        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        });
    }

    // Utility methods
    translate(key) {
        // This would normally use a proper translation system
        // For now, we'll use a simple object
        const translations = {
            'Next': { ar: 'التالي', en: 'Next' },
            'Previous': { ar: 'السابق', en: 'Previous' },
            'Confirm Booking': { ar: 'تأكيد الحجز', en: 'Confirm Booking' },
            'SAR': { ar: 'ريال', en: 'SAR' },
            // Add more translations as needed
        };

        return translations[key]?.[this.state.currentLanguage] || key;
    }

    formatDateTime(dateTime) {
        return new Date(dateTime).toLocaleString(
            this.state.currentLanguage === 'ar' ? 'ar-SA' : 'en-US',
            {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }
        );
    }
}

export const uiManager = new UIManager(state);
// firebase-service.js
class FirebaseService {
    constructor(config) {
        // Initialize Firebase
        firebase.initializeApp(config.firebase);
        this.db = firebase.database();
        this.setupDatabaseRules();
    }

    // Database Rules Setup
    async setupDatabaseRules() {
        try {
            await this.db.ref('.info/connected').once('value');
        } catch (error) {
            console.error('Firebase connection error:', error);
            uiManager.showToast('Unable to connect to the server', 'error');
        }
    }

    // Categories and Services
    async loadCategories() {
        try {
            const snapshot = await this.db.ref('categories').once('value');
            return snapshot.val() || {};
        } catch (error) {
            console.error('Error loading categories:', error);
            throw new Error('Failed to load services');
        }
    }

    // Barbers
    async loadBarbers() {
        try {
            const snapshot = await this.db.ref('barbers').once('value');
            const barbers = snapshot.val() || {};
            return Object.entries(barbers)
                .filter(([_, barber]) => barber.active)
                .reduce((acc, [id, barber]) => ({
                    ...acc,
                    [id]: barber
                }), {});
        } catch (error) {
            console.error('Error loading barbers:', error);
            throw new Error('Failed to load barbers');
        }
    }

    // Availability Checking
    async checkBarberAvailability(barberId, dateTime, duration) {
        try {
            const date = new Date(dateTime);
            const dateStr = date.toISOString().split('T')[0];
            
            const snapshot = await this.db.ref('bookings')
                .orderByChild('barberId')
                .equalTo(barberId)
                .once('value');
            
            const bookings = snapshot.val() || {};
            
            return !Object.values(bookings).some(booking => {
                if (booking.status === 'cancelled') return false;
                
                const bookingDate = new Date(booking.dateTime);
                if (bookingDate.toISOString().split('T')[0] !== dateStr) return false;
                
                const bookingStart = bookingDate.getTime();
                const bookingEnd = bookingStart + (booking.totalDuration * 60 * 1000);
                const newBookingStart = date.getTime();
                const newBookingEnd = newBookingStart + (duration * 60 * 1000);
                
                return (newBookingStart < bookingEnd && newBookingEnd > bookingStart);
            });
        } catch (error) {
            console.error('Error checking availability:', error);
            throw new Error('Failed to check barber availability');
        }
    }

    // Booking Creation
    async createBooking(bookingData) {
        try {
            // Check availability one last time
            const isAvailable = await this.checkBarberAvailability(
                bookingData.barberId,
                bookingData.dateTime,
                bookingData.totalDuration
            );

            if (!isAvailable) {
                throw new Error('Selected time slot is no longer available');
            }

            // Add booking
            const newBookingRef = await this.db.ref('bookings').push({
                ...bookingData,
                status: 'pending',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });

            return newBookingRef.key;
        } catch (error) {
            console.error('Error creating booking:', error);
            throw new Error('Failed to create booking');
        }
    }

    // Booking Status Update
    async updateBookingStatus(bookingId, status) {
        try {
            await this.db.ref(`bookings/${bookingId}/status`).set(status);
            return true;
        } catch (error) {
            console.error('Error updating booking status:', error);
            throw new Error('Failed to update booking status');
        }
    }

    // Real-time Availability Updates
    subscribeToAvailabilityUpdates(barberId, date, callback) {
        const dateStr = new Date(date).toISOString().split('T')[0];
        
        return this.db.ref('bookings')
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
    }
}

// booking-manager.js
class BookingManager {
    constructor(state, firebaseService, uiManager) {
        this.state = state;
        this.firebase = firebaseService;
        this.ui = uiManager;
        this.initializeBookingProcess();
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
            this.ui.showLoading(false);
            this.ui.showToast(error.message, 'error');
        }
    }

    async loadCategories() {
        const categories = await this.firebase.loadCategories();
        this.state.categories = new Map(Object.entries(categories));
        this.ui.renderCategories(categories);
    }

    async loadBarbers() {
        const barbers = await this.firebase.loadBarbers();
        this.state.barbers = new Map(Object.entries(barbers));
    }

    async handleDateTimeSelection(dateTime) {
        try {
            // Validate selection
            if (!this.state.validateDateTime(dateTime)) {
                throw new Error('Invalid date/time selection');
            }

            // Update state
            this.state.selectedDateTime = dateTime;
            
            // Load available barbers
            const availableBarbers = await this.getAvailableBarbers(dateTime);
            this.ui.renderBarbers(availableBarbers);
            
        } catch (error) {
            this.ui.showToast(error.message, 'error');
        }
    }

    async getAvailableBarbers(dateTime) {
        const totalDuration = Array.from(this.state.selectedServices.values())
            .reduce((sum, service) => sum + parseInt(service.duration), 0);

        const availableBarbers = [];
        
        for (const [barberId, barber] of this.state.barbers) {
            const isAvailable = await this.firebase.checkBarberAvailability(
                barberId,
                dateTime,
                totalDuration
            );
            
            if (isAvailable) {
                availableBarbers.push({ id: barberId, ...barber });
            }
        }

        return availableBarbers;
    }

    async submitBooking() {
        try {
            this.ui.showLoading(true);

            // Prepare booking data
            const bookingData = this.prepareBookingData();

            // Create booking
            const bookingId = await this.firebase.createBooking(bookingData);

            // Send confirmation
            await this.sendConfirmation(bookingData);

            // Reset state
            this.state.reset();

            // Show success message
            this.ui.showToast(
                this.state.currentLanguage === 'ar' 
                    ? 'تم الحجز بنجاح'
                    : 'Booking confirmed successfully',
                'success'
            );

            return bookingId;
        } catch (error) {
            this.ui.showToast(error.message, 'error');
            throw error;
        } finally {
            this.ui.showLoading(false);
        }
    }

    prepareBookingData() {
        const totalDuration = Array.from(this.state.selectedServices.values())
            .reduce((sum, service) => sum + parseInt(service.duration), 0);

        const totalPrice = Array.from(this.state.selectedServices.values())
            .reduce((sum, service) => sum + service.price, 0);

        return {
            customerName: this.state.customerDetails.name.trim(),
            customerPhone: this.state.customerDetails.phone.trim(),
            services: Array.from(this.state.selectedServices.values()).map(service => ({
                id: service.id,
                name: service[`name_${this.state.currentLanguage}`],
                price: service.price,
                duration: service.duration
            })),
            barberId: this.state.selectedBarber.id,
            barberName: this.state.selectedBarber[`name_${this.state.currentLanguage}`],
            dateTime: this.state.selectedDateTime,
            totalPrice,
            totalDuration,
            language: this.state.currentLanguage
        };
    }

    async sendConfirmation(bookingData) {
        // Format WhatsApp message
        const message = this.formatConfirmationMessage(bookingData);
        
        // Open WhatsApp
        window.open(
            `https://wa.me/${config.business.phoneNumber}?text=${encodeURIComponent(message)}`,
            '_blank'
        );
    }

    formatConfirmationMessage(booking) {
        const servicesList = booking.services
            .map(s => `- ${s.name}: ${s.price} ${this.state.currentLanguage === 'ar' ? 'ريال' : 'SAR'}`)
            .join('\n');

        return this.state.currentLanguage === 'ar' 
            ? `
                حجز جديد ✨
                
                الاسم: ${booking.customerName}
                رقم الجوال: ${booking.customerPhone}
                
                الخدمات:
                ${servicesList}
                
                الحلاق: ${booking.barberName}
                الموعد: ${this.ui.formatDateTime(booking.dateTime)}
                
                المجموع: ${booking.totalPrice} ريال
                
                شكراً لك! 🙏
            `
            : `
                New Booking ✨
                
                Name: ${booking.customerName}
                Phone: ${booking.customerPhone}
                
                Services:
                ${servicesList}
                
                Barber: ${booking.barberName}
                Appointment: ${this.ui.formatDateTime(booking.dateTime)}
                
                Total: ${booking.totalPrice} SAR
                
                Thank you! 🙏
            `;
    }
}

// Initialize services
const firebaseService = new FirebaseService(config);
const bookingManager = new BookingManager(state, firebaseService, uiManager);

export { firebaseService, bookingManager };
// app.js
class BookingApplication {
    constructor() {
        this.state = state;
        this.ui = uiManager;
        this.firebase = firebaseService;
        this.bookingManager = bookingManager;
        
        this.initializeApplication();
    }

    async initializeApplication() {
        try {
            // Show loading state
            this.ui.showLoading(true);

            // Initialize components
            await this.initializeComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Initialize date picker
            this.initializeDatePicker();
            
            // Set initial language
            this.initializeLanguage();

            // Hide loading state
            this.ui.showLoading(false);
        } catch (error) {
            console.error('Application initialization error:', error);
            this.ui.showLoading(false);
            this.ui.showToast(
                this.state.currentLanguage === 'ar' 
                    ? 'حدث خطأ أثناء تحميل التطبيق'
                    : 'Error loading the application',
                'error'
            );
        }
    }

    async initializeComponents() {
        // Initialize FlatPickr date picker
        this.datePicker = flatpickr("#appointment-time", {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            minTime: "12:00",
            maxTime: "20:00",
            minuteIncrement: 30,
            disableMobile: false,
            locale: this.state.currentLanguage === 'ar' ? 'ar' : 'en',
            position: this.state.currentLanguage === 'ar' ? 'auto right' : 'auto left',
            disable: [
                function(date) {
                    // Disable past dates
                    return date < new Date();
                }
            ],
            onChange: (selectedDates) => {
                if (selectedDates[0]) {
                    this.handleDateSelection(selectedDates[0]);
                }
            }
        });

        // Initialize service selection
        this.initializeServiceSelection();
    }

    setupEventListeners() {
        // Service selection
        document.querySelectorAll('.service-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const serviceId = e.currentTarget.dataset.serviceId;
                this.handleServiceSelection(serviceId);
            });
        });

        // Barber selection
        document.querySelectorAll('.barber-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const barberId = e.currentTarget.dataset.barberId;
                this.handleBarberSelection(barberId);
            });
        });

        // Form submission
        document.getElementById('booking-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBookingSubmission();
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.step) {
                this.state.setState({ currentStep: e.state.step });
            }
        });
    }

    async loadInitialData() {
        try {
            // Load categories and services
            const categories = await this.firebase.loadCategories();
            
            // Update state and render UI
            this.state.categories = categories;
            this.ui.renderCategories(categories);
            
            // Initialize service selection
            this.initializeServiceSelection();
        } catch (error) {
            console.error('Error loading initial data:', error);
            throw error;
        }
    }

    initializeServiceSelection() {
        const serviceCards = document.querySelectorAll('.service-card');
        
        serviceCards.forEach(card => {
            const serviceId = card.dataset.serviceId;
            const isSelected = this.state.selectedServices.has(serviceId);
            
            card.classList.toggle('selected', isSelected);
            
            // Reset click event listeners
            card.replaceWith(card.cloneNode(true));
            
            // Add new click event listener
            card.addEventListener('click', (e) => {
                this.handleServiceSelection(serviceId);
            });
        });
    }

    initializeDatePicker() {
        // Update date picker configuration based on current language
        this.datePicker.set('locale', this.state.currentLanguage === 'ar' ? 'ar' : 'en');
        this.datePicker.set('position', this.state.currentLanguage === 'ar' ? 'auto right' : 'auto left');
    }

    initializeLanguage() {
        // Get preferred language from localStorage or browser
        const savedLang = localStorage.getItem('preferred_language');
        const browserLang = navigator.language.startsWith('ar') ? 'ar' : 'en';
        const initialLang = savedLang || browserLang;

        // Set initial language
        this.state.setState({ currentLanguage: initialLang });
        document.documentElement.lang = initialLang;
        document.documentElement.dir = initialLang === 'ar' ? 'rtl' : 'ltr';

        // Update UI
        this.ui.updateLanguage(initialLang);
    }

    // Event Handlers
    handleServiceSelection(serviceId) {
        try {
            const service = this.state.categories
                .find(category => category.services[serviceId])?.[serviceId];

            if (!service) {
                throw new Error('Service not found');
            }

            this.state.toggleService(serviceId, service);
            this.ui.updateServiceSelection();
            this.ui.updateSummary();
        } catch (error) {
            this.ui.showToast(error.message, 'error');
        }
    }

    async handleDateSelection(date) {
        try {
            await this.bookingManager.handleDateTimeSelection(date);
        } catch (error) {
            this.ui.showToast(error.message, 'error');
            this.datePicker.clear();
        }
    }

    handleBarberSelection(barberId) {
        try {
            const barber = this.state.barbers.get(barberId);
            if (!barber) {
                throw new Error('Barber not found');
            }

            this.state.setState({ selectedBarber: barber });
            this.ui.updateBarberSelection();
            this.ui.updateSummary();
        } catch (error) {
            this.ui.showToast(error.message, 'error');
        }
    }

    async handleBookingSubmission() {
        try {
            if (!this.validateBookingData()) {
                return;
            }

            await this.bookingManager.submitBooking();
            
            // Reset form and state
            this.resetBookingForm();
            
            // Show success message
            this.ui.showToast(
                this.state.currentLanguage === 'ar' 
                    ? 'تم تأكيد الحجز بنجاح'
                    : 'Booking confirmed successfully',
                'success'
            );
        } catch (error) {
            this.ui.showToast(error.message, 'error');
        }
    }

    validateBookingData() {
        const validations = [
            {
                condition: this.state.selectedServices.size > 0,
                message: {
                    ar: 'الرجاء اختيار خدمة واحدة على الأقل',
                    en: 'Please select at least one service'
                }
            },
            {
                condition: this.state.selectedDateTime !== null,
                message: {
                    ar: 'الرجاء اختيار موعد',
                    en: 'Please select an appointment time'
                }
            },
            {
                condition: this.state.selectedBarber !== null,
                message: {
                    ar: 'الرجاء اختيار حلاق',
                    en: 'Please select a barber'
                }
            },
            {
                condition: this.state.customerDetails.name.trim().length >= 3,
                message: {
                    ar: 'الرجاء إدخال اسم صحيح',
                    en: 'Please enter a valid name'
                }
            },
            {
                condition: /^05[0-9]{8}$/.test(this.state.customerDetails.phone),
                message: {
                    ar: 'الرجاء إدخال رقم جوال صحيح',
                    en: 'Please enter a valid phone number'
                }
            }
        ];

        for (const validation of validations) {
            if (!validation.condition) {
                this.ui.showToast(
                    validation.message[this.state.currentLanguage],
                    'error'
                );
                return false;
            }
        }

        return true;
    }

    resetBookingForm() {
        this.state.reset();
        this.datePicker.clear();
        document.getElementById('booking-form').reset();
        this.ui.updateUI();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.bookingApp = new BookingApplication();
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registration successful');
        }).catch(err => {
            console.log('ServiceWorker registration failed:', err);
        });
    });
}

// Handle offline/online status
window.addEventListener('online', () => {
    uiManager.showToast(
        state.currentLanguage === 'ar' 
            ? 'تم استعادة الاتصال'
            : 'Connection restored',
        'success'
    );
});

window.addEventListener('offline', () => {
    uiManager.showToast(
        state.currentLanguage === 'ar' 
            ? 'أنت غير متصل بالإنترنت'
            : 'You are offline',
        'error'
    );
});
