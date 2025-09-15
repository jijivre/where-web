import { useEffect, useState } from "react";
import { BeatLoader } from "react-spinners";
import './Lobby.css';
import { useLocation, useNavigate } from "react-router";
import { socket } from './webrtc';

function Lobby() {


  const location = useLocation();

  const initialPlayers = (location.state as { players: string[] } | undefined)?.players || [];

  const [players, setPlayers] = useState<any[]>(initialPlayers);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [pseudoInput, setPseudoInput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();
 
  useEffect(() => {

    setShowModal(true);

    socket.on("room:players", (list: any[]) =>
    {
        setPlayers(list);
    });

    socket.on("game:started", ()=>{
      console.log("Lancement du jeu");
        navigate("/game", {
        state: {
          socketId: socket.id
        },
    });
    })

    return () => {
        socket.off("room:players");
    };
  }, []);

  const submitPseudo = () => {
    const p = pseudoInput.trim();
    if (!p) {
      setError("Entrez un pseudo.");
      return;
    }
    setError("");

    socket.emit("player:create", p, (ack?: { ok: boolean; pseudo?: string; error:string}) => {

      if (!ack?.ok) {

        if(ack?.error == "Room non trouvée pour ce joueur")
        {
          navigate("/", {
            state: {
              error: ack?.error 
            },
          });
          return;
        }

        setError("Pseudo déjà pris. Réessaie.");
        return;
      }

      setShowModal(false);
    });
  };

  const quitLobby = () => {
    socket.disconnect();
    navigate("/");
  }

  return (
    <div style={{ fontFamily: "system-ui" }}>
      <button
        onClick={quitLobby}
        style={{ position: "absolute", top: 16, right: 16, padding: "8px 12px", border: "none", background: "#ffffffff", color: "black", cursor: "pointer" }}
      >
        Quitter le lobby
      </button>
      <main style={{ maxWidth: 720, margin: "24px auto", padding: "0 16px" }}>
        <h3>Joueurs connectés</h3>
        {players.length === 0 ? (
          <p>Aucun joueur pour l’instant…</p>
        ) : (
          <div className="list-player">
              {players.map((p) => (
                <div className="card-player" key={p.socketId}>
                  {!p.pseudo || p.pseudo.toLowerCase() === "anonyme" ? <BeatLoader size={8} color="white"/> : p.pseudo}
                </div>
              ))}
          </div>
        )}
      </main>


      {showModal && (
        <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="pseudo-title">
          <div style={modalStyle}>
            <h3 id="pseudo-title" style={{ marginTop: 0 }}>Choisis ton pseudo</h3>
            <input
              autoFocus
              type="text"
              placeholder="Votre pseudo"
              value={pseudoInput}
              onChange={(e) => setPseudoInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitPseudo()}
              style={inputStyle}
            />
            {error && <p style={{ color: "#b91c1c", margin: "8px 0 0" }}>{error}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={submitPseudo} style={btnPrimary}>Valider</button>
            </div>
            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>
              Astuce : ton pseudo sera mémorisé pour ce lobby.
            </p>
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        <BeatLoader color="white"/>
        <p>En attente du joueur Unity</p>
      </div>
    </div>
  );
}


const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.4)",
  display: "grid",
  placeItems: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  width: "min(92vw, 420px)",
  background: "#fff",
  padding: 20,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 28,
  border: "1px solid #e5e7eb",
  padding: "0 12px",
  fontSize: 16,
  outline: "none",
};

const btnPrimary: React.CSSProperties = {
  height: 40,
  padding: "0 14px",
  border: "none",
  background: "#111827",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};


export default Lobby;
