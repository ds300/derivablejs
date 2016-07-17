import Prism from 'prismjs';
import React from 'react';

export default function Highlight ({code, block=false, lang='javascript'}) {
  const __html = Prism.highlight(code, Prism.languages[lang]);
  const elem = <code className={'language-' + lang} dangerouslySetInnerHTML={{__html}}></code>;
  if (block) {
    return <pre className={'language-' + lang}>{elem}</pre>;
  } else {
    return elem;
  }
}
