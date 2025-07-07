import '@testing-library/jest-dom';

// Simple polyfill for missing browser APIs
Object.assign(global, {
  TextEncoder: class TextEncoder {
    encode(str) {
      return new Uint8Array([...str].map(char => char.charCodeAt(0)));
    }
  },
  TextDecoder: class TextDecoder {
    decode(bytes) {
      return String.fromCharCode(...bytes);
    }
  }
});

// Mock React Router if you're importing it
jest.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' })
}));