"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { 
  Heart, MessageCircle, Calendar, BookOpen, Settings, 
  LogOut, Sun, Moon, Sparkles, Check, AlertCircle, RefreshCw 
} from "lucide-react";

import ChatSanctuary from "@/components/ChatSanctuary";
import MoodTracker from "@/components/MoodTracker";
import ResourcesSanctuary from "@/components/ResourcesSanctuary";

type ActiveTab = "chat" | "mood" | "resources" | "settings";

interface User {
  name: string;
  age: number;
  email: string;
}

export default function Dashboard() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<ActiveTab>("chat");
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [hydrated, setHydrated] = useState(false);

  // Profile Settings Form State
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState<number | "">("");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Hydrate client state and verify token
  useEffect(() => {
    setHydrated(true);
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("chitraksha_token");
      const cachedUser = localStorage.getItem("chitraksha_user");
      
      if (!token) {
        router.push("/");
        return;
      }

      if (cachedUser) {
        const u = JSON.parse(cachedUser);
        setUser(u);
        setEditName(u.name);
        setEditAge(u.age);
      }
      
      // Load saved theme
      const savedTheme = localStorage.getItem("chitraksha_theme") as "light" | "dark" | null;
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
      }
    }
  }, [router]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("chitraksha_theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  const handleLogout = () => {
    api.logout();
    router.push("/");
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileSuccess("");
    setProfileError("");

    try {
      if (!editName || editAge === "") {
        throw new Error("Name and age fields are required.");
      }
      const updatedUser = await api.updateProfile(editName, Number(editAge));
      setUser(updatedUser);
      setProfileSuccess("Your profile has been updated. AI therapist persona has been adjusted.");
      setTimeout(() => setProfileSuccess(""), 4000);
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile details.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  if (!hydrated || !user) {
    return (
      <div className="min-h-screen bg-sand text-charcoal flex items-center justify-center space-x-2">
        <RefreshCw className="w-5 h-5 text-terracotta animate-spin" />
        <span className="text-xs font-semibold text-charcoal-light">Entering the sanctuary...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand text-charcoal flex flex-col justify-between select-none">
      
      {/* 1. Header Bar */}
      <header className="px-6 py-4 border-b border-sage/10 bg-sand/65 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-terracotta flex items-center justify-center text-sand shadow-md">
            <Heart className="w-3.5 h-3.5" />
          </div>
          <span className="font-serif font-bold text-lg text-terracotta tracking-wider">Chitraksha</span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-xs text-charcoal-light font-semibold hidden md:inline">
            Aman ki shanti, <span className="text-terracotta font-serif font-bold italic">{user.name}</span>
          </span>
          
          {/* Theme toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2 bg-sand hover:bg-sand-dark border border-sage/10 rounded-xl transition-all"
            title="Toggle Theme"
          >
            {theme === "light" ? <Moon className="w-4 h-4 text-charcoal-light" /> : <Sun className="w-4 h-4 text-saffron" />}
          </button>

          {/* Logout */}
          <button 
            onClick={handleLogout}
            className="p-2 bg-terracotta/5 hover:bg-terracotta/10 border border-terracotta/10 text-terracotta rounded-xl transition-all"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main Dashboard Panel */}
      <div className="max-w-6xl w-full mx-auto px-6 py-8 flex-grow grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Navigation Sidebar */}
        <nav className="col-span-1 md:col-span-3 space-y-2 self-start">
          <div className="text-[10px] uppercase font-bold text-charcoal-light tracking-wider px-3 pb-2 border-b border-sage/10 mb-2">
            Sanctuary Spaces
          </div>
          
          <button
            onClick={() => setActiveTab("chat")}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "chat" 
                ? "bg-terracotta text-sand font-bold shadow-md shadow-terracotta/15" 
                : "bg-sand hover:bg-sand-dark text-charcoal"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat Sanctuary</span>
          </button>

          <button
            onClick={() => setActiveTab("mood")}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "mood" 
                ? "bg-terracotta text-sand font-bold shadow-md shadow-terracotta/15" 
                : "bg-sand hover:bg-sand-dark text-charcoal"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Mood Tracker</span>
          </button>

          <button
            onClick={() => setActiveTab("resources")}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "resources" 
                ? "bg-terracotta text-sand font-bold shadow-md shadow-terracotta/15" 
                : "bg-sand hover:bg-sand-dark text-charcoal"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Healing Sanctuary</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "settings" 
                ? "bg-terracotta text-sand font-bold shadow-md shadow-terracotta/15" 
                : "bg-sand hover:bg-sand-dark text-charcoal"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Sanctuary Settings</span>
          </button>
        </nav>

        {/* Tab Viewport */}
        <div className="col-span-1 md:col-span-9 bg-sand/30 border border-sage/10 rounded-2xl p-6 md:p-8 min-h-[500px]">
          {activeTab === "chat" && <ChatSanctuary />}
          {activeTab === "mood" && <MoodTracker />}
          {activeTab === "resources" && <ResourcesSanctuary />}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-float-delayed max-w-md">
              <div className="space-y-1">
                <h2 className="text-3xl font-serif text-terracotta font-semibold">
                  Profile Settings
                </h2>
                <p className="text-charcoal-light text-xs">
                  Change your profile details. Modifying your age automatically updates Chitraksha's empathetic persona to best suit your preferences.
                </p>
              </div>

              {profileSuccess && (
                <div className="flex items-center space-x-2 bg-sage/10 border border-sage/20 text-sage-dark text-xs p-3 rounded-xl">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="flex items-center space-x-2 bg-terracotta/10 border border-terracotta/20 text-terracotta-dark text-xs p-3 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-charcoal-light uppercase tracking-wider">Your Name</label>
                  <input 
                    type="text" 
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-sage/20 bg-sand/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sage focus:bg-sand text-charcoal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-charcoal-light uppercase tracking-wider">Account Email</label>
                  <input 
                    type="email" 
                    disabled
                    value={user.email}
                    className="w-full px-4 py-2.5 border border-sage/10 bg-sand-dark text-charcoal-light/60 rounded-xl text-xs cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-charcoal-light uppercase tracking-wider">Age (updates chatbot persona)</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    max={120}
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-sage/20 bg-sand/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sage focus:bg-sand text-charcoal"
                  />
                  <p className="text-[9px] text-sage font-medium mt-1">
                    {Number(editAge) <= 25 
                      ? "Age ≤ 25: AI acts as a warm, peer-like Hinglish companion ('yaar')." 
                      : "Age ≥ 26: AI acts as a professional, respectful counseling therapist ('aap')."}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="w-full md:w-auto px-6 py-2.5 bg-terracotta hover:bg-terracotta-dark text-sand text-xs font-semibold rounded-xl transition-all duration-300 shadow-md shadow-terracotta/15 flex items-center justify-center space-x-1"
                >
                  {updatingProfile ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Save and Update Persona</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

      </div>

      {/* 3. Footer */}
      <footer className="max-w-6xl w-full mx-auto px-6 py-6 border-t border-sage/10 text-center text-[10px] text-charcoal-light flex items-center justify-between flex-wrap gap-2">
        <p>&copy; {new Date().getFullYear()} Chitraksha. All records are stored confidentially inside the local SQLite database.</p>
        <p>Bilingual Support &bull; Hinglish / Hindi / English</p>
      </footer>
    </div>
  );
}
