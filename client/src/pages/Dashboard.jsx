import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Statistic, Tag, List, Space, message, Spin } from 'antd';
import {
  InboxOutlined, WarningOutlined, FileTextOutlined, ToolOutlined,
  ArrowDownOutlined, ArrowUpOutlined, ShoppingCartOutlined,
  PlusOutlined, FireOutlined, RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const roleDisplayNames = {
  maintenance: '维修人员',
  warehouse: '仓管人员',
  procurement: '采购人员',
};

const quickLinks = [
  { title: '入库登记', path: '/inventory/inbound', icon: <ArrowDownOutlined />, color: '#52C41A', desc: '备件入库操作' },
  { title: '出库登记', path: '/inventory/outbound', icon: <ArrowUpOutlined />, color: '#FA8C16', desc: '备件出库操作' },
  { title: '新建工单', path: '/work-orders/new', icon: <PlusOutlined />, color: '#1677FF', desc: '创建维修工单' },
  { title: '新建采购单', path: '/purchases/new', icon: <ShoppingCartOutlined />, color: '#722ED1', desc: '发起采购申请' },
  { title: '借用登记', path: '/tools/borrow', icon: <ToolOutlined />, color: '#13C2C2', desc: '工具借用登记' },
  { title: '工具管理', path: '/tools', icon: <ToolOutlined />, color: '#13C2C2', desc: '工具列表与归还' },
];

const statCards = [
  { key: 'total_parts', title: '库存备件数', icon: <InboxOutlined />, color: '#1677FF' },
  { key: 'alert_count', title: '低库存预警', icon: <WarningOutlined />, color: '#FF4D4F' },
  { key: 'pendingWorkOrders', title: '待处理工单', icon: <FileTextOutlined />, color: '#FA8C16' },
  { key: 'unreturnedBorrows', title: '未归还工具', icon: <ToolOutlined />, color: '#722ED1' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState({
    total_parts: 0,
    alert_count: 0,
    today_inbound: 0,
    today_outbound: 0,
  });
  const [pendingWorkOrders, setPendingWorkOrders] = useState([]);
  const [borrowedTools, setBorrowedTools] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, workOrdersRes, toolsRes] = await Promise.all([
        api.get('/api/inventory/overview'),
        api.get('/api/work-orders', { params: { status: 'pending' } }),
        api.get('/api/tools', { params: { status: 'borrowed' } }),
      ]);
      setOverview(overviewRes.data);
      setPendingWorkOrders(workOrdersRes.data || []);
      setBorrowedTools(toolsRes.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statValues = {
    total_parts: overview.total_parts,
    alert_count: overview.alert_count,
    pendingWorkOrders: pendingWorkOrders.length,
    unreturnedBorrows: borrowedTools.length,
  };

  return (
    <div>
      {/* Welcome Section */}
      <Card
        style={{
          marginBottom: 20,
          background: 'linear-gradient(135deg, #FFF1E8 0%, #FFD8C4 100%)',
          border: '1px solid #FFB794',
          borderRadius: 10,
        }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'linear-gradient(135deg, #D4380D, #FA8C16)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FireOutlined style={{ fontSize: 24, color: '#fff' }} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, color: '#1a1a1a' }}>
                  欢迎回来，{user?.name}
                </h2>
                <p style={{ margin: '4px 0 0', color: '#8C3B1A', fontSize: 14 }}>
                  当前角色：{roleDisplayNames[user?.role] || user?.role}
                </p>
              </div>
            </div>
          </Col>
          <Col>
            <Tag color="orange" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 4 }}>
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </Tag>
          </Col>
        </Row>
      </Card>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        {statCards.map((card) => (
          <Col xs={12} sm={12} md={6} key={card.key}>
            <Card
              hoverable
              style={{ borderRadius: 10, cursor: 'pointer' }}
              onClick={() => {
                if (card.key === 'pendingWorkOrders') navigate('/work-orders');
                if (card.key === 'alert_count') navigate('/inventory');
                if (card.key === 'unreturnedBorrows') navigate('/tools/return');
              }}
            >
              <Statistic
                title={card.title}
                value={statValues[card.key]}
                prefix={<span style={{ color: card.color, fontSize: 22, marginRight: 4 }}>{card.icon}</span>}
                valueStyle={{ color: card.color, fontWeight: 600, fontSize: 28 }}
                loading={loading}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Quick Actions */}
      <Card title="快捷操作" style={{ marginTop: 20, borderRadius: 10 }}>
        <Row gutter={[16, 16]}>
          {quickLinks.map((link) => (
            <Col xs={12} sm={8} md={6} key={link.path}>
              <Card
                hoverable
                size="small"
                onClick={() => navigate(link.path)}
                style={{ borderRadius: 8, textAlign: 'center', height: '100%' }}
                bodyStyle={{ padding: '16px 12px' }}
              >
                <div style={{ fontSize: 28, color: link.color, marginBottom: 8 }}>
                  {link.icon}
                </div>
                <div style={{ fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>
                  {link.title}
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  {link.desc}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Pending Tasks Section */}
      <Row gutter={16} style={{ marginTop: 20 }}>
        {/* Pending Work Orders */}
        <Col xs={24} md={12}>
          <Card
            title={
              <span><FileTextOutlined style={{ marginRight: 8, color: '#FA8C16' }} />待处理工单</span>
            }
            extra={pendingWorkOrders.length > 0
              ? <a onClick={() => navigate('/work-orders')}>查看全部 <RightOutlined /></a>
              : null
            }
            style={{ borderRadius: 10, marginBottom: 16 }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
            ) : pendingWorkOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                <FileTextOutlined style={{ fontSize: 32, marginBottom: 8, color: '#d9d9d9' }} />
                <p>暂无待处理工单</p>
              </div>
            ) : (
              <List
                size="small"
                dataSource={pendingWorkOrders.slice(0, 5)}
                renderItem={(item) => (
                  <List.Item
                    style={{ cursor: 'pointer', padding: '8px 0' }}
                    onClick={() => navigate(`/work-orders/${item.id}`)}
                    extra={
                      <Space>
                        <Tag color={
                          item.process_status === '待采购' ? 'orange' :
                          item.process_status === '采购中' ? 'blue' :
                          item.process_status === '已入库待出库' ? 'purple' :
                          item.process_status === '进行中' ? 'green' :
                          item.process_status === '已完成' ? 'green' :
                          item.priority === 'urgent' ? 'red' : 'default'
                        }>
                          {item.process_status || (item.priority === 'urgent' ? '紧急' : '普通')}
                        </Tag>
                      </Space>
                    }
                  >
                    <List.Item.Meta
                      title={<span style={{ fontSize: 14 }}>{item.order_no} - {item.equipment_name || '未指定设备'}</span>}
                      description={<span style={{ fontSize: 12, color: '#888' }}>{item.fault_description?.substring(0, 30) || '无描述'}</span>}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* Unreturned Borrows */}
        <Col xs={24} md={12}>
          <Card
            title={
              <span><ToolOutlined style={{ marginRight: 8, color: '#722ED1' }} />未归还工具</span>
            }
            extra={borrowedTools.length > 0
              ? <a onClick={() => navigate('/tools')}>查看全部 <RightOutlined /></a>
              : null
            }
            style={{ borderRadius: 10, marginBottom: 16 }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
            ) : borrowedTools.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                <ToolOutlined style={{ fontSize: 32, marginBottom: 8, color: '#d9d9d9' }} />
                <p>所有工具已归还</p>
              </div>
            ) : (
              <List
                size="small"
                dataSource={borrowedTools.slice(0, 5)}
                renderItem={(item) => (
                  <List.Item
                    style={{ cursor: 'pointer', padding: '8px 0' }}
                    onClick={() => navigate('/tools/return?tool_id=' + item.id)}
                  >
                    <List.Item.Meta
                      title={<span style={{ fontSize: 14 }}>{item.name || `工具 #${item.id}`}</span>}
                      description={<span style={{ fontSize: 12, color: '#888' }}>
                        编号：{item.code || '-'} ｜ {item.current_borrower ? '借用人：' + item.current_borrower : '已借出'}
                      </span>}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
