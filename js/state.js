// state.js
class BookingState {
    constructor() {
        // Core state
        this.currentStep = 1;
        this.maxSteps = 4;
        this.language = this.getInitialLanguage();
        this.loading = false;
        this.error = null;

        // Selection state
        this.selectedServices = new Map();
        this.selectedDate = null;
        this.selectedTime = null;
        this.selectedDateTime = null;
        this.selectedBarber = null;
        this.customerDetails = {
            name: '',
            phone: ''
        };

        // Cache and data state
        this.categories = new Map();
        this.barbers = new Map();
        this.availableTimeSlots = [];
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
        this.initialize();
    }

    // Initialization
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

    // State Management Methods
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

    // Service Selection Methods
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

    // Date/Time Selection Methods
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

    // Barber Selection Methods
    setSelectedBarber(barberId) {
        const barber = this.barbers.get(barberId);
        if (!barber) {
            throw new Error('Invalid barber selection');
        }
        this.setState({ selectedBarber: { id: barberId, ...barber } });
    }

    // Navigation Methods
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

    // Validation Methods
    validateCustomerDetails() {
        const { name, phone } = this.customerDetails;
        const phoneRegex = /^05[0-9]{8}$/;
        
        return name.length >= 3 && phoneRegex.test(phone);
    }

    validateDateTime(dateTime) {
        const selected = new Date(dateTime);
        const now = new Date();

        // Basic validation
        if (selected <= now) return false;

        // Working hours validation
        const hours = selected.getHours();
        const minutes = selected.getMinutes();
        const [startHour, startMin] = CONFIG.business.workingHours.start.split(':').map(Number);
        const [endHour, endMin] = CONFIG.business.workingHours.end.split(':').map(Number);

        const timeInMinutes = hours * 60 + minutes;
        const startInMinutes = startHour * 60 + startMin;
        const endInMinutes = endHour * 60 + endMin;

        return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
    }

    // Observer Pattern Implementation
    subscribe(observer) {
        this.observers.add(observer);
        return () => this.observers.delete(observer);
    }

    notifyObservers() {
        this.observers.forEach(observer => observer(this));
    }

    // State Persistence
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
            
            // Restore Map objects
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

    // Cleanup and Reset
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

    // Preload Data Methods
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

export const state = new BookingState();