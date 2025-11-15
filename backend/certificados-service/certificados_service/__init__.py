# Inicialização do Celery - com import seguro
try:
    from .celery import app as celery_app
    __all__ = ('celery_app',)
except ImportError:
    # Durante setup inicial, celery pode não estar disponível
    pass