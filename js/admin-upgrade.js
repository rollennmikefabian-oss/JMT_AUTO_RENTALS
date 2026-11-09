
'use strict';

/*
 * JMT Express Rentals
 * Admin Dashboard Upgrade
 * ITWS 02 - DOM Manipulation and Form Validation
 *
 * This is a classroom demonstration.
 * Records are stored in the browser using localStorage.
 * This is not a secure admin system.
 */

document.addEventListener('DOMContentLoaded', () => {
    const dashboard = document.getElementById('staff-dashboard');

    if (!dashboard || dashboard.hidden) return;

    const sections = [
        ...dashboard.querySelectorAll('.jmt-admin-section')
    ];

    const stats = dashboard.querySelector('.jmt-admin-stats');
    const requestsTable = document.getElementById('jmt-admin-records');
    const fleetHost = document.getElementById('staff-fleet-overview');

    // 1. DASHBOARD NAVIGATION

    const navigation = document.createElement('nav');

    navigation.className = 'staff-tabs';
    navigation.setAttribute('aria-label', 'Staff dashboard sections');

    const pages = [
        ['overview', 'Overview'],
        ['requests', 'Reservations'],
        ['calendar', 'Fleet calendar'],
        ['fleet', 'Manage vehicles']
    ];

    function showPage(page) {
        const isOverview = page === 'overview';
        stats.hidden = !isOverview;
        const overviewNote = document.getElementById('staff-overview-note');
        if (overviewNote) overviewNote.hidden = !isOverview;
        if (typeof quickLinks !== 'undefined') quickLinks.hidden = !isOverview;

        sections.forEach((section, index) => {
            section.hidden = page !== pages[index + 1][0];
        });

        navigation.querySelectorAll('button').forEach(button => {
            const current = button.dataset.page === page;

            button.classList.toggle('active', current);
            button.setAttribute('aria-pressed', String(current));
        });
    }

    const menuIcons = {
        'overview': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
        'requests': '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5h6M9 10h6M9 14h6M9 18h4"/>',
        'calendar': '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h3M14 14h3"/>',
        'fleet': '<path d="M5 16 3 12l2-5c.3-.9 1-1 2-1h10c1 0 2 .3 2 1l2 5-2 4H5Z"/><path d="M4 12h16M7 12h2M15 12h2M6 16v2M18 16v2"/>',
    };

    pages.forEach(([id, label]) => {
        const button = document.createElement('button');

        button.type = 'button';
        button.dataset.page = id;
        button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${menuIcons[id]}</svg><span>${label}</span>`;

        button.addEventListener('click', () => {
            showPage(id);
        });

        navigation.append(button);
    });

    document.getElementById('staff-sidebar-nav').append(navigation);


    // 2. DASHBOARD QUICK LINKS

    const quickLinks = document.createElement('div');

    quickLinks.className = 'staff-quick-links';

    const shortcuts = [
        ['requests', 'Review rental requests'],
        ['calendar', 'Check fleet calendar'],
        ['fleet', 'Manage vehicles']
    ];

    shortcuts.forEach(([page, label]) => {
        const button = document.createElement('button');

        button.type = 'button';
        button.textContent = label + ' →';

        button.addEventListener('click', () => {
            showPage(page);
        });

        quickLinks.append(button);
    });

    stats.insertAdjacentElement('afterend', quickLinks);

    navigation.addEventListener('click', event => {
        const button = event.target.closest('button[data-page]');

        if (button) {
            quickLinks.hidden = button.dataset.page !== 'overview';
        }
    });

    quickLinks.addEventListener('click', () => {
        quickLinks.hidden = true;
    });

    showPage('overview');


    // 3. FLEET CALENDAR FILTER

    const calendarHeading = sections[1]
        .querySelector('.jmt-admin-calendar-head');

    const calendarFilter = document.createElement('label');

    calendarFilter.className = 'staff-calendar-filter';
    calendarFilter.textContent = 'Show vehicle';

    const filterSelect = document.createElement('select');

    filterSelect.id = 'staff-calendar-vehicle';
    filterSelect.add(new Option('All vehicles', 'All'));

    fleet.forEach(vehicle => {
        filterSelect.add(new Option(vehicle.name, vehicle.id));
    });

    calendarFilter.append(filterSelect);
    calendarHeading.append(calendarFilter);

    filterSelect.addEventListener('change', refreshDashboard);

    function refreshDashboard() {
        window.dispatchEvent(new Event('jmt:refresh-admin'));
    }


    // 4. RENTAL REQUEST DETAILS

    const detailsDialog = document.createElement('dialog');

    detailsDialog.className = 'staff-dialog';

    detailsDialog.innerHTML = `
        <div class="staff-dialog-top">
            <h2>Rental request details</h2>

            <button type="button" data-close-details
                aria-label="Close details">×</button>
        </div>

        <dl id="staff-request-details"
            class="staff-details-list"></dl>

        <p class="fine-print">
            Customer names and driver's licenses are not stored
            by this demo.
        </p>
    `;

    dashboard.append(detailsDialog);

    detailsDialog.querySelector('[data-close-details]')
        .addEventListener('click', () => {
            detailsDialog.close();
        });

    function addDetail(list, title, value) {
        const row = document.createElement('div');
        const term = document.createElement('dt');
        const description = document.createElement('dd');

        term.textContent = title;
        description.textContent = String(value);

        row.append(term, description);
        list.append(row);
    }

    function showRequest(reference) {
        const record = readBookings().find(item => {
            return item.id === reference;
        });

        if (!record) return;

        const list = document.getElementById('staff-request-details');

        list.replaceChildren();

        const vehicle = getVehicle(record.vehicleId);

        const items = [
            ['Reference', record.id],
            ['Status', record.status],
            ['Vehicle', vehicle?.name || 'Unknown model'],

            [
                'Pickup',
                `${formattedDate(record.start)}, ${record.pickupTime}`
            ],

            [
                'Return',
                `${formattedDate(record.end)}, ${record.returnTime}`
            ],

            ['Pickup location', record.pickupLocation],
            ['Return location', record.returnLocation],
            ['Days (demo)', rentalDays(record.start, record.end)],

            [
                'Add-ons',
                (record.addonNames || []).join(', ') || 'None'
            ],

            ['Estimated total', peso.format(record.total || 0)]
        ];

        items.forEach(([label, value]) => {
            addDetail(list, label, value);
        });

        // Include inspection details if the rental was completed.
        if (record.inspection) {
            const inspection = record.inspection;

            addDetail(list, 'Fuel at return', inspection.fuel);
            addDetail(list, 'Carwash at return', inspection.carwash);
            addDetail(list, 'Vehicle condition', inspection.condition);

            addDetail(
                list,
                'Inspection notes',
                inspection.notes || 'None'
            );
        }

        detailsDialog.showModal();
    }


    // 5. VEHICLE RETURN INSPECTION

    const inspectionDialog = document.createElement('dialog');

    inspectionDialog.className = 'staff-dialog';

    inspectionDialog.innerHTML = `
        <form id="staff-inspection-form">

            <div class="staff-dialog-top">
                <h2>Complete rental inspection</h2>

                <button type="button" data-close-inspection
                    aria-label="Close">×</button>
            </div>

            <p class="fine-print">
                Record the vehicle's condition before completing
                the demo rental.
            </p>

            <label>
                Fuel level at return

                <select name="fuel" required>
                    <option value="">Choose...</option>
                    <option>Full tank</option>
                    <option>Below full tank</option>
                </select>
            </label>

            <label>
                Carwash at return

                <select name="carwash" required>
                    <option value="">Choose...</option>
                    <option>Washed and clean</option>
                    <option>Not washed / needs cleaning</option>
                </select>
            </label>

            <label>
                Vehicle inspection

                <select name="condition" required>
                    <option value="">Choose...</option>
                    <option>Acceptable condition</option>
                    <option>Needs staff review</option>
                </select>
            </label>

            <label>
                Inspection notes (recommended for any issues)

                <textarea name="notes" rows="3" maxlength="300"
                    placeholder="Describe fuel, cleaning or vehicle condition issues"></textarea>
            </label>

            <p class="fine-print">
                Any fees require business approval.
                No automatic charge is created.
            </p>

            <button type="submit" class="staff-primary">
                Save inspection & complete
            </button>

        </form>
    `;

    dashboard.append(inspectionDialog);

    const inspectionForm = inspectionDialog.querySelector('form');

    let inspectionReference = null;

    inspectionDialog.querySelector('[data-close-inspection]')
        .addEventListener('click', () => {
            inspectionDialog.close();
        });


    // Intercept completion before the original admin.js processes it.
    requestsTable.addEventListener('click', event => {
        const button = event.target.closest('button');

        if (!button) return;

        // Open request details.
        if (button.dataset.viewReference) {
            showRequest(button.dataset.viewReference);
            return;
        }

        // Other actions are handled by the existing admin.js.
        if (button.dataset.nextStatus !== 'Completed') return;

        event.preventDefault();
        event.stopImmediatePropagation();

        inspectionReference = button.dataset.reference;

        inspectionForm.reset();
        inspectionDialog.showModal();

    }, true);


    // Save the inspection and complete the rental.
    inspectionForm.addEventListener('submit', event => {
        event.preventDefault();

        const form = new FormData(inspectionForm);
        const records = readBookings();

        const record = records.find(item => {
            return item.id === inspectionReference;
        });

        if (!record || record.status !== 'Ongoing') return;

        const fuel = form.get('fuel');
        const carwash = form.get('carwash');
        const condition = form.get('condition');
        const notes = String(form.get('notes') || '').trim();

        if (!fuel || !carwash || !condition) return;

        const hasIssue =
            fuel !== 'Full tank' ||
            carwash !== 'Washed and clean' ||
            condition !== 'Acceptable condition';

        if (hasIssue && !notes) {
            alert(
                'Please describe any return issues in the inspection notes.'
            );
            return;
        }

        record.status = 'Completed';

        record.inspection = {
            fuel,
            carwash,
            condition,
            notes,
            checkedAt: Date.now()
        };

        bookings = records;

        if (!saveBookings()) return;

        inspectionDialog.close();

        document.getElementById('staff-action-message').textContent =
            `${record.id} completed with a saved vehicle return inspection.`;

        refreshDashboard();
    });


    // 6. LOCAL STORAGE HELPER

    function saveJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;

        } catch (error) {
            alert(
                'Browser storage is unavailable. Nothing was saved.'
            );
            return false;
        }
    }


    // 7. VEHICLE MAINTENANCE SCHEDULING

    const maintenanceBox = document.createElement('div');

    maintenanceBox.className = 'staff-maintenance-box';

    maintenanceBox.innerHTML = `
        <h3>Block a vehicle for specific dates</h3>

        <p class="fine-print">
            Dates marked for maintenance are blocked
            in customer calendars on this browser.
        </p>

        <form id="staff-maintenance-form"
            class="staff-maintenance-form">

            <label>
                Vehicle
                <select name="vehicleId" required></select>
            </label>

            <label>
                From
                <input name="start" type="date" required>
            </label>

            <label>
                Through
                <input name="end" type="date" required>
            </label>

            <label>
                Reason
                <input name="reason" maxlength="100"
                    placeholder="Scheduled maintenance" required>
            </label>

            <button class="staff-primary" type="submit">
                Block dates
            </button>
        </form>

        <div id="staff-maintenance-list"
            class="staff-maintenance-list"></div>
    `;

    sections[2].append(maintenanceBox);

    const maintenanceForm = document.getElementById(
        'staff-maintenance-form'
    );

    const maintenanceSelect = maintenanceForm.elements.vehicleId;

    fleet.forEach(vehicle => {
        maintenanceSelect.add(
            new Option(vehicle.name, vehicle.id)
        );
    });

    maintenanceForm.elements.start.min = localISO();
    maintenanceForm.elements.end.min = localISO();

    maintenanceForm.elements.start.value = localISO();
    maintenanceForm.elements.end.value = localISO();


    // Prevent maintenance blocks that overlap active requests.
    function hasActiveConflict(id, start, end) {
        return readBookings().some(record =>
            record.vehicleId === id &&
            bookingBlocksDates(record) &&
            start <= record.end &&
            end >= record.start
        );
    }


    // 8. VEHICLE MANAGEMENT

    function renderFleet() {
        fleetHost.replaceChildren();

        const flags = readFleetFlags();

        fleet.forEach(vehicle => {
            const card = document.createElement('article');
            card.className = 'staff-fleet-card';

            // Vehicle image
            const photo = document.createElement('img');

            photo.src = vehicle.image;
            photo.alt = `${vehicle.name} demo illustration`;

            // Vehicle information
            const info = document.createElement('div');

            const heading = document.createElement('strong');
            heading.textContent = vehicle.name;

            const rate = document.createElement('small');

            rate.textContent =
                `${vehicle.type} · ${peso.format(vehicle.rate)}/day`;

            info.append(heading, rate);

            // Vehicle status selector
            const selector = document.createElement('select');

            selector.setAttribute(
                'aria-label',
                `Set ${vehicle.name} status`
            );

            const statuses = [
                'Available',
                'Maintenance',
                'Unavailable'
            ];

            statuses.forEach(status => {
                selector.add(new Option(status, status));
            });

            selector.value = flags[vehicle.id] || 'Available';

            selector.addEventListener('change', () => {
                const next = selector.value;

                // Avoid disabling a vehicle that has active bookings.
                if (
                    next !== 'Available' &&
                    hasActiveConflict(
                        vehicle.id,
                        localISO(),
                        '9999-12-31'
                    )
                ) {
                    alert(
                        'This model has pending or active requests. Resolve them before disabling the whole vehicle.'
                    );

                    selector.value =
                        flags[vehicle.id] || 'Available';

                    return;
                }

                const updated = readFleetFlags();

                updated[vehicle.id] = next;

                if (saveJSON(fleetFlagsKey, updated)) {
                    renderFleet();
                    refreshDashboard();
                }
            });

            card.append(photo, info, selector);
            fleetHost.append(card);
        });
    }


    // 9. DISPLAY MAINTENANCE RECORDS

    function renderMaintenance() {
        const host = document.getElementById(
            'staff-maintenance-list'
        );

        host.replaceChildren();

        const holds = readMaintenance();

        if (!holds.length) {
            const p = document.createElement('p');

            p.className = 'fine-print';
            p.textContent = 'No maintenance dates are blocked yet.';

            host.append(p);
            return;
        }

        holds.forEach(block => {
            const item = document.createElement('div');

            item.className = 'staff-maintenance-record';

            const text = document.createElement('span');

            text.textContent =
                `${getVehicle(block.vehicleId)?.name} · ${formattedDate(block.start)}–${formattedDate(block.end)} · ${block.reason}`;

            const remove = document.createElement('button');

            remove.type = 'button';
            remove.dataset.removeMaintenance = block.id;
            remove.textContent = 'Unblock';

            item.append(text, remove);
            host.append(item);
        });
    }


    // 10. ADD MAINTENANCE DATE BLOCK

    maintenanceForm.addEventListener('submit', event => {
        event.preventDefault();

        const fields = maintenanceForm.elements;

        const id = fields.vehicleId.value;
        const start = fields.start.value;
        const end = fields.end.value;
        const reason = fields.reason.value.trim();

        if (
            !getVehicle(id) ||
            start < localISO() ||
            end < start ||
            !reason
        ) {
            alert(
                'Choose a vehicle, valid future dates and a reason.'
            );
            return;
        }

        if (hasActiveConflict(id, start, end)) {
            alert(
                'This period overlaps an active request. Resolve that booking before blocking dates.'
            );
            return;
        }

        const updated = readMaintenance();

        updated.push({
            id: `M-${Date.now()}`,
            vehicleId: id,
            start,
            end,
            reason
        });

        if (!saveJSON(maintenanceKey, updated)) return;

        renderMaintenance();
        refreshDashboard();

        fields.reason.value = '';
    });


    // 11. REMOVE MAINTENANCE DATE BLOCK

    document.getElementById('staff-maintenance-list')
        .addEventListener('click', event => {
            const button = event.target.closest(
                '[data-remove-maintenance]'
            );

            if (!button) return;

            const updated = readMaintenance().filter(block =>
                block.id !== button.dataset.removeMaintenance
            );

            if (!saveJSON(maintenanceKey, updated)) return;

            renderMaintenance();
            refreshDashboard();
        });


    // Initialize dashboard additions.
    renderFleet();
    renderMaintenance();
});
