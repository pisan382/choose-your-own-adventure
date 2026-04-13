const { useEffect, useMemo, useState } = React;

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function parseChoicesFromText(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  const re = /(if[^\n]{0,180}?)(?:turn|go|return|take|follow)\s+(?:to\s+)?(?:page|p\.)\s*(\d{1,4})/i;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(re);
    if (!m) continue;
    out.push({ label: m[1].trim(), target: Number(m[2]) });
  }
  return out;
}

function classifyNode(id, graph, pages) {
  const outgoing = graph.adjacency[id] || [];
  const incoming = graph.incoming[id] || [];
  const page = pages[id] || {};
  const isEnding = !!page.isEnding;
  const unfinished = outgoing.length === 0 && !isEnding;
  const terminal = outgoing.length === 0 && isEnding;
  const converge = incoming.length > 1;
  return { unfinished, terminal, converge };
}

function buildLevels(graph, root = 2) {
  const levels = {};
  const queue = [];
  if (graph.nodeIds.includes(root)) {
    levels[root] = 0;
    queue.push(root);
  }
  for (const node of graph.nodeIds) {
    if (!(node in levels)) {
      levels[node] = Number.MAX_SAFE_INTEGER;
    }
  }
  while (queue.length) {
    const node = queue.shift();
    const base = levels[node];
    for (const nxt of graph.adjacency[node] || []) {
      if (levels[nxt] > base + 1) {
        levels[nxt] = base + 1;
        queue.push(nxt);
      }
    }
  }
  for (const node of graph.nodeIds) {
    if (levels[node] === Number.MAX_SAFE_INTEGER) {
      levels[node] = 0;
    }
  }
  return levels;
}

function graphFromPages(pages) {
  const ids = Object.keys(pages).map(Number).sort((a, b) => a - b);
  const adjacency = {};
  const incoming = {};
  for (const id of ids) {
    adjacency[id] = [];
    incoming[id] = [];
  }
  for (const id of ids) {
    const choices = pages[id].choices || [];
    for (const c of choices) {
      if (!ids.includes(Number(c.target))) continue;
      if (!adjacency[id].includes(Number(c.target))) {
        adjacency[id].push(Number(c.target));
      }
    }
  }
  for (const [srcRaw, targets] of Object.entries(adjacency)) {
    const src = Number(srcRaw);
    for (const target of targets) {
      if (!incoming[target]) incoming[target] = [];
      if (!incoming[target].includes(src)) incoming[target].push(src);
    }
  }
  return {
    nodeIds: ids,
    adjacency,
    incoming,
  };
}

