const STORAGE_KEY = "kanban-board:v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function createDefaultState() {
  return {
    columns: [
      { id: crypto.randomUUID(), title: "To do", cards: [] },
      { id: crypto.randomUUID(), title: "In progress", cards: [] },
      { id: crypto.randomUUID(), title: "Done", cards: [] },
    ],
    floatingCards: [],
  };
}

function serialize(boardEl, floatingTasksEl) {
  const columns = Array.from(boardEl.querySelectorAll(".column"));
  const floatingCards = Array.from(floatingTasksEl.querySelectorAll(".floating-card"));
  return {
    columns: columns.map((col) => ({
      id: col.dataset.id,
      title: col.querySelector(".column-title").value.trim() || "Untitled",
      cards: Array.from(col.querySelectorAll(".card-text")).map((ta) => ({
        id: ta.closest(".card").dataset.id,
        text: ta.value,
      })),
    })),
    floatingCards: floatingCards.map((fc) => ({
      id: fc.dataset.id,
      text: fc.querySelector(".floating-card-text").value,
    })),
  };
}

function buildColumn(column, templates, boardEl) {
  const frag = templates.column.content.cloneNode(true);
  const el = frag.querySelector(".column");
  el.dataset.id = column.id;
  wireColumnDrag(el, boardEl);

  const titleInput = el.querySelector(".column-title");
  titleInput.value = column.title;

  const cardsContainer = el.querySelector(".column-cards");
  const addCardBtn = el.querySelector(".add-card");
  const deleteBtn = el.querySelector(".delete-column");

  // Cards
  for (const card of column.cards) {
    const cardFrag = templates.card.content.cloneNode(true);
    const cardEl = cardFrag.querySelector(".card");
    const textarea = cardFrag.querySelector(".card-text");
    cardEl.dataset.id = card.id;
    textarea.value = card.text;
    wireCardDrag(cardEl, boardEl, document.getElementById("floating-tasks"));
    const deleteBtn = cardFrag.querySelector(".delete-card");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        cardEl.remove();
        saveState(serialize(boardEl, document.getElementById("floating-tasks")));
      });
    }
    cardsContainer.appendChild(cardFrag);
  }

  addCardBtn.addEventListener("click", () => {
    const cardFrag = templates.card.content.cloneNode(true);
    const cardEl = cardFrag.querySelector(".card");
    const textarea = cardFrag.querySelector(".card-text");
    cardEl.dataset.id = crypto.randomUUID();
    wireCardDrag(cardEl, boardEl, document.getElementById("floating-tasks"));
    const deleteBtn = cardFrag.querySelector(".delete-card");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        cardEl.remove();
        saveState(serialize(boardEl, document.getElementById("floating-tasks")));
      });
    }
    cardsContainer.appendChild(cardFrag);
    textarea.focus();
    saveState(serialize(boardEl, document.getElementById("floating-tasks")));
  });

  deleteBtn.addEventListener("click", () => {
    const colId = el.dataset.id;
    const index = state.columns.findIndex((c) => c.id === colId);
    if (index !== -1) {
      state.columns.splice(index, 1);
    }
    // Re-render board from updated state
    renderBoard(state, boardEl, {
      column: document.getElementById("column-template"),
      card: document.getElementById("card-template"),
      floatingCard: document.getElementById("floating-card-template"),
    });
    saveState(serialize(boardEl, document.getElementById("floating-tasks")));
  });

  titleInput.addEventListener("change", () => {
    saveState(serialize(boardEl, document.getElementById("floating-tasks")));
  });

  // Drop target behaviour
  el.addEventListener("dragover", (event) => {
    event.preventDefault();
    el.classList.add("drop-target");
  });

  el.addEventListener("dragleave", () => {
    el.classList.remove("drop-target");
  });

  el.addEventListener("drop", (event) => {
    event.preventDefault();
    el.classList.remove("drop-target");
    const cardId = event.dataTransfer.getData("text/plain");
    const floatingTasksEl = document.getElementById("floating-tasks");
    const floatingCard = floatingTasksEl.querySelector(`.floating-card[data-id="${cardId}"]`);
    const existingCard = boardEl.querySelector(`.card[data-id="${cardId}"]`);
    if (floatingCard) {
      const cardText = floatingCard.querySelector(".floating-card-text").value;
      const idx = state.floatingCards.findIndex(fc => fc.id === cardId);
      if (idx !== -1) state.floatingCards.splice(idx, 1);
      renderFloatingTasks(state.floatingCards, floatingTasksEl, document.getElementById("board").querySelectorAll("template").length ? {} : {}, boardEl);
      const newCardObj = { id: crypto.randomUUID(), text: cardText };
      const colIdx = state.columns.findIndex(c => c.id === el.dataset.id);
      if (colIdx !== -1) state.columns[colIdx].cards.push(newCardObj);
      renderBoard(state, boardEl, { column: document.getElementById("column-template"), card: document.getElementById("card-template"), floatingCard: document.getElementById("floating-card-template") });
      saveState(serialize(boardEl, floatingTasksEl));
    } else if (existingCard) {
      // Move card between columns in state, then re-render
      const srcColIndex = state.columns.findIndex((c) => c.cards.some((card) => card.id === cardId));
      if (srcColIndex === -1) return;
      const srcCol = state.columns[srcColIndex];
      const cardIndex = srcCol.cards.findIndex((card) => card.id === cardId);
      if (cardIndex === -1) return;
      const [movedCard] = srcCol.cards.splice(cardIndex, 1);

      const destColIndex = state.columns.findIndex((c) => c.id === el.dataset.id);
      if (destColIndex === -1) return;
      state.columns[destColIndex].cards.push(movedCard);

      renderBoard(state, boardEl, {
        column: document.getElementById("column-template"),
        card: document.getElementById("card-template"),
        floatingCard: document.getElementById("floating-card-template"),
      });
      renderFloatingTasks(state.floatingCards, floatingTasksEl, {
        column: document.getElementById("column-template"),
        card: document.getElementById("card-template"),
        floatingCard: document.getElementById("floating-card-template"),
      }, boardEl);
      saveState(serialize(boardEl, floatingTasksEl));
    }
  });

  return el;
}

