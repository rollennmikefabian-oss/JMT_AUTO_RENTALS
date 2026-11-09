'use strict';

/**
 * Staff dashboard demonstration.
 * Gate and data storage are client-side ONLY and are not secure.
 * Do not use with real names, licenses, payment data, or actual bookings.
 */
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = document.getElementById('staff-dashboard');
    if (!dashboard) return;

    const sessionKey = 'jmtDemoStaffAccess';
    let demoAccess = false;

    try {
        demoAccess = sessionStorage.getItem(sessionKey) === 'yes';
    } catch (error) {
        demoAccess = false;
    }

    if (!demoAccess) {
        location.replace('admin-login.html');
        return;
    }
    dashboard.hidden = false;

    document.getElementById('staff-logout').addEventListener('click', () => {
        sessionStorage.removeItem(sessionKey);
        location.href = 'admin-login.html';
    });

    const table = document.getElementById('jmt-admin-records');
    const monthLabel = document.getElementById('jmt-admin-month');
    const monthDays = document.getElementById('jmt-admin-days');
    const statusFilter = document.getElementById('staff-status-filter');
    const result = document.getElementById('staff-action-message');
    const today = localISO();
    const [startYear, startMonth] = today.slice(0, 7).split('-').map(Number);
    let currentMonth = new Date(startYear, startMonth - 1, 1);

    // Each state has an explicit set of permitted next actions.
    const transitions = {
        Pending: ['Approved', 'Rejected'],
        Approved: ['Ongoing', 'Cancelled'],
        Ongoing: ['Completed'],
        Rejected: [],
        Cancelled: [],
        Completed: []
    };

    const labels = {
        Approved: 'Approve',
        Rejected: 'Reject',
        Ongoing: 'Start rental',
        Completed: 'Mark completed',
        Cancelled: 'Cancel'
    };

    function td(text) {
        const cell = document.createElement('td');
        cell.textContent = String(text);
        return cell;
    }

    function updateRecords() {
        table.replaceChildren();
        const selectedStatus = statusFilter.value;
        const visible = bookings.filter(record =>
            selectedStatus === 'All' || record.status === selectedStatus
        );

        if (!visible.length) {
            const row = document.createElement('tr');
            const cell = td('No demo requests match this filter.');
            cell.colSpan = 6;
            row.append(cell);
            table.append(row);
            return;
        }

        for (const record of visible) {
            const row = document.createElement('tr');
            const vehicle = getVehicle(record.vehicleId);
            row.append(td(record.id));
            row.append(td(vehicle?.name || 'Unknown vehicle'));
            row.append(td(`${formattedDate(record.start)} ${record.pickupTime} – ${formattedDate(record.end)} ${record.returnTime}`));
            row.append(td(peso.format(record.total || 0)));

            const statusCell = document.createElement('td');
            const status = document.createElement('span');
            status.className = `request-status status-${record.status.toLowerCase()}`;
            status.textContent = record.status;
            statusCell.append(status);
            row.append(statusCell);

            const actionsCell = document.createElement('td');
            const actionGroup = document.createElement('div');
            actionGroup.className = 'staff-actions';
            const view = document.createElement('button');
            view.type = 'button';
            view.className = 'staff-action-button';
            view.dataset.viewReference = record.id;
            view.textContent = 'View details';

            actionGroup.append(view);

            for (const next of transitions[record.status] || []) {
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.reference = record.id;
                button.dataset.nextStatus = next;
                button.className = 'staff-action-button';
                if (next === 'Rejected' || next === 'Cancelled') {
                    button.classList.add('danger');
                }
                button.textContent = labels[next] || next;
                actionGroup.append(button);
            }
            if (!actionGroup.children.length) actionsCell.textContent = 'No further action';
            else actionsCell.append(actionGroup);
            row.append(actionsCell);
            table.append(row);
        }
    }

    function updateSummary() {
        const date = localISO();
        document.getElementById('jmt-count-fleet').textContent = fleet.length;

        document.getElementById('jmt-count-available').textContent =
            fleet.filter(vehicle =>
                isFleetDateAvailable(vehicle.id, date) &&
                !bookings.some(record =>
                    record.vehicleId === vehicle.id &&
                    bookingBlocksDates(record) &&
                    record.start <= date &&
                    date <= record.end
                )
            ).length;

        document.getElementById('jmt-count-pending').textContent =
            bookings.filter(record => record.status === 'Pending').length;
        document.getElementById('jmt-count-bookings').textContent =
            bookings.filter(record => ['Approved', 'Ongoing'].includes(record.status)).length;
    }

    function updateCalendar() {
        monthDays.replaceChildren();
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        monthLabel.textContent = currentMonth.toLocaleDateString('en-PH', {
            month: 'long', year: 'numeric'
        });

        const blanks = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        for (let i = 0; i < blanks; i++) {
            const empty = document.createElement('span');
            empty.className = 'jmt-admin-day';
            empty.setAttribute('aria-hidden', 'true');
            monthDays.append(empty);
        }


        const vehicleFilter =
            document.getElementById('staff-calendar-vehicle')?.value || 'All';

        for (let day = 1; day <= totalDays; day++) {
            const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const holds = bookings.filter(record =>
                bookingBlocksDates(record) &&
                record.start <= date &&
                date <= record.end &&
                (vehicleFilter === 'All' || record.vehicleId === vehicleFilter)
            );

            const affectedFleet = fleet.filter(vehicle =>
                (vehicleFilter === 'All' || vehicle.id === vehicleFilter) &&
                !isFleetDateAvailable(vehicle.id, date)
            );

            const cell = document.createElement('button');
            cell.type = 'button';

            cell.className =
                `jmt-admin-day${holds.length ? ' busy' : ''}${affectedFleet.length ? ' maintenance' : ''}`;

            cell.textContent = String(day);
            cell.dataset.date = date;

            cell.title =
                `${formattedDate(date)}: ${holds.length} active request(s), ${affectedFleet.length} blocked vehicle(s)`;

            monthDays.append(cell);
        }

    }

    function updateFleet() {
        const host = document.getElementById('staff-fleet-overview');
        host.replaceChildren();

        for (const vehicle of fleet) {
            const item = document.createElement('div');
            item.className = 'staff-fleet-item';
            const name = document.createElement('strong');
            name.textContent = vehicle.name;
            const category = document.createElement('small');
            category.textContent = `${vehicle.type} · ${peso.format(vehicle.rate)}/day (demo)`;
            item.append(name, category);
            host.append(item);
        }
    }

    function render() {
        bookings = readBookings();
        updateSummary();
        updateRecords();
        updateCalendar();
    }

    table.addEventListener('click', event => {
        const button = event.target.closest('button[data-next-status]');
        if (!button) return;

        const request = bookings.find(item => item.id === button.dataset.reference);
        const nextStatus = button.dataset.nextStatus;
        if (!request || !(transitions[request.status] || []).includes(nextStatus)) return;

        const question = `Change ${request.id} from ${request.status} to ${nextStatus}?`;
        if (!confirm(question)) return;

        request.status = nextStatus;
        if (!saveBookings()) {
            result.textContent = 'Unable to save. Check browser storage settings.';
            return;
        }
        result.textContent = `${request.id} is now ${nextStatus} (browser-only demo).`;
        render();
    });


    monthDays.addEventListener('click', event => {
        const button = event.target.closest('button[data-date]');
        if (!button) return;

        const date = button.dataset.date;

        const selected =
            document.getElementById('staff-calendar-vehicle')?.value || 'All';

        const matches = bookings.filter(record =>
            bookingBlocksDates(record) &&
            record.start <= date &&
            date <= record.end &&
            (selected === 'All' || record.vehicleId === selected)
        );

        const blocked = fleet.filter(vehicle =>
            (selected === 'All' || vehicle.id === selected) &&
            !isFleetDateAvailable(vehicle.id, date)
        );

        const requests = matches.map(item =>
            `${getVehicle(item.vehicleId)?.name} (${item.status})`
        );

        const unavailable = blocked.map(vehicle =>
            `${vehicle.name} (maintenance/unavailable)`
        );

        document.getElementById('staff-calendar-detail').textContent =
            `${formattedDate(date)}: ${[...requests, ...unavailable].join('; ') ||
            'no holds or blocks'
            }.`;
    });


    document.getElementById('jmt-admin-prev').addEventListener('click', () => {
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
        updateCalendar();
    });
    document.getElementById('jmt-admin-next').addEventListener('click', () => {
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
        updateCalendar();
    });
    statusFilter.addEventListener('change', updateRecords);
    window.addEventListener('jmt:refresh-admin', render);
    window.addEventListener('storage', event => {
        if (event.key === storedBookingKey) render();
    });

    updateFleet();
    render();
});
