
'use strict';

// ITWS 02 Units 6-7: DOM-built vehicle-specific booking calendar.
document.addEventListener('DOMContentLoaded', () => {
    const calendar = document.getElementById('booking-calendar-days');
    if (!calendar) return;

    const form = document.getElementById('booking-form');
    const vehicleField = document.getElementById('booking-vehicle');
    const startField = document.getElementById('booking-start');
    const endField = document.getElementById('booking-end');
    const title = document.getElementById('booking-month-title');
    const subtitle = document.getElementById('booking-calendar-subtitle');
    const message = document.getElementById('booking-calendar-message');
    const previous = document.getElementById('booking-month-prev');
    const next = document.getElementById('booking-month-next');

    const today = localISO();
    const initial = startField.value || today;

    let shown = new Date(
        Number(initial.slice(0, 4)),
        Number(initial.slice(5, 7)) - 1,
        1
    );

    let selectingReturn = false;
    let fromCalendar = false;
    let clickMessage = '';

    const isoDate = (year, month, day) =>
        `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    function refresh() {
        const vehicle = getVehicle(vehicleField.value);
        const start = startField.value;
        const end = endField.value;

        // Retrieve bookings for the currently selected vehicle
        const reservedDates = vehicle
            ? bookings.filter(r => r.vehicleId === vehicle.id && bookingBlocksDates(r))
            : [];

        const isBookedDay = date =>
            reservedDates.some(r => r.start <= date && date <= r.end) ||
            (vehicle && !isFleetDateAvailable(vehicle.id, date));

        const valid = !!vehicle && validDates(start, end);
        const conflict = valid && !isAvailable(vehicle.id, start, end);

        calendar.replaceChildren();

        title.textContent = shown.toLocaleDateString('en-PH', {
            month: 'long',
            year: 'numeric'
        });

        subtitle.textContent = vehicle
            ? `Dates for ${vehicle.name} — choose pickup, then return.`
            : 'Select a model above to display its held dates.';

        const thisMonth = new Date(
            Number(today.slice(0, 4)),
            Number(today.slice(5, 7)) - 1,
            1
        );

        previous.disabled = shown <= thisMonth;

        const year = shown.getFullYear();
        const month = shown.getMonth();
        const firstWeekday = new Date(year, month, 1).getDay();
        const numberOfDays = new Date(year, month + 1, 0).getDate();

        // Add blank spaces before the first day
        for (let i = 0; i < firstWeekday; i++) {
            const filler = document.createElement('span');
            filler.className = 'bc-empty';
            filler.setAttribute('aria-hidden', 'true');
            calendar.append(filler);
        }

        // Generate the individual calendar dates
        for (let day = 1; day <= numberOfDays; day++) {
            const date = isoDate(year, month, day);
            const booked = isBookedDay(date);
            const past = date < today;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'bc-day';
            button.textContent = String(day);
            button.dataset.date = date;

            if (past) {
                button.classList.add('bc-past');
            } else if (booked) {
                button.classList.add('bc-booked');
            } else if (!vehicle) {
                button.classList.add('bc-unknown');
            } else {
                button.classList.add('bc-free');
            }

            // Mark selected dates without hiding held dates
            if (!booked && vehicle && start && date >= start &&
                (selectingReturn
                    ? date === start
                    : end && date <= end)) {
                button.classList.add('bc-selected');
            }

            button.disabled = past || booked || !vehicle;

            button.setAttribute('aria-label',
                `${formattedDate(date)}: ${past ? 'past date' :
                    booked ? 'held or reserved in this browser' :
                        vehicle ? 'no local booking' :
                            'select a vehicle first'
                }`
            );

            if (button.classList.contains('bc-selected')) {
                button.setAttribute('aria-pressed', 'true');
            }

            calendar.append(button);
        }

        form.classList.toggle('has-booking-conflict', Boolean(conflict));

        // Update the message below the calendar
        if (clickMessage) {
            message.textContent = clickMessage;
            message.className = 'bc-message bc-error';

        } else if (!vehicle) {
            message.textContent =
                'Choose a vehicle to see which dates are already reserved.';
            message.className = 'bc-message';

        } else if (conflict) {
            message.textContent =
                'Unavailable: the dates are held for a rental or blocked for maintenance.';
            message.className = 'bc-message bc-error';

        } else if (selectingReturn) {
            message.textContent =
                `Pickup: ${formattedDate(start)}. Now choose the return date.`;
            message.className = 'bc-message bc-info';

        } else if (valid) {
            message.textContent =
                `No conflicting demo booking found for ${formattedDate(start)} – ${formattedDate(end)}.`;
            message.className = 'bc-message bc-ok';

        } else {
            message.textContent =
                'Select a pickup date, then a return date on or after pickup.';
            message.className = 'bc-message';
        }
    }

    // Notify the existing script so its price summary updates
    function notifyExistingBookingLogic() {
        fromCalendar = true;

        startField.dispatchEvent(
            new Event('change', { bubbles: true })
        );

        endField.dispatchEvent(
            new Event('change', { bubbles: true })
        );

        fromCalendar = false;
    }

    // Select pickup date, then return date
    calendar.addEventListener('click', event => {
        const button = event.target.closest('button[data-date]');
        if (!button || button.disabled) return;

        const date = button.dataset.date;
        const vehicle = getVehicle(vehicleField.value);
        if (!vehicle) return;

        clickMessage = '';

        if (!selectingReturn || date < startField.value) {
            // First click: pickup date
            startField.value = date;
            endField.value = '';
            selectingReturn = true;

        } else if (!isAvailable(vehicle.id, startField.value, date)) {
            // The proposed range crosses reserved dates.
            // Start a new selection on the clicked available day.
            startField.value = date;
            endField.value = '';
            selectingReturn = true;

            clickMessage =
                `That range crosses held dates. New pickup: ${formattedDate(date)}. Now choose a return date.`;

        } else {
            // Second click: return date
            endField.value = date;
            selectingReturn = false;
        }

        notifyExistingBookingLogic();
        refresh();
    });

    // Update when a different vehicle is selected
    vehicleField.addEventListener('change', () => {
        selectingReturn = false;
        clickMessage = '';
        refresh();
    });

    // Update when users use the original date pickers
    [startField, endField].forEach(input => {
        input.addEventListener('change', () => {
            if (fromCalendar) return;

            selectingReturn = false;
            clickMessage = '';

            const date = startField.value || today;

            shown = new Date(
                Number(date.slice(0, 4)),
                Number(date.slice(5, 7)) - 1,
                1
            );

            refresh();
        });
    });

    // Navigate between months
    previous.addEventListener('click', () => {
        shown = new Date(
            shown.getFullYear(),
            shown.getMonth() - 1,
            1
        );
        refresh();
    });

    next.addEventListener('click', () => {
        shown = new Date(
            shown.getFullYear(),
            shown.getMonth() + 1,
            1
        );
        refresh();
    });

    // Refresh when bookings change in another browser tab
    window.addEventListener('storage', event => {
        if (event.key !== storedBookingKey) return;

        bookings = readBookings();

        vehicleField.dispatchEvent(
            new Event('change', { bubbles: true })
        );

        refresh();
    });

    window.addEventListener('pageshow', () => {
        bookings = readBookings();
        refresh();
    });

    refresh();
});
