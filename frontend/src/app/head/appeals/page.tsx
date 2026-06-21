'use client';

import { useEffect, useState } from 'react';
import {
  Paper, Title, Table, Badge, Group, Box, Stack, Text, Button, Select,
  SimpleGrid, Progress,
} from '@mantine/core';
import { appealApi, assignmentApi, batchCorrectionApi } from '@/lib/api';
import { Appeal, Assignment } from '@/types';
import dayjs from 'dayjs';
import { IconAlertCircle, IconCheck, IconX, IconEye } from '@tabler/icons-react';
import Link from 'next/link';

const STATUS_LIST = [
  { key: 'pending', label: '待处理', color: 'yellow', icon: IconAlertCircle },
  { key: 'reviewing', label: '复核中', color: 'blue', icon: IconEye },
  { key: 'approved', label: '通过', color: 'green', icon: IconCheck },
  { key: 'rejected', label: '驳回', color: 'red', icon: IconX },
];

export default function HeadAppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assignFilter, setAssignFilter] = useState<string>('');
  const [stats, setStats] = useState<any>({ total: 0, pending: 0, reviewing: 0, approved: 0, rejected: 0 });

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
    const params: any = { page_size: 100 };
    if (statusFilter !== 'all') params.status = statusFilter;
    if (assignFilter) params.assignment = assignFilter;
    const { data } = await appealApi.list(params);
    const list = data.results || [];
    setAppeals(list);
    setStats({
      total: data.count || list.length,
      pending: list.filter((a) => a.status === 'pending').length,
      reviewing: list.filter((a) => a.status === 'reviewing').length,
      approved: list.filter((a) => a.status === 'approved').length,
      rejected: list.filter((a) => a.status === 'rejected').length,
    });
  };

  const pct = (v: number) => stats.total ? Math.round((v / stats.total) * 100) : 0;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3} style={{ margin: 0 }}>申诉总览</Title>
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
              ...STATUS_LIST.map((s) => ({ value: s.key, label: s.label })),
            ]}
            style={{ width: 150 }}
          />
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 2, md: 5 }}>
        <StatCard label="申诉总数" value={stats.total} color="blue" icon={IconAlertCircle} pct={100} />
        {STATUS_LIST.map((s) => (
          <StatCard
            key={s.key}
            label={s.label}
            value={stats[s.key as keyof typeof stats] || 0}
            color={s.color}
            icon={s.icon}
            pct={pct(stats[s.key as keyof typeof stats] || 0)}
          />
        ))}
      </SimpleGrid>

      <Paper p="md" radius="md" shadow="sm">
        <Group justify="space-between" mb="sm">
          <Text fw={600}>申诉处理进度</Text>
          <Link href="/ta/appeals" style={{ textDecoration: 'none', color: '#228be6', fontSize: 14 }}>
            去助教复核页处理 →
          </Link>
        </Group>
        <Stack gap="sm">
          {STATUS_LIST.map((s) => {
            const v = stats[s.key as keyof typeof stats] || 0;
            if (!v) return null;
            return (
              <Box key={s.key}>
                <Group justify="space-between" mb={4}>
                  <Badge color={s.color}>{s.label}</Badge>
                  <Text size="xs" c="dimmed">{v} 件 · {pct(v)}%</Text>
                </Group>
                <Progress value={pct(v)} color={s.color} size="sm" radius="sm" />
              </Box>
            );
          })}
          {stats.total === 0 && (
            <Box py="xl" style={{ textAlign: 'center', color: '#adb5bd' }}>
              暂无申诉数据
            </Box>
          )}
        </Stack>
      </Paper>

      <Paper p="md" radius="md" shadow="sm">
        <Text fw={600} size="lg" mb="sm">申诉列表</Text>
        <Table striped highlightOnHover withTableBorder verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>学生</Table.Th>
              <Table.Th>作业/题号</Table.Th>
              <Table.Th>原分</Table.Th>
              <Table.Th>申诉理由</Table.Th>
              <Table.Th>状态</Table.Th>
              <Table.Th>复核人</Table.Th>
              <Table.Th>提交时间</Table.Th>
              <Table.Th>关联批量</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {appeals.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={8} align="center" py="xl" color="dimmed">暂无申诉记录</Table.Td>
              </Table.Tr>
            )}
            {appeals.map((a) => {
              const sm = STATUS_LIST.find((s) => s.key === a.status);
              return (
                <Table.Tr key={a.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>{a.student_name || a.student_info?.username}</Text>
                    <Text size="xs" c="dimmed">{a.student_info?.class_name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{a.assignment_title}</Text>
                    <Text size="xs" c="dimmed">第{a.question_no}题</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={6}>
                      <Text>{Number(a.original_score)}</Text>
                      {a.new_total_score !== null && a.new_total_score !== undefined && (
                        <Text c="green" fw={600}>→ {Number(a.new_total_score)}</Text>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text lineClamp={1} size="sm" style={{ maxWidth: 200 }}>{a.reason}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={sm?.color} size="sm">{sm?.label}</Badge>
                  </Table.Td>
                  <Table.Td>
                    {a.reviewed_by_info
                      ? <Text size="sm">{a.reviewed_by_info.first_name || a.reviewed_by_info.username}</Text>
                      : <Text size="xs" c="dimmed">-</Text>}
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">{dayjs(a.submitted_at).format('MM-DD HH:mm')}</Text>
                  </Table.Td>
                  <Table.Td>
                    {a.related_batch ? (
                      <Badge color="orange" size="sm">批量 #{a.related_batch}</Badge>
                    ) : (
                      <Text size="xs" c="dimmed">-</Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}

function StatCard({ label, value, color, icon: Icon, pct }: any) {
  return (
    <Paper p="md" radius="md" shadow="sm" withBorder>
      <Group justify="space-between" mb="xs">
        <Text size="xs" c="dimmed">{label}</Text>
        <Box p={6} bg={`${color}.1`} style={{ borderRadius: 6 }}>
          <Icon size={16} color={`var(--mantine-color-${color}-6)`} />
        </Box>
      </Group>
      <Text fw={700} size="xl">{value}</Text>
      <Progress value={pct} color={color} size="xs" mt={6} />
    </Paper>
  );
}
