-- ============================================================================
-- ATHERIA HEALTHCARE APPOINTMENT & FOLLOW-UP SUITE
-- Production Relational Database Schema (MySQL / PostgreSQL / Standard SQL DDL)
-- ============================================================================

-- Create database if needed
CREATE DATABASE IF NOT EXISTS `healthcare_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `healthcare_db`;

-- Drop existing tables in reverse dependency order
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `reminders`;
DROP TABLE IF EXISTS `prescriptions`;
DROP TABLE IF EXISTS `symptom_forms`;
DROP TABLE IF EXISTS `appointments`;
DROP TABLE IF EXISTS `slot_holds`;
DROP TABLE IF EXISTS `doctor_leaves`;
DROP TABLE IF EXISTS `doctor_availabilities`;
DROP TABLE IF EXISTS `doctors`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. USERS TABLE: Core Authentication & Role Management (Patient, Doctor, Admin)
-- ============================================================================
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'patient' COMMENT 'patient | doctor | admin',
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NULL,
  `google_refresh_token` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. DOCTORS TABLE: Specialist Profiles, Consultation Settings & Bios
-- ============================================================================
CREATE TABLE `doctors` (
  `id` INT PRIMARY KEY,
  `specialisation` VARCHAR(100) NOT NULL,
  `slot_duration_minutes` INT NOT NULL DEFAULT 30,
  `experience_years` INT NOT NULL DEFAULT 8,
  `consultation_fee` INT NOT NULL DEFAULT 120,
  `room_suite` VARCHAR(50) DEFAULT 'Suite 401A',
  `rating` VARCHAR(10) DEFAULT '4.95',
  `bio` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_doctors_user` FOREIGN KEY (`id`) 
    REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_doctors_specialisation` (`specialisation`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. DOCTOR AVAILABILITIES TABLE: Weekly Recurring Working Hours (0=Mon .. 6=Sun)
-- ============================================================================
CREATE TABLE `doctor_availabilities` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `doctor_id` INT NOT NULL,
  `day_of_week` TINYINT NOT NULL COMMENT '0=Monday, 1=Tuesday, ..., 6=Sunday',
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  CONSTRAINT `fk_availabilities_doctor` FOREIGN KEY (`doctor_id`) 
    REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `uq_doctor_day_availability` UNIQUE (`doctor_id`, `day_of_week`),
  INDEX `idx_availabilities_doctor_day` (`doctor_id`, `day_of_week`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. DOCTOR LEAVES TABLE: Date-Specific Off Days & Scheduled Absences
-- ============================================================================
CREATE TABLE `doctor_leaves` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `doctor_id` INT NOT NULL,
  `leave_date` DATE NOT NULL,
  `reason` VARCHAR(255) NULL,
  CONSTRAINT `fk_leaves_doctor` FOREIGN KEY (`doctor_id`) 
    REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `uq_doctor_leave_date` UNIQUE (`doctor_id`, `leave_date`),
  INDEX `idx_leaves_doctor_date` (`doctor_id`, `leave_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. SLOT HOLDS TABLE: 10-Minute Pessimistic Reservation Locking System
-- ============================================================================
CREATE TABLE `slot_holds` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `doctor_id` INT NOT NULL,
  `slot_start` DATETIME NOT NULL,
  `slot_end` DATETIME NOT NULL,
  `held_by_patient_id` INT NOT NULL,
  `expires_at` DATETIME NOT NULL,
  CONSTRAINT `fk_slot_holds_doctor` FOREIGN KEY (`doctor_id`) 
    REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_slot_holds_patient` FOREIGN KEY (`held_by_patient_id`) 
    REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `uq_doctor_slot_hold` UNIQUE (`doctor_id`, `slot_start`),
  INDEX `idx_slot_holds_expiry` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. APPOINTMENTS TABLE: Clinical Consultations & Concurrency Safe Keys
-- ============================================================================
CREATE TABLE `appointments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT NOT NULL,
  `doctor_id` INT NOT NULL,
  `slot_start` DATETIME NOT NULL,
  `slot_end` DATETIME NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'scheduled' COMMENT 'scheduled | completed | cancelled',
  `google_event_id` VARCHAR(255) NULL,
  `meet_link` VARCHAR(255) DEFAULT 'https://meet.google.com/care-consult-room',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Generated column to guarantee conditional uniqueness:
  -- Only 'scheduled' appointments claim the slot. Cancelled appointments evaluate to NULL.
  `active_slot_key` DATETIME GENERATED ALWAYS AS (
    CASE WHEN `status` = 'scheduled' THEN `slot_start` ELSE NULL END
  ) STORED,

  CONSTRAINT `fk_appointments_patient` FOREIGN KEY (`patient_id`) 
    REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_appointments_doctor` FOREIGN KEY (`doctor_id`) 
    REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `uq_doctor_active_slot` UNIQUE (`doctor_id`, `active_slot_key`),
  INDEX `idx_appointments_doctor_slot` (`doctor_id`, `slot_start`),
  INDEX `idx_appointments_patient` (`patient_id`),
  INDEX `idx_appointments_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. SYMPTOM FORMS TABLE: Patient Intake & AI Clinical Triage Summaries
-- ============================================================================
CREATE TABLE `symptom_forms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `appointment_id` INT NOT NULL UNIQUE,
  `symptoms_text` TEXT NOT NULL,
  `urgency_level` VARCHAR(20) NOT NULL COMMENT 'Low | Medium | High',
  `chief_complaint` VARCHAR(255) NOT NULL,
  `suggested_questions` TEXT NOT NULL,
  `severity_scale` TINYINT DEFAULT 6,
  `duration_days` INT DEFAULT 3,
  `medications_allergies` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_symptom_forms_appointment` FOREIGN KEY (`appointment_id`) 
    REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  INDEX `idx_symptom_urgency` (`urgency_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. PRESCRIPTIONS TABLE: Doctor Notes & AI Patient-Friendly Summaries
-- ============================================================================
CREATE TABLE `prescriptions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `appointment_id` INT NOT NULL UNIQUE,
  `clinical_notes` TEXT NOT NULL,
  `diagnosis` VARCHAR(255) NULL,
  `prescription_text` TEXT NOT NULL,
  `medications_json` TEXT NULL COMMENT 'Structured JSON array of prescribed medicines',
  `additional_advice` TEXT NULL,
  `patient_summary` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_prescriptions_appointment` FOREIGN KEY (`appointment_id`) 
    REFERENCES `appointments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. REMINDERS TABLE: Automated Daily Medication Reminders
-- ============================================================================
CREATE TABLE `reminders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `prescription_id` INT NOT NULL,
  `medication_name` VARCHAR(100) NOT NULL,
  `frequency` VARCHAR(50) NOT NULL COMMENT 'e.g. Once daily, Twice daily',
  `reminder_time` TIME NOT NULL,
  `last_sent_at` DATETIME NULL,
  CONSTRAINT `fk_reminders_prescription` FOREIGN KEY (`prescription_id`) 
    REFERENCES `prescriptions` (`id`) ON DELETE CASCADE,
  INDEX `idx_reminders_time` (`reminder_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 10. NOTIFICATIONS TABLE: Outbox Queue for Reliable Email Delivery & Retries
-- ============================================================================
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `html_content` TEXT NULL,
  `recipient_email` VARCHAR(100) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending | sent | failed',
  `retry_count` INT NOT NULL DEFAULT 0,
  `last_attempt` DATETIME NULL,
  `error_message` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) 
    REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_notifications_status` (`status`),
  INDEX `idx_notifications_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
