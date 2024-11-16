// Firebase Configuration
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
    categoriesServicesGrid: document.querySelector('.categories-services-grid'),
    dateTimePicker: document.querySelector('#appointment-time'),
    barbersGrid: document.querySelector('.barbers-grid'),
    bookingForm: document.querySelector('#booking-form'),
    summaryContainer: document.querySelector('.booking-summary'),
    summaryContent: document.querySelector('.summary-content'),
    toggleSummaryButton: document.querySelector('.toggle-summary'),
    languageOptions: document.querySelectorAll('.language-option')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeState();
    setupEventListeners();
    loadInitialData();
    initializeFlatpickr();
});

// Initialize State
function initializeState() {
    state.currentStep = 1;
    state.currentLanguage = 'ar';
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
    elements.prevButton?.addEventListener('click', handlePrevStep);
    elements.nextButton?.addEventListener('click', handleNextStep);

    // Language switcher
    elements.languageOptions?.forEach(option => {
        option.addEventListener('click', () => switchLanguage(option.dataset.lang));
    });

    // Form inputs
    elements.bookingForm?.addEventListener('input', handleFormInput);

    // Toggle summary
    elements.toggleSummaryButton?.addEventListener('click', toggleSummary);
}

// Load Initial Data
function loadInitialData() {
    db.ref('categories').once('value', snapshot => {
        const categories = snapshot.val();
        if (categories) {
            renderCategoriesAndServices(categories);
        } else {
            showError(state.currentLanguage === 'ar' ? 'لم يتم العثور على فئات' : 'No categories found');
        }
    }, error => {
        console.error('Error loading categories:', error);
        showError(state.currentLanguage === 'ar' ? 'خطأ في تحميل الفئات' : 'Error loading categories');
    });
}

// Initialize Flatpickr
function initializeFlatpickr() {
    flatpickr(elements.dateTimePicker, {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        minTime: "12:00",
        maxTime: "23:45",
        minuteIncrement: 15,
        disable: [
            function(date) {
                return (date.getHours() < 12 || date.getHours() >= 20);
            }
        ],
        locale: state.currentLanguage === 'ar' ? 'ar' : 'en',
        onChange: (selectedDates, dateStr) => {
            state.selectedDateTime = dateStr;
            loadAvailableBarbers(dateStr);
            updateSummary();
        }
    });
}

// Render Categories and Services
function renderCategoriesAndServices(categories) {
    elements.categoriesServicesGrid.innerHTML = '';
    Object.entries(categories).forEach(([categoryId, category]) => {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'category';
        categoryElement.innerHTML = `
            <div class="category-header">${category[state.currentLanguage]}</div>
            <div class="category-services"></div>
        `;
        const servicesContainer = categoryElement.querySelector('.category-services');
        Object.entries(category.services).forEach(([serviceId, service]) => {
            const serviceElement = document.createElement('div');
            serviceElement.className = 'service-card';
            serviceElement.innerHTML = `
                <h3>${service[`name_${state.currentLanguage}`]}</h3>
                <p>${service.duration} - ${service.price} SAR</p>
                <p class="service-description">${service[`description_${state.currentLanguage}`] || ''}</p>
            `;
            serviceElement.addEventListener('click', () => toggleService(categoryId, serviceId, service));
            servicesContainer.appendChild(serviceElement);
        });
        elements.categoriesServicesGrid.appendChild(categoryElement);
    });
}

// Toggle Service Selection
function toggleService(categoryId, serviceId, service) {
    const index = state.selectedServices.findIndex(s => s.id === serviceId);
    if (index === -1) {
        state.selectedServices.push({ id: serviceId, categoryId, ...service });
    } else {
        state.selectedServices.splice(index, 1);
    }
    updateServiceSelection(serviceId);
    updateSummary();
}

// Update Service Selection UI
function updateServiceSelection(serviceId) {
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        const cardServiceId = card.querySelector('h3').textContent;
        if (state.selectedServices.some(s => s[`name_${state.currentLanguage}`] === cardServiceId)) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
}

// Load Available Barbers
function loadAvailableBarbers(dateTime) {
    db.ref('barbers').once('value', snapshot => {
        const barbers = snapshot.val();
        if (barbers) {
            const availableBarbers = Object.entries(barbers)
                .filter(([_, barber]) => isBarberAvailable(barber, dateTime))
                .reduce((acc, [id, barber]) => ({ ...acc, [id]: barber }), {});
            renderBarbers(availableBarbers);
        } else {
            showError(state.currentLanguage === 'ar' ? 'لم يتم العثور على حلاقين' : 'No barbers found');
        }
    }, error => {
        console.error('Error loading barbers:', error);
        showError(state.currentLanguage === 'ar' ? 'خطأ في تحميل الحلاقين' : 'Error loading barbers');
    });
}

// Check if Barber is Available
function isBarberAvailable(barber, dateTime) {
    const appointmentDate = new Date(dateTime);
    const appointmentTime = appointmentDate.getHours() * 60 + appointmentDate.getMinutes();
    const [startHour, startMinute] = barber.working_hours.start.split(':').map(Number);
    const [endHour, endMinute] = barber.working_hours.end.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    return appointmentTime >= startTime && appointmentTime < endTime;
}

