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

type RecordLike = Record<string, unknown>

interface SnapshotRow {
  id: number
  camera_id: number
  event_type: string
  camera_name: string | null
}

interface NotificationRow {
  id: string
  data: {
    title: string
    actor_name: string
    new_status: string
  }
}

async function createSimulatorCamera(
  request: Parameters<typeof apiToken>[0],
  adminToken: string,
  suffix: string
): Promise<RecordLike> {
  return (await apiPost(request, adminToken, '/api/cameras', {
    name: `E2E CCTV ${suffix}`,
    ftp_user: `e2ecctv${suffix}`,
    camera_type: 'simulator',
  })) as RecordLike
}

test.describe('Fase 6 CCTV', () => {
  test('simulate produces snapshots visible in gallery + bell', async ({
    page,
    request,
  }) => {
    const suffix = uid()
    const adminToken = await apiToken(
      request,
      defaultAdmin.email,
      defaultAdmin.password
    )
    const cameraName = `E2E CCTV ${suffix}`
    const camera = await createSimulatorCamera(request, adminToken, suffix)
    const cameraId = camera.id as number

    // Simulate via API (dev-only endpoint) — never WA delivery for
    // `simulated` events (WA dispatches panic-only).
    const simRes = await request.post(
      `${apiBaseURL}/api/cameras/${cameraId}/simulate`,
      {
        data: { count: 1 },
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    expect(simRes.status()).toBe(201)

    // Assert API state: snapshot row exists for this camera.
    const snapsBody = (await apiGet(
      request,
      adminToken,
      `/api/camera-snapshots?camera_id=${cameraId}&per_page=5`
    )) as { data: SnapshotRow[] }
    const snapshot = snapsBody.data.find((s) => s.camera_id === cameraId)
    expect(snapshot).toBeDefined()
    expect(snapshot!.event_type).toBe('simulated')

    // Assert API state: bell payload contains the 'Snapshot CCTV' entry.
    const notifsBody = (await apiGet(
      request,
      adminToken,
      '/api/notifications?per_page=50'
    )) as { data: NotificationRow[] }
    const notif = notifsBody.data.find(
      (n) =>
        n.data?.title === 'Snapshot CCTV' &&
        n.data?.actor_name === cameraName
    )
    expect(notif).toBeDefined()

    // Gallery UI: narrow to simulated events, expect our camera's card.
    // (Camera filter dropdown only lists the first page of cameras, so the
    // event_type URL filter + uid-unique name keeps this deterministic.)
    await login(page, defaultAdmin.email, defaultAdmin.password)
    await page.goto('/cctv?event_type=simulated')
    await expect(
      page.getByRole('heading', { name: 'CCTV' })
    ).toBeVisible()
    await expect(page.getByText(cameraName).first()).toBeVisible({
      timeout: 30_000,
    })
    await expect(
      page.getByText('Simulasi', { exact: true }).first()
    ).toBeVisible({ timeout: 30_000 })

    // Bell UI: notifications page shows the entry.
    await page.goto('/notifications')
    await expect(page.getByText('Snapshot CCTV').first()).toBeVisible({
      timeout: 30_000,
    })
  })

  test('warga gets 403 on snapshots API', async ({ request }) => {
    const suffix = uid()
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

    const email = `e2e-cctv-warga-${suffix}@siwarga.test`
    await apiPost(request, adminToken, '/api/users', {
      name: `E2E CCTV Warga ${suffix}`,
      email,
      password: 'password123',
      role_ids: [wargaRole.id],
    })
    const wargaToken = await apiToken(request, email, 'password123')

    for (const path of ['/api/camera-snapshots', '/api/cameras']) {
      const res = await request.get(`${apiBaseURL}${path}`, {
        headers: { Authorization: `Bearer ${wargaToken}` },
      })
      expect(res.status()).toBe(403)
    }
  })

  test('public household verify still works (no regression)', async ({
    request,
  }) => {
    const res = await request.get(
      `${apiBaseURL}/api/public/households/999.invalid`
    )
    expect(res.status()).toBe(404)
  })
})
