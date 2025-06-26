# TECHNICAL CONTEXT - MICROSERVICE ARCHITECTURE

## CURRENT SYSTEM TECHNICAL ANALYSIS

### EXISTING MONOLITHIC ARCHITECTURE
- **Runtime:** Node.js
- **Framework:** Express.js (single server instance)
- **Database:** SQLite (single file: `users.db`)
- **Authentication:** JWT tokens with bcrypt password hashing
- **Validation:** express-validator middleware
- **CORS:** cors middleware for cross-origin requests
- **File Structure:** Single `index.js` file (488 lines)

### CURRENT API ENDPOINTS
1. `POST /api/register` - User registration
2. `POST /api/login` - User authentication
3. `GET /api/profile` - Get user profile (protected)
4. `PUT /api/profile` - Update user profile (protected)
5. `PUT /api/change-password` - Change password (protected)
6. `GET /api/health` - Health check

### CURRENT DEPENDENCIES
```json
{
  "bcryptjs": "^2.4.3",
  "cors": "^2.8.5", 
  "express": "^4.18.0",
  "express-validator": "^7.0.0",
  "jsonwebtoken": "^9.0.0",
  "sqlite3": "^5.1.0"
}
```

## TARGET MICROSERVICE ARCHITECTURE

### TECHNOLOGY STACK DECISIONS

#### CORE INFRASTRUCTURE
- **Container Platform:** Docker + Docker Compose
- **Service Discovery:** Docker Compose networking
- **Message Queue:** Redis (pub/sub for events)
- **Load Balancing:** Nginx (future) / Docker Compose (initial)
- **Configuration:** Environment variables + config files

#### SERVICE-SPECIFIC TECHNOLOGIES

##### API Gateway Service
- **Framework:** Express.js
- **Middleware:** http-proxy-middleware for routing
- **Authentication:** JWT token validation
- **Dependencies:**
  ```json
  {
    "express": "^4.18.0",
    "http-proxy-middleware": "^2.0.6",
    "jsonwebtoken": "^9.0.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^6.7.0"
  }
  ```

##### User Service
- **Framework:** Express.js
- **Database:** PostgreSQL (migration from SQLite)
- **ORM:** pg (PostgreSQL driver)
- **Dependencies:**
  ```json
  {
    "express": "^4.18.0",
    "pg": "^8.10.0",
    "express-validator": "^7.0.0",
    "bcryptjs": "^2.4.3",
    "redis": "^4.6.0"
  }
  ```

##### Authentication Service
- **Framework:** Express.js
- **Session Store:** Redis
- **Token Management:** JWT
- **Dependencies:**
  ```json
  {
    "express": "^4.18.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "redis": "^4.6.0",
    "express-validator": "^7.0.0"
  }
  ```

#### DATABASE ARCHITECTURE

##### Current State
- **SQLite:** Single file database (`users.db`)
- **Schema:** Single `users` table
  ```sql
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
  ```

##### Target State
- **User Service Database:** PostgreSQL
  ```sql
  -- User profiles and basic info
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```

- **Authentication Service Database:** PostgreSQL + Redis
  ```sql
  -- Authentication credentials
  CREATE TABLE user_credentials (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```

#### COMMUNICATION ARCHITECTURE

##### Service-to-Service Communication
- **Protocol:** HTTP/REST
- **Format:** JSON
- **Authentication:** Service-to-service API keys
- **Error Handling:** Standardized error responses

##### Event-Driven Communication
- **Message Broker:** Redis Pub/Sub
- **Event Types:**
  - `user.registered` - New user registration
  - `user.profile.updated` - Profile changes
  - `user.password.changed` - Password updates
  - `auth.login.success` - Successful login
  - `auth.login.failed` - Failed login attempt

##### API Gateway Routing
```javascript
// Route configuration
const routes = {
  '/api/register': 'user-service:3001',
  '/api/login': 'auth-service:3002', 
  '/api/profile': 'user-service:3001',
  '/api/change-password': 'auth-service:3002',
  '/api/health': 'all-services'
};
```

## IMPLEMENTATION TECHNOLOGY DETAILS

### CONTAINERIZATION STRATEGY

#### Docker Configuration
- **Base Image:** node:18-alpine (consistent across services)
- **Multi-stage builds:** For optimized production images
- **Health checks:** Built into each container
- **Security:** Non-root user, minimal attack surface

#### Docker Compose Architecture
```yaml
version: '3.8'
services:
  api-gateway:
    build: ./api-gateway
    ports: ["3000:3000"]
    depends_on: [user-service, auth-service]
    
  user-service:
    build: ./user-service
    ports: ["3001:3001"]
    depends_on: [postgres, redis]
    
  auth-service:
    build: ./auth-service  
    ports: ["3002:3002"]
    depends_on: [postgres, redis]
    
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: microservices
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
```

