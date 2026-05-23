Write-Host "Step 1: Copy migration file to container..." -ForegroundColor Cyan
docker cop "C:\Users\robin\Downloads\superpowers-5.1.0\heating-supply-app\server\db\migrations\021_add_item_type_to_purchase_order_items.js" heating-supply-app-server-1:/app/db/migrations/021_add_item_type_to_purchase_order_items.js
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: docker cp failed for migration" -ForegroundColor Red; exit 1 }

Write-Host "Step 2: Run migration..." -ForegroundColor Cyan
docker exec heating-supply-app-server-1 node run-migrate.mjs
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Migration failed" -ForegroundColor Red; exit 1 }

Write-Host "Step 3: Copy equipmentController.js to container..." -ForegroundColor Cyan
docker cop "C:\Users\robin\Downloads\superpowers-5.1.0\heating-supply-app\server\src\controllers\equipmentController.js" heating-supply-app-server-1:/app/src/controllers/equipmentController.js
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: docker cp failed for equipmentController.js" -ForegroundColor Red; exit 1 }

Write-Host "Step 4: Restart client container..." -ForegroundColor Cyan
docker-compose -f "C:\Users\robin\Downloads\superpowers-5.1.0\heating-supply-app\docker-compose.yml" restart client
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: docker-compose restart failed" -ForegroundColor Red; exit 1 }

Write-Host "All Docker commands completed successfully!" -ForegroundColor Green
