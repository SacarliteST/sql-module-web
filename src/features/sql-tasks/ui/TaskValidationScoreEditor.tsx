import { Alert, Badge, Button, Checkbox, Group, NumberInput, Select, Stack, Table, Text, Title } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useGetDbmsValidationCapabilities } from '../../../api/sqlmodule/dbms-catalog/dbms-catalog';
import { HintGroup, ValidationCheckKind, type TaskValidationPreviewResponse, type ValidationCheckRequest } from '../../../api/sqlmodule/model';
import { useGetTargetDbSchema } from '../../../api/sqlmodule/schema/schema';
import { getGetTaskValidationQueryKey, useGetTaskValidation, usePreviewTaskValidation, usePublishTaskValidation, useUpdateTaskValidation } from '../../../api/sqlmodule/training-validation/training-validation';
import { getHintGroupLabel, getSqlConstructLabel, getValidationCheckKindLabel, getValidationCheckStatusLabel, getValidationConfigurationStateLabel, toValidationCapabilitiesModel } from '../../../entities/sql-task';
import { AppCard } from '../../../shared/ui';
import { formatAuditDateTime } from '../../../shared/lib/teacher-audit';
import { problemCode } from '../../student-errors';

type DraftCheck = ValidationCheckRequest & { clientId: string };

const isWhole = (value: number | null | undefined) => Number.isInteger(value);
const problemText = (problem: { detail?: string | null; title?: string | null; violations?: { path?: string | null; message?: string | null }[] }, fallback: string) => {
  const violations = problem.violations?.map(({ path, message }) => `${path ? `${path}: ` : ''}${message ?? ''}`).filter(Boolean);
  return violations?.length ? violations.join(' ') : problem.detail?.trim() || problem.title?.trim() || fallback;
};

