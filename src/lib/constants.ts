export const BRAND_NAME = 'Hamsoya';

export const BRAND_COLORS = {
  primary: '#C79F12',
  accent: '#D17327',
  background: '#FAF5E7',
} as const;

export const NAVIGATION_ITEMS = [
  { name: 'Home', href: '/' },
  { name: 'Products', href: '/products' },
  { name: 'About Us', href: '/about-us' },
  { name: 'Contact', href: '/contact-us' },
] as const;

export const PRODUCT_CATEGORIES = [
  { id: 'ghee', name: 'Pure Ghee', slug: 'ghee' },
  { id: 'honey', name: 'Honey', slug: 'honey' },
  { id: 'spices', name: 'Spices', slug: 'spices' },
  { id: 'traditional', name: 'Traditional Foods', slug: 'traditional' },
] as const;

export const FEATURED_PRODUCTS = [
  'kalo-jira-flowers-honey',
  'pure-ghee',
  'green-chili-powder',
  'laccha-shemai',
] as const;

export const PAYMENT_METHODS = [
  { id: 'cod', name: 'Cash on Delivery', description: 'Pay when you receive your order' },
] as const;

export const ORDER_STATUSES = [
  { id: 'pending', name: 'Pending', color: 'yellow' },
  { id: 'confirmed', name: 'Confirmed', color: 'blue' },
  { id: 'processing', name: 'Processing', color: 'purple' },
  { id: 'shipped', name: 'Shipped', color: 'indigo' },
  { id: 'delivered', name: 'Delivered', color: 'green' },
  { id: 'cancelled', name: 'Cancelled', color: 'red' },
] as const;

export const BANGLADESHI_CITIES = [
  'Dhaka',
  'Chittagong',
  'Sylhet',
  'Rajshahi',
  'Khulna',
  'Barisal',
  'Rangpur',
  'Mymensingh',
  'Comilla',
  'Narayanganj',
  'Gazipur',
  'Tongi',
] as const;

export const COMPANY_INFO = {
  name: BRAND_NAME,
  tagline: 'Pure & Natural Food Products',
  description: 'Premium quality organic food products delivered fresh to your doorstep',
  email: 'info@hamsoya.com',
  phone: '+880 1234-567890',
  address: 'Dhaka, Bangladesh',
  socialMedia: {
    facebook: 'https://facebook.com/hamsoya',
    instagram: 'https://instagram.com/hamsoya',
    twitter: 'https://twitter.com/hamsoya',
  },
} as const;

export const SEO_DEFAULTS = {
  title: `${BRAND_NAME} - Premium Organic Food Products`,
  description: 'Discover premium quality organic food products including pure ghee, natural honey, and traditional spices. Fresh delivery across Bangladesh.',
  keywords: 'organic food, pure ghee, natural honey, spices, traditional food, Bangladesh, online grocery',
  ogImage: '/images/og-image.jpg',
} as const;

export const STORAGE_KEYS = {
  cart: 'hamsoya-cart',
  bookmarks: 'hamsoya-bookmarks',
  user: 'hamsoya-user',
  addresses: 'hamsoya-addresses',
  theme: 'hamsoya-theme',
} as const;
