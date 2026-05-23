import { useState, useEffect, useCallback } from 'react';
import { Card, Form, Input, InputNumber, Select, Button, Space, message } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function WorkOrderForm() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [equipment, setEquipment] = useState([]);
  const [users, setUsers] = useState([]);
  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(undefined);

  const fetchOptions = useCallback(async () => {
    try {
      const [eqRes, userRes, partRes, catRes] = await Promise.all([
        api.get('/api/equipment'),
        api.get('/api/auth/users'),
        api.get('/api/parts', { params: { page_size: 1000 } }),
        api.get('/api/system-categories'),
      ]);
      setEquipment(eqRes.data || []);
      setUsers(userRes.data || []);
      setParts(partRes.data.items || []);
      setCategories(catRes.data || []);
    } catch {
      message.error('加载选项数据失败');
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const onFinish = async (values) => {
    const { parts: selectedParts } = values;
    if (!selectedParts || selectedParts.length === 0) {
      message.warning('请添加至少一个备件');
      return;
    }
    for (const item of selectedParts) {
      if (!item.part_id && !item.custom_name) { message.warning('请选择或输入备件'); return; } if (!item.quantity) {
        message.warning('请填写所有备件信息');
        return;
      }
    }
    setSubmitting(true);
    try {
      await api.post('/api/work-orders', values);
      message.success('工单创建成功');
      navigate('/work-orders');
    } catch (err) {
      message.error(err.response?.data?.error || '创建工单失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="新建工单">
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: 800 }}
      >
        <Form.Item label="系统分类">
          <Select
            allowClear
            placeholder="选择系统分类（可选）"
            style={{ width: '100%' }}
            value={selectedCategory}
            onChange={(value) => {
              setSelectedCategory(value);
              form.setFieldValue('equipment_id', undefined);
            }}
            options={categories.map(c => ({ label: c.name, value: c.id }))}
          />
        </Form.Item>

        <Form.Item
          name="equipment_id"
          label="设备"
          rules={[{ required: true, message: '请选择设备' }]}
        >
          <Select
            showSearch
            placeholder="选择设备"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={equipment
              .filter(e => !selectedCategory || e.system_category_id === selectedCategory)
              .map((e) => ({
                label: `${e.name} (${e.code || ''})`.trim(),
                value: e.id,
              }))}
          />
        </Form.Item>

        <Form.Item
          name="fault_description"
          label="故障描述"
          rules={[{ required: true, message: '请输入故障描述' }]}
        >
          <Input.TextArea rows={4} placeholder="请描述设备故障情况" />
        </Form.Item>

        <Form.Item
          name="assignee_id"
          label="负责人"
          rules={[{ required: true, message: '请选择负责人' }]}
        >
          <Select
            showSearch
            placeholder="选择负责人"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={users.map((u) => ({
              label: u.name || u.username || u.email,
              value: u.id,
            }))}
          />
        </Form.Item>

        <Form.List name="parts">
          {(fields, { add, remove }) => (
            <>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>所需备件</div>
              {fields.map(({ key, name, ...restField }) => (
                <Space
                  key={key}
                  style={{ display: 'flex', marginBottom: 12, flexWrap: 'wrap' }}
                  align="baseline"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Form.Item
                      {...restField}
                      name={[name, 'part_id']}
                      style={{ marginBottom: 4 }}
                    >
                      <Select
                        showSearch
                        style={{ width: 260 }}
                        placeholder="选择备件（可选）"
                        allowClear
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={parts.map((p) => ({
                          label: `${p.code} - ${p.name} (${p.model || '-'})`,
                          value: p.id,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'custom_name']} style={{ marginBottom: 0 }}>
                      <Input style={{ width: 260 }} placeholder="或输入自定义备件名称" />
                    </Form.Item>
                  </div>
                  <Form.Item
                    {...restField}
                    name={[name, 'quantity']}
                    rules={[{ required: true, message: '请输入数量' }]}
                  >
                    <InputNumber
                      style={{ width: 120 }}
                      placeholder="数量"
                      min={1}
                      step={1}
                    />
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
                  添加备件
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              创建工单
            </Button>
            <Button onClick={() => navigate('/work-orders')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
