from django.apps import AppConfig


class PacerConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pacer_api'
    
    def ready(self):
        # Import signals on app ready
        from . import signals  # noqa: F401
