import { ActionIcon, Loader, Tooltip } from '@mantine/core';
import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow, type NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useMemo, useState } from 'react';
import type { PhysicalTypeResponse, SchemaUpsertRequest } from '../../../api/sqlmodule/model';
import { layoutSchemaFlow, schemaToFlow, type SchemaFlowModel } from '../model';
import { SchemaTableNode } from './SchemaTableNode';
import styles from './SchemaDiagram.module.css';

const nodeTypes: NodeTypes = { schemaTable: SchemaTableNode };
type Props = { draft: SchemaUpsertRequest; physicalTypes: PhysicalTypeResponse[] };

function DiagramCanvas({ draft, physicalTypes }: Props) {
  const sourceModel = useMemo(() => schemaToFlow(draft, physicalTypes), [draft, physicalTypes]);
  const [model, setModel] = useState<SchemaFlowModel>(sourceModel);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [isLayouting, setIsLayouting] = useState(true);
  const { fitView } = useReactFlow();

  useEffect(() => {
    let active = true;
    setIsLayouting(true);
    void layoutSchemaFlow(sourceModel).then((next) => {
      if (!active) return;
      setModel(next);
      setIsLayouting(false);
      requestAnimationFrame(() => void fitView({ padding: 0.15, duration: 250 }));
    });
    return () => { active = false; };
  }, [fitView, layoutVersion, sourceModel]);

  if (!sourceModel.nodes.length) return <div className={styles.empty}>Добавьте хотя бы одну таблицу, чтобы увидеть диаграмму.</div>;

  return <>
    <div className={styles.toolbar}>
      <Tooltip label="Выполнить автоматическую раскладку заново">
        <ActionIcon aria-label="Расположить таблицы автоматически" loading={isLayouting} onClick={() => setLayoutVersion((value) => value + 1)} variant="filled">↻</ActionIcon>
      </Tooltip>
    </div>
    {isLayouting ? <div className={styles.loading}><Loader size="sm" /></div> : null}
    <ReactFlow className={styles.flow} edges={model.edges} elementsSelectable fitView nodes={model.nodes} nodesConnectable={false} nodesDraggable={false} nodeTypes={nodeTypes} panOnDrag zoomOnDoubleClick={false}>
      <Background color="var(--mantine-color-gray-4)" gap={20} size={1} variant={BackgroundVariant.Dots} />
      <Controls showInteractive={false} />
      <MiniMap nodeColor="var(--mantine-color-blue-6)" pannable zoomable />
    </ReactFlow>
  </>;
}

export default function SchemaDiagram(props: Props) {
  return <div className={styles.shell}><ReactFlowProvider><DiagramCanvas {...props} /></ReactFlowProvider></div>;
}
