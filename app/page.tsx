import SiteHeader from "@/components/SiteHeader";
import Hero from "@/components/Hero";
import HowIBuild from "@/components/HowIBuild";
import SelectedWork from "@/components/SelectedWork";
import Lab from "@/components/Lab";
import Contact from "@/components/Contact";
import SiteFooter from "@/components/SiteFooter";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <HowIBuild />
        <SelectedWork />
        <Lab />
        <Contact />
      </main>
      <SiteFooter />
    </>
  );
}