### DEVELOPMENT ENVIRONMENT

#### Local Development Setup
- **Node.js Version:** 18+ (LTS)
- **Package Manager:** npm
- **Docker Version:** 20.10+
- **Docker Compose Version:** 2.0+

#### Development Workflow
1. **Code Changes:** Individual service development
2. **Local Testing:** Service-specific unit tests
3. **Integration Testing:** Docker Compose environment
4. **End-to-End Testing:** Full stack testing

### MONITORING AND OBSERVABILITY

#### Health Monitoring
- **Health Endpoints:** `/health` on each service
- **Metrics:** Response time, error rates, throughput
- **Alerting:** Basic threshold-based alerts

#### Logging Strategy
- **Format:** Structured JSON logging
- **Correlation:** Request IDs across services
- **Aggregation:** Centralized log collection
- **Retention:** Configurable retention policies

#### Tracing (Basic)
- **Request Tracking:** Unique request IDs
- **Service Calls:** Log service-to-service calls
- **Performance:** Track response times

### SECURITY IMPLEMENTATION

#### Authentication Flow
1. **Client Login:** POST to API Gateway `/api/login`
2. **Gateway Routing:** Forward to Auth Service
3. **Credential Validation:** Auth Service validates credentials
4. **Token Generation:** JWT token issued by Auth Service
5. **Token Return:** Gateway returns token to client
6. **Subsequent Requests:** Gateway validates JWT for protected routes

#### Inter-Service Security
- **API Keys:** Services authenticate with API keys
- **Network Isolation:** Docker network isolation
- **Secrets Management:** Environment variables and Docker secrets

### DATA MIGRATION STRATEGY

#### Phase 1: Dual Write
1. **Setup:** New PostgreSQL databases
2. **Dual Write:** Write to both SQLite and PostgreSQL
3. **Validation:** Ensure data consistency
4. **Testing:** Verify all operations work

#### Phase 2: Data Migration
1. **Historical Data:** Migrate existing SQLite data
2. **Validation:** Verify data integrity
3. **Switch Reads:** Point reads to PostgreSQL
4. **Monitor:** Ensure performance is acceptable

#### Phase 3: Cleanup
1. **Remove Dual Write:** Stop writing to SQLite
2. **Decommission:** Remove SQLite dependencies
3. **Optimize:** Tune PostgreSQL performance

### TESTING STRATEGY

#### Unit Testing
- **Framework:** Jest
- **Coverage:** Aim for 80%+ code coverage
- **Mocking:** Mock external dependencies

#### Integration Testing
- **Environment:** Docker Compose test environment
- **Database:** Test-specific database instances
- **Services:** Test service interactions

#### End-to-End Testing
- **Framework:** Supertest for API testing
- **Scenarios:** Complete user workflows
- **Data:** Test data management

### DEPLOYMENT CONSIDERATIONS

#### Local Development
- **Hot Reload:** nodemon for development
- **Database:** Persistent volumes for data
- **Debugging:** Debug ports exposed

#### Production Readiness
- **Environment Variables:** All configuration externalized
- **Secrets Management:** Secure secret handling
- **Resource Limits:** Memory and CPU limits
- **Restart Policies:** Automatic restart on failure

### PERFORMANCE CONSIDERATIONS

#### Optimization Strategies
- **Connection Pooling:** Database connection pools
- **Caching:** Redis caching for frequent queries
- **Compression:** Response compression
- **Keep-Alive:** HTTP keep-alive connections

#### Scaling Strategies
- **Horizontal Scaling:** Multiple service instances
- **Load Balancing:** Request distribution
- **Database Scaling:** Read replicas (future)

## TECHNOLOGY VALIDATION REQUIREMENTS

### Prerequisites
- [ ] Docker and Docker Compose installed
- [ ] Node.js 18+ installed
- [ ] PostgreSQL client tools
- [ ] Redis CLI tools

### Validation Steps
1. **Container Build:** Verify all services build successfully
2. **Network Communication:** Test inter-service communication
3. **Database Connectivity:** Verify PostgreSQL connections
4. **Message Queue:** Test Redis pub/sub functionality
5. **API Gateway:** Verify request routing works
6. **End-to-End:** Complete user registration/login flow

### Performance Benchmarks
- **Response Time:** < 200ms for simple operations
- **Throughput:** Handle concurrent requests
- **Resource Usage:** Monitor memory and CPU usage
- **Startup Time:** Services start within 30 seconds 