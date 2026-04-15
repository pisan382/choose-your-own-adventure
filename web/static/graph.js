(function () {
  let cy = null;
  let graphData = null;
  let selectedPage = null;

  const API_BASE = '';

  async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }
    return res.json();
  }

  function buildElements(data) {
    const nodes = data.nodes.map(n => ({ data: { ...n } }));
    const edges = data.edges.map((e, i) => ({ data: { ...e, id: `e-${e.source}-->${e.target}-${i}` } }));
    return [...nodes, ...edges];
  }

  function getStylesheet() {
    return [
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'width': 'label',
          'height': 'label',
          'padding': '10px',
          'shape': 'roundrectangle',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': '12px',
          'font-family': 'Helvetica, Arial, sans-serif',
          'color': '#0f172a',
          'background-color': '#e2e8f0',
          'border-color': '#475569',
          'border-width': 1,
        }
      },
      {
        selector: 'node.main-trunk',
        style: {
          'background-color': '#dbeafe',
          'border-color': '#1d4ed8',
          'border-width': 2,
        }
      },
      {
        selector: 'node.terminal',
        style: {
          'background-color': '#fee2e2',
          'border-color': '#b91c1c',
          'border-width': 2,
        }
      },
      {
        selector: 'node.orphan',
        style: {
          'border-style': 'dashed',
          'border-width': 2,
        }
      },
      {
        selector: 'node.placeholder',
        style: {
          'background-opacity': 0.3,
          'border-style': 'dashed',
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#94a3b8',
          'target-arrow-color': '#94a3b8',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
        }
      },
      {
        selector: 'edge.selected',
        style: {
          'line-color': '#2563eb',
          'target-arrow-color': '#2563eb',
          'width': 3,
        }
      }
    ];
  }

  function computeMainTrunk(data) {
    const outgoingMap = {};
    data.edges.forEach(e => {
      if (!outgoingMap[e.source]) outgoingMap[e.source] = [];
      outgoingMap[e.source].push(e.target);
    });

    const trunk = new Set();
    let current = 'P2';
    while (current && !trunk.has(current)) {
      trunk.add(current);
      const outs = outgoingMap[current];
      if (!outs || outs.length === 0) break;
      const next = outs.slice().sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10))[0];
      current = next;
    }
    return trunk;
  }

  async function initGraph() {
    graphData = await fetchJSON(`${API_BASE}/api/graph`);
    const elems = buildElements(graphData);
    cy = cytoscape({
      container: document.getElementById('cy'),
      elements: elems,
      style: getStylesheet(),
      layout: { name: 'preset' },
      wheelSensitivity: 0.2,
    });

    const trunk = computeMainTrunk(graphData);

    graphData.nodes.forEach(n => {
      const node = cy.getElementById(n.id);
      if (trunk.has(n.id)) node.addClass('main-trunk');
      if (n.isEnding) node.addClass('terminal');
      const hasEdges = graphData.edges.some(e => e.source === n.id || e.target === n.id);
      if (n.hasText && !hasEdges) node.addClass('orphan');
      if (!n.hasText) node.addClass('placeholder');
    });

    let hasPos = false;
    graphData.nodes.forEach(n => {
      if (n.x != null && n.y != null) {
        const node = cy.getElementById(n.id);
        if (node.length) {
          node.position({ x: n.x, y: n.y });
          hasPos = true;
        }
      }
    });

    if (!hasPos) {
      runLayout();
    }

    cy.on('tap', 'node', evt => {
      const node = evt.target;
      if (selectedPage && evt.originalEvent && evt.originalEvent.shiftKey) {
        addEdge(selectedPage, parseInt(node.id().slice(1), 10));
      } else {
        selectNode(node);
      }
    });

    cy.on('dbltap', 'node', evt => {
      const page = parseInt(evt.target.id().slice(1), 10);
      window.open(`/reader.html#${page}`, '_blank');
    });

    cy.on('tap', 'edge', evt => {
      cy.edges().removeClass('selected');
      evt.target.addClass('selected');
    });

    cy.on('tap', evt => {
      if (evt.target === cy) {
        cy.edges().removeClass('selected');
        closePanel();
      }
    });

    // Expose for tests
    window.cy = cy;
    window.graphData = graphData;

    handleIncomingHash();
  }

  function handleIncomingHash() {
    const m = location.hash.match(/^#page=(\d+)$/);
    if (m && cy) {
      const node = cy.getElementById(`P${m[1]}`);
      if (node.length) {
        selectNode(node);
        cy.animate({ fit: { eles: node, padding: 80 }, duration: 300 });
      }
    }
  }

  function runLayout() {
    if (!cy) return;
    cy.layout({
      name: 'dagre',
      rankDir: 'LR',
      nodeSep: 40,
      edgeSep: 20,
      rankSep: 80,
      padding: 20,
      animate: true,
      animationDuration: 300,
    }).run();
  }

  async function savePositions() {
    if (!cy) return;
    const positions = {};
    cy.nodes().forEach(node => {
      const pos = node.position();
      positions[node.id().slice(1)] = { x: pos.x, y: pos.y };
    });
    await fetchJSON(`${API_BASE}/api/graph/layout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positions }),
    });
    showFeedback('Positions saved.', true);
  }

  function closePanel() {
    document.getElementById('side-panel').classList.add('hidden');
    document.getElementById('graph-hint').classList.remove('hidden');
    selectedPage = null;
  }

  async function selectNode(cyNode) {
    selectedPage = parseInt(cyNode.id().slice(1), 10);
    const panel = document.getElementById('side-panel');
    panel.classList.remove('hidden');
    document.getElementById('graph-hint').classList.add('hidden');

    document.getElementById('panel-page').textContent = selectedPage;

    let text = '';
    try {
      const pageData = await fetchJSON(`${API_BASE}/api/pages/${selectedPage}`);
      text = pageData.text;
    } catch (e) {
      text = '';
    }
    document.getElementById('panel-text').value = text;

    renderMMDEdges(selectedPage);
    refreshSuggestions(selectedPage);

    const nodeData = graphData.nodes.find(n => n.page === selectedPage) || {};
    document.getElementById('chk-ending').checked = !!nodeData.isEnding;
    document.getElementById('input-tags').value = (nodeData.tags || []).join(', ');
  }

  function renderMMDEdges(pageNum) {
    const sourceId = `P${pageNum}`;
    const edges = graphData.edges.filter(e => e.source === sourceId);
    const container = document.getElementById('panel-edges');
    container.innerHTML = '';
    if (edges.length === 0) {
      container.innerHTML = '<div style="font-size:12px;color:#64748b;">No outgoing edges.</div>';
      return;
    }
    edges.forEach(e => {
      const target = parseInt(e.target.slice(1), 10);
      const row = document.createElement('div');
      row.className = 'edge-row';
      row.innerHTML = `<a href="/reader.html#${target}" target="_blank">Page ${target}</a> <button data-target="${target}">Remove</button>`;
      row.querySelector('button').addEventListener('click', () => removeEdge(pageNum, target));
      container.appendChild(row);
    });
  }

  async function refreshSuggestions(pageNum) {
    const container = document.getElementById('panel-suggestions');
    container.innerHTML = '<div style="font-size:12px;color:#64748b;">Loading...</div>';
    try {
      const data = await fetchJSON(`${API_BASE}/api/pages/${pageNum}/suggestions`);
      container.innerHTML = '';
      if (data.matches && data.matches.length) {
        data.matches.forEach(m => {
          const row = document.createElement('div');
          row.className = 'suggestion-row';
          const already = graphData.edges.some(e => e.source === `P${pageNum}` && e.target === `P${m.page}`);
          row.innerHTML = `<code>${escapeHtml(m.match)}</code> <span>→ Page ${m.page}</span>`;
          if (!already) {
            const btn = document.createElement('button');
            btn.textContent = 'Add Edge';
            btn.addEventListener('click', () => addEdge(pageNum, m.page));
            row.appendChild(btn);
          } else {
            const span = document.createElement('span');
            span.textContent = '✓';
            span.style.color = '#16a34a';
            row.appendChild(span);
          }
          container.appendChild(row);
        });
      } else {
        container.innerHTML = '<div style="font-size:12px;color:#64748b;">No parser suggestions.</div>';
      }
    } catch (e) {
      container.innerHTML = '<div style="font-size:12px;color:#ef4444;">Error loading suggestions.</div>';
    }
  }

  function escapeHtml(str) {
    return str.replace(/[&<"']/g, m => ({ '&': '&amp;', '<': '&lt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  async function saveText() {
    if (!selectedPage) return;
    const text = document.getElementById('panel-text').value;
    await fetchJSON(`${API_BASE}/api/pages/${selectedPage}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ text }),
    });
    showFeedback('Text saved.', true);
    graphData = await fetchJSON(`${API_BASE}/api/graph`);
    await refreshSuggestions(selectedPage);
  }

  async function saveMeta() {
    if (!selectedPage) return;
    const isEnding = document.getElementById('chk-ending').checked;
    const tags = document.getElementById('input-tags').value.split(',').map(s => s.trim()).filter(Boolean);
    await fetchJSON(`${API_BASE}/api/pages/${selectedPage}/meta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnding, tags }),
    });
    const node = cy.getElementById(`P${selectedPage}`);
    node.toggleClass('terminal', isEnding);
    showFeedback('Meta saved.', true);
  }

  async function addEdge(source, target) {
    await fetchJSON(`${API_BASE}/api/graph/edges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, target }),
    });
    graphData = await fetchJSON(`${API_BASE}/api/graph`);
    const exists = cy.edges().some(e => e.data('source') === `P${source}` && e.data('target') === `P${target}`);
    if (!exists) {
      const i = cy.edges().length;
      cy.add({ data: { id: `e-P${source}-->P${target}-${i}`, source: `P${source}`, target: `P${target}` } });
    }
    const srcNode = cy.getElementById(`P${source}`);
    srcNode.removeClass('orphan');
    const tgtNode = cy.getElementById(`P${target}`);
    tgtNode.removeClass('placeholder');
    if (selectedPage === source) {
      renderMMDEdges(source);
      refreshSuggestions(source);
    }
    showFeedback(`Edge to page ${target} added.`, true);
  }

  async function removeEdge(source, target) {
    await fetchJSON(`${API_BASE}/api/graph/edges`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, target }),
    });
    const edge = cy.edges().filter(e => e.data('source') === `P${source}` && e.data('target') === `P${target}`).first();
    if (edge.length) edge.remove();
    graphData = await fetchJSON(`${API_BASE}/api/graph`);
    if (selectedPage === source) {
      renderMMDEdges(source);
      const hasEdges = graphData.edges.some(e => e.source === `P${source}` || e.target === `P${source}`);
      const n = graphData.nodes.find(node => node.page === source);
      if (n && n.hasText && !hasEdges) cy.getElementById(`P${source}`).addClass('orphan');
    }
  }

  async function addNode() {
    const pageStr = prompt('Enter new page number:');
    if (!pageStr) return;
    const page = parseInt(pageStr, 10);
    if (isNaN(page)) return;
    await fetchJSON(`${API_BASE}/api/graph/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page }),
    });
    graphData = await fetchJSON(`${API_BASE}/api/graph`);
    if (!cy.getElementById(`P${page}`).length) {
      cy.add({ data: { id: `P${page}`, label: String(page), page: page, hasText: false } });
      cy.getElementById(`P${page}`).addClass('placeholder');
    }
    showFeedback(`Node ${page} added.`, true);
  }

  async function rebuild(confirm = false) {
    const data = await fetchJSON(`${API_BASE}/api/graph/rebuild`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm }),
    });
    if (!confirm) {
      showRebuildModal(data.delta);
    } else {
      hideModal('rebuild-modal');
      cy.elements().remove();
      graphData = await fetchJSON(`${API_BASE}/api/graph`);
      cy.add(buildElements(graphData));
      const trunk = computeMainTrunk(graphData);
      graphData.nodes.forEach(n => {
        const node = cy.getElementById(n.id);
        if (trunk.has(n.id)) node.addClass('main-trunk');
        if (n.isEnding) node.addClass('terminal');
        const hasEdges = graphData.edges.some(e => e.source === n.id || e.target === n.id);
        if (n.hasText && !hasEdges) node.addClass('orphan');
        if (!n.hasText) node.addClass('placeholder');
      });
      runLayout();
      showFeedback('Graph rebuilt from text.', true);
    }
  }

  function showRebuildModal(delta) {
    const modal = document.getElementById('rebuild-modal');
    const body = document.getElementById('rebuild-body');
    let html = '';
    html += `<p><strong>New edges:</strong> ${delta.suggested_new_edges.length}</p>`;
    html += `<p><strong>Orphan edges:</strong> ${delta.orphan_edges.length}</p>`;
    html += `<p><strong>Terminals:</strong> ${delta.terminals.length}</p>`;
    html += `<p><strong>Broken links:</strong> ${delta.broken_links.length}</p>`;
    body.innerHTML = html;
    modal.classList.remove('hidden');
  }

  async function doExport() {
    const data = await fetchJSON(`${API_BASE}/api/export`, { method: 'POST' });
    showFeedback(`Exported to ${data.dist}.`, true);
  }

  function showFeedback(msg, autoClear = false) {
    const el = document.getElementById('save-feedback');
    el.textContent = msg;
    if (autoClear) setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 3000);
  }

  function hideModal(id) {
    document.getElementById(id).classList.add('hidden');
  }

  const cyContainer = document.getElementById('cy');
  const uploadOverlay = document.getElementById('upload-overlay');

  ['dragenter', 'dragover'].forEach(evt => {
    cyContainer.addEventListener(evt, e => {
      e.preventDefault();
      uploadOverlay.classList.add('active');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    cyContainer.addEventListener(evt, e => {
      e.preventDefault();
      uploadOverlay.classList.remove('active');
    });
  });

  cyContainer.addEventListener('drop', async e => {
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('-CoT.txt'));
    if (!files.length) return;
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const res = await fetch(`${API_BASE}/api/import`, { method: 'POST', body: formData });
    const json = await res.json();
    showImportModal(json);
  });

  function showImportModal(data) {
    const modal = document.getElementById('import-modal');
    const body = document.getElementById('import-body');
    let html = `<p>Saved: ${data.saved.join(', ') || 'none'}</p>`;
    const d = data.delta;
    html += `<p><strong>Suggested new edges:</strong> ${d.suggested_new_edges.length}</p>`;
    if (d.suggested_new_edges.length) {
      html += '<ul>';
      d.suggested_new_edges.forEach(e => {
        html += `<li>Page ${e.source} → Page ${e.target} <button class="btn-apply-suggest" data-src="${e.source}" data-dst="${e.target}">Add Edge</button></li>`;
      });
      html += '</ul>';
    }
    html += `<p><strong>Broken links:</strong> ${d.broken_links.length}</p>`;
    body.innerHTML = html;
    modal.classList.remove('hidden');

    body.querySelectorAll('.btn-apply-suggest').forEach(btn => {
      btn.addEventListener('click', async () => {
        const src = parseInt(btn.dataset.src, 10);
        const dst = parseInt(btn.dataset.dst, 10);
        await addEdge(src, dst);
        btn.disabled = true;
        btn.textContent = 'Added';
      });
    });
  }

  document.getElementById('btn-layout').addEventListener('click', runLayout);
  document.getElementById('btn-save-pos').addEventListener('click', savePositions);
  document.getElementById('btn-add-node').addEventListener('click', addNode);
  document.getElementById('btn-rebuild').addEventListener('click', () => rebuild(false));
  document.getElementById('btn-export').addEventListener('click', doExport);

  document.getElementById('panel-close').addEventListener('click', closePanel);
  document.getElementById('btn-clear-selection').addEventListener('click', (e) => {
    e.preventDefault();
    closePanel();
  });
  document.getElementById('btn-save-text').addEventListener('click', saveText);
  document.getElementById('btn-save-meta').addEventListener('click', saveMeta);
  document.getElementById('btn-add-edge').addEventListener('click', () => {
    const target = parseInt(document.getElementById('new-edge-target').value, 10);
    if (!selectedPage || isNaN(target)) return;
    addEdge(selectedPage, target);
    document.getElementById('new-edge-target').value = '';
  });

  document.getElementById('jump-to-page').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const page = parseInt(e.target.value, 10);
      if (isNaN(page)) return;
      const nodeId = `P${page}`;
      let node = cy.getElementById(nodeId);
      if (!node.length) {
        // create placeholder visually if not present
        cy.add({ data: { id: nodeId, label: String(page), page: page, hasText: false } });
        node = cy.getElementById(nodeId);
        node.addClass('placeholder');
      }
      selectNode(node);
      cy.animate({ fit: { eles: node, padding: 80 }, duration: 300 });
      e.target.value = '';
    }
  });

  document.querySelector('#import-modal .modal-close').addEventListener('click', () => hideModal('import-modal'));
  document.getElementById('btn-rebuild-cancel').addEventListener('click', () => hideModal('rebuild-modal'));
  document.getElementById('btn-rebuild-confirm').addEventListener('click', () => rebuild(true));

  initGraph().catch(err => {
    console.error('Failed to init graph', err);
    alert('Failed to load graph. See console for details.');
  });
})();