function wireColumnDrag(columnEl, boardEl) {
  let isPointerDown = false;
  let lastX = 0;
  let originRect = null;
  let dragStartIndex = -1;

  columnEl.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const dragHandle = columnEl.querySelector(".drag-handle");
    if (event.target.closest("button, input, textarea")) return;
    if (!dragHandle.contains(event.target)) return;

    isPointerDown = true;
    lastX = event.clientX;
    originRect = columnEl.getBoundingClientRect();
    dragStartIndex = state.columns.findIndex((c) => c.id === columnEl.dataset.id);
    if (dragStartIndex === -1) return;

    columnEl.classList.add("dragging");
    columnEl.style.position = "fixed";
    columnEl.style.width = originRect.width + "px";
    columnEl.style.left = originRect.left + "px";
    columnEl.style.top = originRect.top + "px";
    columnEl.style.zIndex = "25";

    columnEl.setPointerCapture(event.pointerId);
  });

  columnEl.addEventListener("pointermove", (event) => {
    if (!isPointerDown) return;

    const dx = event.clientX - lastX;
    lastX = event.clientX;

    const currentLeft = parseFloat(columnEl.style.left);
    columnEl.style.left = currentLeft + dx + "px";

    // Update drop indicator
    const allColumns = Array.from(boardEl.querySelectorAll(".column"));
    const draggedRect = columnEl.getBoundingClientRect();
    const dragCenterX = draggedRect.left + draggedRect.width / 2;

    let targetIndex = dragStartIndex;
    for (let i = 0; i < allColumns.length; i++) {
      const col = allColumns[i];
      if (col === columnEl) continue;
      const rect = col.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      if (dragCenterX < centerX) {
        targetIndex = i;
        break;
      }
    }

    // Show drop indicator line
    const indicator = document.getElementById("drop-indicator");
    indicator.classList.add("active");

    if (targetIndex >= allColumns.length) {
      // Dragging past the last column - show indicator at the end
      const lastCol = allColumns[allColumns.length - 1];
      const rect = lastCol.getBoundingClientRect();
      indicator.style.left = rect.right + "px";
      indicator.style.top = rect.top + "px";
    } else {
      // Show indicator before the target column
      const targetCol = allColumns[targetIndex];
      const rect = targetCol.getBoundingClientRect();
      indicator.style.left = rect.left + "px";
      indicator.style.top = rect.top + "px";
    }
  });

  function finishPointerDrag(event) {
    if (!isPointerDown) return;
    isPointerDown = false;
    columnEl.classList.remove("dragging");

    // Find target column based on current position
    const allColumns = Array.from(boardEl.querySelectorAll(".column"));
    const draggedRect = columnEl.getBoundingClientRect();
    const dragCenterX = draggedRect.left + draggedRect.width / 2;

    let targetIndex = dragStartIndex;
    for (let i = 0; i < allColumns.length; i++) {
      const col = allColumns[i];
      const colId = col.dataset.id;
      const stateIndex = state.columns.findIndex((c) => c.id === colId);
      const rect = col.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      if (dragCenterX < centerX) {
        targetIndex = stateIndex;
        break;
      }
    }

    // Clear hover hints and indicator
    allColumns.forEach((c) => c.classList.remove("drop-target"));
    const indicator = document.getElementById("drop-indicator");
    indicator.classList.remove("active");

    // Reset styles before re-render
    columnEl.style.position = "";
    columnEl.style.left = "";
    columnEl.style.top = "";
    columnEl.style.width = "";
    columnEl.style.zIndex = "";

    // Reorder in state if needed
    if (targetIndex !== dragStartIndex && targetIndex !== -1) {
      const [moved] = state.columns.splice(dragStartIndex, 1);
      state.columns.splice(targetIndex, 0, moved);
    }

    const templates = {
      column: document.getElementById("column-template"),
      card: document.getElementById("card-template"),
      floatingCard: document.getElementById("floating-card-template"),
    };
    renderBoard(state, boardEl, templates);
    renderFloatingTasks(state.floatingCards, document.getElementById("floating-tasks"), templates, boardEl);
    saveState(serialize(boardEl, document.getElementById("floating-tasks")));
  }

  columnEl.addEventListener("pointerup", (event) => {
    finishPointerDrag(event);
    columnEl.releasePointerCapture(event.pointerId);
  });

  columnEl.addEventListener("pointercancel", (event) => {
    finishPointerDrag(event);
    columnEl.releasePointerCapture(event.pointerId);
  });
}

