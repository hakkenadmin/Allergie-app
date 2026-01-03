export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-600 mb-2">
              © {currentYear} 一般社団法人HAKKEN
            </p>
            <p className="text-xs text-gray-500">
              すべての権利を保有します。
            </p>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-2">
            <a
              href="http://hakken-world.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-logo-blue hover:text-blue-700 hover:underline transition-colors"
            >
              会社情報
            </a>
            <span className="text-xs text-gray-500">
              http://hakken-world.com
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}


