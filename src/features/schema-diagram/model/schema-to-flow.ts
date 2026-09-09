import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { PhysicalTypeResponse, SchemaUpsertRequest } from '../../../api/sqlmodule/model';

export type SchemaDiagramColumn = {
  id: string;
  name: string;
  typeName: string;
  isPrimaryKey: boolean;
  isRequired: boolean;
};

export type SchemaTableNodeData = Record<string, unknown> & {
  tableId: string;
  name: string;
  columns: SchemaDiagramColumn[];
};

export type SchemaTableFlowNode = Node<SchemaTableNodeData, 'schemaTable'>;

export type SchemaFlowModel = {
  nodes: SchemaTableFlowNode[];
  edges: Edge[];
};

function entityRef(entity: { id?: string | null; tempId?: string | null }): string {
  return entity.id ?? entity.tempId ?? '';
}

export function schemaToFlow(
  draft: SchemaUpsertRequest,
  physicalTypes: PhysicalTypeResponse[],
): SchemaFlowModel {
  const typeNameById = new Map(
    physicalTypes
      .filter((type) => type.id)
      .map((type) => [type.id as string, type.typeName?.trim() || 'Тип не указан']),
  );

  const columnOwner = new Map<string, string>();
  const nodes = (draft.tables ?? []).flatMap<SchemaTableFlowNode>((table, tableIndex) => {
    const tableId = entityRef(table);
    if (!tableId) return [];

    const columns = (table.columns ?? []).flatMap<SchemaDiagramColumn>((column) => {
      const columnId = entityRef(column);
      if (!columnId) return [];
      columnOwner.set(columnId, tableId);
      return [{
        id: columnId,
        name: column.name?.trim() || 'Колонка без названия',
        typeName: column.physicalTypeId
          ? typeNameById.get(column.physicalTypeId) ?? 'Неизвестный тип'
          : 'Тип не выбран',
        isPrimaryKey: Boolean(column.isPrimaryKey),
        isRequired: Boolean(column.isRequired),
      }];
    });

    return [{
      id: tableId,
      type: 'schemaTable',
      position: { x: tableIndex * 360, y: 0 },
      data: {
        tableId,
        name: table.name?.trim() || 'Таблица без названия',
        columns,
      },
    }];
  });

  const edges = (draft.relationships ?? []).flatMap<Edge>((relationship, index) => {
    const sourceColumnId = relationship.sourceColumnRef ?? '';
    const targetColumnId = relationship.targetColumnRef ?? '';
    const source = columnOwner.get(sourceColumnId);
    const target = columnOwner.get(targetColumnId);
    if (!source || !target) return [];

    return [{
      id: entityRef(relationship) || `relationship-${index}`,
      source,
      target,
      sourceHandle: `source-${sourceColumnId}`,
      targetHandle: `target-${targetColumnId}`,
      type: 'smoothstep',
      label: relationship.name?.trim() || 'FK',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 1.5 },
      labelStyle: { fontSize: 11, fontWeight: 600 },
    }];
  });

  return { nodes, edges };
}
