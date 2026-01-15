'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Breadcrumb from '@/components/Breadcrumb';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface Module {
  id: string;
  name: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold';
  stakeholders: string[];
}

interface Project {
  id: string;
  name: string;
}

// Custom node component for modules
function ModuleNode({ data }: { data: any }) {
  const statusColors: Record<string, string> = {
    planned: 'border-blue-500 bg-blue-50 dark:bg-blue-900/30',
    in_progress: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30',
    completed: 'border-green-500 bg-green-50 dark:bg-green-900/30',
    on_hold: 'border-gray-500 bg-gray-50 dark:bg-gray-700',
  };

  const priorityDots: Record<string, string> = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  return (
    <div className={`px-4 py-3 rounded-xl border-2 shadow-lg min-w-[180px] max-w-[220px] ${statusColors[data.status] || statusColors.planned}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2 h-2 rounded-full ${priorityDots[data.priority] || priorityDots.medium}`} />
        <h3 className="font-semibold text-gray-800 dark:text-white text-sm truncate">{data.label}</h3>
      </div>
      {data.stakeholders && data.stakeholders.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {data.stakeholders.slice(0, 3).map((s: string, i: number) => (
            <span key={i} className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full">{s}</span>
          ))}
          {data.stakeholders.length > 3 && (
            <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">+{data.stakeholders.length - 3}</span>
          )}
        </div>
      )}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 capitalize">{data.status.replace('_', ' ')}</div>
    </div>
  );
}

const nodeTypes = { moduleNode: ModuleNode };

export default function ModuleFlowPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedStakeholder, setSelectedStakeholder] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      const [projectRes, modulesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/view`),
        fetch(`/api/projects/${projectId}/modules`),
      ]);
      if (projectRes.ok) setProject(await projectRes.json());
      if (modulesRes.ok) {
        const data = await modulesRes.json();
        setModules(data.modules || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const allStakeholders = useMemo(() => {
    const set = new Set<string>();
    modules.forEach((m) => m.stakeholders?.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [modules]);

  useEffect(() => {
    if (modules.length === 0) return;

    const nodeCount = modules.length;
    const radius = Math.max(250, nodeCount * 40);
    const centerX = 400;
    const centerY = 300;

    const newNodes: Node[] = modules.map((module, index) => {
      const angle = (2 * Math.PI * index) / nodeCount - Math.PI / 2;
      return {
        id: module.id,
        type: 'moduleNode',
        position: { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) },
        data: { label: module.name, status: module.status, priority: module.priority, stakeholders: module.stakeholders || [] },
      };
    });

    const newEdges: Edge[] = [];
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];

    for (let i = 0; i < modules.length; i++) {
      for (let j = i + 1; j < modules.length; j++) {
        const shared = modules[i].stakeholders?.filter((s) => modules[j].stakeholders?.includes(s)) || [];
        if (shared.length > 0) {
          const relevant = selectedStakeholder ? shared.filter((s) => s === selectedStakeholder) : shared;
          if (relevant.length > 0) {
            const colorIdx = allStakeholders.indexOf(relevant[0]) % colors.length;
            // Simplify label - show count if more than 2 stakeholders
            const edgeLabel = relevant.length > 2
              ? `${relevant.length} shared`
              : relevant.join(', ');

            newEdges.push({
              id: `e-${i}-${j}`,
              source: modules[i].id,
              target: modules[j].id,
              style: { stroke: colors[colorIdx], strokeWidth: 2 },
            });
          }
        }
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [modules, selectedStakeholder, allStakeholders]);

  if (loading) {
    return (
      <DashboardLayout>
        <Breadcrumb items={[{ label: 'Projects', href: '/dashboard/projects' }, { label: 'Loading...' }]} />
        <div className="flex items-center justify-center py-12">
          <i className="fas fa-spinner animate-spin text-indigo-500 text-3xl"></i>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Breadcrumb items={[{ label: 'Projects', href: '/dashboard/projects' }, { label: project?.name || 'Project', href: `/dashboard/project/${projectId}` }, { label: 'Module Flow' }]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Module Connectivity Flow</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Visual representation of how modules connect through shared stakeholders</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 border-b dark:border-gray-700 pb-4 overflow-x-auto">
        <button onClick={() => router.push(`/dashboard/project/${projectId}`)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 whitespace-nowrap">Overview</button>
        <button onClick={() => router.push(`/dashboard/project/${projectId}/reports`)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 whitespace-nowrap">Reports</button>
        <button onClick={() => router.push(`/dashboard/project/${projectId}/versions`)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 whitespace-nowrap">Versions</button>
        <button onClick={() => router.push(`/dashboard/project/${projectId}/modules`)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 whitespace-nowrap">Modules</button>
        <button className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 whitespace-nowrap">Flow</button>
        <button onClick={() => router.push(`/dashboard/project/${projectId}/chat`)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 whitespace-nowrap">Chat</button>
        <button onClick={() => router.push(`/dashboard/project/${projectId}/settings`)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 whitespace-nowrap">Settings</button>
      </div>

      {/* Stakeholder Filter */}
      {allStakeholders.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Stakeholder:</span>
          <button onClick={() => setSelectedStakeholder(null)} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedStakeholder === null ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'}`}>All</button>
          {allStakeholders.map((s) => (
            <button key={s} onClick={() => setSelectedStakeholder(s)} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedStakeholder === s ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'}`}>{s}</button>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">Status:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-blue-500 bg-blue-50"></span> Planned</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-yellow-500 bg-yellow-50"></span> In Progress</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-green-500 bg-green-50"></span> Completed</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-gray-500 bg-gray-50"></span> On Hold</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">Priority:</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Low</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Medium</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> High</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Critical</span>
        </div>
      </div>

      {/* Flow Diagram */}
      {modules.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <i className="fas fa-project-diagram text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">No modules yet</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Add modules with stakeholders to see the connectivity flow</p>
          <button onClick={() => router.push(`/dashboard/project/${projectId}/modules`)} className="btn-primary"><i className="fas fa-plus mr-2"></i>Add Modules</button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: '600px' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
            defaultEdgeOptions={{
              style: { strokeWidth: 2, stroke: '#6366f1' },
              type: 'smoothstep',
              animated: true,
            }}
            minZoom={0.1}
            maxZoom={2}
          >
            <Background color="#94a3b8" gap={20} />
            <Controls />
            <MiniMap nodeColor={(n) => { const s = n.data?.status; return s === 'completed' ? '#22c55e' : s === 'in_progress' ? '#eab308' : s === 'on_hold' ? '#6b7280' : '#3b82f6'; }} maskColor="rgba(0,0,0,0.1)" />
          </ReactFlow>
        </div>
      )}

      {/* Stats */}
      {modules.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{modules.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Modules</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{allStakeholders.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Unique Stakeholders</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{edges.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Connections</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{modules.filter((m) => m.status === 'in_progress').length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
