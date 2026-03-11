import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { extractSkillsFromCV } from '../services/geminiService';
import { motion } from 'motion/react';
import { Briefcase, User, Loader2 } from 'lucide-react';

import { WorkerChatOnboarding } from '../components/WorkerChatOnboarding';

export function Onboarding() {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<'worker' | 'employer' | null>(null);
  const [loading, setLoading] = useState(false);

  // Worker state
  const [cvText, setCvText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Employer state
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');

  React.useEffect(() => {
    if (profile?.role === 'employer' && profile.companyName) {
      navigate('/employer/dashboard');
    } else if (profile?.role === 'worker' && profile.skills && profile.skills.length > 0) {
      navigate('/worker/dashboard');
    }
  }, [profile, navigate]);

  const handleWorkerSubmit = async () => {
    setLoading(true);
    try {
      const extracted = await extractSkillsFromCV(cvText);
      await updateProfile({
        role: 'worker',
        skills: extracted.skills || [],
        machineExpertise: extracted.machines || [],
        experienceYears: Number(extracted.experienceYears) || 0,
        videoPortfolioUrl: videoUrl || '',
        status: 'available'
      });
      navigate('/worker/dashboard');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployerSubmit = async () => {
    setLoading(true);
    try {
      await updateProfile({
        role: 'employer',
        companyName,
        location,
      });
      navigate('/employer/dashboard');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!role) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <h2 className="text-3xl font-bold text-center mb-12">How do you want to use KnitMatch?</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <button
            onClick={() => setRole('worker')}
            className="flex flex-col items-center p-8 bg-white rounded-2xl border-2 border-slate-100 hover:border-indigo-600 transition-all group"
          >
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <User className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">I'm an Operator</h3>
            <p className="text-slate-500 text-center">
              I want to find high-paying jobs abroad operating flat knitting machines.
            </p>
          </button>

          <button
            onClick={() => setRole('employer')}
            className="flex flex-col items-center p-8 bg-white rounded-2xl border-2 border-slate-100 hover:border-emerald-600 transition-all group"
          >
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Briefcase className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">I'm an Employer</h3>
            <p className="text-slate-500 text-center">
              I want to hire skilled machine operators for my factory.
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200"
      >
        {role === 'worker' ? (
          <div>
            <h2 className="text-2xl font-bold mb-6">আপনার প্রোফাইল তৈরি করুন (Create Your Profile)</h2>
            <p className="text-slate-600 mb-6">
              আমাদের এআই চ্যাটবটের সাথে কথা বলে আপনার প্রোফাইল তৈরি করুন। আপনি বাংলায় লিখে বা ভয়েস দিয়ে উত্তর দিতে পারেন।
            </p>
            <WorkerChatOnboarding />
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-6">Company Details</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Location (City, Country)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleEmployerSubmit}
                disabled={loading || !companyName || !location}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 px-4 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {loading ? 'Saving...' : 'Go to Dashboard'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
