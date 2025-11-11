'use client';
import { Home, Calendar, BookOpen, Store, FileText, Settings, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAppSelector } from '@/hooks/useRedux';
import { stat } from 'fs';
// import { useAppSelector } from '@/hooks/useRedux';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { icon: Home, label: 'Home', href: '/dashboard' },
    { icon: Calendar, label: 'Sessions', href: '/dashboard/sessions' },
    { icon: BookOpen, label: 'Knowledge Base', href: '/dashboard/knowledgebase' },
    { icon: Store, label: 'Agent Store', href: '/dashboard/agentstore' },
  ];

  const user = useAppSelector(state => state.user);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const logOut = () => {
    try {
      const result = fetch('http://localhost:8000/logout-user', {
        method: 'POST',
        credentials: 'include',
      });
      console.log('Logout successful:', result);  
      window.location.href = '/auth/login-user';
    }
    catch (error) {
      console.error('An error occurred during logout:', error);
    }
  }

  function capitalizeStringOrWords(inputString:string) {
  if (!inputString) {
    return "";
  }

  // Check if the string contains spaces
  if (inputString.includes(' ')) {
    // Treat as multiple words (title case)
    return inputString
      .split(' ')
      .map(word => {
        // Handle potential extra spaces or empty words from split()
        if (word.length === 0) return ""; 
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  } else {
    // Treat as a single word
    return inputString.charAt(0).toUpperCase() + inputString.slice(1).toLowerCase();
  }
}

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* User Profile Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <h3 className="text-gray-900 font-semibold text-base"> {capitalizeStringOrWords(user.name)} </h3>
          <p className="text-gray-500 text-sm mt-1">{user.email}</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 ${active ? 'text-blue-600' : 'text-gray-600'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-gray-200">
        <button className="flex items-center w-full px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <Settings className="w-5 h-5 mr-3 text-gray-600" />
          <span>Settings</span>
        </button>
        <button className="flex items-center w-full px-6 py-3 text-sm font-medium text-red-600 hover:bg-red-50 hover:cursor-pointer transition-colors" onClick={logOut} >
          <LogOut className="w-5 h-5 mr-3" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}