function wireCardDrag(cardEl, boardEl, floatingTasksEl) {
  const textarea = cardEl.querySelector(".card-text");
  let isPointerDown = false;
  let lastX = 0;
  let lastY = 0;
  let originRect = null;

  cardEl.addEventListener("pointerdown", (event) => {
    // Only left button / primary pointer
    if (event.button !== 0) return;
    isPointerDown = true;
    lastX = event.clientX;
    lastY = event.clientY;
    cardEl.classList.add("dragging");

    // Capture original position to switch to fixed positioning
    originRect = cardEl.getBoundingClientRect();
    cardEl.style.position = "fixed";
    cardEl.style.width = originRect.width + "px";
    cardEl.style.left = originRect.left + "px";
    cardEl.style.top = originRect.top + "px";
    cardEl.style.zIndex = "30";

    cardEl.setPointerCapture(event.pointerId);
  });

  cardEl.addEventListener("pointermove", (event) => {
    if (!isPointerDown) return;

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;

    const currentLeft = parseFloat(cardEl.style.left || originRect.left);
    const currentTop = parseFloat(cardEl.style.top || originRect.top);
    cardEl.style.left = currentLeft + dx + "px";
    cardEl.style.top = currentTop + dy + "px";

    // Visual feedback for trash and columns
    const elements = document.elementsFromPoint(event.clientX, event.clientY);
    const overTrash = elements.some((el) => el.id === "trash-can");
    const trashEl = document.getElementById("trash-can");
    if (trashEl) {
      if (overTrash) {
        trashEl.classList.add("trash-hover");
        cardEl.classList.add("trash-hover");
      } else {
        trashEl.classList.remove("trash-hover");
        cardEl.classList.remove("trash-hover");
      }
    }

    document.querySelectorAll(".column.column-hover").forEach((col) => col.classList.remove("column-hover"));
    const columnEl = elements.find((el) => el.classList && el.classList.contains("column"));
    if (columnEl) {
      columnEl.classList.add("column-hover");
    }
  });

  function finishPointerDrag(event) {
    if (!isPointerDown) return;
    isPointerDown = false;
    cardEl.classList.remove("dragging");
    cardEl.classList.remove("trash-hover");
    const trashElDom = document.getElementById("trash-can");
    if (trashElDom) trashElDom.classList.remove("trash-hover");
    document.querySelectorAll(".column.column-hover").forEach((col) => col.classList.remove("column-hover"));

    const cardId = cardEl.dataset.id;
    const elements = document.elementsFromPoint(event.clientX, event.clientY);
    const overTrash = elements.some((el) => el.id === "trash-can");
    const columnEl = elements.find((el) => el.classList && el.classList.contains("column"));

    // Reset inline positioning styles; we'll re-render from state
    cardEl.style.position = "";
    cardEl.style.left = "";
    cardEl.style.top = "";
    cardEl.style.width = "";
    cardEl.style.zIndex = "";

    // Find the column and card in state.
    const colIndex = state.columns.findIndex((col) => col.cards.some((c) => c.id === cardId));
    if (colIndex === -1) return;
    const col = state.columns[colIndex];
    const idx = col.cards.findIndex((c) => c.id === cardId);
    if (idx === -1) return;
    const cardState = col.cards[idx];

    // If dropped over trash, delete from column.
    if (overTrash) {
      col.cards.splice(idx, 1);
      renderBoard(state, boardEl, {
        column: document.getElementById("column-template"),
        card: document.getElementById("card-template"),
        floatingCard: document.getElementById("floating-card-template"),
      });
      renderFloatingTasks(state.floatingCards, floatingTasksEl, {
        column: document.getElementById("column-template"),
        card: document.getElementById("card-template"),
        floatingCard: document.getElementById("floating-card-template"),
      }, boardEl);
      saveState(serialize(boardEl, floatingTasksEl));
      return;
    }

    // If dropped over a column, move there.
    if (columnEl) {
      const destColId = columnEl.dataset.id;
      const destIndex = state.columns.findIndex((c) => c.id === destColId);
      if (destIndex !== -1) {
        // Remove from source and push to dest
        col.cards.splice(idx, 1);
        state.columns[destIndex].cards.push(cardState);

        renderBoard(state, boardEl, {
          column: document.getElementById("column-template"),
          card: document.getElementById("card-template"),
          floatingCard: document.getElementById("floating-card-template"),
        });
        renderFloatingTasks(state.floatingCards, floatingTasksEl, {
          column: document.getElementById("column-template"),
          card: document.getElementById("card-template"),
          floatingCard: document.getElementById("floating-card-template"),
        }, boardEl);
        saveState(serialize(boardEl, floatingTasksEl));
        return;
      }
    }

    // Otherwise, unassign: remove from column and create a floating paper starting here.
    col.cards.splice(idx, 1);
    const { wx, wy } = worldFromScreen(event.clientX, event.clientY);
    state.floatingCards.push({ id: cardState.id, text: cardState.text, spawnX: wx, spawnY: wy });

    renderBoard(state, boardEl, {
      column: document.getElementById("column-template"),
      card: document.getElementById("card-template"),
      floatingCard: document.getElementById("floating-card-template"),
    });
    renderFloatingTasks(state.floatingCards, floatingTasksEl, {
      column: document.getElementById("column-template"),
      card: document.getElementById("card-template"),
      floatingCard: document.getElementById("floating-card-template"),
    }, boardEl);
    saveState(serialize(boardEl, floatingTasksEl));
  }

  cardEl.addEventListener("pointerup", (event) => {
    finishPointerDrag(event);
    cardEl.releasePointerCapture(event.pointerId);
  });

  cardEl.addEventListener("pointercancel", (event) => {
    finishPointerDrag(event);
    cardEl.releasePointerCapture(event.pointerId);
  });

  textarea.addEventListener("change", () => {
    saveState(serialize(boardEl, floatingTasksEl));
  });
}

