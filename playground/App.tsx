import { Frame } from '../src/components/Frame';
import { Color4 } from '../src/primitives/Color4';
import { UDim2 } from '../src/primitives/UDim2';
import { Vector2 } from '../src/primitives/Vector2';

export function App() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0f172a, #111827)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Main card */}
      <Frame
        Size={UDim2.fromOffset(720, 420)}
        Position={UDim2.fromScale(0.5, 0.5)}
        AnchorPoint={Vector2.new(0.5, 0.5)}
        BackgroundColor={Color4.rgba(31, 41, 55, 0.95)}
        BorderColor={Color4.rgba(148, 163, 184, 0.35)}
        BorderWidth={2}
        BorderRadius={28}
        ClipDescendants={false}
        style={{
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.45)',
        }}
      >
        {/* Floating circle */}
        <Frame
          Size={UDim2.fromOffset(180, 180)}
          Position={UDim2.fromOffset(-50, -50)}
          BackgroundColor={Color4.rgba(59, 130, 246, 0.35)}
          BorderRadius={999}
          ClipDescendants={false}
          style={{
            filter: 'blur(2px)',
          }}
        />

        {/* Header */}
        <Frame
          Size={UDim2.fromScale(1, 0)}
          Position={UDim2.fromOffset(0, 0)}
          BackgroundColor={Color4.rgba(15, 23, 42, 0.75)}
          BorderRadius={28}
          style={{
            height: 88,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          }}
        >
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              padding: '0 32px',
              color: 'white',
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: '-0.03em',
            }}
          >
            FrameKit Capstone
          </div>
        </Frame>

        {/* Left panel */}
        <Frame
          Size={UDim2.fromOffset(220, 260)}
          Position={UDim2.fromOffset(32, 120)}
          BackgroundColor={Color4.rgba(15, 23, 42, 0.8)}
          BorderColor={Color4.rgba(148, 163, 184, 0.2)}
          BorderWidth={1}
          BorderRadius={20}
        >
          <div
            style={{
              padding: 20,
              color: '#e5e7eb',
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.7 }}>Current Layout</div>
            <div style={{ fontSize: 36, fontWeight: 800, marginTop: 8 }}>UDim2</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>
              Scale + offset positioning with anchor-point based transforms.
            </div>
          </div>
        </Frame>

        {/* Center visual frame */}
        <Frame
          Size={UDim2.fromOffset(260, 180)}
          Position={UDim2.fromScale(0.62, 0.55)}
          AnchorPoint={Vector2.new(0.5, 0.5)}
          BackgroundColor={Color4.rgba(59, 130, 246, 0.9)}
          BorderRadius={24}
          ClipDescendants={true}
          style={{
            transform: 'translate(-50%, -50%) rotate(-3deg)',
          }}
        >
          <Frame
            Size={UDim2.fromOffset(110, 110)}
            Position={UDim2.fromScale(1, 0)}
            AnchorPoint={Vector2.new(0.5, 0.5)}
            BackgroundColor={Color4.rgba(255, 255, 255, 0.2)}
            BorderRadius={999}
          />

          <Frame
            Size={UDim2.fromOffset(160, 44)}
            Position={UDim2.fromScale(0.5, 0.5)}
            AnchorPoint={Vector2.new(0.5, 0.5)}
            BackgroundColor={Color4.rgba(255, 255, 255, 0.95)}
            BorderRadius={999}
          >
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1e3a8a',
                fontWeight: 800,
              }}
            >
              Anchored
            </div>
          </Frame>
        </Frame>

        {/* Bottom bar */}
        <Frame
          Size={UDim2.fromOffset(420, 56)}
          Position={UDim2.fromScale(0.5, 1)}
          AnchorPoint={Vector2.new(0.5, 0.5)}
          BackgroundColor={Color4.rgba(255, 255, 255, 0.92)}
          BorderRadius={999}
          style={{
            bottom: 28,
          }}
        >
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#111827',
              fontWeight: 700,
            }}
          >
            Position.X → left &nbsp; · &nbsp; Position.Y → top
          </div>
        </Frame>
      </Frame>
    </div>
  );
}
