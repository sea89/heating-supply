import { useState, useEffect, useCallback } from 'react';
import { Card, Descriptions, Table, Tag, Button, Form, InputNumber, Select, Space, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { DetailSkeleton } from '../../components/PageSkeleton';

export default function ArrivalForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [purchase, setPurchase] = useState(null);
  const [locations, setLocations] = useState([]);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await api.get('/api/locations');
      setLocations(res.data || []);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchPurchase = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/purchases/${id}`);
      setPurchase(res.data);
    } catch (err) {
      message.error(err.response?.data?.error || '获取采购单信息失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPurchase();
    fetchLocations();
  }, [fetchPurchase, fetchLocations]);

  const onFinish = async (values) => {
    const { items } = values;
    if (!items || items.length === 0) {
      message.warning('请填写到货信息');
      return;
    }
    for (const item of items) {
      if (!item.arrived_quantity || item.arrived_quantity <= 0) continue;
      const purchaseItem = purchase.items.find(pi => pi.id === item.item_id);
      if (purchaseItem && purchaseItem.item_type !== 'tool') {
        if (!item.location_id) {
          message.warning('请为有到货数量的备件选择库位');
          return;
        }
      }
    }
    setSubmitting(true);
    try {
      await api.post(`/api/purchases/${id}/arrival`, { items });
      message.success('到货登记成功');
      navigate(`/purchases/${id}`);
    } catch (err) {
      message.error(err.response?.data?.error || '到货登记失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!purchase) return null;

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/purchases/${id}`)}>
            返回
          </Button>
          <span>到货登记</span>
        </Space>
      }
    >
      <Descriptions bordered column={{ xs: 1, sm: 2 }} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="单号">{purchase.order_no}</Descriptions.Item>
        <Descriptions.Item label="供应商">{purchase.supplier_name || '-'}</Descriptions.Item>
      </Descriptions>

      <Form form={form} onFinish={onFinish} layout="vertical">
        <Form.List name="items">
          {(fields) => (
            <>
              {(purchase.items || []).map((item, index) => {
                const remaining = (item.quantity || 0) - (item.arrived_quantity || 0);
                const isTool = item.item_type === 'tool';
                return (
                  <Card
                    key={item.id || index}
                    size="small"
                    title={
                      <Space>
                        {isTool ? (
                          <>
                            <span>{item.tool_name || item.tool_code || `工具 #${index + 1}`}</span>
                            <Tag color="purple">工具</Tag>
                          </>
                        ) : (
                          <>
                            <span>{item.part_name || item.part_code || `备件 #${index + 1}`}</span>
                            <Tag color="blue">{item.part_model || '-'}</Tag>
                          </>
                        )}
                      </Space>
                    }
                    style={{ marginBottom: 12 }}
                  >
                    <Space align="baseline" style={{ flexWrap: 'wrap' }}>
                      <span>订购数量: {item.quantity || 0}</span>
                      <span>已到货: {item.arrived_quantity || 0}</span>
                      <span>未到货: {remaining}</span>
                      <Form.Item
                        name={[index, 'item_id']}
                        initialValue={item.id}
                        hidden
                      >
                        <InputNumber />
                      </Form.Item>
                      <Form.Item
                        name={[index, 'arrived_quantity']}
                        label="本次到货"
                        initialValue={remaining > 0 ? undefined : 0}
                      >
                        <InputNumber
                          style={{ width: 120 }}
                          placeholder="到货数量"
                          min={0}
                          max={remaining}
                          step={1}
                        />
                      </Form.Item>
                      {!isTool && (
                        <Form.Item
                          name={[index, 'location_id']}
                          label="库位"
                        >
                          <Select
                            showSearch
                            style={{ width: 200 }}
                            placeholder="选择库位"
                            allowClear
                            filterOption={(input, option) =>
                              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={locations.map((l) => ({
                              label: `${l.warehouse || ''} ${l.shelf || ''} ${l.bin || ''}`.trim(),
                              value: l.id,
                            }))}
                          />
                        </Form.Item>
                      )}
                    </Space>
                  </Card>
                );
              })}
            </>
          )}
        </Form.List>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            提交到货登记
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
