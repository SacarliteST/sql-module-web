import { Button, Combobox, Input, InputBase, Loader, ScrollArea, Stack, Text, useCombobox } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { getTargetDbTableLookupValues } from '../../../api/sqlmodule/schema-data/schema-data';

const LOOKUP_PAGE_SIZE = 30;

export type ForeignKeyBinding = {
  targetTableId: string;
  targetTableName: string;
  targetColumnId: string;
  targetColumnName: string;
  labelColumnId?: string;
};

export type LocalForeignKeyOption = {
  key: string;
  value: string;
  label: string;
};

type Props = {
  targetDbId: string;
  binding: ForeignKeyBinding;
  value: string | null | undefined;
  disabled: boolean;
  excludedRowId?: string;
  localOptions: LocalForeignKeyOption[];
  onChange: (value: string) => void;
};

export function ForeignKeyCellInput({ targetDbId, binding, value, disabled, excludedRowId, localOptions, onChange }: Props) {
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search.trim(), 300);

  useEffect(() => {
    if (!combobox.dropdownOpened) setSearch('');
  }, [combobox.dropdownOpened]);

  const query = useInfiniteQuery({
    queryKey: ['foreign-key-lookup', targetDbId, binding.targetTableId, binding.targetColumnId, binding.labelColumnId, debouncedSearch],
    initialPageParam: 0,
    enabled: !disabled,
    queryFn: ({ pageParam, signal }) => getTargetDbTableLookupValues(
      targetDbId,
      binding.targetTableId,
      {
        valueColumnId: binding.targetColumnId,
        labelColumnId: binding.labelColumnId,
        search: debouncedSearch || undefined,
        offset: pageParam,
        limit: LOOKUP_PAGE_SIZE,
      },
      { signal },
    ),
    getNextPageParam: (lastPage) => {
      if (lastPage.status !== 200) return undefined;
      const nextOffset = lastPage.data.offset + lastPage.data.items.length;
      return nextOffset < lastPage.data.count ? nextOffset : undefined;
    },
  });

  const remoteOptions = useMemo(() => query.data?.pages.flatMap((page) => (
    page.status === 200
      ? page.data.items.filter((item) => item.rowId !== excludedRowId)
        .map((item) => ({ key: item.rowId, value: item.value, label: item.label }))
      : []
  )) ?? [], [excludedRowId, query.data]);
  const options = useMemo(() => {
    const seen = new Set<string>();
    const normalizedSearch = debouncedSearch.toLocaleLowerCase('ru-RU');
    const matchingLocalOptions = normalizedSearch
      ? localOptions.filter((option) => option.value.toLocaleLowerCase('ru-RU').includes(normalizedSearch)
        || option.label.toLocaleLowerCase('ru-RU').includes(normalizedSearch))
      : localOptions;
    return [...matchingLocalOptions, ...remoteOptions].filter((option) => {
      if (seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    });
  }, [debouncedSearch, localOptions, remoteOptions]);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;
  const hasLoadError = query.data?.pages.some((page) => page.status !== 200) || query.isError;

  return <Combobox
    store={combobox}
    onOptionSubmit={(selectedValue) => {
      onChange(selectedValue);
      combobox.closeDropdown();
    }}
  >
    <Combobox.Target>
      <InputBase
        component="button"
        type="button"
        pointer={!disabled}
        disabled={disabled}
        rightSection={query.isFetching ? <Loader size={16} /> : <Combobox.Chevron />}
        onClick={() => combobox.toggleDropdown()}
      >
        {selectedLabel || <Input.Placeholder>Выберите значение</Input.Placeholder>}
      </InputBase>
    </Combobox.Target>
    <Combobox.Dropdown>
      <Combobox.Search
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        placeholder={`Поиск в ${binding.targetTableName}.${binding.targetColumnName}`}
      />
      <Combobox.Options>
        <ScrollArea.Autosize mah={240} type="scroll">
          {options.map((option) => <Combobox.Option key={option.key} value={option.value} active={option.value === value}>
            {option.label}
          </Combobox.Option>)}
          {!options.length && !query.isFetching && !hasLoadError
            ? <Combobox.Empty>В таблице «{binding.targetTableName}» нет подходящих строк. Сначала заполните её.</Combobox.Empty>
            : null}
        </ScrollArea.Autosize>
      </Combobox.Options>
      {hasLoadError ? <Text c="red" size="xs" p="xs">Не удалось загрузить допустимые значения.</Text> : null}
      {query.hasNextPage ? <Stack p="xs">
        <Button size="xs" variant="subtle" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          Показать ещё
        </Button>
      </Stack> : null}
    </Combobox.Dropdown>
  </Combobox>;
}
