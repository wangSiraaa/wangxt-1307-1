from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()

from core.views import (
    UserViewSet, AssignmentViewSet, QuestionViewSet, GradingPointViewSet,
    StudentAnswerViewSet, AppealViewSet, ScoreVersionViewSet,
    BatchCorrectionViewSet, AppealEvidenceViewSet,
)

router.register(r'users', UserViewSet)
router.register(r'assignments', AssignmentViewSet)
router.register(r'questions', QuestionViewSet)
router.register(r'grading-points', GradingPointViewSet)
router.register(r'student-answers', StudentAnswerViewSet)
router.register(r'appeals', AppealViewSet)
router.register(r'appeal-evidences', AppealEvidenceViewSet)
router.register(r'score-versions', ScoreVersionViewSet)
router.register(r'batch-corrections', BatchCorrectionViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/appeals/<int:pk>/submit/', AppealViewSet.as_view({'post': 'submit_appeal'}), name='appeal-submit'),
    path('api/appeals/<int:pk>/review/', AppealViewSet.as_view({'post': 'review'}), name='appeal-review'),
    path('api/batch-corrections/<int:pk>/execute/', BatchCorrectionViewSet.as_view({'post': 'execute'}), name='batchcorrection-execute'),
    path('api/batch-corrections/<int:pk>/rollback/', BatchCorrectionViewSet.as_view({'post': 'rollback'}), name='batchcorrection-rollback'),
    path('api/auth/me/', UserViewSet.as_view({'get': 'me'}), name='auth-me'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
