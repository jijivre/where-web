import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:3001");

function App() {
  const [playerName, setPlayerName] = useState("");
  const [connectedGuides, setConnectedGuides] = useState<string[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    socket.on("connect", () => console.log("🔗 Connecté au serveur"));

    socket.on("guidesUpdate", (guides) => setConnectedGuides(guides));
    socket.on("message", (msg) => setMessages((prev) => [...prev, msg]));

    socket.on("offer", async ({ from, offer }) => {
      if (!pcRef.current) initPeerConnection(from);
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pcRef.current?.createAnswer();
      if (answer) {
        await pcRef.current?.setLocalDescription(answer);
        socket.emit("answer", { to: from, answer });
      }
    });

    socket.on("answer", async ({ answer }) => {
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("iceCandidate", async ({ candidate }) => {
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Erreur ICE", err);
      }
    });

    return () => {
      socket.off("connect");
      socket.off("guidesUpdate");
      socket.off("message");
      socket.off("offer");
      socket.off("answer");
      socket.off("iceCandidate");
    };
  }, []);

  const connectAsGuide = () => {
    if (playerName.trim()) {
      socket.emit("joinAsGuide", playerName);
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("message", `${playerName}: ${message}`);
      setMessage("");
    }
  };

  const startCall = async () => {
    const pc = initPeerConnection();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    if (localAudioRef.current) localAudioRef.current.srcObject = stream;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("offer", { to: "all", offer });
  };

  const initPeerConnection = (targetId?: string) => {
    const pc = new RTCPeerConnection();

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("iceCandidate", { to: targetId || "all", candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0];
    };

    pcRef.current = pc;
    return pc;
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🎤 Guide Vocal (chat + audio temps réel)</h1>

      {!playerName ? (
        <div>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Votre nom"
          />
          <button onClick={connectAsGuide}>Se connecter</button>
        </div>
      ) : (
        <>
          <div>
            <strong>Connecté en tant que {playerName}</strong>
            <div>Guides: {connectedGuides.join(", ")}</div>
          </div>

          <div>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message"
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>Envoyer</button>
          </div>

          <div style={{ border: "1px solid #ddd", padding: 10, marginTop: 10, height: 150, overflowY: "auto" }}>
            {messages.map((m, i) => (
              <div key={i}>{m}</div>
            ))}
          </div>

          <button style={{ marginTop: 20 }} onClick={startCall}>
            📞 Démarrer l’appel vocal
          </button>

          <audio ref={localAudioRef} autoPlay muted />
          <audio ref={remoteAudioRef} autoPlay />
        </>
      )}
    </div>
  );
}

export default App;
