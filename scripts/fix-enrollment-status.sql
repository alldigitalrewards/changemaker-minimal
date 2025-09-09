-- Fix enrollment status from old Changemaker schema to new simplified schema
-- This script converts old enrollment status values to the new schema

-- Update ACTIVE to ENROLLED (active participants become enrolled)
UPDATE "Enrollment" 
SET "status" = 'ENROLLED' 
WHERE "status" = 'ACTIVE';

-- Update PENDING to INVITED (pending invitations become invited)
UPDATE "Enrollment" 
SET "status" = 'INVITED' 
WHERE "status" = 'PENDING';

-- Update COMPLETED to ENROLLED (completed challenges mean they were enrolled)
UPDATE "Enrollment" 
SET "status" = 'ENROLLED' 
WHERE "status" = 'COMPLETED';

-- Show current status distribution after update
SELECT 
    "status",
    COUNT(*) as count
FROM "Enrollment"
GROUP BY "status"
ORDER BY "status";