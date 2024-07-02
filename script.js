const categories = {
    "Packages": {
        en: "Packages",
        ar: "باكجات",
        services: [
            { name_en: "Haircut & Beard Trim", name_ar: "حلاقة الشعر والدقن", duration: "40m", price: 50 },
            { name_en: "EKKA Package", name_ar: "باقة إكّــه", duration: "1h", price: 150 },
            { name_en: "EKKA Extra Package", name_ar: "باقة إكّــه اكسترا", duration: "1h 30m", price: 250 },
            { name_en: "Hair Care", name_ar: "باقة العناية بالشعر", duration: "50m", price: 105 },
            { name_en: "Hair Care + Scalp Deep Cleansing", name_ar: "باقة العناية بالشعر + تنظيف فروة الرأس", duration: "1h 15m", price: 175 }
        ]
    },
    "HairServices": {
        en: "Hair Services",
        ar: "خدمات الشعر",
        services: [
            { name_en: "Hair Cut - Styling & Fading", name_ar: "حلاقة الشعر - مقص وتدريج", duration: "30m", price: 30 },
            { name_en: "Hair Cut - Long Hair", name_ar: "حلاقة الشعر - شعر طويل", duration: "45m", price: 40 },
            { name_en: "Hair Dye - Becon Dye", name_ar: "صبغة شعر - صبغة بيقون", duration: "15m", price: 40 },
            { name_en: "Hair Dye - Keune Dutch Dye", name_ar: "صبغة شعر - صبغة كيون الهولندية", duration: "15m", price: 60 },
            { name_en: "Hair Wash", name_ar: "غسيل الشعر", duration: "5m", price: 10 },
            { name_en: "Hair Styling", name_ar: "استشوار وتصفيف الشعر", duration: "5m", price: 15 },
            { name_en: "Hair Oil Bath", name_ar: "حمام زيت الشعر", duration: "10m", price: 50 },
            { name_en: "Hair Coloring (Highlights)", name_ar: "صبغة ميش", duration: "1h", price: 350 },
            { name_en: "Hair Keratin - Short Hair", name_ar: "حمام كيراتين لعلاج للشعر - شعر قصير", duration: "30m", price: 100 },
            { name_en: "Hair Keratin - Long Hair", name_ar: "حمام كيراتين لعلاج للشعر - شعر طويل", duration: "30m", price: 120 },
            { name_en: "Hair Protein - Short Hair", name_ar: "بروتين للشعر - شعر قصير", duration: "2h", price: 300 },
            { name_en: "Hair Protein - Long Hair", name_ar: "بروتين للشعر - شعر طويل", duration: "2h 30m", price: 350 },
            { name_en: "Scalp Deep Cleansing", name_ar: "تنظيف فروة الرأس العميق", duration: "25m", price: 70 },
            { name_en: "Hair Dye (No Supplies Needed)", name_ar: "تطبيق صبغة الشعر", duration: "25m", price: 25 },
            { name_en: "Haircut (Girls) - Short Hair", name_ar: "قص شعر - بنات أطفال - شعر قصير", duration: "40m", price: 50 },
            { name_en: "Haircut (Girls) - Long Hair", name_ar: "قص شعر - بنات أطفال - شعر طويل", duration: "50m", price: 80 },
            { name_en: "Hair Dryer (Girls)", name_ar: "استشوار وتصفيف الشعر - بنات اطفال", duration: "35m", price: 50 }
        ]
    },
    "BeardServices": {
        en: "Beard Services",
        ar: "خدمات اللحية",
        services: [
            { name_en: "Beard Shaving Or Trimming", name_ar: "حلاقة الدقن", duration: "25m", price: 25 },
            { name_en: "Beard Dye - Stubble", name_ar: "صبغة الدقن - السكسوكة", duration: "15m", price: 25 },
            { name_en: "Beard Dye - Full Beard", name_ar: "صبغة الدقن - اللحية كاملة", duration: "30m", price: 30 },
            { name_en: "Moustache Dye", name_ar: "صبغة الشنب", duration: "10m", price: 10 },
            { name_en: "Hair Dye (No Supplies Needed)", name_ar: "تطبيق صبغة الدقن", duration: "15m", price: 15 }
        ]
    },
    "FacialCare": {
        en: "Facial Care Services",
        ar: "خدمات البشرة",
        services: [
            { name_en: "Classic Quick Face Cleaning", name_ar: "صنفرة وجه سريعة كلاسيك", duration: "5m", price: 15 },
            { name_en: "Premium Quick Face Cleaning", name_ar: "صنفرة وجه سريعة بريميوم", duration: "15m", price: 25 },
            { name_en: "Deep Skin Cleansing", name_ar: "تنظيف عميق للبشرة بالبخار", duration: "25m", price: 50 },
            { name_en: "Face Mask", name_ar: "ماسك للوجه", duration: "10m", price: 15 },
            { name_en: "Nose Cleaning Strips", name_ar: "لزقة الأنف", duration: "5m", price: 5 },
            { name_en: "Face Wax - Nose", name_ar: "شمع لإزالة شعر الوجه - الأنف", duration: "5m", price: 10 },
            { name_en: "Face Wax - Ears", name_ar: "شمع لإزالة شعر الوجه - الأذنين", duration: "10m", price: 15 },
            { name_en: "Face Wax - Full Waxing", name_ar: "شمع لإزالة شعر الوجه - شمع كامل", duration: "15m", price: 30 }
        ]
    }
};

