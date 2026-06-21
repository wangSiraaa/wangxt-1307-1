'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Paper, Title, TextInput, PasswordInput, Button, Group, Alert, Box, Select
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useAuthStore } from '@/store/auth';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
      demoRole: '',
    },
    validate: {
      username: (v) => (v.trim().length > 0 ? null : '请输入用户名'),
      password: (v) => (v.length > 0 ? null : '请输入密码'),
    },
  });

  const handleDemoRole = (role: string) => {
    const map: Record<string, { u: string; p: string }> = {
      student: { u: 'student01', p: 'student123' },
      ta: { u: 'ta01', p: 'ta123456' },
      head: { u: 'head01', p: 'head123456' },
    };
    if (map[role]) {
      form.setValues({ username: map[role].u, password: map[role].p, demoRole: role });
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    setErrorMsg('');
    try {
      await login(values.username, values.password);
      notifications.show({
        icon: <IconCheck size={18} />,
        title: '登录成功',
        message: '正在进入系统...',
        color: 'green',
      });
      setTimeout(() => router.push('/dashboard'), 300);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || '用户名或密码错误';
      setErrorMsg(msg);
      notifications.show({
        icon: <IconAlertCircle size={18} />,
        title: '登录失败',
        message: msg,
        color: 'red',
      });
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)',
      padding: 20,
    }}>
      <Paper shadow="lg" radius="lg" p={40} style={{ width: '100%', maxWidth: 460 }}>
        <Title order={2} mb="xs" style={{ textAlign: 'center' }}>作业批改申诉系统</Title>
        <Box mb="lg" style={{ textAlign: 'center', color: '#666' }}>请输入账号密码登录</Box>

        <Box mb="md">
          <Text size="sm" mb={6} weight={500}>快速体验：</Text>
          <Group mb="sm">
            <Button
              size="xs"
              variant={form.values.demoRole === 'student' ? 'filled' : 'outline'}
              onClick={() => handleDemoRole('student')}
            >学生</Button>
            <Button
              size="xs"
              variant={form.values.demoRole === 'ta' ? 'filled' : 'outline'}
              color="teal"
              onClick={() => handleDemoRole('ta')}
            >助教</Button>
            <Button
              size="xs"
              variant={form.values.demoRole === 'head' ? 'filled' : 'outline'}
              color="orange"
              onClick={() => handleDemoRole('head')}
            >教研负责人</Button>
          </Group>
        </Box>

        {errorMsg && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
            {errorMsg}
          </Alert>
        )}

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="用户名"
            placeholder="请输入用户名"
            size="md"
            mb="md"
            {...form.getInputProps('username')}
          />
          <PasswordInput
            label="密码"
            placeholder="请输入密码"
            size="md"
            mb="lg"
            {...form.getInputProps('password')}
          />
          <Button fullWidth size="md" type="submit" loading={isLoading}>
            登 录
          </Button>
        </form>
      </Paper>
    </div>
  );
}
