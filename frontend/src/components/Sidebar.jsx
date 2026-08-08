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
    }
  ];

  const allowedItems = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <aside className="w-64 bg-slate-950 border-r-4 border-black flex flex-col h-full shrink-0 relative spidey-web-overlay">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b-4 border-black bg-spidey-red gap-3">
        <div className="p-1.5 bg-spidey-yellow text-black border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
          <Activity className="h-5 w-5" />
        </div>
        <span className="text-2xl font-black text-white tracking-wider spidey-title">AxisFlow</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-4 overflow-y-auto z-10">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 border-2 border-black rounded-none text-xs font-black uppercase tracking-wider transition-all duration-100 cursor-pointer ${
                  isActive
                    ? 'bg-spidey-blue text-white shadow-[4px_4px_0px_rgba(0,0,0,1)] -translate-x-0.5 -translate-y-0.5'
                    : 'text-slate-300 bg-slate-905 hover:bg-spidey-red hover:text-white hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Profile & Logout Section */}
      <div className="p-4 border-t-4 border-black bg-slate-900 z-10">
        <div className="flex items-center gap-3 mb-4 px-2 py-1.5 border-2 border-black bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)]">
          <div className="h-9 w-9 rounded-none bg-spidey-red border-2 border-black flex items-center justify-center text-white font-black text-sm shadow-[1px_1px_0px_rgba(0,0,0,1)]">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-black truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-700 truncate font-bold uppercase flex items-center gap-1">
              <UserCheck className="h-3 w-3 inline text-spidey-blue" />
              {user?.role}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border-2 border-black rounded-none text-xs font-black uppercase tracking-wider text-black bg-spidey-yellow hover:bg-yellow-400 shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
