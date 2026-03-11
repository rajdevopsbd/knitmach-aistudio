import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { generateJobDescription } from '../../services/geminiService';
import { motion } from 'motion/react';
import { Loader2, Sparkles, ArrowRight } from 'lucide-react';
import Markdown from 'react-markdown';

export function JobWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [requirements, setRequirements] = useState('');
  const [hourlyWage, setHourlyWage] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [visaType, setVisaType] = useState('H-2B');
  const [housingProvided, setHousingProvided] = useState(true);
  
  // AI Generated
  const [generatedDescription, setGeneratedDescription] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const desc = await generateJobDescription(title, requirements);
      setGeneratedDescription(desc);
      setStep(2);
    } catch (e) {
      console.error(e);
      alert('Failed to generate description.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const newDocRef = doc(collection(db, 'jobs'));
      const newJob = {
        id: newDocRef.id,
        employerId: user.uid,
        title,
        description: generatedDescription,
        hourlyWage: Number(hourlyWage),
        currency,
        visaType,
        housingProvided,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(newDocRef, newJob);
      
      navigate('/employer/dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'jobs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-indigo-600" />
          AI Job Creation Wizard
        </h1>
        <p className="text-slate-500 mt-2">Let our AI write a professional, O*NET-compliant job description.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
      >
        {step === 1 ? (
          <div className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Job Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Senior Stoll Machine Operator"
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Key Requirements (Machine types, gauges, skills)</label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="e.g., Must know Stoll ADF 530, 12-gauge, intarsia programming, fix needle breaks."
                className="w-full h-32 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Hourly Wage</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={hourlyWage}
                    onChange={(e) => setHourlyWage(e.target.value)}
                    placeholder="25"
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="p-3 border border-slate-300 rounded-xl bg-slate-50"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Visa Sponsorship</label>
                <select
                  value={visaType}
                  onChange={(e) => setVisaType(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                >
                  <option value="H-2B">US H-2B</option>
                  <option value="EB-3">US EB-3</option>
                  <option value="EU Blue Card">EU Blue Card</option>
                  <option value="None">None</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="housing"
                checked={housingProvided}
                onChange={(e) => setHousingProvided(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
              />
              <label htmlFor="housing" className="text-sm font-medium text-slate-700">
                Housing provided for international workers
              </label>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !title || !requirements || !hourlyWage}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 px-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium text-lg mt-8"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
              {loading ? 'Generating Description...' : 'Generate Job Description'}
            </button>
          </div>
        ) : (
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Review & Publish</h2>
              <button
                onClick={() => setStep(1)}
                className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
              >
                Edit Requirements
              </button>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 max-h-[500px] overflow-y-auto">
              <div className="markdown-body prose prose-slate max-w-none">
                <Markdown>{generatedDescription}</Markdown>
              </div>
            </div>

            <button
              onClick={handlePublish}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 px-4 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium text-lg"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowRight className="w-6 h-6" />}
              {loading ? 'Publishing...' : 'Publish Job Posting'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
