import { useEffect, useState } from "react";
import { BeatLoader } from "react-spinners";
import './Lobby.css';
import { useLocation, useNavigate } from "react-router";
import { socket } from './webrtc';

function Lobby() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialPlayers = (location.state as { players: string[] } | undefined)?.players || [];

  const [players, setPlayers] = useState<any[]>(initialPlayers);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [pseudoInput, setPseudoInput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [currentPlayer, setCurrentPlayer] = useState<string>("");
  const [roomId] = useState<string>("123456");

  useEffect(() => {
    setShowModal(true);

    socket.on("room:players", (list: any[]) => {
      setPlayers(list);
      const current = list.find(p => p.socketId === socket.id);
      if (current) {
        setCurrentPlayer(current.pseudo);
      }
    });

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

    socket.emit("player:create", p, (ack?: { ok: boolean; pseudo?: string; error: string}) => {
      if (!ack?.ok) {
        if(ack?.error === "Room non trouvée pour ce joueur") {
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

      setCurrentPlayer(p);
      setShowModal(false);
    });
  };

  const quitLobby = () => {
    socket.disconnect();
    navigate("/");
  };

  return (
    <div className="lobby-layout">
      <div className="unity-zone">
        <div className="unity-label">Carte du jeu</div>
        <div className="unity-viewport">
        </div>
      </div>

      <div className="interface-zone">
        <div className="header-section">
          <div className="player-name-display">
            {currentPlayer || "Anonyme"}
          </div>
          <div className="room-id-display">
            {roomId}
          </div>
        </div>

        <div className="players-list-section">
          <div className="players-list-title">
            Joueurs connectés
          </div>
          <div className="players-vertical-list">
            {players.map((player) => (
              <div
                key={player.socketId}
                className={`player-circle ${player.socketId === socket.id ? 'current-player' : ''}`}
                title={player.pseudo || "Anonyme"}
              >
                {!player.pseudo || player.pseudo.toLowerCase() === "anonyme" ? (
                  <BeatLoader size={4} color="white" />
                ) : (
                  <span className="player-initial">
                    {player.pseudo.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <button onClick={quitLobby} className="quit-button-absolute">
        ✕
      </button>

      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pseudo-title">
          <div className="modal-content">
            <h3 id="pseudo-title">Choisis ton pseudo</h3>
            <input
              autoFocus
              type="text"
              placeholder="Votre pseudo"
              value={pseudoInput}
              onChange={(e) => setPseudoInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitPseudo()}
              className="pseudo-input"
            />
            {error && <p className="error-message">{error}</p>}
            <div className="modal-buttons">
              <button onClick={submitPseudo} className="validate-button">
                Valider
              </button>
            </div>
            <p className="modal-hint">
              💡 Astuce : ton pseudo sera mémorisé pour ce lobby.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lobby;