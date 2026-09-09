import { Stack } from '@mantine/core';
import { useParams } from 'react-router-dom';
import { TeacherSchemaEditor } from '../../features/schema-editor';
import { TeacherContourTabs } from '../../features/teacher-contour';
import { Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

export function TeacherDatabaseSchemaPage() {
  const { targetDbId = '' } = useParams<{ targetDbId: string }>();
  return <Page><Stack gap="lg"><PageBreadcrumbs items={[{ label: 'Учебные базы', to: '/teacher/databases' }, { label: 'База', to: `/teacher/databases/${targetDbId}` }, { label: 'Схема' }]} /><PageHeader title="Схема учебной базы" description="Составление, проверка и атомарное применение структуры базы." /><TeacherContourTabs /><TeacherSchemaEditor targetDbId={targetDbId} /></Stack></Page>;
}
