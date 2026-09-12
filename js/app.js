/* ============================================================
   GURU MERDEKA — core app.js
   ============================================================ */

// ── Helpers ──────────────────────────────────────────────────
function inChaptersDir() {
  return window.location.pathname.replace(/\\/g, '/').includes('/chapters/');
}

function chapterUrl(fileBasename) {
  return inChaptersDir()
    ? './' + fileBasename
    : './chapters/' + fileBasename;
}

function dashboardUrl() {
  return inChaptersDir() ? '../dashboard.html' : './dashboard.html';
}

// ── Theme ─────────────────────────────────────────────────────
const GM_Theme = {
  KEY: 'gm_theme',

  init() {
    const saved = localStorage.getItem(this.KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved === 'dark' || (!saved && prefersDark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    this._updateBtn();
  },

  toggle() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(this.KEY, next);
    this._updateBtn();
  },

  _updateBtn() {
    const btn = document.getElementById('darkModeToggle');
    if (!btn) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.textContent = isDark ? '☀️ Terang' : '🌙 Gelap';
  },
};

// ── Auth ──────────────────────────────────────────────────────
const GM_Auth = {
  KEY: 'gm_auth',

  isLoggedIn() { return localStorage.getItem(this.KEY) === '1'; },

  login(pw) {
    if (pw === GM_CONFIG.password) {
      localStorage.setItem(this.KEY, '1');
      return true;
    }
    return false;
  },

  logout() {
    localStorage.removeItem(this.KEY);
    window.location.href = inChaptersDir() ? '../index.html' : './index.html';
  },

  guard() {
    if (!this.isLoggedIn()) {
      window.location.href = inChaptersDir() ? '../index.html' : './index.html';
      return false;
    }
    return true;
  },
};

// ── Progress ──────────────────────────────────────────────────
const GM_Progress = {
  KEY: 'gm_progress',

  _get() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '{}'); }
    catch { return {}; }
  },

  complete(id) {
    const p = this._get();
    p[id] = true;
    localStorage.setItem(this.KEY, JSON.stringify(p));
  },

  isDone(id)   { return !!this._get()[id]; },

  isUnlocked(id) {
    const idx = GM_CONFIG.chapters.findIndex(c => c.id === id);
    if (idx <= 0) return true;
    return this.isDone(GM_CONFIG.chapters[idx - 1].id);
  },

  count()   { const p = this._get(); return GM_CONFIG.chapters.filter(c => p[c.id]).length; },
  percent() { return Math.round(this.count() / GM_CONFIG.chapters.length * 100); },
};

// ── Reflection / Checklist storage ───────────────────────────
const GM_Store = {
  saveReflection(key, val) { localStorage.setItem('gm_r_' + key, val); },
  loadReflection(key)      { return localStorage.getItem('gm_r_' + key) || ''; },

  saveCheck(key, checked)  { localStorage.setItem('gm_c_' + key, checked ? '1' : '0'); },
  loadCheck(key)           { return localStorage.getItem('gm_c_' + key) === '1'; },

  saveSwot(quad, items)    { localStorage.setItem('gm_swot_' + quad, JSON.stringify(items)); },
  loadSwot(quad)           {
    try { return JSON.parse(localStorage.getItem('gm_swot_' + quad) || '[]'); }
    catch { return []; }
  },
};

// ── Daily quote ───────────────────────────────────────────────
const GM_Quote = {
  today() {
    const d = new Date();
    const idx = (d.getDate() + d.getMonth() * 31) % GM_CONFIG.quotes.length;
    return GM_CONFIG.quotes[idx];
  },
};

