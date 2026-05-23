import { useState, useEffect, useCallback } from 'react';
import { Table, Card, Tabs, Tag, Button, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

const statusOptions = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待处理' },
  { key: 'in_progress', label: '进行中' },
  { key: 'completed', label: '已完成' },
];

const statusConfig = {
  pending: { color: 'orange', text: '待处理' },
  in_progress: { color: 'processing', text: '进行中' },
  completed: { color: 'green', text: '已完成' },
};

export default function WorkOrderList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [status, setStatus] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      const res = await api.get('/api/work-orders', { params });
      setData(res.data || []);
    } catch (err) {
      message.error(err.response?.data?.error || '获取工单列表失败');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns = [
    {
      title: '工单号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 160,
    },
    {
      title: '设备名称',
      dataIndex: 'equipment_name',
      key: 'equipment_name',
      width: 150,
      render: (val) => val || '-',
    },
    {
      title: '故障描述',
      dataIndex: 'fault_description',
      key: 'fault_description',
      ellipsis: true,
    },
    {
      title: '负责人',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
      width: 100,
      render: (val) => val || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (val) => {
        const cfg = statusConfig[val] || { color: 'default', text: val };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (val) => val || '-',
    },
  ];

  const tabItems = statusOptions.map((opt) => ({
    key: opt.key,
    label: opt.label,
  }));

  return (
    <Card
      title="工单列表"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/work-orders/new')}>
          新建工单
        </Button>
      }
    >
      <Tabs
        activeKey={status}
        onChange={(key) => setStatus(key)}
        items={tabItems}
        style={{ marginBottom: 16 }}
      />
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        onRow={(record) => ({
          onClick: () => navigate(`/work-orders/${record.id}`),
          style: { cursor: 'pointer' },
        })}
        pagination={false}
      />
    </Card>
  );
}
