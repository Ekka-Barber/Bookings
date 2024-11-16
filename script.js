// Firebase Configuration
const firebaseConfig = {
    // Your Firebase configuration here
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

// Debug Helper Functions
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.prepend(errorDiv);
    console.error(message);
    setTimeout(() => errorDiv.remove(), 5000); // Remove after 5 seconds
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.prepend(successDiv);
    setTimeout(() => successDiv.remove(), 3000); // Remove after 3 seconds
}

function logDatabaseContent() {
    console.log('Checking database content...');
    db.ref('/').once('value')
        .then(snapshot => {
            console.log('Current database content:', snapshot.val());
        })
        .catch(error => {
            console.error('Error reading database:', error);
            showError('Failed to read database content');
        });
}

function testDataPaths() {
    console.log('Testing database paths...');
    const paths = [
        'categories',
        'barbers',
        'categories/Packages',
        'categories/HairServices'
    ];

    paths.forEach(path => {
        db.ref(path).once('value')
            .then(snapshot => {
                console.log(`Path ${path}:`, snapshot.val() ? 'exists' : 'not found');
            })
            .catch(error => {
                console.error(`Error testing path ${path}:`, error);
            });
    });
}

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

// Test connection immediately
console.log('Testing Firebase connection...');
db.ref('.info/connected').on('value', (snap) => {
    if (snap.val() === true) {
        console.log('✅ Connected to Firebase');
        logDatabaseContent();
        testDataPaths();
    } else {
        console.log('❌ Not connected to Firebase');
        showError('Not connected to database');
    }
});

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Loaded, initializing application...');
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
    // Navigation buttons
    elements.prevButton?.addEventListener('click', () => {
        console.log('Previous button clicked');
        if (state.currentStep > 1) {
            state.currentStep--;
            updateStepUI();
        }
    });

    elements.nextButton?.addEventListener('click', () => {
        console.log('Next button clicked');
        if (state.currentStep === 5 && canProceedToNextStep()) {
            submitBooking();
        } else if (canProceedToNextStep()) {
            state.currentStep++;
            updateStepUI();
        } else {
            showError(state.currentLanguage === 'ar' ? 'يرجى إكمال الخطوة الحالية' : 'Please complete the current step');
        }
    });

    // Language switcher
    elements.languageOptions?.forEach(option => {
        option.addEventListener('click', () => {
            const lang = option.dataset.lang;
            state.currentLanguage = lang;
            document.body.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
            document.documentElement.lang = lang;
            
            // Update UI
            updateLanguage();
            updateStepUI();
            updateSummary();
            
            // Update active language class
            elements.languageOptions.forEach(opt =>
                opt.classList.toggle('active', opt.dataset.lang === lang)
            );
        });
    });

    // Form inputs
    elements.bookingForm?.addEventListener('input', (e) => {
        if (e.target.id === 'customer-name' || e.target.id === 'customer-phone') {
            state.customerDetails[e.target.id.replace('customer-', '')] = e.target.value;
            console.log('Updated customer details:', state.customerDetails);
        }
    });
}

// Load Initial Data
function loadInitialData() {
    console.log('Loading initial data...');
    showLoading(elements.categoriesGrid);

    // Load categories
    db.ref('categories').on('value', snapshot => {
        const categories = snapshot.val();
        console.log('Categories loaded:', categories);
        
        if (categories) {
            renderCategories(categories);
        } else {
            console.error('No categories found');
            showError(state.currentLanguage === 'ar' ? 'لم يتم العثور على فئات' : 'No categories found');
        }
        hideLoading(elements.categoriesGrid);
    }, error => {
        console.error('Error loading categories:', error);
        showError(state.currentLanguage === 'ar' ? 'خطأ في تحميل الفئات' : 'Error loading categories');
        hideLoading(elements.categoriesGrid);
    });

    // Load barbers
    db.ref('barbers').on('value', snapshot => {
        const barbers = snapshot.val();
        console.log('Barbers loaded:', barbers);
        
        if (barbers) {
            const activeBarbers = Object.entries(barbers)
                .filter(([_, barber]) => barber.active)
                .reduce((acc, [id, barber]) => ({ ...acc, [id]: barber }), {});
            renderBarbers(activeBarbers);
        } else {
            console.error('No barbers found');
            showError(state.currentLanguage === 'ar' ? 'لم يتم العثور على حلاقين' : 'No barbers found');
        }
    }, error => {
        console.error('Error loading barbers:', error);
        showError(state.currentLanguage === 'ar' ? 'خطأ في تحميل الحلاقين' : 'Error loading barbers');
    });
}

