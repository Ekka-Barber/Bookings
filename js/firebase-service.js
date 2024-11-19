// config.js
const CONFIG = {
    firebase: {
        apiKey: "AIzaSyA0Syrv4XH88PTzQUaZlZMJ_85n8",
        authDomain: "ekka-barbershop.firebaseapp.com",
        databaseURL: "https://ekka-barbershop-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "ekka-barbershop",
        storageBucket: "ekka-barbershop.firebasestorage.app",
        messagingSenderId: "726879506857",
        appId: "1:726879506857:web:497e0576037a3bcf8d74b8"
    },
    business: {
        workingHours: {
            start: "08:00",
            end: "23:59"
        },
        appointmentDuration: 30,
        timeSlotInterval: 30,
        bufferTime: 15,
        maxServicesPerBooking: 5
    },
    cache: {
        duration: {
            categories: 5 * 60 * 1000,  // 5 minutes
            barbers: 2 * 60 * 1000,     // 2 minutes
            availability: 1 * 60 * 1000  // 1 minute
        }
    }
};

// FirebaseService.js
class FirebaseService {
    constructor() {
        this.initializeFirebase();
        this.db = null;
        this.activeSubscriptions = new Map();
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.cache = new Map();
    }



    // Initialize Firebase
    async initializeFirebase() {
        try {
            // Load Firebase modules
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js');
            const { getDatabase } = await import('https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js');

            // Firebase configuration
            const firebaseConfig = {
                apiKey: "AIzaSyA0Syrv4XH88PTzQUaZlZMJ_85n8",
                authDomain: "ekka-barbershop.firebaseapp.com",
                databaseURL: "https://ekka-barbershop-default-rtdb.europe-west1.firebasedatabase.app",
                projectId: "ekka-barbershop",
                storageBucket: "ekka-barbershop.firebasestorage.app",
                messagingSenderId: "726879506857",
                appId: "1:726879506857:web:497e0576037a3bcf8d74b8"
            };

            // Initialize Firebase
            const app = initializeApp(firebaseConfig);
            this.db = getDatabase(app);

            await this.testConnection();
            this.setupConnectionMonitoring();
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            throw new Error('Failed to initialize Firebase');
        }
    }
        try {
            // Use the imported Firebase functions
            if (!window.firebase?.apps?.length) {
                const app = window.initializeApp(config.firebase);
                this.db = window.getDatabase(app);
            }
            await this.testConnection();
            this.setupConnectionMonitoring();
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            throw new Error('Failed to initialize Firebase');
        }
    }
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(CONFIG.firebase);
            }
            this.db = firebase.database();
            await this.testConnection();
            this.setupConnectionMonitoring();
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            throw new Error('Failed to initialize Firebase');
        }
    }

    async testConnection() {
        let attempts = 0;
        while (attempts < this.retryAttempts) {
            try {
                await this.db.ref('.info/connected').once('value');
                return true;
            } catch (error) {
                attempts++;
                if (attempts === this.retryAttempts) throw error;
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempts));
            }
        }
    }

    setupConnectionMonitoring() {
        this.db.ref('.info/connected').on('value', (snapshot) => {
            const isConnected = snapshot.val() === true;
            document.dispatchEvent(new CustomEvent('connection-status', {
                detail: { 
                    status: isConnected ? 'connected' : 'disconnected',
                    message: isConnected ? 'Connection restored' : 'Connection lost. Retrying...'
                }
            }));
        });
    }

    async fetchWithCache(path, duration) {
        const cacheKey = `${path}_${duration}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp < duration)) {
            return cached.data;
        }

        try {
            const snapshot = await this.db.ref(path).once('value');
            const data = snapshot.val();
            
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            
            return data;
        } catch (error) {
            console.error(`Error fetching ${path}:`, error);
            throw error;
        }
    }

    async getCategories() {
        return this.fetchWithCache('categories', CONFIG.cache.duration.categories);
    }

    async getBarbers() {
        const barbers = await this.fetchWithCache('barbers', CONFIG.cache.duration.barbers);
        return Object.entries(barbers)
            .filter(([_, barber]) => barber.active)
            .reduce((acc, [id, barber]) => ({...acc, [id]: barber}), {});
    }

    subscribeToBarberAvailability(barberId, date, callback) {
        const dateStr = new Date(date).toISOString().split('T')[0];
        const subscriptionKey = `availability_${barberId}_${dateStr}`;

        // Cleanup existing subscription
        this.unsubscribe(subscriptionKey);

        const subscription = this.db.ref('bookings')
            .orderByChild('barberId')
            .equalTo(barberId)
            .on('value', snapshot => {
                const bookings = snapshot.val() || {};
                const unavailableTimes = this.processBookingsForAvailability(bookings, dateStr);
                callback(unavailableTimes);
            });

        this.activeSubscriptions.set(subscriptionKey, {
            ref: this.db.ref('bookings'),
            callback: subscription
        });

        return () => this.unsubscribe(subscriptionKey);
    }

    processBookingsForAvailability(bookings, dateStr) {
        return Object.values(bookings)
            .filter(booking => {
                const bookingDate = new Date(booking.dateTime).toISOString().split('T')[0];
                return bookingDate === dateStr && booking.status !== 'cancelled';
            })
            .map(booking => ({
                start: new Date(booking.dateTime).getTime(),
                end: new Date(booking.dateTime).getTime() + 
                     (booking.duration * 60 * 1000) + 
                     (CONFIG.business.bufferTime * 60 * 1000)
            }));
    }

    async createBooking(bookingData) {
        try {
            const newBookingRef = await this.db.ref('bookings').push({
                ...bookingData,
                status: 'pending',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            return newBookingRef.key;
        } catch (error) {
            console.error('Error creating booking:', error);
            throw error;
        }
    }

    unsubscribe(key) {
        const subscription = this.activeSubscriptions.get(key);
        if (subscription) {
            subscription.ref.off('value', subscription.callback);
            this.activeSubscriptions.delete(key);
        }
    }

    cleanup() {
        this.activeSubscriptions.forEach((_, key) => this.unsubscribe(key));
        this.activeSubscriptions.clear();
        this.db?.ref('.info/connected').off();
        this.cache.clear();
    }
}

export const firebaseService = new FirebaseService();
export const config = CONFIG;
