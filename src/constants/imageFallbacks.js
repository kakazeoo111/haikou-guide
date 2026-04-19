const DEFAULT_COVER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a8d5b8"/><stop offset="100%" stop-color="#5aa77b"/></linearGradient></defs><rect width="300" height="300" fill="url(#g)"/><text x="150" y="165" text-anchor="middle" fill="white" font-family="sans-serif" font-size="20" font-weight="bold" opacity="0.75">暂无图片</text></svg>`;

export const DEFAULT_PLACE_COVER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DEFAULT_COVER_SVG)}`;
