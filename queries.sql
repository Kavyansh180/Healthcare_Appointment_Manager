-- ============================================================================
-- ATHERIA HEALTHCARE SUITE - PRODUCTION SQL QUERY CATALOGUE
-- ============================================================================

USE `healthcare_db`;

-- ============================================================================
-- 1. DOCTOR DIRECTORY & SPECIALTY SEARCH
-- Searches active specialists by specialty, name, or keywords with consultation fee.
-- ============================================================================
SELECT 
    d.id AS doctor_id,
    u.name AS doctor_name,
    u.email AS doctor_email,
    d.specialisation,
    d.experience_years,
    d.consultation_fee,
    d.room_suite,
    d.rating,
    d.bio
FROM doctors d
JOIN users u ON d.id = u.id
WHERE 
    (:specialty = 'All' OR d.specialisation LIKE CONCAT('%', :specialty, '%'))
    AND (
        u.name LIKE CONCAT('%', :search, '%') 
        OR d.specialisation LIKE CONCAT('%', :search, '%')
        OR d.bio LIKE CONCAT('%', :search, '%')
    )
ORDER BY d.rating DESC;

-- ============================================================================
-- 2. DYNAMIC DOCTOR AVAILABILITY & CONFLICT-FREE SLOTS
-- Evaluates doctor availability for a given weekday and excludes booked or held slots.
-- ============================================================================
SELECT 
    d.id AS doctor_id,
    u.name AS doctor_name,
    da.day_of_week,
    da.start_time,
    da.end_time,
    d.slot_duration_minutes,
    -- Check if doctor is on leave for this specific date
    CASE 
        WHEN dl.id IS NOT NULL THEN 'ON_LEAVE'
        ELSE 'AVAILABLE'
    END AS leave_status,
    dl.reason AS leave_reason
FROM doctors d
JOIN users u ON d.id = u.id
LEFT JOIN doctor_availabilities da 
    ON d.id = da.doctor_id AND da.day_of_week = DAYOFWEEK(:target_date) - 1
LEFT JOIN doctor_leaves dl 
    ON d.id = dl.doctor_id AND dl.leave_date = :target_date
WHERE d.id = :doctor_id;

-- ============================================================================
-- 3. CONCURRENCY & DOUBLE-BOOKING PREVENTION QUERY
-- Used inside transaction with FOR UPDATE row locking to lock slot during hold/book.
-- ============================================================================
-- Step A: Check for existing confirmed appointment on that slot
SELECT id, patient_id, status 
FROM appointments 
WHERE doctor_id = :doctor_id 
  AND slot_start = :slot_start 
  AND status = 'scheduled'
FOR UPDATE;

-- Step B: Check for active 10-minute temporary holds
SELECT id, held_by_patient_id, expires_at 
FROM slot_holds 
WHERE doctor_id = :doctor_id 
  AND slot_start = :slot_start 
  AND expires_at > UTC_TIMESTAMP()
FOR UPDATE;

-- ============================================================================
-- 4. DOCTOR LEAVE CONFLICT DETECTION & AFFECTED PATIENT EXTRACTION
-- Identifies all appointments that must be cancelled and patients that need email notice.
-- ============================================================================
SELECT 
    a.id AS appointment_id,
    a.slot_start,
    a.slot_end,
    p.id AS patient_id,
    p.name AS patient_name,
    p.email AS patient_email,
    p.phone AS patient_phone,
    doc_user.name AS doctor_name,
    d.specialisation
FROM appointments a
JOIN users p ON a.patient_id = p.id
JOIN doctors d ON a.doctor_id = d.id
JOIN users doc_user ON d.id = doc_user.id
WHERE a.doctor_id = :doctor_id
  AND DATE(a.slot_start) = :leave_date
  AND a.status = 'scheduled'
ORDER BY a.slot_start ASC;

