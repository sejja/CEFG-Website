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
})