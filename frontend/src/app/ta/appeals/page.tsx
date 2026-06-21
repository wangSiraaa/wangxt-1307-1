'use client';

import { useEffect, useState } from 'react';
import {
  Paper, Title, Table, Badge, Group, Box, Stack, Text, Button, Select,
  Modal, SimpleGrid, Textarea, NumberInput, ScrollArea, Avatar,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@/store/auth';
import {
  appealApi, studentAnswerApi, gradingPointApi, assignmentApi,
} from '@/lib/api';
import { Appeal, StudentAnswer, GradingPoint, Assignment } from '@/types';
import dayjs from 'dayjs';
import {
  IconAlertCircle, IconCheck, IconX, IconChevronRight, IconUser, IconFileText,
} from '@tabler/icons-react';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'yellow' },
  reviewing: { label: '复核中', color: 'blue' },
  approved: { label: '通过', color: 'green' },
  rejected: { label: '驳回', color: 'red' },
};

export default function TAAppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignFilter, setAssignFilter] = useState<string>('');
  const [selected, setSelected] = useState<Appeal | null>(null);
  const [answer, setAnswer] = useState<StudentAnswer | null>(null);
  const [gradingPoints, setGradingPoints] = useState<GradingPoint[]>([]);
  const [reviewOpened, setReviewOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reviewForm = useForm({
    initialValues: {
      action: 'approve' as 'approve' | 'reject',
      review_comment: '',
      new_total_score: undefined as number | undefined,
      pointScores: {} as Record<string, number>,
    },
    validate: {
      review_comment: (v) => (v.trim().length > 4 ? null : '请填写至少5个字的复核意见'),
    },
  });

  useEffect(() => {
    loadAssignments();
  }, []);

  useEffect(() => {
    loadAppeals();
  }, [statusFilter, assignFilter]);

  const loadAssignments = async () => {
    const { data } = await assignmentApi.list({ page_size: 100 });
    setAssignments(data.results || []);
  };

  const loadAppeals = async () => {
    setLoading(true);
    try {
      const params: any = { page_size: 100 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (assignFilter) params.assignment = assignFilter;
      const { data } = await appealApi.list(params);
      setAppeals(data.results || []);
    } finally {
      setLoading(false);
    }
  };

  const openReview = async (a: Appeal) => {
    setSelected(a);
    const { data: ansData } = await studentAnswerApi.detail(a.student_answer);
    const ans: StudentAnswer = ansData;
    setAnswer(ans);
    const { data: gps } = await gradingPointApi.list({ question: ans.question, page_size: 100 });
    setGradingPoints(gps.results || []);
    const pointScores: Record<string, number> = {};
    (ans.point_scores || []).forEach((ps) => {
      pointScores[String(ps.grading_point)] = Number(ps.score);
    });
    reviewForm.setValues({
      action: 'approve',
      review_comment: '',
      new_total_score: Number(ans.total_score),
      pointScores,
    });
    setReviewOpened(true);
  };

  const handleSubmitReview = async () => {
    if (!selected) return;
    const values = reviewForm.values;
    if (!values.review_comment.trim()) {
      notifications.show({ title: '提示', message: '请填写复核意见', color: 'yellow' });
      return;
    }
    setSubmitting(true);
    try {
      await appealApi.review(selected.id, {
        action: values.action,
        review_comment: values.review_comment,
        new_total_score: values.new_total_score,
        new_point_scores: values.pointScores,
      });
      notifications.show({
        title: '复核成功',
        message: values.action === 'approve' ? '已通过申诉并更新分数' : '已驳回申诉',
        color: 'green',
        icon: <IconCheck />,
      });
      setReviewOpened(false);
      loadAppeals();
    } catch (e: any) {
      notifications.show({
        title: '失败',
        message: e?.response?.data?.detail || '操作失败',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const computeTotalFromPoints = () => {
    return Object.values(reviewForm.values.pointScores).reduce((s, v) => s + Number(v || 0), 0);
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3} style={{ margin: 0 }}>申诉复核</Title>
        <Group>
          <Select
            value={assignFilter}
            onChange={(v) => setAssignFilter(v || '')}
            placeholder="全部作业"
            clearable
            data={assignments.map((a) => ({ value: String(a.id), label: a.title }))}
            style={{ width: 220 }}
          />
          <Select
            value={statusFilter}
            onChange={(v) => setStatusFilter(v || 'all')}
            data={[
              { value: 'all', label: '全部状态' },
              { value: 'pending', label: '待处理' },
              { value: 'reviewing', label: '复核中' },
              { value: 'approved', label: '已通过' },
              { value: 'rejected', label: '已驳回' },
            ]}
            style={{ width: 160 }}
          />
        </Group>
      </Group>

      <Paper p="md" radius="md" shadow="sm">
        <Table striped highlightOnHover withTableBorder verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>学生</Table.Th>
              <Table.Th>作业 / 题号</Table.Th>
              <Table.Th>原得分</Table.Th>
              <Table.Th>申诉理由</Table.Th>
              <Table.Th>证据</Table.Th>
              <Table.Th>提交时间</Table.Th>
              <Table.Th>状态</Table.Th>
              <Table.Th>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {appeals.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={8} align="center" py="xl" color="dimmed">
                  暂无申诉记录
                </Table.Td>
              </Table.Tr>
            )}
            {appeals.map((a) => (
              <Table.Tr key={a.id}>
                <Table.Td>
                  <Group gap={8}>
                    <Avatar size={28} color="blue">{(a.student_name || a.student_info?.username || 'S')?.[0]}</Avatar>
                    <Text size="sm" fw={500}>{a.student_name || a.student_info?.username}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" lineClamp={1}>{a.assignment_title}</Text>
                  <Text size="xs" c="dimmed">第 {a.question_no} 题</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>{Number(a.original_score)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text lineClamp={1} size="sm" style={{ maxWidth: 220 }}>{a.reason}</Text>
                </Table.Td>
                <Table.Td>
                  {a.evidences_count ? (
                    <Badge size="sm" color="cyan">{a.evidences_count} 个</Badge>
                  ) : (
                    <Text size="xs" c="dimmed">无</Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Text size="xs">{dayjs(a.submitted_at).format('MM-DD HH:mm')}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={STATUS_MAP[a.status]?.color} size="sm">
                    {STATUS_MAP[a.status]?.label}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Button
                    size="xs"
                    leftSection={<IconChevronRight size={14} />}
                    disabled={a.status === 'approved' || a.status === 'rejected'}
                    onClick={() => openReview(a)}
                  >
                    复核
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal
        opened={reviewOpened}
        onClose={() => setReviewOpened(false)}
        title="申诉复核"
        size="xl"
        padding="lg"
        keepMounted={false}
      >
        {selected && answer && (
          <Stack>
            <SimpleGrid cols={3}>
              <Box p="sm" bg="#f8f9fa" style={{ borderRadius: 8 }}>
                <Text size="xs" c="dimmed">👤 学生</Text>
                <Text fw={500}>
                  {selected.student_info?.first_name || selected.student_info?.username}
                  {selected.student_info?.class_name && ` · ${selected.student_info.class_name}`}
                </Text>
              </Box>
              <Box p="sm" bg="#f8f9fa" style={{ borderRadius: 8 }}>
                <Text size="xs" c="dimmed">📝 作业/题号</Text>
                <Text fw={500}>{selected.assignment_title} · 第{selected.question_no}题</Text>
              </Box>
              <Box p="sm" bg="#f8f9fa" style={{ borderRadius: 8 }}>
                <Text size="xs" c="dimmed">⭐ 当前得分</Text>
                <Text fw={700} size="lg" c="blue.7">{Number(answer.total_score)}</Text>
              </Box>
            </SimpleGrid>

            <SimpleGrid cols={2}>
              <Box p="md" bg="#fffbe6" style={{ borderRadius: 8, border: '1px solid #ffe58f' }}>
                <Group justify="space-between" mb="xs">
                  <Text fw={500}><IconAlertCircle size={16} style={{ display: 'inline' }} /> 申诉理由</Text>
                  <Text size="xs" c="dimmed">{dayjs(selected.submitted_at).format('MM-DD HH:mm')}</Text>
                </Group>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{selected.reason}</Text>
                {selected.evidences && selected.evidences.length > 0 && (
                  <Box mt="sm">
                    <Text size="xs" c="dimmed" mb={6}>证据材料：</Text>
                    <SimpleGrid cols={3}>
                      {selected.evidences.map((e) => (
                        <Box key={e.id} p="sm" bg="#fff" withBorder style={{ borderRadius: 6, textAlign: 'center' }}>
                          {e.image ? (
                            <img src={e.image} alt="" style={{ maxHeight: 60, borderRadius: 4 }} />
                          ) : (
                            <IconFileText size={24} color="#228be6" />
                          )}
                          <Text size="xs" mt={4} lineClamp={1}>{e.description}</Text>
                        </Box>
                      ))}
                    </SimpleGrid>
                  </Box>
                )}
              </Box>

              <Box p="md" bg="#e7f5ff" style={{ borderRadius: 8, border: '1px solid #a5d8ff' }}>
                <Text fw={500} mb="xs">📖 学生答案</Text>
                <Text
                  size="sm"
                  style={{ whiteSpace: 'pre-wrap', maxHeight: 240, overflowY: 'auto', lineHeight: 1.7 }}
                >
                  {answer.answer_content || '（无答题内容）'}
                </Text>
              </Box>
            </SimpleGrid>

            <Box>
              <Text fw={500} mb="sm">🎯 评分点调整</Text>
              <Stack gap="sm">
                {gradingPoints.map((gp) => {
                  const cur = reviewForm.values.pointScores[String(gp.id)] ?? 0;
                  return (
                    <Group key={gp.id} grow align="flex-start">
                      <Box style={{ flex: 2 }} p="sm" bg="#fff" withBorder style={{ borderRadius: 8 }}>
                        <Text size="sm" fw={500}>{gp.description}</Text>
                        <Text size="xs" c="dimmed">满分 {Number(gp.max_score)}</Text>
                      </Box>
                      <NumberInput
                        min={0}
                        max={Number(gp.max_score)}
                        decimalScale={2}
                        value={cur}
                        onChange={(v) => {
                          const val = Number(v) || 0;
                          const total = computeTotalFromPoints() - Number(reviewForm.values.pointScores[String(gp.id)] || 0) + val;
                          reviewForm.setFieldValue(`pointScores.${gp.id}`, val);
                          reviewForm.setFieldValue('new_total_score', total);
                        }}
                        style={{ maxWidth: 140 }}
                      />
                    </Group>
                  );
                })}
                <Group justify="flex-end">
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={() => {
                      const total = computeTotalFromPoints();
                      reviewForm.setFieldValue('new_total_score', total);
                      notifications.show({ message: '已根据评分点重新计算总分', color: 'blue' });
                    }}
                  >
                    重新计算总分
                  </Button>
                  <NumberInput
                    label="调整后总分"
                    min={0}
                    max={Number(answer.question_max_score) || 100}
                    decimalScale={2}
                    value={reviewForm.values.new_total_score}
                    onChange={(v) => reviewForm.setFieldValue('new_total_score', Number(v) || 0)}
                    style={{ width: 200 }}
                  />
                </Group>
              </Stack>
            </Box>

            <Box p="md" bg="#fff0f6" style={{ borderRadius: 8, border: '1px solid #faa2c1' }}>
              <Text fw={500} mb="sm">✍️ 复核处理</Text>
              <Group mb="md">
                <Button.Group>
                  <Button
                    variant={reviewForm.values.action === 'approve' ? 'filled' : 'outline'}
                    color="green"
                    onClick={() => reviewForm.setFieldValue('action', 'approve')}
                    leftSection={<IconCheck size={14} />}
                  >通过申诉</Button>
                  <Button
                    variant={reviewForm.values.action === 'reject' ? 'filled' : 'outline'}
                    color="red"
                    onClick={() => reviewForm.setFieldValue('action', 'reject')}
                    leftSection={<IconX size={14} />}
                  >驳回申诉</Button>
                </Button.Group>
              </Group>
              <Textarea
                label="复核意见"
                placeholder="请详细说明复核理由，帮助学生理解评分依据..."
                minRows={3}
                required
                error={reviewForm.errors.review_comment}
                {...reviewForm.getInputProps('review_comment')}
              />
            </Box>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setReviewOpened(false)}>取消</Button>
              <Button onClick={handleSubmitReview} loading={submitting}>
                提交复核
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
