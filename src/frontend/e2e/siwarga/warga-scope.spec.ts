import {
  test,
  expect,
  login,
  defaultAdmin,
  apiToken,
  apiPost,
  apiGet,
  uid,
} from './setup'

async function seedWarga(
  request: Parameters<typeof apiToken>[0],
  uid: string
) {
  const token = await apiToken(request)
  await apiPost(request, token, '/api/due-types', {
    name: `E2E Iuran W${uid}`,
    amount: 25000,
    billing_cycle: 'bulanan',
  })
  const house = await apiPost(request, token, '/api/houses', {
    house_number: `E2E-W${uid}`,
    address: 'Jl. E2E',
  })
  const resident = await apiPost(request, token, '/api/residents', {
    full_name: `E2E Penghuni W${uid}`,
    status: 'tetap',
    phone_number: `08${uid}78`,
    marital_status: 'belum_menikah',
  })
  await apiPost(
    request,
    token,
    `/api/houses/${house.id as number}/assign-resident`,
    { resident_id: resident.id as number, start_date: '2026-01-01' }
  )
  await apiPost(request, token, '/api/bills/generate', {
    month: 6,
    year: 2028,
  })
  const rolesBody = (await apiGet(request, token, '/api/roles')) as {
    data: { id: number; name: string }[]
  }
  const wargaRole = rolesBody.data.find((r) => r.name === 'warga')
  if (!wargaRole) throw new Error('warga role not found')
  const email = `e2e-warga-${uid}@siwarga.test`
  await apiPost(request, token, '/api/users', {
    name: `E2E Warga ${uid}`,
    email,
    password: 'password123',
    resident_id: resident.id as number,
    role_ids: [wargaRole.id],
  })
  return { email, password: 'password123' }
}

test.describe('Warga Scope', () => {
  test('Warga hanya melihat tagihan sendiri', async ({ page, request }) => {
    const id = uid()
    const creds = await seedWarga(request, id)
    await login(page, creds.email, creds.password)

    await page.goto('/bills')
    await expect(page.locator('table')).toBeVisible()

    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)

    // Warga tidak punya aksi generate
    await expect(page.locator('text=Buat Tagihan')).not.toBeVisible()
  })

  test('Warga tidak bisa kelola data master', async ({ page, request }) => {
    const id = uid()
    const creds = await seedWarga(request, id)
    await login(page, creds.email, creds.password)

    // API menolak (403) sehingga tabel kosong dan tombol kelola disembunyikan
    await page.goto('/residents')
    await expect(page.locator('text=Tidak ada data.')).toBeVisible()
    await expect(page.locator('text=Tambah Penghuni')).not.toBeVisible()

    await page.goto('/houses')
    await expect(page.locator('text=Tidak ada data.')).toBeVisible()
    await expect(page.locator('text=Tambah Rumah')).not.toBeVisible()

    await page.goto('/users')
    await expect(page.locator('text=Tambah Pengguna')).not.toBeVisible()
  })

  test('Warga bisa lihat dashboard', async ({ page, request }) => {
    const id = uid()
    const creds = await seedWarga(request, id)
    await login(page, creds.email, creds.password)

    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Dashboard' })
    ).toBeVisible()
  })
})
