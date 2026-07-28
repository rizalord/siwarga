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
        { title: 'Penghuni', url: '/residents', icon: Users, permission: 'residents.view' },
        { title: 'Rumah', url: '/houses', icon: Home, permission: 'houses.view' },
        { title: 'Jenis Iuran', url: '/due-types', icon: Banknote, permission: 'due-types.view' },
      ],
    },
    {
      title: 'Keuangan',
      items: [
        { title: 'Tagihan', url: '/bills', icon: Receipt, permission: 'bills.view' },
        { title: 'Pembayaran', url: '/payments', icon: Wallet, permission: 'payments.view' },
        { title: 'Pengeluaran', url: '/expenses', icon: ShoppingCart, permission: 'expenses.view' },
        { title: 'Laporan', url: '/reports', icon: FileText, permission: 'reports.view' },
      ],
    },
    {
      title: 'Pengaturan',
      items: [
        { title: 'User', url: '/users', icon: UserCog, permission: 'users.view' },
        { title: 'Pengaturan', url: '/settings', icon: Settings },
      ],
    },
  ],
}
