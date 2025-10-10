import { test, expect, Page } from '@playwright/test';
import { loginWithCredentials, ADMIN_EMAIL, DEFAULT_PASSWORD } from './support/auth';

interface CrawlResult {
  path: string;
  status: number;
  error?: string;
}

interface CrawlResults {
  visited: CrawlResult[];
  failed: CrawlResult[];
  links: Set<string>;
}

// Comprehensive crawler for admin routes
async function crawlAdminRoutes(page: Page, startPath: string, maxPages = 200): Promise<CrawlResults> {
  const queue: string[] = [startPath];
  const seen = new Set<string>();
  const base = new URL(process.env.BASE_URL || 'http://localhost:3000');
  const results: CrawlResults = {
    visited: [],
    failed: [],
    links: new Set<string>()
  };

  console.log(`\n🕷️ Crawling admin routes from: ${startPath}`);
  
  while (queue.length && seen.size < maxPages) {
    const path = queue.shift()!;
    if (seen.has(path)) continue;
    seen.add(path);

    try {
      const resp = await page.goto(base.origin + path, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      if (resp && resp.ok()) {
        console.log(`✅ ${path} - ${resp.status()}`);
        results.visited.push({ path, status: resp.status() });
        
        // Find ALL links on the page
        const links = await page.evaluate(() => {
          const allLinks = new Set<string>();
          
          // Get all <a> tags
          document.querySelectorAll('a[href]').forEach(a => {
            const href = (a as HTMLAnchorElement).getAttribute('href');
            if (href) allLinks.add(href);
          });
          
          // Get all Next.js Link components
          document.querySelectorAll('[href]').forEach(el => {
            const href = el.getAttribute('href');
            if (href) allLinks.add(href);
          });
          
          return Array.from(allLinks);
        });
        
        // Process found links
        for (const href of links) {
          results.links.add(href);
          
          // Skip external and special links
          if (href.startsWith('#') || 
              href.startsWith('mailto:') || 
              href.startsWith('tel:') ||
              href.startsWith('http://') ||
              (href.startsWith('https://') && !href.includes(base.hostname))) {
            continue;
          }
          
          // Process relative links
          try {
            const u = new URL(href, base);
            if (u.origin === base.origin) {
              const next = u.pathname + (u.search || '');
              
              // Only crawl admin-related paths
              if (next.includes('/admin') || 
                  next.includes('/workspaces') || 
                  next.startsWith('/w/')) {
                if (!seen.has(next)) queue.push(next);
              }
            }
          } catch {}
        }
      } else {
        console.log(`❌ ${path} - ${resp?.status() || 'No response'}`);
        results.failed.push({ 
          path, 
          status: resp?.status() || 0,
          error: resp?.statusText() || 'No response'
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${path} - Error: ${errorMessage}`);
      results.failed.push({ path, status: 0, error: errorMessage });
    }
  }

  return results;
}

test.describe('Admin Route Testing', () => {
  test('admin - comprehensive route testing and link crawling', async ({ page }) => {
    // Increase timeout for this comprehensive crawl test
    test.setTimeout(120000); // 2 minutes
    console.log('\n' + '='.repeat(60));
    console.log('🔐 ADMIN: Testing admin routes that actually exist');
    console.log('='.repeat(60));

    // Login as admin (jfelke has access to alldigitalrewards and acme)
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);
    const WORKSPACE_SLUG = 'alldigitalrewards'; // Admin's primary workspace

    // Define only routes that actually exist (based on file structure)
    const adminRoutes = [
      // Workspace management
      '/workspaces',

      // Workspace-specific admin routes
      `/w/${WORKSPACE_SLUG}/admin/dashboard`,

      // Challenge management
      `/w/${WORKSPACE_SLUG}/admin/challenges`,
      `/w/${WORKSPACE_SLUG}/admin/challenges/new`,

      // Participant management
      `/w/${WORKSPACE_SLUG}/admin/participants`,

      // Settings & other admin pages
      `/w/${WORKSPACE_SLUG}/admin/settings`,
      `/w/${WORKSPACE_SLUG}/admin/profile`,
      `/w/${WORKSPACE_SLUG}/admin/emails`,
      `/w/${WORKSPACE_SLUG}/admin/invites`,
      `/w/${WORKSPACE_SLUG}/admin/points`,
      `/w/${WORKSPACE_SLUG}/admin/activity-templates`,

      // Global routes
      '/account',
    ];
    
    console.log('\n📋 Testing all admin routes explicitly:');
    const routeResults: {
      success: string[];
      failed: Array<{ route: string; status?: string | number; error?: string }>
    } = { success: [], failed: [] };

    for (const route of adminRoutes) {
      try {
        const resp = await page.goto(route, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        if (resp && resp.ok()) {
          console.log(`  ✅ ${route} - ${resp.status()}`);
          routeResults.success.push(route);
        } else {
          const status = resp?.status() || 'No response';
          console.log(`  ❌ ${route} - ${status}`);
          routeResults.failed.push({ route, status });
        }
      } catch (error) {
        console.log(`  ❌ ${route} - Timeout/Error`);
        routeResults.failed.push({ route, error: 'Timeout' });
      }
    }

    console.log(`\n📊 Admin routes summary:`);
    console.log(`  ✅ Working: ${routeResults.success.length}/${adminRoutes.length}`);
    console.log(`  ❌ Failed: ${routeResults.failed.length}/${adminRoutes.length}`);

    if (routeResults.failed.length > 0) {
      console.log('\n❌ Failed routes:');
      routeResults.failed.forEach(f => {
        console.log(`    - ${f.route}: ${f.status || f.error}`);
      });
    }
    
    // Now crawl to find ALL admin links (with reduced scope to avoid timeouts)
    console.log('\n🕸️ Crawling for all admin links...');
    const crawlResults = await crawlAdminRoutes(page, '/workspaces', 30);

    // Crawl from admin dashboard too (limited scope)
    const dashboardCrawl = await crawlAdminRoutes(page, `/w/${WORKSPACE_SLUG}/admin/dashboard`, 30);

    // Combine results
    dashboardCrawl.links.forEach(link => crawlResults.links.add(link));
    crawlResults.visited.push(...dashboardCrawl.visited);
    crawlResults.failed.push(...dashboardCrawl.failed);

    // Report all unique admin links found
    console.log('\n📎 All unique admin links found:');
    const adminLinks = Array.from(crawlResults.links)
      .filter(link =>
        link.includes('/admin') ||
        link.includes('/workspaces') ||
        link.startsWith('/w/'))
      .sort();

    adminLinks.forEach(link => console.log(`  - ${link}`));

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('ADMIN TEST SUMMARY:');
    console.log(`  Direct routes tested: ${adminRoutes.length}`);
    console.log(`  Direct routes working: ${routeResults.success.length}`);
    console.log(`  Total pages crawled: ${crawlResults.visited.length}`);
    console.log(`  Unique admin links found: ${adminLinks.length}`);
    console.log(`  Failed pages during crawl: ${crawlResults.failed.length}`);
    console.log('='.repeat(60));

    // Assertions
    expect(routeResults.success.length).toBeGreaterThan(0);
    expect(crawlResults.visited.length).toBeGreaterThan(0);

    // Require critical admin routes to work
    const criticalRoutes: string[] = [
      '/workspaces',
      `/w/${WORKSPACE_SLUG}/admin/dashboard`,
      `/w/${WORKSPACE_SLUG}/admin/challenges`,
      `/w/${WORKSPACE_SLUG}/admin/participants`
    ];

    const missingCritical = criticalRoutes.filter(r => !routeResults.success.includes(r));
    if (missingCritical.length > 0) {
      console.log('\n❌ ERROR: Critical admin routes not working:');
      missingCritical.forEach(r => console.log(`    - ${r}`));
    }
    expect(missingCritical.length).toBe(0);
  });
});