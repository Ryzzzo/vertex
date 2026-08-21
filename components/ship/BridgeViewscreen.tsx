"use client";

/**
 * The BACK layer: the gas giant behind the viewscreen aperture.
 *
 * This is a client component for exactly one reason — `prefers-reduced-motion` has to
 * stop *playback*, not just the Ken Burns transform. CSS can cancel an animation; it
 * cannot pause a `<video autoplay loop>`. Honouring the media query in CSS alone would
 * leave a planet rotating in the corner of the eye of someone who asked for stillness,
 * which satisfies the rule as written and defeats the reason it exists.
 *
 * Everything else here is static markup and could have been server-rendered.
 */
import { useEffect, useRef } from "react";

export default function BridgeViewscreen() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    const apply = () => {
      if (query.matches) {
        video.pause();
        // Park on a frame that matches the loop point rather than wherever autoplay
        // happened to reach before the query was read.
        video.currentTime = 0;
      } else {
        // play() rejects on browsers that block autoplay even when muted; there is
        // nothing to do about it and nothing to report, so the rejection is swallowed
        // rather than left as an unhandled promise.
        void video.play().catch(() => {});
      }
    };

    apply();
    query.addEventListener("change", apply);

    // Browsers pause a playing video when the document goes hidden, and do not always
    // resume it when the tab comes back — which leaves the one moving element in the
    // scene frozen for anyone who switched tabs and returned. Re-asserting on visibility
    // costs nothing and `apply` already respects the reduced-motion request, so this
    // cannot restart playback for someone who asked for stillness.
    const onVisibility = () => {
      if (document.visibilityState === "visible") apply();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      query.removeEventListener("change", apply);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="pbridge-screen" aria-hidden="true">
      <video
        ref={ref}
        // `poster` is the loop's first frame, so the handover from poster to playback
        // is invisible even on a slow connection.
        poster="/images/bridge/viewscreen-poster.avif"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        tabIndex={-1}
      >
        {/* Ordered best-first. The browser takes the first type it can decode, so AV1
            (0.64 MB) serves Chrome/Edge/Firefox, HEVC (0.67 MB) serves Safari, and the
            2.16 MB H.264 is only ever fetched by something that can decode neither. */}
        <source
          src="/videos/bridge-viewscreen.av1.mp4"
          type='video/mp4; codecs="av01.0.05M.08"'
        />
        <source
          src="/videos/bridge-viewscreen.hevc.mp4"
          type='video/mp4; codecs="hvc1"'
        />
        <source src="/videos/bridge-viewscreen.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
