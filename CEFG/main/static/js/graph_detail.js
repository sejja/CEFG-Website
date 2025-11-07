document.addEventListener('DOMContentLoaded', () => {
    const svg = document.getElementById('svg');
    if (!svg) return;
    
    // Get graph data from the data attributes set by Django template
    const graphDataElement = document.getElementById('graph-data');
    if (!graphDataElement) {
        console.error('Graph data element not found');
        return;
    }
    
    try {
        const nodes = JSON.parse(graphDataElement.dataset.nodes || '[]');
        const edges = JSON.parse(graphDataElement.dataset.edges || '[]');
        
        const graph = { nodes, edges };
        
        console.log('Rendering graph with', nodes.length, 'nodes and', edges.length, 'edges');
        
        // Use the simulate function from nlpgraph.js
        if (typeof simulate === 'function') {
            simulate(graph, svg);
        } else {
            console.error('simulate function not found. Make sure nlpgraph.js is loaded first.');
        }
    } catch (error) {
        console.error('Error parsing graph data:', error);
    }
});