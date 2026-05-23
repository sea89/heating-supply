import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../api/client';

export default function SupplierList() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/suppliers');
      setData(res.data || []);
    } catch (err) {
      message.error(err.response?.data?.error || '获取供应商列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddModal = () => {
    setEditingRecord(null);
    setModalTitle('新增供应商');
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setModalTitle('编辑供应商');
    form.setFieldsValue({
      name: record.name,
      contact_person: record.contact_person,
      phone: record.phone,
      supply_category: record.supply_category,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editingRecord) {
        await api.put(`/api/suppliers/${editingRecord.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/api/suppliers', values);
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
      await api.delete(`/api/suppliers/${record.id}`);
      message.success('删除成功');
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.error || '删除失败');
    }
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '联系人',
      dataIndex: 'contact_person',
      key: 'contact_person',
      responsive: ['sm'],
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
      responsive: ['sm'],
    },
    {
      title: '供应类别',
      dataIndex: 'supply_category',
      key: 'supply_category',
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
            description={`确定删除供应商「${record.name}」吗？`}
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
      title="供应商列表"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          新增供应商
        </Button>
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
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入供应商名称' }]}
          >
            <Input placeholder="请输入供应商名称" />
          </Form.Item>
          <Form.Item name="contact_person" label="联系人">
            <Input placeholder="请输入联系人" />
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input placeholder="请输入联系电话" />
          </Form.Item>
          <Form.Item name="supply_category" label="供应类别">
            <Input placeholder="如：阀门、管件、仪表" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
