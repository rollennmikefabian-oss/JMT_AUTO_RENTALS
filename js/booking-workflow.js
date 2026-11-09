'use strict';



initBooking = function initBookingRequests() {
    const form = document.getElementById('booking-form');
    if (!form) return;

    const vehicleSelect = document.getElementById('booking-vehicle');
    const pickupDate = document.getElementById('booking-start');
    const returnDate = document.getElementById('booking-end');
    const pickupTime = document.getElementById('booking-pickup-time');
    const returnTime = document.getElementById('booking-return-time');
    const pickupLocation = document.getElementById('booking-pickup-location');
    const returnLocation = document.getElementById('booking-return-location');
    const reviewDialog = document.getElementById('review-dialog');
    const errorMessage = document.getElementById('booking-error');
    let pendingRequest = null;

    // The current site uses a single array of illustrative vehicles.
    vehicleSelect.innerHTML = '<option value="">Select a vehicle</option>' +
        fleet.map(vehicle => `
            <option value="${vehicle.id}">
                ${vehicle.name} · ${vehicle.type} · ${peso.format(vehicle.rate)}/day
            </option>
        `).join('');

    const selectedVehicle = getVehicle(params.get('vehicle'));
    const selectedDates = getDates();
    vehicleSelect.value = selectedVehicle ? selectedVehicle.id : '';
    pickupDate.value = selectedDates.start;
    returnDate.value = selectedDates.end;
    pickupDate.min = localISO();
    returnDate.min = selectedDates.start;
    pickupTime.value = pickupTime.value || '09:00';
    returnTime.value = returnTime.value || '17:00';

    function calculate() {
        const vehicle = getVehicle(vehicleSelect.value);
        const start = pickupDate.value;
        const end = returnDate.value;
        const days = validDates(start, end) ? rentalDays(start, end) : 0;
        const base = vehicle ? days * vehicle.rate : 0;
        return {
            vehicle,
            start,
            end,
            days,
            base,
            total: base,
            pickupTime: pickupTime.value,
            returnTime: returnTime.value,
            pickupLocation: pickupLocation.value,
            returnLocation: returnLocation.value
        };
    }

    function timesAreValid(data) {
        // The current prototype charges by calendar day, not hourly duration.
        if (!data.pickupTime || !data.returnTime) return false;
        if (data.start === data.end && data.returnTime <= data.pickupTime) return false;
        if (data.start === localISO()) {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            if (data.pickupTime <= currentTime) return false;
        }
        return true;
    }

    function showError(text) {
        errorMessage.hidden = false;
        errorMessage.textContent = text;
        // Inline error only; do not duplicate with a toast.
    }

    function refresh() {
        const data = calculate();
        pickupDate.min = localISO();
        returnDate.min = pickupDate.value || localISO();

        const image = document.getElementById('booking-photo');
        image.hidden = !data.vehicle;
        if (data.vehicle) image.src = data.vehicle.image;
        else image.removeAttribute('src');
        const emptyPreview = document.getElementById('booking-empty-preview');
        if (emptyPreview) emptyPreview.hidden = !!data.vehicle;
        image.alt = data.vehicle ? `Illustration of ${data.vehicle.name}` : 'Sample car';
        document.getElementById('booking-model').textContent = data.vehicle?.name || 'Choose a model';
        document.getElementById('booking-category').textContent = data.vehicle?.type || 'Vehicle type';
        document.getElementById('s-rate').textContent = peso.format(data.vehicle?.rate || 0);
        document.getElementById('s-days').textContent = data.days || '—';
        document.getElementById('s-base').textContent = peso.format(data.base);
        document.getElementById('s-total').textContent = peso.format(data.total);

        const status = document.getElementById('s-status');
        status.classList.remove('is-error');

        if (!data.vehicle || !validDates(data.start, data.end)) {
            status.textContent = 'Select a vehicle and valid rental dates.';
        } else if (!isAvailable(data.vehicle.id, data.start, data.end)) {
            status.textContent = 'Unavailable: another active demo request holds those dates.';
            status.classList.add('is-error');
        } else if (!timesAreValid(data)) {
            status.textContent = 'Check pick-up time (must be in the future) and same-day return time.';
            status.classList.add('is-error');
        } else {
            status.textContent = 'No conflicting local request. Submission will be PENDING staff review.';
        }
        return data;
    }

    for (const input of [vehicleSelect, pickupDate, returnDate, pickupTime, returnTime,
        pickupLocation, returnLocation]) {
        input.addEventListener('change', () => {
            if (validDates(pickupDate.value, returnDate.value)) {
                setDates(pickupDate.value, returnDate.value);
            }
            errorMessage.hidden = true;
            refresh();
        });
    }

    form.addEventListener('submit', event => {
        event.preventDefault();
        errorMessage.hidden = true;

        const data = refresh();
        pickupDate.setCustomValidity('');
        returnDate.setCustomValidity('');

        if (!form.reportValidity()) return;
        if (!data.vehicle || !validDates(data.start, data.end)) {
            showError('Choose a vehicle and valid rental dates.');
            return;
        }
        if (!timesAreValid(data)) {
            showError('Pick-up must be in the future; same-day return must be later than pick-up.');
            return;
        }
        if (!isAvailable(data.vehicle.id, data.start, data.end)) {
            showError('Those dates are already held by another active demo request.');
            return;
        }

        pendingRequest = data;
        const review = document.getElementById('review-list');
        review.replaceChildren();

        addTextRow(review, 'Requested by', document.getElementById('customer-name').value.trim());
        addTextRow(review, 'Vehicle', data.vehicle.name);
        addTextRow(review, 'Pick-up', `${formattedDate(data.start)} at ${data.pickupTime}`);
        addTextRow(review, 'Return', `${formattedDate(data.end)} at ${data.returnTime}`);
        addTextRow(review, 'Pickup preference', pickupLocation.selectedOptions[0].textContent.trim());
        addTextRow(review, 'Return preference', returnLocation.selectedOptions[0].textContent.trim());
        addTextRow(review, 'Calendar days', String(data.days));
        addTextRow(review, 'Estimate', peso.format(data.total));
        addTextRow(review, 'Status after submission', 'Pending staff review (demo)');

        reviewDialog.showModal();
    });

    for (const button of reviewDialog.querySelectorAll('[data-close-dialog]')) {
        button.addEventListener('click', () => reviewDialog.close());
    }
    reviewDialog.addEventListener('click', event => {
        if (event.target === reviewDialog) reviewDialog.close();
    });

    document.getElementById('confirm-booking').addEventListener('click', () => {
        if (!pendingRequest) return;
        const request = pendingRequest;

        // Refresh from localStorage before deciding whether this hold is still free.
        bookings = readBookings();
        if (!isAvailable(request.vehicle.id, request.start, request.end)) {
            reviewDialog.close();
            showError('Another browser tab reserved that period. Select new dates.');
            refresh();
            return;
        }

        const reference = 'JMT-' + Date.now().toString(36).toUpperCase() +
            Math.random().toString(36).slice(2, 5).toUpperCase();

        // Deliberately do not store name, phone, email, or driver's license.
        // This is a browser-only class demonstration, not a real request service.
        const record = {
            id: reference,
            vehicleId: request.vehicle.id,
            start: request.start,
            end: request.end,
            pickupTime: request.pickupTime,
            returnTime: request.returnTime,
            pickupLocation: request.pickupLocation,
            returnLocation: request.returnLocation,
            total: request.total,
            addonNames: request.addonNames,
            status: 'Pending',
            createdAt: Date.now()
        };

        bookings.unshift(record);
        if (!saveBookings()) {
            reviewDialog.close();
            showError('Could not save this request in your browser. Please enable local storage.');
            return;
        }
        setDates(request.start, request.end);
        location.href = queryHref('reservations.html', { success: reference });
    });

    refresh();
};

