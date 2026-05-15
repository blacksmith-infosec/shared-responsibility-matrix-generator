// app.js
// Shared Responsibility Matrix Generator
//
// State auto-saves to the URL hash so users can bookmark and return.
// Theme preference persists in localStorage.

(function () {
  'use strict';

  // ---------- State ----------
  const state = {
    customer: '',
    msp: '',
    mspLogoDataUrl: null,
    systems: [],
    nextId: 1
  };

  const PARTIES = ['v', 'm', 'c'];
  const THEME_KEY = 'blacksmith-srm-theme';
  const LOGO_KEY = 'blacksmith-srm-msp-logo';
  const MAX_LOGO_BYTES = 800 * 1024; // 800KB ceiling on uploaded image size

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- Theme ----------
  function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function getCurrentTheme() {
    const stored = document.documentElement.getAttribute('data-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    // Fall back to OS preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function bindThemeToggle() {
    const btn = $('#theme-toggle');
    btn.addEventListener('click', () => {
      const current = getCurrentTheme();
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* private mode */ }
    });
  }

  function initTheme() {
    let stored = null;
    try { stored = localStorage.getItem(THEME_KEY); } catch (e) { /* private mode */ }
    if (stored === 'light' || stored === 'dark') applyTheme(stored);
  }

  // ---------- Hash save / restore ----------
  let saveTimer = null;
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveToHash, 400);
  }

  function encodeState() {
    const cats = window.SRM_DATA.categories;
    return {
      c: state.customer,
      m: state.msp,
      s: state.systems.map(sys => ({
        n: sys.name,
        v: sys.vendor,
        t: sys.templateId || null,
        a: cats.map(cat => (sys.assignments[cat.id] || []).join(''))
      }))
    };
  }

  function decodeState(data) {
    const cats = window.SRM_DATA.categories;
    state.customer = data.c || '';
    state.msp = data.m || '';
    state.systems = (data.s || []).map((s, i) => {
      const assignments = {};
      cats.forEach((cat, j) => {
        const code = (s.a && s.a[j]) || '';
        assignments[cat.id] = code.split('').filter(p => PARTIES.includes(p));
      });
      return {
        id: 'sys-' + (i + 1),
        templateId: s.t || null,
        name: s.n || '',
        vendor: s.v || '',
        assignments,
        expanded: false
      };
    });
    state.nextId = state.systems.length + 1;
  }

  function saveToHash() {
    try {
      const isEmpty = !state.customer && !state.msp && state.systems.length === 0;
      if (isEmpty) {
        if (window.location.hash) {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        updateResetVisibility();
        return;
      }
      const json = JSON.stringify(encodeState());
      const encoded = btoa(unescape(encodeURIComponent(json)));
      history.replaceState(null, '', '#' + encoded);
      updateResetVisibility();
    } catch (e) {
      console.error('Save to hash failed:', e);
    }
  }

  function loadFromHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return false;
    try {
      const json = decodeURIComponent(escape(atob(hash)));
      const data = JSON.parse(json);
      decodeState(data);
      return true;
    } catch (e) {
      console.error('Load from hash failed:', e);
      return false;
    }
  }

  // ---------- Helpers ----------
  function emptyAssignments() {
    const out = {};
    window.SRM_DATA.categories.forEach(c => { out[c.id] = []; });
    return out;
  }

  function buildSystemFromTemplate(template) {
    const id = 'sys-' + (state.nextId++);
    if (!template) {
      return {
        id, templateId: null, name: '', vendor: '',
        assignments: emptyAssignments(), expanded: true
      };
    }
    const assignments = {};
    window.SRM_DATA.categories.forEach(c => {
      const src = template.assignments[c.id] || [];
      assignments[c.id] = src.slice();
    });
    return {
      id,
      templateId: template.id,
      name: template.name,
      vendor: template.defaultVendor,
      assignments,
      expanded: true
    };
  }

  function updateResetVisibility() {
    const btn = $('#reset-all');
    if (!btn) return;
    const has = state.customer || state.msp || state.systems.length > 0;
    btn.hidden = !has;
  }

  // ---------- Branding inputs ----------
  function bindBrandingInputs() {
    const customer = $('#customer');
    const msp = $('#msp');
    customer.addEventListener('input', e => {
      state.customer = e.target.value;
      renderArtifactMeta();
      updateResetVisibility();
      scheduleSave();
    });
    msp.addEventListener('input', e => {
      state.msp = e.target.value;
      renderArtifactMeta();
      updateResetVisibility();
      scheduleSave();
    });
  }

  // ---------- Add-system menu ----------
  function bindAddMenu() {
    const btn = $('#add-system-btn');
    const menu = $('#add-menu');

    btn.addEventListener('click', e => {
      e.stopPropagation();
      const opening = menu.hidden;
      if (opening) {
        rebuildAddMenu();
        menu.hidden = false;
        btn.classList.add('open');
      } else {
        menu.hidden = true;
        btn.classList.remove('open');
      }
    });

    menu.addEventListener('click', e => {
      const item = e.target.closest('.menu-item');
      if (!item) return;
      const tplId = item.dataset.tpl;
      const template = tplId
        ? window.SRM_DATA.systems.find(s => s.id === tplId)
        : null;
      addSystem(template);
      menu.hidden = true;
      btn.classList.remove('open');
    });

    document.addEventListener('click', e => {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) {
        menu.hidden = true;
        btn.classList.remove('open');
      }
    });
  }

  function rebuildAddMenu() {
    const menu = $('#add-menu');
    const used = new Set(
      state.systems.filter(s => s.templateId).map(s => s.templateId)
    );
    const available = window.SRM_DATA.systems.filter(t => !used.has(t.id));

    const customItem = `
      <button class="menu-item" data-tpl="">
        <span>Custom (blank)</span>
        <span class="menu-item-sub">build from scratch</span>
      </button>
    `;

    if (available.length === 0) {
      menu.innerHTML = customItem;
      return;
    }

    const tplItems = available.map(t => `
      <button class="menu-item" data-tpl="${t.id}">
        <span>${escapeHtml(t.name)}</span>
        <span class="menu-item-sub">${escapeHtml(t.defaultVendor)}</span>
      </button>
    `).join('');

    menu.innerHTML = customItem +
      '<div class="menu-divider"></div>' +
      '<div class="menu-section-label">From template</div>' +
      tplItems;
  }

  // ---------- System CRUD ----------
  function addSystem(template) {
    const sys = buildSystemFromTemplate(template);
    state.systems.push(sys);
    const list = $('#system-list');
    const empty = $('#form-empty');
    if (empty) empty.remove();
    list.appendChild(createSystemCard(sys));
    updateSystemCount();
    updateResetVisibility();
    renderArtifact();
    scheduleSave();
  }

  function removeSystem(id) {
    state.systems = state.systems.filter(s => s.id !== id);
    const card = $(`.system-card[data-id="${id}"]`);
    if (card) card.remove();
    if (state.systems.length === 0) renderFormEmptyState();
    updateSystemCount();
    updateResetVisibility();
    renderArtifact();
    scheduleSave();
  }

  function updateSystemCount() {
    const count = state.systems.length;
    $('#system-count').textContent = count === 0
      ? ''
      : (count === 1 ? '1 system' : `${count} systems`);
  }

  // ---------- System card ----------
  function createSystemCard(sys) {
    const card = document.createElement('div');
    card.className = 'system-card' + (sys.expanded ? ' expanded' : '');
    card.dataset.id = sys.id;
    card.innerHTML = `
      <div class="card-head">
        <button class="card-toggle" type="button" title="Expand/collapse">▶</button>
        <div class="card-titles">
          <span class="card-name-display ${sys.name ? '' : 'placeholder'}">${sys.name ? escapeHtml(sys.name) : 'Untitled system'}</span>
          <span class="card-vendor-display">${escapeHtml(sys.vendor || '')}</span>
        </div>
        <button class="card-remove" type="button" title="Remove system">×</button>
      </div>
      <div class="card-body">
        <div class="card-fields">
          <div class="card-field">
            <label>System name</label>
            <input type="text" class="js-name" value="${escapeAttr(sys.name)}" placeholder="e.g. Microsoft 365">
          </div>
          <div class="card-field">
            <label>Vendor</label>
            <input type="text" class="js-vendor" value="${escapeAttr(sys.vendor)}" placeholder="e.g. Microsoft">
          </div>
        </div>
        <div class="resp-grid">
          <div class="resp-head label-col">Category</div>
          <div class="resp-head">V</div>
          <div class="resp-head">M</div>
          <div class="resp-head">C</div>
          ${window.SRM_DATA.categories.map(cat => buildRespRow(sys, cat)).join('')}
        </div>
      </div>
    `;

    card.querySelector('.card-head').addEventListener('click', e => {
      if (e.target.closest('.card-remove')) return;
      sys.expanded = !sys.expanded;
      card.classList.toggle('expanded', sys.expanded);
    });

    card.querySelector('.card-remove').addEventListener('click', e => {
      e.stopPropagation();
      removeSystem(sys.id);
    });

    const nameIn = card.querySelector('.js-name');
    const vendorIn = card.querySelector('.js-vendor');
    const nameDisp = card.querySelector('.card-name-display');
    const vendorDisp = card.querySelector('.card-vendor-display');

    nameIn.addEventListener('input', e => {
      sys.name = e.target.value;
      if (sys.name) {
        nameDisp.textContent = sys.name;
        nameDisp.classList.remove('placeholder');
      } else {
        nameDisp.textContent = 'Untitled system';
        nameDisp.classList.add('placeholder');
      }
      renderArtifact();
      scheduleSave();
    });
    vendorIn.addEventListener('input', e => {
      sys.vendor = e.target.value;
      vendorDisp.textContent = sys.vendor;
      renderArtifact();
      scheduleSave();
    });

    card.querySelectorAll('.party-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.dataset.cat;
        const party = btn.dataset.party;
        toggleParty(sys, catId, party, btn);
      });
    });

    return card;
  }

  function buildRespRow(sys, cat) {
    const arr = sys.assignments[cat.id] || [];
    return `
      <div class="resp-row-label">${escapeHtml(cat.main)} ${escapeHtml(cat.sub)}</div>
      ${PARTIES.map(p => `
        <button class="party-toggle ${p} ${arr.includes(p) ? 'on' : ''}"
                data-cat="${cat.id}" data-party="${p}"
                type="button" title="Toggle ${p.toUpperCase()}"></button>
      `).join('')}
    `;
  }

  function toggleParty(sys, catId, party, btn) {
    const arr = sys.assignments[catId];
    const idx = arr.indexOf(party);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(party);
    btn.classList.toggle('on', idx < 0);
    renderArtifact();
    scheduleSave();
  }

  // ---------- Empty form state ----------
  function renderFormEmptyState() {
    const list = $('#system-list');
    if ($('#form-empty')) return;
    const empty = document.createElement('div');
    empty.id = 'form-empty';
    empty.className = 'form-empty';
    empty.textContent = 'No systems yet. Click "Add system" above to start defining the customer environment.';
    list.appendChild(empty);
  }

  // ---------- MSP logo (localStorage, not in URL hash) ----------
  function loadMspLogoFromStorage() {
    try {
      const data = localStorage.getItem(LOGO_KEY);
      if (data && data.startsWith('data:image/')) {
        state.mspLogoDataUrl = data;
      }
    } catch (e) { /* localStorage may be unavailable */ }
  }

  function saveMspLogoToStorage() {
    try {
      if (state.mspLogoDataUrl) localStorage.setItem(LOGO_KEY, state.mspLogoDataUrl);
      else localStorage.removeItem(LOGO_KEY);
    } catch (e) { /* quota or unavailable */ }
  }

  function bindLogoUpload() {
    const fileIn = $('#logo-file-input');
    const chooseBtn = $('#logo-upload-btn');
    const clearBtn = $('#logo-clear-btn');
    if (!fileIn || !chooseBtn) return;

    chooseBtn.addEventListener('click', () => fileIn.click());
    fileIn.addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > MAX_LOGO_BYTES) {
        alert('Logo file is too large. Please use an image under 800KB.');
        fileIn.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        state.mspLogoDataUrl = ev.target.result;
        saveMspLogoToStorage();
        renderMspLogo();
      };
      reader.onerror = () => alert('Could not read that file. Try a different image.');
      reader.readAsDataURL(file);
      fileIn.value = '';
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.mspLogoDataUrl = null;
        saveMspLogoToStorage();
        renderMspLogo();
      });
    }

    // Allow clicking the artifact placeholder to upload as well
    const artifactBox = $('#artifact-msp-logo');
    if (artifactBox) {
      artifactBox.addEventListener('click', () => {
        if (!state.mspLogoDataUrl) fileIn.click();
      });
    }
  }

  function renderMspLogo() {
    const preview = $('#logo-upload-preview');
    const clearBtn = $('#logo-clear-btn');
    const artifactBox = $('#artifact-msp-logo');

    if (state.mspLogoDataUrl) {
      if (preview) {
        preview.classList.add('has-logo');
        preview.innerHTML = `<img src="${state.mspLogoDataUrl}" alt="MSP logo">`;
      }
      if (clearBtn) clearBtn.hidden = false;
      if (artifactBox) {
        artifactBox.classList.add('has-logo');
        artifactBox.innerHTML = `<img src="${state.mspLogoDataUrl}" alt="MSP logo">`;
      }
    } else {
      if (preview) {
        preview.classList.remove('has-logo');
        preview.innerHTML = '';
      }
      if (clearBtn) clearBtn.hidden = true;
      if (artifactBox) {
        artifactBox.classList.remove('has-logo');
        artifactBox.innerHTML = '<span class="artifact-logo-placeholder">+ MSP<br>LOGO</span>';
      }
    }
  }

  // ---------- Artifact rendering ----------
  function renderArtifactMeta() {
    $('#artifact-customer').textContent = state.customer || 'Customer name';
    $('#artifact-msp').textContent      = state.msp || 'MSP name';
    $('#artifact-date').textContent     = formatMonthYear(new Date());
  }

  function renderArtifact() {
    renderArtifactMeta();
    const cats = window.SRM_DATA.categories;
    const wrap = $('#artifact-body');

    if (state.systems.length === 0) {
      wrap.innerHTML = `
        <div class="artifact-empty">
          <svg class="artifact-empty-mark" viewBox="0 0 1010.16 1200" fill="currentColor" aria-hidden="true">
            <polygon points="844.27 0 166.99 0 22.57 373.1 0 989.36 394.3 1200 394.3 682.2 490.31 593.02 166.99 593.02 166.99 373.1 414.67 373.1 414.67 318.12 596.3 318.12 596.3 373.1 733.21 373.1 868.61 591.66 616.41 593.02 616.41 1200 1010.16 989.5 987.88 373.1 844.27 0"/>
          </svg>
          <p class="artifact-empty-copy">Add a system on the left to start building the responsibility matrix. Each system you add becomes a row mapped across the seven security control categories.</p>
        </div>
      `;
      return;
    }

    if (!$('#matrix')) {
      wrap.innerHTML = '<div class="matrix" id="matrix"></div>';
    }
    const matrixEl = $('#matrix');
    matrixEl.style.gridTemplateColumns = `160px repeat(${cats.length}, 1fr)`;

    const parts = ['<div class="m-hcell"></div>'];
    cats.forEach(c => {
      parts.push(`<div class="m-hcell">${escapeHtml(c.main)}<span class="m-hsub">${escapeHtml(c.sub)}</span></div>`);
    });
    state.systems.forEach(sys => {
      const name = sys.name || 'Untitled system';
      const vendor = sys.vendor || '';
      parts.push(`<div class="m-rlabel">${escapeHtml(name)}${vendor ? `<span class="m-rsub">${escapeHtml(vendor)}</span>` : ''}</div>`);
      cats.forEach(cat => {
        parts.push(renderCell(sys.assignments[cat.id] || []));
      });
    });
    matrixEl.innerHTML = parts.join('');
  }

  function renderCell(parties) {
    if (parties.length === 0) {
      return '<div class="m-cell"><span class="na">—</span></div>';
    }
    const hasV = parties.includes('v');
    const hasM = parties.includes('m');
    const hasC = parties.includes('c');
    return '<div class="m-cell">' +
      `<span class="dot v ${hasV ? 'on' : 'off'}"></span>` +
      `<span class="dot m ${hasM ? 'on' : 'off'}"></span>` +
      `<span class="dot c ${hasC ? 'on' : 'off'}"></span>` +
      '</div>';
  }

  // ---------- PNG export ----------
  function downloadPNG() {
    if (typeof html2canvas === 'undefined') {
      alert('Image library failed to load. Check your connection and refresh.');
      return;
    }
    if (state.systems.length === 0) {
      alert('Add at least one system before exporting.');
      return;
    }
    const node = $('#artifact');
    const btn = $('#download-png');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '...';

    html2canvas(node, { backgroundColor: '#FFFFFF', scale: 2, logging: false, useCORS: true, allowTaint: true })
      .then(canvas => {
        const link = document.createElement('a');
        link.download = `srm-${makeSlug()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      })
      .catch(err => { console.error(err); alert('Could not generate the image. See console.'); })
      .finally(() => {
        btn.disabled = false;
        btn.textContent = originalText;
      });
  }

  // ---------- PDF export ----------
  function downloadPDF() {
    if (typeof html2canvas === 'undefined' || !window.jspdf) {
      alert('PDF library failed to load. Check your connection and refresh.');
      return;
    }
    if (state.systems.length === 0) {
      alert('Add at least one system before exporting.');
      return;
    }
    const node = $('#artifact');
    const btn = $('#download-pdf');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '...';

    html2canvas(node, { backgroundColor: '#FFFFFF', scale: 2, logging: false, useCORS: true, allowTaint: true })
      .then(canvas => {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });

        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margin = 28;
        const availW = pageW - 2 * margin;
        const availH = pageH - 2 * margin;

        const imgRatio = canvas.width / canvas.height;
        let imgW = availW;
        let imgH = imgW / imgRatio;
        if (imgH > availH) {
          imgH = availH;
          imgW = imgH * imgRatio;
        }
        const x = (pageW - imgW) / 2;
        const y = (pageH - imgH) / 2;

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', x, y, imgW, imgH);
        pdf.save(`srm-${makeSlug()}.pdf`);
      })
      .catch(err => { console.error(err); alert('Could not generate the PDF. See console.'); })
      .finally(() => {
        btn.disabled = false;
        btn.textContent = originalText;
      });
  }

  function makeSlug() {
    return (state.customer || 'matrix')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'matrix';
  }

  // ---------- Reset ----------
  function resetAll() {
    if (!confirm('Clear all systems and branding, and reset the URL? This cannot be undone.')) return;
    state.customer = '';
    state.msp = '';
    state.systems = [];
    state.nextId = 1;
    $('#customer').value = '';
    $('#msp').value = '';
    $('#system-list').innerHTML = '';
    renderFormEmptyState();
    updateSystemCount();
    renderArtifact();
    history.replaceState(null, '', window.location.pathname + window.location.search);
    updateResetVisibility();
  }

  // ---------- Render loaded systems ----------
  function renderSystemListFromState() {
    const list = $('#system-list');
    list.innerHTML = '';
    const empty = $('#form-empty');
    if (empty) empty.remove();
    state.systems.forEach(sys => {
      list.appendChild(createSystemCard(sys));
    });
    if (state.systems.length === 0) renderFormEmptyState();
  }

  // ---------- Utilities ----------
  function formatMonthYear(d) {
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  // ---------- Init ----------
  initTheme(); // before DOMContentLoaded so initial paint is correct
  loadMspLogoFromStorage();
  document.addEventListener('DOMContentLoaded', () => {
    bindThemeToggle();
    bindBrandingInputs();
    bindAddMenu();
    bindLogoUpload();

    const loaded = loadFromHash();
    if (loaded) {
      $('#customer').value = state.customer;
      $('#msp').value = state.msp;
      renderSystemListFromState();
    } else {
      renderFormEmptyState();
    }

    updateSystemCount();
    updateResetVisibility();
    renderArtifact();
    renderMspLogo();

    $('#download-png').addEventListener('click', downloadPNG);
    $('#download-pdf').addEventListener('click', downloadPDF);
    $('#reset-all').addEventListener('click', resetAll);
  });
})();
