export const ADSENSE_PUBLISHER_ID = 'ca-pub-1425611919231559';

export const ADSENSE_SLOTS = {
  footer: { id: '3916443984', format: 'display' },
  trend2: { id: '9842723932', format: 'display' },
  trend1: { id: '4975548249', format: 'display' },
  catedet2: { id: '6542607320', format: 'display' },
  catedet1: { id: '9168770663', format: 'display' },
  cate2: { id: '4108015676', format: 'display' },
  cate1: { id: '6734179013', format: 'display' },
  blogs2: { id: '8047260683', format: 'display' },
  blogsSidebar: { id: '7844480086', format: 'display' },
  horizontal2: { id: '4833939831', format: 'display' },
  horizontal1: { id: '4781968940', format: 'display' },
  blogSidebar: { id: '8439909280', format: 'display' },
  inblog2: { id: '2540956591', format: 'in-feed' },
  inblog: { id: '2056567409', format: 'in-feed' },
  vertical: { id: '1315504838', format: 'display' },
  inbetween: { id: '7832811727', format: 'display' },
  sidebar: { id: '1720691334', format: 'display' },
} as const;

export type AdSlotName = keyof typeof ADSENSE_SLOTS;
