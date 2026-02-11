/**
 * Centralized configuration for AI Genius Lab
 * This file contains all dynamic data that should be configurable
 */

export const siteConfig = {
  name: "AI Genius Lab",
  description: "Learn AI for business, content, apps, and productivity through structured courses, tracked progress, and instant access after purchase.",
  url: process.env.NEXTAUTH_URL || "https://ai-genius-lab.vercel.app",
  ogImage: "/api/og",
  links: {
    email: process.env.SUPPORT_EMAIL || "support@aigeniuslab.com",
    github: "https://github.com/SingasonSimon/AI-Genius-Lab",
    docs: "https://docs.aigeniuslab.com",
  },
  keywords: [
    "AI courses",
    "artificial intelligence",
    "machine learning",
    "online learning",
    "AI training",
    "prompt engineering",
    "AI for business",
    "content creation AI",
    "AI productivity tools",
    "app development with AI",
    "AI learning platform",
    "digital product marketplace",
  ],
};

export const businessHours = {
  weekdays: "9:00 AM - 6:00 PM",
  saturday: "10:00 AM - 4:00 PM",
  sunday: "Closed",
  timezone: "UTC",
};

export const contactInfo = {
  email: process.env.SUPPORT_EMAIL || "support@aigeniuslab.com",
  phone: process.env.SUPPORT_PHONE || "+1 (555) 123-4567",
  address: {
    line1: process.env.ADDRESS_LINE_1 || "123 Learning Street",
    line2: process.env.ADDRESS_LINE_2 || "Education District",
    city: process.env.ADDRESS_CITY || "San Francisco",
    state: process.env.ADDRESS_STATE || "CA",
    zip: process.env.ADDRESS_ZIP || "94102",
    country: process.env.ADDRESS_COUNTRY || "United States",
  },
};

export const defaultCategories = [
  {
    id: "cat_business_001",
    name: "Make Money & Business",
    slug: "business",
    description: "Learn to make money and grow your business with AI",
    icon: "DollarSign",
    color: "#10B981",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "cat_content_002",
    name: "Create Content & Video",
    slug: "content",
    description: "Create engaging content and videos using AI tools",
    icon: "Video",
    color: "#8B5CF6",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "cat_marketing_003",
    name: "Marketing & Traffic",
    slug: "marketing",
    description: "Master marketing strategies and drive traffic with AI",
    icon: "Megaphone",
    color: "#F59E0B",
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "cat_apps_004",
    name: "Build Apps & Tech",
    slug: "apps",
    description: "Build applications and tech solutions with AI",
    icon: "Code",
    color: "#3B82F6",
    sortOrder: 4,
    isActive: true,
  },
  {
    id: "cat_productivity_005",
    name: "Productivity & Tools",
    slug: "productivity",
    description: "Boost productivity with AI-powered tools",
    icon: "Zap",
    color: "#EF4444",
    sortOrder: 5,
    isActive: true,
  },
];

export const sampleCourses = [
  {
    title: "AI Fundamentals for Business",
    slug: "ai-fundamentals",
    description: "Master the fundamentals of AI and apply them to real business scenarios",
  },
  {
    title: "Prompt Engineering Masterclass",
    slug: "prompt-engineering",
    description: "Learn advanced prompt engineering techniques for better AI interactions",
  },
  {
    title: "AI Content Creation",
    slug: "ai-content-creation",
    description: "Create compelling content using AI tools and strategies",
  },
];

export const sampleLessons = [
  {
    title: "Introduction to AI",
    slug: "introduction-to-ai",
  },
  {
    title: "Machine Learning Basics",
    slug: "machine-learning-basics",
  },
  {
    title: "Practical AI Applications",
    slug: "practical-ai-applications",
  },
];

