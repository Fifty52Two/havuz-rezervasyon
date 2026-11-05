/** Kulvar doluluğu: her kişi için bir bölme (kapasite 20'ye kadar), üstünde düz çubuk. */
export default function Occupancy({ booked, capacity, closed }: { booked: number; capacity: number; closed: boolean }) {
  const label = closed ? "Kapalı" : `${capacity} kişilik kulvarda ${booked} kişi`;
  if (capacity <= 20) {
    return (
      <div className="flex gap-[3px]" role="img" aria-label={label}>
        {Array.from({ length: capacity }, (_, i) => (
          <span
            key={i}
            className={`h-3 flex-1 rounded-sm ${closed ? "bg-line/60" : i < booked ? "bg-lane" : "bg-line"}`}
          />
        ))}
      </div>
    );
  }
  const pct = Math.min(100, Math.round((booked / capacity) * 100));
  return (
    <div className="h-3 overflow-hidden rounded-sm bg-line" role="img" aria-label={label}>
      {!closed && <div className="h-full bg-lane" style={{ width: `${pct}%` }} />}
    </div>
  );
}
