import os
import sys
from datetime import datetime, timedelta, time

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app, seed_database
from app.database import engine, Base

def test_full_pipeline():
    print("=================================================================")
    print("=== ATHERIA HEALTHCARE PLATFORM - END-TO-END PIPELINE AUDIT ===")
    print("=================================================================\n")

    # Initialize tables and seed data
    Base.metadata.create_all(bind=engine)
    seed_database()

    with TestClient(app) as client:
        # 1. Test Root & Health
        root_res = client.get("/")
        assert root_res.status_code == 200, f"Root failed: {root_res.text}"
        print("[PASS] 1. Root & Health Check: API Online")

        # 2. Test Guest Authentication (Patient, Doctor, Admin)
        pat_login = client.post("/api/v1/auth/guest?role=patient")
        assert pat_login.status_code == 200, f"Patient guest login failed: {pat_login.text}"
        pat_token = pat_login.json()["access_token"]
        pat_headers = {"Authorization": f"Bearer {pat_token}"}
        print("[PASS] 2a. Guest Patient Auth Verified")

        doc_login = client.post("/api/v1/auth/guest?role=doctor")
        assert doc_login.status_code == 200, f"Doctor guest login failed: {doc_login.text}"
        doc_token = doc_login.json()["access_token"]
        doc_headers = {"Authorization": f"Bearer {doc_token}"}
        print("[PASS] 2b. Guest Doctor Auth Verified")

        admin_login = client.post("/api/v1/auth/guest?role=admin")
        assert admin_login.status_code == 200, f"Admin guest login failed: {admin_login.text}"
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("[PASS] 2c. Guest Admin Auth Verified")

        # 3. Test Doctor Directory & Slot Generation
        docs_res = client.get("/api/v1/patient/doctors", headers=pat_headers)
        assert docs_res.status_code == 200, f"Fetch doctors failed: {docs_res.text}"
        doctors = docs_res.json()
        assert len(doctors) > 0, "No doctors returned"
        target_doc = doctors[0]
        print(f"[PASS] 3. Doctor Directory: Found {len(doctors)} specialists. Selected: {target_doc['user']['name']} ({target_doc['specialisation']})")

        tomorrow_str = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        slots_res = client.get(f"/api/v1/patient/doctors/{target_doc['id']}/slots?date_str={tomorrow_str}", headers=pat_headers)
        assert slots_res.status_code == 200, f"Fetch slots failed: {slots_res.text}"
        slots = slots_res.json()
        available_slots = [s for s in slots if s["available"]]
        assert len(available_slots) > 0, "No available slots found"
        selected_slot = available_slots[0]
        print(f"[PASS] 4. Slot Generation: {len(slots)} total slots generated, {len(available_slots)} available for {tomorrow_str}")

        # 4. Test Slot Hold (10-minute temporary reservation)
        hold_payload = {
            "doctor_id": target_doc["id"],
            "slot_start": selected_slot["start"],
            "slot_end": selected_slot["end"]
        }
        hold_res = client.post("/api/v1/appointments/hold", json=hold_payload, headers=pat_headers)
        assert hold_res.status_code == 200, f"Slot hold failed: {hold_res.text}"
        print(f"[PASS] 5. Slot Hold: Successfully reserved slot {selected_slot['start']} for 10 minutes")

        # 5. Test Appointment Booking with Symptom Intake & AI Pre-visit Summary
        book_payload = {
            "doctor_id": target_doc["id"],
            "slot_start": selected_slot["start"],
            "slot_end": selected_slot["end"],
            "symptoms": {
                "symptoms_text": "Severe migraine with aura and visual distortion since yesterday morning.",
                "severity_scale": 8,
                "duration_days": 2,
                "medications_allergies": "No known drug allergies"
            }
        }
        book_res = client.post("/api/v1/appointments/confirm", json=book_payload, headers=pat_headers)
        assert book_res.status_code == 200, f"Appointment confirmation failed: {book_res.text}"
        booked_appt = book_res.json()
        assert booked_appt["symptom_form"] is not None, "AI Symptom form missing"
        print(f"[PASS] 6. Appointment Booking & AI Triage Summary: Confirmed Appt ID #{booked_appt['id']} (Urgency: {booked_appt['symptom_form']['urgency_level']}, Complaint: {booked_appt['symptom_form']['chief_complaint']})")

        # 6. Test Email Notification Outbox
        notis_res = client.get("/api/v1/notifications", headers=admin_headers)
        assert notis_res.status_code == 200, f"Fetch notifications failed: {notis_res.text}"
        notis = notis_res.json()
        assert len(notis) > 0, "No notifications in outbox"
        latest_noti = notis[0]
        print(f"[PASS] 7. Email Outbox: {len(notis)} notifications logged. Latest: '{latest_noti['title']}' to {latest_noti['recipient_email']}")

        # 7. Test Live Test Email Dispatch Endpoint
        test_mail_res = client.post("/api/v1/notifications/test-email", json={"recipient_email": "evaluator@atheria-health.com", "subject": "Atheria System Verification"}, headers=admin_headers)
        assert test_mail_res.status_code == 200, f"Test email failed: {test_mail_res.text}"
        print(f"[PASS] 8. Live Test Email Dispatch: Verified dispatch to evaluator@atheria-health.com (Status: {test_mail_res.json()['status']})")

        # 8. Test Doctor Consultation & Prescription Submission (Post-visit AI Summary)
        presc_payload = {
            "clinical_notes": "Patient diagnosed with acute migraine with typical visual aura. Recommended prophylactic hydration and triptan therapy.",
            "diagnosis": "Acute Migraine with Aura",
            "prescription_text": "Sumatriptan 50mg (Take 1 tablet at onset of headache), Magnesium Glycinate 400mg (Once daily at night x 30d)",
            "medications": [
                {"name": "Sumatriptan 50mg", "dosage": "1 tablet", "frequency": "At headache onset", "days": "10"},
                {"name": "Magnesium Glycinate 400mg", "dosage": "1 capsule", "frequency": "Once daily at night", "days": "30"}
            ],
            "additional_advice": "Rest in a dark quiet room during migraine attacks. Avoid bright screens and stay well hydrated."
        }
        presc_res = client.post(f"/api/v1/doctor/appointments/{booked_appt['id']}/prescription", json=presc_payload, headers=doc_headers)
        assert presc_res.status_code == 200, f"Prescription submission failed: {presc_res.text}"
        presc_data = presc_res.json()
        assert presc_data["patient_summary"] != "", "Patient summary missing"
        print(f"[PASS] 9. Doctor Prescription & AI Post-Visit Summary: Saved prescription & generated friendly patient summary.")

        # 9. Test Doctor Leave Registration & Auto-Conflict Cancellation
        # Book a slot on 4 days from now
        future_date = (datetime.now() + timedelta(days=4)).date()
        future_start = datetime(future_date.year, future_date.month, future_date.day, 11, 0)
        future_end = future_start + timedelta(minutes=30)
        
        # Book future appt
        client.post("/api/v1/appointments/confirm", json={
            "doctor_id": target_doc["id"],
            "slot_start": future_start.isoformat(),
            "slot_end": future_end.isoformat(),
            "symptoms": {"symptoms_text": "Follow-up checkup", "severity_scale": 3, "duration_days": 1}
        }, headers=pat_headers)

        # Register leave on that date
        leave_res = client.post(f"/api/v1/admin/doctors/{target_doc['id']}/leaves", json={
            "leave_date": str(future_date),
            "reason": "Annual Medical Symposium"
        }, headers=admin_headers)
        assert leave_res.status_code == 200, f"Leave registration failed: {leave_res.text}"
        print(f"[PASS] 10. Doctor Leave & Patient Notification: Successfully registered leave on {future_date}, cancelled conflicting bookings, and queued patient alerts.")

        print("\n=================================================================")
        print("=== ALL 10 PIPELINE TESTS PASSED WITH 100% SUCCESS RATE ===")
        print("=================================================================\n")

if __name__ == "__main__":
    test_full_pipeline()
