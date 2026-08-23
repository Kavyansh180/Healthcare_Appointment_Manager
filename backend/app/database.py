from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings
import pymysql
from urllib.parse import urlparse

def get_actual_db_url():
    db_url = settings.DATABASE_URL
    if "mysql" in db_url:
        try:
            parsed = urlparse(db_url)
            username = parsed.username or "root"
            password = parsed.password or ""
            host = parsed.hostname or "localhost"
            port = parsed.port or 3306
            
            # Attempt a quick test connection to the MySQL server
            conn = pymysql.connect(
                host=host,
                port=port,
                user=username,
                password=password,
                connect_timeout=2
            )
            conn.close()
            return db_url
        except Exception as e:
            print(f"\n[DB WARNING] Failed to connect to MySQL database at {host}:{port} ({e}).")
            print("[DB WARNING] Falling back to SQLite for local development.\n")
            return "sqlite:///./healthcare_db.db"
    return db_url

# Dynamic URL detection
DB_URL = get_actual_db_url()

# Configure engine based on dialect
if "sqlite" in DB_URL:
    engine = create_engine(
        DB_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DB_URL,
        pool_size=20,
        max_overflow=10,
        pool_recycle=3600,
        pool_pre_ping=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
