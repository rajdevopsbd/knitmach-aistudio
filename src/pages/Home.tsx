import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Globe, Cpu, Users } from 'lucide-react';

export function Home() {
  const { user, profile } = useAuth();

  return (
    <div className="flex flex-col gap-24">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 lg:pt-36 lg:pb-40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-slate-50 -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-8">
              Bridging the <span className="text-indigo-600">Reshoring Gap</span>
            </h1>
            <p className="mt-4 text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-12">
              The AI-driven platform connecting highly skilled Bangladeshi flat knitting machine operators with global employers in the US and Europe.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {user ? (
                <Link
                  to={profile?.role === 'employer' ? '/employer/dashboard' : '/worker/dashboard'}
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Go to Dashboard <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login?role=employer"
                    className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
                  >
                    Hire Talent
                  </Link>
                  <Link
                    to="/login?role=worker"
                    className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-xl text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all"
                  >
                    Find Jobs Abroad
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center text-center p-6 rounded-2xl bg-white shadow-sm border border-slate-100"
          >
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
              <Cpu className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-3">AI-Powered Matching</h3>
            <p className="text-slate-600">
              Our semantic search engine understands complex machinery terminology (e.g., Stoll ADF 530, Shima Seiki WHOLEGARMENT) to find the perfect fit.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center text-center p-6 rounded-2xl bg-white shadow-sm border border-slate-100"
          >
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Verified Skills</h3>
            <p className="text-slate-600">
              Video portfolios and AI-assisted skill extraction ensure you hire operators with proven, hands-on experience, bypassing language barriers.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center text-center p-6 rounded-2xl bg-white shadow-sm border border-slate-100"
          >
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <Globe className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Ethical Recruitment</h3>
            <p className="text-slate-600">
              Strict adherence to the "Employer Pays Principle." Zero recruitment fees for workers, ensuring compliance with US/EU labor standards.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
