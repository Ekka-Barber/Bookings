// booking-manager.js
class BookingManager {
    constructor(state, firebaseService, uiManager) {
        this.state = state;
        this.firebase = firebaseService;
        this.ui = uiManager;
        this.flatpickr = null;
        this.availabilitySubscriptions = new Map();
        
        this.initialize();
    }

    async initialize() {
        try {
            this.ui.showLoading(true);
            await Promise.all([
                this.initializeCategories(),
                this.initializeBarbers(),
                this.initializeCalendar()
            ]);
            this.setupRealTimeUpdates();
            this.ui.showLoading(false);
        } catch (error) {
            this.handleError(error);
            this.ui.showLoading(false);
        }
    }

    // Initialization Methods
    async initializeCategories() {
        const categories = await this.firebase.getCategories();
        this.state.setState({ categories: new Map(Object.entries(categories)) });
        this.ui.renderCategories(categories);
    }

    async initializeBarbers() {
        const barbers = await this.firebase.getBarbers();
        this.state.setState({ barbers: new Map(Object.entries(barbers)) });
    }

    initializeCalendar() {
        const datePickerElement = this.ui.elements.datePicker;
        if (!datePickerElement) return;

        // Configure Flatpickr
        this.flatpickr = flatpickr(datePickerElement, {
            minDate: 'today',
            maxDate: new Date().fp_incr(30), // Allow booking up to 30 days ahead
            disable: [
                function(date) {
                    // Disable dates based on business rules
                    return this.isDateDisabled(date);
                }.bind(this)
            ],
            locale: this.state.language === 'ar' ? Arabic : English,
            onChange: this.handleDateChange.bind(this)
        });
    }

    setupRealTimeUpdates() {
        // Listen for booking updates
        this.firebase.subscribeToBookingUpdates((bookings) => {
            this.updateAvailability(bookings);
        });

        // Listen for barber status updates
        this.firebase.subscribeToBarberUpdates((barbers) => {
            this.updateBarberAvailability(barbers);
        });
    }

    // Date and Time Management
    isDateDisabled(date) {
        // Check if date is in the past
        if (date < new Date().setHours(0, 0, 0, 0)) return true;

        // Check if it's a holiday or special closure date
        if (this.isHoliday(date)) return true;

        // Check if any barbers are available on this date
        return !this.hasAvailableBarbers(date);
    }

    isHoliday(date) {
        // Implementation for holiday checking
        // Could be extended to fetch from Firebase or config
        const holidays = [
            '2024-12-25', // Example holiday
        ];
        
        return holidays.includes(date.toISOString().split('T')[0]);
    }

    hasAvailableBarbers(date) {
        const dayOfWeek = date.getDay();
        return Array.from(this.state.barbers.values()).some(barber => {
            return barber.active && this.isBarberWorkingOnDay(barber, dayOfWeek);
        });
    }

    isBarberWorkingOnDay(barber, dayOfWeek) {
        // Check barber's working days
        return barber.workingDays?.[dayOfWeek] !== false;
    }

    async handleDateChange(selectedDates) {
        const selectedDate = selectedDates[0];
        if (!selectedDate) return;

        try {
            this.ui.showLoading(true);
            
            // Generate time slots
            const timeSlots = await this.generateTimeSlots(selectedDate);
            
            // Update state and UI
            this.state.setSelectedDate(selectedDate.toISOString().split('T')[0]);
            this.ui.renderTimeSlots(timeSlots);
            
            // Setup availability monitoring
            this.setupAvailabilityMonitoring(selectedDate);
            
        } catch (error) {
            this.handleError(error);
        } finally {
            this.ui.showLoading(false);
        }
    }

    async generateTimeSlots(date) {
        const slots = [];
        const totalDuration = this.calculateTotalDuration();

        // Get working hours
        const [startHour, startMin] = CONFIG.business.workingHours.start.split(':').map(Number);
        const [endHour, endMin] = CONFIG.business.workingHours.end.split(':').map(Number);

        let currentSlot = new Date(date);
        currentSlot.setHours(startHour, startMin, 0, 0);

        const endTime = new Date(date);
        endTime.setHours(endHour, endMin, 0, 0);

        // Generate slots
        while (currentSlot < endTime) {
            // Only include future time slots
            if (currentSlot > new Date()) {
                const timeString = currentSlot.toTimeString().slice(0, 5);
                const availability = await this.checkSlotAvailability(currentSlot, totalDuration);
                
                slots.push({
                    time: timeString,
                    available: availability.available,
                    barbers: availability.availableBarbers
                });
            }

            // Increment by slot interval
            currentSlot = new Date(currentSlot.getTime() + 
                               (CONFIG.business.timeSlotInterval * 60000));
        }

        return slots;
    }

