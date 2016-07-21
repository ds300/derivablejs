import style from 'stylie-mcstyleface';

export default style;

export const minWidth = {
  tablet: '@media (min-width: 768px)',
  desktop: '@media (min-width: 992px)',
  largeDesktop: '@media (min-width: 1200px)',
};

export const colors = {
  aoi: "#69D2E7",
  clean_pondwater: '#A7DBD8',
  beach_storm: '#E0E4CC',
  giant_goldfish: '#F38630',
  unreal_food_pils: '#FA6900',

  aoi_dark: "#219eb7",
  teardrop: '#3a7580',
};

style.rules `
  body {
    font-family: "Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    font-weight: 100;
  }
  p {
    font-size: 11pt;
    ${minWidth.tablet} {
      font-size: 12pt;
    }
    ${minWidth.desktop} {
      font-size: 14pt;
    }
  }
`;
