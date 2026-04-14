import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { getStory, getVisitedNodes, mergeVisitedNodes } from '../../utils/storage'
import { useSettings } from '../../SettingsContext'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Handle,
  Position,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'

const V_NODE_W = 140
const V_NODE_H = 44

// Custom node with left/right handles for horizontal (LR) layout
function VisitedNode({ data }) {
  const { bgColor, borderColor, textColor, label, sourcePos, targetPos } = data
  return (
    <div style={{
      background: bgColor,
      border: `2px solid ${borderColor}`,
      borderRadius: '8px',
      width: V_NODE_W,
      height: V_NODE_H,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      fontSize: '0.7rem',
      fontWeight: 600,
      color: textColor,
      textAlign: 'center',
      padding: '4px',
      boxSizing: 'border-box',
    }}>
      <Handle type="target" position={targetPos || Position.Left} style={{ background: '#4a4540', width: 7, height: 7, border: '1px solid #6a6560' }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>{label}</span>
      <Handle type="source" position={sourcePos || Position.Right} style={{ background: '#4a4540', width: 7, height: 7, border: '1px solid #6a6560' }} />
    </div>
  )
}

const visitedNodeTypes = { visitedNode: VisitedNode }

function buildVisitedGraph(storyNodes, allVisitedIds, currentTurnIds, edgeType = 'default', rankdir = 'LR') {
  const currentSet = new Set(currentTurnIds)
  const validIds = allVisitedIds.filter(id => storyNodes[id])

  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir, nodesep: 30, ranksep: 60 })
  g.setDefaultEdgeLabel(() => ({}))
  validIds.forEach(id => g.setNode(id, { width: V_NODE_W, height: V_NODE_H }))
  validIds.forEach(id => {
    const node = storyNodes[id]
    if (node?.choices) {
      node.choices.forEach(c => {
        if (validIds.includes(c.target)) g.setEdge(id, c.target)
      })
    }
  })
  dagre.layout(g)

  const lastId = currentTurnIds[currentTurnIds.length - 1]
  const isHorizontal = rankdir === 'LR'
  const sourcePos = isHorizontal ? Position.Right : Position.Bottom
  const targetPos = isHorizontal ? Position.Left : Position.Top

  const flowNodes = validIds.map(id => {
    const pos = g.node(id)
    const node = storyNodes[id]
    const isEnding = id === lastId
    const isCurrentTurn = currentSet.has(id)

    let bgColor = 'var(--color-surface-2)'
    let borderColor = 'var(--color-border)'
    let textColor = 'var(--color-text-dim)'
    if (isEnding) { bgColor = '#2a1820'; borderColor = '#a45'; textColor = '#d48' }
    else if (isCurrentTurn) { bgColor = '#1a3028'; borderColor = '#4a8'; textColor = '#7dcea0' }

    return {
      id,
      type: 'visitedNode',
      position: { x: (pos?.x || 0) - V_NODE_W / 2, y: (pos?.y || 0) - V_NODE_H / 2 },
      data: { label: node?.title || id, bgColor, borderColor, textColor, sourcePos, targetPos },
    }
  })

  const flowEdges = []
  validIds.forEach(id => {
    const node = storyNodes[id]
    if (node?.choices) {
      node.choices.forEach((c, i) => {
        if (validIds.includes(c.target)) {
          flowEdges.push({
            id: `v-${id}-${c.target}-${i}`,
            source: id,
            target: c.target,
            type: edgeType,
            style: { stroke: 'var(--color-border-light)' },
          })
        }
      })
    }
  })

  return { flowNodes, flowEdges }
}