function wireFloatingCardDrag(cardEl, boardEl, floatingTasksEl, templates) {
  const textarea = cardEl.querySelector(".floating-card-text");
  const id = cardEl.dataset.id;
  let isPointerDown = false;
  let lastX = 0;
  let lastY = 0;

  cardEl.addEventListener("pointerdown", (event) => {
    const body = floatingCardPhysics[id];
    if (!body) return;
    isPointerDown = true;
    lastX = event.clientX;
    lastY = event.clientY;
    body.isDragging = true;

    // Bring all floating papers above the board while dragging
    floatingTasksEl.classList.add("front");

    cardEl.setPointerCapture(event.pointerId);
  });

  cardEl.addEventListener("pointermove", (event) => {
    const body = floatingCardPhysics[id];
    if (!body || !isPointerDown) return;

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;

    // Map screen delta to world delta (simple scaling)
    const scale = 1 / 50; // 50px per world unit
    body.x += dx * scale;
    body.y += dy * scale;
    body.vx = dx * scale * 2;
    body.vy = dy * scale * 2;

    const { x, y } = screenFromWorld(body.x, body.y);
    cardEl.style.left = x + "px";
    cardEl.style.top = y + "px";

    // Visual feedback when hovering trash can / columns
    const elements = document.elementsFromPoint(event.clientX, event.clientY);
    const overTrash = elements.some((el) => el.id === "trash-can");
    const trashEl = document.getElementById("trash-can");
    if (trashEl) {
      if (overTrash) {
        trashEl.classList.add("trash-hover");
        cardEl.classList.add("trash-hover");
      } else {
        trashEl.classList.remove("trash-hover");
        cardEl.classList.remove("trash-hover");
      }
    }

    // Column hover effect when a paper is over a column
    document.querySelectorAll(".column.column-hover").forEach((col) => col.classList.remove("column-hover"));
    const columnEl = elements.find((el) => el.classList && el.classList.contains("column"));
    if (columnEl) {
      columnEl.classList.add("column-hover");
    }
  });

  function finishPointerDrag(event) {
    const body = floatingCardPhysics[id];
    if (!body) return;
    if (!isPointerDown) return;
    isPointerDown = false;
    body.isDragging = false;

    const elements = document.elementsFromPoint(event.clientX, event.clientY);
    const trashElDom = document.getElementById("trash-can");
    if (trashElDom) trashElDom.classList.remove("trash-hover");
    cardEl.classList.remove("trash-hover");
    document.querySelectorAll(".column.column-hover").forEach((col) => col.classList.remove("column-hover"));

    // If released over a column, convert to column card
    const columnEl = elements.find((el) => el.classList && el.classList.contains("column"));
    if (columnEl) {
      const colId = columnEl.dataset.id;
      const column = state.columns.find((c) => c.id === colId);
      if (column) {
        const text = textarea.value;
        column.cards.push({ id: crypto.randomUUID(), text });
        const idx = state.floatingCards.findIndex((c) => c.id === id);
        if (idx !== -1) state.floatingCards.splice(idx, 1);
        delete floatingCardPhysics[id];
        renderBoard(state, boardEl, templates);
        renderFloatingTasks(state.floatingCards, floatingTasksEl, templates, boardEl);
        saveState(serialize(boardEl, floatingTasksEl));
        return;
      }
    }

    // If released over the trash can, just delete the floating paper
    const trashEl = elements.find((el) => el.id === "trash-can");
    if (trashEl) {
      const idx = state.floatingCards.findIndex((c) => c.id === id);
      if (idx !== -1) state.floatingCards.splice(idx, 1);
      delete floatingCardPhysics[id];
      renderFloatingTasks(state.floatingCards, floatingTasksEl, templates, boardEl);
      saveState(serialize(boardEl, floatingTasksEl));
    }
  }

  cardEl.addEventListener("pointerup", (event) => {
    finishPointerDrag(event);
    floatingTasksEl.classList.remove("front");
    cardEl.releasePointerCapture(event.pointerId);
  });

  cardEl.addEventListener("pointercancel", (event) => {
    finishPointerDrag(event);
    floatingTasksEl.classList.remove("front");
    cardEl.releasePointerCapture(event.pointerId);
  });

  textarea.addEventListener("change", () => {
    saveState(serialize(boardEl, floatingTasksEl));
  });
}

