import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '../../supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Header = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  
  // Fetch user profile to determine navigation items
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_type, mentor_verified')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user profile:', error);
          return;
        }
        
        setUserProfile(data);
      } catch (error) {
        console.error('Error in fetchUserProfile:', error);
      }
    };

    fetchUserProfile();
  }, [user]);

  // Define navigation items based on user type
  const getNavItems = () => {
    const isPureMentor = userProfile?.user_type === 'mentor';
    
    if (isPureMentor) {
      // Navigation for pure mentors
      return [
        { name: 'Dashboard', path: '/home' },
        { name: 'Community', path: '/community' },
        { 
          name: 'Inbox', 
          path: '/inbox',
          badge: unreadCount > 0 ? unreadCount : null
        },
        { name: 'Profile', path: '/profile' }
      ];
    } else {
      // Navigation for mentees and "both" users
      return [
        { name: 'Home', path: '/home' },
        { name: 'Learning Stats', path: '/stats' },
        { name: 'Community', path: '/community' },
        { 
          name: 'Inbox', 
          path: '/inbox',
          badge: unreadCount > 0 ? unreadCount : null
        },
        { name: 'Profile', path: '/profile' }
      ];
    }
  };

  // Fetch unread connection requests count
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      
      // Set up real-time subscription for new requests
      const subscription = supabase
        .channel('connection_requests')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'connection_requests',
            filter: `to_user_id=eq.${user.id}`
          }, 
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) return;
    
    try {
      const { count, error } = await supabase
        .from('connection_requests')
        .select('*', { count: 'exact', head: true })
        .eq('to_user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };
  
  // Check if a nav item is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Get current navigation items
  const navItems = getNavItems();
  
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
                className="relative"
              >
                <Link to={item.path}>
                  {item.name}
                  {item.badge && (
                    <Badge
                      variant="outline"
                      className="flex h-5 w-5 p-0 text-xs rounded-full bg-red-500 text-white"
                    >
                      {item.badge}
                    </Badge>
                  )}
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
              className="p-2"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </Button>
          </div> */}
        </div>

        {/* Mobile Navigation */}
        {/* {isMobileMenuOpen && (
          <div className="md:hidden pb-4">
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <Button
                  key={item.name}
                  variant={isActive(item.path) ? "secondary" : "ghost"}
                  size="sm"
                  asChild
                  className="justify-start relative"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Link to={item.path}>
                    {item.name}
                    {item.badge && (
                      <Badge className="ml-2 h-5 w-5 p-0 text-xs" variant="destructive">
                        {item.badge}
                      </Badge>
                    )}
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