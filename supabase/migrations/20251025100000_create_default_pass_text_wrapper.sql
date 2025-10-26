-- Wrapper for create_default_pass to accept TEXT pass_type
-- This ensures RPC calls with text arguments resolve correctly.

-- Create an overloaded function that accepts TEXT and casts to enum
CREATE OR REPLACE FUNCTION public.create_default_pass(
    p_user_id UUID,
    p_pass_type TEXT DEFAULT 'general'
) RETURNS TEXT AS $$
BEGIN
    BEGIN
        RETURN public.create_default_pass(p_user_id, p_pass_type::public.pass_type);
    EXCEPTION WHEN OTHERS THEN
        -- Fallback to 'general' if cast fails
        RETURN public.create_default_pass(p_user_id, 'general'::public.pass_type);
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_default_pass(UUID, TEXT) IS 'Wrapper that casts TEXT to pass_type enum and calls the enum-based implementation.';
