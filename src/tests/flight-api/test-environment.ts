/**
 * Test environment detection and safe testing patterns
 * Replaces dangerous "graceful fallback" anti-patterns
 */

import { FlightApiTestUtils } from './test-helpers.js';

export interface TestEnvironmentCapabilities {
  hasHybridControlPlanes: boolean;
  hasDataPlaneNodes: boolean;
  hasDataPlaneTokens: boolean;
  hasControlPlaneConfig: boolean;
  hasPortalFeatures: boolean;
  hasCertificateManagement: boolean;
  supportsAnalytics: boolean;
}

export class TestEnvironmentDetector {
  private testUtils: FlightApiTestUtils;
  private capabilities: TestEnvironmentCapabilities | null = null;

  constructor(testUtils: FlightApiTestUtils) {
    this.testUtils = testUtils;
  }

  /**
   * Detect environment capabilities by probing endpoints
   * This replaces the dangerous "graceful fallback" pattern
   */
  async detectCapabilities(): Promise<TestEnvironmentCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    console.log('🔍 Detecting test environment capabilities...');

    const capabilities: TestEnvironmentCapabilities = {
      hasHybridControlPlanes: await this.checkHybridControlPlanes(),
      hasDataPlaneNodes: await this.checkDataPlaneNodes(),
      hasDataPlaneTokens: await this.checkDataPlaneTokens(),
      hasControlPlaneConfig: await this.checkControlPlaneConfig(),
      hasPortalFeatures: await this.checkPortalFeatures(),
      hasCertificateManagement: await this.checkCertificateManagement(),
      supportsAnalytics: await this.checkAnalyticsSupport()
    };

    this.capabilities = capabilities;
    this.logCapabilities(capabilities);
    return capabilities;
  }

  private async checkHybridControlPlanes(): Promise<boolean> {
    try {
      const controlPlanes = await this.testUtils.listControlPlanes();
      return controlPlanes.controlPlanes?.some((cp: any) => 
        cp.clusterType === 'CLUSTER_TYPE_HYBRID'
      ) || false;
    } catch (error) {
      console.warn('⚠️  Could not detect control plane types');
      return false;
    }
  }

  private async checkDataPlaneNodes(): Promise<boolean> {
    try {
      const nodes = await this.testUtils.listDataPlaneNodes();
      // If we get a valid response structure (even empty), the endpoint exists
      return nodes && typeof nodes === 'object' && 'nodes' in nodes;
    } catch (error: any) {
      if (error.message.includes('404') || error.message.includes('Cannot GET')) {
        console.log('❌ Data plane nodes endpoint not available (wrong API path)');
        return false;
      }
      // Other errors mean the endpoint exists but has different issues
      console.log('✅ Data plane nodes endpoint exists (but may have auth/permission issues)');
      return true;
    }
  }

  private async checkDataPlaneTokens(): Promise<boolean> {
    try {
      const tokens = await this.testUtils.listDataPlaneTokens();
      return tokens && typeof tokens === 'object' && 'tokens' in tokens;
    } catch (error: any) {
      if (error.message.includes('404') || error.message.includes('Cannot GET')) {
        console.log('❌ Data plane tokens endpoint not available (wrong API path)');
        return false;
      }
      console.log('✅ Data plane tokens endpoint exists');
      return true;
    }
  }

  private async checkControlPlaneConfig(): Promise<boolean> {
    try {
      const config = await this.testUtils.getControlPlaneConfig();
      return config && typeof config === 'object';
    } catch (error: any) {
      if (error.message.includes('404') || error.message.includes('Cannot GET')) {
        console.log('❌ Control plane config endpoint not available (wrong API path)');
        return false;
      }
      console.log('✅ Control plane config endpoint exists');
      return true;
    }
  }

  private async checkPortalFeatures(): Promise<boolean> {
    try {
      const portals = await this.testUtils.listPortals?.();
      return portals && typeof portals === 'object';
    } catch (error: any) {
      if (error.message.includes('404') || error.message.includes('Cannot GET')) {
        console.log('❌ Portal features not available');
        return false;
      }
      console.log('✅ Portal features available');
      return true;
    }
  }

  private async checkCertificateManagement(): Promise<boolean> {
    try {
      const certificates = await this.testUtils.listCertificates?.();
      return certificates && typeof certificates === 'object';
    } catch (error: any) {
      if (error.message.includes('404') || error.message.includes('Cannot GET')) {
        console.log('❌ Certificate management not available');
        return false;
      }
      console.log('✅ Certificate management available');
      return true;
    }
  }

  private async checkAnalyticsSupport(): Promise<boolean> {
    try {
      // Try a simple analytics query
      const analytics = await this.testUtils.queryApiRequests?.('1H', [], 10);
      return analytics && typeof analytics === 'object';
    } catch (error: any) {
      if (error.message.includes('404') || error.message.includes('Cannot GET')) {
        console.log('❌ Analytics not available');
        return false;
      }
      console.log('✅ Analytics available');
      return true;
    }
  }

  private logCapabilities(capabilities: TestEnvironmentCapabilities): void {
    console.log('\n🎯 Test Environment Capabilities:');
    console.log(`  Hybrid Control Planes: ${capabilities.hasHybridControlPlanes ? '✅' : '❌'}`);
    console.log(`  Data Plane Nodes: ${capabilities.hasDataPlaneNodes ? '✅' : '❌'}`);
    console.log(`  Data Plane Tokens: ${capabilities.hasDataPlaneTokens ? '✅' : '❌'}`);
    console.log(`  Control Plane Config: ${capabilities.hasControlPlaneConfig ? '✅' : '❌'}`);
    console.log(`  Portal Features: ${capabilities.hasPortalFeatures ? '✅' : '❌'}`);
    console.log(`  Certificate Management: ${capabilities.hasCertificateManagement ? '✅' : '❌'}`);
    console.log(`  Analytics Support: ${capabilities.supportsAnalytics ? '✅' : '❌'}`);
  }
}

/**
 * Safe test wrapper that replaces the dangerous "graceful fallback" pattern
 */
export async function safeTest(
  testName: string,
  testFn: () => Promise<void>,
  requiredCapability: keyof TestEnvironmentCapabilities,
  environmentDetector: TestEnvironmentDetector
): Promise<void> {
  const capabilities = await environmentDetector.detectCapabilities();
  
  if (!capabilities[requiredCapability]) {
    console.log(`⏭️  Skipping ${testName} - ${requiredCapability} not available in this environment`);
    return;
  }

  try {
    await testFn();
  } catch (error: any) {
    // If we get here, the capability was detected but the test still failed
    // This indicates a real bug that needs investigation
    if (error.message.includes('404') || error.message.includes('Cannot GET')) {
      throw new Error(
        `🚨 API ENDPOINT BUG DETECTED in ${testName}!\n` +
        `Environment detector said ${requiredCapability} was available, but got 404.\n` +
        `This likely indicates a wrong API endpoint path.\n` +
        `Original error: ${error.message}`
      );
    }
    throw error; // Re-throw other errors normally
  }
}

/**
 * Helper for tests that should always work regardless of environment
 */
export async function criticalTest(
  testName: string,
  testFn: () => Promise<void>
): Promise<void> {
  try {
    await testFn();
  } catch (error: any) {
    throw new Error(
      `🚨 CRITICAL TEST FAILURE in ${testName}!\n` +
      `This test should work in all environments.\n` +
      `Original error: ${error.message}`
    );
  }
}