function renderBoard(state, boardEl, templates) {
  boardEl.innerHTML = "";
  for (const column of state.columns) {
    const colEl = buildColumn(column, templates, boardEl);
    boardEl.appendChild(colEl);
  }
}

const floatingCardPhysics = {};
const floatingPaperViews = new Map(); // id -> { cardEl, textarea }
let FLOAT_TIME = 0;

const WORLD_SCALE = 50; // pixels per world unit
const PAPER_MARGIN_X = 80 / WORLD_SCALE; // extra horizontal world margin so paper stays fully visible
const PAPER_MARGIN_Y = 60 / WORLD_SCALE; // extra vertical world margin so paper stays fully visible

function screenFromWorld(wx, wy) {
  const x = window.innerWidth / 2 + wx * WORLD_SCALE;
  const y = window.innerHeight / 2 + wy * WORLD_SCALE;
  return { x, y };
}

function worldFromScreen(cx, cy) {
  const wx = (cx - window.innerWidth / 2) / WORLD_SCALE;
  const wy = (cy - window.innerHeight / 2) / WORLD_SCALE;
  return { wx, wy };
}

function initializeFloatingCard(cardEl, card) {
  const cardId = card.id;
  const maxWorldX = (window.innerWidth / WORLD_SCALE) / 2 - PAPER_MARGIN_X;
  const maxWorldY = (window.innerHeight / WORLD_SCALE) / 2 - PAPER_MARGIN_Y;

  let wx;
  let wy;
  if (card.spawnX != null && card.spawnY != null) {
    wx = card.spawnX;
    wy = card.spawnY;
  } else {
    wx = (Math.random() * 2 - 1) * maxWorldX;
    wy = (Math.random() * 2 - 1) * maxWorldY;
  }

  const vx = (Math.random() - 0.5) * 0.1;
  const vy = 0.03 + (Math.random() - 0.5) * 0.02; // slightly faster base fall
  const phase = Math.random() * Math.PI * 2;

  floatingCardPhysics[cardId] = {
    x: wx,
    y: wy,
    vx,
    vy,
    phase,
    isDragging: false,
  };

  const { x, y } = screenFromWorld(wx, wy);
  cardEl.style.left = x + "px";
  cardEl.style.top = y + "px";
}

