import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

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
    <header className="bg-background/95 backdrop-blur-sm border-b border-border fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/home" className="flex items-center group">
              <img 
                src="/Lumos/logo.svg" 
                alt="Lumos Logo" 
                className="w-8 h-8 transition-transform group-hover:scale-110 group-hover:rotate-20" 
              />
              <span 
                className="ml-3 text-3xl font-normal text-foreground transition-colors group-hover:text-primary"
                style={{ fontFamily: 'Cookie, serif' }}
              >
                Lumos
              </span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Button
                key={item.name}
                variant={isActive(item.path) ? "secondary" : "primary"}
                size="sm"
                asChild
              >
                <Link to={item.path}>
                  {item.name}
                </Link>
              </Button>
            ))}
          </nav>
          
          {/* Mobile menu button */}
          {/* <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </Button>
          </div> */}
        </div>
        
        {/* Mobile Navigation */}
        {/* {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border animate-fade-in">
            <nav className="py-4 space-y-1">
              {navItems.map((item) => (
                <Button
                  key={item.name}
                  variant={isActive(item.path) ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  asChild
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Link to={item.path}>
                    {item.name}
                  </Link>
                </Button>
              ))}
            </nav>
          </div>
        )} */}
      </div>
    </header>
  );
};

export default Header;
