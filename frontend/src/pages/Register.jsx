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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden spidey-web-panel">
      {/* Spider-Man style floating card */}
      <div className="max-w-md w-full space-y-6 bg-white p-8 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] transform rotate-1 hover:rotate-0 transition-transform duration-200">
        <div className="flex flex-col items-center justify-center">
          <div className="p-3 bg-spidey-red text-white border-4 border-black shadow-[3px_3px_0px_#000] mb-3 animate-bounce">
            <Activity className="h-9 w-9" />
          </div>
          <h2 className="text-4xl font-black text-white tracking-wider spidey-title">Sign Up</h2>
          <p className="mt-1 text-xs font-black text-black uppercase tracking-widest bg-spidey-yellow px-2 py-0.5 border-2 border-black">Join the Spider-Force</p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-100 text-black border-3 border-black shadow-[3px_3px_0px_#000] text-sm font-bold">
            <span className="text-spidey-red uppercase font-black mr-1">Alert:</span> {errorMsg}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs font-black text-black uppercase tracking-wider block mb-1">
              Full Name
            </label>
            <input
              type="text" required
              className="appearance-none relative block w-full px-4 py-2 border-3 border-black bg-white text-black placeholder-slate-400 focus:outline-none focus:bg-spidey-yellow/10 text-sm font-bold shadow-[2px_2px_0px_#000] focus:shadow-[3px_3px_0px_#ffd166]"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-black text-black uppercase tracking-wider block mb-1">
              Email Address
            </label>
            <input
              type="email" required
              className="appearance-none relative block w-full px-4 py-2 border-3 border-black bg-white text-black placeholder-slate-400 focus:outline-none focus:bg-spidey-yellow/10 text-sm font-bold shadow-[2px_2px_0px_#000] focus:shadow-[3px_3px_0px_#ffd166]"
              placeholder="e.g. john@axisflow.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-black uppercase tracking-wider block mb-1">
                Password
              </label>
              <input
                type="password" required
                className="appearance-none relative block w-full px-4 py-2 border-3 border-black bg-white text-black placeholder-slate-400 focus:outline-none focus:bg-spidey-yellow/10 text-sm font-bold shadow-[2px_2px_0px_#000] focus:shadow-[3px_3px_0px_#ffd166]"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-black text-black uppercase tracking-wider block mb-1">
                Confirm
              </label>
              <input
                type="password" required
                className="appearance-none relative block w-full px-4 py-2 border-3 border-black bg-white text-black placeholder-slate-400 focus:outline-none focus:bg-spidey-yellow/10 text-sm font-bold shadow-[2px_2px_0px_#000] focus:shadow-[3px_3px_0px_#ffd166]"
                placeholder="••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-black uppercase tracking-wider block mb-1">
              Organization Role
            </label>
            <select
              className="relative block w-full px-4 py-2 border-3 border-black bg-white text-black focus:outline-none focus:bg-spidey-yellow/10 text-sm font-bold shadow-[2px_2px_0px_#000] focus:shadow-[3px_3px_0px_#ffd166] cursor-pointer"
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
              className="w-full flex justify-center py-2.5 px-4 border-3 border-black text-sm font-black uppercase tracking-widest text-white bg-spidey-red hover:bg-red-600 shadow-[4px_4px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              {loading ? 'SWINGING...' : 'CREATE ACCOUNT'}
            </button>
          </div>
        </form>

        <div className="text-center pt-2">
          <Link to="/login" className="text-xs font-black text-spidey-blue hover:text-blue-700 uppercase tracking-wide underline">
            Already have an account? Sign in here!
          </Link>
        </div>
      </div>
    </div>
  );
}
