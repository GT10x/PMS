'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import Breadcrumb from '@/components/Breadcrumb';
import { StatsCardSkeleton, ProjectCardSkeleton } from '@/components/LoadingSkeleton';
import { NoProjectsEmptyState } from '@/components/EmptyState';
import Tooltip from '@/components/Tooltip';
import { getCache, setCache } from '@/lib/cache';

interface User {
  id: string;
  full_name: string;
  email: string | null;
  username: string | null;
  role: string;
  is_admin: boolean;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
}

interface NotificationCounts {
  [projectId: string]: {
    chat: number;
    reports: number;
    total: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [notificationCounts, setNotificationCounts] = useState<NotificationCounts>({});
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    teamMembers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load cached data immediately for instant display
    const cachedUser = getCache<User>('user');
    const cachedProjects = getCache<Project[]>('allProjects');
    const cachedAssigned = getCache<Project[]>('assignedProjects');
    const cachedCounts = getCache<NotificationCounts>('notificationCounts');

    if (cachedUser) {
      setUser(cachedUser);
      if (cachedProjects) {
        setAllProjects(cachedProjects);
        setStats({
          totalProjects: cachedProjects.length,
          activeProjects: cachedProjects.filter((p) => p.status === 'in_progress').length,
          completedProjects: cachedProjects.filter((p) => p.status === 'completed').length,
          teamMembers: 4,
        });
      }
      if (cachedAssigned) setAssignedProjects(cachedAssigned);
      if (cachedCounts) setNotificationCounts(cachedCounts);
      setLoading(false);
    }

    // Fetch fresh data in background
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Step 1: Fetch user first (needed to determine role)
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      const data = await response.json();
      setUser(data.user);
      setCache('user', data.user);

      // Step 2: Fetch projects AND notifications IN PARALLEL (saves 400-600ms)
      const isAdmin = data.user.is_admin || data.user.role === 'project_manager';
      const projectsUrl = isAdmin ? '/api/projects' : `/api/users/${data.user.id}/projects`;

      const [projectsRes, countsRes] = await Promise.all([
        fetch(projectsUrl),
        fetch('/api/notifications/counts')
      ]);

      // Process projects
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        const projects = projectsData.projects || [];
        if (isAdmin) {
          setAllProjects(projects);
          setCache('allProjects', projects);
          setStats({
            totalProjects: projects.length,
            activeProjects: projects.filter((p: Project) => p.status === 'in_progress').length,
            completedProjects: projects.filter((p: Project) => p.status === 'completed').length,
            teamMembers: 4,
          });
        } else {
          setAssignedProjects(projects);
          setCache('assignedProjects', projects);
        }
      }

      // Process notification counts
      if (countsRes.ok) {
        const countsData = await countsRes.json();
        setNotificationCounts(countsData.counts || {});
        setCache('notificationCounts', countsData.counts || {});
      }

      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      if (!user) router.push('/login');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Breadcrumb items={[{ label: 'Dashboard' }]} />
        <div className="mb-8">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  const isAdminOrPM = user.is_admin || user.role === 'project_manager';

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Dashboard', icon: 'fas fa-home' }]} />

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
          Welcome back, {user.full_name.split(' ')[0]}!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Here's what's happening with your projects today.
        </p>
      </div>

