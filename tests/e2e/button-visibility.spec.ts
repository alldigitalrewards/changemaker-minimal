import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive tests for detecting invisible button issues
 * Focuses on finding buttons that are visually hidden but still in DOM
 */

test.describe('Button Visibility Tests', () => {
  test('detect all invisible buttons on homepage', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Find all button elements including those with button role
    const buttons = await page.locator('button, [role="button"], input[type="button"], input[type="submit"]').all();
    
    const invisibleButtons = [];
    
    for (const button of buttons) {
      const isVisible = await button.isVisible();
      const boundingBox = await button.boundingBox();
      const computedStyle = await button.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          position: styles.position,
          zIndex: styles.zIndex,
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          width: styles.width,
          height: styles.height,
          overflow: styles.overflow,
          clip: styles.clip,
          clipPath: styles.clipPath,
        };
      });
      
      // Check for various invisibility conditions
      const isInvisible = 
        !isVisible ||
        !boundingBox ||
        boundingBox.width === 0 ||
        boundingBox.height === 0 ||
        computedStyle.display === 'none' ||
        computedStyle.visibility === 'hidden' ||
        parseFloat(computedStyle.opacity) === 0 ||
        (computedStyle.clip && computedStyle.clip !== 'auto') ||
        (computedStyle.clipPath && computedStyle.clipPath !== 'none');
      
      if (isInvisible) {
        const text = await button.textContent();
        const html = await button.evaluate(el => el.outerHTML);
        const parentClass = await button.evaluate(el => el.parentElement?.className || '');
        
        invisibleButtons.push({
          text: text?.trim() || 'No text',
          html: html.substring(0, 200),
          parentClass,
          styles: computedStyle,
          boundingBox,
        });
      }
    }
    
    // Log all invisible buttons found
    if (invisibleButtons.length > 0) {
      console.log('Found invisible buttons:', invisibleButtons);
    }
    
    // Test should fail if invisible buttons are found
    expect(invisibleButtons.length, 
      `Found ${invisibleButtons.length} invisible buttons: ${JSON.stringify(invisibleButtons, null, 2)}`
    ).toBe(0);
  });

  test('check button contrast and visibility issues', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const buttons = await page.locator('button, [role="button"]').all();
    const lowContrastButtons = [];
    
    for (const button of buttons) {
      const contrast = await button.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const rgb = styles.color.match(/\d+/g);
        const bgRgb = styles.backgroundColor.match(/\d+/g);
        
        if (!rgb || !bgRgb) return null;
        
        // Calculate relative luminance
        const getLuminance = (r: number, g: number, b: number) => {
          const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        };
        
        const l1 = getLuminance(parseInt(rgb[0]), parseInt(rgb[1]), parseInt(rgb[2]));
        const l2 = getLuminance(parseInt(bgRgb[0]), parseInt(bgRgb[1]), parseInt(bgRgb[2]));
        
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        
        return (lighter + 0.05) / (darker + 0.05);
      });
      
      // WCAG AA requires 4.5:1 for normal text
      if (contrast && contrast < 4.5) {
        const text = await button.textContent();
        lowContrastButtons.push({
          text: text?.trim() || 'No text',
          contrastRatio: contrast,
        });
      }
    }
    
    expect(lowContrastButtons.length,
      `Found ${lowContrastButtons.length} buttons with insufficient contrast: ${JSON.stringify(lowContrastButtons, null, 2)}`
    ).toBe(0);
  });

  test('detect buttons hidden by CSS transforms or positioning', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const hiddenButtons = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"]');
      const hidden = [];
      
      buttons.forEach((button) => {
        const rect = button.getBoundingClientRect();
        const styles = window.getComputedStyle(button);
        
        // Check if button is positioned outside viewport
        const isOffscreen = 
          rect.bottom < 0 ||
          rect.top > window.innerHeight ||
          rect.right < 0 ||
          rect.left > window.innerWidth;
        
        // Check for negative text-indent (common hiding technique)
        const hasNegativeIndent = parseInt(styles.textIndent) < -9999;
        
        // Check for transform that moves element offscreen
        const transform = styles.transform;
        const hasHidingTransform = 
          transform.includes('translateX(-9999') ||
          transform.includes('translateY(-9999') ||
          transform.includes('scale(0');
        
        if (isOffscreen || hasNegativeIndent || hasHidingTransform) {
          hidden.push({
            text: button.textContent?.trim() || 'No text',
            position: { top: rect.top, left: rect.left },
            transform: transform,
            textIndent: styles.textIndent,
          });
        }
      });
      
      return hidden;
    });
    
    expect(hiddenButtons.length,
      `Found ${hiddenButtons.length} buttons hidden by positioning: ${JSON.stringify(hiddenButtons, null, 2)}`
    ).toBe(0);
  });

  test('check all workspace pages for invisible buttons', async ({ page }) => {
    // Test paths that might have button issues
    const paths = [
      '/',
      '/workspaces',
      '/auth/login',
      '/auth/signup',
    ];
    
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      
      const invisibleButtons = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"]');
        const invisible = [];
        
        buttons.forEach((button) => {
          const htmlButton = button as HTMLElement;
          const rect = htmlButton.getBoundingClientRect();
          const styles = window.getComputedStyle(htmlButton);
          const isInvisible = 
            rect.width === 0 ||
            rect.height === 0 ||
            styles.display === 'none' ||
            styles.visibility === 'hidden' ||
            parseFloat(styles.opacity) === 0;
          
          if (isInvisible) {
            invisible.push({
              path: window.location.pathname,
              text: htmlButton.textContent?.trim() || 'No text',
              class: htmlButton.className,
              id: htmlButton.id,
            });
          }
        });
        
        return invisible;
      });
      
      expect(invisibleButtons.length,
        `Found invisible buttons on ${path}: ${JSON.stringify(invisibleButtons, null, 2)}`
      ).toBe(0);
    }
  });
});

