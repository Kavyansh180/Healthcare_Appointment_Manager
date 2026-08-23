from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from typing import List

from ..database import get_db
from ..models import User, Doctor, DoctorAvailability, DoctorLeave, Appointment, Notification
from ..schemas import DoctorCreate, DoctorProfileResponse, DoctorAvailabilityCreate, DoctorAvailabilityResponse, DoctorLeaveCreate, DoctorLeaveResponse, UserCreate
from ..auth import RoleChecker, get_password_hash
from ..calendar_service import delete_appointment_calendar_event
from ..email_service import get_leave_cancellation_patient_html, get_leave_cancellation_doctor_html

router = APIRouter(prefix="/admin", tags=["Admin Portal"])
admin_required = Depends(RoleChecker(["admin"]))

@router.post("/doctors", response_model=DoctorProfileResponse, status_code=status.HTTP_201_CREATED)
def create_doctor(
    user_in: UserCreate, 
    doctor_in: DoctorCreate, 
    db: Session = Depends(get_db),
    _ = admin_required
):
    # Verify user doesn't exist
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        # If user exists, check if they are already a doctor
        if existing_user.role == "doctor":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A doctor profile already exists with this email."
            )
        # Convert existing user to doctor
        user = existing_user
        user.role = "doctor"
        user.name = user_in.name
        user.phone = user_in.phone
    else:
        # Create new user as doctor
        hashed_pwd = get_password_hash(user_in.password)
        user = User(
            email=user_in.email,
            password_hash=hashed_pwd,
            role="doctor",
            name=user_in.name,
            phone=user_in.phone
        )
        db.add(user)
        db.flush() # Get user.id
    
    # Create doctor profile
    doctor = Doctor(
        id=user.id,
        specialisation=doctor_in.specialisation,
        slot_duration_minutes=doctor_in.slot_duration_minutes,
        experience_years=doctor_in.experience_years or 8,
        consultation_fee=doctor_in.consultation_fee or 120,
        room_suite=doctor_in.room_suite or "Suite 401A",
        rating=doctor_in.rating or "4.95",
        bio=doctor_in.bio
    )
    db.add(doctor)
    
    # Add availabilities
    for avail in doctor_in.availabilities:
        # Check duplicate availability
        existing_avail = db.query(DoctorAvailability).filter(
            DoctorAvailability.doctor_id == user.id,
            DoctorAvailability.day_of_week == avail.day_of_week
        ).first()
        if not existing_avail:
            db.add(DoctorAvailability(
                doctor_id=user.id,
                day_of_week=avail.day_of_week,
                start_time=avail.start_time,
                end_time=avail.end_time
            ))
            
    db.commit()
    
    # Fetch full doctor profile to return
    result = db.query(Doctor).filter(Doctor.id == user.id).first()
    return result

@router.get("/doctors", response_model=List[DoctorProfileResponse])
def list_doctors(db: Session = Depends(get_db), _ = admin_required):
    return db.query(Doctor).all()

@router.get("/analytics")
def get_admin_analytics(db: Session = Depends(get_db), _ = admin_required):
    total_doctors = db.query(Doctor).count()
    total_patients = db.query(User).filter(User.role == "patient").count()
    all_appts = db.query(Appointment).all()
    
    scheduled_count = len([a for a in all_appts if a.status == "scheduled"])
    completed_count = len([a for a in all_appts if a.status == "completed"])
    cancelled_count = len([a for a in all_appts if a.status == "cancelled"])
    
    # Calculate revenue (completed appts * doctor fee)
    total_revenue = sum([a.doctor.consultation_fee for a in all_appts if a.status == "completed" and a.doctor])
    
    # Specialty breakdown
    specialties = {}
    for doc in db.query(Doctor).all():
        specialties[doc.specialisation] = specialties.get(doc.specialisation, 0) + 1
        
    return {
        "total_doctors": total_doctors,
        "total_patients": total_patients,
        "total_appointments": len(all_appts),
        "total_revenue": total_revenue,
        "status_distribution": {
            "scheduled": scheduled_count,
            "completed": completed_count,
            "cancelled": cancelled_count
        },
        "specialty_distribution": specialties
    }

@router.get("/leaves", response_model=List[DoctorLeaveResponse])
def list_all_leaves(db: Session = Depends(get_db), _ = admin_required):
    return db.query(DoctorLeave).order_by(DoctorLeave.leave_date.desc()).all()

