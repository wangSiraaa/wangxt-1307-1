import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

from core.models import (
    Assignment, Question, GradingPoint, StudentAnswer, GradingPointScore,
    Appeal, AppealEvidence, ScoreVersion, BatchCorrection,
)

User = get_user_model()


class Command(BaseCommand):
    help = '生成演示数据：用户、作业、题目、评分点、答题、申诉、批量纠错'

    def handle(self, *args, **options):
        self.stdout.write('开始生成演示数据...')

        User.objects.filter(username__in=['student01', 'student02', 'student03', 'ta01', 'head01']).delete()

        students = []
        for i in range(1, 6):
            s = User.objects.create_user(
                username=f'student0{i}',
                password='student123',
                first_name=f'学生{i}',
                email=f'student0{i}@demo.com',
                role='student',
                class_name='计算机2301班',
            )
            students.append(s)
        self.stdout.write(f'✅ 创建 {len(students)} 名学生（密码均为 student123）')

        ta = User.objects.create_user(
            username='ta01',
            password='ta123456',
            first_name='李助教',
            email='ta01@demo.com',
            role='ta',
        )
        self.stdout.write('✅ 创建助教 ta01（密码 ta123456）')

        head = User.objects.create_user(
            username='head01',
            password='head123456',
            first_name='王主任',
            email='head01@demo.com',
            role='head',
        )
        self.stdout.write('✅ 创建教研负责人 head01（密码 head123456）')

        now = timezone.now()
        Assignment.objects.filter(title__startswith='Python 期中').delete()
        assignment = Assignment.objects.create(
            title='Python 期中作业 - 主观题部分',
            description='本作业包含3道主观题，涵盖Python基础语法、函数与面向对象。',
            course_name='程序设计基础',
            class_name='计算机2301班',
            created_by=head,
            deadline=now - timedelta(days=1),
            appeal_deadline=now + timedelta(days=7),
        )
        self.stdout.write(f'✅ 创建作业：{assignment.title}')

        qs_data = [
            {
                'no': 1, 'title': '请解释 Python 中的列表推导式，并给出一个生成 1-100 偶数列表的例子。',
                'max': 10,
                'points': [
                    ('语法解释清晰（定义、结构）', 4),
                    ('例子代码正确可运行', 4),
                    ('给出结果说明', 2),
                ],
            },
            {
                'no': 2, 'title': '什么是装饰器？请编写一个统计函数执行时间的装饰器示例。',
                'max': 15,
                'points': [
                    ('装饰器概念与作用阐述', 5),
                    ('代码使用@语法糖正确', 5),
                    ('使用time模块记录时间并输出', 5),
                ],
            },
            {
                'no': 3, 'title': '请设计一个学生管理类(StudentManager)，支持增删改查四个功能并给出示例调用。',
                'max': 25,
                'points': [
                    ('类结构合理，封装属性', 5),
                    ('新增与删除方法实现', 6),
                    ('修改与查询方法实现', 6),
                    ('示例调用完整可运行', 5),
                    ('注释清晰，命名规范', 3),
                ],
            },
        ]

        created_questions = []
        for q in qs_data:
            question = Question.objects.create(
                assignment=assignment,
                question_no=q['no'],
                title=q['title'],
                max_score=Decimal(str(q['max'])),
                is_subjective=True,
            )
            created_questions.append(question)
            for idx, (desc, score) in enumerate(q['points']):
                GradingPoint.objects.create(
                    question=question,
                    description=desc,
                    max_score=Decimal(str(score)),
                    sort_order=idx + 1,
                )
        self.stdout.write(f'✅ 创建 {len(created_questions)} 道题目及评分点')

        sample_answers = {
            1: [
                (students[0], '列表推导式就是用一行代码生成列表，语法是 [x for x in ...]。\n例子：even = [i for i in range(1,101) if i%2==0]\n结果：[2,4,6,...,100]',
                 {1: 4, 2: 4, 3: 2}, 10),
                (students[1], '列表推导式，语法 [i for i in xx]。\n代码：range(2,101,2)',
                 {1: 2, 2: 3, 3: 0}, 5),
                (students[2], '列表推导式是Python语法糖。\n[i for i in range(1,101) if i%2==0]\n得到偶数列表。',
                 {1: 3, 2: 3, 3: 1}, 7),
                (students[3], '用一行来生成列表。\nrange(100) if even',
                 {1: 2, 2: 2, 3: 1}, 5),
                (students[4], '列表推导式，快速构造列表。\nresult = list(filter(lambda x: x%2==0, range(1,101)))\n正确输出偶数。',
                 {1: 3, 2: 3, 3: 2}, 8),
            ],
            2: [
                (students[0], '@装饰器语法...import time\ndef timer(func):...time.time()',
                 {1: 4, 2: 3, 3: 3}, 10),
                (students[1], '装饰器是包装函数的高阶函数。\n@timer\ndef foo(): ...',
                 {1: 5, 2: 5, 3: 4}, 14),
                (students[2], '不懂装饰器，乱写的。def deco() return 0',
                 {1: 1, 2: 0, 3: 0}, 1),
                (students[3], '装饰器可以扩展函数功能。import time，写得比较简单。',
                 {1: 3, 2: 3, 3: 2}, 8),
                (students[4], '',
                 {1: 0, 2: 0, 3: 0}, 0),
            ],
            3: [
                (students[0], 'class StudentManager:\n    def __init__(self): self.students = []\n    def add():\n    def delete():\n示例调用正确。',
                 {1: 4, 2: 5, 3: 5, 4: 4, 5: 2}, 20),
                (students[1], '完整的类定义，包含__students私有属性、增删改查四个方法都有异常处理。\n示例：sm = StudentManager(); sm.add({"name":"A","id":1}); print(sm.find(1))',
                 {1: 5, 2: 6, 3: 6, 4: 5, 5: 3}, 25),
                (students[2], '简单的管理类，方法都已写好示例。',
                 {1: 3, 2: 4, 3: 4, 4: 3, 5: 2}, 16),
                (students[3], '我用字典存储学生信息。',
                 {1: 3, 2: 3, 3: 3, 4: 2, 5: 2}, 13),
                (students[4], 'StudentManager 类代码较长，包含详细注释。',
                 {1: 5, 2: 5, 3: 5, 4: 4, 5: 3}, 22),
            ],
        }

        answer_count = 0
        for q_idx, question in enumerate(created_questions):
            q_no = question.question_no
            points = list(question.grading_points.all().order_by('sort_order'))
            records = sample_answers.get(q_no, [])
            for student, content, point_scores_dict, total in records:
                answer = StudentAnswer.objects.create(
                    student=student,
                    question=question,
                    answer_content=content,
                    total_score=Decimal(str(total)),
                    graded_by=ta,
                    graded_at=now - timedelta(hours=12),
                    remark=f'助教{ta.first_name}评阅',
                )
                for gp in points:
                    score = point_scores_dict.get(gp.id, point_scores_dict.get(list(point_scores_dict.keys())[points.index(gp)] if point_scores_dict else 0, 0))
                    GradingPointScore.objects.create(
                        student_answer=answer,
                        grading_point=gp,
                        score=Decimal(str(score)),
                        comment='按评分点打分',
                    )
                answer_count += 1

                ScoreVersion.objects.create(
                    student_answer=answer,
                    version_type='initial',
                    original_total_score=Decimal(str(total)),
                    new_total_score=Decimal(str(total)),
                    changed_by=ta,
                    reason='初次评阅得分',
                    score_details_snapshot={
                        str(gp.id): {
                            'score': float(point_scores_dict.get(gp.id, point_scores_dict.get(list(point_scores_dict.keys())[points.index(gp)] if point_scores_dict else 0, 0)),
                            'comment': '按评分点打分'
                        } for gp in points
                    },
                )
        self.stdout.write(f'✅ 创建 {answer_count} 份答题及初次评分版本')

        Appeal.objects.filter(student__in=students).delete()
        sample_appeals = [
            (students[1], created_questions[0], '我认为第2评分点的代码逻辑是正确的，range(2,101,2)完全正确，应该给满分4分。', 'pending'),
            (students[3], created_questions[0], '第1评分点我提到了「一行代码生成列表」，应该至少给3分而不是2分。', 'pending'),
            (students[2], created_questions[2], '我的方法定义完整，每题都有实现，总得分偏低，请复核。', 'approved'),
            (students[0], created_questions[1], '装饰器代码虽然简写但实际可运行，请复核第2和第3评分点。', 'reviewing'),
        ]
        for student, q, reason, st in sample_appeals:
            answer = StudentAnswer.objects.get(student=student, question=q)
            appeal = Appeal.objects.create(
                student_answer=answer,
                student=student,
                reason=reason,
                status=st,
            )
            answer.has_appeal = True
            answer.save()
            if st in ('approved', 'reviewing'):
                appeal.reviewed_by = ta
                appeal.reviewed_at = now - timedelta(hours=2)
                appeal.review_comment = '经复核，部分评分点得分确实偏低，已调整。' if st == 'approved' else '正在结合参考答案详细复核中...'
                if st == 'approved':
                    old_total = float(answer.total_score)
                    new_total = min(old_total + 3, float(q.max_score))
                    appeal.new_total_score = Decimal(str(new_total))
                    answer.total_score = Decimal(str(new_total))
                    answer.save()
                    ScoreVersion.objects.create(
                        student_answer=answer,
                        version_type='appeal',
                        original_total_score=Decimal(str(old_total)),
                        new_total_score=Decimal(str(new_total)),
                        changed_by=ta,
                        reason='申诉复核通过加分',
                        appeal=appeal,
                    )
                appeal.save()
        self.stdout.write(f'✅ 创建 {len(sample_appeals)} 条申诉样例')

        BatchCorrection.objects.filter(title__startswith='第二题').delete()
        batch = BatchCorrection.objects.create(
            title='第二题第3评分点全体 +1 分（time模块使用）',
            description='经教研会议决定，第二题第3评分点只要使用了time模块即给满分5分，部分同学被扣1分，统一加1分修正。',
            question=created_questions[1],
            class_name='计算机2301班',
            created_by=head,
            status='draft',
            affected_grading_point=None,
            rule_type='add',
            adjust_value=Decimal('1'),
            min_score_limit=Decimal('0'),
            max_score_limit=None,
        )
        self.stdout.write(f'✅ 创建批量纠错草稿：{batch.title}')

        self.stdout.write('\n======== 演示数据全部生成完成 ========')
        self.stdout.write('演示账号列表：')
        self.stdout.write('  - 学生 student01~05 / 密码 student123')
        self.stdout.write('  - 助教 ta01 / 密码 ta123456')
        self.stdout.write('  - 教研负责人 head01 / 密码 head123456')
