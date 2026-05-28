import os
import json
import re
from config import Config

# Crisis Keywords (30+ indicators of severe distress)
CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "ending my life", "want to die", "no reason to live",
    "cut myself", "self harm", "suicidal", "die", "poison", "hanging", "jump off",
    "atpahatya", "maar dalunga", "marna chahta", "marna chahti", "zindagi khatam",
    "nase kaat", "hurt myself", "take my life", "ending it all", "better off dead",
    "don't want to exist", "please let me die", "wish I was dead", "can't go on",
    "kill me", "die today", "sleeping pills overdose", "wrist cut", "overdose"
]

# Common Hindi/Hinglish vocabulary indicators
HINGLISH_KEYWORDS = [
    "hai", "mujhe", "yaar", "kya", "nahi", "hota", "raha", "tension", "acha", 
    "aur", "ki", "ka", "bhai", "kuch", "kar", "gaya", "ho", "rahi", "samajh", 
    "tum", "aap", "dost", "samajhna", "lagta", "lagti", "pareshan", "chinta",
    "ho raha", "ho rahi", "kaise", "samjho", "dukh", "rona", "akela", "akeli"
]

# Indian Helplines Info
CRISIS_HELPLINES = (
    "It sounds like you are going through an incredibly tough time, but please know you don't have to carry this alone. "
    "Please reach out to one of these free, confidential support lines in India immediately:\n\n"
    "📞 Vandrevala Foundation: 1860-2662-345 (24/7)\n"
    "📞 AASRA: +91-22-27546669 (24/7)\n"
    "📞 iCall: +91-22-25521111 (Mon-Sat, 8 AM - 10 PM)\n"
    "📞 NIMHANS: 080-46110007 (24/7)\n\n"
    "Please talk to a trusted friend, family member, or a professional healthcare provider. There is support available."
)

