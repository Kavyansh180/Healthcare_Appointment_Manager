import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config import settings
from .database import engine, Base, SessionLocal
from .models import User, Doctor, DoctorAvailability
from .auth import get_password_hash
from .scheduler import start_scheduler, shutdown_scheduler

# Import Routers
from .routes.auth import router as auth_router
from .routes.admin import router as admin_router
from .routes.doctor import router as doctor_router
from .routes.patient import router as patient_router
from .routes.appointments import router as appointments_router
from datetime import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MAIN_APP")

from .models import User, Doctor, DoctorAvailability, Appointment, SymptomForm, Prescription, Reminder
from datetime import datetime, timedelta, time, date
import json

def seed_database():
    db = SessionLocal()
    try:
        # 1. Admin Users
        for email, name in [("admin@healthcare.com", "Admin Officer"), ("guest_admin@healthcare.com", "Admin Officer")]:
            admin_exists = db.query(User).filter(User.email == email).first()
            if not admin_exists:
                hashed_pw = get_password_hash("guestpass" if "guest" in email else "adminpassword123")
                admin = User(
                    email=email,
                    password_hash=hashed_pw,
                    role="admin",
                    name=name,
                    phone="+1 (555) 010-0011"
                )
                db.add(admin)
        db.commit()

        # 2. Patient User (Sienna Hayes)
        guest_pat = db.query(User).filter(User.email == "guest_patient@healthcare.com").first()
        if not guest_pat:
            hashed_pw = get_password_hash("guestpass")
            guest_pat = User(
                email="guest_patient@healthcare.com",
                password_hash=hashed_pw,
                role="patient",
                name="Sienna Hayes",
                phone="+1 (555) 789-0123"
            )
            db.add(guest_pat)
            db.commit()
            db.refresh(guest_pat)
        else:
            guest_pat.name = "Sienna Hayes"
            db.commit()

        # 3. 6 Specialists
        specialists_data = [
            {
                "email": "guest_doctor@healthcare.com", # Primary demo doctor
                "name": "Dr. Victoria Sterling",
                "specialisation": "Cardiology",
                "experience_years": 12,
                "consultation_fee": 120,
                "room_suite": "Suite 401A",
                "rating": "4.95",
                "bio": "Board-certified Cardiologist specializing in comprehensive cardiovascular diagnostics, preventive lipidology, and rhythm management."
            },
            {
                "email": "dr.croft@healthcare.com",
                "name": "Dr. Julian Croft",
                "specialisation": "Neurology",
                "experience_years": 15,
                "consultation_fee": 150,
                "room_suite": "Suite 205B",
                "rating": "4.90",
                "bio": "Senior Neurologist specializing in neurodegenerative therapies, chronic cephalalgia, and cognitive electrophysiology."
            },
            {
                "email": "dr.zhao@healthcare.com",
                "name": "Dr. Seraphina Zhao",
                "specialisation": "Dermatology",
                "experience_years": 9,
                "consultation_fee": 95,
                "room_suite": "Suite 102",
                "rating": "4.88",
                "bio": "Clinical and cosmetic dermatologist focusing on autoimmune dermatoses, laser therapeutics, and complex skin lesions."
            },
            {
                "email": "dr.walsh@healthcare.com",
                "name": "Dr. Kieran Walsh",
                "specialisation": "Orthopedics",
                "experience_years": 14,
                "consultation_fee": 135,
                "room_suite": "Suite 304",
                "rating": "4.92",
                "bio": "Orthopedic surgeon specializing in sports-related biomechanics, arthroscopic reconstruction, and advanced joint preservation."
            },
            {
                "email": "dr.lin@healthcare.com",
                "name": "Dr. Maya Lin",
                "specialisation": "Pediatrics",
                "experience_years": 10,
                "consultation_fee": 110,
                "room_suite": "Suite 115",
                "rating": "4.97",
                "bio": "Pediatrician specializing in developmental milestones, adolescent immunity, and pediatric preventive care."
            },
            {
                "email": "dr.vance@healthcare.com",
                "name": "Dr. Edward Vance",
                "specialisation": "Oncology",
                "experience_years": 18,
                "consultation_fee": 175,
                "room_suite": "Suite 502",
                "rating": "4.94",
                "bio": "Senior Clinical Oncologist with expertise in precision biomarker-driven therapies and targeted immuno-oncology protocols."
            }
        ]

        seeded_doctors = {}
        for s in specialists_data:
            doc_user = db.query(User).filter(User.email == s["email"]).first()
            if not doc_user:
                hashed_pw = get_password_hash("guestpass")
                doc_user = User(
                    email=s["email"],
                    password_hash=hashed_pw,
                    role="doctor",
                    name=s["name"],
                    phone="+1 (555) 432-8900"
                )
                db.add(doc_user)
                db.flush()

                doc_prof = Doctor(
                    id=doc_user.id,
                    specialisation=s["specialisation"],
                    slot_duration_minutes=30,
                    experience_years=s["experience_years"],
                    consultation_fee=s["consultation_fee"],
                    room_suite=s["room_suite"],
                    rating=s["rating"],
                    bio=s["bio"]
                )
                db.add(doc_prof)

                # Seed weekday availability (Mon-Sat 09:00 - 17:00)
                for d in range(0, 6): # 0=Mon, 5=Sat
                    db.add(DoctorAvailability(
                        doctor_id=doc_user.id,
                        day_of_week=d,
                        start_time=time(hour=9, minute=0),
                        end_time=time(hour=17, minute=0)
                    ))
                db.commit()
            else:
                doc_user.name = s["name"]
                if doc_user.doctor_profile:
                    doc_user.doctor_profile.specialisation = s["specialisation"]
                    doc_user.doctor_profile.bio = s["bio"]
                    doc_user.doctor_profile.rating = s["rating"]
                    doc_user.doctor_profile.room_suite = s["room_suite"]
                    doc_user.doctor_profile.consultation_fee = s["consultation_fee"]
                    doc_user.doctor_profile.experience_years = s["experience_years"]
                # Ensure availability exists
                for d in range(0, 6):
                    exists = db.query(DoctorAvailability).filter(
                        DoctorAvailability.doctor_id == doc_user.id,
                        DoctorAvailability.day_of_week == d
                    ).first()
                    if not exists:
                        db.add(DoctorAvailability(
                            doctor_id=doc_user.id,
                            day_of_week=d,
                            start_time=time(hour=9, minute=0),
                            end_time=time(hour=17, minute=0)
                        ))
                db.commit()

            seeded_doctors[s["specialisation"]] = doc_user.id

        # 4. Seed Sample Appointments for Sienna Hayes
        # Next upcoming visit with Dr. Victoria Sterling (tomorrow 10:00 AM)
        tomorrow = datetime.now() + timedelta(days=1)
        slot_start = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 10, 0)
        slot_end = slot_start + timedelta(minutes=30)

        cardio_id = seeded_doctors.get("Cardiology")
        if cardio_id and guest_pat:
            existing_appt = db.query(Appointment).filter(
                Appointment.patient_id == guest_pat.id,
                Appointment.doctor_id == cardio_id,
                Appointment.status == "scheduled"
            ).first()

            if not existing_appt:
                appt = Appointment(
                    patient_id=guest_pat.id,
                    doctor_id=cardio_id,
                    slot_start=slot_start,
                    slot_end=slot_end,
                    status="scheduled",
                    meet_link="https://meet.google.com/hsc-sync-cardio"
                )
                db.add(appt)
                db.flush()

                symptom = SymptomForm(
                    appointment_id=appt.id,
                    symptoms_text="I have been feeling chest tightness and mild shortness of breath when walking up the stairs for the last 3 days. Sometimes I feel my heart racing.",
                    urgency_level="Medium",
                    chief_complaint="Atypical Exertional Chest Tightness & Dyspnea",
                    suggested_questions="1. Does the tightness radiate to your left arm or jaw?\n2. Are you experiencing palpitations or lightheadedness upon resting?\n3. Any family history of premature coronary artery disease?",
                    severity_scale=6,
                    duration_days=3,
                    medications_allergies="Allergic to Penicillin"
                )
                db.add(symptom)
                db.commit()

        # Seed Completed visit with Dr. Elena Rostova (Dermatology)
        derm_id = seeded_doctors.get("Dermatology")
        if derm_id and guest_pat:
            past_date = datetime.now() - timedelta(days=5)
            past_start = datetime(past_date.year, past_date.month, past_date.day, 14, 0)
            past_end = past_start + timedelta(minutes=30)

            existing_past = db.query(Appointment).filter(
                Appointment.patient_id == guest_pat.id,
                Appointment.doctor_id == derm_id,
                Appointment.status == "completed"
            ).first()

            if not existing_past:
                past_appt = Appointment(
                    patient_id=guest_pat.id,
                    doctor_id=derm_id,
                    slot_start=past_start,
                    slot_end=past_end,
                    status="completed",
                    meet_link="https://meet.google.com/hsc-sync-derm"
                )
                db.add(past_appt)
                db.flush()

                db.add(SymptomForm(
                    appointment_id=past_appt.id,
                    symptoms_text="Red itchy patches around the inner elbows and neck flare up during weather changes.",
                    urgency_level="Low",
                    chief_complaint="Recurrent Atopic Eczema Flare-ups",
                    suggested_questions="1. Have you switched laundry detergents or body washes?\n2. Does topical moisturization relieve pruritus?",
                    severity_scale=4,
                    duration_days=14,
                    medications_allergies="None"
                ))

                meds = [
                    {"name": "Hydrocortisone Cream 1%", "dosage": "Thin layer", "frequency": "Twice daily", "days": "7"},
                    {"name": "Cetirizine 10mg", "dosage": "1 tablet", "frequency": "Once daily at night", "days": "10"}
                ]

                presc = Prescription(
                    appointment_id=past_appt.id,
                    clinical_notes="Patient presents with mild erythema and lichenification on bilateral antecubital fossae. Diagnosis consistent with moderate atopic dermatitis.",
                    diagnosis="Atopic Dermatitis (Eczema)",
                    prescription_text="Hydrocortisone Cream 1% (Twice daily x 7d), Cetirizine 10mg (Once daily at night x 10d)",
                    medications_json=json.dumps(meds),
                    additional_advice="Apply cream immediately after warm showers. Avoid synthetic wool clothing. Stay well hydrated.",
                    patient_summary="Summary of visit: Your diagnosis is a mild eczema flare-up. Apply the prescribed soothing hydrocortisone cream twice daily for 7 days and take 1 allergy tablet at bedtime for 10 days to stop nighttime itching. Avoid hot showers and use fragrance-free moisturizer."
                )
                db.add(presc)
                db.commit()

        logger.info("Database successfully seeded with 6 specialists, schedules, and clinical demo data.")

    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    logger.info("Seeding database...")
    seed_database()
    
    logger.info("Starting background scheduler...")
    start_scheduler()
    
    yield
    
    # Shutdown actions
    logger.info("Stopping background scheduler...")
    shutdown_scheduler()

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for Healthcare Appointment and Follow-up Manager",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local/Vite testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
def read_root():
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "message": "Welcome to the Healthcare Appointment & Follow-up Manager API!"
    }

# Register Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(doctor_router, prefix="/api/v1")
app.include_router(patient_router, prefix="/api/v1")
app.include_router(appointments_router, prefix="/api/v1")