// ── Sidebar ───────────────────────────────────────────────────
const GM_Sidebar = {
  build(currentId) {
    const nav = document.getElementById('sidebarNav');
    if (!nav) return;
    nav.innerHTML = '';
    GM_CONFIG.chapters.forEach(ch => {
      const done      = GM_Progress.isDone(ch.id);
      const unlocked  = GM_Progress.isUnlocked(ch.id);
      const isCurrent = ch.id === currentId;

      let statusClass = 's-locked';
      let statusIcon  = '🔒';
      if (done)        { statusClass = 's-done';   statusIcon = '✓';  }
      else if (isCurrent) { statusClass = 's-active'; statusIcon = '›';  }
      else if (unlocked)  { statusClass = 's-open';   statusIcon = '○';  }

      const a = document.createElement(unlocked ? 'a' : 'span');
      const url = chapterUrl(ch.file);
      if (unlocked) {
        a.href = url;
        // Fix mobile tap on sidebar
        a.addEventListener('touchend', function(e) {
          e.preventDefault();
          window.location.href = url;
        }, { passive: false });
      }
      a.className = 'sidebar-nav-item'
        + (isCurrent ? ' active' : '')
        + (!unlocked ? ' locked' : '');

      a.innerHTML = `
        <span class="sidebar-nav-status ${statusClass}">${statusIcon}</span>
        <span class="sidebar-nav-info">
          <span class="sidebar-nav-label">${ch.label}</span>
          <span class="sidebar-nav-title">${ch.title}</span>
        </span>`;
      nav.appendChild(a);
    });
  },

  updateProgress() {
    const pct   = GM_Progress.percent();
    const count = GM_Progress.count();
    const total = GM_CONFIG.chapters.length;
    const fill  = document.getElementById('sidebarProgressFill');
    const text  = document.getElementById('sidebarProgressText');
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = `${count}/${total}`;
  },

  initToggle() {
    const btn     = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');
    const sidebar = document.querySelector('.sidebar');
    if (!btn || !sidebar) return;

    btn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('visible');
    });
    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
      });
    }
  },

  buildCommunity() {
    const footer = document.querySelector('.sidebar-footer');
    if (!footer) return;
    // Inject community links + wrap existing buttons
    const darkBtn   = document.getElementById('darkModeToggle');
    const logoutBtn = document.getElementById('logoutBtn');
    footer.innerHTML = `
      <div class="sidebar-community">
        <a href="https://chat.whatsapp.com/KSIU2JBYXkm5t4EDBIy9WQ" target="_blank" class="sidebar-community-btn wa">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Grup WA
        </a>
        <a href="https://t.me/merdekajadiguru" target="_blank" class="sidebar-community-btn tg">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          Telegram
        </a>
      </div>
      <div class="sidebar-footer-actions" id="sidebarFooterActions"></div>`;
    // Re-attach buttons
    const actions = document.getElementById('sidebarFooterActions');
    if (actions && darkBtn)   actions.appendChild(darkBtn);
    if (actions && logoutBtn) actions.appendChild(logoutBtn);
  },
};

// ── Reading progress bar ──────────────────────────────────────
const GM_ReadProgress = {
  init() {
    const update = () => {
      const scrollTop = window.scrollY;
      const height    = document.documentElement.scrollHeight - window.innerHeight;
      const pct       = height > 0 ? Math.round(scrollTop / height * 100) : 0;
      document.documentElement.style.setProperty('--reading-progress', pct + '%');
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  },
};

// ── Interactive elements init ─────────────────────────────────
const GM_Interactive = {
  initReflections() {
    document.querySelectorAll('[data-rkey]').forEach(ta => {
      const key = ta.dataset.rkey;
      ta.value = GM_Store.loadReflection(key);
      let t;
      ta.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          GM_Store.saveReflection(key, ta.value);
          const ind = ta.closest('.reflection-item')?.querySelector('.save-indicator');
          if (ind) { ind.classList.add('show'); setTimeout(() => ind.classList.remove('show'), 1800); }
        }, 600);
      });
    });
  },

  initChecklists() {
    document.querySelectorAll('[data-ckey]').forEach(cb => {
      const key = cb.dataset.ckey;
      cb.checked = GM_Store.loadCheck(key);
      cb.addEventListener('change', () => GM_Store.saveCheck(key, cb.checked));
    });
  },

  initCompleteBtn(chapterId) {
    const btn = document.getElementById('markCompleteBtn');
    if (!btn) return;

    const refresh = () => {
      if (GM_Progress.isDone(chapterId)) {
        btn.innerHTML = '✓&nbsp; Chapter Ini Sudah Selesai';
        btn.classList.add('done');
        btn.disabled = true;
      }
    };
    refresh();

    btn.addEventListener('click', () => {
      GM_Progress.complete(chapterId);
      refresh();
      GM_Sidebar.build(chapterId);
      GM_Sidebar.updateProgress();

      // Show completion overlay
      const overlay = document.getElementById('completionOverlay');
      if (overlay) overlay.classList.add('show');
    });

    // Close overlay
    document.querySelectorAll('[data-close-overlay]').forEach(el => {
      el.addEventListener('click', () => {
        const overlay = document.getElementById('completionOverlay');
        if (overlay) overlay.classList.remove('show');
      });
    });
  },
};

