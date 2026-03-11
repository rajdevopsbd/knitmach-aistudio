import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Mic, Send, Loader2, StopCircle, Paperclip } from 'lucide-react';
import { chatWithWorker, extractSkillsFromChat } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export function WorkerChatOnboarding() {
  const { updateProfile } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'নমস্কার! KnitMatch-এ আপনাকে স্বাগত। আমি আপনাকে আপনার প্রোফাইল তৈরি করতে সাহায্য করব। প্রথমে বলুন, নিটিং মেশিনে কাজ করার আপনার কত বছরের অভিজ্ঞতা আছে? আপনি চাইলে আপনার সিভি (CV) আপলোড করতে পারেন।' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [translatedCV, setTranslatedCV] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Speech Recognition Setup
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  if (recognition) {
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'bn-BD'; // Bengali (Bangladesh)

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + ' ' + transcript);
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };
  }

  const toggleRecording = () => {
    if (isRecording) {
      recognition?.stop();
    } else {
      recognition?.start();
      setIsRecording(true);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textOverride?: string) => {
    const userMessage = textOverride || input.trim();
    if (!userMessage) return;

    if (!textOverride) setInput('');
    
    const newMessages: Message[] = [...messages, { role: 'user', text: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Format history for Gemini
      const history = newMessages.slice(0, -1).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await chatWithWorker(history, userMessage);

      if (response.includes('PROFILE_COMPLETE')) {
        setMessages(prev => [...prev, { role: 'model', text: 'ধন্যবাদ! আপনার প্রোফাইল তৈরি করা হচ্ছে...' }]);
        
        // Extract data
        const chatHistoryText = newMessages.map(m => `${m.role}: ${m.text}`).join('\n');
        const extracted = await extractSkillsFromChat(chatHistoryText);
        
        await updateProfile({
          role: 'worker',
          skills: extracted.skills || [],
          machineExpertise: extracted.machines || [],
          experienceYears: Number(extracted.experienceYears) || 0,
          currentFactory: extracted.currentFactory || '',
          translatedCV: translatedCV || '',
          status: 'available'
        });
        
        navigate('/worker/dashboard');
      } else {
        setMessages(prev => [...prev, { role: 'model', text: response }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: 'দুঃখিত, একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', text: `[CV Uploaded: ${file.name}]` }]);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        // We will send this to Gemini to extract text
        // For simplicity, we'll just tell the chat that a CV was uploaded and ask it to parse it.
        // In a real app, we'd pass the image/pdf directly to Gemini's multimodal API.
        // Let's use a specialized function to extract text from the CV first.
        const { extractTextFromCVFile } = await import('../services/geminiService');
        const extractedText = await extractTextFromCVFile(base64Data, file.type);
        
        if (extractedText) {
           setTranslatedCV(extractedText);
           handleSend(`আমি আমার সিভি আপলোড করেছি। (I have uploaded my CV. Here is the translated text: \n\n${extractedText}\n\nPlease read this and ask me in Bengali if anything is missing.)`);
        } else {
           setMessages(prev => [...prev, { role: 'model', text: 'দুঃখিত, আমি আপনার সিভি পড়তে পারিনি। আপনি কি দয়া করে আপনার অভিজ্ঞতা লিখে বা বলে জানাতে পারবেন?' }]);
        }
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File upload error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-indigo-600 p-4 text-white">
        <h3 className="font-semibold text-lg">KnitMatch Assistant</h3>
        <p className="text-indigo-100 text-sm">আমি আপনাকে বাংলায় সাহায্য করব</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>লিখছে...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <Paperclip className="w-4 h-4" />
              <span>সিভি আপলোড করুন (Upload CV)</span>
            </button>
            <span className="text-xs text-slate-500">
              (ছবি বা পিডিএফ / Image or PDF)
            </span>
          </div>
          
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="এখানে লিখুন..."
                className="w-full p-3 pr-12 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-none h-12 max-h-32"
                rows={1}
              />
              {recognition && (
                <button
                  onClick={toggleRecording}
                  className={`absolute right-2 bottom-2 p-1.5 rounded-lg transition-colors ${
                    isRecording ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                  }`}
                  title="ভয়েস টাইপিং (Voice Typing)"
                >
                  {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
