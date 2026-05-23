@echo off
echo Step 1: Copy migration file to container
docker cop "C:\Users\robin\Downloads\superpowers-5.1.0\heating-supply-app\server\db\migrations\021_add_item_type_to_purchase_order_items.js" heating-supply-app-server-1:/app/db/migrations/021_add_item_type_to_purchase_order_items.js
if %errorlevel% neq 0 echo ERROR: docker cp failed for migration && exit /b 1

echo Step 2: Run migration
docker exec heating-supply-app-server-1 node run-migrate.mjs
if %errorlevel% neq 0 echo ERROR: Migration failed && exit /b 1

echo Step 3: Copy equipmentController.js to container
docker cop "C:\Users\robin\Downloads\superpowers-5.1.0\heating-supply-app\server\src\controllers\equipmentController.js" heating-supply-app-server-1:/app/src/controllers/equipmentController.js
if %errorlevel% neq 0 echo ERROR: docker cp failed for equipmentController.js && exit /b 1

echo Step 4: Restart client container
docker-compose -f "C:\Users\robin\Downloads\superpowers-5.1.0\heating-supply-app\docker-compose.yml" restart client
if %errorlevel% neq 0 echo ERROR: docker-compose restart failed && exit /b 1

echo All Docker commands completed successfully!
exit /b 0
