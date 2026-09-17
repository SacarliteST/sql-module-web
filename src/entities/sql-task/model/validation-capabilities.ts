import {
  FinalizationReason,
  HintGroup,
  ProgressStatus,
  SqlConstruct,
  ValidationCheckKind,
  ValidationCheckStatus,
  ValidationConfigurationState,
  type DbmsValidationCapabilitiesResponse,
} from '../../../api/sqlmodule/model';

type Option<T extends string> = { value: T; label: string };

const checkKindLabels: Record<ValidationCheckKind, string> = {
  [ValidationCheckKind.MainDatasetResult]: 'Результат на основной базе',
  [ValidationCheckKind.RequiredConstruct]: 'Обязательная конструкция',
  [ValidationCheckKind.ForbiddenConstruct]: 'Запрещённая конструкция',
  [ValidationCheckKind.RequiredTable]: 'Обязательная таблица',
  [ValidationCheckKind.ForbiddenTable]: 'Запрещённая таблица',
};

const constructLabels: Record<SqlConstruct, string> = {
  [SqlConstruct.Join]: 'JOIN',
  [SqlConstruct.InnerJoin]: 'INNER JOIN',
  [SqlConstruct.LeftJoin]: 'LEFT JOIN',
  [SqlConstruct.RightJoin]: 'RIGHT JOIN',
  [SqlConstruct.FullJoin]: 'FULL JOIN',
  [SqlConstruct.GroupBy]: 'GROUP BY',
  [SqlConstruct.Having]: 'HAVING',
  [SqlConstruct.Distinct]: 'DISTINCT',
  [SqlConstruct.Subquery]: 'Подзапрос',
  [SqlConstruct.Cte]: 'CTE (WITH)',
  [SqlConstruct.WindowFunction]: 'Оконная функция',
};

const hintGroupLabels: Record<HintGroup, string> = {
  [HintGroup.Result]: 'Результат запроса',
  [HintGroup.RequiredConstructs]: 'Обязательные конструкции',
  [HintGroup.ForbiddenConstructs]: 'Запрещённые конструкции',
  [HintGroup.RequiredTables]: 'Обязательные таблицы',
  [HintGroup.ForbiddenTables]: 'Запрещённые таблицы',
};

const checkStatusLabels: Record<ValidationCheckStatus, string> = {
  [ValidationCheckStatus.Passed]: 'Выполнен',
  [ValidationCheckStatus.Failed]: 'Не выполнен',
  [ValidationCheckStatus.NotEvaluated]: 'Не проверен',
};

const progressStatusLabels: Record<ProgressStatus, string> = {
  [ProgressStatus.Active]: 'В процессе',
  [ProgressStatus.Finalizing]: 'Завершается',
  [ProgressStatus.CompletionPending]: 'Ожидает передачи результата',
  [ProgressStatus.CompletionFailed]: 'Ошибка передачи результата',
  [ProgressStatus.Completed]: 'Завершено',
  [ProgressStatus.Expired]: 'Время истекло',
};

const finalizationReasonLabels: Record<FinalizationReason, string> = {
  [FinalizationReason.Manual]: 'Завершено студентом',
  [FinalizationReason.PerfectScore]: 'Получено 100 баллов',
  [FinalizationReason.AttemptsExhausted]: 'Попытки закончились',
  [FinalizationReason.Expired]: 'Истекло время',
  [FinalizationReason.EducationClosed]: 'Сессия закрыта платформой',
  [FinalizationReason.Restarted]: 'Начато новое прохождение',
};

const configurationStateLabels: Record<ValidationConfigurationState, string> = {
  [ValidationConfigurationState.Draft]: 'Черновик',
  [ValidationConfigurationState.Published]: 'Опубликовано',
};

const labelFor = <T extends string>(labels: Record<T, string>, value: string | null | undefined) =>
  value && Object.prototype.hasOwnProperty.call(labels, value)
    ? labels[value as T]
    : 'Неизвестное значение';

export const getValidationCheckKindLabel = (value: string | null | undefined) =>
  labelFor(checkKindLabels, value);

export const getSqlConstructLabel = (value: string | null | undefined) =>
  labelFor(constructLabels, value);

export const getHintGroupLabel = (value: string | null | undefined) =>
  labelFor(hintGroupLabels, value);

export const getValidationCheckStatusLabel = (value: string | null | undefined) =>
  labelFor(checkStatusLabels, value);

export const getProgressStatusLabel = (value: string | null | undefined) =>
  labelFor(progressStatusLabels, value);

export const getFinalizationReasonLabel = (value: string | null | undefined) =>
  labelFor(finalizationReasonLabels, value);

export const getValidationConfigurationStateLabel = (value: string | null | undefined) =>
  labelFor(configurationStateLabels, value);

const selectKnown = <T extends string>(
  values: readonly string[],
  labels: Record<T, string>,
): { options: Option<T>[]; unknownValues: string[] } => {
  const options: Option<T>[] = [];
  const unknownValues: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    if (Object.prototype.hasOwnProperty.call(labels, value)) {
      options.push({ value: value as T, label: labels[value as T] });
    } else {
      unknownValues.push(value);
    }
  }

  return { options, unknownValues };
};

export type ValidationCapabilitiesModel = {
  dbmsId: string;
  analyzerVersion: string;
  maxAttemptsLimit: number;
  checkKindOptions: Option<ValidationCheckKind>[];
  constructOptions: Option<SqlConstruct>[];
  hintGroupOptions: Option<HintGroup>[];
  unknownValues: string[];
  canConfigure: boolean;
};

export const toValidationCapabilitiesModel = (
  response: DbmsValidationCapabilitiesResponse,
): ValidationCapabilitiesModel => {
  const kinds = selectKnown(response.supportedCheckKinds ?? [], checkKindLabels);
  const constructs = selectKnown(response.supportedConstructs ?? [], constructLabels);
  const hints = selectKnown(response.supportedHintGroups ?? [], hintGroupLabels);
  const unknownValues = [...kinds.unknownValues, ...constructs.unknownValues, ...hints.unknownValues];

  return {
    dbmsId: response.dbmsId,
    analyzerVersion: response.analyzerVersion,
    maxAttemptsLimit: response.maxAttemptsLimit,
    checkKindOptions: kinds.options,
    constructOptions: constructs.options,
    hintGroupOptions: hints.options,
    unknownValues,
    canConfigure:
      unknownValues.length === 0 &&
      kinds.options.some(({ value }) => value === ValidationCheckKind.MainDatasetResult) &&
      Number.isInteger(response.maxAttemptsLimit) &&
      response.maxAttemptsLimit > 0,
  };
};
