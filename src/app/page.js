import AboutFounder from "@/components/AboutFounder";
import Features from "@/components/Features";
import Hero from "@/components/hero";
import Roadmap from "@/components/Roadmap";
import { TextParallaxContentExample } from "@/components/SmoothScroll";

export default function Home() {
  return (
    <div className="w-full">
      <Hero />
      <AboutFounder />
      <Features />
      <TextParallaxContentExample />
      <Roadmap />
    </div>
  );
}
