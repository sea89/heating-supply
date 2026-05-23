import { useState, useEffect, useCallback } from 'react';
import { Table, Card, Input, Select, Tag, Button, Space, Modal, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ToolOutlined, RollbackOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import ToolForm from './ToolForm';

const statusOptions = [
  { label: '全部', value: '' },
  { label: '可用', value: 'available' },
  { label: '已借出', value: 'borrowed' },
  { label: '维修中', value: 'maintenance' },
  { label: '报废', value: 'scrapped' },
];

const statusColors = {
  available: 'green',
  borrowed: 'blue',
  maintenance: 'orange',
  scrapped: 'red',
};

const statusLabels = {
  available: '可用',
  borrowed: '已借出',
  maintenance: '维修中',
  scrapped: '报废',
};

export default function ToolList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [refreshFlag, setRefreshFlag] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (keyword) params.keyword = keyword;
      if (status) params.status = status;
      const res = await api.get('/api/tools', { params });
      setData(res.data || []);
    } catch (err) {
      message.error(err.response?.data?.error || '获取工具列表失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshFlag]);

  const handleSearch = (value) => {
    setKeyword(value);
  };

  const handleEdit = (record) => {
    setEditingTool(record);
    setFormVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/tools/${id}`);
      message.success('删除成功');
      setRefreshFlag((f) => f + 1);
    } catch (err) {
      message.error(err.response?.data?.error || '删除失败');
    }
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    setEditingTool(null);
    setRefreshFlag((f) => f + 1);
  };

  const columns = [
    {
      title: '编号',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
      width: 120,
      render: (val) => val || '-',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 60,
      render: (val) => val ?? 1,
    },
    {
      title: '单价(元)',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 100,
      render: (val) => val != null ? `¥${Number(val).toFixed(2)}` : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (val) => (
        <Tag color={statusColors[val] || 'default'}>
          {statusLabels[val] || val}
        </Tag>
      ),
    },
    {
      title: '当前位置',
      dataIndex: 'location',
      key: 'location',
      width: 120,
      render: (val) => val || '-',
    },
    {
      title: '当前借用人',
      dataIndex: 'current_borrower',
      key: 'current_borrower',
      width: 120,
      render: (val) => val || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(record);
            }}
          >
            编辑
          </Button>
          {record.status === 'available' && (
            <Button
              size="small"
              type="primary"
              icon={<ToolOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                navigate('/tools/borrow?tool_id=' + record.id);
              }}
            >
              借出
            </Button>
          )}
          {record.status === 'borrowed' && (
            <Button
              size="small"
              icon={<RollbackOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                navigate('/tools/return?tool_id=' + record.id);
              }}
            >
              归还
            </Button>
          )}
          <Popconfirm
            title="确定要删除该工具吗？"
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(record.id);
            }}
            onCancel={(e) => e?.stopPropagation()}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="工具列表"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingTool(null);
            setFormVisible(true);
          }}
        >
          新建工具
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索编号/名称"
          prefix={<SearchOutlined />}
          allowClear
          onSearch={handleSearch}
          style={{ width: 260 }}
        />
        <Select
          style={{ width: 140 }}
          placeholder="筛选状态"
          allowClear
          value={status || undefined}
          onChange={(val) => setStatus(val || '')}
          options={statusOptions}
        />
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
      />
      <Modal
        title={editingTool ? '编辑工具' : '新建工具'}
        open={formVisible}
        onCancel={() => {
          setFormVisible(false);
          setEditingTool(null);
        }}
        footer={null}
        destroyOnClose
      >
        <ToolForm
          tool={editingTool}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setFormVisible(false);
            setEditingTool(null);
          }}
        />
      </Modal>
    </Card>
  );
}
