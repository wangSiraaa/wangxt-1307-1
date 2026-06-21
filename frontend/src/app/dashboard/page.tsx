'use client';

import { useEffect, useState } from 'react';
import { Grid, Paper, Text, Group, Badge, Title, SimpleGrid, Stack, Box } from '@mantine/core';
import { useAuthStore } from '@/store/auth';
import { assignmentApi, appealApi, studentAnswerApi, batchCorrectionApi } from '@/lib/api';
import { Assignment, Appeal, StudentAnswer, BatchCorrection } from '@/types';
import { IconFileText, IconAlertCircle, IconUsers, IconCheck } from '@tabler/icons-react';
import Link from 'next/link';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<any>({
    assignments: 0,
    appeals: 0,
    pending: 0,
    answered: 0,
  });
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [batches, setBatches] = useState<BatchCorrection[]>([]);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    try {
      const [assRes, appealRes] = await Promise.all([
        assignmentApi.list({ page_size: 5 }),
        appealApi.list({ page_size: 5 }),
      ]);
      setAssignments(assRes.data.results || []);
      setAppeals(appealRes.data.results || []);
      setStats((s: any) => ({
        ...s,
        assignments: assRes.data.count || 0,
        appeals: appealRes.data.count || 0,
        pending: (appealRes.data.results || []).filter((a: Appeal) => a.status === 'pending').length,
      }));

      if (user?.role !== 'student') {
        const [ansRes, batchRes] = await Promise.all([
          studentAnswerApi.list({ page_size: 1 }),
          user.role === 'head' ? batchCorrectionApi.list({ page_size: 5 }) : Promise.resolve({ data: { results: [] } }),
        ]);
        setStats((s: any) => ({ ...s, answered: ansRes.data.count || 0 }));
        if (user.role === 'head') setBatches(batchRes.data.results || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const statColor: Record<string, string> = { student: 'blue', ta: 'teal', head: 'orange' };
  const welcomeText = {
    student: '欢迎回来，请查看您的作业分数和申诉状态',
    ta: '欢迎回来，请处理待复核的申诉',
    head: '欢迎回来，请查看批量纠错进度',
  };

  return (
    <Stack gap="md">
      <Paper p="xl" radius="md" shadow="sm" style={{ background: `linear-gradient(135deg, var(--mantine-color-${statColor[user?.role || 'student']}-6), var(--mantine-color-${statColor[user?.role || 'student']}-4))`, color: '#fff' }}>
        <Title order={3} mb={6}>你好，{user?.first_name || user?.username} 👋</Title>
        <Text size="sm" opacity={0.95}>
          {welcomeText[user?.role as keyof typeof welcomeText] || welcomeText.student}
        </Text>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <StatCard icon={IconFileText} label="作业总数" value={stats.assignments} color="blue" />
        <StatCard icon={IconAlertCircle} label="申诉总数" value={stats.appeals} color="orange" />
        <StatCard icon={IconUsers} label="待处理申诉" value={stats.pending} color="red" />
        <StatCard icon={IconCheck} label={user?.role === 'student' ? '我的答题数' : '学生答题数'} value={stats.answered} color="teal" />
      </SimpleGrid>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Paper p="md" radius="md" shadow="sm">
            <Group justify="space-between" mb="md">
              <Text weight={600} size="lg">最近作业</Text>
              <Link href={getAssignmentsLink(user?.role)} style={{ color: '#228be6', textDecoration: 'none', fontSize: 14 }}>查看全部 →</Link>
            </Group>
            <Stack gap="sm">
              {assignments.length === 0 && <EmptyState text="暂无作业数据" />}
              {assignments.map((a) => (
                <Box key={a.id} p="sm" style={{ border: '1px solid #e9ecef', borderRadius: 8 }}>
                  <Group justify="space-between" mb={4}>
                    <Text weight={500} size="sm">{a.title}</Text>
                    <Badge size="sm" color={a.is_appeal_allowed ? 'green' : 'gray'}>
                      {a.is_appeal_allowed ? '申诉中' : '已截止'}
                    </Badge>
                  </Group>
                  <Group gap={12}>
                    <Text size="xs" color="dimmed">📚 {a.course_name}</Text>
                    <Text size="xs" color="dimmed">🏫 {a.class_name}</Text>
                    <Text size="xs" color="dimmed">📋 {a.questions_count}题</Text>
                  </Group>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Paper p="md" radius="md" shadow="sm">
            <Group justify="space-between" mb="md">
              <Text weight={600} size="lg">最近申诉</Text>
              <Link href={getAppealsLink(user?.role)} style={{ color: '#228be6', textDecoration: 'none', fontSize: 14 }}>查看全部 →</Link>
            </Group>
            <Stack gap="sm">
              {appeals.length === 0 && <EmptyState text="暂无申诉数据" />}
              {appeals.map((a) => (
                <Box key={a.id} p="sm" style={{ border: '1px solid #e9ecef', borderRadius: 8 }}>
                  <Group justify="space-between" mb={4}>
                    <Text weight={500} size="sm" lineClamp={1}>{a.reason?.slice(0, 30)}...</Text>
                    <AppealBadge status={a.status} />
                  </Group>
                  <Group gap={12}>
                    <Text size="xs" color="dimmed">👤 {a.student_name || a.student_info?.username}</Text>
                    <Text size="xs" color="dimmed">📝 第{a.question_no}题</Text>
                  </Group>
                </Box>
              ))}
            </Stack>
          </Paper>

          {user?.role === 'head' && batches.length > 0 && (
            <Paper p="md" radius="md" shadow="sm" mt="md">
              <Group justify="space-between" mb="md">
                <Text weight={600} size="lg">批量纠错</Text>
                <Link href="/head/batches" style={{ color: '#228be6', textDecoration: 'none', fontSize: 14 }}>全部 →</Link>
              </Group>
              <Stack gap="sm">
                {batches.map((b) => (
                  <Box key={b.id} p="sm" style={{ border: '1px solid #e9ecef', borderRadius: 8 }}>
                    <Group justify="space-between" mb={4}>
                      <Text weight={500} size="sm">{b.title}</Text>
                      <Badge size="sm" color={b.status === 'completed' ? 'green' : b.status === 'draft' ? 'blue' : 'orange'}>
                        {b.status_display}
                      </Badge>
                    </Group>
                    <Text size="xs" color="dimmed">📊 影响 {b.affected_count} 名学生</Text>
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

function getAssignmentsLink(role?: string) {
  if (role === 'student') return '/student/assignments';
  if (role === 'ta') return '/ta/assignments';
  return '/head/assignments';
}
function getAppealsLink(role?: string) {
  if (role === 'student') return '/student/appeals';
  if (role === 'ta') return '/ta/appeals';
  return '/head/appeals';
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <Paper p="md" radius="md" shadow="sm" withBorder>
      <Group>
        <Box p={10} bg={`${color}.1`} style={{ borderRadius: 8 }}>
          <Icon size={24} color={`var(--mantine-color-${color}-6)`} />
        </Box>
        <Box>
          <Text size="xs" color="dimmed">{label}</Text>
          <Text weight={700} size="xl">{value}</Text>
        </Box>
      </Group>
    </Paper>
  );
}

function AppealBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    pending: { color: 'yellow', label: '待处理' },
    reviewing: { color: 'blue', label: '复核中' },
    approved: { color: 'green', label: '通过' },
    rejected: { color: 'red', label: '驳回' },
  };
  const c = map[status] || { color: 'gray', label: status };
  return <Badge size="sm" color={c.color}>{c.label}</Badge>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <Box p={24} style={{ textAlign: 'center', color: '#adb5bd' }}>
      <Text size="sm">{text}</Text>
    </Box>
  );
}
