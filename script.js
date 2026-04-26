/* ============================================================
   MEMSIM v2.0 — Memory Management Visualizer
   Features: Paging (with address translation) | Segmentation |
             Virtual Memory (FIFO + LRU)
   ============================================================ */

/* ===== PARTICLES ===== */
(function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const colors = ['#00d9ff', '#a8ff3e', '#ff2d6b', '#ffaa00'];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1;
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${size}px;
      height: ${size}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration: ${Math.random() * 15 + 8}s;
      animation-delay: ${Math.random() * 10}s;
    `;
    container.appendChild(p);
  }
})();

/* ===== TAB SWITCHING ===== */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.module').forEach(m => m.classList.add('hidden'));
    document.getElementById('module-' + btn.dataset.tab).classList.remove('hidden');
    const modeEl = document.getElementById('h-mode');
    if (modeEl) modeEl.textContent = btn.dataset.tab.toUpperCase();
  });
});

document.querySelectorAll('.algo-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

/* ===== FRAME SLIDER SYNC ===== */
function syncFrameSlider(val) {
  val = Math.max(1, Math.min(8, parseInt(val) || 1));
  const num = document.getElementById('v-frames');
  const range = document.getElementById('v-frames-range');
  if (num) num.value = val;
  if (range) range.value = val;
}

/* ===== SEG COUNT CONTROL ===== */
function adjustSegCount(delta) {
  const el = document.getElementById('s-num-segs');
  let v = parseInt(el.value) + delta;
  v = Math.max(1, Math.min(10, v));
  el.value = v;
  generateSegInputs();
}

/* ===== SEGMENT COLORS & NAMES ===== */
const SEG_COLORS = [
  { bg: 'rgba(0,217,255,0.15)', border: '#00d9ff', text: '#00d9ff' },
  { bg: 'rgba(255,45,107,0.15)', border: '#ff2d6b', text: '#ff2d6b' },
  { bg: 'rgba(168,255,62,0.15)', border: '#a8ff3e', text: '#a8ff3e' },
  { bg: 'rgba(255,170,0,0.15)', border: '#ffaa00', text: '#ffaa00' },
  { bg: 'rgba(180,100,255,0.15)', border: '#b464ff', text: '#b464ff' },
  { bg: 'rgba(0,255,180,0.15)', border: '#00ffb4', text: '#00ffb4' },
  { bg: 'rgba(255,80,120,0.15)', border: '#ff5078', text: '#ff5078' },
  { bg: 'rgba(80,180,255,0.15)', border: '#50b4ff', text: '#50b4ff' },
  { bg: 'rgba(255,220,50,0.15)', border: '#ffdc32', text: '#ffdc32' },
  { bg: 'rgba(50,255,200,0.15)', border: '#32ffc8', text: '#32ffc8' },
];
const SEG_NAMES = ['Code', 'Data', 'Stack', 'Heap', 'BSS', 'Seg-6', 'Seg-7', 'Seg-8', 'Seg-9', 'Seg-10'];
const SEG_DEFAULTS = [600, 400, 800, 300, 200, 150, 250, 180, 220, 350];

/* ===== VM PRESETS ===== */
function loadPreset(name) {
  const presets = {
    classic: { refs: '7 0 1 2 0 3 0 4 2 3 0 3 2', frames: 3 },
    belady:  { refs: '1 2 3 4 1 2 5 1 2 3 4 5', frames: 3 },
    random:  { refs: generateRandomRefs(14, 7), frames: 4 }
  };
  const p = presets[name];
  if (!p) return;
  const refEl = document.getElementById('v-refstr');
  const frEl = document.getElementById('v-frames');
  if (refEl) refEl.value = p.refs;
  if (frEl) { frEl.value = p.frames; syncFrameSlider(p.frames); }
}

function generateRandomRefs(count, maxPage) {
  return Array.from({ length: count }, () => Math.floor(Math.random() * maxPage)).join(' ');
}

/* ================================================================
   MODULE 1: PAGING
   ================================================================ */
function simulatePaging() {
  const memSize  = parseInt(document.getElementById('p-mem-size').value);
  const pageSize = parseInt(document.getElementById('p-page-size').value);
  const procSize = parseInt(document.getElementById('p-proc-size').value);
  const logAddr  = parseInt(document.getElementById('p-log-addr').value);

  if ([memSize, pageSize, procSize].some(isNaN) || pageSize <= 0 || pageSize > memSize) {
    showError('paging-output', 'Invalid parameters. Ensure page size ≤ memory size.');
    return;
  }

  const totalFrames   = Math.floor(memSize / pageSize);
  const numPages      = Math.ceil(procSize / pageSize);
  const allocFrames   = Math.min(numPages, totalFrames);
  const internalFrag  = allocFrames * pageSize - procSize;
  const offsetBits    = Math.log2(pageSize);
  const isOffsetPow2  = Number.isInteger(offsetBits);

  // Assign random physical frames
  const allFrames = Array.from({ length: totalFrames }, (_, i) => i);
  const assigned  = [...allFrames].sort(() => Math.random() - 0.5).slice(0, allocFrames);

  const pageTable = Array.from({ length: numPages }, (_, i) => ({
    page:  i,
    frame: i < allocFrames ? assigned[i] : null,
    valid: i < allocFrames,
    physBase: i < allocFrames ? assigned[i] * pageSize : null
  }));

  // Address translation
  let addrHtml = '';
  if (!isNaN(logAddr) && logAddr >= 0) {
    const logPage   = Math.floor(logAddr / pageSize);
    const offset    = logAddr % pageSize;
    const entry     = pageTable.find(p => p.page === logPage);
    const isValid   = entry && entry.valid;
    const physAddr  = isValid ? entry.physBase + offset : null;

    addrHtml = `
      <div class="addr-translate">
        <div class="viz-title" style="color:var(--accent4)">▸ ADDRESS TRANSLATION</div>
        <div class="addr-row">
          <div class="addr-box">
            <span class="addr-box-val">${logAddr}</span>
            <span class="addr-box-lbl">Logical</span>
          </div>
          <span class="addr-sep">→</span>
          <div class="addr-box">
            <span class="addr-box-val" style="color:var(--text-mid)">${logPage}</span>
            <span class="addr-box-lbl">Page #</span>
          </div>
          <span class="addr-sep">+</span>
          <div class="addr-box">
            <span class="addr-box-val" style="color:var(--text-mid)">${offset}</span>
            <span class="addr-box-lbl">Offset</span>
          </div>
          <span class="addr-sep">→</span>
          ${isValid
            ? `<div class="addr-box">
                <span class="addr-box-val" style="color:var(--hit)">${physAddr}</span>
                <span class="addr-box-lbl">Physical</span>
              </div>
              <span class="addr-valid">✓ MAPPED (Frame ${entry.frame})</span>`
            : `<div class="addr-box" style="border-color:var(--fault)">
                <span class="addr-box-val" style="color:var(--fault)">FAULT</span>
                <span class="addr-box-lbl">Page Miss</span>
              </div>
              <span class="addr-invalid">⚠ SEGMENTATION FAULT</span>`
          }
        </div>
        ${isOffsetPow2 ? `<div style="font-size:10px;color:var(--text-dim);margin-top:8px">
          Page# = logAddr >> ${offsetBits} = <strong style="color:var(--text)">${logPage}</strong> &nbsp;|&nbsp;
          Offset = logAddr & ${pageSize-1} = <strong style="color:var(--text)">${offset}</strong>
        </div>` : ''}
      </div>
    `;
  }

  // Memory map
  const usedPct  = (allocFrames / totalFrames) * 100;
  const fragPct  = (internalFrag / memSize) * 100;

  const html = `
    <div class="panel-label"><span class="panel-label-icon">◈</span> PAGING RESULTS</div>

    <div class="stats-bar">
      <div class="stat-box">
        <span class="stat-value">${totalFrames}</span>
        <span class="stat-label">Total Frames</span>
      </div>
      <div class="stat-box accent2">
        <span class="stat-value">${numPages}</span>
        <span class="stat-label">Pages Required</span>
      </div>
      <div class="stat-box accent3">
        <span class="stat-value">${internalFrag}B</span>
        <span class="stat-label">Internal Frag.</span>
      </div>
    </div>

    <div class="viz-section">
      <div class="viz-title">▸ PHYSICAL MEMORY MAP</div>
      <div class="memory-map" title="Physical frame utilization">
        <div class="map-used" style="width:${usedPct - fragPct}%"></div>
        <div class="map-frag" style="width:${fragPct}%"></div>
        <div class="map-free"></div>
      </div>
      <div class="memory-map-legend">
        <div class="legend-item">
          <div class="legend-dot" style="background:rgba(0,217,255,0.2);border-color:var(--accent)"></div>
          <span>Used (${Math.round(usedPct - fragPct)}%)</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background:rgba(255,45,107,0.12);border-color:var(--fault)"></div>
          <span>Internal Frag. (${fragPct.toFixed(1)}%)</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background:var(--bg3);border-color:var(--border)"></div>
          <span>Free (${(100 - usedPct).toFixed(1)}%)</span>
        </div>
      </div>
    </div>

    ${addrHtml}

    <div class="viz-section">
      <div class="viz-title">▸ PAGE → FRAME MAPPING</div>
      <div class="page-grid">
        ${pageTable.filter(p => p.valid).map((p, i) => `
          <div class="page-block" style="animation-delay:${i * 0.05}s">
            <div class="page-cell-label">PAGE</div>
            <div class="page-cell page">P${p.page}</div>
            <div class="page-cell-arrow">↓</div>
            <div class="page-cell frame">F${p.frame}</div>
            <div class="page-cell-label">${p.physBase}–${p.physBase + pageSize - 1}</div>
          </div>
        `).join('')}
        ${numPages > allocFrames ? `
          <div class="page-block" style="animation-delay:${allocFrames * 0.05}s">
            <div class="page-cell-label">PAGE</div>
            <div class="page-cell empty">P${allocFrames}+</div>
            <div class="page-cell-arrow">↓</div>
            <div class="page-cell empty">—</div>
            <div class="page-cell-label">NOT LOADED</div>
          </div>
        ` : ''}
      </div>
    </div>

    <div class="viz-section">
      <div class="viz-title">▸ PAGE TABLE</div>
      <table class="page-table">
        <thead>
          <tr>
            <th>Page #</th>
            <th>Frame #</th>
            <th>Physical Base</th>
            <th>Physical Range</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${pageTable.map(p => `
            <tr>
              <td>${p.page}</td>
              <td>${p.valid ? p.frame : '—'}</td>
              <td>${p.valid ? p.physBase : '—'}</td>
              <td>${p.valid ? `${p.physBase} – ${p.physBase + pageSize - 1}` : '—'}</td>
              <td><span class="badge ${p.valid ? 'badge-valid' : 'badge-invalid'}">${p.valid ? '✓ VALID' : '✗ INVALID'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div style="margin-top:14px;padding:12px 16px;background:var(--bg3);border:1px solid var(--border);font-size:11px;color:var(--text-dim);line-height:1.8">
      <strong style="color:var(--text-mid);letter-spacing:0.1em">KEY FORMULAS</strong><br>
      Frames = Memory Size ÷ Page Size = ${memSize} ÷ ${pageSize} = <strong style="color:var(--accent)">${totalFrames}</strong><br>
      Pages = ⌈Process Size ÷ Page Size⌉ = ⌈${procSize} ÷ ${pageSize}⌉ = <strong style="color:var(--accent)">${numPages}</strong><br>
      Internal Frag. = (Pages × Page Size) − Process Size = (${numPages} × ${pageSize}) − ${procSize} = <strong style="color:var(--accent2)">${internalFrag}B</strong>
    </div>
  `;

  document.getElementById('paging-output').innerHTML = html;
}

/* ================================================================
   MODULE 2: SEGMENTATION
   ================================================================ */
function generateSegInputs() {
  const n = parseInt(document.getElementById('s-num-segs').value);
  if (isNaN(n) || n < 1 || n > 10) { alert('Enter 1–10 segments'); return; }
  let html = '';
  for (let i = 0; i < n; i++) {
    const col = SEG_COLORS[i];
    html += `
      <div class="seg-input-row">
        <label class="seg-name-label" style="color:${col.text}">${SEG_NAMES[i]}</label>
        <input type="number" id="seg-size-${i}" value="${SEG_DEFAULTS[i]}" min="1" max="65536" placeholder="Size (bytes)">
      </div>
    `;
  }
  document.getElementById('seg-inputs').innerHTML = html;
}

window.addEventListener('load', () => {
  generateSegInputs();
  simulateVirtual(); // Show default simulation
});

function simulateSegmentation() {
  const n = parseInt(document.getElementById('s-num-segs').value);
  const segments = [];
  let baseAddr = 0x1000; // Start at 4096

  for (let i = 0; i < n; i++) {
    const el = document.getElementById(`seg-size-${i}`);
    if (!el) { showError('segmentation-output', 'Click "REGENERATE FIELDS" first.'); return; }
    const size = parseInt(el.value);
    if (isNaN(size) || size <= 0) { showError('segmentation-output', `Invalid size for ${SEG_NAMES[i]}.`); return; }
    segments.push({
      name: SEG_NAMES[i],
      base: baseAddr,
      limit: size,
      color: SEG_COLORS[i],
      end: baseAddr + size - 1
    });
    baseAddr += size;
  }

  const totalSize = segments.reduce((a, s) => a + s.limit, 0);
  const maxBarW = 580;

  const barsHtml = segments.map((seg, idx) => {
    const barW = Math.max((seg.limit / totalSize) * maxBarW, 50);
    return `
      <div class="seg-bar" style="animation-delay:${idx * 0.07}s">
        <div class="seg-label" style="color:${seg.color.text}">${seg.name}</div>
        <div class="seg-fill" style="width:${barW}px;background:${seg.color.bg};border:1px solid ${seg.color.border};color:${seg.color.text}">
          <span class="seg-addr-start">0x${seg.base.toString(16).toUpperCase()}</span>
          <span class="seg-size-badge">${seg.limit >= 1024 ? (seg.limit/1024).toFixed(1)+'K' : seg.limit+'B'}</span>
          <span class="seg-addr-end">0x${seg.end.toString(16).toUpperCase()}</span>
        </div>
      </div>
    `;
  }).join('');

  // Percentage bars
  const pctBarsHtml = segments.map((seg, idx) => {
    const pct = ((seg.limit / totalSize) * 100).toFixed(1);
    return `
      <div class="algo-compare-row" style="animation-delay:${idx*0.05}s">
        <span class="algo-compare-name" style="color:${seg.color.text}">${seg.name}</span>
        <div class="algo-compare-bar-track">
          <div class="algo-compare-bar-fill" style="width:${pct}%;background:${seg.color.bg};border-right:2px solid ${seg.color.border};color:${seg.color.text}">
            ${pct}%
          </div>
        </div>
        <span style="font-size:11px;color:var(--text-mid);font-family:var(--mono);min-width:56px;text-align:right">${seg.limit}B</span>
      </div>
    `;
  }).join('');

  const html = `
    <div class="panel-label"><span class="panel-label-icon">◈</span> SEGMENTATION RESULTS</div>

    <div class="stats-bar">
      <div class="stat-box">
        <span class="stat-value">${n}</span>
        <span class="stat-label">Segments</span>
      </div>
      <div class="stat-box accent2">
        <span class="stat-value">${totalSize >= 1024 ? (totalSize/1024).toFixed(1)+'K' : totalSize}</span>
        <span class="stat-label">Total Size</span>
      </div>
      <div class="stat-box accent3">
        <span class="stat-value">0x${(baseAddr-1).toString(16).toUpperCase()}</span>
        <span class="stat-label">Max Address</span>
      </div>
    </div>

    <div class="viz-section">
      <div class="viz-title">▸ MEMORY LAYOUT — PROPORTIONAL</div>
      <div style="font-size:10px;color:var(--text-dim);margin-bottom:18px;letter-spacing:0.05em">
        Base address starts at 0x1000. Each segment occupies a contiguous region.
      </div>
      <div class="seg-bar-container">${barsHtml}</div>
    </div>

    <div class="viz-section">
      <div class="viz-title">▸ SIZE DISTRIBUTION</div>
      <div>${pctBarsHtml}</div>
    </div>

    <div class="viz-section">
      <div class="viz-title">▸ SEGMENT DESCRIPTOR TABLE</div>
      <table class="page-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Segment</th>
            <th>Base (Hex)</th>
            <th>Base (Dec)</th>
            <th>Limit</th>
            <th>End Address</th>
          </tr>
        </thead>
        <tbody>
          ${segments.map((seg, i) => `
            <tr>
              <td style="color:var(--text-dim)">${i}</td>
              <td style="color:${seg.color.text};font-weight:700">${seg.name}</td>
              <td style="color:var(--accent4)">0x${seg.base.toString(16).toUpperCase()}</td>
              <td>${seg.base}</td>
              <td>${seg.limit}B</td>
              <td>0x${seg.end.toString(16).toUpperCase()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div style="margin-top:14px;padding:12px 16px;background:var(--bg3);border:1px solid var(--border);font-size:11px;color:var(--text-dim);line-height:1.8">
      <strong style="color:var(--text-mid);letter-spacing:0.1em">ADDRESS TRANSLATION</strong><br>
      Physical Addr = Base[seg#] + offset &nbsp;|&nbsp; Valid if offset &lt; Limit[seg#]<br>
      Example: Segment 0 (${segments[0].name}), offset 100 → Physical = ${segments[0].base} + 100 = <strong style="color:var(--accent)">${segments[0].base + 100}</strong>
      ${100 < segments[0].limit ? '<span style="color:var(--hit)"> ✓ VALID</span>' : '<span style="color:var(--fault)"> ✗ FAULT (exceeds limit)</span>'}
    </div>
  `;

  document.getElementById('segmentation-output').innerHTML = html;
}

/* ================================================================
   MODULE 3: VIRTUAL MEMORY
   ================================================================ */

/* ---- FIFO ---- */
function runFIFO(refs, numFrames) {
  const frames = [], steps = [], queue = [];
  let hits = 0, faults = 0;
  refs.forEach(page => {
    const isHit = frames.includes(page);
    if (isHit) {
      hits++;
      steps.push({ page, frames: [...frames], status: 'hit', newPage: null });
    } else {
      faults++;
      let replaced = null;
      if (frames.length < numFrames) {
        frames.push(page); queue.push(page);
      } else {
        replaced = queue.shift();
        frames[frames.indexOf(replaced)] = page;
        queue.push(page);
      }
      steps.push({ page, frames: [...frames], status: 'fault', newPage: page, replaced });
    }
  });
  return { steps, hits, faults };
}

/* ---- LRU ---- */
function runLRU(refs, numFrames) {
  const frames = [], steps = [];
  let hits = 0, faults = 0;
  refs.forEach((page, i) => {
    const isHit = frames.includes(page);
    if (isHit) {
      hits++;
      steps.push({ page, frames: [...frames], status: 'hit', newPage: null });
    } else {
      faults++;
      let replaced = null;
      if (frames.length < numFrames) {
        frames.push(page);
      } else {
        let lruPage = null, lruTime = Infinity;
        frames.forEach(f => {
          let last = -1;
          for (let j = i - 1; j >= 0; j--) { if (refs[j] === f) { last = j; break; } }
          if (last < lruTime) { lruTime = last; lruPage = f; }
        });
        replaced = lruPage;
        frames[frames.indexOf(lruPage)] = page;
      }
      steps.push({ page, frames: [...frames], status: 'fault', newPage: page, replaced });
    }
  });
  return { steps, hits, faults };
}


function simulateVirtual() {
  const numFrames = parseInt(document.getElementById('v-frames').value);
  const refStr    = (document.getElementById('v-refstr').value || '').trim();
  const algo      = document.querySelector('.algo-btn.active')?.dataset.algo || 'fifo';

  if (isNaN(numFrames) || numFrames < 1) { showError('virtual-output', 'Invalid frame count (1–8).'); return; }

  const refs = refStr.split(/\s+/).map(Number).filter(n => !isNaN(n));
  if (refs.length === 0) { showError('virtual-output', 'Invalid reference string.'); return; }

  const runners = { fifo: runFIFO, lru: runLRU };
  const { steps, hits, faults } = runners[algo](refs, numFrames);
  const total    = refs.length;
  const hitRatio = (hits / total * 100).toFixed(1);
  const faultRatio = (faults / total * 100).toFixed(1);

  // Also run both for comparison
  const allResults = {
    fifo: runFIFO(refs, numFrames),
    lru:  runLRU(refs, numFrames),
  };

  /* Step columns */
  const frameLabelCol = `
    <div class="vm-side-labels">
      <div class="vm-side-ref-label">REF</div>
      ${Array.from({length: numFrames}, (_, f) => `<div class="vm-side-frame-label">F${f}</div>`).join('')}
      <div class="vm-side-status-label"></div>
    </div>
  `;

  const stepsHtml = steps.map((step, si) => {
    const delay = Math.min(si * 0.028, 1.5);
    const frameCells = Array.from({ length: numFrames }, (_, f) => {
      const pg = step.frames[f];
      let cls = 'empty-cell';
      if (pg !== undefined) {
        if (step.status === 'fault' && pg === step.newPage) cls = 'new-page';
        else if (step.status === 'hit' && pg === step.page) cls = 'hit-page';
        else cls = 'occupied';
      }
      return `<div class="vm-frame-cell ${cls}">${pg !== undefined ? pg : ''}</div>`;
    }).join('');

    return `
      <div class="vm-step" style="animation-delay:${delay}s">
        <div class="vm-ref ${step.status === 'hit' ? 'hit-ref' : 'fault-ref'}">${step.page}</div>
        ${frameCells}
        <div class="vm-status ${step.status === 'hit' ? 'hit' : 'fault'}">${step.status === 'hit' ? 'HIT' : 'MISS'}</div>
      </div>
    `;
  }).join('');

  /* Algorithm comparison bars */
  const algoNames  = { fifo: 'FIFO', lru: 'LRU' };
  const algoColors = { fifo: 'var(--accent)', lru: 'var(--accent4)' };
  const maxFaults  = Math.max(...Object.values(allResults).map(r => r.faults));

  const compareBarsHtml = Object.entries(allResults).map(([key, res]) => {
    const pct = maxFaults > 0 ? (res.faults / maxFaults * 100) : 0;
    const hitPct = (res.hits / total * 100).toFixed(1);
    const isActive = key === algo;
    return `
      <div class="algo-compare-row">
        <span class="algo-compare-name" style="color:${isActive ? algoColors[key] : 'var(--text-dim)'}">${algoNames[key]}</span>
        <div class="algo-compare-bar-track">
          <div class="algo-compare-bar-fill" style="
            width:${pct}%;
            background:${isActive ? `rgba(${key==='fifo'?'0,217,255':'255,170,0'},0.12)` : 'var(--bg4)'};
            border-right:2px solid ${algoColors[key]};
            color:${algoColors[key]};
          ">
            ${res.faults} faults
          </div>
        </div>
        <span style="font-size:10px;color:var(--text-mid);font-family:var(--mono);min-width:60px;text-align:right">${hitPct}% hit</span>
      </div>
    `;
  }).join('');

  const algoLabel = { fifo: 'FIFO — First In, First Out', lru: 'LRU — Least Recently Used' };

  const html = `
    <div class="panel-label"><span class="panel-label-icon">◈</span> ${algoLabel[algo]}</div>

    <div class="metrics-grid">
      <div class="metric-card" style="animation-delay:0s">
        <span class="metric-val blue">${total}</span>
        <span class="metric-lbl">Total Refs</span>
      </div>
      <div class="metric-card" style="animation-delay:0.05s">
        <span class="metric-val blue">${numFrames}</span>
        <span class="metric-lbl">Frames</span>
      </div>
      <div class="metric-card" style="animation-delay:0.1s">
        <span class="metric-val green">${hits}</span>
        <span class="metric-lbl">Page Hits</span>
      </div>
      <div class="metric-card" style="animation-delay:0.15s">
        <span class="metric-val red">${faults}</span>
        <span class="metric-lbl">Page Faults</span>
      </div>
      <div class="metric-card" style="animation-delay:0.2s">
        <span class="metric-val green">${hitRatio}%</span>
        <span class="metric-lbl">Hit Ratio</span>
      </div>
    </div>

    <div class="ratio-bar-wrap">
      <div class="ratio-bar-label">
        <span style="color:var(--hit)">▸ PAGE HITS &nbsp; ${hitRatio}%</span>
        <span style="color:var(--fault)">PAGE FAULTS &nbsp; ${faultRatio}% ◂</span>
      </div>
      <div class="ratio-bar-track">
        <div class="ratio-bar-hit" style="width:${hitRatio}%"></div>
      </div>
    </div>

    <div class="viz-section">
      <div class="viz-title">▸ FRAME STATE AT EACH REFERENCE</div>
      <div class="vm-legend">
        <div class="vm-legend-item"><div class="vm-legend-dot dot-hit"></div><span style="color:var(--hit)">HIT</span></div>
        <div class="vm-legend-item"><div class="vm-legend-dot dot-fault"></div><span style="color:var(--fault)">FAULT / NEW</span></div>
        <div class="vm-legend-item"><div class="vm-legend-dot dot-occ"></div><span style="color:var(--text-mid)">OCCUPIED</span></div>
        <div class="vm-legend-item"><div class="vm-legend-dot dot-empty"></div><span style="color:var(--text-dim)">EMPTY</span></div>
      </div>
      <div class="vm-steps-scroll">
        <div style="display:flex;gap:4px;align-items:flex-start">
          ${frameLabelCol}
          <div class="vm-steps-inner">${stepsHtml}</div>
        </div>
      </div>
    </div>

    <div class="viz-section">
      <div class="viz-title">▸ ALGORITHM COMPARISON (same input)</div>
      <div style="padding:16px;background:var(--bg3);border:1px solid var(--border)">
        <div class="algo-compare-title">PAGE FAULTS COMPARISON — lower is better</div>
        ${compareBarsHtml}
      </div>
    </div>
  `;

  document.getElementById('virtual-output').innerHTML = html;
}

/* ===== HELPERS ===== */
function showError(panelId, msg) {
  document.getElementById(panelId).innerHTML = `
    <div class="panel-label"><span class="panel-label-icon">⚠</span> ERROR</div>
    <div class="error-state">
      <div class="error-icon">⚠</div>
      <div class="error-msg">${msg}</div>
    </div>
  `;
}
