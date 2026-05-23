import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, message } from 'antd';
import { InboxOutlined, WarningOutlined, ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import api from '../../api/client';

export default function InventoryOverview() {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState({
    total_parts: 0,
    alert_count: 0,
    today_inbound: 0,
    today_outbound: 0,
  });
  const [lowStockItems, setLowStockItems] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, stockRes] = await Promise.all([
        api.get('/api/inventory/overview'),
        api.get('/api/inventory/stock'),
      ]);
      setOverview(overviewRes.data);
      const allStock = stockRes.data || [];
      setLowStockItems(allStock.filter((item) => item.stock_status === 'low'));
    } catch (err) {
      message.error(err.response?.data?.error || '获取库存概览失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns = [
    {
      title: '备件编码',
      dataIndex: 'part_code',
      key: 'part_code',
      width: 120,
    },
    {
      title: '备件名称',
      dataIndex: 'part_name',
      key: 'part_name',
    },
    {
      title: '型号',
      dataIndex: 'part_model',
      key: 'part_model',
      responsive: ['md'],
      responsive: ['md'],
    },
    {
      title: '库存量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (val) => (
        <Tag color="red">{val ?? 0}</Tag>
      ),
    },
    {
      title: '最低库存',
      dataIndex: 'min_stock',
      key: 'min_stock',
      width: 100,
      responsive: ['md'],
      render: (val) => val ?? 0,
    },
  ];

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title="总库存备件数"
              value={overview.total_parts}
              prefix={<InboxOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title="低库存预警"
              value={overview.alert_count}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日入库"
              value={overview.today_inbound}
              prefix={<ArrowDownOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日出库"
              value={overview.today_outbound}
              prefix={<ArrowUpOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>
      <Card title="低库存备件" style={{ marginTop: 16 }}>
        <Table
          rowKey={(record) => `${record.part_code}-${record.warehouse}-${record.shelf}-${record.bin}`}
          columns={columns}
          dataSource={lowStockItems}
          loading={loading}
          pagination={false}
        />
      </Card>
    </>
  );
}
