import Link from 'next/link'

export default function Logo({ size = 48, className = '' }: { size?: number; className?: string }) {
  // Use 120% of the size for height
  // Logo aspect ratio: 960x375 = 2.56:1 (width:height)
  const logoHeight = Math.round(size * 1.2)
  const logoWidth = Math.round(logoHeight * 2.56) // Maintain aspect ratio
  
  return (
    <Link href="/" className={`flex items-center justify-center ${className} cursor-pointer hover:opacity-80 transition-opacity`}>
      {/* Logo Image - 120% height, centered */}
      <div className="relative flex-shrink-0" style={{ height: logoHeight, width: logoWidth }}>
        <img
          src="/logo.png"
          alt="アレチェック ロゴ"
          width={logoWidth}
          height={logoHeight}
          className="object-contain w-full h-full"
          style={{ display: 'block' }}
        />
      </div>
    </Link>
  )
}


