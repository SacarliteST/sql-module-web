import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BankTaskSort } from '../../../api/sqlmodule/model';
import { StudentTaskCatalog } from './StudentTaskCatalog';

const getTasks = vi.hoisted(() => vi.fn());
vi.mock('../../../api/sqlmodule/student/student', () => ({
  useGetStudentTasks: (params: unknown) => getTasks(params),
}));

describe('StudentTaskCatalog recommended', () => {
  beforeEach(() => getTasks.mockReset().mockReturnValue({
    isPending: false,
    isError: false,
    data: {
      status: 200,
      data: {
        count: 2,
        items: [
          { id: 'task-b', taskName: 'Сначала сервер рекомендует B', status: 'NotStarted' },
          { id: 'task-a', taskName: 'Затем сервер рекомендует A', status: 'NotStarted' },
        ],
      },
    },
  }));

  it('передаёт Recommended и сохраняет серверный порядок без ошибки fallback', () => {
    render(
      <MantineProvider>
        <MemoryRouter initialEntries={['/student/tasks?sort=recommended']}>
          <StudentTaskCatalog />
        </MemoryRouter>
      </MantineProvider>,
    );

    expect(getTasks.mock.calls[0][0].SortBy).toBe(BankTaskSort.Recommended);
    const titles = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent);
    expect(titles).toEqual(['Сначала сервер рекомендует B', 'Затем сервер рекомендует A']);
    expect(screen.getByText('Рекомендуемый порядок подобран по истории завершённых заданий.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