// ── SWOT Builder ──────────────────────────────────────────────
const GM_Swot = {
  quads: ['s', 'w', 'o', 't'],

  init() {
    this.quads.forEach(q => this._buildQuad(q));
    const viewBtn = document.getElementById('swotViewBtn');
    if (viewBtn) viewBtn.addEventListener('click', () => this._showSummary());
  },

  _buildQuad(q) {
    const container = document.getElementById('swotItems_' + q);
    if (!container) return;
    const addBtn = document.getElementById('swotAdd_' + q);

    const render = () => {
      const items = GM_Store.loadSwot(q);
      container.innerHTML = '';
      items.forEach((val, i) => this._addRow(container, q, i, val));
    };

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const items = GM_Store.loadSwot(q);
        items.push('');
        GM_Store.saveSwot(q, items);
        render();
        const inputs = container.querySelectorAll('.swot-input');
        if (inputs.length) inputs[inputs.length - 1].focus();
      });
    }

    render();
  },

  _addRow(container, q, i, val) {
    const row = document.createElement('div');
    row.className = 'swot-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'swot-input';
    input.value = val;
    input.placeholder = 'Tuliskan poin…';
    input.addEventListener('input', () => {
      const items = GM_Store.loadSwot(q);
      items[i] = input.value;
      GM_Store.saveSwot(q, items);
    });

    const del = document.createElement('button');
    del.className = 'swot-del-btn';
    del.textContent = '×';
    del.title = 'Hapus';
    del.addEventListener('click', () => {
      const items = GM_Store.loadSwot(q);
      items.splice(i, 1);
      GM_Store.saveSwot(q, items);
      this._buildQuad(q);
    });

    row.appendChild(input);
    row.appendChild(del);
    container.appendChild(row);
  },

  _showSummary() {
    const labels = { s: 'Strengths (Kekuatan)', w: 'Weaknesses (Kelemahan)', o: 'Opportunities (Peluang)', t: 'Threats (Ancaman)' };
    let html = '<h3 style="font-family:var(--font-display);margin-bottom:16px;">SWOT Kamu</h3>';
    this.quads.forEach(q => {
      const items = GM_Store.loadSwot(q).filter(v => v.trim());
      if (!items.length) return;
      html += `<p style="font-weight:700;margin:12px 0 6px;color:var(--secondary);">${labels[q]}</p><ul style="margin-left:18px;">`;
      items.forEach(item => { html += `<li style="margin-bottom:4px;">${item}</li>`; });
      html += '</ul>';
    });
    const modal = document.getElementById('swotModal');
    const body  = document.getElementById('swotModalBody');
    if (modal && body) { body.innerHTML = html; modal.classList.add('show'); }
  },
};

