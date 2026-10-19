
import { useEffect, useRef, useState } from 'react'
import {
  Archive,
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronDown,
  FileText,
  History,
  Landmark,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import './App.css'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  demo?: boolean
}

type Conversation = {
  id: string
  title: string
  messages: Message[]
  updatedAt: number
}

type ChatApiResponse = {
  answer?: string
  model?: string
  verified_sources?: unknown[]
  detail?: string
}

const API_URL = 'http://localhost:8000/api/chat'
const STORAGE_KEY = 'sansad-ai-conversations'
const THEME_KEY = 'sansad-ai-theme'

const suggestions = [
  {
    category: 'Legislation',
    title: 'How are bills debated in Parliament?',
    description:
      'Explore parliamentary discussions and legislative procedures.',
  },
  {
    category: 'Public policy',
    title: 'What concerns are raised during policy debates?',
    description:
      'Examine arguments, concerns and responses in the records.',
  },
  {
    category: 'Historical research',
    title: 'How have parliamentary debates changed over time?',
    description:
      'Compare discussions across dates and sessions, when records permit.',
  },
]

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function readConversations(): Conversation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(
      (item): item is Conversation =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        Array.isArray(item.messages),
    )
  } catch {
    return []
  }
}

function createConversation(): Conversation {
  return {
    id: makeId(),
    title: 'New research',
    messages: [],
    updatedAt: Date.now(),
  }
}