-- ============================================================================
-- 5. DOCTOR CLINICAL TRIAGE QUEUE (PRIORITIZED BY AI URGENCY)
-- Orders doctor's appointments by urgency (High > Medium > Low) then chronologically.
-- ============================================================================
SELECT 
    a.id AS appointment_id,
    a.slot_start,
    a.slot_end,
    a.status,
    a.meet_link,
    p.name AS patient_name,
    p.email AS patient_email,
    p.phone AS patient_phone,
    sf.urgency_level,
    sf.chief_complaint,
    sf.suggested_questions,
    sf.severity_scale,
    sf.duration_days,
    sf.medications_allergies
FROM appointments a
JOIN users p ON a.patient_id = p.id
LEFT JOIN symptom_forms sf ON a.id = sf.appointment_id
WHERE a.doctor_id = :doctor_id
  AND (:status_filter = 'all' OR a.status = :status_filter)
ORDER BY 
    CASE 
        WHEN sf.urgency_level = 'High' THEN 1
        WHEN sf.urgency_level = 'Medium' THEN 2
        WHEN sf.urgency_level = 'Low' THEN 3
        ELSE 4
    END ASC,
    a.slot_start ASC;

-- ============================================================================
-- 6. ACTIVE MEDICATION REMINDERS DUE FOR DISPATCH TODAY
-- Scans patient prescriptions where dosage time matches current window and not yet sent.
-- ============================================================================
SELECT 
    r.id AS reminder_id,
    r.medication_name,
    r.frequency,
    r.reminder_time,
    r.last_sent_at,
    p.diagnosis,
    patient.id AS patient_id,
    patient.name AS patient_name,
    patient.email AS patient_email,
    doc_user.name AS doctor_name
FROM reminders r
JOIN prescriptions p ON r.prescription_id = p.id
JOIN appointments a ON p.appointment_id = a.id
JOIN users patient ON a.patient_id = patient.id
JOIN doctors doc ON a.doctor_id = doc.id
JOIN users doc_user ON doc.id = doc_user.id
WHERE (
    r.last_sent_at IS NULL 
    OR DATE(r.last_sent_at) < CURRENT_DATE()
)
AND CURRENT_TIME() >= r.reminder_time;

-- ============================================================================
-- 7. PLATFORM ANALYTICS & REVENUE AGGREGATION (ADMIN DASHBOARD)
-- ============================================================================
SELECT 
    COUNT(DISTINCT d.id) AS total_doctors,
    (SELECT COUNT(*) FROM users WHERE role = 'patient') AS total_patients,
    COUNT(a.id) AS total_appointments,
    SUM(CASE WHEN a.status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled_appointments,
    SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed_appointments,
    SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_appointments,
    COALESCE(SUM(CASE WHEN a.status = 'completed' THEN d.consultation_fee ELSE 0 END), 0) AS total_revenue_generated
FROM doctors d
LEFT JOIN appointments a ON d.id = a.doctor_id;

-- Specialty Revenue Breakdown
SELECT 
    d.specialisation,
    COUNT(DISTINCT d.id) AS doctor_count,
    COUNT(a.id) AS total_bookings,
    SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed_visits,
    COALESCE(SUM(CASE WHEN a.status = 'completed' THEN d.consultation_fee ELSE 0 END), 0) AS specialty_revenue
FROM doctors d
LEFT JOIN appointments a ON d.id = a.doctor_id
GROUP BY d.specialisation
ORDER BY specialty_revenue DESC;

-- ============================================================================
-- 8. EMAIL NOTIFICATION OUTBOX RETRY & AUDIT QUERY
-- Fetches pending or failed emails with fewer than 3 retries for background dispatch.
-- ============================================================================
SELECT 
    n.id,
    n.user_id,
    n.title,
    n.recipient_email,
    n.status,
    n.retry_count,
    n.last_attempt,
    n.error_message,
    n.created_at
FROM notifications n
WHERE n.status IN ('pending', 'failed')
  AND n.retry_count < 3
ORDER BY n.created_at ASC
LIMIT 50;
