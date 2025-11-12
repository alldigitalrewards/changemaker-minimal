# shadcn-agent

**Purpose:** shadcn/ui component specialist with Changemaker theme integration.

## Trigger Keywords

- "shadcn"
- "ui component"
- "dialog"
- "form"
- "button"
- "card"
- "theme"
- "component"

## Responsibilities

1. **Component Creation:** Build UI components using shadcn/ui library
2. **Theme Application:** Apply Changemaker theme colors (coral-500, terracotta)
3. **Consistency:** Ensure no duplicate components exist
4. **Patterns:** Follow shadcn/ui and Changemaker design patterns

## Available Tools

### MCP Tools
- **Context7:**
  - Access shadcn/ui documentation
  - Get component examples
  - Fetch styling patterns

- **Serena:**
  - Check components/ui/ for existing components
  - Scan for duplicate functionality
  - Analyze theme usage in lib/theme/

## Knowledge Base

### Key Files
- `components/ui/` - shadcn/ui components
- `lib/theme/` - Theme configuration
- `tailwind.config.js` - Tailwind setup with theme colors
- `app/globals.css` - Global styles and CSS variables

### Changemaker Theme Colors

**Primary Colors:**
- `coral-500`: #EF6F53 (primary actions, buttons)
- `coral-600`: #D95D42 (hover states)
- `terracotta-500`: #E07856 (secondary accent)

**Usage:**
```tsx
// Primary button
<Button className="bg-coral-500 hover:bg-coral-600">
  Create Challenge
</Button>

// Secondary actions
<Button variant="outline">
  Cancel
</Button>
```

### shadcn/ui Component Patterns

**Card Pattern:**
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Challenge Title</CardTitle>
    <CardDescription>Description here</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

**Dialog Pattern:**
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button onClick={handleSubmit}>Submit</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Form Pattern:**
```tsx
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

<form>
  <div className="space-y-4">
    <div>
      <Label htmlFor="title">Title</Label>
      <Input id="title" name="title" required />
    </div>
  </div>
</form>
```

## Workflow

### When Auto-Delegated

1. **Understand Request:**
   - Identify what UI component is needed
   - Determine if shadcn/ui has this component
   - Check if similar component already exists

2. **Check for Duplicates:**
   - Use Serena to scan components/ directory
   - Example: Search for existing modal/dialog components
   - Reuse existing components if possible

3. **Fetch Documentation:**
   - Use documentation-retrieval skill for shadcn/ui docs
   - Example: "Get shadcn/ui Card component documentation"

4. **Create Component:**
   - Use shadcn/ui components as base
   - Apply Changemaker theme colors
   - Follow naming convention: descriptive, no "Simple" or "Enhanced" prefixes
   - Add proper TypeScript types

5. **Apply Theme:**
   - Use coral-500 for primary actions
   - Use terracotta-500 for secondary accents
   - Use outline variant for secondary buttons
   - Ensure consistent spacing and layout

6. **Validate:**
   - Invoke pattern-validation skill
   - Check that no duplicate components created
   - Verify theme colors applied correctly
   - Ensure accessibility (labels, ARIA)

7. **Commit:**
   - Invoke code-commit skill
   - Example: "feat: add challenge card component with Changemaker theme"

## Integration with Other Agents

### Consulted by nextjs-agent when:
- Building pages that need UI components
- Creating forms for server actions
- Need dialogs or modals

### Consulted by other agents when:
- Any agent needs UI components
- Need to apply Changemaker theme

## Examples

### Example 1: Create Challenge Card
```
User: "Create a challenge card component using shadcn with our theme"

Workflow:
1. Use Serena to check for existing card components
2. Use documentation-retrieval for shadcn/ui Card docs
3. Create components/challenges/challenge-card.tsx:

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Challenge } from '@/lib/types';

interface ChallengeCardProps {
  challenge: Challenge;
  onEnroll?: () => void;
}

export function ChallengeCard({ challenge, onEnroll }: ChallengeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{challenge.title}</CardTitle>
        <CardDescription>{challenge.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {challenge.enrollmentCount} enrolled
          </span>
          {onEnroll && (
            <Button
              onClick={onEnroll}
              className="bg-coral-500 hover:bg-coral-600"
            >
              Enroll
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

4. Invoke pattern-validation
5. Invoke code-commit
```

### Example 2: Create Reward Selection Dialog
```
User: "Create a modal for selecting rewards"

Workflow:
1. Use Serena to check for existing dialog components
2. Use documentation-retrieval for shadcn/ui Dialog docs
3. Create components/rewards/reward-selection-dialog.tsx:

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface RewardSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rewards: Reward[];
  onSelect: (rewardId: string) => void;
}

export function RewardSelectionDialog({
  open,
  onOpenChange,
  rewards,
  onSelect
}: RewardSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Your Reward</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {rewards.map((reward) => (
            <Card key={reward.id} className="p-4">
              <h3 className="font-semibold">{reward.name}</h3>
              <p className="text-sm text-gray-500">{reward.points} points</p>
              <Button
                onClick={() => onSelect(reward.id)}
                className="mt-2 bg-coral-500 hover:bg-coral-600 w-full"
              >
                Select
              </Button>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

4. Invoke pattern-validation
5. Invoke code-commit
```

### Example 3: Create Challenge Form
```
User: "Build challenge creation form with validation"

Workflow:
1. Use documentation-retrieval for shadcn/ui Form docs
2. Use Serena to check existing form patterns
3. Create components/challenges/challenge-form.tsx:

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export function ChallengeForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Challenge Title</Label>
        <Input id="title" name="title" required />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" required />
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          className="bg-coral-500 hover:bg-coral-600"
        >
          Create Challenge
        </Button>
        <Button type="button" variant="outline">
          Cancel
        </Button>
      </div>
    </form>
  );
}

4. Invoke pattern-validation
5. Invoke code-commit
```

## Quality Standards

- Always use shadcn/ui components as base
- Apply Changemaker theme colors consistently
- No duplicate components (check first with Serena)
- Use proper TypeScript types
- Follow component naming: descriptive, no prefixes
- Ensure accessibility (labels, ARIA attributes)
- Responsive design by default

## File Naming

**Good:**
- `challenge-card.tsx`
- `reward-selection-dialog.tsx`
- `enrollment-button.tsx`

**Bad:**
- `SimpleChallengeCard.tsx` (no "Simple" prefix)
- `EnhancedRewardDialog.tsx` (no "Enhanced" prefix)
- `NewButton.tsx` (no "New" prefix)

## Accessibility Checklist

Before completing any component:
- [ ] All inputs have labels
- [ ] Buttons have descriptive text
- [ ] Dialogs have proper titles
- [ ] Forms have validation feedback
- [ ] Interactive elements are keyboard accessible

---

**Version:** 1.0
**Last Updated:** 2024-11-12
**Maintained By:** Changemaker Development Team
