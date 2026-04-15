(async function () {
  try {
    const res = await fetch('/api/paths');
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();

    const stats = document.getElementById('stats');
    stats.textContent = `Total paths: ${data.paths.length}`;

    const list = document.getElementById('paths-list');
    if (data.paths.length === 0) {
      list.innerHTML = '<div class="path-row">No paths found.</div>';
      return;
    }

    data.paths.forEach((path) => {
      const row = document.createElement('div');
      row.className = 'path-row';
      const linksHtml = path.map((p, i) => {
        if (i === path.length - 1) {
          return `<strong>${p}</strong>`;
        }
        return `<a href="/reader.html#${p}" target="_blank">${p}</a>`;
      }).join(' → ');
      row.innerHTML = linksHtml;
      row.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') return;
        window.open(`/reader.html#${path[0]}`, '_blank');
      });
      list.appendChild(row);
    });
  } catch (err) {
    document.getElementById('stats').textContent = 'Error loading paths.';
    console.error(err);
  }
})();
