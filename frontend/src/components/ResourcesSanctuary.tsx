"use client";

import React, { useState } from "react";
import { Phone, Heart, Bookmark, Search, Info } from "lucide-react";

interface Resource {
  title: string;
  category: string;
  description: string;
  steps?: string[];
}

const RESOURCE_DATABASE: Resource[] = [
  {
    title: "Box Breathing Technique",
    category: "Breathing Exercise",
    description: "A fast, 4-step technique used by first responders to reduce stress and trigger the parasympathetic nervous system.",
    steps: [
      "Inhale slowly through your nose for 4 seconds.",
      "Hold your breath inside for 4 seconds.",
      "Exhale completely through your mouth for 4 seconds.",
      "Hold your lungs empty for 4 seconds. Repeat the cycle."
    ]
  },
  {
    title: "5-4-3-2-1 Grounding Method",
    category: "Grounding",
    description: "Shift your focus outward to disengage from panic, anxiety, or racing thoughts by naming objects in your environment.",
    steps: [
      "Look around and name 5 things you can see.",
      "Touch and notice 4 things you can physically feel.",
      "Listen and identify 3 distinct sounds you can hear.",
      "Inhale and name 2 things you can smell.",
      "Taste 1 thing (like water or a mint)."
    ]
  },
  {
    title: "Challenging Catastrophizing",
    category: "CBT Skill",
    description: "Break the cycle of assuming the absolute worst-case scenario using rational cognitive restructuring questions.",
    steps: [
      "Define the catastrophizing thought (e.g., 'I will fail and my life is ruined').",
      "Ask: What is the actual evidence for and against this outcome?",
      "Ask: What is the absolute best-case and most realistic outcome?",
      "Ask: What would I tell a friend if they had this same worry?"
    ]
  },
  {
    title: "Progressive Muscle Relaxation",
    category: "Physical Calming",
    description: "Tension and release muscular groups from head to toe to relieve the physical stiffness brought on by anxiety.",
    steps: [
      "Find a comfortable, quiet sitting or lying position.",
      "Inhale, squeeze your toes and feet tightly for 5 seconds.",
      "Exhale and fully release all tension in those muscles.",
      "Move upwards to calves, thighs, hands, arms, shoulders, and face."
    ]
  },
  {
    title: "Cognitive Worry Offloading",
    category: "Sleep Support",
    description: "Quiet your mind before sleep by physically writing down your thoughts, creating a psychological 'hand-off'.",
    steps: [
      "Keep a physical pen and notebook right beside your bed.",
      "Before sleeping, write down every single task, worry, or fear.",
      "Close the book and tell yourself: 'This is safe here. I will address it tomorrow.'",
      "Focus on slow breathing as you lay down."
    ]
  }
];

