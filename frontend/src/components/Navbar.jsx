import React, { useState, useEffect, useRef } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Layers, Bell, CheckCircle2, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

export default function Navbar() {
  const { activeProjects, activeProjectId, changeActiveProject } = useProjects();
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  // Poll notifications every 15 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Handle outside clicks to close notifications panel
  useEffect(() => {
    function handleOutsideClick(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      // Update state locally
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'MANAGER':
        return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'TEAM_LEADER':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      default:
        return 'bg-green-500/10 text-green-500 border border-green-500/20';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const activeProj = activeProjects.find(p => p.id === activeProjectId);

  const getNotifIcon = (type) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
      case 'ALERT': return <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />;
      case 'WARNING': return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
      default: return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 relative z-30">
      {/* Project Selector Auto-selection Rule */}
      <div className="flex items-center gap-3">
        <Layers className="h-5 w-5 text-slate-400" />
        <span className="text-sm font-semibold text-slate-500 mr-1">Active Project:</span>
        {activeProjects.length > 1 ? (
          // Rule: If multiple ACTIVE projects exist -> Display dropdown
          <select
            value={activeProjectId}
            onChange={(e) => changeActiveProject(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        ) : activeProjects.length === 1 ? (
          // Rule: If only one ACTIVE project exists -> Auto-select it (display title)
          <span className="text-sm font-bold text-slate-800">{activeProjects[0].title}</span>
        ) : (
          // Rule: If no ACTIVE project exists -> Show Empty State (handled inside dashboards)
          <span className="text-sm font-medium text-slate-400">No Active Projects</span>
        )}
      </div>

      {/* Right panel: Notification Bell + User details */}
      <div className="flex items-center gap-6">
        {/* Notification Bell */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-700 transition-colors relative cursor-pointer"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-rose-500 text-[10px] text-white rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Notifications</h4>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {unreadCount} unread
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleMarkAsRead(notif.id)}
                        className={`p-4 flex gap-3 text-left transition-colors cursor-pointer hover:bg-slate-50 ${
                          !notif.isRead ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        {getNotifIcon(notif.type)}
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs text-slate-800 ${!notif.isRead ? 'font-bold' : 'font-medium'}`}>
                            {notif.title}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                          <span className="text-[9px] text-slate-400 block mt-1.5">
                            {new Date(notif.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400 font-semibold">
                      No notifications yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Details */}
        {user && (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${getRoleBadgeColor(user.role)}`}>
              {user.role}
            </span>
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-bold text-slate-800">{user.name}</span>
              <span className="text-xs text-slate-400">{user.email}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
