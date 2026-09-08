import {
  LayoutDashboard,
  Users,
  Home,
  Receipt,
  Wallet,
  ShoppingCart,
  Tag,
  FileText,
  Megaphone,
  Mail,
  UserCog,
  Banknote,
  ShieldCheck,
  KeyRound,
  History,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Admin RT',
    email: 'admin@siwarga.test',
    avatar: '/avatars/shadcn.jpg',
  },
  navGroups: [
    {
      title: 'Utama',
      items: [{ title: 'Dashboard', url: '/', icon: LayoutDashboard }],
    },
    {
      title: 'Data Master',
      items: [
        {
          title: 'Penghuni',
          url: '/residents',
          icon: Users,
          permission: 'residents.view',
        },
        {
          title: 'Rumah',
          url: '/houses',
          icon: Home,
          permission: 'houses.view',
        },
        {
          title: 'Jenis Iuran',
          url: '/due-types',
          icon: Banknote,
          permission: 'due-types.view',
        },
        {
          title: 'Halaman Landing',
          url: '/pages',
          icon: FileText,
          permission: 'pages.manage',
        },
      ],
    },
    {
      title: 'Komunikasi',
      items: [
        {
          title: 'Pengumuman',
          url: '/announcements',
          icon: Megaphone,
          permission: 'announcements.manage',
        },
        {
          title: 'Pengumuman Warga',
          url: '/pengumuman',
          icon: Megaphone,
          permission: 'announcements.view',
        },
        {
          title: 'Pesan Kontak',
          url: '/contact-messages',
          icon: Mail,
          permission: 'contact-messages.view',
        },
      ],
    },
    {
      title: 'Keuangan',
      items: [
        {
          title: 'Tagihan',
          url: '/bills',
          icon: Receipt,
          permission: 'bills.view',
        },
        {
          title: 'Pembayaran',
          url: '/payments',
          icon: Wallet,
          permission: 'payments.view',
        },
        {
          title: 'Pengeluaran',
          url: '/expenses',
          icon: ShoppingCart,
          permission: 'expenses.view',
        },
        {
          title: 'Kategori Pengeluaran',
          url: '/expense-categories',
          icon: Tag,
          permission: 'expense-categories.view',
        },
        {
          title: 'Laporan',
          url: '/reports',
          icon: FileText,
          permission: 'reports.view',
        },
      ],
    },
    {
      title: 'Pengaturan',
      items: [
        {
          title: 'User',
          url: '/users',
          icon: UserCog,
          permission: 'users.view',
        },
        {
          title: 'Role',
          url: '/roles',
          icon: ShieldCheck,
          permission: 'users.view',
        },
        {
          title: 'Permission',
          url: '/permissions',
          icon: KeyRound,
          permission: 'users.view',
        },
        {
          title: 'Log Aktivitas',
          url: '/activity-logs',
          icon: History,
          permission: 'activity-logs.view',
        },
      ],
    },
  ],
}
