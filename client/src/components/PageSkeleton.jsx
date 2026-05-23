import { Card, Skeleton } from 'antd';

export function DetailSkeleton() {
  return (
    <Card>
      <Skeleton active paragraph={{ rows: 1 }} />
      <div style={{ marginTop: 16 }}>
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
      <div style={{ marginTop: 16 }}>
        <Skeleton active paragraph={{ rows: 3 }} />
      </div>
    </Card>
  );
}

export function ListSkeleton() {
  return (
    <Card>
      <Skeleton active paragraph={{ rows: 1 }} style={{ marginBottom: 16 }} />
      <Skeleton active paragraph={{ rows: 6 }} />
    </Card>
  );
}

export function FormSkeleton() {
  return (
    <Card>
      <Skeleton active paragraph={{ rows: 2 }} />
      <div style={{ marginTop: 16 }}>
        <Skeleton active paragraph={{ rows: 5 }} />
      </div>
    </Card>
  );
}
