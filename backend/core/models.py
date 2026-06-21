from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from decimal import Decimal


class User(AbstractUser):
    ROLE_STUDENT = 'student'
    ROLE_TA = 'ta'
    ROLE_HEAD = 'head'

    ROLE_CHOICES = [
        (ROLE_STUDENT, '学生'),
        (ROLE_TA, '助教'),
        (ROLE_HEAD, '教研负责人'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_STUDENT)
    class_name = models.CharField(max_length=100, blank=True, null=True, help_text='班级名称（学生用）')
    phone = models.CharField(max_length=20, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    class Meta:
        db_table = 'auth_user'
        verbose_name = '用户'
        verbose_name_plural = verbose_name

    def __str__(self):
        return f'{self.get_role_display()} - {self.username}'


class Assignment(models.Model):
    title = models.CharField(max_length=200, verbose_name='作业标题')
    description = models.TextField(blank=True, null=True, verbose_name='作业描述')
    course_name = models.CharField(max_length=200, verbose_name='课程名称')
    class_name = models.CharField(max_length=100, verbose_name='班级')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_assignments', verbose_name='创建人')
    deadline = models.DateTimeField(verbose_name='作业截止时间')
    appeal_deadline = models.DateTimeField(verbose_name='申诉截止时间')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'assignment'
        verbose_name = '作业'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def is_appeal_allowed(self):
        return timezone.now() <= self.appeal_deadline


class Question(models.Model):
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='questions', verbose_name='所属作业')
    question_no = models.IntegerField(verbose_name='题号')
    title = models.TextField(verbose_name='题目内容')
    max_score = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='满分')
    is_subjective = models.BooleanField(default=True, verbose_name='是否主观题')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'question'
        verbose_name = '题目'
        verbose_name_plural = verbose_name
        unique_together = [('assignment', 'question_no')]
        ordering = ['question_no']

    def __str__(self):
        return f'{self.assignment.title} - 第{self.question_no}题'


class GradingPoint(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='grading_points', verbose_name='所属题目')
    description = models.CharField(max_length=500, verbose_name='评分点描述')
    max_score = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='该评分点满分')
    sort_order = models.IntegerField(default=0, verbose_name='排序')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'grading_point'
        verbose_name = '评分点'
        verbose_name_plural = verbose_name
        ordering = ['sort_order']

    def __str__(self):
        return f'{self.question} - {self.description[:30]}'


class StudentAnswer(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='student_answers', verbose_name='学生')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='student_answers', verbose_name='题目')
    answer_content = models.TextField(verbose_name='答题内容')
    total_score = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'), verbose_name='总得分')
    graded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='graded_answers', verbose_name='批卷人')
    graded_at = models.DateTimeField(null=True, blank=True, verbose_name='批卷时间')
    remark = models.TextField(blank=True, null=True, verbose_name='批卷备注')
    submitted_at = models.DateTimeField(auto_now_add=True, verbose_name='提交时间')
    has_appeal = models.BooleanField(default=False, verbose_name='是否有申诉')
    affected_by_batch = models.ForeignKey('BatchCorrection', on_delete=models.SET_NULL, null=True, blank=True, related_name='affected_answers', verbose_name='受影响的批量纠错')

    class Meta:
        db_table = 'student_answer'
        verbose_name = '学生答题'
        verbose_name_plural = verbose_name
        unique_together = [('student', 'question')]

    def __str__(self):
        return f'{self.student.username} - {self.question}'


class GradingPointScore(models.Model):
    student_answer = models.ForeignKey(StudentAnswer, on_delete=models.CASCADE, related_name='point_scores', verbose_name='学生答题')
    grading_point = models.ForeignKey(GradingPoint, on_delete=models.CASCADE, related_name='point_scores', verbose_name='评分点')
    score = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'), verbose_name='得分')
    comment = models.CharField(max_length=500, blank=True, null=True, verbose_name='评分备注')

    class Meta:
        db_table = 'grading_point_score'
        verbose_name = '评分点评分'
        verbose_name_plural = verbose_name
        unique_together = [('student_answer', 'grading_point')]

    def __str__(self):
        return f'{self.student_answer} - {self.grading_point}'


class Appeal(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_REVIEWING = 'reviewing'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'

    STATUS_CHOICES = [
        (STATUS_PENDING, '待处理'),
        (STATUS_REVIEWING, '复核中'),
        (STATUS_APPROVED, '申诉通过'),
        (STATUS_REJECTED, '申诉驳回'),
    ]

    student_answer = models.ForeignKey(StudentAnswer, on_delete=models.CASCADE, related_name='appeals', verbose_name='申诉答题')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='my_appeals', verbose_name='申诉学生')
    reason = models.TextField(verbose_name='申诉理由')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, verbose_name='申诉状态')
    submitted_at = models.DateTimeField(auto_now_add=True, verbose_name='申诉提交时间')

    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_appeals', verbose_name='复核人')
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='复核时间')
    review_comment = models.TextField(blank=True, null=True, verbose_name='复核意见')

    new_total_score = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='复核后总分')
    related_batch = models.ForeignKey('BatchCorrection', on_delete=models.SET_NULL, null=True, blank=True, related_name='related_appeals', verbose_name='关联批量纠错')

    class Meta:
        db_table = 'appeal'
        verbose_name = '申诉'
        verbose_name_plural = verbose_name
        ordering = ['-submitted_at']

    def __str__(self):
        return f'{self.student.username} - {self.student_answer.question}'


