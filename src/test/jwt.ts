/** Собирает JWT-подобную строку для тестов декодера (подпись не проверяется). */
export function makeJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.sig`;
}

/** Момент через N секунд от сейчас в секундах, как в claim `exp`. */
export const expiresIn = (seconds: number) => Math.floor(Date.now() / 1000) + seconds;