export const invoiceConfig = {
  company: {
    name: "AI Genius Lab",
    tagline: "Premium Online Learning Platform",
    email: process.env.SUPPORT_EMAIL || "support@aigeniuslab.com",
    website: siteConfig.url,
  },
  terms: "This invoice confirms your purchase of the listed digital course(s). All sales are final and non-refundable. You have been granted immediate and lifetime access to the purchased content in your library. No physical items will be shipped. For support, contact " + (process.env.SUPPORT_EMAIL || "support@aigeniuslab.com") + ".",
  footer: "AI Genius Lab - Premium Online Learning Platform - " + (process.env.SUPPORT_EMAIL || "support@aigeniuslab.com"),
};

export const authConfig = {
  defaultUsers: {
    admin: {
      email: process.env.DEFAULT_ADMIN_EMAIL || "admin@aigeniuslab.com",
      password: process.env.DEFAULT_ADMIN_PASSWORD || "password123",
    },
    customer: {
      email: process.env.DEFAULT_CUSTOMER_EMAIL || "customer@aigeniuslab.com",
      password: process.env.DEFAULT_CUSTOMER_PASSWORD || "password123",
    },
  },
};

export const learningPaths = {
  defaultExamples: [
    {
      title: "Complete Web Development Path",
      description: "From HTML basics to full-stack applications",
    },
    {
      title: "AI & Machine Learning Path",
      description: "Comprehensive ML journey from basics to advanced",
    },
    {
      title: "Digital Marketing Mastery",
      description: "Master all aspects of digital marketing",
    },
  ],
};

export const paymentConfig = {
  paypal: {
    sandbox: {
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      webhookId: process.env.PAYPAL_WEBHOOK_ID,
    },
    currency: "USD",
  },
  invoice: {
    prefix: "INV-",
    taxRate: 0, // Set tax rate if applicable (e.g., 0.1 for 10%)
  },
};

export const certificateConfig = {
  template: {
    title: "Certificate of Completion",
    signature: "AI Genius Lab",
    logo: "/certificate-logo.png",
    background: "/certificate-bg.png",
  },
  validity: {
    lifetime: true, // Set to false if certificates expire
    years: 0, // Number of years valid if not lifetime
  },
};

export const contentConfig = {
  supportedTypes: {
    video: {
      extensions: ['.mp4', '.webm', '.mov'],
      maxSize: '500MB',
      provider: 'cloudinary',
    },
    audio: {
      extensions: ['.mp3', '.wav', '.ogg'],
      maxSize: '100MB',
      provider: 'cloudinary',
    },
    pdf: {
      extensions: ['.pdf'],
      maxSize: '50MB',
      provider: 'cloudinary',
    },
    document: {
      extensions: ['.doc', '.docx', '.txt'],
      maxSize: '20MB',
      provider: 'cloudinary',
    },
  },
  cloudinary: {
    folder: 'ai-genius-lab',
    resourceType: 'video',
    eager: 'sp',
  },
};

export const analyticsConfig = {
  tracking: {
    enabled: process.env.NODE_ENV === 'production',
    googleAnalyticsId: process.env.GA_MEASUREMENT_ID,
    vercelAnalytics: true,
  },
  events: {
    coursePurchase: 'course_purchase',
    lessonComplete: 'lesson_complete',
    certificateEarned: 'certificate_earned',
    userSignup: 'user_signup',
  },
};

export const seoConfig = {
  defaultTitle: siteConfig.name,
  defaultDescription: siteConfig.description,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    handle: '@aigeniuslab',
    site: '@aigeniuslab',
    cardType: 'summary_large_image',
  },
};

export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: {
    auth: 5, // 5 attempts for auth endpoints
    general: 100, // 100 requests for general endpoints
    upload: 10, // 10 uploads per window
  },
};

export const cacheConfig = {
  ttl: {
    courses: 3600, // 1 hour
    categories: 86400, // 24 hours
    userProgress: 300, // 5 minutes
    analytics: 1800, // 30 minutes
  },
  tags: {
    courses: 'courses',
    categories: 'categories',
    user: 'user',
    analytics: 'analytics',
  },
};
