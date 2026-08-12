# Vishwa Developers - Complete System Architecture

This document serves as the "Master Blueprint" for your real estate platform. It details how every piece of the website is structured, how the database is organized, and how data flows from the front-end to the back-end.

## 1. High-Level Architecture

The platform follows a standard **Client-Server Architecture**:
*   **Frontend (Client):** Pure HTML, CSS, and vanilla JavaScript. It uses a Single Page Application (SPA) approach for the dashboards, while using traditional HTML pages for public-facing routes.
*   **Backend (Server):** Node.js running the Express framework. It handles security, business logic, file uploads, and sends emails.
*   **Database:** Local SQLite database (`better-sqlite3`). It stores all data persistently in a single file on the server.

---

## 2. File & Directory Structure

Here is a map of the entire codebase and what each file does:

### 🌐 Frontend (Root Directory)
These are the files the user interacts with in their browser.

*   **`index.html`** - The landing page. Contains the hero section, featured listings, and promotional banners.
*   **`listings.html`** - The primary search page. Features dynamic filters (buy/rent, property type) and pulls properties from the database.
*   **`property-details.html`** - A dynamic template. When you click a property, this page reads the `?id=X` from the URL, fetches that property's data, and builds a beautiful layout with an image gallery and map.
*   **`about.html` / `contact.html` / `agents.html`** - Informational pages. `contact.html` contains a form that feeds directly into the CRM.
*   **`login.html`** - The portal for authentication (Login, Signup, Forgot Password).
*   **`reset-password.html`** - The page users land on after clicking the password reset link in their email.
*   **`user-dashboard.html`** - The **Buyer Dashboard**. Shows a user's favorited properties and their "Saved Search" alert configurations.
*   **`owner-dashboard.html`** - The **SaaS CRM Control Center**. A powerful single-page app with a sidebar that handles property listings, leads, visits, and revenue.
*   **`style.css`** - The global stylesheet governing the look and feel (fonts, colors, responsive layouts).

### ⚙️ Backend (`/server/` Directory)
These files run on the server and are invisible to the public.

*   **`server.js`** - The main brain. It starts the web server on Port 3000, configures security limits, serves the frontend HTML, injects SEO meta-tags dynamically for social media sharing, and routes API requests.
*   **`db.js`** - The database initialization script. If a table is missing, it builds it automatically. 
*   **`lib-email.js`** - Contains functions that talk to the "Resend" API to send out actual emails (like Password Resets and Saved Search alerts).
*   **`.env`** - The secure vault. Contains your secret keys (JWT encryption key, Resend API key, and your live `BASE_URL`).
*   **`package.json`** - The list of software packages the server relies on (like Express, SQLite, jsonwebtoken).
*   **`/uploads/`** - A folder where all property images uploaded by users are saved.

### 🔌 API Routes (`/server/routes/`)
The backend is split into organized "routes" so `server.js` doesn't become too cluttered.

*   **`auth.js`** - Handles logins, hashing passwords securely, and issuing JWT (JSON Web Tokens).
*   **`properties.js`** - Handles adding properties (parsing image uploads), deleting them, and searching.
*   **`dashboard.js`** - Aggregates math and statistics (total revenue, active listings) for the CRM overview tab.
*   **`leads.js`** - Handles fetching and updating the status of CRM leads.
*   **`visits.js`** - Manages scheduling and fetching site visits.
*   **`transactions.js`** - Manages property sales/rental payments.
*   **`favorites.js` & `saved-searches.js`** - Handles adding properties/searches to a user's wishlist.
*   **`contact.js`** - Processes contact forms and *automatically* forwards them into the `leads` table.
*   **`/middleware/auth.js`** - A security guard. Before a user can delete a property or view leads, this script checks if their JWT token is valid and if they have the correct permissions.

---

## 3. Database Schema (The Data Model)

The SQLite database (`database.sqlite`) is composed of the following interconnected tables:

#### `users`
*   Stores: `id`, `fullName`, `email`, `password` (hashed), `role` (user, owner, admin)

#### `properties`
*   Stores: `id`, `title`, `location`, `property_type`, `purpose` (sale/rent), `price`, `beds`, `baths`, `sqft`, `description`, `images` (stored as JSON arrays), `status` (Available/Sold/Rented), `views`, and `owner_id`.

#### `favorites` & `saved_searches`
*   Connects a `user_id` to either a specific `property_id` or a set of search criteria (min price, location, etc.).

#### `contact_messages`
*   A raw log of every message sent through the website contact forms.

#### `leads` (CRM)
*   Stores: `id`, `name`, `email`, `phone`, `property_id`, `status` (New, Contacted, Interested, etc.), and `notes`. 

#### `site_visits` (CRM)
*   Connects a `lead_id` to a `property_id` and stores the `visit_date` and `status` (Scheduled, Completed, Cancelled).

#### `transactions` (CRM)
*   Connects a `lead_id` to a `property_id` and tracks the `amount_agreed` vs `amount_paid` to calculate pending revenue.

---

## 4. Key Workflows

### How Authentication Works
1. A user logs in via `login.html`.
2. The frontend sends the email/password to `/api/auth/login`.
3. The server checks the database. If correct, it generates a **JWT (JSON Web Token)**.
4. The server sends the token back to the browser, which saves it in `localStorage`.
5. For every future request (like "delete my property"), the browser sends this token in the "Authorization" header so the server knows who is asking.

### How Image Uploads Work
1. When adding a property, the user selects images.
2. The browser bundles them via `FormData` and posts them to `/api/properties`.
3. A package called `multer` intercepts the request on the server. It strips out the images and saves them directly to the `/uploads/` folder on the hard drive.
4. It then gives the server the file paths (e.g., `/uploads/image1.jpg`), and the server saves those paths as a JSON string in the database.

### How SEO & Social Sharing Works
Because this is a dynamic site, if someone shares a link to a specific property (e.g., `/property-details.html?id=5`) on WhatsApp or Twitter, standard HTML wouldn't know which image to show in the preview card.
*   **The Fix:** When a request comes in for any page, `server.js` intercepts it. If it notices `?id=X`, it quickly looks up the property in the database and *injects* standard OpenGraph (`og:image`, `og:title`) tags into the HTML *before* sending it to the user. This ensures perfect rich-link previews anywhere.
