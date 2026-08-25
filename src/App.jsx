import { useState } from 'react'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  'https://language-learning-ai-api-evth.azurewebsites.net'

export default function App() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function loadMessage() {
    setIsLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/`)

      if (!response.ok) {
        throw new Error(`The API returned HTTP ${response.status}.`)
      }

      const data = await response.json()
      setMessage(data.message)
    } catch (requestError) {
      setError(requestError.message || 'Could not reach the API.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main>
      <button type="button" onClick={loadMessage} disabled={isLoading}>
        {isLoading ? 'Loading…' : 'Get message'}
      </button>

      <p aria-live="polite">
        {message || error}
      </p>
    </main>
  )
}

