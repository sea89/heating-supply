import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, DatePicker, Space, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api/client';

export default function PersonnelList() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('active');
  const [keyword, setKeyword] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (keyword) params.set('keyword', keyword);
      const res = await api.get(`/api/personnel?${params.toString()}`);
      setData(res.data || []);
    } catch (err) {
      message.error(err.response?.data?.error || '获取人员列表失败');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, keyword]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAddModal = () => {
    setEditingRecord(null);
    setModalTitle('新增人员');
    form.resetFields();
    form.setFieldsValue({ status: 'active' });
    setModalVisible(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setModalTitle('编辑人员');
    form.setFieldsValue({
      name: record.name,
      phone: record.phone,
      position: record.position,
      hire_date: record.hire_date ? dayjs(record.hire_date) : null,
      status: record.status,
      resignation_date: record.resignation_date ? dayjs(record.resignation_date) : null,
      notes: record.notes,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        ...values,
        hire_date: values.hire_date ? values.hire_date.format('YYYY-MM-DD') : null,
        resignation_date: values.resignation_date ? values.resignation_date.format('YYYY-MM-DD') : null,
      };

      if (editingRecord) {
        await api.put(`/api/personnel/${editingRecord.id}`, payload);
        message.success('更新成功');
      } else {
        await api.post('/api/personnel', payload);
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
      await api.delete(`/api/personnel/${record.id}`);
      message.success('删除成功');
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.error || '删除失败');
    }
  };

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name', width: 120 },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 130 },
    { title: '岗位', dataIndex: 'position', key: 'position' },
    {
      title: '入职日期',
      dataIndex: 'hire_date',
      key: 'hire_date',
      width: 120,
      render: (v) => v || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s) => (
        <Tag color={s === 'active' ? 'green' : 'red'}>
          {s === 'active' ? '在职' : '离职'}
        </Tag>
      ),
    },
    {
      title: '离职日期',
      dataIndex: 'resignation_date',
      key: 'resignation_date',
      width: 120,
      render: (v) => v || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => openEditModal(record)}>编辑</Button>
          <Popconfirm
            title="确认删除"
            description={`确定删除「${record.name}」吗？`}
            onConfirm={() => handleDelete(record)}
            okText="删除" cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="人员管理"
      extra={
        <Space>
          <Input.Search
            placeholder="搜索姓名/手机号"
            onSearch={(v) => setKeyword(v)}
            allowClear
            style={{ width: 200 }}
          />
          <Select
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            style={{ width: 100 }}
            options={[
              { label: '在职', value: 'active' },
              { label: '全部', value: 'all' },
              { label: '离职', value: 'resigned' },
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            新增人员
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
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="position" label="岗位">
            <Input placeholder="请输入岗位" />
          </Form.Item>
          <Form.Item name="hire_date" label="入职日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '在职', value: 'active' },
                { label: '离职', value: 'resigned' },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.status !== cur.status}>
            {({ getFieldValue }) =>
              getFieldValue('status') === 'resigned' ? (
                <Form.Item name="resignation_date" label="离职日期" rules={[{ required: true, message: '请选择离职日期' }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
