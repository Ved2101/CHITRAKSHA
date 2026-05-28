import datetime
import csv
import io
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from functools import wraps

from config import Config
import database
from rag import RAGPipeline

app = Flask(__name__)
# Enable CORS for the frontend origin (Next.js is typically on port 3000)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize SQLite database schema
database.init_db()

# Initialize RAG Brain
rag_brain = RAGPipeline()

# JWT Authentication Middleware decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Access denied. Authentication token is missing.'}), 401
            
        try:
            data = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
            current_user_id = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Authentication token has expired.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid authentication token.'}), 401
            
        return f(current_user_id, *args, **kwargs)
        
    return decorated

# Helper to generate JWT Token
def generate_token(user_id, user_name):
    payload = {
        'user_id': user_id,
        'user_name': user_name,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7) # Expires in 7 days
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm='HS256')

# --- AUTH ENDPOINTS ---

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    age = data.get('age')

    if not name or not email or not password or age is None:
        return jsonify({'message': 'Please provide name, email, password, and age.'}), 400

    try:
        age = int(age)
        if age <= 0 or age > 120:
            raise ValueError()
    except ValueError:
        return jsonify({'message': 'Please provide a valid age between 1 and 120.'}), 400

    password_hash = generate_password_hash(password)
    user_id = database.create_user(name, email, password_hash, age)
    
    if user_id is None:
        return jsonify({'message': 'Email address already registered.'}), 400

    token = generate_token(user_id, name)
    return jsonify({
        'token': token,
        'user': {
            'id': user_id,
            'name': name,
            'email': email,
            'age': age
        }
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'message': 'Please provide email and password.'}), 400

    user = database.get_user_by_email(email)
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'message': 'Invalid email or password.'}), 401

    token = generate_token(user['id'], user['name'])
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'age': user['age']
        }
    }), 200

@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_me(current_user_id):
    user = database.get_user_by_id(current_user_id)
    if not user:
        return jsonify({'message': 'User not found.'}), 404
    return jsonify({'user': user}), 200

@app.route('/api/auth/profile', methods=['PUT'])
@token_required
def update_profile(current_user_id):
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    age = data.get('age')

    if not name or age is None:
        return jsonify({'message': 'Please provide name and age.'}), 400

    try:
        age = int(age)
        if age <= 0 or age > 120:
            raise ValueError()
    except ValueError:
        return jsonify({'message': 'Please provide a valid age between 1 and 120.'}), 400

    success = database.update_user_profile(current_user_id, name, age)
    if not success:
        return jsonify({'message': 'Failed to update profile.'}), 400

    user = database.get_user_by_id(current_user_id)
    return jsonify({'message': 'Profile updated successfully.', 'user': user}), 200

# --- CHAT SANCTUARY ENDPOINTS ---

@app.route('/api/chat/sessions', methods=['GET'])
@token_required
def get_sessions(current_user_id):
    sessions = database.get_chat_sessions(current_user_id)
    return jsonify({'sessions': sessions}), 200

@app.route('/api/chat/sessions', methods=['POST'])
@token_required
def create_session(current_user_id):
    data = request.get_json() or {}
    title = data.get('title', 'New Sanctuary Session').strip()
    session_id = database.create_chat_session(current_user_id, title)
    return jsonify({
        'session_id': session_id,
        'title': title
    }), 201

@app.route('/api/chat/sessions/<int:session_id>', methods=['DELETE'])
@token_required
def delete_session(current_user_id, session_id):
    success = database.delete_chat_session(session_id, current_user_id)
    if not success:
        return jsonify({'message': 'Session not found or unauthorized.'}), 404
    return jsonify({'message': 'Session deleted successfully.'}), 200

@app.route('/api/chat/sessions/<int:session_id>/messages', methods=['GET'])
@token_required
def get_messages(current_user_id, session_id):
    # Verify session belongs to user
    sessions = database.get_chat_sessions(current_user_id)
    session_ids = [s['id'] for s in sessions]
    if session_id not in session_ids:
        return jsonify({'message': 'Session not found or unauthorized.'}), 403

    messages = database.get_chat_messages(session_id)
    return jsonify({'messages': messages}), 200

@app.route('/api/chat/sessions/<int:session_id>/messages', methods=['POST'])
@token_required
def post_message(current_user_id, session_id):
    # 1. Verify session ownership
    sessions = database.get_chat_sessions(current_user_id)
    session_ids = [s['id'] for s in sessions]
    if session_id not in session_ids:
        return jsonify({'message': 'Session not found or unauthorized.'}), 403

    data = request.get_json() or {}
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'message': 'Message content cannot be empty.'}), 400

    # 2. Get user info for RAG customizing (e.g. age)
    user = database.get_user_by_id(current_user_id)
    user_age = user['age'] if user else 25

    # 3. Detect language of message
    detected_lang = 'hinglish' if rag_brain.is_hinglish(content) else 'en'
    
    # 4. Save User Message
    user_msg_id = database.add_chat_message(session_id, 'user', content, detected_lang)

    # 5. Get recent chat history context for coherent dialog flow
    history = database.get_chat_messages(session_id)

    # 6. Generate Response
    response_text, crisis_detected = rag_brain.generate_response(content, user_age, history[:-1])

    # 7. Save Assistant Message
    assistant_msg_id = database.add_chat_message(session_id, 'assistant', response_text, 'hinglish' if rag_brain.is_hinglish(response_text) else 'en')

    return jsonify({
        'user_message': {
            'id': user_msg_id,
            'role': 'user',
            'content': content,
            'language': detected_lang
        },
        'assistant_message': {
            'id': assistant_msg_id,
            'role': 'assistant',
            'content': response_text,
            'language': 'hinglish' if rag_brain.is_hinglish(response_text) else 'en'
        },
        'crisis_detected': crisis_detected
    }), 200

