import { useState, useEffect, useCallback } from 'react';
import { Card, Descriptions, Table, Tabs, Button, Space, Tag, Modal, InputNumber, Select, message, Spin } from 'antd';
import { ArrowLeftOutlined, EditOutlined, EditFilled, PlusOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function PartDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [part, setPart] = useState(null);
  const [adjustModal, setAdjustModal] = useState({ visible: false, record: null });
  const [adjustValue, setAdjustValue] = useState(0);
  const [adjusting, setAdjusting] = useState(false);
  const [addStockVisible, setAddStockVisible] = useState(false);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [addingStock, setAddingStock] = useState(false);

  useEffect(() => {
    fetchPart();
    fetchLocations();
  }, [id]);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await api.get('/api/locations');
      setLocations(res.data || []);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchPart = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/parts/${id}`);
      setPart(res.data);
    } catch (err) {
      message.error(err.response?.data?.error || '获取备件详情失败');
    } finally {
      setLoading(false);
    }
  };

  const openAdjust = (record) => {
    setAdjustModal({ visible: true, record });
    setAdjustValue(record.quantity);
  };

  const handleAdjust = async () => {
    const { record } = adjustModal;
    if (adjustValue < 0) {
      message.warning('数量不能为负数');
      return;
    }
    setAdjusting(true);
    try {
      await api.put('/api/inventory/stock', {
        part_id: part.id,
        location_id: record.location_id,
        quantity: adjustValue,
      });
      message.success('库存调整成功');
      setAdjustModal({ visible: false, record: null });
      fetchPart();
    } catch (err) {
      message.error(err.response?.data?.error || '调整失败');
    } finally {
      setAdjusting(false);
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

  if (!part) return null;

  const handleAddStock = async () => {
    if (!selectedLocation) {
      message.warning('请选择库位');
      return;
    }
    if (addQuantity < 0) {
      message.warning('数量不能为负数');
      return;
    }
    setAddingStock(true);
    try {
      await api.put('/api/inventory/stock', {
        part_id: part.id,
        location_id: selectedLocation,
        quantity: addQuantity,
      });
      message.success('新增库存成功');
      setAddStockVisible(false);
      setSelectedLocation(null);
      setAddQuantity(1);
      fetchPart();
    } catch (err) {
      message.error(err.response?.data?.error || '新增库存失败');
    } finally {
      setAddingStock(false);
    }
  };

  const supplierColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '名称', dataIndex: 'name', key: 'name' },
  ];

  const equipmentColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '编号', dataIndex: 'code', key: 'code' },
  ];

  const stockColumns = [
    { title: '仓库', dataIndex: 'warehouse', key: 'warehouse' },
    { title: '货架', dataIndex: 'shelf', key: 'shelf' },
    { title: '货位', dataIndex: 'bin', key: 'bin' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EditFilled />}
          onClick={() => openAdjust(record)}
        >
          调整
        </Button>
      ),
    },
  ];

  const totalStock = (part.stock_by_location || []).reduce(
    (sum, s) => sum + Number(s.quantity || 0), 0
  );
  const isLow = totalStock <= (part.min_stock || 0);

  const tabItems = [
    {
      key: 'stock',
      label: '各库位库存',
      children: (
        <>
          <div style={{ marginBottom: 12, textAlign: 'right' }}>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setAddStockVisible(true)}>
              新增库存
            </Button>
          </div>
          <Table
            rowKey={(_, idx) => idx}
            columns={stockColumns}
            dataSource={part.stock_by_location || []}
            pagination={false}
          />
        </>
      ),
    },
    {
      key: 'suppliers',
      label: '关联供应商',
      children: (
        <Table
          rowKey="id"
          columns={supplierColumns}
          dataSource={part.suppliers || []}
          pagination={false}
        />
      ),
    },
    {
      key: 'equipment',
      label: '关联设备',
      children: (
        <Table
          rowKey="id"
          columns={equipmentColumns}
          dataSource={part.equipment || []}
          pagination={false}
        />
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/parts')}>
            返回
          </Button>
          <span>备件详情</span>
        </Space>
      }
      extra={
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => navigate(`/parts/${id}/edit`)}
        >
          编辑
        </Button>
      }
    >
      <Descriptions bordered column={{ xs: 1, sm: 2 }}>
        <Descriptions.Item label="编号">{part.code}</Descriptions.Item>
        <Descriptions.Item label="名称">{part.name}</Descriptions.Item>
        <Descriptions.Item label="型号">{part.model || '-'}</Descriptions.Item>
        <Descriptions.Item label="规格">{part.specification || '-'}</Descriptions.Item>
        <Descriptions.Item label="单位">{part.unit || '-'}</Descriptions.Item>
        <Descriptions.Item label="分类">{part.category_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="单价（元）">{part.unit_price != null ? `¥${Number(part.unit_price).toFixed(2)}` : '-'}</Descriptions.Item>
        <Descriptions.Item label="库存总价（元）">
          {(() => {
            const stock = (part.stock_by_location || []).reduce(
              (s, loc) => s + Number(loc.quantity || 0), 0
            );
            const total = stock * (part.unit_price || 0);
            return total > 0
              ? <span style={{ fontWeight: 600, color: '#722ed1', fontSize: 16 }}>¥{total.toFixed(2)}</span>
              : '-';
          })()}
        </Descriptions.Item>
        <Descriptions.Item label="最低库存">{part.min_stock ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="最高库存">{part.max_stock ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="当前库存">
          <Space>
            <Tag color={isLow ? 'red' : 'green'}>
              {totalStock}
            </Tag>
          </Space>
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 24 }}>
        <Tabs items={tabItems} />
      </div>

      <Modal
        title="调整库存"
        open={adjustModal.visible}
        onOk={handleAdjust}
        onCancel={() => setAdjustModal({ visible: false, record: null })}
        confirmLoading={adjusting}
        destroyOnClose
        width={400}
      >
        {adjustModal.record && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <span style={{ color: '#888' }}>库位：</span>
              <span>{adjustModal.record.warehouse} / {adjustModal.record.shelf} / {adjustModal.record.bin}</span>
            </div>
            <div>
              <span style={{ color: '#888' }}>当前数量：</span>
              <span>{adjustModal.record.quantity}</span>
            </div>
            <div>
              <span style={{ color: '#888', marginRight: 8 }}>调整后数量：</span>
              <InputNumber
                min={0}
                value={adjustValue}
                onChange={(v) => setAdjustValue(v)}
                style={{ width: 160 }}
              />
            </div>
          </Space>
        )}
      </Modal>
      <Modal
        title="新增库存"
        open={addStockVisible}
        onOk={handleAddStock}
        onCancel={() => {
          setAddStockVisible(false);
          setSelectedLocation(null);
          setAddQuantity(1);
        }}
        confirmLoading={addingStock}
        destroyOnClose
        width={400}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <span style={{ color: '#888', marginRight: 8 }}>库位：</span>
            <Select
              style={{ width: 260 }}
              placeholder="请选择库位"
              showSearch
              value={selectedLocation}
              onChange={(val) => setSelectedLocation(val)}
              filterOption={(input, option) =>
                (option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
              options={locations.map((loc) => ({
                label: `${loc.warehouse} / ${loc.shelf} / ${loc.bin}`,
                value: loc.id,
              }))}
            />
          </div>
          <div>
            <span style={{ color: '#888', marginRight: 8 }}>数量：</span>
            <InputNumber
              min={0}
              value={addQuantity}
              onChange={(v) => setAddQuantity(v)}
              style={{ width: 160 }}
            />
          </div>
        </Space>
      </Modal>
    </Card>
  );
}
