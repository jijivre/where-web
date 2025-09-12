import { useEffect, useRef, useState } from "react";
import { initCall, endCall, socket } from "./webrtc";

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [playerName, setPlayerName] = useState("");
  const [connectedGuides, setConnectedGuides] = useState<string[]>([]);
  const [inCall, setInCall] = useState(false);

  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("🔗 Connecté au serveur");
    });

    socket.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("guidesUpdate", (guides) => {
      setConnectedGuides(guides);
    });

    return () => {
      socket.off("connect");
      socket.off("message");
      socket.off("guidesUpdate");
    };
  }, []);

  const connectAsGuide = () => {
    if (playerName.trim().length > 1) { // ⚡ au moins 2 caractères
      socket.emit("joinAsGuide", playerName);
    } else {
      alert("⚠️ Choisis un pseudo d'au moins 2 caractères");
    }
  };

  const sendMessage = () => {
    if (message.trim() && playerName) {
      socket.emit("message", `${playerName}: ${message}`);
      setMessage("");
    }
  };

  const startCall = async () => {
    if (remoteAudioRef.current) {
      await initCall(remoteAudioRef.current);
      setInCall(true);
    }
  };

  const stopCall = () => {
    endCall();
    setInCall(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h1>🎤 Appel Audio Temps Réel</h1>

      {!playerName ? (
        <div>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Votre pseudo"
            style={{ padding: 10, marginRight: 10 }}
            onKeyDown={(e) => e.key === "Enter" && connectAsGuide()} // ✅ corrigé
          />
          <button onClick={connectAsGuide}>Se connecter</button>
        </div>
      ) : (
        <div>
          <p>Connecté en tant que: {playerName}</p>
          {connectedGuides.length > 1 && (
            <p>
              Autres guides:{" "}
              {connectedGuides.filter((g) => g !== playerName).join(", ")}
            </p>
          )}

          {!inCall ? (
            <button onClick={startCall}>📞 Démarrer appel</button>
          ) : (
            <button onClick={stopCall} style={{ background: "red", color: "white" }}>
              🔴 Raccrocher
            </button>
          )}

          <div style={{ marginTop: 20 }}>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message texte..."
              style={{ padding: 10, marginRight: 10 }}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>Envoyer</button>
          </div>

          <div
            style={{
              marginTop: 20,
              border: "1px solid #ddd",
              padding: 10,
              height: 200,
              overflowY: "scroll",
            }}
          >
            {messages.map((msg, i) => (
              <div key={i}>{msg}</div>
            ))}
          </div>
        </div>
      )}

      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />
    </div>
  );
}

export default App;