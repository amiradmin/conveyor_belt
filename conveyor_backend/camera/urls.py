# camera/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for CRUD viewsets
router = DefaultRouter()
router.register(r'cameras', views.CameraViewSet, basename='camera')
router.register(r'conveyor-belts', views.ConveyorBeltViewSet, basename='conveyorbelt')
router.register(r'alerts', views.AlertViewSet, basename='alert')

urlpatterns = [
    # Your existing endpoints
    path('process-video/', views.ProcessVideoFile.as_view(), name='process-video'),
    path('analyze/', views.ConveyorAnalysisAPI.as_view(), name='analyze'),
    path('stream/', views.StreamFrameAPIView.as_view(), name='stream'),
    path('status/', views.SystemStatusAPI.as_view(), name='status'),
    path('historical/', views.HistoricalDataAPI.as_view(), name='historical'),

    # New CRUD API endpoints
    path('', include(router.urls)),

    # Additional custom endpoints
    path('dashboard/stats/', views.DashboardStatsAPI.as_view(), name='dashboard-stats'),
    path('cameras/<int:camera_id>/belts/', views.CameraBeltsAPI.as_view(), name='camera-belts'),
    path('alerts/unresolved/', views.UnresolvedAlertsAPI.as_view(), name='unresolved-alerts'),
]