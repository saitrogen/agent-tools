/**
 * Categories and AI model taxonomies supported by godofprompt.ai
 */

const PRIMARY_CATEGORIES = [
  { slug: 'coding', name: 'Coding' },
  { slug: 'marketing', name: 'Marketing' },
  { slug: 'art-and-design', name: 'Art & Design' },
  { slug: 'seo', name: 'SEO' },
  { slug: 'writing', name: 'Writing' },
  { slug: 'education', name: 'Education' },
  { slug: 'finance', name: 'Finance' },
  { slug: 'sales', name: 'Sales' },
  { slug: 'strategy', name: 'Strategy' },
  { slug: 'productivity', name: 'Productivity' },
  { slug: 'operations', name: 'Operations' },
  { slug: 'human-resources', name: 'Human Resources' },
  { slug: 'research', name: 'Research' },
  { slug: 'data-analysis', name: 'Data Analysis' },
  { slug: 'legal', name: 'Legal' },
  { slug: 'customer-service', name: 'Customer Service' },
  { slug: 'real-estate', name: 'Real Estate' },
  { slug: 'careers', name: 'Careers' }
];

const SUBCATEGORIES = {
  'coding': [
    { slug: 'frontend-and-ui', name: 'Frontend & UI' },
    { slug: 'documentation', name: 'Documentation' },
    { slug: 'debugging', name: 'Debugging' },
    { slug: 'apis-and-integrations', name: 'APIs & Integrations' },
    { slug: 'devops-and-deployment', name: 'DevOps & Deployment' },
    { slug: 'refactoring', name: 'Refactoring' },
    { slug: 'testing', name: 'Testing' },
    { slug: 'database-design', name: 'Database Design' },
    { slug: 'functions-and-logic', name: 'Functions & Logic' },
    { slug: 'code-review', name: 'Code Review' },
    { slug: 'web-scraping', name: 'Web Scraping' },
    { slug: 'automation-logic', name: 'Automation Logic' },
    { slug: 'agent-system-prompts', name: 'Agent System Prompts' },
    { slug: 'chatbot-personas', name: 'Chatbot Personas' },
    { slug: 'agentic-workflows', name: 'Agentic Workflows' }
  ],
  'marketing': [
    { slug: 'social-media-posts', name: 'Social Media Posts' },
    { slug: 'funnels-and-sequences', name: 'Funnels & Sequences' },
    { slug: 'email-campaigns', name: 'Email Campaigns' },
    { slug: 'personal-brand', name: 'Personal Brand' },
    { slug: 'ad-copy', name: 'Ad Copy' },
    { slug: 'landing-page-copy', name: 'Landing Page Copy' },
    { slug: 'content-repurposing', name: 'Content Repurposing' },
    { slug: 'headlines-and-hooks', name: 'Headlines & Hooks' },
    { slug: 'video-ad-scripts', name: 'Video Ad Scripts' }
  ],
  'art-and-design': [
    { slug: 'portrait-and-avatar', name: 'Portrait & Avatar' },
    { slug: 'concept-art', name: 'Concept Art' },
    { slug: 'product-photography', name: 'Product Photography' },
    { slug: 'interior-and-exterior-renders', name: 'Interior & Exterior Renders' },
    { slug: 'icon-and-ui-design', name: 'Icon & UI Design' },
    { slug: 'ad-creatives-and-banners', name: 'Ad Creatives & Banners' },
    { slug: 'illustration', name: 'Illustration' },
    { slug: 'food-photography', name: 'Food Photography' },
    { slug: 'packaging-and-mockups', name: 'Packaging & Mockups' },
    { slug: 'poster-and-flyer', name: 'Poster & Flyer' },
    { slug: 'character-design', name: 'Character Design' },
    { slug: 'photo-editing-and-restoration', name: 'Photo Editing & Restoration' },
    { slug: 'coloring-pages', name: 'Coloring Pages' },
    { slug: 'stickers-and-emojis', name: 'Stickers & Emojis' },
    { slug: 'tattoo-design', name: 'Tattoo Design' },
    { slug: 'logo-design', name: 'Logo Design' }
  ],
  'seo': [
    { slug: 'technical-seo', name: 'Technical SEO' },
    { slug: 'on-page-optimization', name: 'On-Page Optimization' },
    { slug: 'keyword-research', name: 'Keyword Research' },
    { slug: 'content-briefs', name: 'Content Briefs' },
    { slug: 'link-building', name: 'Link Building' },
    { slug: 'local-seo', name: 'Local SEO' }
  ],
  'strategy': [
    { slug: 'business-plans', name: 'Business Plans' },
    { slug: 'go-to-market', name: 'Go-to-Market' },
    { slug: 'swot-and-frameworks', name: 'SWOT & Frameworks' },
    { slug: 'positioning-and-messaging', name: 'Positioning & Messaging' },
    { slug: 'okrs-and-goals', name: 'OKRs & Goals' },
    { slug: 'pricing-strategy', name: 'Pricing Strategy' },
    { slug: 'roadmaps', name: 'Roadmaps' },
    { slug: 'competitive-strategy', name: 'Competitive Strategy' }
  ],
  'education': [
    { slug: 'course-creation', name: 'Course Creation' },
    { slug: 'lesson-plans', name: 'Lesson Plans' },
    { slug: 'study-guides', name: 'Study Guides' },
    { slug: 'academic-writing', name: 'Academic Writing' },
    { slug: 'tutoring-and-explanations', name: 'Tutoring & Explanations' },
    { slug: 'grading-and-feedback', name: 'Grading & Feedback' },
    { slug: 'quizzes-and-tests', name: 'Quizzes & Tests' },
    { slug: 'worksheets', name: 'Worksheets' }
  ]
};

const SUPPORTED_TOOLS = [
  { slug: 'chatgpt', name: 'ChatGPT' },
  { slug: 'claude', name: 'Claude' },
  { slug: 'deepseek', name: 'DeepSeek' },
  { slug: 'gemini', name: 'Gemini' },
  { slug: 'grok', name: 'Grok' },
  { slug: 'midjourney', name: 'Midjourney' },
  { slug: 'flux', name: 'Flux' },
  { slug: 'dall-e', name: 'DALL-E' },
  { slug: 'mistral', name: 'Mistral' },
  { slug: 'ideogram', name: 'Ideogram' },
  { slug: 'higgsfield', name: 'Higgsfield' },
  { slug: 'astra', name: 'Astra' },
  { slug: 'nano-banana', name: 'Nano Banana' }
];

module.exports = {
  PRIMARY_CATEGORIES,
  SUBCATEGORIES,
  SUPPORTED_TOOLS
};
