import { Link } from 'react-router-dom';

const Logo = () => {
  return (
    <div className="text-center py-2">
      <Link to="/home" className="inline-flex items-center group">
        <img
          src="/Lumos/logo5.png"
          alt="Lumos Logo"
          className="h-16 mr-4 transition-transform group-hover:scale-105"
        />
        {/* <div
          className="text-7xl text-foreground transition-colors group-hover:text-lumos-primary duration-300"
          style={{ fontFamily: 'Cookie, serif' }}
        >
          Lumos
        </div> */}
      </Link>
    </div>
  );
};

export default Logo;