'use strict';
// Unit 6: DOM gallery + model-specific demo availability on the restored details page.
document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('showroom-grid');
    if (grid) {
        // The existing showroom HTML keeps its comparison and filters unchanged.
        // Capture View Details/image clicks, leaving the comparison controls alone.
        grid.addEventListener('click', event => {
            const detail = event.target.closest('[data-detail]');
            const visual = event.target.closest('.vehicle-card-visual');
            const id = detail?.dataset.detail || visual?.closest('.vehicle-card')?.querySelector('[data-detail]')?.dataset.detail;
            if (!id) return;
            event.stopPropagation();
            location.href = `details.html?vehicle=${encodeURIComponent(id)}`;
        }, true);
        return;
    }

    const title = document.getElementById('jmt-detail-title');
    if (!title) return;
    const vehicle = getVehicle(new URLSearchParams(location.search).get('vehicle'));
    if (!vehicle) {
        title.textContent = 'Vehicle not found';
        document.getElementById('jmt-detail-status').textContent = 'Select another vehicle from the showroom.';
        document.getElementById('jmt-detail-book').disabled = true;
        return;
    }

    document.title = `${vehicle.name} · JMT Auto Rentals`;
    title.textContent = vehicle.name;
    document.getElementById('jmt-detail-tag').textContent = vehicle.type;
    document.getElementById('jmt-detail-description').textContent = vehicle.desc;
    document.getElementById('jmt-detail-rate').textContent = `${peso.format(vehicle.rate)} / day`;
    const specs = document.getElementById('jmt-detail-spec');
    specs.replaceChildren();
    [['Category', vehicle.type], ['Seats', vehicle.seats], ['Transmission', vehicle.gear], ['Fuel', vehicle.fuel]].forEach(([label, value]) => {
        const div = document.createElement('div');
        const small = document.createElement('small');
        const bold = document.createElement('b');
        small.textContent = label;
        bold.textContent = String(value);
        div.append(small, bold);
        specs.append(div);
    });

    // Two existing model illustrations, not actual photos of the rental unit.
    // Actual verified vehicle photos may be added here once provided by the client.
    // Only display verified bundled assets. Avoid broken alternate image thumbnails.
    const photos = [{ src: vehicle.image, name: `${vehicle.name} model illustration` }];
    const availableAlternates = { montero: 'images/montero-sport-black.png' };
    const alternate = availableAlternates[vehicle.id];
    if (alternate && alternate !== vehicle.image) {
        photos.push({ src: alternate, name: `${vehicle.name} alternate model illustration` });
    }
    const photo = document.getElementById('jmt-photo-main');
    const large = document.getElementById('jmt-photo-large');
    const thumbs = document.getElementById('jmt-photo-thumbs');
    const dialog = document.getElementById('jmt-photo-dialog');
    const switchPhoto = n => {
        const chosen = photos[n];
        photo.src = large.src = chosen.src;
        photo.alt = large.alt = chosen.name;
        thumbs.querySelectorAll('button').forEach((button, i) => {
            button.classList.toggle('active', i === n);
            button.setAttribute('aria-pressed', String(i === n));
        });
    };
    photos.forEach((item, n) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', `View image ${n + 1}: ${item.name}`);
        const image = document.createElement('img');
        image.src = item.src;
        image.alt = '';
        button.append(image);
        button.addEventListener('click', () => switchPhoto(n));
        thumbs.append(button);
    });
    switchPhoto(0);
    document.getElementById('jmt-photo-zoom').addEventListener('click', () => dialog.showModal());
    document.getElementById('jmt-photo-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

    const calendarHost = document.getElementById('jmt-detail-calendar');
    const startField = document.getElementById('jmt-detail-start');
    const endField = document.getElementById('jmt-detail-end');
    const status = document.getElementById('jmt-detail-status');
    const estimate = document.getElementById('jmt-detail-estimate');
    const book = document.getElementById('jmt-detail-book');
    const today = localISO();
    const stored = getDates();
    startField.value = stored.start;
    endField.value = stored.end;
    startField.min = today;
    endField.min = stored.start;
    let displayed = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1);
    let selectingReturn = false;
    const calendar = document.createElement('div');
    calendar.className = 'jmt-calendar';
    calendar.innerHTML = `<div class="jmt-cal-head"><h3>Check available dates</h3><div class="jmt-cal-nav"><button type="button" data-month="prev" aria-label="Previous month">‹</button><strong id="jmt-detail-month"></strong><button type="button" data-month="next" aria-label="Next month">›</button></div></div><p class="jmt-cal-hint">Select pickup first, then return. Red days are already held or reserved in this browser.</p><div class="jmt-cal-week" aria-hidden="true"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div id="jmt-detail-days" class="jmt-cal-days" role="group" aria-label="Rental availability calendar"></div><div class="jmt-cal-legend">🟢 Not booked locally &nbsp; 🔴 Reserved locally &nbsp; 🔵 Selected dates</div><p id="jmt-detail-calendar-message" class="jmt-cal-message" role="status" aria-live="polite"></p><small class="jmt-cal-disclaimer">Demonstration only. This is not live company availability.</small>`;
    calendarHost.append(calendar);
    const daysHost = document.getElementById('jmt-detail-days');
    const calMessage = document.getElementById('jmt-detail-calendar-message');
    const prev = calendar.querySelector('[data-month="prev"]');
    const next = calendar.querySelector('[data-month="next"]');
    const isoDate = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const bookedDate = date =>
        !isFleetDateAvailable(vehicle.id, date) ||
        bookings.some(b =>
            b.vehicleId === vehicle.id &&
            bookingBlocksDates(b) &&
            b.start <= date &&
            date <= b.end
        );
    function render() {
        const start = startField.value;
        const end = endField.value;
        endField.min = start || today;
        const valid = validDates(start, end);
        const free = valid && isAvailable(vehicle.id, start, end);
        const n = valid ? rentalDays(start, end) : 0;
        estimate.textContent = n ? peso.format(n * vehicle.rate) : '—';
        status.classList.toggle('jmt-error', !free);
        status.textContent = !valid ? 'Choose your pickup and return dates.' : !free ? 'Unavailable: this range is reserved or blocked for maintenance in this browser.' : `${n} day(s) · No local booking conflict found.`;
        book.disabled = !free;
        calMessage.textContent = selectingReturn ? `Pickup: ${formattedDate(start)}. Now select a return date.` : status.textContent;
        calMessage.classList.toggle('jmt-cal-warning', !free && !selectingReturn);

        const year = displayed.getFullYear();
        const month = displayed.getMonth();
        document.getElementById('jmt-detail-month').textContent = displayed.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
        prev.disabled = year === Number(today.slice(0, 4)) && month === Number(today.slice(5, 7)) - 1;
        daysHost.replaceChildren();
        const first = new Date(year, month, 1).getDay();
        const count = new Date(year, month + 1, 0).getDate();
        for (let n = 0; n < first; n++) {
            const span = document.createElement('span'); span.className = 'jmt-cal-empty'; daysHost.append(span);
        }
        for (let n = 1; n <= count; n++) {
            const day = isoDate(year, month, n);
            const reserved = bookedDate(day);
            const past = day < today;
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'jmt-cal-day'; button.textContent = n; button.dataset.date = day;
            button.classList.add(past ? 'past' : reserved ? 'booked' : 'open');
            if (!reserved && !past && (day === start || (!selectingReturn && end && day >= start && day <= end))) button.classList.add('selected');
            button.disabled = reserved || past;
            button.setAttribute('aria-label', `${formattedDate(day)}, ${reserved ? 'held or reserved locally' : past ? 'past date' : 'not booked locally'}`);
            daysHost.append(button);
        }
    }
    daysHost.addEventListener('click', event => {
        const button = event.target.closest('[data-date]');
        if (!button || button.disabled) return;
        const chosen = button.dataset.date;
        if (!selectingReturn || chosen < startField.value) {
            startField.value = chosen;
            endField.value = '';
            selectingReturn = true;
        } else if (!isAvailable(vehicle.id, startField.value, chosen)) {
            startField.value = chosen;
            endField.value = '';
            selectingReturn = true;
            calMessage.textContent = 'That period crosses held dates. A new pickup has been selected.';
        } else {
            endField.value = chosen;
            selectingReturn = false;
            setDates(startField.value, endField.value);
        }
        render();
    });
    prev.addEventListener('click', () => { displayed = new Date(displayed.getFullYear(), displayed.getMonth() - 1, 1); render(); });
    next.addEventListener('click', () => { displayed = new Date(displayed.getFullYear(), displayed.getMonth() + 1, 1); render(); });
    [startField, endField].forEach(input => input.addEventListener('change', () => {
        selectingReturn = false;
        if (validDates(startField.value, endField.value)) setDates(startField.value, endField.value);
        render();
    }));
    book.addEventListener('click', () => {
        if (!validDates(startField.value, endField.value) || !isAvailable(vehicle.id, startField.value, endField.value)) return;
        setDates(startField.value, endField.value);
        location.href = `booking.html?vehicle=${encodeURIComponent(vehicle.id)}`;
    });
    window.addEventListener('storage', event => { if (event.key === storedBookingKey) { bookings = readBookings(); render(); } });
    render();
});
