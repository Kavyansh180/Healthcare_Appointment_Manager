from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timedelta

from ..database import get_db
from ..models import User, Doctor, Appointment, SlotHold, SymptomForm, Notification
from ..schemas import AppointmentResponse, SlotHoldCreate, SlotHoldResponse, AppointmentCreate
from ..auth import RoleChecker, get_current_user
from ..llm import generate_pre_visit_summary
from ..calendar_service import create_appointment_calendar_event, delete_appointment_calendar_event
from ..email_service import (
    get_booking_confirmation_html,
    get_doctor_new_booking_html,
    get_appointment_cancelled_html,
    dispatch_notification_immediately
)

router = APIRouter(prefix="/appointments", tags=["Appointments & Booking"])
patient_required = RoleChecker(["patient"])

@router.post("/hold", response_model=SlotHoldResponse)
def hold_slot(
    hold_in: SlotHoldCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(patient_required)
):
    now = datetime.utcnow()
    
    # Start a transaction with row-level locking
    # We lock both appointments and slot holds for this slot to prevent double-booking or simultaneous holds
    try:
        # 1. Lock and check existing appointments
        appt = db.query(Appointment).filter(
            Appointment.doctor_id == hold_in.doctor_id,
            Appointment.slot_start == hold_in.slot_start,
            Appointment.status == "scheduled"
        ).with_for_update().first()
        
        if appt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This slot is already booked."
            )
            
        # 2. Lock and check active slot holds
        existing_hold = db.query(SlotHold).filter(
            SlotHold.doctor_id == hold_in.doctor_id,
            SlotHold.slot_start == hold_in.slot_start,
            SlotHold.expires_at > now
        ).with_for_update().first()
        
        if existing_hold:
            if existing_hold.held_by_patient_id == current_user.id:
                # If already held by the same patient, extend the expiration
                existing_hold.expires_at = now + timedelta(minutes=10)
                db.commit()
                db.refresh(existing_hold)
                return existing_hold
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This slot is currently held by another user. Please choose another slot."
                )
                
        # 3. If there's an expired hold on this slot, delete it
        expired_holds = db.query(SlotHold).filter(
            SlotHold.doctor_id == hold_in.doctor_id,
            SlotHold.slot_start == hold_in.slot_start,
            SlotHold.expires_at <= now
        ).all()
        for exp in expired_holds:
            db.delete(exp)
            
        # 4. Create new slot hold
        new_hold = SlotHold(
            doctor_id=hold_in.doctor_id,
            slot_start=hold_in.slot_start,
            slot_end=hold_in.slot_end,
            held_by_patient_id=current_user.id,
            expires_at=now + timedelta(minutes=10)
        )
        db.add(new_hold)
        db.commit()
        db.refresh(new_hold)
        return new_hold
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        # Handle database-level duplicate unique constraint failure
        # In case another parallel transaction committed just before us
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The slot was held or booked by another user in a simultaneous attempt. Please choose another slot."
        )

