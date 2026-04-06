import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { AuthToolbar } from '@/components/layout/AuthToolbar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Heading, Subtext } from '@/components/ui/Typography'
import { forgotPasswordRequest } from '@/lib/api/auth'
import { getErrorMessage } from '@/lib/api/errors'

type ForgotForm = z.infer<ReturnType<typeof buildSchema>>

function buildSchema(t: (key: string) => string) {
  return z.object({
    email: z.string().min(1, t('validation.required')).email(t('validation.email')),
  })
}

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const schema = useMemo(() => buildSchema(t), [t])

  const form = useForm<ForgotForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const mutation = useMutation({
    mutationFn: ({ email }: ForgotForm) => forgotPasswordRequest(email),
    onSuccess: () => {
      toast.success(t('auth.forgotToast'))
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
            {t('auth.forgotTitle')}
          </Heading>
          <Subtext>{t('auth.forgotSubtitle')}</Subtext>
        </div>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          noValidate
        >
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? t('common.loading') : t('auth.forgotSubmit')}
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
