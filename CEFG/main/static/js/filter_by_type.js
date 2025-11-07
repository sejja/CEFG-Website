document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('type-select');
    const resultsContainer = document.getElementById('results-container');
    
    if (!select || !resultsContainer) return;
    
    select.addEventListener('change', async (event) => {
        const selectedType = event.target.value;
        
        if (!selectedType) {
            resultsContainer.innerHTML = '<p class="empty-state">Select a node type to see matching graphs.</p>';
            return;
        }
        
        // Show loading state
        resultsContainer.innerHTML = '<p class="loading-state">Loading graphs...</p>';
        
        try {
            const response = await fetch(`/filter/?node_type=${encodeURIComponent(selectedType)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                resultsContainer.innerHTML = `<p class="empty-state">Error: ${data.error}</p>`;
                return;
            }
            
            displayResults(data);
            
        } catch (error) {
            console.error('Error fetching graphs:', error);
            resultsContainer.innerHTML = '<p class="empty-state">Failed to load graphs. Please try again.</p>';
        }
    });
    
    function displayResults(data) {
        if (!data.graphs || data.graphs.length === 0) {
            resultsContainer.innerHTML = `<p class="empty-state">No graphs found containing nodes of type "${data.node_type}".</p>`;
            return;
        }
        
        const header = document.createElement('div');
        header.className = 'results-header';
        header.textContent = `Found ${data.count} graph${data.count !== 1 ? 's' : ''} with "${data.node_type}" nodes`;
        
        const list = document.createElement('ul');
        list.className = 'results-list';
        
        data.graphs.forEach(graph => {
            const item = document.createElement('li');
            item.className = 'graph-result-item';
            item.dataset.id = graph.id;
            
            item.innerHTML = `
                <strong>Graph #${graph.id}</strong>
                <div class="graph-text">${escapeHtml(graph.text)}</div>
                <div class="graph-meta">${graph.node_count} nodes, ${graph.edge_count} edges</div>
            `;
            
            item.addEventListener('click', () => {
                window.location.href = `/graphs/${graph.id}/`;
            });
            
            list.appendChild(item);
        });
        
        resultsContainer.innerHTML = '';
        resultsContainer.appendChild(header);
        resultsContainer.appendChild(list);
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});