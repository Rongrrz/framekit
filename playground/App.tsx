import type { CSSProperties } from 'react';

import { Frame } from '../src/components/Frame';
import { UIStroke } from '../src/decorators/UIStroke';
import { Enum } from '../src/enums';
import { Color4 } from '../src/primitives/Color4';
import { UDim2 } from '../src/primitives/UDim2';
import { Vector2 } from '../src/primitives/Vector2';

const fill = UDim2.fromScale(1, 1);
const origin = UDim2.fromOffset(0, 0);
const center = Vector2.new(0.5, 0.5);

const textBase: CSSProperties = {
  boxSizing: 'border-box',
  color: '#f8fafc',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: 0,
};

const caption: CSSProperties = {
  ...textBase,
  color: '#94a3b8',
  fontSize: 13,
  fontWeight: 650,
  letterSpacing: 0,
  textTransform: 'uppercase',
};

export function App() {
  return (
    <Frame
      Size={fill}
      Position={origin}
      BackgroundColor={Color4.hext('#0b1020')}
      ClipDescendants={false}
      style={textBase}
    >
      <Frame
        Size={UDim2.new(1, -48, 1, -48)}
        Position={UDim2.fromScale(0.5, 0.5)}
        AnchorPoint={center}
        BackgroundColor={Color4.hext('#111827')}
        BorderRadius={28}
        ClipDescendants={false}
        style={{
          maxWidth: 1180,
          maxHeight: 720,
          minWidth: 820,
          minHeight: 580,
          boxSizing: 'border-box',
        }}
      >
        <UIStroke
          Color={Color4.rgbt(148, 163, 184, 0.72)}
          Thickness={1}
          BorderStrokePosition={Enum.BorderStrokePosition.Outer}
        />

        <Frame
          Size={UDim2.new(1, -64, 0, 116)}
          Position={UDim2.fromOffset(32, 30)}
          BackgroundColor={Color4.rgbt(15, 23, 42, 0.12)}
          BorderRadius={22}
          ClipDescendants={false}
        >
          <UIStroke
            Color={Color4.rgbt(125, 211, 252, 0.45)}
            Thickness={2}
            BorderStrokePosition={Enum.BorderStrokePosition.Center}
          />

          <Frame
            as="p"
            Size={UDim2.fromOffset(300, 24)}
            Position={UDim2.fromOffset(26, 24)}
            BackgroundColor={Color4.rgbt(0, 0, 0, 1)}
            style={caption}
          >
            FrameKit playground
          </Frame>

          <Frame
            as="h1"
            Size={UDim2.new(1, -320, 0, 46)}
            Position={UDim2.fromOffset(24, 54)}
            BackgroundColor={Color4.rgbt(0, 0, 0, 1)}
            style={{
              ...textBase,
              fontSize: 34,
              fontWeight: 800,
              lineHeight: '42px',
            }}
          >
            Frame + UIStroke mini showcase
          </Frame>

          <Frame
            Size={UDim2.fromOffset(214, 44)}
            Position={UDim2.new(1, -246, 0, 36)}
            BackgroundColor={Color4.hext('#ecfeff')}
            BorderRadius={999}
          >
            <UIStroke Color={Color4.hext('#22d3ee')} Thickness={3} />
            <Frame
              as="p"
              Size={UDim2.fromScale(1, 1)}
              Position={origin}
              BackgroundColor={Color4.rgbt(0, 0, 0, 1)}
              style={{
                ...textBase,
                color: '#0f172a',
                fontSize: 14,
                fontWeight: 800,
                lineHeight: '44px',
                textAlign: 'center',
              }}
            >
              Decorator child stroke
            </Frame>
          </Frame>
        </Frame>

        <Frame
          Size={UDim2.new(0.42, -42, 0, 394)}
          Position={UDim2.fromOffset(32, 178)}
          BackgroundColor={Color4.hext('#f8fafc')}
          BorderRadius={22}
          ClipDescendants={false}
        >
          <UIStroke Color={Color4.hext('#38bdf8')} Thickness={4} />

          <Frame
            as="p"
            Size={UDim2.new(1, -48, 0, 24)}
            Position={UDim2.fromOffset(24, 24)}
            BackgroundColor={Color4.rgbt(0, 0, 0, 1)}
            style={{ ...caption, color: '#0369a1' }}
          >
            Bordered card
          </Frame>

          <Frame
            as="h2"
            Size={UDim2.new(1, -48, 0, 72)}
            Position={UDim2.fromOffset(24, 60)}
            BackgroundColor={Color4.rgbt(0, 0, 0, 1)}
            style={{
              ...textBase,
              color: '#0f172a',
              fontSize: 30,
              fontWeight: 850,
              lineHeight: '36px',
            }}
          >
            A `Frame` can be the whole card surface.
          </Frame>

          <Frame
            as="p"
            Size={UDim2.new(1, -48, 0, 72)}
            Position={UDim2.fromOffset(24, 148)}
            BackgroundColor={Color4.rgbt(0, 0, 0, 1)}
            style={{
              ...textBase,
              color: '#475569',
              fontSize: 15,
              fontWeight: 500,
              lineHeight: '24px',
            }}
          >
            The card, copy, badge, and interior samples are all positioned with FrameKit primitives.
            The visible border comes from a UIStroke child.
          </Frame>

          <Frame
            Size={UDim2.new(1, -48, 0, 92)}
            Position={UDim2.fromOffset(24, 252)}
            BackgroundColor={Color4.hext('#e0f2fe')}
            BorderRadius={16}
            ClipDescendants={false}
          >
            <UIStroke
              Color={Color4.rgbt(3, 105, 161, 0.45)}
              Thickness={2}
              BorderStrokePosition={Enum.BorderStrokePosition.Inner}
            />
            <Frame
              as="p"
              Size={UDim2.new(1, -36, 0, 42)}
              Position={UDim2.fromOffset(18, 24)}
              BackgroundColor={Color4.rgbt(0, 0, 0, 1)}
              style={{
                ...textBase,
                color: '#075985',
                fontSize: 15,
                fontWeight: 700,
                lineHeight: '21px',
              }}
            >
              Inner stroke: useful when the border should stay inside a rounded frame.
            </Frame>
          </Frame>
        </Frame>

        <Frame
          Size={UDim2.new(0.58, -54, 0, 196)}
          Position={UDim2.new(0.42, 22, 0, 178)}
          BackgroundColor={Color4.hext('#172033')}
          BorderRadius={22}
          ClipDescendants={false}
        >
          <UIStroke
            Color={Color4.rgbt(250, 204, 21, 0.22)}
            Thickness={8}
            BorderStrokePosition={Enum.BorderStrokePosition.Outer}
          />

          <Frame
            as="p"
            Size={UDim2.new(1, -48, 0, 24)}
            Position={UDim2.fromOffset(24, 24)}
            BackgroundColor={Color4.rgbt(0, 0, 0, 1)}
            style={{ ...caption, color: '#fde68a' }}
          >
            Highlighted panel
          </Frame>

          <Frame
            as="h2"
            Size={UDim2.new(1, -48, 0, 38)}
            Position={UDim2.fromOffset(24, 58)}
            BackgroundColor={Color4.rgbt(0, 0, 0, 1)}
            style={{
              ...textBase,
              fontSize: 26,
              fontWeight: 820,
              lineHeight: '34px',
            }}
          >
            Thick translucent outer stroke
          </Frame>

          <Frame
            as="p"
            Size={UDim2.new(1, -48, 0, 54)}
            Position={UDim2.fromOffset(24, 112)}
            BackgroundColor={Color4.rgbt(0, 0, 0, 1)}
            style={{
              ...textBase,
              color: '#cbd5e1',
              fontSize: 15,
              fontWeight: 500,
              lineHeight: '24px',
            }}
          >
            UIStroke decorates its parent Frame without becoming visible DOM of its own, making it a
            clean composition tool.
          </Frame>
        </Frame>

        <Frame
          Size={UDim2.new(0.58, -54, 0, 176)}
          Position={UDim2.new(0.42, 22, 0, 396)}
          BackgroundColor={Color4.hext('#f1f5f9')}
          BorderRadius={22}
          ClipDescendants={false}
        >
          <UIStroke
            Color={Color4.rgbt(15, 23, 42, 0.82)}
            Thickness={1}
            BorderStrokePosition={Enum.BorderStrokePosition.Center}
          />

          <Frame
            as="p"
            Size={UDim2.new(1, -48, 0, 24)}
            Position={UDim2.fromOffset(24, 22)}
            BackgroundColor={Color4.rgbt(0, 0, 0, 1)}
            style={{ ...caption, color: '#334155' }}
          >
            Nested frame
          </Frame>

          <Frame
            Size={UDim2.new(1, -48, 0, 88)}
            Position={UDim2.fromOffset(24, 62)}
            BackgroundColor={Color4.hext('#ffffff')}
            BorderRadius={18}
            ClipDescendants={false}
          >
            <UIStroke
              Color={Color4.rgbt(244, 63, 94, 0.18)}
              Thickness={6}
              BorderStrokePosition={Enum.BorderStrokePosition.Center}
            />
            <Frame
              Size={UDim2.fromOffset(54, 54)}
              Position={UDim2.fromOffset(17, 17)}
              BackgroundColor={Color4.hext('#ffe4e6')}
              BorderRadius={14}
            >
              <UIStroke Color={Color4.hext('#fb7185')} Thickness={2} />
            </Frame>
            <Frame
              as="p"
              Size={UDim2.new(1, -104, 0, 44)}
              Position={UDim2.fromOffset(88, 23)}
              BackgroundColor={Color4.rgbt(0, 0, 0, 1)}
              style={{
                ...textBase,
                color: '#334155',
                fontSize: 15,
                fontWeight: 650,
                lineHeight: '22px',
              }}
            >
              A child Frame carries its own stroke while living inside another stroked parent.
            </Frame>
          </Frame>
        </Frame>

        <Frame
          Size={UDim2.new(1, -64, 0, 70)}
          Position={UDim2.new(0, 32, 1, -102)}
          BackgroundColor={Color4.rgbt(15, 23, 42, 0.18)}
          BorderRadius={20}
          ClipDescendants={false}
        >
          <UIStroke
            Color={Color4.rgbt(148, 163, 184, 0.68)}
            Thickness={1}
            BorderStrokePosition={Enum.BorderStrokePosition.Inner}
          />

          <Frame
            as="p"
            Size={UDim2.fromOffset(156, 22)}
            Position={UDim2.fromOffset(22, 24)}
            BackgroundColor={Color4.rgbt(0, 0, 0, 1)}
            style={{ ...caption, color: '#cbd5e1' }}
          >
            Stroke samples
          </Frame>

          <Frame
            Size={UDim2.fromOffset(132, 34)}
            Position={UDim2.fromOffset(198, 18)}
            BackgroundColor={Color4.hext('#082f49')}
            BorderRadius={12}
          >
            <UIStroke Color={Color4.hext('#38bdf8')} Thickness={1} />
          </Frame>

          <Frame
            Size={UDim2.fromOffset(132, 34)}
            Position={UDim2.fromOffset(354, 18)}
            BackgroundColor={Color4.hext('#422006')}
            BorderRadius={12}
          >
            <UIStroke Color={Color4.rgbt(251, 191, 36, 0.28)} Thickness={5} />
          </Frame>

          <Frame
            Size={UDim2.fromOffset(132, 34)}
            Position={UDim2.fromOffset(510, 18)}
            BackgroundColor={Color4.hext('#312e81')}
            BorderRadius={12}
          >
            <UIStroke
              Color={Color4.rgbt(196, 181, 253, 0.34)}
              Thickness={3}
              BorderStrokePosition={Enum.BorderStrokePosition.Center}
            />
          </Frame>
        </Frame>
      </Frame>
    </Frame>
  );
}
