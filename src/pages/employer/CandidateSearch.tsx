import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { scoreCandidate } from '../../services/geminiService';
import { motion } from 'motion/react';
import { Search, Loader2, Star, MapPin, Briefcase, Video } from 'lucide-react';

export function CandidateSearch() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [minExperience, setMinExperience] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [scoredCandidates, setScoredCandidates] = useState<any[]>([]);

  useEffect(() => {
    async function fetchWorkers() {
      try {
        const workersQuery = query(collection(db, 'users'), where('role', '==', 'worker'), where('status', '==', 'available'));
        const snapshot = await getDocs(workersQuery);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCandidates(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'users');
      }
    }
    fetchWorkers();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery && minExperience === 0) return;
    setLoading(true);
    try {
      // Filter by minimum experience first
      const filteredCandidates = candidates.filter(c => (c.experienceYears || 0) >= minExperience);

      if (!searchQuery) {
        // If no semantic search query, just return the filtered list
        setScoredCandidates(filteredCandidates.map(c => ({ ...c, matchScore: 100, matchReasoning: 'Matched based on experience filter.' })));
        setLoading(false);
        return;
      }

      // In a real app with Qdrant, this would be a vector search.
      // Here, we simulate it by scoring each candidate using Gemini.
      const scored = await Promise.all(
        filteredCandidates.map(async (candidate) => {
          const { score, reasoning } = await scoreCandidate(searchQuery, candidate);
          return { ...candidate, matchScore: score, matchReasoning: reasoning };
        })
      );
      
      // Sort by score descending
      scored.sort((a, b) => b.matchScore - a.matchScore);
      setScoredCandidates(scored);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Semantic Candidate Search</h1>
        <p className="text-slate-500 text-lg">
          Describe the exact skills, machinery, and experience you need. Our AI will find the best matches from our verified talent pool.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-200 flex flex-col md:flex-row gap-4 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g., Need a technician who can fix needle breaks..."
            className="w-full pl-12 pr-4 py-4 text-lg bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-600"
          />
        </div>
        <div className="w-full md:w-48 relative">
          <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="number"
            min="0"
            value={minExperience || ''}
            onChange={(e) => setMinExperience(parseInt(e.target.value) || 0)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Min Years Exp."
            className="w-full pl-12 pr-4 py-4 text-lg bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-600"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || (!searchQuery && minExperience === 0)}
          className="px-8 py-4 bg-indigo-600 text-white font-medium text-lg rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Search'}
        </button>
      </div>

      <div className="space-y-6">
        {scoredCandidates.map((candidate, index) => (
          <motion.div
            key={candidate.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8"
          >
            <div className="flex-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{candidate.displayName || 'Anonymous Operator'}</h3>
                  <div className="flex items-center gap-4 text-slate-500 mt-2">
                    <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {candidate.experienceYears} Years Exp.</span>
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Bangladesh</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 text-emerald-600 font-bold text-2xl">
                    <Star className="w-6 h-6 fill-current" />
                    {candidate.matchScore}% Match
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 text-indigo-900 p-4 rounded-xl text-sm mb-6 border border-indigo-100">
                <span className="font-semibold">AI Reasoning:</span> {candidate.matchReasoning}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2 uppercase tracking-wider">Machine Expertise</h4>
                  <div className="flex flex-wrap gap-2">
                    {candidate.machineExpertise?.map((m: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">{m}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2 uppercase tracking-wider">Technical Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills?.map((s: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="md:w-64 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-8">
              {candidate.videoPortfolioUrl ? (
                <a
                  href={candidate.videoPortfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
                >
                  <Video className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mb-2" />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 text-center">Watch Video Portfolio</span>
                </a>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                  <Video className="w-8 h-8 text-slate-300 mb-2" />
                  <span className="text-sm font-medium text-slate-500 text-center">No video provided</span>
                </div>
              )}
              
              <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors">
                Contact Candidate
              </button>
            </div>
          </motion.div>
        ))}
        
        {scoredCandidates.length === 0 && !loading && searchQuery && (
          <div className="text-center py-12 text-slate-500">
            No candidates found matching your criteria. Try adjusting your search.
          </div>
        )}
      </div>
    </div>
  );
}
