import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, message } from 'antd';
import { useAuth } from '../context/AuthContext';
import {
  AppstoreOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  ToolOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
  TeamOutlined,
  UserOutlined,
  FireOutlined,
} from '@ant-design/icons';

const { Sider, Content, Header } = Layout;

function buildMenuItems(role) {
  const isAdmin = role === 'admin';
  const isWarehouse = role === 'warehouse';
  const isMtn = role === 'maintenance';
  const isPrc = role === 'procurement';
  const items = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '工作台',
    },
    {
      key: 'parts',
      icon: <AppstoreOutlined />,
      label: '备件目录',
      children: [
        { key: '/parts', label: '备件列表' },
        { key: '/parts/new', label: '新建备件' },
        { key: '/parts/categories', label: '备件分类' },
      ],
    },
    {
      key: 'inventory',
      icon: <DatabaseOutlined />,
      label: '库存管理',
      children: [
        { key: '/inventory', label: '库存总览' },
        { key: '/inventory/inbound', label: '入库登记' },
        { key: '/inventory/outbound', label: '出库登记' },
        { key: '/inventory/transactions', label: '出入库记录' },
        { key: '/purchases', label: '采购项目' },
        { key: '/inventory/locations', label: '库位管理' },
      ],
    },
    {
      key: 'tools',
      icon: <ToolOutlined />,
      label: '工具管理',
      children: [
        { key: '/tools', label: '工具列表' },
        { key: '/tools/borrow', label: '借用登记' },
        { key: '/tools/return', label: '归还登记' },
      ],
    },
    {
      key: 'work-orders',
      icon: <FileTextOutlined />,
      label: '工单管理',
      children: [
        { key: '/work-orders', label: '工单列表' },
        { key: '/work-orders/new', label: '新建工单' },
      ],
    },
    {
      key: 'basic-data',
      icon: <SettingOutlined />,
      label: '基础数据',
      children: [
        { key: '/basic-data/system-categories', label: '系统分类' },
        { key: '/basic-data/equipment', label: '设备台账' },
        { key: '/basic-data/suppliers', label: '供应商' },
        { key: '/basic-data/personnel', label: '人员管理', icon: <TeamOutlined /> },
        ...(role === 'admin' ? [{ key: '/basic-data/accounts', label: '账号管理', icon: <UserOutlined /> }] : []),
        { key: '/backup', label: '数据备份' },
      ],
    },
  ];
  if (isAdmin || isWarehouse) {
    var pi = items.find(function(i) { return i.key === 'parts'; });
    // parts/new and parts/categories already in main array
  }
  if (isAdmin) {
    var bd = items.find(function(i) { return i.key === 'basic-data'; });
    if (bd) {
      bd.children.push({ key: '/basic-data/accounts', label: '账号管理', icon: <UserOutlined /> });
    }
  }
  return items;
}

function findSelectedKeys(pathname, items) {
  // Exact match first
  if (pathname === '/') return ['/'];

  // Check against leaf menu keys
  const leafKeys = [];
  const collectLeafKeys = (itemList) => {
    for (const item of itemList) {
      if (item.children) {
        collectLeafKeys(item.children);
      } else if (item.key) {
        leafKeys.push(item.key);
      }
    }
  };
  collectLeafKeys(items);

  const exact = leafKeys.find((k) => k === pathname);
  if (exact) return [exact];

  // Prefix match for nested routes like /work-orders/:id
  const sorted = [...leafKeys].sort((a, b) => b.length - a.length);
  const match = sorted.find((k) => pathname.startsWith(k + '/') || pathname.startsWith(k));
  if (match) return [match];

  return [];
}

function findOpenKeys(pathname, items) {
  const openKeys = [];
  for (const item of items) {
    if (item.children) {
      const match = item.children.some(
        (child) => pathname.startsWith(child.key) || pathname.startsWith(item.key)
      );
      if (match) openKeys.push(item.key);
    }
  }
  return openKeys;
}

export default function DesktopLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = buildMenuItems(user?.role);
  const selectedKeys = findSelectedKeys(location.pathname, menuItems);
  const defaultOpenKeys = findOpenKeys(location.pathname, menuItems);

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="dark">
        <div
          className="sidebar-logo"
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            gap: 8,
            background: 'linear-gradient(180deg, rgba(212,56,13,0.15) 0%, transparent 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <FireOutlined style={{ fontSize: 22, color: '#FA8C16' }} />
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: 1 }}>
            供热备件管理
          </span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={defaultOpenKeys}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            borderBottom: '1px solid #f0f0f0',
            gap: 16,
          }}
        >
          <span style={{ color: '#333', fontSize: 14 }}>
            {user?.name || user?.username || '用户'}
          </span>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            退出登录
          </Button>
        </Header>
        <Content style={{ padding: 24, background: '#f5f5f5', minHeight: 360 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
