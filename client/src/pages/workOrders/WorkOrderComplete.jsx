import { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Form, Input, Button, Space, message, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function WorkOrderComplete() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [workOrder, setWorkOrder] = useState(null);

  useEffect(() => {
    fetchWorkOrder();
  }, [id]);

  const fetchWorkOrder = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/work-orders/${id}`);
      setWorkOrder(res.data);
    } catch (err) {
      message.error(err.response?.data?.error || '获取工单信息失败');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      await api.post(`/api/work-orders/${id}/complete`, values);
      message.success('工单已完结');
      navigate(`/work-orders/${id}`);
    } catch (err) {
      message.error(err.response?.data?.error || '完结工单失败');
    } finally {
      setSubmitting(false);
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

  if (!workOrder) return null;

  const statusCfg = {
    pending: { color: 'orange', text: '待处理' },
    in_progress: { color: 'processing', text: '进行中' },
    completed: { color: 'green', text: '已完成' },
  };

  const st = statusCfg[workOrder.status] || { color: 'default', text: workOrder.status };

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/work-orders/${id}`)}>
            返回
          </Button>
          <span>完结工单</span>
        </Space>
      }
    >
      <Descriptions bordered column={{ xs: 1, sm: 2 }} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="工单号">{workOrder.order_no}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={st.color}>{st.text}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="设备名称">{workOrder.equipment_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="负责人">{workOrder.assignee_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="故障描述" span={2}>
          {workOrder.fault_description || '-'}
        </Descriptions.Item>
      </Descriptions>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: 600 }}
      >
        <Form.Item
          name="completion_note"
          label="完成备注"
          rules={[{ required: true, message: '请输入完成备注' }]}
        >
          <Input.TextArea rows={4} placeholder="请填写维修完成情况及备注信息" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              确认完结
            </Button>
            <Button onClick={() => navigate(`/work-orders/${id}`)}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
