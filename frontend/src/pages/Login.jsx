import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const expired = queryParams.get('expired');
  const registered = queryParams.get('registered');

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail) => {
    setLoading(true);
    setErrorMessage('');
    try {
      await login(demoEmail, 'password123');
      navigate('/');
    } catch (err) {
      setErrorMessage(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full space-y-6 bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
        <div className="flex flex-col items-center justify-center">
          <div className="p-3 bg-blue-600/10 text-blue-500 rounded-2xl border border-blue-500/20 mb-3 animate-pulse">
            <Activity className="h-9 w-9" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">SprintPulse</h2>
          <p className="mt-1 text-sm text-slate-400">Smart Agile Project Management Platform</p>
        </div>

        {expired && (
          <div className="flex items-center gap-3 p-4 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 text-sm">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>Your session expired due to inactivity. Please log in again.</span>
          </div>
        )}

        {registered && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 text-green-400 rounded-xl border border-green-500/20 text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>Registration successful! Please sign in with your credentials.</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 text-sm">
            {errorMessage}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email-address" className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Email Address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              required
              className="appearance-none rounded-xl relative block w-full px-4 py-2.5 border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
              placeholder="manager@sprintpulse.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="appearance-none rounded-xl relative block w-full px-4 py-2.5 border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <Link to="/register" className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">
            Need an account? Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