function updateCardPosition(cardEl, cardId) {
  const physics = floatingCardPhysics[cardId];
  if (!physics || physics.isDragging) return;
  const { x, y } = screenFromWorld(physics.x, physics.y);
  cardEl.style.left = x + "px";
  cardEl.style.top = y + "px";

  // Rotation based on velocity and sway
  const angle = Math.sin(FLOAT_TIME * 0.8 + (physics.phase || 0)) * 0.8 + 
                physics.vx * 5; // more dramatic rotation influenced by velocity
  cardEl.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
}

function animateFloatingCards() {
  FLOAT_TIME += 0.016; // approximate seconds per frame
  const maxWorldX = (window.innerWidth / WORLD_SCALE) / 2 - PAPER_MARGIN_X;
  const maxWorldY = (window.innerHeight / WORLD_SCALE) / 2 - PAPER_MARGIN_Y;

  for (const cardId in floatingCardPhysics) {
    const physics = floatingCardPhysics[cardId];
    if (physics.isDragging) continue;

    // Wind-like sideways sway
    const wind = Math.sin(FLOAT_TIME * 0.6 + (physics.phase || 0)) * 0.02;
    const bob = Math.cos(FLOAT_TIME * 0.9 + (physics.phase || 0)) * 0.01;

    physics.vx += wind * 0.02;
    physics.vx *= 0.98; // mild air resistance
    physics.vy = 0.03 + bob; // slightly faster constant slow fall with small variation

    physics.x += physics.vx;
    physics.y += physics.vy;

    // Wrap horizontally
    if (physics.x < -maxWorldX) physics.x = maxWorldX;
    if (physics.x > maxWorldX) physics.x = -maxWorldX;

    // If it falls below the bottom, respawn above the top like infinite falling
    const respawnThreshold = maxWorldY + PAPER_MARGIN_Y * 2;
    if (physics.y > respawnThreshold) {
      physics.y = -maxWorldY - PAPER_MARGIN_Y * 2;
      physics.x = (Math.random() * 2 - 1) * maxWorldX;
      physics.vx = (Math.random() - 0.5) * 0.1;
      physics.phase = Math.random() * Math.PI * 2;
    }

    const cardEl = document.querySelector(`.floating-card[data-id="${cardId}"]`);
    if (cardEl && !physics.isDragging) {
      // Always fully opaque; rely on extended margins so the whole paper leaves screen
      cardEl.style.opacity = "1";
      updateCardPosition(cardEl, cardId);
    }
  }

  requestAnimationFrame(animateFloatingCards);
}

