// graphs_list.js
// Fetch graph JSON and show a small preview SVG in a modal when hovering a list item.

function clearSvg(svg) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

function drawPreview(graph, svg) {
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

document.addEventListener('DOMContentLoaded', ()=>{
  const list = document.getElementById('graphs-list');
  if (!list) return;
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
          if (graph) {
            drawPreview(graph, svg);
          }
        } catch (err) {
          console.error('Failed to fetch/preview graph', err);
        }
      }, 180);
    });
    item.addEventListener('mouseleave', ()=>{
      clearTimeout(hoverTimer);
    });
    // clicking navigates to graph detail page
    item.addEventListener('click', ()=>{
      const id = item.dataset.id;
      window.location.href = `/graphs/${id}/`;
    });
  });
});