const employeeWorkingHours = {
    "Abdulkareem": ["08:00", "18:00"],
    "Hadi": ["10:00", "20:00"],
    "Khalid": ["09:00", "17:00"],
    "Tariq": ["12:00", "22:00"],
    "Mahmoud": ["08:00", "16:00"]
};

const barbers = {
    "Abdulkareem": { en: "Abdulkareem", ar: "عبدالكريم" },
    "Hadi": { en: "Hadi", ar: "هادي" },
    "Khalid": { en: "Khalid", ar: "خالد" },
    "Tariq": { en: "Tariq", ar: "طارق" },
    "Mahmoud": { en: "Mahmoud", ar: "محمود" }
};

const selectedServices = new Set();
let currentLanguage = 'ar';
let totalDuration = 0;
let totalPrice = 0;
let selectedBarber = ''; // Added to store the selected barber

document.addEventListener('DOMContentLoaded', () => {
    const languageToggle = document.getElementById('languageToggle');
    const categoriesContainer = document.getElementById('categories');
    const barberContainer = document.getElementById('barbers');
    const form = document.getElementById('bookingForm');
    const datetimeInput = document.getElementById('datetime');

    languageToggle.addEventListener('change', toggleLanguage);
    initializeCategories(categoriesContainer);
    initializeBarbers(barberContainer);
    form.addEventListener('submit', handleFormSubmit);
    updateSummary();
    updateProgress(0);

    // Initialize Flatpickr
    flatpickr(datetimeInput, {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        locale: 'ar',  // Set the initial locale to Arabic
        onChange: function(selectedDates, dateStr, instance) {
            // Handle date/time selection
            updateProgress(4);
        }
    });
});

function toggleLanguage() {
    currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
    document.documentElement.lang = currentLanguage; // Dynamically change lang attribute
    updateLanguage();
    // Re-initialize categories when language changes
    const categoriesContainer = document.getElementById('categories');
    categoriesContainer.innerHTML = '';
    initializeCategories(categoriesContainer);

    // Re-initialize barbers when language changes
    const barberContainer = document.getElementById('barbers');
    barberContainer.innerHTML = '';
    initializeBarbers(barberContainer);

    // Update Flatpickr locale on language toggle
    flatpickr("#datetime", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        locale: currentLanguage === 'ar' ? 'ar' : 'en'
    });
}

function initializeDateTimePicker(barber) {
    const workingHours = employeeWorkingHours[barber];
    flatpickr("#datetime", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        minTime: workingHours[0],
        maxTime: workingHours[1],
        locale: currentLanguage === 'ar' ? 'ar' : 'en',
        onChange: function(selectedDates, dateStr, instance) {
            updateProgress(4);
        }
    });
}

