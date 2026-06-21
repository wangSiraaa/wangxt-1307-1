'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  AppShell, Burger, Group, Title, Text, Avatar, Menu, Button, Badge, Box
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAuthStore } from '@/store/auth';
import { IconLogout, IconUser, IconGripVertical, IconFileText, IconAlertCircle, IconSettings2, IconChartBar } from '@tabler/icons-react';
import Link from 'next/link';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileOpen, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpen, { toggle: toggleDesktop }] = useDisclosure(true);
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = getNavItems(user?.role);
  const roleLabel: Record<string, { label: string; color: string }> = {
    student: { label: '学生', color: 'blue' },
    ta: { label: '助教', color: 'teal' },
    head: { label: '教研负责人', color: 'orange' },
  };

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpen, desktop: !desktopOpen },
      }}
      padding="md"
    >
      <AppShell.Header style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #e9ecef', background: '#fff' }}>
        <Group style={{ flex: 1 }}>
          <Burger opened={mobileOpen} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
          <Burger opened={desktopOpen} onClick={toggleDesktop} visibleFrom="sm" size="sm" />
          <Title order={4} style={{ marginLeft: 8 }}>作业批改申诉系统</Title>
        </Group>
        <Group>
          {user && (
            <>
              <Badge color={roleLabel[user.role]?.color} size="lg">
                {roleLabel[user.role]?.label}
              </Badge>
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Group style={{ cursor: 'pointer' }}>
                    <Avatar size={36} color="blue">
                      {user.first_name?.[0] || user.username[0].toUpperCase()}
                    </Avatar>
                    <Box style={{ lineHeight: 1.2 }}>
                      <Text size="sm" weight={600}>
                        {user.first_name || user.username}
                      </Text>
                      <Text size="xs" color="dimmed">{user.class_name || user.email}</Text>
                    </Box>
                  </Group>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconUser size={16} />}>个人信息</Menu.Item>
                  <Menu.Divider />
                  <Menu.Item leftSection={<IconLogout size={16} />} onClick={handleLogout} color="red">
                    退出登录
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ borderRight: '1px solid #e9ecef', background: '#fff' }}>
        <Text size="xs" weight={600} color="dimmed" mb={12} style={{ padding: '0 8px' }}>
          功能导航
        </Text>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <Box
              p={10}
              mb={4}
              style={{
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: pathname === item.href || pathname.startsWith(item.href + '/')
                  ? '#e7f3ff'
                  : 'transparent',
                color: pathname === item.href || pathname.startsWith(item.href + '/')
                  ? '#1c7ed6'
                  : '#495057',
                fontWeight: pathname === item.href ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              <item.icon size={18} />
              <Text size="sm">{item.label}</Text>
            </Box>
          </Link>
        ))}
      </AppShell.Navbar>

      <AppShell.Main style={{ background: '#f8f9fa', minHeight: 'calc(100vh - 64px)' }}>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}

function getNavItems(role?: string) {
  const base = [
    { href: '/dashboard', label: '工作台', icon: IconChartBar },
  ];
  if (role === 'student') {
    return [
      ...base,
      { href: '/student/assignments', label: '我的作业', icon: IconFileText },
      { href: '/student/appeals', label: '我的申诉', icon: IconAlertCircle },
    ];
  }
  if (role === 'ta') {
    return [
      ...base,
      { href: '/ta/appeals', label: '申诉复核', icon: IconGripVertical },
      { href: '/ta/assignments', label: '作业管理', icon: IconFileText },
    ];
  }
  if (role === 'head') {
    return [
      ...base,
      { href: '/head/appeals', label: '申诉总览', icon: IconAlertCircle },
      { href: '/head/batches', label: '批量纠错', icon: IconSettings2 },
      { href: '/head/assignments', label: '作业管理', icon: IconFileText },
    ];
  }
  return base;
}
