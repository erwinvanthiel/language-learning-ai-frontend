import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('App', () => {
  it('sends the text as context and displays the generated response', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'Practise saying: Goedemorgen!' }),
    })

    render(<App />)
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
        body: JSON.stringify({
          context: { text: 'Help me practise Dutch greetings' },
        }),
      }),
    )
    expect(screen.getByLabelText('Message').value).toBe('')
  })
})
