import { useState } from 'react'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  'https://language-learning-ai-api-evth.azurewebsites.net'

export default function App() {
  const [context, setContext] = useState('')
  const [responseText, setResponseText] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function generateResponse(event) {
    event.preventDefault()
    setIsLoading(true)
    setResponseText('')
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context: { text: context } }),
      })

      if (!response.ok) {
        throw new Error(`The API returned HTTP ${response.status}.`)
      }

      const data = await response.json()
      setResponseText(data.response)
    } catch (requestError) {
      setError(requestError.message || 'Could not reach the API.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main>
      <section aria-live="polite" className={error ? 'response error' : 'response'}>
        {responseText || error}
      </section>

      <form onSubmit={generateResponse}>
        <label htmlFor="context">Context</label>
        <textarea
          id="context"
          value={context}
          onChange={(event) => setContext(event.target.value)}
          placeholder="What would you like help learning?"
          required
        />

        <button type="submit" disabled={isLoading || !context.trim()}>
          {isLoading ? 'Generating…' : 'Generate response'}
        </button>
      </form>
    </main>
  )
}
