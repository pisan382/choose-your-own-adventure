const { useEffect, useMemo, useState } = React;

const AUTHORED_STORAGE_KEY = "cya.authoredStory.v1";

function choiceLabel(fromPage, toPage, pagesData) {
  const page = pagesData.pages[fromPage];
  if (!page || !Array.isArray(page.choices)) {
    return `Go to page ${toPage}`;
  }
  const match = page.choices.find((c) => Number(c.target) === Number(toPage));
  return match ? `${match.label} (page ${toPage})` : `Go to page ${toPage}`;
}

function ReaderApp() {
  const [pagesData, setPagesData] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [currentPage, setCurrentPage] = useState(2);
  const [path, setPath] = useState([2]);
  const [error, setError] = useState("");
  const [sourceLabel, setSourceLabel] = useState("web/data");

  useEffect(() => {
    const localRaw = localStorage.getItem(AUTHORED_STORAGE_KEY);
    if (localRaw) {
      try {
        const localDraft = JSON.parse(localRaw);
        if (localDraft?.pages && localDraft?.graph) {
          const localIds = Object.keys(localDraft.pages).map(Number).sort((a, b) => a - b);
          const normalizedPages = {
            source: "localStorage",
            pageCount: localIds.length,
            pageIds: localIds,
            pages: localDraft.pages,
          };
          setPagesData(normalizedPages);
          setGraphData(localDraft.graph);
          const start = normalizedPages.pages[2] ? 2 : normalizedPages.pageIds[0];
          setCurrentPage(start);
          setPath([start]);
          setSourceLabel("local draft");
          return;
        }
      } catch {
        localStorage.removeItem(AUTHORED_STORAGE_KEY);
      }
    }

    Promise.all([fetch("../data/pages.json").then((r) => r.json()), fetch("../data/graph.json").then((r) => r.json())])
      .then(([pages, graph]) => {
        setPagesData(pages);
        setGraphData(graph);
        const start = pages.pages[2] ? 2 : pages.pageIds[0];
        setCurrentPage(start);
        setPath([start]);
        setSourceLabel("web/data");
      })
      .catch(() => {
        setError("Could not load story data. Rebuild web/data or clear invalid local draft.");
      });
  }, []);

  const outgoing = useMemo(() => {
    if (!graphData) return [];
    return graphData.adjacency[currentPage] || [];
  }, [graphData, currentPage]);

  const currentText = useMemo(() => {
    if (!pagesData) return "Loading...";
    const page = pagesData.pages[currentPage];
    return page ? page.text : `Page ${currentPage} is missing.`;
  }, [pagesData, currentPage]);

  function choose(nextPage) {
    setCurrentPage(nextPage);
    setPath((prev) => [...prev, nextPage]);
  }

  function restart() {
    const start = pagesData?.pages?.[2] ? 2 : pagesData.pageIds[0];
    setCurrentPage(start);
    setPath([start]);
  }

  function stepBack() {
    if (path.length <= 1) return;
    const nextPath = path.slice(0, -1);
    setPath(nextPath);
    setCurrentPage(nextPath[nextPath.length - 1]);
  }

  if (error) {
    return <div className="reader-layout"><div className="panel story-panel"><div className="error">{error}</div></div></div>;
  }

  return (
    <main className="reader-layout">
      <section className="panel story-panel">
        <div className="meta-row">
          <h1>The Cave of Time Reader</h1>
          <div className="badge-wrap">
            <span className="badge">Page {currentPage}</span>
            <span className="source-badge">Source: {sourceLabel}</span>
          </div>
        </div>
        <div className="story-text">{currentText}</div>
      </section>

      <aside className="panel controls-panel">
        <h2>Choices</h2>
        {outgoing.length === 0 ? (
          <p>This path ends here.</p>
        ) : (
          <div className="choice-list">
            {outgoing.map((target) => (
              <button key={`${currentPage}-${target}`} className="choice-btn" onClick={() => choose(target)}>
                {choiceLabel(currentPage, target, pagesData)}
              </button>
            ))}
          </div>
        )}

        <div className="actions">
          <button className="btn" onClick={restart}>Restart</button>
          <button className="btn" onClick={stepBack} disabled={path.length <= 1}>Back One Choice</button>
        </div>

        <div className="path">
          <strong>Path so far:</strong>
          <div>{path.join(" -> ")}</div>
        </div>
      </aside>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<ReaderApp />);