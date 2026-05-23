import { useState, useEffect, useCallback } from 'react';
import { Card, Form, Select, InputNumber, Button, Table, message } from 'antd';
import api from '../../api/client';

export default function LocationTransfer() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [parts, setParts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [stockList, setStockList] = useState([]);
  const [selectedPartId, setSelectedPartId] = useState(undefined);
  const [stockLoading, setStockLoading] = useState(false);
  const [availableQty, setAvailableQty] = useState(0);

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

  useEffect(() => {
    fetchParts();
    fetchLocations();
  }, [fetchParts, fetchLocations]);

  const handlePartChange = async (partId) => {
    setSelectedPartId(partId);
    form.setFieldsValue({ from_location_id: undefined, to_location_id: undefined, quantity: undefined });
    setAvailableQty(0);
    if (!partId) {
      setStockList([]);
      return;
    }
    setStockLoading(true);
    try {
      const res = await api.get('/api/inventory/stock', { params: { part_id: partId } });
      const items = res.data || [];
      setStockList(items);
    } catch {
      setStockList([]);
    } finally {
      setStockLoading(false);
    }
  };

  const handleSourceLocationChange = (locationId) => {
    form.setFieldsValue({ quantity: undefined });
    if (locationId && selectedPartId) {
      const found = stockList.find((s) => s.location_id === locationId);
      setAvailableQty(found ? found.quantity || 0 : 0);
    } else {
      setAvailableQty(0);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await api.post('/api/locations/transfer', {
        part_id: values.part_id,
        from_location_id: values.from_location_id,
        to_location_id: values.to_location_id,
        quantity: values.quantity,
      });
      message.success('移库成功');
      form.resetFields();
      setStockList([]);
      setSelectedPartId(undefined);
      setAvailableQty(0);
    } catch (err) {
      message.error(err.response?.data?.error || '移库失败');
    } finally {
      setLoading(false);
    }
  };

  const sourceLocations = selectedPartId
    ? locations.filter((l) => stockList.some((s) => s.location_id === l.id))
    : [];

  const targetLocations = locations.filter(
    (l) => l.id !== form.getFieldValue('from_location_id')
  );

  const stockColumns = [
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
    },
    {
      title: '库位',
      dataIndex: 'bin',
      key: 'bin',
      width: 100,
    },
    {
      title: '库存量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
    },
  ];

  return (
    <Card title="库位转移">
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="part_id"
          label="选择备件"
          rules={[{ required: true, message: '请选择备件' }]}
        >
          <Select
            showSearch
            style={{ width: 400 }}
            placeholder="搜索并选择备件"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            onChange={handlePartChange}
            options={parts.map((p) => ({
              label: `${p.code} - ${p.name} ${p.model || ''}`.trim(),
              value: p.id,
            }))}
          />
        </Form.Item>

        {selectedPartId && (
          <>
            <h4 style={{ marginBottom: 8 }}>当前各库位库存：</h4>
            <Table
              rowKey={(record) =>
                `${record.part_code}-${record.warehouse}-${record.shelf}-${record.bin}`
              }
              columns={stockColumns}
              dataSource={stockList}
              loading={stockLoading}
              pagination={false}
              size="small"
              style={{ marginBottom: 16 }}
            />
          </>
        )}

        <Form.Item
          name="from_location_id"
          label="源库位"
          rules={[{ required: true, message: '请选择源库位' }]}
        >
          <Select
            showSearch
            style={{ width: 400 }}
            placeholder="选择源库位"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            onChange={handleSourceLocationChange}
            options={sourceLocations.map((l) => ({
              label: `${l.warehouse || ''} ${l.shelf || ''} ${l.bin || ''}`.trim(),
              value: l.id,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="to_location_id"
          label="目标库位"
          rules={[{ required: true, message: '请选择目标库位' }]}
        >
          <Select
            showSearch
            style={{ width: 400 }}
            placeholder="选择目标库位"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={targetLocations.map((l) => ({
              label: `${l.warehouse || ''} ${l.shelf || ''} ${l.bin || ''}`.trim(),
              value: l.id,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="quantity"
          label="转移数量"
          rules={[{ required: true, message: '请输入转移数量' }]}
        >
          <InputNumber
            style={{ width: 200 }}
            placeholder={`最大可用: ${availableQty}`}
            min={0.01}
            max={availableQty || undefined}
            step={1}
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            确认转移
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
