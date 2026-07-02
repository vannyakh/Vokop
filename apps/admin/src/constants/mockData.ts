import { Role, Notification, Tab } from '../types';

export interface Order {
  id: string;
  buyer: string;
  item: string;
  qty: number;
  amount: string;
  status: 'completed' | 'awaiting' | 'refunded';
  date: string;
}

export interface SaleActivity {
  id: string;
  item: string;
  amount: number;
  status: 'Completed' | 'Awaiting delivery' | 'Refunded';
  timestamp: Date;
}

export interface MessageEvent {
  id: string;
  timestamp: Date;
}

export interface DisputeEvent {
  id: string;
  timestamp: Date;
}

export interface Payout {
  date: string;
  ref: string;
  amount: string;
  bank: string;
  status: string;
}

// Helper to get relative dates for mock data
export const getRelativeDate = (daysAgo: number, hoursAgo: number = 0, minutesAgo: number = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursAgo, d.getMinutes() - minutesAgo, 0, 0);
  return d;
};

// 1. Dashboard Sales
export const ALL_SALES: SaleActivity[] = [
  { id: '#ORD-8821', item: '3x Steam Gift Card $20', amount: 60.00, status: 'Completed', timestamp: getRelativeDate(0, 0, 15) },
  { id: '#ORD-8815', item: '1x Minecraft Key Java Edition', amount: 26.50, status: 'Completed', timestamp: getRelativeDate(0, 2, 30) },
  { id: '#ORD-8809', item: '1x Mobile Legends 1000 Diamonds', amount: 10.00, status: 'Awaiting delivery', timestamp: getRelativeDate(0, 6, 0) },
  { id: '#ORD-8798', item: '2x Valorant Points 2000 VP', amount: 40.00, status: 'Completed', timestamp: getRelativeDate(0, 14, 0) },
  { id: '#ORD-8754', item: '1x PlayStation Plus 1 Month', amount: 19.99, status: 'Refunded', timestamp: getRelativeDate(1, 4, 0) },
  { id: '#ORD-8740', item: '1x Xbox Game Pass Ultimate', amount: 15.00, status: 'Completed', timestamp: getRelativeDate(2, 1, 0) },
  { id: '#ORD-8712', item: '1x Nintendo eShop $50 Card', amount: 50.00, status: 'Completed', timestamp: getRelativeDate(3, 8, 0) },
  { id: '#ORD-8699', item: '5x Steam Gift Card $10', amount: 50.00, status: 'Completed', timestamp: getRelativeDate(4, 12, 0) },
  { id: '#ORD-8650', item: '1x PUBG Mobile 660 UC', amount: 10.00, status: 'Completed', timestamp: getRelativeDate(5, 18, 0) },
  { id: '#ORD-8610', item: '1x Apple Gift Card $25', amount: 25.00, status: 'Completed', timestamp: getRelativeDate(6, 20, 0) },
  { id: '#ORD-8500', item: '2x Roblox 800 Robux', amount: 20.00, status: 'Completed', timestamp: getRelativeDate(10, 0, 0) },
  { id: '#ORD-8450', item: '1x FIFA 24 Points 1050 FP', amount: 10.00, status: 'Completed', timestamp: getRelativeDate(15, 0, 0) },
  { id: '#ORD-8390', item: '1x League of Legends 1380 RP', amount: 10.00, status: 'Completed', timestamp: getRelativeDate(20, 0, 0) },
  { id: '#ORD-8210', item: '4x Steam Gift Card $20', amount: 80.00, status: 'Completed', timestamp: getRelativeDate(25, 0, 0) },
  { id: '#ORD-8110', item: '1x PlayStation Plus 3 Months', amount: 45.00, status: 'Completed', timestamp: getRelativeDate(29, 0, 0) },
];

// 2. Dashboard Messages
export const ALL_MESSAGES: MessageEvent[] = [
  { id: 'm1', timestamp: getRelativeDate(0, 1, 0) },
  { id: 'm2', timestamp: getRelativeDate(0, 3, 0) },
  { id: 'm3', timestamp: getRelativeDate(0, 12, 0) },
  { id: 'm4', timestamp: getRelativeDate(1, 2, 0) },
  { id: 'm5', timestamp: getRelativeDate(2, 5, 0) },
  { id: 'm6', timestamp: getRelativeDate(5, 8, 0) },
  { id: 'm7', timestamp: getRelativeDate(12, 4, 0) },
  { id: 'm8', timestamp: getRelativeDate(22, 10, 0) },
];

