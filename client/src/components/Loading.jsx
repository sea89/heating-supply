import { Spin } from 'antd';
import { FireOutlined } from '@ant-design/icons';

export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f5f5f5',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: 'linear-gradient(135deg, #D4380D, #FA8C16)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(212, 56, 13, 0.3)',
      }}>
        <FireOutlined style={{ fontSize: 32, color: '#fff' }} />
      </div>
      <Spin size="large" />
      <div style={{ color: '#999', fontSize: 14 }}>加载中...</div>
    </div>
  );
}
