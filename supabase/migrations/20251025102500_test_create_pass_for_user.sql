-- One-off test to create default pass for a specific user
-- Safe to keep; it will do nothing on reapply since pass will already exist

DO $$
DECLARE
  v_pass_id TEXT;
BEGIN
  BEGIN
    SELECT create_default_pass('4105b97f-928f-4155-9472-ef8942b8f3da'::uuid, 'general') INTO v_pass_id;
    RAISE NOTICE 'Test created/returned pass id: %', v_pass_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Test create_default_pass failed: %', SQLERRM;
  END;
END;
$$;
