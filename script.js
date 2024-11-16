// Firebase Configuration and Initialization
const firebaseConfig = {
    apiKey: "AIzaSyA0Syrv4XH88PTzQUaSg6vQaZlZMJ_85n8",
    authDomain: "ekka-barbershop.firebaseapp.com",
    databaseURL: "https://ekka-barbershop-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "ekka-barbershop",
    storageBucket: "ekka-barbershop.firebasestorage.app",
    messagingSenderId: "726879506857",
    appId: "1:726879506857:web:497e0576037a3bcf8d74b8",
    measurementId: "G-56KKZKQ6TK"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Global State
const state = {
    currentStep: 1,
    currentLanguage: 'ar',
    selectedCategory: null,
    selectedServices: [],
    selectedDateTime: null,
    selectedBarber: null,
    customerDetails: {
        name: '',
        phone: ''
    }
};

// DOM Elements
const elements = {
    progressSteps: document.querySelectorAll('.progress-step'),
    bookingSteps: document.querySelectorAll('.booking-step'),
    prevButton: document.querySelector('.prev-btn'),
    nextButton: document.querySelector('.next-btn'),
    categoriesGrid: document.querySelector('.categories-grid'),
    servicesGrid: document.querySelector('.services-grid'),
    barbersGrid: document.querySelector('.barbers-grid'),
    dateTimePicker: document.querySelector('#appointment-time'),
    bookingForm: document.querySelector('#booking-form'),
    summaryContainer: document.querySelector('.booking-summary'),
    languageOptions: document.querySelectorAll('.language-option')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    checkRequiredElements();
    initializeFirebase();
    initializeState();
    setupEventListeners();
    loadInitialData();
});

function checkRequiredElements() {
    const requiredElements = {
        progressSteps: '.progress-step',
        bookingSteps: '.booking-step',
        prevButton: '.prev-btn',
        nextButton: '.next-btn',
        categoriesGrid: '.categories-grid',
        servicesGrid: '.services-grid',
        barbersGrid: '.barbers-grid',
        dateTimePicker: '#appointment-time',
        bookingForm: '#booking-form',
        summaryContainer: '.booking-summary'
    };

    for (const [key, selector] of Object.entries(requiredElements)) {
        const element = document.querySelector(selector);
        if (!element) {
            console.error(`Missing required element: ${key} (${selector})`);
            throw new Error(`Required element not found: ${selector}`);
        }
    }
}

function initializeState() {
    state.currentStep = 1;
    state.currentLanguage = 'ar';
    state.selectedCategory = null;
    state.selectedServices = [];
    state.selectedDateTime = null;
    state.selectedBarber = null;
    state.customerDetails = { name: '', phone: '' };
    updateStepUI();
    updateLanguage();
}

function setupEventListeners() {
    elements.prevButton.addEventListener('click', () => {
        prevStep();
        updateStepUI();
    });

    elements.nextButton.addEventListener('click', () => {
        if (state.currentStep === 5 && canProceedToNextStep()) {
            submitBooking();
        } else {
            nextStep();
            updateStepUI();
        }
    });

    document.querySelectorAll('.language-option').forEach(option => {
        option.addEventListener('click', () => {
            const lang = option.dataset.lang;
            state.currentLanguage = lang;
            document.body.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
            document.documentElement.lang = lang;
            updateLanguage();
            updateStepUI();
            updateSummary();
            document.querySelectorAll('.language-option').forEach(opt =>
                opt.classList.toggle('active', opt.dataset.lang === lang)
            );
        });
    });
}

function updateStepUI() {
    document.querySelectorAll('.booking-step').forEach(step => {
        step.classList.remove('active');
    });

    const currentStepElement = document.querySelector(`#step-${state.currentStep}`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
    }

    document.querySelectorAll('.progress-step').forEach((step, index) => {
        step.classList.toggle('active', index + 1 === state.currentStep);
        step.classList.toggle('completed', index + 1 < state.currentStep);
    });

    elements.prevButton.disabled = state.currentStep === 1;
    elements.nextButton.textContent = state.currentStep === 5 ?
        (state.currentLanguage === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking') :
        (state.currentLanguage === 'ar' ? 'التالي' : 'Next');
}

function loadInitialData() {
    showLoading(elements.categoriesGrid);

    db.ref('categories').once('value')
        .then(snapshot => {
            const categories = snapshot.val();
            if (categories) {
                renderCategories(categories);
            } else {
                console.error('No categories found');
            }
        })
        .catch(error => {
            console.error('Error loading categories:', error);
        })
        .finally(() => {
            hideLoading(elements.categoriesGrid);
        });
}

function handleError(error, customMessage = '') {
    console.error(customMessage, error);
    const message = state.currentLanguage === 'ar' ?
        'حدث خطأ، يرجى المحاولة مرة أخرى' :
        'An error occurred, please try again';
    alert(message);
}
