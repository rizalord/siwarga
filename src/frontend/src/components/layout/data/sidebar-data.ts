import {
  LayoutDashboard,
  Users,
  Home,
  Receipt,
  Wallet,
  ShoppingCart,
  FileText,
  Settings,
  UserCog,
  Banknote,
  type IconNode,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Admin RT',
    email: 'admin@siwarga.test',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'SIWarga',
      logo: Home,
      plan: 'Sistem Informasi RT',
    },
  ],
  navGroups: [
    {
      title: 'Utama',
      items: [
        { title: 'Dashboard', url: '/', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Data Master',
      items: [
        { title: 'Penghuni', url: '/residents', icon: Users },
        { title: 'Rumah', url: '/houses', icon: Home },
        { title: 'Jenis Iuran', url: '/due-types', icon: Banknote },
      ],
    },
    {
      title: 'Keuangan',
      items: [
        { title: 'Tagihan', url: '/bills', icon: Receipt },
        { title: 'Pembayaran', url: '/payments', icon: Wallet },
        { title: 'Pengeluaran', url: '/expenses', icon: ShoppingCart },
        { title: 'Laporan', url: '/reports', icon: FileText },
      ],
    },
    {
      title: 'Pengaturan',
      items: [
        { title: 'User', url: '/users', icon: UserCog },
        { title: 'Pengaturan', url: '/settings', icon: Settings },
      ],
    },
  ],
}
