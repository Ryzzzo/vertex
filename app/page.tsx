import SiteHeader from "@/components/SiteHeader";
import Hero from "@/components/Hero";
import HeroStage from "@/components/HeroStage";
import HowIBuild from "@/components/HowIBuild";
import SelectedWork from "@/components/SelectedWork";
import Lab from "@/components/Lab";
import Contact from "@/components/Contact";
import SiteFooter from "@/components/SiteFooter";
import { getBuildSha, getShipLog } from "@/lib/shiplog";

export default function Page() {
  /* Read once at build. The console shows this repo's own log and this
     build's own commit — nothing typed, nothing from a client repository. */
  const shiplog = getShipLog(6);
  const buildSha = getBuildSha();

  return (
    <>
      <SiteHeader wordmarkHref="#hero-heading" />
      <main>
        {/* Hero stays a Server Component; only the tilted stage ships client JS. */}
        <Hero visual={<HeroStage shiplog={shiplog} buildSha={buildSha} />} />
        <HowIBuild />
        <SelectedWork />
        <Lab />
        <Contact />
      </main>
      <SiteFooter />
    </>
  );
}
