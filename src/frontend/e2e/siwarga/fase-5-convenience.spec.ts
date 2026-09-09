import {
  test,
  expect,
  apiToken,
  apiPost,
  apiGet,
  uid,
  defaultAdmin,
  apiBaseURL,
  login,
} from './setup'

// Only the PWA test uses the production preview (SW registers PROD-only).
// All other tests run against the dev server (:5173). Preview is served via
// `npm run build && npx vite preview --port 4173` with VITE_USE_MOCK=false,
// so the API baseURL still reaches the backend on :8000.
const PREVIEW_URL = 'http://localhost:4173'

type RecordLike = Record<string, unknown>

interface SeedBill {
  id: number
  due_type: { name: string }
  house: { house_number: string }
}

// 1x1 transparent PNG for proof uploads (passes image/* + 2MB client check).
const PROOF_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

function randomPhone(): string {
  return `08${Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('')}`
}

async function seedWargaWithBills(
  request: Parameters<typeof apiToken>[0],
  suffix: string,
  dueTypeNames: string[]
) {
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

  for (const name of dueTypeNames) {
    await apiPost(request, adminToken, '/api/due-types', {
      name,
      amount: 75000,
      billing_cycle: 'bulanan',
    })
  }

  const house = (await apiPost(request, adminToken, '/api/houses', {
    house_number: `E2E-C${suffix}`,
    address: 'Jl. E2E',
  })) as RecordLike

  const resident = (await apiPost(request, adminToken, '/api/residents', {
    full_name: `E2E Penghuni ${suffix}`,
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

  const email = `e2e-conv-warga-${suffix}@siwarga.test`
  await apiPost(request, adminToken, '/api/users', {
    name: `E2E Conv Warga ${suffix}`,
    email,
    password: 'password123',
    resident_id: resident.id as number,
    role_ids: [wargaRole.id],
  })
  const wargaToken = await apiToken(request, email, 'password123')
  const billsBody = (await apiGet(
    request,
    wargaToken,
    '/api/bills?status=belum_lunas&per_page=100'
  )) as { data: SeedBill[] }

  return { email, password: 'password123', wargaToken, bills: billsBody.data }
}

interface TrxRow {
  id: number
  bill_id: number
  status: string
  reference: string
}

async function wargaTransactions(
  request: Parameters<typeof apiToken>[0],
  wargaToken: string
): Promise<TrxRow[]> {
  const body = (await apiGet(
    request,
    wargaToken,
    '/api/payment-transactions?per_page=50'
  )) as { data: TrxRow[] }
  return body.data
}

test.describe('Fase 5 convenience', () => {
  test('simulator qris pay settles the bill', async ({ page, request }) => {
    const suffix = uid()
    const dueTypeName = `E2E Iuran ${suffix}`
    const { email, password, wargaToken, bills } =
      await seedWargaWithBills(request, suffix, [dueTypeName])
    const bill = bills.find((b) => b.due_type.name === dueTypeName)
    expect(bill).toBeDefined()

    await login(page, email, password)
    await page.goto('/payments-online')
    await expect(
      page.getByRole('heading', { name: 'Bayar Online' })
    ).toBeVisible()

    // Create a QRIS transaction via UI (provider defaults to simulator,
    // sent as a per-request `provider` field — never server env).
    await page.getByLabel('Tagihan').click()
    await page
      .getByRole('option')
      .filter({ hasText: dueTypeName })
      .first()
      .click()
    await page.getByRole('button', { name: 'Kirim Pembayaran' }).click()

    // Generous timeouts: creation hits the API and the shared dev DB can be
    // slow under full-suite parallel load (condition polling, not sleeps).
    await expect(page.getByText(/Detail Pembayaran/)).toBeVisible({
      timeout: 30_000,
    })
    await page.getByRole('button', { name: 'Simulasi Bayar' }).click()
    await expect(page.getByText('Simulasi berhasil')).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText('Lunas').first()).toBeVisible({
      timeout: 30_000,
    })

    // Assert DB/API state (no WA jobs in this phase).
    const trxs = await wargaTransactions(request, wargaToken)
    const trx = trxs.find((t) => t.bill_id === bill!.id)
    expect(trx?.status).toBe('paid')

    const billDetail = (await apiGet(
      request,
      wargaToken,
      `/api/bills/${bill!.id}`
    )) as { data: { status: string } }
    expect(billDetail.data.status).toBe('lunas')
  })

  test('manual proof upload then bendahara verify settles', async ({
    page,
    request,
    browser,
  }) => {
    const suffix = uid()
    const dueApprove = `E2E Manual OK ${suffix}`
    const dueReject = `E2E Manual NO ${suffix}`
    const { email, password, wargaToken, bills } =
      await seedWargaWithBills(request, suffix, [dueApprove, dueReject])
    const billApprove = bills.find((b) => b.due_type.name === dueApprove)
    const billReject = bills.find((b) => b.due_type.name === dueReject)
    expect(billApprove).toBeDefined()
    expect(billReject).toBeDefined()

    await login(page, email, password)
    await page.goto('/payments-online')
    await expect(
      page.getByRole('heading', { name: 'Bayar Online' })
    ).toBeVisible()

    // Case 1: warga uploads proof via UI (Upload Bukti).
    await page.getByLabel('Tagihan').click()
    await page
      .getByRole('option')
      .filter({ hasText: dueApprove })
      .first()
      .click()
    await page.getByLabel('Kanal pembayaran').click()
    await page
      .getByRole('option')
      .filter({ hasText: 'Transfer Manual' })
      .first()
      .click()
    await page.setInputFiles('#trx-proof', [
      { name: 'bukti.png', mimeType: 'image/png', buffer: PROOF_PNG },
    ])
    await page.getByRole('button', { name: 'Kirim Pembayaran' }).click()
    await expect(page.getByText(/Detail Pembayaran/)).toBeVisible({
      timeout: 30_000,
    })

    const created = (await wargaTransactions(request, wargaToken)).find(
      (t) => t.bill_id === billApprove!.id
    )
    expect(created).toBeDefined()
    expect(created!.status).toBe('awaiting_verification')

    // Verification via UI (Setujui). NOTE: performed as admin, which holds
    // `payments.verify` like bendahara. The seeded bendahara account cannot
    // reach this list: index/show routes require `can:payments.online`,
    // which only warga holds (RoleSeeder) — see task report for follow-up.
    const verifierPage = await browser.newPage()
    try {
      await login(verifierPage, defaultAdmin.email, defaultAdmin.password)
      await verifierPage.goto('/payments-online?status=awaiting_verification')
      const row = verifierPage
        .getByRole('row', { name: new RegExp(created!.reference) })
        .first()
      await expect(row).toBeVisible({ timeout: 30_000 })
      await row
        .getByRole('button', { name: 'Setujui', exact: true })
        .click()
      await expect(
        verifierPage.getByText('Pembayaran diverifikasi')
      ).toBeVisible({ timeout: 30_000 })
    } finally {
      await verifierPage.close()
    }

    const approved = (await wargaTransactions(request, wargaToken)).find(
      (t) => t.bill_id === billApprove!.id
    )
    expect(approved?.status).toBe('paid')
    const approvedBill = (await apiGet(
      request,
      wargaToken,
      `/api/bills/${billApprove!.id}`
    )) as { data: { status: string } }
    expect(approvedBill.data.status).toBe('lunas')

    // Case 2: second manual transaction, bendahara rejects (Tolak) with reason.
    await page.getByRole('button', { name: 'Buat Transaksi Lain' }).click()
    await page.getByLabel('Tagihan').click()
    await page
      .getByRole('option')
      .filter({ hasText: dueReject })
      .first()
      .click()
    await page.getByLabel('Kanal pembayaran').click()
    await page
      .getByRole('option')
      .filter({ hasText: 'Transfer Manual' })
      .first()
      .click()
    await page.setInputFiles('#trx-proof', [
      { name: 'bukti-tolak.png', mimeType: 'image/png', buffer: PROOF_PNG },
    ])
    await page.getByRole('button', { name: 'Kirim Pembayaran' }).click()
    await expect(page.getByText(/Detail Pembayaran/)).toBeVisible({
      timeout: 30_000,
    })

    const createdReject = (await wargaTransactions(request, wargaToken)).find(
      (t) => t.bill_id === billReject!.id
    )
    expect(createdReject).toBeDefined()

    const verifierPage2 = await browser.newPage()
    try {
      await login(verifierPage2, defaultAdmin.email, defaultAdmin.password)
      await verifierPage2.goto('/payments-online?status=awaiting_verification')
      const row2 = verifierPage2
        .getByRole('row', { name: new RegExp(createdReject!.reference) })
        .first()
      await expect(row2).toBeVisible({ timeout: 30_000 })
      await row2.getByRole('button', { name: 'Tolak', exact: true }).click()
      await verifierPage2
        .getByLabel('Alasan penolakan')
        .fill('Bukti tidak jelas e2e')
      await verifierPage2
        .getByRole('button', { name: 'Tolak Transaksi' })
        .click()
      await expect(
        verifierPage2.getByText('Transaksi ditolak')
      ).toBeVisible({ timeout: 30_000 })
    } finally {
      await verifierPage2.close()
    }

    const rejected = (await wargaTransactions(request, wargaToken)).find(
      (t) => t.bill_id === billReject!.id
    )
    expect(rejected?.status).toBe('rejected')
    const rejectedBill = (await apiGet(
      request,
      wargaToken,
      `/api/bills/${billReject!.id}`
    )) as { data: { status: string } }
    expect(rejectedBill.data.status).toBe('belum_lunas')
  })

  test('monthly PDF downloads with PDF magic', async ({ request }) => {
    const token = await apiToken(
      request,
      defaultAdmin.email,
      defaultAdmin.password
    )
    const res = await request.get(
      `${apiBaseURL}/api/reports/monthly/2026/1/pdf`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    expect(res.ok()).toBeTruthy()
    expect(res.headers()['content-type']).toContain('application/pdf')
    const buf = await res.body()
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
  })

  test('PWA manifest linked and service worker registered', async ({
    page,
  }) => {
    await page.goto(PREVIEW_URL)
    const manifest = await page.getAttribute('link[rel="manifest"]', 'href')
    expect(manifest).toBe('/manifest.webmanifest')
    const sw = await page.evaluate(() => 'serviceWorker' in navigator)
    expect(sw).toBeTruthy()
    await expect
      .poll(
        async () =>
          page.evaluate(
            async () =>
              (await navigator.serviceWorker.getRegistrations()).length
          ),
        { timeout: 15000 }
      )
      .toBeGreaterThan(0)
  })
})
