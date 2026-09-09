import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SchemaTableFlowNode } from '../model';
import styles from './SchemaTableNode.module.css';

export function SchemaTableNode({ data }: NodeProps<SchemaTableFlowNode>) {
  return (
    <div className={styles.node}>
      <div className={styles.header}>{data.name}</div>
      {data.columns.length ? data.columns.map((column) => (
        <div className={styles.column} key={column.id}>
          <Handle className={styles.handle} id={`target-${column.id}`} position={Position.Left} type="target" />
          <div className={styles.columnName} title={column.name}>
            {column.isPrimaryKey ? <span className={styles.key}>PK</span> : null}
            {column.name}{column.isRequired ? null : <span className={styles.nullable}> · NULL</span>}
          </div>
          <div className={styles.type}>{column.typeName}</div>
          <Handle className={styles.handle} id={`source-${column.id}`} position={Position.Right} type="source" />
        </div>
      )) : <div className={styles.empty}>Колонки не добавлены</div>}
    </div>
  );
}
