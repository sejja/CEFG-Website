from django.contrib import admin
from .models import *
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.db.models.signals import post_migrate
from django.dispatch import receiver
# Register your models here.

# Misc
admin.site.site_header = "CEFG Administration"
admin.site.site_title = "CEFG Admin Portal"
admin.site.index_title = "Welcome to CEFG Admin Portal"

# Model Registration
admin.site.register(Node)
admin.site.register(Edge)
admin.site.register(Graph)

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'subject', 'created_at', 'is_read')
    list_filter = ('is_read', 'created_at')
    search_fields = ('name', 'email', 'subject', 'message')
    readonly_fields = ('name', 'email', 'subject', 'message', 'created_at')
    list_per_page = 25
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Contact Information', {
            'fields': ('name', 'email', 'created_at')
        }),
        ('Message Details', {
            'fields': ('subject', 'message', 'is_read')
        }),
    )
    
    actions = ['mark_as_read', 'mark_as_unread']
    
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f'{updated} message(s) marked as read.')
    mark_as_read.short_description = "Mark selected messages as read"
    
    def mark_as_unread(self, request, queryset):
        updated = queryset.update(is_read=False)
        self.message_user(request, f'{updated} message(s) marked as unread.')
    mark_as_unread.short_description = "Mark selected messages as unread"


# Función para crear grupos de usuarios con permisos
def create_user_groups(sender, **kwargs):
    """
    Crear grupos de usuarios con diferentes permisos:
    - Message Managers: Pueden ver, editar y eliminar mensajes
    - Graph Managers: Pueden gestionar grafos, nodos y edges
    """
    
    # Obtener content types
    message_ct = ContentType.objects.get_for_model(Message)
    graph_ct = ContentType.objects.get_for_model(Graph)
    node_ct = ContentType.objects.get_for_model(Node)
    edge_ct = ContentType.objects.get_for_model(Edge)
    
    # Grupo: Message Managers
    message_managers, created = Group.objects.get_or_create(name='Message Managers')
    if created:
        permissions = Permission.objects.filter(
            content_type=message_ct,
            codename__in=['view_message', 'change_message', 'delete_message']
        )
        message_managers.permissions.set(permissions)
    
    # Grupo: Graph Managers
    graph_managers, created = Group.objects.get_or_create(name='Graph Managers')
    if created:
        permissions = Permission.objects.filter(
            content_type__in=[graph_ct, node_ct, edge_ct]
        )
        graph_managers.permissions.set(permissions)

# Conectar la señal post_migrate
post_migrate.connect(create_user_groups, sender=admin)
