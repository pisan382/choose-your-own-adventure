const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const CHOICE_RE = /\b(?:turn|tum|go|follow|take|return)\b[^\n]{0,120}?\b(?:to|ta|io)\b[^\n]{0,20}?(?:page|poge|p\.)\s*([0-9IlOoSsZz]{1,3})/gi;
const TERMINAL_PATTERNS = [
  /\bThe\s+End\b[.!]?\s*$/im,
  /\bEND\s+STORY\b[.!]?\s*$/im,
  /\bSTORY\s+ENDS\b[.!]?\s*$/im,
  /\bTHE\s+END\b[.!]?\s*$/im,
  /\bEnd\.\s*$/im,
];

const rootDir = path.resolve(__dirname, '..', '..');
const bundledOutput = path.join(rootDir, 'output');
const runtimeOutput = '/tmp/cyoa-output';
const pagesDir = path.join(runtimeOutput, 'cot-pages-ocr-v2');
const mmdPath = path.join(runtimeOutput, 'cot-story-graph.mmd');
const metaPath = path.join(runtimeOutput, 'pages-meta.json');

let prepared = false;

async function exists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(src, dst) {
  await fsp.mkdir(dst, { recursive: true });
  for (const entry of await fsp.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      await copyDir(s, d);
    } else {
      await fsp.copyFile(s, d);
    }
  }
}

async function ensureRuntimeData() {
  if (prepared) return;
  await fsp.mkdir(runtimeOutput, { recursive: true });
  const hasPages = await exists(pagesDir);
  if (!hasPages && (await exists(bundledOutput))) {
    await copyDir(bundledOutput, runtimeOutput);
  }
  prepared = true;
}

function normalizePageToken(token) {
  const raw = String(token || '').trim();
  if (!raw) return null;
  if (!/[0-9IlOoL]/.test(raw)) return null;
  const mapped = raw
    .replace(/O/g, '0')
    .replace(/o/g, '0')
    .replace(/I/g, '1')
    .replace(/l/g, '1')
    .replace(/L/g, '1')
    .replace(/S/g, '5')
    .replace(/s/g, '5')
    .replace(/Z/g, '2')
    .replace(/z/g, '2');
  if (!/^\d+$/.test(mapped)) return null;
  const value = Number.parseInt(mapped, 10);
  if (!Number.isFinite(value) || value <= 0 || value > 300) return null;
  return value;
}

function extractLinks(text) {
  const links = [];
  CHOICE_RE.lastIndex = 0;
  let m;
  while ((m = CHOICE_RE.exec(text)) !== null) {
    const page = normalizePageToken(m[1]);
    if (page != null && !links.includes(page)) {
      links.push(page);
    }
  }
  return links;
}

function extractLinksWithMatches(text) {
  const results = [];
  const seen = new Set();
  CHOICE_RE.lastIndex = 0;
  let m;
  while ((m = CHOICE_RE.exec(text)) !== null) {
    const page = normalizePageToken(m[1]);
    if (page != null && !seen.has(page)) {
      seen.add(page);
      results.push({ page, match: m[0] });
    }
  }
  return results;
}

function isTerminal(text) {
  return TERMINAL_PATTERNS.some((re) => re.test(text));
}

async function parsePages() {
  const pages = new Map();
  if (!(await exists(pagesDir))) return pages;
  const names = await fsp.readdir(pagesDir);
  for (const name of names.sort()) {
    const m = name.match(/^(\d+)-CoT\.txt$/);
    if (!m) continue;
    const page = Number.parseInt(m[1], 10);
    const content = await fsp.readFile(path.join(pagesDir, name), 'utf8');
    pages.set(page, content);
  }
  return pages;
}

