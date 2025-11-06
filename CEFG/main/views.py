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