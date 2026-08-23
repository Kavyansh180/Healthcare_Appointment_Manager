-- ============================================================================
-- ATHERIA HEALTHCARE SUITE - SEED DATA (DML SCRIPT)
-- ============================================================================

USE `healthcare_db`;

-- 1. Insert Administrators (Passwords hashed with bcrypt: 'adminpassword123' / 'guestpass')
INSERT INTO `users` (`id`, `email`, `password_hash`, `role`, `name`, `phone`) VALUES
(1, 'admin@healthcare.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'admin', 'Admin Officer', '+1 (555) 010-0011'),
(2, 'guest_admin@healthcare.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'admin', 'Admin Officer', '+1 (555) 010-0011');

-- 2. Insert Patient Users
INSERT INTO `users` (`id`, `email`, `password_hash`, `role`, `name`, `phone`) VALUES
(3, 'guest_patient@healthcare.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'patient', 'Sienna Hayes', '+1 (555) 789-0123'),
(4, 'marcus.vance@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'patient', 'Marcus Vance', '+1 (555) 890-1234');

-- 3. Insert 6 Specialist Doctor Users
INSERT INTO `users` (`id`, `email`, `password_hash`, `role`, `name`, `phone`) VALUES
(5, 'guest_doctor@healthcare.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'doctor', 'Dr. Victoria Sterling', '+1 (555) 432-8900'),
(6, 'dr.croft@healthcare.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'doctor', 'Dr. Julian Croft', '+1 (555) 432-8901'),
(7, 'dr.zhao@healthcare.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'doctor', 'Dr. Seraphina Zhao', '+1 (555) 432-8902'),
(8, 'dr.walsh@healthcare.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'doctor', 'Dr. Kieran Walsh', '+1 (555) 432-8903'),
(9, 'dr.lin@healthcare.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'doctor', 'Dr. Maya Lin', '+1 (555) 432-8904'),
(10, 'dr.vance@healthcare.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'doctor', 'Dr. Edward Vance', '+1 (555) 432-8905');

-- 4. Insert Doctor Profiles
INSERT INTO `doctors` (`id`, `specialisation`, `slot_duration_minutes`, `experience_years`, `consultation_fee`, `room_suite`, `rating`, `bio`) VALUES
(5, 'Cardiology', 30, 12, 120, 'Suite 401A', '4.95', 'Board-certified Cardiologist specializing in comprehensive cardiovascular diagnostics, preventive lipidology, and rhythm management.'),
(6, 'Neurology', 30, 15, 150, 'Suite 205B', '4.90', 'Senior Neurologist specializing in neurodegenerative therapies, chronic cephalalgia, and cognitive electrophysiology.'),
(7, 'Dermatology', 30, 9, 95, 'Suite 102', '4.88', 'Clinical and cosmetic dermatologist focusing on autoimmune dermatoses, laser therapeutics, and complex skin lesions.'),
(8, 'Orthopedics', 30, 14, 135, 'Suite 304', '4.92', 'Orthopedic surgeon specializing in sports-related biomechanics, arthroscopic reconstruction, and advanced joint preservation.'),
(9, 'Pediatrics', 30, 10, 110, 'Suite 115', '4.97', 'Pediatrician specializing in developmental milestones, adolescent immunity, and pediatric preventive care.'),
(10, 'Oncology', 30, 18, 175, 'Suite 502', '4.94', 'Senior Clinical Oncologist with expertise in precision biomarker-driven therapies and targeted immuno-oncology protocols.');

-- 5. Insert Doctor Weekly Working Hours (Monday to Saturday, 09:00 - 17:00)
INSERT INTO `doctor_availabilities` (`doctor_id`, `day_of_week`, `start_time`, `end_time`) VALUES
-- Dr. Victoria Sterling (Cardiology)
(5, 0, '09:00:00', '17:00:00'), (5, 1, '09:00:00', '17:00:00'), (5, 2, '09:00:00', '17:00:00'),
(5, 3, '09:00:00', '17:00:00'), (5, 4, '09:00:00', '17:00:00'), (5, 5, '09:00:00', '17:00:00'),
-- Dr. Julian Croft (Neurology)
(6, 0, '09:00:00', '17:00:00'), (6, 1, '09:00:00', '17:00:00'), (6, 2, '09:00:00', '17:00:00'),
(6, 3, '09:00:00', '17:00:00'), (6, 4, '09:00:00', '17:00:00'), (6, 5, '09:00:00', '17:00:00'),
-- Dr. Seraphina Zhao (Dermatology)
(7, 0, '09:00:00', '17:00:00'), (7, 1, '09:00:00', '17:00:00'), (7, 2, '09:00:00', '17:00:00'),
(7, 3, '09:00:00', '17:00:00'), (7, 4, '09:00:00', '17:00:00'), (7, 5, '09:00:00', '17:00:00'),
-- Dr. Kieran Walsh (Orthopedics)
(8, 0, '09:00:00', '17:00:00'), (8, 1, '09:00:00', '17:00:00'), (8, 2, '09:00:00', '17:00:00'),
(8, 3, '09:00:00', '17:00:00'), (8, 4, '09:00:00', '17:00:00'), (8, 5, '09:00:00', '17:00:00'),
-- Dr. Maya Lin (Pediatrics)
(9, 0, '09:00:00', '17:00:00'), (9, 1, '09:00:00', '17:00:00'), (9, 2, '09:00:00', '17:00:00'),
(9, 3, '09:00:00', '17:00:00'), (9, 4, '09:00:00', '17:00:00'), (9, 5, '09:00:00', '17:00:00'),
-- Dr. Edward Vance (Oncology)
(10, 0, '09:00:00', '17:00:00'), (10, 1, '09:00:00', '17:00:00'), (10, 2, '09:00:00', '17:00:00'),
(10, 3, '09:00:00', '17:00:00'), (10, 4, '09:00:00', '17:00:00'), (10, 5, '09:00:00', '17:00:00');

-- 6. Insert Sample Appointments
INSERT INTO `appointments` (`id`, `patient_id`, `doctor_id`, `slot_start`, `slot_end`, `status`, `meet_link`) VALUES
(1, 3, 5, DATE_ADD(CURRENT_DATE(), INTERVAL '1 10:00:00' DAY_SECOND), DATE_ADD(CURRENT_DATE(), INTERVAL '1 10:30:00' DAY_SECOND), 'scheduled', 'https://meet.google.com/hsc-sync-cardio'),
(2, 3, 7, DATE_SUB(CURRENT_DATE(), INTERVAL '5 -14:00:00' DAY_SECOND), DATE_SUB(CURRENT_DATE(), INTERVAL '5 -14:30:00' DAY_SECOND), 'completed', 'https://meet.google.com/hsc-sync-derm');

-- 7. Insert AI Symptom Triage Records
INSERT INTO `symptom_forms` (`id`, `appointment_id`, `symptoms_text`, `urgency_level`, `chief_complaint`, `suggested_questions`, `severity_scale`, `duration_days`, `medications_allergies`) VALUES
(1, 1, 'I have been feeling chest tightness and mild shortness of breath when walking up the stairs for the last 3 days. Sometimes I feel my heart racing.', 'Medium', 'Atypical Exertional Chest Tightness & Dyspnea', '1. Does the tightness radiate to your left arm or jaw?\n2. Are you experiencing palpitations or lightheadedness upon resting?\n3. Any family history of premature coronary artery disease?', 6, 3, 'Allergic to Penicillin'),
(2, 2, 'Red itchy patches around the inner elbows and neck flare up during weather changes.', 'Low', 'Recurrent Atopic Eczema Flare-ups', '1. Have you switched laundry detergents or body washes?\n2. Does topical moisturization relieve pruritus?', 4, 14, 'None');

-- 8. Insert Completed Prescription & AI Patient Summary
INSERT INTO `prescriptions` (`id`, `appointment_id`, `clinical_notes`, `diagnosis`, `prescription_text`, `medications_json`, `additional_advice`, `patient_summary`) VALUES
(1, 2, 'Patient presents with mild erythema and lichenification on bilateral antecubital fossae. Diagnosis consistent with moderate atopic dermatitis.', 'Atopic Dermatitis (Eczema)', 'Hydrocortisone Cream 1% (Twice daily x 7d), Cetirizine 10mg (Once daily at night x 10d)', '[{"name": "Hydrocortisone Cream 1%", "dosage": "Thin layer", "frequency": "Twice daily", "days": "7"}, {"name": "Cetirizine 10mg", "dosage": "1 tablet", "frequency": "Once daily at night", "days": "10"}]', 'Apply cream immediately after warm showers. Avoid synthetic wool clothing. Stay well hydrated.', 'Summary of visit: Your diagnosis is a mild eczema flare-up. Apply the prescribed soothing hydrocortisone cream twice daily for 7 days and take 1 allergy tablet at bedtime for 10 days to stop nighttime itching. Avoid hot showers and use fragrance-free moisturizer.');

-- 9. Insert Active Medication Reminders
INSERT INTO `reminders` (`id`, `prescription_id`, `medication_name`, `frequency`, `reminder_time`) VALUES
(1, 1, 'Hydrocortisone Cream 1%', 'Twice daily', '08:00:00'),
(2, 1, 'Cetirizine 10mg', 'Once daily at night', '21:00:00');

-- 10. Insert Outbox Notification Logs
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `recipient_email`, `status`, `retry_count`, `created_at`) VALUES
(1, 3, 'Appointment Confirmed', 'Your appointment with Dr. Victoria Sterling has been successfully scheduled for tomorrow at 10:00 AM.', 'guest_patient@healthcare.com', 'sent', 0, CURRENT_TIMESTAMP),
(2, 5, 'New Appointment Scheduled', 'A new consultation has been booked on your calendar with patient Sienna Hayes.', 'guest_doctor@healthcare.com', 'sent', 0, CURRENT_TIMESTAMP);
