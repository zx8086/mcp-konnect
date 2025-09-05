# Kong Konnect MCP Server Configuration Guide

This document provides comprehensive guidance for configuring the Kong Konnect MCP Server with proper environment variable management, health monitoring, and validation using Zod v3.

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure your values:

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:

```bash
# Required: Kong Konnect API Configuration
KONNECT_ACCESS_TOKEN=your-kong-konnect-access-token-here
KONNECT_REGION=us

# Optional: LangSmith Tracing
LANGSMITH_TRACING=false
LANGSMITH_API_KEY=your-langsmith-api-key-here
```

### 2. Configuration Validation

Run the configuration health check to validate your setup:

```bash
bun run config:health
```

### 3. Start the Server

```bash
bun run bun:dev
```

## Configuration Reference

### Application Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `APPLICATION_NAME` | `kong-konnect-mcp` | Application name identifier |
| `APPLICATION_VERSION` | `2.0.0` | Application version (semver format) |
| `NODE_ENV` | `development` | Environment: `development`, `staging`, `production`, `test` |
| `LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error` |

### Kong Konnect API Configuration

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `KONNECT_ACCESS_TOKEN` | - | Kong Konnect API access token | ✅ |
| `KONNECT_REGION` | `us` | API region: `us`, `eu`, `au`, `me`, `in` | - |
| `KONNECT_TIMEOUT` | `30000` | API request timeout (milliseconds) | - |
| `KONNECT_RETRY_ATTEMPTS` | `3` | Number of retry attempts | - |
| `KONNECT_RETRY_DELAY` | `1000` | Delay between retries (milliseconds) | - |

#### Getting Your Kong Konnect Access Token

