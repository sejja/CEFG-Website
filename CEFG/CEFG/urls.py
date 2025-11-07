"""
URL configuration for CEFG project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from main.views import save_graph, check_get_graph

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('main.urls')),
    path('nlp-graph-static/', TemplateView.as_view(template_name='main/templates/index.html'), name='nlp_graph_static'),
    path('save_graph/', save_graph, name='save_graph'),
    path('check_get_graph/', check_get_graph, name='check_get_graph'),
]
