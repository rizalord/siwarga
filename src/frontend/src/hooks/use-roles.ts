import { useQuery } from '@tanstack/react-query'
import { rolesService } from '@/services/roles'

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesService.getAll(),
    select: (res) => res.data.data,
  })
}
