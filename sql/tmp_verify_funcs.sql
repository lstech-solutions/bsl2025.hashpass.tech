-- Verify functions and types exist
SELECT 'funcs' AS section;
SELECT n.nspname AS schema, p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('create_default_pass','get_pass_type_limits','handle_new_user')
ORDER BY schema, proname;

SELECT 'types' AS section;
SELECT t.typname, string_agg(e.enumlabel, ',') AS labels
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('pass_type','pass_status')
GROUP BY t.typname
ORDER BY t.typname;

SELECT 'tables' AS section;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('passes','pass_request_limits')
ORDER BY table_name;
