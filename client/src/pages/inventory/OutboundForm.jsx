import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Form, Input, InputNumber, Select, Space, message } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';

export default function OutboundForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const partIdParam = searchParams.get('part_id');
  const workOrderId = searchParams.get('work_order_id');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [parts, setParts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [stockData, setStockData] = useState([]);
  const [loadedWorkOrder, setLoadedWorkOrder] = useState(false);
  const [presetWorkOrderInfo, setPresetWorkOrderInfo] = useState(null);

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

  const fetchWorkOrders = useCallback(async () => {
    try {
      const res = await api.get('/api/work-orders');
      setWorkOrders(res.data || []);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchStock = useCallback(async () => {
    try {
      const res = await api.get('/api/inventory/stock');
      const stockData = res.data || [];
      const map = {};
      stockData.forEach((item) => {
        const key = `${item.part_id || item.part_code}-${item.location_id}`;
        map[key] = item.quantity || 0;
      });
      setStockMap(map);
      setStockData(stockData);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchParts();
    fetchLocations();
    fetchWorkOrders();
    fetchStock();
  }, [fetchParts, fetchLocations, fetchWorkOrders, fetchStock]);

  useEffect(() => {
    if (workOrderId && parts.length > 0 && locations.length > 0 && !loadedWorkOrder) {
      setLoadedWorkOrder(true);
      api.get(`/api/work-orders/${workOrderId}`).then((res) => {
        const wo = res.data;
        setPresetWorkOrderInfo(wo);
        if (wo.parts && wo.parts.length > 0) {
          form.setFieldsValue({
            items: wo.parts.map((p) => ({
              part_id: p.part_id,
              quantity: Number(p.quantity),
              work_order_id: wo.id,
            })),
          });
        }
      }).catch(() => {});
    }
  }, [workOrderId, parts, locations, form, loadedWorkOrder]);

  const getAvailableStock = (partId, locationId) => {
    if (!partId || !locationId) return 0;
    const key = `${partId}-${locationId}`;
    return stockMap[key] || 0;
  };

  // Pre-fill form when navigated from PartList with ?part_id=X
  useEffect(() => {
    if (partIdParam && parts.length > 0) {
      const partId = Number(partIdParam);
      const part = parts.find(p => p.id === partId);
      if (part) {
        form.setFieldsValue({ items: [{ part_id: part.id, quantity: 1 }] });
      }
    }
  }, [partIdParam, parts]);

  const handleSubmit = async (values) => {
    const { items } = values;
    if (!items || items.length === 0) {
      message.warning('请添加至少一条出库项');
      return;
    }
    for (const item of items) {
      if (!item.part_id || !item.quantity || !item.location_id || !item.recipient) {
        message.warning('请填写所有必填项（备件、数量、库位、领用人）');
        return;
      }
      const available = getAvailableStock(item.part_id, item.location_id);
      if (item.quantity > available) {
        message.warning(
          `备件 ${
            parts.find((p) => p.id === item.part_id)?.name || ''
          } 在所选库位的可用库存不足（可用: ${available}）`
        );
        return;
      }
    }
    setLoading(true);
    try {
      await api.post('/api/inventory/outbound', { items });
      message.success('出库成功');
      if (workOrderId) {
        navigate(`/work-orders/${workOrderId}`);
      } else {
        form.resetFields();
        fetchStock();
      }
    } catch (err) {
      message.error(err.response?.data?.error || '出库失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="出库登记">
      {presetWorkOrderInfo && (
        <div style={{ marginBottom: 16, padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
          关联工单：<a onClick={() => navigate(`/work-orders/${presetWorkOrderInfo.id}`)}>{presetWorkOrderInfo.order_no}</a>
          {presetWorkOrderInfo.equipment_name && <> · 设备：{presetWorkOrderInfo.equipment_name}</>}
        </div>
      )}
      <Form form={form} onFinish={handleSubmit} layout="vertical">
        <Form.List name="items">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space
                  key={key}
                  style={{ display: 'flex', marginBottom: 12, flexWrap: 'wrap' }}
                  align="baseline"
                >
                  <Form.Item
                    {...restField}
                    name={[name, 'part_id']}
                    rules={[{ required: true, message: '请选择备件' }]}
                  >
                    <Select
                      showSearch
                      style={{ width: '100%', minWidth: 240 }}
                      placeholder="选择备件"
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={parts.map((p) => ({
                        label: `${p.code} - ${p.name}${p.model ? ' (' + p.model + ')' : ''}`,
                        value: p.id,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'quantity']}
                    rules={[{ required: true, message: '请输入数量' }]}
                  >
                    <InputNumber
                      style={{ width: 110 }}
                      placeholder="数量"
                      min={0.01}
                      step={1}
                    />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'location_id']}
                    rules={[{ required: true, message: '请选择库位' }]}
                  >
                    <Select
                      showSearch
                      style={{ width: '100%', minWidth: 220 }}
                      placeholder="选择库位"
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      notFoundContent="请先选择备件"
                      options={((() => {
                        const partId = form.getFieldValue(['items', name, 'part_id']);
                        if (!partId) return [];
                        const stockRows = stockData.filter(s => s.part_id === partId && Number(s.quantity) > 0);
                        return stockRows.map(s => ({
                          label: `${s.warehouse || ''} ${s.shelf || ''} ${s.bin || ''}`.trim() + ` (库存: ${s.quantity})`,
                          value: s.location_id,
                        }));
                      })())}
                    />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'recipient']}
                    rules={[{ required: true, message: '请输入领用人' }]}
                  >
                    <Input style={{ width: 130 }} placeholder="领用人" />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'work_order_id']}>
                    <Select
                      showSearch
                      style={{ width: '100%', minWidth: 200 }}
                      placeholder="工单（可选）"
                      allowClear
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={workOrders.map((wo) => ({
                        label: wo.order_no || wo.name || `#${wo.id}`,
                        value: wo.id,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'remark']}>
                    <Input style={{ width: 150 }} placeholder="备注（可选）" />
                  </Form.Item>
                  <MinusCircleOutlined onClick={() => remove(name)} />
                </Space>
              ))}
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                >
                  添加出库项
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            提交出库
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
