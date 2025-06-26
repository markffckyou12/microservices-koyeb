# Database Setup Guide

## 🗄️ Setting Up PostgreSQL Database with Supabase

### Step 1: Create Supabase Account
1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with your GitHub account
4. Create a new organization (if prompted)

### Step 2: Create New Project
1. Click "New Project"
2. Choose your organization
3. Enter project details:
   - **Name**: `login-app-db`
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
4. Click "Create new project"
5. Wait for setup to complete (2-3 minutes)

### Step 3: Get Database Connection String
1. Go to **Settings** → **Database**
2. Scroll down to **Connection string**
3. Copy the **URI** connection string
4. It will look like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

### Step 4: Update Environment Variables
1. Go to **Settings** → **API**
2. Copy the **anon public** key (you'll need this later)
3. Update your `.env` file with the new database URL

### Step 5: Run Database Migrations
```bash
cd login-app/backend
npx prisma db push
```

### Step 6: Test the Connection
```bash
npm run dev
```

## 🔧 Alternative: Railway Database

If Supabase doesn't work, try Railway:
1. Go to [https://railway.app](https://railway.app)
2. Sign up with GitHub
3. Create new project
4. Add PostgreSQL database
5. Copy connection string
6. Update `.env` file

## 🔧 Alternative: Neon Database

Another free option:
1. Go to [https://neon.tech](https://neon.tech)
2. Sign up with GitHub
3. Create new project
4. Copy connection string
5. Update `.env` file

## 📝 Environment Variables Needed

Update your `login-app/backend/.env` file:

```env
# Database (replace with your actual connection string)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# JWT Secrets (generate new ones for production)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"

# JWT Expiration
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5174"
```

## 🚀 After Database Setup

1. **Test locally**:
   ```bash
   cd login-app/backend
   npm run dev
   ```

2. **Deploy backend to Vercel**:
   - Add environment variables in Vercel dashboard
   - Deploy backend as serverless functions

3. **Test registration**:
   - Go to your deployed frontend
   - Try registering a new user
   - Check if it works!

## 🆘 Need Help?

If you get stuck:
1. Check the Supabase dashboard for connection issues
2. Verify your `.env` file has the correct DATABASE_URL
3. Make sure you ran `npx prisma db push`
4. Check the backend logs for errors 