
'use strict';

// Classroom demo only. Frontend passwords are not secure.
const DEMO_ADMIN_EMAIL = 'admin@jmt.demo';
const DEMO_ADMIN_PASSWORD = 'JMT-DEMO-2026';
const DEMO_STAFF_SESSION = 'jmtDemoStaffAccess';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('access-form');
    if (!form) return;

    const email = document.getElementById('access-email');
    const password = document.getElementById('access-password');
    const name = document.getElementById('access-name');
    const confirmPassword = document.getElementById('access-confirm');

    const message = document.getElementById('access-message');
    const heading = document.getElementById('access-heading');
    const description = document.getElementById('access-description');
    const submit = document.getElementById('access-submit');

    const tabs = document.querySelectorAll('[data-access-mode]');
    let mode = 'signin';

    function feedback(text, success) {
        message.hidden = false;
        message.textContent = text;
        message.classList.toggle('success', success);
        message.classList.toggle('error', !success);
    }

    function switchMode(next) {
        mode = next;
        const signup = mode === 'signup';

        document.getElementById('access-name-row').hidden = !signup;
        document.getElementById('access-confirm-row').hidden = !signup;

        name.required = signup;
        confirmPassword.required = signup;

        password.autocomplete = signup
            ? 'new-password'
            : 'current-password';

        heading.textContent = signup
            ? 'Create your account'
            : 'Welcome back';

        description.textContent = signup
            ? 'Preview the registration experience. No real account will be created.'
            : 'Sign in as a demo visitor or enter the staff demo credentials.';

        submit.textContent = signup
            ? 'Create Demo Account →'
            : 'Sign In →';

        message.hidden = true;
        password.value = '';
        confirmPassword.value = '';
        confirmPassword.setCustomValidity('');

        tabs.forEach(tab => {
            const active = tab.dataset.accessMode === mode;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-pressed', String(active));
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchMode(tab.dataset.accessMode);
        });
    });

    confirmPassword.addEventListener('input', () => {
        confirmPassword.setCustomValidity('');
        message.hidden = true;
    });

    form.addEventListener('submit', event => {
        event.preventDefault();
        message.hidden = true;

        const inputEmail = email.value.trim().toLowerCase();
        const inputPassword = password.value;

        // Customer registration preview
        if (mode === 'signup') {
            if (inputPassword !== confirmPassword.value) {
                confirmPassword.setCustomValidity('Passwords must match.');
                confirmPassword.reportValidity();
                return;
            }

            feedback(
                'Sign-up preview complete! No account or password was saved. You can continue as a guest.',
                true
            );

            password.value = '';
            confirmPassword.value = '';
            return;
        }

        // Staff demonstration access
        if (inputEmail === DEMO_ADMIN_EMAIL) {
            if (inputPassword !== DEMO_ADMIN_PASSWORD) {
                feedback('Incorrect staff demonstration password.', false);
                return;
            }

            try {
                sessionStorage.setItem(DEMO_STAFF_SESSION, 'yes');
                window.location.href = 'admin.html';
            } catch (error) {
                feedback('Browser session storage is unavailable.', false);
            }

            return;
        }

        // Public customer demonstration
        feedback(
            'Customer sign-in preview complete. No account was accessed; continue as a guest to view your demo requests.',
            true
        );

        password.value = '';
    });

    const requestedMode = new URLSearchParams(
        window.location.search
    ).get('mode');

    switchMode(requestedMode === 'signup' ? 'signup' : 'signin');
});
