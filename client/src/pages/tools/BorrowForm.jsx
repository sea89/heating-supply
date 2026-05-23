import { useState, useEffect, useCallback } from 'react';
import { Card, Form, Select, Radio, DatePicker, Input, Button, Space, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import dayjs from 'dayjs';

export default function BorrowForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toolIdParam = searchParams.get('tool_id');
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [availableTools, setAvailableTools] = useState([]);
  const [users, setUsers] = useState([]);
  const [borrowerType, setBorrowerType] = useState('internal');

  const fetchOptions = useCallback(async () => {
    try {
      const [toolRes, userRes] = await Promise.all([
        api.get('/api/tools', { params: { status: 'available' } }),
        api.get('/api/auth/users'),
      ]);
      setAvailableTools(toolRes.data || []);
      setUsers(userRes.data || []);
    } catch {
      message.error('加载选项数据失败');
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // Pre-fill tool when navigated from ToolList with ?tool_id=X
  useEffect(() => {
    if (toolIdParam && availableTools.length > 0) {
      const toolId = Number(toolIdParam);
      const exists = availableTools.find(t => t.id === toolId);
      if (exists) {
        form.setFieldsValue({ tool_ids: [toolId] });
      }
    }
  }, [toolIdParam, availableTools]);

  const onFinish = async (values) => {
    const payload = {
      tool_ids: values.tool_ids,
      borrower_user_id: values.borrower_type === 'internal' ? values.borrower_user_id : undefined,
      external_borrower_name: values.borrower_type === 'external' ? values.external_borrower_name : undefined,
      external_borrower_phone: values.borrower_type === 'external' ? values.external_borrower_phone : undefined,
      external_borrower_company: values.borrower_type === 'external' ? values.external_borrower_company : undefined,
      borrowed_at: values.borrowed_at
        ? dayjs(values.borrowed_at).format('YYYY-MM-DD HH:mm:ss')
        : undefined,
      expected_return_at: values.expected_return_at
        ? dayjs(values.expected_return_at).format('YYYY-MM-DD HH:mm:ss')
        : undefined,
      purpose: values.purpose,
    };

    if (!payload.tool_ids || payload.tool_ids.length === 0) {
      message.warning('请选择要借出的工具');
      return;
    }
    if (values.borrower_type === 'internal' && !payload.borrower_user_id) {
      message.warning('请选择借用人');
      return;
    }
    if (values.borrower_type === 'external' && !payload.external_borrower_name) {
      message.warning('请输入外部借用人姓名');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/tools/borrow', payload);
      message.success('借出登记成功');
      navigate('/tools');
    } catch (err) {
      message.error(err.response?.data?.error || '借出登记失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tools')}>
            返回
          </Button>
          <span>工具借出登记</span>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: 600 }}
        initialValues={{ borrower_type: 'internal' }}
        onValuesChange={(changed) => {
          if (changed.borrower_type !== undefined) {
            setBorrowerType(changed.borrower_type);
          }
        }}
      >
        <Form.Item
          name="tool_ids"
          label="选择工具"
          rules={[{ required: true, message: '请选择工具' }]}
        >
          <Select
            mode="multiple"
            showSearch
            placeholder="选择要借出的工具"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={availableTools.map((t) => ({
              label: `${t.code} - ${t.name} (${t.model || '-'})`,
              value: t.id,
            }))}
          />
        </Form.Item>

        <Form.Item name="borrower_type" label="借用人类型">
          <Radio.Group>
            <Radio value="internal">内部人员</Radio>
            <Radio value="external">外部人员</Radio>
          </Radio.Group>
        </Form.Item>

        {borrowerType === 'internal' && (
          <Form.Item
            name="borrower_user_id"
            label="借用人"
            rules={[{ required: true, message: '请选择借用人' }]}
          >
            <Select
              showSearch
              placeholder="选择内部借用人"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={users.map((u) => ({
                label: u.name || u.username || u.email,
                value: u.id,
              }))}
            />
          </Form.Item>
        )}

        {borrowerType === 'external' && (
          <>
            <Form.Item
              name="external_borrower_name"
              label="借用人姓名"
              rules={[{ required: true, message: '请输入借用人姓名' }]}
            >
              <Input placeholder="请输入外部借用人姓名" />
            </Form.Item>
            <Form.Item name="external_borrower_phone" label="联系电话">
              <Input placeholder="请输入联系电话（可选）" />
            </Form.Item>
            <Form.Item name="external_borrower_company" label="所属单位">
              <Input placeholder="请输入所属单位（可选）" />
            </Form.Item>
          </>
        )}

        <Form.Item name="borrowed_at" label="借用日期">
          <DatePicker
            style={{ width: '100%' }}
            placeholder="选择借用日期"
          />
        </Form.Item>

        <Form.Item name="expected_return_at" label="预计归还日期">
          <DatePicker
            style={{ width: '100%' }}
            placeholder="选择预计归还日期"
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
        </Form.Item>

        <Form.Item name="purpose" label="借用用途">
          <Input placeholder="请输入借用用途（可选）" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              提交借出
            </Button>
            <Button onClick={() => navigate('/tools')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
