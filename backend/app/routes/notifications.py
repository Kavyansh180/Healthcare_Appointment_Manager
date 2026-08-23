from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import User, Notification
from ..schemas import NotificationResponse, NotificationStats, TestEmailRequest
from ..auth import get_current_user
from ..email_service import send_email_smtp, send_email_with_error, get_test_email_html, settings

router = APIRouter(prefix="/notifications", tags=["Notifications & Email Outbox"])

@router.get("", response_model=List[NotificationResponse])
def list_notifications(
    status_filter: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Notification)
    
    # If not admin, restrict to notifications belonging to this user
    if current_user.role != "admin":
        query = query.filter(Notification.user_id == current_user.id)
        
    if status_filter and status_filter.lower() != "all":
        query = query.filter(Notification.status == status_filter.lower())
        
    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
    return notifications

@router.get("/stats", response_model=NotificationStats)
def get_notification_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Notification)
    if current_user.role != "admin":
        query = query.filter(Notification.user_id == current_user.id)
        
    all_notis = query.all()
    total = len(all_notis)
    sent = len([n for n in all_notis if n.status == "sent"])
    pending = len([n for n in all_notis if n.status == "pending"])
    failed = len([n for n in all_notis if n.status == "failed"])
    
    return {
        "total_count": total,
        "sent_count": sent,
        "pending_count": pending,
        "failed_count": failed
    }

@router.post("/test-email", response_model=NotificationResponse)
def send_test_email(
    request_in: TestEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    server_info = f"{settings.EMAIL_HOST}:{settings.EMAIL_PORT} (User: {settings.EMAIL_USERNAME or 'Local Mock Mode'})"
    subject = request_in.subject or "Atheria Live Email Dispatch Test"
    text_body = (
        f"Atheria Healthcare Email Delivery Verification\n\n"
        f"Recipient: {request_in.recipient_email}\n"
        f"Server Info: {server_info}\n\n"
        f"Your notification subsystem is active and operating normally."
    )
    html_body = get_test_email_html(request_in.recipient_email, server_info)
    
    # Attempt immediate dispatch
    success, err_msg = send_email_with_error(
        recipient_email=request_in.recipient_email,
        title=subject,
        body_text=text_body,
        body_html=html_body
    )
    
    status_str = "sent" if success else "failed"
    
    # Record notification in database
    noti = Notification(
        user_id=current_user.id,
        title=subject,
        message=text_body,
        html_content=html_body,
        recipient_email=request_in.recipient_email,
        status=status_str,
        retry_count=0 if success else 1,
        last_attempt=datetime.utcnow(),
        error_message=err_msg
    )
    db.add(noti)
    db.commit()
    db.refresh(noti)
    return noti

@router.post("/{notification_id}/retry", response_model=NotificationResponse)
def retry_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    noti = db.query(Notification).filter(Notification.id == notification_id).first()
    if not noti:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    if current_user.role != "admin" and noti.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to retry this notification")
        
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
    else:
        noti.status = "failed"
        noti.retry_count += 1
        noti.error_message = err_msg or f"Retry attempt failed via {settings.EMAIL_HOST}:{settings.EMAIL_PORT}"
        
    db.commit()
    db.refresh(noti)
    return noti

@router.post("/flush-queue", response_model=List[NotificationResponse])
def flush_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually triggers immediate dispatch of all pending or failed notifications in the outbox.
    """
    query = db.query(Notification).filter(Notification.status.in_(["pending", "failed"]))
    if current_user.role != "admin":
        query = query.filter(Notification.user_id == current_user.id)
    pending_list = query.all()
    
    for noti in pending_list:
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
        else:
            noti.status = "failed"
            noti.retry_count += 1
            noti.error_message = err_msg or "Dispatch attempt failed"
            
    db.commit()
    return pending_list

