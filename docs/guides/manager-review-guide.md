# Manager Review Guide

**Last Updated**: October 20, 2025
**Audience**: Workspace Managers
**Role**: MANAGER

---

## Welcome, Managers!

As a Manager in the Changemaker platform, you play a crucial role in reviewing and approving participant activity submissions for challenges you've been assigned to. This guide will help you understand your responsibilities and how to use the manager dashboard effectively.

---

## What is a Manager?

**Managers** are workspace members with special permissions to:
- Review activity submissions for assigned challenges
- Approve, reject, or request revisions on submissions
- Track participant progress on their assigned challenges
- Provide feedback to participants

**What Managers CANNOT do**:
- Access challenges they haven't been assigned to
- Change workspace settings
- Manage other users or assign managers
- Access challenges outside their workspace

---

## Getting Started

### 1. Accessing Your Dashboard

After logging in, navigate to:
```
https://changemaker.im/w/[workspace-slug]/manager/dashboard
```

Or use the sidebar navigation and click **"Manager Dashboard"**.

### 2. Dashboard Overview

Your dashboard shows:

**📊 Stats Cards**:
- **Assigned Challenges**: Total challenges you're managing
- **Pending Submissions**: Submissions awaiting your review
- **Approved This Week**: Submissions you approved in the last 7 days
- **Avg Review Time**: Your average time to review a submission

**⚠️ Pending Submissions Alert** (if any):
- Highlighted banner showing urgent submissions needing review
- Click "Review Now" to jump to submission list

**📋 Assigned Challenges List**:
- All challenges you're responsible for
- Each shows: Title, Date range, Pending submissions count
- Click any challenge to view its submissions

---

## Reviewing Submissions

### Step 1: Navigate to Submissions

**Option A**: From Dashboard
1. Click on a challenge in your "Assigned Challenges" list
2. You'll see all submissions for that challenge

**Option B**: Direct Link
```
/w/[workspace]/manager/challenges/[challenge-id]/submissions
```

### Step 2: Filter Submissions (Optional)

Use filters to narrow down submissions:
- **Status**: PENDING, MANAGER_APPROVED, NEEDS_REVISION, APPROVED, REJECTED
- **Date Range**: Last 7 days, Last 30 days, Custom range
- **Participant**: Search by name or email

### Step 3: Review a Submission

Click **"Review"** on any submission card to open the review dialog.

**Submission Details Include**:
- Participant name and email
- Activity title and description
- Submission content:
  - Text response (if provided)
  - Link URL (if provided)
  - Uploaded files (if any)
- Submitted date/time

### Step 4: Make Your Decision

You have three options:

#### ✅ **Approve**

Use when the submission meets all requirements.

**What happens**:
- If challenge has `requireAdminReapproval = false`:
  - Submission status → APPROVED
  - Reward issued immediately
  - Participant receives approval email
- If challenge has `requireAdminReapproval = true`:
  - Submission status → MANAGER_APPROVED
  - Admin receives notification for final approval
  - Participant receives email after admin approval

**Best Practices**:
- Verify all required elements are present
- Check photo/link quality if applicable
- Add positive feedback in notes ("Great work! Photo clearly shows...")
- Suggest point amount if admin re-approval is required

**Example Manager Notes**:
> "Excellent work! The photo clearly shows the completed task, and the written explanation demonstrates understanding. Recommend full 100 points."

---

#### ❌ **Reject**

Use when the submission is invalid or violates rules.

**What happens**:
- Submission status → REJECTED (final)
- Participant receives rejection email
- No reward issued
- Participant CANNOT resubmit (final decision)

**When to Reject**:
- Submission is fraudulent or dishonest
- Completely off-topic or irrelevant
- Violates workspace rules or policies

**Best Practices**:
- Explain clearly why the submission was rejected
- Be professional and constructive
- Consider "Needs Revision" instead if fixable

**Example Manager Notes**:
> "This submission does not meet the challenge requirements. The photo shows a different activity than requested, and the description does not match the task."

---

#### 🔄 **Needs Revision**

Use when submission has issues but can be fixed.

