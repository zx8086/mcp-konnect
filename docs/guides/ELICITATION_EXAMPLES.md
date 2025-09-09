# Kong Migration Elicitation Examples and Testing Scenarios

This document provides comprehensive examples and testing scenarios for the MCP elicitation system in Kong migrations.

## 🎯 Complete Elicitation Workflow Examples

### Example 1: High-Confidence Migration (Minimal Elicitation)

**User Request:**
```
"Please migrate the deck configuration for the devops domain production environment. Our platform team manages this."
```

**Expected Analysis:**
```yaml
Context Detection:
  domain: "devops" (confidence: 0.95, source: explicit)
  environment: "production" (confidence: 0.9, source: explicit)  
  team: "platform" (confidence: 0.9, source: explicit)

Migration Analysis:
  overall_confidence: 0.92
  elicitation_required: false
  risk_assessment: "low"
```

**Expected Flow:**
```yaml
Step 1: analyze_migration_context
  result: elicitationRequired = false

Step 2: Proceed directly to migration
  tags_applied:
    - env-production
    - domain-devops  
    - team-platform
    - [contextual tags from entity analysis]
```

### Example 2: Medium-Confidence Migration (Partial Elicitation)

**User Request:**
```
"Migrate this Kong configuration to our API platform"
```

**Expected Analysis:**
```yaml
Context Detection:
  domain: "api" (confidence: 0.7, source: implicit)
  environment: null (confidence: 0.0)
  team: "platform" (confidence: 0.6, source: implicit)

Migration Analysis:
  overall_confidence: 0.43
  elicitation_required: true
  missing_info: [environment]
```

**Expected Elicitation:**
```
🔍 **Migration Context Analysis Complete**

Found 8 entities to migrate (5 services, 3 routes) with 43% confidence.

**Information needed for production-ready deployment:**

1. 🌍 **Environment Specification** (critical)
   💡 No environment detected - deployment safety requires specification
   ❓ Which environment: production, staging, development, test?

**Detected information (will be used):**
• Domain: "api" (medium confidence from your message)
• Team: "platform" (inferred from context)

**Would you like to specify the environment now?**
```

### Example 3: Low-Confidence Migration (Full Elicitation)

**User Request:**
```
"Please help me migrate this configuration"
```

**Expected Analysis:**
```yaml
Context Detection:
  domain: null (confidence: 0.0)
  environment: "production" (confidence: 0.3, source: default)
  team: "platform" (confidence: 0.3, source: default)

Migration Analysis:
  overall_confidence: 0.2
  elicitation_required: true
  missing_info: [domain, environment, team]
```

**Expected Elicitation:**
```
🔍 **Migration Context Analysis Complete**

Found 12 entities to migrate (8 services, 4 routes) with 20% confidence.

**Information needed for production-ready deployment:**

1. 🏷️ **Domain Classification** (high priority)
   💡 Suggestions based on services found: backend, api, platform
   ❓ What domain should this configuration be tagged with?

2. 🌍 **Environment Specification** (critical)  
   💡 Default: "production" (for safety)
   ❓ Confirm environment: production, staging, development, test

3. 👥 **Team Ownership** (required)
   💡 Default: "platform"
   ❓ Which team owns this: platform, devops, api, backend, etc.?

**Would you like to provide this information now, or should I proceed with suggested defaults?**
```

## 🧪 Testing Scenarios

### Scenario A: Service Name Pattern Detection

**Context:**
```yaml
services:
  - name: "auth-service"
  - name: "user-api-service" 
  - name: "payment-gateway"
```

**Expected Domain Suggestions:**
- "auth" (confidence: 0.6, from service pattern)
- "user" (confidence: 0.4, from service pattern)
- "payment" (confidence: 0.5, from service pattern)

**Best Suggestion:** "auth" (highest confidence + security context)

### Scenario B: File Path Analysis

**Context:**
```yaml
deckFiles: 
  - "/projects/company/devops/production/kong/config.yaml"
  - "/config/staging/api-gateway/routes.yaml"
```

**Expected Detection:**
```yaml
domain: "devops" (confidence: 0.6, from path segment)
environment: "production" (confidence: 0.8, from path)
secondary_domain: "api" (confidence: 0.4, from second path)
```

### Scenario C: Plugin Configuration Analysis

**Context:**
```yaml
plugins:
  - name: "oauth2"
    enabled: true
  - name: "rate-limiting" 
    config:
      minute: 1000
  - name: "cors"
    enabled: true
```

**Expected Entity Tags:**
```yaml
oauth2_plugin:
  - function-authentication
  - criticality-high
  - type-security-layer

rate_limiting_plugin:
  - function-security
  - criticality-high
  
cors_plugin:
  - function-security  
  - criticality-medium
```

### Scenario D: Control Plane Name Analysis

**Context:**
```yaml
_konnect:
  control_plane_name: "api-platform-prod"
```

**Expected Detection:**
```yaml
domain: "api" (confidence: 0.7, from CP name)
secondary_domain: "platform" (confidence: 0.6, from CP name)
environment: "prod" -> "production" (confidence: 0.8, normalized)
```

## 🔧 Elicitation Response Testing

### Response Type 1: Complete Acceptance

**User Response:**
```json
{
  "requestId": "domain_req_001",
  "data": "devops",
  "declined": false,
  "cancelled": false
}
```

**Expected Processing:**
- Validation: ✅ Passes domain format validation
- Confidence: High (user provided)
- Next Action: Continue with next request or proceed to migration

### Response Type 2: Declined Request