function App() {
  const [conversations, setConversations] = useState<Conversation[]>(
    () => readConversations(),
  )

  const [activeId, setActiveId] = useState<string | null>(
    () => readConversations()[0]?.id ?? null,
  )

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [dark, setDark] = useState(
    () => localStorage.getItem(THEME_KEY) === 'dark',
  )
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [house, setHouse] = useState('Any house')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeId) ??
    null

  const messages = activeConversation?.messages ?? []

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
  }, [conversations])

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      })
    }
  }, [messages.length, loading, activeId])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSidebarOpen(false)
        setSettingsOpen(false)
        setSearchOpen(false)
        setMenuId(null)
        setFiltersOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  function updateConversation(
    id: string,
    updater: (conversation: Conversation) => Conversation,
  ) {
    setConversations((previous) =>
      previous
        .map((conversation) =>
          conversation.id === id ? updater(conversation) : conversation,
        )
        .sort((a, b) => b.updatedAt - a.updatedAt),
    )
  }

  function newConversation() {
    const conversation = createConversation()

    setConversations((previous) => [conversation, ...previous])
    setActiveId(conversation.id)
    setInput('')
    setNotice('')
    setSidebarOpen(false)
    setSettingsOpen(false)
    setSearchOpen(false)
    setMenuId(null)
  }

  function selectConversation(id: string) {
    setActiveId(id)
    setInput('')
    setNotice('')
    setSidebarOpen(false)
    setMenuId(null)
  }

  function deleteConversation(id: string) {
    const remaining = conversations.filter(
      (conversation) => conversation.id !== id,
    )

    setConversations(remaining)

    if (activeId === id) {
      setActiveId(remaining[0]?.id ?? null)
      setInput('')
    }

    setMenuId(null)
    setNotice('Conversation deleted.')
  }

  function beginRename(conversation: Conversation) {
    setRenameId(conversation.id)
    setRenameText(conversation.title)
    setMenuId(null)
  }

  function saveRename(id: string) {
    const title = renameText.trim()

    if (title) {
      updateConversation(id, (conversation) => ({
        ...conversation,
        title,
      }))
    }

    setRenameId(null)
  }

  async function sendMessage(rawText = input) {
    const content = rawText.trim()

    if (!content || loading) return

    let conversation = activeConversation

    if (!conversation) {
      conversation = createConversation()
      setConversations((previous) => [conversation!, ...previous])
      setActiveId(conversation.id)
    }

    const targetId = conversation.id

    const userMessage: Message = {
      id: makeId(),
      role: 'user',
      content,
    }

    const updatedMessages = [...conversation.messages, userMessage]

    const firstMessageTitle =
      conversation.messages.length === 0
        ? content.length > 38
          ? `${content.slice(0, 38).trim()}…`
          : content
        : conversation.title

    updateConversation(targetId, (current) => ({
      ...current,
      title: firstMessageTitle,
      messages: updatedMessages,
      updatedAt: Date.now(),
    }))

    setInput('')
    setNotice('')
    setLoading(true)

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: content,
          house: house === 'Any house' ? null : house,
          date_from: dateFrom || null,
          date_to: dateTo || null,
        }),
      })

      if (!response.ok) {
        let errorMessage = `API request failed with status ${response.status}.`

        try {
          const errorData: ChatApiResponse = await response.json()

          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail
          }
        } catch {
          // Keep the original HTTP error message.
        }

        throw new Error(errorMessage)
      }

      const data: ChatApiResponse = await response.json()

      if (typeof data.answer !== 'string' || !data.answer.trim()) {
        throw new Error('The API returned an empty or invalid answer.')
      }

      const answer: Message = {
        id: makeId(),
        role: 'assistant',
        content: data.answer,
        demo: data.model === 'not-connected',
      }

      setConversations((previous) =>
        previous
          .map((item) =>
            item.id === targetId
              ? {
                  ...item,
                  messages: [...item.messages, answer],
                  updatedAt: Date.now(),
                }
              : item,
          )
          .sort((a, b) => b.updatedAt - a.updatedAt),
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown network error.'

      setNotice(
        `Could not get a response from Sansad AI. Check the backend and try again. ${message}`,
      )
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage()
  }

  const visibleConversations = conversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(searchText.toLowerCase()),
  )

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            <Landmark size={21} strokeWidth={1.7} />
          </div>

          <div className="brand-copy">
            <span className="brand-name">
              sansad<span className="brand-dot">.</span>
            </span>
            <span className="brand-subtitle">DEBATE INTELLIGENCE</span>
          </div>

          <button
            className="icon-button sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <button className="new-chat-button" onClick={newConversation}>
          <Plus size={17} />
          <span>New research</span>
          <span className="shortcut">⌘ K</span>
        </button>

        <div className="sidebar-section">
          <div className="section-heading">WORKSPACE</div>

          <button
            className={`nav-item ${searchOpen ? 'nav-item-active' : ''}`}
            onClick={() => {
              setSearchOpen((value) => !value)
              setSearchText('')
            }}
          >
            <Search size={16} />
            <span>Search conversations</span>
          </button>

          <button
            className={`nav-item ${filtersOpen ? 'nav-item-active' : ''}`}
            onClick={() => setFiltersOpen((value) => !value)}
          >
            <Settings2 size={16} />
            <span>Research filters</span>
            <ChevronDown
              size={15}
              className={`nav-chevron ${filtersOpen ? 'rotated' : ''}`}
            />
          </button>

          {filtersOpen && (
            <div className="filter-panel">
              <label htmlFor="house-filter">House</label>
              <select
                id="house-filter"
                value={house}
                onChange={(event) => setHouse(event.target.value)}
              >
                <option>Any house</option>
                <option>Lok Sabha</option>
                <option>Rajya Sabha</option>
              </select>

              <label htmlFor="date-from">Date from</label>
              <input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />

              <label htmlFor="date-to">Date to</label>
              <input
                id="date-to"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => setDateTo(event.target.value)}
              />

              <p>
                Filters are sent with your request. They take effect only when
                the backend supports them.
              </p>

              <button
                className="text-button"
                onClick={() => {
                  setHouse('Any house')
                  setDateFrom('')
                  setDateTo('')
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        <div className="history-heading">
          <span className="section-heading">RECENT RESEARCH</span>
          <span className="history-count">{conversations.length}</span>
        </div>

        {searchOpen && (
          <div className="history-search">
            <Search size={15} />
            <input
              autoFocus
              aria-label="Search conversation titles"
              placeholder="Find a conversation…"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />

            <button
              className="bare-button"
              onClick={() => {
                setSearchOpen(false)
                setSearchText('')
              }}
              aria-label="Close search"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="conversation-list">
          {visibleConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`conversation-row ${
                activeId === conversation.id ? 'conversation-active' : ''
              }`}
            >
              {renameId === conversation.id ? (
                <form
                  className="rename-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    saveRename(conversation.id)
                  }}
                >
                  <input
                    autoFocus
                    value={renameText}
                    onChange={(event) => setRenameText(event.target.value)}
                    onBlur={() => saveRename(conversation.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') setRenameId(null)
                    }}
                    aria-label="Conversation name"
                  />
                </form>
              ) : (
                <button
                  className="conversation-select"
                  onClick={() => selectConversation(conversation.id)}
                  title={conversation.title}
                >
                  <History size={15} />
                  <span>{conversation.title}</span>
                </button>
              )}

              <button
                className="icon-button conversation-menu-button"
                aria-label={`Options for ${conversation.title}`}
                onClick={() =>
                  setMenuId((current) =>
                    current === conversation.id ? null : conversation.id,
                  )
                }
              >
                <MoreHorizontal size={17} />
              </button>

              {menuId === conversation.id && (
                <div className="conversation-menu">
                  <button onClick={() => beginRename(conversation)}>
                    <FileText size={14} />
                    Rename
                  </button>

                  <button
                    className="danger-action"
                    onClick={() => {
                      if (
                        window.confirm(`Delete "${conversation.title}"?`)
                      ) {
                        deleteConversation(conversation.id)
                      }
                    }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}

          {visibleConversations.length === 0 && (
            <p className="history-empty">
              {searchText
                ? 'No matching conversations.'
                : 'Your research history will appear here.'}
            </p>
          )}
        </div>

        <div className="sidebar-spacer" />

        <div className="sidebar-footer">
          <div className="evidence-note">
            <ShieldCheck size={16} />
            <div>
              <strong>Evidence first</strong>
              <span>Sources over speculation</span>
            </div>
          </div>

          <button
            className={`nav-item settings-button ${
              settingsOpen ? 'nav-item-active' : ''
            }`}
            onClick={() => setSettingsOpen((value) => !value)}
          >
            <Settings2 size={16} />
            <span>Settings & status</span>
          </button>

          {settingsOpen && (
            <div className="settings-panel">
              <div className="settings-title">Appearance</div>

              <button
                className="theme-toggle"
                onClick={() => setDark((value) => !value)}
              >
                {dark ? <Moon size={16} /> : <Sun size={16} />}
                <span>{dark ? 'Dark theme' : 'Light theme'}</span>
                <span className="theme-switch">{dark ? 'ON' : 'OFF'}</span>
              </button>

              <div className="settings-title">AI provider</div>

              <div className="provider-status">
                <span className="status-dot" />
                <div>
                  <strong>Backend API</strong>
                  <span>Connected when API requests succeed</span>
                </div>
              </div>

              <p>
                The backend currently returns a placeholder until the trained
                model and retrieval system are connected.
              </p>
            </div>
          )}

          <div className="version-label">
            RESEARCH WORKSPACE <span>·</span> API PREVIEW
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>

            <div className="breadcrumb">
              <span>Workspace</span>
              <span className="breadcrumb-separator">/</span>
              <strong>
                {activeConversation?.title ?? 'New research'}
              </strong>
            </div>
          </div>

          <div className="topbar-right">
            <span className="mode-indicator">
              <span className="status-dot" />
              API PREVIEW
            </span>

            <span className="topbar-divider" />

            <button
              className="icon-button theme-button"
              onClick={() => setDark((value) => !value)}
              aria-label={
                dark ? 'Switch to light theme' : 'Switch to dark theme'
              }
              title={dark ? 'Light theme' : 'Dark theme'}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <div className="chat-scroll-area">
          {messages.length === 0 ? (
            <section className="welcome-content">
              <div className="eyebrow">
                <span className="eyebrow-line" />
                PARLIAMENTARY RESEARCH, REIMAGINED
              </div>

              <h1>
                Ask the record.
                <br />
                <span>Understand the debate.</span>
              </h1>

              <p className="welcome-description">
                Explore parliamentary discussions, examine arguments and trace
                the evidence behind public policy.
              </p>

              <form
                className="composer welcome-composer"
                onSubmit={handleSubmit}
              >
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void sendMessage()
                    }
                  }}
                  placeholder="Ask a question about parliamentary debates…"
                  aria-label="Ask a parliamentary research question"
                  maxLength={4000}
                />

                <div className="composer-bottom">
                  <div className="composer-tools">
                    <span className="composer-tool-label">
                      <BookOpen size={14} />
                      Research question
                    </span>
                    <span className="character-count">
                      {input.length}/4000
                    </span>
                  </div>

                  <button
                    className="send-button"
                    type="submit"
                    disabled={!input.trim() || loading}
                    aria-label="Send question"
                  >
                    <ArrowUp size={18} />
                  </button>
                </div>
              </form>

              <div className="suggestions-heading">
                <span>START WITH A QUESTION</span>
                <span className="suggestions-rule" />
              </div>

              <div className="suggestions-grid">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.title}
                    className="suggestion-card"
                    onClick={() => void sendMessage(suggestion.title)}
                    disabled={loading}
                  >
                    <span className="suggestion-index">0{index + 1}</span>
                    <span className="suggestion-category">
                      {suggestion.category}
                    </span>
                    <strong>{suggestion.title}</strong>
                    <span className="suggestion-description">
                      {suggestion.description}
                    </span>
                    <span className="suggestion-arrow">
                      <ArrowUp size={15} />
                    </span>
                  </button>
                ))}
              </div>

              <div className="demo-disclaimer">
                <ShieldCheck size={16} />
                <p>
                  <strong>Research integrity matters.</strong> Sansad AI sends
                  questions to its backend API. Until the trained model and
                  source retrieval are connected, responses may be
                  placeholders and are not verified against parliamentary
                  records.
                </p>
              </div>
            </section>
          ) : (
            <section className="message-thread" aria-label="Conversation">
              <div className="thread-heading">
                <span className="thread-label">RESEARCH SESSION</span>
                <span className="thread-date">
                  {activeConversation?.updatedAt
                    ? new Date(
                        activeConversation.updatedAt,
                      ).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : ''}
                </span>
              </div>

              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`message message-${message.role}`}
                >
                  <div className="message-avatar">
                    {message.role === 'user' ? (
                      <span>YOU</span>
                    ) : (
                      <Landmark size={18} />
                    )}
                  </div>

                  <div className="message-body">
                    <div className="message-meta">
                      <strong>
                        {message.role === 'user' ? 'You' : 'Sansad AI'}
                      </strong>

                      {message.demo && (
                        <span className="demo-answer-label">
                          PLACEHOLDER RESPONSE
                        </span>
                      )}
                    </div>

                    <div className="message-content">
                      {message.content.split('\n').map((line, index) => {
                        if (
                          line.startsWith('**') &&
                          line.endsWith('**')
                        ) {
                          return (
                            <h3 key={index}>{line.slice(2, -2)}</h3>
                          )
                        }

                        if (line.startsWith('- ')) {
                          return (
                            <p className="message-bullet" key={index}>
                              • {line.slice(2)}
                            </p>
                          )
                        }

                        return line ? (
                          <p key={index}>{line}</p>
                        ) : (
                          <div
                            key={index}
                            className="message-line-gap"
                          />
                        )
                      })}
                    </div>

                    {message.role === 'assistant' && (
                      <div className="source-placeholder">
                        <FileText size={15} />
                        <span>
                          No verified sources attached to this response
                        </span>
                      </div>
                    )}
                  </div>
                </article>
              ))}

              {loading && (
                <div
                  className="message message-assistant"
                  role="status"
                  aria-live="polite"
                >
                  <div className="message-avatar">
                    <Landmark size={18} />
                  </div>

                  <div className="message-body">
                    <div className="message-meta">
                      <strong>Sansad AI</strong>
                    </div>

                    <div className="typing-indicator">
                      <span />
                      <span />
                      <span />
                      <span className="typing-label">
                        Waiting for the API response…
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </section>
          )}
        </div>

        {messages.length > 0 && (
          <div className="bottom-composer-area">
            <form
              className="composer compact-composer"
              onSubmit={handleSubmit}
            >
              <textarea
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void sendMessage()
                  }
                }}
                placeholder="Continue your research…"
                aria-label="Continue conversation"
                maxLength={4000}
              />

              <div className="composer-bottom">
                <div className="composer-tools">
                  <span className="composer-tool-label">
                    <BookOpen size={14} />
                    Research question
                  </span>
                  <span className="character-count">
                    {input.length}/4000
                  </span>
                </div>

                <button
                  className="send-button"
                  type="submit"
                  disabled={!input.trim() || loading}
                  aria-label="Send message"
                >
                  <ArrowUp size={18} />
                </button>
              </div>
            </form>

            <p className="bottom-disclaimer">
              API preview · Responses are not verified against parliamentary
              records until source retrieval is connected.
            </p>
          </div>
        )}

        {notice && (
          <div className="toast-message" role="status">
            <Archive size={15} />
            <span>{notice}</span>
            <button
              onClick={() => setNotice('')}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <button
          className="scroll-bottom-button"
          onClick={() =>
            messagesEndRef.current?.scrollIntoView({
              behavior: 'smooth',
            })
          }
          aria-label="Scroll to latest message"
          title="Scroll to latest message"
        >
          <ArrowDown size={16} />
        </button>
      </main>
    </div>
  )
}

export default App
