from django.contrib import admin
from .models import *
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
