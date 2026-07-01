import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, PasswordInput, TextInput } from '@mantine/core';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useLogin } from '../../api/identity/auth/auth';
import {
  createSessionUserFromTokenResponse,
  getDefaultSessionRoute,
  useSessionStore,
} from '../index';
import './LoginPage.css';

const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter password'),
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

    const response = await loginMutation
      .mutateAsync({
        data: values,
      })
      .catch(() => null);

    if (!response) {
      setFormError('Identity service is unavailable. Check runtime config and service port.');
      return;
    }

    if (response.status === 401) {
      setFormError('Invalid email or password');
      return;
    }

    if (response.status !== 200 || !response.data.accessToken) {
      setFormError('Could not sign in. Try again later.');
      return;
    }

    const user = createSessionUserFromTokenResponse(response.data);

    if (!user) {
      setFormError('Could not read user data from token.');
      return;
    }

    setSession({
      accessToken: response.data.accessToken,
      user,
    });
    navigate(getDefaultSessionRoute(user), { replace: true });
  });

  return (
    <section className="login-page">
      <div className="login-page__card">
        <div className="login-page__brand" aria-hidden="true">
          SQL
        </div>
        <h2 className="login-page__title">Sign in</h2>
        <p className="login-page__subtitle">
          Use your Scoodle account to open the SQLModule workspace for your role.
        </p>

        <form className="login-page__form" onSubmit={onSubmit}>
          {formError ? (
            <Alert color="red" variant="light">
              {formError}
            </Alert>
          ) : null}

          <TextInput
            label="Email"
            placeholder="admin@scoodle.local"
            size="md"
            error={errors.email?.message}
            {...register('email')}
          />

          <PasswordInput
            label="Password"
            placeholder="Enter password"
            size="md"
            error={errors.password?.message}
            {...register('password')}
          />

          <Button className="login-page__submit" type="submit" size="md" loading={loginMutation.isPending}>
            Sign in
          </Button>
        </form>
      </div>
    </section>
  );
}
