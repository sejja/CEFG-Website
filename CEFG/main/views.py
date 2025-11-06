from django.http import JsonResponse
from django.shortcuts import render
from .models import Graph, Node, Edge

import json

# Create your views here.
def home(request):
    # Renders a graph
    graph = Graph.objects.first()  # Get the first graph
    # get all nodes and edges related to the graph
    nodes = graph.nodes.all()
    edges = graph.edges.all()
    return render(request, 'main.html', {'graph': graph, 'nodes': nodes, 'edges': edges})

def nlp_graph(request):
    # Renders the NLP graph page
    return render(request, 'index.html')

def save_graph(request):
    print("Saving graph...")
    # Function to add the created graph to the database
    if request.method == 'POST':
        data = json.loads(request.body)
    print("Graph data received:", data)
    # Check if graph with same text already exists
    existing_graphs = Graph.objects.filter(text=data.get('text', ''))
    if existing_graphs.exists():
        print("Graph already exists. Not saving.")
        return JsonResponse({'graph_id': existing_graphs.first().id})
    
    # Create the graph
    graph = Graph.objects.create(text=data.get('text', ''))
    
    # Dictionary to store node objects by their id
    node_objects = {}
    
    # Create nodes
    for node_data in data.get('nodes', []):
        node = Node.objects.create(
            name=node_data['id'],
            entity=node_data.get('label', ''),
            type=node_data['type'],
            text=node_data.get('text', '') or ''
        )
        node_objects[node_data['id']] = node
        graph.nodes.add(node)
    
    # Create edges
    for edge_data in data.get('edges', []):
        source_node = node_objects[edge_data['source']]
        target_node = node_objects[edge_data['target']]
        
        edge = Edge.objects.create(
            from_node=source_node,
            to_node=target_node,
            weight=1.0  # TODO: Default weight since it's not in the data
        )
        graph.edges.add(edge)
    
    graph.save()
        
    # Return graph id for the js function
    r = JsonResponse({'graph_id': graph.id})
    return r