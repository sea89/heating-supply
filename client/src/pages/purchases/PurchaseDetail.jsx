import { useState, useEffect } from 'react';
import { Card, Descriptions, Table, Tag, Button, Space, message } from 'antd';
import { DetailSkeleton } from '../../components/PageSkeleton';
import { ArrowLeftOutlined, EditOutlined, ImportOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';

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

export default function PurchaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [purchase, setPurchase] = useState(null);

  useEffect(() => {
    fetchPurchase();
  }, [id]);

  const fetchPurchase = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/purchases/${id}`);
      setPurchase(res.data);
    } catch (err) {
      message.error(err.response?.data?.error || '获取采购单详情失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!purchase) return null;

  const statusCfg = statusConfig[purchase.status] || { color: 'default', text: purchase.status };
  const priorityCfg = priorityConfig[purchase.priority] || { color: 'default', text: purchase.priority };

  const itemColumns = [
    {
      title: '类型',
      dataIndex: 'item_type',
      key: 'item_type',
      width: 70,
      render: (v) => <Tag color={v === 'tool' ? 'purple' : 'blue'}>{v === 'tool' ? '工具' : '备件'}</Tag>,
    },
    {
      title: '编码',
      key: 'code',
      width: 120,
      render: (_, record) => record.item_type === 'tool' ? (record.tool_code || '-') : (record.part_code || '-'),
    },
    {
      title: '名称',
      key: 'name',
      render: (_, record) => record.item_type === 'tool' ? (record.tool_name || '-') : (record.part_name || '-'),
    },
    {
      title: '型号',
      key: 'model',
      width: 120,
      render: (_, record) => record.item_type === 'tool' ? (record.tool_model || '-') : (record.part_model || '-'),
    },
    {
      title: '单位',
      key: 'unit',
      width: 60,
      render: (_, record) => record.item_type === 'tool' ? '-' : (record.unit || '-'),
    },
    { title: '单价(元)', dataIndex: 'unit_price', key: 'unit_price', width: 100, render: (val) => val != null ? `¥${val.toFixed(2)}` : '-' },
    { title: '小计(元)', dataIndex: 'total_price', key: 'total_price', width: 100, render: (val) => val != null ? <span style={{ fontWeight: 500, color: '#722ed1' }}>¥{val.toFixed(2)}</span> : '-' },
    { title: '订购数量', dataIndex: 'quantity', key: 'quantity', width: 100 },
    { title: '已到货数量', dataIndex: 'arrived_quantity', key: 'arrived_quantity', width: 100, render: (val) => val ?? 0 },
    {
      title: '状态',
      key: 'item_status',
      width: 100,
      render: (_, record) => {
        const arrived = record.arrived_quantity || 0;
        const ordered = record.quantity || 0;
        const isComplete = arrived >= ordered;
        return isComplete ? (
          <Tag color="success">已完成</Tag>
        ) : (
          <Tag color="warning">未完成</Tag>
        );
      },
    },
  ];

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/purchases')}>
            返回
          </Button>
          <span>采购单详情</span>
        </Space>
      }
      extra={
        <Space>
          {purchase.status === 'pending' && (
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/purchases/${id}/edit`)}
            >
              编辑
            </Button>
          )}
          {purchase.status !== 'completed' && (
            <Button
              type="primary"
              icon={<ImportOutlined />}
              onClick={() => navigate(`/purchases/${id}/arrival`)}
            >
              到货登记
            </Button>
          )}
        </Space>
      }
    >
      <Descriptions bordered column={{ xs: 1, sm: 2 }} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="单号">{purchase.order_no}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={statusCfg.color}>{statusCfg.text}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="优先级">
          <Tag color={priorityCfg.color}>{priorityCfg.text}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="申请人">{purchase.created_by_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="关联工单">
          {purchase.work_order_id
            ? <a onClick={() => navigate(`/work-orders/${purchase.work_order_id}`)}>{purchase.work_order_no || `#${purchase.work_order_id}`}</a>
            : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="备注">{purchase.remark || '-'}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{purchase.created_at || '-'}</Descriptions.Item>
      </Descriptions>

      <h3 style={{ marginBottom: 16 }}>采购明细</h3>
      <Table
        rowKey="id"
        columns={itemColumns}
        dataSource={purchase.items || []}
        pagination={false}
        summary={() => {
          const total = (purchase.items || []).reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
          if (total <= 0) return null;
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell colSpan={7} align="right">
                <strong>合计金额：</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell>
                <span style={{ fontWeight: 700, color: '#722ed1', fontSize: 16 }}>
                  ¥{total.toFixed(2)}
                </span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          );
        }}
      />
    </Card>
  );
}
