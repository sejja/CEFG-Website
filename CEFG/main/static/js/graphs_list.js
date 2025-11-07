// graphs_list.js
// Fetch graph JSON and show a small preview SVG in a modal when hovering a list item.

async function fetchGraphJson(id) {
  const res = await fetch(`/graphs/${id}/json/`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.graph;
}

function clearSvg(svg) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

function drawPreview(graph, svg) {
  // simple circular layout
  clearSvg(svg);
  const w = parseInt(svg.getAttribute('width') || svg.clientWidth || 320, 10);
  const h = parseInt(svg.getAttribute('height') || svg.clientHeight || 200, 10);
  const cx = w/2, cy = h/2, r = Math.min(w,h)/3;
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  const N = nodes.length;
  const positions = {};

  nodes.forEach((n,i)=>{
    const angle = (i / Math.max(1,N)) * Math.PI * 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    positions[n.id] = {x,y};
  });

  // draw edges
  edges.forEach(e=>{
    const a = positions[e.source], b = positions[e.target];
    if(!a||!b) return;
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1', a.x);
    line.setAttribute('y1', a.y);
    line.setAttribute('x2', b.x);
    line.setAttribute('y2', b.y);
    line.setAttribute('stroke', '#c9d6e5');
    line.setAttribute('stroke-width', '1.6');
    svg.appendChild(line);
  });

  // draw nodes
  nodes.forEach(n=>{
    const p = positions[n.id];
    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('cx', p.x);
    circle.setAttribute('cy', p.y);
    circle.setAttribute('r', 10);
    circle.setAttribute('fill', n.type === 'sentence' ? '#ffd89b' : '#bfe1ff');
    circle.setAttribute('stroke', '#8aaed9');
    circle.setAttribute('stroke-width','1');
    svg.appendChild(circle);

    const label = document.createElementNS('http://www.w3.org/2000/svg','text');
    label.setAttribute('x', p.x + 12);
    label.setAttribute('y', p.y + 4);
    label.setAttribute('font-size','10');
    label.setAttribute('font-family','Arial,Helvetica,sans-serif');
    label.textContent = n.type === 'sentence' ? 'Sentence' : n.label;
    svg.appendChild(label);
  });
}

function showModalAt(modal, x, y) {
  modal.style.display = 'block';
  modal.setAttribute('aria-hidden','false');
  // position modal near x,y but keep inside viewport
  const box = modal.querySelector('.preview-box');
  const pad = 8;
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = x + 12;
  let top = y + 12;
  const rect = box.getBoundingClientRect();
  const bw = rect.width || 340, bh = rect.height || 220;
  if (left + bw + pad > vw) left = x - bw - 12;
  if (top + bh + pad > vh) top = y - bh - 12;
  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
}

function hideModal(modal) {
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden','true');
}

document.addEventListener('DOMContentLoaded', ()=>{
  const list = document.getElementById('graphs-list');
  if (!list) return;
  const modal = document.getElementById('preview-modal');
  const svg = document.getElementById('preview-svg');
  let fetchCache = {};
  let hoverTimer = null;

  list.querySelectorAll('.graph-item').forEach(item=>{
    item.addEventListener('mouseenter', async (ev)=>{
      const id = item.dataset.id;
      // small delay to avoid rapid requests
      hoverTimer = setTimeout(async ()=>{
        try {
          let graph = fetchCache[id];
          if (!graph) {
            graph = await fetchGraphJson(id);
            fetchCache[id] = graph;
          }
          drawPreview(graph, svg);
          showModalAt(modal, ev.clientX, ev.clientY);
        } catch (err) {
          console.error('Failed to fetch/preview graph', err);
        }
      }, 180);
    });
    item.addEventListener('mousemove', (ev)=>{
      if (modal.style.display !== 'none') showModalAt(modal, ev.clientX, ev.clientY);
    });
    item.addEventListener('mouseleave', ()=>{
      clearTimeout(hoverTimer);
      hideModal(modal);
    });
    // clicking could open a details view; left as a TODO
    item.addEventListener('click', ()=>{
      window.location.href = `/graphs/`;
    });
  });

  // hide modal when clicking outside
  document.addEventListener('click', (ev)=>{
    if (!modal.contains(ev.target)) hideModal(modal);
  });
});