class AppealEvidence(models.Model):
    appeal = models.ForeignKey(Appeal, on_delete=models.CASCADE, related_name='evidences', verbose_name='所属申诉')
    description = models.CharField(max_length=500, verbose_name='证据说明')
    file = models.FileField(upload_to='appeal_evidences/', blank=True, null=True, verbose_name='证据文件')
    image = models.ImageField(upload_to='appeal_evidences/images/', blank=True, null=True, verbose_name='证据图片')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'appeal_evidence'
        verbose_name = '申诉证据'
        verbose_name_plural = verbose_name

    def __str__(self):
        return f'{self.appeal} - {self.description[:30]}'


class ScoreVersion(models.Model):
    TYPE_INITIAL = 'initial'
    TYPE_APPEAL = 'appeal'
    TYPE_BATCH = 'batch'

    TYPE_CHOICES = [
        (TYPE_INITIAL, '初次评分'),
        (TYPE_APPEAL, '申诉修改'),
        (TYPE_BATCH, '批量纠错'),
    ]

    student_answer = models.ForeignKey(StudentAnswer, on_delete=models.CASCADE, related_name='score_versions', verbose_name='学生答题')
    version_type = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name='版本类型')
    original_total_score = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='原总分')
    new_total_score = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='新总分')
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='修改人')
    changed_at = models.DateTimeField(auto_now_add=True, verbose_name='修改时间')
    reason = models.CharField(max_length=500, verbose_name='修改原因')
    appeal = models.ForeignKey(Appeal, on_delete=models.SET_NULL, null=True, blank=True, related_name='score_versions', verbose_name='关联申诉')
    batch_correction = models.ForeignKey('BatchCorrection', on_delete=models.SET_NULL, null=True, blank=True, related_name='score_versions', verbose_name='关联批量纠错')
    score_details_snapshot = models.JSONField(default=dict, verbose_name='评分点得分快照')

    class Meta:
        db_table = 'score_version'
        verbose_name = '分数版本'
        verbose_name_plural = verbose_name
        ordering = ['-changed_at']

    def __str__(self):
        return f'{self.student_answer} - {self.get_version_type_display()} v{self.id}'


class BatchCorrection(models.Model):
    STATUS_DRAFT = 'draft'
    STATUS_EXECUTING = 'executing'
    STATUS_COMPLETED = 'completed'
    STATUS_ROLLED_BACK = 'rolled_back'

    STATUS_CHOICES = [
        (STATUS_DRAFT, '草稿'),
        (STATUS_EXECUTING, '执行中'),
        (STATUS_COMPLETED, '已完成'),
        (STATUS_ROLLED_BACK, '已回滚'),
    ]

    RULE_ADD = 'add'
    RULE_SUBTRACT = 'subtract'
    RULE_SET = 'set'
    RULE_PERCENT = 'percent'

    RULE_CHOICES = [
        (RULE_ADD, '加分'),
        (RULE_SUBTRACT, '减分'),
        (RULE_SET, '设为固定分'),
        (RULE_PERCENT, '按比例调整'),
    ]

    title = models.CharField(max_length=200, verbose_name='批量纠错标题')
    description = models.TextField(verbose_name='纠错说明')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='batch_corrections', verbose_name='目标题目')
    class_name = models.CharField(max_length=100, verbose_name='目标班级')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_batches', verbose_name='创建人')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT, verbose_name='状态')

    affected_grading_point = models.ForeignKey(GradingPoint, on_delete=models.SET_NULL, null=True, blank=True, related_name='batch_corrections', verbose_name='目标评分点（为空则调整总分）')
    rule_type = models.CharField(max_length=20, choices=RULE_CHOICES, verbose_name='调整规则')
    adjust_value = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='调整值')
    min_score_limit = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'), verbose_name='最低分限制')
    max_score_limit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='最高分限制')

    affected_count = models.IntegerField(default=0, verbose_name='影响学生数量')
    executed_at = models.DateTimeField(null=True, blank=True, verbose_name='执行时间')
    rolled_back_at = models.DateTimeField(null=True, blank=True, verbose_name='回滚时间')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'batch_correction'
        verbose_name = '批量纠错'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return self.title
