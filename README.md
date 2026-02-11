# AI Genius Lab

A comprehensive online learning management system built for modern education. Deliver courses, track progress, issue certificates, and manage payments through a single, powerful platform.

![Next.js](https://img.shields.io/badge/Next.js-16.1.4-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)
![Prisma](https://img.shields.io/badge/Prisma-7.3.0-2D3748)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)

## Overview

AI Genius Lab is a production-ready learning management system designed for educational institutions, training organizations, and content creators. The platform handles everything from course creation to payment processing, with built-in analytics and certificate generation. Built with a focus on scalability, security, and maintainability.

## Core Capabilities

### Course Management
- Structured course creation with sections and lessons
- Support for video, audio, PDF, and document content
- Drag-and-drop content organization with DnD Kit
- Category-based course organization with dynamic categories
- Learning path creation for guided curricula
- Course inventory management with stock tracking
- Bulk course operations and management
- Course preview and draft modes

### Blog System
- Admin management for blog posts
- Public blog with slug-based routing
- Tagging system for better content organization
- Review system for blog posts with ratings
- Draft and publish workflows
- Read time estimation and view counting

### Subscription System
- Flexible subscription plans with multiple tiers (Starter, Pro, Elite)
- Recurring payments integration via PayPal
- Monthly and annual billing intervals
- User subscription management and status tracking
- Admin capabilities to manage plans and grant subscriptions manually
- PayPal webhook integration for subscription events

### Student Experience
- Real-time progress tracking across all courses
- Automatic certificate generation upon completion
- Certificate verification system with QR codes
- Course reviews and ratings system
- Shopping cart and checkout flow with PayPal
- Purchase history and downloadable invoices
- Activity logging and monitoring
- Mobile-responsive learning interface

### Administration
- Comprehensive analytics dashboard with Recharts visualizations
- User management and role assignment (RBAC)
- Content upload and management via Cloudinary
- Purchase tracking and revenue reporting
- Date-filtered analytics with custom date ranges
- Debug endpoints for troubleshooting (admin-only)
- Bulk operations for courses and categories
- Duplicate prevention and data validation

### Security & Authentication
- Email and password authentication with bcrypt
- Google OAuth integration with proper account linking
- Two-factor authentication via OTP
- Secure password reset workflow with tokens
- Role-based access control (RBAC) with middleware
- Rate limiting on API endpoints with Upstash Redis
- Environment variable validation with Zod
- CSRF protection and XSS prevention
- SQL injection prevention via Prisma ORM

### Payment Processing
- PayPal integration for course purchases and subscriptions
- Automated invoice generation
- Email delivery of receipts via Resend
- Webhook handling for payment events
- Support for individual courses and learning paths

### Additional Pages
- **FAQ**: Frequently asked questions section
- **Instructors**: Information about course instructors
- **Contact**: Contact form and support information
- **Legal**: Privacy Policy and Terms of Service pages
- **Pricing**: Detailed pricing page for subscription plans

## Technology Stack

### Frontend
- Next.js 16.1.4 with App Router
- TypeScript 5.9.3 for type safety
- Tailwind CSS for styling
- Radix UI component library
- Framer Motion for animations
- Recharts for data visualization
- React 19

### Backend
- PostgreSQL database
- Prisma ORM 7.3.0
- NextAuth.js for authentication
- Resend for email delivery
- Cloudinary for media storage
- Upstash Redis for caching and rate limiting

### Infrastructure
- Vercel-ready deployment
- Serverless API routes
- Edge-optimized delivery
- Automatic image optimization

## Getting Started

### Requirements

- Node.js 18 or higher
- PostgreSQL database
- Package manager (npm, yarn, or pnpm)

### Installation

1. Clone the repository and install dependencies:
```bash
git clone https://github.com/SingasonSimon/AI-Genius-Lab.git
cd ai-genius-lab
npm install
```

2. Configure environment variables by creating a `.env.local` file:
```bash
# Database Connection
DATABASE_URL="postgresql://username:password@host:5432/database"
DIRECT_URL="postgresql://username:password@host:5432/database"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="<from-google-cloud-console>"
GOOGLE_CLIENT_SECRET="<from-google-cloud-console>"

# PayPal Configuration
PAYPAL_ENV="sandbox"
PAYPAL_CLIENT_ID="<from-paypal-developer>"
PAYPAL_CLIENT_SECRET="<from-paypal-developer>"
PAYPAL_WEBHOOK_ID="<from-paypal-developer>"

# Cloudinary Media Storage
CLOUDINARY_CLOUD_NAME="<from-cloudinary-dashboard>"
CLOUDINARY_API_KEY="<from-cloudinary-dashboard>"
CLOUDINARY_API_SECRET="<from-cloudinary-dashboard>"

# Email Service
RESEND_API_KEY="<from-resend-dashboard>"
FROM_EMAIL="noreply@yourdomain.com"
SUPPORT_EMAIL="support@yourdomain.com"  # Override default support email

# Address Configuration (Optional)
ADDRESS_LINE_1="123 Learning Street"
ADDRESS_LINE_2="Education District"
ADDRESS_CITY="San Francisco"
ADDRESS_STATE="CA"
ADDRESS_ZIP="94102"
ADDRESS_COUNTRY="United States"

# Default User Credentials (for development)
DEFAULT_ADMIN_EMAIL="admin@aigeniuslab.com"
DEFAULT_ADMIN_PASSWORD="password123"
DEFAULT_CUSTOMER_EMAIL="customer@aigeniuslab.com"
DEFAULT_CUSTOMER_PASSWORD="password123"

# Redis Cache (Optional)
UPSTASH_REDIS_REST_URL="<from-upstash-console>"
UPSTASH_REDIS_REST_TOKEN="<from-upstash-console>"

# Prisma Configuration
PRISMA_CLIENT_ENGINE_TYPE="library"
```

3. Initialize the database:
```bash
npx prisma migrate dev
npm run db:seed
```

4. Start the development server:
```bash
npm run dev
```

5. Access the application at `http://localhost:3000`

### Default Credentials

After seeding, use these credentials to access the platform:

**Administrator Account:**
- Email: admin@aigeniuslab.com
- Password: password123

**Customer Account:**
- Email: customer@aigeniuslab.com
- Password: password123

## Database Management

```bash
# Apply schema changes
npm run db:push

# Create new migration
npx prisma migrate dev --name migration_name

# Deploy to production
npx prisma migrate deploy

# Seed sample data
npm run db:seed

# Open database GUI
npx prisma studio

# Regenerate Prisma Client
npx prisma generate
```

### Key Models
- **User Management**: User, Account, Session, VerificationToken
- **Course Content**: Course, Section, Lesson, LessonContent, Category
- **Commerce**: Purchase, Payment, Enrollment
- **Learning Paths**: LearningPath, LearningPathCourse
- **Blog**: BlogPost, BlogTag, BlogReview
- **Subscriptions**: Subscription, SubscriptionPlan, SubscriptionPayment
- **Progress & Reviews**: Progress, Certificate, Review, ActivityLog

## Testing

The platform includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test suite
npm test -- user-flow
```

Test coverage includes:
- Authentication workflows
- Course purchase flows
- Progress tracking
- Certificate generation
- Review system
- Role-based access control
- Password security

## Deployment

### Vercel Deployment

1. Push code to GitHub repository

2. Import project to Vercel:
   - Visit vercel.com/new
   - Select your repository
   - Vercel detects Next.js automatically

3. Configure environment variables in Vercel dashboard

4. Deploy - automatic on every push to main branch

### Database Options

**Neon (Recommended)**
- Serverless PostgreSQL
- Automatic scaling
- Free tier available
- Visit neon.tech

**Vercel Postgres**
- Integrated with Vercel
- Simple setup
- Install: `npm i @vercel/postgres`

**Supabase**
- PostgreSQL with additional features
- Real-time capabilities
- Visit supabase.com

After database setup, run migrations:
```bash
npx prisma migrate deploy
```

## Project Structure

```
ai-genius-lab/
├── app/
│   ├── (admin)/          # Admin dashboard (protected)
│   │   └── admin/
│   │       ├── blog/          # Blog management
│   │       ├── categories/    # Category management
│   │       ├── courses/       # Course management
│   │       ├── learning-paths/# Learning path management
│   │       ├── purchases/     # Purchase history
│   │       ├── subscriptions/ # Subscription management
│   │       └── users/         # User management
│   ├── (app)/            # Authenticated user routes
│   │   ├── activity/     # User activity log
│   │   ├── checkout/     # Checkout flow (incl. subscriptions)
│   │   ├── dashboard/    # User dashboard
│   │   ├── library/      # Course library
│   │   ├── profile/      # User profile (incl. subscription)
│   │   └── purchase/     # Purchase success/history
│   ├── (public)/         # Public pages
│   │   ├── blog/         # Public blog
│   │   ├── cart/         # Shopping cart
│   │   ├── contact/      # Contact page
│   │   ├── courses/      # Course catalog
│   │   ├── faq/          # FAQ page
│   │   ├── instructors/  # Instructors page
│   │   ├── learning-paths/# Learning paths
│   │   ├── pricing/      # Pricing page
│   │   ├── privacy/      # Privacy policy
│   │   ├── terms/        # Terms of service
│   │   └── sign-in/up    # Auth pages
│   └── api/              # API endpoints
│       ├── admin/        # Admin APIs
│       ├── auth/         # Auth APIs
│       ├── blog/         # Blog APIs
│       ├── cart/         # Cart APIs
│       ├── certificates/ # Certificate APIs
│       ├── checkout/     # Checkout APIs
│       ├── courses/      # Course APIs
│       ├── payments/     # Payment APIs
│       ├── subscriptions/# Subscription APIs
│       └── webhooks/     # Webhooks
├── components/           # React components
│   ├── admin/            # Admin-specific components
│   ├── auth/             # Auth forms
│   ├── cart/             # Shopping cart components
│   ├── layout/           # Navigation, footer, sidebar
│   ├── ui/               # Reusable UI primitives
│   └── ...               # Other feature components
├── lib/                  # Core business logic
│   ├── config.ts         # Centralized configuration
│   ├── blog.ts           # Blog logic
│   ├── subscriptions.ts  # Subscription logic
│   └── ...               # Other utility modules
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/
└── __tests__/            # Jest test suites
```

## Security Features

- bcrypt password hashing
- JWT-based session management
- CSRF protection
- Rate limiting on sensitive endpoints
- SQL injection prevention via Prisma
- XSS protection through React
- Signed URLs for content delivery
- Role-based access control

## Performance Optimizations

- Server-side rendering
- Automatic code splitting
- Image optimization
- Redis caching layer
- Database query optimization
- CDN delivery for media
- Edge function support

## Code Quality

```bash
# Lint codebase
npm run lint

# Format code with Prettier
npm run format

# Type checking
npm run type-check

# Run all quality checks
npm run check
```

### Code Standards
- TypeScript strict mode enabled
- ESLint with Next.js configuration
- Prettier for code formatting
- Husky git hooks for pre-commit checks
- Conventional commits for commit messages

## Configuration Management

The application uses a centralized configuration system located in `lib/config.ts`. This includes:

- Site information and metadata
- Contact details and business hours
- Default categories and sample data
- Invoice and certificate settings
- Payment and analytics configuration
- Rate limiting and cache settings

### Environment-Based Configuration

All sensitive data is loaded from environment variables with fallback defaults:

```typescript
// Example from lib/config.ts
export const siteConfig = {
  name: "AI Genius Lab",
  url: process.env.NEXTAUTH_URL || "https://aigeniuslab.com",
  links: {
    email: process.env.SUPPORT_EMAIL || "support@aigeniuslab.com",
  },
};
```

## Known Issues & Recent Fixes

### Recently Resolved Issues
1. **Learning Path Slug Added**: Added `slug` field to `LearningPath` model and updated lookup logic.
2. **Certificate Generation Race Condition Fixed**: Implemented `prisma.$transaction()` to prevent duplicate certificates.
3. **Session Callback Optimized**: Cached user data in JWT to reduce database queries on every request.
4. **Review Completion Check Added**: Reviews now require a minimum of 50% course completion.
5. **Error Handling Enhanced**: Improved error handling with typed `ErrorCode` enum and better server error parsing.
6. **OAuth Authentication**: Fixed Prisma schema relation naming from `User` to `user` for NextAuth compatibility.
7. **Database IDs**: Added `@default(cuid())` to User, Account, and Session models for auto-generation.

### Debug Endpoints
The application includes debug endpoints for troubleshooting:
- `POST /api/debug/access-check` - Verify user access to courses
- `POST /api/debug/content-check` - Verify content exists in Cloudinary

⚠️ **Note**: These endpoints are admin-only and should be removed in production environments.

### Performance Considerations
- Database queries are optimized with proper indexing
- Images are served via Cloudinary CDN
- Redis caching is implemented for frequently accessed data
- API routes are rate-limited to prevent abuse
- Components use React.memo and dynamic imports for optimization

## Documentation

Detailed documentation is available in the `docs/` directory:

- Implementation guides
- API documentation
- Security best practices
- Testing strategies
- Deployment procedures

## Support

For technical support or questions:
- Review documentation in the `docs/` folder
- Open an issue on GitHub
- Contact: support@aigeniuslab.com

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and follow the code standards
4. Run tests: `npm test`
5. Commit your changes: `git commit -m 'feat: add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines
- Follow the existing code style and patterns
- Add tests for new features
- Update documentation as needed
- Use TypeScript strictly - no `any` types
- Follow accessibility best practices
- Ensure mobile responsiveness

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Changelog

### v0.1.0 (Latest)
- ✨ Initial release with core LMS features
- 🚀 Added Blog and Subscription systems
- 🐛 Fixed OAuth authentication issues
- 🔧 Centralized configuration management
- 📱 Improved mobile UI consistency
- 🔒 Enhanced security measures

---

Built with ❤️ by the AI Genius Lab Team
