import {
  test,
  expect,
  apiToken,
  apiPost,
  apiGet,
  uid,
  defaultAdmin,
  login,
} from './setup'

type RecordLike = Record<string, unknown>

function randomPhone(): string {
  return `08${Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('')}`
}

interface SeededWarga {
  email: string
  password: string
  wargaToken: string
  adminToken: string
  houseId: number
}

// Per-test warga WITH house (panic-test pattern): fresh house + resident +
// assign-resident + user avoids collisions with parallel workers sharing the
// seeded demo accounts. Needed because the demo warga login is absent from
// the current dev DB (demo seeders commented out) and family/household
// endpoints require a linked house.
async function seedWargaWithHouse(
  request: Parameters<typeof apiToken>[0],
  suffix: string
): Promise<SeededWarga> {
  const adminToken = await apiToken(
    request,
    defaultAdmin.email,
    defaultAdmin.password
  )
  const rolesBody = (await apiGet(
    request,
    adminToken,
    '/api/roles?per_page=50'
  )) as { data: { id: number; name: string }[] }
  const wargaRole = rolesBody.data.find((r) => r.name === 'warga')
  if (!wargaRole) throw new Error('warga role not found')

  const house = (await apiPost(request, adminToken, '/api/houses', {
    house_number: `E2E-H6-${suffix}`,
    address: 'Jl. E2E Hardening',
  })) as RecordLike

  const resident = (await apiPost(request, adminToken, '/api/residents', {
    full_name: `E2E Huni ${suffix}`,
    status: 'tetap',
    phone_number: randomPhone(),
    marital_status: 'belum_menikah',
  })) as RecordLike

  await apiPost(
    request,
    adminToken,
    `/api/houses/${house.id as number}/assign-resident`,
    { resident_id: resident.id as number, start_date: '2026-01-01' }
  )

  const email = `e2e-hard-warga-${suffix}@siwarga.test`
  const password = 'password123'
  await apiPost(request, adminToken, '/api/users', {
    name: `E2E Hard Warga ${suffix}`,
    email,
    password,
    resident_id: resident.id as number,
    role_ids: [wargaRole.id],
  })
  const wargaToken = await apiToken(request, email, password)

  return {
    email,
    password,
    wargaToken,
    adminToken,
    houseId: house.id as number,
  }
}

// seedWargaWithHouse plus one unpaid bill (fase-5 convenience pattern):
// due-type → house → resident → assign → bills/generate → user, so the
// payment create form has a selectable Tagihan.
async function seedWargaWithBill(
  request: Parameters<typeof apiToken>[0],
  suffix: string,
  dueTypeName: string
): Promise<{ email: string; password: string }> {
  const adminToken = await apiToken(
    request,
    defaultAdmin.email,
    defaultAdmin.password
  )
  const rolesBody = (await apiGet(
    request,
    adminToken,
    '/api/roles?per_page=50'
  )) as { data: { id: number; name: string }[] }
  const wargaRole = rolesBody.data.find((r) => r.name === 'warga')
  if (!wargaRole) throw new Error('warga role not found')

  await apiPost(request, adminToken, '/api/due-types', {
    name: dueTypeName,
    amount: 75000,
    billing_cycle: 'bulanan',
  })

  const house = (await apiPost(request, adminToken, '/api/houses', {
    house_number: `E2E-H6V-${suffix}`,
    address: 'Jl. E2E Hardening VA',
  })) as RecordLike

  const resident = (await apiPost(request, adminToken, '/api/residents', {
    full_name: `E2E Huni VA ${suffix}`,
    status: 'tetap',
    phone_number: randomPhone(),
    marital_status: 'belum_menikah',
  })) as RecordLike

  await apiPost(
    request,
    adminToken,
    `/api/houses/${house.id as number}/assign-resident`,
    { resident_id: resident.id as number, start_date: '2026-01-01' }
  )
  await apiPost(request, adminToken, '/api/bills/generate', {
    month: 6,
    year: 2028,
  })

  const email = `e2e-hard-va-${suffix}@siwarga.test`
  const password = 'password123'
  await apiPost(request, adminToken, '/api/users', {
    name: `E2E Hard VA ${suffix}`,
    email,
    password,
    resident_id: resident.id as number,
    role_ids: [wargaRole.id],
  })

  return { email, password }
}