initReservations = function initCustomerBookingStatus() {
    const tableBody = document.getElementById('booking-records');
    if (!tableBody) return;

    const success = params.get('success');
    const successNotice = document.getElementById('records-success');
    const lookupInput = document.getElementById('booking-lookup');
    const lookupResult = document.getElementById('booking-lookup-result');
    const searchForm = document.getElementById('booking-lookup-form');

    function render() {
        bookings = readBookings();
        tableBody.replaceChildren();
        successNotice.hidden = !(success && bookings.some(item => item.id === success));

        if (!bookings.length) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 7;
            cell.textContent = 'No demo requests saved in this browser yet.';
            row.append(cell);
            tableBody.append(row);
            return;
        }

        for (const request of bookings) {
            const vehicle = getVehicle(request.vehicleId);
            const row = document.createElement('tr');
            const values = [
                request.id,
                vehicle?.name || 'Unknown model',
                `${formattedDate(request.start)} ${request.pickupTime} – ${formattedDate(request.end)} ${request.returnTime}`,
                String(rentalDays(request.start, request.end)),
                peso.format(request.total || 0)
            ];

            for (const value of values) {
                const cell = document.createElement('td');
                cell.textContent = value;
                row.append(cell);
            }

            const statusCell = document.createElement('td');
            const status = document.createElement('span');
            status.className = 'request-status status-' + request.status.toLowerCase();
            status.textContent = request.status;
            statusCell.append(status);
            row.append(statusCell);

            const actionCell = document.createElement('td');
            if (['Pending', 'Approved'].includes(request.status)) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'cancel-btn';
                button.dataset.cancel = request.id;
                button.textContent = 'Cancel request';
                actionCell.append(button);
            } else {
                actionCell.textContent = '—';
            }
            row.append(actionCell);
            tableBody.append(row);
        }
    }

    tableBody.addEventListener('click', event => {
        const button = event.target.closest('button[data-cancel]');
        if (!button) return;

        if (!confirm(`Cancel request ${button.dataset.cancel}?`)) return;
        const request = bookings.find(item => item.id === button.dataset.cancel);
        if (!request || !['Pending', 'Approved'].includes(request.status)) return;

        request.status = 'Cancelled';
        saveBookings();
        render();
        toast('Demo request cancelled. The dates are now released.');
    });

    if (searchForm) {
        searchForm.addEventListener('submit', event => {
            event.preventDefault();
            const reference = lookupInput.value.trim().toUpperCase();
            const request = readBookings().find(item => item.id.toUpperCase() === reference);
            lookupResult.hidden = false;
            lookupResult.textContent = request
                ? `${request.id}: ${getVehicle(request.vehicleId)?.name} — ${request.status}. Pickup: ${formattedDate(request.start)} ${request.pickupTime}.`
                : 'No matching demo booking is stored in this browser.';
        });
    }

    window.addEventListener('storage', event => {
        if (event.key === storedBookingKey) render();
    });

    render();
};
