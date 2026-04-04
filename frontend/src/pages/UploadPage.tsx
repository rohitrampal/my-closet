import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useCreateClothesMutation } from '@/lib/api/queries/useClothes'
import { CLOTHES_TYPES, type ClothesType } from '@/lib/api/types'

function buildUploadSchema(t: (key: string) => string) {
  return z.object({
    image_url: z.string().min(1, t('validation.required')).max(2048),
    type: z
      .string()
      .min(1, t('validation.typeRequired'))
      .refine((v): v is ClothesType => (CLOTHES_TYPES as readonly string[]).includes(v), {
        message: t('validation.typeInvalid'),
      }),
    color: z.string().min(1, t('validation.required')).max(100),
    style: z.string().min(1, t('validation.required')).max(100),
  })
}

export function UploadPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createMutation = useCreateClothesMutation()

  const schema = useMemo(() => buildUploadSchema(t), [t])

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      image_url: '',
      type: '',
      color: '',
      style: '',
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t('clothes.uploadTitle')}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {t('clothes.uploadSubtitle')}
        </p>
      </div>

      <Card className="p-5 sm:p-6">
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            createMutation.mutate(
              {
                image_url: values.image_url,
                type: values.type,
                color: values.color,
                style: values.style,
              },
              {
                onSuccess: () => {
                  navigate('/dashboard')
                },
              }
            )
          })}
          noValidate
        >
          <Input
            id="clothes-image-url"
            type="text"
            autoComplete="off"
            label={t('clothes.imageUrl')}
            placeholder="https://..."
            error={form.formState.errors.image_url?.message}
            {...form.register('image_url')}
          />
          <Select
            id="clothes-type"
            label={t('clothes.type')}
            error={form.formState.errors.type?.message}
            defaultValue=""
            {...form.register('type')}
          >
            <option value="" disabled>
              {t('clothes.selectType')}
            </option>
            {CLOTHES_TYPES.map((value) => (
              <option key={value} value={value}>
                {t(`clothes.types.${value}`)}
              </option>
            ))}
          </Select>
          <Input
            id="clothes-color"
            autoComplete="off"
            label={t('clothes.color')}
            placeholder={t('clothes.colorPlaceholder')}
            error={form.formState.errors.color?.message}
            {...form.register('color')}
          />
          <Input
            id="clothes-style"
            autoComplete="off"
            label={t('clothes.style')}
            placeholder={t('clothes.stylePlaceholder')}
            error={form.formState.errors.style?.message}
            {...form.register('style')}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => navigate(-1)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? t('common.loading') : t('clothes.uploadAction')}
            </Button>
          </div>
        </form>
      </Card>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          to="/dashboard"
          className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
        >
          {t('nav.dashboard')}
        </Link>
      </p>
    </div>
  )
}
