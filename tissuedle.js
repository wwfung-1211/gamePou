(() => {
  const canvas = document.getElementById('tissue-area');
  const line = document.getElementById('tear-line');
  const left = document.getElementById('tissue-left');
  const right = document.getElementById('tissue-right');
  const feedback = document.getElementById('tissue-feedback');
  let mode = 'precision';
  let cuts = [];
  let sharingRegion = 0;
  const sharePieces = document.getElementById('sharing-pieces');
  const shareCount = document.getElementById('sharing-count');
  let points = [];
  let active = false;
  let finished = false;
  let pointer = null;
  let x = 160;
  const clamp = (n) => Math.max(0, Math.min(320, n));

  // Each cut is a top-to-bottom boundary. Gaps expose empty space between pieces.
  const gap = 10;
  const pieceShift = index => (index - cuts.length / 2) * gap;
  let viewLeft = 0;
  let viewWidth = 320;
  function boundaryX(boundary, y) {
    let i = 1;
    while (i < boundary.length - 1 && boundary[i][1] < y) i++;
    const a = boundary[i - 1];
    const b = boundary[i];
    return a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]);
  }
  function regionBounds(index, y) {
    return [index === 0 ? 0 : boundaryX(cuts[index - 1], y),
      index === cuts.length ? 320 : boundaryX(cuts[index], y)];
  }
  function regionAt(x, y) {
    for (let i = 0; i <= cuts.length; i++) {
      const [low, high] = regionBounds(i, y);
      if (x >= low + pieceShift(i) && x <= high + pieceShift(i)) return i;
    }
    return -1;
  }
  function updateSharingCount() {
    window.i18n.set(shareCount, `Pieces: ${cuts.length + 1} · Friends you can share with: ${cuts.length}`);
  }
  function renderSharing() {
    sharePieces.replaceChildren();
    viewLeft = -cuts.length * gap / 2 - 8;
    viewWidth = 320 + cuts.length * gap + 16;
    canvas.setAttribute('viewBox', `${viewLeft} 0 ${viewWidth} 320`);
    canvas.style.aspectRatio = `${viewWidth} / 320`;
    canvas.style.width = `${viewWidth}px`;
    canvas.parentElement.classList.add('sharing-panel');
    for (let index = 0; index <= cuts.length; index++) {
      // Include every bend so the rendered paper matches hit detection exactly.
      const ys = [...new Set([0, 320, ...(cuts[index - 1] || []).map(p => p[1]),
        ...(cuts[index] || []).map(p => p[1])])].sort((a, b) => a - b);
      const l = ys.map(y => [regionBounds(index, y)[0], y]);
      const r = ys.map(y => [regionBounds(index, y)[1], y]).reverse();
      const outline = [...l, ...r];
      const piece = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      piece.setAttribute('d', outline.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ') + 'Z');
      piece.setAttribute('class', 'tissue-piece shared-piece');
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('transform', `translate(${pieceShift(index)} 0)`);
      group.appendChild(piece);
      // Both adjacent pieces use the exact same edge, preserving all paper.
      for (const [edge, direction] of [[cuts[index - 1], -1], [cuts[index], 1]]) {
        if (!edge) continue;
        const fringe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        fringe.setAttribute('d', edge.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' '));
        fringe.setAttribute('class', 'tear-fringe');
        group.appendChild(fringe);
        for (const [x, y] of edge.slice(1, -1)) {
          for (let n = 0; n < 3; n++) {
            const fiber = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const length = 1 + Math.random() * 3;
            const bend = Math.random() * 3 - 1.5;
            fiber.setAttribute('d', `M${x} ${y} q${direction * length * .6} ${bend} ${direction * length} ${bend * 1.5}`);
            fiber.setAttribute('class', 'tear-fiber');
            fiber.style.opacity = .3 + Math.random() * .5;
            group.appendChild(fiber);
          }
        }
      }
      sharePieces.appendChild(group);
    }
  }
  function failSharing() {
    active = false;
    finished = true;
    window.i18n.set(feedback, 'Run complete!');
    pointer = null;
    line.setAttribute('d', '');
    window.showResults(`Empty space! Run over. You made ${cuts.length + 1} pieces to share with ${cuts.length} friends. Start a fresh tissue to try again.`);
  }
  function resetGame() {
    active = finished = false;
    pointer = null;
    points = [];
    cuts = [];
    x = 160;
    viewLeft = 0;
    viewWidth = 320;
    canvas.setAttribute('viewBox', '0 0 320 320');
    canvas.style.aspectRatio = '1';
    canvas.style.width = '';
    canvas.parentElement.classList.remove('sharing-panel');
    canvas.classList.remove('torn');
    document.getElementById('tear-fibers').replaceChildren();
    sharePieces.replaceChildren();
    left.setAttribute('d', mode === 'precision' ? 'M0 0H320V320H0Z' : '');
    right.setAttribute('d', '');
    draw();
    if (mode === 'sharing') {
      renderSharing();
      updateSharingCount();
      window.i18n.set(feedback, 'Tear inside the paper. Avoid the empty gaps!');
    } else {
      window.i18n.set(feedback, 'Fresh tissue! Start at the top edge and tear into two equal halves.');
    }
  }
  function setMode(next) {
    mode = next;
    document.getElementById('precision-mode').setAttribute('aria-pressed', mode === 'precision');
    document.getElementById('sharing-mode').setAttribute('aria-pressed', mode === 'sharing');
    document.getElementById('precision-instructions').hidden = mode !== 'precision';
    document.getElementById('sharing-instructions').hidden = mode !== 'sharing';
    shareCount.hidden = mode !== 'sharing';
    resetGame();
  }
  document.getElementById('precision-mode').addEventListener('click', () => setMode('precision'));
  document.getElementById('sharing-mode').addEventListener('click', () => setMode('sharing'));

  function draw() {
    line.setAttribute('d', points.map(([x, y], i) => `${i ? 'L' : 'M'}${x + (mode === 'sharing' ? pieceShift(sharingRegion) : 0)} ${y}`).join(' '));
  }
  function start(width) {
    x = width;
    points = [[mode === 'sharing' ? x - pieceShift(sharingRegion) : x, 0]];
    active = true;
    window.i18n.set(feedback, 'Keep tearing toward the bottom edge…');
    draw();
  }
  function advance(width, y) {
    if (mode === 'sharing') {
      width -= pieceShift(sharingRegion);
      const previous = points.at(-1);
      // Check the whole mouse segment, including gaps skipped by fast movement.
      const fromY = previous[1];
      const toY = y;
      const samples = [0, 1];
      for (const cut of cuts) {
        for (const [, cutY] of cut) {
          if (toY !== fromY) {
            const t = (cutY - fromY) / (toY - fromY);
            if (t > 0 && t < 1) samples.push(t);
          }
        }
      }
      for (const t of samples) {
        const sampleX = previous[0] + (width - previous[0]) * t;
        const sampleY = fromY + (toY - fromY) * t;
        const [low, high] = regionBounds(sharingRegion, sampleY);
        if (sampleX < low || sampleX > high) { failSharing(); return; }
      }
    }
    // A tear advances downward; backtracking cannot change an earlier cut.
    if (y > points.at(-1)[1]) points.push([width, y]);
    draw();
  }
  function finish() {
    if (!active) return;
    active = false;
    if (points.at(-1)[1] < 304) {
      points = [];
      draw();
      window.i18n.set(feedback, 'Reach the bottom edge to finish the tear. Try again from the top edge.');
      return;
    }
    if (points.at(-1)[1] < 320) points.push([points.at(-1)[0], 320]);
    if (mode === 'sharing') {
      // The new boundary must leave actual paper on both sides along its length.
      for (const [px, py] of points) {
        const [low, high] = regionBounds(sharingRegion, py);
        if (px <= low + .05 || px >= high - .05) {
          window.i18n.set(feedback, 'That tear is too close to an edge to make another piece. Try again inside the paper.');
          points = [];
          draw();
          return;
        }
      }
      const edge = [];
      const ys = [...new Set([0, 320, ...points.map(p => p[1]),
        ...(cuts[sharingRegion - 1] || []).map(p => p[1]),
        ...(cuts[sharingRegion] || []).map(p => p[1]),
        ...Array.from({length: 161}, (_, i) => i * 2)])].sort((a, b) => a - b);
      for (const y of ys) {
        const center = boundaryX(points, y);
        const [low, high] = regionBounds(sharingRegion, y);
        if (center <= low || center >= high) { failSharing(); return; }
        const amplitude = Math.min(1.2, (center - low) * .3, (high - center) * .3);
        edge.push([center + (y === 0 || y === 320 ? 0 : (Math.random() * 2 - 1) * amplitude), y]);
      }
      cuts.splice(sharingRegion, 0, edge);
      points = [];
      draw();
      renderSharing();
      updateSharingCount();
      window.i18n.set(feedback, 'Another piece to share! Pick a piece and tear again. Avoid the gaps.');
      return;
    }
    let area = 0;
    for (let i = 1; i < points.length; i++) {
      area += (points[i][1] - points[i - 1][1]) * (points[i][0] + points[i - 1][0]) / 2;
    }
    const fraction = area / (320 * 320);
    // Use unrounded areas with a steep but playable precision curve.
    const imbalance = Math.abs(2 * fraction - 1);
    // Compare the actual tear length with the direct line between its ends.
    // Extra distance from bends and zigzags reduces straightness.
    let tearLength = 0;
    for (let i = 1; i < points.length; i++) {
      tearLength += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    }
    const directLength = Math.hypot(points.at(-1)[0] - points[0][0], 320);
    const straightness = Math.min(1, directLength / tearLength);
    // Cosine of the overall angle from vertical: 1 for a vertical tear.
    const verticality = 320 / directLength;
    const score = 1 + 99 * Math.pow(1 - imbalance, 12)
      * Math.pow(straightness, 6) * Math.pow(verticality, 8);
    const displayedScore = imbalance === 0 && straightness === 1 && verticality === 1 ? '100.000' : Math.min(99.999, score).toFixed(3);
    // Add fine irregularities to the visible edge without changing scoring.
    const roughEdge = [];
    let segment = 1;
    for (let y = 0; y <= 320; y += 2) {
      while (segment < points.length - 1 && points[segment][1] < y) segment++;
      const a = points[segment - 1];
      const b = points[segment];
      const t = (y - a[1]) / (b[1] - a[1]);
      const offset = y === 0 || y === 320 ? 0 : (Math.random() - 0.5) * 3;
      roughEdge.push([clamp(a[0] + (b[0] - a[0]) * t + offset), y]);
    }
    const cut = roughEdge.map(([x, y]) => `L${x} ${y}`).join(' ');
    left.setAttribute('d', `M0 0 L${roughEdge[0][0]} 0 ${cut} L0 320Z`);
    right.setAttribute('d', `M${roughEdge[0][0]} 0 H320V320 L${roughEdge.at(-1)[0]} 320 ${roughEdge.slice().reverse().map(([x, y]) => `L${x} ${y}`).join(' ')} Z`);
    const fibers = document.getElementById('tear-fibers');
    fibers.replaceChildren();
    for (const side of [-1, 1]) {
      // A soft white fringe makes the exposed paper layers look fuzzy.
      const fringe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      fringe.setAttribute('d', roughEdge.map(([x, y], i) => `${i ? 'L' : 'M'}${x + side * 10} ${y}`).join(' '));
      fringe.setAttribute('class', 'tear-fringe');
      fibers.appendChild(fringe);
      for (const [x, y] of roughEdge.slice(1, -1)) {
        for (let i = 0; i < 3; i++) {
          const strand = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const length = 1.5 + Math.random() * 5;
          const base = x + side * (10 + Math.random());
          const startY = y + Math.random() * 2 - 1;
          const bend = Math.random() * 4 - 2;
          strand.setAttribute('d', `M${base} ${startY} q${-side * length * 0.6} ${bend} ${-side * length} ${bend + Math.random() * 2 - 1}`);
          strand.setAttribute('class', 'tear-fiber');
          strand.style.opacity = (0.25 + Math.random() * 0.5).toFixed(2);
          strand.style.strokeWidth = (0.25 + Math.random() * 0.45).toFixed(2);
          fibers.appendChild(strand);
        }
      }
    }
    line.setAttribute('d', '');
    canvas.classList.add('torn');
    finished = true;
    window.i18n.set(feedback, 'Round complete!');
    window.showResults(`Score: ${displayedScore}/100 (higher is better). Your pieces are ${(fraction * 100).toFixed(5)}% and ${((1 - fraction) * 100).toFixed(5)}% of the tissue. Straightness: ${(straightness * 100).toFixed(3)}%. Verticality: ${(verticality * 100).toFixed(3)}%. ${score >= 95 ? 'Beautifully balanced, straight and vertical!' : 'Try a fresh tissue to improve your split.'}`);
  }
  function position(event) {
    const rect = canvas.getBoundingClientRect();
    return [mode === 'sharing' ? viewLeft + (event.clientX - rect.left) / rect.width * viewWidth : clamp((event.clientX - rect.left) / rect.width * 320), clamp((event.clientY - rect.top) / rect.height * 320)];
  }
  canvas.addEventListener('pointerdown', (event) => {
    if (finished || active || !event.isPrimary || event.button !== 0) return;
    const [width, y] = position(event);
    if (mode === 'sharing') {
      sharingRegion = regionAt(width, y);
      if (sharingRegion === -1) { failSharing(); return; }
    }
    if (y > 24) {
      window.i18n.set(feedback, 'Start at the top edge of the tissue, then drag downward.');
      return;
    }
    if (mode === 'sharing' && regionAt(width, 0) !== sharingRegion) {
      window.i18n.set(feedback, 'Start on the top edge of a paper piece.');
      return;
    }
    pointer = event.pointerId;
    canvas.setPointerCapture(pointer);
    start(width);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (active && event.pointerId === pointer) advance(...position(event));
  });
  canvas.addEventListener('pointerup', (event) => {
    if (event.pointerId !== pointer) return;
    advance(...position(event));
    pointer = null;
    if (!finished) finish();
  });
  canvas.addEventListener('pointercancel', () => {
    pointer = null;
    active = false;
    points = [];
    draw();
    window.i18n.set(feedback, 'Tear interrupted. Start again at the top edge.');
  });
  canvas.addEventListener('keydown', (event) => {
    if (finished || pointer !== null || !['ArrowLeft', 'ArrowRight', 'ArrowDown', 'Enter'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Enter') {
      if (active) finish();
      else {
        if (mode === 'sharing') {
          sharingRegion = regionAt(x, 0);
          if (sharingRegion === -1) { failSharing(); return; }
        }
        start(x);
      }
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      x = clamp(x + (event.key === 'ArrowLeft' ? -8 : 8));
      draw();
    } else if (active) {
      advance(x, Math.min(320, points.at(-1)[1] + 8));
      if (active && points.at(-1)[1] === 320) finish();
    }
  });
  document.getElementById('reset-tissue').addEventListener('click', resetGame);
})();
