import sqlite3
import os
from datetime import datetime
from config import Config

def get_db_connection():
    conn = sqlite3.connect(Config.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Create Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        age INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 2. Create Chat Sessions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)
    
    # 3. Create Chat Messages Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        role TEXT NOT NULL, -- 'user' or 'assistant'
        content TEXT NOT NULL,
        language TEXT, -- 'en', 'hi', or 'hinglish'
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE
    )
    """)
    
    # 4. Create Mood Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS mood_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL, -- YYYY-MM-DD
        mood_score INTEGER NOT NULL, -- 1 to 5
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, date)
    )
    """)
    
    conn.commit()
    conn.close()

# --- User Database Actions ---

def create_user(name, email, password_hash, age):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, age) VALUES (?, ?, ?, ?)",
            (name, email, password_hash, age)
        )
        conn.commit()
        user_id = cursor.lastrowid
        return user_id
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def get_user_by_email(email):
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_id(user_id):
    conn = get_db_connection()
    row = conn.execute("SELECT id, name, email, age, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def update_user_profile(user_id, name, age):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE users SET name = ?, age = ? WHERE id = ?",
        (name, age, user_id)
    )
    conn.commit()
    rows_affected = cursor.rowcount
    conn.close()
    return rows_affected > 0

# --- Chat Database Actions ---

def create_chat_session(user_id, title):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO chat_sessions (user_id, title) VALUES (?, ?)",
        (user_id, title)
    )
    conn.commit()
    session_id = cursor.lastrowid
    conn.close()
    return session_id

def get_chat_sessions(user_id):
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC",
        (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def delete_chat_session(session_id, user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM chat_sessions WHERE id = ? AND user_id = ?",
        (session_id, user_id)
    )
    conn.commit()
    rows_affected = cursor.rowcount
    conn.close()
    return rows_affected > 0

def get_chat_messages(session_id):
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC",
        (session_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def add_chat_message(session_id, role, content, language=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO chat_messages (session_id, role, content, language) VALUES (?, ?, ?, ?)",
        (session_id, role, content, language)
    )
    # Update the parent session updated_at time
    cursor.execute(
        "UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (session_id,)
    )
    conn.commit()
    message_id = cursor.lastrowid
    conn.close()
    return message_id

# --- Mood Database Actions ---

def log_mood(user_id, date, mood_score, notes):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO mood_logs (user_id, date, mood_score, notes)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, date) DO UPDATE SET
                mood_score = excluded.mood_score,
                notes = excluded.notes,
                created_at = CURRENT_TIMESTAMP
            """,
            (user_id, date, mood_score, notes)
        )
        conn.commit()
        return True
    except Exception as e:
        print("Error logging mood:", e)
        return False
    finally:
        conn.close()

def get_mood_logs(user_id):
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM mood_logs WHERE user_id = ? ORDER BY date ASC",
        (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_mood_insights(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Average mood
    avg_row = cursor.execute("SELECT AVG(mood_score) as avg_mood, COUNT(id) as total_days FROM mood_logs WHERE user_id = ?", (user_id,)).fetchone()
    avg_mood = avg_row['avg_mood'] if avg_row and avg_row['avg_mood'] is not None else 0.0
    total_days = avg_row['total_days'] if avg_row else 0
    
    # 2. Mood distribution
    dist_rows = cursor.execute("SELECT mood_score, COUNT(id) as count FROM mood_logs WHERE user_id = ? GROUP BY mood_score", (user_id,)).fetchall()
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in dist_rows:
        distribution[r['mood_score']] = r['count']
        
    # 3. Recent 7 days mood trend
    trend_rows = cursor.execute(
        "SELECT date, mood_score FROM mood_logs WHERE user_id = ? ORDER BY date DESC LIMIT 7",
        (user_id,)
    ).fetchall()
    # Reverse to make it ascending chronological
    trend = [{"date": r["date"], "score": r["mood_score"]} for r in reversed(trend_rows)]
    
    conn.close()
    
    return {
        "average_mood": round(avg_mood, 2),
        "total_days_logged": total_days,
        "mood_distribution": distribution,
        "recent_trend": trend
    }