// 3. Dashboard Disputes
export const ALL_DISPUTES: DisputeEvent[] = [
  { id: 'd1', timestamp: getRelativeDate(0, 4, 0) },
  { id: 'd2', timestamp: getRelativeDate(2, 10, 0) },
  { id: 'd3', timestamp: getRelativeDate(5, 2, 0) },
  { id: 'd4', timestamp: getRelativeDate(15, 6, 0) },
  { id: 'd5', timestamp: getRelativeDate(24, 1, 0) },
];

// 4. Orders
export const initialOrders: Order[] = [
  { id: 'ORD-8821', buyer: 'gmer_92', item: 'Steam Gift Card $20', qty: 3, amount: '$60.00', status: 'completed', date: '2024/06/30 22:20:11' },
  { id: 'ORD-8815', buyer: 'discord_king', item: 'Minecraft Java Key', qty: 1, amount: '$26.50', status: 'completed', date: '2024/06/30 21:40:02' },
  { id: 'ORD-8809', buyer: 'van_nak_km', item: 'Mobile Legends 1000 Diamonds', qty: 1, amount: '$10.00', status: 'awaiting', date: '2024/06/30 19:12:44' },
  { id: 'ORD-8798', buyer: 'kh_gamer92', item: 'Valorant Points 2000 VP', qty: 2, amount: '$40.00', status: 'completed', date: '2024/06/30 16:05:15' },
  { id: 'ORD-8754', buyer: 'discord_king', item: 'PlayStation Plus 1 Month', qty: 1, amount: '$19.99', status: 'refunded', date: '2024/06/29 11:24:50' },
];

