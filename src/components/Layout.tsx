import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Briefcase, LayoutDashboard } from 'lucide-react';

export function Layout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">K</span>
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900">KnitMatch</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Link
                    to={profile?.role === 'employer' ? '/employer/dashboard' : '/worker/dashboard'}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Link>
                  <div className="h-4 w-px bg-slate-200"></div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-slate-500">
            &copy; {new Date().getFullYear()} KnitMatch AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
