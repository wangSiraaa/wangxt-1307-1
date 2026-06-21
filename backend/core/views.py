from django.db import transaction
from django.db.models import Count, Q, F, Sum
from django.utils import timezone
from decimal import Decimal

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import (
    User, Assignment, Question, GradingPoint, StudentAnswer, GradingPointScore,
    Appeal, AppealEvidence, ScoreVersion, BatchCorrection,
)
from .serializers import (
    UserSerializer, UserBriefSerializer, AssignmentSerializer, AssignmentListSerializer,
    QuestionSerializer, GradingPointSerializer, StudentAnswerSerializer,
    StudentAnswerListSerializer, GradingPointScoreSerializer,
    AppealSerializer, AppealListSerializer, AppealEvidenceSerializer,
    ScoreVersionSerializer, BatchCorrectionSerializer, BatchCorrectionListSerializer,
    AppealReviewSerializer,
)
from .permissions import (
    IsStudent, IsTA, IsHead, IsTAOrHead, IsAppealOwner, CanReviewAppeal,
)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        data = serializer.data
        data['role_display'] = request.user.get_role_display()
        return Response(data)

    @action(detail=False, methods=['get'])
    def tas(self, request):
        users = User.objects.filter(role='ta')
        serializer = UserBriefSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def students(self, request):
        class_name = request.query_params.get('class_name')
        queryset = User.objects.filter(role='student')
        if class_name:
            queryset = queryset.filter(class_name=class_name)
        serializer = UserBriefSerializer(queryset, many=True)
        return Response(serializer.data)


class AssignmentViewSet(viewsets.ModelViewSet):
    queryset = Assignment.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['list']:
            return AssignmentListSerializer
        return AssignmentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'student':
            qs = qs.filter(class_name=user.class_name)
        course = self.request.query_params.get('course_name')
        class_name = self.request.query_params.get('class_name')
        if course:
            qs = qs.filter(course_name__icontains=course)
        if class_name:
            qs = qs.filter(class_name=class_name)
        return qs.annotate(questions_count=Count('questions'))

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        assignment_id = self.request.query_params.get('assignment')
        if assignment_id:
            qs = qs.filter(assignment_id=assignment_id)
        return qs


class GradingPointViewSet(viewsets.ModelViewSet):
    queryset = GradingPoint.objects.all()
    serializer_class = GradingPointSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        question_id = self.request.query_params.get('question')
        if question_id:
            qs = qs.filter(question_id=question_id)
        return qs


class StudentAnswerViewSet(viewsets.ModelViewSet):
    queryset = StudentAnswer.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['list']:
            return StudentAnswerListSerializer
        return StudentAnswerSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'student':
            qs = qs.filter(student=user)
        assignment_id = self.request.query_params.get('assignment')
        student_id = self.request.query_params.get('student')
        question_id = self.request.query_params.get('question')
        class_name = self.request.query_params.get('class_name')
        if assignment_id:
            qs = qs.filter(question__assignment_id=assignment_id)
        if student_id:
            qs = qs.filter(student_id=student_id)
        if question_id:
            qs = qs.filter(question_id=question_id)
        if class_name:
            qs = qs.filter(student__class_name=class_name)
        return qs.annotate(score_versions_count=Count('score_versions'))

    @action(detail=False, methods=['get'])
    def my_answers(self, request):
        user = request.user
        assignment_id = request.query_params.get('assignment')
        qs = self.get_queryset().filter(student=user)
        if assignment_id:
            qs = qs.filter(question__assignment_id=assignment_id)
        page = self.paginate_queryset(qs)
        serializer = StudentAnswerListSerializer(page or qs, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)


