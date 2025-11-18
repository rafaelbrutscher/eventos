from django.contrib import admin
from .models import Certificado


@admin.register(Certificado)
class CertificadoAdmin(admin.ModelAdmin):
    list_display = ['participante_nome', 'evento_nome', 'gerado', 'disponivel_usuario', 'created_at']
    list_filter = ['gerado', 'disponivel_usuario', 'created_at']
    search_fields = ['participante_nome', 'evento_nome', 'participante_email', 'codigo_validacao']
    readonly_fields = ['codigo_validacao', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('evento_id', 'participante_id', 'codigo_validacao')
        }),
        ('Dados do Certificado', {
            'fields': ('participante_nome', 'participante_email', 'evento_nome')
        }),
        ('Status e Arquivo', {
            'fields': ('gerado', 'disponivel_usuario', 'arquivo_pdf', 'template_html')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )