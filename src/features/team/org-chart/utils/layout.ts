import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';
import type { LevelCount } from '../services/org-chart-service';

export interface TreeNode {
  id: string;
  name: string;
  plan: string;
  level: string;
  agencyCode: string;
  email: string;
  profilePicture: string;
  photoURL: string;
  training: boolean;
  bigEvent: boolean;
  keyPlayer: boolean;
  netLicenseAmount: number;
  netLicensed: boolean;
  licensed: boolean;
  hasProduction: boolean;
  client: boolean;
  childCount: number;
  children: TreeNode[];
  roles?: string[];
  levelCounts?: LevelCount[];
}

interface LayoutOptions {
  focusNodeId?: string | null;
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number;
  nodeSep?: number;
  collapsedNodeIds?: Set<string>;
  depthLimitedNodeIds?: Set<string>;
  visibleNodeIds?: Set<string>;
}

export function treeToFlowElements(tree: TreeNode | null, options: LayoutOptions = {}) {
  const { 
    focusNodeId = null,
    collapsedNodeIds = new Set(),
    depthLimitedNodeIds = new Set(),
    visibleNodeIds,
  } = options;
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (!tree) {
    return { nodes, edges };
  }

  function traverse(node: TreeNode, parentId: string | null = null) {
    // If we have explicit visible nodes list, only add if visible
    if (visibleNodeIds && !visibleNodeIds.has(node.id)) {
      return;
    }

    const flowNode: Node = {
      id: node.id,
      type: 'custom',
      data: {
        name: node.name,
        plan: node.plan,
        agencyCode: node.agencyCode,
        email: node.email,
        profilePicture: node.profilePicture || node.photoURL || '',
        photoURL: node.photoURL || node.profilePicture || '',
        level: node.level || node.roles?.[0] || '',
        isBrokerSubRoot: false,
        isFocused: node.id === focusNodeId,
        training: node.training,
        bigEvent: node.bigEvent,
        keyPlayer: node.keyPlayer,
        netLicenseAmount: node.netLicenseAmount,
        netLicensed: node.netLicensed,
        licensed: node.licensed,
        hasProduction: node.hasProduction,
        client: node.client,
        childCount: node.childCount,
        levelCounts: node.levelCounts || [],
      },
      position: { x: 0, y: 0 },
    };

    nodes.push(flowNode);

    if (parentId) {
      edges.push({
        id: `${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      });
    }

    // Only traverse children if node is not collapsed or depth-limited
    if (!collapsedNodeIds.has(node.id) && !depthLimitedNodeIds.has(node.id)) {
      node.children.forEach((child) => traverse(child, node.id));
    }
  }

  traverse(tree);
  return { nodes, edges };
}

export function applyDagreLayout(nodes: Node[], edges: Edge[], options: LayoutOptions = {}) {
  const {
    nodeWidth = 180,
    nodeHeight = 220,
    rankSep = 120,
    nodeSep = 100,
  } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: 'TB',
    ranksep: rankSep,
    nodesep: nodeSep,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

export function layoutTree(tree: TreeNode | null, options: LayoutOptions = {}) {
  const {
    collapsedNodeIds = new Set(),
    depthLimitedNodeIds = new Set(),
    visibleNodeIds,
    nodeWidth = 180,
    nodeHeight = 220,
    rankSep = 120,
    nodeSep = 100,
  } = options;

  if (!tree) {
    return { nodes: [] as Node[], edges: [] as Edge[] };
  }

  // Build a visible-only logical tree.
  type LayoutInput = { node: TreeNode; children: LayoutInput[] };
  const buildLayoutTree = (node: TreeNode): LayoutInput | null => {
    if (visibleNodeIds && !visibleNodeIds.has(node.id)) return null;
    const stop = collapsedNodeIds.has(node.id) || depthLimitedNodeIds.has(node.id);
    const children: LayoutInput[] = stop
      ? []
      : node.children
          .map(buildLayoutTree)
          .filter((value): value is LayoutInput => value !== null);
    return { node, children };
  };

  const root = buildLayoutTree(tree);
  if (!root) return { nodes: [] as Node[], edges: [] as Edge[] };

  // Custom org-chart layout (post-order):
  //   width(subtree) = max(nodeWidth, sum(child subtree widths) + gaps)
  // Each subtree reserves a horizontal slot of that width, so siblings on every
  // level are pushed apart by the full bounding-box width of their neighbours'
  // subtrees — exactly the "rectangular org chart" look the user wants.
  interface LaidOut {
    node: TreeNode;
    x: number; // center x within the laid-out coordinate space
    y: number; // top y of node
    width: number; // bounding-box width of this subtree
    children: LaidOut[];
  }

  const translate = (laid: LaidOut, dx: number) => {
    laid.x += dx;
    laid.children.forEach((child) => translate(child, dx));
  };

  const layoutSubtree = (input: LayoutInput, depth: number): LaidOut => {
    const y = depth * (nodeHeight + rankSep);

    if (input.children.length === 0) {
      return {
        node: input.node,
        x: nodeWidth / 2,
        y,
        width: nodeWidth,
        children: [],
      };
    }

    const children = input.children.map((child) => layoutSubtree(child, depth + 1));

    // Place children left-to-right starting at x = 0 within this subtree's
    // local coordinate space.
    let cursor = 0;
    children.forEach((child, index) => {
      if (index > 0) cursor += nodeSep;
      const childLeftEdge = child.x - child.width / 2;
      translate(child, cursor - childLeftEdge);
      cursor += child.width;
    });

    const childrenSpan = cursor;
    const subtreeWidth = Math.max(nodeWidth, childrenSpan);

    // If the parent box is wider than the children cluster, center the
    // cluster under the parent.
    if (subtreeWidth > childrenSpan) {
      const offset = (subtreeWidth - childrenSpan) / 2;
      children.forEach((child) => translate(child, offset));
    }

    return {
      node: input.node,
      x: subtreeWidth / 2,
      y,
      width: subtreeWidth,
      children,
    };
  };

  const positioned = layoutSubtree(root, 0);

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const emit = (laid: LaidOut, parentId: string | null) => {
    const sourceNode = laid.node;
    nodes.push({
      id: sourceNode.id,
      type: 'custom',
      data: {
        name: sourceNode.name,
        plan: sourceNode.plan,
        agencyCode: sourceNode.agencyCode,
        email: sourceNode.email,
        profilePicture: sourceNode.profilePicture || sourceNode.photoURL || '',
        photoURL: sourceNode.photoURL || sourceNode.profilePicture || '',
        level: sourceNode.level || sourceNode.roles?.[0] || '',
        isBrokerSubRoot: false,
        isFocused: sourceNode.id === options.focusNodeId,
        training: sourceNode.training,
        bigEvent: sourceNode.bigEvent,
        keyPlayer: sourceNode.keyPlayer,
        netLicenseAmount: sourceNode.netLicenseAmount,
        netLicensed: sourceNode.netLicensed,
        licensed: sourceNode.licensed,
        hasProduction: sourceNode.hasProduction,
        client: sourceNode.client,
        childCount: sourceNode.childCount,
        levelCounts: sourceNode.levelCounts || [],
      },
      // React Flow expects top-left corner.
      position: {
        x: laid.x - nodeWidth / 2,
        y: laid.y,
      },
    });

    if (parentId) {
      edges.push({
        id: `${parentId}-${sourceNode.id}`,
        source: parentId,
        target: sourceNode.id,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      });
    }

    laid.children.forEach((child) => emit(child, sourceNode.id));
  };

  emit(positioned, null);

  return { nodes, edges };
}

export function findNodePosition(nodes: Node[], nodeId: string) {
  const node = nodes.find((candidate) => candidate.id === nodeId);
  return node ? node.position : null;
}
