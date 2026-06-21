from rest_framework import permissions


class IsStudent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'student'


class IsTA(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ta'


class IsHead(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'head'


class IsTAOrHead(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('ta', 'head')


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if permissions.SAFE_METHODS:
            return True
        return hasattr(obj, 'student') and obj.student == request.user


class IsAppealOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.student == request.user


class CanReviewAppeal(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('ta', 'head')

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'head':
            return True
        return request.user.role == 'ta'
