from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from urllib.parse import urlencode
import requests

from ..config import settings
from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserResponse, Token
from ..auth import get_password_hash, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
    
    # Hash password and create user
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        password_hash=hashed_pwd,
        role=user_in.role,
        name=user_in.name,
        phone=user_in.phone
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Find user by email
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate token
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name
    }

# Google OAuth Endpoints
@router.get("/google/url")
def get_google_auth_url():
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        # Fallback if Google OAuth is not configured
        return {"url": ""}
        
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar",
        "access_type": "offline",
        "prompt": "consent"
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {"url": url}

@router.get("/google/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured on the server."
        )
        
    # Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    
    try:
        response = requests.post(token_url, data=data)
        response_data = response.json()
        
        if "error" in response_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Google OAuth Error: {response_data.get('error_description', 'Failed to exchange code')}"
            )
            
        access_token = response_data.get("access_token")
        refresh_token = response_data.get("refresh_token")
        
        # Get user profile information
        profile_url = "https://www.googleapis.com/oauth2/v3/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}
        profile_response = requests.get(profile_url, headers=headers)
        profile_data = profile_response.json()
        
        email = profile_data.get("email")
        name = profile_data.get("name", email)
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google OAuth profile does not contain an email address."
            )
            
        # Check if user exists, otherwise create
        user = db.query(User).filter(User.email == email).first()
        if not user:
            # Register new patient
            # Assign dummy password for oauth users
            dummy_hash = get_password_hash("oauth-dummy-password-12345!")
            user = User(
                email=email,
                password_hash=dummy_hash,
                role="patient",
                name=name,
                google_refresh_token=refresh_token
            )
            db.add(user)
        else:
            if refresh_token:
                user.google_refresh_token = refresh_token
                
        db.commit()
        db.refresh(user)
        
        # Generate our JWT token
        app_token = create_access_token(data={"sub": user.email})
        return {
            "access_token": app_token,
            "token_type": "bearer",
            "role": user.role,
            "name": user.name
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google Authentication failed: {str(e)}"
        )

@router.post("/guest", response_model=Token)
def guest_login(role: str, db: Session = Depends(get_db)):
    role = role.lower()
    if role not in ["patient", "doctor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid guest role. Choose patient, doctor, or admin."
        )
    
    email_map = {
        "admin": "guest_admin@healthcare.com",
        "doctor": "guest_doctor@healthcare.com",
        "patient": "guest_patient@healthcare.com"
    }
    
    email = email_map[role]
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guest account not found. Please restart the backend to seed it."
        )
        
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name
    }

