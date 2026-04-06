import { isAxiosError } from 'axios'

import { i18n } from '@/lib/i18n/config'

type ErrorDetail = { loc?: string[] | null; msg?: string }

function isErrorEnvelope(data: unknown): data is {
  error?: string
  message?: string
  details?: ErrorDetail[]
} {
  return data !== null && typeof data === 'object'
}

/** Machine-readable code from API `ErrorResponse.error`, if present. */
export function getApiErrorCode(error: unknown): string | null {
  if (!isAxiosError(error)) {
    return null
  }
  const data = error.response?.data
  if (isErrorEnvelope(data) && typeof data.error === 'string') {
    return data.error
  }
  return null
}

/** Map API `error` codes to i18n keys (caller passes `t` from useTranslation). */
export const API_ERROR_I18N_KEYS: Record<string, string> = {
  EMAIL_ALREADY_REGISTERED: 'errors.emailAlreadyRegistered',
  INVALID_CREDENTIALS: 'errors.invalidCredentials',
  INVALID_RESET_TOKEN: 'errors.invalidResetToken',
  INTERNAL_ERROR: 'errors.internalError',
  VALIDATION_ERROR: 'errors.validationFailed',
}

function pickValidationDetailMessage(details: ErrorDetail[] | undefined): string | null {
  if (!details?.length) {
    return null
  }
  const password = details.find((d) => d.loc?.some((p) => p === 'password'))
  const first = password ?? details[0]
  return typeof first?.msg === 'string' && first.msg.length > 0 ? first.msg : null
}

/**
 * Human-readable message for API/network failures.
 * Optional `translate` maps known `error` codes to localized strings via i18n keys in
 * `API_ERROR_I18N_KEYS`; validation `details` are preferred when the top-level message is generic.
 */
export function getErrorMessage(
  error: unknown,
  translate?: (key: string) => string
): string {
  const tr = translate ?? ((key: string) => i18n.t(key))
  if (isAxiosError(error)) {
    const status = error.response?.status
    const data = error.response?.data

    if (isErrorEnvelope(data)) {
      const code = typeof data.error === 'string' ? data.error : null
      const detailMsg = pickValidationDetailMessage(data.details)
      if (detailMsg && (status === 422 || code === 'VALIDATION_ERROR')) {
        return detailMsg
      }
      if (code) {
        const i18nKey = API_ERROR_I18N_KEYS[code]
        if (i18nKey) {
          return tr(i18nKey)
        }
      }

      if (typeof data.message === 'string' && data.message.length > 0) {
        return data.message
      }

      const detail = (data as Record<string, unknown>).detail
      if (typeof detail === 'string' && detail.length > 0) {
        return detail
      }
    }

    if (typeof data === 'string' && data.length > 0) {
      return data
    }
    return error.message || tr('errors.requestFailed')
  }
  if (error instanceof Error) {
    return error.message
  }
  return tr('errors.generic')
}
