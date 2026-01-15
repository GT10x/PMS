'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  getNodesBounds,
  getViewportForBounds,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng } from 'html-to-image';

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

interface ConnectionInfo {
  moduleId: string;
  moduleName: string;
  sharedStakeholders: string[];
}

// Custom node component for modules
function ModuleNode({ data, selected }: { data: any; selected?: boolean }) {
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

  const isHighlighted = data.isHighlighted !== false;
  const isSelected = data.isSelected;

  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 shadow-lg min-w-[180px] max-w-[220px] relative transition-all duration-200 ${statusColors[data.status] || statusColors.planned} ${!isHighlighted ? 'opacity-20' : ''} ${isSelected ? 'ring-4 ring-indigo-500 ring-offset-2' : ''}`}
    >
      {/* Handles for edge connections */}
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-indigo-500" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-indigo-500" />
      <Handle type="target" position={Position.Left} id="left" className="!w-2 !h-2 !bg-indigo-500" />
      <Handle type="source" position={Position.Right} id="right" className="!w-2 !h-2 !bg-indigo-500" />

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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [minSharedStakeholders, setMinSharedStakeholders] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<'circle' | 'status' | 'priority'>('circle');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const flowRef = useRef<HTMLDivElement>(null);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!flowRef.current) return;

    if (!isFullscreen) {
      if (flowRef.current.requestFullscreen) {
        flowRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

  // Calculate all edges with their shared stakeholder info
  const allEdgesData = useMemo(() => {
    const edgesData: { sourceId: string; targetId: string; shared: string[] }[] = [];
    for (let i = 0; i < modules.length; i++) {
      for (let j = i + 1; j < modules.length; j++) {
        const shared = modules[i].stakeholders?.filter((s) => modules[j].stakeholders?.includes(s)) || [];
        if (shared.length > 0) {
          edgesData.push({
            sourceId: modules[i].id,
            targetId: modules[j].id,
            shared,
          });
        }
      }
    }
    return edgesData;
  }, [modules]);

  // Get connections for selected node
  const selectedNodeConnections = useMemo((): ConnectionInfo[] => {
    if (!selectedNodeId) return [];

    const connections: ConnectionInfo[] = [];
    allEdgesData.forEach((edge) => {
      if (edge.sourceId === selectedNodeId) {
        const targetModule = modules.find((m) => m.id === edge.targetId);
        if (targetModule) {
          connections.push({
            moduleId: edge.targetId,
            moduleName: targetModule.name,
            sharedStakeholders: edge.shared,
          });
        }
      } else if (edge.targetId === selectedNodeId) {
        const sourceModule = modules.find((m) => m.id === edge.sourceId);
        if (sourceModule) {
          connections.push({
            moduleId: edge.sourceId,
            moduleName: sourceModule.name,
            sharedStakeholders: edge.shared,
          });
        }
      }
    });
    return connections.sort((a, b) => b.sharedStakeholders.length - a.sharedStakeholders.length);
  }, [selectedNodeId, allEdgesData, modules]);

  // Get connected node IDs for highlighting
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const ids = new Set<string>([selectedNodeId]);
    selectedNodeConnections.forEach((c) => ids.add(c.moduleId));
    return ids;
  }, [selectedNodeId, selectedNodeConnections]);

  // Filter modules by search
  const filteredModuleIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return new Set(
      modules
        .filter((m) => m.name.toLowerCase().includes(query))
        .map((m) => m.id)
    );
  }, [searchQuery, modules]);

  // Export function
  const exportToImage = useCallback(() => {
    if (!flowRef.current) return;

    const flowElement = flowRef.current.querySelector('.react-flow') as HTMLElement;
    if (!flowElement) return;

    toPng(flowElement, {
      backgroundColor: '#ffffff',
      width: 1920,
      height: 1080,
      style: {
        width: '1920px',
        height: '1080px',
      },
    }).then((dataUrl) => {
      const link = document.createElement('a');
      link.download = `${project?.name || 'module'}-flow-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    }).catch((err) => {
      console.error('Export failed:', err);
      alert('Failed to export image. Please try again.');
    });
  }, [project?.name]);

  // Calculate node positions based on layout mode
  const getNodePosition = useCallback((module: Module, index: number, modulesByGroup: Map<string, Module[]>) => {
    const nodeCount = modules.length;

    if (layoutMode === 'circle') {
      const radius = Math.max(300, nodeCount * 45);
      const centerX = 500;
      const centerY = 400;
      const angle = (2 * Math.PI * index) / nodeCount - Math.PI / 2;
      return { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
    }

    // Clustered layouts (status or priority)
    const groupKey = layoutMode === 'status' ? module.status : module.priority;
    const groups = layoutMode === 'status'
      ? ['planned', 'in_progress', 'completed', 'on_hold']
      : ['critical', 'high', 'medium', 'low'];

    const groupIndex = groups.indexOf(groupKey);
    const groupModules = modulesByGroup.get(groupKey) || [];
    const indexInGroup = groupModules.findIndex((m) => m.id === module.id);

    const groupWidth = 300;
    const groupSpacing = 350;
    const startX = 100;
    const startY = 100;

    const nodesPerRow = 3;
    const row = Math.floor(indexInGroup / nodesPerRow);
    const col = indexInGroup % nodesPerRow;

    return {
      x: startX + groupIndex * groupSpacing + col * 120,
      y: startY + row * 150,
    };
  }, [layoutMode, modules.length]);

  useEffect(() => {
    if (modules.length === 0) return;

    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];

    // Group modules for clustered layouts
    const modulesByStatus = new Map<string, Module[]>();
    const modulesByPriority = new Map<string, Module[]>();
    modules.forEach((m) => {
      if (!modulesByStatus.has(m.status)) modulesByStatus.set(m.status, []);
      modulesByStatus.get(m.status)!.push(m);
      if (!modulesByPriority.has(m.priority)) modulesByPriority.set(m.priority, []);
      modulesByPriority.get(m.priority)!.push(m);
    });
    const modulesByGroup = layoutMode === 'status' ? modulesByStatus : modulesByPriority;

    const newNodes: Node[] = modules.map((module, index) => {
      const position = getNodePosition(module, index, modulesByGroup);

      // Determine if node should be highlighted
      let isHighlighted = true;
      if (selectedNodeId) {
        isHighlighted = connectedNodeIds.has(module.id);
      }
      if (filteredModuleIds && !filteredModuleIds.has(module.id)) {
        isHighlighted = false;
      }

      return {
        id: module.id,
        type: 'moduleNode',
        position,
        data: {
          label: module.name,
          status: module.status,
          priority: module.priority,
          stakeholders: module.stakeholders || [],
          isHighlighted,
          isSelected: module.id === selectedNodeId,
        },
      };
    });

    const newEdges: Edge[] = [];

    allEdgesData.forEach((edgeData, idx) => {
      const shared = edgeData.shared;

      // Apply stakeholder filter
      const relevant = selectedStakeholder
        ? shared.filter((s) => s === selectedStakeholder)
        : shared;

      if (relevant.length < minSharedStakeholders) return;
      if (relevant.length === 0) return;

      // Determine if edge should be highlighted
      let isHighlighted = true;
      if (selectedNodeId) {
        isHighlighted = edgeData.sourceId === selectedNodeId || edgeData.targetId === selectedNodeId;
      }

      const colorIdx = allStakeholders.indexOf(relevant[0]) % colors.length;
      const strokeWidth = Math.min(relevant.length, 6);

      newEdges.push({
        id: `e-${edgeData.sourceId}-${edgeData.targetId}`,
        source: edgeData.sourceId,
        target: edgeData.targetId,
        label: relevant.length > 2 ? `${relevant.length} shared` : relevant.slice(0, 2).join(', '),
        labelStyle: { fontSize: 9, fill: '#374151', fontWeight: 500 },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
        style: {
          stroke: colors[colorIdx],
          strokeWidth: isHighlighted ? strokeWidth : 1,
          opacity: isHighlighted ? 1 : 0.15,
        },
        animated: isHighlighted && relevant.length >= 3,
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [modules, selectedStakeholder, allStakeholders, selectedNodeId, connectedNodeIds, filteredModuleIds, minSharedStakeholders, allEdgesData, layoutMode, getNodePosition]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const selectedModule = modules.find((m) => m.id === selectedNodeId);

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
          <p className="text-gray-600 dark:text-gray-400 mt-1">Click a module to see only its connections • Click empty space to reset</p>
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

      {/* Filters Row */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Min Shared Stakeholders */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Min shared:</span>
          <select
            value={minSharedStakeholders}
            onChange={(e) => setMinSharedStakeholders(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={1}>1+ stakeholder</option>
            <option value={2}>2+ stakeholders</option>
            <option value={3}>3+ stakeholders</option>
            <option value={5}>5+ stakeholders</option>
            <option value={10}>10+ stakeholders</option>
          </select>
        </div>

        {/* Layout Mode */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Layout:</span>
          <select
            value={layoutMode}
            onChange={(e) => setLayoutMode(e.target.value as 'circle' | 'status' | 'priority')}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="circle">Circle</option>
            <option value="status">Group by Status</option>
            <option value="priority">Group by Priority</option>
          </select>
        </div>

        {/* Export Button */}
        <button
          onClick={exportToImage}
          className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <i className="fas fa-download"></i> Export PNG
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i> {isFullscreen ? 'Exit' : 'Fullscreen'}
        </button>

        {/* Reset button */}
        {(selectedNodeId || searchQuery || minSharedStakeholders > 1 || selectedStakeholder) && (
          <button
            onClick={() => {
              setSelectedNodeId(null);
              setSearchQuery('');
              setMinSharedStakeholders(1);
              setSelectedStakeholder(null);
            }}
            className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <i className="fas fa-times mr-1"></i> Reset Filters
          </button>
        )}
      </div>

      {/* Stakeholder Filter */}
      {allStakeholders.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Stakeholder:</span>
          <button onClick={() => setSelectedStakeholder(null)} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedStakeholder === null ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'}`}>All</button>
          {allStakeholders.slice(0, 15).map((s) => (
            <button key={s} onClick={() => setSelectedStakeholder(s)} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedStakeholder === s ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'}`}>{s}</button>
          ))}
          {allStakeholders.length > 15 && (
            <span className="text-sm text-gray-500">+{allStakeholders.length - 15} more</span>
          )}
        </div>
      )}

      {/* Main Content - Flow + Info Panel */}
      <div className="flex gap-4">
        {/* Flow Diagram */}
        <div className={`flex-1 ${selectedNodeId ? 'w-2/3' : 'w-full'}`}>
          {modules.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <i className="fas fa-project-diagram text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">No modules yet</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Add modules with stakeholders to see the connectivity flow</p>
              <button onClick={() => router.push(`/dashboard/project/${projectId}/modules`)} className="btn-primary"><i className="fas fa-plus mr-2"></i>Add Modules</button>
            </div>
          ) : (
            <div ref={flowRef} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: '600px' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                nodesDraggable={true}
                fitView
                attributionPosition="bottom-left"
                defaultEdgeOptions={{
                  type: 'smoothstep',
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
        </div>

        {/* Selected Node Info Panel */}
        {selectedNodeId && selectedModule && (
          <div className="w-80 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 h-[600px] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Selected Module</h3>
              <button onClick={() => setSelectedNodeId(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Module Info */}
            <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <h4 className="font-semibold text-indigo-900 dark:text-indigo-100">{selectedModule.name}</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  selectedModule.status === 'completed' ? 'bg-green-100 text-green-700' :
                  selectedModule.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                  selectedModule.status === 'on_hold' ? 'bg-gray-100 text-gray-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {selectedModule.status.replace('_', ' ')}
                </span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  selectedModule.priority === 'critical' ? 'bg-red-100 text-red-700' :
                  selectedModule.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                  selectedModule.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {selectedModule.priority} priority
                </span>
              </div>
            </div>

            {/* Stakeholders */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stakeholders ({selectedModule.stakeholders?.length || 0})
              </h4>
              <div className="flex flex-wrap gap-1">
                {selectedModule.stakeholders?.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">{s}</span>
                ))}
              </div>
            </div>

            {/* Connections */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Connections ({selectedNodeConnections.length})
              </h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {selectedNodeConnections.map((conn) => (
                  <div
                    key={conn.moduleId}
                    className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => setSelectedNodeId(conn.moduleId)}
                  >
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{conn.moduleName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">{conn.sharedStakeholders.length}</span> shared: {conn.sharedStakeholders.slice(0, 3).join(', ')}
                      {conn.sharedStakeholders.length > 3 && ` +${conn.sharedStakeholders.length - 3} more`}
                    </div>
                  </div>
                ))}
                {selectedNodeConnections.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No connections with current filters</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">Status:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-blue-500 bg-blue-50"></span> Planned</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-yellow-500 bg-yellow-50"></span> In Progress</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-green-500 bg-green-50"></span> Completed</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-gray-500 bg-gray-50"></span> On Hold</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">Line thickness = more shared stakeholders</span>
        </div>
      </div>

      {/* Stats */}
      {modules.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
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
            <div className="text-sm text-gray-600 dark:text-gray-400">Visible Connections</div>
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
