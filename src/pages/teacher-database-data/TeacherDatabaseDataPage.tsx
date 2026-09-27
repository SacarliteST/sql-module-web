import { Stack } from '@mantine/core';
import { useParams } from 'react-router-dom';
import { TeacherTableDataEditor } from '../../features/schema-editor';
import { Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

export function TeacherDatabaseDataPage() {
  const { targetDbId = '' } = useParams<{ targetDbId: string }>();
  return <Page><Stack gap="lg"><PageBreadcrumbs items={[{ label: 'Учебные базы', to: '/teacher/databases' }, { label: 'База', to: `/teacher/databases/${targetDbId}` }, { label: 'Данные' }]} /><PageHeader title="Учебные данные" description="Постраничное заполнение строк с атомарным пакетным сохранением." /><TeacherTableDataEditor targetDbId={targetDbId} /></Stack></Page>;
}
