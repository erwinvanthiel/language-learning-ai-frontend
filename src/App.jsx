import { useEffect, useRef, useState } from 'react'
import { GoogleLogin, googleLogout } from '@react-oauth/google'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  'https://language-learning-ai-api-evth.azurewebsites.net'

export default function App() {
  const [credential, setCredential] = useState(() =>
    sessionStorage.getItem('googleCredential'),
  )
  const [context, setContext] = useState('')
  const [messages, setMessages] = useState([])
  const [authError, setAuthError] = useState('')
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!credential) return

    let isCurrent = true
    setIsHistoryLoading(true)
    setAuthError('')

    fetch(`${API_BASE_URL}/messages`, {
      headers: { Authorization: `Bearer ${credential}` },
    })
      .then(async (response) => {
        if (response.status === 401) {
          throw new Error('Your Google session expired. Please sign in again.')
        }
        if (!response.ok) {
          throw new Error(`The API returned HTTP ${response.status}.`)
        }
        return response.json()
      })
      .then((storedMessages) => {
        if (!isCurrent) return
        setMessages(
          storedMessages.map((message) => ({
            id: message.id,
            role: message.role ?? 'user',
            text: message.text,
          })),
        )
      })
      .catch((requestError) => {
        if (!isCurrent) return
        setAuthError(requestError.message || 'Could not load your messages.')
        if (requestError.message?.includes('expired')) signOut()
      })
      .finally(() => {
        if (isCurrent) setIsHistoryLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [credential])

  function signIn(response) {
    if (!response.credential) {
      setAuthError('Google did not return an identity token.')
      return
    }
    sessionStorage.setItem('googleCredential', response.credential)
    setCredential(response.credential)
  }

  function signOut() {
    googleLogout()
    sessionStorage.removeItem('googleCredential')
    setCredential(null)
    setMessages([])
    setContext('')
  }

  async function generateResponse(event) {
    event.preventDefault()
    const prompt = context.trim()

    if (!prompt || isLoading) return

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: crypto.randomUUID(), role: 'user', text: prompt },
    ])
    setContext('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credential}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context: { text: prompt } }),
      })

      if (!response.ok) {
        throw new Error(`The API returned HTTP ${response.status}.`)
      }

      const data = await response.json()
      setMessages((currentMessages) => [
        ...currentMessages,
        { id: crypto.randomUUID(), role: 'assistant', text: data.response },
      ])
    } catch (requestError) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          isError: true,
          text: requestError.message || 'Could not reach the API.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  if (!credential) {
    return (
      <main className="sign-in-page">
        <section className="sign-in-card">
          <h1>Language Learning AI</h1>
          <p>Sign in to save your messages.</p>
          <GoogleLogin onError={() => setAuthError('Google sign-in failed.')} onSuccess={signIn} />
          {authError && <p className="auth-error">{authError}</p>}
        </section>
      </main>
    )
  }

  return (
    <main>
      <header className="top-bar">
        <span>Language Learning AI</span>
        <button className="secondary-button" onClick={signOut} type="button">
          Sign out
        </button>
      </header>
      <section aria-label="Conversation" className="conversation">
        {isHistoryLoading && (
          <div aria-live="polite" className="message assistant pending">
            Loading messages…
          </div>
        )}
        {authError && <div className="message assistant error">{authError}</div>}
        {messages.map((message) => (
          <article
            className={`message ${message.role}${message.isError ? ' error' : ''}`}
            key={message.id}
          >
            <span className="visually-hidden">
              {message.role === 'user' ? 'You' : 'Assistant'}:
            </span>
            {message.text}
          </article>
        ))}
        {isLoading && (
          <div aria-live="polite" className="message assistant pending">
            Generating…
          </div>
        )}
        <div ref={messagesEndRef} />
      </section>

      <form className="composer" onSubmit={generateResponse}>
        <label className="visually-hidden" htmlFor="context">
          Message
        </label>
        <textarea
          id="context"
          value={context}
          onChange={(event) => setContext(event.target.value)}
          placeholder="Type a message…"
          required
        />

        <button type="submit" disabled={isLoading || !context.trim()}>
          Send
        </button>
      </form>
    </main>
  )
}
