import React from 'react';
import Header from './Header';
import Footer from './Footer';

const Layout = ({ children }) => {
  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-16">
        {children}
      </main>
    </div>
  );
};

export default Layout;