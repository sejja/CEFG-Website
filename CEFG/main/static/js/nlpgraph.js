// nlpgraph.js
// Plain, readable JavaScript extracted from the template.

function randomConstrained(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function print_graph(graph) {
  console.log('Nodes:');
  graph.nodes.forEach(n => {
    console.log(`  ${n.id} (${n.type}): ${n.label} [${n.text}]`);
  });
  console.log('Edges:');
  graph.edges.forEach(e => {
    console.log(`  ${e.source} -> ${e.target}`);
  });
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

function getCsrfToken() {
  // Try cookie first
  const fromCookie = getCookie('csrftoken');
  if (fromCookie) return fromCookie;
  // Fallback to meta tag (in case the cookie wasn't set)
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) return meta.getAttribute('content');
  return null;
}

function check_get_graph(text) {
  console.log('Checking for existing graph on server...');
  const normalizedText = text.trim().toLowerCase();

    return fetch('/check_get_graph/', {
    method: 'POST',
    headers: (function(){
      const headers = { 'Content-Type': 'application/json' };
      const token = getCsrfToken();
      if (token) headers['X-CSRFToken'] = token;
      return headers;
    })(),
    body: JSON.stringify({ text: normalizedText })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    if (data.error) {
      console.error('Server error:', data.error);
      return null;
    }
    if (data.graph) {
      console.log('Graph already exists on server:', data.graph);
      return data.graph;
    }
    console.log('No existing graph found.');
    return null;
  })
  .catch((error) => {
    console.error('Error checking graph:', error);
    return null;
  });
}

function save_graph(graph, text) {
  console.log('Saving graph to server...');
  const normalizedText = text.trim().toLowerCase();
  
  return fetch('/save_graph/', {
    method: 'POST',
    headers: (function(){
      const headers = { 'Content-Type': 'application/json' };
      const token = getCsrfToken();
      if (token) headers['X-CSRFToken'] = token;
      return headers;
    })(),
    body: JSON.stringify({ graph: graph, text: normalizedText })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    if (data.error) {
      console.error('Server error:', data.error);
      throw new Error(data.error);
    }
    console.log('Graph saved with ID:', data.graph_id);
    return data;
  })
  .catch((error) => {
    console.error('Error saving graph:', error);
    throw error;
  });
}

function generateSpans(text) {
  const labels = ['VICTIM', 'OBJECTIVE', 'FACILITATOR', 'NEGATIVE EFFECT', 'AGENT'];
  const words = text.trim().split(/\s+/).filter(Boolean);
  const n = words.length;

  const spanCount = Math.min(Math.max(1, Math.floor(n / 3)), randomConstrained(2, Math.min(5, n)));
  const spans = [];
  const used = new Set();

  for (let i = 0; i < spanCount; i++) {
    let s = randomConstrained(0, n - 1);
    let maxEnd = Math.min(n - 1, s + Math.floor(n / 4));
    let e = randomConstrained(s, maxEnd);

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
      label: labels[randomConstrained(0, labels.length - 1)]
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

  btn.addEventListener('click', async () => {
    const text = ta.value.trim();
    if (!text) {
      console.warn('Empty text input');
      return;
    }
    
    try {
      // Show loading state (optional)
      btn.disabled = true;
      btn.textContent = 'Analyzing...';
      
      let graph = await check_get_graph(text);
      
      if (graph == null) {
        const spans = generateSpans(text);
        graph = buildGraph(spans);
        await save_graph(graph, text);
      }
      
      simulate(graph, svg);
      print_graph(graph);
    } catch (error) {
      console.error('Failed to process graph:', error);
      alert('An error occurred while processing the graph. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Analyze';
    }
  });

  rndBtn.addEventListener('click', () => {
    const examples = [
      'Apple acquired a small startup in Berlin last month.',
      'Marie Curie studied at the University of Paris and won a prize in 1903.',
      'The concert in Madrid featured artists from Spain and Mexico.',
      'Google opened a new office in Zurich in 2019 to expand research.'
    ];
    ta.value = examples[randomConstrained(0, examples.length - 1)];
  });

  // run once on load
  btn.click();
});
