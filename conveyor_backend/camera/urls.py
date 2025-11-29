from django.urls import path
from . import views

urlpatterns = [
    path('process-video/', views.ProcessVideoFile.as_view(), name='process-video'),
    path('analyze/', views.ConveyorAnalysisAPI.as_view(), name='analyze'),
    path('stream/', views.StreamFrameAPIView.as_view(), name='stream'),
    path('status/', views.SystemStatusAPI.as_view(), name='status'),
    path('historical/', views.HistoricalDataAPI.as_view(), name='historical'),
]