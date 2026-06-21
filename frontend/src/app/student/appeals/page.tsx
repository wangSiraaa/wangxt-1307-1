'use client';

import { useEffect, useState } from 'react';
import {
  Paper, Title, Table, Badge, Group, Box, Stack, Text, Button, Select,
  Modal, ScrollArea, SimpleGrid, Alert,
} from '@mantine/core';
import { useRouter } from 'next/navigation';
import { appealApi, scoreVersionApi } from '@/lib/api';
import { Appeal, ScoreVersion } from '@/types';
import dayjs from 'dayjs';
import { IconAlertCircle, IconEye, IconCheck, IconX } from '@tabler/icons-react';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'yellow' },
  reviewing: { label: '复核中', color: 'blue' },
  approved: { label: '通过', color: 'green' },
  rejected: { label: '驳回', color: 'red' },
};

export default function StudentAppealsPage() {
  const router = useRouter();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Appeal | null>(null);
  const [versions, setVersions] = useState<ScoreVersion[]>([]);
  const [detailOpened, setDetailOpened] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = { page_size: 100 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await appealApi.list(params);
      setAppeals(data.results || []);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (a: Appeal) => {
    setSelected(a);
    if (a.id) {
      const { data } = await scoreVersionApi.list({ appeal: a.id, page_size: 100 });
      setVersions(data.results || []);
    }
    setDetailOpened(true);
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3} style={{ margin: 0 }}>我的申诉</Title>
        <Select
          value={statusFilter}
          onChange={(v) => setStatusFilter(v || 'all')}
          data={[
            { value: 'all', label: '全部状态' },
            { value: 'pending', label: '待处理' },
            { value: 'reviewing', label: '复核中' },
            { value: 'approved', label: '通过' },
            { value: 'rejected', label: '驳回' },
          ]}
          style={{ width: 160 }}
        />
      </Group>

      <Paper p="md" radius="md" shadow="sm">
        <Table striped highlightOnHover withTableBorder verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>作业</Table.Th>
              <Table.Th>题号</Table.Th>
              <Table.Th>原得分</Table.Th>
              <Table.Th>申诉理由</Table.Th>
              <Table.Th>状态</Table.Th>
              <Table.Th>提交时间</Table.Th>
              <Table.Th>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {appeals.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={7} align="center" py="xl" color="dimmed">
                  暂无申诉记录
                </Table.Td>
              </Table.Tr>
            )}
            {appeals.map((a) => (
              <Table.Tr key={a.id}>
                <Table.Td>{a.assignment_title}</Table.Td>
                <Table.Td>第 {a.question_no} 题</Table.Td>
                <Table.Td>
                  <Group gap={8}>
                    <Text>{Number(a.original_score)}</Text>
                    {a.new_total_score !== null && a.new_total_score !== undefined && a.status === 'approved' && (
                      <Text c="green" fw={600}>
                        → {Number(a.new_total_score)}
                      </Text>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text lineClamp={1} size="sm">{a.reason}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={STATUS_MAP[a.status]?.color} size="sm">
                    {STATUS_MAP[a.status]?.label}
                  </Badge>
                </Table.Td>
                <Table.Td>{dayjs(a.submitted_at).format('MM-DD HH:mm')}</Table.Td>
                <Table.Td>
                  <Button size="xs" variant="light" onClick={() => openDetail(a)} leftSection={<IconEye size={14} />}>
                    查看
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={detailOpened} onClose={() => setDetailOpened(false)} title="申诉详情" size="lg" padding="lg">
        {selected && (
          <Stack>
            <Group grow>
              <Box p="sm" bg="#f8f9fa" style={{ borderRadius: 8 }}>
                <Text size="xs" c="dimmed">作业</Text>
                <Text fw={500}>{selected.assignment_title}</Text>
              </Box>
              <Box p="sm" bg="#f8f9fa" style={{ borderRadius: 8 }}>
                <Text size="xs" c="dimmed">题号</Text>
                <Text fw={500}>第 {selected.question_no} 题</Text>
              </Box>
              <Box p="sm" bg="#f8f9fa" style={{ borderRadius: 8 }}>
                <Text size="xs" c="dimmed">状态</Text>
                <Badge color={STATUS_MAP[selected.status]?.color} mt={4}>
                  {STATUS_MAP[selected.status]?.label}
                </Badge>
              </Box>
            </Group>

            <Box p="md" bg="blue.0" style={{ borderRadius: 8 }}>
              <Text fw={500} mb={6} size="sm">申诉理由</Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{selected.reason}</Text>
            </Box>

            {selected.evidences && selected.evidences.length > 0 && (
              <Box>
                <Text fw={500} size="sm" mb="xs">上传证据</Text>
                <SimpleGrid cols={3}>
                  {selected.evidences.map((e) => (
                    <Box key={e.id} p="sm" withBorder style={{ borderRadius: 8, textAlign: 'center' }}>
                      {e.image ? (
                        <img src={e.image} alt={e.description} style={{ maxHeight: 80, maxWidth: '100%', borderRadius: 4 }} />
                      ) : (
                        <Box p="md" bg="#f1f3f5" style={{ borderRadius: 4 }}>📎</Box>
                      )}
                      <Text size="xs" mt={4} lineClamp={1}>{e.description}</Text>
                    </Box>
                  ))}
                </SimpleGrid>
              </Box>
            )}

            {selected.review_comment && (
              <Alert color={selected.status === 'approved' ? 'green' : 'red'}
                title={`复核结果：${selected.status === 'approved' ? '申诉通过' : '申诉驳回'}`}>
                {selected.review_comment}
                {selected.reviewed_by_info && (
                  <Text size="xs" c="dimmed" mt={6}>
                    复核人：{selected.reviewed_by_info.first_name || selected.reviewed_by_info.username}
                    {' · '}{dayjs(selected.reviewed_at).format('YYYY-MM-DD HH:mm')}
                  </Text>
                )}
              </Alert>
            )}

            {versions.length > 0 && (
              <Box>
                <Text fw={500} size="sm" mb="xs">分数变更记录</Text>
                <Stack gap="xs">
                  {versions.map((v) => (
                    <Box key={v.id} p="sm" bg="#fff" withBorder style={{ borderRadius: 8 }}>
                      <Group justify="space-between">
                        <Badge color="blue" size="sm">{v.version_type_display}</Badge>
                        <Text size="xs" c="dimmed">{dayjs(v.changed_at).format('MM-DD HH:mm')}</Text>
                      </Group>
                      <Group mt={4}>
                        <Text size="sm">
                          {Number(v.original_total_score)} → {Number(v.new_total_score)}
                        </Text>
                        <Badge size="xs" color={Number(v.score_diff || 0) > 0 ? 'green' : 'red'}>
                          {Number(v.score_diff) > 0 ? '+' : ''}{Number(v.score_diff).toFixed(2)}
                        </Badge>
                      </Group>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
