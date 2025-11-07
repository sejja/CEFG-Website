from django.http import JsonResponse
from django.shortcuts import render
from .models import Graph, Node, Edge

import json

def home(request):
    graph = Graph.objects.first()
    nodes = graph.nodes.all()
    edges = graph.edges.all()
    graphs = Graph.objects.all().order_by('id')
    return render(request, 'index.html', {'graph': graph, 'nodes': nodes, 'edges': edges, 'graphs': graphs})

def nlp_graph(request):
    # Renders the NLP graph page
    graphs = Graph.objects.all().order_by('-id')
    return render(request, 'index.html', {'graphs': graphs})


def graphs_list(request):
    """Render a page with a list of saved graphs."""
    graphs = Graph.objects.all().order_by('-id')
    return render(request, 'graphs_list.html', {'graphs': graphs})


def graph_json(request, gid):
    """Return JSON serialization of a graph by id."""
    try:
        graph = Graph.objects.get(id=gid)
    except Graph.DoesNotExist:
        return JsonResponse({'error': 'Graph not found'}, status=404)

    nodes = []
    for n in graph.nodes.all():
        nodes.append({
            'id': n.id,
            'type': n.type,
            'text': n.text or ''
        })

    edges = []
    for e in graph.edges.all():
        edges.append({
            'source': e.from_node.id,
            'target': e.to_node.id
        })

    return JsonResponse({'graph': {'nodes': nodes, 'edges': edges}})


def graph_detail(request, gid):
    """Render a detail page for a specific graph."""
    try:
        graph = Graph.objects.get(id=gid)
    except Graph.DoesNotExist:
        from django.http import Http404
        raise Http404("Graph not found")
    
    nodes = graph.nodes.all()
    edges = graph.edges.all()
    return render(request, 'graph_properties.html', {
        'graph': graph,
        'nodes': nodes,
        'edges': edges
    })

def check_get_graph(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)
    try:
        payload = json.loads(request.body.decode('utf-8')) if request.body else {}
    except Exception as e:
        # Log and return error details for easier debugging
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': f'Invalid JSON: {str(e)}'}, status=400)

    text = payload.get('text', '').strip().lower()
    
    if not text:
        return JsonResponse({'error': 'Missing or empty "text" in request'}, status=400)
    
    # Validate text length
    if len(text) > 5000:
        return JsonResponse({'error': 'Text too long (max 5000 characters)'}, status=400)

    existing_graph = Graph.objects.filter(text=text).first()

    if not existing_graph:
        return JsonResponse({'graph': None})

    # serialize nodes
    nodes = []
    for n in existing_graph.nodes.all():
        nodes.append({
            'id': n.id,
            'type': n.type,
            'text': n.text or ''
        })

    # serialize edges
    edges = []
    for e in existing_graph.edges.all():
        edges.append({
            'source': e.from_node.id,
            'target': e.to_node.id
        })

    return JsonResponse({
        'graph': {
            'nodes': nodes,
            'edges': edges
        }
    })

def save_graph(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)
    
    try:
        # decode bytes payload safely
        data = json.loads(request.body.decode('utf-8')) if request.body else {}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': f'Invalid JSON: {str(e)}'}, status=400)
    
    text = data.get('text', '').strip().lower()
    
    if not text:
        return JsonResponse({'error': 'Missing or empty "text" in request'}, status=400)
    
    # Validate text length
    if len(text) > 5000:
        return JsonResponse({'error': 'Text too long (max 5000 characters)'}, status=400)
    
    graph_data = data.get('graph')
    if not graph_data:
        return JsonResponse({'error': 'Missing "graph" in request'}, status=400)
    
    # Validate graph structure
    if not isinstance(graph_data.get('nodes'), list) or not isinstance(graph_data.get('edges'), list):
        return JsonResponse({'error': 'Invalid graph structure'}, status=400)
    
    # Check if graph with same text already exists
    existing_graph = Graph.objects.filter(text=text).first()
    if existing_graph:
        print(f"Graph already exists with ID {existing_graph.id}. Not saving.")
        return JsonResponse({'graph_id': existing_graph.id})
    
    try:
        # Create the graph
        graph = Graph.objects.create(text=text)
        
        # Dictionary to store node objects by their id
        node_objects = {}
        
        # Create nodes
        for node_data in graph_data.get('nodes', []):
            if 'id' not in node_data or 'type' not in node_data:
                graph.delete()  # Rollback
                return JsonResponse({'error': 'Invalid node structure'}, status=400)
            
            node = Node.objects.create(
                name=node_data['id'],
                type=node_data['type'],
                text=node_data.get('text') or ''
            )
            node_objects[node_data['id']] = node
            graph.nodes.add(node)
        
        # Create edges
        for edge_data in graph_data.get('edges', []):
            if 'source' not in edge_data or 'target' not in edge_data:
                graph.delete()  # Rollback
                return JsonResponse({'error': 'Invalid edge structure'}, status=400)
            
            source_id = edge_data['source']
            target_id = edge_data['target']
            
            if source_id not in node_objects or target_id not in node_objects:
                graph.delete()  # Rollback
                return JsonResponse({'error': f'Edge references non-existent node'}, status=400)
            
            edge = Edge.objects.create(
                from_node=node_objects[source_id],
                to_node=node_objects[target_id],
                weight=edge_data.get('weight', 1.0)
            )
            graph.edges.add(edge)
        
        graph.save()
        print(f"Graph created with ID {graph.id}")
        return JsonResponse({'graph_id': graph.id, 'created': True})
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error saving graph: {str(e)}")
        # Clean up if something went wrong
        if 'graph' in locals():
            try:
                graph.delete()
            except Exception:
                pass
        return JsonResponse({'error': f'Failed to save graph: {str(e)}'}, status=500)