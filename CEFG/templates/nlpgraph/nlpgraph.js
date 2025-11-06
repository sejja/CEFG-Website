// nlpgraph.js
// Plain, readable JavaScript extracted from the template.

function randomConstrained(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function generateSpans(text) {
  const labels = ['VICTIM', 'OBJECTIVE', 'FACILITATOR', 'NEGATIVE EFFECT', 'AGENT'];
  const words = text.trim().split(/\s+/).filter(Boolean);
  const n = words.length;
  const spans = [];

  if (n < 2) return [];

  const spanCount = randomConstrained(2, n);

  for (let i = 0; i < spanCount; i++) {
    let s = randomConstrained(0, n - 1);
    let maxEnd = Math.min(n - 1, s + Math.floor(n / 4));
    let e = randomConstrained(s, maxEnd);

    spans.push({
      start: s,
      end: e,
      text: words.slice(s, e + 1).join(' '),
      label: labels[randomConstrained(0, labels.length - 1)]
    });
  }

  return spans;
}

function buildGraph(spans) {
  const nodes = [];
  const edges = [];

  nodes.push({ id: 'sentence', type: 'sentence', label: 'Sentence', text: null });

  spans.forEach((s, idx) => {
    const id = 'e' + idx;
    nodes.push({ id: id, type: 'entity', label: s.label, text: s.text, start: s.start, end: s.end });
    edges.push({ source: 'sentence', target: id });
  });

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

// This is a simple force-directed layout simulation was done with assistance from ChatGPT,
// as animations are outside the scope of this project.
function simulate(graph, svgEl) {
  const W = svgEl.clientWidth, H = svgEl.clientHeight;

  graph.nodes.forEach((n) => {
    n.x = W / 2 + (Math.random() - 0.5) * 200;
    n.y = H / 2 + (Math.random() - 0.5) * 120;
    n.vx = 0; n.vy = 0;
    n.r = (n.type === 'sentence') ? 18 : 14;
  });

  const nodeById = Object.fromEntries(graph.nodes.map(n => [n.id, n]));
  const springs = graph.edges.map(e => ({ source: nodeById[e.source], target: nodeById[e.target], length: 120 }));

  function step() {
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

  function render() {
    const svgURL = 'https://www.w3.org/2000/svg';
    // update positions before drawing
    step();

    // clear previous contents
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

    // draw edges
    graph.edges.forEach(e => {
      const s = nodeById[e.source], t = nodeById[e.target];
      const line = document.createElementNS(svgURL, 'line');
      line.setAttribute('x1', s.x);
      line.setAttribute('y1', s.y);
      line.setAttribute('x2', t.x);
      line.setAttribute('y2', t.y);
      line.setAttribute('stroke', '#c9d6e5');
      line.setAttribute('stroke-width', '2');
      svgEl.appendChild(line);
    });

    graph.nodes.forEach(n => {
      const g = document.createElementNS(svgURL, 'g');
      const c = document.createElementNS(svgURL, 'circle');
      c.setAttribute('cx', n.x);
      c.setAttribute('cy', n.y);
      c.setAttribute('r', n.r);
      c.setAttribute('fill', n.type === 'sentence' ? '#ffd89b' : '#bfe1ff');
      c.setAttribute('stroke', '#8aaed9');
      c.setAttribute('stroke-width', '1.5');
      g.appendChild(c);

      const t = document.createElementNS(svgURL, 'text');
      t.setAttribute('x', n.x + n.r + 6);
      t.setAttribute('y', n.y + 4);
      t.setAttribute('class', 'node-label');
      t.textContent = (n.type === 'sentence') ? 'Sentence' : `${n.label}: ${n.text}`;
      g.appendChild(t);

      svgEl.appendChild(g);
    });

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('analyze');
  const rndBtn = document.getElementById('random');
  const ta = document.getElementById('sentence');
  const svg = document.getElementById('svg');

  btn.addEventListener('click', () => {
    const text = ta.value.trim();
    if (!text) return;
    const spans = generateSpans(text);
    const graph = buildGraph(spans);
    simulate(graph, svg);
  });

  rndBtn.addEventListener('click', () => {
    const examples = [
      'Apple acquired a small startup in Berlin last month.',
      'Marie Curie studied at the University of Paris and won a prize in 1903.',
      'The concert in Madrid featured artists from Spain and Mexico.',
      'Google opened a new office in Zurich in 2019 to expand research.',
      'Tsinghua University collaborates with MIT on AI advancements.',
      'The new policy by the government aims to improve healthcare services.',
      'Tesla is building a new factory in Texas to increase production capacity.',
      'The novel by Gabriel García Márquez explores themes of love and solitude.',
      'Peking University announced a new research center for climate studies.'
    ];
    ta.value = examples[randomConstrained(0, examples.length - 1)];
  });

  btn.click();
});
