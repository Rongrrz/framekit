import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import { TextLabel } from '../src/components/TextLabel';
import { UITextStroke } from '../src/decorators/UITextStroke';
import { Color4 } from '../src/primitives/Color4';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TextLabel Text="Put Stuff Here">
      <UITextStroke Color={Color4.hext('#cce90e')} />
    </TextLabel>
  </StrictMode>,
);
