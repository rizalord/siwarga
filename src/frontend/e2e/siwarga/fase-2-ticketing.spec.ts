import {
  test,
  expect,
  apiBaseURL,
  apiToken,
  apiPost,
  uid,
  defaultAdmin,
} from './setup'

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

  // Photo upload lives in the ticket detail dialog (label "Foto (maks 3)").
  await wargaPage.getByRole('button', { name: title }).click()
  const dialog = wargaPage.getByRole('dialog')
  await expect(
    dialog.getByRole('heading', { name: 'Detail Tiket' })
  ).toBeVisible()
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'lampu.png',
    mimeType: 'image/png',
    buffer: Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1,
      0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84,
      120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69,
      78, 68, 174, 66, 96, 130,
    ]),
  })
  await expect(dialog.getByText('Foto terlampir')).toBeVisible()
  await expect(
    dialog.getByRole('img', { name: /Lampiran tiket/ })
  ).toBeVisible()
})

test('admin status change notifies the warga bell', async ({
  wargaPage,
  request,
}) => {
  const wargaToken = await apiToken(request, 'warga@siwarga.test', 'password')
  const adminToken = await apiToken(request, defaultAdmin.email, 'password')
  const title = `E2E Status ${uid()}`
  const created = await apiPost(request, wargaToken, '/api/tickets', {
    title,
    description: 'Lampu gang mati total.',
  })
  const id = (created as { id: number }).id

  const res = await request.post(`${apiBaseURL}/api/tickets/${id}/status`, {
    data: { status: 'in_progress' },
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  expect(res.ok()).toBeTruthy()

  await wargaPage.goto('/notifications')
  // Scope the status assertion to the created ticket's own notification card:
  // the UI renders localized status labels ("Terbuka → Diproses"), never the
  // raw enum, so assert the localized new-status label inside that card.
  const card = wargaPage.getByRole('button', { name: title })
  await expect(card).toBeVisible()
  await expect(card.getByText(/Diproses/)).toBeVisible()
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
  // The inbox is admin-only (warga lacks suggestions.view), so the warga-side
  // proof of a server-accepted submit is the anonymous success toast.
  await expect(
    wargaPage.getByText('Saran berhasil dikirim secara anonim')
  ).toBeVisible()

  await adminPage.goto('/suggestions')
  await expect(adminPage.getByText(content)).toBeVisible()
})
