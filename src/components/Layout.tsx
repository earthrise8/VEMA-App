import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Home, PlusCircle, User, LogOut, MessageSquare, Users, TrendingUp } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../lib/utils';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/auth');
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/new-scan', icon: PlusCircle, label: 'New Scan' },
    { path: '/symptoms', icon: TrendingUp, label: 'Symptoms' },
    { path: '/communications', icon: MessageSquare, label: 'Consult' },
    { path: '/forum', icon: Users, label: 'Forum' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-blue-600 font-bold text-xl">
            <Activity className="w-8 h-8" />
            <span>VENA Health</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors",
                  location.pathname === item.path ? "text-blue-600" : "text-slate-500 hover:text-blue-600"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </nav>

          <button className="md:hidden text-slate-500">
            <Activity className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8">
        <Outlet />
      </main>

      <footer className="md:hidden bg-white border-t border-slate-200 fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around px-4 z-50">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors",
              location.pathname === item.path ? "text-blue-600" : "text-slate-400"
            )}
          >
            <item.icon className="w-6 h-6" />
            {item.label}
          </Link>
        ))}
      </footer>
    </div>
  );
}