**User Response:**
```json
{
  "requestId": "team_req_001", 
  "declined": true,
  "error": "Will specify later"
}
```

**Expected Processing:**
- Fallback: Use default "platform" 
- Warning: Note that default was used
- Confidence: Medium (fallback used)
- Next Action: Continue but flag for validation

### Response Type 3: Session Cancellation

**User Response:**
```json
{
  "requestId": "env_req_001",
  "cancelled": true,
  "error": "Need to check with team first"
}
```

**Expected Processing:**
- Action: Halt migration workflow
- Cleanup: Preserve session for later resumption
- Message: "Migration paused - session preserved for resumption"
- Next Action: Wait for user to resume or restart

## 🎯 Contextual Tag Elicitation Examples

### Service Analysis Example

**Service Configuration:**
```yaml
service:
  name: "payment-processor-api"
  host: "internal.payments.company.com"
  port: 8080
  protocol: "https"
```

**Expected Analysis:**
```yaml
detected_patterns:
  function: "payment-processing" (confidence: 0.9, from name)
  type: "internal-api" (confidence: 0.8, from host pattern)
  protocol: "https" (confidence: 1.0, from config)
  access: "private" (confidence: 0.7, from internal host)

suggested_tags:
  - "function-payment-processing"
  - "type-internal-api" 
  - "protocol-https"
  - "access-private"
  - "criticality-high" (payment = high criticality)
```

**Elicitation Request:**
```
🏷️ **Contextual Tags Required for service: payment-processor-api**

This service needs additional classification tags for operational intelligence.

**Entity**: payment-processor-api
**Configuration**: https://internal.payments.company.com:8080

**Please select 2-3 contextual tags:**

**Function**: function-payment-processing, function-api-gateway, function-data-processing
**Type**: type-internal-api, type-external-api, type-middleware
**Criticality**: criticality-high, criticality-medium, criticality-low

**Suggestions based on analysis:**
• Payment processing typically has high criticality
• Internal hostname suggests private access
• HTTPS indicates secure protocol requirements
```

## 🚦 Validation and Error Scenarios

### Validation Error 1: Invalid Domain Format

**User Input:** "API-DOMAIN"
**Validation Result:**
```json
{
  "valid": false,
  "error": "Domain must be lowercase with hyphens, 3-20 characters",
  "suggestion": "api-domain"
}
```

### Validation Error 2: Insufficient Tags

**Generated Tags:** `["env-production", "domain-api"]`
**Validation Result:**
```json
{
  "valid": false,
  "error": "Entity has only 2 tags, minimum 5 required",
  "missing": ["team-*", "function-*", "type-*"]
}
```

## 🎪 Interactive Elicitation Demos

### Demo 1: Smart Suggestions

**Scenario:** User migrating authentication services

**User Message:** "Migrate our OAuth and JWT authentication setup"

**Expected Smart Suggestions:**
```yaml
domain_suggestions:
  - "auth" (high confidence from message)
  - "security" (medium confidence)
  - "identity" (medium confidence)

contextual_tag_suggestions:
  oauth_service:
    - "function-authentication" (very high confidence)
    - "criticality-high" (security = high priority)
    - "type-security-layer" (OAuth is security middleware)
  
  jwt_plugin:
    - "function-authentication" (very high confidence)
    - "criticality-high" (auth = critical)
```

### Demo 2: Progressive Disclosure

**Flow:**
1. **First Request:** Only ask for domain (most important)
2. **User Provides:** "api"
3. **Second Request:** Environment (now with domain context)
4. **User Provides:** "production"  
5. **Third Request:** Team (now with domain + environment context)
6. **Auto-Complete:** Generate contextual tags based on all information

## 📊 Performance and UX Testing

### UX Metrics to Track

```yaml
user_experience_metrics:
  completion_rate: "Percentage of elicitation sessions completed"
  average_time_to_complete: "Time from first request to final response"
  user_satisfaction: "Rating of elicitation experience"
  fallback_usage: "How often users decline and use defaults"
  accuracy_improvement: "Tag accuracy vs. non-elicited migrations"

performance_metrics:
  context_analysis_time: "Time to analyze and detect context"
  suggestion_generation_time: "Time to create smart suggestions"
  session_memory_usage: "Memory footprint of active sessions"
  concurrent_sessions_supported: "Max parallel elicitation sessions"
```

### Success Criteria

```yaml
success_criteria:
  context_detection_accuracy: ">= 80%"
  user_completion_rate: ">= 85%"
  tag_compliance_improvement: ">= 90% entities with 5+ tags"
  user_satisfaction_score: ">= 4.2/5.0"
  fallback_rate: "<= 20%"
```

## 🔄 Integration Testing Scenarios

### Integration Test 1: Full Migration Workflow

```yaml
test_scenario: "Complete deck migration with elicitation"
steps:
  1. analyze_migration_context
  2. create_elicitation_session  
  3. process_multiple_responses
  4. generate_tag_assignments
  5. execute_kong_migration
  6. validate_deployed_entities

validation:
  - All entities have >= 5 tags
  - All mandatory tags present
  - Contextual tags match entity types
  - Migration successful
```

### Integration Test 2: Error Recovery

```yaml  
test_scenario: "Elicitation error handling and recovery"
error_conditions:
  - Invalid user input
  - Session timeout
  - Partial completion
  - Network interruption

recovery_validation:
  - Sessions can be resumed
  - Partial data preserved
  - Graceful fallback to defaults
  - Clear error messages provided
```

This comprehensive testing framework ensures the elicitation system provides a smooth, intelligent, and user-friendly experience for Kong migrations.