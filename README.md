# AETHERIA — Healthcare Appointment & Follow-up Manager

Aetheria is a complete, production-grade Healthcare Appointment & Follow-up Manager built with a Python (FastAPI) backend and a React (Vite) + Tailwind CSS v4.0 frontend. It features a premium, slightly dark showroom aesthetic inspired by rich purple and gold accents, and includes safe double-booking prevention, doctor leave automation, AI symptom insights, post-visit prescriptions summaries, background email retries, and Google Calendar sync.

---

## 🌐 Live Deployed Application

- **Live Frontend (Vercel):** [https://healthcare-appointment-manager-flax.vercel.app/](https://healthcare-appointment-manager-flax.vercel.app/)
- **Live Backend API (Render):** [https://healthcare-appointment-backend-26uu.onrender.com](https://healthcare-appointment-backend-26uu.onrender.com)
- **Interactive Swagger API Docs:** [https://healthcare-appointment-backend-26uu.onrender.com/docs](https://healthcare-appointment-backend-26uu.onrender.com/docs)

---

## ⚡ Instant Test Drive (Login as Guest)
For quick evaluation without manual registration, we pre-seed three roles. On the login screen, click any of the **Or Test Drive (Guest Login)** buttons:
- **Patient Dashboard**: Test slot booking, claim lock holds, and view doctor prescriptions.
- **Doctor Dashboard**: Review appointments, inspect AI pre-visit insights, write clinical notes/prescriptions, and schedule medication alerts.
- **Admin Dashboard**: Manage doctor profiles, edit weekly shift schedules, and register leave days (which auto-notifies and cancels conflicting patient bookings).

---

## Technical Stack
- **Frontend:** React (Vite) + Tailwind CSS v4.0 + Lucide Icons
- **Backend:** Python (FastAPI) + Uvicorn + SQLAlchemy
- **Database:** MySQL 8.0 (with automatic SQLite fallback for local development)
- **Migrations:** Alembic
- **LLM:** Groq LLaMA 3.3 70B (via Python `groq` SDK)
- **Reminders/Queue:** APScheduler
- **Email:** Standard Python `smtplib`

---

## Local Setup Guide

### Prerequisites
- **Python:** version 3.10+
- **Node.js:** version 22+
- **MySQL:** version 8.0 (Optional: If MySQL is not running or login fails, the system automatically falls back to SQLite, creating `healthcare_db.db` locally).

### 1. Backend Installation & Run
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. (Optional) Configure environment variables in a `.env` file if connecting to an external MySQL, Groq, or SMTP server (the application runs out-of-the-box with SQLite fallback and guest accounts with zero extra setup).
5. Apply database migrations:
   ```bash
   alembic upgrade head
   ```
6. Launch the FastAPI server:
   ```bash
   uvicorn app.main:app --port 8000 --reload
   ```
   *Note: On startup, the database is seeded with a default Admin account:*
   - **Email:** `admin@healthcare.com`
   - **Password:** `adminpassword123`

---

### 2. Frontend Installation & Run
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Database Schema (ERD Breakdown)

The database schema is structured as follows:

1. **`users` Table**: Base user information.
   - `id` (INT, PK, Auto-Increment)
   - `email` (VARCHAR(100), Unique, Index)
   - `password_hash` (VARCHAR(255))
   - `role` (VARCHAR(20)) — `patient`, `doctor`, or `admin`
   - `name` (VARCHAR(100))
   - `phone` (VARCHAR(20), Nullable)
   - `google_refresh_token` (TEXT, Nullable)
   - `created_at` (DATETIME)
2. **`doctors` Table**: Extension of `users` for doctor-specific profiles.
   - `id` (INT, PK, FK to `users.id` ON DELETE CASCADE)
   - `specialisation` (VARCHAR(100))
   - `slot_duration_minutes` (INT, default 30)
3. **`doctor_availabilities` Table**: Weekly shifts.
   - `id` (INT, PK)
   - `doctor_id` (INT, FK to `doctors.id` ON DELETE CASCADE)
   - `day_of_week` (INT) — `0` (Monday) to `6` (Sunday)
   - `start_time` (TIME)
   - `end_time` (TIME)
4. **`doctor_leaves` Table**: Tracks days when doctors are unavailable.
   - `id` (INT, PK)
   - `doctor_id` (INT, FK to `doctors.id` ON DELETE CASCADE)
   - `leave_date` (DATE)
   - `reason` (VARCHAR(255), Nullable)
5. **`slot_holds` Table**: Temporary locks (10 min) during symptom submission.
   - `id` (INT, PK)
   - `doctor_id` (INT, FK to `doctors.id`)
   - `slot_start` (DATETIME)
   - `slot_end` (DATETIME)
   - `held_by_patient_id` (INT, FK to `users.id`)
   - `expires_at` (DATETIME)
   - *Constraint:* Unique index on `(doctor_id, slot_start)`
6. **`appointments` Table**: Confirmed bookings.
   - `id` (INT, PK)
   - `patient_id` (INT, FK to `users.id`)
   - `doctor_id` (INT, FK to `doctors.id`)
   - `slot_start` (DATETIME)
   - `slot_end` (DATETIME)
   - `status` (VARCHAR(20)) — `scheduled`, `completed`, `cancelled`
   - `google_event_id` (VARCHAR(255), Nullable)
   - `active_slot_key` (DATETIME, Generated column) — equal to `slot_start` if status is `scheduled`, else `NULL`.
   - *Constraint:* Unique index on `(doctor_id, active_slot_key)` to enforce no double booking.
7. **`symptom_forms` Table**: Pre-visit symptoms and AI analyses.
   - `id` (INT, PK)
   - `appointment_id` (INT, FK to `appointments.id`)
   - `symptoms_text` (TEXT)
   - `urgency_level` (VARCHAR(20)) — `Low`, `Medium`, `High`
   - `chief_complaint` (VARCHAR(255))
   - `suggested_questions` (TEXT)
8. **`prescriptions` Table**: Post-visit notes.
   - `id` (INT, PK)
   - `appointment_id` (INT, FK to `appointments.id`)
   - `clinical_notes` (TEXT)
   - `prescription_text` (TEXT)
   - `patient_summary` (TEXT) — AI friendly summary.
9. **`reminders` Table**: Medication schedules.
   - `id` (INT, PK)
   - `prescription_id` (INT, FK to `prescriptions.id`)
   - `medication_name` (VARCHAR(100))
   - `frequency` (VARCHAR(50))
   - `reminder_time` (TIME)
   - `last_sent_at` (DATETIME, Nullable)
10. **`notifications` Table**: Outbox queue for emails.
    - `id` (INT, PK)
    - `user_id` (INT, FK to `users.id`)
    - `title` (VARCHAR(150))
    - `message` (TEXT)
    - `recipient_email` (VARCHAR(100))
    - `status` (VARCHAR(20)) — `pending`, `sent`, `failed`
    - `retry_count` (INT, default 0)
    - `last_attempt` (DATETIME, Nullable)
    - `error_message` (TEXT, Nullable)

---

## API Documentation

### 1. Authentication
- `POST /api/v1/auth/register` — Registers a new user. Expects `UserCreate` JSON. Returns `UserResponse`.
- `POST /api/v1/auth/login` — Login with OAuth2 form credentials. Returns JWT `Token`.
- `GET /api/v1/auth/google/url` — Generates Google OAuth redirect URL.
- `GET /api/v1/auth/google/callback` — Receives auth code, registers/logs in patient, returns token.
- `POST /api/v1/auth/guest?role={role}` — Generates guest JWT token for testing (role: patient, doctor, admin).

### 2. Admin Portal
- `POST /api/v1/admin/doctors` — Registers a doctor user & assigns specialisation/shifts.
- `GET /api/v1/admin/doctors` — Retrieves all doctor profiles.
- `DELETE /api/v1/admin/doctors/{doctor_id}` — Deletes doctor user.
- `POST /api/v1/admin/doctors/{doctor_id}/availabilities` — Creates or updates a doctor availability slot.
- `POST /api/v1/admin/doctors/{doctor_id}/leaves` — Registers a doctor leave day (triggers cancellations).

### 3. Patient Portal
- `GET /api/v1/patient/doctors` — Retrieves doctor directory.
- `GET /api/v1/patient/appointments` — Retrieves patient's history & prescriptions.
- `GET /api/v1/patient/doctors/{doctor_id}/slots?date_str=YYYY-MM-DD` — Computes active free slots.

### 4. Booking
- `POST /api/v1/appointments/hold` — Claims a temporary 10-minute slot hold.
- `POST /api/v1/appointments/confirm` — Confirms booking, processes AI symptoms, clears hold, creates calendars/emails.

### 5. Doctor Portal
- `GET /api/v1/doctor/appointments` — Retrieves agenda list with AI insights.
- `POST /api/v1/doctor/appointments/{appointment_id}/prescription` — Submits post-visit notes/medications.

---

## Exact LLM Prompts Used

### 1. Pre-Visit Symptom Analysis (Symptom Form Confirmation)
```text
Analyse these symptoms and return a JSON object with the following keys:
- urgency_level (strictly choose one of: Low, Medium, High)
- chief_complaint (a brief summary of the primary complaint)
- suggested_questions (a string listing three suggested questions for the doctor, separated by newlines)

Symptoms: <symptoms>
```

### 2. Post-Visit Patient-Friendly Summary (Prescription Submission)
```text
Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps:
<notes>
```

---

## Google Calendar OAuth Setup Steps

To connect the application to the Google Calendar API:
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new Project or select an existing one.
3. Search for **Google Calendar API** and click **Enable**.
4. Go to **APIs & Services > OAuth consent screen**:
   - Choose User Type: **External**.
   - Fill in App Information and Developer Contact.
   - In Scopes, click **Add or Remove Scopes** and search for/add:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/userinfo.profile`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Add your test Google Account under **Test users**.
5. Go to **APIs & Services > Credentials**:
   - Click **Create Credentials** and choose **OAuth client ID**.
   - Select Application Type: **Web application**.
   - Add Authorized redirect URIs: `http://localhost:8000/api/v1/auth/google/callback`
   - Click **Create**.
6. Copy the **Client ID** and **Client Secret** into your `.env` file as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

---

## System Design Write-Up

### Double-Booking Prevention & Slot Hold Mechanisms
To protect the scheduling system from race conditions, we implement a two-layered isolation boundary combining **pessimistic locking** at the database level and a **temporary slot holding table**.

When a patient browses availability and clicks a slot, the system attempts to acquire a temporary lock by calling the `/appointments/hold` endpoint. In this transaction, we query the `appointments` table and the `slot_holds` table for the matching doctor and start time using SQLAlchemy's `.with_for_update()` modifier. This triggers a `SELECT ... FOR UPDATE` query in MySQL, locking the corresponding rows at the DB-level and blocking any concurrent transaction trying to write to or lock the same time slot. 

If no scheduled appointment or active hold exists, a record is written into the `slot_holds` table. This table has a strict database-level unique constraint on `(doctor_id, slot_start)`. In the event of two transactions executing simultaneously and bypassing the `SELECT ... FOR UPDATE` check before a write occurs, the database immediately aborts the second insert due to a duplicate key violation, forcing it to rollback. Once the hold is established, the patient has 10 minutes to fill in their symptoms. If the hold expires, background jobs ignore the hold, making the slot available to others.

When the user confirms the booking, a single ACID transaction handles the promotion:
1. It queries and locks the `appointments` table for `(doctor_id, slot_start)` to verify no booking occurred.
2. It deletes the patient's active `SlotHold`.
3. It writes the confirmed booking to `appointments`.

To guarantee that cancelled appointments release the slot back to the public pool while keeping the database constraint active, we use a MySQL-generated virtual column:
`active_slot_key = Column(DateTime, Computed("CASE WHEN status = 'scheduled' THEN slot_start ELSE NULL END", persisted=True))`
And a unique constraint is defined on `(doctor_id, active_slot_key)`. Since MySQL permits multiple `NULL` values in a unique index, multiple cancelled appointments can coexist for the same slot, but only one active (`scheduled`) appointment is permitted.

### Doctor Leave Conflict Handling
When an administrator logs a leave day for a doctor, the system must immediately secure patient schedules. The leave registry writes a record to `doctor_leaves`, which enforces a unique constraint on `(doctor_id, leave_date)`. 

Within the same transaction, the backend queries the database for all `scheduled` appointments matching that doctor on that date. For each conflict:
1. The appointment status is updated to `cancelled`.
2. The Google Calendar event is deleted from the synced calendars using `delete_appointment_calendar_event()`.
3. Separate email notification tasks are queued in the `notifications` table for both the doctor and the patient, providing the cancellation details and a link for the patient to log in and select another available date.

### Notification Failure Handling & Retry Strategy
To prevent application crashes and avoid lagging API response times during external network requests (such as SMTP handshakes or Google Calendar API calls), Aetheria uses a transactional outbox pattern. 

Emails are not sent inline during the API request. Instead, they are written to a `notifications` table with status `pending`. A background worker managed by `APScheduler` runs every 30 seconds, polling pending notifications. If an SMTP email transmission fails (e.g. due to connection timeout or network outage), the exception is caught, the error details are logged to the `error_message` column, and the `retry_count` is incremented. The status remains `failed`. On the next pass, the scheduler retries transmission up to a maximum of 3 attempts. This prevents blocking the core user actions and guarantees eventual consistency.

---

## Deployment Configuration

The application is deployed live and configured as follows:

1. **Frontend (Vercel):**
   - **Live URL:** [https://healthcare-appointment-manager-flax.vercel.app/](https://healthcare-appointment-manager-flax.vercel.app/)
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

2. **Backend (Render):**
   - **Live API URL:** [https://healthcare-appointment-backend-26uu.onrender.com](https://healthcare-appointment-backend-26uu.onrender.com)
   - **Swagger Docs:** [https://healthcare-appointment-backend-26uu.onrender.com/docs](https://healthcare-appointment-backend-26uu.onrender.com/docs)
   - Environment: Python
   - Build Command: `pip install -r requirements.txt && alembic upgrade head`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
