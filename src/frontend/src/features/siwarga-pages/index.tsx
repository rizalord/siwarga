import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { PageForm } from './page-form'

const PAGE_TABS = [
  { slug: 'home', label: 'Beranda' },
  { slug: 'profil-komplek', label: 'Profil Komplek' },
  { slug: 'kontak', label: 'Kontak' },
] as const

export function PagesPage() {
  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Halaman Landing</h2>
          <p className='text-muted-foreground'>
            Kelola konten Beranda, Profil Komplek, dan Kontak yang tampil di situs publik.
          </p>
        </div>

        <Tabs defaultValue='home'>
          <TabsList>
            {PAGE_TABS.map((tab) => (
              <TabsTrigger key={tab.slug} value={tab.slug}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {PAGE_TABS.map((tab) => (
            <TabsContent key={tab.slug} value={tab.slug} className='pt-4'>
              <PageForm slug={tab.slug} />
            </TabsContent>
          ))}
        </Tabs>
      </Main>
    </>
  )
}
