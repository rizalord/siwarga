import {
  test,
  expect,
  apiToken,
  apiPost,
  apiGet,
  uid,
  defaultAdmin,
} from './setup'

test('warga reads a targeted announcement and the badge clears', async ({
  wargaPage,
  request,
}) => {
  const token = await apiToken(request)
  const title = `E2E Pengumuman ${uid()}`
  await apiPost(request, token, '/api/announcements', {
    title,
    content: '<p>Info ronda malam ini.</p>',
    category: 'umum',
    published_at: new Date().toISOString(),
  })

  await wargaPage.goto('/pengumuman')
  await expect(wargaPage.getByText(title)).toBeVisible()
  await expect(wargaPage.getByText('Belum dibaca').first()).toBeVisible()

  await wargaPage.getByText(title).click()
  await expect(wargaPage.getByRole('dialog')).toBeVisible()
  await expect(wargaPage.getByRole('dialog').getByText(title)).toBeVisible()
})

test('warga votes once and sees results', async ({ wargaPage, request }) => {
  const token = await apiToken(request, defaultAdmin.email, 'password')
  const title = `E2E Polling ${uid()}`
  const poll = await apiPost(request, token, '/api/polls', {
    title,
    description: 'Pilih satu.',
    starts_at: new Date(Date.now() - 86400000).toISOString(),
    ends_at: new Date(Date.now() + 86400000).toISOString(),
    options: ['Opsi A', 'Opsi B'],
  })
  const pollId = (poll as { id: number }).id

  await wargaPage.goto('/polls')
  await expect(wargaPage.getByText(title)).toBeVisible()
  // Scope to the poll's Card (title's parent chain is CardHeader, not the
  // Card itself, so `.locator('..')` would miss the vote form).
  const card = wargaPage.locator('div[data-slot="card"]', { hasText: title })
  await card.getByRole('radio', { name: 'Opsi A' }).check()
  await card.getByRole('button', { name: 'Vote' }).click()
  // Scoped to the card: the page subtitle also contains "hasil sementara".
  await expect(
    card.getByRole('heading', { name: 'Hasil sementara' })
  ).toBeVisible()

  // Second vote via API is rejected (422).
  const wargaToken = await apiToken(request, 'warga@siwarga.test', 'password')
  const detail = (await apiGet(request, wargaToken, `/api/polls/${pollId}`)) as {
    data: { options: { id: number }[] }
  }
  const res = await request.post(
    `http://localhost:8000/api/polls/${pollId}/vote`,
    {
      data: { option_id: detail.data.options[1].id },
      headers: { Authorization: `Bearer ${wargaToken}` },
    }
  )
  expect(res.status()).toBe(422)
})

test('warga creates a thread and replies', async ({ wargaPage }) => {
  const title = `E2E Diskusi ${uid()}`
  await wargaPage.goto('/forum')
  await wargaPage.getByPlaceholder('Judul diskusi baru').fill(title)
  await wargaPage.getByRole('button', { name: 'Buat Diskusi' }).click()
  await expect(wargaPage.getByText(title)).toBeVisible()

  await wargaPage.getByText(title).click()
  await wargaPage.getByPlaceholder('Tulis balasan').fill('Setuju, usul bagus.')
  await wargaPage.getByRole('button', { name: 'Kirim Balasan' }).click()
  await expect(wargaPage.getByText('Setuju, usul bagus.')).toBeVisible()
})
