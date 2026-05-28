import os
import sys
import unittest
import json
import sqlite3

# Add current dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import Config
from database import init_db, get_db_connection, create_user, get_user_by_email
from rag import RAGPipeline

class TestChitrakshaBackend(unittest.TestCase):
    
    def setUp(self):
        # Configure temporary database for testing
        Config.DATABASE_PATH = "test_chitraksha.db"
        init_db()
        self.rag = RAGPipeline()

    def tearDown(self):
        # Clean up test database
        if os.path.exists("test_chitraksha.db"):
            os.remove("test_chitraksha.db")

    def test_database_initialization(self):
        """Test if the SQLite database is created and initialized with appropriate tables."""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        
        self.assertIn("users", tables)
        self.assertIn("chat_sessions", tables)
        self.assertIn("chat_messages", tables)
        self.assertIn("mood_logs", tables)
        conn.close()

    def test_user_creation(self):
        """Test user registration and lookup in database."""
        user_id = create_user("Test User", "test@example.com", "hashed_password", 24)
        self.assertIsNotNone(user_id)
        
        user = get_user_by_email("test@example.com")
        self.assertIsNotNone(user)
        self.assertEqual(user["name"], "Test User")
        self.assertEqual(user["age"], 24)

    def test_crisis_detection(self):
        """Test if crisis keywords are successfully caught by the filter."""
        self.assertTrue(self.rag.detect_crisis("I want to suicide, please help me"))
        self.assertTrue(self.rag.detect_crisis("sometimes I think about ending my life"))
        self.assertFalse(self.rag.detect_crisis("I am stressed about exams tomorrow"))

    def test_hinglish_detection(self):
        """Test if Hinglish code-mixed phrasing is accurately detected."""
        self.assertTrue(self.rag.is_hinglish("mujhe bahut stress ho raha hai"))
        self.assertTrue(self.rag.is_hinglish("kya karein yaar, samajh nahi aa raha"))
        self.assertFalse(self.rag.is_hinglish("I feel super anxious about my work and career"))

    def test_rag_context_retrieval(self):
        """Test if the retriever returns relevant documents from knowledge base."""
        context = self.rag.retrieve_context("breathing exercises")
        self.assertIsNotNone(context)
        self.assertIn("breathing", context.lower())

if __name__ == "__main__":
    print("Running automated backend checks...")
    unittest.main()