class AppealViewSet(viewsets.ModelViewSet):
    queryset = Appeal.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['list']:
            return AppealListSerializer
        if self.action == 'review':
            return AppealReviewSerializer
        return AppealSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'student':
            qs = qs.filter(student=user)
        status = self.request.query_params.get('status')
        assignment_id = self.request.query_params.get('assignment')
        student_id = self.request.query_params.get('student')
        if status:
            qs = qs.filter(status=status)
        if assignment_id:
            qs = qs.filter(student_answer__question__assignment_id=assignment_id)
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs.annotate(evidences_count=Count('evidences'))

    def get_permissions(self):
        if self.action in ['create', 'submit_appeal']:
            return [IsStudent()]
        if self.action == 'review':
            return [CanReviewAppeal()]
        return [permissions.IsAuthenticated()]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        user = request.user
        student_answer_id = request.data.get('student_answer')
        reason = request.data.get('reason')
        if not student_answer_id or not reason:
            return Response({'detail': '缺少必要参数'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            answer = StudentAnswer.objects.select_for_update().get(id=student_answer_id, student=user)
        except StudentAnswer.DoesNotExist:
            return Response({'detail': '答题记录不存在'}, status=status.HTTP_404_NOT_FOUND)

        assignment = answer.question.assignment
        if not assignment.is_appeal_allowed:
            return Response({'detail': '已超过申诉期限，无法提交申诉'}, status=status.HTTP_400_BAD_REQUEST)

        if not answer.question.is_subjective:
            return Response({'detail': '客观题不支持申诉'}, status=status.HTTP_400_BAD_REQUEST)

        if answer.appeals.filter(status__in=['pending', 'reviewing']).exists():
            return Response({'detail': '已有待处理的申诉，请等待处理结果'}, status=status.HTTP_400_BAD_REQUEST)

        appeal = Appeal.objects.create(
            student_answer=answer,
            student=user,
            reason=reason,
            status=Appeal.STATUS_PENDING,
        )
        answer.has_appeal = True
        answer.save(update_fields=['has_appeal'])

        evidences_data = request.FILES
        for key in evidences_data:
            desc = request.data.get(f'{key}_desc', '证据文件')
            file_obj = evidences_data[key]
            if key.startswith('image'):
                AppealEvidence.objects.create(appeal=appeal, description=desc, image=file_obj)
            else:
                AppealEvidence.objects.create(appeal=appeal, description=desc, file=file_obj)

        serializer = AppealSerializer(appeal)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[CanReviewAppeal])
    @transaction.atomic
    def review(self, request, pk=None):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        action = data['action']
        review_comment = data['review_comment']

        try:
            appeal = Appeal.objects.select_for_update().get(pk=pk)
        except Appeal.DoesNotExist:
            return Response({'detail': '申诉不存在'}, status=status.HTTP_404_NOT_FOUND)

        if appeal.status not in [Appeal.STATUS_PENDING, Appeal.STATUS_REVIEWING]:
            return Response({'detail': '该申诉已处理，不能再次复核'}, status=status.HTTP_400_BAD_REQUEST)

        answer = StudentAnswer.objects.select_for_update().get(pk=appeal.student_answer_id)
        original_total = answer.total_score

        score_snapshot = {}
        point_scores = answer.point_scores.all()
        for ps in point_scores:
            score_snapshot[str(ps.grading_point_id)] = {
                'score': float(ps.score),
                'comment': ps.comment or ''
            }

        if action == 'approve':
            appeal.status = Appeal.STATUS_APPROVED
            new_point_scores = data.get('new_point_scores', {})
            new_total = data.get('new_total_score')

            if new_point_scores:
                total = Decimal('0')
                for gp_id_str, new_score in new_point_scores.items():
                    gp_id = int(gp_id_str)
                    try:
                        gp_score = GradingPointScore.objects.get(
                            student_answer=answer, grading_point_id=gp_id
                        )
                        gp_score.score = Decimal(str(new_score))
                        gp_score.save()
                        total += gp_score.score
                    except GradingPointScore.DoesNotExist:
                        continue
                if new_total is None:
                    new_total = total
            if new_total is not None:
                answer.total_score = Decimal(str(new_total))
            answer.save()
            appeal.new_total_score = answer.total_score

            ScoreVersion.objects.create(
                student_answer=answer,
                version_type=ScoreVersion.TYPE_APPEAL,
                original_total_score=original_total,
                new_total_score=answer.total_score,
                changed_by=request.user,
                reason=f'申诉通过修改分数：{review_comment[:100]}',
                appeal=appeal,
                score_details_snapshot=score_snapshot,
            )

        elif action == 'reject':
            appeal.status = Appeal.STATUS_REJECTED

        appeal.reviewed_by = request.user
        appeal.reviewed_at = timezone.now()
        appeal.review_comment = review_comment
        appeal.save()

        result_serializer = AppealSerializer(appeal)
        return Response(result_serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsStudent])
    def submit_appeal(self, request, pk=None):
        try:
            appeal = Appeal.objects.get(pk=pk, student=request.user)
        except Appeal.DoesNotExist:
            return Response({'detail': '申诉不存在'}, status=status.HTTP_404_NOT_FOUND)
        if appeal.status != Appeal.STATUS_PENDING:
            return Response({'detail': '只能提交待处理状态的申诉'}, status=status.HTTP_400_BAD_REQUEST)
        appeal.status = Appeal.STATUS_REVIEWING
        appeal.save()
        serializer = AppealSerializer(appeal)
        return Response(serializer.data)


class AppealEvidenceViewSet(viewsets.ModelViewSet):
    queryset = AppealEvidence.objects.all()
    serializer_class = AppealEvidenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        appeal_id = self.request.query_params.get('appeal')
        if appeal_id:
            qs = qs.filter(appeal_id=appeal_id)
        return qs


