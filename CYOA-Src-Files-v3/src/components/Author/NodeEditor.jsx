import { useState, useEffect } from 'react'

export default function NodeEditor({ node, nodeId, allNodes, onSave, onDelete, onClose, isStart, onAddNode }) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [choices, setChoices] = useState([])
  const [isEnding, setIsEnding] = useState(false)
  const [titleError, setTitleError] = useState(false)

  const allNodeIds = Object.keys(allNodes || {})

  useEffect(() => {
    if (node) {
      setTitle(node.title || '')
      setText(node.text || '')
      setChoices(node.choices ? node.choices.map(c => ({ ...c })) : [])
      setIsEnding(!!node.isEnding)
      setTitleError(false)
    }
  }, [node, nodeId])

  const handleSave = () => {
    if (!title.trim()) {
      setTitleError(true)
      return
    }
    onSave(nodeId, {
      title: title.trim(),
      text,
      choices: isEnding ? [] : choices.filter(c => c.target),
      isEnding,
    })
  }

  /** Helper: get display name for a node id */
  const getNodeLabel = (id) => {
    const n = allNodes?.[id]
    return n?.title || id
  }

  const addChoice = () => {
    setChoices([...choices, { text: '', target: '' }])
  }

  const updateChoice = (i, field, value) => {
    const updated = choices.map((c, idx) => idx === i ? { ...c, [field]: value } : c)
    setChoices(updated)
  }

  const removeChoice = (i) => {
    setChoices(choices.filter((_, idx) => idx !== i))
  }

  if (!node) return null

  const s = {
    panel: {
      background: 'var(--color-surface)',
      borderLeft: '1px solid var(--color-border)',
      width: '380px',
      minWidth: '380px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      fontSize: '0.88rem',
    },
    header: {
      padding: '1rem 1.25rem',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    body: {
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      flex: 1,
    },
    label: {
      fontSize: '0.75rem',
      fontWeight: 600,
      color: 'var(--color-text-dim)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      marginBottom: '0.35rem',
      display: 'block',
    },
    input: {
      width: '100%',
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)',
      borderRadius: '6px',
      padding: '0.6rem 0.75rem',
      color: 'var(--color-text)',
      fontFamily: 'var(--font-ui)',
      fontSize: '0.88rem',
      outline: 'none',
    },
    textarea: {
      width: '100%',
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)',
      borderRadius: '6px',
      padding: '0.6rem 0.75rem',
      color: 'var(--color-text)',
      fontFamily: 'var(--font-display)',
      fontSize: '0.95rem',
      lineHeight: 1.6,
      minHeight: '160px',
      resize: 'vertical',
      outline: 'none',
    },
    footer: {
      padding: '1rem 1.25rem',
      borderTop: '1px solid var(--color-border)',
      display: 'flex',
      gap: '0.5rem',
    },
  }

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Edit Node</h3>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: 'var(--color-text-dim)',
            cursor: 'pointer', fontSize: '1.2rem', padding: '0.25rem',
          }}
        >✕</button>
      </div>

      <div style={s.body}>
        {/* Title */}
        <div>
          <label style={s.label}>Title <span style={{ color: 'var(--color-danger)' }}>*</span></label>
          <input
            style={{
              ...s.input,
              borderColor: titleError ? 'var(--color-danger)' : 'var(--color-border)',
            }}
            value={title}
            onChange={e => { setTitle(e.target.value); setTitleError(false) }}
            placeholder="Page title (required)"
          />
          {titleError && (
            <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '0.3rem' }}>
              Title is required before saving.
            </p>
          )}
        </div>

        {/* ID intentionally hidden from users */}

        {/* Text */}
        <div>
          <label style={s.label}>Story Text</label>
          <textarea style={s.textarea} value={text} onChange={e => setText(e.target.value)} placeholder="Write the story passage..." />
        </div>

        {/* Is ending */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={isEnding}
            onChange={e => setIsEnding(e.target.checked)}
            id="isEnding"
            style={{ accentColor: 'var(--color-accent)' }}
          />
          <label htmlFor="isEnding" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
            This is an ending node
          </label>
        </div>

        {/* Choices */}
        {!isEnding && (
          <div>
            <label style={s.label}>Choices</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {choices.map((choice, i) => (
                <div key={i} style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  padding: '0.6rem',
                }}>
                  <input
                    style={{ ...s.input, marginBottom: '0.4rem', background: 'var(--color-surface)' }}
                    value={choice.text}
                    onChange={e => updateChoice(i, 'text', e.target.value)}
                    placeholder="Choice label"
                  />
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <select
                      value={choice.target}
                      onChange={e => {
                        if (e.target.value === '__create_new__') {
                          const newTitle = prompt('New node title:')
                          if (!newTitle?.trim()) return
                          const newId = onAddNode(newTitle.trim())
                          if (newId) updateChoice(i, 'target', newId)
                        } else {
                          updateChoice(i, 'target', e.target.value)
                        }
                      }}
                      style={{
                        ...s.input,
                        flex: 1,
                        background: 'var(--color-surface)',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">— Select target —</option>
                      {allNodeIds.filter(id => id !== nodeId).map(id => (
                        <option key={id} value={id}>{getNodeLabel(id)}</option>
                      ))}
                      <option value="__create_new__">＋ Create a new node…</option>
                    </select>
                    <button
                      onClick={() => removeChoice(i)}
                      style={{
                        background: 'none', border: 'none',
                        color: 'var(--color-danger)', cursor: 'pointer',
                        fontSize: '1.1rem', padding: '0.25rem',
                      }}
                    >✕</button>
                  </div>
                </div>
              ))}
              <button
                onClick={addChoice}
                style={{
                  background: 'transparent',
                  border: '1px dashed var(--color-border)',
                  color: 'var(--color-text-dim)',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                }}
              >
                + Add Choice
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={s.footer}>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            background: title.trim() ? 'var(--color-accent)' : 'var(--color-border)',
            color: title.trim() ? 'var(--color-bg)' : 'var(--color-text-dim)',
            border: 'none',
            padding: '0.65rem',
            borderRadius: '6px',
            cursor: title.trim() ? 'pointer' : 'not-allowed',
            fontWeight: 700,
            fontSize: '0.88rem',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          Save Changes
        </button>
        {!isStart && (
          <button
            onClick={() => {
              if (confirm(`Delete node "${title || nodeId}"?`)) onDelete(nodeId)
            }}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-danger)',
              color: 'var(--color-danger)',
              padding: '0.65rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
