import traceback
import json
from django.http import JsonResponse, Http404
from django.shortcuts import render
from django.db import models
from django.views.decorators.csrf import ensure_csrf_cookie

from .models import Graph, Node, Edge

@ensure_csrf_cookie
def home(request):
    try :
        graph = Graph.objects.first()
        nodes = graph.nodes.all()
        edges = graph.edges.all()
        graphs = Graph.objects.all().order_by('id')
        return render(request, 'index.html', {'graph': graph, 'nodes': nodes, 'edges': edges, 'graphs': graphs})
    except Exception as e:
        return render(request, 'index.html', {'error': 'An error occurred'})

def graphs_list(request):
    try:
        graphs = Graph.objects.all().order_by('id')
        return render(request, 'graphs_list.html', {'graphs': graphs})
    except Exception as e:
        print("Error in graphs_list view:", e)
        traceback.print_exc()
        return render(request, 'graphs_list.html', {'error': 'An error occurred'})
    
def graph_json(_, gid):
    try:
        graph = Graph.objects.get(id=gid)

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
    except Graph.DoesNotExist:
        return JsonResponse({'error': 'Graph not found'}, status=404)


def graph_detail(request, gid):
    try:
        graph = Graph.objects.get(id=gid)
    except Graph.DoesNotExist:
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
        traceback.print_exc()
        return JsonResponse({'error': f'Invalid JSON: {str(e)}'}, status=400)

    text = payload.get('text', '').strip().lower()
    
    if not text:
        return JsonResponse({'error': 'Missing or empty "text" in request'}, status=400)
    
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
        raw_body = request.body.decode('utf-8') if request.body else '{}'
        data = json.loads(raw_body)
    except Exception as e:
        return JsonResponse({'error': f'Invalid JSON: {str(e)}'}, status=400)
    
    text = data.get('text', '').strip().lower()

    if not text:
        return JsonResponse({'error': 'Missing or empty "text" in request'}, status=400)
    
    if len(text) > 5000:
        return JsonResponse({'error': 'Text too long (max 5000 characters)'}, status=400)
    
    graph_data = data.get('graph')
    if not graph_data:
        return JsonResponse({'error': 'Missing "graph" in request'}, status=400)
    
    if not isinstance(graph_data.get('nodes'), list) or not isinstance(graph_data.get('edges'), list):
        return JsonResponse({'error': 'Invalid graph structure'}, status=400)
    
    existing_graph = Graph.objects.filter(text=text).first()
    if existing_graph:
        return JsonResponse({'graph_id': existing_graph.id})
    
    try:
        graph = Graph.objects.create(text=text)
        node_objects = {}
        max_node_id = Node.objects.aggregate(models.Max('id'))['id__max'] or 0

        for i, node_data in enumerate(graph_data.get('nodes', []), start=1):
            if 'id' not in node_data:
                graph.delete()
                return JsonResponse({'error': 'Invalid node structure: missing id'}, status=400)
            
            new_node_id = max_node_id + i
            node_type = node_data.get('type') or node_data.get('label') or 'unknown'
            node_text = node_data.get('text') or ''
            
            node = Node.objects.create(
                id=new_node_id,
                type=node_type,
                text=node_text
            )
            node_objects[node_data['id']] = node
            graph.nodes.add(node)
        
        for edge_data in graph_data.get('edges', []):
            if 'source' not in edge_data or 'target' not in edge_data:
                graph.delete()
                return JsonResponse({'error': 'Invalid edge structure'}, status=400)
            
            source_id = edge_data['source']
            target_id = edge_data['target']
            
            if source_id not in node_objects or target_id not in node_objects:
                graph.delete()
                return JsonResponse({'error': f'Edge references non-existent node: {source_id} -> {target_id}'}, status=400)
            
            edge = Edge.objects.create(
                from_node=node_objects[source_id],
                to_node=node_objects[target_id],
                weight=edge_data.get('weight', 1.0)
            )
            graph.edges.add(edge)
        
        graph.save()
        return JsonResponse({'graph_id': graph.id, 'created': True})
        
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({'error': f'Failed to save graph: {str(e)}'}, status=500)
    
def filter_by_type(request):
    node_types = Node.objects.values_list('type', flat=True).distinct().order_by('type')
    
    return render(request, 'filter_by_type.html', {
        'node_types': node_types
    })

def graphs_by_type(_, node_type):
    try:
        nodes_of_type = Node.objects.filter(type=node_type)
        graphs = Graph.objects.filter(nodes__in=nodes_of_type).distinct().order_by('id')
        
        graph_list = []
        for graph in graphs:
            graph_list.append({
                'id': graph.id,
                'text': graph.text,
                'node_count': graph.nodes.count(),
                'edge_count': graph.edges.count()
            })
        
        return JsonResponse({
            'node_type': node_type,
            'count': len(graph_list),
            'graphs': graph_list
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

def filter_by_node_count(request):
    """Display the filter by node count page"""
    graphs = Graph.objects.all().order_by('id')
    node_counts = set()
    for graph in graphs:
        node_counts.add(graph.nodes.count())
    
    node_counts = sorted(list(node_counts))
    
    return render(request, 'filter_by_node_count.html', {
        'node_counts': node_counts
    })

def graphs_by_node_count(_, node_count):
    """Return graphs with a specific number of nodes"""
    try:
        graphs = Graph.objects.all().order_by('id')
        
        graph_list = []
        for graph in graphs:
            if graph.nodes.count() == node_count:
                graph_list.append({
                    'id': graph.id,
                    'text': graph.text,
                    'node_count': graph.nodes.count(),
                    'edge_count': graph.edges.count()
                })
        
        return JsonResponse({
            'node_count': node_count,
            'count': len(graph_list),
            'graphs': graph_list
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)