import { useEffect, useRef, useState } from 'react'
import { GoogleLogin, googleLogout } from '@react-oauth/google'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  'https://language-learning-ai-api-evth.azurewebsites.net'

const LANGUAGES = ['English', 'Dutch', 'German', 'French', 'Spanish', 'Italian', 'Portuguese']

function savedCredential() {
  return localStorage.getItem('googleCredential') ?? sessionStorage.getItem('googleCredential')
}

function highlightMessage(text, feedback, onSelect) {
  if (!feedback?.length) return text
  const parts = []
  let cursor = 0
  feedback
    .filter((item) => Number.isInteger(item.start) && Number.isInteger(item.end))
    .sort((a, b) => a.start - b.start)
    .forEach((item, index) => {
      const start = Math.max(cursor, item.start)
      const end = Math.min(text.length, item.end)
      if (start >= end) return
      if (start > cursor) parts.push(<span key={`text-${index}`}>{text.slice(cursor, start)}</span>)
      parts.push(
        <button
          className="message-highlight"
          key={`highlight-${index}`}
          onClick={() => onSelect(item)}
          type="button"
        >
          {text.slice(start, end)}
        </button>,
      )
      cursor = end
    })
  if (cursor < text.length) parts.push(<span key="text-end">{text.slice(cursor)}</span>)
  return parts
}

export default function App() {
  const [credential, setCredential] = useState(savedCredential)
  const [context, setContext] = useState('')
  const [messages, setMessages] = useState([])
  const [settings, setSettings] = useState({ native_language: 'English', learning_language: 'Dutch' })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeFeedback, setActiveFeedback] = useState(null)
  const conversationRef = useRef(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const conversation = conversationRef.current
    if (conversation) {
      conversation.scrollTo?.({ top: conversation.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (!credential) return

    let isCurrent = true
    setIsHistoryLoading(true)
    setAuthError('')

    const requestOptions = { headers: { Authorization: `Bearer ${credential}` } }
    Promise.all([
      fetch(`${API_BASE_URL}/messages`, requestOptions),
      fetch(`${API_BASE_URL}/settings`, requestOptions),
    ])
      .then(async ([messagesResponse, settingsResponse]) => {
        if (messagesResponse.status === 401 || settingsResponse.status === 401) {
          throw new Error('Your Google session expired. Please sign in again.')
        }
        if (!messagesResponse.ok || !settingsResponse.ok) {
          throw new Error('Could not load your account settings.')
        }
        return [await messagesResponse.json(), await settingsResponse.json()]
      })
      .then(([storedMessages, storedSettings]) => {
        if (!isCurrent) return
        const restoredMessages = []
        storedMessages.forEach((message) => {
          const restored = { id: message.id, role: message.role ?? 'user', text: message.text }
          if (restored.role === 'assistant' && message.feedback?.length) {
            const previousUser = [...restoredMessages].reverse().find((item) => item.role === 'user')
            if (previousUser) previousUser.feedback = message.feedback
          }
          restoredMessages.push(restored)
        })
        setMessages(restoredMessages)
        if (storedSettings?.native_language && storedSettings?.learning_language) {
          setSettings(storedSettings)
        }
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
    localStorage.setItem('googleCredential', response.credential)
    sessionStorage.removeItem('googleCredential')
    setCredential(response.credential)
  }

  function signOut() {
    googleLogout()
    localStorage.removeItem('googleCredential')
    sessionStorage.removeItem('googleCredential')
    setCredential(null)
    setMessages([])
    setActiveFeedback(null)
    setContext('')
    setIsSettingsOpen(false)
  }

  async function saveSettings(event) {
    event.preventDefault()
    setAuthError('')
    try {
      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${credential}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })
      if (!response.ok) throw new Error(`The API returned HTTP ${response.status}.`)
      setSettings(await response.json())
      setIsSettingsOpen(false)
    } catch (requestError) {
      setAuthError(requestError.message || 'Could not save your settings.')
    }
  }

  async function generateResponse(event) {
    event.preventDefault()
    const prompt = context.trim()

    if (!prompt || isLoading) return

    const userMessageId = crypto.randomUUID()
    setMessages((currentMessages) => [
      ...currentMessages,
      { id: userMessageId, role: 'user', text: prompt },
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
        body: JSON.stringify({
          context: {
            text: prompt,
            native_language: settings.native_language,
            learning_language: settings.learning_language,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`The API returned HTTP ${response.status}.`)
      }

      const data = await response.json()
      setMessages((currentMessages) => currentMessages.map((message) => (
        message.id === userMessageId ? { ...message, feedback: data.feedback ?? [] } : message
      )))
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
        <div className="top-actions">
          <button className="secondary-button" onClick={() => setIsSettingsOpen((open) => !open)} type="button">
            Settings
          </button>
          <button className="secondary-button" onClick={signOut} type="button">
            Log out
          </button>
        </div>
      </header>
      {isSettingsOpen && (
        <form className="settings-panel" onSubmit={saveSettings}>
          <label htmlFor="native-language">My language</label>
          <select
            id="native-language"
            value={settings.native_language}
            onChange={(event) => setSettings({ ...settings, native_language: event.target.value })}
          >
            {LANGUAGES.map((language) => <option key={language}>{language}</option>)}
          </select>
          <label htmlFor="learning-language">Language I want to learn</label>
          <select
            id="learning-language"
            value={settings.learning_language}
            onChange={(event) => setSettings({ ...settings, learning_language: event.target.value })}
          >
            {LANGUAGES.map((language) => <option key={language}>{language}</option>)}
          </select>
          <button type="submit">Save settings</button>
        </form>
      )}
      <section aria-label="Conversation" className="conversation" ref={conversationRef}>
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
            {message.role === 'user'
              ? highlightMessage(message.text, message.feedback, setActiveFeedback)
              : message.text}
            {activeFeedback && message.role === 'user' && message.feedback?.includes(activeFeedback) && (
              <div className="feedback-popup" role="dialog">
                <button aria-label="Close feedback" className="feedback-close" onClick={() => setActiveFeedback(null)} type="button">
                  ×
                </button>
                {activeFeedback.comment}
              </div>
            )}
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
