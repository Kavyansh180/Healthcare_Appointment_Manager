import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from typing import Optional
from .config import settings

logger = logging.getLogger("EMAIL_SERVICE")

def get_email_base_wrapper(title: str, content_html: str) -> str:
    """Wraps email body in the Atheria luxury dark-and-gold branded responsive HTML template."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #060211;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #F7F5F0;
    }}
    .email-container {{
      max-width: 600px;
      margin: 20px auto;
      background: #0f0624;
      border: 1px solid rgba(212, 168, 67, 0.25);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }}
    .header {{
      background: linear-gradient(135deg, #180a3a 0%, #0a0418 100%);
      padding: 30px 35px 20px;
      border-bottom: 1px solid rgba(212, 168, 67, 0.2);
      text-align: center;
    }}
    .brand {{
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 2px;
      color: #D4A843;
      text-transform: uppercase;
      margin-bottom: 4px;
    }}
    .tagline {{
      font-size: 11px;
      color: rgba(247, 245, 240, 0.6);
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }}
    .content {{
      padding: 35px 35px 25px;
      color: #E2DFD7;
      line-height: 1.65;
      font-size: 15px;
    }}
    .card {{
      background: rgba(212, 168, 67, 0.06);
      border: 1px solid rgba(212, 168, 67, 0.2);
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }}
    .badge {{
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 8px;
    }}
    .badge-urgent {{
      background: rgba(239, 68, 68, 0.2);
      color: #F87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }}
    .badge-medium {{
      background: rgba(245, 158, 11, 0.2);
      color: #FBBF24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }}
    .badge-normal {{
      background: rgba(16, 185, 129, 0.2);
      color: #34D399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }}
    .btn {{
      display: inline-block;
      background: linear-gradient(135deg, #D4A843 0%, #E6C670 100%);
      color: #180a3a;
      text-decoration: none;
      font-weight: bold;
      font-size: 14px;
      padding: 12px 28px;
      border-radius: 8px;
      margin-top: 15px;
    }}
    .footer {{
      background: #090315;
      padding: 20px 35px;
      border-top: 1px solid rgba(212, 168, 67, 0.1);
      text-align: center;
      font-size: 12px;
      color: rgba(247, 245, 240, 0.4);
    }}
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="brand">ATHERIA</div>
      <div class="tagline">Clinical Precision • Intelligent Care</div>
    </div>
    <div class="content">
      {content_html}
    </div>
    <div class="footer">
      <p>This is an automated communication from Atheria Healthcare Appointment & Follow-up Suite.</p>
      <p>&copy; Atheria Health Systems. All rights reserved.</p>
    </div>
  </div>
</body>
</html>"""

def get_booking_confirmation_html(
    patient_name: str,
    doctor_name: str,
    specialty: str,
    slot_time: str,
    urgency: str,
    chief_complaint: str,
    meet_link: Optional[str] = None
) -> str:
    urgency_badge = f'<span class="badge badge-urgent">Urgency: {urgency}</span>' if urgency == "High" else (
        f'<span class="badge badge-medium">Urgency: {urgency}</span>' if urgency == "Medium" else
        f'<span class="badge badge-normal">Urgency: {urgency}</span>'
    )
    
    meet_btn = f'<p><a href="{meet_link}" class="btn" style="color: #180a3a;">Join Google Meet Room</a></p>' if meet_link else ''
    
    body = f"""
    <h2 style="color: #D4A843; margin-top: 0;">Appointment Confirmed</h2>
    <p>Dear <strong>{patient_name}</strong>,</p>
    <p>Your consultation with <strong>Dr. {doctor_name}</strong> ({specialty}) has been successfully scheduled.</p>
    
    <div class="card">
      <div style="font-size: 13px; color: #D4A843; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Appointment Details</div>
      <p style="margin: 4px 0;"><strong>Date & Time:</strong> {slot_time}</p>
      <p style="margin: 4px 0;"><strong>Physician:</strong> Dr. {doctor_name} ({specialty})</p>
      <p style="margin: 4px 0;"><strong>Consultation Format:</strong> Virtual Telehealth / In-Clinic</p>
    </div>

    <div class="card">
      <div style="font-size: 13px; color: #D4A843; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">AI Clinical Triage Summary</div>
      {urgency_badge}
      <p style="margin: 6px 0;"><strong>Chief Complaint:</strong> {chief_complaint}</p>
      <p style="font-size: 13px; color: rgba(247, 245, 240, 0.7); margin-top: 8px;">Your symptoms have been pre-processed and shared with Dr. {doctor_name} to ensure prioritized clinical review.</p>
    </div>

    {meet_btn}
    <p style="font-size: 13px; color: rgba(247, 245, 240, 0.6); margin-top: 25px;">Please sign in 5 minutes prior to your scheduled time.</p>
    """
    return get_email_base_wrapper("Appointment Confirmed - Atheria", body)

