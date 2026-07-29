/**
 * MapLibre's native zoom range. Keeping the map on these limits lets every
 * input method use the same full range without route-specific restrictions.
 */
export const MAP_MIN_ZOOM = 0;
export const MAP_MAX_ZOOM = 22;
export const OSM_SOURCE_MAX_ZOOM = 19;
export const CYCLOSM_SOURCE_MAX_ZOOM = 20;

/**
 * Automatic route fitting stays deliberately less detailed. This only affects
 * the initial overview and does not limit subsequent manual zooming.
 */
export const MAP_AUTO_FIT_MAX_ZOOM = 12;
