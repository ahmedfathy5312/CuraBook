// FIX F-03: Public-page styles extracted from index.css to reduce global CSS bloat
import '../styles/public-pages.css';
import CuraBookNavbar from '../components/CuraBookNavbar';
import Footer from '../components/Footer';

export default function PublicLayout({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CuraBookNavbar />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
}
