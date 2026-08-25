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
      screen.getByLabelText('Context'),
      'Help me practise Dutch greetings',
    )
    await user.click(screen.getByRole('button', { name: 'Generate response' }))

    expect(
      await screen.findByText('Practise saying: Goedemorgen!'),
    ).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/generate$/),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          context: { text: 'Help me practise Dutch greetings' },
        }),
      }),
    )
  })
})
