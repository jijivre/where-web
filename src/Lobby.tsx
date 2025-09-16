import { useEffect, useState } from "react";
import { BeatLoader } from "react-spinners";
import './Lobby.css';
import { useLocation, useNavigate } from "react-router";
import { socket } from './webrtc';
import mapImage from './assets/map_level_one_export.png';

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
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  useEffect(() => {
    const isPageReload = !socket.connected && initialPlayers.length === 0;

    if (isPageReload) {
      setIsReconnecting(true);
      navigate("/", {
        state: {
          error: "Session expirée après rechargement. Veuillez vous reconnecter."
        }
      });
      return;
    }

    setShowModal(true);

    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => {
      socket.on("room:players", (list: any[]) => {
        setPlayers(list);
        const current = list.find(p => p.socketId === socket.id);
        if (current) {
          setCurrentPlayer(current.pseudo);
        }
      });
    };

    if (socket.connected) {
      handleConnect();
    } else {
      socket.on("connect", handleConnect);
    }

    socket.on("disconnect", () => {
      navigate("/", {
        state: {
          error: "Connexion perdue. Veuillez vous reconnecter."
        }
      });
    });

    return () => {
      socket.off("room:players");
      socket.off("disconnect");
      socket.off("connect", handleConnect);
    };
  }, [navigate, initialPlayers.length]);

  const submitPseudo = () => {
    const p = pseudoInput.trim();
    if (!p) {
      setError("Entrez un pseudo.");
      return;
    }
    setError("");

    socket.emit("player:create", p, (ack?: { ok: boolean; pseudo?: string; error: string}) => {
      if (!ack?.ok) {
        setTimeout(() => {
          navigate("/", {
            state: {
              error: ack?.error || "Erreur de connexion. Veuillez réessayer."
            },
          });
        }, 100);
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

  if (isReconnecting) {
    return (
      <div className="lobby-layout" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <BeatLoader size={10} color="#007bff" />
          <p style={{ marginTop: '20px', color: '#666' }}>Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-layout">
      <div className="unity-zone">
        <div className="unity-label">Carte du jeu</div>
        <div className="unity-viewport">
          <img
            src={mapImage}
            alt="Carte du jeu"
            className="game-map-image"
          />
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