
# Create backend directory structure
mkdir -p backend/src/{config,loaders,middleware,utils,sockets,jobs/tasks,docs,db,modules}

# Create backend module directories
mkdir -p backend/src/modules/{auth,users,marketplace/{categories,items},offers,transactions,reviews,roommate,chat,notifications,search}

# Create other backend directories
mkdir -p backend/{uploads,logs,tmp}

# Create backend files
touch backend/.env
touch backend/.env.example
touch backend/package.json

# Create backend src files
touch backend/src/server.js
touch backend/src/app.js
touch backend/src/routes.js

# Create config files
touch backend/src/config/index.js
touch backend/src/config/storage.js
touch backend/src/config/rateLimit.js

# Create loader files
touch backend/src/loaders/express.js
touch backend/src/loaders/database.js
touch backend/src/loaders/socket.js
touch backend/src/loaders/jobs.js

# Create middleware files
touch backend/src/middleware/auth.js
touch backend/src/middleware/validate.js
touch backend/src/middleware/errorHandler.js
touch backend/src/middleware/requestLogger.js
touch backend/src/middleware/contentGuard.js
touch backend/src/middleware/upload.js

# Create utility files
touch backend/src/utils/logger.js
touch backend/src/utils/mailer.js
touch backend/src/utils/pagination.js
touch backend/src/utils/geo.js
touch backend/src/utils/price.js
touch backend/src/utils/searchLog.js
touch backend/src/utils/notify.js

# Create socket files
touch backend/src/sockets/chat.gateway.js

# Create job files
touch backend/src/jobs/schedules.js
touch backend/src/jobs/tasks/cleanupExpiredListings.js
touch backend/src/jobs/tasks/priceDropNotify.js
touch backend/src/jobs/tasks/trustScoreDaily.js
touch backend/src/jobs/tasks/digestEmailDaily.js

# Create docs files
touch backend/src/docs/openapi.yaml

# Create database files
touch backend/src/db/knexfile.js

# Create auth module files
touch backend/src/modules/auth/auth.routes.js
touch backend/src/modules/auth/auth.controller.js
touch backend/src/modules/auth/auth.service.js
touch backend/src/modules/auth/auth.repo.js

# Create users module files
touch backend/src/modules/users/users.routes.js
touch backend/src/modules/users/users.controller.js
touch backend/src/modules/users/users.service.js
touch backend/src/modules/users/users.repo.js

# Create marketplace categories module files
touch backend/src/modules/marketplace/categories/categories.routes.js
touch backend/src/modules/marketplace/categories/categories.controller.js
touch backend/src/modules/marketplace/categories/categories.service.js
touch backend/src/modules/marketplace/categories/categories.repo.js

# Create marketplace items module files
touch backend/src/modules/marketplace/items/items.routes.js
touch backend/src/modules/marketplace/items/items.controller.js
touch backend/src/modules/marketplace/items/items.service.js
touch backend/src/modules/marketplace/items/items.repo.js

# Create offers module files
touch backend/src/modules/offers/offers.routes.js
touch backend/src/modules/offers/offers.controller.js
touch backend/src/modules/offers/offers.service.js
touch backend/src/modules/offers/offers.repo.js

# Create transactions module files
touch backend/src/modules/transactions/transactions.routes.js
touch backend/src/modules/transactions/transactions.controller.js
touch backend/src/modules/transactions/transactions.service.js
touch backend/src/modules/transactions/transactions.repo.js

# Create reviews module files
touch backend/src/modules/reviews/reviews.routes.js
touch backend/src/modules/reviews/reviews.controller.js
touch backend/src/modules/reviews/reviews.service.js
touch backend/src/modules/reviews/reviews.repo.js

# Create roommate module files
touch backend/src/modules/roommate/roommate.routes.js
touch backend/src/modules/roommate/roommate.controller.js
touch backend/src/modules/roommate/roommate.service.js
touch backend/src/modules/roommate/roommate.repo.js

# Create chat module files
touch backend/src/modules/chat/chat.routes.js
touch backend/src/modules/chat/chat.controller.js
touch backend/src/modules/chat/chat.service.js
touch backend/src/modules/chat/chat.repo.js

# Create notifications module files
touch backend/src/modules/notifications/notifications.routes.js
touch backend/src/modules/notifications/notifications.controller.js
touch backend/src/modules/notifications/notifications.service.js
touch backend/src/modules/notifications/notifications.repo.js

# Create search module files
touch backend/src/modules/search/search.routes.js
touch backend/src/modules/search/search.controller.js
touch backend/src/modules/search/search.service.js
touch backend/src/modules/search/search.repo.js

# Frontend structure updates (since you already have the React app)
# Navigate to frontend directory
cd frontend

# Create additional frontend directories
mkdir -p src/{api,app/{routes,providers},features/{home,auth/pages,marketplace/{list,details,create},offers,transactions,roommate,notifications},shared/{components,styles},assets}

# Create API files
touch src/api/axios.js
touch src/api/endpoints.js

# Create app files
touch src/app/routes/AppRouter.js
touch src/app/providers/AuthProvider.js

# Create feature files
touch src/features/home/LandingPage.js
touch src/features/auth/pages/Login.js
touch src/features/auth/pages/Register.js

# Create shared component files
touch src/shared/components/Navbar.js
touch src/shared/components/Logo.js

# Create shared style files
touch src/shared/styles/global.css
touch src/shared/styles/theme.css

# Create frontend .env file
touch .env

echo "✅ Campus Cart project structure created successfully!"
echo ""
echo "📁 Backend structure created in: ./backend/"
echo "📁 Frontend structure updated in: ./frontend/"
echo ""
echo "Next steps:"
echo "1. Navigate to backend: cd backend"
echo "2. Initialize npm: npm init -y"
echo "3. Install backend dependencies"
echo "4. Configure your .env files"
echo "5. Set up your database"