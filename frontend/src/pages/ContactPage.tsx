import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { LegalPageShell } from '@/components/legal/LegalPageShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { submitContact } from '@/lib/api/contact'
import { getErrorMessage } from '@/lib/api/errors'
import { getPublicSupportEmail } from '@/lib/legal/siteLegal'

const LAST_UPDATED = 'April 6, 2026'

export function ContactPage() {
  const { t } = useTranslation()
  const email = getPublicSupportEmail()
  const [name, setName] = useState('')
  const [emailField, setEmailField] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await submitContact({
        name: name.trim(),
        email: emailField.trim(),
        message: message.trim(),
      })
      toast.success(t('toasts.contactSent'))
      setName('')
      setEmailField('')
      setMessage('')
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LegalPageShell title={t('legal.contactTitle')} lastUpdated={LAST_UPDATED}>
      <p>{t('legal.contactIntro')}</p>

      <h2>{t('legal.contactProduct')}</h2>
      <p>
        <strong>My Closet</strong> — {t('app.metaDescription')}
      </p>

      <h2>{t('legal.contactSupportHeading')}</h2>
      <p className="text-muted">{t('legal.contactFormIntro')}</p>

      <Card className="border-border bg-surface/50 p-4 not-prose">
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Input
            id="contact-name"
            name="name"
            label={t('legal.contactFormName')}
            type="text"
            autoComplete="name"
            required
            maxLength={200}
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            disabled={submitting}
          />
          <Input
            id="contact-email"
            name="email"
            label={t('legal.contactFormEmail')}
            type="email"
            autoComplete="email"
            required
            value={emailField}
            onChange={(ev) => setEmailField(ev.target.value)}
            disabled={submitting}
          />
          <div className="flex w-full flex-col gap-1.5">
            <label
              htmlFor="contact-message"
              className="text-sm font-medium text-foreground"
            >
              {t('legal.contactFormMessage')}
            </label>
            <textarea
              id="contact-message"
              name="message"
              required
              rows={6}
              minLength={1}
              maxLength={20_000}
              value={message}
              onChange={(ev) => setMessage(ev.target.value)}
              disabled={submitting}
              className="input-control min-h-32 resize-y py-2.5"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            className="w-full sm:w-auto"
            disabled={submitting}
          >
            {submitting ? t('legal.contactFormSubmitting') : t('legal.contactFormSubmit')}
          </Button>
        </form>
      </Card>

      {email ? (
        <Card className="mt-6 border-border bg-surface/50 p-4 not-prose">
          <p className="text-sm text-muted">{t('legal.contactEmailLabel')}</p>
          <a
            href={`mailto:${email}`}
            className="mt-1 inline-block text-base font-medium text-primary underline-offset-4 hover:underline"
          >
            {email}
          </a>
        </Card>
      ) : (
        <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
          {t('legal.contactNoEmail')}
        </p>
      )}

      <h2>{t('legal.contactLegalHeading')}</h2>
      <p>{t('legal.contactLegalBody')}</p>

      <h2>{t('legal.contactPaymentsHeading')}</h2>
      <p>{t('legal.contactPaymentsBody')}</p>

      <p>
        {/* <Link
          to="/refunds"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('legal.refunds')}
        </Link>
        {' · '} */}
        <Link
          to="/privacy"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('legal.privacy')}
        </Link>
        {' · '}
        <Link
          to="/terms"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('legal.terms')}
        </Link>
      </p>
    </LegalPageShell>
  )
}
