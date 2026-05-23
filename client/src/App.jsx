import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Loading from './components/Loading';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

// Lazy-loaded page components
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const PartList = React.lazy(() => import('./pages/parts/PartList'));
const PartForm = React.lazy(() => import('./pages/parts/PartForm'));
const PartDetail = React.lazy(() => import('./pages/parts/PartDetail'));
const PartCategoryList = React.lazy(() => import('./pages/parts/PartCategoryList'));
const InventoryOverview = React.lazy(() => import('./pages/inventory/InventoryOverview'));
const InventoryList = React.lazy(() => import('./pages/inventory/InventoryList'));
const InboundForm = React.lazy(() => import('./pages/inventory/InboundForm'));
const OutboundForm = React.lazy(() => import('./pages/inventory/OutboundForm'));
const TransactionLog = React.lazy(() => import('./pages/inventory/TransactionLog'));
const LocationManage = React.lazy(() => import('./pages/inventory/LocationManage'));
const LocationTransfer = React.lazy(() => import('./pages/inventory/LocationTransfer'));
const ToolList = React.lazy(() => import('./pages/tools/ToolList'));
const ToolForm = React.lazy(() => import('./pages/tools/ToolForm'));
const BorrowForm = React.lazy(() => import('./pages/tools/BorrowForm'));
const ReturnForm = React.lazy(() => import('./pages/tools/ReturnForm'));
const WorkOrderList = React.lazy(() => import('./pages/workOrders/WorkOrderList'));
const WorkOrderForm = React.lazy(() => import('./pages/workOrders/WorkOrderForm'));
const WorkOrderDetail = React.lazy(() => import('./pages/workOrders/WorkOrderDetail'));
const WorkOrderComplete = React.lazy(() => import('./pages/workOrders/WorkOrderComplete'));
const PurchaseList = React.lazy(() => import('./pages/purchases/PurchaseList'));
const PurchaseForm = React.lazy(() => import('./pages/purchases/PurchaseForm'));
const PurchaseDetail = React.lazy(() => import('./pages/purchases/PurchaseDetail'));
const ArrivalForm = React.lazy(() => import('./pages/purchases/ArrivalForm'));
const SystemCategoryList = React.lazy(() => import('./pages/basicData/SystemCategoryList'));
const EquipmentList = React.lazy(() => import('./pages/basicData/EquipmentList'));
const SupplierList = React.lazy(() => import('./pages/basicData/SupplierList'));
const EquipmentDetail = React.lazy(() => import('./pages/basicData/EquipmentDetail'));
const Profile = React.lazy(() => import('./pages/Profile'));
const PersonnelList = React.lazy(() => import('./pages/basicData/PersonnelList'));
const AccountList = React.lazy(() => import('./pages/basicData/AccountList'));
const BackupRestore = React.lazy(() => import('./pages/BackupRestore'));

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          {/* Parts */}
          <Route path="parts" element={<PartList />} />
          <Route path="parts/categories" element={<PartCategoryList />} />
          <Route path="parts/new" element={<PartForm />} />
          <Route path="parts/:id" element={<PartDetail />} />
          <Route path="parts/:id/edit" element={<PartForm />} />
          {/* Inventory */}
          <Route path="inventory" element={<InventoryOverview />} />
          <Route path="inventory/stock" element={<InventoryList />} />
          <Route path="inventory/inbound" element={<InboundForm />} />
          <Route path="inventory/outbound" element={<OutboundForm />} />
          <Route path="inventory/transactions" element={<TransactionLog />} />
          <Route path="inventory/locations" element={<LocationManage />} />
          <Route path="inventory/locations/transfer" element={<LocationTransfer />} />
          {/* Tools */}
          <Route path="tools" element={<ToolList />} />
          <Route path="tools/new" element={<ToolForm />} />
          <Route path="tools/borrow" element={<BorrowForm />} />
          <Route path="tools/return" element={<ReturnForm />} />
          {/* Work Orders */}
          <Route path="work-orders" element={<WorkOrderList />} />
          <Route path="work-orders/new" element={<WorkOrderForm />} />
          <Route path="work-orders/:id" element={<WorkOrderDetail />} />
          <Route path="work-orders/:id/complete" element={<WorkOrderComplete />} />
          {/* Purchases */}
          <Route path="purchases" element={<PurchaseList />} />
          <Route path="purchases/new" element={<PurchaseForm />} />
          <Route path="purchases/:id/edit" element={<PurchaseForm />} />
          <Route path="purchases/:id" element={<PurchaseDetail />} />
          <Route path="purchases/:id/arrival" element={<ArrivalForm />} />
          {/* Basic Data */}
          <Route path="basic-data/system-categories" element={<SystemCategoryList />} />
          <Route path="basic-data/equipment" element={<EquipmentList />} />
          <Route path="basic-data/equipment/:id" element={<EquipmentDetail />} />
          <Route path="basic-data/suppliers" element={<SupplierList />} />
          <Route path="basic-data/personnel" element={<PersonnelList />} />
          <Route path="basic-data/accounts" element={<AccountList />} />
          {/* Backup */}
          <Route path="backup" element={<BackupRestore />} />
          {/* Profile */}
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
