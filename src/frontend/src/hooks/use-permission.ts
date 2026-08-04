import { useAuthStore } from '@/stores/auth-store'

export function useHasPermission(permission: string): boolean {
  return useAuthStore((state) =>
    state.auth.user?.permissions.includes(permission) ?? false
  )
}
