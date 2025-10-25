-- Add missing get_pass_type_limits function
-- This function is required for the can_make_meeting_request function

CREATE OR REPLACE FUNCTION get_pass_type_limits(p_pass_type pass_type)
RETURNS TABLE(max_requests integer, max_boost numeric, daily_limit integer, weekly_limit integer, monthly_limit integer)
LANGUAGE plpgsql
AS $function$
BEGIN
    CASE p_pass_type
        WHEN 'vip' THEN
            RETURN QUERY SELECT 50, 1000.00, 10, 30, 50;
        WHEN 'business' THEN
            RETURN QUERY SELECT 20, 500.00, 5, 15, 20;
        WHEN 'general' THEN
            RETURN QUERY SELECT 5, 100.00, 2, 5, 5;
        ELSE
            RETURN QUERY SELECT 0, 0.00, 0, 0, 0;
    END CASE;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_pass_type_limits(pass_type) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pass_type_limits(pass_type) TO anon;

-- Add comment
COMMENT ON FUNCTION get_pass_type_limits(pass_type) IS 'Returns limits for different pass types';
