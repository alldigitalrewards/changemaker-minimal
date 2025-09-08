import { test, expect } from '@playwright/test';

/**
 * Simple button visibility test - focused on finding invisible buttons
 */

test.describe('Simple Button Tests', () => {
  test('check homepage for invisible buttons', async ({ page }) => {
    // Navigate to homepage with timeout
    await page.goto('/', { timeout: 10000 });
    
    // Simple check for buttons
    const buttons = await page.$$eval('button, [role="button"], input[type="submit"]', (elements) => {
      return elements.map(el => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        
        return {
          text: el.textContent?.trim() || el.getAttribute('aria-label') || 'No text',
          visible: rect.width > 0 && rect.height > 0 && styles.opacity !== '0' && styles.visibility !== 'hidden',
          width: rect.width,
          height: rect.height,
          opacity: styles.opacity,
          visibility: styles.visibility,
          display: styles.display,
        };
      });
    });
    
    const invisibleButtons = buttons.filter(b => !b.visible);
    
    if (invisibleButtons.length > 0) {
      console.log('Invisible buttons found:', invisibleButtons);
    }
    
    // Just log the results, don't fail
    console.log(`Found ${buttons.length} buttons total, ${invisibleButtons.length} are invisible`);
  });
});