"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { Sparkles, Heart, AlertCircle, RefreshCw, BookOpen, BrainCircuit } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState<number | "">("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Check if user is already logged in
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("chitraksha_token");
      if (token) {
        router.push("/dashboard");
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (isLogin) {
        await api.login(email, password);
      } else {
        if (!name || age === "") {
          throw new Error("Please fill out all fields.");
        }
        await api.register(name, email, password, Number(age));
      }
      // Redirect on success
      router.push("/dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand text-charcoal flex flex-col justify-between relative overflow-hidden select-none">
      
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-saffron/5 blur-[120px] animate-slow-spin"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] aspect-square rounded-full bg-terracotta/5 blur-[100px] animate-pulse-gentle"></div>

      {/* 1. Header Navigation */}
      <header className="max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-terracotta flex items-center justify-center text-sand shadow-lg shadow-terracotta/25">
            <Heart className="w-4 h-4" />
          </div>
          <span className="font-serif font-bold text-xl text-terracotta tracking-wider">Chitraksha</span>
        </div>

        <div className="flex items-center space-x-1 bg-sage/10 px-3 py-1 rounded-full text-sage text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-sage animate-ping"></span>
          <span>Status: Somehow Working</span>
        </div>
      </header>

      {/* 2. Hero Component */}
      <main className="max-w-6xl w-full mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10 flex-grow">
        
        {/* Left Column: Philosophical Info */}
        <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center space-x-2 bg-saffron/10 text-saffron border border-saffron/20 px-3 py-1.5 rounded-xl text-xs font-semibold animate-float">
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Empathetic RAG-powered Chatbot</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-charcoal font-semibold leading-tight">
              An AI Therapist built by someone who <span className="text-terracotta italic underline decoration-saffron/40 underline-offset-4">needed therapy</span>
            </h1>
            <p className="text-sm md:text-base text-charcoal-light max-w-xl leading-relaxed mx-auto lg:mx-0">
              Chitraksha is a mental wellness sanctuary combining vector-based cognitive knowledge search (RAG) with Llama 3.1 8B. It responds in conversational Hindi, Hinglish, and English, adjusting its counseling style based on your age. Keep your journals safe, track your daily moods, and discover grounding exercises.
            </p>
          </div>

          {/* Value cards */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 pt-4">
            <div className="p-4 bg-sand border border-sage/10 rounded-2xl text-center space-y-1">
              <span className="text-xl">🗣️</span>
              <p className="font-serif font-bold text-xs text-charcoal">Bilingual Support</p>
              <p className="text-[10px] text-charcoal-light">Hindi / Hinglish mixing</p>
            </div>
            <div className="p-4 bg-sand border border-sage/10 rounded-2xl text-center space-y-1">
              <span className="text-xl">📊</span>
              <p className="font-serif font-bold text-xs text-charcoal">Mood Insights</p>
              <p className="text-[10px] text-charcoal-light">Visual trend charts</p>
            </div>
            <div className="p-4 bg-sand border border-sage/10 rounded-2xl text-center space-y-1">
              <span className="text-xl">🔒</span>
              <p className="font-serif font-bold text-xs text-charcoal">Secure & Private</p>
              <p className="text-[10px] text-charcoal-light">Local database logs</p>
            </div>
          </div>
        </div>

        {/* Right Column: Glassmorphic Auth Form */}
        <div className="lg:col-span-5 bg-sand/65 border border-sage/15 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-md max-w-md w-full mx-auto animate-float-delayed">
          
          <div className="text-center space-y-1 mb-6">
            <h3 className="text-2xl font-serif font-bold text-terracotta">
              {isLogin ? "Welcome Back" : "Begin Your Journey"}
            </h3>
            <p className="text-xs text-charcoal-light">
              {isLogin ? "Re-enter the healing sanctuary" : "Register to track your moods and speak to Chitraksha"}
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-center space-x-2 bg-terracotta/10 border border-terracotta/25 text-terracotta-dark text-xs p-3.5 rounded-2xl mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-charcoal-light uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  placeholder="Your Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-sage/20 bg-sand/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sage focus:bg-sand text-charcoal"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-charcoal-light uppercase tracking-wider">Email address</label>
              <input 
                type="email" 
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-sage/20 bg-sand/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sage focus:bg-sand text-charcoal"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-charcoal-light uppercase tracking-wider">Secret Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-sage/20 bg-sand/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sage focus:bg-sand text-charcoal"
              />
            </div>

            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-charcoal-light uppercase tracking-wider">Age (to tailor AI responses)</label>
                <input 
                  type="number" 
                  placeholder="Your Age"
                  required
                  min={1}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-sage/20 bg-sand/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sage focus:bg-sand text-charcoal"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-terracotta hover:bg-terracotta-dark text-sand text-xs font-semibold rounded-xl transition-all duration-300 shadow-md shadow-terracotta/20 flex items-center justify-center"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : isLogin ? (
                "Enter Sanctuary"
              ) : (
                "Create Secure Profile"
              )}
            </button>
          </form>

          {/* Form toggle */}
          <div className="text-center mt-6">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg("");
              }}
              className="text-xs text-saffron font-bold hover:underline"
            >
              {isLogin ? "Need a new account? Register here" : "Already have a profile? Sign in here"}
            </button>
          </div>
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="max-w-6xl w-full mx-auto px-6 py-6 border-t border-sage/10 text-center text-[10px] text-charcoal-light z-10 flex items-center justify-between flex-wrap gap-2">
        <p>&copy; {new Date().getFullYear()} Chitraksha. Made with 💜, 😤, ☕, and questionable life choices.</p>
        <div className="flex items-center space-x-4">
          <a href="#helplines" className="hover:underline flex items-center gap-1 font-semibold text-terracotta">
            <BookOpen className="w-3.5 h-3.5" /> India Crisis Support Lines
          </a>
        </div>
      </footer>
    </div>
  );
}
