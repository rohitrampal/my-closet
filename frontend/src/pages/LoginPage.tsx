import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { AuthToolbar } from '@/components/layout/AuthToolbar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Heading, Subtext } from '@/components/ui/Typography'
import { loginRequest } from '@/lib/api/auth'
import { getErrorMessage } from '@/lib/api/errors'
import { useAuthStore } from '@/stores/useAuthStore'

type LoginForm = z.infer<ReturnType<typeof buildLoginSchema>>

function buildLoginSchema(t: (key: string) => string) {
  return z.object({
    email: z.string().min(1, t('validation.required')).email(t('validation.email')),
    password: z.string().min(8, t('validation.passwordMin')),
  })
}

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const schema = useMemo(() => buildLoginSchema(t), [t])

  const form = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const mutation = useMutation({
    mutationFn: ({ email, password }: LoginForm) => loginRequest(email, password),
    onSuccess: (data) => {
      login(data.access_token, data.user)
      toast.success(t('toasts.loggedIn'))
      navigate('/dashboard', { replace: true })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t))
    },
  })

  return (
    <div>
      <AuthToolbar />
      <Card radius="button" padding="none" className="p-6 shadow-soft sm:p-8">
        <div className="mb-6 space-y-1">
          <Heading as="h1" variant="title" className="!text-xl sm:!text-2xl">
            {t('auth.login')}
          </Heading>
          <Subtext>{t('auth.loginSubtitle')}</Subtext>
        </div>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          noValidate
        >
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            label={t('auth.password')}
            placeholder={t('auth.passwordPlaceholder')}
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary underline-offset-4 hover:text-primary-soft hover:underline"
            >
              {t('auth.forgotPassword')}
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? t('common.loading') : t('auth.login')}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          <Link
            to="/signup"
            className="font-medium text-primary underline-offset-4 hover:text-primary-soft hover:underline"
          >
            {t('auth.signup')}
          </Link>
        </p>
      </Card>
    </div>
  )
}
