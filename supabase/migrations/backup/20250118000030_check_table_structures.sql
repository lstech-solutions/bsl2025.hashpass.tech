-- Check the actual structure of meeting_requests and meetings tables
-- This will help us understand what columns exist

-- Get meeting_requests table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'meeting_requests' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Get meetings table structure  
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'meetings' 
AND table_schema = 'public'
ORDER BY ordinal_position;
