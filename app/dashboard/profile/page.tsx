'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Breadcrumb from '@/components/Breadcrumb';
import { CardSkeleton } from '@/components/LoadingSkeleton';

interface User {
  id: string;
  full_name: string;
  email: string | null;
  username: string | null;
  role: string;
  is_admin: boolean;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Error fetching user:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Breadcrumb items={[{ label: 'Profile' }]} />
        <CardSkeleton />
      </DashboardLayout>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'My Profile', icon: 'fas fa-user' }]} />

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Profile</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">View and manage your account information</p>
      </div>

      {/* Profile Card */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-4xl">
              {user.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{user.full_name}</h2>
            <span className="badge badge-purple mt-2 capitalize">
              {user.role.replace('_', ' ')}
            </span>
            {user.is_admin && (
              <span className="badge badge-danger ml-2">Admin</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white border-b dark:border-gray-700 pb-2">
              Account Information
            </h3>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
              <p className="font-medium text-gray-800 dark:text-white mt-1">{user.full_name}</p>
            </div>

            {user.username && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Username</p>
                <p className="font-medium text-gray-800 dark:text-white mt-1">{user.username}</p>
              </div>
            )}

            {user.email && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                <p className="font-medium text-gray-800 dark:text-white mt-1">{user.email}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white border-b dark:border-gray-700 pb-2">
              Role & Permissions
            </h3>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
              <p className="font-medium text-gray-800 dark:text-white mt-1 capitalize">{user.role.replace('_', ' ')}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Admin Access</p>
              <p className="font-medium text-gray-800 dark:text-white mt-1">
                {user.is_admin ? (
                  <span className="text-green-600 dark:text-green-400">
                    <i className="fas fa-check-circle mr-1"></i> Yes
                  </span>
                ) : (
                  <span className="text-gray-500">
                    <i className="fas fa-times-circle mr-1"></i> No
                  </span>
                )}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Member Since</p>
              <p className="font-medium text-gray-800 dark:text-white mt-1">
                {new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
              <i className="fas fa-key text-indigo-600 dark:text-indigo-400 text-xl"></i>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Change Password</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Update your account password</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Contact your administrator to change your password.
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <i className="fas fa-shield-alt text-purple-600 dark:text-purple-400 text-xl"></i>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Account Security</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage your security settings</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Your account is secured with password authentication.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
