'use client'
import { setUserDetails } from '@/features/user/userSlice';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { FileUp, CreditCard, Store, Plus, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function DashboardHome() {

  const dispatch = useAppDispatch();

  const user = useAppSelector(state => state.user);

  const fetchUserDetails = async () => {
       try {
      const response = await fetch('http://localhost:8000/get-current-user', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('User details fetched successfully:', data);
    
        dispatch(setUserDetails({
          name: data.name,
          email: data.email,
          index_name_ocr: data.index_name_ocr,
          index_name_pdf: data.index_name_pdf,
        } )); 
      } else {
        console.error('Failed to fetch user details');
      
      }
    } 
    catch (error) {
      console.error('An error occurred while fetching user details:', error);
    }
  }
  
  useEffect(() => {
    fetchUserDetails();
  }, []);

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

  const quickActions = [
    {
      icon: FileUp,
      title: 'Upload Files',
      description: 'For in-meeting assistance and citations',
      href: '/dashboard/knowledgebase',
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      icon: CreditCard,
      title: 'Create Cue Cards',
      description: 'For exact, pre-prepared answer recall in meeting',
      href: '/dashboard/knowledge-base?tab=cue-card',
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      icon: Store,
      title: 'Setup Agent',
      description: 'To run pre-set actions, instantly, with 1-click.',
      href: '/dashboard/agentstore',
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
    {
      icon: Plus,
      title: 'Start New Session',
      description: 'Join meeting fully prepared and confident',
      href: '/dashboard/sessions?action=new',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      icon: Calendar,
      title: 'Review Meeting',
      description: 'Recap notes, summaries and insights with us',
      href: '/dashboard/sessions',
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
  ];

  return (
    <div className="flex-1 bg-gray-50 p-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome, {capitalizeStringOrWords(user.name)}!
        </h1>
        <p className="text-gray-600 mb-1">
          Ready to ace your next meeting?
        </p>
        <p className="text-gray-600">
          Get real-time answers, surface the right documents, recall pre-set responses, and background agent support, all in just 1- click.
        </p>
      </div>

      {/* Quick Actions Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Get ready for your meeting
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="group bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200"
              >
                <div className="flex flex-col h-full">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-lg ${action.iconBg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${action.iconColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-2 flex items-center justify-between">
                      {action.title}
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}