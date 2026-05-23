import { useState, useEffect, useCallback } from 'react';
import { Card, Tree, Button, Modal, Form, Input, Select, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined, ApartmentOutlined, UploadOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import api from '../../api/client';

export default function LocationManage() {
  const [loading, setLoading] = useState(false);
  const [treeData, setTreeData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(null); // 'warehouse' | 'shelf' | 'bin'
  const [parentNode, setParentNode] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form] = Form.useForm();

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/api/import-export/template?type=parts';
    link.click();
  };

  const handleExport = () => {
    const link = document.createElement('a');
    link.href = '/api/import-export/download?type=parts';
    link.click();
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
        fetchTree();
      } catch (err) {
        message.error(err.response?.data?.error || '导入失败');
      }
    };
    input.click();
  };

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/locations/tree');
      const raw = res.data || [];
      setTreeData(transformTree(raw));
    } catch (err) {
      message.error(err.response?.data?.error || '获取库位结构失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const transformTree = (nodes) => {
    return nodes.map((node) => ({
      title: renderTitle(node),
      key: node.id || node.name,
      id: node.id,
      name: node.name,
      type: node.type || 'warehouse',
      children: node.shelves
        ? transformShelfTree(node.shelves, node.name)
        : node.children
        ? transformTree(node.children)
        : undefined,
    }));
  };

  const transformShelfTree = (shelves, warehouseName) => {
    return shelves.map((shelf) => ({
      title: renderShelfTitle(shelf, warehouseName),
      key: shelf.id || `${warehouseName}-${shelf.name}`,
      id: shelf.id,
      name: shelf.name,
      type: 'shelf',
      warehouseName,
      children: shelf.bins
        ? shelf.bins.map((bin) => ({
            title: renderBinTitle(bin, warehouseName, shelf.name),
            key: bin.id || `${warehouseName}-${shelf.name}-${bin.name}`,
            id: bin.id,
            name: bin.name,
            type: 'bin',
            typeLabel: bin.type,
            warehouseName,
            shelfName: shelf.name,
          }))
        : undefined,
    }));
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/locations/${id}`);
      message.success('删除成功');
      setDeleteTarget(null);
      fetchTree();
    } catch (err) {
      message.error(err.response?.data?.error || '删除失败');
    }
  };

  const openModal = (type, parent = null) => {
    setModalType(type);
    setParentNode(parent);
    form.resetFields();
    setModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (modalType === 'warehouse') {
        await api.post('/api/locations', {
          warehouse: values.name,
          shelf: '-',
          bin: '-',
          type: 'normal',
        });
      } else if (modalType === 'shelf') {
        await api.post('/api/locations', {
          warehouse: parentNode.warehouseName || parentNode.name,
          shelf: values.name,
          bin: '-',
          type: 'normal',
        });
      } else if (modalType === 'bin') {
        await api.post('/api/locations', {
          warehouse: parentNode.warehouseName,
          shelf: parentNode.shelfName || parentNode.name,
          bin: values.name,
          type: values.type || 'normal',
        });
      }
      message.success('添加成功');
      setModalVisible(false);
      fetchTree();
    } catch (err) {
      if (err.response) {
        message.error(err.response?.data?.error || '添加失败');
      }
    }
  };

  const renderTitle = (node) => (
    <Space>
      <span>
        <ApartmentOutlined style={{ marginRight: 6 }} />
        {node.name}
      </span>
      <Button
        type="link"
        size="small"
        icon={<PlusOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          openModal('shelf', node);
        }}
      >
        添加货架
      </Button>
      {node.id && (
        <Popconfirm
          title="确认删除该仓库？"
          onConfirm={() => handleDelete(node.id)}
          onCancel={() => setDeleteTarget(null)}
        >
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => e.stopPropagation()}
          />
        </Popconfirm>
      )}
    </Space>
  );

  const renderShelfTitle = (shelf, warehouseName) => (
    <Space>
      <span>{shelf.name}</span>
      <Button
        type="link"
        size="small"
        icon={<PlusOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          openModal('bin', { ...shelf, warehouseName });
        }}
      >
        添加库位
      </Button>
      {shelf.id && (
        <Popconfirm
          title="确认删除该货架？"
          onConfirm={() => handleDelete(shelf.id)}
          onCancel={() => setDeleteTarget(null)}
        >
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => e.stopPropagation()}
          />
        </Popconfirm>
      )}
    </Space>
  );

  const renderBinTitle = (bin) => (
    <Space>
      <span>
        {bin.name}
        {bin.typeLabel && bin.typeLabel !== 'normal' && (
          <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>
            ({bin.typeLabel === 'temperature_controlled' ? '温控' : bin.typeLabel === 'outdoor' ? '室外' : bin.typeLabel})
          </span>
        )}
        <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
          （备件 {bin.part_count ?? 0} | 工具 {bin.tool_count ?? 0}）
        </span>
      </span>
      {bin.id && (
        <Popconfirm
          title="确认删除该库位？"
          onConfirm={() => handleDelete(bin.id)}
          onCancel={() => setDeleteTarget(null)}
        >
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => e.stopPropagation()}
          />
        </Popconfirm>
      )}
    </Space>
  );

  const getModalTitle = () => {
    switch (modalType) {
      case 'warehouse':
        return '添加仓库';
      case 'shelf':
        return `为 ${parentNode?.name || ''} 添加货架`;
      case 'bin':
        return `为 ${parentNode?.name || ''} 添加库位`;
      default:
        return '';
    }
  };

  return (
    <Card title="库位管理"
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
        </Space>
      }>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('warehouse')}>
          添加仓库
        </Button>
      </Space>
      <Tree
        showLine
        treeData={treeData}
        defaultExpandAll
        loading={loading}
      />
      <Modal
        title={getModalTitle()}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="请输入名称" />
          </Form.Item>
          {modalType === 'bin' && (
            <Form.Item
              name="type"
              label="类型"
              initialValue="normal"
              rules={[{ required: true, message: '请选择类型' }]}
            >
              <Select
                options={[
                  { label: '普通', value: 'normal' },
                  { label: '温控', value: 'temperature_controlled' },
                  { label: '室外', value: 'outdoor' },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Card>
  );
}
