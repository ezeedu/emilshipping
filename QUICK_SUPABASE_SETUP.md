# 🚀 Quick Supabase Setup - Emil Shipping

## Option 1: Automated Setup (Recommended)

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/Sign in
3. Click "New Project"
4. Fill in details and wait for project to be ready

### Step 2: Get Your Credentials
1. Go to **Settings → API** in your Supabase dashboard
2. Copy these 3 values:
   - **Project URL** (https://xxx.supabase.co)
   - **anon/public key**
   - **service_role key**

### Step 3: Run Automated Setup
```bash
node setup-supabase.js
```

The script will:
- ✅ Ask for your Supabase credentials
- ✅ Update your .env file automatically
- ✅ Test the connection
- ✅ Insert sample data
- ✅ Create admin user

### Step 4: Create Database Tables
1. Go to your **Supabase Dashboard → SQL Editor**
2. Click **"New Query"**
3. Copy and paste the entire content from `supabase-schema.sql`
4. Click **"Run"**

### Step 5: Test Your App
1. Stop the mock server (if running)
2. Run: `node server.js`
3. Test tracking: `ES001234567`, `ES001234568`, `ES001234569`
4. Admin login: `admin@emilshipping.com` / `admin123`

---

## Option 2: Manual Setup

If you prefer manual setup, follow the detailed guide in `SUPABASE_SETUP_GUIDE.md`

---

## 🔧 Troubleshooting

**"Table doesn't exist" error:**
- Make sure you ran the SQL schema in Step 4

**"Invalid credentials" error:**
- Double-check your Project URL and Service Role Key
- Make sure your project is active

**Connection failed:**
- Verify your Supabase project is running
- Check your internet connection
- Ensure you're using the service role key (not anon key)

---

## 🎯 What You Get

After setup:
- ✅ Real database with 3 sample packages
- ✅ Admin dashboard with login
- ✅ Package tracking system
- ✅ Contact form storage
- ✅ Email notifications (when Resend is configured)

The automated setup takes **less than 5 minutes**!