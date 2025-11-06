// nlpgraph.js
// Plain, readable JavaScript extracted from the template.

function rnd(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function generateSpans(text) {
  const labels = ['PERSON', 'ORG', 'LOC', 'DATE', 'MISC'];
  const words = text.trim().split(/\s+/).filter(Boolean);
  const n = words.length;
  if (n === 0) return [];

  const spanCount = Math.min(Math.max(1, Math.floor(n / 3)), rnd(2, Math.min(5, n)));
  const spans = [];
  const used = new Set();

  for (let i = 0; i < spanCount; i++) {
    let s = rnd(0, n - 1);
    let maxEnd = Math.min(n - 1, s + Math.floor(n / 4));
    let e = rnd(s, maxEnd);

    // avoid identical spans
    const key = s + ':' + e;
    if (used.has(key)) {
      i--; // try again
      continue;
    }
    used.add(key);

    spans.push({
      start: s,
      end: e,
      text: words.slice(s, e + 1).join(' '),
      label: labels[rnd(0, labels.length - 1)]
    });
  }

  return spans;
}

// Build nodes and edges from spans: sentence node + entity nodes; edges for overlaps/adjacency
function buildGraph(spans) {
  const nodes = [];
  const edges = [];

  // sentence node
  nodes.push({ id: 'sentence', type: 'sentence', label: 'Sentence', text: null });

  spans.forEach((s, idx) => {
    const id = 'e' + idx;
    nodes.push({ id: id, type: 'entity', label: s.label, text: s.text, start: s.start, end: s.end });
    edges.push({ source: 'sentence', target: id });
  });

  // edges between entities if overlapping or adjacent
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      const a = spans[i], b = spans[j];
      const overlap = !(a.end < b.start || b.end < a.start);
      const adjacent = (a.end + 1 === b.start) || (b.end + 1 === a.start);
      if (overlap || adjacent) edges.push({ source: 'e' + i, target: 'e' + j });
    }
  }

  return { nodes, edges };
}

// Very small force-directed layout (CPU-light for demo)
function simulate(graph, svgEl) {
  const W = svgEl.clientWidth, H = svgEl.clientHeight;

  // initialize positions
  graph.nodes.forEach((n) => {
    n.x = W / 2 + (Math.random() - 0.5) * 200;
    n.y = H / 2 + (Math.random() - 0.5) * 120;
    n.vx = 0; n.vy = 0;
    n.r = (n.type === 'sentence') ? 18 : 14;
  });

  const nodeById = Object.fromEntries(graph.nodes.map(n => [n.id, n]));
  const springs = graph.edges.map(e => ({ source: nodeById[e.source], target: nodeById[e.target], length: 120 }));

  function step() {
    // repulsion
    for (let i = 0; i < graph.nodes.length; i++) {
      const a = graph.nodes[i];
      for (let j = i + 1; j < graph.nodes.length; j++) {
        const b = graph.nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let dist2 = dx * dx + dy * dy + 0.01;
        let dist = Math.sqrt(dist2);
        let F = 12000 / dist2;

        a.vx += (dx / dist) * F;
        a.vy += (dy / dist) * F;
        b.vx -= (dx / dist) * F;
        b.vy -= (dy / dist) * F;
      }
    }

    // springs
    springs.forEach(s => {
      let dx = s.target.x - s.source.x, dy = s.target.y - s.source.y;
      let dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
      let k = 0.03;
      let force = (dist - s.length) * k;
      let fx = (dx / dist) * force, fy = (dy / dist) * force;

      s.source.vx += fx; s.source.vy += fy;
      s.target.vx -= fx; s.target.vy -= fy;
    });

    // integrate
    graph.nodes.forEach(n => {
      // damping
      n.vx *= 0.65; n.vy *= 0.65;
      n.x += n.vx * 0.02;
      n.y += n.vy * 0.02;

      // bounds
      n.x = Math.max(20, Math.min(W - 20, n.x));
      n.y = Math.max(20, Math.min(H - 20, n.y));
    });
  }

  let running = true;

  function render() {
    // update positions before drawing
    for (let i = 0; i < 6; i++) step();

    // clear previous contents
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

    // draw edges
    graph.edges.forEach(e => {
      const s = nodeById[e.source], t = nodeById[e.target];
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', s.x);
      line.setAttribute('y1', s.y);
      line.setAttribute('x2', t.x);
      line.setAttribute('y2', t.y);
      line.setAttribute('stroke', '#c9d6e5');
      line.setAttribute('stroke-width', '2');
      svgEl.appendChild(line);
    });

    // draw nodes
    graph.nodes.forEach(n => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      // circle
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', n.x);
      c.setAttribute('cy', n.y);
      c.setAttribute('r', n.r);
      c.setAttribute('fill', n.type === 'sentence' ? '#ffd89b' : '#bfe1ff');
      c.setAttribute('stroke', '#8aaed9');
      c.setAttribute('stroke-width', '1.5');
      g.appendChild(c);

      // label
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', n.x + n.r + 6);
      t.setAttribute('y', n.y + 4);
      t.setAttribute('class', 'node-label');
      t.textContent = (n.type === 'sentence') ? 'Sentence' : `${n.label}: ${n.text}`;
      g.appendChild(t);

      svgEl.appendChild(g);
    });

    if (running) requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
  // stop after some seconds to keep CPU low
  setTimeout(() => running = false, 8000);
}

// Wire UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('analyze');
  const rndBtn = document.getElementById('random');
  const ta = document.getElementById('sentence');
  const svg = document.getElementById('svg');

  btn.addEventListener('click', () => {
    const text = ta.value.trim();
    const spans = generateSpans(text);
    const graph = buildGraph(spans);
    simulate(graph, svg);
  });

  rndBtn.addEventListener('click', () => {
    const examples = [
      'Apple acquired a small startup in Berlin last month.',
      'Marie Curie studied at the University of Paris and won a prize in 1903.',
      'The concert in Madrid featured artists from Spain and Mexico.',
      'Google opened a new office in Zurich in 2019 to expand research.'
    ];
    ta.value = examples[rnd(0, examples.length - 1)];
  });

  // run once on load
  btn.click();
});
