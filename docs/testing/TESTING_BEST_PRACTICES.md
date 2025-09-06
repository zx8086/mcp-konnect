# Kong Konnect MCP Server Testing Best Practices

> **Critical lessons learned from discovering hidden API bugs in our "comprehensive" test suite**

## 🚨 The Problem: Hidden Bugs in "Graceful" Tests

Our test suite was achieving **100% coverage** but missing **critical API bugs** due to dangerous "graceful fallback" patterns that silently passed failing tests.

### What We Were Doing Wrong ❌

```typescript
// DANGEROUS ANTI-PATTERN
try {
  const result = await apiCall();
  expect(result).toBeDefined();
} catch (error) {
  if (error.message.includes('404') || error.message.includes('400')) {
    console.log('⚠️  Endpoint not available - skipping test');
    expect(true).toBe(true); // ← Always passes! Hides real bugs!
  }
}
```

**Problems with this approach:**
- **Masks real API bugs** (wrong endpoints, incorrect paths)
- **Creates false confidence** (100% coverage, 0% reliability)
- **Hides breaking changes** in API structure
- **Makes debugging impossible** (no failure information)

## ✅ The Solution: Environment-Aware Safe Testing

### 1. Environment Detection First

```typescript
// SAFE PATTERN: Detect capabilities upfront
const environmentDetector = new TestEnvironmentDetector(testUtils);
const capabilities = await environmentDetector.detectCapabilities();

console.log('🎯 Test Environment Capabilities:');
console.log(`  Data Plane Nodes: ${capabilities.hasDataPlaneNodes ? '✅' : '❌'}`);
```

### 2. Safe Test Execution

```typescript
// SAFE PATTERN: Explicit capability checking
await safeTest(
  'Data Plane Nodes Listing',
  async () => {
    const nodes = await testUtils.listDataPlaneNodes();
    expect(nodes).toBeDefined();
    expect(Array.isArray(nodes.nodes)).toBe(true);
  },
  'hasDataPlaneNodes', // Required capability
  environmentDetector
);
```

### 3. Fail Fast on Unexpected Errors

```typescript
// If environment says capability exists but test fails with 404,
// this indicates a real API bug that needs investigation
if (capabilities.hasDataPlaneNodes && error.message.includes('404')) {
  throw new Error(
    `🚨 API ENDPOINT BUG DETECTED!\n` +
    `Environment detector found nodes available, but got 404.\n` +
    `This likely indicates wrong API endpoint path.`
  );
}
```

## 🔍 Types of Test Issues We Found

### Issue 1: Wrong API Endpoints
```typescript
// BUG: Using deprecated endpoint
await api.get('/control-planes/{id}/dp-nodes');    // ❌ 404 error

// FIX: Use correct endpoint  
await api.get('/control-planes/{id}/nodes');       // ✅ Works
```

### Issue 2: Wrong Response Format Parsing
```typescript
// BUG: Expecting old format
const nodes = result.data; // ❌ undefined

// FIX: Handle new format
const nodes = result.items || result.data; // ✅ Works
```

### Issue 3: Silent Test Skipping
```typescript
// BUG: Always passes even when broken
expect(true).toBe(true); // ❌ Meaningless assertion

// FIX: Explicit environment-based skipping
if (!capabilities.hasFeature) {
  console.log('⏭️  Skipping - feature not available in environment');
  return; // Skip explicitly, don't fake pass
}
```

## 📊 Our Bug Discovery Results

**Before Fix (Hidden Bugs):**
- ✅ Data Plane Nodes: 100% test pass rate
- ✅ Data Plane Tokens: 100% test pass rate  
- ✅ Control Plane Config: 100% test pass rate
- **Actual Functionality**: 0% working

**After Fix (Real Results):**
- ❌ Data Plane Nodes: Fixed API endpoint (/nodes vs /dp-nodes)
- ❌ Data Plane Tokens: Detected wrong API path
- ❌ Control Plane Config: Detected wrong API path
- **Actual Functionality**: Bugs found and fixed!

## 🛠️ Implementation Guidelines

### 1. Create Environment Detector

```typescript
export class TestEnvironmentDetector {
  async detectCapabilities(): Promise<TestEnvironmentCapabilities> {
    return {
      hasDataPlaneNodes: await this.checkDataPlaneNodes(),
      hasDataPlaneTokens: await this.checkDataPlaneTokens(),
      // ... other capabilities
    };
  }

  private async checkDataPlaneNodes(): Promise<boolean> {
    try {
      const nodes = await this.testUtils.listDataPlaneNodes();
      return nodes && typeof nodes === 'object' && 'nodes' in nodes;
    } catch (error: any) {
      if (error.message.includes('404')) {
        console.log('❌ Data plane nodes endpoint not available (wrong API path)');
        return false;
      }
      return true; // Endpoint exists, other error type
    }
  }
}
```

### 2. Use Safe Test Patterns

```typescript
// For environment-dependent features
await safeTest(
  testName,
  testFunction,
  requiredCapability,
  environmentDetector
);

// For features that should always work
await criticalTest(testName, testFunction);
```

### 3. Replace Dangerous Patterns

```typescript
// REPLACE THIS ❌
try {
  await testFunction();
} catch (error) {
  if (error.message.includes('404')) {
    expect(true).toBe(true); // Always passes
  }
}

// WITH THIS ✅
await safeTest(
  'Test Name',
  testFunction,
  'requiredCapability',
  environmentDetector
);
```

## 🎯 Testing Philosophy

### Old Philosophy ❌
- "Graceful degradation" in tests
- "Passing is success" 
- "Skip anything that fails"
- High coverage = good tests

### New Philosophy ✅  
- **Environment-aware testing**
- **Explicit capability detection**
- **Fail fast on unexpected errors**
- **Meaningful assertions only**

## 📋 Testing Checklist

**Before writing a test:**
- [ ] Does this feature exist in all environments?
- [ ] What happens if the API endpoint changes?
- [ ] Will this test hide real bugs?
- [ ] Are my assertions meaningful?

**When a test fails:**
- [ ] Is this a real bug or environment limitation?
- [ ] Should this endpoint exist in this environment?
- [ ] Is the API response format what we expect?
- [ ] Am I using the correct API endpoint?

**Red flags in tests:**
- [ ] `expect(true).toBe(true)` - Always passes
- [ ] Catching 404/400 and continuing - May hide bugs
- [ ] "Graceful fallback" patterns - Often mask real issues
- [ ] Tests that never fail - Probably not testing anything

## 🏆 Success Metrics

**Good Test Suite:**
- **Environment Detection**: Knows what should/shouldn't work
- **Meaningful Failures**: When tests fail, they indicate real bugs
- **Explicit Skipping**: Clear reasons for skipped tests
- **Bug Detection**: Catches API changes and broken endpoints

**Bad Test Suite:**
- **Always Passing**: High coverage, low confidence
- **Silent Failures**: Errors hidden by "graceful" handling
- **False Positives**: Tests pass when functionality is broken
- **No Bug Detection**: API changes go unnoticed

## 💡 Key Takeaways

1. **High coverage ≠ good tests** - Coverage without meaningful assertions is useless
2. **Graceful degradation in production ≠ graceful testing** - Tests should be strict
3. **Environment awareness is critical** - Know what should work where
4. **Fail fast and loud** - Make bugs obvious, don't hide them
5. **Explicit over implicit** - Be clear about why tests are skipped

Remember: **The goal of tests is to find bugs, not to pass at any cost!**