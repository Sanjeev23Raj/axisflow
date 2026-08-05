import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { Activity, ShieldAlert, KeyRound, UserCheck } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('TEAM_MEMBER');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name || !email || !password || !confirmPassword || !role) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await authService.register({ name, email, password, role });
      navigate('/login?registered=true');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Registration failed. Please try again.');
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
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Create Account</h2>
          <p className="mt-1 text-sm text-slate-400">Join the SprintPulse Platform</p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 text-sm">
            {errorMsg}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Full Name
            </label>
            <input
              type="text" required
              className="appearance-none rounded-xl block w-full px-4 py-2.5 border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Email Address
            </label>
            <input
              type="email" required
              className="appearance-none rounded-xl block w-full px-4 py-2.5 border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="e.g. john@sprintpulse.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                Password
              </label>
              <input
                type="password" required
                className="appearance-none rounded-xl block w-full px-4 py-2.5 border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                Confirm
              </label>
              <input
                type="password" required
                className="appearance-none rounded-xl block w-full px-4 py-2.5 border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Organization Role
            </label>
            <select
              className="rounded-xl block w-full px-4 py-2.5 border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm cursor-pointer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="TEAM_MEMBER">Team Member (Developer)</option>
              <option value="TEAM_LEADER">Team Leader</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit" disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? 'Registering...' : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="text-center pt-2">
          <Link to="/login" className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">
            Already have an account? Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
