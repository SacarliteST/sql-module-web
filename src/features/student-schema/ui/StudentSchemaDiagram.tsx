import { Loader } from '@mantine/core';
import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow, type NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useMemo, useState } from 'react';
import { layoutSchemaFlow, type SchemaFlowModel } from '../../schema-diagram/model';
import { SchemaTableNode } from '../../schema-diagram/ui';
import { studentSchemaToFlow } from '../model/student-schema-to-flow';
import type { StudentDatabaseSchema } from '../model/student-schema';
import styles from './StudentSchemaDiagram.module.css';

const nodeTypes: NodeTypes = { schemaTable: SchemaTableNode };

function DiagramCanvas({ schema }: { schema: StudentDatabaseSchema }) {
  const sourceModel = useMemo(() => studentSchemaToFlow(schema), [schema]);
  const [model, setModel] = useState<SchemaFlowModel>(sourceModel);
  const [isLayouting, setIsLayouting] = useState(true);
  const { fitView } = useReactFlow();

  useEffect(() => {
    let active = true;
    setIsLayouting(true);
    void layoutSchemaFlow(sourceModel).then((next) => {
      if (!active) return;
      setModel(next);
      setIsLayouting(false);
      requestAnimationFrame(() => void fitView({ duration: 250, padding: 0.15 }));
    });
    return () => { active = false; };
  }, [fitView, sourceModel]);

  return <div aria-label="ER-диаграмма учебной базы данных" className={styles.shell} role="region">
    {isLayouting ? <div className={styles.loading}><Loader size="sm" /><span>Располагаем таблицы…</span></div> : null}
    <ReactFlow
      className={styles.flow}
      edges={model.edges}
      elementsSelectable={false}
      fitView
      nodes={model.nodes}
      nodesConnectable={false}
      nodesDraggable={false}
      nodeTypes={nodeTypes}
      panOnDrag
      zoomOnDoubleClick={false}
    >
      <Background color="var(--mantine-color-gray-4)" gap={20} size={1} variant={BackgroundVariant.Dots} />
      <Controls showInteractive={false} />
      <MiniMap nodeColor="var(--mantine-color-blue-6)" pannable zoomable />
    </ReactFlow>
  </div>;
}

export default function StudentSchemaDiagram({ schema }: { schema: StudentDatabaseSchema }) {
  return <ReactFlowProvider><DiagramCanvas schema={schema} /></ReactFlowProvider>;
}
