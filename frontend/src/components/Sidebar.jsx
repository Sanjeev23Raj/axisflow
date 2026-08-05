import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FolderKanban, 
  KanbanSquare, 
  History, 
  LogOut, 
  Activity,
  UserCheck
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();

  const isManager = user?.role === 'MANAGER';
  const isLeader = user?.role === 'TEAM_LEADER';
  const isMember = user?.role === 'TEAM_MEMBER';

  const menuItems = [
    {
      path: '/',
      name: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['MANAGER', 'TEAM_LEADER', 'TEAM_MEMBER']
    },
    {
      path: '/projects',
      name: 'Projects',
      icon: FolderKanban,
      roles: ['MANAGER', 'TEAM_LEADER', 'TEAM_MEMBER']
    },
    {
      path: '/board',
      name: 'Kanban Board',
      icon: KanbanSquare,
      roles: ['MANAGER', 'TEAM_LEADER', 'TEAM_MEMBER']
    },
    {
      path: '/sessions',
      name: 'Session Auditing',
      icon: History,
      roles: ['MANAGER']
    }
  ];

  const allowedItems = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="p-1.5 bg-blue-600/10 text-blue-500 rounded-lg border border-blue-500/20">
          <Activity className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold text-white tracking-tight">SprintPulse</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Profile & Logout Section */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/20">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="h-9 w-9 rounded-xl bg-blue-600/10 border border-blue-500/25 flex items-center justify-center text-blue-400 font-bold text-sm">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate flex items-center gap-1">
              <UserCheck className="h-3 w-3 inline text-blue-500" />
              {user?.role}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
