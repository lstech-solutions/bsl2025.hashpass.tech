# 🎫 Setup Edward Calderon Passes

## Step 1: Create the Passes Table

Go to your **Supabase Dashboard** → **SQL Editor** and run this SQL:

```sql
-- Create passes table
CREATE TABLE IF NOT EXISTS public.passes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    pass_type TEXT NOT NULL CHECK (pass_type IN ('general', 'vip', 'business')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
    purchase_date TIMESTAMPTZ DEFAULT NOW(),
    price_usd DECIMAL(10,2),
    access_features TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_passes_user_id ON public.passes(user_id);
CREATE INDEX IF NOT EXISTS idx_passes_event_id ON public.passes(event_id);
CREATE INDEX IF NOT EXISTS idx_passes_pass_type ON public.passes(pass_type);
CREATE INDEX IF NOT EXISTS idx_passes_status ON public.passes(status);

-- Enable RLS
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for passes
CREATE POLICY "Users can view their own passes" ON public.passes
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own passes" ON public.passes
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own passes" ON public.passes
    FOR UPDATE USING (user_id = auth.uid()::text);
```

## Step 2: Add Edward Calderon's Passes

After creating the table, run this SQL to add Edward Calderon with all 3 pass types:

```sql
-- Insert Edward Calderon's passes
INSERT INTO public.passes (id, user_id, event_id, pass_type, status, purchase_date, price_usd, access_features) VALUES
(
    'edward-calderon-unal-general-20250115',
    'edward-calderon-unal',
    'bsl2025',
    'general',
    'active',
    NOW(),
    99.00,
    ARRAY[
        'All conferences (Nov 12-14)',
        'Booth area access',
        'Networking sessions'
    ]
),
(
    'edward-calderon-unal-business-20250115',
    'edward-calderon-unal',
    'bsl2025',
    'business',
    'active',
    NOW(),
    249.00,
    ARRAY[
        'All conferences (Nov 12-14)',
        'Booth area access',
        'Exclusive networking zone (B2B speed dating)',
        'Official closing party (Nov 14)'
    ]
),
(
    'edward-calderon-unal-vip-20250115',
    'edward-calderon-unal',
    'bsl2025',
    'vip',
    'active',
    NOW(),
    499.00,
    ARRAY[
        'All conferences (Nov 12-14)',
        'Booth area access',
        'Exclusive networking zone (B2B speed dating)',
        'Welcome cocktail (Nov 12)',
        'VIP area access (exclusive networking with speakers, sponsors, authorities)',
        'Official closing party (Nov 14)'
    ]
);
```

## Step 3: Verify the Setup

After running both SQL scripts, verify the setup by running this query:

```sql
-- Verify Edward Calderon's passes
SELECT 
    pass_type,
    price_usd,
    status,
    array_length(access_features, 1) as feature_count,
    access_features
FROM public.passes 
WHERE user_id = 'edward-calderon-unal' 
AND event_id = 'bsl2025'
ORDER BY price_usd;
```

You should see 3 passes:
- **General Pass**: $99.00 (3 features)
- **Business Pass**: $249.00 (4 features)  
- **VIP Pass**: $499.00 (6 features)

## Step 4: Test in the App

1. **Start your development server**: `npm start` or `expo start`
2. **Navigate to the Explorer view** in your app
3. **You should see Edward Calderon's 3 passes** displayed with:
   - ✅ Color-coded pass type badges
   - ✅ Pricing information
   - ✅ Active status
   - ✅ Purchase date
   - ✅ Access features list with checkmark icons

## User Information

- **User ID**: `edward-calderon-unal`
- **Email**: `ecalderon@unal.edu.co`
- **Event**: `bsl2025`
- **All passes are ACTIVE status**

## API Test URL

Test the API endpoint directly:
```
http://localhost:3000/api/bslatam/user-passes?userId=edward-calderon-unal&eventId=bsl2025
```

This should return Edward Calderon's 3 passes in JSON format.

## Troubleshooting

If you don't see the passes in the app:

1. **Check the browser console** for any errors
2. **Verify the API endpoint** is working by visiting the test URL
3. **Check the database** using the verification query above
4. **Ensure the explorer view** is fetching from the correct user ID

The explorer view is now configured to fetch passes for `edward-calderon-unal` instead of the demo user.
