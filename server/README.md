# AI SEO OS Server

Full-stack AI SEO automation platform server built with Node.js, TypeScript, and Fastify.

## Features

- **Authentication Service**: Supabase-based authentication with JWT token management
- **Fastify Application**: High-performance HTTP server with middleware
- **Security**: CORS, Helmet security headers, and rate limiting
- **Logging**: Request/response logging with correlation IDs
- **Error Handling**: Centralized error handling with proper error codes
- **Health Check**: Server health monitoring endpoint
- **Graceful Shutdown**: Proper cleanup on SIGTERM/SIGINT

## Project Structure

```
server/src/
├── index.ts              # Server entry point
├── app.ts                # Fastify application setup
├── config.ts             # Environment configuration
├── services/
│   ├── auth.ts           # Authentication service
│   ├── gsc.ts            # Google Search Console integration
│   ├── orchestrator.ts   # Agent orchestration
│   └── wordpress.ts      # WordPress integration
├── middleware/
│   └── errorHandler.ts   # Error handling middleware
├── types/
│   ├── api.ts            # API type definitions
│   ├── database.ts       # Database type definitions
│   └── index.ts          # Type exports
├── db/
│   └── client.ts         # Database client
├── lib/
│   ├── config.ts         # Configuration utilities
│   ├── logger.ts         # Logger setup
│   ├── redis.ts          # Redis client
│   └── supabase.ts       # Supabase client
├── agents/               # AI agents
├── queue/                # Job queue setup
├── workers/              # Background workers
└── utils/
    └── errors.ts         # Custom error classes
```

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Redis server
- Supabase account
- Google Gemini API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure your `.env` file with appropriate values:
   - Supabase URL and keys
   - Redis connection
   - Gemini API key
   - Google OAuth credentials

### Running the Server

Development mode with hot reload:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```

Run worker processes:
```bash
npm run worker
```

## API Endpoints

### Health Check
```
GET /health
```
Returns server health status.

### Authentication

The authentication service (`services/auth.ts`) provides:

- **Sign Up**: Create new user accounts with email/password
- **Sign In**: Authenticate users and return session tokens
- **Token Verification**: Validate JWT tokens
- **Token Refresh**: Refresh expired tokens
- **Sign Out**: End user sessions
- **User Lookup**: Find users by email

## Middleware

### Request/Response Logging
All requests are logged with:
- Correlation ID (X-Correlation-ID header)
- Request method and URL
- Response status code
- Request duration

### Rate Limiting
- 100 requests per 15 minutes per IP
- Configurable via @fastify/rate-limit

### Security Headers
Helmet middleware provides:
- XSS Protection
- Content Type Options
- Frame Options
- And more...

### CORS
Configured to allow requests from:
- Development: `http://localhost:5173`
- Production: Configurable via `FRONTEND_URL` env var

## Error Handling

Centralized error handling with custom error classes:
- `AuthError`: Authentication failures (401)
- `ValidationError`: Input validation errors (400)
- `NotFoundError`: Resource not found (404)
- `ConflictError`: Conflict errors (409)
- `RateLimitError`: Rate limit exceeded (429)

All errors include:
- Error code
- HTTP status code
- User-friendly message
- Correlation ID for tracking

## Logging

Uses Pino for structured logging:
- JSON format in production
- Pretty format in development
- Correlation ID tracking
- Context-aware logging

## Configuration

Environment variables (see `.env.example`):

- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3001)
- `HOST`: Server host (default: 0.0.0.0)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `REDIS_URL`: Redis connection string
- `GEMINI_API_KEY`: Google Gemini API key
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `JWT_SECRET`: JWT signing secret
- `FRONTEND_URL`: Frontend application URL
- `API_URL`: API base URL

## Development

### Type Checking
```bash
npx tsc --noEmit
```

### Code Style
The project uses TypeScript strict mode with:
- ESModuleInterop enabled
- Source maps for debugging
- Declaration files generation

## Architecture

The server follows a layered architecture:

1. **Entry Point** (`index.ts`): Initializes the server, checks database health
2. **Application** (`app.ts`): Configures Fastify with middleware and routes
3. **Services**: Business logic and external integrations
4. **Agents**: AI-powered automation agents
5. **Queue/Workers**: Background job processing
6. **Database**: Data persistence via Supabase

## Graceful Shutdown

The server handles shutdown signals (SIGTERM, SIGINT) gracefully:
- Stops accepting new connections
- Completes pending requests
- Cleans up resources
- Exits cleanly

## License

Private - All rights reserved
