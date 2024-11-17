// Firebase Configuration
const config = {
    firebase: {
        apiKey: "AIzaSyA0Syrv4XH88PTzQUaSg6vQaZlZMJ_85n8",
        authDomain: "ekka-barbershop.firebaseapp.com",
        databaseURL: "https://ekka-barbershop-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "ekka-barbershop",
        storageBucket: "ekka-barbershop.firebasestorage.app",
        messagingSenderId: "726879506857",
        appId: "1:726879506857:web:497e0576037a3bcf8d74b8",
        measurementId: "G-56KKZKQ6TK"
    }
};

// Initialize Firebase
firebase.initializeApp(config.firebase);
const db = firebase.database();

// Initialize categories loading immediately
document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();
});

// Load categories and services
async function loadInitialData() {
    try {
        showLoading(true);
        const categoriesSnapshot = await db.ref('categories').once('value');
        const categories = categoriesSnapshot.val();
        
        if (categories) {
            renderCategories(categories);
        } else {
            showError('No services found');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        showError('Error loading services');
    } finally {
        showLoading(false);
    }
}

// Render categories and services
function renderCategories(categories) {
    const categoriesGrid = document.querySelector('.categories-services-grid');
    if (!categoriesGrid) return;

    let html = '';
    
    Object.entries(categories).forEach(([categoryId, category]) => {
        html += `
            <div class="category">
                <div class="category-header">
                    ${category.ar}
                </div>
                <div class="category-services">
                    ${Object.entries(category.services).map(([serviceId, service]) => `
                        <div class="service-card" data-service-id="${serviceId}">
                            <h3 class="service-name">${service.name_ar}</h3>
                            <p class="service-details">${service.duration}</p>
                            <p class="service-price">${service.price} ريال</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    categoriesGrid.innerHTML = html;

    // Add click events to category headers and service cards
    document.querySelectorAll('.category-header').forEach(header => {
        header.addEventListener('click', () => {
            const services = header.nextElementSibling;
            services.classList.toggle('open');
        });
    });

    // Add click events to service cards
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('selected');
            updateSummary();
        });
    });
}

// Helper functions
function showLoading(show) {
    const loader = document.querySelector('.loading-overlay');
    if (loader) {
        loader.classList.toggle('active', show);
    }
}

function showError(message) {
    // Create and show error toast
    const toast = document.createElement('div');
    toast.className = 'toast toast-error';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function updateSummary() {
    const summaryContent = document.querySelector('.summary-content');
    const selectedServices = document.querySelectorAll('.service-card.selected');
    
    let html = '';
    let total = 0;

    if (selectedServices.length > 0) {
        html += '<div class="summary-services">';
        selectedServices.forEach(service => {
            const name = service.querySelector('.service-name').textContent;
            const price = parseInt(service.querySelector('.service-price').textContent);
            total += price;
            html += `
                <div class="summary-service-item">
                    <span>${name}</span>
                    <span>${price} ريال</span>
                </div>
            `;
        });
        html += '</div>';
        html += `
            <div class="summary-total">
                <div class="total-row">
                    <span>المجموع</span>
                    <span>${total} ريال</span>
                </div>
            </div>
        `;
    }

    if (summaryContent) {
        summaryContent.innerHTML = html;
    }
}
