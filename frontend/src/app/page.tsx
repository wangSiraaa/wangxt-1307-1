import Link from 'next/link';

export const metadata = {
  title: '欢迎 - 作业批改申诉系统',
};

export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <div style={{
        maxWidth: 900,
        padding: 48,
        textAlign: 'center',
        color: 'white',
      }}>
        <h1 style={{ fontSize: 56, marginBottom: 16, fontWeight: 800 }}>
          作业批改申诉系统
        </h1>
        <p style={{ fontSize: 20, marginBottom: 48, opacity: 0.9 }}>
          学生提交申诉、助教复核评分点、教研负责人批量纠错
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/login"
            style={{
              padding: '14px 32px',
              backgroundColor: 'white',
              color: '#667eea',
              textDecoration: 'none',
              borderRadius: 8,
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            登录系统
          </Link>
        </div>
        <div style={{ marginTop: 80, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          <FeatureCard
            icon="🎓"
            title="学生"
            desc="针对主观题提交申诉和证据，查看处理进度和历史版本"
          />
          <FeatureCard
            icon="👨‍🏫"
            title="助教"
            desc="复核评分点得分，结合证据给出公正的复核意见"
          />
          <FeatureCard
            icon="📊"
            title="教研负责人"
            desc="批量处理规则错误，按班级统一调整分数，支持回滚"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.15)',
      backdropFilter: 'blur(10px)',
      borderRadius: 12,
      padding: 24,
      textAlign: 'left',
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ margin: '0 0 8px 0', fontSize: 20 }}>{title}</h3>
      <p style={{ margin: 0, opacity: 0.85, fontSize: 14, lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}
