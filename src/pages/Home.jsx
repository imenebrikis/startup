
import Hero from "../components/Hero";
import HowItWorks from "../components/HowItWorks";
import Footer from "../components/Footer";

// Public landing page. Full-bleed: the Hero (mint) and Footer (teal) carry their
// own full-width backgrounds, so they touch the browser edges. The container's
// beige keeps the transparent "How It Works" section on the brand cream.
export default function Home() {
  return (
    <div className="w-full flex flex-col bg-[#F3EEE0]">
      <Hero />
      <HowItWorks />
      <Footer />
    </div>
  );
}
