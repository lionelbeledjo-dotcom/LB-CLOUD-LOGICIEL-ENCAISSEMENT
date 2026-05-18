export function LbLogo({ size = 32 }: { size?: number }) {
  return (
    <div
      className="bg-brand rounded-md flex items-center justify-center shadow-brand"
      style={{ width: size, height: size }}
    >
      <div
        className="border-2 border-background rounded-sm"
        style={{ width: size / 2, height: size / 2 }}
      />
    </div>
  );
}
