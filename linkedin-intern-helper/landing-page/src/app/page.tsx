
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import HowItWorks from '@/components/HowItWorks';
import AboutDeveloper from '@/components/AboutDeveloper';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen selection:bg-cyan-500 selection:text-black">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <AboutDeveloper />
      <Footer />
    </main>
  );
}
