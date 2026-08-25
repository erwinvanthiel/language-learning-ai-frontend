import { useEffect, useRef, useState } from 'react'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  'https://language-learning-ai-api-evth.azurewebsites.net'

export default function App() {
  const [context, setContext] = useState('')
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages])

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

  return (
    <main>
      <section aria-label="Conversation" className="conversation">
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
