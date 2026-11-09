'use strict';
const fleet = [
    { id:'mirage', name:'Mitsubishi Mirage', type:'Sedan', tag:'Compact sedan', seats:5, gear:'Automatic', fuel:'Gasoline', rate:1750, image:'images/rental-sedan-mirage.png', desc:'Compact sedan for daily travel.' },
    { id:'almera', name:'Nissan Almera', type:'Sedan', tag:'City sedan', seats:5, gear:'Automatic', fuel:'Gasoline', rate:1900, image:'images/rental-sedan-almera.png', desc:'Practical city and highway sedan.' },
    { id:'montero', name:'Mitsubishi Montero Sport', type:'SUV', tag:'Family SUV', seats:7, gear:'Automatic', fuel:'Diesel', rate:3500, image:'images/montero-sport-black.png', desc:'Spacious SUV for family trips.' },
    { id:'terra', name:'Nissan Terra', type:'SUV', tag:'Family SUV', seats:7, gear:'Automatic', fuel:'Diesel', rate:3400, image:'images/rental-suv-terra.png', desc:'Spacious SUV for families.' },
    { id:'brv', name:'Honda BR-V', type:'MPV / APV', tag:'Family people-mover', seats:7, gear:'Automatic', fuel:'Gasoline', rate:2900, image:'images/rental-mpv-br-v.png', desc:'Family-friendly people mover.' },
    { id:'livina', name:'Nissan Livina', type:'MPV / APV', tag:'Versatile MPV', seats:7, gear:'Automatic', fuel:'Gasoline', rate:2700, image:'images/rental-mpv-livina.png', desc:'Comfortable and flexible seating.' },
    { id:'hiace', name:'Toyota Hiace', type:'Van', tag:'Passenger van', seats:12, gear:'Manual', fuel:'Diesel', rate:3800, image:'images/rental-van-hiace.png', desc:'Van for bigger groups.' },
    { id:'nv350', name:'Nissan NV350', type:'Van', tag:'Passenger van', seats:12, gear:'Manual', fuel:'Diesel', rate:3800, image:'images/rental-van-nv350.png', desc:'Spacious group transportation.' },
    { id:'navara', name:'Nissan Navara', type:'Pickup', tag:'Utility pickup', seats:5, gear:'Automatic', fuel:'Diesel', rate:3300, image:'images/rental-pickup-navara.png', desc:'Pickup for travel and equipment.' },
    { id:'raptor', name:'Ford Ranger Raptor', type:'Pickup', tag:'Adventure pickup', seats:5, gear:'Automatic', fuel:'Diesel', rate:4200, image:'images/rental-pickup-raptor.png', desc:'Adventure-ready pickup.' }
];
const categories = [
    { type:'Sedan', image:'images/category-exact-sedan.png', tag:'City-ready and comfortable' },
    { type:'SUV', image:'images/category-exact-suv.png', tag:'Space for every adventure' },
    { type:'MPV / APV', image:'images/category-exact-mpv.png', tag:'Room for your whole group' },
    { type:'Van', image:'images/category-exact-van.png', tag:'Bigger plans, more seats' },
    { type:'Pickup', image:'images/category-exact-pickup.png', tag:'Built for getting things done' }
];
const storedBookingKey = 'jmtDemoReservations_v1';
const storedDatesKey = 'jmtRentalDates_v2';
const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
let bookings = [];
let toastTimeout;
const addOnRates = { gps: 150, cover: 250, helmet: 50 };
function getVehicle(id) { return fleet.find(item => item.id === id) || null; }
function localISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function addDays(date, n) { const [y, m, d] = date.split('-').map(Number); const x = new Date(y, m - 1, d + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; }
function rentalDays(start, end) { if (!start || !end || end < start) return 0; const a = start.split('-').map(Number), b = end.split('-').map(Number); return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000) + 1; }
function validDates(start, end) { return !!(start && end && start >= localISO() && end >= start && rentalDays(start, end) > 0); }
function formattedDate(date) { if (!date) return '—'; const [y, m, d] = date.split('-').map(Number); return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(y, m - 1, d)); }
// Booking data remains in this browser. Historical records default to Approved.
const blockingStatuses = ['Pending', 'Approved', 'Ongoing'];
const allBookingStatuses = ['Pending', 'Approved', 'Rejected', 'Ongoing', 'Completed', 'Cancelled'];

