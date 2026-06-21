from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Assignment, Question, GradingPoint, StudentAnswer, GradingPointScore,
    Appeal, AppealEvidence, ScoreVersion, BatchCorrection,
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'class_name', 'phone', 'is_staff')
        read_only_fields = ('id', 'username', 'is_staff')


class UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'role', 'class_name')


class GradingPointSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradingPoint
        fields = '__all__'


class QuestionSerializer(serializers.ModelSerializer):
    grading_points = GradingPointSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = '__all__'
        read_only_fields = ('created_at',)


class AssignmentSerializer(serializers.ModelSerializer):
    created_by_info = UserBriefSerializer(source='created_by', read_only=True)
    is_appeal_allowed = serializers.BooleanField(read_only=True)
    questions_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Assignment
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class AssignmentListSerializer(serializers.ModelSerializer):
    created_by_info = UserBriefSerializer(source='created_by', read_only=True)
    is_appeal_allowed = serializers.BooleanField(read_only=True)
    questions_count = serializers.SerializerMethodField()

    def get_questions_count(self, obj):
        return obj.questions.count()

    class Meta:
        model = Assignment
        fields = ('id', 'title', 'course_name', 'class_name', 'deadline', 'appeal_deadline',
                  'created_by_info', 'is_appeal_allowed', 'questions_count', 'created_at')


class GradingPointScoreSerializer(serializers.ModelSerializer):
    grading_point_info = GradingPointSerializer(source='grading_point', read_only=True)

    class Meta:
        model = GradingPointScore
        fields = '__all__'


class StudentAnswerSerializer(serializers.ModelSerializer):
    student_info = UserBriefSerializer(source='student', read_only=True)
    question_info = QuestionSerializer(source='question', read_only=True)
    graded_by_info = UserBriefSerializer(source='graded_by', read_only=True)
    point_scores = GradingPointScoreSerializer(many=True, read_only=True)
    score_versions_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = StudentAnswer
        fields = '__all__'
        read_only_fields = ('submitted_at',)


class StudentAnswerListSerializer(serializers.ModelSerializer):
    student_info = UserBriefSerializer(source='student', read_only=True)
    question_no = serializers.IntegerField(source='question.question_no', read_only=True)
    question_max_score = serializers.DecimalField(source='question.max_score', max_digits=10, decimal_places=2, read_only=True)
    assignment_title = serializers.CharField(source='question.assignment.title', read_only=True)

    class Meta:
        model = StudentAnswer
        fields = ('id', 'student', 'student_info', 'question', 'question_no', 'question_max_score',
                  'assignment_title', 'total_score', 'graded_at', 'has_appeal', 'affected_by_batch')


class AppealEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppealEvidence
        fields = '__all__'
        read_only_fields = ('created_at',)


class AppealSerializer(serializers.ModelSerializer):
    student_info = UserBriefSerializer(source='student', read_only=True)
    reviewed_by_info = UserBriefSerializer(source='reviewed_by', read_only=True)
    evidences = AppealEvidenceSerializer(many=True, read_only=True)
    student_answer_info = StudentAnswerListSerializer(source='student_answer', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Appeal
        fields = '__all__'
        read_only_fields = ('submitted_at', 'reviewed_at', 'status')


class AppealListSerializer(serializers.ModelSerializer):
    student_info = UserBriefSerializer(source='student', read_only=True)
    reviewed_by_info = UserBriefSerializer(source='reviewed_by', read_only=True)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    question_no = serializers.IntegerField(source='student_answer.question.question_no', read_only=True)
    assignment_title = serializers.CharField(source='student_answer.question.assignment.title', read_only=True)
    original_score = serializers.DecimalField(source='student_answer.total_score', max_digits=10, decimal_places=2, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    evidences_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Appeal
        fields = ('id', 'student', 'student_info', 'student_name', 'student_answer', 'question_no',
                  'assignment_title', 'reason', 'status', 'status_display', 'original_score', 'new_total_score',
                  'reviewed_by', 'reviewed_by_info', 'submitted_at', 'reviewed_at', 'related_batch', 'evidences_count')


class ScoreVersionSerializer(serializers.ModelSerializer):
    changed_by_info = UserBriefSerializer(source='changed_by', read_only=True)
    version_type_display = serializers.CharField(source='get_version_type_display', read_only=True)
    score_diff = serializers.SerializerMethodField()

    def get_score_diff(self, obj):
        return float(obj.new_total_score) - float(obj.original_total_score)

    class Meta:
        model = ScoreVersion
        fields = '__all__'
        read_only_fields = ('changed_at',)


class BatchCorrectionSerializer(serializers.ModelSerializer):
    created_by_info = UserBriefSerializer(source='created_by', read_only=True)
    question_info = QuestionSerializer(source='question', read_only=True)
    affected_grading_point_info = GradingPointSerializer(source='affected_grading_point', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    rule_type_display = serializers.CharField(source='get_rule_type_display', read_only=True)
    related_appeals_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = BatchCorrection
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'affected_count', 'executed_at', 'rolled_back_at')


class BatchCorrectionListSerializer(serializers.ModelSerializer):
    created_by_info = UserBriefSerializer(source='created_by', read_only=True)
    question_no = serializers.IntegerField(source='question.question_no', read_only=True)
    assignment_title = serializers.CharField(source='question.assignment.title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    rule_type_display = serializers.CharField(source='get_rule_type_display', read_only=True)

    class Meta:
        model = BatchCorrection
        fields = ('id', 'title', 'description', 'question', 'question_no', 'assignment_title',
                  'class_name', 'created_by', 'created_by_info', 'status', 'status_display',
                  'rule_type', 'rule_type_display', 'adjust_value', 'affected_count',
                  'executed_at', 'rolled_back_at', 'created_at')


class AppealReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    review_comment = serializers.CharField(required=True, max_length=2000)
    new_point_scores = serializers.DictField(required=False,
        help_text='{grading_point_id: score} 评分点新得分')
    new_total_score = serializers.DecimalField(required=False, max_digits=10, decimal_places=2)