class RAGPipeline:
    def __init__(self):
        self.knowledge_base = []
        self.load_knowledge_base()
        
        # Try importing heavy ML packages for RAG. If they fail, fall back to pure-Python TF-IDF & keyword search.
        self.use_ml_rag = False
        try:
            from sentence_transformers import SentenceTransformer
            import faiss
            import numpy as np
            
            print("Successfully imported SentenceTransformer and FAISS. Building ML index...")
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            self.np = np
            
            # Embed all contents
            self.docs_text = [doc['title'] + " " + doc['content'] for doc in self.knowledge_base]
            self.embeddings = self.model.encode(self.docs_text, convert_to_numpy=True)
            
            dimension = self.embeddings.shape[1]
            self.index = faiss.IndexFlatL2(dimension)
            self.index.add(self.embeddings)
            self.use_ml_rag = True
            print("FAISS index loaded successfully.")
        except Exception as e:
            print(f"Failed to load FAISS/Sentence-Transformers: {e}.")
            print("Using fallback Jaccard / TF-IDF pure Python semantic retriever.")
            
    def load_knowledge_base(self):
        kb_path = os.path.join(os.path.dirname(__file__), 'knowledge_base.json')
        try:
            with open(kb_path, 'r', encoding='utf-8') as f:
                self.knowledge_base = json.load(f)
        except Exception as e:
            print(f"Error loading knowledge base: {e}")
            # Fallback inline knowledge base if file fails
            self.knowledge_base = [
                {
                    "id": 1,
                    "title": "Box Breathing for Stress Control",
                    "category": "Breathing",
                    "content": "Inhale 4s, hold 4s, exhale 4s, hold empty 4s. Repeat 4 times to calm your nerves."
                }
            ]

    def detect_crisis(self, text):
        clean_text = text.lower()
        for keyword in CRISIS_KEYWORDS:
            # Match word boundary or exact phrase
            if re.search(r'\b' + re.escape(keyword) + r'\b', clean_text):
                return True
        return False

    def is_hinglish(self, text):
        clean_text = text.lower()
        matches = 0
        for word in HINGLISH_KEYWORDS:
            if re.search(r'\b' + re.escape(word) + r'\b', clean_text):
                matches += 1
        # If at least 2 common Hinglish words are matched, classify as Hinglish
        return matches >= 2

    def retrieve_context(self, query, k=3):
        if not self.knowledge_base:
            return ""
            
        if self.use_ml_rag:
            try:
                query_vector = self.model.encode([query], convert_to_numpy=True)
                distances, indices = self.index.search(query_vector, k)
                retrieved_docs = []
                for idx in indices[0]:
                    if 0 <= idx < len(self.knowledge_base):
                        retrieved_docs.append(self.knowledge_base[idx])
                
                context = "\n\n".join([f"Category: {d['category']}\nTitle: {d['title']}\nAdvice: {d['content']}" for d in retrieved_docs])
                return context
            except Exception as e:
                print(f"Error during FAISS retrieval: {e}. Falling back...")
                
        # Pure Python Fallback: Jaccard word overlap similarity
        query_words = set(re.findall(r'\w+', query.lower()))
        scores = []
        for doc in self.knowledge_base:
            doc_text = (doc['title'] + " " + doc['content']).lower()
            doc_words = set(re.findall(r'\w+', doc_text))
            
            # Intersection over union
            intersection = query_words.intersection(doc_words)
            union = query_words.union(doc_words)
            jaccard_score = len(intersection) / len(union) if union else 0.0
            
            # Boost score slightly if category or title matches key terms
            scores.append((jaccard_score, doc))
            
        # Sort by score descending and take top k
        scores.sort(key=lambda x: x[0], reverse=True)
        top_k = [item[1] for item in scores[:k]]
        
        context = "\n\n".join([f"Category: {d['category']}\nTitle: {d['title']}\nAdvice: {d['content']}" for d in top_k])
        return context

    def generate_response(self, user_message, user_age, chat_history=[]):
        # 1. Crisis Check
        if self.detect_crisis(user_message):
            return CRISIS_HELPLINES, True

        # 2. Language & Context
        bilingual = self.is_hinglish(user_message)
        context = self.retrieve_context(user_message, k=2)
        
        # 3. Formulate prompts based on user age
        if user_age <= 25:
            # Warm, friendly, uses friendly terms
            system_prompt = (
                "You are Chitraksha, a warm, friendly, and compassionate AI therapist and emotional companion. "
                "The user is young (25 or under). Use a very supportive, warm, and approachable tone. "
                "In Hinglish/Hindi, you can use friendly Indian slang like 'yaar' or 'bhai' naturally but keep it deeply empathetic. "
                "Acknowledge their struggles gently, never judge them, and ask light, open-ended questions to guide them.\n"
            )
        else:
            # Professional, respectful, supportive
            system_prompt = (
                "You are Chitraksha, a professional, empathetic, and respectful AI mental wellness counselor. "
                "The user is an adult (26 or older). Maintain a supportive, mature, and deeply validating therapeutic stance. "
                "Use respectful terms (like 'aap' instead of 'tum' in Hindi/Hinglish). "
                "Do not use overly casual slang. Provide structured, calming advice and listen actively.\n"
            )

        if bilingual:
            system_prompt += (
                "CRITICAL: The user has reached out in Hindi or Hinglish (Hindi written in English alphabet). "
                "You MUST respond in conversational Hinglish (Hindi mixed with English words, using Latin script, like: 'Main samajh sakta hoon ki aap kaafi stress me hain. Chinta mat kijiye, hum is baare me baat kar sakte hain.'). "
                "Make sure it sounds natural, compassionate, and like a supportive Indian counselor speaking directly to them."
            )
        else:
            system_prompt += (
                "Respond in English. Keep it natural, comforting, and empathetic. Do not use overly robotic phrases."
            )

        system_prompt += (
            f"\n\nHere is some professional mental health guidance relevant to their query:\n{context}\n\n"
            "Respond in a natural, conversational, and highly responsive manner, just like ChatGPT, but as an empathetic companion. "
            "Do not force a rigid list or structure for every message. If the user just says 'hi' or makes small talk, respond conversationally. "
            "If they share a problem, provide supportive, nuanced guidance using paragraphs or lists as appropriate. "
            "Listen actively, validate their feelings, and avoid robotic or repetitive formatting. "
            "Do not say 'According to the documents'. Keep the flow natural and engaging."
        )

        # 4. Invoke LLM (Gemini / Groq / Fallback)
        gemini_api_key = Config.GEMINI_API_KEY
        if gemini_api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_api_key)
                
                model = genai.GenerativeModel(
                    model_name="gemini-1.5-flash",
                    system_instruction=system_prompt
                )
                
                contents = []
                for msg in chat_history[-6:]:
                    role = "user" if msg["role"] == "user" else "model"
                    contents.append({
                        "role": role,
                        "parts": [{"text": msg["content"]}]
                    })
                
                contents.append({
                    "role": "user",
                    "parts": [{"text": user_message}]
                })
                
                response = model.generate_content(
                    contents,
                    generation_config={
                        "temperature": 0.7,
                        "max_output_tokens": 800
                    }
                )
                
                if response and response.text:
                    return response.text, False
            except Exception as e:
                print(f"Error calling Gemini API: {e}. Trying fallback LLM...")

        groq_api_key = Config.GROQ_API_KEY
        if groq_api_key:
            try:
                from groq import Groq
                client = Groq(api_key=groq_api_key)
                
                messages = [{"role": "system", "content": system_prompt}]
                # Add recent message history (last 6 messages)
                for msg in chat_history[-6:]:
                    role = "user" if msg["role"] == "user" else "assistant"
                    messages.append({"role": role, "content": msg["content"]})
                    
                messages.append({"role": "user", "content": user_message})
                
                chat_completion = client.chat.completions.create(
                    messages=messages,
                    model="llama-3.1-8b-instant", # Or fallback to another Groq model if needed
                    temperature=0.7,
                    max_tokens=800
                )
                response_text = chat_completion.choices[0].message.content
                return response_text, False
            except Exception as e:
                print(f"Error calling Groq API: {e}. Falling back to mock therapist response...")

        # 5. Fallback Mock response generator (high quality local therapeutic templates)
        return self.get_mock_response(user_message, user_age, bilingual, context, chat_history), False

    def generate_response_stream(self, user_message, user_age, chat_history=[]):
        import time
        # 1. Crisis Check
        crisis_detected = self.detect_crisis(user_message)

        # 2. Language & Context
        bilingual = self.is_hinglish(user_message)
        context = self.retrieve_context(user_message, k=2)
        
        # 3. Formulate prompts based on user age
        if user_age <= 25:
            system_prompt = (
                "You are Chitraksha, a warm, friendly, and compassionate AI therapist and emotional companion. "
                "The user is young (25 or under). Use a very supportive, warm, and approachable tone. "
                "In Hinglish/Hindi, you can use friendly Indian slang like 'yaar' or 'bhai' naturally but keep it deeply empathetic. "
                "Acknowledge their struggles gently, never judge them, and ask light, open-ended questions to guide them.\n"
            )
        else:
            system_prompt = (
                "You are Chitraksha, a professional, empathetic, and respectful AI mental wellness counselor. "
                "The user is an adult (26 or older). Maintain a supportive, mature, and deeply validating therapeutic stance. "
                "Use respectful terms (like 'aap' instead of 'tum' in Hindi/Hinglish). "
                "Do not use overly casual slang. Provide structured, calming advice and listen actively.\n"
            )

        if bilingual:
            system_prompt += (
                "CRITICAL: The user has reached out in Hindi or Hinglish (Hindi written in English alphabet). "
                "You MUST respond in conversational Hinglish (Hindi mixed with English words, using Latin script). "
                "Make sure it sounds natural, compassionate, and like a supportive Indian counselor speaking directly to them."
            )
        else:
            system_prompt += (
                "Respond in English. Keep it natural, comforting, and empathetic. Do not use overly robotic phrases."
            )

        system_prompt += (
            f"\n\nHere is some professional mental health guidance relevant to their query:\n{context}\n\n"
            "Respond in a natural, conversational, and highly responsive manner, just like ChatGPT, but as an empathetic companion. "
            "Do not force a rigid list or structure for every message. If the user just says 'hi' or makes small talk, respond conversationally. "
            "If they share a problem, provide supportive, nuanced guidance using paragraphs or lists as appropriate. "
            "Listen actively, validate their feelings, and avoid robotic or repetitive formatting. "
            "Do not say 'According to the documents'. Keep the flow natural and engaging."
        )

        def stream_generator():
            if crisis_detected:
                import re
                tokens = re.split(r'(\s+)', CRISIS_HELPLINES)
                for token in tokens:
                    yield token
                    time.sleep(0.02)
                return

            gemini_api_key = Config.GEMINI_API_KEY
            if gemini_api_key:
                try:
                    import google.generativeai as genai
                    genai.configure(api_key=gemini_api_key)
                    model = genai.GenerativeModel(model_name="gemini-1.5-flash", system_instruction=system_prompt)
                    
                    contents = []
                    for msg in chat_history[-6:]:
                        role = "user" if msg["role"] == "user" else "model"
                        contents.append({"role": role, "parts": [{"text": msg["content"]}]})
                    contents.append({"role": "user", "parts": [{"text": user_message}]})
                    
                    response = model.generate_content(
                        contents, 
                        stream=True, 
                        generation_config={"temperature": 0.7, "max_output_tokens": 800}
                    )
                    for chunk in response:
                        if chunk.text:
                            yield chunk.text
                    return
                except Exception as e:
                    print(f"Error streaming Gemini API: {e}. Trying fallback LLM...")

            groq_api_key = Config.GROQ_API_KEY
            if groq_api_key:
                try:
                    from groq import Groq
                    client = Groq(api_key=groq_api_key)
                    
                    messages = [{"role": "system", "content": system_prompt}]
                    for msg in chat_history[-6:]:
                        role = "user" if msg["role"] == "user" else "assistant"
                        messages.append({"role": role, "content": msg["content"]})
                    messages.append({"role": "user", "content": user_message})
                    
                    chat_completion = client.chat.completions.create(
                        messages=messages,
                        model="llama-3.1-8b-instant",
                        temperature=0.7,
                        max_tokens=800,
                        stream=True
                    )
                    for chunk in chat_completion:
                        if chunk.choices[0].delta.content:
                            yield chunk.choices[0].delta.content
                    return
                except Exception as e:
                    print(f"Error streaming Groq API: {e}. Falling back to mock...")

            # Fallback mock
            mock_text = self.get_mock_response(user_message, user_age, bilingual, context, chat_history)
            # if get_mock_response returns a tuple (due to a remaining bug), extract text
            if isinstance(mock_text, tuple):
                mock_text = mock_text[0]
                
            import re
            tokens = re.split(r'(\s+)', mock_text)
            for token in tokens:
                yield token
                time.sleep(0.02)

        return crisis_detected, stream_generator()

    def get_mock_response(self, message, age, bilingual, context, chat_history=[]):
        clean_msg = message.lower().strip()
        
        # Add basic greetings handling
        is_greeting = any(w == clean_msg or clean_msg.startswith(w + " ") for w in ["hi", "hello", "hey", "namaste", "hi there", "hello there", "heya"])
        if is_greeting:
            if bilingual:
                return "Namaste! Main Chitraksha hoon. Aap kaisa mehsoos kar rahe hain aaj? Main yahan aapki baat sunne ke liye hoon."
            else:
                return "Hello! I'm Chitraksha, your supportive AI companion. How are you feeling today? I'm here to listen and help."

        # 1. Expand keyword matching
        is_academic_explicit = any(w in clean_msg for w in ["exam", "study", "focus", "preparation", "prepare", "pressure", "test", "fail", "marks", "grade", "results", "college", "school", "career", "padhai", "padhane", "exam pressure"])
        is_stress_explicit = any(w in clean_msg for w in ["stress", "anxious", "anxiety", "tension", "pressure", "scared", "fear", "darr", "worried", "worry", "panic", "overwhelmed", "nervous", "ghabrahat", "chinta", "dabav"])
        is_sadness_explicit = any(w in clean_msg for w in ["sad", "lonely", "alone", "low", "depressed", "cry", "crying", "udaas", "akela", "isolation", "empty", "dukhi", "rone"])
        is_relationship_explicit = any(w in clean_msg for w in ["breakup", "heartbreak", "relationship", "gf", "bf", "friend", "fight", "parents", "family", "conflict", "pyaar", "dost", "boundaries"])
        is_sleep_explicit = any(w in clean_msg for w in ["sleep", "insomnia", "night", "overthinking", "thoughts", "mind", "restless", "neend", "soch"])
        
        is_academic = is_academic_explicit
        is_stress = is_stress_explicit
        is_sadness = is_sadness_explicit
        is_relationship = is_relationship_explicit
        is_sleep = is_sleep_explicit
        
        is_continuation = any(w in clean_msg for w in ["tell me", "what to do", "help me", "how", "what", "yes", "please", "elaborate", "explain", "batao", "bataiye", "kya karu", "kaise"])

        # If it's a continuation query, try to infer the topic from the chat history
        if is_continuation and chat_history:
            # Look at user messages in the history to find topics
            history_text = " ".join([m['content'].lower() for m in chat_history if m['role'] == 'user'])
            if any(w in history_text for w in ["exam", "study", "focus", "preparation", "pressure", "test", "fail", "results", "padhai"]):
                is_academic = True
            elif any(w in history_text for w in ["stress", "anxious", "anxiety", "tension", "scared", "worry", "panic", "overwhelmed"]):
                is_stress = True
            elif any(w in history_text for w in ["sad", "lonely", "alone", "low", "depressed", "udaas", "akela"]):
                is_sadness = True
            elif any(w in history_text for w in ["breakup", "heartbreak", "relationship", "gf", "bf", "friend", "parents"]):
                is_relationship = True
            elif any(w in history_text for w in ["sleep", "insomnia", "night", "overthinking", "neend"]):
                is_sleep = True

        is_explicit_continuation = is_continuation and not any([
            is_academic_explicit, is_stress_explicit, is_sadness_explicit, is_relationship_explicit, is_sleep_explicit
        ])
        # If it is explicitly a continuation, route it to detailed guides first
        if is_explicit_continuation:
            if not bilingual:
                if age <= 25:
                    if is_academic:
                        return (
                            "To help with your exam focus, let's break down the Pomodoro technique step-by-step:\n\n"
                            "1. **Set the Stage**: Choose one topic and set a timer for 25 minutes.\n"
                            "2. **Pure Focus**: Work with zero distractions until the timer rings.\n"
                            "3. **Short Break**: Take a 5-minute break to stretch or drink water.\n"
                            "4. **Repeat and Rest**: After 4 sessions, take a longer 20-minute break.\n\n"
                            "Try doing one Pomodoro session now! What subject are you working on?"
                        )
                    elif is_stress:
                        return (
                            "Here is the step-by-step 5-4-3-2-1 grounding technique to calm your nervous system right now:\n\n"
                            "1. **See**: Look around and name 5 things you see.\n"
                            "2. **Touch**: Notice 4 things you can physically feel (e.g. your feet on the floor).\n"
                            "3. **Hear**: Listen closely and name 3 sounds you can hear.\n"
                            "4. **Smell**: Identify 2 things you can smell around you.\n"
                            "5. **Taste**: Focus on 1 thing you can taste.\n\n"
                            "This shifts your focus back to the present. How does that feel to practice?"
                        )
                    elif is_sadness:
                        return (
                            "When feelings of sadness or loneliness are heavy, try these gentle steps:\n\n"
                            "1. **Self-Validation**: Acknowledge your feelings without self-criticism.\n"
                            "2. **Comfort Object**: Grab a warm drink, wrap up in a blanket, or listen to a comforting song.\n"
                            "3. **Reach Out**: Send a simple text to someone you trust, even just a greeting.\n"
                            "4. **Small Action**: Do one tiny task, like tidying a small space or drinking a glass of water.\n\n"
                            "What is one small self-care act you feel ready to do for yourself today?"
                        )
                    elif is_relationship:
                        return (
                            "Handling conflict or a breakup takes time. Here are key steps to guide you:\n\n"
                            "1. **Take Space**: Step back to let high emotions cool down before reacting.\n"
                            "2. **Define Boundaries**: Decide what topics or interactions you need to pause.\n"
                            "3. **Self-Focus**: Reconnect with personal hobbies and friends who support you.\n"
                            "4. **Communicate Clarities**: Use 'I' statements when you feel ready to talk.\n\n"
                            "Would you like to discuss what boundaries you might want to set?"
                        )
                    elif is_sleep:
                        return (
                            "To calm your mind before sleep, please follow these steps:\n\n"
                            "1. **Cognitive Offload**: Write down all your thoughts and tomorrow's to-dos on paper.\n"
                            "2. **Screen Lock**: Put away your phone and screens completely.\n"
                            "3. **Box Breathing**: Inhale for 4 seconds, hold for 4, exhale for 4, and hold for 4.\n"
                            "4. **Body Scan**: Focus on relaxing each muscle group from your toes to your face.\n\n"
                            "Would you like to try the box breathing exercise together?"
                        )
                    else:
                        return "I am right here with you. Take a slow, deep breath. Can you tell me a bit more about what is going on, or is there a specific technique you would like to explore?"
                else:
                    if is_academic:
                        return (
                            "To manage academic or professional workloads, I highly recommend this structured Pomodoro protocol:\n\n"
                            "1. **Task Selection**: Define a singular focus task.\n"
                            "2. **Monotasking**: Dedicate 25 minutes of uninterrupted focus to it.\n"
                            "3. **Cognitive Rest**: Take a 5-minute break away from screens.\n"
                            "4. **Long Rest**: After 4 cycles, take a longer 20-30 minute rest break to restore cognitive capacity.\n\n"
                            "What is the primary task you are preparing to tackle?"
                        )
                    elif is_stress:
                        return (
                            "To mitigate acute stress, please utilize the 5-4-3-2-1 grounding protocol:\n\n"
                            "1. **Visual**: Identify 5 distinct visual objects in your environment.\n"
                            "2. **Tactile**: Pay attention to 4 physical sensations you can feel.\n"
                            "3. **Auditory**: Listen and note 3 specific sounds.\n"
                            "4. **Olfactory**: Detect 2 scents.\n"
                            "5. **Gustatory**: Focus on 1 taste.\n\n"
                            "This redirects cognitive resources to sensory inputs, reducing anxiety. How do you feel after trying this?"
                        )
                    elif is_sadness:
                        return (
                            "To cope with deep sadness or feelings of isolation, please follow these steps:\n\n"
                            "1. **Acknowledge**: Accept the emotional pain without judgment or self-blame.\n"
                            "2. **Activate Connection**: Reach out to a professional or a close friend.\n"
                            "3. **Physical Movement**: Engage in low-intensity activity, like walking outside.\n"
                            "4. **Micro-Goals**: Accomplish one very small task to restore a sense of agency.\n\n"
                            "What is one supportive step you feel ready to take today?"
                        )
                    elif is_relationship:
                        return (
                            "Resolving relationship conflict begins with clarifying boundaries. Please take these steps:\n\n"
                            "1. **De-escalation**: Take temporary physical or communicative space.\n"
                            "2. **Clarification**: Identify your specific emotional needs and boundaries.\n"
                            "3. **Constructive Dialogue**: Use 'I' statements to convey feelings instead of accusations.\n"
                            "4. **Acceptance**: Recognize what you can and cannot control in the relationship.\n\n"
                            "What specific communication challenges are you facing?"
                        )
                    elif is_sleep:
                        return (
                            "For sleep onset support, try this structured wind-down sequence:\n\n"
                            "1. **Worry Journaling**: Offload cognitive burdens by writing them down 1 hour before bed.\n"
                            "2. **Melatonin Prep**: Turn off blue-light emitting devices.\n"
                            "3. **Respiration**: Engage in box breathing (4s inhale, 4s hold, 4s exhale, 4s hold).\n"
                            "4. **Nervous Regulation**: Focus on relaxing your body consciously.\n\n"
                            "Shall we practice this breathing exercise together?"
                        )
                    else:
                        return "Thank you for confirming. I am here to guide you. Please share what you are experiencing, or tell me if you would like to try a specific breathing or mindfulness exercise."
            else:
                if age <= 25:
                    if is_academic:
                        return (
                            "Exam focus aur preparation ke liye Pomodoro technique step-by-step follow karo:\n\n"
                            "1. **Timer Lagao**: Ek subject chuno aur 25 minutes ka timer set karo.\n"
                            "2. **Strict Study**: 25 minutes bina phone touch kiye sirf padhai karo.\n"
                            "3. **Chota Break**: Timer bajte hi 5 minutes ka quick break lo.\n"
                            "4. **Lamba Break**: Aise 4 cycles ke baad 20 minutes ka bada break lo.\n\n"
                            "Abhi kaunsa subject padhna start karoge tum?"
                        )
                    elif is_stress:
                        return (
                            "Stress kam karne ke liye 5-4-3-2-1 grounding technique try karo:\n\n"
                            "1. **Dekho**: Aas-paas 5 cheezein dekho aur unke naam lo.\n"
                            "2. **Feel Karo**: 4 cheezon ko touch karke mahsoos karo.\n"
                            "3. **Suno**: 3 aawazon par dhyan do aur suno.\n"
                            "4. **Smell Karo**: 2 cheezon ki smell lo.\n"
                            "5. **Taste Karo**: 1 cheez taste karo.\n\n"
                            "Isse tumhara dimag relax ho jayega. Ek baar try karke dekho, kaisa lagta hai?"
                        )
                    elif is_sadness:
                        return (
                            "Udaas ya akela feel hone par ye chote steps follow karo:\n\n"
                            "1. **Blame Mat Karo**: Apne aap ko blame mat karo, low feel hona normal hai.\n"
                            "2. **Walk Par Jao**: Bahar ja kar thodi fresh hawa lo.\n"
                            "3. **Dost Se Baat**: Apne kisi close friend ko message ya call karo.\n"
                            "4. **Self-Care**: Ek glass paani piyo aur thoda rest karo.\n\n"
                            "Tumhe kya lagta hai, kis baat se mood zyada off hua?"
                        )
                    elif is_relationship:
                        return (
                            "Relationship issues handle karne ke liye ye steps follow karo:\n\n"
                            "1. **Thoda Space Lo**: Gusse me baat karne se bacho, space lo.\n"
                            "2. **Clear Boundaries**: Apne limits set karo aur unhe batao.\n"
                            "3. **Vent Out**: Apne emotions ko dabaao mat, kisi dost se share karo.\n"
                            "4. **Self-Priority**: Apne hobbies aur self-care par focus karo.\n\n"
                            "Abhi unse baat karna theek rahega ya thoda break lena chahiye?"
                        )
                    elif is_sleep:
                        return (
                            "Raat ko achi neend ke liye ye steps follow karo:\n\n"
                            "1. **Likh Do**: Apne saare thoughts ko sone se pehle paper par likh do.\n"
                            "2. **No Screen**: Phone ko apne se door rakh do.\n"
                            "3. **Box Breathing**: 4 seconds inhale, 4 hold, 4 exhale, 4 hold.\n"
                            "4. **Relax**: Apni body ko dhila chhod kar neend ka wait karo.\n\n"
                            "Kya tum abhi box breathing try karna chahete ho?"
                        )
                    else:
                        return "Main yahi hoon yaar, chinta mat karo. Jo bhi share karna chaho, khulkar batate jao. Kaisa lag raha hai abhi?"
                else:
                    if is_academic:
                        return (
                            "Focus aur exam preparation ke liye aap is structured Pomodoro vidhi ka palan karein:\n\n"
                            "1. **Karya Nirdharan**: Ek vishesh subject aur topic chunein.\n"
                            "2. **Dhyan Kendrit Karein**: 25 minute bina kisi distraction ke padhein.\n"
                            "3. **Laghuvishram**: 5 minute ka vishram lein aur stretch karein.\n"
                            "4. **Deerghavishram**: 4 chakra ke baad ek lamba 20 minute ka break lein.\n\n"
                            "Aap abhi kis vishay par dhyan kendrit kar rahe hain?"
                        )
                    elif is_stress:
                        return (
                            "Mansik stress kam karne ke liye 5-4-3-2-1 grounding technique ka prayas karein:\n\n"
                            "1. **Drishya**: Apne aas-paas ki 5 dekhne layak cheezein pehchanein.\n"
                            "2. **Sparsh**: 4 mahsoos karne layak cheezon par dhyan lagayein.\n"
                            "3. **Dhwani**: 3 sunne layak aawazein sunein.\n"
                            "4. **Ghandh**: 2 sugandh mahsoos karein.\n"
                            "5. **Swad**: 1 swad par dhyan kendrit karein.\n\n"
                            "Kya aapne iska prayas kiya? Isse aapka mann shaant hoga."
                        )
                    elif is_sadness:
                        return (
                            "Udaas aur akela mahsoos hone par in charano ka palan karein:\n\n"
                            "1. **Sweekar Karein**: Apni udaasi ko bina kisi aatm-alochna ke sweekar karein.\n"
                            "2. **Sampark Karein**: Kisi vishwaspatra vyakti se apni chinta share karein.\n"
                            "3. **Prakriti**: Thoda samay bahar bitayein ya walk par chalein.\n"
                            "4. **Chote Lakshya**: Ek bohot chota aur aasan kaam pura karein.\n\n"
                            "Kya aap is samay kisi se apni chinta share kar sakte hain?"
                        )
                    elif is_relationship:
                        return (
                            "Rishton me takraav ko suljhane ke liye in charano ka prayog karein:\n\n"
                            "1. **Samay Lein**: Shanti se sochna shuru karne se pehle space lein.\n"
                            "2. **Seemayein**: Apni emotional boundaries ko spasht karein.\n"
                            "3. **Bhavna Spasht Karein**: 'I statements' ka prayog kar shanti se baat karein.\n"
                            "4. **Niyantran**: Keval wahi badlein jo aapke control me hai.\n\n"
                            "Kya aap is baare me aur vishleshna karna chahenge?"
                        )
                    elif is_sleep:
                        return (
                            "Raat ko achi neend ke liye in charano ka abhyas karein:\n\n"
                            "1. **Vichar Offload**: Sone se pehle apne vicharo ko ek diary me likh lein.\n"
                            "2. **Screen Band**: Sone se 30 minute pehle screen ka prayog band karein.\n"
                            "3. **Respiration**: Box breathing (4 second saans lein, 4 rokein, 4 chhodein) karein.\n"
                            "4. **Shaant Mastishk**: Dheere-dheere apni muscle tension ko release karein.\n\n"
                            "Kya aapko sote waqt lagatar thoughts aate hain?"
                        )
                    else:
                        return "Ji, main aapke sath hoon. Kripya bina kisi sankoch ke apni baat share karein ya batayein agar aap koi meditation exercise karna chahein."

        # Extract context-based coping tip
        context_tips = ""
        if "breathing" in context.lower() or "inhale" in context.lower():
            context_tips = "1. **Box Breathing**: Inhale for 4 seconds, hold for 4, exhale for 4, hold for 4."
        elif "grounding" in context.lower() or "sensory" in context.lower():
            context_tips = "1. **5-4-3-2-1 Grounding**: Identify 5 things you see, 4 you feel, 3 you hear, 2 smell, 1 taste."
        elif "exam" in context.lower() or "study" in context.lower() or is_academic:
            context_tips = "1. **Pomodoro Blocks**: Study in 25-minute blocks with 5-minute rests to stay focused."
        elif "distortions" in context.lower() or "worst" in context.lower():
            context_tips = "1. **Cognitive Challenge**: Question catastrophizing thoughts by finding the realistic outcome."
        elif "sleep" in context.lower() or "night" in context.lower() or is_sleep:
            context_tips = "1. **Worry Journaling**: Write down your thoughts before sleeping to offload your mind."
        elif "lonely" in context.lower() or "alone" in context.lower() or is_sadness:
            context_tips = "1. **Active Connection**: Message a trusted friend or loved one to break isolation."
        elif "relationship" in context.lower() or "heartbreak" in context.lower() or is_relationship:
            context_tips = "1. **Set Boundaries**: Establish healthy boundaries to protect your emotional energy."

        # Now, formulate response based on detected category
        if bilingual:
            # --- HINGLISH RESPONSES ---
            if age <= 25:
                # Hinglish, Young, Peer-like (Yaar)
                if is_academic:
                    res = (
                        "Yaar, exam pressure aur focus issues sach me bohot frustrating hote hain. "
                        "Here are clear steps to get back on track:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Pomodoro Method**: 25 mins padho, 5 mins rest lo.\n"
                    res += (
                        "2. **Limit Distractions**: Phone ko doosre room me rakho.\n"
                        "3. **Stay Hydrated**: Ek glass paani piyo aur brain recharge karo.\n\n"
                        "Abhi tum kis subject ki preparation kar rahe ho?"
                    )
                elif is_stress:
                    res = (
                        "Yaar, main samajh sakta hoon ki tum kaafi stress aur tension me ho. "
                        "Try these steps right now to calm down:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Slow Breaths**: 4 counts inhale karo, 4 counts hold karo, 4 counts exhale karo.\n"
                    res += (
                        "2. **Sensory Check**: Apne aas-paas ki koi 3 cheezon par focus karo.\n"
                        "3. **Vent**: Apne thoughts ko diary me likho.\n\n"
                        "Abhi kaisa feel ho raha hai?"
                    )
                elif is_sadness:
                    res = (
                        "Yaar, low ya lonely feel hona sach me bohot painful hota hai. "
                        "Here are small steps you can take today:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Self-Compassion**: Apne aap ko blame mat karo.\n"
                    res += (
                        "2. **Micro-Step**: Ek glass paani piyo ya stretch karo.\n"
                        "3. **Reach Out**: Kisi close friend ko ping karo.\n\n"
                        "Kya tumhare mind me koi aisi baat hai jo sabse zyada pareshan kar rahi hai?"
                    )
                elif is_relationship:
                    res = (
                        "Dost, relationship problems aur fights dil ko bohot dukh pahunchate hain. "
                        "Please use these steps to process this:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Take Space**: Gusse me react karne se bacho aur space lo.\n"
                    res += (
                        "2. **Validate Emotions**: Apne emotions ko accept karo.\n"
                        "3. **Boundaries**: Swasth seemayein (boundaries) decide karo.\n\n"
                        "Tum is baare me thoda aur share karna chahte ho?"
                    )
                elif is_sleep:
                    res = (
                        "Yaar, jab mind me overthinking chalti hai toh neend aana bohot mushkil ho jata hai. "
                        "Try these steps to quiet your mind:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Brain Dump**: Diary me saare thoughts likh do.\n"
                    res += (
                        "2. **Screen Away**: Sone se 30 mins pehle phone band kar do.\n"
                        "3. **Relax Breathing**: Saans dheemi aur gahri lo.\n\n"
                        "Kya raat ko dimag me thoughts chalte rehte hain?"
                    )
                else:
                    res = "Main sun raha hoon yaar. Jo bhi tumhare dil me chal raha hai, bejhijhak bol do. Main hamesha tumhare sath hoon support karne ke liye. Thoda aur batao is baare me?"
            else:
                # Hinglish, Mature/Professional (Aap)
                if is_academic:
                    res = (
                        "Main samajh sakta hoon ki aap exams aur career ka kaafi dabav mahsoos kar rahe hain. "
                        "Kripya in charano ka prayas karein:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Pomodoro Blocks**: 25 minute padhein, 5 minute vishram karein.\n"
                    res += (
                        "2. **Distraction Control**: Padhai ke samay mobile notifications silent karein.\n"
                        "3. **Task Breakdown**: Bade chapters ko chote bhago me baantein.\n\n"
                        "Aap abhi kis vishay par dhyan kendrit kar rahe hain?"
                    )
                elif is_stress:
                    res = (
                        "Main samajh sakta hoon ki aap is waqt kaafi mansik dabav aur chinta se guzar rahe hain. "
                        "Aapki sahayata ke liye nirdeshit charan:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Deep Breathing**: Dheere aur gahri saans lein (box breathing).\n"
                    res += (
                        "2. **Grounding**: Apne aas-paas ki sthool vastuon par dhyan lagayein.\n"
                        "3. **Priority**: Aaj ke keval 1-2 zaroori kaamo par dhyan lagayein.\n\n"
                        "Kya aap is stress ki wajah ke baare me thoda aur baat karna chahenge?"
                    )
                elif is_sadness:
                    res = (
                        "Akela aur udaas mahsoos karna ek bohot hi gehri chinta hai. "
                        "Aapki shanti ke liye kuch chote sujhaav:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Self-Kindness**: Apne prati dayalu rahein aur aatm-chintan karein.\n"
                    res += (
                        "2. **Active Step**: Thoda samay park me bitayein ya walk karein.\n"
                        "3. **Support System**: Apne priyajan se sampark karein.\n\n"
                        "Aapko lagta hai ki aapke aas-paas koi aisa dost ya family member hai jisse aap baat kar sakein?"
                    )
                elif is_relationship:
                    res = (
                        "Rishton me tanav aur aapsi matbhed se mansik shanti prabhavit hoti hai. "
                        "Kripya in charano par vichar karein:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Space & Pause**: Aavesh me aakar koi nirnay na lein.\n"
                    res += (
                        "2. **Define Boundaries**: Apne vicharo aur simaon ko spasht karein.\n"
                        "3. **Healthy Expression**: Partner ke sath bina aakshep lagaye baat karein.\n\n"
                        "Kya aap is rishtey ke tanav ke baare me kuch aur share karna chahenge?"
                    )
                elif is_sleep:
                    res = (
                        "Neend na aana aur raat ko lagatar chalne wale vichar aapko thaka dete hain. "
                        "In charano ka palan karein:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Brain Offload**: Vicharo ko diary me likh kar dimag halka karein.\n"
                    res += (
                        "2. **Screen Silent**: Sone se pehle mobile door rakhein.\n"
                        "3. **Nervous Regulation**: Box breathing ka prayas karein.\n\n"
                        "Kya aapko aksar sote waqt din bhar ki chinta satati hai?"
                    )
                else:
                    res = "Ji, main aapki baat sun raha hoon. Aap jo bhi share karna chahein, bina kisi sankoch ke kar sakte hain. Aap is samasya ke baare me thoda aur vistaar se batana chahenge?"
        else:
            # --- ENGLISH RESPONSES ---
            if age <= 25:
                # English, Young, Peer-like (Friend)
                if is_academic:
                    res = (
                        "I completely get it, exam pressure and trying to focus when preparing is so tough. "
                        "Here are clear steps to help you tackle this:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Pomodoro Blocks**: Study for 25 minutes, then take a 5-minute break.\n"
                    res += (
                        "2. **Digital Detox**: Put your phone in another room to prevent interruptions.\n"
                        "3. **Bite-Sized Goals**: Break big chapters down into 2-3 smaller tasks.\n\n"
                        "What subject or exam are you preparing for right now?"
                    )
                elif is_stress:
                    res = (
                        "I hear you, and it's completely valid to feel stressed out. "
                        "Try these steps right now to calm your mind:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Box Breathing**: Inhale for 4 seconds, hold for 4, exhale for 4, hold for 4.\n"
                    res += (
                        "2. **Sensory Grounding**: Identify 3 things you can see and touch near you.\n"
                        "3. **Physical Pause**: Stand up, stretch, or walk for 2 minutes.\n\n"
                        "What is the main thing causing you stress right now?"
                    )
                elif is_sadness:
                    res = (
                        "I'm so sorry you're feeling lonely or low, friend. "
                        "Here are a few small steps to help ease this heavy feeling:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Validate Emotions**: Remind yourself it's okay to feel sad or isolated.\n"
                    res += (
                        "2. **Micro-Movement**: Drink a glass of water or open a window for fresh air.\n"
                        "3. **Reach Out**: Send a quick, casual message to a close friend.\n\n"
                        "Would you like to tell me what's on your mind?"
                    )
                elif is_relationship:
                    res = (
                        "Relationship issues and conflicts can really hurt. "
                        "Here is how you can process this step-by-step:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Take Space**: Step back to let high emotions cool down before reacting.\n"
                    res += (
                        "2. **Define Limits**: Clarify what boundaries you need to protect your energy.\n"
                        "3. **Express Calmly**: Focus on 'I feel...' statements rather than finger-pointing.\n\n"
                        "Do you want to vent or talk about what happened?"
                    )
                elif is_sleep:
                    res = (
                        "Overthinking at night can make sleep feel impossible. "
                        "Use these steps to wind down before bed:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Cognitive Offload**: Write down all your worries on paper to empty your mind.\n"
                    res += (
                        "2. **No Screens**: Put away all digital devices 30 minutes before trying to sleep.\n"
                        "3. **Physiological Rest**: Do box breathing to signal safety to your body.\n\n"
                        "Are there specific thoughts keeping you awake?"
                    )
                else:
                    res = "I'm listening. It takes courage to open up, and I'm glad you're here. Can you tell me a bit more about what's going on?"
            else:
                # English, Mature/Professional
                if is_academic:
                    res = (
                        "I understand the immense pressure academic preparation and career goals can bring. "
                        "Please consider this structured approach:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Pomodoro Protocol**: Work for 25 minutes, followed by 5 minutes of cognitive rest.\n"
                    res += (
                        "2. **Environmental Control**: Minimize digital distractions and notification alerts.\n"
                        "3. **Task Deconstruction**: Segment large subjects into discrete milestones.\n\n"
                        "What specific topics or challenges are you currently preparing for?"
                    )
                elif is_stress:
                    res = (
                        "I completely understand, and I want to validate how exhausting this stress must feel. "
                        "To manage this, please follow these steps:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Diaphragmatic Breathing**: Slow your respiration (4s inhale, 4s hold, 4s exhale).\n"
                    res += (
                        "2. **Grounding Exercise**: Anchor yourself in the present by noting sensory inputs.\n"
                        "3. **Select Priority**: Choose only one pressing item to focus on today.\n\n"
                        "Would you care to share more about what is contributing to this pressure?"
                    )
                elif is_sadness:
                    res = (
                        "I am very sorry to hear that you are feeling sad and isolated. "
                        "Here are a few structured steps to support your coping process:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Self-Compassion**: Accept these emotions without judgment or criticism.\n"
                    res += (
                        "2. **Environment Shift**: Step outside for low-intensity activity or fresh air.\n"
                        "3. **Micro-Connection**: Engage in a brief interaction with a trusted contact.\n\n"
                        "What specific thoughts or events have been making you feel this way lately?"
                    )
                elif is_relationship:
                    res = (
                        "Interpersonal conflicts and relationship transitions can severely impact your peace of mind. "
                        "Here is a recommended course of action:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Temporal Boundaries**: Take space to allow heightened emotions to cool down.\n"
                    res += (
                        "2. **Establish Seemayein**: Define clear emotional and physical limits.\n"
                        "3. **Constructive Dialogue**: Communicate your needs using neutral, non-accusatory terms.\n\n"
                        "Would you care to share more about this situation?"
                    )
                elif is_sleep:
                    res = (
                        "Sleep disturbances and overactive thinking at night can significantly compound daily anxiety. "
                        "To regulate your sleep onset, use this protocol:\n\n"
                    )
                    if context_tips:
                        res += f"{context_tips}\n"
                    else:
                        res += "1. **Worry Journaling**: Write down persistent thoughts to unload cognitive load.\n"
                    res += (
                        "2. **Light Control**: Discontinue screen usage 30 minutes before sleep.\n"
                        "3. **Physiological Calibration**: Engage in box breathing or deep breathing.\n\n"
                        "Do you find yourself ruminating on worries when attempting to sleep?"
                    )
                else:
                    res = "Thank you for sharing that with me. I am here to support you through this. Could you elaborate a bit more on what you are experiencing?"
        
        return res
