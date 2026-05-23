import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Select, Input, Space, Tag, message, Switch } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../../api/client';

export default function AccountList() {
  const [editForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/auth/users');
      setData(res.data || []);
    } catch (err) {
      message.error(err.response?.data?.error || '获取账号列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPersonnel = useCallback(async () => {
    try {
      const res = await api.get('/api/personnel?status=active');
      setPersonnel(res.data || []);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchPersonnel();
  }, [fetchData, fetchPersonnel]);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setSubmitting(true);
      await api.post('/api/auth/register', values);
      message.success('账号创建成功');
      setCreateModalVisible(false);
      createForm.resetFields();
      fetchData();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    editForm.setFieldsValue({
      username: record.username,
      name: record.name,
      phone: record.phone,
      role: record.role,
      personnel_id: record.personnel_id || undefined,
      is_active: record.is_active,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      setSubmitting(true);
      await api.put(`/api/auth/users/${editingRecord.id}`, values);
      message.success('更新成功');
      setModalVisible(false);
      fetchData();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const roleOptions = [
    { label: '管理员', value: 'admin' },
    { label: '维修人员', value: 'maintenance' },
    { label: '仓管人员', value: 'warehouse' },
    { label: '采购人员', value: 'procurement' },
  ];

  const roleColors = {
    admin: 'red',
    maintenance: 'blue',
    warehouse: 'green',
    procurement: 'orange',
  };
  const roleLabels = {
    admin: '管理员',
    maintenance: '维修',
    warehouse: '仓管',
    procurement: '采购',
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 100 },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 130 },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (r) => <Tag color={roleColors[r]}>{roleLabels[r] || r}</Tag>,
    },
    {
      title: '关联人员',
      dataIndex: 'personnel_name',
      key: 'personnel_name',
      render: (text) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="link" size="small" icon={<EditOutlined />}
          onClick={() => openEditModal(record)}>编辑</Button>
      ),
    },
  ];

  return (
    <Card title="账号管理" extra={
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
        新增账号
      </Button>
    }>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
      />
      <Modal
        title="编辑账号"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={450}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input />
          </Form.Item>
          <Form.Item name="password" label="重置密码">
            <Input.Password placeholder="留空则不修改密码" />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select options={roleOptions} />
          </Form.Item>
          <Form.Item name="personnel_id" label="关联人员">
            <Select
              allowClear
              placeholder="选择关联人员"
              options={personnel.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
          <Form.Item name="is_active" label="启用账号" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="新增账号"
        open={createModalVisible}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        confirmLoading={submitting}
        destroyOnClose
        width={450}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="登录用用户名" />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="显示姓名" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码长度不能少于6位' },
          ]}>
            <Input.Password placeholder="不少于6位" />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select options={roleOptions} placeholder="选择角色" />
          </Form.Item>
          <Form.Item name="personnel_id" label="关联人员">
            <Select
              allowClear
              placeholder="选择关联人员"
              options={personnel.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
