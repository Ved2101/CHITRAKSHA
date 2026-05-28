import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chitraksha - Your AI Mental Wellness Sanctuary",
  description: "Chitraksha is a bilingual, RAG-powered empathetic AI companion and mood tracker designed to support your mental wellness journey with warmth, custom-tailored guidance, and absolute confidentiality.",
  keywords: ["Mental Health", "AI Therapist", "Bilingual Chatbot", "Hinglish Therapist", "Mood Tracker", "CBT Exercises", "Indian Crisis Helplines", "Chitraksha"],
  authors: [{ name: "Chitraksha Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-sand text-charcoal">
        {children}
      </body>
    </html>
  );
}