// ── Dashboard init ────────────────────────────────────────────
function initDashboard() {
  if (!GM_Auth.guard()) return;
  GM_Theme.init();

  // Dark mode toggle
  const dmBtn = document.getElementById('darkModeToggle');
  if (dmBtn) dmBtn.addEventListener('click', () => GM_Theme.toggle());
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => GM_Auth.logout());

  // Sidebar
  GM_Sidebar.build(null);
  GM_Sidebar.updateProgress();
  GM_Sidebar.initToggle();
  GM_Sidebar.buildCommunity();

  // Progress circle
  const count  = GM_Progress.count();
  const total  = GM_CONFIG.chapters.length;
  const pct    = GM_Progress.percent();
  const circle = document.getElementById('progressCircleFill');
  if (circle) {
    const r = 25;
    const circ = 2 * Math.PI * r;
    circle.setAttribute('stroke-dasharray', circ);
    circle.setAttribute('stroke-dashoffset', circ - (circ * pct / 100));
  }
  const countEl = document.getElementById('progressCountText');
  if (countEl) countEl.textContent = `${count} / ${total}`;

  // Daily quote
  const q = GM_Quote.today();
  const qtEl = document.getElementById('dailyQuoteText');
  const qsEl = document.getElementById('dailyQuoteSource');
  if (qtEl) qtEl.textContent = q.text;
  if (qsEl) qsEl.textContent = '— ' + q.source;

  // Chapter grid
  const grid = document.getElementById('chapterGrid');
  if (!grid) return;
  GM_CONFIG.chapters.forEach(ch => {
    const done      = GM_Progress.isDone(ch.id);
    const unlocked  = GM_Progress.isUnlocked(ch.id);
    const isBonus   = !!ch.bonus;

    let statusLabel = '🔒 Terkunci';
    let statusClass = 'locked';
    if (done)          { statusLabel = '✓ Selesai';   statusClass = 'done'; }
    else if (unlocked) { statusLabel = isBonus ? '✦ Buka Blueprint' : '▶ Baca'; statusClass = 'available'; }

    const url = './chapters/' + ch.file;

    const cardEl = document.createElement(unlocked ? 'a' : 'div');
    if (unlocked) {
      cardEl.href = url;
      // Fix mobile tap — explicit touch handler
      cardEl.addEventListener('touchend', function(e) {
        e.preventDefault();
        window.location.href = url;
      }, { passive: false });
    }
    cardEl.className = 'chapter-card'
      + (done ? ' completed' : '')
      + (!unlocked ? ' locked' : '')
      + (isBonus ? ' bonus' : '');
    cardEl.innerHTML = `
      <span class="card-label">${ch.label}</span>
      <span class="card-title">${ch.title}</span>
      <span class="card-time">⏱ ${ch.time}</span>
      <span class="card-status ${statusClass}">${statusLabel}</span>`;
    grid.appendChild(cardEl);
  });
}

// ── Chapter page init ─────────────────────────────────────────
function initChapter(chapterId) {
  if (!GM_Auth.guard()) return;
  GM_Theme.init();

  const dmBtn = document.getElementById('darkModeToggle');
  if (dmBtn) dmBtn.addEventListener('click', () => GM_Theme.toggle());
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => GM_Auth.logout());

  GM_Sidebar.build(chapterId);
  GM_Sidebar.updateProgress();
  GM_Sidebar.initToggle();
  GM_Sidebar.buildCommunity();
  GM_ReadProgress.init();
  GM_Interactive.initReflections();
  GM_Interactive.initChecklists();
  GM_Interactive.initCompleteBtn(chapterId);

  // SWOT (Chapter 2 only)
  if (document.getElementById('swotItems_s')) GM_Swot.init();

  // SWOT modal close
  document.querySelectorAll('[data-close-swot]').forEach(el => {
    el.addEventListener('click', () => {
      const modal = document.getElementById('swotModal');
      if (modal) modal.classList.remove('show');
    });
  });
}

// ── Login page ────────────────────────────────────────────────
function initLogin() {
  GM_Theme.init();
  if (GM_Auth.isLoggedIn()) {
    window.location.href = './dashboard.html';
    return;
  }
  const form = document.getElementById('loginForm');
  const err  = document.getElementById('loginError');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const pw = document.getElementById('pwInput').value.trim();
    if (GM_Auth.login(pw)) {
      window.location.href = './dashboard.html';
    } else {
      if (err) { err.textContent = 'Kode akses tidak sesuai. Silakan periksa kembali.'; err.classList.add('show'); }
      document.getElementById('pwInput').value = '';
      document.getElementById('pwInput').focus();
    }
  });
}
