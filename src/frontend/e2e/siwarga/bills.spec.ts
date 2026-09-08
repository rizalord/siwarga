import {
  test,
  expect,
  login,
  defaultAdmin,
  apiToken,
  apiPost,
  uid,
} from './setup'

async function seedBillingFixtures(
  request: Parameters<typeof apiToken>[0],
  id: string
) {
  const token = await apiToken(request)
  const dueType = await apiPost(request, token, '/api/due-types', {
    name: `E2E Iuran ${id}`,
    amount: 50000,
    billing_cycle: 'bulanan',
  })
  const house = await apiPost(request, token, '/api/houses', {
    house_number: `E2E-B${id}`,
    address: 'Jl. E2E',
  })
  const resident = await apiPost(request, token, '/api/residents', {
    full_name: `E2E Warga ${id}`,
    status: 'tetap',
    phone_number: `08${Date.now().toString().slice(-10)}`,
    marital_status: 'belum_menikah',
  })
  await apiPost(
    request,
    token,
    `/api/houses/${house.id as number}/assign-resident`,
    { resident_id: resident.id as number, start_date: '2026-01-01' }
  )
  return {
    token,
    dueTypeId: dueType.id as number,
    dueTypeName: dueType.name as string,
    houseNumber: house.house_number as string,
  }
}

test.describe('Tagihan & Pembayaran', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, defaultAdmin.email, defaultAdmin.password)
  })

  test('Admin dapat generate tagihan', async ({ page, request }) => {
    const id = uid()
    const { houseNumber, dueTypeName } = await seedBillingFixtures(
      request,
      id
    )

    await page.goto('/bills')
    await page.click('text=Buat Tagihan')

    await page.fill('#month', '6')
    await page.fill('#year', '2028')
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Buat', exact: true })
      .click()

    await expect(page.locator('text=bills generated')).toBeVisible()
    await page.fill(
      'input[placeholder="Cari penghuni atau rumah..."]',
      houseNumber
    )
    // Cari baris tagihan milik rumah + jenis iuran test ini (generate
    // fleksibel dari test lain juga membuat baris untuk rumah ini)
    const row = page
      .locator(`tr:has-text("${houseNumber}")`)
      .filter({ hasText: dueTypeName })
    await expect(row).toBeVisible()
  })

  test('Admin dapat catat pembayaran', async ({ page, request }) => {
    const id = uid()
    const token = await apiToken(request)
    const flexType = await apiPost(request, token, '/api/due-types', {
      name: `E2E Flex ${id}`,
      amount: 100000,
      billing_cycle: 'fleksibel',
    })
    const house = await apiPost(request, token, '/api/houses', {
      house_number: `E2E-P${id}`,
      address: 'Jl. E2E',
    })
    const resident = await apiPost(request, token, '/api/residents', {
      full_name: `E2E Bayar ${id}`,
      status: 'tetap',
      phone_number: `08${Date.now().toString().slice(-10)}`,
      marital_status: 'belum_menikah',
    })
    await apiPost(
      request,
      token,
      `/api/houses/${house.id as number}/assign-resident`,
      { resident_id: resident.id as number, start_date: '2026-01-01' }
    )
    await apiPost(request, token, '/api/bills/generate-flexible', {
      due_type_id: flexType.id as number,
      period_start: '2028-03-01',
      period_end: '2028-03-31',
      amount_due: 100000,
    })

    await page.goto('/payments')
    await page.click('text=Catat Pembayaran')

    await page.getByRole('combobox').click()
    await page.fill(
      'input[placeholder="Cari tagihan..."]',
      house.house_number as string
    )
    await page
      .getByRole('option', { name: house.house_number as string })
      .first()
      .click()

    await page.click('text=Pilih tanggal...')
    // react-day-picker menamai tombol hari "Weekday, Month 15th, YYYY"
    await page.getByRole('button', { name: /15th,/ }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Simpan', exact: true })
      .click()

    await expect(
      page.locator('text=Pembayaran berhasil dicatat')
    ).toBeVisible()
  })
})