function readBookings() {
    try {
        const value = JSON.parse(localStorage.getItem(storedBookingKey) || '[]');
        if (!Array.isArray(value)) return [];

        return value
            .filter(record =>
                record &&
                typeof record.id === 'string' &&
                getVehicle(record.vehicleId) &&
                /^\d{4}-\d{2}-\d{2}$/.test(record.start || '') &&
                /^\d{4}-\d{2}-\d{2}$/.test(record.end || '')
            )
            .map(record => ({
                ...record,
                status: allBookingStatuses.includes(record.status)
                    ? record.status
                    : 'Approved', // Compatibility with the earlier demo version.
                pickupTime: record.pickupTime || '09:00',
                returnTime: record.returnTime || '17:00',
                pickupLocation: record.pickupLocation || 'Not recorded (previous demo)',
                returnLocation: record.returnLocation || 'Not recorded (previous demo)'
            }));
    } catch (error) {
        return [];
    }
}

function bookingBlocksDates(record) {
    return blockingStatuses.includes(record.status || 'Approved');
}


const fleetFlagsKey = 'jmtDemoFleetFlagsV1';
const maintenanceKey = 'jmtDemoMaintenanceV1';

// Read each vehicle's overall status.
function readFleetFlags() {
    try {
        return JSON.parse(localStorage.getItem(fleetFlagsKey) || '{}') || {};
    } catch (error) {
        return {};
    }
}

// Read the maintenance date ranges.
function readMaintenance() {
    try {
        const blocks = JSON.parse(
            localStorage.getItem(maintenanceKey) || '[]'
        );

        return Array.isArray(blocks) ? blocks : [];
    } catch (error) {
        return [];
    }
}

function isFleetDateAvailable(vehicleId, date) {
    const flags = readFleetFlags();

    if ((flags[vehicleId] || 'Available') !== 'Available') {
        return false;
    }

    return !readMaintenance().some(block =>
        block.vehicleId === vehicleId &&
        block.start <= date &&
        date <= block.end
    );
}


function saveBookings() { try { localStorage.setItem(storedBookingKey, JSON.stringify(bookings)); return true; } catch (e) { toast('Browser storage is disabled; booking is temporary for this page.'); return false; } }
function getDates() { let dates; try { dates = JSON.parse(sessionStorage.getItem(storedDatesKey) || 'null'); } catch (e) { } const start = dates?.start && dates.start >= localISO() ? dates.start : localISO(), end = dates?.end && dates.end >= start ? dates.end : addDays(start, 1); return { start, end }; }
function setDates(start, end) { try { sessionStorage.setItem(storedDatesKey, JSON.stringify({ start, end })); } catch (e) { } }
function isAvailable(id, start, end) {
    if (!validDates(start, end)) return false;

    if ((readFleetFlags()[id] || 'Available') !== 'Available') {
        return false;
    }

    if (readMaintenance().some(block =>
        block.vehicleId === id &&
        start <= block.end &&
        end >= block.start
    )) {
        return false;
    }

    return !bookings.some(record =>
        record.vehicleId === id &&
        bookingBlocksDates(record) &&
        start <= record.end &&
        end >= record.start
    );
}
function toast(message) { const el = $('toast'); if (!el) return; el.textContent = message; el.classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => el.classList.remove('show'), 3500); }
function queryHref(file, data) { const query = new URLSearchParams(data); return `${file}?${query.toString()}`; }
function closeDialog(el) { if (el?.open) el.close(); }
function addTextRow(dl, title, value) { const div = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = title; dd.textContent = value; div.append(dt, dd); dl.append(div); }

