import { useState, useEffect } from 'react';
import { Card, Descriptions, Table, Tag, Button, Space, message, Spin } from 'antd';
import { ArrowLeftOutlined, ToolOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function EquipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [equipment, setEquipment] = useState(null);

  useEffect(() => {
    fetchEquipment();
  }, [id]);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/equipment/${id}`);
      setEquipment(res.data);
    } catch (err) {
      message.error(err.response?.data?.error || '获取设备详情失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (!equipment) return null;

  const relatedParts = equipment.related_parts || [];
  const workOrders = equipment.work_orders || [];

  const statusColors = {
    pending: 'orange',
    in_progress: 'blue',
    completed: 'green',
  };
  const statusLabels = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
  };

  const woColumns = [
    { title: '工单编号', dataIndex: 'order_no', key: 'order_no', width: 160 },
    { title: '故障描述', dataIndex: 'fault_description', key: 'fault_description' },
    { title: '负责人', dataIndex: 'assignee_name', key: 'assignee_name', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s) => <Tag color={statusColors[s] || 'default'}>{statusLabels[s] || s}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (v) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '完成时间',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: 180,
      render: (v) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
  ];

  const partColumns = [
    { title: '备件名称', dataIndex: 'part_name', key: 'part_name' },
    { title: '编码', dataIndex: 'part_code', key: 'part_code', width: 100 },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80 },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 60 },
  ];

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/basic-data/equipment')}>
            返回
          </Button>
          <span>设备详情</span>
        </Space>
      }
    >
      <Descriptions bordered column={{ xs: 1, sm: 2 }} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="编号">{equipment.code}</Descriptions.Item>
        <Descriptions.Item label="名称">{equipment.name}</Descriptions.Item>
        <Descriptions.Item label="型号">{equipment.model || '-'}</Descriptions.Item>
        <Descriptions.Item label="位置">{equipment.location || '-'}</Descriptions.Item>
        <Descriptions.Item label="系统分类">
          {equipment.system_name || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="关联备件">
          {relatedParts.length > 0 ? (
            <div>
              {relatedParts.map((p, i) => (
                <div key={p.id} style={{ marginBottom: 4 }}>
                  <Space>
                    <span>{p.name} ({p.code})</span>
                    <Tag color={p.stock > 0 ? 'green' : 'red'}>
                      库存: {p.stock}
                    </Tag>
                  </Space>
                </div>
              ))}
            </div>
          ) : '-'}
        </Descriptions.Item>
      </Descriptions>

      <h3 style={{ marginBottom: 16 }}>
        <ToolOutlined style={{ marginRight: 8 }} />
        维修记录
      </h3>
      {workOrders.length === 0 ? (
        <div style={{ color: '#999', padding: 16 }}>暂无维修记录</div>
      ) : (
        <Table
          rowKey="id"
          columns={woColumns}
          dataSource={workOrders}
          pagination={false}
          expandable={{
            expandedRowRender: (record) => {
              const parts = record.parts || [];
              return parts.length === 0 ? (
                <div style={{ padding: '8px 0', color: '#999' }}>该工单未记录更换备件</div>
              ) : (
                <Table
                  rowKey="part_id"
                  columns={partColumns}
                  dataSource={parts}
                  pagination={false}
                  size="small"
                />
              );
            },
            rowExpandable: () => true,
          }}
        />
      )}
    </Card>
  );
}
