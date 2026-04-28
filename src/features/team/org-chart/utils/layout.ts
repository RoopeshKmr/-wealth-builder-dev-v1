import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';

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
  licensed: boolean;
  hasProduction: boolean;
  childCount: number;
  children: TreeNode[];
}

interface LayoutOptions {
  focusNodeId?: string | null;
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number;
  nodeSep?: number;
}

export function treeToFlowElements(tree: TreeNode | null, options: LayoutOptions = {}) {
  const { focusNodeId = null } = options;
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (!tree) {
    return { nodes, edges };
  }

  function traverse(node: TreeNode, parentId: string | null = null) {
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
        level: node.level || node.plan || '',
        isBrokerSubRoot: false,
        isFocused: node.id === focusNodeId,
        training: node.training,
        bigEvent: node.bigEvent,
        keyPlayer: node.keyPlayer,
        netLicenseAmount: node.netLicenseAmount,
        licensed: node.licensed,
        hasProduction: node.hasProduction,
        childCount: node.childCount,
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

    node.children.forEach((child) => traverse(child, node.id));
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
  const { nodes: rawNodes, edges } = treeToFlowElements(tree, options);
  const { nodes } = applyDagreLayout(rawNodes, edges, options);
  return { nodes, edges };
}

export function findNodePosition(nodes: Node[], nodeId: string) {
  const node = nodes.find((candidate) => candidate.id === nodeId);
  return node ? node.position : null;
}