// Render Barbers
function renderBarbers(barbers) {
    elements.barbersGrid.innerHTML = '';
    Object.entries(barbers).forEach(([barberId, barber]) => {
        const barberElement = document.createElement('div');
        barberElement.className = 'barber-card';
        barberElement.textContent = barber[`name_${state.currentLanguage}`];
        barberElement.addEventListener('click', () => selectBarber(barberId, barber));
        elements.barbersGrid.appendChild(barberElement);
    });
}

// Select Barber
function selectBarber(barberId, barber) {
    state.selectedBarber = { id: barberId, ...barber };
    updateBarberSelection();
    updateSummary();
}

// Update Barber Selection UI
function updateBarberSelection() {
    const barberCards = document.querySelectorAll('.barber-card');
    barberCards.forEach(card => {
        if (card.textContent === state.selectedBarber[`name_${state.currentLanguage}`]) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
}

// Update Summary
function updateSummary() {
    const { totalDuration, totalPrice } = calculateTotals();
    const summary = `
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
        ${state.selectedDateTime ? `
            <div class="summary-datetime">
                ${state.currentLanguage === 'ar' ? 'الموعد' : 'Appointment'}: 
                ${formatDateTime(state.selectedDateTime)}
            </div>
        ` : ''}
    `;
    
    elements.summaryContent.innerHTML = summary;
}

// Calculate Totals
function calculateTotals() {
    return state.selectedServices.reduce((acc, service) => ({
        totalDuration: acc.totalDuration + parseDuration(service.duration),
        totalPrice: acc.totalPrice + service.price
    }), { totalDuration: 0, totalPrice: 0 });
}

// Parse Duration
function parseDuration(duration) {
    const hours = duration.match(/(\d+)h/);
    const minutes = duration.match(/(\d+)m/);
    return (hours ? parseInt(hours[1]) * 60 : 0) + (minutes ? parseInt(minutes[1]) : 0);
}

// Format Duration
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

// Format Date Time
function formatDateTime(dateTime) {
    const date = new Date(dateTime);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit'
    };
    return date.toLocaleDateString(state.currentLanguage === 'ar' ? 'ar-SA' : 'en-US', options);
}

// Handle Previous Step
function handlePrevStep() {
    if (state.currentStep > 1) {
        state.currentStep--;
        updateStepUI();
    }
}

// Handle Next Step
function handleNextStep() {
    if (canProceedToNextStep()) {
        if (state.currentStep === 4) {
            submitBooking();
        } else {
            state.currentStep++;
            updateStepUI();
        }
    } else {
        showError(state.currentLanguage === 'ar' ? 'يرجى إكمال الخطوة الحالية' : 'Please complete the current step');
    }
}

// Check if Can Proceed to Next Step
function canProceedToNextStep() {
    switch (state.currentStep) {
        case 1:
            return state.selectedServices.length > 0;
        case 2:
            return state.selectedDateTime !== null;
        case 3:
            return state.selectedBarber !== null;
        case 4:
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

// Send to WhatsApp
function sendToWhatsApp(bookingData) {
    const message = formatWhatsAppMessage(bookingData);
    window.open(`https://wa.me/966599791440?text=${encodeURIComponent(message)}`, '_blank');
}

// Format WhatsApp Message
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
${state.currentLanguage === 'ar' ? 'الموعد' : 'Appointment'}: ${formatDateTime(bookingData.dateTime)}
==========`;
}

// Reset Booking
function resetBooking() {
    initializeState();
    elements.bookingForm?.reset();
    updateSummary();
}

// Update Step UI
function updateStepUI() {
    elements.bookingSteps.forEach((step, index) => {
        step.classList.toggle('active', index + 1 === state.currentStep);
    });

    elements.progressSteps.forEach((step, index) => {
        step.classList.toggle('active', index + 1 === state.currentStep);
        step.classList.toggle('completed', index + 1 < state.currentStep);
    });

    elements.prevButton.disabled = state.currentStep === 1;
    elements.nextButton.textContent = state.currentStep === 4 
        ? (state.currentLanguage === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking')
        : (state.currentLanguage === 'ar' ? 'التالي' : 'Next');
}

// Switch Language
function switchLanguage(lang) {
    state.currentLanguage = lang;
    document.body.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.lang = lang;
    updateLanguage();
    updateStepUI();
    updateSummary();
    elements.languageOptions.forEach(opt =>
        opt.classList.toggle('active', opt.dataset.lang === lang)
    );
}

// Update Language
function updateLanguage() {
    document.querySelectorAll('[data-ar][data-en]').forEach(element => {
        element.textContent = element.dataset[state.currentLanguage];
    });
}

// Handle Form Input
function handleFormInput(e) {
    if (e.target.id === 'customer-name' || e.target.id === 'customer-phone') {
        state.customerDetails[e.target.id.replace('customer-', '')] = e.target.value;
    }
}

// Toggle Summary
function toggleSummary() {
    elements.summaryContainer.classList.toggle('hidden');
    elements.toggleSummaryButton.textContent = elements.summaryContainer.classList.contains('hidden')
        ? (state.currentLanguage === 'ar' ? 'عرض الملخص' : 'Show Summary')
        : (state.currentLanguage === 'ar' ? 'إخفاء الملخص' : 'Hide Summary');
}

// Show Error
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Show Success
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.prepend(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
}
