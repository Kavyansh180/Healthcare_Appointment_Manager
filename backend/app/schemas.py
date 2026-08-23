from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date, time
from typing import List, Optional

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str

class TokenData(BaseModel):
    email: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "patient" # patient, doctor, admin

class UserResponse(UserBase):
    id: int
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

# Doctor Availability Schemas
class DoctorAvailabilityBase(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    start_time: time
    end_time: time

class DoctorAvailabilityCreate(DoctorAvailabilityBase):
    pass

class DoctorAvailabilityResponse(DoctorAvailabilityBase):
    id: int
    doctor_id: int

    class Config:
        from_attributes = True

# Doctor Leave Schemas
class DoctorLeaveBase(BaseModel):
    leave_date: date
    reason: Optional[str] = None

class DoctorLeaveCreate(DoctorLeaveBase):
    pass

class DoctorLeaveResponse(DoctorLeaveBase):
    id: int
    doctor_id: int

    class Config:
        from_attributes = True

# Doctor Schemas
class DoctorCreate(BaseModel):
    specialisation: str
    slot_duration_minutes: int = 30
    experience_years: int = 8
    consultation_fee: int = 120
    room_suite: Optional[str] = "Suite 401A"
    rating: Optional[str] = "4.95"
    bio: Optional[str] = None
    availabilities: Optional[List[DoctorAvailabilityCreate]] = []

class DoctorProfileResponse(BaseModel):
    id: int
    specialisation: str
    slot_duration_minutes: int
    experience_years: int
    consultation_fee: int
    room_suite: Optional[str] = None
    rating: Optional[str] = None
    bio: Optional[str] = None
    user: UserResponse

    class Config:
        from_attributes = True

# Appointment Slot Schemas
class TimeSlot(BaseModel):
    start: datetime
    end: datetime
    available: bool

# Slot Hold Schemas
class SlotHoldCreate(BaseModel):
    doctor_id: int
    slot_start: datetime
    slot_end: datetime

class SlotHoldResponse(BaseModel):
    id: int
    doctor_id: int
    slot_start: datetime
    slot_end: datetime
    held_by_patient_id: int
    expires_at: datetime

    class Config:
        from_attributes = True

# Symptom Form Schemas
class SymptomFormCreate(BaseModel):
    symptoms_text: str
    severity_scale: Optional[int] = 6
    duration_days: Optional[int] = 3
    medications_allergies: Optional[str] = None

class SymptomFormResponse(BaseModel):
    id: int
    appointment_id: int
    symptoms_text: str
    urgency_level: str
    chief_complaint: str
    suggested_questions: str
    severity_scale: Optional[int] = 6
    duration_days: Optional[int] = 3
    medications_allergies: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Prescription / Post-Visit Schemas
class PrescriptionCreate(BaseModel):
    clinical_notes: str
    diagnosis: Optional[str] = None
    prescription_text: str
    medications_json: Optional[str] = None
    additional_advice: Optional[str] = None

class PrescriptionResponse(BaseModel):
    id: int
    appointment_id: int
    clinical_notes: str
    diagnosis: Optional[str] = None
    prescription_text: str
    medications_json: Optional[str] = None
    additional_advice: Optional[str] = None
    patient_summary: str
    created_at: datetime

    class Config:
        from_attributes = True

# Appointment Schemas
class AppointmentCreate(BaseModel):
    doctor_id: int
    slot_start: datetime
    slot_end: datetime
    symptoms: SymptomFormCreate

class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    slot_start: datetime
    slot_end: datetime
    status: str
    google_event_id: Optional[str] = None
    meet_link: Optional[str] = None
    created_at: datetime
    patient: UserResponse
    doctor: DoctorProfileResponse
    symptom_form: Optional[SymptomFormResponse] = None
    prescription: Optional[PrescriptionResponse] = None

    class Config:
        from_attributes = True

# Notification Schemas
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    html_content: Optional[str] = None
    recipient_email: str
    status: str  # pending, sent, failed
    retry_count: int
    last_attempt: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationStats(BaseModel):
    total_count: int
    sent_count: int
    pending_count: int
    failed_count: int

class TestEmailRequest(BaseModel):
    recipient_email: EmailStr
    subject: Optional[str] = "Atheria Live Email Test"

