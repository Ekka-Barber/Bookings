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

// Initialize Firebase
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
    console.log('Initializing application...');
    checkRequiredElements();
    initializeState();
    setupEventListeners();
    loadInitialData();
});

// Check Required DOM Elements
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

// Initialize State
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

// Setup Event Listeners
function setupEventListeners() {
    elements.prevButton.addEventListener('click', () => {
        if (state.currentStep > 1) {
            state.currentStep--;
            updateStepUI();
        }
    });

    elements.nextButton.addEventListener('click', () => {
        if (state.currentStep === 5 && canProceedToNextStep()) {
            submitBooking();
        } else if (canProceedToNextStep()) {
            state.currentStep++;
            updateStepUI();
        } else {
            alert(state.currentLanguage === 'ar' ? 'يرجى إكمال الخطوة الحالية' : 'Please complete the current step.');
        }
    });

    elements.languageOptions.forEach(option => {
        option.addEventListener('click', () => {
            const lang = option.dataset.lang;
            state.currentLanguage = lang;
            document.body.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
            document.documentElement.lang = lang;
            updateLanguage();
            updateStepUI();
            updateSummary();
            elements.languageOptions.forEach(opt =>
                opt.classList.toggle('active', opt.dataset.lang === lang)
            );
        });
    });

    elements.bookingForm.addEventListener('input', (e) => {
        state.customerDetails[e.target.id] = e.target.value;
    });
}

// Update Step UI
function updateStepUI() {
    elements.bookingSteps.forEach(step => {
        step.classList.remove('active');
    });

    const currentStepElement = document.querySelector(`#step-${state.currentStep}`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
    }

    elements.progressSteps.forEach((step, index) => {
        step.classList.toggle('active', index + 1 === state.currentStep);
        step.classList.toggle('completed', index + 1 < state.currentStep);
    });

    elements.prevButton.disabled = state.currentStep === 1;
    elements.nextButton.textContent = state.currentStep === 5 ?
        (state.currentLanguage === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking') :
        (state.currentLanguage === 'ar' ? 'التالي' : 'Next');
}

// Load Initial Data
function loadInitialData() {
    console.log('Loading data...');
    showLoading(elements.categoriesGrid);

    db.ref('categories').on('value', snapshot => {
        const categories = snapshot.val();
        if (categories) {
            renderCategories(categories);
        } else {
            console.error('No categories found');
        }
    });

    db.ref('barbers').on('value', snapshot => {
        const barbers = snapshot.val();
        if (barbers) {
            renderBarbers(barbers);
        } else {
            console.error('No barbers found');
        }
    });

    hideLoading(elements.categoriesGrid);
}

// Render Categories
function renderCategories(categories) {
    elements.categoriesGrid.innerHTML = '';
    Object.entries(categories).forEach(([key, category]) => {
        const button = document.createElement('button');
        button.className = 'category-button';
        button.textContent = category[state.currentLanguage];
        button.onclick = () => selectCategory(key, category);
        elements.categoriesGrid.appendChild(button);
    });
}

// Select Category
function selectCategory(categoryId, category) {
    state.selectedCategory = categoryId;

    db.ref(`categories/${categoryId}/services`).on('value', snapshot => {
        const services = snapshot.val();
        if (services) {
            renderServices(services);
        }
    });

    state.currentStep++;
    updateStepUI();
}

// Render Services
function renderServices(services) {
    elements.servicesGrid.innerHTML = '';
    Object.entries(services).forEach(([key, service]) => {
        const serviceCard = document.createElement('div');
        serviceCard.className = 'service-card';
        serviceCard.innerHTML = `
            <h3>${service[`name_${state.currentLanguage}`]}</h3>
            <p>${service.duration} - ${service.price} SAR</p>
            <p class="service-description">${service[`description_${state.currentLanguage}`] || ''}</p>
        `;
        serviceCard.onclick = () => toggleService(key, service);
        elements.servicesGrid.appendChild(serviceCard);
    });
}

// Toggle Service
function toggleService(serviceId, service) {
    const index = state.selectedServices.findIndex(s => s.id === serviceId);
    if (index === -1) {
        state.selectedServices.push({ id: serviceId, ...service });
    } else {
        state.selectedServices.splice(index, 1);
    }
    updateSummary();
}

// Render Barbers
function renderBarbers(barbers) {
    elements.barbersGrid.innerHTML = '';
    Object.entries(barbers).forEach(([key, barber]) => {
        const button = document.createElement('button');
        button.className = 'barber-button';
        button.textContent = barber[`name_${state.currentLanguage}`];
        button.onclick = () => selectBarber(key, barber);
        elements.barbersGrid.appendChild(button);
    });
}

// Select Barber
function selectBarber(barberId, barber) {
    state.selectedBarber = { id: barberId, ...barber };
    updateSummary();
    state.currentStep++;
    updateStepUI();
}

// Update Summary
function updateSummary() {
    const summary = `
        ${state.currentLanguage === 'ar' ? 'الفئة المختارة:' : 'Selected Category:'} ${state.selectedCategory || ''}
        ${state.currentLanguage === 'ar' ? 'الخدمات:' : 'Services:'} ${state.selectedServices.map(s => s.name).join(', ')}
        ${state.currentLanguage === 'ar' ? 'الحلاق:' : 'Barber:'} ${state.selectedBarber?.name || ''}
    `;
    elements.summaryContainer.textContent = summary;
}

// Validate Step Completion
function canProceedToNextStep() {
    switch (state.currentStep) {
        case 1:
            return state.selectedCategory !== null;
        case 2:
            return state.selectedServices.length > 0;
        case 3:
            return state.selectedDateTime !== null;
        case 4:
            return state.selectedBarber !== null;
        case 5:
            return validateCustomerDetails();
        default:
            return false;
    }
}

// Validate Customer Details
function validateCustomerDetails() {
    const { name, phone } = state.customerDetails;
    const phonePattern = /^05[0-9]{8}$/;
    return name.trim().length > 0 && phonePattern.test(phone);
}

// Submit Booking
function submitBooking() {
    const bookingData = {
        ...state.customerDetails,
        services: state.selectedServices,
        barber: state.selectedBarber,
        dateTime: state.selectedDateTime,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    db.ref('bookings').push(bookingData)
        .then(() => {
            alert(state.currentLanguage === 'ar' ? 'تم تأكيد الحجز!' : 'Booking confirmed!');
            resetBooking();
        })
        .catch(error => {
            console.error('Error submitting booking:', error);
            alert(state.currentLanguage === 'ar' ? 'حدث خطأ أثناء تأكيد الحجز.' : 'An error occurred while confirming the booking.');
        });
}

// Reset Booking
function resetBooking() {
    state.currentStep = 1;
    state.selectedCategory = null;
    state.selectedServices = [];
    state.selectedDateTime = null;
    state.selectedBarber = null;
    state.customerDetails = { name: '', phone: '' };
    updateStepUI();
}