@app.route('/api/chat/sessions/<int:session_id>/stream', methods=['POST'])
@token_required
def post_message_stream(current_user_id, session_id):
    from flask import Response
    import json
    
    # 1. Verify session ownership
    sessions = database.get_chat_sessions(current_user_id)
    session_ids = [s['id'] for s in sessions]
    if session_id not in session_ids:
        return jsonify({'message': 'Session not found or unauthorized.'}), 403

    data = request.get_json() or {}
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'message': 'Message content cannot be empty.'}), 400

    # 2. Get user info
    user = database.get_user_by_id(current_user_id)
    user_age = user['age'] if user else 25

    # 3. Detect language
    detected_lang = 'hinglish' if rag_brain.is_hinglish(content) else 'en'
    
    # 4. Save User Message
    user_msg_id = database.add_chat_message(session_id, 'user', content, detected_lang)

    # 5. Get history
    history = database.get_chat_messages(session_id)

    # 6. Generate Response Stream
    crisis_detected, chunk_generator = rag_brain.generate_response_stream(content, user_age, history[:-1])

    def sse_generator():
        # Yield metadata first
        yield f"data: {json.dumps({'type': 'meta', 'crisis_detected': crisis_detected, 'user_message_id': user_msg_id, 'user_language': detected_lang})}\n\n"
        
        full_response = ""
        for chunk in chunk_generator:
            full_response += chunk
            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
        
        # Stream finished, save to DB
        assistant_lang = 'hinglish' if rag_brain.is_hinglish(full_response) else 'en'
        assistant_msg_id = database.add_chat_message(session_id, 'assistant', full_response, assistant_lang)
        
        yield f"data: {json.dumps({'type': 'done', 'assistant_message_id': assistant_msg_id, 'language': assistant_lang})}\n\n"

    return Response(sse_generator(), mimetype='text/event-stream')

# --- MOOD TRACKER ENDPOINTS ---

@app.route('/api/mood', methods=['GET'])
@token_required
def get_moods(current_user_id):
    logs = database.get_mood_logs(current_user_id)
    return jsonify({'mood_logs': logs}), 200

@app.route('/api/mood', methods=['POST'])
@token_required
def post_mood(current_user_id):
    data = request.get_json() or {}
    date = data.get('date', '').strip() # YYYY-MM-DD
    mood_score = data.get('mood_score') # 1-5
    notes = data.get('notes', '').strip()

    if not date or mood_score is None:
        return jsonify({'message': 'Please provide date and mood score.'}), 400

    try:
        mood_score = int(mood_score)
        if mood_score < 1 or mood_score > 5:
            raise ValueError()
        # Verify date format YYYY-MM-DD
        datetime.datetime.strptime(date, '%Y-%m-%d')
    except ValueError:
        return jsonify({'message': 'Invalid mood score (must be 1-5) or date (must be YYYY-MM-DD).'}), 400

    success = database.log_mood(current_user_id, date, mood_score, notes)
    if not success:
        return jsonify({'message': 'Failed to save mood log.'}), 400

    return jsonify({'message': 'Mood logged successfully.'}), 200

@app.route('/api/mood/insights', methods=['GET'])
@token_required
def get_insights(current_user_id):
    insights = database.get_mood_insights(current_user_id)
    return jsonify({'insights': insights}), 200

@app.route('/api/mood/export', methods=['GET'])
@token_required
def export_mood(current_user_id):
    logs = database.get_mood_logs(current_user_id)
    
    # Generate CSV stream
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write headers
    writer.writerow(['Date', 'Mood Score (1-5)', 'Notes', 'Logged At'])
    
    for l in logs:
        writer.writerow([l['date'], l['mood_score'], l['notes'], l['created_at']])
        
    csv_data = output.getvalue()
    
    response = make_response(csv_data)
    response.headers["Content-Disposition"] = "attachment; filename=chitraksha_mood_export.csv"
    response.headers["Content-type"] = "text/csv"
    return response

# --- HEALTH CHECK / API INFO ---
@app.route('/api', methods=['GET'])
def api_root():
    return jsonify({
        'name': 'Chitraksha API',
        'status': 'Alive',
        'dual_mode_rag': 'ML' if rag_brain.use_ml_rag else 'Fallback Python Vectorizer'
    }), 200

if __name__ == '__main__':
    print(f"Starting Chitraksha Flask backend on port {Config.PORT}...")
    app.run(host='0.0.0.0', port=Config.PORT, debug=Config.DEBUG)
