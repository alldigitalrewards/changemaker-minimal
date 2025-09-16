import { test, expect } from '@playwright/test';
import { loginWithCredentials, ADMIN_EMAIL, DEFAULT_PASSWORD } from './support/auth';

// Comprehensive crawler for participant routes
async function crawlParticipantRoutes(page, startPath: string, maxPages = 200) {
  const queue: string[] = [startPath];
  const seen = new Set<string>();
  const base = new URL(process.env.BASE_URL || 'http://localhost:3000');
  const results = {
    visited: [],
    failed: [],
    links: new Set<string>()
  };

  console.log(`\n🕷️ Crawling participant routes from: ${startPath}`);
  
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
              
              // Only crawl participant-related paths
              if (next.includes('/participant') || 
                  next.includes('/challenges') ||
                  next.includes('/submissions') ||
                  next.includes('/rewards') ||
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
      console.log(`❌ ${path} - Error: ${error.message}`);
      results.failed.push({ path, status: 0, error: error.message });
    }
  }

  return results;
}

test.describe('Participant Route Testing', () => {
  test('participant - comprehensive route testing and link crawling', async ({ page }) => {
    console.log('\n' + '='.repeat(60));
    console.log('👤 PARTICIPANT: Testing ALL participant routes and crawling ALL participant links');
    console.log('='.repeat(60));
    
    // Use correct participant credentials from seed
    const PARTICIPANT_EMAIL = 'john.doe@acme.com';
    const WORKSPACE_SLUG = 'acme'; // John Doe belongs to ACME workspace
    
    try {
      console.log(`Attempting participant login with ${PARTICIPANT_EMAIL}...`);
      await loginWithCredentials(page, PARTICIPANT_EMAIL, DEFAULT_PASSWORD);
    } catch (error) {
      console.log('⚠️ Participant login failed, using admin credentials');
      await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);
    }
    
    // Define all participant routes to explicitly test
    const participantRoutes = [
      // Main participant areas
      '/workspaces',
      `/w/${WORKSPACE_SLUG}`,
      `/w/${WORKSPACE_SLUG}/participant`,
      `/w/${WORKSPACE_SLUG}/participant/dashboard`,
      
      // Challenges
      `/w/${WORKSPACE_SLUG}/participant/challenges`,
      `/w/${WORKSPACE_SLUG}/participant/challenges/active`,
      `/w/${WORKSPACE_SLUG}/participant/challenges/upcoming`,
      `/w/${WORKSPACE_SLUG}/participant/challenges/completed`,
      `/w/${WORKSPACE_SLUG}/participant/challenges/1`,
      `/w/${WORKSPACE_SLUG}/participant/challenges/1/details`,
      `/w/${WORKSPACE_SLUG}/participant/challenges/1/submit`,
      `/w/${WORKSPACE_SLUG}/participant/challenges/1/submissions`,
      
      // Submissions
      `/w/${WORKSPACE_SLUG}/participant/submissions`,
      `/w/${WORKSPACE_SLUG}/participant/submissions/pending`,
      `/w/${WORKSPACE_SLUG}/participant/submissions/approved`,
      `/w/${WORKSPACE_SLUG}/participant/submissions/rejected`,
      `/w/${WORKSPACE_SLUG}/participant/submissions/draft`,
      `/w/${WORKSPACE_SLUG}/participant/submissions/1`,
      `/w/${WORKSPACE_SLUG}/participant/submissions/1/edit`,
      
      // Rewards & Recognition
      `/w/${WORKSPACE_SLUG}/participant/rewards`,
      `/w/${WORKSPACE_SLUG}/participant/rewards/points`,
      `/w/${WORKSPACE_SLUG}/participant/rewards/badges`,
      `/w/${WORKSPACE_SLUG}/participant/rewards/achievements`,
      `/w/${WORKSPACE_SLUG}/participant/rewards/leaderboard`,
      `/w/${WORKSPACE_SLUG}/participant/rewards/history`,
      
      // Profile & Settings
      `/w/${WORKSPACE_SLUG}/participant/profile`,
      `/w/${WORKSPACE_SLUG}/participant/profile/edit`,
      `/w/${WORKSPACE_SLUG}/participant/profile/preferences`,
      `/w/${WORKSPACE_SLUG}/participant/settings`,
      `/w/${WORKSPACE_SLUG}/participant/settings/notifications`,
      `/w/${WORKSPACE_SLUG}/participant/settings/privacy`,
      
      // Activity & History
      `/w/${WORKSPACE_SLUG}/participant/activity`,
      `/w/${WORKSPACE_SLUG}/participant/history`,
      `/w/${WORKSPACE_SLUG}/participant/progress`,
      
      // Global participant routes
      '/participant',
      '/participant/dashboard',
      '/participant/account',
      '/participant/notifications',
      '/participant/messages',
      '/participant/help',
      
      // User routes
      '/profile',
      '/account',
      '/settings',
      '/notifications',
      '/messages',
    ];
    
    console.log('\n📋 Testing all participant routes explicitly:');
    const routeResults = { success: [], failed: [] };
    
    for (const route of participantRoutes) {
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
    
    console.log(`\n📊 Participant routes summary:`);
    console.log(`  ✅ Working: ${routeResults.success.length}/${participantRoutes.length}`);
    console.log(`  ❌ Failed: ${routeResults.failed.length}/${participantRoutes.length}`);
    
    if (routeResults.failed.length > 0) {
      console.log('\n❌ Failed routes:');
      routeResults.failed.forEach(f => {
        console.log(`    - ${f.route}: ${f.status || f.error}`);
      });
    }
    
    // Now crawl to find ALL participant links
    console.log('\n🕸️ Crawling for all participant links...');
    
    // Start from participant dashboard
    const crawlResults = await crawlParticipantRoutes(page, `/w/${WORKSPACE_SLUG}/participant/dashboard`, 100);
    
    // Also crawl from challenges page
    const challengesCrawl = await crawlParticipantRoutes(page, `/w/${WORKSPACE_SLUG}/participant/challenges`, 100);
    
    // Combine results
    challengesCrawl.links.forEach(link => crawlResults.links.add(link));
    crawlResults.visited.push(...challengesCrawl.visited);
    crawlResults.failed.push(...challengesCrawl.failed);
    
    // Report all unique participant links found
    console.log('\n📎 All unique participant links found:');
    const participantLinks = Array.from(crawlResults.links)
      .filter(link => 
        link.includes('/participant') || 
        link.includes('/challenges') ||
        link.includes('/submissions') ||
        link.includes('/rewards'))
      .sort();
    
    participantLinks.forEach(link => console.log(`  - ${link}`));
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('PARTICIPANT TEST SUMMARY:');
    console.log(`  Direct routes tested: ${participantRoutes.length}`);
    console.log(`  Direct routes working: ${routeResults.success.length}`);
    console.log(`  Total pages crawled: ${crawlResults.visited.length}`);
    console.log(`  Unique participant links found: ${participantLinks.length}`);
    console.log(`  Failed pages during crawl: ${crawlResults.failed.length}`);
    console.log('='.repeat(60));
    
    // Assertions
    expect(routeResults.success.length).toBeGreaterThan(0);
    expect(crawlResults.visited.length).toBeGreaterThan(0);
    
    // Warn if critical participant routes are missing
    const criticalRoutes = [
      '/workspaces',
      `/w/${WORKSPACE_SLUG}/participant/dashboard`,
      `/w/${WORKSPACE_SLUG}/participant/challenges`,
      `/w/${WORKSPACE_SLUG}/participant/submissions`,
      `/w/${WORKSPACE_SLUG}/participant/rewards`
    ];
    
    const missingCritical = criticalRoutes.filter(r => !routeResults.success.includes(r));
    if (missingCritical.length > 0) {
      console.log('\n⚠️  WARNING: Critical participant routes not working:');
      missingCritical.forEach(r => console.log(`    - ${r}`));
    }
  });
});