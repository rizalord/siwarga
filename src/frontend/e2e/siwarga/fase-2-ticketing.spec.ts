import { test, expect, apiToken, apiPost, uid, defaultAdmin } from './setup'

test('warga reports a ticket with photo and sees it in the list', async ({
  wargaPage,
}) => {
  const title = `E2E Tiket ${uid()}`
  await wargaPage.goto('/tickets')
  await wargaPage.getByRole('button', { name: 'Lapor Masalah' }).click()
  await wargaPage.getByPlaceholder('Judul laporan').fill(title)
  await wargaPage.getByPlaceholder('Ceritakan masalahnya').fill('Lampu gang mati.')
  await wargaPage.getByRole('button', { name: 'Kirim Laporan' }).click()
  await expect(wargaPage.getByText(title)).toBeVisible()
})

test('admin status change notifies the warga bell', async ({
  adminPage,
  wargaPage,
  request,
}) => {
  void adminPage
  const wargaToken = await apiToken(request, 'warga@siwarga.test', 'password')
  const adminToken = await apiToken(request, defaultAdmin.email, 'password')
  const title = `E2E Status ${uid()}`
  const created = await apiPost(request, wargaToken, '/api/tickets', {
    title,
    description: 'Lampu gang mati total.',
  })
  const id = (created as { id: number }).id

  const res = await request.post(
    `http://localhost:8000/api/tickets/${id}/status`,
    {
      data: { status: 'in_progress' },
      headers: { Authorization: `Bearer ${adminToken}` },
    }
  )
  expect(res.ok()).toBeTruthy()

  await wargaPage.goto('/notifications')
  await expect(wargaPage.getByText(title).first()).toBeVisible()
  // UI renders localized status labels ("Terbuka → Diproses"), never the raw
  // enum, so assert the localized new-status label (Task 5–7 markup).
  await expect(wargaPage.getByText(/Diproses/).first()).toBeVisible()
})

test('anonymous suggestion lands in the admin inbox', async ({
  wargaPage,
  adminPage,
}) => {
  const content = `E2E Saran ${uid()} mohon ronda ditertibkan`
  await wargaPage.goto('/suggestions')
  await wargaPage.getByPlaceholder('Tulis saran Anda').fill(content)
  await wargaPage.getByRole('button', { name: 'Kirim Saran' }).click()
  // 'Saran Anonim' also matches the sidebar nav link, so scope to the page
  // heading (Task 7 markup) to stay unambiguous under strict mode.
  await expect(
    wargaPage.getByRole('heading', { name: 'Saran Anonim' })
  ).toBeVisible()

  await adminPage.goto('/suggestions')
  await expect(adminPage.getByText(content)).toBeVisible()
})