def get_doctor_new_booking_html(
    doctor_name: str,
    patient_name: str,
    slot_time: str,
    urgency: str,
    chief_complaint: str,
    suggested_questions: str
) -> str:
    urgency_badge = f'<span class="badge badge-urgent">Urgency: {urgency}</span>' if urgency == "High" else (
        f'<span class="badge badge-medium">Urgency: {urgency}</span>' if urgency == "Medium" else
        f'<span class="badge badge-normal">Urgency: {urgency}</span>'
    )
    
    body = f"""
    <h2 style="color: #D4A843; margin-top: 0;">New Appointment Scheduled</h2>
    <p>Dear <strong>Dr. {doctor_name}</strong>,</p>
    <p>A new consultation has been booked on your calendar with patient <strong>{patient_name}</strong>.</p>
    
    <div class="card">
      <div style="font-size: 13px; color: #D4A843; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Schedule Details</div>
      <p style="margin: 4px 0;"><strong>Patient:</strong> {patient_name}</p>
      <p style="margin: 4px 0;"><strong>Date & Time:</strong> {slot_time}</p>
    </div>

    <div class="card">
      <div style="font-size: 13px; color: #D4A843; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">AI Pre-Visit Triage & Insights</div>
      {urgency_badge}
      <p style="margin: 6px 0;"><strong>Chief Complaint:</strong> {chief_complaint}</p>
      <p style="margin: 8px 0 4px; font-weight: bold; font-size: 13px;">Suggested Exploration Questions:</p>
      <pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; font-family: inherit; font-size: 13px; color: #E2DFD7; white-space: pre-wrap; margin: 0;">{suggested_questions}</pre>
    </div>
    """
    return get_email_base_wrapper("New Appointment Scheduled - Atheria", body)

def get_leave_cancellation_patient_html(
    patient_name: str,
    doctor_name: str,
    slot_time: str,
    leave_date: str,
    reason: Optional[str]
) -> str:
    body = f"""
    <h2 style="color: #F87171; margin-top: 0;">Notice of Appointment Cancellation</h2>
    <p>Dear <strong>{patient_name}</strong>,</p>
    <p>We regret to inform you that your appointment with <strong>Dr. {doctor_name}</strong> scheduled for <strong>{slot_time}</strong> has been cancelled due to physician leave on <strong>{leave_date}</strong>.</p>
    
    <div class="card" style="border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05);">
      <p style="margin: 4px 0;"><strong>Physician:</strong> Dr. {doctor_name}</p>
      <p style="margin: 4px 0;"><strong>Original Time:</strong> {slot_time}</p>
      <p style="margin: 4px 0;"><strong>Reason:</strong> {reason or 'Scheduled Leave'}</p>
    </div>

    <p>We apologize for the inconvenience. Please log in to your Atheria patient portal to select another convenient time slot or consult with another available specialist.</p>
    """
    return get_email_base_wrapper("Appointment Rescheduling Required - Atheria", body)

def get_leave_cancellation_doctor_html(
    doctor_name: str,
    patient_name: str,
    slot_time: str,
    leave_date: str
) -> str:
    body = f"""
    <h2 style="color: #FBBF24; margin-top: 0;">Appointment Cancelled Due to Registered Leave</h2>
    <p>Dear <strong>Dr. {doctor_name}</strong>,</p>
    <p>Your scheduled consultation with patient <strong>{patient_name}</strong> on <strong>{slot_time}</strong> has been safely cancelled and released, following your leave registration for <strong>{leave_date}</strong>.</p>
    """
    return get_email_base_wrapper("Schedule Update: Appointment Cancelled - Atheria", body)

def get_appointment_cancelled_html(
    recipient_name: str,
    other_party_name: str,
    slot_time: str,
    is_doctor: bool = False
) -> str:
    body = f"""
    <h2 style="color: #F87171; margin-top: 0;">Appointment Cancelled</h2>
    <p>Dear <strong>{recipient_name}</strong>,</p>
    <p>The appointment scheduled for <strong>{slot_time}</strong> with {'Dr. ' if not is_doctor else ''}{other_party_name} has been cancelled.</p>
    <p>The slot has been released back into the clinical scheduling system.</p>
    """
    return get_email_base_wrapper("Appointment Cancellation Notice - Atheria", body)

