import type { ExportDataset } from '@/types/api'
import api from './api'

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const exportsService = {
  monthlyPdf: async (year: number, month: number) => {
    const res = await api.get(`/api/reports/monthly/${year}/${month}/pdf`, {
      responseType: 'blob',
    })
    downloadBlob(res.data, `laporan-bulanan-${year}-${month}.pdf`)
  },
  summaryPdf: async (year: number) => {
    const res = await api.get(`/api/reports/summary/${year}/pdf`, {
      responseType: 'blob',
    })
    downloadBlob(res.data, `laporan-tahunan-${year}.pdf`)
  },
  dataset: async (
    dataset: ExportDataset,
    params?: { month?: number; year?: number }
  ) => {
    const res = await api.get(`/api/exports/${dataset}/xlsx`, {
      params,
      responseType: 'blob',
    })
    downloadBlob(res.data, `${dataset}.xlsx`)
  },
  backup: async () => {
    const res = await api.get('/api/backup/json', { responseType: 'blob' })
    downloadBlob(
      res.data,
      `siwarga-backup-${new Date().toISOString().slice(0, 10)}.json`
    )
  },
}
