/**
 * LOCUS - Memory Palace Dashboard
 * Vanilla JS Kanban Board
 */

(function() {
  'use strict';

  // ========================================
  // State
  // ========================================
  
  let state = {
    rooms: {},
    items: [],
    activeRoom: 'all'
  };

  const STORAGE_KEY = 'locus_items';
  const STATUSES = ['backlog', 'in_progress', 'blocked', 'done'];

  // Embedded data for file:// protocol fallback
  const EMBEDDED_DATA = {
    "rooms": {
      "vault": { "name": "The Vault", "description": "Trading, finance, and investments", "icon": "🏦", "color": "#D4AF37" },
      "hearth": { "name": "The Hearth", "description": "Family, home, and personal", "icon": "🏠", "color": "#E07A5F" },
      "workshop": { "name": "The Workshop", "description": "Tech projects and tools", "icon": "🔧", "color": "#81B29A" },
      "garden": { "name": "The Garden", "description": "Ideas and someday/maybe", "icon": "🌱", "color": "#9B72AA" },
      "archive": { "name": "The Archive", "description": "Completed and reference", "icon": "📜", "color": "#6B7280" }
    },
    "items": [
      { "id": "vault-001", "title": "Track DLA Strategic Materials announcement", "room": "vault", "status": "in_progress", "priority": "high", "due": "2026-02-11", "source": "memory/2025-01-27.md", "notes": "Major catalyst for critical minerals plays (UUUU, UAMY, MP)", "tags": ["catalyst", "trading", "meridian"], "created": "2026-01-27" },
      { "id": "vault-002", "title": "Track DOE NOFO awards", "room": "vault", "status": "in_progress", "priority": "high", "due": "2026-02-23", "source": "memory/2025-01-27.md", "notes": "DOE funding announcements for critical minerals", "tags": ["catalyst", "trading", "meridian"], "created": "2026-01-27" },
      { "id": "vault-003", "title": "Automate Fidelity position scraping", "room": "vault", "status": "backlog", "priority": "medium", "due": null, "source": "memory/2025-01-27.md", "notes": "Use browser automation to scrape positions from Fidelity tab.", "tags": ["automation", "portfolio"], "created": "2026-01-27" },
      { "id": "vault-004", "title": "Set up Reddit Radar daily cron", "room": "vault", "status": "backlog", "priority": "low", "due": null, "source": "memory/2026-01-27.md", "notes": "Daily digest of Reddit mentions. ApeWisdom.io + QuiverQuant.", "tags": ["automation", "reddit"], "created": "2026-01-27" },
      { "id": "workshop-001", "title": "Build Locus dashboard", "room": "workshop", "status": "done", "priority": "high", "due": null, "source": "memory/2025-01-27.md", "notes": "Self-hosted project board with memory palace metaphor. ✅ Complete!", "tags": ["project", "dashboard"], "created": "2026-01-27" },
      { "id": "workshop-002", "title": "VPS migration & off-site backup", "room": "workshop", "status": "backlog", "priority": "medium", "due": null, "source": "memory/2026-01-27.md", "notes": "Current backup is local only. Need cloud/off-site push.", "tags": ["infrastructure", "backup"], "created": "2026-01-27" },
      { "id": "workshop-003", "title": "Moltbot migration", "room": "workshop", "status": "backlog", "priority": "low", "due": null, "source": "memory/2025-01-27.md", "notes": "Clawdbot → Moltbot rebrand. Wait for official migration path.", "tags": ["migration"], "created": "2026-01-27" },
      { "id": "workshop-004", "title": "Investigate awesome-moltbot-skills repo", "room": "workshop", "status": "backlog", "priority": "low", "due": null, "source": "memory/2025-01-27.md", "notes": "https://github.com/VoltAgent/awesome-moltbot-skills", "tags": ["research", "skills"], "created": "2026-01-27" },
      { "id": "workshop-005", "title": "Claude Connect setup", "room": "workshop", "status": "backlog", "priority": "low", "due": null, "source": "memory/2026-01-26.md", "notes": "Claude CLI not installed, using API key instead", "tags": ["setup"], "created": "2026-01-26" },
      { "id": "workshop-006", "title": "Discord bot - fix message receiving", "room": "workshop", "status": "in_progress", "priority": "medium", "due": null, "source": "memory/2026-01-27.md", "notes": "Bot can send but not receive. Reset in progress.", "tags": ["discord", "bot"], "created": "2026-01-27" },
      { "id": "hearth-001", "title": "Dawson therapy follow-up", "room": "hearth", "status": "backlog", "priority": "medium", "due": null, "source": "memory/2025-01-27.md", "notes": "Shamieka emailed therapist about PTSD signs to watch for.", "tags": ["family", "dawson"], "created": "2026-01-27" },
      { "id": "hearth-002", "title": "Citizens Bank payment issue", "room": "hearth", "status": "backlog", "priority": "medium", "due": null, "source": "memory/2026-01-26.md", "notes": "Shamieka forwarded failed payment, needs JP's help", "tags": ["family", "finance"], "created": "2026-01-26" },
      { "id": "hearth-003", "title": "Kids' missing work follow-up", "room": "hearth", "status": "backlog", "priority": "low", "due": null, "source": "memory/2026-01-26.md", "notes": "Science 8 notification for one of the kids", "tags": ["family", "school"], "created": "2026-01-26" },
      { "id": "garden-001", "title": "Notion integration experiment", "room": "garden", "status": "backlog", "priority": "low", "due": null, "source": "memory/2025-01-27.md", "notes": "Parallel experiment alongside Locus.", "tags": ["idea", "integration"], "created": "2026-01-27" },
      { "id": "garden-002", "title": "Google Calendar re-auth", "room": "garden", "status": "backlog", "priority": "low", "due": null, "source": "memory/2026-01-26.md", "notes": "Needs calendar scope added to OAuth", "tags": ["setup", "google"], "created": "2026-01-26" }
    ]
  };

  // ========================================
  // DOM References
  // ========================================
  
  const $roomFilters = document.getElementById('room-filters');
  const $modalOverlay = document.getElementById('modal-overlay');
  const $modalClose = document.getElementById('modal-close');
  const $modal = {
    roomBadge: document.getElementById('modal-room-badge'),
    priority: document.getElementById('modal-priority'),
    title: document.getElementById('modal-title'),
    due: document.getElementById('modal-due'),
    created: document.getElementById('modal-created'),
    tags: document.getElementById('modal-tags'),
    notes: document.getElementById('modal-notes'),
    source: document.getElementById('modal-source')
  };

  // ========================================
  // Data Loading
  // ========================================

  async function loadData() {
    try {
      // Try to load from localStorage first (for persisted changes)
      const stored = localStorage.getItem(STORAGE_KEY);
      
      let data;
      
      // Try fetch first (works with http server)
      try {
        const response = await fetch('../data/projects.json');
        if (response.ok) {
          data = await response.json();
        } else {
          throw new Error('Fetch failed');
        }
      } catch (fetchError) {
        // Fall back to embedded data (for file:// protocol)
        console.log('Using embedded data (file:// protocol detected)');
        data = EMBEDDED_DATA;
      }
      
      state.rooms = data.rooms;
      
      // Use stored items if available, otherwise use file data
      if (stored) {
        try {
          state.items = JSON.parse(stored);
        } catch (e) {
          state.items = data.items;
        }
      } else {
        state.items = data.items;
      }
      
      return true;
    } catch (error) {
      console.error('Error loading data:', error);
      return false;
    }
  }

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }

  // ========================================
  // Rendering
  // ========================================

  function renderRoomFilters() {
    // Keep the "All Rooms" button, add others
    const existing = $roomFilters.querySelector('[data-room="all"]');
    
    Object.entries(state.rooms).forEach(([key, room]) => {
      const btn = document.createElement('button');
      btn.className = 'room-btn';
      btn.dataset.room = key;
      btn.innerHTML = `
        <span class="room-icon">${room.icon}</span>
        <span class="room-name">${room.name}</span>
      `;
      btn.addEventListener('click', () => setActiveRoom(key));
      $roomFilters.appendChild(btn);
    });
  }

  function setActiveRoom(roomKey) {
    state.activeRoom = roomKey;
    
    // Update button states
    document.querySelectorAll('.room-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.room === roomKey);
    });
    
    renderCards();
  }

  function getFilteredItems() {
    if (state.activeRoom === 'all') return state.items;
    return state.items.filter(item => item.room === state.activeRoom);
  }

  function renderCards() {
    const filtered = getFilteredItems();
    
    STATUSES.forEach(status => {
      const $container = document.getElementById(`cards-${status}`);
      const $count = document.getElementById(`count-${status}`);
      const items = filtered.filter(item => item.status === status);
      
      $count.textContent = items.length;
      $container.innerHTML = '';
      
      if (items.length === 0) {
        $container.innerHTML = '<div class="empty-state">No artifacts</div>';
        return;
      }
      
      items.forEach(item => {
        $container.appendChild(createCard(item));
      });
    });
  }

  function createCard(item) {
    const room = state.rooms[item.room];
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = item.id;
    card.dataset.room = item.room;
    card.draggable = true;
    
    // Due date formatting
    let dueHtml = '';
    if (item.due) {
      const dueDate = new Date(item.due);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      let dueClass = '';
      if (diffDays < 0) dueClass = 'overdue';
      else if (diffDays <= 7) dueClass = 'soon';
      
      dueHtml = `<span class="card-due ${dueClass}">📅 ${formatDate(item.due)}</span>`;
    }
    
    // Tags
    const tagsHtml = (item.tags || [])
      .slice(0, 3)
      .map(tag => `<span class="tag">${tag}</span>`)
      .join('');
    
    card.innerHTML = `
      <div class="card-header">
        <span class="card-title">${escapeHtml(item.title)}</span>
        <span class="card-priority ${item.priority}" title="${item.priority} priority"></span>
      </div>
      <div class="card-meta">
        <span class="room-badge" data-room="${item.room}">${room.icon} ${room.name}</span>
        ${dueHtml}
      </div>
      ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
    `;
    
    // Click to expand
    card.addEventListener('click', (e) => {
      if (!card.classList.contains('dragging')) {
        openModal(item);
      }
    });
    
    // Drag events
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    
    return card;
  }

  function openModal(item) {
    const room = state.rooms[item.room];
    
    $modal.roomBadge.innerHTML = `${room.icon} ${room.name}`;
    $modal.roomBadge.style.color = room.color;
    
    $modal.priority.textContent = `${item.priority} priority`;
    $modal.priority.className = `modal-priority ${item.priority}`;
    
    $modal.title.textContent = item.title;
    
    $modal.due.innerHTML = item.due 
      ? `📅 Due: ${formatDate(item.due)}`
      : '';
    
    $modal.created.innerHTML = item.created 
      ? `🕐 Created: ${formatDate(item.created)}`
      : '';
    
    $modal.tags.innerHTML = (item.tags || [])
      .map(tag => `<span class="tag">${tag}</span>`)
      .join('');
    
    $modal.notes.textContent = item.notes || '';
    
    $modal.source.innerHTML = item.source 
      ? `Source: ${escapeHtml(item.source)}`
      : '';
    
    $modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    $modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // ========================================
  // Drag & Drop
  // ========================================

  let draggedCard = null;

  function handleDragStart(e) {
    draggedCard = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
    
    // Add drag-over listeners to columns
    document.querySelectorAll('.cards').forEach(col => {
      col.addEventListener('dragover', handleDragOver);
      col.addEventListener('dragenter', handleDragEnter);
      col.addEventListener('dragleave', handleDragLeave);
      col.addEventListener('drop', handleDrop);
    });
  }

  function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedCard = null;
    
    // Remove drag-over styling
    document.querySelectorAll('.column').forEach(col => {
      col.classList.remove('drag-over');
    });
    
    // Remove listeners
    document.querySelectorAll('.cards').forEach(col => {
      col.removeEventListener('dragover', handleDragOver);
      col.removeEventListener('dragenter', handleDragEnter);
      col.removeEventListener('dragleave', handleDragLeave);
      col.removeEventListener('drop', handleDrop);
    });
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDragEnter(e) {
    e.preventDefault();
    const column = e.target.closest('.column');
    if (column) {
      column.classList.add('drag-over');
    }
  }

  function handleDragLeave(e) {
    const column = e.target.closest('.column');
    if (column && !column.contains(e.relatedTarget)) {
      column.classList.remove('drag-over');
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    
    const column = e.target.closest('.column');
    if (!column || !draggedCard) return;
    
    const newStatus = column.dataset.status;
    const itemId = draggedCard.dataset.id;
    
    // Update item status
    const item = state.items.find(i => i.id === itemId);
    if (item && item.status !== newStatus) {
      item.status = newStatus;
      saveToStorage();
      renderCards();
    }
    
    column.classList.remove('drag-over');
  }

  // ========================================
  // Utilities
  // ========================================

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========================================
  // Event Listeners
  // ========================================

  function setupEventListeners() {
    // Room filter: "All Rooms" button
    const allRoomsBtn = $roomFilters.querySelector('[data-room="all"]');
    if (allRoomsBtn) {
      allRoomsBtn.addEventListener('click', () => setActiveRoom('all'));
    }
    
    // Modal close
    $modalClose.addEventListener('click', closeModal);
    $modalOverlay.addEventListener('click', (e) => {
      if (e.target === $modalOverlay) {
        closeModal();
      }
    });
    
    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  // ========================================
  // Initialize
  // ========================================

  async function init() {
    const loaded = await loadData();
    
    if (!loaded) {
      document.querySelector('.board').innerHTML = `
        <div class="loading" style="grid-column: 1/-1;">
          Failed to load data. Check console for errors.
        </div>
      `;
      return;
    }
    
    renderRoomFilters();
    renderCards();
    setupEventListeners();
    
    console.log('🏛️ Locus initialized');
  }

  // Start
  init();

})();
