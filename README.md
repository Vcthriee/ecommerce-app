# Ecommerce API

A production-ready RESTful ecommerce API built with Node.js and Express.
Deployed on AWS EKS using Helm.

## App Images

![Images](app-landing-page-image/app-landingpage-image.svg) 

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express
- **Database:** PostgreSQL (via Sequelize)
- **Cache:** Redis (ElastiCache)
- **Auth:** JWT
- **Docs:** Swagger UI
- **Container:** Docker
- **Orchestration:** Kubernetes (EKS)
- **Registry:** AWS ECR
- **Deploy:** Helm

## API Routes

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Login and get JWT token | No |
| GET | `/api/products` | List all products | No |
| GET | `/api/products/:id` | Get a single product | No |
| POST | `/api/products` | Create a product | Yes |
| PUT | `/api/products/:id` | Update a product | Yes |
| DELETE | `/api/products/:id` | Delete a product | Yes |
| GET | `/api/categories` | List all categories | No |
| POST | `/api/orders` | Create an order | Yes |
| GET | `/api/orders` | List user orders | Yes |
| GET | `/api/health` | Health check | No |

## Project Structure
src/
├── app.js              # Express app setup and Swagger
├── config/
│   ├── database.js     # PostgreSQL connection
│   └── cache.js        # Redis connection
├── middleware/
│   ├── auth.js         # JWT authentication
│   ├── errorHandler.js # Global error handler
│   └── rateLimiter.js  # Rate limiting
├── models/
│   ├── user.js
│   ├── product.js
│   ├── category.js
│   └── order.js
└── routes/
├── auth.js
├── products.js
├── categories.js
├── orders.js
└── health.js

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_ENDPOINT` | Redis connection string | `redis://host:6379` |
| `JWT_SECRET` | Secret key for JWT signing | `your-secret-here` |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Port the app listens on | `80` |

## Local Development

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env

# Run migrations
node scripts/migrate.js

# Start the server
npm start
```

## Docker

```bash
# Build the image
docker build -t ecommerce-app:v1.0.0 .

# Run locally
docker run -p 3000:80 \
  -e DATABASE_URL=your-db-url \
  -e REDIS_ENDPOINT=your-redis-url \
  -e JWT_SECRET=your-secret \
  ecommerce-app:v1.0.0
```

## Deployment to AWS EKS

### Prerequisites
- AWS CLI configured
- kubectl configured for your EKS cluster
- Helm installed
- Docker installed

### Push image to ECR

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region af-south-1 | \
  docker login --username AWS --password-stdin \
  904690835870.dkr.ecr.af-south-1.amazonaws.com

# Build and tag
docker build -t ecommerce-app:v1.0.0 .
docker tag ecommerce-app:v1.0.0 \
  904690835870.dkr.ecr.af-south-1.amazonaws.com/ecommerce-app:v1.0.0

# Push
docker push \
  904690835870.dkr.ecr.af-south-1.amazonaws.com/ecommerce-app:v1.0.0
```

### Create Kubernetes secrets

```bash
kubectl create secret generic db-credentials \
  --namespace ecommerce-app \
  --from-literal=DATABASE_URL=your-database-url \
  --from-literal=REDIS_ENDPOINT=your-redis-url \
  --from-literal=JWT_SECRET=your-jwt-secret
```

### Deploy with Helm

```bash
helm upgrade --install ecommerce-app ./helm/ecommerce \
  --namespace ecommerce-app \
  --create-namespace
```

### Verify deployment

```bash
kubectl get pods -n ecommerce-app
kubectl get svc -n ecommerce-app
```

## API Documentation

Swagger UI is available at:
http://<your-loadbalancer-url>/api-docs

## Health Check

```bash
curl http://<your-loadbalancer-url>/api/health
```