1. Visit [Kong Konnect](https://cloud.konghq.com/)
2. Log in to your account
3. Navigate to **Personal Access Tokens**
4. Create a new token with appropriate permissions
5. Copy the token to your `.env` file

### LangSmith Tracing Configuration

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `LANGSMITH_TRACING` | `false` | Enable LangSmith tracing | - |
| `LANGSMITH_API_KEY` | - | LangSmith API key | ⚠️* |
| `LANGSMITH_PROJECT` | `konnect-mcp-server` | LangSmith project name | - |
| `LANGSMITH_ENDPOINT` | `https://api.smith.langchain.com` | LangSmith API endpoint | - |
| `LANGSMITH_SESSION` | `mcp-session` | Session name for tracing | - |
| `LANGSMITH_TAGS` | `mcp-server,kong-konnect` | Comma-separated tags | - |
| `LANGSMITH_SAMPLING_RATE` | `1.0` | Sampling rate (0.0 to 1.0) | - |

*Required only when `LANGSMITH_TRACING=true`

### Monitoring Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MONITORING_ENABLED` | `true` | Enable performance monitoring |
| `HEALTH_CHECK_INTERVAL` | `30000` | Health check interval (milliseconds) |
| `METRICS_COLLECTION` | `true` | Enable metrics collection |
| `PERFORMANCE_RESPONSE_TIME_MS` | `5000` | Response time threshold (milliseconds) |
| `PERFORMANCE_ERROR_RATE` | `5` | Error rate threshold (percentage) |

### Runtime Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PREFER_BUN_ENV` | `true` | Prefer Bun.env over process.env |
| `ENV_FILE_AUTO_LOAD` | `true` | Auto-load .env files |
| `DEBUG_MODE` | `false` | Enable debug mode |

## Configuration Management Commands

### Health Check Commands

```bash
# Full configuration health check
bun run config:health

# Production deployment safety check
bun run config:health:prod

# Validate configuration only
bun run config:validate
```

### Schema Export

```bash
# Export JSON Schema for documentation
bun run config:schema
```

### Environment Diagnostics

```bash
# Check environment variable loading
bun run env:check
```

## Configuration Health Monitoring

The configuration system includes comprehensive health monitoring with:

- **Security scoring** (0-100%) based on token strength, encryption settings
- **Environment consistency** validation for production/development
- **Configuration complexity** assessment
- **Performance monitoring** of validation speed

### Health Status Levels

- 🟢 **HEALTHY**: All checks passed, ready for production
- 🟡 **DEGRADED**: Minor issues detected, review recommendations
- 🟠 **UNHEALTHY**: Multiple warnings, address before production
- 🔴 **CRITICAL**: Blocking issues, cannot start server

### Production Security Requirements

The system enforces strict security requirements for production:

- ❌ No default or weak passwords/tokens
- ❌ Debug logging disabled in production
- ❌ Debug mode disabled in production
- ✅ Strong API tokens (minimum length requirements)
- ✅ Proper LangSmith API key format validation

## Environment-Specific Configuration

### Development Environment

Recommended configuration for development:

```bash
NODE_ENV=development
LOG_LEVEL=debug
DEBUG_MODE=true
LANGSMITH_TRACING=true
MONITORING_ENABLED=true
```

### Production Environment

Required configuration for production:

```bash
NODE_ENV=production
LOG_LEVEL=info
DEBUG_MODE=false
KONNECT_ACCESS_TOKEN=kpat_strong_production_token
LANGSMITH_TRACING=false  # or with proper API key
MONITORING_ENABLED=true
```

### Production Deployment Checklist

Before deploying to production, ensure:

- [ ] `bun run config:health:prod` passes
- [ ] Strong Kong Konnect access token set
- [ ] No debug logging or debug mode enabled
- [ ] LangSmith properly configured or disabled
- [ ] Monitoring enabled for observability

## Configuration Architecture

### Centralized Configuration System

The server uses a centralized configuration system with:

- **Zod v3 validation** for type safety and runtime validation
- **Environment variable mapping** with defaults
- **Health monitoring** with trend analysis
- **Cross-domain validation** for configuration consistency
- **Backward compatibility** with legacy configuration loading

### Configuration Loading Flow

1. **Environment Initialization**: Load .env files (automatic in Bun)
2. **Variable Parsing**: Parse and type-convert environment variables
3. **Schema Validation**: Validate against Zod schema
4. **Health Assessment**: Run security and consistency checks
5. **Error Handling**: Provide detailed error messages and remediation

### Integration Points

Configuration is used by:

- **API Client** (`src/api/kong-api.ts`) - Kong Konnect credentials and settings
- **Tracing System** (`src/config/tracing-config.ts`) - LangSmith configuration
- **Main Server** (`src/index.ts`) - Application startup and runtime settings
- **Health Monitoring** - Performance and reliability tracking

## Troubleshooting

### Common Configuration Issues

#### 1. Missing Kong Konnect Token

**Error**: `KONNECT_ACCESS_TOKEN is required`

**Solution**:
```bash
# Set in .env file
KONNECT_ACCESS_TOKEN=kpat_your_token_here

# Or as environment variable
export KONNECT_ACCESS_TOKEN=kpat_your_token_here
```

#### 2. LangSmith API Key Required

**Error**: `LangSmith API key required when tracing is enabled`

**Solutions**:
```bash
# Option 1: Disable tracing
LANGSMITH_TRACING=false

# Option 2: Set API key
LANGSMITH_API_KEY=lsv2_your_key_here
```

#### 3. Production Security Violations

**Error**: `Default password not allowed in production`

**Solution**: Use strong, unique tokens in production environment.

#### 4. Configuration Loading Issues

**Error**: `Configuration not loaded`

**Debugging**:
```bash
# Check environment variable loading
bun run env:check

# Run health check for detailed diagnosis  
bun run config:health

# Check .env file exists and is readable
ls -la .env
```

### Validation Performance

The configuration system is optimized for performance:

- **Validation time**: < 5ms for typical configurations
- **Memory usage**: Minimal overhead with caching
- **Startup impact**: Negligible delay in server startup

### Configuration Hot-Reload

The system supports configuration changes without restart:

- ✅ Environment variable updates
- ✅ Runtime configuration changes
- ✅ Health monitoring updates
- ⚠️ Schema changes require restart

## API Documentation

### Configuration Manager

```typescript
import { configManager, loadConfiguration } from './config/index.js';

// Load and validate configuration
const config = await loadConfiguration();

// Get current configuration
const current = configManager.get();

// Get configuration health
const health = await configManager.getHealth();

// Get health trends
const trends = configManager.getHealthTrends();

// Export JSON Schema
const schema = configManager.exportJsonSchema();
```

### Configuration Types

```typescript
interface Config {
  application: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production' | 'test';
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  
  kong: {
    accessToken: string;
    region: 'us' | 'eu' | 'au' | 'me' | 'in';
    baseUrl?: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  
  tracing: {
    enabled: boolean;
    apiKey?: string;
    project: string;
    endpoint: string;
    sessionName: string;
    tags: string[];
    samplingRate: number;
  };
  
  monitoring: {
    enabled: boolean;
    healthCheckInterval: number;
    metricsCollection: boolean;
    performanceThresholds: {
      responseTimeMs: number;
      errorRate: number;
    };
  };
  
  runtime: {
    preferBunEnv: boolean;
    envFileAutoLoad: boolean;
    debugMode: boolean;
  };
}
```

## Best Practices

### Security Best Practices

1. **Never commit credentials** to version control
2. **Use strong tokens** with appropriate permissions
3. **Rotate tokens regularly** following security policies
4. **Monitor configuration health** in production
5. **Use environment-specific validation** rules

### Performance Best Practices

1. **Cache configuration** after initial load
2. **Use health monitoring** to detect performance issues
3. **Set appropriate timeouts** for your use case
4. **Monitor validation performance** metrics
5. **Use Bun.env** for optimal performance in Bun runtime

### Operational Best Practices

1. **Run health checks** before deployment
2. **Monitor configuration trends** over time
3. **Set up alerting** for configuration issues
4. **Document environment-specific settings**
5. **Test configuration changes** in non-production first

## Support

For configuration issues:

1. Run `bun run config:health` for diagnostics
2. Check the troubleshooting section above
3. Review server logs for detailed error messages
4. Verify environment variable loading with `bun run env:check`

The configuration system is designed to provide clear, actionable error messages and remediation steps for common issues.