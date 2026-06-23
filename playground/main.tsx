import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import './demo.css';
import { TextButton } from '../src/components/TextButton';
import { UICorner } from '../src/decorators/UICorner';
import { UITextStroke } from '../src/decorators/UITextStroke';
import { Color4 } from '../src/primitives/Color4';
import { UDim2 } from '../src/primitives/UDim2';
import { Vector2 } from '../src/primitives/Vector2';

function Playground() {
  const [events, setEvents] = useState<string[]>(['Waiting for input...']);

  function record(event: string) {
    setEvents((previousEvents) => [event, ...previousEvents].slice(0, 6));
  }

  return (
    <main className="playground">
      <TextButton
        Text="Click Me"
        className="demo-button"
        Size={UDim2.fromOffset(220, 72)}
        Position={UDim2.fromScale(0.5, 0.42)}
        AnchorPoint={Vector2.new(0.5, 0.5)}
        BackgroundColor={Color4.hext('#2563eb')}
        MouseButton1Down={() => record('MouseButton1Down')}
        MouseButton1Up={() => record('MouseButton1Up')}
        MouseButton1Click={() => record('MouseButton1Click')}
        MouseButton2Down={() => record('MouseButton2Down')}
        MouseButton2Up={() => record('MouseButton2Up')}
        MouseButton2Click={() => record('MouseButton2Click')}
      >
        <UICorner CornerRadius={12} />
        <UITextStroke Color={Color4.hext('#111827')} Thickness={5} />
      </TextButton>

      <section className="event-log">
        {events.map((event, index) => (
          <div key={`${event}-${index}`}>{event}</div>
        ))}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Playground />
  </StrictMode>,
);
