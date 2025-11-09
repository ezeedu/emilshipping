# 🚀 Emil Shipping - Supabase Setup Guide

## Step 1: Create Supabase Project

1. **Go to [supabase.com](https://supabase.com)**
2. **Sign up or Sign in** to your account
3. **Click "New Project"**
4. **Fill in project details:**
   - Organization: Choose or create one
   - Name: `Emil Shipping`
   - Database Password: Choose a strong password (save it!)
   - Region: Choose closest to your users
5. **Click "Create new project"**
6. **Wait 2-3 minutes** for the project to be ready

## Step 2: Set Up Database Schema

1. **Go to your Supabase Dashboard**
2. **Click on "SQL Editor" in the left sidebar**
3. **Click "New Query"**
4. **Copy and paste the entire content** from `supabase-schema.sql`
5. **Click "Run"** to execute the schema
6. **Verify tables were created** by going to "Table Editor"

You should see these tables:
- `shipments` - Stores package tracking data
- `admin_users` - Stores admin login credentials  
- `contact_messages` - Stores contact form submissions

## Step 3: Get Your Supabase Credentials

1. **Go to "Settings" → "API"** in your Supabase dashboard
2. **Copy the following values:**

### Project URL
```
https://your-project-id.supabase.co
```

### API Keys
- **anon/public key** (for frontend)
- **service_role key** (for backend - keep this secret!)

## Step 4: Update Environment Variables

Update your `.env` file with the real values:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here

# Resend Configuration (optional for now)
RESEND_API_KEY=your_resend_api_key

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Company Information
COMPANY_NAME=Emil Shipping
COMPANY_EMAIL=info@emilshipping.com
COMPANY_PHONE=+1-555-0123
TRACKING_URL_BASE=http://localhost:3000/track
```

## Step 5: Test the Connection

1. **Stop the current mock server** (if running)
2. **Start the real server:** `node server.js`
3. **Test tracking with sample IDs:**
   - `ES001234567` (Delivered)
   - `ES001234568` (In Transit)
   - `ES001234569` (Pending)

## Step 6: Admin Access

**Default admin credentials:**
- Email: `admin@emilshipping.com`
- Password: `admin123`

⚠️ **Important:** Change the admin password in production!

## Step 7: Verify Everything Works

### Test Package Tracking:
1. Go to `/track`
2. Enter: `ES001234567`
3. Should show delivery timeline

### Test Admin Dashboard:
1. Go to `/signin`
2. Login with admin credentials
3. Should see package management interface

### Test Package Creation:
1. Use admin dashboard to create new package
2. Check if tracking ID is generated
3. Verify package appears in database

## 🔧 Troubleshooting

### Common Issues:

**"Invalid supabaseUrl" Error:**
- Check your `SUPABASE_URL` in `.env`
- Make sure it starts with `https://`
- No trailing slash

**"supabaseKey is required" Error:**
- Check your `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- Make sure you're using the service role key, not anon key

**Database Connection Issues:**
- Verify your project is active in Supabase dashboard
- Check if RLS policies are properly set up
- Ensure schema was executed successfully

**Package Not Found:**
- Check if sample data was inserted
- Verify tracking ID format matches

## 🎯 Next Steps

Once Supabase is working:
1. Set up Resend for email notifications
2. Test all functionality thoroughly
3. Deploy to production
4. Update admin password
5. Configure custom domain (optional)

## 📞 Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Check the server terminal for error messages
3. Verify all environment variables are set correctly
4. Ensure Supabase project is active and accessible