test.describe('Hardening backlog', () => {
  test('QR scan lands on VALID verify page; bad token invalid', async ({
    page,
    request,
  }) => {
    const suffix = uid()
    const { wargaToken, adminToken, houseId } = await seedWargaWithHouse(
      request,
      suffix
    )
    const headName = `E2E Head ${suffix}`
    await apiPost(request, adminToken, '/api/family-members', {
      house_id: houseId,
      name: headName,
      relationship: 'kepala_keluarga',
    })
    const card = (await apiGet(
      request,
      wargaToken,
      '/api/households/card'
    )) as { data: { verify_token: string; head_name: string } }
    expect(card.data.head_name).toBe(headName)

    await page.goto(`/verifikasi-keluarga/${card.data.verify_token}`)
    await expect(page.getByText('TERVERIFIKASI')).toBeVisible()
    await expect(page.getByText(headName)).toBeVisible()

    await page.goto('/verifikasi-keluarga/999.invalid')
    await expect(page.getByText('Kode tidak valid')).toBeVisible()
  })

  test('admin manages emergency contacts', async ({ page, request }) => {
    const adminToken = await apiToken(
      request,
      defaultAdmin.email,
      defaultAdmin.password
    )
    await login(page, defaultAdmin.email, defaultAdmin.password)
    await page.goto('/emergency-contacts')
    await expect(
      page.getByRole('heading', { name: 'Kontak Darurat' })
    ).toBeVisible()

    const suffix = uid()
    const name = `E2E Kontak ${suffix}`
    const phoneA = randomPhone()
    const phoneB = randomPhone()

    // Add via UI.
    await page.getByRole('button', { name: 'Tambah Kontak' }).click()
    await page.locator('#emergency-contact-name').fill(name)
    await page.locator('#emergency-contact-phone').fill(phoneA)
    await page.getByRole('button', { name: 'Simpan Kontak' }).click()
    await expect(page.getByText('Kontak darurat disimpan')).toBeVisible({
      timeout: 30_000,
    })
    const row = page
      .getByRole('row', { name: new RegExp(name) })
      .first()
    await expect(row).toBeVisible({ timeout: 30_000 })
    await expect(row.getByText(phoneA)).toBeVisible()

    // API-state assert (no mocks in e2e).
    const listed = (await apiGet(
      request,
      adminToken,
      '/api/emergency-contacts?per_page=100'
    )) as { data: { id: number; name: string; phone: string }[] }
    expect(listed.data.find((c) => c.name === name)?.phone).toBe(phoneA)

    // Edit phone via UI.
    await row.getByRole('button', { name: `Ubah kontak ${name}` }).click()
    await page.locator('#emergency-contact-phone').fill(phoneB)
    await page.getByRole('button', { name: 'Simpan Kontak' }).click()
    await expect(page.getByText('Kontak darurat disimpan')).toBeVisible({
      timeout: 30_000,
    })
    await expect(row.getByText(phoneB)).toBeVisible({ timeout: 30_000 })

    // Delete via UI.
    await row.getByRole('button', { name: `Hapus kontak ${name}` }).click()
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Hapus' })
      .click()
    await expect(page.getByText('Kontak darurat dihapus')).toBeVisible({
      timeout: 30_000,
    })
    await expect(
      page.getByRole('row', { name: new RegExp(name) })
    ).toHaveCount(0, { timeout: 30_000 })

    const after = (await apiGet(
      request,
      adminToken,
      '/api/emergency-contacts?per_page=100'
    )) as { data: { name: string }[] }
    expect(after.data.find((c) => c.name === name)).toBeUndefined()
  })

  test('dashboard widgets render per role', async ({
    page,
    request,
    browser,
  }) => {
    // Headings read from the committed security-widgets.tsx: 'Panic Aktif',
    // 'Tamu Hari Ini', 'Ronda Berikutnya'; shortcut link 'Lapor Darurat'.
    // Guest card stays canGuest-gated, so satpam (guest-logs.view) sees it
    // while nobody without panic-alerts.handle sees 'Panic Aktif'.
    await login(page, defaultAdmin.email, defaultAdmin.password)
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Dashboard' })
    ).toBeVisible()
    await expect(page.getByText('Panic Aktif')).toBeVisible()
    await expect(page.getByText('Tamu Hari Ini')).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Lapor Darurat' })
    ).toHaveCount(0)

    const satpamPage = await browser.newPage()
    try {
      await login(satpamPage, 'satpam@siwarga.test', 'password')
      await satpamPage.goto('/')
      await expect(
        satpamPage.getByRole('heading', { name: 'Dashboard' })
      ).toBeVisible()
      await expect(satpamPage.getByText('Panic Aktif')).toBeVisible()
      await expect(satpamPage.getByText('Tamu Hari Ini')).toBeVisible()
    } finally {
      await satpamPage.close()
    }

    const suffix = uid()
    const { email, password } = await seedWargaWithHouse(request, suffix)
    const wargaPage = await browser.newPage()
    try {
      await login(wargaPage, email, password)
      await wargaPage.goto('/')
      await expect(
        wargaPage.getByRole('heading', { name: 'Dashboard' })
      ).toBeVisible()
      await expect(
        wargaPage.getByRole('link', { name: 'Lapor Darurat' })
      ).toBeVisible()
      await expect(wargaPage.getByText('Panic Aktif')).toHaveCount(0)
    } finally {
      await wargaPage.close()
    }
  })

  test('short NIK rejected in family form', async ({ page, request }) => {
    const suffix = uid()
    const { email, password, wargaToken } = await seedWargaWithHouse(
      request,
      suffix
    )
    const memberName = `E2E Anggota ${suffix}`
    await login(page, email, password)
    await page.goto('/family')
    await expect(
      page.getByRole('heading', { name: 'Kartu Keluarga' })
    ).toBeVisible()

    await page.getByRole('button', { name: 'Tambah Anggota' }).click()
    await page.locator('#member-name').fill(memberName)
    await page.locator('#member-nik').fill('12345')
    // The NIK input carries a client hint (pattern=[0-9]{16}) whose native
    // bubble would block submit before the API is hit. Drop it so the
    // request reaches the server and the 422 toast path is exercised —
    // use-family surfaces failures only as toasts, there is no field error.
    await page.$eval('#member-nik', (el) => el.removeAttribute('pattern'))
    await page.getByRole('button', { name: 'Simpan Anggota' }).click()
    await expect(
      page.getByText('Gagal menambahkan anggota keluarga')
    ).toBeVisible({ timeout: 30_000 })
    // Dialog stays open: no silent success-close.
    await expect(
      page.getByText('Tambah Anggota Keluarga')
    ).toBeVisible()

    const members = (await apiGet(
      request,
      wargaToken,
      '/api/family-members?per_page=100'
    )) as { data: { name: string }[] }
    expect(members.data.find((m) => m.name === memberName)).toBeUndefined()
  })

  test('payment channel UI matches API contract (no ewallet, VA needs bank code)', async ({
    page,
    request,
  }) => {
    const suffix = uid()
    const dueTypeName = `E2E VA ${suffix}`
    const { email, password } = await seedWargaWithBill(
      request,
      suffix,
      dueTypeName
    )
    await login(page, email, password)
    await page.goto('/payments-online')
    await expect(
      page.getByRole('heading', { name: 'Bayar Online' })
    ).toBeVisible()

    // (a) The channel Select must not offer ewallet: backend accepts only
    // qris|va|manual_transfer (422 otherwise). Assert a valid option first
    // so the absence assertion can't pass on an unopened listbox.
    await page.getByLabel('Kanal pembayaran').click()
    await expect(
      page.getByRole('option', { name: 'Virtual Account' })
    ).toBeVisible()
    await expect(page.getByRole('option', { name: 'E-Wallet' })).toHaveCount(0)
    await page.getByRole('option', { name: 'Virtual Account' }).click()

    // (b) Selecting va reveals bank_code; submitting VA without bank_code
    // surfaces the Bahasa message.
    await expect(page.getByLabel('Kode bank')).toBeVisible()
    await page.getByLabel('Tagihan').click()
    await page
      .getByRole('option')
      .filter({ hasText: dueTypeName })
      .first()
      .click()
    await page.getByRole('button', { name: 'Kirim Pembayaran' }).click()
    // Both the inline field error and the toast carry the message — either
    // one surfacing satisfies the contract.
    await expect(
      page.getByText('Kode bank wajib diisi untuk kanal VA.').first()
    ).toBeVisible({ timeout: 30_000 })

    // Filling the bank code unblocks VA creation end-to-end (simulator).
    await page.getByLabel('Kode bank').fill('BRI')
    await page.getByRole('button', { name: 'Kirim Pembayaran' }).click()
    await expect(page.getByText(/Detail Pembayaran/)).toBeVisible({
      timeout: 30_000,
    })
  })
})
