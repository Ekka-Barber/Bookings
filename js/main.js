// main.js
import { config, firebaseService } from './firebase-service';
import { state } from './state';
import { uiManager } from './ui-manager';
import { bookingManager } from './booking-manager';

class BookingApplication {
    constructor() {
        this.config = config;
        this.firebase = firebaseService;
        this.state = state;
        this.ui = uiManager;
        this.bookingManager = bookingManager;
        
        // Error boundaries for global error handling
        this.setupErrorBoundaries();
        
        // Performance monitoring
        this.setupPerformanceMonitoring();
    }

    async initialize() {
        try {
            console.log('Initializing Booking Application...');
            
            // Show initial loading state
            this.ui.showLoading(true);

            // Initialize Firebase
            await this.firebase.initializeFirebase();
            console.log('Firebase initialized successfully');

            // Load initial data
            await Promise.all([
                this.loadInitialData(),
                this.setupLocalizations(),
                this.initializeUI()
            ]);

            // Setup service worker for offline support
            this.setupServiceWorker();
            
            // Setup analytics
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
            // Load categories and services
            const categories = await this.firebase.getCategories();
            this.state.setState({ categories: new Map(Object.entries(categories)) });

            // Load barbers
            const barbers = await this.firebase.getBarbers();
            this.state.setState({ barbers: new Map(Object.entries(barbers)) });

            // Load any persisted state
            this.state.loadPersistedState();

        } catch (error) {
            console.error('Error loading initial data:', error);
            throw error;
        }
    }

    setupLocalizations() {
        // Setup language detection and RTL support
        const language = this.state.getInitialLanguage();
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';

        // Load language-specific date formats and translations
        this.setupDateLocalization(language);
    }

    setupDateLocalization(language) {
        // Configure date formatting based on locale
        const dateConfig = {
            ar: {
                format: 'DD/MM/YYYY',
                firstDayOfWeek: 6, // Saturday
                months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
                weekdays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
            },
            en: {
                format: 'MM/DD/YYYY',
                firstDayOfWeek: 0, // Sunday
                months: ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'],
                weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            }
        };

        // Apply date configuration to flatpickr and other date-handling components
        if (this.bookingManager.flatpickr) {
            this.bookingManager.flatpickr.set('locale', dateConfig[language]);
        }
    }

    async initializeUI() {
        // Initialize base UI components
        this.ui.initializeElements();
        
        // Setup responsive behaviors
        this.setupResponsiveUI();
        
        // Initialize booking steps
        await this.initializeBookingSteps();
        
        // Setup keyboard navigation
        this.setupKeyboardNavigation();
        
        // Initialize summary box
        this.initializeSummaryBox();
    }

    setupResponsiveUI() {
        // Create and observe responsive breakpoints
        const breakpoints = {
            mobile: window.matchMedia('(max-width: 767px)'),
            tablet: window.matchMedia('(min-width: 768px) and (max-width: 1023px)'),
            desktop: window.matchMedia('(min-width: 1024px)')
        };

        // Handle responsive layout changes
        Object.entries(breakpoints).forEach(([device, query]) => {
            query.addListener((e) => this.handleResponsiveChange(device, e.matches));
            this.handleResponsiveChange(device, query.matches);
        });
    }

    async initializeBookingSteps() {
        // Initialize each booking step
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
        // Setup keyboard shortcuts and focus management
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }
        });

        // Setup focus trap for modals
        this.setupFocusTraps();
    }

    initializeSummaryBox() {
        // Initialize floating summary box
        const summaryBox = this.ui.elements.summary.container;
        if (summaryBox) {
            this.setupSummaryBoxPosition();
            this.setupSummaryBoxResizing();
        }
    }

    setupErrorBoundaries() {
        // Global error handler
        window.onerror = (message, source, lineno, colno, error) => {
            this.handleGlobalError(error);
            return false;
        };

        // Promise rejection handler
        window.onunhandledrejection = (event) => {
            this.handleGlobalError(event.reason);
        };
    }

    setupPerformanceMonitoring() {
        if ('PerformanceObserver' in window) {
            // Monitor loading performance
            this.observeLoadingMetrics();
            
            // Monitor interaction metrics
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
        // Setup event tracking
        this.trackUserInteractions();
        this.trackBookingProgress();
        this.trackErrors();
    }

    // Event Handlers
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
            this.state.language === 'ar'
                ? 'فشل تهيئة النظام. يرجى تحديث الصفحة'
                : 'System initialization failed. Please refresh the page',
            'error'
        );
    }

    // Cleanup
    cleanup() {
        // Cleanup all managers
        this.firebase.cleanup();
        this.bookingManager.cleanup();
        this.ui.cleanup();
        
        // Remove event listeners
        this.removeEventListeners();
        
        // Clear intervals and timeouts
        this.clearTimers();
        
        // Reset state
        this.state.reset();
    }

    // Helper Methods
    trackUserInteractions() {
        // Track navigation between steps
        this.state.subscribe(() => {
            if (this.state.currentStep) {
                this.logAnalyticsEvent('step_view', {
                    step: this.state.currentStep
                });
            }
        });

        // Track service selections
        document.querySelectorAll('.service-card').forEach(card => {
            card.addEventListener('click', () => {
                this.logAnalyticsEvent('service_select', {
                    serviceId: card.dataset.serviceId
                });
            });
        });
    }

    logAnalyticsEvent(eventName, params = {}) {
        // Implementation depends on analytics service being used
        console.log('Analytics Event:', eventName, params);
    }
}

// Initialize the application
const app = new BookingApplication();

document.addEventListener('DOMContentLoaded', () => {
    app.initialize().catch(error => {
        console.error('Failed to initialize application:', error);
    });
});

// Handle cleanup on page unload
window.addEventListener('unload', () => {
    app.cleanup();
});

export default BookingApplication;