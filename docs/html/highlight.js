import Prism from 'prismjs';
import React from 'react';
import style, {colors} from './style';

export default function Highlight ({code, block=false, lang='javascript'}) {
  const __html = Prism.highlight(code, Prism.languages[lang]);
  const elem = <code className={'language-' + lang} dangerouslySetInnerHTML={{__html}}></code>;
  if (block) {
    return <pre className={'language-' + lang}>{elem}</pre>;
  } else {
    return elem;
  }
}

const aoi_dark = '#219eb7';

style.rules `
code {
  color: #444;
  font-family: 'Source Code Pro', 'Monaco', 'Consolas', monospace;
  .token {
    &.string {
      color: ${colors.unreal_food_pils};
    }
    &.keyword {
      color: ${colors.aoi_dark};
    }
    &.punctuation, &.class-name {
      color: #999;
    }
    &.function {
      color: #779c0a;
    }
    &.comment {
      color: #BBB;
    }
  }
}
`;
