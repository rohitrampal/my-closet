import { apiClient } from './client'

export type ContactPayload = {
  name: string
  email: string
  message: string
}

export type ContactApiResponse = {
  success: boolean
}

export async function submitContact(
  payload: ContactPayload
): Promise<ContactApiResponse> {
  const { data } = await apiClient.post<ContactApiResponse>('/contact', payload)
  return data
}
