from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied

class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return obj == request.user

class IsActiveUser(permissions.BasePermission):
    message = "Your account is inactive"

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.is_active:
            raise PermissionDenied(self.message)
        return True
