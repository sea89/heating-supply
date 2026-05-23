import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import api from '../../api/client';
import { useNavigate } from 'react-router-dom';

export default function EquipmentList() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [systemCategories, setSystemCategories] = useState([]);
  const [parts, setParts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/equipment');
      setData(res.data || []);
    } catch (err) {
      message.error(err.response?.data?.error || '获取设备列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const [catRes, partRes] = await Promise.all([
        api.get('/api/system-categories'),
        api.get('/api/parts'),
      ]);
      setSystemCategories(catRes.data || []);
      setParts(partRes.data?.items || partRes.data || []);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchOptions();
  }, [fetchData, fetchOptions]);

  const openAddModal = () => {
    setEditingRecord(null);
    setModalTitle('新增设备');
    form.resetFields();
    api.get('/api/equipment/next-code').then(res => {
      form.setFieldsValue({ code: res.data.code });
    }).catch(() => {});
    setModalVisible(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setModalTitle('编辑设备');
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      model: record.model,
      location: record.location,
      system_category_id: record.system_category_id,
      part_ids: (record.related_parts || []).map((p) => p.id),
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editingRecord) {
        await api.put(`/api/equipment/${editingRecord.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/api/equipment', values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchData();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await api.delete(`/api/equipment/${record.id}`);
      message.success('删除成功');
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.error || '删除失败');
    }
  };

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
    downloadFile('/api/import-export/template?type=equipment', '设备导入模板.xlsx');
  };

  const handleExport = () => {
    downloadFile('/api/import-export/download?type=equipment', '设备数据.xlsx');
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
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        message.success('导入成功');
        fetchData();
      } catch (err) {
        message.error(err.response?.data?.error || '导入失败');
      }
    };
    input.click();
  };

  const columns = [
    { title: '编号', dataIndex: 'code', key: 'code', width: 120 },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => navigate(`/basic-data/equipment/${record.id}`)}>{text}</a>
      ),
    },
    { title: '型号', dataIndex: 'model', key: 'model' },
    { title: '位置', dataIndex: 'location', key: 'location' },
    {
      title: '系统分类',
      dataIndex: 'system_name',
      key: 'system_name',
    },
    {
      title: '关联备件',
      key: 'parts_count',
      width: 100,
      render: (_, record) => (
        <span>{record.related_parts?.length || 0} 种</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定删除设备「${record.name}」吗？`}
            onConfirm={() => handleDelete(record)}
            okText="删除"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="设备列表"
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
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            新增设备
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
      />

      <Modal
        title={modalTitle}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="code"
            label="编号"
            rules={[{ required: true, message: '请输入设备编号' }]}
          >
            <Input placeholder="请输入设备编号" />
          </Form.Item>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入设备名称' }]}
          >
            <Input placeholder="请输入设备名称" />
          </Form.Item>
          <Form.Item name="model" label="型号">
            <Input placeholder="请输入型号" />
          </Form.Item>
          <Form.Item name="location" label="位置">
            <Input placeholder="请输入设备位置" />
          </Form.Item>
          <Form.Item name="system_category_id" label="系统分类">
            <Select
              allowClear
              placeholder="选择系统分类"
              options={systemCategories.map((c) => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>
          <Form.Item name="part_ids" label="关联备件">
            <Select
              mode="multiple"
              allowClear
              placeholder="选择关联备件"
              options={parts.map((p) => ({ label: `${p.name} (${p.code})`, value: p.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
