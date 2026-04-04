import { isAxiosError } from 'axios'

/** Machine-readable code from API `ErrorResponse.error`, if present. */
export function getApiErrorCode(error: unknown): string | null {
  if (!isAxiosError(error)) {
    return null
  }
  const data = error.response?.data
  if (
    data &&
    typeof data === 'object' &&
    'error' in data &&
    typeof (data as { error: unknown }).error === 'string'
  ) {
    return (data as { error: string }).error
  }
  return null
}

export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data
    if (
      data &&
      typeof data === 'object' &&
      'message' in data &&
      typeof (data as { message: unknown }).message === 'string'
    ) {
      return (data as { message: string }).message
    }
    if (typeof data === 'string' && data.length > 0) {
      return data
    }
    return error.message || 'Request failed'
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Something went wrong'
}
