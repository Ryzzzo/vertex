import SiteHeader from "@/components/SiteHeader";
import Hero from "@/components/Hero";
import HeroIsometric from "@/components/HeroIsometric";
import AnnouncementPill from "@/components/AnnouncementPill";
import HowIBuild from "@/components/HowIBuild";
import SelectedWork from "@/components/SelectedWork";
import Lab from "@/components/Lab";
import Contact from "@/components/Contact";
import SiteFooter from "@/components/SiteFooter";

export default function Page() {
  return (
    <>
      <SiteHeader wordmarkHref="#hero-heading" />
      <main>
        {/* Passed as children so the SVG and the pill stay server-rendered and
            out of the client bundle, even though Hero itself is a client
            component for the entrance animation. */}
        <Hero visual={<HeroIsometric />} pill={<AnnouncementPill />} />
        <HowIBuild />
        <SelectedWork />
        <Lab />
        <Contact />
      </main>
      <SiteFooter />
    </>
  );
}
