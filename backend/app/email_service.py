import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from .config import settings

logger = logging.getLogger("EMAIL_SERVICE")

def send_email_smtp(recipient_email: str, title: str, body: str) -> bool:
    # If credentials are not configured, print to logs and return success (graceful degradation)
    if not settings.EMAIL_USERNAME or not settings.EMAIL_PASSWORD:
        logger.info(f"\n=======================================================")
        logger.info(f"[EMAIL MOCK] Sending email to: {recipient_email}")
        logger.info(f"Subject: {title}")
        logger.info(f"Body:\n{body}")
        logger.info(f"=======================================================\n")
        return True
        
    try:
        msg = MIMEMultipart()
        msg['From'] = settings.EMAIL_FROM
        msg['To'] = recipient_email
        msg['Subject'] = title
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Connect to SMTP server
        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
        server.starttls()
        server.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
        
        # Send email
        server.sendmail(settings.EMAIL_FROM, recipient_email, msg.as_string())
        server.quit()
        
        logger.info(f"Email successfully sent to {recipient_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {e}")
        # Return False to trigger background retries
        return False
