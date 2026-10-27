import { describe, expect, it } from 'vitest';
import {
  buildTrainingReturnUrl,
  clearTrainingLaunch,
  isTrainingLaunch,
  markTrainingLaunch,
  resolveModuleSlug,
} from './training-launch';

describe('метка входа в банк заданий', () => {
  it('ставится, читается и сбрасывается', () => {
    expect(isTrainingLaunch()).toBe(false);
    markTrainingLaunch();
    expect(isTrainingLaunch()).toBe(true);
    clearTrainingLaunch();
    expect(isTrainingLaunch()).toBe(false);
  });
});

describe('resolveModuleSlug', () => {
  it('берёт последний сегмент базового пути', () => {
    expect(resolveModuleSlug('/modules/sql')).toBe('sql');
    expect(resolveModuleSlug('/modules/sql/')).toBe('sql');
    expect(resolveModuleSlug('/SQL')).toBe('sql');
  });

  it('не выдумывает идентификатор, если базового пути нет или он некорректен', () => {
    expect(resolveModuleSlug('/')).toBeNull();
    expect(resolveModuleSlug('')).toBeNull();
    expect(resolveModuleSlug(undefined)).toBeNull();
    expect(resolveModuleSlug('/modules/sql module')).toBeNull();
  });
});

describe('buildTrainingReturnUrl', () => {
  it('добавляет relaunch к пути возврата', () => {
    expect(buildTrainingReturnUrl('/student/training', 'sql')).toBe('/student/training?relaunch=sql');
  });

  it('сохраняет существующие параметры и фрагмент', () => {
    expect(buildTrainingReturnUrl('/student/training?tab=1#top', 'sql'))
      .toBe('/student/training?tab=1&relaunch=sql#top');
  });

  it('заменяет прежний relaunch, а не копит его', () => {
    expect(buildTrainingReturnUrl('/student/training?relaunch=old', 'sql'))
      .toBe('/student/training?relaunch=sql');
  });

  it('без идентификатора модуля просто возвращает путь', () => {
    expect(buildTrainingReturnUrl('/student/training', null)).toBe('/student/training');
  });

  it('без пути возврата уходит на главную платформы', () => {
    expect(buildTrainingReturnUrl(null, 'sql')).toBe('/');
  });
});