// Each instance gets its own ReactFlowProvider to avoid shared-state bugs
function VisitedGraphFlow({ story, allVisitedIds, currentTurnIds, onJumpTo }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const { fitView } = useReactFlow()
  const { edgeStyle } = useSettings()
  const [rankdir, setRankdir] = useState('LR')

  useEffect(() => {
    const { flowNodes, flowEdges } = buildVisitedGraph(story.nodes, allVisitedIds, currentTurnIds, edgeStyle, rankdir)
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [allVisitedIds, currentTurnIds, story, edgeStyle, rankdir, setNodes, setEdges])

  const onNodeClick = useCallback((_, node) => {
    if (onJumpTo) onJumpTo(node.id)
  }, [onJumpTo])

  const handleAlign = useCallback(() => {
    const { flowNodes, flowEdges } = buildVisitedGraph(story.nodes, allVisitedIds, currentTurnIds, edgeStyle, rankdir)
    setNodes(flowNodes)
    setEdges(flowEdges)
    setTimeout(() => fitView({ padding: 0.25, duration: 400 }), 50)
  }, [story, allVisitedIds, currentTurnIds, edgeStyle, rankdir, setNodes, setEdges, fitView])

  const graphBtnStyle = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-dim)',
    borderRadius: '5px',
    cursor: 'pointer',
    padding: '4px 10px',
    fontSize: '0.72rem',
    fontFamily: 'var(--font-ui)',
    fontWeight: 600,
    transition: 'border-color 0.15s, color 0.15s',
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={visitedNodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'var(--color-bg)' }}
      >
        <Background color="var(--color-border)" gap={20} />
        <Controls />
      </ReactFlow>
      {/* Toolbar overlay */}
      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 5, display: 'flex', gap: '0.4rem' }}>
        <button
          onClick={handleAlign}
          title="Reset node positions"
          style={graphBtnStyle}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-dim)'; e.currentTarget.style.color = 'var(--color-text)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-dim)' }}
        >
          ⊞ Align
        </button>
        <button
          onClick={() => setRankdir(d => d === 'LR' ? 'TB' : 'LR')}
          title="Toggle layout direction"
          style={graphBtnStyle}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-dim)'; e.currentTarget.style.color = 'var(--color-text)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-dim)' }}
        >
          {rankdir === 'LR' ? '⇅ Vertical' : '⇄ Horizontal'}
        </button>
      </div>
    </div>
  )
}

function VisitedGraphInner({ story, allVisitedIds, currentTurnIds, onJumpTo }) {
  return (
    <ReactFlowProvider>
      <VisitedGraphFlow
        story={story}
        allVisitedIds={allVisitedIds}
        currentTurnIds={currentTurnIds}
        onJumpTo={onJumpTo}
      />
    </ReactFlowProvider>
  )
}

