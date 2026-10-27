import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearActiveLaunchContext, setActiveLaunchContext } from '../launch';
import { useSessionStore } from '../store';
import { RequireHandoffScope } from './RequireHandoffScope';

function CurrentPath() {
  return <div data-testid="path">{useLocation().pathname}</div>;
}

function renderAt(path: string) {
  const { unmount } = render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<RequireHandoffScope><CurrentPath /></RequireHandoffScope>} />
      </Routes>
    </MemoryRouter>,
  );
  const current = screen.getByTestId('path').textContent;
  unmount();
  return current;
}

function setHandoff(handoffKind: 'student' | 'student-training' | 'teacher') {
  useSessionStore.setState({
    status: 'authenticated',
    mode: 'handoff',
    handoffKind,
    user: { id: 'u1', roles: handoffKind === 'teacher' ? ['Teacher'] : ['Student'] },
  });
}

describe('RequireHandoffScope', () => {
  beforeEach(() => {
    clearActiveLaunchContext();
    useSessionStore.setState({ status: 'anonymous', mode: null, handoffKind: null, user: null });
  });

  describe('вход в банк заданий (student-training)', () => {
    beforeEach(() => setHandoff('student-training'));

    it.each(['/student', '/student/tasks', '/student/tasks/abc', '/student/attempts', '/student/bank/tasks/42'])(
      'пропускает студенческий контур: %s',
      (path) => {
        expect(renderAt(path)).toBe(path);
      },
    );

    it.each(['/teacher/topics', '/admin', '/studentx', '/login', '/'])(
      'возвращает в банк с чужого раздела: %s',
      (path) => {
        expect(renderAt(path)).toBe('/student/tasks');
      },
    );
  });

  describe('платформенное задание (student) — ограничение не ослаблено', () => {
    it('без контекста запуска отправляет на /launch', () => {
      setHandoff('student');
      expect(renderAt('/student/tasks')).toBe('/launch');
    });

    it('держит студента на странице своего задания и не пускает в банк', () => {
      setHandoff('student');
      setActiveLaunchContext({ sessionId: 's1', taskId: 't1', returnUrl: 'https://platform.example/return' });

      expect(renderAt('/student/tasks/t1')).toBe('/student/tasks/t1');
      expect(renderAt('/student/tasks')).toBe('/student/tasks/t1');
      expect(renderAt('/student/bank/tasks/42')).toBe('/student/tasks/t1');
      expect(renderAt('/teacher/topics')).toBe('/student/tasks/t1');
    });
  });

  it('преподавательский вход и обычная сессия не ограничиваются этим охранником', () => {
    setHandoff('teacher');
    expect(renderAt('/teacher/topics')).toBe('/teacher/topics');

    useSessionStore.setState({ mode: 'standalone', handoffKind: null });
    expect(renderAt('/admin')).toBe('/admin');
  });
});
