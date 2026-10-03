import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, LoaderCircle } from "lucide-react";

const track = "https://soundcloud.com/user-813074444/cooking-mama-4-kitchen-magic-ost-menu-extended";
const embed = `https://w.soundcloud.com/player/?${new URLSearchParams({ url: track, auto_play: "false", color: "#ae3e68", buying: "false", download: "false", sharing: "false", show_artwork: "false" })}`;
let apiPromise;

function loadWidgetApi() {
  if (window.SC?.Widget) return Promise.resolve(window.SC);
  if (!apiPromise) apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://w.soundcloud.com/player/api.js";
    script.onload = () => window.SC?.Widget ? resolve(window.SC) : reject(new Error("Widget unavailable"));
    script.onerror = () => { script.remove(); reject(new Error("SoundCloud unavailable")); };
    document.head.append(script);
  }).catch((error) => { apiPromise = null; throw error; });
  return apiPromise;
}

export default function MusicToggle() {
  const [state, setState] = useState("off");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const iframe = useRef(null);
  const player = useRef(null);
  const ready = useRef(false);
  const wanted = useRef(false);
  const timer = useRef(null);

  function stop() {
    wanted.current = false;
    clearTimeout(timer.current);
    player.current?.pause();
    setState("off");
  }

  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hide);
    return () => { document.removeEventListener("visibilitychange", hide); clearTimeout(timer.current); };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    let active = true;
    let widget;
    const fail = () => {
      if (!active) return;
      stop();
      setLoaded(false);
      setError("เปิดเพลงไม่ได้ ลองกดเล่นใน SoundCloud นะ");
    };
    loadWidgetApi().then((SC) => {
      if (!active) return;
      widget = SC.Widget(iframe.current);
      player.current = widget;
      widget.bind(SC.Widget.Events.READY, () => {
        if (!active) return;
        ready.current = true;
        widget.setVolume(40);
        if (wanted.current && !document.hidden) widget.play();
      });
      widget.bind(SC.Widget.Events.PLAY, () => {
        if (!active) return;
        if (!wanted.current || document.hidden) { widget.pause(); return; }
        clearTimeout(timer.current);
        setError("");
        setState("on");
      });
      widget.bind(SC.Widget.Events.PAUSE, () => {
        if (!active) return;
        wanted.current = false;
        clearTimeout(timer.current);
        setState("off");
      });
      widget.bind(SC.Widget.Events.FINISH, () => {
        if (active && wanted.current && !document.hidden) { widget.seekTo(0); widget.play(); }
      });
      widget.bind(SC.Widget.Events.ERROR, fail);
    }).catch(fail);
    return () => {
      active = false;
      ready.current = false;
      if (widget) {
        widget.pause();
        for (const event of Object.values(window.SC.Widget.Events)) widget.unbind(event);
      }
      player.current = null;
    };
  }, [loaded]);

  function toggle() {
    if (state !== "off") { stop(); return; }
    wanted.current = true;
    setError("");
    setState("loading");
    setLoaded(true);
    if (ready.current) player.current.play();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      stop();
      setLoaded(false);
      setError("เพลงยังไม่พร้อม ลองอีกครั้งหรือเปิดใน SoundCloud นะ");
    }, 20000);
  }

  const label = state === "off" ? "เปิดเพลง" : "ปิดเพลง";
  return <div className="music-control">
    <button className={`icon-button music-toggle ${state === "on" ? "is-playing" : ""}`} type="button" aria-label={label} title={label} aria-pressed={state !== "off"} onClick={toggle}>
      {state === "loading" ? <LoaderCircle size={18} className="spin" /> : state === "on" ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
    {loaded && <iframe ref={iframe} className="soundcloud-player" title="Cooking Mama 4 soundtrack on SoundCloud" src={embed} allow="autoplay" hidden={state === "off"} />}
    {error && <span className="music-error" role="alert">{error} <a href={track} target="_blank" rel="noreferrer">SoundCloud</a></span>}
  </div>;
}