**What happens**:
- Submission status → NEEDS_REVISION
- Participant receives email with your feedback
- Participant can resubmit (new submission created)
- Original submission marked as "Needs Revision"

**When to Request Revision**:
- Photo is unclear or poor quality
- Missing required information
- Incomplete response
- Formatting issues

**Best Practices**:
- Be specific about what needs to change
- Provide actionable feedback
- Be encouraging and supportive
- Suggest how to fix the issue

**Example Manager Notes**:
> "The photo is too dark to clearly see the completed task. Please retake the photo in better lighting and ensure all elements are visible. Also, please add more detail in your written explanation (at least 2-3 sentences)."

---

### Step 5: Submit Your Review

1. Fill in **Manager Notes** (required)
   - Minimum 10 characters
   - Be clear and constructive
   - Add specific feedback

2. (Optional) **Points Recommendation**
   - Only if admin re-approval is required
   - Suggest point amount based on quality
   - Admin will make final decision

3. Click **"Submit Review"**
   - Confirmation message appears
   - Submission card updates immediately
   - Participant receives email notification

---

## Understanding Two-Stage Approval

Some challenges require **admin re-approval** after manager approval.

### How It Works

1. **You Approve** → Status becomes MANAGER_APPROVED
2. **Admin Notified** → Admin receives email
3. **Admin Reviews** → Admin makes final decision
4. **Final Status** → APPROVED or REJECTED
5. **Reward Issued** → Only after admin approval

### Why Two-Stage Approval?

Used for:
- High-value rewards (>$100)
- Sensitive or regulated challenges
- Challenges requiring executive approval
- New manager training period

### Your Role in Two-Stage