def get_post_visit_prescription_html(
    patient_name: str,
    doctor_name: str,
    diagnosis: Optional[str],
    patient_summary: str,
    prescription_text: str,
    advice: Optional[str]
) -> str:
    body = f"""
    <h2 style="color: #D4A843; margin-top: 0;">Post-Visit Care & Prescription</h2>
    <p>Dear <strong>{patient_name}</strong>,</p>
    <p>Thank you for completing your consultation with <strong>Dr. {doctor_name}</strong>. Here is your post-visit summary and prescription.</p>
    
    <div class="card">
      <div style="font-size: 13px; color: #D4A843; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Diagnosis</div>
      <p style="margin: 0; font-size: 16px; font-weight: 600;">{diagnosis or 'Consultation Complete'}</p>
    </div>

    <div class="card">
      <div style="font-size: 13px; color: #D4A843; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">AI Patient-Friendly Visit Summary</div>
      <p style="margin: 0; white-space: pre-wrap;">{patient_summary}</p>
    </div>

    <div class="card">
      <div style="font-size: 13px; color: #D4A843; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Prescribed Medications</div>
      <pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; font-family: inherit; font-size: 14px; color: #E2DFD7; white-space: pre-wrap; margin: 0;">{prescription_text}</pre>
    </div>

    {f'<div class="card"><div style="font-size: 13px; color: #D4A843; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Doctor Advice</div><p style="margin:0;">{advice}</p></div>' if advice else ''}

    <p style="font-size: 13px; color: rgba(247, 245, 240, 0.6); margin-top: 20px;">Atheria will automatically dispatch medication reminders to keep you on schedule.</p>
    """
    return get_email_base_wrapper("Post-Visit Summary & Prescription - Atheria", body)

def get_medication_reminder_html(
    patient_name: str,
    doctor_name: str,
    medicine_name: str,
    frequency: str,
    reminder_time: str
) -> str:
    body = f"""
    <h2 style="color: #D4A843; margin-top: 0;">Medication Reminder</h2>
    <p>Dear <strong>{patient_name}</strong>,</p>
    <p>This is your scheduled dose reminder for today:</p>
    
    <div class="card" style="border-color: rgba(212, 168, 67, 0.4); background: rgba(212, 168, 67, 0.1);">
      <div style="font-size: 20px; font-weight: bold; color: #D4A843; margin-bottom: 8px;">{medicine_name}</div>
      <p style="margin: 4px 0;"><strong>Frequency:</strong> {frequency}</p>
      <p style="margin: 4px 0;"><strong>Scheduled Time:</strong> {reminder_time}</p>
      <p style="margin: 4px 0;"><strong>Prescribed by:</strong> Dr. {doctor_name}</p>
    </div>

    <p>Please take your medication as directed with water and complete your prescribed course.</p>
    """
    return get_email_base_wrapper(f"Medication Reminder: {medicine_name} - Atheria", body)

def get_test_email_html(recipient_email: str, server_info: str) -> str:
    body = f"""
    <h2 style="color: #34D399; margin-top: 0;">Atheria Email Delivery Active</h2>
    <p>Hello,</p>
    <p>This is a live test message confirming that your <strong>Atheria Healthcare Email Dispatcher</strong> is properly connected and functioning.</p>
    
    <div class="card">
      <div style="font-size: 13px; color: #D4A843; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Delivery Metadata</div>
      <p style="margin: 4px 0;"><strong>Recipient:</strong> {recipient_email}</p>
      <p style="margin: 4px 0;"><strong>Server Mode:</strong> {server_info}</p>
      <p style="margin: 4px 0;"><strong>Status:</strong> Successfully Handshaked & Verified</p>
    </div>
    """
    return get_email_base_wrapper("Atheria Email System Verification", body)


def send_email_smtp(recipient_email: str, title: str, body_text: str, body_html: Optional[str] = None) -> bool:
    """
    Dispatches an email via configured SMTP (Gmail, SendGrid SMTP, Mailgun, custom).
    If credentials are not configured, logs the email for audit and returns True.
    """
    # Graceful mock handling when credentials are empty
    if not settings.EMAIL_USERNAME or not settings.EMAIL_PASSWORD:
        logger.info("\n=======================================================")
        logger.info(f"[EMAIL MOCK OUTBOX] Sending to: {recipient_email}")
        logger.info(f"Subject: {title}")
        logger.info(f"Text Payload:\n{body_text}")
        logger.info("=======================================================\n")
        return True
        
    try:
        msg = MIMEMultipart("alternative")
        from_display = f"Atheria Healthcare <{settings.EMAIL_USERNAME}>" if settings.EMAIL_USERNAME else settings.EMAIL_FROM
        msg['From'] = from_display
        msg['To'] = recipient_email
        msg['Subject'] = title
        
        # Attach plain text
        part1 = MIMEText(body_text, 'plain', 'utf-8')
        msg.attach(part1)
        
        # Attach rich HTML if provided
        if body_html:
            part2 = MIMEText(body_html, 'html', 'utf-8')
            msg.attach(part2)
        else:
            part2 = MIMEText(get_email_base_wrapper(title, f"<p>{body_text.replace(chr(10), '<br/>')}</p>"), 'html', 'utf-8')
            msg.attach(part2)
        
        # Connect to SMTP server
        if settings.EMAIL_PORT == 465:
            server = smtplib.SMTP_SSL(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=10)
        else:
            server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=10)
            server.starttls()
            
        server.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
        sender_addr = settings.EMAIL_USERNAME or settings.EMAIL_FROM
        server.sendmail(sender_addr, [recipient_email], msg.as_string())
        server.quit()
        
        logger.info(f"Email successfully dispatched to {recipient_email} via {settings.EMAIL_HOST}:{settings.EMAIL_PORT}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {e}")
        return False
