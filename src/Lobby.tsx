import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { BeatLoader } from "react-spinners";
import { socket } from "./webrtc";
import mapImage from "./assets/map_level_one_export.png";
import mapWalls from "./assets/walls_map_level_one_export.png";
import mapBox from "./assets/box_map_level_one_export.png";
import mapBox2 from "./assets/box2_map_level_one_export.png";
import mapLadder from "./assets/ladder_map_level_one_export.png";
import mapVase from "./assets/vase_map_level_one_export.png";
import mapBox3 from "./assets/box3_map_level_one_export.png";
import mapChest from "./assets/chest_map_level_one_export.png";

import "./Lobby.css";

type ObstacleType =
  | "walls"
  | "box"
  | "box2"
  | "ladder"
  | "vase"
  | "box3"
  | "chest";

function Lobby() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as { players?: any[]; roomId?: string } | undefined;
  const initialPlayers = state?.players || [];

  const [players, setPlayers] = useState<any[]>(initialPlayers);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [pseudoInput, setPseudoInput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [currentPlayer, setCurrentPlayer] = useState<string>("");

  const [myObstacle, setMyObstacle] = useState<ObstacleType | null>(null);
  const [unityPlayerPosition, setUnityPlayerPosition] = useState<{ x: number; y: number; pseudo: string } | null>(null);

  const [roomId] = useState<string>(state?.roomId || "");

  const mapByObstacle: Record<ObstacleType, string> = {
    walls: mapWalls,
    box: mapBox,
    box2: mapBox2,
    ladder: mapLadder,
    vase: mapVase,
    box3: mapBox3,
    chest: mapChest,
  };

  const displayedMap = myObstacle ? mapByObstacle[myObstacle] : mapImage;

  useEffect(() => {
    if (!roomId) {
      navigate("/", { state: { error: "Aucune salle trouvée" } });
      return;
    }

    setShowModal(true);

    socket.emit("room:join", { roomId });

    socket.on("room:players", (list: any[]) => {
      setPlayers(list);
      const current = list.find((p) => p.socketId === socket.id);
      if (current) {
        setCurrentPlayer(current.pseudo);
      }
    });

    socket.on("game:started", () => {
      console.log(players);
    });

    const onObstacleAssigned = ({ obstacleType }: { obstacleType: ObstacleType | null }) => {
      setMyObstacle(obstacleType);
    };

    const onPlayerPositionUpdate = (data: { 
      socketId: string; 
      pseudo: string; 
      position: { x: number; y: number }; 
      timestamp: number 
    }) => {
      console.log("Position recue:", data);
      setUnityPlayerPosition({
        x: data.position.x,
        y: data.position.y,
        pseudo: data.pseudo
      });
    };

    socket.on("obstacle:assigned", onObstacleAssigned);
    socket.on("player:position:update", onPlayerPositionUpdate);

    return () => {
      socket.off("room:players");
      socket.off("obstacle:assigned", onObstacleAssigned);
      socket.off("player:position:update", onPlayerPositionUpdate);
    };
  }, [roomId, navigate]);

  const submitPseudo = () => {
    const p = pseudoInput.trim();
    if (!p) {
      setError("Entrez un pseudo.");
      return;
    }
    setError("");

    socket.emit(
      "player:create",
      p,
      (ack?: { ok: boolean; pseudo?: string; error: string }) => {
        if (!ack?.ok) {
          if (ack?.error === "Room non trouvée pour ce joueur") {
            navigate("/", { state: { error: ack?.error } });
            return;
          }
          setError("Pseudo déjà pris. Réessaie.");
          return;
        }

        setCurrentPlayer(p);
        setShowModal(false);
      }
    );
  };

  const quitLobby = () => {
    if (roomId) {
      socket.emit("room:leave", { roomId });
    }
    socket.disconnect();
    navigate("/");
  };

  return (
    <div className="lobby-layout">
      <div className="unity-zone">
        <div className="unity-label">Carte du jeu</div>
        <div className="unity-viewport">
          <img src={displayedMap} alt="Carte du jeu" className="game-map-image" />
          {unityPlayerPosition && (
            <div 
              className="player-marker"
              style={{
                left: `${unityPlayerPosition.x * 100}%`,
                top: `${unityPlayerPosition.y * 100}%`,
              }}
            >
              <div className="marker-dot"></div>
              <div className="marker-label">{unityPlayerPosition.pseudo}</div>
            </div>
          )}
        </div>
      </div>

      <div className="interface-zone">
        <div className="header-section">
          <div className="player-name-display">
            {currentPlayer || "Anonyme"}
          </div>
          <div className="room-id-display">{roomId}</div>
        </div>


        <div className="players-list-section">
          <div className="players-list-title">Joueurs connectés</div>
          <div className="players-vertical-list">
            {players.map((player) => (
              <div
                key={player.socketId}
                className={`player-circle ${
                  player.socketId === socket.id ? "current-player" : ""
                }`}
                title={player.pseudo || "Anonyme"}
              >
                {!player.pseudo ||
                player.pseudo.toLowerCase() === "anonyme" ? (
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

        <div style={{ marginTop: 20 }}>
          <button onClick={quitLobby} className="quit-button">
            🚪 Quitter le lobby
          </button>
        </div>
      </div>

      {showModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pseudo-title"
        >
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
              💡 Astuce : ton pseudo sera valide pour cette session.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lobby;