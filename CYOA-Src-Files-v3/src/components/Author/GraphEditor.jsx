import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import { getStory, saveStory, generateNodeId } from '../../utils/storage'
import { findReachable } from '../../utils/storyHelpers'
import NodeEditor from './NodeEditor'
import { useSettings } from '../../SettingsContext'

const NODE_W = 160
const NODE_H = 50

// Custom node with explicit handles so positions respond to rankdir
function StoryNode({ data }) {
  const { label, badges, bgColor, borderColor, textColor, isSelected, sourcePos, targetPos } = data
  return (
    <div style={{
      background: bgColor,
      border: `2px solid ${isSelected ? '#d4a44a' : borderColor}`,
      boxShadow: isSelected ? '0 0 0 3px rgba(212,164,74,0.35)' : 'none',
      borderRadius: '8px',
      width: NODE_W,
      height: NODE_H,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}>
      <Handle type="target" position={targetPos} style={{ background: '#4a4540', width: 8, height: 8, border: '1px solid #6a6560' }} />
      <div style={{
        fontSize: '0.72rem',
        fontWeight: 600,
        textAlign: 'center',
        lineHeight: 1.3,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        padding: '2px',
        pointerEvents: 'none',
      }}>
        <div style={{ color: textColor, marginBottom: '1px' }}>{label}</div>
        {badges.map((b, i) => (
          <span key={i} style={{ fontSize: '0.6rem', color: b.color }}>{b.text}</span>
        ))}
      </div>
      <Handle type="source" position={sourcePos} style={{ background: '#4a4540', width: 8, height: 8, border: '1px solid #6a6560' }} />
    </div>
  )
}

const nodeTypes = { storyNode: StoryNode }

function layoutGraph(storyNodes, startNode, rankdir = 'TB', selectedNode = null, edgeType = 'smoothstep') {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir, nodesep: 40, ranksep: 60 })
  g.setDefaultEdgeLabel(() => ({}))

  const ids = Object.keys(storyNodes)
  ids.forEach(id => g.setNode(id, { width: NODE_W, height: NODE_H }))
  ids.forEach(id => {
    const node = storyNodes[id]
    if (node.choices) {
      node.choices.forEach(c => {
        if (storyNodes[c.target]) g.setEdge(id, c.target)
      })
    }
  })

  dagre.layout(g)

  const reachable = findReachable({ nodes: storyNodes, startNode })

  const isHorizontal = rankdir === 'LR'
  const sourcePos = isHorizontal ? Position.Right : Position.Bottom
  const targetPos = isHorizontal ? Position.Left : Position.Top

  const flowNodes = ids.map(id => {
    const pos = g.node(id)
    const node = storyNodes[id]
    const isEnding = node.isEnding || !node.choices?.length
    const isStart = id === startNode
    const isOrphan = !reachable.has(id)
    const isSelected = id === selectedNode

    let bgColor = 'var(--color-surface-2)'
    let borderColor = 'var(--color-border)'
    let textColor = 'var(--color-text)'
    if (isStart) { bgColor = '#1a3028'; borderColor = '#4a8'; textColor = '#7dcea0' }
    else if (isEnding) { bgColor = '#2a1820'; borderColor = '#a45'; textColor = '#d48' }
    else if (isOrphan) { bgColor = '#2a2420'; borderColor = '#885'; textColor = '#aa8' }

    const badges = []
    if (isStart) badges.push({ text: 'START', color: '#4a8' })
    if (isEnding) badges.push({ text: 'END', color: '#d48' })
    if (isOrphan) badges.push({ text: 'ORPHAN', color: '#aa8' })

    return {
      id,
      type: 'storyNode',
      position: { x: (pos?.x || 0) - NODE_W / 2, y: (pos?.y || 0) - NODE_H / 2 },
      data: { label: node.title || id, badges, bgColor, borderColor, textColor, isSelected, sourcePos, targetPos },
    }
  })

  const flowEdges = []
  ids.forEach(id => {
    const node = storyNodes[id]
    if (node.choices) {
      node.choices.forEach((c, i) => {
        if (storyNodes[c.target]) {
          flowEdges.push({
            id: `${id}-${c.target}-${i}`,
            source: id,
            target: c.target,
            type: edgeType,
            label: c.text?.slice(0, 30) || '',
            labelStyle: { fill: 'var(--color-text-dim)', fontSize: '0.6rem' },
            labelBgStyle: { fill: 'var(--color-surface)', stroke: 'var(--color-border)', strokeOpacity: 0.6 },
            labelBgPadding: [4, 3],
            labelBgBorderRadius: 3,
            style: { stroke: 'var(--color-border-light)' },
            animated: false,
          })
        }
      })
    }
  })

  return { flowNodes, flowEdges }
}

