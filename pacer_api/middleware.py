from django.http import JsonResponse

class FirebaseAuthMiddleware:
    """
    Optional: avoid using this when DRF authentication is enabled.
    Kept for compatibility; do not add to MIDDLEWARE by default.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)