import {
  test,
  expect,
  apiToken,
  apiPost,
  apiGet,
  apiBaseURL,
  uid,
  defaultAdmin,
  login,
} from './setup'

test.describe('Fase 4 security', () => {
  test('warga reports panic, satpam handles and resolves', async ({
    request,
    browser,
  }) => {
    // Per-test users isolate this flow from parallel workers sharing the
    // seeded demo accounts (1-active-alert rule + panic throttle are per
    // reporter, so a fresh reporter can never collide or trip them — no
    // cancel-sweep needed).
    const adminToken = await apiToken(request, defaultAdmin.email, 'password')
    const roles = (await apiGet(request, adminToken, '/api/roles?per_page=50')) as {
      data: { id: number; name: string }[]
    }
    const roleId = (name: string) =>
      roles.data.find((r) => r.name === name)!.id
    const suffix = uid()
    const wargaEmail = `e2e-panic-warga-${suffix}@siwarga.test`
    const satpamEmail = `e2e-panic-satpam-${suffix}@siwarga.test`
    await apiPost(request, adminToken, '/api/users', {
      name: `E2E Panic Warga ${suffix}`,
      email: wargaEmail,
      password: 'password123',
      role_ids: [roleId('warga')],
    })
    await apiPost(request, adminToken, '/api/users', {
      name: `E2E Panic Satpam ${suffix}`,
      email: satpamEmail,
      password: 'password123',
      role_ids: [roleId('satpam')],
    })
    const wargaToken = await apiToken(request, wargaEmail, 'password123')
    const satpamToken = await apiToken(request, satpamEmail, 'password123')

    const location = `E2E Panic ${suffix}`
    const panicPage = await browser.newPage()
    try {
      await login(panicPage, wargaEmail, 'password123')
      await panicPage.goto('/panic')
      await panicPage.getByRole('button', { name: 'Lapor Darurat' }).click()
      await panicPage.getByLabel('Lokasi kejadian').fill(location)
      // UI label is "Kirim Laporan Darurat" (adapted to implemented UI).
      await panicPage
        .getByRole('button', { name: 'Kirim Laporan Darurat' })
        .click()
      await expect(
        panicPage.getByText('Laporan darurat terkirim ke satpam')
      ).toBeVisible()
    } finally {
      await panicPage.close()
    }

    // Satpam handles then resolves via API (status jobs go to the queue —
    // assert API state only, never WA delivery).
    const list = (await apiGet(
      request,
      wargaToken,
      '/api/panic-alerts?status=active&per_page=100'
    )) as { data: { id: number; location_note: string | null }[] }
    const alert = list.data.find((a) => a.location_note === location)
    expect(alert).toBeDefined()

    const handled = await request.post(
      `${apiBaseURL}/api/panic-alerts/${alert!.id}/handle`,
      {
        headers: { Authorization: `Bearer ${satpamToken}` },
      }
    )
    expect(handled.ok()).toBeTruthy()
    const handledBody = await handled.json()
    expect(handledBody.data.status).toBe('handled')

    const resolved = await request.post(
      `${apiBaseURL}/api/panic-alerts/${alert!.id}/resolve`,
      {
        headers: { Authorization: `Bearer ${satpamToken}` },
      }
    )
    expect(resolved.ok()).toBeTruthy()
    const resolvedBody = await resolved.json()
    expect(resolvedBody.data.status).toBe('resolved')

    const detail = (await apiGet(
      request,
      wargaToken,
      `/api/panic-alerts/${alert!.id}`
    )) as { data: { status: string } }
    expect(detail.data.status).toBe('resolved')
  })

  test('guest pre-register then check-in and check-out', async ({
    wargaPage,
    request,
    browser,
  }) => {
    const adminToken = await apiToken(request, defaultAdmin.email, 'password')
    const houses = (await apiGet(
      request,
      adminToken,
      '/api/houses?per_page=1'
    )) as { data: { id: number }[] }
    const houseId = houses.data[0].id
    const guestName = `Tamu E2E ${uid()}`

    // Warga pre-registers via UI.
    await wargaPage.goto('/guest-logs')
    await wargaPage.getByRole('button', { name: 'Daftarkan Tamu' }).click()
    await wargaPage.getByLabel('Nama tamu *').fill(guestName)
    await wargaPage.getByLabel('ID rumah tujuan *').fill(String(houseId))
    await wargaPage.getByRole('button', { name: 'Kirim Pendaftaran' }).click()
    await expect(wargaPage.getByText('Tamu berhasil didaftarkan')).toBeVisible()
    await expect(
      wargaPage.getByText(`Kode kunjungan ${guestName}`)
    ).toBeVisible()

    // Satpam check-in/out via UI buttons, assert status badges.
    const satpamPage = await browser.newPage()
    try {
      await login(satpamPage, 'satpam@siwarga.test', 'password')
      await satpamPage.goto('/guest-logs')
      // Server-side search (debounced) narrows the table to the new guest.
      await satpamPage.getByPlaceholder('Cari tamu...').fill(guestName)
      const row = satpamPage
        .getByRole('row', { name: new RegExp(guestName) })
        .first()
      await expect(row).toBeVisible()

      await row.getByRole('button', { name: 'Check-in' }).click()
      await expect(satpamPage.getByText('Tamu check-in')).toBeVisible()
      await expect(row.getByText('Masuk')).toBeVisible()

      await row.getByRole('button', { name: 'Check-out' }).click()
      await expect(satpamPage.getByText('Tamu check-out')).toBeVisible()
      await expect(row.getByText('Keluar')).toBeVisible()
    } finally {
      await satpamPage.close()
    }
  })

  test('public household verify exposes no NIK', async ({ request }) => {
    const adminToken = await apiToken(request, defaultAdmin.email, 'password')
    const wargaToken = await apiToken(request, 'warga@siwarga.test', 'password')
    // Warga's own house hosts the probe member (16-digit unique NIK so the
    // absence assertion can't collide with other dev data).
    const card = (await apiGet(request, wargaToken, '/api/households/card')) as {
      data: { house_id: number; verify_token: string }
    }
    const suffix = uid()
    const nik = `9${Date.now().toString().slice(-8)}${Math.floor(1000000 + Math.random() * 9000000)}`
    await apiPost(request, adminToken, '/api/family-members', {
      house_id: card.data.house_id,
      name: `E2E KK ${suffix}`,
      relationship: 'kepala_keluarga',
      nik,
    })

    const fresh = (await apiGet(
      request,
      wargaToken,
      '/api/households/card'
    )) as { data: { verify_token: string } }
    const token = fresh.data.verify_token

    const res = await request.get(`${apiBaseURL}/api/public/households/${token}`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(JSON.stringify(body)).not.toContain(nik)
    const bad = await request.get(`${apiBaseURL}/api/public/households/1.invalid`)
    expect(bad.status()).toBe(404)
  })
})