export default function GraphEditor() {
  return (
    <ReactFlowProvider>
      <GraphEditorInner />
    </ReactFlowProvider>
  )
}

function GraphEditorInner() {
  const { storyId } = useParams()
  const navigate = useNavigate()
  const [story, setStory] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [showHelp, setShowHelp] = useState(false)
  const [rankdir, setRankdir] = useState('TB')
  const { screenToFlowPosition, fitView } = useReactFlow()
  const { edgeStyle } = useSettings()

  // Load story
  useEffect(() => {
    const s = getStory(storyId)
    if (!s) { navigate('/author'); return }
    setStory(s)
  }, [storyId, navigate])

  // Rebuild graph when story, rankdir, or edgeStyle changes
  useEffect(() => {
    if (!story) return
    const { flowNodes, flowEdges } = layoutGraph(story.nodes, story.startNode, rankdir, selectedNode, edgeStyle)
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [story, rankdir, edgeStyle, setNodes, setEdges])

  // Update node highlight when selection changes without re-running full layout
  useEffect(() => {
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, isSelected: n.id === selectedNode },
    })))
  }, [selectedNode, setNodes])

  const allNodeIds = useMemo(() => story ? Object.keys(story.nodes) : [], [story])

  const persistStory = useCallback((updated) => {
    setStory(updated)
    saveStory(storyId, updated)
  }, [storyId])

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node.id)
  }, [])

  // Drag-to-connect: when user drags from one node's handle to another node
  const onConnect = useCallback((connection) => {
    if (!story || !connection.source || !connection.target) return
    if (connection.source === connection.target) return

    const sourceNode = story.nodes[connection.source]
    const targetNode = story.nodes[connection.target]
    if (!sourceNode || !targetNode) return

    // Check if this connection already exists
    const alreadyConnected = sourceNode.choices?.some(c => c.target === connection.target)
    if (alreadyConnected) return

    // Add a new choice with auto-filled text
    const targetTitle = targetNode.title || connection.target
    const newChoice = { text: `Go to ${targetTitle}`, target: connection.target }
    const updatedChoices = [...(sourceNode.choices || []), newChoice]

    const updated = {
      ...story,
      nodes: {
        ...story.nodes,
        [connection.source]: { ...sourceNode, choices: updatedChoices },
      },
    }
    persistStory(updated)
    // Open the editor on the source node so user can see/rename the new choice
    setSelectedNode(connection.source)
  }, [story, persistStory])

  const handleSaveNode = useCallback((nodeId, data) => {
    const updated = {
      ...story,
      nodes: { ...story.nodes, [nodeId]: data },
    }
    persistStory(updated)
    setSelectedNode(null)
  }, [story, persistStory])

  const handleDeleteNode = useCallback((nodeId) => {
    if (nodeId === story.startNode) return
    const newNodes = { ...story.nodes }
    delete newNodes[nodeId]
    // Remove choices pointing to deleted node
    for (const n of Object.values(newNodes)) {
      if (n.choices) {
        n.choices = n.choices.filter(c => c.target !== nodeId)
      }
    }
    const updated = { ...story, nodes: newNodes }
    persistStory(updated)
    setSelectedNode(null)
  }, [story, persistStory])

  const handleAddNode = useCallback(() => {
    const id = generateNodeId()
    // Place new node at the center of the current viewport
    const viewportCenter = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    })
    const updated = {
      ...story,
      nodes: {
        ...story.nodes,
        [id]: { title: 'New Page', text: '', choices: [], isEnding: false, position: viewportCenter },
      },
    }
    persistStory(updated)
    setSelectedNode(id)
  }, [story, persistStory, screenToFlowPosition])

  const onEdgeLabelClick = useCallback((_, edge) => {
    setSelectedNode(edge.source)
  }, [])

  const handleAddNodeWithTitle = useCallback((title) => {
    const id = generateNodeId()
    const viewportCenter = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    })
    const updated = {
      ...story,
      nodes: {
        ...story.nodes,
        [id]: { title, text: '', choices: [], isEnding: false, position: viewportCenter },
      },
    }
    persistStory(updated)
    return id
  }, [story, persistStory, screenToFlowPosition])

  const handleAlign = useCallback(() => {
    if (!story) return
    const { flowNodes, flowEdges } = layoutGraph(story.nodes, story.startNode, rankdir, selectedNode, edgeStyle)
    setNodes(flowNodes)
    setEdges(flowEdges)
    setTimeout(() => fitView({ padding: 0.3, duration: 400 }), 50)
  }, [story, rankdir, selectedNode, edgeStyle, setNodes, setEdges, fitView])

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(story, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${story.title?.replace(/\s+/g, '-').toLowerCase() || 'story'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [story])

  if (!story) return null

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Graph area */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Toolbar */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 10,
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}>
          <ToolBtn onClick={handleAddNode} label="+ Add Node" />
          <ToolBtn onClick={handleExport} label="↓ Export JSON" />
          <ToolBtn onClick={() => navigate('/author')} label="← Back" />
          <ToolBtn
            onClick={() => setRankdir(d => d === 'TB' ? 'LR' : 'TB')}
            label={rankdir === 'TB' ? '⇄ Horizontal' : '⇅ Vertical'}
          />
          <ToolBtn onClick={handleAlign} label="⊞ Align" />
          <EdgeStyleBtn />
          <ToolBtn onClick={() => setShowHelp(true)} label="? Help" />
        </div>

        {/* Story title */}
        <div style={{
          position: 'absolute',
          top: 14,
          right: 16,
          zIndex: 10,
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '1rem',
          color: 'var(--color-text-dim)',
          fontStyle: 'italic',
        }}>
          {story.title}
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeLabelClick}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          connectionRadius={40}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          style={{ background: 'var(--color-bg)' }}
        >
          <Background color="#2a2520" gap={20} />
          <Controls
            position="bottom-left"
            style={{ bottom: 52, left: 12, margin: 0 }}
          />
          <MiniMap
            nodeColor={(n) => {
              const bc = n.data?.borderColor || ''
              if (bc === '#4a8') return '#4a8'
              if (bc === '#a45') return '#a45'
              if (bc === '#885') return '#885'
              return '#4a4540'
            }}
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          />
        </ReactFlow>

        {/* Legend */}
        <div className="cyoa-legend" style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 10,
          display: 'flex',
          gap: '1rem',
          fontSize: '0.7rem',
          color: 'var(--color-text-dim)',
          background: 'var(--color-surface)',
          padding: '0.5rem 0.75rem',
          borderRadius: '6px',
          border: '1px solid var(--color-border)',
        }}>
          <span><span style={{ color: '#4a8' }}>●</span> Start</span>
          <span><span style={{ color: '#d48' }}>●</span> Ending</span>
          <span><span style={{ color: '#aa8' }}>●</span> Orphan</span>
          <span><span style={{ color: '#4a4540' }}>●</span> Normal</span>
        </div>
      </div>

      {/* Help modal */}
      {showHelp && (
        <div
          onClick={() => setShowHelp(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '1.75rem',
              maxWidth: '480px',
              width: '90%',
              fontFamily: 'var(--font-ui)',
              color: 'var(--color-text)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>How to use the Graph Editor</h2>
              <button onClick={() => setShowHelp(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--color-text-dim)' }}>
              <HelpItem icon="⚙" text="Settings (navbar): switch Dark/Light mode and graph connection style — Straight (direct lines), Curve (smooth bezier arcs), or Smooth (right-angle stepped lines). The toolbar button also cycles through styles directly." />
              <HelpItem icon="⊞" text="'Align' resets all nodes back to their automatic layout positions after you've moved them around manually." />
              <HelpItem icon="⇄" text="Toggle 'Horizontal / Vertical' to switch the graph layout direction. Horizontal (left→right) works well for wide stories; Vertical (top→down) suits tall, linear ones." />
              <HelpItem icon="✦" text="Click any node to open the Edit Node panel and change its title, text, or choices." />
              <HelpItem icon="⤳" text="Drag from a node's handle (edge dot) to another node to create a connection." />
              <HelpItem icon="✎" text="Click any connection label (e.g. 'Go left') to open the source node's editor." />
              <HelpItem icon="＋" text="'Add Node' creates a new page at your current view center. Drag it into position." />
              <HelpItem icon="⬡" text="In Edit Node → Choices, set a choice target or create a brand-new node inline." />
              <HelpItem icon="↓" text="'Export JSON' downloads your story file for backup or deployment." />
              <HelpItem icon="●" text={<>Node colors: <span style={{color:'#7dcea0'}}>green = start</span>, <span style={{color:'#d48'}}>red = ending</span>, <span style={{color:'#aa8'}}>yellow = orphan (unreachable)</span>.</>} />
            </div>
          </div>
        </div>
      )}

      {/* Node editor panel */}
      {selectedNode && story.nodes[selectedNode] && (
        <NodeEditor
          node={story.nodes[selectedNode]}
          nodeId={selectedNode}
          allNodes={story.nodes}
          onSave={handleSaveNode}
          onDelete={handleDeleteNode}
          onClose={() => setSelectedNode(null)}
          onAddNode={handleAddNodeWithTitle}
          isStart={selectedNode === story.startNode}
        />
      )}
    </div>
  )
}

function HelpItem({ icon, text }) {
  return (
    <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
      <span style={{ color: 'var(--color-accent)', fontSize: '0.9rem', marginTop: '1px', flexShrink: 0 }}>{icon}</span>
      <span>{text}</span>
    </div>
  )
}

const EDGE_STYLES = [
  { value: 'default',    label: '⌒ Curve' },
  { value: 'straight',   label: '⟶ Straight' },
  { value: 'smoothstep', label: '⤷ Smooth' },
]

function EdgeStyleBtn() {
  const { edgeStyle, setEdgeStyle } = useSettings()
  const current = EDGE_STYLES.find(s => s.value === edgeStyle) || EDGE_STYLES[0]
  const next = EDGE_STYLES[(EDGE_STYLES.indexOf(current) + 1) % EDGE_STYLES.length]
  return (
    <button
      onClick={() => setEdgeStyle(next.value)}
      className="cyoa-toolbtn"
      title={`Switch to ${next.label}`}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent-dim)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
        padding: '0.45rem 0.85rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.78rem',
        fontFamily: 'var(--font-ui)',
        transition: 'border-color 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {current.label}
    </button>
  )
}

function ToolBtn({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="cyoa-toolbtn"
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent-dim)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
        padding: '0.45rem 0.85rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.78rem',
        fontFamily: 'var(--font-ui)',
        transition: 'border-color 0.15s',
      }}
    >
      {label}
    </button>
  )
}
