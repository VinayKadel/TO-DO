# HabitTrack - Daily Habit Tracker

A production-ready, responsive habit tracking web application built with Next.js, featuring user authentication, daily task tracking in a grid layout, and deployment-ready configuration for Vercel.

![HabitTrack Screenshot](screenshot.png)

## ✨ Features

- **🔐 Secure Authentication**: Email/password authentication with NextAuth.js
- **📊 Habit Grid View**: Track daily habits with an intuitive grid layout
- **📱 Responsive Design**: Mobile-first design that works on all devices
- **✅ Daily Tracking**: Mark tasks as complete for any day
- **🎨 Customizable Tasks**: Choose colors for each task
- **💾 Persistent Storage**: SQLite database with Prisma ORM
- **🚀 Production Ready**: Optimized for Vercel deployment

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **Database**: SQLite with Prisma ORM
- **Icons**: Lucide React
- **Date Handling**: date-fns

## 📁 Project Structure

```
app/
├── prisma/
│   └── schema.prisma          # Database schema
├── public/
│   └── manifest.json          # PWA manifest
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # Auth API routes
│   │   │   ├── tasks/         # Tasks CRUD API
│   │   │   └── completions/   # Task completions API
│   │   ├── dashboard/         # Main dashboard page
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page (redirects)
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── auth/              # Auth components
│   │   ├── layout/            # Layout components
│   │   ├── providers/         # Context providers
│   │   ├── tasks/             # Task/habit components
│   │   └── ui/                # Reusable UI components
│   ├── lib/
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── date-utils.ts      # Date utility functions
│   │   ├── prisma.ts          # Prisma client singleton
│   │   └── utils.ts           # General utilities
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   └── middleware.ts          # Route protection middleware
├── .env.example               # Environment variables template
├── next.config.js             # Next.js configuration
├── tailwind.config.js         # Tailwind CSS configuration
└── package.json               # Project dependencies
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Local Development Setup

1. **Clone the repository**
   ```bash
   cd /path/to/TO-DO/app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set your values:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_SECRET="your-super-secret-key-change-this"
   NEXTAUTH_URL="http://localhost:3000"
   ```
   
   Generate a secure secret:
   ```bash
   openssl rand -base64 32
   ```

4. **Initialize the database**
   ```bash
   npx prisma db push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   Visit [http://localhost:3000](http://localhost:3000)

## 🌐 Deployment to Vercel

### Option 1: Vercel Dashboard (Recommended)

1. Push your code to a GitHub repository

2. Go to [vercel.com](https://vercel.com) and sign in

3. Click "New Project" and import your repository

4. Configure environment variables:
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL`: Your Vercel app URL (e.g., `https://your-app.vercel.app`)
   - `DATABASE_URL`: For production, use a hosted database (see below)

5. Click "Deploy"

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Database Options for Production

SQLite works for development but for production on Vercel, use one of these:

#### Vercel Postgres (Recommended)
1. In Vercel dashboard, go to Storage → Create Database
2. Select Postgres
3. Copy the `DATABASE_URL` to your environment variables
4. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

#### Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Go to Settings → Database → Connection string
3. Use the connection string as `DATABASE_URL`

#### PlanetScale
1. Create a database at [planetscale.com](https://planetscale.com)
2. Get the connection string from your dashboard
3. Update schema to use `mysql` provider

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `file:./dev.db` or PostgreSQL URL |
| `NEXTAUTH_SECRET` | Secret for JWT encryption | Random 32+ char string |
| `NEXTAUTH_URL` | Your app's base URL | `https://your-app.vercel.app` |

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
```

## 📱 Usage

1. **Register**: Create an account with email and password
2. **Login**: Sign in to access your dashboard
3. **Add Tasks**: Click "Add Task" to create a new habit to track
4. **Track Progress**: Click checkboxes to mark tasks complete for each day
5. **Navigate Dates**: Use arrows or "Today" button to navigate the calendar
6. **Edit/Delete Tasks**: Click on a task name to edit or delete it

## 🔒 Security Features

- Password hashing with bcrypt (12 rounds)
- JWT-based session management
- HTTP-only cookies for session storage
- Protected API routes with authentication checks
- User isolation - users can only access their own data
- Input validation with Zod

## 🎨 Customization

### Adding New Task Colors

Edit the `PRESET_COLORS` array in:
- `src/components/tasks/add-task-modal.tsx`
- `src/components/tasks/edit-task-modal.tsx`

### Changing the Date Range

Modify `daysToShow` in `src/components/tasks/habit-grid.tsx`

### Styling

All styles use Tailwind CSS. Modify:
- `tailwind.config.js` for theme customization
- `src/app/globals.css` for custom CSS

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using Next.js and Tailwind CSS