// 5. Roles
export const initialRoles: Role[] = [
  {
    id: '9d773fef-749d-4d2c-bf28-cb27163c4bf2',
    name: 'Store Owner',
    status: 'enabled',
    remark: 'Full access to catalog, orders, payouts and settings.',
    created: '2024/03/30 05:31:19',
  },
  {
    id: '28c2a654-a7e9-485d-89f6-a93fa7e9d9ef',
    name: 'Order Manager',
    status: 'enabled',
    remark: 'Handles order fulfillment and dispute responses.',
    created: '2024/03/17 04:55:54',
  },
  {
    id: 'd0b4a7be-6a3d-45a0-94e0-9c16efb4a70b',
    name: 'Support Agent',
    status: 'disabled',
    remark: 'Read-only access to buyer messages and reviews.',
    created: '2023/08/18 13:15:41',
  },
  {
    id: '4bce412a-9530-4672-adb2-2736b4a7ef21',
    name: 'Finance Viewer',
    status: 'enabled',
    remark: 'View payouts, withdrawal requests and generate reports.',
    created: '2023/12/04 09:22:15',
  },
  {
    id: 'a9e160a2-f67b-40b4-bc8c-7836d5b0ae22',
    name: 'Listing Editor',
    status: 'enabled',
    remark: 'Draft and edit store catalog items and game listings.',
    created: '2024/01/15 16:01:45',
  },
  {
    id: 'fa513f1e-cf69-4215-a9d3-b8e9f506e76d',
    name: 'API Integrator',
    status: 'disabled',
    remark: 'Service role used for automated stock feed delivery.',
    created: '2023/12/23 13:57:25',
  },
  {
    id: 'ab123cde-f456-789a-012b-345c67def890',
    name: 'Moderator',
    status: 'enabled',
    remark: 'Review reported content, manage comments, and ban accounts.',
    created: '2024/01/15 08:20:11',
  },
  {
    id: 'bc234def-012a-345b-678c-901d234ef567',
    name: 'Content Manager',
    status: 'enabled',
    remark: 'Draft and publish articles, customize banner designs, and edit assets.',
    created: '2024/02/10 10:45:30',
  },
  {
    id: 'cd345ef6-123b-456c-789d-012e345fg678',
    name: 'Analytics Viewer',
    status: 'enabled',
    remark: 'Access to business performance analytics dashboard and traffic statistics.',
    created: '2024/04/05 14:15:22',
  },
  {
    id: 'de456fg7-234c-567d-890e-123f456gh789',
    name: 'Security Admin',
    status: 'enabled',
    remark: 'Manage network firewall rules, session tokens, and security audits.',
    created: '2024/05/18 09:12:44',
  },
  {
    id: 'ef567gh8-345d-678e-901f-234a567ij890',
    name: 'Guest Tester',
    status: 'disabled',
    remark: 'Temporary sandbox role for external developers testing APIs.',
    created: '2024/06/12 16:30:15',
  },
  {
    id: 'fg678ij9-456e-789f-012a-345b678kl901',
    name: 'Billing Admin',
    status: 'enabled',
    remark: 'Manage card profiles, edit tax settings, and process refunds.',
    created: '2024/06/25 11:05:59',
  },
  {
    id: 'gh789kl0-567f-890a-123b-456c789mn012',
    name: 'Inventory Manager',
    status: 'enabled',
    remark: 'Update stock levels, review supplier invoices, and import catalogs.',
    created: '2024/07/02 13:40:00',
  },
  {
    id: 'hi890mn1-678g-901b-234c-567d890op123',
    name: 'Customer Support Lead',
    status: 'enabled',
    remark: 'Supervise support agents, escalate tickets, and draft templates.',
    created: '2024/07/05 15:55:12',
  },
  {
    id: 'ij901op2-789h-012c-345d-678e901qr234',
    name: 'Compliance Officer',
    status: 'disabled',
    remark: 'Monitor transaction compliance, view AML logs, and sign off exports.',
    created: '2024/07/10 17:18:24',
  },
  {
    id: 'jk012qr3-890i-123d-456e-789f012st345',
    name: 'SEO Specialist',
    status: 'enabled',
    remark: 'Optimize pages, monitor crawl data, and configure sitemap links.',
    created: '2024/07/12 08:33:41',
  },
  {
    id: 'kl123st4-901j-234e-567f-890a123uv456',
    name: 'Developer Sandbox',
    status: 'disabled',
    remark: 'Unrestricted testing access in simulated staging environment.',
    created: '2024/07/15 22:11:05',
  },
  {
    id: 'lm234uv5-012k-345f-678g-901b234wx567',
    name: 'Marketing Associate',
    status: 'enabled',
    remark: 'Launch and review promo code campaigns and discount codes.',
    created: '2024/07/18 10:25:33',
  },
  {
    id: 'mn345wx6-123l-456g-789h-012c345yz678',
    name: 'Design Collaborator',
    status: 'enabled',
    remark: 'Upload brand graphics, edit dark mode themes, and preview banners.',
    created: '2024/07/20 12:50:18',
  },
  {
    id: 'no456yz7-234m-567h-890i-123d456ab789',
    name: 'Local Lead',
    status: 'disabled',
    remark: 'Manage localized translations, curating region-specific catalogs.',
    created: '2024/07/21 14:02:55',
  },
  {
    id: 'op567ab8-345n-678i-901j-234e567cd890',
    name: 'Logistics Supervisor',
    status: 'enabled',
    remark: 'Dispatch digital product codes and coordinate bulk key drops.',
    created: '2024/07/22 16:11:12',
  },
  {
    id: 'pq678cd9-456o-789j-012k-345f678ef901',
    name: 'Database Auditor',
    status: 'enabled',
    remark: 'Read database replica statistics, view slow query alerts, and run audits.',
    created: '2024/07/23 09:44:20',
  },
  {
    id: 'qr789ef0-567p-890k-123l-456g789gh012',
    name: 'Beta User Tester',
    status: 'disabled',
    remark: 'Enrolled in new preview program features with restricted feedback console.',
    created: '2024/07/24 11:30:15',
  },
  {
    id: 'rs890gh1-678q-901l-234m-567h890ij123',
    name: 'Copywriter Assistant',
    status: 'enabled',
    remark: 'Draft descriptions for products, verify legal disclaimer notes.',
    created: '2024/07/24 15:40:10',
  },
  {
    id: 'st901ij2-789r-012m-345n-678i901kl234',
    name: 'Regional Manager',
    status: 'enabled',
    remark: 'Manage payouts and tax configurations for APAC/EMEA subsidiaries.',
    created: '2024/07/25 18:22:50',
  },
  {
    id: 'tu012kl3-890s-123n-456o-789j012mn345',
    name: 'API Support Specialist',
    status: 'enabled',
    remark: 'Analyze failed webhook deliveries and assist downstream integrators.',
    created: '2024/07/25 21:05:18',
  },
  {
    id: 'uv123mn4-901t-234o-567p-890k123op456',
    name: 'System Site Engineer',
    status: 'enabled',
    remark: 'Oversee automatic updates, disaster recovery runs, and server logs.',
    created: '2024/07/26 05:44:32',
  },
  {
    id: 'vw234op5-012u-345p-678q-901l234qr567',
    name: 'Risk Analyst',
    status: 'disabled',
    remark: 'Detect fraud activity patterns and flag suspicious account logons.',
    created: '2024/07/26 10:12:08',
  },
  {
    id: 'wx345qr6-123v-456q-789r-012m345st678',
    name: 'Affiliate Promoter',
    status: 'enabled',
    remark: 'Access to custom promotional link builder and campaign statistics.',
    created: '2024/07/26 14:19:55',
  },
  {
    id: 'xy456st7-234w-567r-890s-123n456uv789',
    name: 'VIP Client Relations',
    status: 'enabled',
    remark: 'Dedicated custom account tools for top-tier institutional buyers.',
    created: '2024/07/26 17:50:33',
  },
];

