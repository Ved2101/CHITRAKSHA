import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "chitraksha-secret-key-change-this-in-prod")
    DATABASE_PATH = os.environ.get("DATABASE_PATH", "chitraksha.db")
    PORT = int(os.environ.get("PORT", 5000))
    DEBUG = os.environ.get("DEBUG", "True").lower() in ("true", "1", "yes")
