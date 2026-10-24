import { ImageResponse } from 'next/og';

export const alt = 'Eleições 2026 — apuração ao vivo';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#09090b', color: '#fafafa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, color: '#a1a1aa' }}>
          <div style={{ width: 20, height: 20, borderRadius: 10, background: '#34d399' }} />
          APURAÇÃO AO VIVO
        </div>
        <div style={{ fontSize: 110, fontWeight: 800, marginTop: 24 }}>Eleições 2026</div>
        <div style={{ fontSize: 44, color: '#d4d4d8', marginTop: 12 }}>2º turno · mapa por estado, cidade e exterior</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 56 }}>
          {['#e0262d', '#2f5fd0', '#2fa84f', '#f59e0b', '#5ec8f2'].map((c) => (
            <div key={c} style={{ width: 120, height: 14, borderRadius: 7, background: c }} />
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
