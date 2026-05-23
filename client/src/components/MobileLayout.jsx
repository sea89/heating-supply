import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AppstoreOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  ToolOutlined,
  UserOutlined,
  SettingOutlined,
  DashboardOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { FloatButton } from 'antd';

const allTabs = [
  { key: '/', label: '首页', icon: <DashboardOutlined /> },
  { key: '/parts', label: '备件', icon: <AppstoreOutlined /> },
  { key: '/inventory', label: '库存', icon: <DatabaseOutlined /> },
  { key: '/purchases', label: '采购', icon: <ShoppingCartOutlined /> },
  { key: '/work-orders', label: '工单', icon: <FileTextOutlined /> },
  { key: '/tools', label: '工具', icon: <ToolOutlined /> },
  { key: '/profile', label: '我的', icon: <UserOutlined /> },
];

export default function MobileLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = user?.role;
  const admin = role === 'admin';
  const wh = role === 'warehouse';
  const mt = role === 'maintenance';
  const pr = role === 'procurement';
  const canInventory = admin || wh;
  const canPurchases = admin || wh || pr;
  const canWorkOrders = admin || wh || mt;
  const tabs = allTabs.filter(function(t) {
    if (admin) return true;
    if (t.key === '/inventory' || t.key === '/parts') return admin || wh;
    if (t.key === '/purchases') return canPurchases;
    if (t.key === '/work-orders') return canWorkOrders;
    if (t.key === '/tools') return true;
    if (t.key === '/profile') return true;
    return true;
  });
  const activeKey = tabs.find((t) => {
    if (t.key === '/') return location.pathname === '/';
    if (t.key === '/profile') return location.pathname === '/profile';
    return location.pathname.startsWith(t.key) && t.key !== '/';
  })?.key || '/';

  const getQuickActions = () => {
    const path = location.pathname;
    if (path.startsWith('/parts')) return '/parts/new';
    if (path.startsWith('/inventory') && path.includes('outbound')) return '/inventory/outbound';
    if (path.startsWith('/inventory')) return '/inventory/inbound';
    if (path.startsWith('/purchases')) return '/purchases/new';
    if (path.startsWith('/work-orders')) return '/work-orders/new';
    if (path.startsWith('/tools')) return '/tools/borrow';
    return null;
  };

  const quickActionPath = getQuickActions();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 64 }}>
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
          overflow: 'hidden',
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
                fontSize: 10,
                gap: 1,
                userSelect: 'none',
                padding: '4px 0 6px',
                position: 'relative',
                minWidth: 0,
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '20%',
                  right: '20%',
                  height: 2,
                  background: '#D4380D',
                  borderRadius: '0 0 2px 2px',
                }} />
              )}
              <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{tab.label}</span>
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
