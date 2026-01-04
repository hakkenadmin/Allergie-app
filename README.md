# Allergie App

A freemium web application for managing allergies, built with Next.js, Supabase, and deployed on Vercel. Users can use the app immediately as guests (with localStorage) or sign up for free to unlock premium features like cloud sync across devices.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase
- **Deployment**: Vercel
- **Code Storage**: GitHub

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- A GitHub account
- A Vercel account

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Allergie-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Create a `.env.local` file in the root directory
   - Add your Supabase credentials:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_key
     OPENAI_API_KEY=your_openai_api_key
     ```
   - You can find these in your Supabase project settings under API:
     - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
     - **Publishable key** (anon/public key) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - For OpenAI API key (required for PDF to CSV conversion):
     - Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
     - Create a new API key
     - Add it as `OPENAI_API_KEY` in your `.env.local` file

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your Project URL and anon/public key
4. Add them to your `.env.local` file

### Database Schema Setup

1. Go to your Supabase project SQL Editor
2. Run the SQL script from `SUPABASE_SCHEMA.sql` file
3. This will create the `user_allergies` table with proper Row Level Security (RLS) policies

### Enable Email Authentication

1. Go to Authentication > Providers in your Supabase dashboard
2. Enable the Email provider
3. Configure email settings (you can use Supabase's default templates)

### Generating TypeScript Types

To generate TypeScript types from your Supabase database schema:

```bash
# Using Supabase CLI (recommended)
npx supabase gen types typescript --project-id <your-project-id> > src/types/database.types.ts

# Or if using local Supabase
supabase gen types typescript --local > src/types/database.types.ts
```

## Deployment to Vercel

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Import your repository in Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. **Add environment variables in Vercel dashboard**
   - Go to Project Settings > Environment Variables
   - Add the following:
     - `NEXT_PUBLIC_SUPABASE_URL` (your Supabase project URL)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (your Supabase publishable/anon key)

4. **Deploy!**
   - Vercel will automatically deploy on every push to your main branch

## Features

### Guest Mode (No Sign-up Required)
- ✅ Add, view, and manage allergies
- ✅ Store data locally in browser (localStorage)
- ✅ Works offline
- ✅ Basic allergy management features

### Premium Features (Free Sign-up)
- ✅ Cloud sync across all devices
- ✅ Data backup and recovery
- ✅ Access from multiple devices
- ✅ Export allergy data
- ✅ Advanced analytics (coming soon)
- ✅ Reminders and notifications (coming soon)
- ✅ Share with doctor (coming soon)

## Project Structure

```
Allergie-app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout with AuthProvider
│   │   ├── page.tsx            # Home page with full UI
│   │   └── globals.css         # Global styles
│   ├── components/             # React components
│   │   ├── AllergySelector.tsx # Main allergy management UI
│   │   ├── AuthForm.tsx        # Sign up/sign in form
│   │   ├── UserProfile.tsx     # User profile display
│   │   ├── PremiumBanner.tsx   # Promotional banner for guests
│   │   ├── GuestIndicator.tsx  # Guest mode status indicator
│   │   └── PremiumFeatures.tsx # Feature comparison list
│   ├── contexts/               # React contexts
│   │   └── AuthContext.tsx     # Authentication context
│   ├── hooks/                  # Custom React hooks
│   │   └── useAllergies.ts     # Allergy management hook
│   ├── lib/                    # Utility functions
│   │   ├── storage.ts          # localStorage operations
│   │   ├── features.ts         # Feature flags system
│   │   ├── services/           # Business logic services
│   │   │   └── allergyService.ts # Allergy service with dual storage
│   │   └── supabase/           # Supabase client setup
│   │       ├── client.ts       # Client-side Supabase client
│   │       └── server.ts       # Server-side Supabase client
│   └── types/                  # TypeScript type definitions
│       └── database.types.ts   # Generated Supabase types
├── public/                     # Static assets
├── SUPABASE_SCHEMA.sql         # Database schema SQL script
├── .env.local                  # Environment variables (not in git)
├── next.config.js              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
└── vercel.json                 # Vercel deployment config
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## How It Works

### Dual Storage System
- **localStorage**: Always saves data locally for offline access (works for all users)
- **Supabase**: Syncs to cloud for authenticated users only
- **Automatic Fallback**: If Supabase fails, data is still saved locally

### Data Migration
When a guest user signs up, their local allergy data is automatically migrated to their cloud account.

### Authentication Flow
1. Users can start using the app immediately as guests
2. Guest data is stored in localStorage
3. Users can sign up anytime (free)
4. Upon signup, guest data automatically syncs to Supabase
5. Authenticated users get cloud sync and premium features

## Usage Examples

### Using Authentication

```typescript
import { useAuth } from '@/contexts/AuthContext'

function MyComponent() {
  const { user, isGuest, signIn, signOut } = useAuth()
  
  // Check if user is authenticated
  if (isGuest) {
    // Guest mode
  }
}
```

### Managing Allergies

```typescript
import { useAllergies } from '@/hooks/useAllergies'

function AllergyManager() {
  const { allergies, addAllergy, removeAllergy, syncing } = useAllergies()
  
  // Add an allergy
  await addAllergy({
    name: 'Peanuts',
    severity: 'severe',
    notes: 'Causes anaphylaxis'
  })
}
```

### Checking Feature Availability

```typescript
import { getFeatureFlags } from '@/lib/features'
import { useAuth } from '@/contexts/AuthContext'

function Features() {
  const { isGuest } = useAuth()
  const features = getFeatureFlags(!isGuest)
  
  if (features.cloudSync) {
    // Cloud sync is available
  }
}
```

## License

MIT

