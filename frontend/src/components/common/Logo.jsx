import { Link } from 'react-router-dom';
// import logo  '../../../public/logo.svg'

const Logo = () => {
  return (
    <div className="text-center relative py-12">
          <div className="flex items-center justify-center">
            <img src="/logo.svg" alt="Lumos Logo" className="w-12 h-12 mr-3" />
            <div className="logo text-6xl text-text">Lumos</div>
          </div>
    </div>
  );
};

export default Logo;