@router.delete("/doctors/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor(doctor_id: int, db: Session = Depends(get_db), _ = admin_required):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
        
    # Delete User profile (which cascades to Doctor)
    user = db.query(User).filter(User.id == doctor_id).first()
    if user:
        db.delete(user)
        db.commit()
    return None

@router.post("/doctors/{doctor_id}/availabilities", response_model=DoctorAvailabilityResponse)
def add_doctor_availability(
    doctor_id: int, 
    avail: DoctorAvailabilityCreate, 
    db: Session = Depends(get_db),
    _ = admin_required
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
        
    # Check if availability already exists for day
    existing_avail = db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == doctor_id,
        DoctorAvailability.day_of_week == avail.day_of_week
    ).first()
    
    if existing_avail:
        existing_avail.start_time = avail.start_time
        existing_avail.end_time = avail.end_time
        db.commit()
        db.refresh(existing_avail)
        return existing_avail
        
    new_avail = DoctorAvailability(
        doctor_id=doctor_id,
        day_of_week=avail.day_of_week,
        start_time=avail.start_time,
        end_time=avail.end_time
    )
    db.add(new_avail)
    db.commit()
    db.refresh(new_avail)
    return new_avail

@router.post("/doctors/{doctor_id}/leaves", response_model=DoctorLeaveResponse)
def add_doctor_leave(
    doctor_id: int, 
    leave_in: DoctorLeaveCreate, 
    db: Session = Depends(get_db),
    _ = admin_required
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
        
    # Check if leave already exists
    existing_leave = db.query(DoctorLeave).filter(
        DoctorLeave.doctor_id == doctor_id,
        DoctorLeave.leave_date == leave_in.leave_date
    ).first()
    
    if existing_leave:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Doctor is already marked on leave for this date."
        )
        
    # Create leave
    leave = DoctorLeave(
        doctor_id=doctor_id,
        leave_date=leave_in.leave_date,
        reason=leave_in.reason
    )
    db.add(leave)
    
    # Check for existing scheduled appointments on that leave date
    conflicting_appointments = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.status == "scheduled"
    ).all()
    
    affected_count = 0
    for appt in conflicting_appointments:
        if appt.slot_start.date() == leave_in.leave_date:
            # 1. Update appointment status to cancelled
            appt.status = "cancelled"
            affected_count += 1
            
            # 2. Queue Email notification for Patient
            slot_str = appt.slot_start.strftime('%Y-%m-%d %H:%M')
            leave_date_str = str(leave_in.leave_date)
            
            patient_msg = (
                f"Dear {appt.patient.name},\n\n"
                f"We regret to inform you that your appointment with Dr. {doctor.user.name} "
                f"scheduled for {slot_str} has been CANCELLED "
                f"because the doctor is on leave on this date ({leave_date_str}).\n\n"
                f"Reason: {leave_in.reason or 'Personal leave'}\n\n"
                f"Please log into your Atheria portal to select a different date or rebook your slot.\n\n"
                f"Regards,\n"
                f"Atheria Healthcare Systems"
            )
            patient_html = get_leave_cancellation_patient_html(
                patient_name=appt.patient.name,
                doctor_name=doctor.user.name,
                slot_time=slot_str,
                leave_date=leave_date_str,
                reason=leave_in.reason
            )
            patient_notification = Notification(
                user_id=appt.patient_id,
                title="Appointment Cancelled - Doctor on Leave",
                message=patient_msg,
                html_content=patient_html,
                recipient_email=appt.patient.email,
                status="pending"
            )
            db.add(patient_notification)
            
            # 3. Queue Email notification for Doctor
            doctor_msg = (
                f"Dear Dr. {doctor.user.name},\n\n"
                f"Your appointment with patient {appt.patient.name} "
                f"on {slot_str} has been cancelled "
                f"as you have registered a leave on {leave_date_str}.\n\n"
                f"Regards,\n"
                f"Atheria Healthcare Systems"
            )
            doctor_html = get_leave_cancellation_doctor_html(
                doctor_name=doctor.user.name,
                patient_name=appt.patient.name,
                slot_time=slot_str,
                leave_date=leave_date_str
            )
            doctor_notification = Notification(
                user_id=doctor_id,
                title="Appointment Cancelled - Leave Registered",
                message=doctor_msg,
                html_content=doctor_html,
                recipient_email=doctor.user.email,
                status="pending"
            )
            db.add(doctor_notification)
            
            # Delete Google Calendar event
            try:
                delete_appointment_calendar_event(db, appt)
            except Exception as e:
                print(f"Failed to delete Google Calendar event: {e}")

    db.commit()
    db.refresh(leave)
    return leave
