import SiteHeader from "@/components/SiteHeader";
import Hero from "@/components/Hero";
import HeroStage from "@/components/HeroStage";
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
        {/* Hero stays a Server Component; only the tilted stage ships client
            JS, and the pill is server-rendered from the same labs array the
            /labs index reads. */}
        <Hero visual={<HeroStage />} pill={<AnnouncementPill />} />
        <HowIBuild />
        <SelectedWork />
        <Lab />
        <Contact />
      </main>
      <SiteFooter />
    </>
  );
}
