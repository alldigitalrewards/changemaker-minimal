
  Implementation Plan for Challenge Creation Page

1. Create New Page /app/w/[slug]/admin/challenges/new/page.tsx

- Full-page form with proper spacing
- Room for future enhancements (dates, categories, etc.)
- Better mobile experience
- Consistent with edit page pattern

2. Update Challenges List Page /app/w/[slug]/admin/challenges/page.tsx

- Remove modal code (lines ~180-240)
- Remove modal state management (lines ~30-35)
- Change "Create Challenge" button to navigate to /w/[slug]/admin/challenges/new
- Remove handleCreateChallenge function

3. Create API Route /app/api/workspaces/[slug]/challenges/route.ts

- Already exists for GET (list challenges)
- Add POST handler for creating new challenges
- Include validation and error handling

4. New Page Features

- Similar layout to edit page for consistency
- Form validation with character limits
- Loading states during submission
- Success redirect to /w/[slug]/admin/challenges/[id] after creation
- Cancel button returns to challenges list
- Breadcrumb navigation

  Benefits of This Approach:

- Consistent UX: Same pattern as edit (which already works well)
- Scalable: Easy to add fields later (dates, tags, participant limits)
- Mobile-friendly: No modal issues with keyboards and scrolling
- Bookmarkable: Users can save/share the creation URL
- Better navigation: Clear back/forward browser history
