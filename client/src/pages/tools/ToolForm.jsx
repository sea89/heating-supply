import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Button, Space, message } from 'antd';
import api from '../../api/client';

export default function ToolForm({ tool, onSuccess, onCancel }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEdit = Boolean(tool);

  useEffect(() => {
    if (tool) {
      form.setFieldsValue({
        code: tool.code,
        name: tool.name,
        model: tool.model,
        category: tool.category,
        location: tool.location,
        unit_price: tool.unit_price,
        quantity: tool.quantity,
        status: tool.status,
      });
    }
  }, [tool, form]);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/api/tools/${tool.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/api/tools', values);
        message.success('创建成功');
      }
      onSuccess();
    } catch (err) {
      message.error(err.response?.data?.error || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
    >
      <Form.Item
        name="code"
        label="编号"
        rules={[{ required: true, message: '请输入工具编号' }]}
      >
        <Input placeholder="请输入工具编号" />
      </Form.Item>

      <Form.Item
        name="name"
        label="名称"
        rules={[{ required: true, message: '请输入工具名称' }]}
      >
        <Input placeholder="请输入工具名称" />
      </Form.Item>

      <Form.Item name="model" label="型号">
        <Input placeholder="请输入型号（可选）" />
      </Form.Item>

      <Form.Item name="category" label="分类">
        <Input placeholder="请输入工具分类（可选）" />
      </Form.Item>

      <Form.Item name="location" label="位置">
        <Input placeholder="请输入存放位置（可选）" />
      </Form.Item>

      <Form.Item name="quantity" label="数量" initialValue={1}>
        <InputNumber min={1} step={1} style={{ width: 120 }} placeholder="数量" />
      </Form.Item>

      <Form.Item name="status" label="状态">
        <Select
          options={[
            { label: '可用', value: 'available' },
            { label: '维修中', value: 'maintenance' },
            { label: '报废', value: 'scrapped' },
          ]}
          placeholder="选择状态"
        />
      </Form.Item>

      <Form.Item name="unit_price" label="单价（元）">
        <InputNumber
          min={0}
          step={0.01}
          precision={2}
          prefix="¥"
          style={{ width: 200 }}
          placeholder="请输入单价"
        />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {isEdit ? '保存' : '创建'}
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