async function loadGraph() {
  if (!(await exists(mmdPath))) return { nodes: [], edges: [] };
  const text = await fsp.readFile(mmdPath, 'utf8');
  const nodes = [];
  const edges = [];
  const seen = new Set();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^graph\s+/i.test(line)) continue;

    const nodeMatch = line.match(/^\s*(P\d+)\[("[^"]*")\]\s*$/);
    if (nodeMatch) {
      const id = nodeMatch[1];
      if (!seen.has(id)) {
        seen.add(id);
        nodes.push({ id, label: nodeMatch[2].slice(1, -1), page: Number.parseInt(id.slice(1), 10) });
      }
      continue;
    }

    const edgeMatch = line.match(/^\s*(P\d+)\s*-->\s*(P\d+)\s*$/);
    if (edgeMatch) {
      const source = edgeMatch[1];
      const target = edgeMatch[2];
      edges.push({ source, target });
      for (const id of [source, target]) {
        if (!seen.has(id)) {
          seen.add(id);
          const page = Number.parseInt(id.slice(1), 10);
          nodes.push({ id, label: String(page), page });
        }
      }
    }
  }

  return { nodes, edges };
}

async function saveGraph(graph) {
  const nodes = [...(graph.nodes || [])].sort((a, b) => Number.parseInt(a.id.slice(1), 10) - Number.parseInt(b.id.slice(1), 10));
  const edges = graph.edges || [];
  const lines = ['graph TD'];
  for (const node of nodes) {
    const label = node.label || node.id;
    lines.push(`  ${node.id}["${label}"]`);
  }
  for (const edge of edges) {
    lines.push(`  ${edge.source} --> ${edge.target}`);
  }
  await fsp.writeFile(mmdPath, `${lines.join('\n')}\n`, 'utf8');
}

async function loadMeta() {
  if (!(await exists(metaPath))) return {};
  try {
    const text = await fsp.readFile(metaPath, 'utf8');
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function saveMeta(meta) {
  await fsp.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
}

async function ensureMeta() {
  const meta = await loadMeta();
  const pages = await parsePages();
  let changed = false;
  for (const [page, text] of pages) {
    const key = String(page);
    if (!meta[key]) {
      meta[key] = {};
      changed = true;
    }
    if (meta[key].isEnding === undefined) {
      meta[key].isEnding = isTerminal(text);
      changed = true;
    }
  }
  if (changed) await saveMeta(meta);
  return meta;
}

function getPageMeta(pageNum, meta) {
  return meta[String(pageNum)] || {};
}

async function enrichGraph(graph) {
  const meta = await ensureMeta();
  const pages = await parsePages();
  const nodeMap = new Map();

  for (const node of graph.nodes || []) {
    nodeMap.set(node.id, { ...node });
  }
  for (const pageNum of pages.keys()) {
    const nodeId = `P${pageNum}`;
    if (!nodeMap.has(nodeId)) {
      nodeMap.set(nodeId, { id: nodeId, label: String(pageNum), page: pageNum });
    }
  }

  const nodes = [...nodeMap.values()]
    .sort((a, b) => Number.parseInt(a.id.slice(1), 10) - Number.parseInt(b.id.slice(1), 10))
    .map((node) => {
      const pm = getPageMeta(node.page, meta);
      return {
        ...node,
        isEnding: !!pm.isEnding,
        x: pm.x ?? null,
        y: pm.y ?? null,
        tags: pm.tags || [],
        hasText: pages.has(node.page),
      };
    });

  const edges = (graph.edges || []).map((edge) => {
    const dst = Number.parseInt(String(edge.target || '').slice(1), 10);
    return { ...edge, targetExists: Number.isFinite(dst) ? pages.has(dst) : false };
  });

  return { nodes, edges };
}

function suggestGraphDelta(pages, graph) {
  const pageSet = new Set(pages.keys());
  const currentEdges = new Set();
  for (const edge of graph.edges || []) {
    const src = Number.parseInt(String(edge.source || '').slice(1), 10);
    const dst = Number.parseInt(String(edge.target || '').slice(1), 10);
    if (Number.isFinite(src) && Number.isFinite(dst)) currentEdges.add(`${src}->${dst}`);
  }

  const suggested = new Set();
  const terminals = new Set();
  for (const [page, text] of pages) {
    const targets = extractLinks(text).filter((t) => pageSet.has(t) && t !== page);
    if (targets.length) {
      for (const t of targets) suggested.add(`${page}->${t}`);
      continue;
    }
    if (isTerminal(text)) {
      terminals.add(page);
      continue;
    }
    const next = page + 1;
    if (pageSet.has(next)) suggested.add(`${page}->${next}`);
  }

  const suggestedNewEdges = [];
  const orphanEdges = [];
  const brokenLinks = [];

  for (const key of suggested) {
    if (!currentEdges.has(key)) {
      const [s, t] = key.split('->').map((v) => Number.parseInt(v, 10));
      suggestedNewEdges.push({ source: s, target: t });
    }
  }
  for (const key of currentEdges) {
    if (!suggested.has(key)) {
      const [s, t] = key.split('->').map((v) => Number.parseInt(v, 10));
      orphanEdges.push({ source: s, target: t });
    }
    const [, t] = key.split('->').map((v) => Number.parseInt(v, 10));
    if (!pageSet.has(t)) {
      const [s] = key.split('->').map((v) => Number.parseInt(v, 10));
      brokenLinks.push({ source: s, target: t, reason: 'target page missing' });
    }
  }

  suggestedNewEdges.sort((a, b) => a.source - b.source || a.target - b.target);
  orphanEdges.sort((a, b) => a.source - b.source || a.target - b.target);

  return {
    pages_parsed: pages.size,
    suggested_new_edges: suggestedNewEdges,
    orphan_edges: orphanEdges,
    terminals: [...terminals].sort((a, b) => a - b),
    broken_links: brokenLinks,
  };
}

function ok(body, statusCode = 200) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  };
}