function VisitedGraph({ story, allVisitedIds, currentTurnIds, onJumpTo }) {
  const [enlarged, setEnlarged] = useState(false)

  const legend = (
    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.68rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-ui)', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
      <span><span style={{ color: '#7dcea0' }}>●</span> This turn</span>
      <span><span style={{ color: '#d48' }}>●</span> Ending reached</span>
      <span><span style={{ color: '#6a6258' }}>●</span> Previous turns</span>
    </div>
  )

  return (
    <div>
      {/* Inline graph */}
      <div style={{ position: 'relative' }}>
        {legend}
        <div style={{ width: '100%', height: '300px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          <VisitedGraphInner
            story={story}
            allVisitedIds={allVisitedIds}
            currentTurnIds={currentTurnIds}
            onJumpTo={onJumpTo}
          />
        </div>
        {/* Enlarge button */}
        <button
          onClick={() => setEnlarged(true)}
          title="Enlarge graph"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 5,
            background: 'rgba(20,18,16,0.8)',
            border: '1px solid rgba(74,69,64,0.5)',
            color: 'rgba(200,190,175,0.75)',
            borderRadius: '5px',
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-ui)',
            backdropFilter: 'blur(4px)',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,164,74,0.6)'; e.currentTarget.style.color = 'rgba(212,164,74,0.9)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(74,69,64,0.5)'; e.currentTarget.style.color = 'rgba(200,190,175,0.75)' }}
        >
          ⛶ Enlarge
        </button>
      </div>

      {/* Enlarged modal */}
      {enlarged && (
        <div
          onClick={() => setEnlarged(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '1100px',
              height: '80vh',
              background: 'var(--color-bg)',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Modal header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid var(--color-border)',
              fontFamily: 'var(--font-ui)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>Your Path</span>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.68rem', color: 'var(--color-text-dim)' }}>
                  <span><span style={{ color: '#7dcea0' }}>●</span> This turn</span>
                  <span><span style={{ color: '#d48' }}>●</span> Ending</span>
                  <span><span style={{ color: '#6a6258' }}>●</span> Previous turns</span>
                </div>
              </div>
              <button
                onClick={() => setEnlarged(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}
              >✕</button>
            </div>
            <div style={{ flex: 1 }}>
              <VisitedGraphInner
                story={story}
                allVisitedIds={allVisitedIds}
                currentTurnIds={currentTurnIds}
                onJumpTo={(nodeId) => { setEnlarged(false); onJumpTo(nodeId) }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function StoryReader() {
  const { storyId } = useParams()
  const navigate = useNavigate()
  const [story, setStory] = useState(null)
  const [currentNodeId, setCurrentNodeId] = useState(null)
  const [history, setHistory] = useState([])
  const [fadeIn, setFadeIn] = useState(true)
  const [showVisitedGraph, setShowVisitedGraph] = useState(false)
  const [allVisitedNodes, setAllVisitedNodes] = useState([])
  const [showPrevPath, setShowPrevPath] = useState(false)

  // Nodes visited this turn (history + current)
  const currentTurnNodes = useMemo(() => {
    const seen = new Set()
    const result = []
    for (const id of [...history, currentNodeId].filter(Boolean)) {
      if (!seen.has(id)) { seen.add(id); result.push(id) }
    }
    return result
  }, [history, currentNodeId])

  useEffect(() => {
    const s = getStory(storyId)
    if (!s) { navigate('/reader'); return }
    setStory(s)
    setCurrentNodeId(s.startNode)
    setHistory([])
    setAllVisitedNodes(getVisitedNodes(storyId))
  }, [storyId, navigate])

  // Persist visited nodes when an ending is reached
  useEffect(() => {
    if (!story || !currentNodeId) return
    const node = story.nodes[currentNodeId]
    const isEnding = node?.isEnding || !node?.choices?.length
    if (isEnding && currentTurnNodes.length > 0) {
      const merged = mergeVisitedNodes(storyId, currentTurnNodes)
      setAllVisitedNodes(merged)
    }
  }, [currentNodeId, story, storyId, currentTurnNodes])

  const goToNode = useCallback((nodeId) => {
    setFadeIn(false)
    setTimeout(() => {
      setHistory(h => [...h, currentNodeId])
      setCurrentNodeId(nodeId)
      setFadeIn(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 200)
  }, [currentNodeId])

  const goBack = useCallback(() => {
    if (history.length === 0) return
    setFadeIn(false)
    setTimeout(() => {
      const prev = history[history.length - 1]
      setHistory(h => h.slice(0, -1))
      setCurrentNodeId(prev)
      setFadeIn(true)
    }, 200)
  }, [history])

  const restart = useCallback(() => {
    setFadeIn(false)
    setTimeout(() => {
      setHistory([])
      setCurrentNodeId(story.startNode)
      setShowVisitedGraph(false)
      setAllVisitedNodes(getVisitedNodes(storyId))
      setFadeIn(true)
    }, 200)
  }, [story, storyId])

  if (!story || !currentNodeId) return null
  const node = story.nodes[currentNodeId]
  if (!node) return <div style={{ padding: '2rem' }}>Node not found.</div>

  const isEnding = node.isEnding || !node.choices?.length
  const stepNumber = history.length + 1

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem 1rem',
      background: `
        radial-gradient(ellipse at 50% 0%, rgba(212,164,74,0.04) 0%, transparent 50%),
        var(--color-bg)
      `,
    }}>
      {/* Story title bar */}
      <div style={{
        width: '100%',
        maxWidth: '640px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.1rem',
          fontWeight: 600,
          color: 'var(--color-text-dim)',
          fontStyle: 'italic',
        }}>
          {story.title}
        </h2>
        <span style={{
          fontSize: '0.75rem',
          color: 'var(--color-border-light)',
          fontFamily: 'var(--font-ui)',
        }}>
          Step {stepNumber}
        </span>
      </div>

      {/* Story content */}
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
      >
        {/* Page indicator */}
        <div style={{
          fontSize: '0.7rem',
          color: 'var(--color-accent-dim)',
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '1rem',
          fontFamily: 'var(--font-ui)',
        }}>
          {node.title || currentNodeId}
        </div>

        {/* Story text */}
        <div className="story-text" style={{ marginBottom: '2rem' }}>
          {node.text}
        </div>

        {/* Ending */}
        {isEnding && (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            margin: '1rem 0 2rem',
            borderTop: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.8rem',
              fontWeight: 700,
              color: 'var(--color-accent)',
              fontStyle: 'italic',
              marginBottom: '0.5rem',
            }}>
              The End
            </p>
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--color-text-dim)',
              marginBottom: '1.25rem',
            }}>
              You reached this ending in {stepNumber} steps.
            </p>

            {/* Visited path graph toggle */}
            <button
              onClick={() => setShowVisitedGraph(v => !v)}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-dim)',
                padding: '0.5rem 1.2rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                fontSize: '0.82rem',
                fontWeight: 500,
                transition: 'border-color 0.15s',
              }}
            >
              {showVisitedGraph ? '▲ Hide my path' : '◈ Show my path'}
            </button>

            {showVisitedGraph && allVisitedNodes.length > 1 && (
              <div style={{ marginTop: '1.25rem', textAlign: 'left' }}>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-dim)',
                  marginBottom: '0.6rem',
                  fontFamily: 'var(--font-ui)',
                  letterSpacing: '0.05em',
                }}>
                  Click any node to jump back and explore a different path.
                </p>
                <VisitedGraph
                  story={story}
                  allVisitedIds={allVisitedNodes}
                  currentTurnIds={currentTurnNodes}
                  onJumpTo={(nodeId) => {
                    setShowVisitedGraph(false)
                    setFadeIn(false)
                    setTimeout(() => {
                      const idx = currentTurnNodes.indexOf(nodeId)
                      if (idx >= 0) {
                        setHistory(currentTurnNodes.slice(0, idx))
                      } else {
                        setHistory([])
                      }
                      setCurrentNodeId(nodeId)
                      setFadeIn(true)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }, 200)
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Choices */}
        {!isEnding && node.choices?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            <p style={{
              fontSize: '0.78rem',
              color: 'var(--color-text-dim)',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '0.25rem',
            }}>
              What do you do?
            </p>
            {node.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => goToNode(choice.target)}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-accent)'
                  e.currentTarget.style.color = 'var(--color-accent)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.color = 'var(--color-text)'
                }}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '1rem 1.25rem',
                  cursor: 'pointer',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.05rem',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  lineHeight: 1.4,
                }}
              >
                <span style={{ color: 'var(--color-accent-dim)', marginRight: '0.5rem', fontWeight: 700 }}>
                  {String.fromCharCode(65 + i)}.
                </span>
                {choice.text}
              </button>
            ))}
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center',
          paddingTop: '1rem',
          borderTop: '1px solid var(--color-border)',
          flexWrap: 'wrap',
        }}>
          {history.length > 0 && (
            <SmallBtn onClick={goBack} label="← Go Back" />
          )}
          <SmallBtn onClick={restart} label="↺ Restart" />
          {allVisitedNodes.length > 0 && (
            <SmallBtn onClick={() => setShowPrevPath(true)} label="◈ Previous Path" />
          )}
          <SmallBtn onClick={() => navigate('/reader')} label="✕ Exit" />
        </div>
      </div>

      {/* Previous Path modal — available any time during play */}
      {showPrevPath && (
        <div
          onClick={() => setShowPrevPath(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '1100px',
              height: '80vh',
              background: 'var(--color-bg)',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid var(--color-border)',
              fontFamily: 'var(--font-ui)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>Your Previous Paths</span>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.68rem', color: 'var(--color-text-dim)' }}>
                  <span><span style={{ color: '#7dcea0' }}>●</span> This turn</span>
                  <span><span style={{ color: '#d48' }}>●</span> Ending</span>
                  <span><span style={{ color: '#6a6258' }}>●</span> Previous turns</span>
                </div>
              </div>
              <button
                onClick={() => setShowPrevPath(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}
              >✕</button>
            </div>
            <div style={{ flex: 1 }}>
              <VisitedGraphInner
                story={story}
                allVisitedIds={allVisitedNodes}
                currentTurnIds={currentTurnNodes}
                onJumpTo={(nodeId) => {
                  setShowPrevPath(false)
                  setFadeIn(false)
                  setTimeout(() => {
                    const idx = currentTurnNodes.indexOf(nodeId)
                    setHistory(idx >= 0 ? currentTurnNodes.slice(0, idx) : [])
                    setCurrentNodeId(nodeId)
                    setFadeIn(true)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }, 200)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SmallBtn({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent-dim)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
      style={{
        background: 'transparent',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-dim)',
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        fontSize: '0.82rem',
        fontWeight: 500,
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  )
}
