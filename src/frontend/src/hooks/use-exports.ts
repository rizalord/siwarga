import { useMutation } from '@tanstack/react-query'
import { exportsService } from '@/services/exports'
import type { ExportDataset } from '@/types/api'
import { toast } from 'sonner'

export function useDownloadMonthlyPdf() {
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      exportsService.monthlyPdf(year, month),
    onSuccess: () => toast.success('Laporan bulanan berhasil diunduh'),
    onError: () => toast.error('Gagal mengunduh'),
  })
}

export function useDownloadSummaryPdf() {
  return useMutation({
    mutationFn: (year: number) => exportsService.summaryPdf(year),
    onSuccess: () => toast.success('Laporan tahunan berhasil diunduh'),
    onError: () => toast.error('Gagal mengunduh'),
  })
}

export function useDownloadDataset() {
  return useMutation({
    mutationFn: ({
      dataset,
      params,
    }: {
      dataset: ExportDataset
      params?: { month?: number; year?: number }
    }) => exportsService.dataset(dataset, params),
    onSuccess: () => toast.success('Data berhasil diunduh'),
    onError: () => toast.error('Gagal mengunduh'),
  })
}

export function useDownloadBackup() {
  return useMutation({
    mutationFn: () => exportsService.backup(),
    onSuccess: () => toast.success('Backup berhasil diunduh'),
    onError: () => toast.error('Gagal mengunduh'),
  })
}
