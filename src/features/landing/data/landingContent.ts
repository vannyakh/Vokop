export const RECENT_PROJECTS = [
  {
    id: '1',
    title: 'sample_reel_04.mp4',
    lang: 'EN → KM',
    meta: '2 min ago',
    duration: '00:47',
    status: 'done' as const,
    thumb: 't1' as const,
  },
  {
    id: '2',
    title: 'product_launch.mov',
    lang: 'EN → TH',
    meta: 'processing — 62%',
    duration: '03:12',
    status: 'processing' as const,
    thumb: 't2' as const,
  },
  {
    id: '3',
    title: 'tutorial_ep02.mp4',
    lang: 'EN → JA',
    meta: '1 day ago',
    duration: '12:04',
    status: 'done' as const,
    thumb: 't3' as const,
  },
  {
    id: '4',
    title: 'interview_raw.webm',
    lang: 'EN → ES',
    meta: '3 days ago',
    duration: '08:30',
    status: 'failed' as const,
    thumb: 't4' as const,
  },
  {
    id: '5',
    title: 'onboarding_video.mp4',
    lang: 'EN → FR',
    meta: '5 days ago',
    duration: '05:15',
    status: 'done' as const,
    thumb: 't5' as const,
  },
];

export const FEATURE_STEPS = [
  {
    step: '01 · TRANSCRIBE',
    title: 'Speaker-timed script',
    description:
      'AI listens to the original audio and generates a precise transcript, timed to every speaker and pause.',
    alt: false,
  },
  {
    step: '02 · TRANSLATE',
    title: '40+ languages',
    description:
      'The script is adapted into your target language, keeping meaning, tone, and pacing intact — not a literal word swap.',
    alt: false,
  },
  {
    step: '03 · VOICEOVER',
    title: 'Natural AI voice',
    description:
      'A studio-grade voice is recorded, lip-timed, and mixed back into the video — ready to export in one file.',
    alt: true,
  },
];

export const FEATURE_EXTRAS = [
  { label: 'Speaker detection', gated: false },
  { label: 'Auto lip-sync', gated: false },
  { label: 'Batch uploads', gated: false },
  { label: 'SRT / VTT export', gated: false },
  { label: 'Up to 4K output', gated: true },
  { label: 'API access', gated: true },
];

export const DEMO_SLIDES = [
  {
    code: 'EN',
    label: 'EN — Original',
    caption: "Welcome back to the studio — today we're mixing the final cut.",
    progress: 38,
    tint:
      'radial-gradient(560px 320px at 25% 30%, rgba(232,163,61,0.18), transparent 60%), radial-gradient(560px 320px at 78% 75%, rgba(84,214,201,0.14), transparent 60%), var(--bg)',
  },
  {
    code: 'ខ្មែរ',
    label: 'KM — Translated',
    caption: 'សូមស្វាគមន៍មកកាន់ស្ទូឌីយោវិញ — ថ្ងៃនេះយើងកំពុងលាយសំឡeceងចុងក្រោយ។',
    progress: 52,
    tint:
      'radial-gradient(560px 320px at 70% 25%, rgba(84,214,201,0.2), transparent 60%), radial-gradient(560px 320px at 20% 80%, rgba(232,163,61,0.1), transparent 60%), var(--bg)',
  },
  {
    code: 'ไทย',
    label: 'TH — Translated',
    caption: 'ยินดีต้อนรับกลับสู่สตูดิโอ — วันนี้เรากำลังมิกซ์การตัดต่อสุดท้าย',
    progress: 24,
    tint:
      'radial-gradient(560px 320px at 30% 75%, rgba(232,163,61,0.16), transparent 60%), radial-gradient(560px 320px at 75% 20%, rgba(84,214,201,0.16), transparent 60%), var(--bg)',
  },
  {
    code: '日本語',
    label: 'JA — Translated',
    caption: 'スタジオへお帰りなさい — 今日は最終ミックスをしています。',
    progress: 66,
    tint:
      'radial-gradient(560px 320px at 75% 70%, rgba(84,214,201,0.18), transparent 60%), radial-gradient(560px 320px at 25% 25%, rgba(232,163,61,0.14), transparent 60%), var(--bg)',
  },
] as const;

export const PRICING_PLANS = [
  {
    id: 'free',
    name: 'Free',
    description: 'Try the pipeline, no card required.',
    monthlyPrice: '$0',
    annualPrice: '$0',
    cta: 'Get started',
    featured: false,
    features: [
      { text: '3 videos per month', included: true },
      { text: 'Up to 1080p export', included: true },
      { text: '2 languages per video', included: true },
      { text: 'Carries a Vokop watermark — removed in Pro', included: false, link: true },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For creators publishing every week.',
    monthlyPrice: '$19',
    annualPrice: '$15',
    cta: 'Start Pro trial',
    featured: true,
    features: [
      { text: 'Unlimited videos', included: true },
      { text: 'Up to 4K export', included: true },
      { text: '40+ languages, no watermark', included: true },
      { text: 'Priority processing queue', included: true },
    ],
  },
  {
    id: 'studio',
    name: 'Studio',
    description: 'For teams shipping in bulk.',
    monthlyPrice: '$49',
    annualPrice: '$39',
    cta: 'Start Studio trial',
    featured: false,
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Batch uploads & API access', included: true },
      { text: 'Custom voice cloning', included: true },
      { text: 'Dedicated support channel', included: true },
    ],
  },
];

export const COMPARE_ROWS = [
  { feature: 'Videos per month', free: '3', pro: 'Unlimited', studio: 'Unlimited' },
  { feature: 'Export quality', free: '1080p', pro: '4K', studio: '4K' },
  { feature: 'Languages', free: '2', pro: '40+', studio: '40+' },
  { feature: 'Watermark', free: 'Yes', pro: 'no', studio: 'no' },
  { feature: 'Priority processing', free: '—', pro: 'yes', studio: 'yes' },
  { feature: 'Batch uploads', free: '—', pro: '—', studio: 'yes' },
  { feature: 'API access', free: '—', pro: '—', studio: 'yes' },
  { feature: 'Voice cloning', free: '—', pro: '—', studio: 'Custom' },
  { feature: 'Support', free: 'Community', pro: 'Email', studio: 'Dedicated' },
];

export const ABOUT_STATS = [
  { value: '1.2M+', label: 'Videos translated' },
  { value: '42', label: 'Languages supported' },
  { value: '180+', label: 'Countries reached' },
  { value: '4.8/5', label: 'Average rating' },
];
