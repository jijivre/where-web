import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:3001");

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [connectedGuides, setConnectedGuides] = useState<string[]>([]);
  const [inCall, setInCall] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("🔗 Connecté au serveur");
    });

    socket.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("audioMessage", (data) => {
      playAudio(data.audio);
      setMessages((prev) => [...prev, `🎤 ${data.from} a parlé`]);
    });

    socket.on("guidesUpdate", (guides) => {
      setConnectedGuides(guides);
    });

    return () => {
      socket.off("connect");
      socket.off("message");
      socket.off("audioMessage");
      socket.off("guidesUpdate");
    };
  }, []);

  const connectAsGuide = () => {
    const trimmed = playerName.trim();
    if (trimmed.length >= 3 && trimmed.length <= 100) {
      socket.emit("joinAsGuide", trimmed);
    } else {
      alert("Le pseudo doit contenir entre 3 et 100 caractères");
    }
  };

  const disconnectGuide = () => {
    socket.disconnect();
    setInCall(false);
    setConnectedGuides([]);
    setMessages([]);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    console.log("📴 Déconnecté du serveur");
  };

  const sendMessage = () => {
    if (message.trim() && playerName) {
      socket.emit("message", `${playerName}: ${message}`);
      setMessage("");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        const reader = new FileReader();
        reader.onloadend = () => {
          socket.emit("audioMessage", {
            from: playerName,
            audio: reader.result,
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setInCall(true);
    } catch (err) {
      console.error("❌ Erreur accès micro:", err);
      alert("Impossible d'accéder au microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const playAudio = (audioData: string) => {
    if (audioRef.current) {
      audioRef.current.src = audioData;
      audioRef.current
        .play()
        .catch((err) => console.error("Erreur lecture audio:", err));
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h1>🎤 Guide Vocal pour Unity</h1>

      {!playerName ? (
        <div style={{ textAlign: "center", marginTop: 30 }}>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Votre nom de guide (3 à 100 caractères)"
            minLength={3}
            maxLength={100}
            required
            style={{ padding: 10, marginRight: 10, fontSize: 16 }}
            onKeyDown={(e) => e.key === "Enter" && connectAsGuide()}
          />
          <button
            onClick={connectAsGuide}
            style={{
              padding: 10,
              fontSize: 16,
              background: "#4CAF50",
              color: "white",
              border: "none",
              cursor: "pointer",
              borderRadius: 5,
            }}
          >
            Se connecter
          </button>
        </div>
      ) : (
        <div>
          <div
            style={{
              marginBottom: 20,
              padding: 10,
              background: "#f0f0f0",
              borderRadius: 5,
            }}
          >
            <strong>👋 Connecté en tant que: {playerName}</strong>
            {connectedGuides.length > 1 && (
              <div style={{ marginTop: 5, fontSize: 14, color: "#666" }}>
                Autres guides:{" "}
                {connectedGuides.filter((g) => g !== playerName).join(", ")}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 20, textAlign: "center" }}>
            {!inCall ? (
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                style={{
                  padding: "15px 30px",
                  fontSize: 18,
                  background: isRecording ? "#f44336" : "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: 50,
                  cursor: "pointer",
                  transition: "all 0.3s",
                  userSelect: "none",
                }}
              >
                {isRecording ? "🔴 Relâcher pour arrêter" : "🎤 Maintenir pour parler"}
              </button>
            ) : (
              <button
                onClick={disconnectGuide}
                style={{
                  padding: "15px 30px",
                  fontSize: 18,
                  background: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: 50,
                  cursor: "pointer",
                }}
              >
                📴 Raccrocher
              </button>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message texte..."
              style={{
                padding: 10,
                width: "70%",
                marginRight: 10,
                border: "1px solid #ddd",
                borderRadius: 5,
              }}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              style={{
                padding: 10,
                background: "#2196F3",
                color: "white",
                border: "none",
                cursor: "pointer",
                borderRadius: 5,
              }}
            >
              Envoyer
            </button>
          </div>

          <div
            style={{
              height: 300,
              overflowY: "scroll",
              border: "1px solid #ddd",
              padding: 10,
              background: "#fafafa",
              borderRadius: 5,
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", color: "#666" }}>Messages:</h3>
            {messages.length === 0 ? (
              <div style={{ color: "#999", fontStyle: "italic" }}>
                Aucun message pour le moment...
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 5,
                    padding: 5,
                    background: msg.includes("🎤") ? "#e3f2fd" : "white",
                    borderRadius: 3,
                    fontSize: 14,
                  }}
                >
                  {msg}
                </div>
              ))
            )}
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "#666",
              textAlign: "center",
            }}
          >
            {connectedGuides.length} guide(s) connecté(s) •
            {isRecording ? " 🔴 Enregistrement..." : " ⚪ Prêt à parler"}
          </div>
        </div>
      )}

      <audio ref={audioRef} style={{ display: "none" }} />
    </div>
  );
}

export default App;