function updateLanguage() {
    const elements = {
        'main-title': { ar: 'احجز موعدك', en: 'Book Your Appointment' },
        'category-label': { ar: 'اختر الفئة:', en: 'Choose Category:' },
        'service-label': { ar: 'اختر الخدمة:', en: 'Choose Service:' },
        'summary-label': { ar: 'ملخص الحجز:', en: 'Booking Summary:' },
        'selected-services': { ar: 'الخدمات المختارة:', en: 'Selected Services:' },
        'total-duration': { ar: 'المدة الإجمالية:', en: 'Total Duration:' },
        'total-price': { ar: 'السعر الإجمالي:', en: 'Total Price:' },
        'barber-label': { ar: 'اختر الحلاق:', en: 'Choose Barber:' },
        'datetime-label': { ar: 'اختر التاريخ والوقت:', en: 'Choose Date and Time:' },
        'name-label': { ar: 'الاسم:', en: 'Name:' },
        'phone-label': { ar: 'رقم الهاتف:', en: 'Phone Number:' },
        'submit-button': { ar: 'احجز الآن', en: 'Book Now' }
    };

    Object.entries(elements).forEach(([id, labels]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = labels[currentLanguage];
    });

    // Ensure the logo is visible in both languages
    const logoContainer = document.querySelector('.logo-container');
    if (logoContainer) {
        logoContainer.style.display = 'block';
    }

    document.body.style.direction = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    updateCategoriesLanguage();
    updateServicesLanguage();
    updateSummary(); // Make sure the summary is updated with the new language
}

function updateCategoriesLanguage() {
    const categoryButtons = document.querySelectorAll('.category-button');
    categoryButtons.forEach(button => {
        const category = button.dataset[currentLanguage];
        button.textContent = category;
    });
}

function updateServicesLanguage() {
    const serviceButtons = document.querySelectorAll('.service-button');
    serviceButtons.forEach(button => {
        const serviceName = button.dataset[currentLanguage];
        const service = Object.values(categories).flatMap(cat => cat.services).find(s => s.name_en === serviceName || s.name_ar === serviceName);
        if (service) {
            const name = currentLanguage === 'ar' ? service.name_ar : service.name_en;
            button.innerHTML = `${name}<br>(${service.duration} - SAR ${service.price})`;
        }
    });
}

function initializeCategories(categoriesContainer) {
    Object.keys(categories).forEach(key => {
        const category = categories[key];
        const button = createButton(category.en, 'category-button');
        button.dataset.en = category.en;
        button.dataset.ar = category.ar;
        button.textContent = currentLanguage === 'ar' ? category.ar : category.en;
        button.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent form submission
            document.querySelectorAll('.category-button').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            populateServices(key);
        });
        categoriesContainer.appendChild(button);
    });
}

function populateServices(categoryKey) {
    const servicesContainer = document.getElementById('services');
    servicesContainer.innerHTML = '';
    const category = categories[categoryKey];
    category.services.forEach(service => {
        const name = currentLanguage === 'ar' ? service.name_ar : service.name_en;
        const serviceButton = createButton(`${name}<br>(${service.duration} - SAR ${service.price})`, 'service-button');
        serviceButton.dataset.en = service.name_en;
        serviceButton.dataset.ar = service.name_ar;
        serviceButton.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent form submission
            toggleService(serviceButton, service.name_en, service.name_ar);
        });
        servicesContainer.appendChild(serviceButton);
    });
}

function toggleService(button, serviceName_en, serviceName_ar) {
    button.classList.toggle('selected');
    const serviceName = currentLanguage === 'ar' ? serviceName_ar : serviceName_en;
    const categoryKey = Object.keys(categories).find(key => categories[key].services.some(service => service.name_en === serviceName_en));
    const service = categories[categoryKey].services.find(s => s.name_en === serviceName_en);
    
    if (selectedServices.has(serviceName)) {
        selectedServices.delete(serviceName);
        totalDuration -= parseDuration(service.duration);
        totalPrice -= service.price;
    } else {
        selectedServices.add(serviceName);
        totalDuration += parseDuration(service.duration);
        totalPrice += service.price;
    }
    
    updateSummary();
}

