// درمانگر Logo component

export function Logo({ size = 64, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/darmanegar-logo.png"
      alt="درمانگر"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

export function LogoWithText({ size = 64, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Logo size={size} />
      {showText && (
        <div className="text-teal-gradient text-3xl font-bold tracking-tight">
          درمانگر
        </div>
      )}
    </div>
  )
}