      {/* Stats Cards for Admin/PM */}
      {isAdminOrPM && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {/* Total Projects */}
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Projects</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-1">
                  {stats.totalProjects}
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                <i className="fas fa-folder-open text-indigo-500 text-xl"></i>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-500 flex items-center">
                <i className="fas fa-arrow-up mr-1"></i> 12%
              </span>
              <span className="text-gray-400 ml-2">vs last month</span>
            </div>
          </div>

          {/* Active Projects */}
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Projects</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-1">
                  {stats.activeProjects}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <i className="fas fa-spinner text-blue-500 text-xl"></i>
              </div>
            </div>
            <div className="mt-4">
              <div className="progress-bar">
                <div
                  className="progress-bar-fill bg-blue-500"
                  style={{ width: `${(stats.activeProjects / Math.max(stats.totalProjects, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Completed Projects */}
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-1">
                  {stats.completedProjects}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <i className="fas fa-check-circle text-green-500 text-xl"></i>
              </div>
            </div>
            <div className="mt-4">
              <div className="progress-bar">
                <div
                  className="progress-bar-fill bg-green-500"
                  style={{ width: `${(stats.completedProjects / Math.max(stats.totalProjects, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Team Members</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-1">
                  {stats.teamMembers}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <i className="fas fa-users text-purple-500 text-xl"></i>
              </div>
            </div>
            <div className="mt-4 flex -space-x-2">
              {['P', 'D', 'T', 'F'].map((letter, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold border-2 border-white dark:border-gray-800"
                >
                  {letter}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions for Admin/PM */}
      {isAdminOrPM && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          <Tooltip content="View and create projects">
            <a
              href="/dashboard/projects"
              className="card p-6 hover:border-indigo-500 border-2 border-transparent cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="fas fa-folder-plus text-white text-xl"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">Manage Projects</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Create and manage projects</p>
                </div>
              </div>
            </a>
          </Tooltip>

          <Tooltip content="Add team members and manage roles">
            <a
              href="/dashboard/users"
              className="card p-6 hover:border-green-500 border-2 border-transparent cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 gradient-success rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="fas fa-user-plus text-white text-xl"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">User Management</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add and manage users</p>
                </div>
              </div>
            </a>
          </Tooltip>

          <Tooltip content="View reports from all projects">
            <a
              href="/dashboard/admin-reports"
              className="card p-6 hover:border-purple-500 border-2 border-transparent cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="fas fa-chart-line text-white text-xl"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">Admin Reports</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">View all reports</p>
                </div>
              </div>
            </a>
          </Tooltip>
        </div>
      )}

      {/* All Projects for Admin/PM */}
      {isAdminOrPM && allProjects.length > 0 && (
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-folder-open mr-2 text-indigo-500"></i>
            All Projects
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allProjects.map((project) => {
              const counts = notificationCounts[project.id];
              const totalUnread = counts?.total || 0;
              return (
                <Link
                  key={project.id}
                  href={`/dashboard/project/${project.id}`}
                  prefetch={true}
                  className="relative p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-left group border-2 border-transparent hover:border-indigo-500"
                >
                  {/* Notification Badge */}
                  {totalUnread > 0 && (
                    <div className="absolute -top-2 -right-2 min-w-[24px] h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 shadow-lg animate-pulse">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-folder text-white"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`badge text-xs ${
                          project.status === 'completed' ? 'badge-success' :
                          project.status === 'in_progress' ? 'badge-info' :
                          'badge-warning'
                        }`}>
                          {project.status.replace('_', ' ')}
                        </span>
                        {counts && counts.chat > 0 && (
                          <span className="text-xs text-green-600 dark:text-green-400" title="Unread chat messages">
                            <i className="fas fa-comments"></i> {counts.chat}
                          </span>
                        )}
                        {counts && counts.reports > 0 && (
                          <span className="text-xs text-orange-600 dark:text-orange-400" title="New reports">
                            <i className="fas fa-bug"></i> {counts.reports}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Projects for Regular Users */}
      {!isAdminOrPM && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-folder-open mr-2 text-indigo-500"></i>
            Your Projects
          </h2>
          {assignedProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedProjects.map((project) => {
                const counts = notificationCounts[project.id];
                const totalUnread = counts?.total || 0;
                return (
                  <Link
                    key={project.id}
                    href={`/dashboard/project/${project.id}`}
                    prefetch={true}
                    className="relative p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-left group border-2 border-transparent hover:border-indigo-500"
                  >
                    {/* Notification Badge */}
                    {totalUnread > 0 && (
                      <div className="absolute -top-2 -right-2 min-w-[24px] h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 shadow-lg animate-pulse">
                        {totalUnread > 99 ? '99+' : totalUnread}
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-folder text-white"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`badge text-xs ${
                            project.status === 'completed' ? 'badge-success' :
                            project.status === 'in_progress' ? 'badge-info' :
                            'badge-warning'
                          }`}>
                            {project.status.replace('_', ' ')}
                          </span>
                          {counts && counts.chat > 0 && (
                            <span className="text-xs text-green-600 dark:text-green-400" title="Unread chat messages">
                              <i className="fas fa-comments"></i> {counts.chat}
                            </span>
                          )}
                          {counts && counts.reports > 0 && (
                            <span className="text-xs text-orange-600 dark:text-orange-400" title="New reports">
                              <i className="fas fa-bug"></i> {counts.reports}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <NoProjectsEmptyState showCreateButton={false} />
          )}
        </div>
      )}

    </DashboardLayout>
  );
}
