# JMT Auto Rentals

**Final visual redesign of the provided website folder**

This version is built from the files in `JMT-Express-Rentals 4.rar`. It keeps the existing client-side rental prototype and its original vehicle image/video assets, while applying the new JMT racing-inspired brand to the public site and admin workspace.

## Quick start

1. Open the `JMT-Auto-Rentals` folder in Visual Studio Code.
2. Launch `index.html` with **Live Server** (or another simple local web server).
3. Explore the public pages and try an example rental request.
4. Open `admin-login.html` and choose the staff demonstration sign-in.
5. To publish, copy the **contents** of this folder into your existing Git repository, leaving your `.git` folder intact. Commit and sync changes to GitHub Pages.

## New branding

- **Business name:** JMT Auto Rentals
- `images/jmt-chrome-logo.png`: original supplied full-size chrome logo
- `images/jmt-chrome-logo.webp`: optimized chrome logo used in the cinematic opening and brand banners
- `images/jmt-icon.png`: original supplied square JMT racing icon
- `images/jmt-icon.webp`: optimized icon used in website headers, footer and login
- `images/favicon.ico`, `images/favicon-32.png`: browser favicon files
- `images/apple-touch-icon.png`, `images/app-icon-192.png`, `images/app-icon-512.png`: mobile/site shortcut icons
- `css/brand-redesign.css`: readable stylesheet loaded last on every page, unifying the new visual identity without overwriting the original stylesheets

## What still works

- Original cinematic intro video, fallback car and replay/skip functionality
- Home, vehicle categories, searchable showroom, vehicle comparison, vehicle details and image gallery
- Public availability table, rental form, estimated prices and booking validation
- Customer request reference / status and demo cancellations
- Booking approval workflow: Pending, Approved, Rejected, Ongoing, Completed and Cancelled
- Staff sign-in demo, reservation details, return inspection, vehicle status, maintenance date holds and filtered fleet calendar

## Admin improvements

The staff dashboard now uses a desktop sidebar with four clear workspaces: **Overview, Reservations, Fleet Calendar and Manage Vehicles**. On phones and tablets, the sidebar becomes a horizontal scrollable section menu. Dashboard metrics, booking workflows and management controls use the same underlying JavaScript and local browser storage as before.

## Staff demo credentials

- Email: `admin@jmt.demo`
- Password: `JMT-DEMO-2026`

These demonstration credentials appear in frontend source code. **This is NOT secure authentication**, even though the interface resembles a sign-in system.

## Technical limitations

This is an ITWS 02 classroom prototype, not a live rental platform. It **does not** have secure server-side accounts, real-time shared bookings, production staff permissions, online payments or verified JMT inventory/rental rates. Booking/vehicle changes are saved **only in the same browser and website origin**. Do not collect real personal data with this prototype.

## Final testing checklist

- [ ] Run `index.html`, confirm intro can be skipped/replayed and both logo assets are visible.
- [ ] Open `vehicles.html` and check search, category filters and comparison.
- [ ] View a vehicle's details and check its date calendar.
- [ ] Fill the booking form with **fictional** information and submit a Pending demo request.
- [ ] Open `reservations.html` and find the reference/status.
- [ ] Sign in to the staff demo, approve or reject a request.
- [ ] Check fleet maintenance holds and required return inspections.
- [ ] Test one narrow phone display and the hamburger menu.
- [ ] Test the full website on the final GitHub Pages link (path and asset cases matter).

## Notes

- All original vehicle demo images and cinematic intro assets remain in the folder.
- The presentation redesign was isolated to new branding files, updated markup and the admin navigation layout. Core rental functions and browser storage keys remain compatible with the uploaded version.
