-- Clean up duplicate passes for Edward Calderon
-- Keep only the most recent VIP pass and remove duplicates

DO $$
DECLARE
    edward_user_id text := '13e93d3b-0556-4f0d-a065-1f013019618b';
    latest_pass_id text;
    pass_count integer;
BEGIN
    -- Count current passes
    SELECT COUNT(*) INTO pass_count
    FROM public.passes
    WHERE user_id::text = edward_user_id
      AND event_id = 'bsl2025'
      AND status = 'active';
    
    RAISE NOTICE 'Found % active passes for Edward', pass_count;
    
    -- Get the most recent pass ID
    SELECT id INTO latest_pass_id
    FROM public.passes
    WHERE user_id::text = edward_user_id
      AND event_id = 'bsl2025'
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    RAISE NOTICE 'Keeping pass: %', latest_pass_id;
    
    -- Delete all other passes (keep only the most recent one)
    DELETE FROM public.passes
    WHERE user_id::text = edward_user_id
      AND event_id = 'bsl2025'
      AND status = 'active'
      AND id != latest_pass_id;
    
    -- Get final count
    SELECT COUNT(*) INTO pass_count
    FROM public.passes
    WHERE user_id::text = edward_user_id
      AND event_id = 'bsl2025'
      AND status = 'active';
    
    RAISE NOTICE 'After cleanup: % active passes remaining', pass_count;
    
    -- Show the remaining pass details
    RAISE NOTICE 'Remaining pass details:';
    FOR pass_count IN 
        SELECT id, pass_number, pass_type, created_at
        FROM public.passes
        WHERE user_id::text = edward_user_id
          AND event_id = 'bsl2025'
          AND status = 'active'
    LOOP
        RAISE NOTICE 'Pass: % - % (%)', pass_count.id, pass_count.pass_number, pass_count.pass_type;
    END LOOP;
    
END $$;

-- Verify the cleanup
SELECT 
    id,
    pass_number,
    pass_type,
    status,
    created_at
FROM public.passes
WHERE user_id::text = '13e93d3b-0556-4f0d-a065-1f013019618b'
  AND event_id = 'bsl2025'
ORDER BY created_at DESC;
