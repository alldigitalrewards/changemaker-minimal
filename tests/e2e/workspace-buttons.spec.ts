import { test, expect } from '@playwright/test';

/**
 * Tests specifically for workspace-related button visibility issues
 */

test.describe('Workspace Button Visibility', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication if needed
    // This is a placeholder - adjust based on your auth setup
    await page.goto('/auth/login');
  });

  test('check challenge page buttons visibility', async ({ page }) => {
    // Navigate to a workspace challenges page
    await page.goto('/w/test-workspace/admin/challenges');
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Check for common button issues
    const buttonIssues = await page.evaluate(() => {
      const issues = [];
      
      // Check "Create Challenge" button
      const createButtons = document.querySelectorAll('button:has-text("Create"), button:has-text("Add"), button:has-text("New")');
      createButtons.forEach((btn) => {
        const styles = window.getComputedStyle(btn as HTMLElement);
        const rect = (btn as HTMLElement).getBoundingClientRect();
        
        if (rect.width === 0 || rect.height === 0 || styles.opacity === '0') {
          issues.push({
            type: 'invisible-create-button',
            text: btn.textContent,
            styles: {
              width: rect.width,
              height: rect.height,
              opacity: styles.opacity,
              display: styles.display,
            },
          });
        }
      });
      
      // Check edit/delete buttons in challenge cards
      const actionButtons = document.querySelectorAll('[class*="challenge"] button, [class*="card"] button');
      actionButtons.forEach((btn) => {
        const htmlBtn = btn as HTMLElement;
        const isVisible = htmlBtn.offsetWidth > 0 && htmlBtn.offsetHeight > 0;
        
        if (!isVisible) {
          issues.push({
            type: 'invisible-action-button',
            text: htmlBtn.textContent,
            parent: htmlBtn.parentElement?.className,
          });
        }
      });
      
      return issues;
    });
    
    // Report any issues found
    if (buttonIssues.length > 0) {
      console.error('Button visibility issues found:', buttonIssues);
    }
    
    expect(buttonIssues.length).toBe(0);
  });

  test('verify floating action buttons are visible', async ({ page }) => {
    await page.goto('/w/test-workspace/participant/challenges');
    await page.waitForLoadState('networkidle');
    
    // Check for floating action buttons (FABs)
    const fabIssues = await page.evaluate(() => {
      const issues = [];
      const fabs = document.querySelectorAll('[class*="fixed"], [class*="absolute"]');
      
      fabs.forEach((element) => {
        const htmlEl = element as HTMLElement;
        
        // Check if it contains a button
        const hasButton = htmlEl.querySelector('button') || htmlEl.tagName === 'BUTTON';
        
        if (hasButton) {
          const rect = htmlEl.getBoundingClientRect();
          const styles = window.getComputedStyle(htmlEl);
          
          // Check if positioned outside viewport
          const isOffscreen = 
            rect.bottom < 0 ||
            rect.top > window.innerHeight ||
            rect.right < 0 ||
            rect.left > window.innerWidth;
          
          if (isOffscreen) {
            issues.push({
              type: 'offscreen-fab',
              position: { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom },
              class: htmlEl.className,
            });
          }
          
          // Check z-index issues
          const zIndex = parseInt(styles.zIndex) || 0;
          if (zIndex < 0) {
            issues.push({
              type: 'negative-z-index',
              zIndex: zIndex,
              class: htmlEl.className,
            });
          }
        }
      });
      
      return issues;
    });
    
    expect(fabIssues.length,
      `Found FAB issues: ${JSON.stringify(fabIssues, null, 2)}`
    ).toBe(0);
  });

  test('check modal and dialog buttons', async ({ page }) => {
    await page.goto('/w/test-workspace/admin/challenges');
    await page.waitForLoadState('networkidle');
    
    // Try to trigger modals/dialogs
    const buttons = await page.locator('button:visible').all();
    
    for (const button of buttons) {
      const text = await button.textContent();
      
      // Click buttons that might open modals
      if (text && (text.includes('Edit') || text.includes('Delete') || text.includes('Create'))) {
        await button.click();
        
        // Wait a bit for modal to appear
        await page.waitForTimeout(500);
        
        // Check for modal buttons
        const modalButtons = await page.evaluate(() => {
          const issues = [];
          const modals = document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="dialog"]');
          
          modals.forEach((modal) => {
            const buttons = modal.querySelectorAll('button');
            buttons.forEach((btn) => {
              const rect = btn.getBoundingClientRect();
              const styles = window.getComputedStyle(btn);
              
              if (rect.width === 0 || rect.height === 0 || styles.opacity === '0') {
                issues.push({
                  text: btn.textContent,
                  inModal: true,
                  visibility: {
                    width: rect.width,
                    height: rect.height,
                    opacity: styles.opacity,
                  },
                });
              }
            });
          });
          
          return issues;
        });
        
        if (modalButtons.length > 0) {
          console.error(`Modal button issues for "${text}" trigger:`, modalButtons);
        }
        
        // Close modal if open
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }
    }
  });

  test('responsive button visibility', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' },
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const hiddenButtons = await page.evaluate((viewportName) => {
        const buttons = document.querySelectorAll('button, [role="button"]');
        const hidden = [];
        
        buttons.forEach((button) => {
          const htmlBtn = button as HTMLElement;
          const rect = htmlBtn.getBoundingClientRect();
          const styles = window.getComputedStyle(htmlBtn);
          
          // Check various hiding conditions
          const isHidden = 
            rect.width === 0 ||
            rect.height === 0 ||
            styles.display === 'none' ||
            styles.visibility === 'hidden' ||
            parseFloat(styles.opacity) === 0 ||
            // Check if button is pushed outside viewport
            rect.right < 0 ||
            rect.left > window.innerWidth;
          
          if (isHidden) {
            hidden.push({
              viewport: viewportName,
              text: htmlBtn.textContent?.trim() || 'No text',
              class: htmlBtn.className,
              position: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              },
            });
          }
        });
        
        return hidden;
      }, viewport.name);
      
      if (hiddenButtons.length > 0) {
        console.error(`Hidden buttons at ${viewport.name} (${viewport.width}x${viewport.height}):`, hiddenButtons);
      }
      
      expect(hiddenButtons.length).toBe(0);
    }
  });
});