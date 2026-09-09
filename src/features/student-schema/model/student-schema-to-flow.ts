import { MarkerType, type Edge } from '@xyflow/react';
import type { SchemaDiagramColumn, SchemaFlowModel, SchemaTableFlowNode } from '../../schema-diagram/model/schema-to-flow';
import { schemaColumnPairs, type StudentDatabaseSchema } from './student-schema';

export function studentSchemaToFlow(schema: StudentDatabaseSchema): SchemaFlowModel {
  const columnOwner = new Map<string, string>();
  const nodes = (schema.tables ?? []).flatMap<SchemaTableFlowNode>((table, tableIndex) => {
    if (!table.id) return [];
    const columns = (table.columns ?? []).flatMap<SchemaDiagramColumn>((column) => {
      if (!column.id) return [];
      columnOwner.set(column.id, table.id as string);
      return [{
        id: column.id,
        isPrimaryKey: Boolean(column.isPrimaryKey),
        isRequired: column.isNullable === false,
        name: column.name?.trim() || 'Колонка без названия',
        typeName: column.dataType?.trim() || 'Тип не указан',
      }];
    });
    return [{
      data: {
        columns,
        name: table.name?.trim() || 'Таблица без названия',
        tableId: table.id,
      },
      id: table.id,
      position: { x: tableIndex * 360, y: 0 },
      type: 'schemaTable',
    }];
  });

  const edges = (schema.foreignKeys ?? []).flatMap<Edge>((foreignKey, foreignKeyIndex) =>
    schemaColumnPairs(foreignKey).flatMap<Edge>((pair, pairIndex) => {
      const sourceColumnId = pair.fromColumnId ?? '';
      const targetColumnId = pair.toColumnId ?? '';
      const source = foreignKey.fromTableId || columnOwner.get(sourceColumnId);
      const target = foreignKey.toTableId || columnOwner.get(targetColumnId);
      if (!source || !target || !sourceColumnId || !targetColumnId) return [];
      return [{
        id: foreignKey.id ? `${foreignKey.id}-${pairIndex}` : `foreign-key-${foreignKeyIndex}-${pairIndex}`,
        label: pairIndex === 0 ? foreignKey.name?.trim() || 'FK' : undefined,
        labelStyle: { fontSize: 11, fontWeight: 600 },
        markerEnd: { type: MarkerType.ArrowClosed },
        source,
        sourceHandle: `source-${sourceColumnId}`,
        style: { strokeWidth: 1.5 },
        target,
        targetHandle: `target-${targetColumnId}`,
        type: 'smoothstep',
      }];
    }),
  );

  return { edges, nodes };
}
