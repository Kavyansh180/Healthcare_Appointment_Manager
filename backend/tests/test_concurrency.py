import threading
import time
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, engine, Base
from app.models import User, Doctor, DoctorAvailability, SlotHold, Appointment
from app.auth import get_password_hash
from datetime import datetime, timedelta

def setup_test_data():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    # Clean old test data
    test_users = db.query(User).filter(User.email.in_(["doc_concur@test.com", "patient1@test.com", "patient2@test.com"])).all()
    test_ids = [u.id for u in test_users]
    if test_ids:
        db.query(SlotHold).filter(SlotHold.held_by_patient_id.in_(test_ids)).delete(synchronize_session=False)
        db.query(Appointment).filter((Appointment.patient_id.in_(test_ids)) | (Appointment.doctor_id.in_(test_ids))).delete(synchronize_session=False)
        db.query(DoctorAvailability).filter(DoctorAvailability.doctor_id.in_(test_ids)).delete(synchronize_session=False)
        db.query(Doctor).filter(Doctor.id.in_(test_ids)).delete(synchronize_session=False)
        db.query(User).filter(User.id.in_(test_ids)).delete(synchronize_session=False)
        db.commit()

    # Create Doctor
    doc_user = User(
        email="doc_concur@test.com",
        password_hash=get_password_hash("pass"),
        role="doctor",
        name="Dr. Concurrency"
    )
    db.add(doc_user)
    db.flush()

    doctor = Doctor(id=doc_user.id, specialisation="Concurrology", slot_duration_minutes=30)
    db.add(doctor)

    # Create Patients
    p1 = User(email="patient1@test.com", password_hash=get_password_hash("pass"), role="patient", name="Patient 1")
    p2 = User(email="patient2@test.com", password_hash=get_password_hash("pass"), role="patient", name="Patient 2")
    db.add(p1)
    db.add(p2)

    db.commit()
    doc_id = doctor.id
    p1_id = p1.id
    p2_id = p2.id
    db.close()
    
    return doc_id, p1_id, p2_id

results = []

def attempt_hold(patient_id, doctor_id, slot_start, slot_end):
    db = SessionLocal()
    now = datetime.utcnow()
    try:
        # Check active appointments and holds
        appt = db.query(Appointment).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.slot_start == slot_start,
            Appointment.status == "scheduled"
        ).with_for_update().first()
        
        if appt:
            results.append((patient_id, "FAIL_BOOKED"))
            db.close()
            return
            
        existing_hold = db.query(SlotHold).filter(
            SlotHold.doctor_id == doctor_id,
            SlotHold.slot_start == slot_start,
            SlotHold.expires_at > now
        ).with_for_update().first()
        
        if existing_hold:
            results.append((patient_id, "FAIL_HELD"))
            db.close()
            return
            
        # Create hold
        hold = SlotHold(
            doctor_id=doctor_id,
            slot_start=slot_start,
            slot_end=slot_end,
            held_by_patient_id=patient_id,
            expires_at=now + timedelta(minutes=10)
        )
        db.add(hold)
        db.commit()
        results.append((patient_id, "SUCCESS"))
    except Exception as e:
        db.rollback()
        results.append((patient_id, f"FAIL_EXCEPTION: {type(e).__name__}"))
    finally:
        db.close()

def run_concurrency_test():
    doc_id, p1_id, p2_id = setup_test_data()
    
    slot_start = datetime.utcnow().replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=1)
    slot_end = slot_start + timedelta(minutes=30)
    
    print(f"Starting concurrency test for slot: {slot_start} to {slot_end}...")
    
    # Spawn 2 threads to hold the same slot
    t1 = threading.Thread(target=attempt_hold, args=(p1_id, doc_id, slot_start, slot_end))
    t2 = threading.Thread(target=attempt_hold, args=(p2_id, doc_id, slot_start, slot_end))
    
    t1.start()
    t2.start()
    
    t1.join()
    t2.join()
    
    print("\n--- TEST RESULTS ---")
    for pid, res in results:
        print(f"Patient ID {pid}: {res}")
        
    successes = [r for p, r in results if r == "SUCCESS"]
    failures = [r for p, r in results if "FAIL" in r or "IntegrityError" in r]
    
    print(f"Total Successes: {len(successes)}")
    print(f"Total Failures/Blocks: {len(failures)}")
    
    # Assertions
    assert len(successes) == 1, f"Expected exactly 1 success, got {len(successes)}"
    assert len(failures) == 1, f"Expected exactly 1 failure, got {len(failures)}"
    print("\nCONCURRENCY TEST PASSED SUCCESSFULLY! Database unique constraint and row locks protected the slot.")

if __name__ == "__main__":
    run_concurrency_test()