function initializeBarbers(barberContainer) {
    Object.keys(employeeWorkingHours).forEach(barber => {
        const button = createButton(barbers[barber][currentLanguage], 'barber-button');
        button.dataset.en = barbers[barber].en;
        button.dataset.ar = barbers[barber].ar;
        button.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.barber-button').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectedBarber = barber; // Store the selected barber
            initializeDateTimePicker(barber);
        });
        barberContainer.appendChild(button);
    });
}

function handleFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const bookingData = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        services: Array.from(selectedServices),
        totalDuration: formatDuration(totalDuration),
        totalPrice: totalPrice,
        barber: selectedBarber,
        datetime: document.getElementById('datetime').value
    };

    sendBookingToWhatsApp(bookingData);
}

function sendBookingToWhatsApp(bookingData) {
    const message = `
========= 
${currentLanguage === 'ar' ? 'الاسم' : 'Name'}: ${bookingData.name || ''}
${currentLanguage === 'ar' ? 'رقم الهاتف' : 'Phone Number'}: ${bookingData.phone || ''}
${currentLanguage === 'ar' ? 'الخدمات' : 'Services'}: 
${bookingData.services.map(service => `* ${service}`).join('\n')}
${currentLanguage === 'ar' ? 'المدة الإجمالية' : 'Total Duration'}: ${bookingData.totalDuration}
${currentLanguage === 'ar' ? 'السعر الإجمالي' : 'Total Price'}: ${bookingData.totalPrice} SAR
${currentLanguage === 'ar' ? 'الحلاق' : 'Barber'}: ${bookingData.barber || ''}
${currentLanguage === 'ar' ? 'التاريخ والوقت' : 'Date and Time'}: ${bookingData.datetime || ''}
=========
    `;
    window.open(`https://wa.me/966599791440?text=${encodeURIComponent(message)}`, '_blank');
}

function createButton(text, className) {
    const button = document.createElement('button');
    button.innerHTML = text;
    button.classList.add(className);
    return button;
}

function parseDuration(duration) {
    if (duration.includes('h')) {
        const [hours, minutes] = duration.split('h');
        return parseInt(hours) * 60 + parseInt(minutes || 0);
    } else {
        return parseInt(duration) || 0;
    }
}

function formatDuration(minutes) {
    if (isNaN(minutes)) {
        return currentLanguage === 'ar' ? '0 دقيقة' : '0 minutes';
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (currentLanguage === 'ar') {
        return hours > 0 ? `${hours} ساعة ${mins} دقيقة` : `${mins} دقيقة`;
    } else {
        return hours > 0 ? `${hours} hour(s) ${mins} minute(s)` : `${mins} minute(s)`;
    }
}

function updateSummary() {
    const selectedServicesElement = document.getElementById('selected-services');
    const totalDurationElement = document.getElementById('total-duration');
    const totalPriceElement = document.getElementById('total-price');

    const servicesLabel = currentLanguage === 'ar' ? 'الخدمات المختارة: ' : 'Selected Services: ';
    const durationLabel = currentLanguage === 'ar' ? 'المدة الإجمالية: ' : 'Total Duration: ';
    const priceLabel = currentLanguage === 'ar' ? 'السعر الإجمالي: ' : 'Total Price: ';

    selectedServicesElement.innerHTML = `${servicesLabel}<span>${Array.from(selectedServices).join(', ') || '-'}</span>`;
    totalDurationElement.innerHTML = `${durationLabel}<span>${formatDuration(totalDuration)}</span>`;
    totalPriceElement.innerHTML = `${priceLabel}<span>${totalPrice} ${currentLanguage === 'ar' ? 'ريال' : 'SAR'}</span>`;
}

function updateProgress(step) {
    const progressElement = document.getElementById('progress');
    const progressPercentage = (step / steps.length) * 100;
    progressElement.style.width = `${progressPercentage}%`;
}

// Call updateProgress() with the initial step count
updateProgress(0);
