import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, LoaderCircle } from "lucide-react";

export default function MusicToggle() {
  const [state, setState] = useState("off");
  const [error, setError] = useState("");
  const player = useRef(null);
  const request = useRef(0);

  function stop() {
    request.current += 1;
    player.current?.pause();
    setState("off");
  }

  useEffect(() => {
    const audio = player.current;
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hide);
    return () => {
      request.current += 1;
      audio.pause();
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);

  async function toggle() {
    if (state !== "off") { stop(); return; }
    const current = ++request.current;
    const audio = player.current;
    setError("");
    setState("loading");
    audio.volume = .4;
    // Assign the source only after a tap, avoiding any initial audio download.
    if (!audio.getAttribute("src")) audio.src = `${import.meta.env.BASE_URL}title-screen.mp3`;
    try {
      await audio.play();
      if (current !== request.current) return;
      if (document.hidden) { stop(); return; }
      setState("on");
    } catch {
      if (current !== request.current) return;
      setState("off");
      setError("เปิดเพลงไม่ได้ ลองอีกครั้งนะ");
    }
  }

  const label = state === "off" ? "เปิดเพลง" : "ปิดเพลง";
  return <div className="music-control">
    <audio ref={player} loop preload="none" onPause={() => setState("off")} onError={() => {
      stop();
      setError("เปิดเพลงไม่ได้ ลองอีกครั้งนะ");
    }} />
    <button className={`icon-button music-toggle ${state === "on" ? "is-playing" : ""}`} type="button" aria-label={label} title={label} aria-pressed={state !== "off"} onClick={toggle}>
      {state === "loading" ? <LoaderCircle size={18} className="spin" /> : state === "on" ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
    {error && <span className="music-error" role="alert">{error}</span>}
  </div>;
}
