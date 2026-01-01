import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB Settings
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'craftforge')

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'craftforge-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# CORS Settings
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')

# Upload Settings
UPLOAD_DIR = ROOT_DIR / "uploads"
