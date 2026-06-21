from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    User, Assignment, Question, GradingPoint, StudentAnswer,
    GradingPointScore, Appeal, AppealEvidence, ScoreVersion, BatchCorrection,
)


@admin.register(User)
class UserAdmin(UserAdmin):
    list_display = ('username', 'role', 'class_name', 'email', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser')
    fieldsets = UserAdmin.fieldsets + (
        ('扩展信息', {'fields': ('role', 'class_name', 'phone', 'avatar')}),
    )


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ('title', 'course_name', 'class_name', 'deadline', 'appeal_deadline', 'is_appeal_allowed')
    list_filter = ('course_name', 'class_name')
    search_fields = ('title', 'course_name')
    date_hierarchy = 'created_at'


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('assignment', 'question_no', 'max_score', 'is_subjective')
    list_filter = ('assignment', 'is_subjective')


@admin.register(GradingPoint)
class GradingPointAdmin(admin.ModelAdmin):
    list_display = ('question', 'description', 'max_score', 'sort_order')
    list_filter = ('question',)


@admin.register(StudentAnswer)
class StudentAnswerAdmin(admin.ModelAdmin):
    list_display = ('student', 'question', 'total_score', 'graded_by', 'graded_at', 'has_appeal')
    list_filter = ('has_appeal', 'graded_by')
    search_fields = ('student__username',)


@admin.register(GradingPointScore)
class GradingPointScoreAdmin(admin.ModelAdmin):
    list_display = ('student_answer', 'grading_point', 'score')


@admin.register(Appeal)
class AppealAdmin(admin.ModelAdmin):
    list_display = ('student', 'student_answer', 'status', 'submitted_at', 'reviewed_by', 'reviewed_at')
    list_filter = ('status', 'submitted_at')
    search_fields = ('student__username', 'reason')


@admin.register(AppealEvidence)
class AppealEvidenceAdmin(admin.ModelAdmin):
    list_display = ('appeal', 'description', 'created_at')


@admin.register(ScoreVersion)
class ScoreVersionAdmin(admin.ModelAdmin):
    list_display = ('student_answer', 'version_type', 'original_total_score', 'new_total_score', 'changed_at')
    list_filter = ('version_type', 'changed_at')


@admin.register(BatchCorrection)
class BatchCorrectionAdmin(admin.ModelAdmin):
    list_display = ('title', 'question', 'class_name', 'status', 'rule_type', 'adjust_value', 'affected_count', 'created_by')
    list_filter = ('status', 'rule_type', 'created_at')
    search_fields = ('title', 'description')