    async checkSlotAvailability(dateTime, duration) {
        const availableBarbers = [];
        let isAvailable = false;

        for (const [barberId, barber] of this.state.barbers) {
            if (!barber.active) continue;

            const barberAvailable = await this.firebase.checkBarberAvailability(
                barberId,
                dateTime.toISOString(),
                duration
            );

            if (barberAvailable) {
                availableBarbers.push(barberId);
                isAvailable = true;
            }
        }

        return {
            available: isAvailable,
            availableBarbers
        };
    }

    setupAvailabilityMonitoring(date) {
        // Clear existing subscriptions
        this.availabilitySubscriptions.forEach(unsubscribe => unsubscribe());
        this.availabilitySubscriptions.clear();

        // Setup new subscriptions for each barber
        this.state.barbers.forEach((barber, barberId) => {
            if (!barber.active) return;

            const unsubscribe = this.firebase.subscribeToBarberAvailability(
                barberId,
                date,
                (unavailableTimes) => {
                    this.updateTimeSlotAvailability(barberId, unavailableTimes);
                }
            );

            this.availabilitySubscriptions.set(barberId, unsubscribe);
        });
    }

    updateTimeSlotAvailability(barberId, unavailableTimes) {
        const timeSlots = this.ui.elements.grids.timeSlots.querySelectorAll('.time-slot');
        const totalDuration = this.calculateTotalDuration();

        timeSlots.forEach(slot => {
            const timeStr = slot.dataset.time;
            const dateTime = new Date(`${this.state.selectedDate}T${timeStr}`);
            const endTime = new Date(dateTime.getTime() + (totalDuration * 60000));

            const isConflict = unavailableTimes.some(period => {
                return (dateTime < period.end && endTime > period.start);
            });

            // Update slot availability
            if (isConflict) {
                slot.dataset.unavailableBarbers = 
                    (slot.dataset.unavailableBarbers || '') + `${barberId},`;
                
                // Check if all barbers are unavailable
                const unavailableBarbers = new Set(slot.dataset.unavailableBarbers.split(','));
                const activeBarbers = Array.from(this.state.barbers.entries())
                    .filter(([_, b]) => b.active)
                    .map(([id]) => id);

                if (unavailableBarbers.size >= activeBarbers.length) {
                    slot.disabled = true;
                    slot.classList.add('unavailable');
                }
            }
        });
    }

    // Booking Process
    async handleBookingSubmission() {
        try {
            if (!this.validateBookingData()) {
                throw new Error(this.ui.translate('invalid_booking_data'));
            }

            this.ui.showLoading(true);

            // Prepare booking data
            const bookingData = {
                services: Array.from(this.state.selectedServices.values()),
                dateTime: this.state.selectedDateTime,
                barberId: this.state.selectedBarber.id,
                customerDetails: this.state.customerDetails,
                totalDuration: this.calculateTotalDuration(),
                totalPrice: this.calculateTotalPrice(),
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            // Create booking
            const bookingId = await this.firebase.createBooking(bookingData);
            
            if (bookingId) {
                await this.sendConfirmation(bookingData);
                this.state.reset();
                this.ui.showSuccessMessage();
            }

        } catch (error) {
            this.handleError(error);
        } finally {
            this.ui.showLoading(false);
        }
    }

    validateBookingData() {
        return (
            this.state.selectedServices.size > 0 &&
            this.state.selectedDateTime &&
            this.state.selectedBarber &&
            this.state.validateCustomerDetails()
        );
    }

    calculateTotalDuration() {
        return Array.from(this.state.selectedServices.values())
            .reduce((total, service) => {
                const duration = parseInt(service.duration);
                return total + (isNaN(duration) ? 0 : duration);
            }, 0);
    }

    calculateTotalPrice() {
        return Array.from(this.state.selectedServices.values())
            .reduce((total, service) => total + service.price, 0);
    }

    async sendConfirmation(bookingData) {
        // Implementation for sending confirmation
        // Could be extended to send SMS, email, or WhatsApp message
        console.log('Sending confirmation for booking:', bookingData);
    }

    // Error Handling
    handleError(error) {
        console.error('Booking error:', error);
        this.ui.showToast(error.message, 'error');
    }

    // Cleanup
    cleanup() {
        this.flatpickr?.destroy();
        this.availabilitySubscriptions.forEach(unsubscribe => unsubscribe());
        this.availabilitySubscriptions.clear();
    }
}

// Export instances
export const bookingManager = new BookingManager(state, firebaseService, uiManager);

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    bookingManager.initialize().catch(error => {
        console.error('Failed to initialize booking system:', error);
    });
});