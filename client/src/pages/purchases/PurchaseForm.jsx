import { useState, useEffect, useCallback } from 'react';
import { Card, Form, Input, InputNumber, Select, Radio, Button, Space, message, Divider, Spin } from 'antd';
import { PlusOutlined, MinusCircleOutlined, CalculatorOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import api from '../../api/client';

export default function PurchaseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const workOrderId = searchParams.get('work_order_id');
  const isEdit = Boolean(id);

  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [parts, setParts] = useState([]);
  const [partsMap, setPartsMap] = useState({});
  const [tools, setTools] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loadedWorkOrder, setLoadedWorkOrder] = useState(false);
  const [itemsPrices, setItemsPrices] = useState({});

  const fetchParts = useCallback(async () => {
    try {
      const res = await api.get('/api/parts', { params: { page_size: 1000 } });
      const items = res.data.items || [];
      setParts(items);
      const map = {};
      items.forEach(p => { map[p.id] = p; });
      setPartsMap(map);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchTools = useCallback(async () => {
    try {
      const res = await api.get('/api/tools');
      setTools(res.data || []);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchWorkOrders = useCallback(async () => {
    try {
      const res = await api.get('/api/work-orders', { params: isEdit ? {} : { status: 'pending' } });
      setWorkOrders(res.data || []);
    } catch {
      // silently ignore
    }
  }, [isEdit]);

  // Load existing purchase order data in edit mode
  useEffect(() => {
    if (!isEdit) return;
    setLoadingData(true);
    api.get(`/api/purchases/${id}`).then((res) => {
      const po = res.data;
      const vals = {
        priority: po.priority,
        remark: po.remark,
        work_order_id: po.work_order_id || undefined,
        items: (po.items || []).map((item) => ({
          item_type: item.item_type || 'part',
          part_id: item.item_type !== 'tool' ? item.part_id : undefined,
          tool_id: item.item_type === 'tool' ? item.tool_id : undefined,
          quantity: item.quantity,
          unit_price: item.unit_price || undefined,
        })),
      };
      form.setFieldsValue(vals);
      // Set items prices for display
      const prices = {};
      (po.items || []).forEach((item, idx) => {
        if (item.unit_price && item.quantity) {
          prices[idx] = +(Number(item.quantity) * Number(item.unit_price)).toFixed(2);
        }
      });
      setItemsPrices(prices);
    }).catch((err) => {
      message.error(err.response?.data?.error || '加载采购单失败');
      navigate('/purchases');
    }).finally(() => {
      setLoadingData(false);
    });
  }, [id, isEdit, form, navigate]);

  useEffect(() => {
    fetchParts();
    fetchTools();
    fetchWorkOrders();
  }, [fetchParts, fetchTools, fetchWorkOrders]);

  useEffect(() => {
    if (workOrderId && parts.length > 0 && !loadedWorkOrder && !isEdit) {
      setLoadedWorkOrder(true);
      api.get(`/api/work-orders/${workOrderId}`).then((res) => {
        const wo = res.data;
        const vals = { work_order_id: wo.id };
        if (wo.parts && wo.parts.length > 0) {
          vals.items = wo.parts.map((p) => ({
            part_id: p.part_id,
            quantity: Number(p.quantity),
          }));
        }
        form.setFieldsValue(vals);
      }).catch(() => {});
    }
  }, [workOrderId, parts, form, loadedWorkOrder, isEdit]);

  const updateItemPrice = (name) => {
    const itemsList = form.getFieldValue('items') || [];
    const item = itemsList[name];
    if (item) {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price) || 0;
      const total = unitPrice > 0 ? +(quantity * unitPrice).toFixed(2) : null;
      setItemsPrices(prev => ({ ...prev, [name]: total }));
    }
  };

  const calcTotalAmount = () => {
    const itemsList = form.getFieldValue('items') || [];
    return itemsList.reduce((sum, item, idx) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price) || 0;
      return sum + (unitPrice > 0 ? quantity * unitPrice : 0);
    }, 0);
  };

  const onFinish = async (values) => {
    const { items } = values;
    if (!items || items.length === 0) {
      message.warning('请添加至少一个采购项');
      return;
    }
    for (const item of items) {
      const itemType = item.item_type || 'part';
      if (itemType === 'tool') {
        if (!item.tool_id || !item.quantity) {
          message.warning('请填写所有工具信息');
          return;
        }
      } else {
        if (!item.part_id || !item.quantity) {
          message.warning('请填写所有备件信息');
          return;
        }
      }
    }
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/api/purchases/${id}`, values);
        message.success('采购单修改成功');
      } else {
        await api.post('/api/purchases', values);
        message.success('采购单创建成功');
      }
      navigate('/purchases');
    } catch (err) {
      message.error(err.response?.data?.error || (isEdit ? '修改采购单失败' : '创建采购单失败'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <Card title="编辑采购单">
        <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
      </Card>
    );
  }

  return (
    <Card title={isEdit ? '编辑采购单' : '新建采购单'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: '100%' }}
        initialValues={{ priority: 'normal' }}
      >
        <Form.Item
          name="priority"
          label="优先级"
          rules={[{ required: true, message: '请选择优先级' }]}
        >
          <Radio.Group>
            <Radio value="normal">普通</Radio>
            <Radio value="urgent">紧急</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={3} placeholder="备注信息（可选）" />
        </Form.Item>

        <Form.Item name="work_order_id" label="关联工单">
          <Select
            allowClear
            showSearch
            placeholder="选择关联工单（可选）"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={workOrders.map((w) => ({
              label: `${w.order_no} - ${w.equipment_name || ''}`.trim(),
              value: w.id,
            }))}
          />
        </Form.Item>

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
                    name={[name, 'item_type']}
                    initialValue="part"
                  >
                    <Select
                      style={{ width: 100 }}
                      placeholder="类型"
                      onChange={() => {
                        // Clear item selection when type changes
                        const item = form.getFieldValue(['items', name]);
                        if (item) {
                          delete item.part_id;
                          delete item.tool_id;
                          form.setFieldsValue({ items: form.getFieldValue('items') });
                        }
                      }}
                      options={[
                        { label: '备件', value: 'part' },
                        { label: '工具', value: 'tool' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item noStyle shouldUpdate={(prev, curr) => {
                    const prevType = prev?.items?.[name]?.item_type;
                    const currType = curr?.items?.[name]?.item_type;
                    return prevType !== currType;
                  }}>
                    {({ getFieldValue }) => {
                      const itemType = getFieldValue(['items', name, 'item_type']) || 'part';
                      if (itemType === 'tool') {
                        return (
                          <Form.Item
                            {...restField}
                            name={[name, 'tool_id']}
                            rules={[{ required: true, message: '请选择工具' }]}
                          >
                            <Select
                              showSearch
                              style={{ width: 260 }}
                              placeholder="选择工具"
                              filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                              }
                              options={tools.map((t) => ({
                                label: `${t.code} - ${t.name} (${t.model || '-'})`,
                                value: t.id,
                              }))}
                            />
                          </Form.Item>
                        );
                      }
                      return (
                        <Form.Item
                          {...restField}
                          name={[name, 'part_id']}
                          rules={[{ required: true, message: '请选择备件' }]}
                        >
                          <Select
                            showSearch
                            style={{ width: 260 }}
                            placeholder="选择备件"
                            onChange={(value) => {
                              const selected = partsMap[value];
                              if (selected && selected.unit_price != null) {
                                const currentItems = form.getFieldValue('items') || [];
                                if (currentItems[name]) {
                                  currentItems[name].unit_price = Number(selected.unit_price);
                                  form.setFieldsValue({ items: currentItems });
                                  updateItemPrice(name);
                                }
                              }
                            }}
                            filterOption={(input, option) =>
                              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={parts.map((p) => ({
                              label: `${p.code} - ${p.name} (${p.model || '-'})`,
                              value: p.id,
                            }))}
                          />
                        </Form.Item>
                      );
                    }}
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'quantity']}
                    rules={[{ required: true, message: '请输入数量' }]}
                  >
                    <InputNumber
                      style={{ width: 90 }}
                      placeholder="数量"
                      min={1}
                      step={1}
                      onChange={() => updateItemPrice(name)}
                    />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'unit_price']}
                  >
                    <InputNumber
                      style={{ width: 120 }}
                      placeholder="单价(元)"
                      min={0}
                      step={0.01}
                      precision={2}
                      prefix="¥"
                      onChange={() => updateItemPrice(name)}
                    />
                  </Form.Item>
                  <span style={{ minWidth: 100, color: '#722ed1', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {itemsPrices[name] != null ? `¥${itemsPrices[name].toFixed(2)}` : '—'}
                  </span>
                  <MinusCircleOutlined onClick={() => remove(name)} />
                </Space>
              ))}
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add({ item_type: 'part' })}
                  block
                  icon={<PlusOutlined />}
                >
                  添加采购项
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Divider />
        <div style={{ textAlign: 'right', marginBottom: 16, fontSize: 16 }}>
          合计金额：
          <span style={{ color: '#722ed1', fontWeight: 700, fontSize: 20 }}>
            ¥{calcTotalAmount().toFixed(2)}
          </span>
        </div>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting} icon={<CalculatorOutlined />}>
              {isEdit ? '保存修改' : '提交采购单'}
            </Button>
            <Button onClick={() => navigate('/purchases')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
