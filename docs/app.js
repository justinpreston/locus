/**
 * LOCUS - Memory Palace Dashboard
 * GitHub Issues Backend
 * shadcn/ui-inspired Design
 */

(function() {
  'use strict';

  // ========================================
  // Config
  // ========================================
  
  const REPO_OWNER = 'justinpreston';
  const REPO_NAME = 'locus';
  const GITHUB_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`;
  
  // Room icons - custom images if available, fallback to emoji
  const ROOM_ICONS = {
    vault: { image: 'icons/vault.png', emoji: '🏦' },
    hearth: { image: 'icons/hearth.png', emoji: '🏠' },
    workshop: { image: 'icons/workshop.png', emoji: '🔧' },
    garden: { image: 'icons/garden.png', emoji: '🌱' },
    archive: { image: 'icons/archive.png', emoji: '📜' }
  };
  
  const ROOMS = {
    vault: { name: 'The Vault', description: 'Trading, finance, and investments', icon: '🏦', color: 'var(--room-vault)' },
    hearth: { name: 'The Hearth', description: 'Family, home, and personal', icon: '🏠', color: 'var(--room-hearth)' },
    workshop: { name: 'The Workshop', description: 'Tech projects and tools', icon: '🔧', color: 'var(--room-workshop)' },
    garden: { name: 'The Garden', description: 'Ideas and someday/maybe', icon: '🌱', color: 'var(--room-garden)' },
    archive: { name: 'The Archive', description: 'Completed and reference', icon: '📜', color: 'var(--room-archive)' }
  };

  const STATUSES = ['backlog', 'in_progress', 'blocked', 'done'];

  // Cache for icon availability
  const iconCache = {};

  // ========================================
  // State
  // ========================================
  
  let state = {
    items: [],
    activeRoom: 'all'
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
  // Icon Loading
  // ========================================

  async function checkIconExists(roomKey) {
    if (iconCache[roomKey] !== undefined) {
      return iconCache[roomKey];
    }
    
    const iconConfig = ROOM_ICONS[roomKey];
    if (!iconConfig || !iconConfig.image) {
      iconCache[roomKey] = false;
      return false;
    }
    
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        iconCache[roomKey] = true;
        resolve(true);
      };
      img.onerror = () => {
        iconCache[roomKey] = false;
        resolve(false);
      };
      img.src = iconConfig.image;
    });
  }

  async function getRoomIconHtml(roomKey, size = 'normal') {
    const room = ROOMS[roomKey] || ROOMS.garden;
    const iconConfig = ROOM_ICONS[roomKey];
    const hasCustomIcon = await checkIconExists(roomKey);
    
    const sizeClass = size === 'small' ? 'badge-icon' : '';
    
    if (hasCustomIcon && iconConfig) {
      return `<img src="${iconConfig.image}" alt="${room.name}" class="${sizeClass}" loading="lazy">`;
    }
    return room.icon;
  }

  // ========================================
  // Data Loading from GitHub Issues
  // ========================================

  async function loadData() {
    try {
      // Fetch all issues (open and closed)
      const [openRes, closedRes] = await Promise.all([
        fetch(`${GITHUB_API}?state=open&per_page=100`),
        fetch(`${GITHUB_API}?state=closed&per_page=100`)
      ]);
      
      if (!openRes.ok || !closedRes.ok) {
        throw new Error('Failed to fetch issues');
      }
      
      const openIssues = await openRes.json();
      const closedIssues = await closedRes.json();
      const allIssues = [...openIssues, ...closedIssues];
      
      // Transform issues to our item format
      state.items = allIssues.map(issue => {
        const labels = issue.labels.map(l => l.name);
        
        // Extract room from labels
        const roomLabel = labels.find(l => l.startsWith('room:'));
        const room = roomLabel ? roomLabel.replace('room:', '') : 'garden';
        
        // Extract status from labels
        const statusLabel = labels.find(l => l.startsWith('status:'));
        let status = statusLabel ? statusLabel.replace('status:', '') : 'backlog';
        
        // If issue is closed, mark as done
        if (issue.state === 'closed') {
          status = 'done';
        }
        
        // Extract priority from labels
        const priorityLabel = labels.find(l => l.startsWith('priority:'));
        const priority = priorityLabel ? priorityLabel.replace('priority:', '') : 'medium';
        
        // Extract due date from body if present
        const dueMatch = issue.body?.match(/\*\*Due:\*\*\s*(\d{4}-\d{2}-\d{2})/);
        const due = dueMatch ? dueMatch[1] : null;
        
        // Extract tags from body if present
        const tagsMatch = issue.body?.match(/\*\*Tags:\*\*\s*(.+)/);
        const tags = tagsMatch ? tagsMatch[1].split(',').map(t => t.trim()) : [];
        
        // Clean notes (remove metadata)
        let notes = issue.body || '';
        notes = notes.replace(/\*\*Due:\*\*.+/g, '').replace(/\*\*Tags:\*\*.+/g, '').trim();
        
        return {
          id: issue.number,
          title: issue.title,
          room,
          status,
          priority,
          due,
          notes,
          tags,
          created: issue.created_at.split('T')[0],
          url: issue.html_url,
          issueNumber: issue.number
        };
      });
      
      return true;
    } catch (error) {
      console.error('Error loading data:', error);
      return false;
    }
  }

  // ========================================
  // Rendering
  // ========================================

  async function renderRoomFilters() {
    for (const [key, room] of Object.entries(ROOMS)) {
      const btn = document.createElement('button');
      btn.className = 'room-btn focus-ring';
      btn.dataset.room = key;
      btn.setAttribute('aria-pressed', 'false');
      
      const iconHtml = await getRoomIconHtml(key);
      btn.innerHTML = `
        <span class="room-icon">${iconHtml}</span>
        <span class="room-name">${room.name}</span>
      `;
      btn.addEventListener('click', () => setActiveRoom(key));
      $roomFilters.appendChild(btn);
    }
  }

  function setActiveRoom(roomKey) {
    state.activeRoom = roomKey;
    
    document.querySelectorAll('.room-btn').forEach(btn => {
      const isActive = btn.dataset.room === roomKey;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    
    renderCards();
  }

  function getFilteredItems() {
    if (state.activeRoom === 'all') return state.items;
    return state.items.filter(item => item.room === state.activeRoom);
  }

  async function renderCards() {
    const filtered = getFilteredItems();
    
    for (const status of STATUSES) {
      const $container = document.getElementById(`cards-${status}`);
      const $count = document.getElementById(`count-${status}`);
      const items = filtered.filter(item => item.status === status);
      
      $count.textContent = items.length;
      $container.innerHTML = '';
      
      if (items.length === 0) {
        $container.innerHTML = '<div class="empty-state">No items</div>';
        continue;
      }
      
      for (const item of items) {
        const card = await createCard(item);
        $container.appendChild(card);
      }
    }
  }

  async function createCard(item) {
    const room = ROOMS[item.room] || ROOMS.garden;
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.id = item.id;
    card.dataset.room = item.room;
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', '0');
    
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
      
      dueHtml = `<span class="card-due ${dueClass}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        ${formatDate(item.due)}
      </span>`;
    }
    
    // Tags
    const tagsHtml = (item.tags || [])
      .slice(0, 3)
      .map(tag => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join('');
    
    // Room badge with optional custom icon
    const roomIconHtml = await getRoomIconHtml(item.room, 'small');
    
    card.innerHTML = `
      <div class="card-header">
        <span class="card-title">${escapeHtml(item.title)}</span>
        <span class="card-priority ${item.priority}" title="${item.priority} priority"></span>
      </div>
      <div class="card-meta">
        <span class="room-badge" data-room="${item.room}">${roomIconHtml} ${room.name}</span>
        ${dueHtml}
      </div>
      ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
    `;
    
    // Click to expand
    card.addEventListener('click', () => openModal(item));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(item);
      }
    });
    
    return card;
  }

  async function openModal(item) {
    const room = ROOMS[item.room] || ROOMS.garden;
    const roomIconHtml = await getRoomIconHtml(item.room, 'small');
    
    $modal.roomBadge.innerHTML = `${roomIconHtml} ${room.name}`;
    $modal.roomBadge.style.color = room.color;
    
    $modal.priority.textContent = `${item.priority}`;
    $modal.priority.className = `modal-priority ${item.priority}`;
    
    $modal.title.textContent = item.title;
    
    $modal.due.innerHTML = item.due 
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
           <line x1="16" y1="2" x2="16" y2="6"/>
           <line x1="8" y1="2" x2="8" y2="6"/>
           <line x1="3" y1="10" x2="21" y2="10"/>
         </svg>
         Due: ${formatDate(item.due)}`
      : '';
    
    $modal.created.innerHTML = item.created 
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <circle cx="12" cy="12" r="10"/>
           <polyline points="12 6 12 12 16 14"/>
         </svg>
         Created: ${formatDate(item.created)}`
      : '';
    
    $modal.tags.innerHTML = (item.tags || [])
      .map(tag => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join('');
    
    $modal.notes.textContent = item.notes || '';
    
    // Link to GitHub issue for editing
    $modal.source.innerHTML = item.url 
      ? `<a href="${item.url}" target="_blank" rel="noopener" class="edit-link focus-ring">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
             <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
           </svg>
           Edit on GitHub #${item.issueNumber}
         </a>`
      : '';
    
    $modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Focus management for accessibility
    $modalClose.focus();
  }

  function closeModal() {
    $modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
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
    const allRoomsBtn = $roomFilters.querySelector('[data-room="all"]');
    if (allRoomsBtn) {
      allRoomsBtn.addEventListener('click', () => setActiveRoom('all'));
    }
    
    $modalClose.addEventListener('click', closeModal);
    $modalOverlay.addEventListener('click', (e) => {
      if (e.target === $modalOverlay) {
        closeModal();
      }
    });
    
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
        <div class="loading" style="grid-column: 1/-1; text-align: center; padding: 2rem;">
          <span>Failed to load data from GitHub</span>
        </div>
      `;
      return;
    }
    
    await renderRoomFilters();
    await renderCards();
    setupEventListeners();
    
    console.log('🏛️ Locus initialized with GitHub Issues backend');
  }

  init();

})();