test.describe('Interactive Button Tests', () => {
  test('verify all visible buttons are clickable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const buttons = await page.locator('button:visible, [role="button"]:visible').all();
    const unclickableButtons = [];
    
    for (const button of buttons) {
      try {
        // Check if button is enabled and clickable
        const isEnabled = await button.isEnabled();
        const isVisible = await button.isVisible();
        
        if (isVisible && !isEnabled) {
          const text = await button.textContent();
          unclickableButtons.push({
            text: text?.trim() || 'No text',
            reason: 'disabled',
          });
        }
        
        // Check if button is covered by another element
        const isCovered = await button.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const topElement = document.elementFromPoint(centerX, centerY);
          return topElement !== el && !el.contains(topElement);
        });
        
        if (isCovered) {
          const text = await button.textContent();
          unclickableButtons.push({
            text: text?.trim() || 'No text',
            reason: 'covered by another element',
          });
        }
      } catch (error) {
        // Button might have disappeared or changed
        continue;
      }
    }
    
    expect(unclickableButtons.length,
      `Found ${unclickableButtons.length} unclickable buttons: ${JSON.stringify(unclickableButtons, null, 2)}`
    ).toBe(0);
  });

  test('check for duplicate or overlapping buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const overlappingButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]')) as HTMLElement[];
      const overlapping = [];
      
      for (let i = 0; i < buttons.length; i++) {
        const rect1 = buttons[i].getBoundingClientRect();
        
        for (let j = i + 1; j < buttons.length; j++) {
          const rect2 = buttons[j].getBoundingClientRect();
          
          // Check if buttons overlap
          const overlap = !(
            rect1.right < rect2.left ||
            rect1.left > rect2.right ||
            rect1.bottom < rect2.top ||
            rect1.top > rect2.bottom
          );
          
          if (overlap && rect1.width > 0 && rect1.height > 0 && rect2.width > 0 && rect2.height > 0) {
            overlapping.push({
              button1: buttons[i].textContent?.trim() || 'No text',
              button2: buttons[j].textContent?.trim() || 'No text',
              positions: {
                button1: { top: rect1.top, left: rect1.left },
                button2: { top: rect2.top, left: rect2.left },
              },
            });
          }
        }
      }
      
      return overlapping;
    });
    
    expect(overlappingButtons.length,
      `Found ${overlappingButtons.length} overlapping buttons: ${JSON.stringify(overlappingButtons, null, 2)}`
    ).toBe(0);
  });
});