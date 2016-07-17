import { create } from 'free-style';

const style = create();

export default style;

style.registerRule('body', {
  backgroundColor: 'cyan',
});

export const minWidth = {
  tablet: '@media (min-width: 768px)',
  desktop: '@media (min-width: 992px)',
  largeDesktop: '@media (min-width: 1200px)',
};
