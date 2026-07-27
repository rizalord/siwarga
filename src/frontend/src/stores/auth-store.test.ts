import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth-store'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().auth.reset()
  })

  it('should start with no token and no user', () => {
    const state = useAuthStore.getState()
    expect(state.auth.accessToken).toBe('')
    expect(state.auth.user).toBeNull()
  })

  it('should set access token', () => {
    useAuthStore.getState().auth.setAccessToken('test-token')
    expect(useAuthStore.getState().auth.accessToken).toBe('test-token')
  })

  it('should set user', () => {
    const user = { id: 1, name: 'Test', email: 'test@test.com', permissions: [] }
    useAuthStore.getState().auth.setUser(user)
    expect(useAuthStore.getState().auth.user).toEqual(user)
  })

  it('should reset state', () => {
    useAuthStore.getState().auth.setAccessToken('test-token')
    useAuthStore.getState().auth.reset()
    expect(useAuthStore.getState().auth.accessToken).toBe('')
    expect(useAuthStore.getState().auth.user).toBeNull()
  })
})
