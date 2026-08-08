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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden spidey-web-panel">
      {/* Spider-Man style floating card */}
      <div className="max-w-md w-full space-y-6 bg-white p-8 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] transform -rotate-1 hover:rotate-0 transition-transform duration-200">
        <div className="flex flex-col items-center justify-center">
          <div className="p-3 bg-spidey-red text-white border-4 border-black shadow-[3px_3px_0px_#000] mb-3 animate-bounce">
            <Activity className="h-9 w-9" />
          </div>
          <h2 className="text-4xl font-black text-white tracking-wider spidey-title">AxisFlow</h2>
          <p className="mt-1 text-xs font-black text-black uppercase tracking-widest bg-spidey-yellow px-2 py-0.5 border-2 border-black">Smart Agile Metrics</p>
        </div>

        {expired && (
          <div className="flex items-center gap-3 p-4 bg-spidey-yellow text-black border-3 border-black shadow-[3px_3px_0px_#000] text-sm font-bold">
            <ShieldAlert className="h-5 w-5 shrink-0 text-spidey-red" />
            <span>Session expired! Suit up and log in again!</span>
          </div>
        )}

        {registered && (
          <div className="flex items-center gap-3 p-4 bg-green-200 text-black border-3 border-black shadow-[3px_3px_0px_#000] text-sm font-bold">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            <span>Success! Account created. Time to swing in!</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-red-100 text-black border-3 border-black shadow-[3px_3px_0px_#000] text-sm font-bold">
            <span className="text-spidey-red uppercase font-black mr-1">Alert:</span> {errorMessage}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email-address" className="text-xs font-black text-black uppercase tracking-wider block mb-1">
              Email Address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              required
              className="appearance-none relative block w-full px-4 py-2.5 border-3 border-black bg-white text-black placeholder-slate-400 focus:outline-none focus:bg-spidey-yellow/10 text-sm font-bold shadow-[3px_3px_0px_#000] focus:shadow-[4px_4px_0px_#ffd166]"
              placeholder="manager@axisflow.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs font-black text-black uppercase tracking-wider block mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="appearance-none relative block w-full px-4 py-2.5 border-3 border-black bg-white text-black placeholder-slate-400 focus:outline-none focus:bg-spidey-yellow/10 text-sm font-bold shadow-[3px_3px_0px_#000] focus:shadow-[4px_4px_0px_#ffd166]"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border-3 border-black text-sm font-black uppercase tracking-widest text-white bg-spidey-red hover:bg-red-600 shadow-[4px_4px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              {loading ? 'SWINGING IN...' : 'LOG IN'}
            </button>
          </div>
        </form>

        <div className="text-center pt-2">
          <Link to="/register" className="text-xs font-black text-spidey-blue hover:text-blue-700 uppercase tracking-wide underline">
            Need an account? Sign up here!
          </Link>
        </div>
      </div>
    </div>
  );
}
