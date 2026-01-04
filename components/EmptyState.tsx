'use client';

import { ReactNode } from 'react';
import Button from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export default function EmptyState({
  icon = 'fas fa-inbox',
  title,
  description,
  actionLabel,
  onAction,
  children
}: EmptyStateProps) {
  return (
    <div className="card p-12 text-center">
      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
        <i className={`${icon} text-4xl text-gray-400 dark:text-gray-500`}></i>
      </div>
      <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} icon="fas fa-plus">
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  );
}

// Specific empty states for common use cases
export function NoProjectsEmptyState({
  onCreateProject,
  showCreateButton = true
}: {
  onCreateProject?: () => void;
  showCreateButton?: boolean;
}) {
  return (
    <EmptyState
      icon="fas fa-folder-open"
      title="No projects yet"
      description={showCreateButton
        ? "Get started by creating your first project to track versions, reports, and team collaboration."
        : "You haven't been assigned to any projects yet. Contact your administrator to get added to a project."}
      actionLabel={showCreateButton ? "Create Project" : undefined}
      onAction={showCreateButton ? onCreateProject : undefined}
    />
  );
}

export function NoReportsEmptyState({ onCreateReport }: { onCreateReport?: () => void }) {
  return (
    <EmptyState
      icon="fas fa-bug"
      title="No reports found"
      description="Create a report to track bugs, feature requests, or improvements for this project."
      actionLabel="New Report"
      onAction={onCreateReport}
    />
  );
}

export function NoVersionsEmptyState({ onCreateVersion }: { onCreateVersion?: () => void }) {
  return (
    <EmptyState
      icon="fas fa-code-branch"
      title="No versions yet"
      description="Add a version to track releases and collect testing feedback from your team."
      actionLabel="Add Version"
      onAction={onCreateVersion}
    />
  );
}

export function NoMessagesEmptyState() {
  return (
    <EmptyState
      icon="fas fa-comments"
      title="No messages yet"
      description="Start a conversation with your team! Type a message below to get started."
    />
  );
}

export function NoUsersEmptyState({ onInviteUser }: { onInviteUser?: () => void }) {
  return (
    <EmptyState
      icon="fas fa-users"
      title="No team members"
      description="Add team members to collaborate on projects, create reports, and test versions."
      actionLabel="Add User"
      onAction={onInviteUser}
    />
  );
}

export function NoSearchResultsEmptyState({ query }: { query?: string }) {
  return (
    <EmptyState
      icon="fas fa-search"
      title="No results found"
      description={query ? `We couldn't find anything matching "${query}". Try different keywords.` : 'Try adjusting your search or filters.'}
    />
  );
}

export function ErrorEmptyState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon="fas fa-exclamation-triangle"
      title="Something went wrong"
      description="We encountered an error loading this content. Please try again."
      actionLabel="Try Again"
      onAction={onRetry}
    />
  );
}
