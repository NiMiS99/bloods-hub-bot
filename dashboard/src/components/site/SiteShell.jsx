import Navbar from './Navbar';
import Footer from './Footer';
import { ToastProvider } from './Toast';

export default function SiteShell({ children }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-dark-950 text-dark-50 flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </ToastProvider>
  );
}

export function PageHeader({ title, subtitle }) {
  return (
    <div className="relative pt-28 pb-14 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-bloods-950/60 via-dark-950 to-dark-950" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-[42rem] rounded-full bg-bloods-800/20 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          {title}
        </h1>
        {subtitle && <p className="mt-4 text-lg text-dark-300 max-w-2xl mx-auto">{subtitle}</p>}
        <div className="mt-6 mx-auto h-1 w-24 rounded-full bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500" />
      </div>
    </div>
  );
}
