import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, LoaderCircle } from "lucide-react";
import { createKitchenMusic } from "./kitchen-music.js";

export default function MusicToggle() {
  const [state, setState] = useState("off");
  const [error, setError] = useState("");
  const player = useRef(null);
  const request = useRef(0);
  const mounted = useRef(false);

  function stop() {
    request.current += 1;
    const audio = player.current;
    if (audio?.source) {
      const source = audio.source;
      audio.source = null;
      audio.gain.gain.cancelScheduledValues(audio.context.currentTime);
      audio.gain.gain.setValueAtTime(audio.gain.gain.value, audio.context.currentTime);
      audio.gain.gain.linearRampToValueAtTime(0, audio.context.currentTime + .04);
      source.stop(audio.context.currentTime + .05);
    }
    if (mounted.current) setState("off");
  }

  useEffect(() => {
    mounted.current = true;
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hide);
    return () => {
      mounted.current = false;
      request.current += 1;
      document.removeEventListener("visibilitychange", hide);
      player.current?.context.close().catch(() => {});
      player.current = null;
    };
  }, []);

  async function toggle() {
    if (state === "on") { stop(); return; }
    if (state === "loading") return;
    const current = ++request.current;
    setError(""); setState("loading");
    try {
      if (!player.current) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) throw new Error("Audio unavailable");
        player.current = { context: new Context(), buffer: null, source: null, gain: null };
      }
      const audio = player.current;
      await audio.context.resume();
      if (!audio.buffer) audio.buffer = await createKitchenMusic();
      if (!mounted.current || current !== request.current || document.hidden) {
        if (!audio.source && audio.context.state !== "closed") await audio.context.suspend();
        return;
      }
      const source = audio.context.createBufferSource();
      const gain = audio.context.createGain();
      source.buffer = audio.buffer; source.loop = true;
      gain.gain.setValueAtTime(0, audio.context.currentTime);
      gain.gain.linearRampToValueAtTime(.55, audio.context.currentTime + .1);
      source.connect(gain); gain.connect(audio.context.destination);
      source.onended = () => {
        source.disconnect(); gain.disconnect();
        if (!audio.source && audio.context.state !== "closed") audio.context.suspend().catch(() => {});
      };
      audio.source = source; audio.gain = gain;
      source.start(); setState("on");
    } catch {
      const audio = player.current;
      if (audio && !audio.source && audio.context.state === "running") audio.context.suspend().catch(() => {});
      if (mounted.current && current === request.current) { setState("off"); setError("เปิดเพลงไม่ได้ ลองอีกครั้งนะ"); }
    }
  }

  const label = state === "on" ? "ปิดเพลง" : "เปิดเพลง";
  return <div className="music-control">
    <button className={`icon-button music-toggle ${state === "on" ? "is-playing" : ""}`} type="button" aria-label={label} title={label} aria-pressed={state === "on"} disabled={state === "loading"} onClick={toggle}>
      {state === "loading" ? <LoaderCircle size={18} className="spin" /> : state === "on" ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
    {error && <span className="music-error" role="alert">{error}</span>}
  </div>;
}
