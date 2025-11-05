from django.contrib import admin
from .models import Node, Edge, Graph
# Register your models here.

# Misc
admin.site.site_header = "CEFG Administration"
admin.site.site_title = "CEFG Admin Portal"
admin.site.index_title = "Welcome to CEFG Admin Portal"

# Model Registration
admin.site.register(Node)
admin.site.register(Edge)
admin.site.register(Graph)
