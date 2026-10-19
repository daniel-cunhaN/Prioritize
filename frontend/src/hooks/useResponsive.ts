import { useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  tablet: 600,
  desktop: 900,
  wide: 1200,
};

export const CONTENT_MAX_WIDTH = 1280;

/**
 * Hook de responsividade: calcula breakpoints, nº de colunas da grade
 * e a largura exata de cada card para um layout fluido em qualquer tela.
 */
export function useResponsive(horizontalPadding = 16, gap = 12) {
  const { width } = useWindowDimensions();

  const isTablet = width >= BREAKPOINTS.tablet;
  const isDesktop = width >= BREAKPOINTS.desktop;
  const isWide = width >= BREAKPOINTS.wide;

  const columns = width < BREAKPOINTS.tablet ? 2 : width < BREAKPOINTS.desktop ? 3 : width < BREAKPOINTS.wide ? 4 : 5;

  const contentWidth = Math.min(width, CONTENT_MAX_WIDTH);
  const innerWidth = contentWidth - horizontalPadding * 2;
  const cardWidth = Math.floor((innerWidth - gap * (columns - 1)) / columns);

  // No mobile o carrossel mostra ~2,3 cards para indicar que há mais conteúdo
  const carouselCardWidth = isDesktop ? cardWidth : Math.floor((innerWidth - gap) / (isTablet ? 3.3 : 2.3));

  return { width, isTablet, isDesktop, isWide, columns, contentWidth, cardWidth, carouselCardWidth, gap, horizontalPadding };
}
