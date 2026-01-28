/**
 * LOCUS - Memory Palace Dashboard
 * GitHub Issues Backend
 */

(function() {
  'use strict';

  // ========================================
  // Config
  // ========================================
  
  const REPO_OWNER = 'justinpreston';
  const REPO_NAME = 'locus';
  const GITHUB_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`;
  
  const ROOMS = {
    vault: { name: 'The Vault', description: 'Trading, finance, and investments', icon: '🏦', color: '#D4AF37' },
    hearth: { name: 'The Hearth', description: 'Family, home, and personal', icon: '🏠', color: '#E07A5F' },
    workshop: { name: 'The Workshop', description: 'Tech projects and tools', icon: '🔧', color: '#81B29A' },
    garden: { name: 'The Garden', description: 'Ideas and someday/maybe', icon: '🌱', color: '#9B72AA' },
    archive: { name: 'The Archive', description: 'Completed and reference', icon: '📜', color: '#6B7280' }
  };

  const STATUSES = ['backlog', 'in_progress', 'blocked', 'done'];

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

  function renderRoomFilters() {
    Object.entries(ROOMS).forEach(([key, room]) => {
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
    const room = ROOMS[item.room] || ROOMS.garden;
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = item.id;
    card.dataset.room = item.room;
    
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
    card.addEventListener('click', () => openModal(item));
    
    return card;
  }

  function openModal(item) {
    const room = ROOMS[item.room] || ROOMS.garden;
    
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
    
    // Link to GitHub issue for editing
    $modal.source.innerHTML = item.url 
      ? `<a href="${item.url}" target="_blank" class="edit-link">✏️ Edit on GitHub (Issue #${item.issueNumber})</a>`
      : '';
    
    $modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
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
          Failed to load data from GitHub. Check console for errors.
        </div>
      `;
      return;
    }
    
    renderRoomFilters();
    renderCards();
    setupEventListeners();
    
    console.log('🏛️ Locus initialized with GitHub Issues backend');
  }

  init();

})();
