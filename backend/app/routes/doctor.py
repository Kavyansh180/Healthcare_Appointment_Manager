import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, time
from pydantic import BaseModel

from ..database import get_db
from ..models import User, Doctor, Appointment, Prescription, Reminder, Notification, SymptomForm
from ..schemas import AppointmentResponse, PrescriptionResponse
from ..auth import RoleChecker, get_current_user
from ..llm import generate_patient_friendly_summary

router = APIRouter(prefix="/doctor", tags=["Doctor Portal"])
doctor_required = RoleChecker(["doctor"])

class MedicationRow(BaseModel):
    name: str
    dosage: str
    frequency: str
    days: str

class PrescriptionSubmit(BaseModel):
    clinical_notes: str
    diagnosis: Optional[str] = None
    prescription_text: Optional[str] = ""
    medications: Optional[List[MedicationRow]] = []
    additional_advice: Optional[str] = None

@router.get("/appointments", response_model=List[AppointmentResponse])
def get_doctor_appointments(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(doctor_required)
):
    query = db.query(Appointment).filter(
        Appointment.doctor_id == current_user.id
    )
    if status_filter and status_filter != "all":
        query = query.filter(Appointment.status == status_filter)
    appointments = query.order_by(Appointment.slot_start.asc()).all()
    return appointments

@router.get("/analytics")
def get_doctor_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(doctor_required)
):
    total_appts = db.query(Appointment).filter(Appointment.doctor_id == current_user.id).all()
    upcoming = [a for a in total_appts if a.status == "scheduled"]
    completed = [a for a in total_appts if a.status == "completed"]
    
    urgent_count = 0
    for a in upcoming:
        if a.symptom_form and a.symptom_form.urgency_level == "High":
            urgent_count += 1
            
    return {
        "upcoming_count": len(upcoming),
        "completed_count": len(completed),
        "urgent_triage_count": urgent_count,
        "total_patients": len(set(a.patient_id for a in total_appts))
    }

@router.post("/appointments/{appointment_id}/prescription", response_model=PrescriptionResponse)
def submit_prescription(
    appointment_id: int,
    data: PrescriptionSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(doctor_required)
):
    # Verify appointment exists and belongs to this doctor
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.doctor_id == current_user.id
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Appointment not found or not assigned to this doctor."
        )
        
    if appointment.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot write a prescription for a cancelled appointment."
        )
        
    # Format meds text if prescription_text was empty
    meds_list_json = json.dumps([m.dict() for m in data.medications]) if data.medications else "[]"
    presc_text = data.prescription_text or ""
    if not presc_text and data.medications:
        presc_text = ", ".join([f"{m.name} {m.dosage} ({m.frequency} x {m.days}d)" for m in data.medications])
        
    # Generate Patient Friendly Summary using LLM
    patient_summary = generate_patient_friendly_summary(f"{data.clinical_notes}\nAdvice: {data.additional_advice or ''}")
    
    # Check existing or create new
    prescription = db.query(Prescription).filter(Prescription.appointment_id == appointment_id).first()
    if not prescription:
        prescription = Prescription(
            appointment_id=appointment_id,
            clinical_notes=data.clinical_notes,
            diagnosis=data.diagnosis,
            prescription_text=presc_text,
            medications_json=meds_list_json,
            additional_advice=data.additional_advice,
            patient_summary=patient_summary
        )
        db.add(prescription)
        db.flush()
    else:
        prescription.clinical_notes = data.clinical_notes
        prescription.diagnosis = data.diagnosis
        prescription.prescription_text = presc_text
        prescription.medications_json = meds_list_json
        prescription.additional_advice = data.additional_advice
        prescription.patient_summary = patient_summary
    
    # Create Medication Reminders for each medicine
    for med in data.medications:
        reminder = Reminder(
            prescription_id=prescription.id,
            medication_name=med.name,
            frequency=med.frequency,
            reminder_time=time(hour=8, minute=0)
        )
        db.add(reminder)
        
    # Mark appointment as completed
    appointment.status = "completed"
    
    # Queue Email Notification to Patient with summary
    email_msg = (
        f"Dear {appointment.patient.name},\n\n"
        f"Your consultation with Dr. {current_user.name} is complete.\n\n"
        f"--- Diagnosis ---\n{data.diagnosis or 'Consultation Complete'}\n\n"
        f"--- AI Summary of Your Visit ---\n{patient_summary}\n\n"
        f"--- Prescription ---\n{presc_text}\n\n"
        f"--- Doctor's Advice ---\n{data.additional_advice or 'Follow healthy lifestyle and complete prescribed medication course.'}\n\n"
        f"Regards,\n"
        f"Healthcare Management System"
    )
    
    notification = Notification(
        user_id=appointment.patient_id,
        title="Your Post-Visit Prescription & AI Summary",
        message=email_msg,
        recipient_email=appointment.patient.email,
        status="pending"
    )
    db.add(notification)
    
    db.commit()
    db.refresh(prescription)
    return prescription