@router.post("/confirm", response_model=AppointmentResponse)
def confirm_booking(
    booking_in: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(patient_required)
):
    now = datetime.utcnow()
    
    # 1. Start safe transaction
    try:
        # Check if the doctor is on leave on this date
        booking_date = booking_in.slot_start.date()
        on_leave = db.query(Doctor).join(Doctor.leaves).filter(
            Doctor.id == booking_in.doctor_id,
            Doctor.leaves.any(leave_date=booking_date)
        ).first()
        if on_leave:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Doctor is on leave on the selected date. Please choose another date."
            )

        # Retrieve and lock active appointments
        existing_appt = db.query(Appointment).filter(
            Appointment.doctor_id == booking_in.doctor_id,
            Appointment.slot_start == booking_in.slot_start,
            Appointment.status == "scheduled"
        ).with_for_update().first()
        
        if existing_appt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This slot is already booked by another user."
            )
            
        # 2. Check and lock our SlotHold
        hold = db.query(SlotHold).filter(
            SlotHold.doctor_id == booking_in.doctor_id,
            SlotHold.slot_start == booking_in.slot_start,
            SlotHold.held_by_patient_id == current_user.id
        ).with_for_update().first()
        
        # 3. Create Appointment
        appointment = Appointment(
            patient_id=current_user.id,
            doctor_id=booking_in.doctor_id,
            slot_start=booking_in.slot_start,
            slot_end=booking_in.slot_end,
            status="scheduled"
        )
        db.add(appointment)
        db.flush() # Get appointment.id
        
        # 4. Generate Pre-Visit AI Summary
        symptoms_text = booking_in.symptoms.symptoms_text
        ai_summary = generate_pre_visit_summary(symptoms_text)
        
        # Save symptom form
        symptom_form = SymptomForm(
            appointment_id=appointment.id,
            symptoms_text=symptoms_text,
            urgency_level=ai_summary["urgency_level"],
            chief_complaint=ai_summary["chief_complaint"],
            suggested_questions=ai_summary["suggested_questions"],
            severity_scale=booking_in.symptoms.severity_scale or 6,
            duration_days=booking_in.symptoms.duration_days or 3,
            medications_allergies=booking_in.symptoms.medications_allergies
        )
        db.add(symptom_form)
        db.flush()
        
        # Sync Google Calendar event
        try:
            event_id = create_appointment_calendar_event(db, appointment)
            appointment.google_event_id = event_id
        except Exception as e:
            # Calendar failure should not break booking flow
            print(f"Failed to create Google Calendar event: {e}")
        
        # 5. Delete SlotHold if it existed
        if hold:
            db.delete(hold)
            
        # 6. Fetch Doctor info for notifications
        doctor = db.query(Doctor).filter(Doctor.id == booking_in.doctor_id).first()
        
        # 7. Queue Email Notifications
        slot_str = booking_in.slot_start.strftime('%Y-%m-%d %H:%M')
        
        # To Patient
        patient_msg = (
            f"Dear {current_user.name},\n\n"
            f"Your appointment with Dr. {doctor.user.name} has been successfully BOOKED.\n"
            f"Time: {slot_str}\n\n"
            f"We have analysed your symptoms and generated a pre-visit overview for the doctor.\n"
            f"Symptom Urgency: {ai_summary['urgency_level']}\n"
            f"Chief Complaint: {ai_summary['chief_complaint']}\n\n"
            f"Regards,\n"
            f"Atheria Healthcare Systems"
        )
        patient_html = get_booking_confirmation_html(
            patient_name=current_user.name,
            doctor_name=doctor.user.name,
            specialty=doctor.specialisation,
            slot_time=slot_str,
            urgency=ai_summary['urgency_level'],
            chief_complaint=ai_summary['chief_complaint'],
            meet_link=appointment.meet_link
        )
        patient_noti = Notification(
            user_id=current_user.id,
            title="Appointment Confirmed",
            message=patient_msg,
            html_content=patient_html,
            recipient_email=current_user.email,
            status="pending"
        )
        db.add(patient_noti)
        
        # To Doctor
        doctor_msg = (
            f"Dear Dr. {doctor.user.name},\n\n"
            f"A new appointment has been scheduled with patient {current_user.name}.\n"
            f"Time: {slot_str}\n\n"
            f"AI Pre-visit Insights:\n"
            f"- Urgency Level: {ai_summary['urgency_level']}\n"
            f"- Chief Complaint: {ai_summary['chief_complaint']}\n"
            f"- Suggested Questions:\n{ai_summary['suggested_questions']}\n\n"
            f"Please log in to your dashboard to review details.\n\n"
            f"Regards,\n"
            f"Atheria Healthcare Systems"
        )
        doctor_html = get_doctor_new_booking_html(
            doctor_name=doctor.user.name,
            patient_name=current_user.name,
            slot_time=slot_str,
            urgency=ai_summary['urgency_level'],
            chief_complaint=ai_summary['chief_complaint'],
            suggested_questions=ai_summary['suggested_questions']
        )
        doctor_noti = Notification(
            user_id=doctor.id,
            title="New Appointment Scheduled",
            message=doctor_msg,
            html_content=doctor_html,
            recipient_email=doctor.user.email,
            status="pending"
        )
        db.add(doctor_noti)
        
        db.commit()
        
        # Immediately trigger non-blocking email dispatch to patient and doctor
        try:
            dispatch_notification_immediately(patient_noti.id)
            dispatch_notification_immediately(doctor_noti.id)
        except Exception as dispatch_err:
            print(f"Non-blocking dispatch error (will retry via scheduler): {dispatch_err}")
        
        # Fetch the full appointment profile to return
        res = db.query(Appointment).filter(Appointment.id == appointment.id).first()
        return res
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Simultaneous booking occurred or duplicate record constraint: {str(e)}"
        )

@router.post("/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    # Check permissions
    if current_user.role == "patient" and appointment.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this appointment")
    if current_user.role == "doctor" and appointment.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this appointment")
        
    appointment.status = "cancelled"
    
    # Delete calendar event if exists
    try:
        delete_appointment_calendar_event(db, appointment)
    except Exception as e:
        print(f"Error removing calendar event: {e}")
    
    slot_str = appointment.slot_start.strftime('%Y-%m-%d %H:%M')
    doc_name = appointment.doctor.user.name if appointment.doctor and appointment.doctor.user else "Physician"
    pat_name = appointment.patient.name if appointment.patient else "Patient"
    
    # Notify patient
    pat_cancel_msg = f"Your appointment on {slot_str} with Dr. {doc_name} has been cancelled."
    pat_cancel_html = get_appointment_cancelled_html(pat_name, doc_name, slot_str, is_doctor=False)
    patient_noti = Notification(
        user_id=appointment.patient_id,
        title="Appointment Cancelled",
        message=pat_cancel_msg,
        html_content=pat_cancel_html,
        recipient_email=appointment.patient.email,
        status="pending"
    )
    db.add(patient_noti)
    
    # Notify doctor
    doc_cancel_msg = f"Your appointment on {slot_str} with patient {pat_name} has been cancelled."
    doc_cancel_html = get_appointment_cancelled_html(f"Dr. {doc_name}", pat_name, slot_str, is_doctor=True)
    doctor_noti = Notification(
        user_id=appointment.doctor_id,
        title="Appointment Cancelled",
        message=doc_cancel_msg,
        html_content=doc_cancel_html,
        recipient_email=appointment.doctor.user.email,
        status="pending"
    )
    db.add(doctor_noti)
    
    db.commit()
    
    # Immediately trigger non-blocking email dispatch for cancellation
    try:
        dispatch_notification_immediately(patient_noti.id)
        dispatch_notification_immediately(doctor_noti.id)
    except Exception as dispatch_err:
        print(f"Non-blocking dispatch error (will retry via scheduler): {dispatch_err}")

    db.refresh(appointment)
    return appointment
