import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '../../supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Inbox, User } from 'lucide-react';
// import Logo from './Logo';

const Header = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [userProfile, setUserProfile] = useState(null);

  // Fetch profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_type, mentor_verified, profile_picture_url')
          .eq('id', user.id)
          .single();
        if (error && error.code !== 'PGRST116') throw error;
        setUserProfile(data);
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };
    fetchUserProfile();
  }, [user]);

  // Fetch unread count + realtime updates
  useEffect(() => {
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
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }
    };

    if (user) {
      fetchUnreadCount();
      const subscription = supabase
        .channel('connection_requests')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'connection_requests',
            filter: `to_user_id=eq.${user.id}`,
          },
          fetchUnreadCount
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const isActive = (path) => location.pathname === path;

  const navItems = (() => {
    const base = userProfile?.user_type === 'mentor'
      ? [
          { name: 'Dashboard', path: '/home' },
          { name: 'Community', path: '/community' },
          { name: 'Study Groups', path: '/study-groups' },
        ]
      : [
          { name: 'Home', path: '/home' },
          { name: 'Learning Stats', path: '/stats' },
          { name: 'Community', path: '/community' },
          { name: 'Study Groups', path: '/study-groups' },
        ];
    return [
      ...base,
      { name: 'Inbox', path: '/inbox', badge: unreadCount > 0 ? unreadCount : null },
      { name: 'Profile', path: '/profile' },
    ];
  })();

  return (
    <header className="bg-white border-b border-border fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/home" className="flex items-center group">
              <img
                src="/Lumos/logo5.png"
                alt="Lumos Logo"
                className="h-10 transition-transform group-hover:scale-110"
              />
              {/* <span
                className="ml-3 text-3xl font-normal text-foreground transition-colors group-hover:text-primary"
                style={{ fontFamily: 'Cookie, serif' }}
              >
                Lumos
              </span> */}
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => {
              const activeClasses = 'bg-lumos-primary-dark text-white scale-105 shadow-md font-medium';
              const baseBtnClasses = 'relative transition hover:bg-primary/10 hover:scale-105';

              // Inbox as icon button
              if (item.name === 'Inbox') {
                return (
                  <Button
                    key="inbox"
                    variant="ghost"
                    size="sm"
                    asChild
                    className={`p-3 rounded-full ${baseBtnClasses} ${
                      isActive(item.path) ? activeClasses : ''
                    }`}
                  >
                    <Link to={item.path}>
                      <Inbox
                        className={`transition ${isActive(item.path) ? 'w-7 h-7' : 'w-6 h-6'}`}
                        aria-label="Inbox"
                      />
                      {item.badge && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs rounded-full bg-red-500 text-white">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                );
              }

              // Profile as avatar button
              if (item.name === 'Profile') {
                return (
                  <Link
                    key="profile"
                    to={item.path}
                    className={`inline-flex items-center p-1 rounded-full ${baseBtnClasses} ${
                      isActive(item.path) ? activeClasses : ''
                    }`}
                  >
                    <Avatar className="w-8 h-8">
                      {userProfile?.profile_picture_url ? (
                        <AvatarImage src={userProfile.profile_picture_url} alt="avatar" />
                      ) : (
                        <AvatarFallback>
                          <User className="w-5 h-5" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Link>
                );
              }

              // Other nav items
              return (
                <Button
                  key={item.name}
                  variant="ghost"
                  size="sm"
                  asChild
                  className={`px-3 py-2 rounded-full ${baseBtnClasses} ${
                    isActive(item.path) ? activeClasses : ''
                  }`}
                >
                  <Link to={item.path}>{item.name}</Link>
                </Button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;