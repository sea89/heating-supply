import { useState, useEffect, useCallback } from 'react';
import { Table, Card, Tabs, Tag, Button, Space, message, Tooltip, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

const statusOptions = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待采购' },
  { key: 'ordered', label: '已采购' },
  { key: 'partial_arrived', label: '部分到货' },
  { key: 'completed', label: '已完成' },
];

const statusConfig = {
  pending: { color: 'default', text: '待采购' },
  ordered: { color: 'processing', text: '已采购' },
  partial_arrived: { color: 'warning', text: '部分到货' },
  completed: { color: 'success', text: '已完成' },
};

const priorityConfig = {
  normal: { color: 'blue', text: '普通' },
  urgent: { color: 'red', text: '紧急' },
};

const itemTypeConfig = {
  tool: { color: 'purple', text: '工具' },
  part: { color: 'blue', text: '备件' },
};

// Expanded sub-table showing item details
function ExpandedItems({ items }) {
  const subColumns = [
    { title: '类型', dataIndex: 'item_type', key: 'item_type', width: 60,
      render: (v) => {
        const cfg = itemTypeConfig[v] || { color: 'default', text: v };
        return <Tag color={cfg.color} style={{ fontSize: 12 }}>{cfg.text}</Tag>;
      },
    },
    { title: '编码', dataIndex: 'code', key: 'code', width: 110, render: (v) => v || '-' },
    { title: '名称', dataIndex: 'name', key: 'name', render: (v) => v || '-' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80,
      render: (v) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    { title: '单价', dataIndex: 'unit_price', key: 'unit_price', width: 100,
      render: (v) => v != null ? `¥${v.toFixed(2)}` : '-',
    },
    { title: '小计', dataIndex: 'total_price', key: 'total_price', width: 100,
      render: (v) => v != null ? <span style={{ color: '#722ed1' }}>¥{v.toFixed(2)}</span> : '-',
    },
  ];
  return (
    <Table
      rowKey={(_, idx) => idx}
      columns={subColumns}
      dataSource={items}
      pagination={false}
      size="small"
      style={{ margin: '0 0 0 32px' }}
    />
  );
}

export default function PurchaseList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [status, setStatus] = useState('');

  const handleDelete = async (id) => {
    try {
      await api.delete('/api/purchases/' + id);
      message.success('删除成功');
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.error || '删除失败');
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      const res = await api.get('/api/purchases', { params });
      setData(res.data || []);
    } catch (err) {
      message.error(err.response?.data?.error || '获取采购单列表失败');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns = [
    {
      title: '单号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 150,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (val) => {
        const cfg = statusConfig[val] || { color: 'default', text: val };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 70,
      responsive: ['md'],
      render: (val) => {
        const cfg = priorityConfig[val] || { color: 'default', text: val };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: '关联工单',
      dataIndex: 'work_order_no',
      key: 'work_order_no',
      width: 130,
      responsive: ['md'],
      render: (val, record) =>
        record.work_order_id
          ? <a onClick={(e) => { e.stopPropagation(); navigate(`/work-orders/${record.work_order_id}`); }}>{val || `#${record.work_order_id}`}</a>
          : '-',
    },
    {
      title: '物品清单',
      key: 'items_summary',
      ellipsis: true,
      render: (_, record) => {
        const items = record.items || [];
        if (items.length === 0) return <span style={{ color: '#999' }}>无</span>;
        const summary = items.map(i => `${i.name || i.code || '未知'}×${i.quantity}`).join('、');
        return (
          <Tooltip title={
            <div>
              {items.map((i, idx) => (
                <div key={idx} style={{ margin: '2px 0' }}>
                  {i.name || i.code || '未知'} × {i.quantity}
                  {i.unit_price != null ? `  ¥${i.unit_price.toFixed(2)}` : ''}
                </div>
              ))}
            </div>
          }>
            <span style={{ fontSize: 13 }}>{summary.length > 40 ? summary.slice(0, 40) + '…' : summary}</span>
          </Tooltip>
        );
      },
    },
    {
      title: '总金额',
      key: 'total_amount',
      width: 110,
      render: (_, record) => {
        const amount = Number(record.total_amount);
        return amount > 0
          ? <span style={{ fontWeight: 600, color: '#722ed1' }}>¥{amount.toFixed(2)}</span>
          : '-';
      },
    },
    {
      title: '申请人',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
      width: 80,
      responsive: ['md'],
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      responsive: ['md'],
      render: (val) => val || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Popconfirm
          title="确定要删除该采购单吗？"
          onConfirm={(e) => { e?.stopPropagation(); handleDelete(record.id); }}
          onCancel={(e) => e?.stopPropagation()}
        >
          <Button type="link" size="small" danger onClick={(e) => e.stopPropagation()}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const tabItems = statusOptions.map((opt) => ({
    key: opt.key,
    label: opt.label,
  }));

  return (
    <Card
      title="采购单列表"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/purchases/new')}>
          新建采购单
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
        expandable={{
          expandedRowRender: (record) => <ExpandedItems items={record.items || []} />,
          rowExpandable: (record) => (record.items || []).length > 0,
        }}
        onRow={(record) => ({
          onClick: () => navigate(`/purchases/${record.id}`),
          style: { cursor: 'pointer' },
        })}
        pagination={false}
      />
    </Card>
  );
}
