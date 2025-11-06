from django.http import JsonResponse
from django.shortcuts import render
from .models import Graph, Node, Edge

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
        print(request.body)
    # Return graph id for the js function
    r = JsonResponse({'graph_id': 1})
    return r