export function TaskValidationScoreEditor({ taskId, targetDbId }: { taskId: string; targetDbId: string | null }) {
  const queryClient = useQueryClient();
  const configurationQuery = useGetTaskValidation(taskId, { query: { enabled: Boolean(taskId), retry: false } });
  const schemaQuery = useGetTargetDbSchema(targetDbId ?? '', { query: { enabled: Boolean(targetDbId), retry: false } });
  const schema = schemaQuery.data?.status === 200 ? schemaQuery.data.data : null;
  const capabilitiesQuery = useGetDbmsValidationCapabilities(schema?.dbmsId ?? '', { query: { enabled: Boolean(schema?.dbmsId), retry: false } });
  const saveMutation = useUpdateTaskValidation();
  const previewMutation = usePreviewTaskValidation();
  const publishMutation = usePublishTaskValidation();
  const configuration = configurationQuery.data?.status === 200 ? configurationQuery.data.data : null;
  const capabilities = capabilitiesQuery.data?.status === 200
    ? toValidationCapabilitiesModel(capabilitiesQuery.data.data)
    : null;
  const [checks, setChecks] = useState<DraftCheck[]>([]);
  const [passingScore, setPassingScore] = useState<number | string>(0);
  const [maxAttempts, setMaxAttempts] = useState<number | string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [addKind, setAddKind] = useState<string | null>(null);
  const [visibleHintGroups, setVisibleHintGroups] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ fingerprint: string; result: TaskValidationPreviewResponse } | null>(null);
  const [publishKey, setPublishKey] = useState<{ version: string; key: string } | null>(null);
  const [staleVersion, setStaleVersion] = useState(false);

  useEffect(() => {
    if (!configuration) return;
    setChecks(configuration.checks.map((check) => ({
      clientId: check.id,
      id: check.id,
      kind: check.kind,
      value: check.value,
      weight: check.weight,
      order: check.order,
    })));
    setPassingScore(configuration.passingScore);
    setMaxAttempts(configuration.maxAttempts ?? '');
    setVisibleHintGroups(configuration.visibleHintGroups);
    setError('');
    setStaleVersion(false);
  }, [configuration]);

  const weightSum = checks.reduce((total, check) => total + (Number(check.weight) || 0), 0);
  const resultCount = checks.filter((check) => check.kind === ValidationCheckKind.MainDatasetResult).length;
  const parsedMaxAttempts = maxAttempts === '' ? null : Number(maxAttempts);
  const tableOptions = useMemo(() => schema?.tables.map((table) => ({ value: table.id, label: table.name })) ?? [], [schema]);
  const structuralChecks = checks.filter((check) => check.kind !== ValidationCheckKind.MainDatasetResult);
  const duplicateKeys = new Set<string>();
  const hasDuplicate = structuralChecks.some((check) => {
    const key = `${check.kind}:${check.value}`;
    if (duplicateKeys.has(key)) return true;
    duplicateKeys.add(key);
    return false;
  });
  const hasConflict = structuralChecks.some((check) => {
    const opposite = check.kind === ValidationCheckKind.RequiredConstruct ? ValidationCheckKind.ForbiddenConstruct
      : check.kind === ValidationCheckKind.ForbiddenConstruct ? ValidationCheckKind.RequiredConstruct
      : check.kind === ValidationCheckKind.RequiredTable ? ValidationCheckKind.ForbiddenTable
      : ValidationCheckKind.RequiredTable;
    return duplicateKeys.has(`${opposite}:${check.value}`);
  });
  const hasUnsupportedCheck = checks.some((check) => {
    if (!capabilities?.checkKindOptions.some(({ value }) => value === check.kind)) return true;
    if (check.kind === ValidationCheckKind.MainDatasetResult) return Boolean(check.value);
    if (check.kind === ValidationCheckKind.RequiredConstruct || check.kind === ValidationCheckKind.ForbiddenConstruct) {
      return !capabilities.constructOptions.some(({ value }) => value === check.value);
    }
    return !tableOptions.some(({ value }) => value === check.value);
  });
  const hasUnsupportedHint = visibleHintGroups.some((group) => !capabilities?.hintGroupOptions.some(({ value }) => value === group));
  const draftFingerprint = JSON.stringify({
    passingScore: Number(passingScore), maxAttempts: parsedMaxAttempts,
    visibleHintGroups: [...visibleHintGroups].sort(),
    checks: checks.map((check, order) => ({ id: check.id, kind: check.kind, value: check.value || null, weight: check.weight, order })),
  });
  const savedFingerprint = configuration ? JSON.stringify({
    passingScore: configuration.passingScore, maxAttempts: configuration.maxAttempts,
    visibleHintGroups: [...configuration.visibleHintGroups].sort(),
    checks: configuration.checks.map((check, order) => ({ id: check.id, kind: check.kind, value: check.value || null, weight: check.weight, order })),
  }) : null;
  const previewIsCurrent = preview?.fingerprint === draftFingerprint;
  const previewPassed = Boolean(previewIsCurrent && preview?.result.isValid && preview.result.referenceScore === 100);
  const isValid = Boolean(
    capabilities?.canConfigure &&
    Boolean(schema) && !hasDuplicate && !hasConflict && !hasUnsupportedCheck && !hasUnsupportedHint &&
    resultCount === 1 &&
    weightSum === 100 &&
    isWhole(Number(passingScore)) && Number(passingScore) >= 0 && Number(passingScore) <= 100 &&
    (parsedMaxAttempts === null || (isWhole(parsedMaxAttempts) && parsedMaxAttempts >= 1 && parsedMaxAttempts <= capabilities.maxAttemptsLimit)) &&
    checks.every((check) => isWhole(check.weight) && Number(check.weight) > 0 &&
      (check.kind === ValidationCheckKind.MainDatasetResult || Boolean(check.value?.trim())))
  );
  const kindOptions = useMemo(() => capabilities?.checkKindOptions.filter(({ value }) => value !== ValidationCheckKind.MainDatasetResult) ?? [], [capabilities]);

  const addCheck = () => {
    if (!addKind || !kindOptions.some(({ value }) => value === addKind)) return;
    setChecks((current) => [...current, { clientId: crypto.randomUUID(), id: null, kind: addKind as ValidationCheckRequest['kind'], value: '', weight: 1, order: current.length }]);
    setAddKind(null);
    setSuccess('');
  };

  const runPreview = async () => {
    if (!isValid || previewMutation.isPending) return;
    setError('');
    setSuccess('');
    try {
      const response = await previewMutation.mutateAsync({
        taskId,
        data: {
          passingScore: Number(passingScore),
          maxAttempts: parsedMaxAttempts,
          visibleHintGroups: visibleHintGroups as HintGroup[],
          checks: checks.map((check, order) => ({
            id: check.id, clientKey: check.clientId, kind: check.kind,
            value: check.value, weight: check.weight, order,
          })),
        },
      });
      if (response.status !== 200) {
        setError(problemText(response.data, response.status === 503 ? 'Анализатор временно недоступен.' : 'Не удалось проверить эталон.'));
        return;
      }
      setPreview({ fingerprint: draftFingerprint, result: response.data });
    } catch {
      setError('Проверка эталона временно недоступна. Повторите запрос позже.');
    }
  };

  const save = async () => {
    if (!configuration || !isValid || !previewPassed || saveMutation.isPending) return;
    setError('');
    setSuccess('');
    try {
      const response = await saveMutation.mutateAsync({
        taskId,
        data: {
          version: configuration.version,
          passingScore: Number(passingScore),
          maxAttempts: parsedMaxAttempts,
          visibleHintGroups: visibleHintGroups as HintGroup[],
          checks: checks.map(({ clientId: _clientId, ...check }, order) => ({ ...check, order })),
        },
      });
      if (response.status !== 200) {
        if (response.status === 409 && problemCode(response.data) === 'TaskValidation.StaleVersion') setStaleVersion(true);
        setError(problemText(response.data, 'Не удалось сохранить правила оценки.'));
        return;
      }
      setPreview(null);
      await queryClient.invalidateQueries({ queryKey: getGetTaskValidationQueryKey(taskId) });
      setSuccess('Черновик сохранён. Проверьте сохранённую версию эталоном ещё раз перед публикацией.');
    } catch {
      setError('Не удалось связаться с SQL Module API. Изменения остались в форме.');
    }
  };

  const publish = async () => {
    if (!configuration || !previewPassed || savedFingerprint !== draftFingerprint ||
      !configuration.hasUnpublishedChanges || publishMutation.isPending) return;
    setError('');
    setSuccess('');
    const key = publishKey?.version === configuration.version ? publishKey.key : crypto.randomUUID();
    setPublishKey({ version: configuration.version, key });
    try {
      const response = await publishMutation.mutateAsync({
        taskId, data: { version: configuration.version }, headers: { 'Idempotency-Key': key },
      });
      if (response.status !== 200) {
        if (response.status === 409 && problemCode(response.data) === 'TaskValidation.StaleVersion') setStaleVersion(true);
        setError(problemText(response.data, 'Не удалось опубликовать правила проверки.'));
        return;
      }
      setPublishKey(null);
      setPreview(null);
      await queryClient.invalidateQueries({ queryKey: getGetTaskValidationQueryKey(taskId) });
      setSuccess(`Версия ${response.data.validationVersionNumber ?? ''} опубликована для новых прохождений. Если задание ещё в черновике, отдельно нажмите «Опубликовать задание» вверху страницы.`);
    } catch {
      setError('Ответ о публикации не получен. Повтор использует тот же ключ операции.');
    }
  };

  return <AppCard p="md"><Stack gap="md">
    <Group justify="space-between"><Title order={2} size="h5">Оценка решения</Title><Badge variant="light">{configuration ? getValidationConfigurationStateLabel(configuration.state) : '—'}</Badge></Group>
    <Text size="sm" c="dimmed">Настройте правила, проверьте эталон, сохраните черновик и опубликуйте проверку. Это не публикует само задание: чтобы оно стало доступно студентам, отдельно нажмите «Опубликовать задание» вверху страницы.</Text>
    {configuration ? <Stack gap="xs">
      <Group gap="xs"><Badge color={configuration.validationVersionId ? 'green' : 'yellow'} variant="light">{configuration.validationVersionId ? `Активная версия №${configuration.validationVersionNumber ?? '—'}` : 'Нет активной версии'}</Badge>{configuration.hasUnpublishedChanges ? <Badge color="orange" variant="light">Есть неопубликованные изменения</Badge> : null}</Group>
      <Text size="sm">Опубликована: {formatAuditDateTime(configuration.publishedAt)}{configuration.validationVersionId ? ` · ID: ${configuration.validationVersionId}` : ''}</Text>
      <Text size="sm">Текущая конфигурация: проходной балл {configuration.passingScore} из 100; попыток {configuration.maxAttempts ?? 'без лимита'}.</Text>
      <Text size="sm">Веса: {configuration.checks.map((check) => `${getValidationCheckKindLabel(check.kind)}${check.valueDisplayName ? ` (${check.valueDisplayName})` : ''} — ${check.weight}`).join('; ') || 'не заданы'}.</Text>
      {configuration.hasUnpublishedChanges ? <Alert color="yellow">Показанные баллы и веса относятся к черновику. Активная версия для новых прохождений может отличаться до публикации.</Alert> : null}
      {checks.length > 0 && savedFingerprint !== draftFingerprint ? <Alert color="blue">В форме есть несохранённые изменения. Они не применяются к студентам.</Alert> : null}
    </Stack> : null}
    {!targetDbId ? <Alert color="yellow">Не удалось определить учебную базу. Сохранение недоступно.</Alert> : null}
    {configurationQuery.isPending || capabilitiesQuery.isPending || schemaQuery.isPending ? <Text size="sm">Загружаем правила оценки и схему…</Text> : null}
    {configurationQuery.isError || capabilitiesQuery.isError || schemaQuery.isError || (configurationQuery.data && configurationQuery.data.status !== 200) || (capabilitiesQuery.data && capabilitiesQuery.data.status !== 200) || (schemaQuery.data && schemaQuery.data.status !== 200) ? <Alert color="red">Не удалось загрузить конфигурацию, возможности СУБД или схему базы.</Alert> : null}
    {capabilities && !capabilities.canConfigure ? <Alert color="red">СУБД вернула неподдерживаемые возможности проверки. Сохранение отключено.</Alert> : null}
    {configuration && capabilities && schema ? <>
      <Group grow align="start"><NumberInput label="Проходной балл" min={0} max={100} value={passingScore} onChange={(value) => { setPassingScore(value); setSuccess(''); }} /><NumberInput label="Лимит попыток" description="Оставьте пустым для неограниченного числа попыток" min={1} max={capabilities.maxAttemptsLimit} value={maxAttempts} onChange={(value) => { setMaxAttempts(value); setSuccess(''); }} /></Group>
      <Table.ScrollContainer minWidth={650}><Table striped><Table.Thead><Table.Tr><Table.Th>Критерий</Table.Th><Table.Th>Значение</Table.Th><Table.Th>Вес</Table.Th><Table.Th /></Table.Tr></Table.Thead><Table.Tbody>{checks.map((check, index) => <Table.Tr key={check.clientId}><Table.Td>{getValidationCheckKindLabel(check.kind)}</Table.Td><Table.Td>{check.kind === ValidationCheckKind.MainDatasetResult ? <Text size="sm" c="dimmed">Основной набор данных</Text> : <Select aria-label={`Значение критерия ${index + 1}`} placeholder={check.kind === ValidationCheckKind.RequiredTable || check.kind === ValidationCheckKind.ForbiddenTable ? 'Выберите таблицу' : 'Выберите конструкцию'} data={check.kind === ValidationCheckKind.RequiredTable || check.kind === ValidationCheckKind.ForbiddenTable ? tableOptions : capabilities.constructOptions} value={check.value ?? null} onChange={(value) => setChecks((current) => current.map((item) => item.clientId === check.clientId ? { ...item, value: value ?? '' } : item))} searchable clearable />}</Table.Td><Table.Td><NumberInput aria-label={`Вес критерия ${index + 1}`} min={1} max={100} w={105} value={check.weight ?? ''} onChange={(value) => setChecks((current) => current.map((item) => item.clientId === check.clientId ? { ...item, weight: typeof value === 'number' ? value : null } : item))} /></Table.Td><Table.Td>{check.kind !== ValidationCheckKind.MainDatasetResult ? <Button size="xs" color="red" variant="subtle" onClick={() => setChecks((current) => current.filter((item) => item.clientId !== check.clientId))}>Удалить</Button> : null}</Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>
      <Group><Select label="Добавить критерий" placeholder="Выберите тип" data={kindOptions} value={addKind} onChange={setAddKind} searchable clearable disabled={!capabilities.canConfigure} /><Button variant="light" disabled={!addKind || !capabilities.canConfigure} onClick={addCheck}>Добавить</Button></Group>
      <Stack gap="xs"><Text fw={600}>Подсказки студенту</Text><Text size="sm" c="dimmed">Критерии проверяются всегда; этот выбор влияет только на видимость правил и диагностики.</Text><Checkbox.Group value={visibleHintGroups} onChange={(value) => { setVisibleHintGroups(value); setSuccess(''); }}><Group>{capabilities.hintGroupOptions.map(({ value, label }) => <Checkbox key={value} value={value} label={label} />)}</Group></Checkbox.Group></Stack>
      <Alert color="blue" title="Что увидит студент"><Stack gap={4}>{visibleHintGroups.length === 0 ? <Text size="sm">Подсказки скрыты.</Text> : visibleHintGroups.map((group) => { const matching = checks.filter((check) => group === HintGroup.RequiredConstructs ? check.kind === ValidationCheckKind.RequiredConstruct : group === HintGroup.ForbiddenConstructs ? check.kind === ValidationCheckKind.ForbiddenConstruct : group === HintGroup.RequiredTables ? check.kind === ValidationCheckKind.RequiredTable : group === HintGroup.ForbiddenTables ? check.kind === ValidationCheckKind.ForbiddenTable : check.kind === ValidationCheckKind.MainDatasetResult); return <Text key={group} size="sm">{getHintGroupLabel(group)}: {group === HintGroup.Result ? 'результат проверки' : matching.length ? matching.map((check) => group === HintGroup.RequiredTables || group === HintGroup.ForbiddenTables ? tableOptions.find(({ value }) => value === check.value)?.label ?? 'Неизвестная таблица' : getSqlConstructLabel(check.value)).join(', ') : 'правила не заданы'}</Text>; })}</Stack></Alert>
      <Group justify="space-between"><Text c={weightSum === 100 ? 'green' : 'red'} fw={600}>Сумма весов: {weightSum} из 100</Text><Group><Button variant="light" disabled={!isValid} loading={previewMutation.isPending} onClick={() => void runPreview()}>Проверить эталон</Button><Button disabled={staleVersion || !isValid || !previewPassed || savedFingerprint === draftFingerprint} loading={saveMutation.isPending} onClick={() => void save()}>Сохранить черновик</Button><Button disabled={staleVersion || !previewPassed || savedFingerprint !== draftFingerprint || !configuration.hasUnpublishedChanges} loading={publishMutation.isPending} onClick={() => void publish()}>Опубликовать проверку</Button></Group></Group>
      {previewIsCurrent && preview ? <Alert color={previewPassed ? 'green' : 'red'} title={`Эталон: ${preview.result.referenceScore} из 100`}><Stack gap={4}><Text size="sm">Анализатор: {preview.result.analyzerVersion}</Text>{preview.result.checks.map((check, index) => <Text key={check.checkId ?? check.clientKey ?? index} size="sm">{getValidationCheckKindLabel(check.kind)} — {getValidationCheckStatusLabel(check.status)}, {check.awardedScore} баллов{check.message ? `: ${check.message}` : ''}</Text>)}{preview.result.violations.map((violation, index) => <Text key={`${violation.path}-${index}`} size="sm" c="red">{violation.path}: {violation.message}</Text>)}</Stack></Alert> : preview ? <Alert color="yellow">Правила изменены после проверки. Запустите preview ещё раз.</Alert> : null}
      {staleVersion ? <Alert color="yellow">Версия изменилась на сервере. Перезагрузите актуальные правила перед повтором.<Button size="xs" ml="sm" variant="light" onClick={() => void configurationQuery.refetch()}>Перезагрузить</Button></Alert> : null}
      {resultCount !== 1 ? <Alert color="red">Критерий результата должен присутствовать ровно один раз.</Alert> : null}
      {hasDuplicate ? <Alert color="red">Одинаковые критерии нельзя добавлять дважды.</Alert> : null}
      {hasConflict ? <Alert color="red">Одну конструкцию или таблицу нельзя одновременно требовать и запрещать.</Alert> : null}
      {hasUnsupportedCheck || hasUnsupportedHint ? <Alert color="red">В конфигурации есть значение, которое отсутствует в возможностях СУБД или текущей схеме. Сохранение отключено.</Alert> : null}
      {error ? <Alert color="red">{error}</Alert> : null}{success ? <Alert color="green">{success}</Alert> : null}
    </> : null}
  </Stack></AppCard>;
}
