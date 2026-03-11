import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { Plus, Users, Search, Briefcase, ChevronDown, ChevronRight, Mail, Phone } from 'lucide-react';
import { motion } from 'motion/react';

export function EmployerDashboard() {
  const { profile, user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [workers, setWorkers] = useState<Record<string, any>>({});

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const jobsQuery = query(collection(db, 'jobs'), where('employerId', '==', user.uid));
        const jobsSnapshot = await getDocs(jobsQuery);
        const jobsData = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setJobs(jobsData);

        const appsQuery = query(collection(db, 'applications'), where('employerId', '==', user.uid));
        const appsSnapshot = await getDocs(appsQuery);
        const appsData: any[] = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setApplications(appsData);

        // Fetch worker profiles for the applications
        const workerIds = [...new Set(appsData.map(app => app.workerId))];
        const workersData: Record<string, any> = {};
        
        // Fetch in chunks of 10 (Firestore 'in' query limit)
        for (let i = 0; i < workerIds.length; i += 10) {
          const chunk = workerIds.slice(i, i + 10);
          if (chunk.length > 0) {
            const workersQuery = query(collection(db, 'users'), where('uid', 'in', chunk));
            const workersSnapshot = await getDocs(workersQuery);
            workersSnapshot.docs.forEach(doc => {
              workersData[doc.id] = doc.data();
            });
          }
        }
        setWorkers(workersData);

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'jobs/applications');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  if (loading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-slate-900 rounded-3xl p-8 text-white shadow-lg">
        <div>
          <h1 className="text-3xl font-bold mb-2">{profile?.companyName || 'Company'} Dashboard</h1>
          <p className="text-slate-400">Manage your job postings and review candidates.</p>
        </div>
        <div className="flex gap-4">
          <Link
            to="/employer/search"
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors font-medium"
          >
            <Search className="w-5 h-5" />
            Find Candidates
          </Link>
          <Link
            to="/employer/job-wizard"
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Post New Job
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{jobs.length}</div>
            <div className="text-sm text-slate-500 font-medium">Active Postings</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{applications.length}</div>
            <div className="text-sm text-slate-500 font-medium">Total Applications</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Your Job Postings</h2>
        </div>
        
        {jobs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Briefcase className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium text-slate-900 mb-2">No jobs posted yet</p>
            <p className="mb-6">Create your first job posting using our AI wizard.</p>
            <Link
              to="/employer/job-wizard"
              className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5 mr-2" /> Post a Job
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {jobs.map((job) => {
              const jobApps = applications.filter(app => app.jobId === job.id);
              const isExpanded = expandedJobId === job.id;
              return (
                <div key={job.id} className="divide-y divide-slate-100">
                  <div 
                    className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer"
                    onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                  >
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{job.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="capitalize">{job.status}</span>
                        <span>•</span>
                        <span>{job.hourlyWage} {job.currency}/hr</span>
                        <span>•</span>
                        <span className="text-indigo-600 font-medium">{jobApps.length} Applications</span>
                      </div>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-indigo-600 bg-white rounded-lg border border-slate-200 shadow-sm group-hover:border-indigo-200 transition-all">
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {isExpanded && (
                    <div className="bg-slate-50 p-6">
                      <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Applicants</h4>
                      {jobApps.length === 0 ? (
                        <p className="text-slate-500 text-sm">No applications received yet.</p>
                      ) : (
                        <div className="space-y-4">
                          {jobApps.map(app => {
                            const worker = workers[app.workerId];
                            if (!worker) return null;
                            return (
                              <div key={app.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                <div>
                                  <h5 className="font-bold text-slate-900">{worker.displayName || 'Anonymous Worker'}</h5>
                                  <div className="text-sm text-slate-500 mt-1">
                                    {worker.experienceYears} Years Experience • {worker.machineExpertise?.join(', ') || 'No machines listed'}
                                  </div>
                                  {worker.translatedCV && (
                                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap">
                                      <span className="font-semibold block mb-1 text-slate-900">Translated CV:</span>
                                      {worker.translatedCV}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {worker.email && (
                                    <a href={`mailto:${worker.email}`} className="p-2 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors">
                                      <Mail className="w-5 h-5" />
                                    </a>
                                  )}
                                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                                    View Profile
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
