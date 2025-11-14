-- Add default UUID generator to Workspace.id column
ALTER TABLE "Workspace"
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
