import ELK from 'elkjs/lib/elk.bundled.js';
import type { SchemaFlowModel, SchemaTableFlowNode } from './schema-to-flow';

const elk = new ELK();
const TABLE_WIDTH = 290;
const TABLE_HEADER_HEIGHT = 38;
const COLUMN_HEIGHT = 34;
const EMPTY_HEIGHT = 42;

function tableHeight(node: SchemaTableFlowNode): number {
  return TABLE_HEADER_HEIGHT + (node.data.columns.length
    ? node.data.columns.length * COLUMN_HEIGHT
    : EMPTY_HEIGHT);
}

export async function layoutSchemaFlow(model: SchemaFlowModel): Promise<SchemaFlowModel> {
  if (!model.nodes.length) return model;

  const graph = await elk.layout({
    id: 'schema',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '70',
      'elk.layered.spacing.nodeNodeBetweenLayers': '110',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    },
    children: model.nodes.map((node) => ({
      id: node.id,
      width: TABLE_WIDTH,
      height: tableHeight(node),
    })),
    edges: model.edges.map((edge) => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })),
  });

  const positions = new Map(
    graph.children?.map((node) => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]) ?? [],
  );
  return {
    nodes: model.nodes.map((node) => ({ ...node, position: positions.get(node.id) ?? node.position })),
    edges: model.edges,
  };
}