// Update UI Based on Current Step
function updateStepUI() {
    console.log('Updating UI for step:', state.currentStep);
    
    // Update booking steps
    elements.bookingSteps.forEach((step, index) => {
        step.classList.toggle('active', index + 1 === state.currentStep);
    });

    // Update progress steps
    elements.progressSteps.forEach((step, index) => {
        step.classList.toggle('active', index + 1 === state.currentStep);
        step.classList.toggle('completed', index + 1 < state.currentStep);
    });

    // Update navigation buttons
    if (elements.prevButton) {
        elements.prevButton.disabled = state.currentStep === 1;
    }
    if (elements.nextButton) {
        elements.nextButton.textContent = state.currentStep === 5 
            ? (state.currentLanguage === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking')
            : (state.currentLanguage === 'ar' ? 'التالي' : 'Next');
    }
}

// Update Language
function updateLanguage() {
    console.log('Updating language to:', state.currentLanguage);
    
    // Update step titles
    document.querySelectorAll('[data-ar][data-en]').forEach(element => {
        element.textContent = element.dataset[state.currentLanguage];
    });

    // Update current view
    updateStepContent();
    updateSummary();
}

// Loading State UI
function showLoading(element) {
    if (element) {
        element.classList.add('loading');
    }
}

function hideLoading(element) {
    if (element) {
        element.classList.remove('loading');
    }
}

// Render Functions
function renderCategories(categories) {
    console.log('Rendering categories:', categories);
    if (!elements.categoriesGrid) return;

    elements.categoriesGrid.innerHTML = '';
    Object.entries(categories).forEach(([key, category]) => {
        const button = document.createElement('button');
        button.className = 'category-button';
        button.textContent = category[state.currentLanguage];
        button.onclick = () => {
            console.log('Category selected:', key);
            selectCategory(key, category);
        };
        elements.categoriesGrid.appendChild(button);
    });
}

function renderServices(services) {
    console.log('Rendering services:', services);
    if (!elements.servicesGrid) return;

    elements.servicesGrid.innerHTML = '';
    Object.entries(services).forEach(([key, service]) => {
        const serviceCard = document.createElement('div');
        serviceCard.className = 'service-card';
        serviceCard.innerHTML = `
            <h3>${service[`name_${state.currentLanguage}`]}</h3>
            <p>${service.duration} - ${service.price} SAR</p>
            <p class="service-description">
                ${service[`description_${state.currentLanguage}`] || ''}
            </p>
        `;
        serviceCard.onclick = () => toggleService(key, service);
        
        // Add selected class if service is already selected
        if (state.selectedServices.some(s => s.id === key)) {
            serviceCard.classList.add('selected');
        }
        
        elements.servicesGrid.appendChild(serviceCard);
    });
}

function renderBarbers(barbers) {
    console.log('Rendering barbers:', barbers);
    if (!elements.barbersGrid) return;

    elements.barbersGrid.innerHTML = '';
    Object.entries(barbers)
        .filter(([_, barber]) => barber.active)
        .forEach(([key, barber]) => {
            const button = document.createElement('button');
            button.className = 'barber-button';
            button.textContent = barber[`name_${state.currentLanguage}`];
            button.onclick = () => selectBarber(key, barber);
            
            if (state.selectedBarber?.id === key) {
                button.classList.add('selected');
            }
            
            elements.barbersGrid.appendChild(button);
        });
}

// Selection Handlers
function selectCategory(categoryId, category) {
    state.selectedCategory = { id: categoryId, ...category };
    
    // Load services for this category
    db.ref(`categories/${categoryId}/services`).once('value')
        .then(snapshot => {
            const services = snapshot.val();
            if (services) {
                renderServices(services);
                state.currentStep++;
                updateStepUI();
            } else {
                showError(state.currentLanguage === 'ar' ? 
                    'لا توجد خدمات في هذه الفئة' : 
                    'No services in this category');
            }
        })
        .catch(error => {
            console.error('Error loading services:', error);
            showError(state.currentLanguage === 'ar' ? 
                'خطأ في تحميل الخدمات' : 
                'Error loading services');
        });
}

function toggleService(serviceId, service) {
    const index = state.selectedServices.findIndex(s => s.id === serviceId);
    if (index === -1) {
        state.selectedServices.push({ id: serviceId, ...service });
    } else {
        state.selectedServices.splice(index, 1);
    }
    
    // Update UI
    updateServiceSelection(serviceId);
    updateSummary();
}

function updateServiceSelection(serviceId) {
    const serviceCards = elements.servicesGrid.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        const serviceName = card.querySelector('h3').textContent;
        const service = state.selectedServices.find(s => s[`name_${state.currentLanguage}`] === serviceName);
        if (service && service.id === serviceId) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
}

function selectBarber(barberId, barber) {
    state.selectedBarber = { id: barberId, ...barber };
    updateSummary();
    state.currentStep++;
    updateStepUI();
}

// Update Summary
function updateSummary() {
    if (!elements.summaryContainer) return;

    const { totalDuration, totalPrice } = calculateTotals();
    const summary = `
        <h3>${state.currentLanguage === 'ar' ? 'ملخص الحجز' : 'Booking Summary'}</h3>
        <div class="summary-services">
            ${state.selectedServices.map(service => `
                <div class="summary-service-item">
                    <span>${service[`name_${state.currentLanguage}`]}</span>
                    <span>${service.price} SAR</span>
                </div>
            `).join('')}
        </div>
        <div class="summary-total">
            <div>${state.currentLanguage === 'ar' ? 'المدة الإجمالية' : 'Total Duration'}: ${formatDuration(totalDuration)}</div>
            <div>${state.currentLanguage === 'ar' ? 'السعر الإجمالي' : 'Total Price'}: ${totalPrice} SAR</div>
        </div>
        ${state.selectedBarber ? `
            <div class="summary-barber">
                ${state.currentLanguage === 'ar' ? 'الحلاق' : 'Barber'}: 
                ${state.selectedBarber[`name_${state.currentLanguage}`]}
            </div>
        ` : ''}
    `;
    
    elements.summaryContainer.innerHTML = summary;
}

// Validation and Submission
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

function validateCustomerDetails() {
    const { name, phone } = state.customerDetails;
    const phonePattern = /^05[0-9]{8}$/;
    return name.trim().length > 0 && phonePattern.test(phone);
}

function submitBooking() {
    if (!validateCustomerDetails()) {
        showError(state.currentLanguage === 'ar' ? 
            'يرجى إدخال جميع البيانات المطلوبة' : 
            'Please enter all required information');
        return;
    }

    const bookingData = {
        customerName: state.customerDetails.name,
        customerPhone: state.customerDetails.phone,
        services: state.selectedServices.map(service => ({
            id: service.id,
            name: service[`name_${state.currentLanguage}`],
            price: service.price,
            duration: service.duration
        })),
        barberId: state.selectedBarber.id,
        barberName: state.selectedBarber[`name_${state.currentLanguage}`],
        dateTime: state.selectedDateTime,
        totalPrice: calculateTotals().totalPrice,
        totalDuration: calculateTotals().totalDuration,
        status: 'pending',
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    db.ref('bookings').push(bookingData)
        .then(() => {
            showSuccess(state.currentLanguage === 'ar' ? 
                'تم تأكيد الحجز بنجاح' : 
                'Booking confirmed successfully');
            sendToWhatsApp(bookingData);
            resetBooking();
        })
        .catch(error => {
            console.error('Error submitting booking:', error);
            showError(state.currentLanguage === 'ar' ? 
                'حدث خطأ أثناء تأكيد الحجز' : 
                'Error confirming booking');
        });
}

// Utility Functions
function calculateTotals() {
    return state.selectedServices.reduce((acc, service) => ({
        totalDuration: acc.totalDuration + parseDuration(service.duration),
        totalPrice: acc.totalPrice + service.price
    }), { totalDuration: 0, totalPrice: 0 });
}

function parseDuration(duration) {
    const hours = duration.match(/(\d+)h/);
    const minutes = duration.match(/(\d+)m/);
    return (hours ? parseInt(hours[1]) * 60 : 0) + (minutes ? parseInt(minutes[1]) : 0);
}

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (state.currentLanguage === 'ar') {
        return hours > 0 ? 
            `${hours} ساعة ${mins > 0 ? `و ${mins} دقيقة` : ''}` : 
            `${mins} دقيقة`;
    }
    
    return hours > 0 ? 
        `${hours}h${mins > 0 ? ` ${mins}m` : ''}` : 
        `${mins}m`;
}

function sendToWhatsApp(bookingData) {
    const message = formatWhatsAppMessage(bookingData);
    window.open(`https://wa.me/966599791440?text=${encodeURIComponent(message)}`, '_blank');
}

function formatWhatsAppMessage(bookingData) {
    const servicesText = bookingData.services
        .map(s => `- ${s.name}: ${s.price} SAR`)
        .join('\n');

    return `
==========
${state.currentLanguage === 'ar' ? 'حجز جديد' : 'New Booking'}
==========
${state.currentLanguage === 'ar' ? 'الاسم' : 'Name'}: ${bookingData.customerName}
${state.currentLanguage === 'ar' ? 'رقم الجوال' : 'Phone'}: ${bookingData.customerPhone}
${state.currentLanguage === 'ar' ? 'الخدمات' : 'Services'}:
${servicesText}
${state.currentLanguage === 'ar' ? 'المدة' : 'Duration'}: ${formatDuration(bookingData.totalDuration)}
${state.currentLanguage === 'ar' ? 'السعر' : 'Price'}: ${bookingData.totalPrice} SAR
${state.currentLanguage === 'ar' ? 'الحلاق' : 'Barber'}: ${bookingData.barberName}
==========`;
}

function resetBooking() {
    initializeState();
    elements.bookingForm?.reset();
    updateSummary();
}

// Update Step Content (Assuming this function exists to update the content based on the current step)
function updateStepContent() {
    // Implementation of updating the content for the current step
}
