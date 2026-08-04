import { Link } from '@tanstack/react-router'
import { Logo } from '@/assets/logo'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

export function AppTitle() {
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='gap-2 py-0 hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0'
          asChild
        >
          <Link
            to='/'
            onClick={() => setOpenMobile(false)}
            className='flex flex-1 items-center justify-start text-start text-sm leading-tight group-data-[collapsible=icon]:justify-center'
          >
            <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
              <Logo className='size-4' aria-hidden='true' />
            </span>
            <span className='ms-2 grid min-w-0 group-data-[collapsible=icon]:hidden'>
              <span className='truncate font-bold'>SIWarga</span>
              <span className='truncate text-xs'>Sistem Informasi RT</span>
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
