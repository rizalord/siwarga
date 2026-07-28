import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { SiwargaSignInForm } from './siwarga-sign-in-form'

const mockLoginResponse = {
  data: {
    data: {
      user: { id: 1, name: 'Test User', email: 'test@example.com' },
      token: 'test-token',
      permissions: ['user.read'],
    },
  },
}

const navigate = vi.fn()
const setUserMock = vi.fn()
const setAccessTokenMock = vi.fn()
const loginMock = vi.fn()

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({
      auth: {
        setUser: setUserMock,
        setAccessToken: setAccessTokenMock,
      },
    }),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('@/services/auth', () => ({
  authService: {
    login: loginMock,
  },
}))

describe('SiwargaSignInForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render email and password fields', async () => {
    const screen = await render(<SiwargaSignInForm />)
    await expect.element(screen.getByLabelText(/email/i)).toBeInTheDocument()
    await expect
      .element(screen.getByLabelText(/password/i))
      .toBeInTheDocument()
  })

  it('should show validation error for empty fields', async () => {
    const screen = await render(<SiwargaSignInForm />)
    const signInButton = screen.getByRole('button', { name: /masuk/i })
    await userEvent.click(signInButton)

    await expect
      .element(screen.getByText(/email tidak valid/i))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(/password harus diisi/i))
      .toBeInTheDocument()
  })

  it('should call auth service and store on valid submission', async () => {
    loginMock.mockResolvedValue(mockLoginResponse)

    const screen = await render(<SiwargaSignInForm />)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const signInButton = screen.getByRole('button', { name: /masuk/i })

    await userEvent.fill(emailInput, 'test@example.com')
    await userEvent.fill(passwordInput, 'password123')
    await userEvent.click(signInButton)

    await vi.waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    await vi.waitFor(() => {
      expect(setUserMock).toHaveBeenCalledWith({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        permissions: ['user.read'],
      })
    })

    await vi.waitFor(() => {
      expect(setAccessTokenMock).toHaveBeenCalledWith('test-token')
    })

    await vi.waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ to: '/' })
    })
  })

  it('should handle login error gracefully', async () => {
    loginMock.mockRejectedValue(new Error('Login failed'))

    const screen = await render(<SiwargaSignInForm />)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const signInButton = screen.getByRole('button', { name: /masuk/i })

    await userEvent.fill(emailInput, 'test@example.com')
    await userEvent.fill(passwordInput, 'password123')
    await userEvent.click(signInButton)

    await vi.waitFor(() => {
      expect(loginMock).toHaveBeenCalled()
    })

    // setUser and setAccessToken should not be called on error
    expect(setUserMock).not.toHaveBeenCalled()
    expect(setAccessTokenMock).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})
