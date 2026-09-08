import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { WargaAnnouncementsPage } from '@/features/siwarga-announcements/warga-announcements-page'

const wargaAnnouncementsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  category: z
    .array(
      z.union([
        z.literal('darurat'),
        z.literal('umum'),
        z.literal('kegiatan'),
        z.literal('keuangan'),
      ])
    )
    .optional()
    .catch([]),
  search: z.string().optional().catch(''),
  sort: z.string().optional().catch(undefined),
  order: z
    .union([z.literal('asc'), z.literal('desc')])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/_authenticated/pengumuman/')({
  validateSearch: wargaAnnouncementsSearchSchema,
  component: WargaAnnouncementsPage,
})
