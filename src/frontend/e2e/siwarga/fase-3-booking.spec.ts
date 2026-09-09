import {
  test,
  expect,
  apiToken,
  apiPost,
  apiGet,
  apiBaseURL,
  uid,
  defaultAdmin,
} from './setup'

test('warga requests a booking and admin approves it', async ({
  wargaPage,
  request,
}) => {
  const token = await apiToken(request, defaultAdmin.email, 'password')
  const name = `E2E Aula ${uid()}`
  const facility = await apiPost(request, token, '/api/facilities', {
    name,
    rental_fee: null,
  })
  const id = (facility as { id: number }).id

  await wargaPage.goto('/bookings')
  // Header + per-card buttons share the name — the header one opens a blank form.
  await wargaPage
    .getByRole('button', { name: 'Ajukan Booking' })
    .first()
    .click()
  // Facility field is a shadcn (non-native) Select: open the combobox, then
  // pick the option (selectOption does not work here).
  await wargaPage.getByRole('combobox', { name: 'Pilih Fasilitas' }).click()
  await wargaPage.getByRole('option', { name }).click()
  const tomorrow = new Date(Date.now() + 86400000)
  const start = new Date(tomorrow)
  start.setHours(9, 0, 0, 0)
  const end = new Date(tomorrow)
  end.setHours(12, 0, 0, 0)
  // Datetime inputs carry ids (no name attrs): booking-start-at / booking-end-at.
  await wargaPage.getByLabel('Mulai *').fill(start.toISOString().slice(0, 16))
  await wargaPage.getByLabel('Selesai *').fill(end.toISOString().slice(0, 16))
  await wargaPage.getByRole('button', { name: 'Kirim Pengajuan' }).click()
  await expect(wargaPage.getByText(name).first()).toBeVisible()

  // Admin approves via API; the decision lands in the warga notifications
  // inbox (database channel — never assert WA delivery).
  const wargaToken = await apiToken(request, 'warga@siwarga.test', 'password')
  const list = (await apiGet(
    request,
    wargaToken,
    `/api/bookings?facility_id=${id}`
  )) as { data: { id: number }[] }
  const bookingId = list.data[0].id
  const ok = await request.post(
    `${apiBaseURL}/api/bookings/${bookingId}/approve`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  expect(ok.ok()).toBeTruthy()

  await wargaPage.goto('/notifications')
  await expect(wargaPage.getByText(name).first()).toBeVisible()
})

test('overlapping approve is rejected with a clear message', async ({
  request,
}) => {
  const token = await apiToken(request, defaultAdmin.email, 'password')
  const facility = await apiPost(request, token, '/api/facilities', {
    name: `E2E Lapangan ${uid()}`,
  })
  const fid = (facility as { id: number }).id
  const start = new Date(Date.now() + 2 * 86400000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ')
  const end = new Date(Date.now() + 2 * 86400000 + 3600000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ')
  const wargaToken = await apiToken(request, 'warga@siwarga.test', 'password')
  const first = await apiPost(request, wargaToken, '/api/bookings', {
    facility_id: fid,
    start_at: start,
    end_at: end,
  })
  const second = await apiPost(request, wargaToken, '/api/bookings', {
    facility_id: fid,
    start_at: start,
    end_at: end,
  })
  const firstId = (first as { id: number }).id
  const secondId = (second as { id: number }).id

  const ok = await request.post(
    `${apiBaseURL}/api/bookings/${firstId}/approve`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  expect(ok.ok()).toBeTruthy()

  const clash = await request.post(
    `${apiBaseURL}/api/bookings/${secondId}/approve`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  expect(clash.status()).toBe(422)
})

test('warga borrows an asset and admin approves and records return', async ({
  wargaPage,
  request,
}) => {
  const token = await apiToken(request, defaultAdmin.email, 'password')
  const name = `E2E Tenda ${uid()}`
  await apiPost(request, token, '/api/assets', {
    name,
    quantity: 5,
  })

  await wargaPage.goto('/assets')
  // Narrow the catalog to the new asset (server-side search, 400ms debounce).
  await wargaPage.getByPlaceholder('Cari aset').fill(name)
  // Scope to the asset's own card: every card has a `Pinjam` button.
  const card = wargaPage.getByRole('article', { name: `Aset ${name}` })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Pinjam' }).click()
  await wargaPage.getByRole('button', { name: 'Ajukan Pinjaman' }).click()
  await expect(wargaPage.getByText(name).first()).toBeVisible()

  // Admin approves then records the return via API (status jobs go to the
  // queue — assert API state only, never WA delivery).
  const wargaToken = await apiToken(request, 'warga@siwarga.test', 'password')
  const loans = (await apiGet(
    request,
    wargaToken,
    '/api/asset-loans?status=pending&per_page=100'
  )) as { data: { id: number; asset_name: string }[] }
  const loan = loans.data.find((l) => l.asset_name === name)
  expect(loan).toBeDefined()
  const approved = await request.post(
    `${apiBaseURL}/api/asset-loans/${loan!.id}/approve`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  expect(approved.ok()).toBeTruthy()
  const returned = await request.post(
    `${apiBaseURL}/api/asset-loans/${loan!.id}/return`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  expect(returned.ok()).toBeTruthy()
  const detail = await returned.json()
  expect(detail.data.status).toBe('returned')
})
