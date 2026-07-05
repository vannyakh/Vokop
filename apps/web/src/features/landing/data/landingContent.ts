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
    step: '01',
    titleKey: 'featuresStep1Title',
    descKey: 'featuresStep1Desc',
    alt: false,
  },
  {
    step: '02',
    titleKey: 'featuresStep2Title',
    descKey: 'featuresStep2Desc',
    alt: false,
  },
  {
    step: '03',
    titleKey: 'featuresStep3Title',
    descKey: 'featuresStep3Desc',
    alt: true,
  },
] as const;

export const FEATURE_EXTRAS = [
  { labelKey: 'featuresExtra1', gated: false },
  { labelKey: 'featuresExtra2', gated: false },
  { labelKey: 'featuresExtra3', gated: false },
  { labelKey: 'featuresExtra4', gated: false },
  { labelKey: 'featuresExtra5', gated: true },
  { labelKey: 'featuresExtra6', gated: true },
] as const;

export const DEMO_SLIDES = [
  {
    code: 'EN',
    label: 'EN — Original',
    caption: "Welcome back to the studio — today we're mixing the final cut.",
    progress: 38,
    tint:
      'radial-gradient(560px 320px at 25% 30%, rgba(232,163,61,0.18), transparent 60%), radial-gradient(560px 320px at 78% 75%, rgba(84,214,201,0.14), transparent 60%), var(--bg)',
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
  {
    code: 'ខ្មែរ',
    label: 'KM — Translated',
    caption: 'សូមស្វាគមន៍មកកាន់ស្ទូឌីយោវិញ — ថ្ងៃនេះយើងកំពុងលាយសំឡeceងចុងក្រោយ។',
    progress: 52,
    tint:
      'radial-gradient(560px 320px at 70% 25%, rgba(84,214,201,0.2), transparent 60%), radial-gradient(560px 320px at 20% 80%, rgba(232,163,61,0.1), transparent 60%), var(--bg)',
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  },
  {
    code: 'ไทย',
    label: 'TH — Translated',
    caption: 'ยินดีต้อนรับกลับสู่สตูดิโอ — วันนี้เรากำลังมิกซ์การตัดต่อสุดท้าย',
    progress: 24,
    tint:
      'radial-gradient(560px 320px at 30% 75%, rgba(232,163,61,0.16), transparent 60%), radial-gradient(560px 320px at 75% 20%, rgba(84,214,201,0.16), transparent 60%), var(--bg)',
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  },
  {
    code: '日本語',
    label: 'JA — Translated',
    caption: 'スタジオへお帰りなさい — 今日は最終ミックスをしています。',
    progress: 66,
    tint:
      'radial-gradient(560px 320px at 75% 70%, rgba(84,214,201,0.18), transparent 60%), radial-gradient(560px 320px at 25% 25%, rgba(232,163,61,0.14), transparent 60%), var(--bg)',
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  },
] as const;

export const PRICING_PLANS = [
  {
    id: 'free',
    nameKey: 'planFreeName',
    descKey: 'planFreeDesc',
    monthlyPrice: '$0',
    annualPrice: '$0',
    ctaKey: 'planFreeCta',
    featured: false,
    features: [
      { textKey: 'planFreeFeature1', included: true },
      { textKey: 'planFreeFeature2', included: true },
      { textKey: 'planFreeFeature3', included: true },
      { textKey: 'planFreeFeatureWatermark', included: false, link: true },
    ],
  },
  {
    id: 'pro',
    nameKey: 'planProName',
    descKey: 'planProDesc',
    monthlyPrice: '$19',
    annualPrice: '$15',
    ctaKey: 'planProCta',
    featured: true,
    features: [
      { textKey: 'planProFeature1', included: true },
      { textKey: 'planProFeature2', included: true },
      { textKey: 'planProFeature3', included: true },
      { textKey: 'planProFeature4', included: true },
    ],
  },
  {
    id: 'studio',
    nameKey: 'planStudioName',
    descKey: 'planStudioDesc',
    monthlyPrice: '$49',
    annualPrice: '$39',
    ctaKey: 'planStudioCta',
    featured: false,
    features: [
      { textKey: 'planStudioFeature1', included: true },
      { textKey: 'planStudioFeature2', included: true },
      { textKey: 'planStudioFeature3', included: true },
      { textKey: 'planStudioFeature4', included: true },
    ],
  },
] as const;

export const COMPARE_ROWS = [
  { featureKey: 'compVideos', freeKey: 'compFreeVideos', proKey: 'compUnlimited', studioKey: 'compUnlimited' },
  { featureKey: 'compExport', freeKey: 'compFreeExport', proKey: 'compProExport', studioKey: 'compProExport' },
  { featureKey: 'compLanguages', freeKey: 'compFreeLangs', proKey: 'compProLangs', studioKey: 'compProLangs' },
  { featureKey: 'compWatermark', freeKey: 'compYes', proKey: 'compNo', studioKey: 'compNo' },
  { featureKey: 'compPriority', freeKey: 'compNone', proKey: 'compYes', studioKey: 'compYes' },
  { featureKey: 'compBatch', freeKey: 'compNone', proKey: 'compNone', studioKey: 'compYes' },
  { featureKey: 'compApi', freeKey: 'compNone', proKey: 'compNone', studioKey: 'compYes' },
  { featureKey: 'compVoice', freeKey: 'compNone', proKey: 'compNone', studioKey: 'compCustom' },
  { featureKey: 'compSupport', freeKey: 'compCommunity', proKey: 'compEmail', studioKey: 'compDedicated' },
] as const;

export const ABOUT_STATS = [
  { value: '1.2M+', labelKey: 'aboutStat1' },
  { value: '42', labelKey: 'aboutStat2' },
  { value: '180+', labelKey: 'aboutStat3' },
  { value: '4.8/5', labelKey: 'aboutStat4' },
] as const;
