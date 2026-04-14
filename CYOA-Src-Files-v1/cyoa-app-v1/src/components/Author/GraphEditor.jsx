import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import { getStory, saveStory, generateNodeId } from '../../utils/storage'
import { findReachable } from '../../utils/storyHelpers'
import NodeEditor from './NodeEditor'

const NODE_W = 160
const NODE_H = 50

function layoutGraph(storyNodes, startNode) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60 })
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

  const flowNodes = ids.map(id => {
    const pos = g.node(id)
    const node = storyNodes[id]
    const isEnding = node.isEnding || !node.choices?.length
    const isStart = id === startNode
    const isOrphan = !reachable.has(id)

    let bgColor = '#242220'
    let borderColor = '#3a3530'
    let textColor = '#e8e0d4'
    if (isStart) { bgColor = '#1a3028'; borderColor = '#4a8'; textColor = '#7dcea0' }
    else if (isEnding) { bgColor = '#2a1820'; borderColor = '#a45'; textColor = '#d48' }
    else if (isOrphan) { bgColor = '#2a2420'; borderColor = '#885'; textColor = '#aa8' }

    return {
      id,
      position: { x: (pos?.x || 0) - NODE_W / 2, y: (pos?.y || 0) - NODE_H / 2 },
      data: {
        label: (
          <div style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            textAlign: 'center',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            padding: '2px',
          }}>
            <div style={{ color: textColor, marginBottom: '1px' }}>{node.title || id}</div>
            {isStart && <span style={{ fontSize: '0.6rem', color: '#4a8' }}>START</span>}
            {isEnding && <span style={{ fontSize: '0.6rem', color: '#d48' }}>END</span>}
            {isOrphan && <span style={{ fontSize: '0.6rem', color: '#aa8' }}>ORPHAN</span>}
          </div>
        ),
      },
      style: {
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        width: NODE_W,
        height: NODE_H,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      },
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
            label: c.text?.slice(0, 30) || '',
            labelStyle: { fill: '#9a9080', fontSize: '0.6rem' },
            style: { stroke: '#4a4540' },
            animated: false,
          })
        }
      })
    }
  })

  return { flowNodes, flowEdges }
}

export default function GraphEditor() {
  const { storyId } = useParams()
  const navigate = useNavigate()
  const [story, setStory] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Load story
  useEffect(() => {
    const s = getStory(storyId)
    if (!s) { navigate('/author'); return }
    setStory(s)
  }, [storyId, navigate])

  // Rebuild graph when story changes
  useEffect(() => {
    if (!story) return
    const { flowNodes, flowEdges } = layoutGraph(story.nodes, story.startNode)
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [story, setNodes, setEdges])

  const allNodeIds = useMemo(() => story ? Object.keys(story.nodes) : [], [story])

  const persistStory = useCallback((updated) => {
    setStory(updated)
    saveStory(storyId, updated)
  }, [storyId])

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node.id)
  }, [])

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
    const updated = {
      ...story,
      nodes: {
        ...story.nodes,
        [id]: { title: 'New Page', text: '', choices: [], isEnding: false },
      },
    }
    persistStory(updated)
    setSelectedNode(id)
  }, [story, persistStory])

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
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          style={{ background: 'var(--color-bg)' }}
        >
          <Background color="#2a2520" gap={20} />
          <Controls
            style={{
              button: { background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }
            }}
          />
          <MiniMap
            nodeColor={(n) => {
              const bc = n.style?.border || ''
              if (bc.includes('#4a8')) return '#4a8'
              if (bc.includes('#a45')) return '#a45'
              if (bc.includes('#885')) return '#885'
              return '#4a4540'
            }}
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          />
        </ReactFlow>

        {/* Legend */}
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 10,
          display: 'flex',
          gap: '1rem',
          fontSize: '0.7rem',
          color: 'var(--color-text-dim)',
          background: 'rgba(15,14,12,0.85)',
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

      {/* Node editor panel */}
      {selectedNode && story.nodes[selectedNode] && (
        <NodeEditor
          node={story.nodes[selectedNode]}
          nodeId={selectedNode}
          allNodeIds={allNodeIds}
          onSave={handleSaveNode}
          onDelete={handleDeleteNode}
          onClose={() => setSelectedNode(null)}
          isStart={selectedNode === story.startNode}
        />
      )}
    </div>
  )
}

function ToolBtn({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent-dim)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
      style={{
        background: 'rgba(26,24,22,0.9)',
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
