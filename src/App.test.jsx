import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }) => (
    <button onClick={() => onSuccess({ credential: 'google-id-token' })}>
      Sign in with Google
    </button>
  ),
  googleLogout: vi.fn(),
}))

beforeEach(() => {
  sessionStorage.setItem('googleCredential', 'existing-google-token')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  sessionStorage.clear()
})

describe('App', () => {
  it('sends the text as context and displays the generated response', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((url) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () =>
          url.endsWith('/messages')
            ? [
                { id: 'stored-1', role: 'user', text: 'Earlier message' },
                { id: 'stored-2', role: 'assistant', text: 'Earlier reply' },
              ]
            : { response: 'Practise saying: Goedemorgen!' },
      }),
    )

    render(<App />)
    expect(await screen.findByText('Earlier message')).toBeTruthy()
    expect(screen.getByText('Earlier message').closest('article').className).toContain('user')
    expect(screen.getByText('Earlier reply').closest('article').className).toContain('assistant')
    await user.type(
      screen.getByLabelText('Message'),
      'Help me practise Dutch greetings',
    )
    await user.click(screen.getByRole('button', { name: 'Send' }))

    const userMessage = screen.getByText('Help me practise Dutch greetings')
    const assistantMessage = await screen.findByText(
      'Practise saying: Goedemorgen!',
    )
    expect(userMessage.closest('article').className).toContain('user')
    expect(assistantMessage.closest('article').className).toContain('assistant')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/generate$/),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer existing-google-token',
        }),
        body: JSON.stringify({
          context: { text: 'Help me practise Dutch greetings' },
        }),
      }),
    )
    expect(screen.getByLabelText('Message').value).toBe('')
  })

  it('signs in with Google before loading the users messages', async () => {
    sessionStorage.clear()
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    })

    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sign in with Google' }))

    expect(await screen.findByLabelText('Message')).toBeTruthy()
    expect(sessionStorage.getItem('googleCredential')).toBe('google-id-token')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/messages$/),
      expect.objectContaining({
        headers: { Authorization: 'Bearer google-id-token' },
      }),
    )
  })
})
