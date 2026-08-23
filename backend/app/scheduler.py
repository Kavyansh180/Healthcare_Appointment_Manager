import logging
from datetime import datetime, time, date
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import Notification, Reminder, Prescription, Appointment, User
from .email_service import send_email_with_error, get_medication_reminder_html

logger = logging.getLogger("SCHEDULER")
scheduler = BackgroundScheduler()

def process_email_queue():
    """
    Scans the notifications table and attempts to send pending or retriable emails.
    Acts as a resilient secondary safety net for all notifications.
    """
    logger.info("Background Job: Processing email queue...")
    db = SessionLocal()
    try:
        # Get notifications that are pending or failed with fewer than 3 retries
        pending_notifications = db.query(Notification).filter(
            Notification.status.in_(["pending", "failed"]),
            Notification.retry_count < 3
        ).all()
        
        for noti in pending_notifications:
            logger.info(f"Attempting to send email id={noti.id} to {noti.recipient_email} (Attempt {noti.retry_count + 1})...")
            noti.last_attempt = datetime.utcnow()
            
            success, err_msg = send_email_with_error(
                recipient_email=noti.recipient_email,
                title=noti.title,
                body_text=noti.message,
                body_html=noti.html_content
            )
            if success:
                noti.status = "sent"
                noti.error_message = None
                logger.info(f"Email id={noti.id} sent successfully.")
            else:
                noti.retry_count += 1
                noti.status = "failed"
                noti.error_message = err_msg or "Email dispatch failed"
                logger.error(f"Email id={noti.id} failed: {err_msg}")
                
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error in process_email_queue: {e}")
    finally:
        db.close()

def send_medication_reminders():
    """
    Checks medication reminders for the current hour/minute and dispatches emails.
    """
    logger.info("Background Job: Checking medication reminders...")
    db = SessionLocal()
    try:
        now = datetime.now()
        current_time = now.time()
        today_date = now.date()
        
        # We query all reminders
        reminders = db.query(Reminder).join(Reminder.prescription).join(Prescription.appointment).all()
        
        for reminder in reminders:
            already_sent_today = False
            if reminder.last_sent_at:
                already_sent_today = reminder.last_sent_at.date() == today_date
                
            if not already_sent_today and current_time >= reminder.reminder_time:
                # Retrieve patient details
                appt = reminder.prescription.appointment
                patient = appt.patient
                doc_name = appt.doctor.user.name if appt.doctor and appt.doctor.user else "Attending Specialist"
                
                logger.info(f"Triggering medication reminder id={reminder.id} for {patient.name} ({reminder.medication_name})")
                
                rem_msg = (
                    f"Dear {patient.name},\n\n"
                    f"This is your scheduled reminder to take your medication:\n"
                    f"- Medicine: {reminder.medication_name}\n"
                    f"- Frequency: {reminder.frequency}\n"
                    f"- Scheduled Time: {reminder.reminder_time.strftime('%H:%M')}\n\n"
                    f"Please follow the instructions provided by Dr. {doc_name}.\n\n"
                    f"Regards,\n"
                    f"Atheria Healthcare System"
                )
                
                rem_html = get_medication_reminder_html(
                    patient_name=patient.name,
                    doctor_name=doc_name,
                    medicine_name=reminder.medication_name,
                    frequency=reminder.frequency,
                    reminder_time=reminder.reminder_time.strftime('%H:%M')
                )
                
                notification = Notification(
                    user_id=patient.id,
                    title=f"Medication Reminder: {reminder.medication_name}",
                    message=rem_msg,
                    html_content=rem_html,
                    recipient_email=patient.email,
                    status="pending"
                )
                db.add(notification)
                
                # Update reminder state
                reminder.last_sent_at = datetime.utcnow()
                
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error in send_medication_reminders: {e}")
    finally:
        db.close()

def start_scheduler():
    # Process email queue every 30 seconds
    scheduler.add_job(process_email_queue, 'interval', seconds=30, id='email_queue_job', replace_existing=True)
    
    # Process medication reminders every 60 seconds
    scheduler.add_job(send_medication_reminders, 'interval', seconds=60, id='medication_reminder_job', replace_existing=True)
    
    scheduler.start()
    logger.info("APScheduler background jobs started successfully.")

def shutdown_scheduler():
    scheduler.shutdown()
    logger.info("APScheduler background jobs shut down.")
