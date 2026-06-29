import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameProvider, useGame } from "./context/GameContext";
import { supabase } from "./services/supabaseClient";
import PinPad from "./components/PinPad";
import PlayerDashboard from "./components/PlayerDashboard";
import GMDashboard from "./components/GMDashboard";
import TutorialOverlay from "./components/TutorialOverlay";
import { Loader2, AlertTriangle, LogIn } from "lucide-react";
import mascotteLogo from "../DA/mascotte_logo_app.png";

function MainAppContent() {
  const {
    gameCode,
    setGameCode,
    currentUser,
    gameState,
    loading,
    createRoom,
    joinRoom,
    registerPlayer,
    loginPlayer,
    logOut,
    toastMessage,
    showToast
  } = useGame();

  const [inputCode, setInputCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [isRegistering, setIsRegistering] = useState(false); // S'enregistrer ou Se connecter
  const [isGM, setIsGM] = useState(false);
  const [error, setError] = useState("");

  const [showTuto, setShowTuto] = useState(false);

  // Gérer le tutoriel de premier démarrage (via DB 'init' ou fallback LocalStorage)
  useEffect(() => {
    if (gameState.started && currentUser && currentUser !== "GM") {
      const cleanUser = currentUser.toUpperCase();
      const playerObj = gameState.players.find(p => p.name.toUpperCase() === cleanUser);
      const tutoDoneLocal = localStorage.getItem(`cookillers_tuto_done_${cleanUser}`) === "true";
      
      const needsTuto = playerObj ? playerObj.init : !tutoDoneLocal;
      
      if (needsTuto && !tutoDoneLocal) {
        setShowTuto(true);
      }
    } else {
      setShowTuto(false);
    }
  }, [gameState.started, currentUser, gameState.players]);

  const handleTutoComplete = async () => {
    setShowTuto(false);
    if (currentUser && currentUser !== "GM" && gameCode) {
      const cleanUser = currentUser.toUpperCase();
      localStorage.setItem(`cookillers_tuto_done_${cleanUser}`, "true");
      try {
        await supabase
          .from("players")
          .update({ init: false })
          .eq("game_code", gameCode)
          .eq("name", cleanUser);
      } catch (err) {
        console.error("Failed to complete tutorial in database:", err);
      }
    }
  };

  // Connexion automatique via URL (?join=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    if (code) {
      setInputCode(code.toUpperCase());
      joinRoom(code).catch(() => {});
    }
  }, [joinRoom]);

  // Connexion automatique si le PIN fait 4 chiffres
  useEffect(() => {
    if (pin.length === 4 && gameCode !== "PENDING") {
      handleAuth();
    }
  }, [pin, gameCode]);

  // Réinitialiser les états de connexion si le salon ou l'utilisateur est déconnecté
  useEffect(() => {
    if ((!gameCode || !currentUser) && gameCode !== "PENDING") {
      setIsGM(false);
      setPin("");
      setNickname("");
    }
  }, [gameCode, currentUser]);

  const handleJoin = async (e) => {
    e.preventDefault();
    setError("");
    if (!inputCode) return;
    try {
      await joinRoom(inputCode);
      showToast(`Salon ${inputCode} rejoint.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreate = async () => {
    setError("");
    let code = inputCode.trim().toUpperCase();
    if (!code) {
      // Générer code aléatoire
      const chars = "ABCDEFGHJKLMNOPQRSTUVWXYZ23456789";
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    if (pin.length !== 4) {
      setError("PIN à 4 chiffres requis pour le GM !");
      return;
    }
    try {
      await createRoom(code, pin);
      showToast(`Salon ${code} créé.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAuth = async () => {
    setError("");
    if (isGM) {
      if (pin.length !== 4) return;
      try {
        await loginPlayer("GM", pin);
        showToast("Bienvenue, Grand Juge ! ⚖️");
      } catch (err) {
        setError(err.message);
        setPin("");
      }
    } else {
      if (!nickname.trim()) {
        setError("Pseudo requis !");
        return;
      }
      if (pin.length !== 4) return;
      try {
        if (isRegistering) {
          await registerPlayer(nickname, pin);
          const greetName = nickname.trim().charAt(0).toUpperCase() + nickname.trim().slice(1).toLowerCase();
          showToast(`Bienvenue au camp ${greetName} ! 🏕️`);
        } else {
          const { data: dbPlayer } = await supabase
            .from("players")
            .select("init, display_name")
            .eq("game_code", gameCode)
            .ilike("name", nickname.trim())
            .maybeSingle();

          await loginPlayer(nickname, pin);

          const formattedName = dbPlayer && dbPlayer.display_name 
            ? dbPlayer.display_name 
            : (nickname.trim().charAt(0).toUpperCase() + nickname.trim().slice(1).toLowerCase());

          const isFirstConn = dbPlayer ? dbPlayer.init : true;

          if (isFirstConn) {
            showToast(`Bienvenue au camp ${formattedName} ! 🏕️`);
          } else {
            showToast(`Heureux de te revoir, ${formattedName} ! 🔪`);
          }
        }
      } catch (err) {
        setError(err.message);
        setPin("");
      }
    }
  };

  // --- RENDU ÉCRAN DE CONNEXION ---
  if (!gameCode || !currentUser) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "radial-gradient(circle at 50% 10%, #1c0e2b 0%, #08080a 80%)"
      }}>
        <div className="card-cartoon glow-purple" style={{ width: "100%", maxWidth: "340px", textAlign: "center" }}>
          
          {/* Logo & Mascotte */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.2rem" }}>
            <img 
              src={mascotteLogo} 
              alt="Logo" 
              style={{ 
                width: "160px", 
                height: "160px", 
                objectFit: "contain", 
                marginBottom: "6px", 
                filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.5))" 
              }} 
            />
            <p style={{ fontSize: "0.85rem", color: "#9ca3af", fontStyle: "italic", marginTop: "4px" }}>
              "La Chasse au Cookie Festival 2026"
            </p>
          </div>

          {/* Étape 1 : Choisir / Rejoindre le salon */}
          {!gameCode ? (
            <div>
              <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--color-cyan)", fontWeight: "bold", textAlign: "left", display: "block" }}>
                  Saisir le Code du Salon :
                </label>
                <input
                  type="text"
                  placeholder="EX: CAMP"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: "1.2rem",
                    fontWeight: "black",
                    textAlign: "center",
                    letterSpacing: "0.1em",
                    backgroundColor: "#110f22",
                    border: "3px solid #000",
                    borderRadius: "12px",
                    color: "#fff",
                    boxShadow: "3px 3px 0 #000"
                  }}
                  required
                />
                
                <button type="submit" className="btn-cartoon btn-cyan" style={{ width: "100%", marginTop: "6px" }} disabled={loading}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Rejoindre le Salon"}
                </button>
              </form>

              <div style={{ margin: "14px 0", fontSize: "0.8rem", color: "#6b7280" }}>— OU —</div>

              {/* Création de salon par le GM */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button
                  type="button"
                  className="btn-cartoon"
                  style={{ width: "100%", backgroundColor: "rgba(168, 85, 247, 0.15)", border: "2px solid var(--color-purple)" }}
                  onClick={() => {
                    setGameCode("PENDING"); // Hack temporaire pour passer à l'étape GM
                    setIsGM(true);
                  }}
                >
                  Créer un Salon (GM)
                </button>
              </div>
            </div>
          ) : (
            /* Étape 2 : Connexion / Inscription dans le salon */
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", gap: "6px" }}>
                <span className="rarity-badge" style={{ backgroundColor: isGM ? "var(--color-purple)" : "var(--color-cyan)" }}>
                  Salon : {isGM && gameCode === "PENDING" ? "Nouveau" : gameCode}
                </span>

                {/* Bouton de bascule GM / Joueur pour la connexion à un salon existant */}
                {gameCode !== "PENDING" && (
                  <button
                    type="button"
                    style={{
                      background: isGM ? "rgba(34, 211, 238, 0.15)" : "rgba(168, 85, 247, 0.15)",
                      border: isGM ? "2px solid var(--color-cyan)" : "2px solid var(--color-purple)",
                      borderRadius: "8px",
                      color: "#fff",
                      padding: "4px 8px",
                      fontSize: "0.7rem",
                      cursor: "pointer",
                      fontWeight: "bold"
                    }}
                    onClick={() => {
                      setIsGM(!isGM);
                      setPin("");
                      setNickname("");
                      setError("");
                    }}
                  >
                    {isGM ? "👤 Joueur" : "⚖️ GM"}
                  </button>
                )}

                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "0.8rem", cursor: "pointer", fontWeight: "bold" }}
                  onClick={() => {
                    logOut();
                    setIsGM(false);
                    setPin("");
                    setNickname("");
                  }}
                >
                  ◀ Changer
                </button>
              </div>

              {/* Sélecteur Connexion / Inscription */}
              {!isGM && (
                <div style={{ display: "flex", gap: "10px", backgroundColor: "#0d0a1b", border: "2px solid #000", padding: "4px", borderRadius: "10px", marginBottom: "1rem" }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: "6px",
                      border: "none",
                      borderRadius: "6px",
                      backgroundColor: !isRegistering ? "var(--color-cyan)" : "transparent",
                      color: !isRegistering ? "#000" : "#fff",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                    onClick={() => { setIsRegistering(false); setError(""); }}
                  >
                    Se Connecter
                  </button>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: "6px",
                      border: "none",
                      borderRadius: "6px",
                      backgroundColor: isRegistering ? "var(--color-cyan)" : "transparent",
                      color: isRegistering ? "#000" : "#fff",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                    onClick={() => { setIsRegistering(true); setError(""); }}
                  >
                    S'inscrire
                  </button>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", textAlign: "left" }}>
                {!isGM && (
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-cyan)" }}>Votre Pseudo :</label>
                    <input
                      type="text"
                      placeholder="Ex: Sophie"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        backgroundColor: "#110f22",
                        border: "2px solid #000",
                        borderRadius: "8px",
                        color: "#fff",
                        marginTop: "2px"
                      }}
                      required
                    />
                  </div>
                )}

                {isGM && gameCode === "PENDING" && (
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-cyan)" }}>Nom / Code du Salon :</label>
                    <input
                      type="text"
                      placeholder="EX: CAMP (Aléatoire si vide)"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        backgroundColor: "#110f22",
                        border: "2px solid #000",
                        borderRadius: "8px",
                        color: "#fff",
                        marginTop: "2px",
                        marginBottom: "6px"
                      }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--color-cyan)" }}>
                    {isGM ? "Code PIN GM (4 chiffres) :" : "Votre Code PIN (4 chiffres) :"}
                  </label>
                  <PinPad value={pin} onChange={setPin} />
                </div>

                {isGM && gameCode === "PENDING" && (
                  <button
                    type="button"
                    className="btn-cartoon btn-green"
                    style={{ width: "100%", height: "44px", marginTop: "8px" }}
                    onClick={handleCreate}
                  >
                    Valider la Création
                  </button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "var(--color-red)",
              border: "2px solid var(--color-red)",
              borderRadius: "8px",
              padding: "8px",
              marginTop: "12px",
              fontSize: "0.8rem",
              textAlign: "left"
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDU ÉCRAN DE LOBBY / ATTENTE DU DÉBUT DE PARTIE (JOUEUR) ---
  if (!gameState.started && currentUser !== "GM") {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "radial-gradient(circle at 50% 10%, #130a21 0%, #08080a 80%)"
      }}>
        <div className="card-cartoon glow-purple" style={{ width: "100%", maxWidth: "340px", textAlign: "center" }}>
          <span style={{ fontSize: "4.5rem", display: "block", animation: "fire-camp 0.8s ease-in-out infinite alternate" }}>⛺</span>
          <h2 style={{ color: "var(--color-purple)", margin: "1rem 0 0.5rem 0" }}>Lobby du Campement</h2>
          
          <span className="rarity-badge" style={{ backgroundColor: "var(--color-cyan)", margin: "0.5rem 0" }}>
            Salon : {gameCode}
          </span>

          <p style={{ fontSize: "0.9rem", color: "#d1d5db", margin: "1rem 0", lineHeight: "1.4" }}>
            Le GM prépare les couteaux...<br/>
            En attente du lancement de la chasse.
          </p>

          <div style={{ borderTop: "2px solid var(--border-color)", paddingTop: "1rem", marginTop: "1rem", textAlign: "left" }}>
            <span style={{ fontSize: "0.8rem", color: "#9ca3af", fontWeight: "bold", display: "block", marginBottom: "8px" }}>
              Assassins connectés ({gameState.players.length}) :
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {gameState.players.map(p => (
                <span
                  key={p.name}
                  style={{
                    backgroundColor: "#161320",
                    border: "2px solid #000",
                    borderRadius: "8px",
                    padding: "4px 8px",
                    fontSize: "0.8rem",
                    boxShadow: "2px 2px 0 #000"
                  }}
                >
                  👤 {p.name}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn-cartoon"
            style={{ width: "100%", marginTop: "1.5rem", backgroundColor: "#374151" }}
            onClick={logOut}
          >
            Quitter le Salon
          </button>
        </div>
      </div>
    );
  }

  // --- RENDU PRINCIPAL DU JEU ACTIF ---
  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* Toast d'alerte global */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            style={{
              position: "fixed",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 99999,
              backgroundColor: "#161320",
              border: "3px solid #000",
              borderRadius: "12px",
              boxShadow: "4px 4px 0 #000",
              padding: "10px 20px",
              fontFamily: "var(--font-title)",
              fontSize: "0.9rem",
              color: "#fff",
              textAlign: "center",
              maxWidth: "280px"
            }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rendu des Dashboards */}
      {currentUser === "GM" ? <GMDashboard /> : <PlayerDashboard />}

      {/* Tutoriel de premier démarrage en overlay */}
      {showTuto && (
        <TutorialOverlay onComplete={handleTutoComplete} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <MainAppContent />
    </GameProvider>
  );
}
