import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import requestLogger from './middleware/logger.js';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import systemCategoriesRoutes from './routes/systemCategories.js';
import equipmentRoutes from './routes/equipment.js';
import suppliersRoutes from './routes/suppliers.js';
import partsRoutes from './routes/parts.js';
import locationsRoutes from './routes/locations.js';
import toolsRoutes from './routes/tools.js';
import inventoryRoutes from './routes/inventory.js';
import purchasesRoutes from './routes/purchases.js';
import workOrdersRoutes from './routes/workOrders.js';
import importExportRoutes from './routes/importExport.js';
import personnelRoutes from './routes/personnel.js';
import backupRoutes from './routes/backup.js';
import optionsRoutes from './routes/options.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    'https://heating-supply.pages.dev',
    'http://localhost:5173',
    'http://localhost:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  maxAge: 86400,
}));;
app.use(express.json());
app.use(requestLogger);

app.use('/api/auth', authRoutes);
app.use('/api/system-categories', systemCategoriesRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/parts', partsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/work-orders', workOrdersRoutes);
app.use('/api/import-export', importExportRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/options', optionsRoutes);
app.use('/api/backup', backupRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;

