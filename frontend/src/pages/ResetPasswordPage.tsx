import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { AuthToolbar } from '@/components/layout/AuthToolbar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Heading, Subtext } from '@/components/ui/Typography'
import { resetPasswordRequest } from '@/lib/api/auth'
import { getErrorMessage } from '@/lib/api/errors'

type ResetForm = z.infer<ReturnType<typeof buildSchema>>

function buildSchema(t: (key: string) => string) {
  return z
    .object({
      password: z.string().min(8, t('validation.passwordMin')),
      confirm: z.string().min(1, t('validation.required')),
    })
    .refine((data) => /[A-Za-z]/.test(data.password) && /\d/.test(data.password), {
      message: t('validation.passwordStrength'),
      path: ['password'],
    })
    .refine((data) => data.password === data.confirm, {
      message: t('auth.resetPasswordMismatch'),
      path: ['confirm'],
    })
}

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const resetToken = params.get('token')?.trim() ?? ''

  const schema = useMemo(() => buildSchema(t), [t])

  const form = useForm<ResetForm>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  })

  const mutation = useMutation({
    mutationFn: ({ password }: ResetForm) => resetPasswordRequest(resetToken, password),
    onSuccess: () => {
      toast.success(t('auth.resetToast'))
      navigate('/login', { replace: true })
    },
    onError: (e: unknown) => {
      toast.error(getErrorMessage(e, t))
    },
  })

  return (
    <div>
      <AuthToolbar />
      <Card radius="button" padding="none" className="p-6 shadow-soft sm:p-8">
        <div className="mb-6 space-y-1">
          <Heading as="h1" variant="title" className="!text-xl sm:!text-2xl">
            {t('auth.resetTitle')}
          </Heading>
          <Subtext>{t('auth.resetSubtitle')}</Subtext>
        </div>
        {!resetToken ? (
          <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
            {t('auth.resetMissingToken')}
          </p>
        ) : null}
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          noValidate
        >
          <PasswordInput
            id="reset-password"
            autoComplete="new-password"
            label={t('auth.newPassword')}
            placeholder={t('auth.passwordPlaceholder')}
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          <PasswordInput
            id="reset-confirm"
            autoComplete="new-password"
            label={t('auth.confirmPassword')}
            placeholder={t('auth.passwordPlaceholder')}
            error={form.formState.errors.confirm?.message}
            {...form.register('confirm')}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending || !resetToken}
          >
            {mutation.isPending ? t('common.loading') : t('auth.resetSubmit')}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          <Link
            to="/login"
            className="font-medium text-primary underline-offset-4 hover:text-primary-soft hover:underline"
          >
            {t('auth.backToLogin')}
          </Link>
        </p>
      </Card>
    </div>
  )
}
