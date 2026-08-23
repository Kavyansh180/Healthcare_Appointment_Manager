import pymysql
from app.config import settings
from urllib.parse import urlparse

def init_db():
    # Parse the database URL to get connection parameters
    db_url = settings.DATABASE_URL
    parsed = urlparse(db_url)
    
    # Extract components
    username = parsed.username or "root"
    password = parsed.password or ""
    host = parsed.hostname or "localhost"
    port = parsed.port or 3306
    db_name = parsed.path.lstrip("/")
    
    print(f"Connecting to MySQL server at {host}:{port} as user '{username}'...")
    
    try:
        # Connect to MySQL server without database
        conn = pymysql.connect(
            host=host,
            port=port,
            user=username,
            password=password
        )
        
        cursor = conn.cursor()
        
        # Create database
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        print(f"Database '{db_name}' verified/created successfully.")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error creating database: {e}")
        # If it fails, we will let the application try to handle it.

if __name__ == "__main__":
    init_db()
