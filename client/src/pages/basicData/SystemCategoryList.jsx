import { useState, useEffect, useCallback } from 'react';
import { Card, Tree, Button, Modal, Form, Input, Space, message, Spin, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined } from '@ant-design/icons';
import api from '../../api/client';

export default function SystemCategoryList() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [treeData, setTreeData] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [parentId, setParentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/system-categories/tree');
      setTreeData(res.data || []);
    } catch (err) {
      message.error(err.response?.data?.error || '获取分类树失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const openAddRoot = () => {
    setSelectedNode(null);
    setParentId(null);
    setModalMode('add');
    form.resetFields();
    setModalVisible(true);
  };

  const openAddChild = (node) => {
    setSelectedNode(node);
    setParentId(node.id);
    setModalMode('add');
    form.resetFields();
    setModalVisible(true);
  };

  const openEdit = (node) => {
    setSelectedNode(node);
    setParentId(node.parent_id ?? null);
    setModalMode('edit');
    form.setFieldsValue({ name: node.name, description: node.description || '' });
    setModalVisible(true);
  };

  const handleDelete = (node) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除分类「${node.name}」吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.delete(`/api/system-categories/${node.id}`);
          message.success('删除成功');
          setSelectedNode(null);
          fetchTree();
        } catch (err) {
          message.error(err.response?.data?.error || '删除失败');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        name: values.name,
        description: values.description,
        parent_id: parentId,
      };

      if (modalMode === 'edit') {
        await api.put(`/api/system-categories/${selectedNode.id}`, payload);
        message.success('更新成功');
      } else {
        await api.post('/api/system-categories', payload);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchTree();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const convertToAntdTree = (nodes) => {
    return (nodes || []).map((node) => ({
      title: (
        <Space size="small">
          <FolderOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: node.children?.length ? 500 : 400 }}>{node.name}</span>
        </Space>
      ),
      key: node.id,
      node,
      children: node.children ? convertToAntdTree(node.children) : [],
    }));
  };

  const treeNodes = convertToAntdTree(treeData);

  return (
    <Card
      title="系统分类管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddRoot}>
          添加根分类
        </Button>
      }
    >
      <Spin spinning={loading}>
        {treeNodes.length === 0 && !loading ? (
          <Empty description="暂无分类，点击上方按钮添加" />
        ) : (
          <Tree
            treeData={treeNodes}
            defaultExpandAll
            showLine={{ showLeafIcon: false }}
            selectedKeys={selectedNode ? [selectedNode.id] : []}
            onSelect={(keys, info) => {
              if (keys.length > 0) {
                setSelectedNode(info.node.node);
              } else {
                setSelectedNode(null);
              }
            }}
            titleRender={(nodeData) => (
              <Space
                size="small"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={(e) => e.stopPropagation()}
              >
                <FolderOutlined style={{ color: '#1890ff' }} />
                <span>{nodeData.node.name}</span>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(nodeData.node)}
                  style={{ opacity: 0.6 }}
                />
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => openAddChild(nodeData.node)}
                  style={{ opacity: 0.6 }}
                />
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(nodeData.node)}
                  style={{ opacity: 0.6 }}
                />
              </Space>
            )}
          />
        )}
      </Spin>

      <Modal
        title={modalMode === 'edit' ? '编辑分类' : parentId ? '添加子分类' : '添加根分类'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={420}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入分类名称" autoFocus />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入分类描述（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
