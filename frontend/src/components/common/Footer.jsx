import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} Lumos | Platform for Women in Tech. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;