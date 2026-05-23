import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Descriptions, Table, Tag, Button, Space, message, Spin, Modal } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, ShoppingCartOutlined, ExportOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';

const statusConfig = {
  pending: { color: 'orange', text: '待处理' },
  in_progress: { color: 'processing', text: '进行中' },
  completed: { color: 'green', text: '已完成' },
};

export default function WorkOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [workOrder, setWorkOrder] = useState(null);
  const [stockModal, setStockModal] = useState({ visible: false, items: [], loading: false });
  const cancelRef = useRef(false);

  const handleSmartPurchase = useCallback(async () => {
    cancelRef.current = false;
    setStockModal({ visible: true, items: [], loading: true });
    try {
      const res = await api.get(`/api/work-orders/${id}/stock-check`);
      if (cancelRef.current) return;
      setStockModal({ visible: true, items: res.data.items || [], loading: false });
    } catch (err) {
      if (cancelRef.current) return;
      message.error('库存检查失败');
      setStockModal({ visible: false, items: [], loading: false });
    }
  }, [id]);

  useEffect(() => {
    fetchWorkOrder();
  }, [id]);

  const fetchWorkOrder = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/work-orders/${id}`);
      setWorkOrder(res.data);
    } catch (err) {
      message.error(err.response?.data?.error || '获取工单详情失败');
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

  if (!workOrder) return null;

  const statusCfg = statusConfig[workOrder.status] || { color: 'default', text: workOrder.status };

  const partColumns = [
    { title: '备件编号', dataIndex: 'part_code', key: 'part_code', width: 120 },
    { title: '备件名称', dataIndex: 'part_name', key: 'part_name', width: 150 },
    { title: '型号', dataIndex: 'part_model', key: 'part_model', width: 120, render: (val) => val || '-' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80 },
  ];

  const outboundColumns = [
    { title: '备件编号', dataIndex: 'part_code', key: 'part_code', width: 120 },
    { title: '备件名称', dataIndex: 'part_name', key: 'part_name', width: 150 },
    { title: '出库数量', dataIndex: 'quantity', key: 'quantity', width: 80 },
    { title: '领用人', dataIndex: 'recipient', key: 'recipient', width: 100, render: (val) => val || '-' },
    { title: '出库时间', dataIndex: 'created_at', key: 'created_at', width: 160, render: (val) => val || '-' },
  ];

  const handleStockConfirm = () => {
    const { items } = stockModal;
    const purchaseItems = items
      .filter(item => item.to_purchase > 0)
      .map(item => ({
        item_type: 'part',
        part_id: item.part_id,
        quantity: item.to_purchase,
        unit_price: item.unit_price,
      }));
    const params = new URLSearchParams({ work_order_id: id });
    if (purchaseItems.length > 0) {
      params.set('items', JSON.stringify(purchaseItems));
    }
    setStockModal({ visible: false });
    navigate(`/purchases/new?${params.toString()}`);
  };

  const isComplete = workOrder.status === 'completed';

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/work-orders')}>
            返回
          </Button>
          <span>工单详情</span>
        </Space>
      }
      extra={
        <Space>
          {!isComplete && (
            <Button type="primary" icon={<ShoppingCartOutlined />} onClick={handleSmartPurchase}>
              智能采购
            </Button>
          )}
          {!isComplete && (
            <Button icon={<CheckCircleOutlined />} onClick={() => navigate(`/work-orders/${id}/complete`)}>
              完结工单
            </Button>
          )}
          <Button icon={<ExportOutlined />} onClick={() => navigate(`/inventory/outbound?work_order_id=${id}`)}>
            出库登记
          </Button>
        </Space>
      }
    >
      <Descriptions bordered column={{ xs: 1, sm: 2 }} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="工单号">{workOrder.order_no}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={statusCfg.color}>{statusCfg.text}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="设备名称">{workOrder.equipment_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="负责人">{workOrder.assignee_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="故障描述" span={2}>
          {workOrder.fault_description || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">{workOrder.created_at || '-'}</Descriptions.Item>
      </Descriptions>

      <h3 style={{ marginBottom: 16 }}>所需备件</h3>
      <Table
        rowKey={(_, idx) => idx}
        columns={partColumns}
        dataSource={workOrder.parts || []}
        pagination={false}
        style={{ marginBottom: 24 }}
      />

      <h3 style={{ marginBottom: 16 }}>出库记录</h3>
      <Table
        rowKey={(_, idx) => idx}
        columns={outboundColumns}
        dataSource={workOrder.outbound_records || []}
        pagination={false}
        style={{ marginBottom: 24 }}
      />

      <h3 style={{ marginBottom: 16 }}>关联采购单</h3>
      <Table
        rowKey="id"
        columns={[
          { title: '单号', dataIndex: 'order_no', key: 'order_no', width: 160 },
          {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (val) => {
              const cfg = {
                pending: { color: 'default', text: '待采购' },
                ordered: { color: 'processing', text: '已采购' },
                partial_arrived: { color: 'warning', text: '部分到货' },
                completed: { color: 'success', text: '已完成' },
              }[val] || { color: 'default', text: val };
              return <Tag color={cfg.color}>{cfg.text}</Tag>;
            },
          },
          {
            title: '优先级',
            dataIndex: 'priority',
            key: 'priority',
            width: 80,
            render: (val) => {
              const cfg = {
                normal: { color: 'blue', text: '普通' },
                urgent: { color: 'red', text: '紧急' },
              }[val] || { color: 'default', text: val };
              return <Tag color={cfg.color}>{cfg.text}</Tag>;
            },
          },
          { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 160, render: (val) => val || '-' },
        ]}
        dataSource={workOrder.purchase_orders || []}
        pagination={false}
        onRow={(record) => ({
          onClick: () => navigate(`/purchases/${record.id}`),
          style: { cursor: 'pointer' },
        })}
        locale={{ emptyText: '暂无关联采购单' }}
      />
      <Modal
        title="库存检查"
        open={stockModal.visible}
        onOk={handleStockConfirm}
        onCancel={() => {
          cancelRef.current = true;
          setStockModal({ visible: false, items: [], loading: false });
        }}
        confirmLoading={stockModal.loading}
        width={700}
        okText="确认创建采购单"
        okButtonProps={{ disabled: !stockModal.items.some(i => i.to_purchase > 0) }}
      >
        {stockModal.loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
        ) : stockModal.items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
            该工单没有备件需求，无需采购
          </div>
        ) : (
          <Table
            rowKey="part_id"
            pagination={false}
            dataSource={stockModal.items}
            columns={[
              { title: '备件编号', dataIndex: 'part_code', width: 100 },
              { title: '备件名称', dataIndex: 'part_name', width: 150 },
              { title: '需求', dataIndex: 'required_quantity', width: 60 },
              { title: '库存', dataIndex: 'stock_quantity', width: 60 },
              {
                title: '采购数量',
                dataIndex: 'to_purchase',
                width: 100,
                render: (val) => {
                  if (val === 0) return <Tag color="green">库存充足</Tag>;
                  return <Tag color="orange">{val}</Tag>;
                },
              },
              {
                title: '单价',
                dataIndex: 'unit_price',
                width: 100,
                render: (val) => val != null ? `¥${Number(val).toFixed(2)}` : '-',
              },
            ]}
            summary={() => {
              const total = stockModal.items.reduce((s, i) => s + (i.unit_price || 0) * i.to_purchase, 0);
              if (total <= 0) return null;
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell colSpan={5} align="right">
                    <strong>采购总金额：</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell>
                    <span style={{ fontWeight: 700, color: '#722ed1' }}>
                      ¥{total.toFixed(2)}
                    </span>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />
        )}
      </Modal>
    </Card>
  );
}
