'use client';

import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  colors: {
    'ocean-blue': ['#7AD1DD', '#5FCCDB', '#44CADC', '#2AC9DE', '#1AC2D9', '#11B7CD', '#09ADC3', '#0E99AC', '#128797', '#147885'],
    'bright-pink': ['#F0BBDD', '#ED9BCF', '#EC7CC3', '#ED5DB8', '#F13EAF', '#F71FA0', '#FA0197', '#E80384', '#DA0578', '#C6086E'],
  },
  headings: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (accessToken) {
      fetchMe();
    }
  }, [accessToken, fetchMe]);

  return (
    <html lang="zh-CN">
      <head>
        <title>在线教育作业批改申诉系统</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
      </head>
      <body style={{ margin: 0, minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <MantineProvider theme={theme} defaultColorScheme="light">
          <Notifications position="top-right" />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
