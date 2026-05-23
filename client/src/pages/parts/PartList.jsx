import { useState, useEffect, useCallback } from 'react';
import { Table, Card, Input, TreeSelect, Button, Tag, Space, message } from 'antd';
import { PlusOutlined, SearchOutlined, UploadOutlined, DownloadOutlined, FileTextOutlined, ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function PartList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState(undefined);
  const [categories, setCategories] = useState([]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/api/parts/categories');
      setCategories(res.data || []);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (keyword) params.keyword = keyword;
      if (categoryId) params.category_id = categoryId;
      const res = await api.get('/api/parts', { params });
      setData(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      message.error(err.response?.data?.error || '获取备件列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, categoryId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (value) => {
    setKeyword(value);
    setPage(1);
  };

  const handleCategoryChange = (value) => {
    setCategoryId(value);
    setPage(1);
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
      render: (text, record) => (
        <a onClick={() => navigate(`/parts/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
      
    },
    {
      title: '分类',
      dataIndex: 'category_name',
      key: 'category_name',
      
    },
    {
      title: '单价(元)',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 100,
      render: (val) => val != null ? `¥${Number(val).toFixed(2)}` : '-',
      
    },
    {
      title: '库存总价(元)',
      key: 'total_value',
      width: 120,
      render: (_, record) => {
        const total = (record.current_stock || 0) * (record.unit_price || 0);
        return total > 0
          ? <span style={{ fontWeight: 500, color: '#722ed1' }}>¥{total.toFixed(2)}</span>
          : '-';
      },
      
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      
    },
    {
      title: '库存',
      dataIndex: 'current_stock',
      key: 'current_stock',
      width: 100,
      render: (val, record) => {
        const isLow = val <= (record.min_stock || 0);
        return (
          <Tag color={isLow ? 'red' : 'green'}>
            {val ?? 0}
          </Tag>
        );
      },
    },
  {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<ArrowDownOutlined />}
            onClick={() => navigate(`/inventory/inbound?part_id=${record.id}`)}
          >
            入库
          </Button>
          <Button
            type="link"
            size="small"
            icon={<ArrowUpOutlined />}
            onClick={() => navigate(`/inventory/outbound?part_id=${record.id}`)}
          >
            出库
          </Button>
        </Space>
      ),
    },
  ];

  const downloadFile = async (url, filename) => {
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      message.error('下载失败');
    }
  };

  const handleDownloadTemplate = () => {
    downloadFile('/api/import-export/template?type=parts', '备件导入模板.xlsx');
  };

  const handleExport = () => {
    downloadFile('/api/import-export/download?type=parts', '备件数据.xlsx');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      try {
        await api.post('/api/import-export/upload', formData, {
          // Content-Type is automatically set by axios for FormData
        });
        message.success('导入成功');
        fetchData();
      } catch (err) {
        message.error(err.response?.data?.error || '导入失败');
      }
    };
    input.click();
  };

  return (
    <Card
      title="备件列表"
      extra={
        <Space>
          <Button icon={<FileTextOutlined />} onClick={handleDownloadTemplate}>
            下载模板
          </Button>
          <Button icon={<UploadOutlined />} onClick={handleImport}>
            导入
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/parts/new')}>
            新增备件
          </Button>
        </Space>
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
        <TreeSelect
          showSearch
          style={{ width: 200 }}
          placeholder="选择分类"
          allowClear
          treeDefaultExpandAll
          value={categoryId}
          onChange={handleCategoryChange}
          treeData={categories}
          fieldNames={{ label: 'name', value: 'id', children: 'children' }}
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