function AuthorApp() {
  const [pages, setPages] = useState({});
  const [graph, setGraph] = useState({ nodeIds: [], adjacency: {}, incoming: {} });
  const [selectedId, setSelectedId] = useState(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [targetDraft, setTargetDraft] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [pdfMode, setPdfMode] = useState("extension");

  useEffect(() => {
    Promise.all([
      fetch("../data/pages.json").then((r) => r.json()),
      fetch("../data/graph.json").then((r) => r.json()),
    ])
      .then(([pagesData, graphData]) => {
        const basePages = {};
        for (const id of pagesData.pageIds) {
          basePages[id] = {
            id,
            title: `Page ${id}`,
            text: pagesData.pages[id].text,
            choices: (pagesData.pages[id].choices || []).map((c) => ({ label: c.label || `Go to page ${c.target}`, target: Number(c.target) })),
            isEnding: false,
          };
        }
        setPages(basePages);
        setGraph({ nodeIds: graphData.nodeIds.map(Number), adjacency: graphData.adjacency, incoming: graphData.incoming });
        setSelectedId(graphData.nodeIds.includes(2) ? 2 : graphData.nodeIds[0]);
      })
      .catch(() => setStatusMsg("Failed to load source data."));
  }, []);

  const selected = selectedId ? pages[selectedId] : null;

  const grouped = useMemo(() => {
    const unfinished = [];
    const terminals = [];
    const converge = [];
    for (const id of graph.nodeIds) {
      const c = classifyNode(id, graph, pages);
      if (c.unfinished) unfinished.push(id);
      if (c.terminal) terminals.push(id);
      if (c.converge) converge.push(id);
    }
    const similarEndings = [];
    for (let i = 0; i < terminals.length; i++) {
      for (let j = i + 1; j < terminals.length; j++) {
        const a = pages[terminals[i]]?.text || "";
        const b = pages[terminals[j]]?.text || "";
        const aw = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
        const bw = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
        const inter = [...aw].filter((w) => bw.has(w)).length;
        const union = new Set([...aw, ...bw]).size || 1;
        const score = inter / union;
        if (score > 0.62) {
          similarEndings.push({ a: terminals[i], b: terminals[j], score: score.toFixed(2) });
        }
      }
    }
    return { unfinished, terminals, converge, similarEndings };
  }, [graph, pages]);

  const layout = useMemo(() => {
    const levels = buildLevels(graph, 2);
    const byLevel = {};
    for (const id of graph.nodeIds) {
      const lv = levels[id] || 0;
      if (!byLevel[lv]) byLevel[lv] = [];
      byLevel[lv].push(id);
    }
    const pos = {};
    const levelKeys = Object.keys(byLevel).map(Number).sort((a, b) => a - b);
    const xGap = 170;
    const yGap = 78;
    for (const lv of levelKeys) {
      const ids = byLevel[lv].sort((a, b) => a - b);
      ids.forEach((id, idx) => {
        pos[id] = { x: 80 + lv * xGap, y: 50 + idx * yGap };
      });
    }
    return pos;
  }, [graph]);

  function syncGraph(updatedPages) {
    const nextGraph = graphFromPages(updatedPages);
    setGraph(nextGraph);
  }

  function setPageField(field, value) {
    if (!selectedId) return;
    const next = clone(pages);
    next[selectedId][field] = value;
    if (field === "text") {
      const parsed = parseChoicesFromText(value);
      if (parsed.length) {
        next[selectedId].choices = parsed;
      }
    }
    setPages(next);
    syncGraph(next);
  }

  function addNode() {
    const ids = Object.keys(pages).map(Number);
    const nextId = ids.length ? Math.max(...ids) + 1 : 1;
    const next = clone(pages);
    next[nextId] = { id: nextId, title: `Page ${nextId}`, text: "", choices: [], isEnding: false };
    setPages(next);
    syncGraph(next);
    setSelectedId(nextId);
  }

  function deleteNode() {
    if (!selectedId) return;
    const next = clone(pages);
    delete next[selectedId];
    for (const id of Object.keys(next)) {
      next[id].choices = (next[id].choices || []).filter((c) => Number(c.target) !== Number(selectedId));
    }
    const remaining = Object.keys(next).map(Number).sort((a, b) => a - b);
    setPages(next);
    syncGraph(next);
    setSelectedId(remaining[0] || null);
  }

  function addChoice() {
    if (!selectedId || !targetDraft) return;
    const target = Number(targetDraft);
    if (!pages[target]) {
      setStatusMsg("Target node does not exist.");
      return;
    }
    const label = labelDraft.trim() || `Go to page ${target}`;
    const next = clone(pages);
    if (!next[selectedId].choices.some((c) => Number(c.target) === target && c.label === label)) {
      next[selectedId].choices.push({ label, target });
      setPages(next);
      syncGraph(next);
    }
    setLabelDraft("");
    setTargetDraft("");
  }

  function removeChoice(idx) {
    const next = clone(pages);
    next[selectedId].choices.splice(idx, 1);
    setPages(next);
    syncGraph(next);
  }

  function exportStory() {
    const payload = { pages, graph, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "authored-story.json";
    a.click();
    URL.revokeObjectURL(a.href);
    setStatusMsg("Story exported.");
  }

  async function saveToServer() {
    try {
      const res = await fetch("/api/author/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages, graph }),
      });
      if (!res.ok) throw new Error();
      setStatusMsg("Saved to web/data/authored-story.json");
    } catch {
      setStatusMsg("Save failed. Is Node server running?");
    }
  }

  async function importStoryJson(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed.pages) throw new Error("Invalid JSON format");
    setPages(parsed.pages);
    const rebuilt = parsed.graph || graphFromPages(parsed.pages);
    setGraph(rebuilt);
    const first = Object.keys(parsed.pages).map(Number).sort((a, b) => a - b)[0];
    setSelectedId(first || null);
    setStatusMsg("Story JSON loaded.");
  }

  async function importPdf(file) {
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) {
      setStatusMsg("PDF.js not loaded.");
      return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    const next = pdfMode === "start" ? {} : clone(pages);
    const ids = Object.keys(next).map(Number);
    let cursor = ids.length ? Math.max(...ids) + 1 : 1;

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const text = content.items.map((it) => it.str).join(" ").replace(/\s+/g, " ").trim();
      if (!text) continue;
      next[cursor] = {
        id: cursor,
        title: `Imported Page ${cursor}`,
        text,
        choices: [],
        isEnding: false,
      };
      cursor += 1;
    }

    setPages(next);
    syncGraph(next);
    const first = Object.keys(next).map(Number).sort((a, b) => a - b)[0] || null;
    setSelectedId(first);
    setStatusMsg(`Imported ${pdf.numPages} PDF pages in ${pdfMode} mode.`);
  }

  return (
    <main className="author-layout">
      <section className="panel">
        <h1>Story Nodes</h1>
        <div className="row">
          <button className="btn primary" onClick={addNode}>Add Node</button>
          <button className="btn warn" onClick={deleteNode} disabled={!selectedId}>Delete</button>
        </div>

        <div className="node-list" style={{ marginTop: "0.6rem" }}>
          {graph.nodeIds.map((id) => {
            const c = classifyNode(id, graph, pages);
            return (
              <div key={id} className={`node-item ${id === selectedId ? "active" : ""}`} onClick={() => setSelectedId(id)}>
                <strong>{id}</strong> {pages[id]?.title || "Untitled"}
                <div className="pills">
                  {c.unfinished && <span className="pill unfinished">unfinished</span>}
                  {c.terminal && <span className="pill terminal">terminal</span>}
                  {c.converge && <span className="pill converge">converge</span>}
                </div>
              </div>
            );
          })}
        </div>

        <hr />
        <h3>Import / Export</h3>
        <label className="small">PDF import mode</label>
        <select className="input" value={pdfMode} onChange={(e) => setPdfMode(e.target.value)}>
          <option value="start">Start story (replace)</option>
          <option value="extension">Extension (append)</option>
        </select>
        <input className="input" type="file" accept="application/pdf" onChange={(e) => e.target.files?.[0] && importPdf(e.target.files[0])} />

        <input className="input" type="file" accept="application/json" onChange={(e) => e.target.files?.[0] && importStoryJson(e.target.files[0])} />

        <div className="row">
          <button className="btn" onClick={exportStory}>Export JSON</button>
          <button className="btn" onClick={saveToServer}>Save to Server</button>
        </div>
        <p className="small">{statusMsg}</p>
      </section>

      <section className="panel">
        <h2>Live Graph</h2>
        <div className="graph-wrap">
          <svg viewBox="0 0 1800 1000">
            {graph.nodeIds.map((src) => (graph.adjacency[src] || []).map((dst) => {
              const a = layout[src];
              const b = layout[dst];
              if (!a || !b) return null;
              return <line key={`${src}-${dst}`} x1={a.x + 40} y1={a.y + 20} x2={b.x} y2={b.y + 20} stroke="#94a3b8" strokeWidth="1.8" />;
            }))}

            {graph.nodeIds.map((id) => {
              const p = layout[id];
              if (!p) return null;
              const c = classifyNode(id, graph, pages);
              let fill = "#dbeafe";
              if (c.unfinished) fill = "#fde68a";
              if (c.terminal) fill = "#bbf7d0";
              if (c.converge) fill = "#ddd6fe";

              return (
                <g key={id} onClick={() => setSelectedId(id)} style={{ cursor: "pointer" }}>
                  <rect x={p.x} y={p.y} width="80" height="40" rx="8" fill={fill} stroke={id === selectedId ? "#0f172a" : "#64748b"} strokeWidth={id === selectedId ? "2.2" : "1.1"} />
                  <text x={p.x + 40} y={p.y + 25} textAnchor="middle" fontSize="13">{id}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="legend">
          <span><span className="dot" style={{ background: "#fde68a" }}></span>Unfinished</span>
          <span><span className="dot" style={{ background: "#bbf7d0" }}></span>Terminal</span>
          <span><span className="dot" style={{ background: "#ddd6fe" }}></span>Converge</span>
        </div>
      </section>

      <section className="panel">
        <h2>Node Editor</h2>
        {!selected ? (
          <p>Select a node.</p>
        ) : (
          <>
            <label className="small">Node ID</label>
            <input className="input" value={selected.id} disabled />

            <label className="small">Title</label>
            <input className="input" value={selected.title || ""} onChange={(e) => setPageField("title", e.target.value)} />

            <label className="small">Text</label>
            <textarea value={selected.text || ""} onChange={(e) => setPageField("text", e.target.value)} />

            <label className="small">
              <input type="checkbox" checked={!!selected.isEnding} onChange={(e) => setPageField("isEnding", e.target.checked)} /> Mark as ending node
            </label>

            <hr />
            <h3>Choices</h3>
            {(selected.choices || []).map((c, idx) => (
              <div key={`${c.label}-${idx}`} className="row" style={{ marginBottom: "0.35rem" }}>
                <input className="input" style={{ marginBottom: 0 }} value={`${c.label} -> ${c.target}`} disabled />
                <button className="btn ghost" onClick={() => removeChoice(idx)}>Remove</button>
              </div>
            ))}

            <div className="row">
              <input className="input" placeholder="Choice label" value={labelDraft} onChange={(e) => setLabelDraft(e.target.value)} />
              <input className="input" placeholder="Target ID" value={targetDraft} onChange={(e) => setTargetDraft(e.target.value)} />
            </div>
            <button className="btn primary" onClick={addChoice}>Add Choice</button>
          </>
        )}

        <hr />
        <h3>Insights</h3>
        <p className="small">Unfinished: {grouped.unfinished.join(", ") || "None"}</p>
        <p className="small">Converge: {grouped.converge.join(", ") || "None"}</p>
        <p className="small">Similar endings:</p>
        {(grouped.similarEndings.length === 0) ? (
          <p className="small">No close ending pairs detected.</p>
        ) : (
          grouped.similarEndings.slice(0, 8).map((x, i) => (
            <p key={i} className="small">{x.a} and {x.b} (score {x.score})</p>
          ))
        )}
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<AuthorApp />);