import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

/**
 * Automated tests that detect and suggest fixes for button visibility issues
 */

test.describe('Button Fix Detection', () => {
  test('scan and report all button issues with suggested fixes', async ({ page }) => {
    const pages = ['/', '/workspaces', '/auth/login', '/auth/signup'];
    const allIssues = [];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      const issues = await page.evaluate((currentPath) => {
        const problems = [];
        const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"]');
        
        buttons.forEach((button, index) => {
          const btn = button as HTMLElement;
          const rect = btn.getBoundingClientRect();
          const styles = window.getComputedStyle(btn);
          const parent = btn.parentElement;
          const parentStyles = parent ? window.getComputedStyle(parent) : null;
          
          const issue: any = {
            page: currentPath,
            index: index,
            element: btn.tagName.toLowerCase(),
            text: btn.textContent?.trim() || btn.getAttribute('aria-label') || 'No text',
            class: btn.className,
            id: btn.id,
            problems: [],
            suggestedFixes: [],
          };
          
          // Check for zero dimensions
          if (rect.width === 0 || rect.height === 0) {
            issue.problems.push('Zero dimensions');
            issue.suggestedFixes.push({
              problem: 'Zero width/height',
              css: `
/* Fix for button: "${issue.text}" */
.${btn.className.split(' ')[0] || 'button'} {
  min-width: 44px; /* Minimum touch target */
  min-height: 44px;
  padding: 8px 16px;
}`,
            });
          }
          
          // Check for opacity issues
          if (parseFloat(styles.opacity) === 0) {
            issue.problems.push('Zero opacity');
            issue.suggestedFixes.push({
              problem: 'Invisible due to opacity',
              css: `
/* Fix opacity for: "${issue.text}" */
.${btn.className.split(' ')[0] || 'button'} {
  opacity: 1 !important;
}`,
            });
          }
          
          // Check for display none
          if (styles.display === 'none') {
            issue.problems.push('Display none');
            issue.suggestedFixes.push({
              problem: 'Hidden with display:none',
              css: `
/* Show button: "${issue.text}" */
.${btn.className.split(' ')[0] || 'button'} {
  display: inline-block !important;
}`,
            });
          }
          
          // Check for visibility hidden
          if (styles.visibility === 'hidden') {
            issue.problems.push('Visibility hidden');
            issue.suggestedFixes.push({
              problem: 'Hidden with visibility',
              css: `
/* Make visible: "${issue.text}" */
.${btn.className.split(' ')[0] || 'button'} {
  visibility: visible !important;
}`,
            });
          }
          
          // Check for text color matching background
          const color = styles.color;
          const bgColor = styles.backgroundColor;
          if (color === bgColor && color !== 'rgba(0, 0, 0, 0)') {
            issue.problems.push('Text color matches background');
            issue.suggestedFixes.push({
              problem: 'No contrast between text and background',
              css: `
/* Fix contrast for: "${issue.text}" */
.${btn.className.split(' ')[0] || 'button'} {
  color: var(--foreground);
  background-color: var(--primary);
}`,
            });
          }
          
          // Check if button is positioned off-screen
          if (rect.right < 0 || rect.left > window.innerWidth || 
              rect.bottom < 0 || rect.top > window.innerHeight) {
            issue.problems.push('Positioned off-screen');
            issue.suggestedFixes.push({
              problem: 'Button positioned outside viewport',
              css: `
/* Reset position for: "${issue.text}" */
.${btn.className.split(' ')[0] || 'button'} {
  position: relative !important;
  top: auto !important;
  left: auto !important;
  right: auto !important;
  bottom: auto !important;
  transform: none !important;
}`,
            });
          }
          
          // Check for negative z-index
          const zIndex = parseInt(styles.zIndex) || 0;
          if (zIndex < 0) {
            issue.problems.push('Negative z-index');
            issue.suggestedFixes.push({
              problem: 'Hidden behind other elements',
              css: `
/* Fix z-index for: "${issue.text}" */
.${btn.className.split(' ')[0] || 'button'} {
  z-index: 1 !important;
}`,
            });
          }
          
          // Check parent visibility
          if (parentStyles) {
            if (parentStyles.display === 'none' || parentStyles.visibility === 'hidden') {
              issue.problems.push('Parent element is hidden');
              issue.suggestedFixes.push({
                problem: 'Parent container is hidden',
                css: `
/* Show parent container of: "${issue.text}" */
.${parent?.className.split(' ')[0] || 'parent'} {
  display: block !important;
  visibility: visible !important;
}`,
              });
            }
          }
          
          // Only add to problems if issues were found
          if (issue.problems.length > 0) {
            problems.push(issue);
          }
        });
        
        return problems;
      }, pagePath);
      
      allIssues.push(...issues);
    }
    
    // Generate a comprehensive fix file
    if (allIssues.length > 0) {
      const cssFixFile = `/* Generated CSS fixes for button visibility issues */
/* Add this to your global CSS or component styles */

${allIssues.map(issue => 
  issue.suggestedFixes.map((fix: any) => fix.css).join('\n')
).join('\n')}

/* Generic button visibility fixes */
button:not([aria-hidden="true"]) {
  min-width: 44px;
  min-height: 44px;
  opacity: 1 !important;
  visibility: visible !important;
}

/* Ensure buttons in cards are visible */
.card button,
[class*="card"] button {
  display: inline-flex !important;
  opacity: 1 !important;
  visibility: visible !important;
}

/* Fix for floating action buttons */
button[class*="fixed"],
button[class*="absolute"] {
  z-index: 50 !important;
}

/* Ensure form buttons are visible */
form button[type="submit"],
form input[type="submit"] {
  display: inline-block !important;
  opacity: 1 !important;
  visibility: visible !important;
  min-width: 80px;
  min-height: 40px;
}
`;
      
      // Write the fix file
      await fs.writeFile(
        path.join(process.cwd(), 'button-visibility-fixes.css'),
        cssFixFile
      );
      
      // Generate a detailed report
      const report = {
        totalIssues: allIssues.length,
        byPage: pages.map(p => ({
          page: p,
          issues: allIssues.filter(i => i.page === p).length,
        })),
        problems: allIssues.map(i => ({
          page: i.page,
          button: i.text,
          problems: i.problems,
        })),
      };
      
      await fs.writeFile(
        path.join(process.cwd(), 'button-issues-report.json'),
        JSON.stringify(report, null, 2)
      );
      
      console.log('Button Issues Report:', report);
      console.log('CSS fixes generated in: button-visibility-fixes.css');
    }
    
    // Test assertion - we expect no issues in production
    expect(allIssues.length, 
      `Found ${allIssues.length} button visibility issues. Check button-issues-report.json for details.`
    ).toBe(0);
  });

  test('verify button accessibility attributes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const accessibilityIssues = await page.evaluate(() => {
      const issues = [];
      const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"]');
      
      buttons.forEach((button) => {
        const btn = button as HTMLElement;
        const text = btn.textContent?.trim();
        const ariaLabel = btn.getAttribute('aria-label');
        const ariaLabelledBy = btn.getAttribute('aria-labelledby');
        const title = btn.getAttribute('title');
        
        // Check if button has accessible text
        if (!text && !ariaLabel && !ariaLabelledBy && !title) {
          issues.push({
            type: 'no-accessible-text',
            element: btn.outerHTML.substring(0, 100),
            fix: 'Add aria-label or text content to button',
          });
        }
        
        // Check for proper ARIA attributes on icon-only buttons
        if ((!text || text.length === 0) && !ariaLabel) {
          issues.push({
            type: 'icon-button-no-label',
            element: btn.outerHTML.substring(0, 100),
            fix: 'Add aria-label for icon-only buttons',
          });
        }
        
        // Check if disabled buttons have proper attributes
        if (btn.hasAttribute('disabled') && !btn.getAttribute('aria-disabled')) {
          issues.push({
            type: 'disabled-without-aria',
            text: text || 'No text',
            fix: 'Add aria-disabled="true" to disabled buttons',
          });
        }
      });
      
      return issues;
    });
    
    if (accessibilityIssues.length > 0) {
      console.log('Accessibility issues found:', accessibilityIssues);
    }
    
    expect(accessibilityIssues.length).toBe(0);
  });
});