function fail(message, statusCode = 400) {
  return ok({ detail: message }, statusCode);
}

function parseBody(event) {
  if (!event.body) return {};
  const contentType = String(event.headers?.['content-type'] || event.headers?.['Content-Type'] || '');
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(event.body);
    } catch {
      return {};
    }
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(event.body));
  }
  return {};
}

function getApiPath(event) {
  const rawPath = event.path || event.rawPath || '/';
  if (rawPath.startsWith('/.netlify/functions/api/')) return `/${rawPath.slice('/.netlify/functions/api/'.length)}`;
  if (rawPath === '/.netlify/functions/api') return '/';
  if (rawPath.startsWith('/api/')) return `/${rawPath.slice('/api/'.length)}`;
  if (rawPath === '/api') return '/';
  return rawPath;
}

exports.handler = async (event) => {
  await ensureRuntimeData();

  const method = String(event.httpMethod || event.requestContext?.http?.method || 'GET').toUpperCase();
  const apiPath = getApiPath(event);
  const body = parseBody(event);

  try {
    if (method === 'GET' && apiPath === '/graph') {
      const graph = await loadGraph();
      return ok(await enrichGraph(graph));
    }

    if (method === 'GET' && apiPath === '/pages') {
      const pages = await parsePages();
      const meta = await ensureMeta();
      const graph = await loadGraph();
      const outgoing = new Map();
      for (const edge of graph.edges || []) {
        const src = Number.parseInt(String(edge.source || '').slice(1), 10);
        const dst = Number.parseInt(String(edge.target || '').slice(1), 10);
        if (!Number.isFinite(src) || !Number.isFinite(dst)) continue;
        if (!outgoing.has(src)) outgoing.set(src, new Set());
        outgoing.get(src).add(dst);
      }
      const result = [...pages.keys()].sort((a, b) => a - b).map((page) => {
        const pm = getPageMeta(page, meta);
        return {
          page,
          hasText: true,
          isEnding: !!pm.isEnding,
          outgoing: [...(outgoing.get(page) || [])].sort((a, b) => a - b),
          tags: pm.tags || [],
        };
      });
      return ok(result);
    }

    const pageMatch = apiPath.match(/^\/pages\/(\d+)$/);
    if (method === 'GET' && pageMatch) {
      const page = Number.parseInt(pageMatch[1], 10);
      const p1 = path.join(pagesDir, `${String(page).padStart(2, '0')}-CoT.txt`);
      const p2 = path.join(pagesDir, `${page}-CoT.txt`);
      const filePath = (await exists(p1)) ? p1 : p2;
      if (!(await exists(filePath))) return fail('Page not found', 404);
      return ok({ page, text: await fsp.readFile(filePath, 'utf8') });
    }

    const suggMatch = apiPath.match(/^\/pages\/(\d+)\/suggestions$/);
    if (method === 'GET' && suggMatch) {
      const page = Number.parseInt(suggMatch[1], 10);
      const p1 = path.join(pagesDir, `${String(page).padStart(2, '0')}-CoT.txt`);
      const p2 = path.join(pagesDir, `${page}-CoT.txt`);
      const filePath = (await exists(p1)) ? p1 : p2;
      if (!(await exists(filePath))) return fail('Page not found', 404);
      const text = await fsp.readFile(filePath, 'utf8');
      const pages = await parsePages();
      const pageSet = new Set(pages.keys());
      const suggested = extractLinks(text).filter((t) => pageSet.has(t));
      return ok({
        page,
        suggested_edges: suggested,
        matches: extractLinksWithMatches(text),
        is_terminal: isTerminal(text),
      });
    }

    if (method === 'POST' && pageMatch) {
      const page = Number.parseInt(pageMatch[1], 10);
      const text = String(body.text || '');
      await fsp.mkdir(pagesDir, { recursive: true });
      const pageFile = path.join(pagesDir, `${String(page).padStart(2, '0')}-CoT.txt`);
      await fsp.writeFile(pageFile, text, 'utf8');

      const meta = await ensureMeta();
      const key = String(page);
      if (!meta[key]) meta[key] = {};
      if (meta[key].isEnding === undefined || meta[key].isEndingAuto !== false) {
        meta[key].isEnding = isTerminal(text);
        meta[key].isEndingAuto = true;
        await saveMeta(meta);
      }

      const pages = await parsePages();
      const pageSet = new Set(pages.keys());
      const suggested = extractLinks(text).filter((t) => pageSet.has(t));
      return ok({ page, saved: true, suggested_edges: suggested, is_terminal: isTerminal(text) });
    }

    const metaMatch = apiPath.match(/^\/pages\/(\d+)\/meta$/);
    if (method === 'POST' && metaMatch) {
      const page = Number.parseInt(metaMatch[1], 10);
      const meta = await ensureMeta();
      const key = String(page);
      if (!meta[key]) meta[key] = {};
      if (body.isEnding !== undefined) {
        meta[key].isEnding = !!body.isEnding;
        meta[key].isEndingAuto = false;
      }
      if (body.x !== undefined) meta[key].x = Number(body.x);
      if (body.y !== undefined) meta[key].y = Number(body.y);
      if (Array.isArray(body.tags)) meta[key].tags = body.tags;
      await saveMeta(meta);
      return ok({ page, meta: meta[key] });
    }

    if (method === 'POST' && apiPath === '/graph/edges') {
      const source = Number.parseInt(body.source, 10);
      const target = Number.parseInt(body.target, 10);
      if (!Number.isFinite(source) || !Number.isFinite(target)) return fail('Invalid edge payload', 422);
      const graph = await loadGraph();
      const sourceId = `P${source}`;
      const targetId = `P${target}`;
      const ids = new Set((graph.nodes || []).map((n) => n.id));
      if (!ids.has(sourceId)) graph.nodes.push({ id: sourceId, label: String(source), page: source });
      if (!ids.has(targetId)) graph.nodes.push({ id: targetId, label: String(target), page: target });
      const hasEdge = (graph.edges || []).some((e) => e.source === sourceId && e.target === targetId);
      if (!hasEdge) graph.edges.push({ source: sourceId, target: targetId });
      await saveGraph(graph);
      return ok({ added: { source: sourceId, target: targetId } });
    }

    if (method === 'DELETE' && apiPath === '/graph/edges') {
      const source = Number.parseInt(body.source, 10);
      const target = Number.parseInt(body.target, 10);
      const sourceId = `P${source}`;
      const targetId = `P${target}`;
      const graph = await loadGraph();
      const before = (graph.edges || []).length;
      graph.edges = (graph.edges || []).filter((e) => !(e.source === sourceId && e.target === targetId));
      if (graph.edges.length === before) return fail('Edge not found', 404);
      await saveGraph(graph);
      return ok({ removed: { source: sourceId, target: targetId } });
    }

    if (method === 'POST' && apiPath === '/graph/nodes') {
      const page = Number.parseInt(body.page, 10);
      if (!Number.isFinite(page)) return fail('Invalid node payload', 422);
      const graph = await loadGraph();
      const id = `P${page}`;
      if (!(graph.nodes || []).some((n) => n.id === id)) {
        graph.nodes.push({ id, label: String(page), page });
        await saveGraph(graph);
      }
      return ok({ added: { id, label: String(page), page } });
    }

    if (method === 'POST' && apiPath === '/graph/layout') {
      const positions = body.positions || {};
      const meta = await ensureMeta();
      for (const [page, pos] of Object.entries(positions)) {
        if (!meta[page]) meta[page] = {};
        if (pos.x !== undefined) meta[page].x = Number(pos.x);
        if (pos.y !== undefined) meta[page].y = Number(pos.y);
      }
      await saveMeta(meta);
      return ok({ saved: Object.keys(positions).length });
    }

    if (method === 'POST' && apiPath === '/graph/rebuild') {
      const graph = await loadGraph();
      const pages = await parsePages();
      const delta = suggestGraphDelta(pages, graph);
      const confirm = !!body.confirm;

      if (confirm) {
        const nodeSet = new Set((graph.nodes || []).map((n) => n.id));
        const newEdges = [];
        for (const e of delta.suggested_new_edges) {
          const sourceId = `P${e.source}`;
          const targetId = `P${e.target}`;
          newEdges.push({ source: sourceId, target: targetId });
          nodeSet.add(sourceId);
          nodeSet.add(targetId);
        }
        const nodes = [...nodeSet]
          .sort((a, b) => Number.parseInt(a.slice(1), 10) - Number.parseInt(b.slice(1), 10))
          .map((id) => ({ id, label: String(Number.parseInt(id.slice(1), 10)), page: Number.parseInt(id.slice(1), 10) }));
        await saveGraph({ nodes, edges: newEdges });
      }

      return ok({ confirmed: confirm, delta });
    }

    if (method === 'GET' && apiPath === '/paths') {
      const graph = await enrichGraph(await loadGraph());
      const edgesMap = new Map();
      const nodeMap = new Map((graph.nodes || []).map((n) => [n.id, n]));
      for (const edge of graph.edges || []) {
        if (!edgesMap.has(edge.source)) edgesMap.set(edge.source, []);
        edgesMap.get(edge.source).push(edge.target);
      }
      const paths = [];
      const maxDepth = 20;
      function dfs(nodeId, acc, visited) {
        const page = Number.parseInt(nodeId.slice(1), 10);
        const nextPath = [...acc, page];
        const node = nodeMap.get(nodeId) || {};
        const outs = edgesMap.get(nodeId) || [];
        if (node.isEnding || outs.length === 0 || nextPath.length > maxDepth) {
          paths.push(nextPath);
          return;
        }
        for (const nextId of outs) {
          if (visited.has(nextId)) {
            paths.push([...nextPath, Number.parseInt(nextId.slice(1), 10)]);
          } else {
            dfs(nextId, nextPath, new Set([...visited, nodeId]));
          }
        }
      }
      if (nodeMap.has('P2') || edgesMap.has('P2')) dfs('P2', [], new Set());
      return ok({ paths });
    }

    if (method === 'POST' && apiPath === '/export') {
      const graph = await loadGraph();
      return ok({
        exported: true,
        dist: path.join(runtimeOutput, 'dist'),
        zip: null,
        mmd: mmdPath,
        svg: null,
        stories: path.join(runtimeOutput, 'cot-stories'),
        note: 'Netlify runtime does not generate downloadable artifacts; graph and content APIs remain available.',
      });
    }

    if (method === 'POST' && apiPath === '/import') {
      const graph = await loadGraph();
      const pages = await parsePages();
      return ok({
        saved: [],
        delta: suggestGraphDelta(pages, graph),
        note: 'Multipart import parsing is unavailable in this runtime build.',
      });
    }

    return fail(`Not found: ${method} ${apiPath}`, 404);
  } catch (err) {
    return fail(err.message || 'Server error', 500);
  }
};
