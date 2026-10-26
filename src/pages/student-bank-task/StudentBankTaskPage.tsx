import { Alert, Button, Skeleton, Stack } from '@mantine/core';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useGetStudentTaskByBankNumber } from '../../api/sqlmodule/student/student';
import { Page } from '../../shared/ui';

export function StudentBankTaskPage() {
  const rawNumber = useParams().bankNumber ?? '';
  const bankNumber = Number(rawNumber);
  const valid = Number.isSafeInteger(bankNumber) && bankNumber > 0;
  const query = useGetStudentTaskByBankNumber(bankNumber, { query: { enabled: valid, retry: false } });

  if (!valid) return <Page><Alert color="red" title="Неверный номер задания">Введите положительный номер задания.</Alert></Page>;
  if (query.isPending) return <Page><Stack><Skeleton height={72} /><Skeleton height={260} /></Stack></Page>;
  if (query.data?.status === 200 && query.data.data.id) return <Navigate replace to={`/student/tasks/${query.data.data.id}`} />;
  return <Page><Stack><Alert color="yellow" title="Задание не найдено">Открытого задания с номером {bankNumber} нет.</Alert><Button component={Link} to="/student/tasks" variant="default">В банк заданий</Button></Stack></Page>;
}