function renderFloatingTasks(floatingCards, floatingTasksEl, templates, boardEl) {
  const seen = new Set();

  // Create or update views for all floating cards in state
  for (const card of floatingCards) {
    let view = floatingPaperViews.get(card.id);
    if (!view) {
      const cardFrag = templates.floatingCard.content.cloneNode(true);
      const cardEl = cardFrag.querySelector(".floating-card");
      const textarea = cardFrag.querySelector(".floating-card-text");
      cardEl.dataset.id = card.id;
      textarea.value = card.text;
    
    initializeFloatingCard(cardEl, card);
    wireFloatingCardDrag(cardEl, boardEl, floatingTasksEl, templates);

      floatingTasksEl.appendChild(cardFrag);
      view = { cardEl, textarea };
      floatingPaperViews.set(card.id, view);
    } else {
      // Sync text in case it changed in state
      view.textarea.value = card.text;
    }
    seen.add(card.id);
  }

  // Remove any views that are no longer in state
  for (const [id, view] of floatingPaperViews.entries()) {
    if (!seen.has(id)) {
      view.cardEl.remove();
      floatingPaperViews.delete(id);
      delete floatingCardPhysics[id];
    }
  }
}

let state;

function main() {
  const boardEl = document.getElementById("board");
  const floatingTasksEl = document.getElementById("floating-tasks");
  const taskInput = document.getElementById("task-input");
  const addColumnBtn = document.getElementById("add-column-btn");
  const templates = {
    column: document.getElementById("column-template"),
    card: document.getElementById("card-template"),
    floatingCard: document.getElementById("floating-card-template"),
  };

  state = loadState() ?? createDefaultState();
  if (!state.floatingCards) state.floatingCards = [];
  renderBoard(state, boardEl, templates);
  renderFloatingTasks(state.floatingCards, floatingTasksEl, templates, boardEl);
  animateFloatingCards();

  taskInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && taskInput.value.trim()) {
      const newCard = {
        id: crypto.randomUUID(),
        text: taskInput.value.trim(),
      };
      state.floatingCards.push(newCard);
      taskInput.value = "";
      renderFloatingTasks(state.floatingCards, floatingTasksEl, templates, boardEl);
      saveState(serialize(boardEl, floatingTasksEl));
    }
  });

  addColumnBtn.addEventListener("click", () => {
    const newColumn = {
      id: crypto.randomUUID(),
      title: "New column",
      cards: [],
    };
    state.columns.push(newColumn);
    renderBoard(state, boardEl, templates);
    saveState(serialize(boardEl, floatingTasksEl));
  });

  window.addEventListener("beforeunload", () => {
    saveState(serialize(boardEl, floatingTasksEl));
  });
}

window.addEventListener("DOMContentLoaded", main);
