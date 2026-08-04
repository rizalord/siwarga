import { useLayout } from '@/context/layout-provider'
import { useAuthStore } from '@/stores/auth-store'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { AppTitle } from './app-title'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const authUser = useAuthStore((state) => state.auth.user)
  const permissions = authUser?.permissions ?? []

  const visibleNavGroups = sidebarData.navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || permissions.includes(item.permission)
      ),
    }))
    .filter((group) => group.items.length > 0)

  const user = authUser
    ? { name: authUser.name, email: authUser.email, avatar: '' }
    : sidebarData.user

  return (
    <Sidebar collapsible={collapsible} variant={variant} className='bg-sidebar'>
      <SidebarHeader className='bg-sidebar'>
        <AppTitle />
      </SidebarHeader>
      <SidebarContent className='bg-sidebar'>
        {visibleNavGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter className='bg-sidebar'>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
