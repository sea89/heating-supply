import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Form, Input, InputNumber, Select, Space, message } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';

export default function InboundForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const purchaseOrderIdParam = searchParams.get('purchase_order_id');
  const partIdParam = searchParams.get('part_id');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [parts, setParts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState(null);

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

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await api.get('/api/suppliers');
      setSuppliers(res.data || []);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      const res = await api.get('/api/purchases');
      setPurchaseOrders(res.data || []);
    } catch {
      // silently ignore
    }
  }, []);

  // Pre-fill form when navigated from PartList with ?part_id=X
  useEffect(() => {
    if (partIdParam && parts.length > 0 && !purchaseOrderIdParam) {
      const partId = Number(partIdParam);
      const part = parts.find(p => p.id === partId);
      if (part) {
        form.setFieldsValue({ items: [{ part_id: part.id, quantity: 1 }] });
      }
    }
  }, [partIdParam, parts]);

  useEffect(() => {
    fetchParts();
    fetchLocations();
    fetchSuppliers();
    fetchPurchaseOrders();
  }, [fetchParts, fetchLocations, fetchSuppliers, fetchPurchaseOrders]);

  const handlePurchaseOrderChange = async (value) => {
    setSelectedPurchaseOrderId(value);
    if (!value) return;
    try {
      const res = await api.get(`/api/purchases/${value}`);
      const po = res.data;
      if (po.items && po.items.length > 0) {
        const remainingItems = po.items
          .filter((item) => Number(item.arrived_quantity || 0) < Number(item.quantity))
          .map((item) => ({
            part_id: item.part_id,
            quantity: Number(item.quantity) - Number(item.arrived_quantity || 0),
            purchase_order_id: po.id,
          }));
        form.setFieldsValue({ items: remainingItems });
      }
    } catch {
      message.error('获取采购单明细失败');
    }
  };

  useEffect(() => {
    if (purchaseOrderIdParam && parts.length > 0 && locations.length > 0 && purchaseOrders.length > 0) {
      const poId = Number(purchaseOrderIdParam);
      setSelectedPurchaseOrderId(poId);
      handlePurchaseOrderChange(poId);
    }
  }, [purchaseOrderIdParam, parts.length, locations.length, purchaseOrders.length]);

  const handleSubmit = async (values) => {
    const { items } = values;
    if (!items || items.length === 0) {
      message.warning('请添加至少一条入库项');
      return;
    }
    for (const item of items) {
      if (!item.part_id || !item.quantity || !item.location_id) {
        message.warning('请填写所有必填项（备件、数量、库位）');
        return;
      }
    }
    setLoading(true);
    try {
      await api.post('/api/inventory/inbound', { items });
      message.success('入库成功');
      if (selectedPurchaseOrderId) {
        navigate(`/purchases/${selectedPurchaseOrderId}`);
      } else {
        form.resetFields();
        navigate('/inventory');
      }
    } catch (err) {
      message.error(err.response?.data?.error || '入库失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="入库登记">
      <Form form={form} onFinish={handleSubmit} layout="vertical">
        {purchaseOrders.length > 0 && (
          <Form.Item label="关联采购单">
            <Select
              showSearch
              style={{ maxWidth: 400 }}
              placeholder="选择采购单自动填充（可选）"
              allowClear
              value={selectedPurchaseOrderId}
              onChange={handlePurchaseOrderChange}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={purchaseOrders.map((po) => ({
                label: `${po.order_no}`,
                value: po.id,
              }))}
            />
          </Form.Item>
        )}
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
                      style={{ width: 220 }}
                      placeholder="选择备件"
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={parts.map((p) => ({
                        label: `${p.code} - ${p.name}`,
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
                      style={{ width: 120 }}
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
                      style={{ width: 200 }}
                      placeholder="选择库位"
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={locations.map((l) => ({
                        label: `${l.warehouse || ''} ${l.shelf || ''} ${l.bin || ''}`.trim(),
                        value: l.id,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'supplier_id']}>
                    <Select
                      showSearch
                      style={{ width: 180 }}
                      placeholder="供应商（可选）"
                      allowClear
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={suppliers.map((s) => ({
                        label: s.name,
                        value: s.id,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'remark']}>
                    <Input style={{ width: 180 }} placeholder="备注（可选）" />
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
                  添加入库项
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            提交入库
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