export default function ResourcesSanctuary() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredResources = RESOURCE_DATABASE.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-float-delayed">
      {/* 1. Top Section */}
      <div className="text-center md:text-left space-y-2">
        <h2 className="text-3xl md:text-4xl font-serif text-terracotta font-semibold">
          Healing Sanctuary
        </h2>
        <p className="text-charcoal-light max-w-xl">
          Take a deep breath. Explore grounding skills, calming techniques, and direct crisis support numbers to help you navigate heavy moments.
        </p>
      </div>

      {/* 2. Crisis Helpline Board */}
      <div className="bg-gradient-to-br from-terracotta/10 to-saffron/10 border border-terracotta/20 rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-terracotta text-sand rounded-xl shadow-lg shadow-terracotta/20">
            <Phone className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-serif font-bold text-terracotta">
              Emergency Indian Crisis Support
            </h3>
            <p className="text-xs text-charcoal-light">
              Free, confidential support lines available 24/7 if you are in severe distress.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-sand/80 hover:bg-sand border border-terracotta/10 rounded-xl p-4 transition-all duration-300 shadow-sm flex items-start justify-between">
            <div>
              <p className="font-serif font-bold text-charcoal text-lg">Vandrevala Foundation</p>
              <p className="text-xs text-sage font-medium">Bilingual Support (24/7)</p>
            </div>
            <a 
              href="tel:18602662345" 
              className="px-3.5 py-1.5 bg-terracotta text-sand hover:bg-terracotta-dark text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              1860-2662-345
            </a>
          </div>

          <div className="bg-sand/80 hover:bg-sand border border-terracotta/10 rounded-xl p-4 transition-all duration-300 shadow-sm flex items-start justify-between">
            <div>
              <p className="font-serif font-bold text-charcoal text-lg">AASRA Helpline</p>
              <p className="text-xs text-sage font-medium">Suicide Prevention (24/7)</p>
            </div>
            <a 
              href="tel:912227546669" 
              className="px-3.5 py-1.5 bg-terracotta text-sand hover:bg-terracotta-dark text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              91-22-27546669
            </a>
          </div>

          <div className="bg-sand/80 hover:bg-sand border border-terracotta/10 rounded-xl p-4 transition-all duration-300 shadow-sm flex items-start justify-between">
            <div>
              <p className="font-serif font-bold text-charcoal text-lg">iCall Helpline (TISS)</p>
              <p className="text-xs text-sage font-medium">Professional Counseling (Mon-Sat, 8am-10pm)</p>
            </div>
            <a 
              href="tel:02225521111" 
              className="px-3.5 py-1.5 bg-terracotta text-sand hover:bg-terracotta-dark text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              022-25521111
            </a>
          </div>

          <div className="bg-sand/80 hover:bg-sand border border-terracotta/10 rounded-xl p-4 transition-all duration-300 shadow-sm flex items-start justify-between">
            <div>
              <p className="font-serif font-bold text-charcoal text-lg">NIMHANS Support</p>
              <p className="text-xs text-sage font-medium">Government Mental Health Line (24/7)</p>
            </div>
            <a 
              href="tel:08046110007" 
              className="px-3.5 py-1.5 bg-terracotta text-sand hover:bg-terracotta-dark text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              080-46110007
            </a>
          </div>
        </div>
      </div>

      {/* 3. Coping Methods Directory */}
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-2xl font-serif text-sage font-semibold flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-saffron" /> Self-Guided Support Cards
          </h3>
          
          <div className="relative max-w-sm w-full">
            <input 
              type="text" 
              placeholder="Search self-care cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-sage/20 bg-sand/80 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-sage focus:bg-sand transition-all text-charcoal"
            />
            <Search className="w-4 h-4 text-sage absolute left-3.5 top-3" />
          </div>
        </div>

        {filteredResources.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-sage/20 rounded-xl bg-sand/30">
            <Info className="w-8 h-8 text-sage/40 mx-auto mb-2" />
            <p className="text-sm text-charcoal-light">No resources match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredResources.map((res, i) => (
              <div 
                key={i} 
                className="bg-sand/60 hover:bg-sand border border-sage/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-sage/10 text-sage text-xs font-semibold rounded-full">
                      {res.category}
                    </span>
                    <Heart className="w-4 h-4 text-saffron/40 hover:text-saffron cursor-pointer transition-colors" />
                  </div>
                  
                  <h4 className="text-xl font-serif font-bold text-charcoal">
                    {res.title}
                  </h4>
                  
                  <p className="text-sm text-charcoal-light leading-relaxed">
                    {res.description}
                  </p>
                </div>

                {res.steps && (
                  <div className="mt-5 pt-4 border-t border-sage/10 space-y-2">
                    <p className="text-xs font-semibold text-charcoal/70 uppercase tracking-wider">Practice Guide:</p>
                    <ol className="list-decimal list-inside text-xs text-charcoal-light space-y-1.5">
                      {res.steps.map((step, idx) => (
                        <li key={idx} className="pl-1">
                          <span className="text-charcoal-light">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
