'use client';

import { useEffect, useState } from 'react';
import {
  Paper, Title, Text, Table, Badge, Group, Box, Stack, Card, ScrollArea,
  Button, Modal, Textarea, SimpleGrid, NumberInput, FileInput, Alert,
} from '@mantine/core';
import { useParams, useRouter } from 'next/navigation';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconFileText, IconAlertCircle, IconCheck, IconHistory, IconUpload, IconPhoto, IconFile,
} from '@tabler/icons-react';
import { assignmentApi, studentAnswerApi, appealApi, scoreVersionApi, gradingPointApi } from '@/lib/api';
import { Assignment, StudentAnswer, ScoreVersion, GradingPoint, GradingPointScore } from '@/types';
import dayjs from 'dayjs';

export default function AssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const assignmentId = Number(params.id);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);
  const [gradingPoints, setGradingPoints] = useState<Record<number, GradingPoint[]>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<StudentAnswer | null>(null);
  const [versions, setVersions] = useState<ScoreVersion[]>([]);
  const [appealOpened, { open: openAppeal, close: closeAppeal }] = useDisclosure(false);
  const [submitting, setSubmitting] = useState(false);
  const [versionsOpened, { open: openVersions, close: closeVersions }] = useDisclosure(false);

  const appealForm = useForm({
    initialValues: {
      reason: '',
      evidences: [] as File[],
    },
    validate: {
      reason: (v) => (v.trim().length > 9 ? null : '请至少输入10个字符的申诉理由'),
    },
  });

  useEffect(() => {
    loadData();
  }, [assignmentId]);

  const loadData = async () => {
    try {
      const { data: ass } = await assignmentApi.detail(assignmentId);
      setAssignment(ass);
      const { data: ans } = await studentAnswerApi.myAnswers({ assignment: assignmentId, page_size: 100 });
      const answersList: StudentAnswer[] = ans.results || ans.data || [];
      setAnswers(answersList);
      const questionIds = Array.from(new Set(answersList.map((a) => a.question)));
      const gpMap: Record<number, GradingPoint[]> = {};
      for (const qid of questionIds) {
        const { data: gps } = await gradingPointApi.list({ question: qid, page_size: 100 });
        gpMap[qid] = gps.results || [];
      }
      setGradingPoints(gpMap);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectAnswer = async (a: StudentAnswer) => {
    setSelectedAnswer(a);
    const { data } = await scoreVersionApi.list({ student_answer: a.id, page_size: 100 });
    setVersions(data.results || []);
  };

  const handleSubmitAppeal = async (values: typeof appealForm.values) => {
    if (!selectedAnswer) return;
    if (!assignment?.is_appeal_allowed) {
      notifications.show({ title: '错误', message: '已超过申诉期限', color: 'red' });
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('student_answer', String(selectedAnswer.id));
      fd.append('reason', values.reason);
      values.evidences.forEach((f, i) => {
        fd.append(f.type.startsWith('image/') ? `image_${i}` : `file_${i}`, f);
        fd.append(f.type.startsWith('image/') ? `image_${i}_desc` : `file_${i}_desc`, f.name);
      });
      await appealApi.create(fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      notifications.show({ title: '提交成功', message: '申诉已提交，等待助教复核', color: 'green', icon: <IconCheck /> });
      appealForm.reset();
      closeAppeal();
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || '提交失败';
      notifications.show({ title: '失败', message: msg, color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!assignment) {
    return <Paper p="xl"><Text>加载中...</Text></Paper>;
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={3} style={{ margin: 0 }}>{assignment.title}</Title>
          <Group mt={6} gap={12}>
            <Badge variant="light">{assignment.course_name}</Badge>
            <Badge variant="light" color="teal">{assignment.class_name}</Badge>
            <Badge size="md" color={assignment.is_appeal_allowed ? 'green' : 'gray'}>
              {assignment.is_appeal_allowed ? '申诉中' : '申诉已截止'}
            </Badge>
          </Group>
        </div>
        <Button variant="subtle" onClick={() => router.back()}>返回列表</Button>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }}>
        {answers.map((a) => (
          <Card
            key={a.id}
            shadow="sm"
            padding="md"
            radius="md"
            withBorder
            onClick={() => handleSelectAnswer(a)}
            style={{ cursor: 'pointer', border: selectedAnswer?.id === a.id ? '2px solid #228be6' : undefined }}
          >
            <Group justify="space-between" mb="sm">
              <Text fw={600}>第 {a.question_no} 题</Text>
              <Group gap={6}>
                <Badge size="sm" color="blue">{Number(a.total_score)} / {Number(a.question_max_score)}</Badge>
                {a.has_appeal && <IconAlertCircle size={16} color="#fa8c16" />}
                {a.affected_by_batch && <Badge size="sm" color="orange">批量调整</Badge>}
              </Group>
            </Group>
            <Text size="sm" c="dimmed" lineClamp={2} mb="sm">
              {a.answer_content?.slice(0, 80) || '无答题内容'}...
            </Text>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">提交：{dayjs(a.submitted_at).format('MM-DD HH:mm')}</Text>
              {a.graded_at && <Text size="xs" c="dimmed">批改：{dayjs(a.graded_at).format('MM-DD HH:mm')}</Text>}
            </Group>
          </Card>
        ))}
        {answers.length === 0 && (
          <Paper p={40} style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#adb5bd' }}>
            暂无答题数据
          </Paper>
        )}
      </SimpleGrid>

      {selectedAnswer && (
        <Paper p="lg" radius="md" shadow="sm">
          <Group justify="space-between" mb="md">
            <Title order={4} style={{ margin: 0 }}>
              第 {selectedAnswer.question_no} 题 - 答题详情
            </Title>
            <Group>
              <Button variant="outline" size="sm" leftSection={<IconHistory size={14} />} onClick={openVersions}>
                分数版本 ({versions.length})
              </Button>
              {assignment.is_appeal_allowed && !selectedAnswer.question_info?.is_subjective === false && (
                <Button size="sm" leftSection={<IconAlertCircle size={14} />} onClick={openAppeal}>
                  提交申诉
                </Button>
              )}
            </Group>
          </Group>

          <Grid-like-sg cols={{ base: 1, md: 2 }} gap="md">
            <Box p="md" bg="#f8f9fa" style={{ borderRadius: 8 }}>
              <Text fw={500} mb="xs">📝 我的答案</Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {selectedAnswer.answer_content || '（空）'}
              </Text>
              {selectedAnswer.remark && (
                <Alert mt="md" color="blue" title="批卷备注">
                  {selectedAnswer.remark}
                </Alert>
              )}
            </Box>
            <Stack gap="sm">
              <Text fw={500}>🎯 评分点评分</Text>
              {gradingPoints[selectedAnswer.question]?.length ? (
                gradingPoints[selectedAnswer.question].map((gp) => {
                  const got = selectedAnswer.point_scores?.find(
                    (s: GradingPointScore) => s.grading_point === gp.id
                  );
                  return (
                    <Box key={gp.id} p="sm" bg="#fff" withBorder style={{ borderRadius: 8 }}>
                      <Group justify="space-between" mb={4}>
                        <Text size="sm" fw={500}>{gp.description}</Text>
                        <Badge color={Number(got?.score || 0) > 0 ? 'green' : 'gray'} size="sm">
                          {Number(got?.score || 0)} / {Number(gp.max_score)}
                        </Badge>
                      </Group>
                      {got?.comment && (
                        <Text size="xs" c="dimmed">备注：{got.comment}</Text>
                      )}
                    </Box>
                  );
                })
              ) : (
                <Text size="sm" c="dimmed">暂无评分点</Text>
              )}
              <Box p="md" bg="blue.0" style={{ borderRadius: 8 }}>
                <Group justify="space-between">
                  <Text fw={600}>总得分</Text>
                  <Text size="xl" fw={700} c="blue.7">
                    {Number(selectedAnswer.total_score)}
                    <Text size="sm" c="dimmed" span> / {Number(selectedAnswer.question_max_score)}</Text>
                  </Text>
                </Group>
              </Box>
            </Stack>
          </Grid-like-sg>
        </Paper>
      )}

      <Modal opened={appealOpened} onClose={closeAppeal} title="提交申诉" size="lg" padding="lg">
        <form onSubmit={appealForm.onSubmit(handleSubmitAppeal)}>
          <Stack>
            <Alert color="yellow" title="申诉须知">
              请在申诉截止前提交。仅支持主观题申诉，客观题可联系教研负责人走批量纠错。
            </Alert>
            <Textarea
              label="申诉理由"
              placeholder="请详细描述您认为评分有误的地方，结合评分点说明..."
              minRows={4}
              maxRows={8}
              required
              {...appealForm.getInputProps('reason')}
            />
            <FileInput
              label="上传证据（可选）"
              placeholder="支持图片和文件，多选"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
              leftSection={<IconUpload size={16} />}
              {...appealForm.getInputProps('evidences')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeAppeal}>取消</Button>
              <Button type="submit" loading={submitting}>提交申诉</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={versionsOpened} onClose={closeVersions} title="分数版本历史" size="lg">
        <Stack>
          {versions.length === 0 && <Text c="dimmed" ta="center" py="xl">暂无版本记录</Text>}
          {versions.map((v) => (
            <Box key={v.id} p="sm" withBorder style={{ borderRadius: 8 }}>
              <Group justify="space-between" mb={6}>
                <Badge color={v.version_type === 'initial' ? 'gray' : v.version_type === 'appeal' ? 'blue' : 'orange'}>
                  {v.version_type_display}
                </Badge>
                <Text size="xs" c="dimmed">{dayjs(v.changed_at).format('YYYY-MM-DD HH:mm')}</Text>
              </Group>
              <Group gap={12} mb={4}>
                <Text>
                  原分：<b>{Number(v.original_total_score)}</b> → 新分：
                  <b style={{ color: Number(v.score_diff || 0) > 0 ? '#2f9e44' : Number(v.score_diff || 0) < 0 ? '#e03131' : '#000' }}>
                    {Number(v.new_total_score)}
                  </b>
                </Text>
                {v.score_diff !== undefined && v.score_diff !== 0 && (
                  <Badge size="sm" color={Number(v.score_diff) > 0 ? 'green' : 'red'}>
                    {Number(v.score_diff) > 0 ? '+' : ''}{Number(v.score_diff).toFixed(2)}
                  </Badge>
                )}
              </Group>
              <Text size="sm" c="dimmed">修改原因：{v.reason}</Text>
              {v.changed_by_info && (
                <Text size="xs" c="dimmed" mt={4}>操作人：{v.changed_by_info.first_name || v.changed_by_info.username}</Text>
              )}
            </Box>
          ))}
        </Stack>
      </Modal>
    </Stack>
  );
}

function GridLikeSG(props: any) { return <SimpleGrid {...props} />; }
