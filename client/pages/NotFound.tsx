import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center space-y-8 max-w-2xl">
        <div className="space-y-4">
          <h1 className="text-9xl font-urbanist font-bold text-orange">404</h1>
          <h2 className="text-4xl font-lufga font-bold text-gray-text">
            Oops! Page not found
          </h2>
          <p className="text-xl font-lufga text-gray-light leading-relaxed">
            The page you're looking for doesn't exist. It might have been moved,
            deleted, or you entered the wrong URL.
          </p>
        </div>

        <a
          href="/"
          className="inline-flex items-center space-x-3 px-8 py-4 bg-orange rounded-full text-white font-lufga text-xl font-medium hover:bg-orange/90 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
          <span>Return to Home</span>
        </a>

        {/* Decorative element */}
        <div className="pt-8">
          <svg
            className="w-16 h-16 text-orange-light mx-auto opacity-50"
            viewBox="0 0 74 85"
            fill="none"
          >
            <path
              d="M71.3106 36.2314C69.6282 43.8914 58.6036 57.529 61.2166 82.1913M54.1233 23.0889C40.7223 31.2977 12.4002 52.1992 6.31996 70.1346M50.3888 3.53325C43.5799 2.03784 24.5811 1.61227 3.05674 11.8733"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
