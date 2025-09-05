#!/usr/bin/env bun

/**
 * Configuration Health Check and Validation Utility for Kong Konnect MCP Server
 * Run with: bun run src/utils/config-health.ts
 */

import { configManager, type ConfigurationHealth } from '../config/index.js';
import { getRuntimeInfo } from './env.js';

interface HealthCheckResult {
  success: boolean;
  config?: any;
  health?: ConfigurationHealth;
  error?: string;
}

async function runConfigurationHealthCheck(): Promise<HealthCheckResult> {
  try {
    console.log('🔍 Kong Konnect MCP Server Configuration Health Check');
    console.log('='.repeat(60));

    // Show runtime information
    const runtimeInfo = getRuntimeInfo();
    console.log(`\n📊 Runtime Information:`);
    console.log(`   Runtime: ${runtimeInfo.runtime} ${runtimeInfo.version}`);
    console.log(`   Env Source: ${runtimeInfo.envSource}`);
    console.log(`   Auto .env Loading: ${runtimeInfo.autoEnvLoading ? 'YES' : 'NO'}`);

    // Load configuration
    console.log('\n⚙️  Loading Configuration...');
    const config = await configManager.load();
    console.log('✅ Configuration loaded successfully');

    // Run health assessment  
    console.log('\n🏥 Running Health Assessment...');
    const health = await configManager.getHealth();
    
    // Display health summary
    console.log('\n📋 Health Summary:');
    console.log(`   Status: ${getStatusEmoji(health.status)} ${health.status.toUpperCase()}`);
    console.log(`   Security Score: ${health.metrics.securityScore}%`);
    console.log(`   Environment Consistency: ${health.metrics.environmentConsistency}%`);
    console.log(`   Configuration Complexity: ${health.metrics.configurationComplexity}/100`);
    console.log(`   Validation Performance: ${health.metrics.validationPerformance}ms`);

    // Display issues
    if (health.issues.critical.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      health.issues.critical.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.path}: ${issue.message}`);
        console.log(`      💡 ${issue.remediation}`);
      });
    }

    if (health.issues.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      health.issues.warnings.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.path}: ${issue.message}`);
      });
    }

    if (health.issues.info.length > 0) {
      console.log('\nℹ️  INFO:');
      health.issues.info.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.path}: ${issue.message}`);
      });
    }

    // Display recommendations
    if (health.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      health.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    // Configuration summary
    console.log('\n⚙️  Configuration Summary:');
    console.log(`   Environment: ${config.application.environment}`);
    console.log(`   Log Level: ${config.application.logLevel}`);
    console.log(`   Kong Region: ${config.kong.region}`);
    console.log(`   Kong Token Set: ${config.kong.accessToken ? 'YES' : 'NO'}`);
    console.log(`   Tracing Enabled: ${config.tracing.enabled ? 'YES' : 'NO'}`);
    console.log(`   Monitoring Enabled: ${config.monitoring.enabled ? 'YES' : 'NO'}`);

    // Health trends if available
    const trends = configManager.getHealthTrends();
    if (trends.trend !== 'stable') {
      console.log('\n📈 Health Trends:');
      console.log(`   Trend: ${getTrendEmoji(trends.trend)} ${trends.trend.toUpperCase()}`);
      console.log(`   Analysis: ${trends.analysis}`);
    }

    // Final status
    console.log('\n' + '='.repeat(60));
    if (health.status === 'critical') {
      console.log('❌ CONFIGURATION HEALTH CHECK FAILED');
      console.log('   Fix critical issues before running the MCP server');
      return { success: false, config, health };
    } else if (health.status === 'unhealthy') {
      console.log('⚠️  CONFIGURATION HEALTH CHECK - ISSUES DETECTED');
      console.log('   Server can run but consider addressing warnings');
      return { success: true, config, health };
    } else {
      console.log('✅ CONFIGURATION HEALTH CHECK PASSED');
      console.log('   Server ready to start');
      return { success: true, config, health };
    }

  } catch (error: any) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ CONFIGURATION HEALTH CHECK FAILED');
    console.log(`   Error: ${error.message}`);

    if (error.name === 'ZodError') {
      console.log('\n🔍 Validation Errors:');
      error.issues?.forEach((issue: any, index: number) => {
        console.log(`   ${index + 1}. ${issue.path.join('.')}: ${issue.message}`);
      });

      console.log('\n💡 Common Solutions:');
      if (error.issues?.some((i: any) => i.path.includes('accessToken'))) {
        console.log('   - Set KONNECT_ACCESS_TOKEN in your .env file');
        console.log('   - Get your token from: https://cloud.konghq.com/');
      }
      if (error.issues?.some((i: any) => i.path.includes('apiKey'))) {
        console.log('   - Set LANGSMITH_API_KEY in your .env file');
        console.log('   - Or set LANGSMITH_TRACING=false to disable tracing');
      }
    }

    return { success: false, error: error.message };
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'healthy': return '🟢';
    case 'degraded': return '🟡';
    case 'unhealthy': return '🟠';
    case 'critical': return '🔴';
    default: return '⚪';
  }
}

function getTrendEmoji(trend: string): string {
  switch (trend) {
    case 'improving': return '📈';
    case 'degrading': return '📉';
    case 'stable': return '📊';
    default: return '📊';
  }
}

// Production deployment safety check
async function runProductionSafetyCheck(): Promise<boolean> {
  console.log('\n🚀 Production Deployment Safety Check');
  console.log('-'.repeat(40));

  try {
    const config = await configManager.load();
    
    if (config.application.environment !== 'production') {
      console.log('ℹ️  Not running in production mode - safety check skipped');
      return true;
    }

    const health = await configManager.getHealth();
    let safetyIssues: string[] = [];

    // Critical safety checks for production
    if (health.issues.critical.length > 0) {
      safetyIssues.push(`${health.issues.critical.length} critical configuration issues`);
    }

    if (health.metrics.securityScore < 70) {
      safetyIssues.push(`Security score too low: ${health.metrics.securityScore}%`);
    }

    if (config.kong.accessToken === 'your-kong-konnect-access-token-here' || 
        config.kong.accessToken === 'test' || 
        config.kong.accessToken.length < 10) {
      safetyIssues.push('Invalid or default Kong access token');
    }

    if (config.application.logLevel === 'debug') {
      safetyIssues.push('Debug logging enabled in production');
    }

    if (config.runtime.debugMode) {
      safetyIssues.push('Debug mode enabled in production');
    }

    if (safetyIssues.length > 0) {
      console.log('🚨 PRODUCTION DEPLOYMENT BLOCKED');
      console.log('   Safety Issues:');
      safetyIssues.forEach(issue => console.log(`   - ${issue}`));
      console.log('\n   Fix these issues before deploying to production');
      return false;
    }

    console.log('✅ Production safety check passed');
    return true;

  } catch (error: any) {
    console.log(`❌ Production safety check failed: ${error.message}`);
    return false;
  }
}

// Export JSON Schema
async function exportConfigSchema(): Promise<void> {
  try {
    const schema = configManager.exportJsonSchema('./config-schema.json');
    console.log('\n📄 JSON Schema exported to: ./config-schema.json');
    
    // Also log a simplified version
    console.log('\n📋 Configuration Schema Summary:');
    console.log('   - application: Core app settings (name, version, environment, logLevel)');
    console.log('   - kong: Kong Konnect API configuration (token, region, timeouts)');
    console.log('   - tracing: LangSmith tracing settings (enabled, apiKey, project)');
    console.log('   - monitoring: Performance monitoring configuration');
    console.log('   - runtime: Bun/Node.js runtime settings');
  } catch (error: any) {
    console.log(`❌ Failed to export schema: ${error.message}`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--production-check')) {
    const safe = await runProductionSafetyCheck();
    process.exit(safe ? 0 : 1);
  }
  
  if (args.includes('--export-schema')) {
    await exportConfigSchema();
    return;
  }
  
  const result = await runConfigurationHealthCheck();
  
  if (args.includes('--export-schema')) {
    await exportConfigSchema();
  }
  
  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('Health check failed:', error);
    process.exit(1);
  });
}