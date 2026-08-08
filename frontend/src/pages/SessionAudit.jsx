import React, { useState, useEffect } from 'react';
import { authService } from '../services/api';
import { History, Shield, RefreshCw } from 'lucide-react';

export default function SessionAudit() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSessions = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await authService.getSessions();
      setSessions(list);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch session audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 comic-bg">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-500" />
            <span>Session Auditing & Access Logs</span>
          </h1>
          <p className="text-slate-500 text-sm">Security logs capturing login times, roles, and session states</p>
        </div>
        <button
          onClick={fetchSessions}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-700 text-sm font-semibold transition-colors cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs">User / Email</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs">Role</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs">Session ID</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs">Login At</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs">Expires At</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sessions.map((sess) => (
                <tr key={sess.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-slate-800">{sess.user?.name}</p>
                      <p className="text-xs text-slate-400">{sess.user?.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                      sess.role === 'MANAGER' 
                        ? 'bg-red-50 text-red-600 border-red-100' 
                        : sess.role === 'TEAM_LEADER' 
                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                        : 'bg-green-50 text-green-600 border-green-100'
                    }`}>
                      {sess.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">
                    {sess.sessionId}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">
                    {new Date(sess.loginAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">
                    {new Date(sess.expiresAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      sess.isActive && new Date() < new Date(sess.expiresAt)
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {sess.isActive && new Date() < new Date(sess.expiresAt) ? 'Active' : 'Expired/Closed'}
                    </span>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-400 font-medium">
                    No session logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