function initNav() { const toggle = $('menu-toggle'), nav = $('site-nav'); if (!toggle || !nav) return; toggle.addEventListener('click', () => { const opened = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(opened)); }); nav.addEventListener('click', () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }); }
function initIntro() {
    const intro = $('intro'), cover = $('intro-cover'), video = $('intro-car-video'), shell = $('intro-car-shell');
    if (!intro || !cover || !shell) return;
    let runId = 0, activeAnimations = [];
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    function cancelMotion() { activeAnimations.forEach(a => a.cancel()); activeAnimations = []; }
    function showHomepage() {
        runId++;
        cancelMotion();
        intro.style.display = 'none';
        if (video) video.pause();

    }
    async function move(el, frames, options, id) {
        if (id !== runId) return false;
        const animation = el.animate(frames, { fill: 'forwards', ...options });
        activeAnimations.push(animation);
        try { await animation.finished; } catch (e) { return false; }
        return id === runId;
    }
    async function start() {
        runId++;
        const id = runId;
        cancelMotion();
        intro.style.display = 'block';
        intro.classList.remove('lit', 'departing');
        cover.style.clipPath = 'inset(0 0% 0 0)';
        shell.classList.remove('no-video');
        const width = shell.getBoundingClientRect().width;
        const vw = window.innerWidth;
        // The model faces left; keep its front headlamp near the middle-right at its stop.
        const atRight = vw + 55;
        const stopped = Math.max(16, vw - width - (vw < 620 ? 16 : 45));
        const offLeft = -width - 80;
        shell.style.transform = `translate3d(${atRight}px,-50%,0)`;
        if (video) {
            try { video.pause(); video.currentTime = 0; } catch (e) { }
            video.play().catch(() => shell.classList.add('no-video'));
        }
        if (!await move(shell, [
            { transform: `translate3d(${atRight}px,-50%,0)` },
            { transform: `translate3d(${stopped}px,-50%,0)` }
        ], { duration: 1550, easing: 'cubic-bezier(.25,.65,.26,1)' }, id)) return;
        shell.style.transform = `translate3d(${stopped}px,-50%,0)`;
        cancelMotion();
        if (video) video.pause();
        await sleep(350);
        if (id !== runId) return;
        // Headlamp glows originate at x=4.8%, y=50.5% of the actual cut-out.
        intro.classList.add('lit');
        await sleep(1600);
        if (id !== runId) return;
        intro.classList.add('departing');
        if (video) video.play().catch(() => { });
        // Right-to-left reveal: the trailing (rear) edge of the car pulls the curtain.
        const rearAtStop = stopped + width * .97;
        const startReveal = Math.min(1, Math.max(0, (rearAtStop - vw) / (stopped - offLeft)));
        const carExit = move(shell, [
            { transform: `translate3d(${stopped}px,-50%,0)` },
            { transform: `translate3d(${offLeft}px,-50%,0)` }
        ], { duration: 1750, easing: 'linear' }, id);
        const curtainExit = move(cover, [
            { clipPath: 'inset(0 0% 0 0)', offset: 0 },
            { clipPath: 'inset(0 0% 0 0)', offset: startReveal },
            { clipPath: 'inset(0 100% 0 0)', offset: 1 }
        ], { duration: 1750, easing: 'linear' }, id);
        await Promise.all([carExit, curtainExit]);
        if (id !== runId) return;
        showHomepage();
    }
    if (video) {
        video.addEventListener('loadeddata', () => shell.classList.add('video-ready'));
        video.addEventListener('error', () => shell.classList.add('no-video'));
        if (video.readyState >= 2) shell.classList.add('video-ready');
    }
    $('skip-intro')?.addEventListener('click', showHomepage);
    $('replay-intro')?.addEventListener('click', start);
    // Replay the intro on every homepage load, including browser refresh.
    // Do not change scroll position: the browser restores the user's place.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) showHomepage();
    else start();
}

