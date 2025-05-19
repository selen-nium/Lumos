import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';

const Header = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Define the navigation items
  const navItems = [
    { name: 'Home', path: '/home' },
    { name: 'Learning Stats', path: '/stats' },
    { name: 'Community', path: '/community' },
    { name: 'Profile', path: '/profile' }
  ];
  
  // Check if a nav item is active
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  return (
    <header className="bg-primary-light shadow-sm fixed top-0 left-0 right-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/home" className="flex items-center">
                <img src="/logo.svg" alt="Lumos Logo" className="w-11 h-11 mr-1" />
                <span className="logo ml-2 text-4xl">Lumos</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`px-3 py-2 rounded-md text-s font-medium ${
                  isActive(item.path)
                    ? 'underline'
                    : 'text-gray-400 hover:underline'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
      
    </header>
  );
};

export default Header;