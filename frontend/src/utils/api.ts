const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Helper to get authorization headers
const getHeaders = (isJson = true) => {
  const headers: HeadersInit = {};
  if (isJson) {
    headers["Content-Type"] = "application/json";
  }
  
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("chitraksha_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
};

export const api = {
  // --- AUTH SERVICES ---
  
  async register(name: string, email: string, password: string, age: number) {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name, email, password, age }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to register.");
    
    if (typeof window !== "undefined" && data.token) {
      localStorage.setItem("chitraksha_token", data.token);
      localStorage.setItem("chitraksha_user", JSON.stringify(data.user));
    }
    return data;
  },

  async login(email: string, password: string) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to log in.");
    
    if (typeof window !== "undefined" && data.token) {
      localStorage.setItem("chitraksha_token", data.token);
      localStorage.setItem("chitraksha_user", JSON.stringify(data.user));
    }
    return data;
  },

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("chitraksha_token");
      localStorage.removeItem("chitraksha_user");
    }
  },

  async getMe() {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      method: "GET",
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch user.");
    return data.user;
  },

  async updateProfile(name: string, age: number) {
    const res = await fetch(`${BASE_URL}/api/auth/profile`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ name, age }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update profile.");
    
    if (typeof window !== "undefined" && data.user) {
      localStorage.setItem("chitraksha_user", JSON.stringify(data.user));
    }
    return data.user;
  },

  // --- CHAT SERVICES ---

  async getSessions() {
    const res = await fetch(`${BASE_URL}/api/chat/sessions`, {
      method: "GET",
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch sessions.");
    return data.sessions;
  },

  async createSession(title = "New Sanctuary Session") {
    const res = await fetch(`${BASE_URL}/api/chat/sessions`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to create session.");
    return data;
  },

  async deleteSession(sessionId: number) {
    const res = await fetch(`${BASE_URL}/api/chat/sessions/${sessionId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to delete session.");
    return data;
  },

  async getMessages(sessionId: number) {
    const res = await fetch(`${BASE_URL}/api/chat/sessions/${sessionId}/messages`, {
      method: "GET",
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch messages.");
    return data.messages;
  },

  async sendMessage(sessionId: number, content: string) {
    const res = await fetch(`${BASE_URL}/api/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to send message.");
    return data;
  },

  async streamMessage(
    sessionId: number, 
    content: string, 
    onChunk: (chunk: string) => void,
    onMeta: (meta: any) => void,
    onDone: (doneData: any) => void
  ) {
    const res = await fetch(`${BASE_URL}/api/chat/sessions/${sessionId}/stream`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ content }),
    });
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Failed to send message stream.");
    }
    
    if (!res.body) throw new Error("No response body");
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      let newlineIdx;
      while ((newlineIdx = buffer.indexOf('\n\n')) >= 0) {
        const eventStr = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 2);
        
        if (eventStr.startsWith("data: ")) {
          const jsonStr = eventStr.slice(6);
          try {
            const data = JSON.parse(jsonStr);
            if (data.type === "meta") {
              onMeta(data);
            } else if (data.type === "chunk") {
              onChunk(data.content);
            } else if (data.type === "done") {
              onDone(data);
            }
          } catch (e) {
            console.error("Failed to parse SSE JSON:", jsonStr);
          }
        }
      }
    }
  },

  // --- MOOD SERVICES ---

  async getMoods() {
    const res = await fetch(`${BASE_URL}/api/mood`, {
      method: "GET",
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch moods.");
    return data.mood_logs;
  },

  async logMood(date: string, moodScore: number, notes: string) {
    const res = await fetch(`${BASE_URL}/api/mood`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ date, mood_score: moodScore, notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to log mood.");
    return data;
  },

  async getMoodInsights() {
    const res = await fetch(`${BASE_URL}/api/mood/insights`, {
      method: "GET",
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch insights.");
    return data.insights;
  },

  async exportMoodCsv() {
    const token = typeof window !== "undefined" ? localStorage.getItem("chitraksha_token") : null;
    const res = await fetch(`${BASE_URL}/api/mood/export`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error("Failed to export CSV.");
    const blob = await res.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chitraksha_mood_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
};
