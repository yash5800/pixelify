
export default function Bgmarquee(){

  const MARQUEE = [
    'Chopper segmentation', 'WebGPU on-device', 'Zero uploads',
    'Hair-level edges', 'Transparent PNG', 'No sign-up', 'Unlimited runs',
  ];

  return (
      <div className="bgr-marquee" style={{ '--rv-i': '0.2s' } as React.CSSProperties} aria-hidden="true">
        <div className="bgr-marquee-track">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i}><i>✦</i> {m}</span>
          ))}
        </div>
      </div>
  )
}