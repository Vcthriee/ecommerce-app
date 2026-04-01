

---

## 3. ECOMMERCE-APP README

```markdown
# Ecommerce API

Node.js REST API with automated deployment to AWS ECS.

## Features

- Express.js REST API
- PostgreSQL database via RDS Proxy
- Redis caching for sessions
- JWT authentication
- Swagger API documentation at `/api-docs`
- Docker containerization
- CI/CD with GitHub Actions

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check for ALB |
| GET | `/` | API info |
| GET | `/api/products` | List products |
| POST | `/api/auth/login` | User login |
| GET | `/api/orders` | List orders |
| GET | `/api/categories` | List categories |
| GET | `/api-docs` | Swagger UI documentation |

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run with Docker Compose (includes Postgres + Redis)
docker-compose up

# API available at http://localhost:3000

Manual Deployment
bash
Copy

# Build image
docker build -t ecommerce-app .

# Configure AWS
aws configure

# Login to ECR
aws ecr get-login-password --region af-south-1 | \
  docker login --username AWS --password-stdin \
  904690835870.dkr.ecr.af-south-1.amazonaws.com

# Tag and push
docker tag ecommerce-app:latest \
  904690835870.dkr.ecr.af-south-1.amazonaws.com/ecommerce-app-app:latest

docker push \
  904690835870.dkr.ecr.af-south-1.amazonaws.com/ecommerce-app-app:latest

# Update ECS
aws ecs update-service \
  --cluster ecommerce-app-cluster \
  --service ecommerce-app-service \
  --force-new-deployment \
  --region af-south-1

Automated Deployment (GitHub Actions)
Table
Branch	What Happens
dev	Test → Build → Push image to ECR
main	Test → Build → Push → Deploy to ECS
Deploy via Git Push
bash
Copy

# Deploy to dev (build only)
git checkout dev
git push origin dev

# Deploy to production (build + deploy)
git checkout main
git merge dev
git push origin main

Watch deployment at: https://github.com/Vcthriee/ecommerce-app/actions
CI/CD Pipeline Flow
plain
Copy

Push to main
    │
    ▼
┌─────────┐
│  Test   │  ← npm test (Jest)
└────┬────┘
     │
     ▼
┌─────────┐
│  Build  │  ← Docker build
└────┬────┘
     │
     ▼
┌─────────┐
│  Push   │  ← ECR push
└────┬────┘
     │
     ▼
┌─────────┐
│ Verify  │  ← Check ECS infrastructure exists
└────┬────┘
     │
     ▼
┌─────────┐
│ Deploy  │  ← Update ECS service
└─────────┘

Environment Variables
ECS injects these at runtime:
Table
Variable	Source	Description
DB_PROXY_ENDPOINT	ECS Task Def	Database host
DB_NAME	ECS Task Def	Database name
DB_USERNAME	ECS Task Def	Database user
DB_PASSWORD	Secrets Manager	Database password
REDIS_ENDPOINT	ECS Task Def	Redis host
JWT_SECRET	Secrets Manager	JWT signing key
ENVIRONMENT	ECS Task Def	dev/prod
Project Structure
plain
Copy

ecommerce-app/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── src/
│   ├── app.js                  # Express setup
│   ├── routes/
│   │   ├── health.js           # Health check
│   │   ├── auth.js             # Authentication
│   │   ├── products.js         # Product API
│   │   ├── orders.js           # Order API
│   │   └── categories.js       # Category API
│   └── middleware/
│       ├── errorHandler.js     # Global error handling
│       └── auth.js             # JWT verification
├── Dockerfile                  # Container image
├── docker-compose.yml          # Local development stack
├── package.json
└── README.md

Infrastructure Dependency
This application requires ecommerce-infra to be deployed first:

    ECS cluster and service
    RDS PostgreSQL database
    ElastiCache Redis
    Application Load Balancer
    ECR repository
    VPC and security groups

Health Check
The app exposes a health endpoint for the ALB:
bash
Copy

curl http://ecommerce-app-alb-886182432.af-south-1.elb.amazonaws.com/health

Response:
JSON
Copy

{"status":"healthy","timestamp":"2026-03-28T20:02:35.853Z","environment":"dev"}

Tech Stack

    Runtime: Node.js 18
    Framework: Express.js
    Database: PostgreSQL 15 (via RDS Proxy)
    Cache: Redis 7 (ElastiCache)
    Auth: JWT
    Docs: Swagger/OpenAPI
    Container: Docker
    Orchestration: AWS ECS Fargate
    CI/CD: GitHub Actions