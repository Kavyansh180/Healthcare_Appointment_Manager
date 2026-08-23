from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta, time
from typing import List

from ..database import get_db
from ..models import User, Doctor, DoctorAvailability, DoctorLeave, Appointment, SlotHold
from ..schemas import DoctorProfileResponse, AppointmentResponse, TimeSlot
from ..auth import RoleChecker, get_current_user

router = APIRouter(prefix="/patient", tags=["Patient Portal"])
patient_required = RoleChecker(["patient"])

from typing import List, Optional

@router.get("/doctors", response_model=List[DoctorProfileResponse])
def get_all_doctors_for_patient(
    specialisation: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(patient_required)
):
    query = db.query(Doctor).join(Doctor.user)
    if specialisation and specialisation.lower() != "all":
        query = query.filter(Doctor.specialisation.ilike(f"%{specialisation}%"))
    if search:
        query = query.filter(
            (User.name.ilike(f"%{search}%")) | 
            (Doctor.specialisation.ilike(f"%{search}%")) |
            (Doctor.bio.ilike(f"%{search}%"))
        )
    return query.all()

@router.get("/overview")
def get_patient_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(patient_required)
):
    appts = db.query(Appointment).filter(Appointment.patient_id == current_user.id).all()
    scheduled = [a for a in appts if a.status == "scheduled"]
    completed = [a for a in appts if a.status == "completed"]
    
    # Sort scheduled to find next appointment
    scheduled.sort(key=lambda x: x.slot_start)
    next_appt = None
    if scheduled:
        next_obj = scheduled[0]
        next_appt = {
            "id": next_obj.id,
            "doctor_name": next_obj.doctor.user.name,
            "specialisation": next_obj.doctor.specialisation,
            "slot_start": next_obj.slot_start.isoformat(),
            "meet_link": next_obj.meet_link
        }
        
    return {
        "active_appointments_count": len(scheduled),
        "completed_visits_count": len(completed),
        "active_prescriptions_count": len([a for a in completed if a.prescription is not None]),
        "next_appointment": next_appt
    }

@router.get("/appointments", response_model=List[AppointmentResponse])
def get_patient_appointments(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(patient_required)
):
    query = db.query(Appointment).filter(
        Appointment.patient_id == current_user.id
    )
    if status_filter and status_filter != "all":
        query = query.filter(Appointment.status == status_filter)
    return query.order_by(Appointment.slot_start.desc()).all()

def parse_time_helper(t, default_hour=9):
    if isinstance(t, time):
        return t
    if isinstance(t, str):
        try:
            parts = t.split(":")
            hr = int(parts[0])
            mn = int(parts[1]) if len(parts) > 1 else 0
            sc = int(parts[2]) if len(parts) > 2 else 0
            return time(hour=hr, minute=mn, second=sc)
        except Exception:
            pass
    return time(hour=default_hour, minute=0)

@router.get("/doctors/{doctor_id}/slots", response_model=List[TimeSlot])
def get_doctor_slots(
    doctor_id: int,
    date_str: str,  # Format: "YYYY-MM-DD"
    db: Session = Depends(get_db),
    current_user: User = Depends(patient_required)
):
    # Parse date
    try:
        query_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid date format. Use YYYY-MM-DD."
        )
        
    # Check if doctor exists
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
        
    # Check if doctor is on leave
    on_leave = db.query(DoctorLeave).filter(
        DoctorLeave.doctor_id == doctor_id,
        DoctorLeave.leave_date == query_date
    ).first()
    if on_leave:
        return [] # Return empty slots if doctor is on leave
        
    # Get doctor's availability for this day of week (0=Mon, 6=Sun)
    day_of_week = query_date.weekday()
    availability = db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == doctor_id,
        DoctorAvailability.day_of_week == day_of_week
    ).first()
    
    # If no custom schedule, provide standard clinical hours (Mon-Sat: 09:00 - 17:00)
    if not availability:
        if day_of_week < 6: # Monday to Saturday
            start_t = time(hour=9, minute=0)
            end_t = time(hour=17, minute=0)
        else:
            return [] # Sunday closed
    else:
        start_t = parse_time_helper(availability.start_time, default_hour=9)
        end_t = parse_time_helper(availability.end_time, default_hour=17)
        
    # Generate time slots
    slots = []
    slot_duration = timedelta(minutes=doctor.slot_duration_minutes or 30)
    
    # Construct start and end datetimes
    start_dt = datetime.combine(query_date, start_t)
    end_dt = datetime.combine(query_date, end_t)
    
    # Query existing active appointments for that day
    appointments = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.status == "scheduled",
        Appointment.slot_start >= start_dt,
        Appointment.slot_start < end_dt
    ).all()
    
    # Query active slot holds for that day
    now = datetime.utcnow()
    holds = db.query(SlotHold).filter(
        SlotHold.doctor_id == doctor_id,
        SlotHold.expires_at > now,
        SlotHold.slot_start >= start_dt,
        SlotHold.slot_start < end_dt
    ).all()
    
    # Keep track of booked times and held times
    booked_starts = {appt.slot_start for appt in appointments}
    held_starts = {hold.slot_start for hold in holds}
    
    current_slot = start_dt
    while current_slot + slot_duration <= end_dt:
        # Don't show past slots if query is for today
        is_past = False
        if query_date == date.today():
            # Standard local time / utc check.
            # For simplicity, compare UTC or local. Let's compare local time.
            now_dt = datetime.now()
            # If current slot is before now, it's past
            if current_slot < now_dt:
                is_past = True
                
        is_available = not is_past and (current_slot not in booked_starts) and (current_slot not in held_starts)
        
        slots.append(TimeSlot(
            start=current_slot,
            end=current_slot + slot_duration,
            available=is_available
        ))
        current_slot += slot_duration
        
    return slots
