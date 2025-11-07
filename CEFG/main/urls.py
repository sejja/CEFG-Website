from django.urls import path
from . import views

app_name = 'main'

urlpatterns = [
    path('', views.home, name='home'),
    path('graphs/', views.graphs_list, name='graphs_list'),
    path('graphs/<int:gid>/', views.graph_detail, name='graph_detail'),
    path('check_get_graph/', views.check_get_graph, name='check_get_graph'),
    path('save_graph/', views.save_graph, name='save_graph'),
    path('filter/', views.filter_by_type, name='filter_by_type'),
    path('graphs/type/<str:node_type>/', views.graphs_by_type, name='graphs_by_type')
]
