-- Fix service role grants to ensure RLS bypass works in tests
-- This ensures the service role can bypass ALL RLS policies

-- Grant all privileges on all tables in public schema to service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Ensure future tables/sequences/functions also get these grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- Ensure service_role can bypass RLS
ALTER ROLE service_role SET row_security TO 'off';

-- Verify by showing all table grants
SELECT tablename, array_agg(privilege_type) as privileges
FROM information_schema.table_privileges
WHERE grantee = 'service_role'
  AND table_schema = 'public'
GROUP BY tablename
ORDER BY tablename;
