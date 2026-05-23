import { useState } from 'react';
import { Card, Descriptions, Tag, Button, Space, message, Modal, Input, Form } from 'antd';
import { LogoutOutlined, ToolOutlined, FileTextOutlined, ShoppingCartOutlined, EnvironmentOutlined, KeyOutlined, SettingOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const roleDisplayNames = {
  maintenance: '维修人员',
  warehouse: '仓管人员',
  procurement: '采购人员',
};

const roleColors = {
  maintenance: 'blue',
  warehouse: 'green',
  procurement: 'orange',
};

const commonLinks = [
    { title: '系统分类', path: '/basic-data/system-categories', icon: <SettingOutlined /> },
    { title: '设备台账', path: '/basic-data/equipment', icon: <FileTextOutlined /> },
    { title: '供应商', path: '/basic-data/suppliers', icon: <ShoppingCartOutlined /> },
    { title: '人员管理', path: '/basic-data/personnel', icon: <TeamOutlined /> },
    { title: '账号管理', path: '/basic-data/accounts', icon: <UserOutlined /> },
  ];

const roleLinks = {
  maintenance: [
    { title: '工单管理', path: '/work-orders', icon: <FileTextOutlined /> },
    { title: '工具借用', path: '/tools', icon: <ToolOutlined /> },
  ],
  warehouse: [
    { title: '库存管理', path: '/inventory', icon: <ToolOutlined /> },
    { title: '库位管理', path: '/inventory/locations', icon: <EnvironmentOutlined /> },
  ],
  procurement: [
    { title: '采购管理', path: '/purchases', icon: <ShoppingCartOutlined /> },
  ],
};

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/login');
  };

  const links = [...(roleLinks[user?.role] || []), ...(user?.role==='admin'||user?.role==='warehouse'?commonLinks:[])];

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordForm] = Form.useForm();
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    try {
      const values = await passwordForm.validateFields();
      setChangingPassword(true);
      await api.put('/api/auth/change-password', values);
      message.success('密码修改成功');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || '密码修改失败');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div>
      <Card title="个人信息" style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2 }} bordered>
          <Descriptions.Item label="用户名">{user?.username}</Descriptions.Item>
          <Descriptions.Item label="姓名">{user?.name}</Descriptions.Item>
          <Descriptions.Item label="角色">
            <Tag color={roleColors[user?.role] || 'default'}>
              {roleDisplayNames[user?.role] || user?.role}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="手机号">{user?.phone || '未设置'}</Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Button
            type="default"
            icon={<KeyOutlined />}
            size="large"
            onClick={() => setPasswordModalVisible(true)}
            style={{ marginRight: 16 }}
          >
            修改密码
          </Button>
          <Button
            type="primary"
            danger
            icon={<LogoutOutlined />}
            size="large"
            onClick={handleLogout}
          >
            退出登录
          </Button>
        </div>
      </Card>

      {links.length > 0 && (
        <Card title="快速导航">
          <Space wrap size={[16, 16]}>
            {links.map((link) => (
              <Button
                key={link.path}
                icon={link.icon}
                onClick={() => navigate(link.path)}
                style={{ minWidth: 120 }}
              >
                {link.title}
              </Button>
            ))}
          </Space>
        </Card>
      )}

      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onOk={handleChangePassword}
        onCancel={() => { setPasswordModalVisible(false); passwordForm.resetFields(); }}
        confirmLoading={changingPassword}
        destroyOnClose
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            name="current_password"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item
            name="new_password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度不能少于6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label="确认新密码"
            dependencies={['new_password']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
