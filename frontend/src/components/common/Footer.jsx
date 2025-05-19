import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-primary-light">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-center text-xs text-gray-500">
            <p>&copy; {currentYear} Lumos | Platform for Women in Tech. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;