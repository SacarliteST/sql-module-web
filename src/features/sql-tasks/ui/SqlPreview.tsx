import { Box } from '@mantine/core';
import type { ReactNode } from 'react';

const SQL_KEYWORDS = new Set([
  'select',
  'from',
  'where',
  'join',
  'inner',
  'left',
  'right',
  'full',
  'outer',
  'on',
  'group',
  'by',
  'having',
  'order',
  'asc',
  'desc',
  'insert',
  'into',
  'values',
  'update',
  'set',
  'delete',
  'create',
  'alter',
  'drop',
  'table',
  'view',
  'as',
  'and',
  'or',
  'not',
  'null',
  'is',
  'in',
  'exists',
  'between',
  'like',
  'limit',
  'offset',
  'distinct',
  'count',
  'sum',
  'avg',
  'min',
  'max',
  'case',
  'when',
  'then',
  'else',
  'end',
]);

const tokenPattern =
  /(--[^\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|\b\d+(?:\.\d+)?\b|\b[a-z_][a-z0-9_]*\b)/gi;

function getTokenColor(token: string): string | undefined {
  const normalized = token.toLowerCase();

  // These literals belong to the SQL syntax-highlighting palette, not the application UI.

  if (token.startsWith('--') || token.startsWith('/*')) {
    return '#6a9955';
  }

  if (token.startsWith("'")) {
    return '#ce9178';
  }

  if (/^\d/.test(token)) {
    return '#b5cea8';
  }

  if (SQL_KEYWORDS.has(normalized)) {
    return '#569cd6';
  }

  return undefined;
}

function highlightSql(sql: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  sql.replace(tokenPattern, (token, _match, offset: number) => {
    if (offset > lastIndex) {
      parts.push(sql.slice(lastIndex, offset));
    }

    const color = getTokenColor(token);
    parts.push(
      <span key={`${offset}-${token}`} style={color ? { color } : undefined}>
        {token}
      </span>,
    );
    lastIndex = offset + token.length;
    return token;
  });

  if (lastIndex < sql.length) {
    parts.push(sql.slice(lastIndex));
  }

  return parts;
}

type SqlPreviewProps = {
  sql?: string | null;
  emptyText?: string;
};

export function SqlPreview({
  emptyText = '-- Эталонный SQL-запрос не выбран',
  sql,
}: SqlPreviewProps) {
  const value = sql?.trim() || emptyText;

  return (
    <Box
      bg="gray.9"
      c="gray.1"
      p="md"
      style={{
        borderRadius: 'var(--mantine-radius-sm)',
        fontFamily: 'var(--mantine-font-family-monospace)',
        fontSize: 13,
        lineHeight: 1.55,
        minHeight: 92,
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
      }}
    >
      {highlightSql(value)}
    </Box>
  );
}
