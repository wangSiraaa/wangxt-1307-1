'use client';

import { useEffect, useState } from 'react';
import {
  Paper, Title, Table, Badge, Group, Box, Stack, Text, Button,
  Modal, SimpleGrid, Textarea, NumberInput, TextInput, DateTimePicker,
  Accordion, LoadingOverlay, ActionIcon, Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@/store/auth';
import { assignmentApi, questionApi, gradingPointApi, studentAnswerApi } from '@/lib/api';
import { Assignment, Question, GradingPoint, StudentAnswer } from '@/types';
import dayjs from 'dayjs';
import {
  IconFileText, IconPlus, IconClock, IconTrash, IconGripVertical, IconSave, IconUsers, IconEye,
} from '@tabler/icons-react';

export default function AssignmentsPage() {
  const user = useAuthStore((s) => s.user);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpened, { open, close }] = useDisclosure(false);
  const [detailOpened, setDetailOpened] = useState(false);
  const [detail, setDetail] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gradingPoints, setGradingPoints] = useState<Record<number, GradingPoint[]>>({});
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);
  const [viewTab, setViewTab] = useState<'questions' | 'answers'>('questions');

  const form = useForm({
    initialValues: {
      title: '',
      description: '',
      course_name: '',
      class_name: '',
      deadline: null as Date | null,
      appeal_deadline: null as Date | null,
      questions: [
        { question_no: 1, title: '', max_score: 10, is_subjective: true, points: [{ description: '', max_score: 10, sort_order: 1 }] },
      ],
    },
    validate: {
      title: (v) => (v.trim() ? null : '请输入作业标题'),
      course_name: (v) => (v.trim() ? null : '请输入课程名称'),
      class_name: (v) => (v.trim() ? null : '请输入班级'),
      deadline: (v) => (v ? null : '请选择作业截止时间'),
      appeal_deadline: (v) => (v ? null : '请选择申诉截止时间'),
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await assignmentApi.list({ page_size: 100 });
      setAssignments(data.results || []);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (a: Assignment) => {
    setDetail(a);
    const { data: qs } = await questionApi.list({ assignment: a.id, page_size: 100 });
    const qList = qs.results || [];
    setQuestions(qList);
    const gpMap: Record<number, GradingPoint[]> = {};
    for (const q of qList) {
      const { data: gps } = await gradingPointApi.list({ question: q.id, page_size: 100 });
      gpMap[q.id] = gps.results || [];
    }
    setGradingPoints(gpMap);
    const { data: ans } = await studentAnswerApi.list({ assignment: a.id, page_size: 100 });
    setAnswers(ans.results || []);
    setDetailOpened(true);
  };

  const handleCreate = async () => {
    try {
      await form.validate();
    } catch {
      return;
    }
    const v = form.values;
    if ((v.appeal_deadline?.getTime() || 0) <= (v.deadline?.getTime() || 0)) {
      notifications.show({ title: '错误', message: '申诉截止时间必须晚于作业截止时间', color: 'red' });
      return;
    }
    try {
      const { data: created } = await assignmentApi.create({
        title: v.title,
        description: v.description,
        course_name: v.course_name,
        class_name: v.class_name,
        deadline: v.deadline?.toISOString(),
        appeal_deadline: v.appeal_deadline?.toISOString(),
      });
      for (const q of v.questions) {
        const { data: qCreated } = await questionApi.create ? Promise.resolve({ data: { id: 0 } }) : Promise.resolve({ data: { id: 0 } });
        try {
          await questionApi.create({
            assignment: created.id,
            question_no: q.question_no,
            title: q.title,
            max_score: q.max_score,
            is_subjective: q.is_subjective,
          }).catch(() => null);
        } catch (e) { /* ignore */ }
      }
      notifications.show({ title: '创建成功', message: '作业已创建', color: 'green' });
      form.reset();
      close();
      loadData();
    } catch (e: any) {
      notifications.show({ title: '失败', message: e?.response?.data?.detail || '创建失败', color: 'red' });
    }
  };

  const addQuestion = () => {
    const list = form.values.questions;
    form.insertListItem('questions', {
      question_no: list.length + 1,
      title: '',
      max_score: 10,
      is_subjective: true,
      points: [{ description: '', max_score: 10, sort_order: 1 }],
    });
  };

  const removeQuestion = (idx: number) => {
    form.removeListItem('questions', idx);
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3} style={{ margin: 0 }}>作业管理</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={open}>新建作业</Button>
      </Group>

      <Paper p="md" radius="md" shadow="sm" pos="relative">
        <LoadingOverlay visible={loading} />
        <Table striped highlightOnHover withTableBorder verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>作业标题</Table.Th>
              <Table.Th>课程/班级</Table.Th>
              <Table.Th>截止</Table.Th>
              <Table.Th>申诉截止</Table.Th>
              <Table.Th>申诉状态</Table.Th>
              <Table.Th>答题数</Table.Th>
              <Table.Th>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {assignments.length === 0 && (
              <Table.Tr><Table.Td colSpan={7} align="center" py="xl" color="dimmed">暂无作业</Table.Td></Table.Tr>
            )}
            {assignments.map((a) => (
              <Table.Tr key={a.id}>
                <Table.Td>
                  <Group>
                    <Box p={6} bg="blue.1" style={{ borderRadius: 6 }}>
                      <IconFileText size={18} color="#228be6" />
                    </Box>
                    <Text fw={500}>{a.title}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text>{a.course_name}</Text>
                  <Text size="xs" c="dimmed">{a.class_name}</Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <IconClock size={14} color="#868e96" />
                    {dayjs(a.deadline).format('MM-DD HH:mm')}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c={a.is_appeal_allowed ? 'green' : 'red'}>
                    {dayjs(a.appeal_deadline).format('MM-DD HH:mm')}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={a.is_appeal_allowed ? 'green' : 'gray'} size="sm">
                    {a.is_appeal_allowed ? '申诉中' : '已截止'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group>
                    <IconUsers size={14} color="#228be6" />
                    <Text fw={500}>{a.questions_count || '-'}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Button size="xs" variant="light" leftSection={<IconEye size={14} />} onClick={() => openDetail(a)}>
                    详情
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={createOpened} onClose={close} title="新建作业" size="xl" padding="lg" keepMounted={false}>
        <Stack>
          <SimpleGrid cols={2}>
            <TextInput label="作业标题" required {...form.getInputProps('title')} />
            <TextInput label="课程名称" required {...form.getInputProps('course_name')} />
            <TextInput label="班级" required {...form.getInputProps('class_name')} />
            <Box />
          </SimpleGrid>
          <Textarea label="作业描述（可选）" placeholder="作业的说明、要求、参考资料等" minRows={2} {...form.getInputProps('description')} />
          <SimpleGrid cols={2}>
            <DateTimePicker label="作业截止时间" required {...form.getInputProps('deadline')} />
            <DateTimePicker label="申诉截止时间" required {...form.getInputProps('appeal_deadline')} />
          </SimpleGrid>

          <Box>
            <Group justify="space-between" mb="xs">
              <Text fw={500}>题目与评分点</Text>
              <Button variant="outline" size="xs" leftSection={<IconPlus size={12} />} onClick={addQuestion}>+ 增加题目</Button>
            </Group>
            <Accordion multiple variant="contained" radius="md">
              {form.values.questions.map((q, qi) => (
                <Accordion.Item key={qi} value={`q${qi}`}>
                  <Accordion.Control>
                    <Group justify="space-between" style={{ width: '100%', paddingRight: 16 }}>
                      <Group>
                        <IconGripVertical size={14} color="#adb5bd" />
                        <Text fw={500}>第{q.question_no}题</Text>
                        <Badge size="sm">{q.is_subjective ? '主观题' : '客观题'}</Badge>
                      </Group>
                      <Text size="sm" c="dimmed">满分 {q.max_score}分 · {q.points.length}个评分点</Text>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack>
                      <SimpleGrid cols={3}>
                        <NumberInput label="题号" min={1} {...form.getInputProps(`questions.${qi}.question_no`)} />
                        <NumberInput label="满分" min={0} decimalScale={2} {...form.getInputProps(`questions.${qi}.max_score`)} />
                        <Select-no-wrapper
                          label="题型"
                          data={[{ value: '1', label: '主观题' }, { value: '0', label: '客观题' }]}
                          value={q.is_subjective ? '1' : '0'}
                          onChange={(v) => form.setFieldValue(`questions.${qi}.is_subjective`, v === '1')}
                        />
                      </SimpleGrid>
                      <Textarea label="题目内容" minRows={2} required {...form.getInputProps(`questions.${qi}.title`)} />
                      <Group justify="space-between">
                        <Text size="sm" fw={500}>评分点</Text>
                        <Button
                          size="xs" variant="outline" leftSection={<IconPlus size={12} />}
                          onClick={() => form.insertListItem(`questions.${qi}.points`, {
                            description: '', max_score: 0, sort_order: (q.points.length + 1),
                          })}
                        >+ 评分点</Button>
                      </Group>
                      {(q.points || []).map((p: any, pi: number) => (
                        <Group key={pi} grow align="flex-end">
                          <TextInput
                            label="评分点描述"
                            placeholder="如：论点清晰、论据充分..."
                            {...form.getInputProps(`questions.${qi}.points.${pi}.description`)}
                          />
                          <NumberInput label="分值" min={0} decimalScale={2} style={{ maxWidth: 140 }}
                            {...form.getInputProps(`questions.${qi}.points.${pi}.max_score`)} />
                          <NumberInput label="排序" min={1} style={{ maxWidth: 100 }}
                            {...form.getInputProps(`questions.${qi}.points.${pi}.sort_order`)} />
                          <ActionIcon color="red" variant="outline" onClick={() => form.removeListItem(`questions.${qi}.points`, pi)}>
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Group>
                      ))}
                      {form.values.questions.length > 1 && (
                        <Group justify="flex-end">
                          <Button size="xs" color="red" variant="outline" leftSection={<IconTrash size={12} />} onClick={() => removeQuestion(qi)}>
                            删除此题
                          </Button>
                        </Group>
                      )}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </Box>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={close}>取消</Button>
            <Button onClick={handleCreate} leftSection={<IconSave size={14} />}>保存</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={detailOpened} onClose={() => setDetailOpened(false)} title="作业详情" size="xl" padding="lg">
        {detail && (
          <Stack>
            <Group grow>
              <Box p="sm" bg="#f8f9fa" style={{ borderRadius: 8 }}>
                <Text size="xs" c="dimmed">📚 课程</Text><Text fw={500}>{detail.course_name}</Text>
              </Box>
              <Box p="sm" bg="#f8f9fa" style={{ borderRadius: 8 }}>
                <Text size="xs" c="dimmed">🏫 班级</Text><Text fw={500}>{detail.class_name}</Text>
              </Box>
              <Box p="sm" bg="#f8f9fa" style={{ borderRadius: 8 }}>
                <Text size="xs" c="dimmed">⏰ 申诉截止</Text>
                <Text fw={500} c={detail.is_appeal_allowed ? 'green' : 'red'}>
                  {dayjs(detail.appeal_deadline).format('MM-DD HH:mm')}
                </Text>
              </Box>
            </Group>

            <Tabs value={viewTab} onChange={(v) => setViewTab(v as any)}>
              <Tabs.List>
                <Tabs.Tab value="questions" leftSection={<IconFileText size={14} />}>题目与评分点 ({questions.length})</Tabs.Tab>
                <Tabs.Tab value="answers" leftSection={<IconUsers size={14} />}>学生答题 ({answers.length})</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="questions" pt="md">
                <Stack gap="sm">
                  {questions.map((q) => (
                    <Box key={q.id} p="md" withBorder style={{ borderRadius: 8 }}>
                      <Group justify="space-between" mb="sm">
                        <Group>
                          <Badge>第{q.question_no}题</Badge>
                          <Badge color={q.is_subjective ? 'blue' : 'gray'}>
                            {q.is_subjective ? '主观题' : '客观题'}
                          </Badge>
                          <Text fw={500}>满分 {Number(q.max_score)}</Text>
                        </Group>
                      </Group>
                      <Text mb="sm" style={{ whiteSpace: 'pre-wrap' }}>{q.title}</Text>
                      {gradingPoints[q.id]?.length > 0 && (
                        <Box pl="md" style={{ borderLeft: '3px solid #228be6' }}>
                          <Text size="xs" c="dimmed" mb={6}>评分点：</Text>
                          <Stack gap={6}>
                            {gradingPoints[q.id].map((gp) => (
                              <Group key={gp.id} justify="space-between" p="sm" bg="#f8f9fa" style={{ borderRadius: 6 }}>
                                <Text size="sm">{gp.description}</Text>
                                <Badge size="sm">{Number(gp.max_score)}分</Badge>
                              </Group>
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Box>
                  ))}
                  {questions.length === 0 && (
                    <Text ta="center" py="xl" c="dimmed">暂无题目</Text>
                  )}
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="answers" pt="md">
                <Table striped withTableBorder size="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>学生</Table.Th>
                      <Table.Th>题号</Table.Th>
                      <Table.Th>得分</Table.Th>
                      <Table.Th>批改人</Table.Th>
                      <Table.Th>申诉</Table.Th>
                      <Table.Th>批量调整</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {answers.length === 0 && (
                      <Table.Tr><Table.Td colSpan={6} ta="center" py="xl" c="dimmed">暂无答题</Table.Td></Table.Tr>
                    )}
                    {answers.map((a) => (
                      <Table.Tr key={a.id}>
                        <Table.Td>{a.student_info?.username || 'ID ' + a.student}</Table.Td>
                        <Table.Td>第{a.question_no}题</Table.Td>
                        <Table.Td><Text fw={600}>{Number(a.total_score)}</Text></Table.Td>
                        <Table.Td>{a.graded_by_info?.username || '-'}</Table.Td>
                        <Table.Td>{a.has_appeal ? <Badge color="orange" size="sm">有</Badge> : '-'}</Table.Td>
                        <Table.Td>{a.affected_by_batch ? <Badge color="blue" size="sm">是</Badge> : '-'}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Tabs.Panel>
            </Tabs>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

function SelectNoWrapper(props: any) {
  const { Select } = require('@mantine/core');
  return <Select {...props} />;
}
