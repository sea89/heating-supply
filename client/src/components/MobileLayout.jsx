import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppstoreOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  ToolOutlined,
  UserOutlined,
  SettingOutlined,
  DashboardOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { FloatButton } from 'antd';

const tabs = [
  { key: '/', label: '首页', icon: <DashboardOutlined /> },
  { key: '/parts', label: '备件', icon: <AppstoreOutlined /> },
  { key: '/inventory', label: '库存', icon: <DatabaseOutlined /> },
  { key: '/tools', label: '工具', icon: <ToolOutlined /> },
  { key: '/work-orders', label: '工单', icon: <FileTextOutlined /> },
  { key: '/profile', label: '我的', icon: <UserOutlined /> },
];

export default function MobileLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeKey = tabs.find((t) => {
    if (t.key === '/') return location.pathname === '/';
    if (t.key === '/profile') return location.pathname === '/profile';
    return location.pathname.startsWith(t.key) && t.key !== '/';
  })?.key || '/';

  const getQuickActions = () => {
    const path = location.pathname;
    if (path.startsWith('/parts')) return '/parts/new';
    if (path.startsWith('/inventory')) return '/inventory/inbound';
    if (path.startsWith('/tools')) return '/tools/borrow';
    if (path.startsWith('/work-orders')) return '/work-orders/new';
    if (path.startsWith('/purchases')) return '/purchases/new';
    return null;
  };

  const quickActionPath = getQuickActions();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 56 }}>
        <Outlet />
      </div>
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 56,
          borderTop: '1px solid #f0f0f0',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          zIndex: 1000,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <div
              key={tab.key}
              onClick={() => navigate(tab.key)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: isActive ? '#D4380D' : '#999',
                fontSize: 11,
                gap: 2,
                userSelect: 'none',
                padding: '4px 0',
                position: 'relative',
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '25%',
                  right: '25%',
                  height: 2,
                  background: '#D4380D',
                  borderRadius: '0 0 2px 2px',
                }} />
              )}
              <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </div>
          );
        })}
      </div>

      {quickActionPath && (
        <FloatButton
          icon={<PlusOutlined />}
          type="primary"
          style={{ bottom: 72, right: 16 }}
          onClick={() => navigate(quickActionPath)}
          tooltip="快速新建"
        />
      )}
    </div>
  );
}
