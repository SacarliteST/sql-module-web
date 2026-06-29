import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, PasswordInput, TextInput } from '@mantine/core';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useLogin } from '../../api/identity/auth/auth';
import { decodeSessionUser, useSessionStore } from '../index';
import './LoginPage.css';

const loginSchema = z.object({
  email: z.email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const [formError, setFormError] = useState<string | null>(null);
  const loginMutation = useLogin();

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    const response = await loginMutation.mutateAsync({
      data: values,
    });

    if (response.status === 401) {
      setFormError('Неверный email или пароль');
      return;
    }

    if (response.status !== 200 || !response.data.accessToken) {
      setFormError('Не удалось войти. Попробуйте позже.');
      return;
    }

    const user = decodeSessionUser(response.data.accessToken);

    if (!user) {
      setFormError('Не удалось прочитать данные пользователя из токена.');
      return;
    }

    setSession({
      accessToken: response.data.accessToken,
      user,
    });
    navigate('/');
  });

  return (
    <section className="login-page">
      <h2 className="login-page__title">Вход</h2>
      <p className="login-page__subtitle">Standalone-режим SQLModule</p>

      <form className="login-page__form" onSubmit={onSubmit}>
        {formError ? (
          <Alert color="red" variant="light">
            {formError}
          </Alert>
        ) : null}

        <TextInput
          label="Email"
          placeholder="user@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <PasswordInput
          label="Пароль"
          placeholder="Введите пароль"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" loading={loginMutation.isPending}>
          Войти
        </Button>
      </form>
    </section>
  );
}
