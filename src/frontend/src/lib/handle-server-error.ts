import { AxiosError } from 'axios'
import { toast } from 'sonner'

export function handleServerError(error: unknown) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(error)
  }

  let errMsg = 'Terjadi kesalahan!'

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    errMsg = 'Tidak ada konten.'
  }

  if (error instanceof AxiosError) {
    const errors = error.response?.data?.errors
    const firstError =
      errors && typeof errors === 'object'
        ? Object.values(errors).flat()[0]
        : undefined

    const title =
      error.response?.data?.title ?? firstError ?? error.response?.data?.message
    if (typeof title === 'string' && title.length > 0) {
      errMsg = title
    }
  }

  toast.error(errMsg)
}