class ScoreVersionViewSet(viewsets.ModelViewSet):
    queryset = ScoreVersion.objects.all()
    serializer_class = ScoreVersionSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'head', 'options']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'student':
            qs = qs.filter(student_answer__student=user)
        answer_id = self.request.query_params.get('student_answer')
        appeal_id = self.request.query_params.get('appeal')
        batch_id = self.request.query_params.get('batch_correction')
        if answer_id:
            qs = qs.filter(student_answer_id=answer_id)
        if appeal_id:
            qs = qs.filter(appeal_id=appeal_id)
        if batch_id:
            qs = qs.filter(batch_correction_id=batch_id)
        return qs


class BatchCorrectionViewSet(viewsets.ModelViewSet):
    queryset = BatchCorrection.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['list']:
            return BatchCorrectionListSerializer
        return BatchCorrectionSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'execute', 'rollback']:
            return [IsHead()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        question_id = self.request.query_params.get('question')
        status = self.request.query_params.get('status')
        class_name = self.request.query_params.get('class_name')
        if question_id:
            qs = qs.filter(question_id=question_id)
        if status:
            qs = qs.filter(status=status)
        if class_name:
            qs = qs.filter(class_name=class_name)
        return qs.annotate(related_appeals_count=Count('related_appeals'))

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def _calculate_adjusted_score(self, original_score, rule_type, adjust_value,
                                  min_limit, max_limit, max_score=None):
        original = Decimal(str(original_score))
        adjust = Decimal(str(adjust_value))
        if rule_type == BatchCorrection.RULE_ADD:
            result = original + adjust
        elif rule_type == BatchCorrection.RULE_SUBTRACT:
            result = original - adjust
        elif rule_type == BatchCorrection.RULE_SET:
            result = adjust
        elif rule_type == BatchCorrection.RULE_PERCENT:
            result = original * (Decimal('1') + adjust / Decimal('100'))
        else:
            result = original

        if min_limit is not None:
            result = max(result, Decimal(str(min_limit)))
        if max_limit is not None:
            result = min(result, Decimal(str(max_limit)))
        elif max_score is not None:
            result = min(result, Decimal(str(max_score)))
        return result.quantize(Decimal('0.01'))

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def execute(self, request, pk=None):
        try:
            batch = BatchCorrection.objects.select_for_update().get(pk=pk)
        except BatchCorrection.DoesNotExist:
            return Response({'detail': '批量纠错记录不存在'}, status=status.HTTP_404_NOT_FOUND)

        if batch.status == BatchCorrection.STATUS_COMPLETED:
            return Response({'detail': '该批量纠错已执行，不能重复执行'}, status=status.HTTP_400_BAD_REQUEST)
        if batch.status == BatchCorrection.STATUS_ROLLED_BACK:
            return Response({'detail': '该批量纠错已回滚，不能再次执行'}, status=status.HTTP_400_BAD_REQUEST)

        batch.status = BatchCorrection.STATUS_EXECUTING
        batch.save()

        question = batch.question
        class_name = batch.class_name

        answers = StudentAnswer.objects.select_for_update().filter(
            question=question,
            student__class_name=class_name,
        ).select_related('question')

        affected_count = 0
        target_point = batch.affected_grading_point

        for answer in answers:
            original_total = answer.total_score
            score_snapshot = {}
            point_scores = answer.point_scores.all()
            for ps in point_scores:
                score_snapshot[str(ps.grading_point_id)] = {
                    'score': float(ps.score),
                    'comment': ps.comment or ''
                }

            if target_point:
                try:
                    gp_score = GradingPointScore.objects.get(
                        student_answer=answer, grading_point=target_point
                    )
                    new_point_score = self._calculate_adjusted_score(
                        gp_score.score, batch.rule_type, batch.adjust_value,
                        batch.min_score_limit, batch.max_score_limit, target_point.max_score
                    )
                    if new_point_score != gp_score.score:
                        gp_score.score = new_point_score
                        gp_score.save()
                        answer.total_score = answer.point_scores.aggregate(
                            total=Sum('score')
                        )['total'] or Decimal('0')
                        answer.affected_by_batch = batch
                        answer.save()

                        ScoreVersion.objects.create(
                            student_answer=answer,
                            version_type=ScoreVersion.TYPE_BATCH,
                            original_total_score=original_total,
                            new_total_score=answer.total_score,
                            changed_by=request.user,
                            reason=f'批量纠错：{batch.title}',
                            batch_correction=batch,
                            score_details_snapshot=score_snapshot,
                        )
                        affected_count += 1
                except GradingPointScore.DoesNotExist:
                    continue
            else:
                new_total = self._calculate_adjusted_score(
                    answer.total_score, batch.rule_type, batch.adjust_value,
                    batch.min_score_limit, batch.max_score_limit, question.max_score
                )
                if new_total != answer.total_score:
                    answer.total_score = new_total
                    answer.affected_by_batch = batch
                    answer.save()
                    ScoreVersion.objects.create(
                        student_answer=answer,
                        version_type=ScoreVersion.TYPE_BATCH,
                        original_total_score=original_total,
                        new_total_score=answer.total_score,
                        changed_by=request.user,
                        reason=f'批量纠错：{batch.title}',
                        batch_correction=batch,
                        score_details_snapshot=score_snapshot,
                    )
                    affected_count += 1

        Appeal.objects.filter(
            student_answer__question=question,
            student_answer__student__class_name=class_name,
            status__in=[Appeal.STATUS_PENDING, Appeal.STATUS_REVIEWING],
        ).update(related_batch=batch)

        batch.affected_count = affected_count
        batch.executed_at = timezone.now()
        batch.status = BatchCorrection.STATUS_COMPLETED
        batch.save()

        serializer = BatchCorrectionSerializer(batch)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def rollback(self, request, pk=None):
        try:
            batch = BatchCorrection.objects.select_for_update().get(pk=pk)
        except BatchCorrection.DoesNotExist:
            return Response({'detail': '批量纠错记录不存在'}, status=status.HTTP_404_NOT_FOUND)

        if batch.status != BatchCorrection.STATUS_COMPLETED:
            return Response({'detail': '只能回滚已完成的批量纠错'}, status=status.HTTP_400_BAD_REQUEST)

        versions = ScoreVersion.objects.filter(
            batch_correction=batch,
            version_type=ScoreVersion.TYPE_BATCH,
        ).select_related('student_answer')

        rollback_count = 0
        for version in versions:
            answer = version.student_answer
            snapshot = version.score_details_snapshot or {}

            if batch.affected_grading_point:
                gp_id = str(batch.affected_grading_point_id)
                if gp_id in snapshot:
                    try:
                        gp_score = GradingPointScore.objects.get(
                            student_answer=answer,
                            grading_point_id=batch.affected_grading_point_id,
                        )
                        gp_score.score = Decimal(str(snapshot[gp_id]['score']))
                        gp_score.save()
                        answer.total_score = answer.point_scores.aggregate(
                            total=Sum('score')
                        )['total'] or Decimal('0')
                    except GradingPointScore.DoesNotExist:
                        answer.total_score = version.original_total_score
            else:
                answer.total_score = version.original_total_score

            if answer.affected_by_batch_id == batch.id:
                answer.affected_by_batch = None
            answer.save()
            rollback_count += 1

        Appeal.objects.filter(related_batch=batch).update(related_batch=None)

        batch.status = BatchCorrection.STATUS_ROLLED_BACK
        batch.rolled_back_at = timezone.now()
        batch.save()

        return Response({
            'status': 'rolled_back',
            'rollback_count': rollback_count,
        })

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        try:
            batch = BatchCorrection.objects.get(pk=pk)
        except BatchCorrection.DoesNotExist:
            return Response({'detail': '不存在'}, status=status.HTTP_404_NOT_FOUND)

        answers = StudentAnswer.objects.filter(
            question=batch.question,
            student__class_name=batch.class_name,
        ).select_related('student', 'question')

        preview_list = []
        target_point = batch.affected_grading_point
        for answer in answers:
            if target_point:
                try:
                    gp_score = GradingPointScore.objects.get(
                        student_answer=answer, grading_point=target_point
                    )
                    original_point = gp_score.score
                    new_point = self._calculate_adjusted_score(
                        gp_score.score, batch.rule_type, batch.adjust_value,
                        batch.min_score_limit, batch.max_score_limit, target_point.max_score
                    )
                    changed = new_point != original_point
                except GradingPointScore.DoesNotExist:
                    original_point = None
                    new_point = None
                    changed = False
                preview_list.append({
                    'student_id': answer.student_id,
                    'student_name': answer.student.get_full_name() or answer.student.username,
                    'original_point_score': float(original_point) if original_point else None,
                    'new_point_score': float(new_point) if new_point else None,
                    'changed': changed,
                })
            else:
                new_total = self._calculate_adjusted_score(
                    answer.total_score, batch.rule_type, batch.adjust_value,
                    batch.min_score_limit, batch.max_score_limit, batch.question.max_score
                )
                preview_list.append({
                    'student_id': answer.student_id,
                    'student_name': answer.student.get_full_name() or answer.student.username,
                    'original_total_score': float(answer.total_score),
                    'new_total_score': float(new_total),
                    'changed': new_total != answer.total_score,
                })

        changed_count = sum(1 for p in preview_list if p['changed'])
        return Response({
            'total_count': len(preview_list),
            'will_change_count': changed_count,
            'details': preview_list,
        })
