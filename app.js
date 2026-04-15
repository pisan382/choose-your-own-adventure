/**
 * app.js — Cave of Time story reader
 *
 * Loads data/story.json, then lets the user click through the branching story.
 * Tracks history, visited pages, and endings found.
 */

(function () {
  "use strict";

  // ── State ───────────────────────────────────────────────────────────────
  let storyData = null;      // full parsed story.json
  let currentPage = null;    // current page number (integer)
  let history = [];          // [{page, choiceLabel}] ordered list
  let visitedEndings = new Set();

  // ── DOM refs ────────────────────────────────────────────────────────────
  const $loading        = document.getElementById("loading");
  const $storyPage      = document.getElementById("story-page");
  const $pageLabel      = document.getElementById("page-label");
  const $pageText       = document.getElementById("page-text");
  const $choices        = document.getElementById("choices");
  const $endingScreen   = document.getElementById("ending-screen");
  const $endingText     = document.getElementById("ending-text");
  const $endingsCount   = document.getElementById("endings-count");
  const $endingsBadge   = document.getElementById("endings-found");
  const $errorState     = document.getElementById("error-state");
  const $errorMsg       = document.getElementById("error-msg");
  const $historyPanel   = document.getElementById("history-panel");
  const $historyList    = document.getElementById("history-list");

  // ── Boot ────────────────────────────────────────────────────────────────
  async function init() {
    try {
      const resp = await fetch("data/story.json");
      if (!resp.ok) throw new Error(`Could not load story data (${resp.status})`);
      storyData = await resp.json();
      // Keys in JSON may be strings; normalise to integer map
      const raw = storyData.pages;
      storyData.pages = {};
      for (const k of Object.keys(raw)) {
        storyData.pages[parseInt(k, 10)] = raw[k];
      }
      goToPage(storyData.start_page);
    } catch (err) {
      showError(err.message);
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────────
  function goToPage(pageNum, choiceLabel) {
    const page = storyData.pages[pageNum];
    if (!page) {
      showError(`Page ${pageNum} not found in story data.`);
      return;
    }

    // Record history entry
    history.push({ page: pageNum, choiceLabel: choiceLabel || null });
    currentPage = pageNum;

    if (page.is_ending) {
      visitedEndings.add(pageNum);
      renderEnding(page);
    } else {
      renderPage(page);
    }

    updateEndingsBadge();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (history.length <= 1) return;
    history.pop(); // remove current
    const prev = history.pop(); // remove previous (will be re-added by goToPage)
    goToPage(prev.page, prev.choiceLabel);
  }

  function restart() {
    history = [];
    goToPage(storyData.start_page);
    hideHistoryPanel();
  }

  // ── Render: story page ──────────────────────────────────────────────────
  function renderPage(page) {
    hide($endingScreen);
    hide($loading);
    show($storyPage);

    $pageLabel.textContent = `Page ${page.page}`;
    $pageText.textContent = page.text;
    $choices.innerHTML = "";

    if (page.choices && page.choices.length > 0) {
      for (const choice of page.choices) {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.textContent = choice.label;
        btn.addEventListener("click", () => goToPage(choice.target, choice.label));
        $choices.appendChild(btn);
      }
    } else {
      // Sequential continuation — find next numbered page
      const nextPage = page.page + 1;
      if (storyData.pages[nextPage]) {
        const btn = document.createElement("button");
        btn.className = "choice-btn continue-btn";
        btn.textContent = "Continue…";
        btn.addEventListener("click", () => goToPage(nextPage, "Continue"));
        $choices.appendChild(btn);
      }
    }

    // Back button (if not on start page)
    if (history.length > 1) {
      const backBtn = document.createElement("button");
      backBtn.className = "btn btn-secondary";
      backBtn.style.marginTop = "1.25rem";
      backBtn.textContent = "← Back";
      backBtn.addEventListener("click", goBack);
      $choices.appendChild(backBtn);
    }
  }

  // ── Render: ending ──────────────────────────────────────────────────────
  function renderEnding(page) {
    hide($storyPage);
    hide($loading);
    show($endingScreen);

    $endingText.textContent = page.text;

    const total = countEndings();
    $endingsCount.textContent =
      `You've found ${visitedEndings.size} of ${total} possible ending${total !== 1 ? "s" : ""}.`;
  }

  // ── Endings badge ────────────────────────────────────────────────────────
  function updateEndingsBadge() {
    const total = countEndings();
    if (visitedEndings.size > 0) {
      $endingsBadge.textContent = `${visitedEndings.size}/${total} endings`;
      show($endingsBadge);
    }
  }

  function countEndings() {
    return Object.values(storyData.pages).filter(p => p.is_ending).length;
  }

  // ── History panel ────────────────────────────────────────────────────────
  function renderHistoryPanel() {
    $historyList.innerHTML = "";
    history.forEach((entry, idx) => {
      const li = document.createElement("li");
      if (idx === history.length - 1) li.classList.add("current");
      const pageSpan = document.createElement("span");
      pageSpan.className = "h-page";
      pageSpan.textContent = `Page ${entry.page}`;
      li.appendChild(pageSpan);
      if (entry.choiceLabel && entry.choiceLabel !== "Continue") {
        const choiceSpan = document.createElement("span");
        choiceSpan.className = "h-choice";
        choiceSpan.textContent = entry.choiceLabel;
        li.appendChild(choiceSpan);
      }
      $historyList.appendChild(li);
    });
  }

  function showHistoryPanel() {
    renderHistoryPanel();
    show($historyPanel);
  }

  function hideHistoryPanel() {
    hide($historyPanel);
  }

  // ── Error ────────────────────────────────────────────────────────────────
  function showError(msg) {
    hide($loading);
    $errorMsg.textContent = `Error: ${msg}`;
    show($errorState);
  }

  // ── Utilities ────────────────────────────────────────────────────────────
  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }

  // ── Event listeners ──────────────────────────────────────────────────────
  document.getElementById("btn-restart").addEventListener("click", restart);
  document.getElementById("btn-history").addEventListener("click", () => {
    $historyPanel.classList.contains("hidden") ? showHistoryPanel() : hideHistoryPanel();
  });
  document.getElementById("btn-close-history").addEventListener("click", hideHistoryPanel);
  document.getElementById("btn-end-restart").addEventListener("click", restart);
  document.getElementById("btn-end-back").addEventListener("click", goBack);

  // Close history panel when clicking outside of it
  document.addEventListener("click", (e) => {
    if (
      !$historyPanel.classList.contains("hidden") &&
      !$historyPanel.contains(e.target) &&
      e.target !== document.getElementById("btn-history")
    ) {
      hideHistoryPanel();
    }
  });

  // ── Start ────────────────────────────────────────────────────────────────
  init();
})();
