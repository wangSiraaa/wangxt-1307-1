'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Paper, Title, Text, Table, Badge, Group, Box, Button, SimpleGrid, Stack,
  TextInput, Select
} from '@mantine/core';
import { IconFileText, IconClock, IconSearch } from '@tabler/icons-react';
import { assignmentApi } from '@/lib/api';
import { Assignment } from '@/types';
import dayjs from 'dayjs';

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

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

  const filtered = assignments.filter((a) => {
    const searchMatch = (a.title + a.course_name).toLowerCase().includes(search.toLowerCase());
    if (!searchMatch) return false;
    if (filter === 'allowed') return a.is_appeal_allowed;
    if (filter === 'closed') return !a.is_appeal_allowed;
    return true;
  });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3} style={{ margin: 0 }}>我的作业</Title>
      </Group>

      <Paper p="md" radius="md" shadow="sm">
        <Group mb="md" grow>
          <TextInput
            placeholder="搜索作业标题或课程..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={filter}
            onChange={(v) => setFilter(v || 'all')}
            data={[
              { value: 'all', label: '全部' },
              { value: 'allowed', label: '申诉中' },
              { value: 'closed', label: '已截止' },
            ]}
          />
        </Group>

        <Table striped highlightOnHover withTableBorder verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>作业标题</Table.Th>
              <Table.Th>课程</Table.Th>
              <Table.Th>班级</Table.Th>
              <Table.Th>作业截止</Table.Th>
              <Table.Th>申诉截止</Table.Th>
              <Table.Th>状态</Table.Th>
              <Table.Th>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={7} align="center" py="xl" color="dimmed">
                  暂无作业数据
                </Table.Td>
              </Table.Tr>
            )}
            {filtered.map((a) => (
              <Table.Tr key={a.id}>
                <Table.Td>
                  <Group>
                    <Box p={6} bg="blue.1" style={{ borderRadius: 6 }}>
                      <IconFileText size={18} color="#228be6" />
                    </Box>
                    <Text fw={500}>{a.title}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>{a.course_name}</Table.Td>
                <Table.Td>{a.class_name}</Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <IconClock size={14} color="#868e96" />
                    {dayjs(a.deadline).format('YYYY-MM-DD HH:mm')}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c={a.is_appeal_allowed ? 'green' : 'red'}>
                    {dayjs(a.appeal_deadline).format('YYYY-MM-DD HH:mm')}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge size="sm" color={a.is_appeal_allowed ? 'green' : 'gray'}>
                    {a.is_appeal_allowed ? '申诉中' : '已截止'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Link
                    href={`/student/assignments/${a.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Button size="xs" variant="light">查看详情</Button>
                  </Link>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