// 6. Wallet Payouts
export const initialPayouts: Payout[] = [
  { date: '2024/06/30', ref: 'PAY-1123a', amount: '$240.00', bank: 'ABA Bank ••••2231', status: 'Completed' },
  { date: '2024/06/15', ref: 'PAY-1102b', amount: '$410.50', bank: 'ABA Bank ••••2231', status: 'Completed' },
  { date: '2024/05/30', ref: 'PAY-1088c', amount: '$150.00', bank: 'ABA Bank ••••2231', status: 'Completed' },
];

// 7. Tabs
export const initialTabs: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', type: 'dashboard' },
  { id: 'catalog', label: 'Catalog — Game keys', type: 'catalog' },
  { id: 'orders', label: 'Orders', type: 'orders' },
  { id: 'wallet', label: 'Wallet & Payouts', type: 'wallet' },
  { id: 'uishowcase', label: 'UI Libraries', type: 'uishowcase' }
];

// 8. Notifications
export const initialNotifications: Notification[] = [
  {
    id: 'notif-1',
    title: 'Dispute filed by gmer_92',
    desc: '#ORD-8821 (3x Steam Card) keys invalid',
    time: '2h ago',
    type: 'dispute',
    unread: true,
    dateGroup: 'Today',
    details: {
      buyer: 'gmer_92',
      amount: '$60.00',
      actionRequired: true,
      deadline: '23h'
    }
  },
  {
    id: 'notif-2',
    title: 'Payout request completed',
    desc: '$240.00 sent to ABA Bank account',
    time: '4h ago',
    type: 'payout',
    unread: true,
    dateGroup: 'Today',
    details: {
      amount: '$240.00',
      bankInfo: 'ABA Bank ••••2231'
    }
  },
  {
    id: 'notif-3',
    title: 'New 5★ review from srey_nich',
    desc: '"Fast delivery and working code as usual!"',
    time: 'Yesterday',
    type: 'review',
    unread: false,
    dateGroup: 'Yesterday',
    details: {
      buyer: 'srey_nich',
      rating: 5
    }
  },
  {
    id: 'notif-4',
    title: 'New order #ORD-8815',
    desc: 'Minecraft Java Edition purchased by discord_king',
    time: 'Yesterday',
    type: 'order',
    unread: false,
    dateGroup: 'Yesterday',
    details: {
      buyer: 'discord_king',
      amount: '$26.50'
    }
  },
  {
    id: 'notif-5',
    title: 'System backup succeeded',
    desc: 'All regional database schemas snapshotted successfully',
    time: 'Yesterday',
    type: 'system',
    unread: false,
    dateGroup: 'Yesterday'
  }
];

// 9. Showcase Table Data
export interface ShowcaseItem {
  key: string;
  service: string;
  endpoint: string;
  uptime: number;
  status: string;
  latency: string;
}

export const showcaseTableData: ShowcaseItem[] = [
  {
    key: '1',
    service: 'Delivery Webhook Manager',
    endpoint: '/api/v1/deliveries',
    uptime: 99.98,
    status: 'healthy',
    latency: '24ms'
  },
  {
    key: '2',
    service: 'Steam Key Validator',
    endpoint: '/api/v1/validate/steam',
    uptime: 99.91,
    status: 'healthy',
    latency: '115ms'
  },
  {
    key: '3',
    service: 'Stripe Payment Webhook',
    endpoint: '/api/v1/payments/stripe',
    uptime: 100.0,
    status: 'healthy',
    latency: '42ms'
  },
  {
    key: '4',
    service: 'KYC Face Recognition API',
    endpoint: '/api/v1/kyc/verify-face',
    uptime: 98.45,
    status: 'degraded',
    latency: '420ms'
  },
  {
    key: '5',
    service: 'Catalog Stock Sync Daemon',
    endpoint: '/api/v1/stock/sync',
    uptime: 99.95,
    status: 'healthy',
    latency: '8ms'
  }
];
