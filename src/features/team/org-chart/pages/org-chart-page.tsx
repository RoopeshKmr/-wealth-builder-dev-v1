import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useAuth } from '@/features/auth/hooks/use-auth';
import orgChartService, {
  type OrgChartUser,
  type OrgViewType,
} from '../services/org-chart-service';
import OrgNode, { type OrgNodeData } from '../components/org-node';
import OrgToolbar from '../components/org-toolbar';
import { FILTER_COLORS, FILTER_KEYS } from '../utils/filters';
import { findNodePosition, layoutTree, type TreeNode } from '../utils/layout';
import '../styles/org-chart.css';

const nodeTypes = {
  custom: OrgNode,
};

const GLOBAL_MAX_TREE_DEPTH = 20;

function focusOnNodeUtil(nodeId: string, nodes: Node[], reactFlowInstance: ReturnType<typeof useReactFlow>, zoomLevel = 1.2) {
  const position = findNodePosition(nodes, nodeId);
  if (!position) return;

  reactFlowInstance.setCenter(position.x + 80, position.y + 95, {
    zoom: zoomLevel,
    duration: 800,
  });
}

function OrgChart() {
  const { user } = useAuth();
  const reactFlowInstance = useReactFlow();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [currentViewType, setCurrentViewType] = useState<OrgViewType>('baseshop');
  const [selectedSMDId, setSelectedSMDId] = useState<string | null>(null);
  const [smdList, setSmdList] = useState<Array<{ id: string; firstName: string; lastName: string; agentLevel: string }>>([]);
  const [users, setUsers] = useState<OrgChartUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [expandDepth, setExpandDepth] = useState<number | null>(1);
  const [apiChildrenMap, setApiChildrenMap] = useState<Record<string, string[]>>({});
  const [loadingDownlineIds, setLoadingDownlineIds] = useState<Set<string>>(new Set());
  const [reloadTick, setReloadTick] = useState(0);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [pendingCenterId, setPendingCenterId] = useState<string | null>(null);

  const byId = useMemo(() => {
    const map: Record<string, OrgChartUser> = {};
    users.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [users]);

  const parentMap = useMemo(() => {
    const map: Record<string, string> = {};
    Object.keys(apiChildrenMap).forEach((parentId) => {
      (apiChildrenMap[parentId] || []).forEach((childId) => {
        map[childId] = parentId;
      });
    });
    return map;
  }, [apiChildrenMap]);

  useEffect(() => {
    let alive = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const transformedData = await orgChartService.fetchOrgChartData(currentViewType, selectedSMDId);
        if (!alive) return;

        setUsers(transformedData.users);
        setSmdList(transformedData.smd_list || []);

        const firstUser = transformedData.users[0];
        setApiChildrenMap(firstUser?._apiIndexes?.childrenMap || {});
        setError(null);
      } catch (fetchError) {
        if (!alive) return;
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to load org chart';
        setError(message);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    void fetchData();
    return () => {
      alive = false;
    };
  }, [currentViewType, selectedSMDId, reloadTick]);

  const tree = useMemo<TreeNode | null>(() => {
    if (!users.length) return null;

    const currentUserId = user?.id || localStorage.getItem('wb.userId') || users[0].id;
    const currentUser = byId[currentUserId] || users[0];
    if (!currentUser) return null;

    const buildTree = (nodeUser: OrgChartUser, depth = 0, visited = new Set<string>()): TreeNode | null => {
      if (!nodeUser || visited.has(nodeUser.id) || depth > GLOBAL_MAX_TREE_DEPTH) {
        return null;
      }

      visited.add(nodeUser.id);
      const childIds = apiChildrenMap[nodeUser.id] || [];
      const children = childIds
        .map((childId) => {
          const childUser = byId[childId];
          return childUser ? buildTree(childUser, depth + 1, visited) : null;
        })
        .filter((child): child is TreeNode => Boolean(child));

      return {
        id: nodeUser.id,
        name: nodeUser.name,
        plan: nodeUser.plan,
        level: nodeUser.level,
        agencyCode: nodeUser.agencyCode,
        email: nodeUser.email,
        profilePicture: '',
        photoURL: '',
        training: nodeUser.training,
        bigEvent: nodeUser.bigEvent,
        keyPlayer: nodeUser.keyPlayer,
        netLicenseAmount: nodeUser.netLicenseAmount,
        licensed: nodeUser.licensed,
        hasProduction: nodeUser.hasProduction,
        childCount: Math.max(childIds.length, nodeUser.childCount || 0),
        children,
      };
    };

    return buildTree(currentUser);
  }, [apiChildrenMap, byId, user?.id, users]);

  const hasChildren = useCallback((nodeId: string, treeNode: TreeNode | null): boolean => {
    if (!treeNode) return false;
    if (treeNode.id === nodeId) {
      const knownCount = byId[nodeId]?.childCount || 0;
      return knownCount > 0 || treeNode.childCount > 0 || treeNode.children.length > 0;
    }
    return treeNode.children.some((child) => hasChildren(nodeId, child));
  }, [byId]);

  const getDescendantCount = useCallback((nodeId: string, treeNode: TreeNode | null): number => {
    if (!treeNode) return 0;

    if (treeNode.id === nodeId) {
      if (treeNode.children.length === 0) {
        return treeNode.childCount;
      }

      let count = treeNode.children.length;
      treeNode.children.forEach((child) => {
        count += getDescendantCount(child.id, child);
      });
      return count;
    }

    for (const child of treeNode.children) {
      const count = getDescendantCount(nodeId, child);
      if (count > 0) return count;
    }

    return 0;
  }, []);

  const getNodeFilterMatches = useCallback((nodeData: OrgNodeData) => {
    const matches: string[] = [];
    if (nodeData.training) matches.push(FILTER_KEYS.BPM);
    if (nodeData.bigEvent) matches.push(FILTER_KEYS.BIG_EVENT);
    if (nodeData.keyPlayer) matches.push(FILTER_KEYS.KEY_PLAYER);
    if (nodeData.licensed) matches.push(FILTER_KEYS.LICENSED);
    if (nodeData.netLicenseAmount > 1000) matches.push(FILTER_KEYS.NET_LICENSED);
    if (nodeData.hasProduction) matches.push(FILTER_KEYS.CLIENT);
    return matches;
  }, []);

  const getNodeFilterBackground = useCallback((nodeData: OrgNodeData): Record<string, string> => {
    if (!activeFilters.size) return {};

    const matches = getNodeFilterMatches(nodeData).filter((match) => activeFilters.has(match));
    if (!matches.length) return {};

    if (matches.length === 1) {
      const color = FILTER_COLORS[matches[0]];
      return {
        background: color,
        border: `2px solid ${color}`,
      };
    }

    const colors = matches.map((key) => FILTER_COLORS[key]);
    const width = 100 / colors.length;
    const stops = colors
      .map((color, index) => `${color} ${index * width}% ${(index + 1) * width}%`)
      .join(', ');

    return {
      background: `linear-gradient(to bottom, ${stops})`,
      border: `2px solid ${colors[0]}`,
    };
  }, [activeFilters, getNodeFilterMatches]);

  const mergeOrgData = useCallback(
    (incomingUsers: OrgChartUser[], incomingChildrenMap: Record<string, string[]>) => {
      setUsers((previous) => {
        const merged = new Map(previous.map((user) => [user.id, user]));
        incomingUsers.forEach((user) => {
          const current = merged.get(user.id);
          merged.set(user.id, {
            ...(current || user),
            ...user,
            childCount: Math.max(current?.childCount || 0, user.childCount || 0),
          });
        });
        return Array.from(merged.values());
      });

      setApiChildrenMap((previous) => {
        const next: Record<string, string[]> = { ...previous };
        Object.entries(incomingChildrenMap).forEach(([parentId, childIds]) => {
          const existing = new Set(next[parentId] || []);
          childIds.forEach((childId) => existing.add(childId));
          next[parentId] = Array.from(existing);
        });
        return next;
      });
    },
    []
  );

  const loadDownlineForUser = useCallback(
    async (nodeId: string) => {
      if (loadingDownlineIds.has(nodeId)) return;

      setLoadingDownlineIds((previous) => {
        const next = new Set(previous);
        next.add(nodeId);
        return next;
      });

      try {
        const downline = await orgChartService.fetchDownlineData(nodeId);
        mergeOrgData(downline.users, downline.childrenMap);
        setError(null);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to load downline';
        setError(message);
      } finally {
        setLoadingDownlineIds((previous) => {
          const next = new Set(previous);
          next.delete(nodeId);
          return next;
        });
      }
    },
    [loadingDownlineIds, mergeOrgData]
  );

  const handleToggleCollapse = useCallback(async (nodeId: string, isDepthLimited: boolean) => {
    const isCurrentlyCollapsed = collapsedNodes.has(nodeId) || isDepthLimited;
    const nodeUser = byId[nodeId];
    const hasLoadedChildren = Boolean(apiChildrenMap[nodeId]?.length);
    const shouldLoadDownline = isCurrentlyCollapsed && !hasLoadedChildren && (nodeUser?.childCount || 0) > 0;

    if (shouldLoadDownline) {
      await loadDownlineForUser(nodeId);
    }

    if (isCurrentlyCollapsed) {
      setCollapsedNodes((previous) => {
        const next = new Set(previous);
        next.delete(nodeId);
        return next;
      });
      return;
    }

    setCollapsedNodes((previous) => {
      const next = new Set(previous);
      next.add(nodeId);
      return next;
    });
  }, [apiChildrenMap, byId, collapsedNodes, loadDownlineForUser]);

  const { nodes, edges } = useMemo(() => {
    if (!tree) return { nodes: [] as Node[], edges: [] as Edge[] };

    const depthMap = new Map<string, number>();
    const walkDepth = (node: TreeNode, depth = 0) => {
      depthMap.set(node.id, depth);
      node.children.forEach((child) => walkDepth(child, depth + 1));
    };
    walkDepth(tree);

    const pruneTreeForLayout = (node: TreeNode, depth = 0): TreeNode => {
      const isCollapsed = collapsedNodes.has(node.id);
      const isDepthLimited = expandDepth !== null && depth >= expandDepth;

      const pruned: TreeNode = {
        ...node,
        children: [],
      };

      if (!isCollapsed && !isDepthLimited) {
        pruned.children = node.children.map((child) => pruneTreeForLayout(child, depth + 1));
      }

      return pruned;
    };

    const visibleTree = pruneTreeForLayout(tree);
    const { nodes: rawNodes, edges: rawEdges } = layoutTree(visibleTree, {
      focusNodeId: tree.id,
      nodeWidth: 160,
      nodeHeight: 190,
      rankSep: 72,
      nodeSep: 40,
    });

    const enhancedNodes = rawNodes.map((node) => {
      const currentData = node.data as OrgNodeData;
      const depth = depthMap.get(node.id) || 0;
      const hasChildrenNode = hasChildren(node.id, tree);
      const isDepthLimited = expandDepth !== null && depth >= expandDepth && hasChildrenNode;

      const updatedData: OrgNodeData = {
        ...currentData,
        filterBackground: getNodeFilterBackground(currentData),
        isCollapsed: collapsedNodes.has(node.id) || isDepthLimited,
        hasChildren: hasChildrenNode,
        childrenCount: getDescendantCount(node.id, tree),
        onToggleCollapse: () => {
          void handleToggleCollapse(node.id, isDepthLimited);
        },
        onClick: () => {
          setSelectedUserId(node.id);
          focusOnNodeUtil(node.id, rawNodes, reactFlowInstance, 1.5);
        },
      };

      return {
        ...node,
        data: updatedData,
        className: selectedUserId === node.id ? 'orgchart-node-selected' : undefined,
      };
    });

    const visibleIds = new Set(enhancedNodes.map((node) => node.id));
    return {
      nodes: enhancedNodes,
      edges: rawEdges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
    };
  }, [
    collapsedNodes,
    expandDepth,
    getDescendantCount,
    getNodeFilterBackground,
    handleToggleCollapse,
    hasChildren,
    reactFlowInstance,
    selectedUserId,
    tree,
  ]);

  useEffect(() => {
    if (!pendingCenterId || !nodes.length) return;
    const hasTarget = nodes.some((node) => node.id === pendingCenterId);
    if (!hasTarget) return;

    requestAnimationFrame(() => {
      focusOnNodeUtil(pendingCenterId, nodes, reactFlowInstance, 1.3);
      setPendingCenterId(null);
    });
  }, [nodes, pendingCenterId, reactFlowInstance]);

  const handleSearch = useCallback((searchName: string) => {
    const normalized = searchName.trim().toLowerCase();
    if (!normalized || !tree) return;

    const target = users.find((candidate) => candidate.name.trim().toLowerCase() === normalized);
    if (!target) {
      return;
    }

    const pathIds = [target.id];
    let cursor = target.id;
    let depth = 0;
    let guard = 0;

    while (cursor && cursor !== tree.id && guard < 1000) {
      const parent = parentMap[cursor];
      if (!parent) break;
      pathIds.push(parent);
      cursor = parent;
      depth += 1;
      guard += 1;
    }

    setExpandDepth(Math.min(depth + 1, 20));
    setCollapsedNodes((previous) => {
      const next = new Set(previous);
      pathIds.forEach((id) => next.delete(id));
      return next;
    });
    setSelectedUserId(target.id);
    setPendingCenterId(target.id);
  }, [parentMap, tree, users]);

  const handleCenterOnMe = useCallback(() => {
    if (!tree) return;
    setSelectedUserId(tree.id);
    setPendingCenterId(tree.id);
  }, [tree]);

  if (loading) {
    return (
      <div className="orgchart-container">
        <div className="orgchart-header">
          <h1 className="orgchart-title">Organization Chart</h1>
        </div>
        <div className="orgchart-loading">
          <div className="orgchart-loading-spinner" />
          <p>Loading organization data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orgchart-container">
        <div className="orgchart-header">
          <h1 className="orgchart-title">Organization Chart</h1>
        </div>
        <div className="orgchart-empty">
          <div className="orgchart-empty-icon">!</div>
          <p className="orgchart-empty-text">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orgchart-container">
      <div className="orgchart-header">
        <h1 className="orgchart-title">Organization Chart</h1>
        <p className="orgchart-subtitle">
          {user ? `${user.displayName || user.email}'s organization` : 'Organizational Structure'}
        </p>
      </div>

      <OrgToolbar
        currentView={currentViewType}
        onViewChange={(view) => {
          setCurrentViewType(view);
          setSelectedSMDId(null);
          setSelectedUserId(null);
        }}
        onSearch={handleSearch}
        onCenterOnMe={handleCenterOnMe}
        activeFilters={activeFilters}
        onFilterToggle={(filterKey) => {
          setActiveFilters((previous) => {
            const next = new Set(previous);
            if (next.has(filterKey)) {
              next.delete(filterKey);
            } else {
              next.add(filterKey);
            }
            return next;
          });
        }}
        smdList={smdList}
        selectedSMDId={selectedSMDId}
        onSMDSelect={(smdId) => {
          setSelectedSMDId(smdId);
          setSelectedUserId(null);
        }}
        onExpandToDepth={(depth) => {
          setExpandDepth(depth);
          setCollapsedNodes(new Set());
          if (tree?.id) {
            setSelectedUserId(tree.id);
            setPendingCenterId(tree.id);
          }
        }}
        expandDepth={expandDepth}
        onRefresh={() => {
          setReloadTick((value) => value + 1);
        }}
        users={users}
      />

      <div className="orgchart-flow-wrapper">
        {nodes.length === 0 ? (
          <div className="orgchart-empty">
            <div className="orgchart-empty-icon">[]</div>
            <p className="orgchart-empty-text">No organizational data to display</p>
          </div>
        ) : (
          <ReactFlow<Node, Edge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{
              padding: 0.1,
              includeHiddenNodes: false,
              minZoom: 0.2,
              maxZoom: 1.5,
            }}
            minZoom={0.1}
            maxZoom={2}
            defaultEdgeOptions={{
              type: 'step',
              animated: false,
            }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            selectNodesOnDrag={false}
            panOnDrag
            zoomOnScroll
            preventScrolling
          >
            <Background color="#94a3b8" gap={16} />
            <Controls />
          </ReactFlow>
        )}

        <div className="viewport-indicator">
          <div className="viewport-indicator-content">
            <div className="viewport-indicator-title">Current View</div>
            <div className="viewport-indicator-info">
              {selectedUserId ? (
                <>
                  <div className="viewport-indicator-selected">
                    Selected: {users.find((candidate) => candidate.id === selectedUserId)?.name || 'Unknown'}
                  </div>
                  <div className="viewport-indicator-hint">Click on other nodes to navigate</div>
                </>
              ) : (
                <div className="viewport-indicator-hint">Click on nodes to navigate</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrgChartPage() {
  return (
    <ReactFlowProvider>
      <OrgChart />
    </ReactFlowProvider>
  );
}
