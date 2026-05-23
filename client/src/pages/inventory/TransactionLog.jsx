import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Select, DatePicker, Tag, Space, message } from 'antd';
import api from '../../api/client';

const { RangePicker } = DatePicker;

export default function TransactionLog() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [type, setType] = useState(undefined);
  const [dateRange, setDateRange] = useState(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (type && type !== 'all') params.type = type;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      const res = await api.get('/api/inventory/transactions', { params });
      setData(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      message.error(err.response?.data?.error || '获取交易记录失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, type, dateRange]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleFilterChange = () => {
    setPage(1);
  };

  const typeOptions = [
    { label: '全部', value: 'all' },
    { label: '入库', value: 'inbound' },
    { label: '出库', value: 'outbound' },
  ];

  const typeMap = {
    inbound: { color: 'green', text: '入库' },
    outbound: { color: 'red', text: '出库' },
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (val) => val || '-',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (val) => {
        const map = typeMap[val] || { color: 'default', text: val };
        return <Tag color={map.color}>{map.text}</Tag>;
      },
    },
    {
      title: '备件',
      dataIndex: 'part_name',
      key: 'part_name',
      render: (text, record) => `${record.part_code || ''} ${text || ''}`.trim(),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
    },
    {
      title: '仓库/货架/库位',
      key: 'location',
      width: 180,
      render: (_, record) =>
        [record.warehouse, record.shelf, record.bin].filter(Boolean).join(' / ') || '-',
      //
    },
    {
      title: '供应商/领用人',
      key: 'party',
      width: 140,
      render: (_, record) => record.supplier_name || record.recipient || '-',
      //
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
      responsive: ['lg'],
    },
  ];

  return (
    <Card title="出入库记录">
      <Space style={{ marginBottom: 16 }}>
        <Select
          style={{ width: 120 }}
          placeholder="交易类型"
          allowClear
          value={type}
          onChange={(val) => {
            setType(val);
            handleFilterChange();
          }}
          options={typeOptions}
        />
        <RangePicker
          value={dateRange}
          onChange={(dates) => {
            setDateRange(dates);
            handleFilterChange();
          }}
        />
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
    </Card>
  );
}
