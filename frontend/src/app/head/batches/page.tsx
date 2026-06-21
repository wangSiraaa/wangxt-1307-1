'use client';

import { useEffect, useState } from 'react';
import {
  Paper, Title, Table, Badge, Group, Box, Stack, Text, Button, Select,
  Modal, SimpleGrid, Textarea, NumberInput, TextInput, ScrollArea, Tabs,
  Alert, Divider, Tooltip, ActionIcon, LoadingOverlay,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@/store/auth';
import {
  batchCorrectionApi, questionApi, assignmentApi, gradingPointApi, appealApi,
} from '@/lib/api';
import { BatchCorrection, Question, Assignment, GradingPoint, Appeal } from '@/types';
import dayjs from 'dayjs';
import {
  IconSettings2, IconPlay, IconRotate, IconEye, IconPlus, IconAlertCircle,
  IconCheck, IconX, IconRefresh,
} from '@tabler/icons-react';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'blue' },
  executing: { label: '执行中', color: 'yellow' },
  completed: { label: '已完成', color: 'green' },
  rolled_back: { label: '已回滚', color: 'gray' },
};

const RULE_OPTIONS = [
  { value: 'add', label: '加分 (+value)' },
  { value: 'subtract', label: '减分 (-value)' },
  { value: 'set', label: '设为固定分 (=value)' },
  { value: 'percent', label: '按比例调整 (% value)' },
];

