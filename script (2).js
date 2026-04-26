const memoryView = document.getElementById('memory-view');
const logOutput = document.getElementById('log-output');
const allocateButton = document.getElementById('allocate-process');
const deallocateButton = document.getElementById('deallocate-process');
const resetButton = document.getElementById('reset-memory');
const memorySizeInput = document.getElementById('memory-size');
const processIdInput = document.getElementById('process-id');
const processSizeInput = document.getElementById('process-size');
const allocationAlgoSelect = document.getElementById('allocation-algo');
const deallocateIdInput = document.getElementById('deallocate-id');

let totalMemory = Number(memorySizeInput.value);
let segments = [{ start: 0, size: totalMemory, free: true, pid: null }];
let lastPid = 1;

function log(message, type = 'success') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = message;
  logOutput.prepend(entry);
}

function renderMemory() {
  memoryView.innerHTML = '';
  segments.forEach(segment => {
    const segmentEl = document.createElement('div');
    const widthPercent = (segment.size / totalMemory) * 100;
    segmentEl.className = `memory-segment ${segment.free ? 'free' : 'allocated'}`;
    segmentEl.style.flex = `${segment.size} 0 auto`;
    segmentEl.style.width = `${widthPercent}%`;
    segmentEl.textContent = segment.free ? `${segment.size} free` : `${segment.pid} (${segment.size})`;
    memoryView.appendChild(segmentEl);
  });
}

function mergeFreeSegments() {
  let merged = [];
  segments.forEach(segment => {
    if (merged.length && segment.free && merged[merged.length - 1].free) {
      merged[merged.length - 1].size += segment.size;
    } else {
      merged.push({ ...segment });
    }
  });
  segments = merged;
}

function allocateProcess(pid, size, algorithm) {
  if (size <= 0 || size > totalMemory) {
    log('Invalid size. Enter a value between 1 and total memory.', 'error');
    return;
  }

  const freeSegments = segments
    .map((segment, index) => ({ ...segment, index }))
    .filter(segment => segment.free && segment.size >= size);

  if (!freeSegments.length) {
    log(`Allocation failed for ${pid}: no free block is large enough.`, 'error');
    return;
  }

  let chosen;
  if (algorithm === 'first') {
    chosen = freeSegments[0];
  } else if (algorithm === 'best') {
    chosen = freeSegments.reduce((best, current) => current.size < best.size ? current : best, freeSegments[0]);
  } else {
    chosen = freeSegments.reduce((worst, current) => current.size > worst.size ? current : worst, freeSegments[0]);
  }

  const segment = segments[chosen.index];
  const remainingSize = segment.size - size;
  segment.free = false;
  segment.pid = pid;
  segment.size = size;

  if (remainingSize > 0) {
    segments.splice(chosen.index + 1, 0, {
      start: segment.start + size,
      size: remainingSize,
      free: true,
      pid: null,
    });
  }

  log(`Allocated ${pid} with ${size} units using ${algorithm} fit.`, 'success');
  renderMemory();
}

function deallocateProcess(pid) {
  let found = false;
  segments = segments.map(segment => {
    if (!segment.free && segment.pid === pid) {
      found = true;
      return { ...segment, free: true, pid: null };
    }
    return segment;
  });

  if (!found) {
    log(`No allocated process found with ID ${pid}.`, 'error');
    return;
  }

  mergeFreeSegments();
  log(`Deallocated process ${pid} and merged free space.`, 'success');
  renderMemory();
}

function resetMemory() {
  totalMemory = Number(memorySizeInput.value) || totalMemory;
  segments = [{ start: 0, size: totalMemory, free: true, pid: null }];
  lastPid = 1;
  processIdInput.value = 'P1';
  deallocateIdInput.value = '';
  log(`Memory reset to ${totalMemory} units.`, 'success');
  renderMemory();
}

function handleAllocate() {
  const pid = processIdInput.value.trim() || `P${lastPid}`;
  const size = Number(processSizeInput.value);
  const algorithm = allocationAlgoSelect.value;

  if (!pid) {
    log('Enter a valid process ID.', 'error');
    return;
  }

  if (segments.some(segment => !segment.free && segment.pid === pid)) {
    log(`Process ID ${pid} is already in use.`, 'error');
    return;
  }

  allocateProcess(pid, size, algorithm);
  lastPid += 1;
  processIdInput.value = `P${lastPid}`;
}

allocateButton.addEventListener('click', handleAllocate);

deallocateButton.addEventListener('click', () => {
  const pid = deallocateIdInput.value.trim();
  if (!pid) {
    log('Enter a process ID to deallocate.', 'error');
    return;
  }
  deallocateProcess(pid);
});

resetButton.addEventListener('click', resetMemory);

memorySizeInput.addEventListener('change', () => {
  const newSize = Number(memorySizeInput.value);
  if (newSize < 20 || newSize > 500) {
    memorySizeInput.value = totalMemory;
    return;
  }
});

window.addEventListener('DOMContentLoaded', () => {
  renderMemory();
  log('Ready. Set memory size and allocate processes to begin.', 'success');
});
