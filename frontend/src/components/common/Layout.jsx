import React from 'react';
import Header from './Header';
import Footer from './Footer';

const Layout = ({ children }) => {
  return (
    <div className="flex flex-col">
      <Header className='fixed top-0 left-0 right-0 z-10'/>
      <main className="flex-grow bg-primary-light pt-22">
        {children}
      </main>
      {/* <Footer /> */}
    </div>
  );
};

export default Layout;