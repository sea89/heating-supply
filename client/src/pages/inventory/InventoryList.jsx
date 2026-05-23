import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Select, Tag, Space, Button, Modal, InputNumber, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import api from '../../api/client';

export default function InventoryList() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [parts, setParts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [partId, setPartId] = useState(undefined);
  const [locationId, setLocationId] = useState(undefined);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [adjustRecord, setAdjustRecord] = useState(null);
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [adjusting, setAdjusting] = useState(false);

  const fetchParts = useCallback(async () => {
    try {
      const res = await api.get('/api/parts', { params: { page_size: 1000 } });
      setParts(res.data.items || []);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await api.get('/api/locations');
      setLocations(res.data || []);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (partId) params.part_id = partId;
      if (locationId) params.location_id = locationId;
      const res = await api.get('/api/inventory/stock', { params });
      setData(res.data || []);
    } catch (err) {
      message.error(err.response?.data?.error || '获取库存列表失败');
    } finally {
      setLoading(false);
    }
  }, [partId, locationId]);

  useEffect(() => {
    fetchParts();
    fetchLocations();
  }, [fetchParts, fetchLocations]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const showAdjustModal = (record) => {
    setAdjustRecord(record);
    setAdjustQuantity(record.quantity);
    setAdjustModalVisible(true);
  };

  const handleAdjustCancel = () => {
    setAdjustModalVisible(false);
    setAdjustRecord(null);
  };

  const handleAdjustConfirm = async () => {
    if (adjustQuantity < 0) {
      message.warning('数量不能为负数');
      return;
    }
    setAdjusting(true);
    try {
      await api.put('/api/inventory/stock', {
        part_id: adjustRecord.part_id,
        location_id: adjustRecord.location_id,
        quantity: adjustQuantity,
      });
      message.success('库存调整成功');
      setAdjustModalVisible(false);
      setAdjustRecord(null);
      fetchStock();
    } catch (err) {
      message.error(err.response?.data?.error || '调整失败');
    } finally {
      setAdjusting(false);
    }
  };

  const stockStatusMap = {
    low: { color: 'red', text: '低库存' },
    normal: { color: 'green', text: '正常' },
    over: { color: 'orange', text: '超库存' },
  };

  const columns = [
    {
      title: '备件编码',
      dataIndex: 'part_code',
      key: 'part_code',
      width: 120,
    },
    {
      title: '备件名称',
      dataIndex: 'part_name',
      key: 'part_name',
    },
    {
      title: '型号',
      dataIndex: 'part_model',
      key: 'part_model',
      //
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: '仓库',
      dataIndex: 'warehouse',
      key: 'warehouse',
      width: 100,
    },
    {
      title: '货架',
      dataIndex: 'shelf',
      key: 'shelf',
      width: 100,
      //
    },
    {
      title: '库位',
      dataIndex: 'bin',
      key: 'bin',
      width: 100,
      //
    },
    {
      title: '库存量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
    },
    {
      title: '库存状态',
      dataIndex: 'stock_status',
      key: 'stock_status',
      width: 100,
      render: (status) => {
        const map = stockStatusMap[status] || { color: 'default', text: status };
        return <Tag color={map.color}>{map.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => showAdjustModal(record)}
        >
          调整
        </Button>
      ),
    },
  ];

  return (
    <Card title="库存明细">
      <Space style={{ marginBottom: 16 }}>
        <Select
          showSearch
          style={{ width: 220 }}
          placeholder="选择备件"
          allowClear
          value={partId}
          onChange={(val) => setPartId(val)}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={parts.map((p) => ({
            label: `${p.code} - ${p.name}`,
            value: p.id,
          }))}
        />
        <Select
          showSearch
          style={{ width: 220 }}
          placeholder="选择库位"
          allowClear
          value={locationId}
          onChange={(val) => setLocationId(val)}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={locations.map((l) => ({
            label: `${l.warehouse || ''} ${l.shelf || ''} ${l.bin || ''}`.trim(),
            value: l.id,
          }))}
        />
      </Space>
      <Table
        rowKey={(record) =>
          `${record.part_code}-${record.warehouse}-${record.shelf}-${record.bin}`
        }
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
      />
      <Modal
        title="库存调整"
        open={adjustModalVisible}
        onOk={handleAdjustConfirm}
        onCancel={handleAdjustCancel}
        confirmLoading={adjusting}
        okText="确认调整"
        cancelText="取消"
      >
        {adjustRecord && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <strong>备件：</strong>{adjustRecord.part_name} ({adjustRecord.part_code})
            </div>
            <div>
              <strong>库位：</strong>{adjustRecord.warehouse} / {adjustRecord.shelf} / {adjustRecord.bin}
            </div>
            <div>
              <strong>当前数量：</strong>{adjustRecord.quantity}
            </div>
            <div style={{ marginTop: 12 }}>
              <strong>调整后数量：</strong>
              <InputNumber
                min={0}
                value={adjustQuantity}
                onChange={(val) => setAdjustQuantity(val)}
                style={{ width: 200, marginLeft: 8 }}
              />
            </div>
          </Space>
        )}
      </Modal>
    </Card>
  );
}
