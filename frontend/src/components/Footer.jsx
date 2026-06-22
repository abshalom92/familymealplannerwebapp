import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-9 grid grid-cols-3 items-center">
        <span className="text-xs text-gray-400 justify-self-start">
          &copy; {new Date().getFullYear()} Family Meal Planner
        </span>
        <Link
          to="/feedback"
          className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline transition-colors justify-self-center text-center"
        >
          Report a bug/Submit Feedback
        </Link>
        <Link
          to="/legal"
          className="text-xs text-gray-400 hover:text-green-700 hover:underline transition-colors justify-self-end"
        >
          Legal &amp; Disclaimers
        </Link>
      </div>
    </footer>
  )
}