function initCategories() { const grid = $('category-grid'); if (!grid) return; grid.innerHTML = categories.map((cat, i) => `<a class="category-card" href="${queryHref('vehicles.html', { type: cat.type })}"><div class="category-title"><h3>${cat.type.toUpperCase()}</h3><small>0${i + 1}</small></div><img src="${cat.image}" alt="Photorealistic vehicle concept render for ${cat.type}" loading="lazy"><div class="category-bottom"><span>${cat.tag}</span><b aria-hidden="true">↗</b></div></a>`).join(''); }
function initShowroom() {
    const grid = $('showroom-grid'); if (!grid) return; const pills = $('filter-pills'); let filter = params.get('type'); if (filter && !categories.some(c => c.type === filter)) filter = 'All'; if (!filter) filter = 'All'; let search = '';
    function update() {
        const models = fleet.filter(v => (filter === 'All' || v.type === filter) && `${v.name} ${v.type} ${v.tag}`.toLowerCase().includes(search)); $('showroom-title').innerHTML = filter === 'All' ? 'EXPLORE THE<br><em>SHOWROOM.</em>' : `${filter.toUpperCase()}<br><em>SHOWROOM.</em>`; $('showroom-intro').textContent = filter === 'All' ? 'Explore available vehicle types and illustrative rental rates. Choose a model to view its details.' : `Browse sample ${filter} models and choose one that suits your trip.`; $('showroom-count').textContent = `${models.length} model${models.length === 1 ? '' : 's'} found · Prices are illustrative`; pills.querySelectorAll('button').forEach(b => { const active = b.dataset.type === filter; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
        if (!models.length) { grid.innerHTML = '<div class="empty-state">No vehicles match your search. Try another model or category.</div>'; return; }
        grid.innerHTML = models.map(v => `<article class="vehicle-card"><div class="vehicle-card-visual"><span class="vehicle-tag">${v.type}</span><img src="${v.image}" alt="Photorealistic concept render of ${v.name}" loading="lazy"></div><div class="vehicle-card-info"><h3>${v.name}</h3><p class="vehicle-sub">${v.tag}</p><div class="spec-row"><span>◉ ${v.seats} seats</span><span>◇ ${v.gear}</span><span>● ${v.fuel}</span></div><div class="vehicle-price-line"><small>ESTIMATED RATE / DAY</small><strong>${peso.format(v.rate)}</strong></div><div class="vehicle-actions"><button class="button button-ghost-dark" type="button" data-detail="${v.id}">View details</button><a class="button button-red" href="${queryHref('booking.html', { vehicle: v.id })}">Book this ↗</a></div></div></article>`).join('');
    }
    pills.innerHTML = ['All', ...categories.map(c => c.type)].map(t => `<button type="button" data-type="${t}" aria-pressed="false">${t === 'All' ? 'All models' : t}</button>`).join('');
    pills.addEventListener('click', e => { const b = e.target.closest('[data-type]'); if (!b) return; filter = b.dataset.type; try { history.replaceState({}, '', filter === 'All' ? 'vehicles.html' : queryHref('vehicles.html', { type: filter })); } catch (e) { } update(); });
    $('vehicle-search').addEventListener('input', e => { search = e.target.value.trim().toLowerCase(); update(); });
    const dialog = $('detail-dialog'); grid.addEventListener('click', e => { const b = e.target.closest('[data-detail]'); if (!b) return; const v = getVehicle(b.dataset.detail); if (!v) return; $('detail-photo').src = v.image; $('detail-photo').alt = `Photorealistic render of ${v.name}`; $('detail-name').textContent = v.name; $('detail-desc').textContent = v.desc; $('detail-price').textContent = peso.format(v.rate); $('detail-specs').innerHTML = ''; for (const [label, value] of [['Category', v.type], ['Passenger seats', v.seats], ['Transmission', v.gear], ['Fuel type', v.fuel]]) { const d = document.createElement('div'), small = document.createElement('small'), bold = document.createElement('b'); small.textContent = label; bold.textContent = value; d.append(small, bold); $('detail-specs').append(d); } $('detail-book').onclick = () => location.href = queryHref('booking.html', { vehicle: v.id }); dialog.showModal(); });
    dialog.querySelector('[data-close-dialog]').addEventListener('click', () => closeDialog(dialog)); dialog.addEventListener('click', e => { if (e.target === dialog) closeDialog(dialog); }); update();
}
function initAvailability() {
    const form = $('availability-form'); if (!form) return; const { start, end } = getDates(); $('availability-start').value = start; $('availability-end').value = end;
    function render() { const s = $('availability-start').value, e = $('availability-end').value; const valid = validDates(s, e); $('availability-caption').textContent = valid ? `${formattedDate(s)} – ${formattedDate(e)} · ${rentalDays(s, e)} calendar day(s) · Sample availability only` : 'Please choose valid dates to check the table.'; const body = $('availability-body'); body.innerHTML = ''; for (const category of categories) { const group = fleet.filter(v => v.type === category.type); group.forEach((v, index) => { const tr = document.createElement('tr'); if (index === 0) { const th = document.createElement('th'); th.scope = 'rowgroup'; th.rowSpan = group.length; th.textContent = category.type; tr.append(th); } for (const val of [v.name, String(v.seats), v.gear, peso.format(v.rate)]) { const td = document.createElement('td'); td.textContent = val; tr.append(td); } const td = document.createElement('td'); const pill = document.createElement('span'); const available = valid && isAvailable(v.id, s, e); pill.className = `status-pill ${available ? '' : 'is-booked'}`; pill.textContent = valid ? (available ? 'Available' : 'Held / reserved (demo)') : 'Select dates'; td.append(pill); tr.append(td); const action = document.createElement('td'); const link = document.createElement('a'); link.className = 'table-link'; link.textContent = 'Book ↗'; link.href = queryHref('booking.html', { vehicle: v.id }); action.append(link); tr.append(action); body.append(tr); }); } }
    for (const id of ['availability-start', 'availability-end']) { $(id).min = localISO(); $(id).addEventListener('change', () => { if ($('availability-start').value) $('availability-end').min = $('availability-start').value; render(); }); }
    form.addEventListener('submit', e => { e.preventDefault(); const s = $('availability-start').value, end = $('availability-end').value; if (!validDates(s, end)) { toast('Choose dates from today, with return date on or after pick-up.'); return; } setDates(s, end); render(); toast('Sample availability updated for your selected dates.'); }); render();
}
function initBooking() {
    const form = $('booking-form'); if (!form) return; const vSelect = $('booking-vehicle'), startInput = $('booking-start'), endInput = $('booking-end'); const current = getDates(); vSelect.innerHTML = '<option value="">Select a vehicle</option>' + fleet.map(v => `<option value="${v.id}">${v.name} · ${v.type} · ${peso.format(v.rate)}/day</option>`).join('');
    vSelect.value = getVehicle(params.get('vehicle'))?.id || ''; startInput.value = current.start; endInput.value = current.end; startInput.min = localISO(); endInput.min = current.start;
    const breakdown = () => { const v = getVehicle(vSelect.value), start = startInput.value, end = endInput.value, days = rentalDays(start, end), base = v && validDates(start, end) ? v.rate * days : 0, addons = []; if ($('addon-gps').checked) addons.push({ name: 'GPS navigation', amount: days * addOnRates.gps }); if ($('addon-cover').checked) addons.push({ name: 'Extra coverage (demo)', amount: days * addOnRates.cover }); if ($('addon-helmet').checked && v?.type === 'Motorcycle') addons.push({ name: 'Helmet', amount: days * addOnRates.helmet }); const extras = validDates(start, end) ? addons.reduce((sum, a) => sum + a.amount, 0) : 0; return { v, start, end, days, base, addons, extras, total: base + extras }; };
    function update() { const b = breakdown(); startInput.min = localISO(); endInput.min = startInput.value || localISO(); $('helmet-row').hidden = b.v?.type !== 'Motorcycle'; if (b.v?.type !== 'Motorcycle') $('addon-helmet').checked = false; const img = $('booking-photo'); img.hidden = !b.v; if (b.v) img.src = b.v.image; else img.removeAttribute('src'); const empty = $('booking-empty-preview'); if (empty) empty.hidden = !!b.v; img.alt = b.v ? `Render of ${b.v.name}` : 'Example car'; $('booking-model').textContent = b.v?.name || 'Choose a model'; $('booking-category').textContent = b.v?.type || 'Vehicle type'; $('s-rate').textContent = peso.format(b.v?.rate || 0); $('s-days').textContent = b.days || '—'; $('s-base').textContent = peso.format(b.base); $('s-addons').textContent = peso.format(b.extras); $('s-total').textContent = peso.format(b.total); const label = $('s-status'); label.classList.remove('is-error'); if (!b.v) label.textContent = 'Choose a vehicle to see your estimate.'; else if (!validDates(b.start, b.end)) { label.textContent = 'Choose a valid rental date range.'; label.classList.add('is-error'); } else if (!isAvailable(b.v.id, b.start, b.end)) { label.textContent = 'This model is already reserved for those demo dates. Try another.'; label.classList.add('is-error'); } else label.textContent = 'This model is open for the selected demo dates.'; return b; }
    vSelect.addEventListener('change', update);[startInput, endInput].forEach(input => input.addEventListener('change', () => { if (validDates(startInput.value, endInput.value)) setDates(startInput.value, endInput.value); update(); })); for (const id of ['addon-gps', 'addon-cover', 'addon-helmet']) $(id).addEventListener('change', update);
    const dialog = $('review-dialog'); let pending = null;
    form.addEventListener('submit', e => { e.preventDefault(); $('booking-error').hidden = true; const b = update(); startInput.setCustomValidity(b.start < localISO() ? 'Pick-up cannot be in the past.' : ''); endInput.setCustomValidity(b.end < b.start ? 'Return date cannot be before pick-up.' : ''); if (!form.reportValidity()) return; if (!validDates(b.start, b.end)) { error('Choose valid dates: return date must be on or after pick-up.'); return; } if (!isAvailable(b.v.id, b.start, b.end)) { error('That vehicle is already reserved for these demo dates.'); return; } pending = b; const dl = $('review-list'); dl.replaceChildren(); addTextRow(dl, 'Customer', $('customer-name').value.trim()); addTextRow(dl, 'Vehicle', b.v.name); addTextRow(dl, 'Rental dates', `${formattedDate(b.start)} — ${formattedDate(b.end)}`); addTextRow(dl, 'Number of days', String(b.days)); addTextRow(dl, 'Add-ons', b.addons.length ? b.addons.map(a => a.name).join(', ') : 'None'); addTextRow(dl, 'Estimated total', peso.format(b.total)); dialog.showModal(); });
    function error(message) { const el = $('booking-error'); el.hidden = false; el.textContent = message; toast(message); }
    $('confirm-booking').addEventListener('click', () => { if (!pending) return; const b = pending; if (!isAvailable(b.v.id, b.start, b.end)) { closeDialog(dialog); error('This vehicle was reserved for those demo dates. Try another period.'); update(); return; } const record = { id: 'JMT-' + Date.now().toString(36).toUpperCase().slice(-7) + Math.random().toString(36).slice(2, 4).toUpperCase(), vehicleId: b.v.id, start: b.start, end: b.end, total: b.total, createdAt: Date.now() }; bookings.unshift(record); saveBookings(); setDates(b.start, b.end); location.href = queryHref('reservations.html', { success: record.id }); });
    dialog.querySelectorAll('[data-close-dialog]').forEach(b => b.addEventListener('click', () => closeDialog(dialog))); dialog.addEventListener('click', e => { if (e.target === dialog) closeDialog(dialog); }); update();
}
function initReservations() {
    const tbody = $('booking-records'); if (!tbody) return; const success = params.get('success'); if (success && bookings.some(r => r.id === success)) $('records-success').hidden = false;
    function render() { tbody.replaceChildren(); if (!bookings.length) { const tr = document.createElement('tr'), td = document.createElement('td'); td.colSpan = 6; td.textContent = 'No browser-only bookings yet. Choose a vehicle to make your first demonstration reservation.'; tr.append(td); tbody.append(tr); return; } for (const r of bookings) { const v = getVehicle(r.vehicleId), tr = document.createElement('tr'); for (const value of [r.id, v?.name || 'Unknown', `${formattedDate(r.start)} — ${formattedDate(r.end)}`, String(rentalDays(r.start, r.end)), peso.format(r.total || 0)]) { const td = document.createElement('td'); td.textContent = value; tr.append(td); } const td = document.createElement('td'), button = document.createElement('button'); button.className = 'cancel-btn'; button.dataset.cancel = r.id; button.textContent = 'Cancel demo'; button.type = 'button'; td.append(button); tr.append(td); tbody.append(tr); } }
    tbody.addEventListener('click', e => { const button = e.target.closest('[data-cancel]'); if (!button) return; const id = button.dataset.cancel; if (!window.confirm(`Cancel demo booking ${id}?`)) return; bookings = bookings.filter(r => r.id !== id); saveBookings(); $('records-success').hidden = true; render(); toast('Demonstration booking canceled.'); }); render();
}
function initialize() { bookings = readBookings(); initNav(); initIntro(); initCategories(); initShowroom(); initAvailability(); initBooking(); initReservations(); }
document.addEventListener('DOMContentLoaded', initialize);


/* ITWS 02 - UNIT 6: DOM Manipulation */

// Allows customers to compare up to 3 vehicles
function initVehicleComparison() {
    const grid = document.getElementById('showroom-grid');
    if (!grid) return;

    const selected = new Set();
    const panel = document.createElement('section');
    panel.id = 'compare-panel';
    panel.className = 'compare-panel';
    panel.hidden = true;
    grid.insertAdjacentElement('afterend', panel);

    function updateButtons() {
        grid.querySelectorAll('.vehicle-card').forEach(card => {
            const action = card.querySelector('[data-detail]');
            if (!action) return;

            const id = action.dataset.detail;
            let button = card.querySelector('[data-compare]');

            if (!button) {
                button = document.createElement('button');
                button.type = 'button';
                button.className = 'compare-toggle';
                button.dataset.compare = id;

                card.querySelector('.vehicle-actions')
                    .insertAdjacentElement('afterend', button);
            }

            const active = selected.has(id);
            button.textContent = active
                ? '✓ Added to comparison'
                : '+ Add to comparison';

            button.classList.toggle('selected', active);
            button.setAttribute('aria-pressed', String(active));
        });
    }

    function renderComparison() {
        panel.replaceChildren();
        panel.hidden = selected.size === 0;

        if (!selected.size) return;

        const models = [...selected]
            .map(id => getVehicle(id))
            .filter(Boolean);

        const heading = document.createElement('div');
        heading.className = 'compare-heading';

        const title = document.createElement('h2');
        title.textContent = `Compare vehicles (${models.length}/3)`;

        const clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'compare-clear';
        clear.dataset.clearCompare = '';
        clear.textContent = 'Clear all';

        heading.append(title, clear);
        panel.append(heading);

        // Create removable vehicle labels
        const chips = document.createElement('div');
        chips.className = 'compare-chips';

        models.forEach(vehicle => {
            const chip = document.createElement('div');
            chip.className = 'compare-chip';

            const name = document.createElement('span');
            name.textContent = vehicle.name;

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.dataset.removeCompare = vehicle.id;
            remove.textContent = '×';
            remove.setAttribute(
                'aria-label',
                `Remove ${vehicle.name} from comparison`
            );

            chip.append(name, remove);
            chips.append(chip);
        });

        panel.append(chips);

        if (models.length < 2) {
            const hint = document.createElement('p');
            hint.className = 'compare-hint';
            hint.textContent =
                'Select one more model to see a side-by-side comparison.';
            panel.append(hint);
            return;
        }

        // Dynamically create a semantic HTML table
        const wrapper = document.createElement('div');
        wrapper.className = 'compare-table-wrap';

        const table = document.createElement('table');
        table.className = 'compare-table';

        const caption = document.createElement('caption');
        caption.textContent =
            'Selected vehicle specifications and illustrative prices';

        const thead = document.createElement('thead');
        const header = document.createElement('tr');

        ['Feature', ...models.map(v => v.name)].forEach(label => {
            const th = document.createElement('th');
            th.scope = 'col';
            th.textContent = label;
            header.append(th);
        });

        thead.append(header);

        const tbody = document.createElement('tbody');

        const rows = [
            ['Category', v => v.type],
            ['Seats', v => String(v.seats)],
            ['Transmission', v => v.gear],
            ['Fuel', v => v.fuel],
            ['Daily rate', v => peso.format(v.rate)]
        ];

        rows.forEach(([label, value]) => {
            const tr = document.createElement('tr');
            const th = document.createElement('th');

            th.scope = 'row';
            th.textContent = label;
            tr.append(th);

            models.forEach(vehicle => {
                const td = document.createElement('td');
                td.textContent = value(vehicle);
                tr.append(td);
            });

            tbody.append(tr);
        });

        table.append(caption, thead, tbody);
        wrapper.append(table);
        panel.append(wrapper);
    }

    // Handle comparison button clicks
    grid.addEventListener('click', event => {
        const button = event.target.closest('[data-compare]');
        if (!button) return;

        const id = button.dataset.compare;

        if (selected.has(id)) {
            selected.delete(id);
        } else if (selected.size >= 3) {
            toast('You can compare up to three vehicles.');
            return;
        } else {
            selected.add(id);
        }

        updateButtons();
        renderComparison();
    });

    // Remove one vehicle or clear the comparison
    panel.addEventListener('click', event => {
        const remove = event.target.closest('[data-remove-compare]');

        if (remove) {
            selected.delete(remove.dataset.removeCompare);
        } else if (event.target.closest('[data-clear-compare]')) {
            selected.clear();
        } else {
            return;
        }

        updateButtons();
        renderComparison();
    });

    // Refresh buttons when the existing showroom changes
    document.getElementById('filter-pills')
        .addEventListener('click', updateButtons);

    document.getElementById('vehicle-search')
        .addEventListener('input', updateButtons);

    updateButtons();
}


/* ITWS 02 - UNIT 7: Client-Side Form Validation */

function initBookingValidation() {
    const form = document.getElementById('booking-form');
    if (!form) return;

    const ids = [
        'booking-vehicle',
        'booking-start',
        'booking-end',
        'booking-pickup-time',
        'booking-return-time',
        'booking-pickup-location',
        'booking-return-location',
        'customer-name',
        'customer-phone',
        'customer-email',
        'customer-license'
    ];

    const fields = ids.map(id => document.getElementById(id));
    const touched = new Set();
    const messages = new Map();

    let attempted = false;

    // Create an inline feedback message for every input
    fields.forEach(field => {
        const message = document.createElement('span');
        message.className = 'field-feedback';
        message.id = `${field.id}-feedback`;
        message.setAttribute('aria-live', 'polite');

        field.insertAdjacentElement('afterend', message);
        field.setAttribute('aria-describedby', message.id);

        messages.set(field.id, message);
    });

    function checkField(field) {
        const value = field.value.trim();
        let error = '';

        // Conditions and Regular Expressions (RegEx)
        switch (field.id) {

            case 'booking-vehicle':
                if (!getVehicle(value)) {
                    error = 'Please select a vehicle.';
                }
                break;

            case 'booking-start':
                if (!value) {
                    error = 'Please select your pick-up date.';
                } else if (value < localISO()) {
                    error = 'Pick-up cannot be in the past.';
                }
                break;

            case 'booking-end':
                if (!value) {
                    error = 'Please select your return date.';
                } else if (
                    value < document.getElementById('booking-start').value
                ) {
                    error = 'Return date cannot be earlier than pick-up.';
                } else if (getVehicle(document.getElementById('booking-vehicle').value) &&
                    validDates(document.getElementById('booking-start').value, value) &&
                    !isAvailable(document.getElementById('booking-vehicle').value,
                        document.getElementById('booking-start').value, value)) {
                    error = 'This vehicle is reserved during the selected dates.';
                }
                break;

            case 'booking-pickup-time':
                if (!value) {
                    error = 'Choose a pick-up time.';
                } else if (document.getElementById('booking-start').value === localISO()) {
                    const now = new Date();
                    const chosen = Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
                    if (chosen <= now.getHours() * 60 + now.getMinutes()) {
                        error = 'Pick-up time has passed. Choose a later time or date.';
                    }
                }
                break;

            case 'booking-return-time':
                if (!value) {
                    error = 'Choose a return time.';
                } else if (
                    document.getElementById('booking-start').value ===
                    document.getElementById('booking-end').value &&
                    value <= document.getElementById('booking-pickup-time').value
                ) {
                    error = 'Same-day return must be later than pick-up.';
                }
                break;

            case 'booking-pickup-location':
            case 'booking-return-location':
                if (!value) {
                    error = 'Choose a proposed pickup or return arrangement.';
                }
                break;

            case 'customer-name':
                if (!value) {
                    error = 'Please enter your full name.';
                } else if (
                    value.replace(/[^\p{L}]/gu, '').length < 3
                ) {
                    error = 'Enter at least 3 letters.';
                } else if (
                    !/^[\p{L}\p{M} .'-]+$/u.test(value)
                ) {
                    error = 'Use letters, spaces, apostrophes or hyphens.';
                }
                break;

            case 'customer-phone':
                if (!/^09\d{9}$/.test(value)) {
                    error =
                        'Enter 11 digits beginning with 09 (e.g., 09171234567).';
                }
                break;

            case 'customer-email':
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    error = 'Please enter a valid email address.';
                }
                break;

            case 'customer-license':
                if (!/^[A-Za-z0-9-]{5,24}$/.test(value)) {
                    error =
                        'Use 5–24 letters, numbers or hyphens (demo format only).';
                }
                break;
        }

        // HTML5 Constraint Validation API
        field.setCustomValidity('');

        if (!error && !field.validity.valid) {
            error = field.validity.valueMissing
                ? 'This field is required.'
                : 'Please check this value.';
        }

        field.setCustomValidity(error);

        // Display messages using DOM manipulation
        const show = attempted || touched.has(field.id);
        const message = messages.get(field.id);

        message.textContent = show
            ? (error || '✓ Looks good')
            : '';

        message.classList.toggle('error', show && Boolean(error));
        message.classList.toggle('success', show && !error);

        field.classList.toggle('input-invalid', show && Boolean(error));
        field.classList.toggle('input-valid', show && !error);

        field.setAttribute(
            'aria-invalid',
            String(show && Boolean(error))
        );

        return !error;
    }

    // Validate as the user enters information
    fields.forEach(field => {
        for (const type of ['input', 'change']) {
            field.addEventListener(type, () => {
                touched.add(field.id);
                checkField(field);

                if (field.id === 'booking-start' || field.id === 'booking-end') {
                    checkField(document.getElementById('booking-end'));
                    checkField(document.getElementById('booking-return-time'));
                    checkField(document.getElementById('booking-pickup-time'));
                }
                if (field.id === 'booking-pickup-time') {
                    checkField(document.getElementById('booking-return-time'));
                }
            });
        }

        field.addEventListener('blur', () => {
            touched.add(field.id);
            checkField(field);
        });
    });

    // Prevent submission when information is invalid
    form.addEventListener('submit', event => {
        attempted = true;

        const invalid = fields.find(field => !checkField(field));
        fields.forEach(checkField);

        if (!invalid) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        invalid.focus();
        invalid.reportValidity();
    }, true);

    // HTML5 may block invalid fields before submit is fired
    form.addEventListener('invalid', event => {
        attempted = true;

        if (messages.has(event.target.id)) {
            touched.add(event.target.id);
            checkField(event.target);
        }
    }, true);



}


// Initialize the new features after the original website
document.addEventListener('DOMContentLoaded', () => {
    initVehicleComparison();
    initBookingValidation();
});


// Navigation is now authored consistently in every HTML page.
// The existing initNav() function still handles the mobile menu toggle.
