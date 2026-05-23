import { useState, useEffect, useMemo } from 'react';
import { Card, Form, Input, InputNumber, TreeSelect, Select, Button, Space, message, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';

export default function PartForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [systemCategories, setSystemCategories] = useState([]);
  const isEdit = Boolean(id);

  useEffect(() => {
    fetchOptions();
    if (isEdit) {
      fetchPart();
    } else {
      api.get('/api/parts/next-code').then(res => {
        form.setFieldsValue({ code: res.data.code });
      }).catch(() => {});
    }
  }, [id]);

  const fetchOptions = async () => {
    try {
      const [catRes, supRes, eqRes, sysCatRes] = await Promise.all([
        api.get('/api/parts/categories'),
        api.get('/api/suppliers'),
        api.get('/api/equipment'),
        api.get('/api/system-categories'),
      ]);
      setCategories(catRes.data || []);
      setSuppliers(supRes.data || []);
      setEquipment(eqRes.data || []);
      setSystemCategories(sysCatRes.data || []);
    } catch {
      message.error('加载选项数据失败');
    }
  };

  const fetchPart = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/parts/${id}`);
      const part = res.data;
      form.setFieldsValue({
        code: part.code,
        name: part.name,
        model: part.model,
        specification: part.specification,
        unit: part.unit,
        category_id: part.category_id,
        min_stock: part.min_stock,
        max_stock: part.max_stock,
        unit_price: part.unit_price,
        supplier_ids: (part.suppliers || []).map((s) => s.id),
        equipment_ids: (part.equipment || []).map((e) => e.id),
      });
    } catch (err) {
      message.error(err.response?.data?.error || '获取备件信息失败');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/api/parts/${id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/api/parts', values);
        message.success('创建成功');
      }
      navigate('/parts');
    } catch (err) {
      message.error(err.response?.data?.error || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  // Build tree data: system categories as parent nodes, equipment as children
  const equipmentTreeData = useMemo(() => {
    // Build a map of system category ID -> name
    const catMap = {};
    const buildMap = (nodes) => {
      for (const node of nodes) {
        catMap[node.id] = node.name;
        if (node.children) buildMap(node.children);
      }
    };
    buildMap(systemCategories);

    // Group equipment by system_category_id
    const grouped = {};
    for (const eq of equipment) {
      const catId = eq.system_category_id || 'uncategorized';
      if (!grouped[catId]) grouped[catId] = [];
      grouped[catId].push(eq);
    }

    // Build tree nodes
    const treeNodes = [];
    for (const [catId, items] of Object.entries(grouped)) {
      const catName = catMap[catId] || '未分类';
      treeNodes.push({
        title: catName,
        value: `cat_${catId}`,
        key: `cat_${catId}`,
        selectable: false,
        disabled: true,
        children: items.map(eq => ({
          title: `${eq.name} (${eq.code})`,
          value: eq.id,
          key: `eq_${eq.id}`,
          isLeaf: true,
        })),
      });
    }
    return treeNodes;
  }, [equipment, systemCategories]);

  if (loading) {
    return (
      <Card title={isEdit ? '编辑备件' : '新增备件'}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  return (
    <Card title={isEdit ? '编辑备件' : '新增备件'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: 720 }}
      >
        <Form.Item
          name="code"
          label="编号"
          rules={[{ required: true, message: '请输入编号' }]}
        >
          <Input placeholder="请输入备件编号" />
        </Form.Item>

        <Form.Item
          name="name"
          label="名称"
          rules={[{ required: true, message: '请输入名称' }]}
        >
          <Input placeholder="请输入备件名称" />
        </Form.Item>

        <Form.Item name="model" label="型号">
          <Input placeholder="请输入型号" />
        </Form.Item>

        <Form.Item name="specification" label="规格">
          <Input placeholder="请输入规格" />
        </Form.Item>

        <Form.Item name="unit" label="单位"
          rules={[{ required: true, message: '请输入单位' }]}
        >
          <Input placeholder="如：个、只、套" />
        </Form.Item>

        <Form.Item name="category_id" label="分类">
          <TreeSelect
            showSearch
            allowClear
            placeholder="选择分类"
            treeDefaultExpandAll
            treeData={categories}
            fieldNames={{ label: 'name', value: 'id', children: 'children' }}
          />
        </Form.Item>

        <Form.Item name="min_stock" label="最低库存">
          <InputNumber min={0} style={{ width: '100%' }} placeholder="最低库存预警值" />
        </Form.Item>

        <Form.Item name="max_stock" label="最高库存">
          <InputNumber min={0} style={{ width: '100%' }} placeholder="最高库存预警值" />
        </Form.Item>

        <Form.Item name="unit_price" label="单价（元）">
          <InputNumber
            min={0}
            step={0.01}
            precision={2}
            prefix="¥"
            style={{ width: 200 }}
            placeholder="请输入单价"
          />
        </Form.Item>

        <Form.Item name="supplier_ids" label="关联供应商">
          <Select
            mode="multiple"
            allowClear
            placeholder="选择供应商"
            options={suppliers.map((s) => ({ label: s.name, value: s.id }))}
          />
        </Form.Item>

        <Form.Item name="equipment_ids" label="关联设备">
          <TreeSelect
            treeData={equipmentTreeData}
            mode="multiple"
            allowClear
            placeholder="点击展开系统 → 选择设备（可跨系统多选）"
            treeDefaultExpandAll
            treeCheckable
            showCheckedStrategy="SHOW_CHILD"
            maxTagCount={5}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Space>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {isEdit ? '保存' : '创建'}
          </Button>
          <Button onClick={() => navigate('/parts')}>取消</Button>
        </Space>
      </Form>
    </Card>
  );
}
