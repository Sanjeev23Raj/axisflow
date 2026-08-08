import React, { useState, useEffect, useRef } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
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
        return 'bg-spidey-red text-white border-2 border-black shadow-[2px_2px_0px_#000]';
      case 'TEAM_LEADER':
        return 'bg-spidey-yellow text-black border-2 border-black shadow-[2px_2px_0px_#000]';
      default:
        return 'bg-spidey-blue text-white border-2 border-black shadow-[2px_2px_0px_#000]';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const activeProj = activeProjects.find(p => p.id === activeProjectId);

  const getNotifIcon = (type) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />;
      case 'ALERT': return <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />;
      case 'WARNING': return <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />;
      default: return <Info className="h-4 w-4 text-blue-600 shrink-0" />;
    }
  };

  return (
    <header className="h-16 bg-white border-b-4 border-black flex items-center justify-between px-8 shrink-0 relative z-30 shadow-[0_4px_0px_0px_rgba(0,0,0,1)]">
      {/* Project Selector Auto-selection Rule */}
      <div className="flex items-center gap-3">
        <Layers className="h-5 w-5 text-black" />
        <span className="text-sm font-black text-black uppercase tracking-wider">Current Project:</span>
        {activeProjects.length > 1 ? (
          // Rule: If multiple ACTIVE projects exist -> Display dropdown
          <select
            value={activeProjectId}
            onChange={(e) => changeActiveProject(e.target.value)}
            className="bg-white border-2 border-black text-black text-sm font-bold rounded-none px-3 py-1 shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:bg-spidey-yellow cursor-pointer"
          >
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        ) : activeProjects.length === 1 ? (
          // Rule: If only one ACTIVE project exists -> Auto-select it (display title)
          <span className="text-sm font-black text-spidey-red uppercase bg-spidey-yellow px-2.5 py-0.5 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">{activeProjects[0].title}</span>
        ) : (
          // Rule: If no ACTIVE project exists -> Show Empty State (handled inside dashboards)
          <span className="text-sm font-bold text-slate-400">No Active Projects</span>
        )}

        {user?.role === 'MANAGER' && (
          <Link 
            to="/sessions"
            className="ml-4 px-3 py-1 border-2 border-black bg-spidey-yellow hover:bg-yellow-400 text-black text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-colors"
          >
            Session Auditing
          </Link>
        )}
      </div>

      {/* Right panel: Notification Bell + User details */}
      <div className="flex items-center gap-6">
        {/* Notification Bell */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 border-2 border-black bg-white hover:bg-spidey-yellow text-black transition-colors relative cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 h-5 w-5 bg-spidey-red border-2 border-black text-[10px] text-white rounded-full flex items-center justify-center font-black shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] overflow-hidden z-50 rounded-none">
                <div className="p-4 border-b-2 border-black flex justify-between items-center bg-spidey-yellow">
                  <h4 className="text-xs font-black text-black uppercase tracking-wider">Comic Updates</h4>
                  <span className="text-[10px] font-black text-white bg-spidey-red px-2 py-0.5 border border-black">
                    {unreadCount} UNREAD
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y-2 divide-black">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleMarkAsRead(notif.id)}
                        className={`p-4 flex gap-3 text-left transition-colors cursor-pointer hover:bg-spidey-yellow/10 ${
                          !notif.isRead ? 'bg-spidey-blue/5' : ''
                        }`}
                      >
                        {getNotifIcon(notif.type)}
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs text-black ${!notif.isRead ? 'font-black uppercase' : 'font-bold'}`}>
                            {notif.title}
                          </p>
                          <p className="text-[10px] text-slate-700 mt-0.5 leading-relaxed font-bold">{notif.message}</p>
                          <span className="text-[9px] text-slate-500 block mt-1.5 font-bold">
                            {new Date(notif.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-500 font-bold uppercase">
                      All quiet in the city!
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
            <span className={`text-xs font-black px-3 py-1 uppercase tracking-wider rounded-none ${getRoleBadgeColor(user.role)}`}>
              {user.role}
            </span>
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-black text-black">{user.name}</span>
              <span className="text-xs text-slate-600 font-bold">{user.email}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
