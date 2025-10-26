-- Auto-create default pass when a new user signs up
-- Creates trigger on auth.users to call create_default_pass('general')

-- Trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_pass_id TEXT;
BEGIN
    BEGIN
        SELECT create_default_pass(NEW.id, 'general') INTO v_pass_id;
        RAISE NOTICE 'Created default pass % for new user %', v_pass_id, NEW.id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to create default pass for user %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates a default pass for new users on insert into auth.users.';

-- Ensure trigger is (re)created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grants (allow RPC contexts to see/execute if needed)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;