export default function HeadBatchesPage() {
  const [batches, setBatches] = useState<BatchCorrection[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gradingPoints, setGradingPoints] = useState<GradingPoint[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [previewOpened, setPreviewOpened] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [actioning, setActioning] = useState<number | null>(null);

  const form = useForm({
    initialValues: {
      title: '',
      description: '',
      assignment: '',
      question: '',
      class_name: '',
      affected_grading_point: '',
      rule_type: 'add' as 'add' | 'subtract' | 'set' | 'percent',
      adjust_value: 1,
      min_score_limit: 0,
      max_score_limit: '' as number | string,
    },
    validate: {
      title: (v) => (v.trim() ? null : '请输入标题'),
      description: (v) => (v.trim().length > 9 ? null : '请详细描述纠错原因（≥10字）'),
      question: (v) => (v ? null : '请选择题目'),
      class_name: (v) => (v.trim() ? null : '请输入班级'),
    },
  });

  useEffect(() => {
    loadData();
    loadAssignments();
  }, [statusFilter]);

  useEffect(() => {
    if (form.values.assignment) {
      loadQuestions(Number(form.values.assignment));
    } else {
      setQuestions([]);
    }
  }, [form.values.assignment]);

  useEffect(() => {
    if (form.values.question) {
      loadGradingPoints(Number(form.values.question));
    } else {
      setGradingPoints([]);
    }
  }, [form.values.question]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = { page_size: 100 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await batchCorrectionApi.list(params);
      setBatches(data.results || []);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    const { data } = await assignmentApi.list({ page_size: 100 });
    setAssignments(data.results || []);
  };

  const loadQuestions = async (aid: number) => {
    const { data } = await questionApi.list({ assignment: aid, page_size: 100 });
    setQuestions(data.results || []);
  };

  const loadGradingPoints = async (qid: number) => {
    const { data } = await gradingPointApi.list({ question: qid, page_size: 100 });
    setGradingPoints(data.results || []);
  };

  const handleCreate = async () => {
    try {
      await form.validate();
    } catch {
      return;
    }
    const v = form.values;
    await batchCorrectionApi.create({
      title: v.title,
      description: v.description,
      question: Number(v.question),
      class_name: v.class_name,
      affected_grading_point: v.affected_grading_point ? Number(v.affected_grading_point) : null,
      rule_type: v.rule_type,
      adjust_value: Number(v.adjust_value),
      min_score_limit: Number(v.min_score_limit),
      max_score_limit: v.max_score_limit !== '' ? Number(v.max_score_limit) : null,
    });
    notifications.show({ title: '创建成功', message: '草稿已保存，可预览后执行', color: 'green', icon: <IconCheck /> });
    form.reset();
    closeCreate();
    loadData();
  };

  const handleExecute = async (id: number) => {
    if (!confirm('执行后将影响该班级所有学生，确认执行？')) return;
    setActioning(id);
    try {
      await batchCorrectionApi.execute(id);
      notifications.show({ title: '执行成功', message: '已批量调整分数', color: 'green' });
      loadData();
    } catch (e: any) {
      notifications.show({ title: '失败', message: e?.response?.data?.detail || '执行失败', color: 'red' });
    } finally {
      setActioning(null);
    }
  };

  const handleRollback = async (id: number) => {
    if (!confirm('回滚将撤销本次批量调整对所有学生的影响，确认回滚？')) return;
    setActioning(id);
    try {
      await batchCorrectionApi.rollback(id);
      notifications.show({ title: '回滚成功', message: '已恢复所有学生分数', color: 'green' });
      loadData();
    } catch (e: any) {
      notifications.show({ title: '失败', message: e?.response?.data?.detail || '回滚失败', color: 'red' });
    } finally {
      setActioning(null);
    }
  };

  const handlePreview = async (id: number) => {
    try {
      const { data } = await batchCorrectionApi.preview(id);
      setPreviewData(data);
      setPreviewOpened(true);
    } catch (e) {
      notifications.show({ title: '失败', message: '预览失败', color: 'red' });
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3} style={{ margin: 0 }}>批量纠错管理</Title>
        <Group>
          <Select
            value={statusFilter}
            onChange={(v) => setStatusFilter(v || 'all')}
            data={[
              { value: 'all', label: '全部状态' },
              { value: 'draft', label: '草稿' },
              { value: 'executing', label: '执行中' },
              { value: 'completed', label: '已完成' },
              { value: 'rolled_back', label: '已回滚' },
            ]}
            style={{ width: 150 }}
          />
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            新建批量纠错
          </Button>
        </Group>
      </Group>

      <Paper p="md" radius="md" shadow="sm" pos="relative">
        <LoadingOverlay visible={loading} />
        <Table striped highlightOnHover withTableBorder verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>标题</Table.Th>
              <Table.Th>作业 / 题号</Table.Th>
              <Table.Th>班级</Table.Th>
              <Table.Th>调整规则</Table.Th>
              <Table.Th>影响学生</Table.Th>
              <Table.Th>创建时间</Table.Th>
              <Table.Th>状态</Table.Th>
              <Table.Th>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {batches.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={8} align="center" py="xl" color="dimmed">
                  暂无批量纠错记录，点击右上角「新建批量纠错」开始
                </Table.Td>
              </Table.Tr>
            )}
            {batches.map((b) => (
              <Table.Tr key={b.id}>
                <Table.Td>
                  <Text fw={500}>{b.title}</Text>
                  <Text size="xs" c="dimmed" lineClamp={1}>{b.description}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{b.assignment_title}</Text>
                  <Text size="xs" c="dimmed">第{b.question_no}题{b.affected_grading_point ? ' · 评分点调整' : ' · 总分调整'}</Text>
                </Table.Td>
                <Table.Td>{b.class_name}</Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <Badge size="sm" color="cyan">{b.rule_type_display}</Badge>
                    <Text size="sm" fw={600}>
                      {b.rule_type === 'percent' ? `${Number(b.adjust_value)}%` : Number(b.adjust_value)}
                    </Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text fw={600} size="lg" c={b.affected_count > 0 ? 'blue' : 'dimmed'}>
                    {b.affected_count}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs">{dayjs(b.created_at).format('MM-DD HH:mm')}</Text>
                  {b.executed_at && <Text size="xs" c="green">执行：{dayjs(b.executed_at).format('MM-DD HH:mm')}</Text>}
                  {b.rolled_back_at && <Text size="xs" c="red">回滚：{dayjs(b.rolled_back_at).format('MM-DD HH:mm')}</Text>}
                </Table.Td>
                <Table.Td>
                  <Badge color={STATUS_MAP[b.status]?.color} size="sm">
                    {STATUS_MAP[b.status]?.label}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" wrap="nowrap">
                    <Tooltip label="预览影响">
                      <ActionIcon size="sm" variant="outline" onClick={() => handlePreview(b.id)}>
                        <IconEye size={14} />
                      </ActionIcon>
                    </Tooltip>
                    {b.status === 'draft' && (
                      <Tooltip label="执行">
                        <ActionIcon size="sm" variant="outline" color="green"
                          loading={actioning === b.id}
                          onClick={() => handleExecute(b.id)}>
                          <IconPlay size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    {b.status === 'completed' && (
                      <Tooltip label="回滚">
                        <ActionIcon size="sm" variant="outline" color="red"
                          loading={actioning === b.id}
                          onClick={() => handleRollback(b.id)}>
                          <IconRotate size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={createOpened} onClose={closeCreate} title="新建批量纠错" size="lg" padding="lg">
        <Stack>
          <Alert color="orange" title="规则说明">
            批量纠错将按班级统一调整目标题目所有学生的得分。支持按评分点或总分调整，仅草稿状态可执行，已执行可回滚。
          </Alert>
          <TextInput label="标题" placeholder="例如：第三题第2评分点全体加2分" required {...form.getInputProps('title')} />
          <Textarea label="纠错说明" placeholder="描述需要批量调整的原因，如：标准答案错误、阅卷标准变更等" minRows={2} required {...form.getInputProps('description')} />

          <SimpleGrid cols={2}>
            <Select
              label="选择作业"
              placeholder="请先选择作业"
              data={assignments.map((a) => ({ value: String(a.id), label: `${a.course_name} · ${a.title}` }))}
              required
              clearable
              searchable
              {...form.getInputProps('assignment')}
            />
            <Select
              label="选择题目"
              placeholder="仅主观题建议使用批量纠错"
              data={questions.map((q) => ({ value: String(q.id), label: `第${q.question_no}题 (满分${Number(q.max_score)}分) ${q.is_subjective ? '' : ' [客观题]'}` }))}
              required
              disabled={!form.values.assignment}
              {...form.getInputProps('question')}
            />
          </SimpleGrid>

          <SimpleGrid cols={2}>
            <TextInput label="目标班级" placeholder="例如：计算机2301班" required {...form.getInputProps('class_name')} />
            <Select
              label="目标评分点（可选）"
              placeholder="留空则调整总分"
              data={[
                { value: '', label: '（调整总分）' },
                ...gradingPoints.map((gp) => ({ value: String(gp.id), label: `ID${gp.id} · ${gp.description} (满${Number(gp.max_score)})` })),
              ]}
              clearable
              disabled={gradingPoints.length === 0}
              {...form.getInputProps('affected_grading_point')}
            />
          </SimpleGrid>

          <Divider label="调整规则设置" labelPosition="center" />

          <SimpleGrid cols={3}>
            <Select label="规则类型" data={RULE_OPTIONS} required {...form.getInputProps('rule_type')} />
            <NumberInput
              label="调整值"
              placeholder={form.values.rule_type === 'percent' ? '百分比，如10' : '分数值'}
              min={0}
              decimalScale={2}
              required
              {...form.getInputProps('adjust_value')}
            />
            <Box />
          </SimpleGrid>

          <SimpleGrid cols={2}>
            <NumberInput label="最低分限制" min={0} decimalScale={2} {...form.getInputProps('min_score_limit')} />
            <NumberInput
              label="最高分限制（可选）"
              placeholder="留空则取题目/评分点满分"
              min={0}
              decimalScale={2}
              {...form.getInputProps('max_score_limit')}
            />
          </SimpleGrid>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeCreate}>取消</Button>
            <Button onClick={handleCreate}>保存草稿</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={previewOpened} onClose={() => setPreviewOpened(false)} title="批量纠错 - 影响预览" size="md">
        {previewData && (
          <Stack>
            <Group grow>
              <Box p="md" bg="blue.0" style={{ borderRadius: 8, textAlign: 'center' }}>
                <Text size="xs" c="dimmed">总学生数</Text>
                <Text fw={700} size="xl">{previewData.total_count}</Text>
              </Box>
              <Box p="md" bg="orange.0" style={{ borderRadius: 8, textAlign: 'center' }}>
                <Text size="xs" c="dimmed">将被调整</Text>
                <Text fw={700} size="xl" c="orange.7">{previewData.will_change_count}</Text>
              </Box>
            </Group>
            <Text fw={500}>学生明细：</Text>
            <ScrollArea h={320} type="auto">
              <Table withTableBorder size="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>学生</Table.Th>
                    <Table.Th>原分</Table.Th>
                    <Table.Th>新分</Table.Th>
                    <Table.Th>变化</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {previewData.details?.map((d: any, i: number) => {
                    const orig = d.original_total_score ?? d.original_point_score;
                    const new_ = d.new_total_score ?? d.new_point_score;
                    const diff = (Number(new_) || 0) - (Number(orig) ?? 0);
                    return (
                      <Table.Tr key={i} bg={d.changed ? '#fff7e6' : undefined}>
                        <Table.Td>{d.student_name}</Table.Td>
                        <Table.Td>{orig}</Table.Td>
                        <Table.Td>{new_}</Table.Td>
                        <Table.Td>
                          {d.changed ? (
                            <Badge color={diff > 0 ? 'green' : 'red'} size="sm">
                              {diff > 0 ? '+' : ''}{Number(diff).toFixed(2)}
                            </Badge>
                          ) : (
                            <Text size="xs" c="dimmed">无变化</Text>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
