import logging
from datetime import datetime
from sqlalchemy.orm import Session
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from .config import settings
from .models import Appointment, User

logger = logging.getLogger("CALENDAR_SERVICE")

def get_calendar_service(refresh_token: str):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        return None
    try:
        creds = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET
        )
        return build('calendar', 'v3', credentials=creds)
    except Exception as e:
        logger.error(f"Failed to create Google Calendar service: {e}")
        return None

def create_appointment_calendar_event(db: Session, appointment: Appointment) -> str:
    event_summary = f"Appointment: {appointment.patient.name} with Dr. {appointment.doctor.user.name}"
    event_description = f"Medical Consultation.\nPatient symptoms: {appointment.symptom_form.symptoms_text if appointment.symptom_form else 'Not specified'}"
    
    start_time_iso = appointment.slot_start.isoformat() + "Z"
    end_time_iso = appointment.slot_end.isoformat() + "Z"
    
    event_body = {
        'summary': event_summary,
        'description': event_description,
        'start': {
            'dateTime': start_time_iso,
            'timeZone': 'UTC',
        },
        'end': {
            'dateTime': end_time_iso,
            'timeZone': 'UTC',
        },
        'attendees': [
            {'email': appointment.patient.email},
            {'email': appointment.doctor.user.email},
        ],
    }

    # Attempt to write to doctor's or patient's calendar if they have Google tokens
    # We will try the doctor first, then patient
    token = None
    if appointment.doctor.user.google_refresh_token:
        token = appointment.doctor.user.google_refresh_token
        logger.info(f"Using Doctor's Google Calendar refresh token for Appointment {appointment.id}")
    elif appointment.patient.google_refresh_token:
        token = appointment.patient.google_refresh_token
        logger.info(f"Using Patient's Google Calendar refresh token for Appointment {appointment.id}")
        
    if token:
        service = get_calendar_service(token)
        if service:
            try:
                event = service.events().insert(calendarId='primary', body=event_body).execute()
                event_id = event.get('id')
                logger.info(f"Google Calendar Event created: {event_id}")
                return event_id
            except Exception as e:
                logger.error(f"Error calling Google Calendar API: {e}")
                
    # Fallback/Mock Event ID
    mock_id = f"mock-gcal-event-{appointment.id}"
    logger.info(f"[CALENDAR MOCK] Creating Google Calendar event '{event_summary}' from {start_time_iso} to {end_time_iso}")
    return mock_id

def update_appointment_calendar_event(db: Session, appointment: Appointment) -> bool:
    if not appointment.google_event_id or appointment.google_event_id.startswith("mock-gcal-"):
        logger.info(f"[CALENDAR MOCK] Updating Google Calendar event: {appointment.google_event_id} to new slot {appointment.slot_start}")
        return True
        
    token = appointment.doctor.user.google_refresh_token or appointment.patient.google_refresh_token
    if not token:
        return False
        
    service = get_calendar_service(token)
    if not service:
        return False
        
    try:
        # Fetch event
        event = service.events().get(calendarId='primary', eventId=appointment.google_event_id).execute()
        
        # Update timings
        event['start']['dateTime'] = appointment.slot_start.isoformat() + "Z"
        event['end']['dateTime'] = appointment.slot_end.isoformat() + "Z"
        
        service.events().update(calendarId='primary', eventId=appointment.google_event_id, body=event).execute()
        logger.info(f"Google Calendar Event updated: {appointment.google_event_id}")
        return True
    except Exception as e:
        logger.error(f"Error updating Google Calendar event {appointment.google_event_id}: {e}")
        return False

def delete_appointment_calendar_event(db: Session, appointment: Appointment) -> bool:
    if not appointment.google_event_id or appointment.google_event_id.startswith("mock-gcal-"):
        logger.info(f"[CALENDAR MOCK] Deleting Google Calendar event: {appointment.google_event_id}")
        return True
        
    token = appointment.doctor.user.google_refresh_token or appointment.patient.google_refresh_token
    if not token:
        return False
        
    service = get_calendar_service(token)
    if not service:
        return False
        
    try:
        service.events().delete(calendarId='primary', eventId=appointment.google_event_id).execute()
        logger.info(f"Google Calendar Event deleted: {appointment.google_event_id}")
        return True
    except Exception as e:
        logger.error(f"Error deleting Google Calendar event {appointment.google_event_id}: {e}")
        return False
