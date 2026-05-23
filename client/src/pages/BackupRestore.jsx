import { useState } from 'react';
import { Card, Button, message, Upload, Modal, Space } from 'antd';
import { DownloadOutlined, UploadOutlined, WarningOutlined } from '@ant-design/icons';
import api from '../api/client';

export default function BackupRestore() {
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/api/backup/download', {
        responseType: 'blob',
        timeout: 60000,
      });
      const blob = new Blob([res.data], { type: 'application/sql' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const disposition = res.headers['content-disposition'] || '';
      const match = disposition.match(/filename\*\*=UTF-8''(.+)/);
      const filename = match ? decodeURIComponent(match[1]) : `backup-${Date.now()}.sql`;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      message.success('备份下载成功');
    } catch (err) {
      message.error('备份下载失败：' + (err.response?.data?.error || err.message));
    } finally {
      setDownloading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) return;
    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await api.post('/api/backup/restore', formData, {
        timeout: 120000,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success(res.data?.message || '数据恢复成功');
      setRestoreModalVisible(false);
      setSelectedFile(null);
    } catch (err) {
      message.error('数据恢复失败：' + (err.response?.data?.error || err.message));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div>
      <Card title="数据备份与恢复" style={{ maxWidth: 700, margin: '0 auto' }}>
        <Card
          type="inner"
          title="下载备份"
          style={{ marginBottom: 16 }}
        >
          <p style={{ marginBottom: 16, color: '#666' }}>
            将当前数据库完整导出为 SQL 文件，包含所有表结构及数据。
          </p>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={downloading}
            onClick={handleDownload}
            size="large"
          >
            下载备份文件
          </Button>
        </Card>

        <Card
          type="inner"
          title="恢复数据"
        >
          <p style={{ marginBottom: 16, color: '#666' }}>
            上传之前下载的备份 SQL 文件，将数据库恢复到备份时的状态。
          </p>
          <p style={{ marginBottom: 16, color: '#ff4d4f', fontSize: 13 }}>
            <WarningOutlined style={{ marginRight: 4 }} />
            恢复操作将覆盖当前所有数据，请谨慎操作。建议先下载当前数据备份。
          </p>
          <Button
            danger
            icon={<UploadOutlined />}
            onClick={() => setRestoreModalVisible(true)}
            size="large"
          >
            上传备份文件恢复
          </Button>
        </Card>
      </Card>

      <Modal
        title="恢复数据"
        open={restoreModalVisible}
        onOk={handleRestore}
        onCancel={() => { setRestoreModalVisible(false); setSelectedFile(null); }}
        confirmLoading={restoring}
        okText="开始恢复"
        okButtonProps={{ danger: true }}
        destroyOnClose
      >
        <p style={{ marginBottom: 16, color: '#ff4d4f' }}>
          <WarningOutlined style={{ marginRight: 4 }} />
          此操作将覆盖当前所有数据，且不可撤销。确定要继续吗？
        </p>
        <Upload.Dragger
          accept=".sql"
          maxCount={1}
          beforeUpload={(file) => {
            setSelectedFile(file);
            return false;
          }}
          onRemove={() => setSelectedFile(null)}
          fileList={selectedFile ? [{ name: selectedFile.name, uid: '-1' }] : []}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽 SQL 文件到此区域</p>
          <p className="ant-upload-hint">仅支持 .sql 格式的备份文件</p>
        </Upload.Dragger>
      </Modal>
    </div>
  );
}