- Review submission thoroughly
- Add detailed notes for admin
- Recommend point amount
- Admin may override your decision (you'll be notified)

---

## Admin Overrides

Occasionally, an admin may override your approval decision.

**What happens**:
- You receive an email notification
- Submission status changes to admin's decision
- Both your notes and admin's notes are preserved
- ApprovalHistory records both decisions

**Why Overrides Happen**:
- Additional information discovered
- Policy clarification needed
- Quality control
- Budget constraints

**This is normal** and part of the quality assurance process. Overrides are rare and not a reflection on your performance.

---

## Best Practices for Managers

### ✅ DO

- **Review promptly**: Try to review within 24 hours
- **Be thorough**: Check all submission elements
- **Be specific**: Provide clear, actionable feedback
- **Be encouraging**: Recognize good work
- **Use "Needs Revision"**: Give participants a chance to fix minor issues
- **Document reasoning**: Explain your decision in notes
- **Recommend points**: Help admins with final decisions
- **Ask questions**: Contact admin if unsure about a submission

### ❌ DON'T

- **Rush reviews**: Take time to evaluate properly
- **Be vague**: "Needs work" is not helpful feedback
- **Reject fixable issues**: Use "Needs Revision" instead
- **Ignore context**: Consider participant's situation
- **Skip notes**: Always add detailed feedback
- **Approve incomplete work**: Maintain quality standards
- **Take it personally**: Admin overrides are part of the process

---

## Common Scenarios

### Scenario 1: Unclear Photo

**Submission**: Photo is blurry, can't verify completion

**Decision**: Needs Revision

**Manager Notes**:
> "The photo is too blurry to clearly verify the completed task. Please retake the photo with your camera focused and in good lighting. Make sure the [specific element] is clearly visible."

---

### Scenario 2: Excellent Work

**Submission**: All requirements met, high quality

**Decision**: Approve

**Manager Notes**:
> "Outstanding submission! You've clearly demonstrated understanding of the topic. The photo is clear, the written response is thorough, and you went above and beyond the requirements. Great work!"

---

### Scenario 3: Missing Information

**Submission**: Has photo but missing written explanation

**Decision**: Needs Revision

**Manager Notes**:
> "You've submitted a clear photo showing completion, but the written explanation is missing. Please add 2-3 sentences describing what you did and what you learned."

---

### Scenario 4: Wrong Activity

**Submission**: Shows a different activity than required

**Decision**: Reject

**Manager Notes**:
> "This submission shows completion of a different activity. The challenge requires [specific task], but your submission shows [what was actually submitted]. Please ensure you're completing the correct activity before submitting."

---

### Scenario 5: High-Value Submission (Admin Re-Approval)

**Submission**: Excellent work, worth 500 points

**Decision**: Approve (awaits admin)

**Manager Notes**:
> "Exceptional work on this high-value challenge. All requirements met and exceeded. Participant demonstrated deep understanding and provided comprehensive documentation. Recommend full 500 points."

**Points Recommendation**: 500

---

## Frequently Asked Questions

### Q: How long do I have to review a submission?

**A**: There's no hard deadline, but we recommend reviewing within 24 hours of submission. Participants appreciate timely feedback.

---

### Q: Can I change my review after submitting it?

**A**: No, reviews are final once submitted. If you made a mistake, contact a workspace admin who can override your decision.

---

### Q: What if I'm assigned to a challenge but don't know the requirements?

**A**: Click on the challenge title to view full details, including all activities and requirements. Contact the admin if still unclear.

---

### Q: Can I see submissions for challenges I'm not assigned to?

**A**: No, you can only view submissions for challenges you've been assigned to by an admin.

---

### Q: What happens if a participant resubmits after "Needs Revision"?

**A**: A new submission is created with status PENDING. You'll need to review the new submission separately.

---

### Q: How are points awarded?

**A**:
- **Direct approval** (no admin re-approval): Points awarded immediately when you approve
- **Admin re-approval required**: Admin sets final point amount, may differ from your recommendation

---

### Q: Can I assign other managers?

**A**: No, only workspace admins can assign or remove managers from challenges.

---

### Q: What if I disagree with an admin override?

**A**: Contact the workspace admin to discuss. They can explain the reasoning and clarify any policy questions.

---

### Q: Can participants see my manager notes?

**A**: Yes, manager notes are included in the email notification to participants. Always be professional and constructive.

---

### Q: How do I know if admin re-approval is required?

**A**: The review dialog shows a banner: **"This challenge requires admin re-approval. Your approval will be pending until an admin reviews."**

---

## Tips for Effective Management

### 🎯 Set Review Hours

Block dedicated time each day for reviews (e.g., 9-10am daily) to maintain consistency.

### 📝 Use Templates

Create personal note templates for common scenarios:
- Standard approval
- Photo quality issues
- Missing information
- Exceptional work

### 📊 Track Your Stats

Monitor your dashboard metrics:
- Keep average review time under 6 hours
- Maintain consistent approval standards
- Review pending submissions daily

### 🤝 Communicate with Admins

- Ask questions about unclear requirements
- Report patterns (multiple participants struggling with same activity)
- Suggest improvements to challenge descriptions

### 🎓 Continuous Improvement

- Learn from admin overrides
- Read feedback from participants
- Attend manager training sessions (if offered)

---

## Getting Help

### Support Resources

- **Admin Contact**: Contact your workspace admin via email or in-app messaging
- **Help Center**: [help.changemaker.im](https://help.changemaker.im)
- **Manager Training**: Ask admin about upcoming training sessions

### Report Issues

If you encounter technical issues:
1. Take a screenshot
2. Note the error message
3. Contact admin or support team
4. Include: Workspace name, Challenge ID, Submission ID

---

## Conclusion

Thank you for being a Manager! Your role is critical in maintaining quality standards, providing valuable feedback, and helping participants succeed in their challenges.

**Remember**:
- Be thorough but timely
- Be constructive and encouraging
- Be clear and specific in your feedback
- Reach out to admins when you need help

Happy reviewing! 🎉

---

## Related Documentation

- [Manager API Endpoints](../api/manager-endpoints.md) - Technical API documentation
- [Manager Role Schema](../schema/manager-role.md) - Database schema
- [Manager Role Runbook](../deployment/manager-role-runbook.md) - Admin deployment guide

---

*This guide is maintained in `docs/guides/manager-review-guide.md` and should be updated when the manager workflow changes.*
