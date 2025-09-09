-- Fix any existing 'active' status values that don't match our enum
-- This migration handles case-insensitive 'active' values and converts them to 'ENROLLED'

DO $$
BEGIN
    -- Update any 'active' status (case-insensitive) to 'ENROLLED'
    UPDATE "Enrollment" 
    SET status = 'ENROLLED'
    WHERE LOWER(status) = 'active';
    
    -- Log how many records were updated
    RAISE NOTICE 'Updated % enrollment records from active to ENROLLED', ROW_COUNT;
    
EXCEPTION WHEN OTHERS THEN
    -- If the update fails, log the error but don't fail the migration
    RAISE NOTICE 'Could not update active status values: %', SQLERRM;
END $$;