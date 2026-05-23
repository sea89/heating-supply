import { useState, useEffect, useCallback } from 'react';
import { Card, Form, Select, Input, Descriptions, Tag, Button, Space, message, Spin, DatePicker } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../api/client';

export default function ReturnForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toolIdParam = searchParams.get('tool_id');
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [borrowedTools, setBorrowedTools] = useState([]);
  const [selectedTool, setSelectedTool] = useState(null);

  const fetchBorrowedTools = useCallback(async () => {
    try {
      const res = await api.get('/api/tools', { params: { status: 'borrowed' } });
      setBorrowedTools(res.data || []);
    } catch {
      message.error('获取已借出工具列表失败');
    }
  }, []);

  useEffect(() => {
    fetchBorrowedTools();
  }, [fetchBorrowedTools]);

  // Pre-fill tool when navigated from ToolList with ?tool_id=X
  useEffect(() => {
    if (toolIdParam && borrowedTools.length > 0) {
      const toolId = Number(toolIdParam);
      handleToolChange(toolId);
    }
  }, [toolIdParam, borrowedTools]);

  const handleToolChange = (value) => {
    const tool = borrowedTools.find((t) => t.id === value);
    setSelectedTool(tool || null);
    form.setFieldsValue({ tool_id: value });
  };

  const onFinish = async (values) => {
    if (!values.tool_id) {
      message.warning('请选择要归还的工具');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/api/tools/${values.tool_id}/return`, {
        damage_note: values.damage_note || undefined,
        returned_at: values.returned_at ? dayjs(values.returned_at).format('YYYY-MM-DD HH:mm:ss') : undefined,
      });
      message.success('归还登记成功');
      navigate('/tools');
    } catch (err) {
      message.error(err.response?.data?.error || '归还登记失败');
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
          <span>工具归还登记</span>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: 600 }}
      >
        <Form.Item
          name="tool_id"
          label="选择工具"
          rules={[{ required: true, message: '请选择要归还的工具' }]}
        >
          <Select
            showSearch
            placeholder="选择已借出的工具"
            onChange={handleToolChange}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={borrowedTools.map((t) => ({
              label: `${t.code} - ${t.name} (${t.model || '-'})`,
              value: t.id,
            }))}
          />
        </Form.Item>

        {selectedTool && (
          <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="工具编号">{selectedTool.code}</Descriptions.Item>
              <Descriptions.Item label="工具名称">{selectedTool.name}</Descriptions.Item>
              <Descriptions.Item label="型号">{selectedTool.model || '-'}</Descriptions.Item>
              <Descriptions.Item label="当前状态">
                <Tag color="blue">已借出</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="借用人">
                {selectedTool.current_borrower || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="预计归还日期">
                {selectedTool.expected_return_at || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        <Form.Item name="returned_at" label="归还日期">
          <DatePicker
            showTime
            style={{ width: '100%' }}
            placeholder="选择归还日期"
          />
        </Form.Item>

        <Form.Item name="damage_note" label="损坏情况">
          <Input.TextArea rows={3} placeholder="如有损坏请描述（可选）" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              确认归还
            </Button>
            <Button onClick={() => navigate('/tools')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
