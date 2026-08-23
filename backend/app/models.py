from sqlalchemy import Column, Integer, String, DateTime, Date, Time, Text, ForeignKey, UniqueConstraint, Computed, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="patient")  # patient, doctor, admin
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    google_refresh_token = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False, cascade="all, delete-orphan")
    appointments_as_patient = relationship("Appointment", back_populates="patient", foreign_keys="Appointment.patient_id")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    specialisation = Column(String(100), nullable=False)
    slot_duration_minutes = Column(Integer, nullable=False, default=30)
    experience_years = Column(Integer, nullable=False, default=8)
    consultation_fee = Column(Integer, nullable=False, default=120)
    room_suite = Column(String(50), nullable=True, default="Suite 401A")
    rating = Column(String(10), nullable=True, default="4.95")
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="doctor_profile")
    availabilities = relationship("DoctorAvailability", back_populates="doctor", cascade="all, delete-orphan")
    leaves = relationship("DoctorLeave", back_populates="doctor", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="doctor", foreign_keys="Appointment.doctor_id")

class DoctorAvailability(Base):
    __tablename__ = "doctor_availabilities"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0 = Monday, 6 = Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    # Relationships
    doctor = relationship("Doctor", back_populates="availabilities")

    __table_args__ = (
        UniqueConstraint("doctor_id", "day_of_week", name="uq_doctor_day_availability"),
    )

class DoctorLeave(Base):
    __tablename__ = "doctor_leaves"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    leave_date = Column(Date, nullable=False)
    reason = Column(String(255), nullable=True)

    # Relationships
    doctor = relationship("Doctor", back_populates="leaves")

    __table_args__ = (
        UniqueConstraint("doctor_id", "leave_date", name="uq_doctor_leave_date"),
    )

class SlotHold(Base):
    __tablename__ = "slot_holds"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    slot_start = Column(DateTime, nullable=False)
    slot_end = Column(DateTime, nullable=False)
    held_by_patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime, nullable=False)

    __table_args__ = (
        UniqueConstraint("doctor_id", "slot_start", name="uq_doctor_slot_hold"),
    )

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    slot_start = Column(DateTime, nullable=False)
    slot_end = Column(DateTime, nullable=False)
    status = Column(String(20), nullable=False, default="scheduled")  # scheduled, completed, cancelled
    google_event_id = Column(String(255), nullable=True)
    meet_link = Column(String(255), nullable=True, default="https://meet.google.com/care-consult-room")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Generated column for safe conditional uniqueness:
    # Only active ('scheduled') appointments block the slot. Cancelled appointments release the slot.
    active_slot_key = Column(
        DateTime, 
        Computed("CASE WHEN status = 'scheduled' THEN slot_start ELSE NULL END", persisted=True),
        nullable=True
    )

    # Relationships
    patient = relationship("User", back_populates="appointments_as_patient", foreign_keys=[patient_id])
    doctor = relationship("Doctor", back_populates="appointments", foreign_keys=[doctor_id])
    symptom_form = relationship("SymptomForm", back_populates="appointment", uselist=False, cascade="all, delete-orphan")
    prescription = relationship("Prescription", back_populates="appointment", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("doctor_id", "active_slot_key", name="uq_doctor_active_slot"),
    )

class SymptomForm(Base):
    __tablename__ = "symptom_forms"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), unique=True, nullable=False)
    symptoms_text = Column(Text, nullable=False)
    urgency_level = Column(String(20), nullable=False)  # Low, Medium, High
    chief_complaint = Column(String(255), nullable=False)
    suggested_questions = Column(Text, nullable=False)  # Stored as JSON or newline text
    severity_scale = Column(Integer, nullable=True, default=6)
    duration_days = Column(Integer, nullable=True, default=3)
    medications_allergies = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    appointment = relationship("Appointment", back_populates="symptom_form")

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), unique=True, nullable=False)
    clinical_notes = Column(Text, nullable=False)
    diagnosis = Column(String(255), nullable=True)
    prescription_text = Column(Text, nullable=False)
    medications_json = Column(Text, nullable=True)
    additional_advice = Column(Text, nullable=True)
    patient_summary = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    appointment = relationship("Appointment", back_populates="prescription")
    reminders = relationship("Reminder", back_populates="prescription", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="prescription", cascade="all, delete-orphan")

class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=False)
    medication_name = Column(String(100), nullable=False)
    frequency = Column(String(50), nullable=False)  # e.g., "Once daily", "Twice daily"
    reminder_time = Column(Time, nullable=False)     # e.g., 08:00:00
    last_sent_at = Column(DateTime, nullable=True)

    # Relationships
    prescription = relationship("Prescription", back_populates="reminders")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    recipient_email = Column(String(100), nullable=False)
    status = Column(String(20), default="pending")  # pending, sent, failed
    retry_count = Column(Integer, default=0)
    last_attempt = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")
