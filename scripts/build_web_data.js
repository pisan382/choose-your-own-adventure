const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PAGES_DIR = path.join(ROOT, "output", "cot-pages-ocr-v2");
const GRAPH_PATH = path.join(ROOT, "output", "cot-story-graph.mmd");
const OUT_DIR = path.join(ROOT, "web", "data");

const PAGE_FILE_RE = /^(\d+)-CoT\.txt$/;
const EDGE_RE = /\bP(\d+)\s*-->\s*P(\d+)\b/g;

function parseChoices(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  const re = /(if[^\n]{0,180}?)(?:turn|go|return|take|follow)\s+(?:to\s+)?(?:page|p\.)\s*(\d{1,3})/i;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(re);
    if (!match) continue;
    out.push({
      label: match[1].trim().replace(/\s+/g, " "),
      target: Number(match[2]),
      sourceLine: line,
    });
  }
  return out;
}

function buildPages() {
  const files = fs.readdirSync(PAGES_DIR).filter((name) => PAGE_FILE_RE.test(name));
  const pages = {};

  for (const fileName of files) {
    const match = fileName.match(PAGE_FILE_RE);
    if (!match) continue;
    const id = Number(match[1]);
    const fullPath = path.join(PAGES_DIR, fileName);
    const text = fs.readFileSync(fullPath, "utf-8").trim();
    pages[id] = {
      id,
      text,
      choices: parseChoices(text),
    };
  }

  const sortedIds = Object.keys(pages)
    .map(Number)
    .sort((a, b) => a - b);

  return {
    source: "output/cot-pages-ocr-v2",
    pageCount: sortedIds.length,
    pageIds: sortedIds,
    pages,
  };
}

function buildGraph() {
  const mmd = fs.readFileSync(GRAPH_PATH, "utf-8");
  const adjacency = {};
  const incoming = {};
  const nodes = new Set();

  for (const nodeMatch of mmd.matchAll(/\bP(\d+)\[/g)) {
    nodes.add(Number(nodeMatch[1]));
  }

  for (const match of mmd.matchAll(EDGE_RE)) {
    const src = Number(match[1]);
    const dst = Number(match[2]);
    nodes.add(src);
    nodes.add(dst);
    if (!adjacency[src]) adjacency[src] = [];
    if (!incoming[dst]) incoming[dst] = [];
    if (!adjacency[src].includes(dst)) adjacency[src].push(dst);
    if (!incoming[dst].includes(src)) incoming[dst].push(src);
  }

  for (const node of nodes) {
    if (!adjacency[node]) adjacency[node] = [];
    if (!incoming[node]) incoming[node] = [];
    adjacency[node].sort((a, b) => a - b);
    incoming[node].sort((a, b) => a - b);
  }

  const nodeIds = Array.from(nodes).sort((a, b) => a - b);
  const edgeCount = nodeIds.reduce((acc, id) => acc + adjacency[id].length, 0);

  return {
    source: "output/cot-story-graph.mmd",
    nodeCount: nodeIds.length,
    edgeCount,
    nodeIds,
    adjacency,
    incoming,
  };
}

function validate(pagesData, graphData) {
  const pageSet = new Set(pagesData.pageIds);
  const missingNodes = graphData.nodeIds.filter((id) => !pageSet.has(id));

  const missingTargets = [];
  for (const [srcRaw, targets] of Object.entries(graphData.adjacency)) {
    const src = Number(srcRaw);
    for (const target of targets) {
      if (!pageSet.has(target)) {
        missingTargets.push({ src, target });
      }
    }
  }

  return {
    missingNodes,
    missingTargets,
  };
}

function main() {
  if (!fs.existsSync(PAGES_DIR)) {
    throw new Error(`Missing pages directory: ${PAGES_DIR}`);
  }
  if (!fs.existsSync(GRAPH_PATH)) {
    throw new Error(`Missing graph file: ${GRAPH_PATH}`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const pagesData = buildPages();
  const graphData = buildGraph();
  const report = validate(pagesData, graphData);

  fs.writeFileSync(path.join(OUT_DIR, "pages.json"), JSON.stringify(pagesData, null, 2), "utf-8");
  fs.writeFileSync(path.join(OUT_DIR, "graph.json"), JSON.stringify(graphData, null, 2), "utf-8");
  fs.writeFileSync(path.join(OUT_DIR, "validation-report.json"), JSON.stringify(report, null, 2), "utf-8");

  console.log(`pages.json written with ${pagesData.pageCount} pages`);
  console.log(`graph.json written with ${graphData.nodeCount} nodes and ${graphData.edgeCount} edges`);
  console.log(`validation-report.json written`);
  if (report.missingNodes.length || report.missingTargets.length) {
    console.log("Validation warning: graph references pages missing from pages.json");
  } else {
    console.log("Validation OK: all graph nodes and targets map to pages");
  }
}

main();