import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, getDocs, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { Briefcase, CheckCircle2, Factory, MapPin, DollarSign, Clock, Languages, Loader2, Edit2, X, UploadCloud, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translateJobToBengali, extractTextFromCVFile, extractSkillsFromCV } from '../../services/geminiService';

export function WorkerDashboard() {
  const { profile, user, updateProfile } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [translatingJobs, setTranslatingJobs] = useState<Record<string, boolean>>({});
  const [translations, setTranslations] = useState<Record<string, { title: string, description: string, requirements: string[] }>>({});
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('open');
  
  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editExperience, setEditExperience] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>('available');
  const [savingProfile, setSavingProfile] = useState(false);

  // CV Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingCV, setIsUploadingCV] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  useEffect(() => {
    if (profile) {
      setEditExperience(profile.experienceYears || 0);
      setEditStatus(profile.status || 'available');
    }
  }, [profile]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch jobs based on filter
        let jobsQuery;
        if (jobStatusFilter === 'all') {
          jobsQuery = query(collection(db, 'jobs'));
        } else {
          jobsQuery = query(collection(db, 'jobs'), where('status', '==', jobStatusFilter));
        }
        
        const jobsSnapshot = await getDocs(jobsQuery);
        const jobsData = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setJobs(jobsData);

        // Auto-translate jobs that haven't been translated yet
        jobsData.forEach(async (job) => {
          // Skip if already translated or currently translating
          if (translations[job.id] || translatingJobs[job.id]) return;
          
          setTranslatingJobs(prev => ({ ...prev, [job.id]: true }));
          try {
            const translation = await translateJobToBengali(job);
            setTranslations(prev => ({ ...prev, [job.id]: translation }));
          } catch (error) {
            console.error("Translation failed for job", job.id, error);
          } finally {
            setTranslatingJobs(prev => ({ ...prev, [job.id]: false }));
          }
        });

        // Fetch user's applications
        if (user) {
          const appsQuery = query(collection(db, 'applications'), where('workerId', '==', user.uid));
          const appsSnapshot = await getDocs(appsQuery);
          const appsData = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setApplications(appsData);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'jobs/applications');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, jobStatusFilter]);

  const handleApply = async (job: any) => {
    if (!user) return;
    try {
      const newDocRef = doc(collection(db, 'applications'));
      await setDoc(newDocRef, {
        id: newDocRef.id,
        jobId: job.id,
        workerId: user.uid,
        employerId: job.employerId,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      // Optimistic update
      setApplications(prev => [...prev, { jobId: job.id, status: 'pending' }]);
      alert('Application submitted successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'applications');
    }
  };

  const handleTranslate = async (job: any) => {
    if (translations[job.id] || translatingJobs[job.id]) return; 
    
    setTranslatingJobs(prev => ({ ...prev, [job.id]: true }));
    try {
      const translation = await translateJobToBengali(job);
      setTranslations(prev => ({ ...prev, [job.id]: translation }));
    } catch (error) {
      console.error("Translation failed:", error);
    } finally {
      setTranslatingJobs(prev => ({ ...prev, [job.id]: false }));
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({ 
        experienceYears: editExperience,
        status: editStatus
      });
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCV(true);
    setUploadStatus('Reading file... (ফাইল পড়া হচ্ছে...)');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        // Extract base64 data without the data URL prefix
        const base64Data = base64String.split(',')[1];
        
        setUploadStatus('Translating CV to English... (ইংরেজিতে অনুবাদ করা হচ্ছে...)');
        const translatedText = await extractTextFromCVFile(base64Data, file.type);
        
        if (!translatedText) {
          throw new Error("Failed to extract text from CV.");
        }

        setUploadStatus('Analyzing skills... (দক্ষতা বিশ্লেষণ করা হচ্ছে...)');
        const extractedData = await extractSkillsFromCV(translatedText);

        setUploadStatus('Saving profile... (প্রোফাইল সেভ করা হচ্ছে...)');
        
        // Merge new skills/machines with existing ones, avoiding duplicates
        const currentSkills = profile?.skills || [];
        const currentMachines = profile?.machineExpertise || [];
        
        const newSkills = Array.from(new Set([...currentSkills, ...extractedData.skills]));
        const newMachines = Array.from(new Set([...currentMachines, ...extractedData.machines]));
        
        // Use the higher experience value
        const newExperience = Math.max(profile?.experienceYears || 0, extractedData.experienceYears || 0);

        await updateProfile({
          skills: newSkills,
          machineExpertise: newMachines,
          experienceYears: newExperience,
          translatedCV: translatedText // Save the translated text for employers to see
        });

        setUploadStatus('Success! (সফল হয়েছে!)');
        setTimeout(() => {
          setIsUploadingCV(false);
          setUploadStatus('');
        }, 2000);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("CV Upload failed:", error);
      setUploadStatus('Upload failed. Please try again.');
      setTimeout(() => {
        setIsUploadingCV(false);
        setUploadStatus('');
      }, 3000);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-lg relative">
        <button 
          onClick={() => setIsEditingProfile(true)}
          className="absolute top-8 right-8 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          title="Edit Profile"
        >
          <Edit2 className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold mb-2">Welcome back, {profile?.displayName || 'Operator'}</h1>
        <p className="text-indigo-100 mb-6">Your AI-verified profile is active. You have {profile?.experienceYears || 0} years of experience.</p>
        
        <div className="flex flex-wrap gap-4">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex-1 min-w-[200px]">
            <div className="text-indigo-200 text-sm font-medium mb-1">Years of Experience</div>
            <div className="font-semibold">{profile?.experienceYears || 0} Years</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex-1 min-w-[200px]">
            <div className="text-indigo-200 text-sm font-medium mb-1">Machine Expertise</div>
            <div className="font-semibold">{profile?.machineExpertise?.join(', ') || 'None listed'}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex-1 min-w-[200px]">
            <div className="text-indigo-200 text-sm font-medium mb-1">Skills</div>
            <div className="font-semibold">{profile?.skills?.join(', ') || 'None listed'}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex-1 min-w-[200px]">
            <div className="text-indigo-200 text-sm font-medium mb-1">Status</div>
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="capitalize">{profile?.status || 'Available'}</span>
            </div>
          </div>
        </div>

        {/* CV Upload Section */}
        <div className="mt-6 pt-6 border-t border-white/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Upload CV (সিভি আপলোড করুন)
              </h3>
              <p className="text-indigo-200 text-sm mt-1">
                Upload your CV in Bengali or English (PDF or Image). We will automatically translate it for employers and update your skills.
              </p>
            </div>
            
            <div className="relative">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,image/png,image/jpeg,image/jpg"
                className="hidden" 
                id="cv-upload"
                disabled={isUploadingCV}
              />
              <label 
                htmlFor="cv-upload"
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer ${
                  isUploadingCV 
                    ? 'bg-indigo-500/50 text-indigo-100 cursor-not-allowed' 
                    : 'bg-white text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                {isUploadingCV ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {uploadStatus || 'Uploading...'}
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-5 h-5" />
                    Select File
                  </>
                )}
              </label>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditingProfile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">Edit Profile</h2>
                <button 
                  onClick={() => setIsEditingProfile(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Years of Experience (অভিজ্ঞতার বছর)
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    value={editExperience}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setEditExperience(Math.min(100, Math.max(0, val)));
                    }}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Enter your total years of experience in the textile industry.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Current Status (বর্তমান অবস্থা)
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none bg-white"
                  >
                    <option value="available">Available (কাজের জন্য প্রস্তুত)</option>
                    <option value="hired">Hired (কাজে নিযুক্ত)</option>
                    <option value="inactive">Inactive (নিষ্ক্রিয়)</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-2">
                    Let employers know if you are currently looking for work.
                  </p>
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-indigo-600" />
              Recommended Jobs
            </h2>
            <select
              value={jobStatusFilter}
              onChange={(e) => setJobStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none font-medium shadow-sm"
            >
              <option value="open">Open Jobs</option>
              <option value="closed">Closed Jobs</option>
              <option value="draft">Draft Jobs</option>
              <option value="all">All Jobs</option>
            </select>
          </div>
          
          {jobs.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500">
              No open jobs available at the moment.
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => {
                const hasApplied = applications.some(app => app.jobId === job.id);
                const translation = translations[job.id];
                const isTranslating = translatingJobs[job.id];

                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><Factory className="w-4 h-4" /> Company ID: {job.employerId.substring(0,6)}</span>
                        <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" /> {job.hourlyWage} {job.currency}/hr</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasApplied ? (
                          <span className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Applied
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApply(job)}
                            className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                          >
                            Apply Now
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* English Column */}
                      <div className="space-y-4">
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-semibold uppercase tracking-wider mb-1">
                          English
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">
                          {job.title}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {job.machineRequirements?.map((req: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                              {req}
                            </span>
                          ))}
                        </div>
                        <p className="text-slate-600 text-sm whitespace-pre-line">
                          {job.description}
                        </p>
                      </div>

                      {/* Bengali Column */}
                      <div className="space-y-4 p-5 bg-indigo-50/50 rounded-xl border border-indigo-100">
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold uppercase tracking-wider mb-1">
                          বাংলা (Bengali)
                        </div>
                        
                        {isTranslating ? (
                          <div className="flex flex-col items-center justify-center h-32 text-indigo-400 space-y-3">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="text-sm font-medium">Translating to Bengali...</span>
                          </div>
                        ) : translation ? (
                          <>
                            <h3 className="text-xl font-bold text-indigo-950">
                              {translation.title}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {translation.requirements?.map((req: string, i: number) => (
                                <span key={i} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                                  {req}
                                </span>
                              ))}
                            </div>
                            <p className="text-indigo-900/80 text-sm whitespace-pre-line">
                              {translation.description}
                            </p>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-32 text-slate-400 space-y-3">
                            <Languages className="w-6 h-6" />
                            <button 
                              onClick={() => handleTranslate(job)}
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                            >
                              Retry Translation
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Your Applications</h2>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {applications.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                You haven't applied to any jobs yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {applications.map((app, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900">Job ID: {app.jobId.substring(0,6)}</div>
                      <div className="text-xs text-slate-500 mt-1">Applied recently</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize
                      ${app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        app.status === 'hired' ? 'bg-emerald-100 text-emerald-800' : 
                        'bg-slate-100 text-slate-800'}`}
                    >
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
