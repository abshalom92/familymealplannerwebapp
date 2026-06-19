import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-9 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Family Meal Planner
        </span>
        <Link
          to="/legal"
          className="text-xs text-gray-400 hover:text-green-700 hover:underline transition-colors"
        >
          Legal &amp; Disclaimers
        </Link>
      </div>
    </footer>
  )
}
