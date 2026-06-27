import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "../context/GameContext";
import Leaderboard, { getRank } from "./Leaderboard";
import { AlertCircle, Eye, EyeOff, HelpCircle, Send, Plus, Minus, Camera, X } from "lucide-react";

export default function PlayerDashboard() {
  const {
    currentUser,
    gameState,
    isOnline,
    toastMessage,
    skipMission,
    abandonTarget,
    declareHit,
    launchCounterAttack,
    submitFountainProof,
    suggestAction,
    freezePlayer,
    unfreezePlayer,
    updatePlayerPhoto,
    manualRefresh,
    showToast
  } = useGame();

  const player = gameState.players.find(p => p.name === currentUser);

  // Onglets : 'contrat', 'source', 'suggestion', 'classement'
  const [activeTab, setActiveTab] = useState("contrat");
  const [isMasked, setIsMasked] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [showFountainModal, setShowFountainModal] = useState(false);
  
  // États de l'aide contextuelle
  const [isHelpActive, setIsHelpActive] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);

  // Mode réduction performances
  const [lowPerfMode, setLowPerfMode] = useState(() => {
    return localStorage.getItem("cookillers_low_perf") === "true";
  });

  // Parallaxe souris/gyroscope
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });

  // Inputs formulaires
  const [counterSuspect, setCounterSuspect] = useState("");
  const [counterAction, setCounterAction] = useState("");
  const [suggestTitle, setSuggestTitle] = useState("");
  const [suggestDesc, setSuggestDesc] = useState("");
  const [suggestReward, setSuggestReward] = useState(100);
  const [suggestDamage, setSuggestDamage] = useState(1.5);
  
  // Fontaine
  const [fountainType, setFountainType] = useState("verite"); // 'action' ou 'verite'
  const [fountainTextProof, setFountainTextProof] = useState("");
  const [fountainPhotoProof, setFountainPhotoProof] = useState("");
  const [fountainChoice, setFountainChoice] = useState(null); // défi pioché

  // Zombie victime selection
  const [zombieVictim, setZombieVictim] = useState("");

  // Mascotte sarcastique
  const [mascotteQuote, setMascotteQuote] = useState("");
  const [showMascotte, setShowMascotte] = useState(false);

  useEffect(() => {
    localStorage.setItem("cookillers_low_perf", lowPerfMode ? "true" : "false");
  }, [lowPerfMode]);

  // Mascotte quotes
  const quotes = [
    "Psst... tu as pensé à regarder derrière toi ? (Juste au cas où).",
    "Le Grand Juge dort à moitié sur sa console. C'est le moment d'assassiner en douce.",
    "Faire une fausse accusation ? Oui, c'est idéal si tu veux mourir plus vite.",
    "Mordre un survivant n'est pas poli, mais c'est excellent pour ta décomposition.",
    "Ce festival est plein de cookies savoureux... et de cibles faciles.",
    "Ne fais pas cette tête, perdre un cœur est juste une étape vers le Mode Moisi !"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        setMascotteQuote(quotes[Math.floor(Math.random() * quotes.length)]);
        setShowMascotte(true);
        setTimeout(() => setShowMascotte(false), 6000);
      }
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Parallaxe souris (Hub)
  useEffect(() => {
    if (lowPerfMode) return;
    const handleMouseMove = (e) => {
      const x = (e.clientX - window.innerWidth / 2) / 30;
      const y = (e.clientY - window.innerHeight / 2) / 30;
      setParallaxOffset({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [lowPerfMode]);

  if (!player) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", fontFamily: "var(--font-title)" }}>
        <h2>Session perdue</h2>
        <p style={{ marginTop: "1rem" }}>Veuillez vous reconnecter au campement.</p>
      </div>
    );
  }

  const isZombie = player.isZombie;
  const currentAction = gameState.actionPool.find(a => a.id === player.actionId);
  const myKiller = gameState.players.find(p => p.target === player.name);

  // Vérifier si un arbitrage est déjà en cours dans l'historique
  const pendingHit = gameState.history.find(
    h => h.playerName === player.name && h.status === "pending" && h.type === "hit_declared"
  );
  const pendingCounter = gameState.history.find(
    h => h.playerName === player.name && h.status === "pending" && h.type === "counter_attack_pending"
  );

  // ECG Line color based on health
  let ecgClass = "ecg-scroll";
  if (isZombie) ecgClass = "ecg-flatline";
  else if (player.lives < 2.0) ecgClass = "ecg-danger";
  else if (player.lives < 4.0) ecgClass = "ecg-medium";

  // Déterminer la rareté du défi
  let rarityClass = "card-common";
  let rarityLabel = "Commun";
  if (currentAction) {
    if (currentAction.scoreReward >= 400) {
      rarityClass = "card-legendary";
      rarityLabel = "Légendaire";
    } else if (currentAction.scoreReward >= 200) {
      rarityClass = "card-elite";
      rarityLabel = "Élite";
    } else if (currentAction.scoreReward >= 100) {
      rarityClass = "card-standard";
      rarityLabel = "Standard";
    }
  }

  // Gérer la photo
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updatePlayerPhoto(player.name, reader.result);
      showToast("Photo de profil mise à jour avec succès ! 📸");
    };
    reader.readAsDataURL(file);
  };

  // Soumission Déclaration Meurtre
  const handleHitSubmit = () => {
    if (pendingHit) return;
    // Si zombie : morsure, sinon hit normal
    if (isZombie) {
      if (!zombieVictim) {
        showToast("Veuillez sélectionner une victime à mordre ! 🧟");
        return;
      }
      const zombieAction = currentAction || { title: "Morsure Zombie", scoreReward: 50, damagePenalty: 1.0 };
      declareHit(zombieVictim, zombieAction.title, 50, 1.0);
      showToast("Morsure déclarée au Grand Juge !");
    } else {
      declareHit(player.target, currentAction.title, currentAction.scoreReward, currentAction.damagePenalty);
      showToast("Neutralisation envoyée au Grand Juge !");
    }
  };

  // Soumission Contre-Attaque
  const handleCounterAttack = () => {
    if (!counterSuspect || !counterAction) {
      showToast("Formulaire incomplet !");
      return;
    }
    launchCounterAttack(counterSuspect, counterAction);
    setShowCounterModal(false);
    setCounterAction("");
    showToast("Accusation lancée auprès des Juges. Croisez les doigts.");
  };

  // Soumission Fontaine
  const handleFountainSubmit = () => {
    if (fountainType === "verite" && !fountainTextProof) {
      showToast("La vérité exige une confession écrite !");
      return;
    }
    if (fountainType === "action" && !fountainPhotoProof) {
      showToast("Une action exige une preuve photo !");
      return;
    }

    const proof = fountainType === "verite" ? fountainTextProof : fountainPhotoProof;
    const gain = fountainChoice.gain;

    submitFountainProof(fountainType, proof, gain);
    setFountainChoice(null);
    setFountainTextProof("");
    setFountainPhotoProof("");
    setShowFountainModal(false);
    showToast("Soins appliqués ! Preuve stockée pour audit public. ⛲");
  };

  // Relance de défi de la fontaine
  const handleFountainRefresh = () => {
    if (player.fountainRefreshesToday < 1) {
      showToast("Plus de jetons de relance 🌀 pour la Fontaine aujourd'hui.");
      return;
    }
    // Génère un nouveau défi selon le niveau historique du joueur
    // 0-2 utilisations: Niveau 1, 3-4: Niveau 2, >=5: Niveau 3
    const tier = player.fountainTotalUses >= 5 ? 3 : player.fountainTotalUses >= 3 ? 2 : 1;
    const pool = [
      { tier: 1, title: "Jus de Chaussette 🧦", desc: "Boire une gorgée d'eau tiède récupérée au jet d'eau des douches.", gain: 0.5, type: "action" },
      { tier: 1, title: "Confession humble 🤫", desc: "Confesser ton secret honteux le plus drôle à un festivalier.", gain: 0.5, type: "verite" },
      { tier: 2, title: "Élixir du Barman 🥃", desc: "Boire un gobelet d'un breuvage surprise offert par ton voisin de tente.", gain: 1.5, type: "action" },
      { tier: 2, title: "Question Vérité 🔮", desc: "Avouer quelle est la cible que tu as le plus détesté traquer.", gain: 1.5, type: "verite" },
      { tier: 3, title: "Larmes de VIP 💎", desc: "Trouver de l'eau fraîche servie avec glaçons dans un gobelet propre.", gain: 3.0, type: "action" },
      { tier: 3, title: "Révélation ultime 🧬", desc: "Révéler à ton voisin une triche que tu as faite dans un jeu précédent.", gain: 3.0, type: "verite" }
    ];

    const available = pool.filter(p => p.tier === tier);
    const selected = available[Math.floor(Math.random() * available.length)];
    
    // Déclencher le RPC sur Supabase
    supabase.rpc("refresh_fountain_challenge_transaction", {
      p_game_code: gameState.game.gameCode,
      p_name: player.name,
      p_new_title: selected.title,
      p_new_desc: selected.desc,
      p_new_type: selected.type
    }).then(({ error }) => {
      if (error) {
        showToast(`Erreur : ${error.message}`);
      } else {
        setFountainChoice(selected);
        setFountainType(selected.type);
        showToast("Défi de la Fontaine renouvelé ! 🌀");
      }
    });
  };

  const handleSuggestSubmit = () => {
    if (!suggestTitle || !suggestDesc) {
      showToast("Titre et description requis !");
      return;
    }
    suggestAction(suggestTitle, suggestDesc, suggestReward, suggestDamage);
    setSuggestTitle("");
    setSuggestDesc("");
    showToast("Défi soumis en arbitrage au GM. Merci de contribuer ! 💡");
  };

  // Helper pour afficher les tooltips
  const triggerTooltip = (id) => {
    if (!isHelpActive) return;
    setActiveTooltip(activeTooltip === id ? null : id);
  };

  return (
    <div className={`app-container ${isZombie ? "zombie-mode" : ""}`} style={{ paddingBottom: "75px" }}>
      
      {/* Header global */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 16px",
        backgroundColor: "rgba(18, 16, 30, 0.8)",
        borderBottom: "3px solid #000",
        position: "sticky",
        top: 0,
        zIndex: 500
      }}>
        {/* Avatar cliquable pour modale matricule */}
        <div 
          onClick={() => setShowProfileModal(true)}
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            border: "2px solid #000",
            boxShadow: "2px 2px 0 #000",
            backgroundColor: "#221f3b",
            overflow: "hidden",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {player.hasPhoto ? (
            <span style={{ fontSize: "1.2rem" }}>👤</span>
          ) : (
            <span style={{ fontFamily: "var(--font-title)", fontSize: "0.9rem" }}>
              {player.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        {/* Logo mini */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "1.4rem" }}>🍪</span>
          <span style={{ fontFamily: "var(--font-title)", fontSize: "1.1rem", textShadow: "1.5px 1.5px 0 #000", letterSpacing: "0.03em" }}>
            Cookillers
          </span>
        </div>

        {/* Bouton d'aide contextuelle */}
        <button
          type="button"
          onClick={() => {
            setIsHelpActive(!isHelpActive);
            setActiveTooltip(null);
            if (!isHelpActive) {
              showToast("Aide Active. Cliquez sur les points d'interrogation.");
            }
          }}
          style={{
            background: "none",
            border: "none",
            color: isHelpActive ? "var(--color-cyan)" : "#fff",
            cursor: "pointer"
          }}
        >
          <HelpCircle size={24} />
        </button>
      </header>

      {/* Onde ECG de Vitalité */}
      <div className="ecg-container" style={{ margin: "4px 10px", height: "30px", borderRadius: "8px" }} onClick={() => triggerTooltip("ecg")}>
        <div className={`ecg-line ${ecgClass}`} />
        {isHelpActive && (
          <div style={{ position: "absolute", right: "6px", top: "4px", backgroundColor: "var(--color-cyan)", color: "#000", borderRadius: "50%", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyItems: "center", fontSize: "10px", fontWeight: "bold", cursor: "pointer", paddingLeft: "5px" }}>?</div>
        )}
        {activeTooltip === "ecg" && (
          <div style={{ position: "absolute", top: "35px", left: "10px", right: "10px", backgroundColor: "#1e1b30", border: "2px solid var(--color-cyan)", padding: "10px", borderRadius: "8px", zIndex: 1000, fontSize: "0.85rem", boxShadow: "0 4px 10px rgba(0,0,0,0.5)" }}>
            <strong>Constantes Vitales :</strong> Si vos cœurs ❤️ tombent à 0, vous décédez et passez zombie 🧟 (Mode Moisi).
          </div>
        )}
      </div>

      {/* Barre de Vitalité & Biscuits standardisée */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 12px", alignItems: "center" }}>
        {/* Vitalité ❤️ */}
        <div 
          onClick={() => triggerTooltip("health")}
          style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", position: "relative" }}
        >
          <span style={{ fontSize: "1.4rem" }}>❤️</span>
          <span style={{ fontFamily: "var(--font-title)", fontSize: "1.1rem", textShadow: "1.5px 1.5px 0 #000" }}>
            {player.lives}
          </span>
          {isHelpActive && (
            <div style={{ backgroundColor: "var(--color-cyan)", color: "#000", borderRadius: "50%", width: "12px", height: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: "bold" }}>?</div>
          )}
          {activeTooltip === "health" && (
            <div style={{ position: "absolute", top: "30px", left: 0, width: "200px", backgroundColor: "#1e1b30", border: "2px solid var(--color-cyan)", padding: "8px", borderRadius: "8px", zIndex: 1000, fontSize: "0.8rem" }}>
              Votre vitalité ❤️. Un combat trop long vous épuise.
            </div>
          )}
        </div>

        {/* Biscuits 🪙 */}
        <div 
          onClick={() => triggerTooltip("biscuits")}
          style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", position: "relative" }}
        >
          <span style={{ fontSize: "1.4rem" }}>🪙</span>
          <span style={{ fontFamily: "var(--font-title)", fontSize: "1.1rem", textShadow: "1.5px 1.5px 0 #000", color: "#fbbf24" }}>
            {player.score}
          </span>
          {isHelpActive && (
            <div style={{ backgroundColor: "var(--color-cyan)", color: "#000", borderRadius: "50%", width: "12px", height: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: "bold" }}>?</div>
          )}
          {activeTooltip === "biscuits" && (
            <div style={{ position: "absolute", top: "30px", right: 0, width: "200px", backgroundColor: "#1e1b30", border: "2px solid var(--color-cyan)", padding: "8px", borderRadius: "8px", zIndex: 1000, fontSize: "0.8rem" }}>
              Votre solde de 🪙. Augmente avec vos éliminations pour grimper au classement.
            </div>
          )}
        </div>

        {/* Relances 🌀 */}
        <div 
          onClick={() => triggerTooltip("skips")}
          style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", position: "relative" }}
        >
          <span style={{ fontSize: "1.4rem" }}>🌀</span>
          <span style={{ fontFamily: "var(--font-title)", fontSize: "1.1rem", textShadow: "1.5px 1.5px 0 #000", color: "var(--color-cyan)" }}>
            {player.skips}
          </span>
          {isHelpActive && (
            <div style={{ backgroundColor: "var(--color-cyan)", color: "#000", borderRadius: "50%", width: "12px", height: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: "bold" }}>?</div>
          )}
          {activeTooltip === "skips" && (
            <div style={{ position: "absolute", top: "30px", right: 0, width: "200px", backgroundColor: "#1e1b30", border: "2px solid var(--color-cyan)", padding: "8px", borderRadius: "8px", zIndex: 1000, fontSize: "0.8rem" }}>
              Votre solde de 🌀. Consommez-en un pour changer de défi sans changer de cible.
            </div>
          )}
        </div>
      </div>

      {/* --- ONGLET CONTRAT 🎯 --- */}
      {activeTab === "contrat" && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          
          {/* Hub Le Campement des Assassins 2D */}
          <div style={{
            height: "180px",
            margin: "8px 10px",
            border: "3px solid #000",
            borderRadius: "16px",
            boxShadow: "4px 4px 0 #000",
            backgroundColor: "#0d0a1b",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            {/* Arrière-plan psychédélique avec parallaxe */}
            <div style={{
              position: "absolute",
              width: "110%",
              height: "110%",
              backgroundImage: "radial-gradient(circle, #231249 0%, #0d0a1b 80%)",
              transform: `translate(${parallaxOffset.x * 0.5}px, ${parallaxOffset.y * 0.5}px)`,
              zIndex: 1
            }} />

            {/* Tentes en parallaxe arrière */}
            <div style={{
              position: "absolute",
              bottom: "20px",
              left: "15px",
              width: "45px",
              height: "40px",
              border: "2px solid #000",
              borderRadius: "4px",
              backgroundColor: "#2e255c",
              transform: `translate(${parallaxOffset.x * 0.8}px, ${parallaxOffset.y * 0.8}px)`,
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem"
            }}>🏕️</div>

            {/* Feu de camp animé au centre */}
            <div 
              className="fire-camp"
              style={{
                zIndex: 5,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer"
              }}
            >
              <span style={{ fontSize: "3rem" }}>🔥</span>
              <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-title)", textShadow: "1px 1px 0 #000", color: "#fbbf24" }}>
                Campement
              </span>
            </div>

            {/* Cercle d'avatars des joueurs autour du feu */}
            <div style={{ position: "absolute", width: "100%", height: "100%", zIndex: 4 }}>
              {gameState.players.map((p, idx) => {
                const angle = (idx * 2 * Math.PI) / Math.max(1, gameState.players.length);
                const radius = 60; // rayon du cercle
                const left = 50 + radius * Math.cos(angle);
                const top = 50 + radius * Math.sin(angle);

                // Si joueur gelé, il dort sous sa tente
                if (p.isFrozen) {
                  return (
                    <div
                      key={p.name}
                      style={{
                        position: "absolute",
                        left: `${left}%`,
                        top: `${top}%`,
                        transform: "translate(-50%, -50%) scale(0.8)",
                        zIndex: 4,
                        fontSize: "1.3rem"
                      }}
                      title={`${p.name} cuve sous sa tente`}
                    >
                      🏕️❄️
                    </div>
                  );
                }

                return (
                  <div
                    key={p.name}
                    style={{
                      position: "absolute",
                      left: `${left}%`,
                      top: `${top}%`,
                      transform: "translate(-50%, -50%) scale(0.85)",
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      border: `2px solid ${p.isZombie ? "var(--color-zombie)" : "#000"}`,
                      backgroundColor: p.isZombie ? "rgba(34, 197, 94, 0.2)" : "#3a3463",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      fontWeight: "bold",
                      zIndex: 4
                    }}
                    title={p.name}
                  >
                    {p.isZombie ? "🧟" : p.name.slice(0, 2).toUpperCase()}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section Contrat principal */}
          {player.target ? (
            <div style={{ position: "relative" }}>
              {/* Masque de dissimulation */}
              {isMasked ? (
                <div 
                  className="card-cartoon glow-purple"
                  onClick={() => setIsMasked(false)}
                  style={{
                    height: "190px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    backgroundColor: "#110e20"
                  }}
                >
                  <EyeOff size={48} style={{ color: "var(--color-purple)", marginBottom: "8px" }} />
                  <span style={{ fontFamily: "var(--font-title)", fontSize: "1rem" }}>
                    Chasse Dissimulée
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "4px" }}>
                    (Cliquez pour révéler vos secrets)
                  </span>
                </div>
              ) : (
                <div 
                  className={`card-cartoon ${rarityClass} glow-cyan`}
                  data-tuto="contrat"
                  style={{ minHeight: "190px" }}
                >
                  {/* Scan holographique cyan */}
                  <div className="scan-line" />

                  {/* Bouton de dissimulation rapide */}
                  <button
                    type="button"
                    onClick={() => setIsMasked(true)}
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      background: "none",
                      border: "none",
                      color: "var(--color-cyan)",
                      cursor: "pointer",
                      zIndex: 20
                    }}
                    title="Masquer instantanément"
                  >
                    <Eye size={20} />
                  </button>

                  {/* Bandeau Examen si arbitrage en cours */}
                  {pendingHit && (
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      backgroundColor: "rgba(239, 68, 68, 0.4)",
                      backdropFilter: "blur(4px)",
                      zIndex: 30,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: "rotate(-4deg)"
                    }}>
                      <div style={{
                        backgroundColor: "var(--color-red)",
                        color: "#fff",
                        fontFamily: "var(--font-title)",
                        padding: "8px 24px",
                        border: "3px solid #000",
                        boxShadow: "3px 3px 0 #000",
                        textTransform: "uppercase"
                      }}>
                        En cours d'examen 🛡️
                      </div>
                    </div>
                  )}

                  {/* Contenu de la fiche contrat */}
                  <span className="rarity-badge" style={{ backgroundColor: `var(--rarity-${rarityLabel.toLowerCase()})` }}>
                    {rarityLabel}
                  </span>

                  <div style={{ marginTop: "10px", textAlign: "left" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-cyan)", fontFamily: "var(--font-title)", textTransform: "uppercase" }}>
                      {isZombie ? "Victime potentielle :" : "Cible Secrète :"}
                    </span>
                    <h2 style={{ fontSize: "1.8rem", margin: "4px 0", color: "#fff", transform: "none", textShadow: "2px 2px 0 #000" }}>
                      {isZombie ? (zombieVictim || "Choisir...") : player.target}
                    </h2>

                    {/* Sélection victime pour Zombie */}
                    {isZombie && (
                      <div style={{ marginBottom: "1rem" }}>
                        <select
                          value={zombieVictim}
                          onChange={(e) => setZombieVictim(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px",
                            borderRadius: "8px",
                            backgroundColor: "#2e255c",
                            color: "#fff",
                            border: "2px solid #000"
                          }}
                        >
                          <option value="">-- Qui voulez-vous mordre ? --</option>
                          {gameState.players.filter(p => !p.isZombie && !p.isFrozen).map(p => (
                            <option key={p.name} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <span style={{ fontSize: "0.8rem", color: "var(--color-purple)", fontFamily: "var(--font-title)", textTransform: "uppercase", display: "block", marginTop: "8px" }}>
                      {isZombie ? "Défi Morsure :" : "Piège Absurde :"}
                    </span>
                    <p style={{ fontSize: "0.95rem", color: "#e5e7eb", fontStyle: "italic", marginTop: "2px" }}>
                      {currentAction ? currentAction.description : "Pas de défi actif. Demandez une relance ou attendez."}
                    </p>

                    {currentAction && (
                      <div style={{ display: "flex", gap: "10px", marginTop: "12px", fontSize: "0.8rem", fontWeight: "bold" }}>
                        <span style={{ color: "#fbbf24" }}> Récompense : +{isZombie ? 25 : currentAction.scoreReward} 🪙</span>
                        <span style={{ color: "var(--color-red)" }}> Dégâts : -{isZombie ? 1.0 : currentAction.damagePenalty} ❤️</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Boutons d'Action Contrat */}
              <div style={{ display: "flex", gap: "12px", padding: "0 10px", marginTop: "6px" }}>
                <button
                  type="button"
                  className="btn-cartoon btn-green"
                  style={{ flex: 2, height: "48px" }}
                  disabled={pendingHit}
                  onClick={handleHitSubmit}
                >
                  {isZombie ? "🧟 Mordre !" : "⚔️ Contrat Exécuté"}
                </button>

                <button
                  type="button"
                  className="btn-cartoon btn-cyan"
                  style={{ flex: 1, height: "48px", padding: "0" }}
                  disabled={player.skips < 1 || pendingHit || isZombie}
                  onClick={skipMission}
                  title="Brûler la Recette"
                >
                  Brûler 🌀
                </button>
              </div>

              {/* Boutons secondaires : Dénonciation & Abandon */}
              {!isZombie && (
                <div style={{ display: "flex", gap: "12px", padding: "0 10px", marginTop: "12px" }}>
                  <button
                    type="button"
                    className="btn-cartoon btn-red"
                    data-tuto="contre-attaque"
                    style={{ flex: 1, fontSize: "0.85rem", height: "40px" }}
                    onClick={() => setShowCounterModal(true)}
                  >
                    ⚠️ Bureau des Rumeurs
                  </button>

                  <button
                    type="button"
                    className="btn-cartoon"
                    style={{ flex: 1, fontSize: "0.85rem", backgroundColor: "#374151", height: "40px" }}
                    onClick={() => setShowAbandonModal(true)}
                  >
                    🏳️ Abandonner Cible
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: "30px 15px", textAlign: "center", color: "#9ca3af" }}>
              <p>Aucune cible active. En attente du début de la chasse par le GM... 🏕️</p>
            </div>
          )}
        </div>
      )}

      {/* --- ONGLET SOURCE ⛲ (POINT D'EAU DOUTEUX) --- */}
      {activeTab === "source" && (
        <div className="card-cartoon glow-cyan" style={{ margin: "10px" }}>
          <h2 style={{ color: "var(--color-cyan)", textAlign: "center", width: "100%", marginBottom: "1rem" }}>
            Le Point d'Eau Douteux ⛲
          </h2>

          <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginBottom: "1rem", lineHeight: "1.4" }}>
            Pour regagner des ❤️, vous devez accomplir un défi de la Source. 
            Les Zombies 🧟 n'ont pas accès à la Source.
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontSize: "0.85rem" }}>
            <span>Utilisations aujourd'hui : <strong>{player.fountainUsesToday} / 2</strong></span>
            <span>Relances de la Source : <strong>{player.fountainRefreshesToday} 🌀</strong></span>
          </div>

          {player.fountainUsesToday >= 2 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--color-red)", border: "2px dashed var(--color-red)", borderRadius: "12px" }}>
              La Source est à sec pour toi aujourd'hui. Va faire la sieste ou attends que le Coq chante. 🐓
            </div>
          ) : isZombie ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--color-zombie)", border: "2px dashed var(--color-zombie)", borderRadius: "12px" }}>
              Tu es un zombie. Les cœurs de zombie ne peuvent pas être soignés par la Source. Va mordre quelqu'un ! 🧠
            </div>
          ) : (
            <div>
              {fountainChoice ? (
                <div style={{ border: "2px solid var(--color-cyan)", borderRadius: "12px", padding: "12px", backgroundColor: "rgba(34, 211, 238, 0.03)" }}>
                  <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--color-cyan)", fontWeight: "bold" }}>
                    Défi de la Source :
                  </span>
                  <h3 style={{ fontSize: "1.2rem", margin: "4px 0", transform: "none", textShadow: "none", color: "#fff" }}>
                    {fountainChoice.title}
                  </h3>
                  <p style={{ fontSize: "0.9rem", fontStyle: "italic", margin: "4px 0" }}>
                    {fountainChoice.desc}
                  </p>
                  <div style={{ fontSize: "0.85rem", color: "var(--color-green)", fontWeight: "bold", marginTop: "8px" }}>
                    Gain de Vitalité : +{fountainChoice.gain} ❤️
                  </div>

                  {/* Formulaire de Preuve */}
                  <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                    {fountainType === "verite" ? (
                      <div>
                        <label style={{ fontSize: "0.8rem", color: "var(--color-cyan)", display: "block", marginBottom: "4px" }}>
                          Votre Confession (Vérité) :
                        </label>
                        <textarea
                          value={fountainTextProof}
                          onChange={(e) => setFountainTextProof(e.target.value)}
                          placeholder="Tapez votre aveu sincère ici..."
                          style={{
                            width: "100%",
                            height: "60px",
                            backgroundColor: "#1a172e",
                            border: "2px solid #000",
                            borderRadius: "8px",
                            padding: "8px",
                            color: "#fff"
                          }}
                        />
                      </div>
                    ) : (
                      <div>
                        <label style={{ fontSize: "0.8rem", color: "var(--color-cyan)", display: "block", marginBottom: "4px" }}>
                          Preuve Photo (Action) :
                        </label>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <input
                            type="file"
                            accept="image/*"
                            capture="user"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = () => setFountainPhotoProof(reader.result);
                              reader.readAsDataURL(file);
                            }}
                            style={{ display: "none" }}
                            id="fountain-cam"
                          />
                          <label htmlFor="fountain-cam" className="btn-cartoon btn-cyan" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", cursor: "pointer" }}>
                            <Camera size={16} /> Ouvrir Appareil Photo
                          </label>
                          {fountainPhotoProof && <span style={{ fontSize: "1.5rem" }}>✅</span>}
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                      <button
                        type="button"
                        className="btn-cartoon btn-green"
                        style={{ flex: 1, padding: "0.5rem" }}
                        onClick={handleFountainSubmit}
                      >
                        Valider Soin
                      </button>
                      <button
                        type="button"
                        className="btn-cartoon"
                        style={{ flex: 1, padding: "0.5rem", backgroundColor: "#4b5563" }}
                        onClick={() => setFountainChoice(null)}
                      >
                        Retour
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <button
                    type="button"
                    className="btn-cartoon btn-cyan"
                    onClick={() => {
                      setFountainChoice({
                        title: "Jus de Chaussette 🧦",
                        desc: "Boire une gorgée d'eau tiède récupérée au jet d'eau des douches.",
                        gain: 0.5,
                        type: "action"
                      });
                      setFountainType("action");
                    }}
                  >
                    Puiser une Action (+0.5 ❤️)
                  </button>

                  <button
                    type="button"
                    className="btn-cartoon btn-cyan"
                    onClick={() => {
                      setFountainChoice({
                        title: "Confession humble 🤫",
                        desc: "Confesser ton secret honteux le plus drôle à un festivalier.",
                        gain: 0.5,
                        type: "verite"
                      });
                      setFountainType("verite");
                    }}
                  >
                    Puiser une Vérité (+0.5 ❤️)
                  </button>

                  {player.fountainRefreshesToday > 0 && (
                    <button
                      type="button"
                      className="btn-cartoon"
                      style={{ backgroundColor: "var(--color-purple)", border: "2px solid #000" }}
                      onClick={handleFountainRefresh}
                    >
                      Piocher Niveau Supérieur 🌀
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- ONGLET BOÎTE A IDÉES 💡 (USINE A SÉVICES) --- */}
      {activeTab === "suggestion" && (
        <div className="card-cartoon glow-purple" style={{ margin: "10px" }}>
          <h2 style={{ color: "var(--color-purple)", textAlign: "center", width: "100%", marginBottom: "1rem" }}>
            L'Usine à Sévices 💡
          </h2>

          <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginBottom: "1.2rem", lineHeight: "1.4" }}>
            Suggérez vos propres idées de défis secrets au Grand Juge. S'il les valide, elles rejoindront le catalogue de jeu.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--color-purple)" }}>Intitulé du défi :</label>
              <input
                type="text"
                value={suggestTitle}
                onChange={(e) => setSuggestTitle(e.target.value)}
                placeholder="Ex: Le Choc Shifumi ⚡"
                style={{
                  width: "100%",
                  padding: "8px",
                  backgroundColor: "#1a172e",
                  border: "2px solid #000",
                  borderRadius: "8px",
                  color: "#fff",
                  marginTop: "2px"
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--color-purple)" }}>Description de la crasse :</label>
              <textarea
                value={suggestDesc}
                onChange={(e) => setSuggestDesc(e.target.value)}
                placeholder="Expliquez clairement ce que la cible doit faire..."
                style={{
                  width: "100%",
                  height: "70px",
                  backgroundColor: "#1a172e",
                  border: "2px solid #000",
                  borderRadius: "8px",
                  padding: "8px",
                  color: "#fff",
                  marginTop: "2px"
                }}
              />
            </div>

            {/* Sélecteurs Récompense 🪙 et Dégâts ❤️ */}
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.8rem", color: "#fbbf24" }}>Biscuits 🪙 :</label>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                  <button type="button" className="btn-cartoon" style={{ padding: "4px 8px", fontSize: "0.8rem" }} onClick={() => setSuggestReward(Math.max(50, suggestReward - 50))}><Minus size={12}/></button>
                  <span style={{ fontFamily: "var(--font-title)" }}>{suggestReward}</span>
                  <button type="button" className="btn-cartoon" style={{ padding: "4px 8px", fontSize: "0.8rem" }} onClick={() => setSuggestReward(Math.min(600, suggestReward + 50))}><Plus size={12}/></button>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.8rem", color: "var(--color-red)" }}>Dégâts ❤️ :</label>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                  <button type="button" className="btn-cartoon" style={{ padding: "4px 8px", fontSize: "0.8rem" }} onClick={() => setSuggestDamage(Math.max(0.5, suggestDamage - 0.5))}><Minus size={12}/></button>
                  <span style={{ fontFamily: "var(--font-title)" }}>{suggestDamage}</span>
                  <button type="button" className="btn-cartoon" style={{ padding: "4px 8px", fontSize: "0.8rem" }} onClick={() => setSuggestDamage(Math.min(4.0, suggestDamage + 0.5))}><Plus size={12}/></button>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-cartoon btn-green"
              style={{ marginTop: "1rem", height: "44px" }}
              onClick={handleSuggestSubmit}
            >
              Envoyer à l'Arbitrage
            </button>
          </div>
        </div>
      )}

      {/* --- ONGLET CLASSEMENT 🏆 --- */}
      {activeTab === "classement" && (
        <Leaderboard players={gameState.players} history={gameState.history} />
      )}

      {/* Mascotte interactive Cookie Assassin */}
      <AnimatePresence>
        {showMascotte && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            style={{
              position: "fixed",
              bottom: "75px",
              right: "15px",
              zIndex: 1000,
              display: "flex",
              alignItems: "flex-end",
              pointerEvents: "none"
            }}
          >
            <div style={{
              backgroundColor: "#161320",
              border: "3px solid #000",
              borderRadius: "12px",
              padding: "8px 12px",
              boxShadow: "3px 3px 0 #000",
              maxWidth: "200px",
              fontSize: "0.8rem",
              lineHeight: "1.3",
              color: "#fff",
              position: "relative",
              marginRight: "10px",
              pointerEvents: "auto"
            }}>
              {mascotteQuote}
              <div style={{
                position: "absolute",
                bottom: "10px",
                right: "-8px",
                width: "0",
                height: "0",
                borderTop: "6px solid transparent",
                borderBottom: "6px solid transparent",
                borderLeft: "8px solid #000"
              }} />
            </div>
            <div style={{ fontSize: "3rem", pointerEvents: "auto", cursor: "pointer" }} onClick={() => setShowMascotte(false)}>
              🍪
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE : MON MATRICULE (PROFIL) */}
      <AnimatePresence>
        {showProfileModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}>
            <div className="card-cartoon glow-purple" style={{ width: "100%", maxWidth: "340px", textAlign: "center", maxHeight: "90vh", overflowY: "auto" }}>
              <button 
                type="button" 
                onClick={() => setShowProfileModal(false)}
                style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", color: "#fff", cursor: "pointer" }}
              >
                <X size={20}/>
              </button>

              <h2 style={{ color: "var(--color-purple)", marginBottom: "1rem" }}>Mon Matricule</h2>
              
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                <div style={{ position: "relative" }}>
                  <div style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    border: "3px solid #000",
                    backgroundColor: "#2e255c",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {player.hasPhoto ? (
                      <span style={{ fontSize: "2rem" }}>👤</span>
                    ) : (
                      <span style={{ fontFamily: "var(--font-title)", fontSize: "1.5rem" }}>
                        {player.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handlePhotoUpload}
                    style={{ display: "none" }}
                    id="profile-cam"
                  />
                  <label 
                    htmlFor="profile-cam" 
                    style={{
                      position: "absolute",
                      bottom: "-4px",
                      right: "-4px",
                      backgroundColor: "var(--color-cyan)",
                      border: "2px solid #000",
                      borderRadius: "50%",
                      width: "28px",
                      height: "28px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer"
                    }}
                  >
                    <Camera size={14} color="#000" />
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{player.name}</span>
                <span style={{ display: "block", fontSize: "0.8rem", color: "#9ca3af" }}>
                  PIN Secret : ****
                </span>
              </div>

              {/* Option performance réduite */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "rgba(0,0,0,0.3)",
                padding: "8px 12px",
                borderRadius: "10px",
                border: "2px solid var(--border-color)",
                marginBottom: "1rem"
              }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Performances Réduites</span>
                <input
                  type="checkbox"
                  checked={lowPerfMode}
                  onChange={(e) => setLowPerfMode(e.target.checked)}
                  style={{ width: "20px", height: "20px", cursor: "pointer" }}
                />
              </div>

              {/* Journal personnel des victimes neutralisées */}
              <div style={{ textAlign: "left", marginTop: "1rem" }}>
                <h4 style={{ fontFamily: "var(--font-title)", fontSize: "0.9rem", color: "var(--color-purple)", borderBottom: "2px solid var(--border-color)", paddingBottom: "4px" }}>
                  Tableau de chasse ({player.statKillsCount} neutralisés)
                </h4>
                <div style={{ maxHeight: "120px", overflowY: "auto", marginTop: "8px", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {gameState.history
                    .filter(h => h.playerName === player.name && h.type === "hit_approved" && h.status === "completed")
                    .map(h => (
                      <div key={h.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "4px" }}>
                        <span>⚔️ {h.targetName}</span>
                        <span style={{ color: "#fbbf24" }}>+{h.scoreReward} 🪙</span>
                      </div>
                    ))
                  }
                  {player.statKillsCount === 0 && (
                    <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Aucune victime pour l'instant. Les couteaux sont neufs.</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="btn-cartoon btn-red"
                style={{ width: "100%", marginTop: "1.2rem", height: "40px" }}
                onClick={() => {
                  if (confirm("Voulez-vous vraiment quitter ce salon de jeu ?")) {
                    localStorage.removeItem("cookillers_current_user");
                    localStorage.removeItem("cookillers_game_code");
                    window.location.reload();
                  }
                }}
              >
                Quitter le Salon
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALE : CONTRE-ATTAQUE (ACCUSATION) */}
      <AnimatePresence>
        {showCounterModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}>
            <div className="card-cartoon glow-red" style={{ width: "100%", maxWidth: "340px" }}>
              <button 
                type="button" 
                onClick={() => setShowCounterModal(false)}
                style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", color: "#fff", cursor: "pointer" }}
              >
                <X size={20}/>
              </button>

              <h2 style={{ color: "var(--color-red)", marginBottom: "1rem" }}>Bureau des Rumeurs</h2>
              <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginBottom: "1rem", lineHeight: "1.4" }}>
                Vous pensez être suivi ? Accusez directement un suspect et le défi qu'il essaie de vous faire commettre. 
                Fausse accusation : <strong>-0.5 ❤️</strong> !
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
                <div>
                  <label style={{ fontSize: "0.8rem" }}>Qui est votre assassin suspecté ?</label>
                  <select
                    value={counterSuspect}
                    onChange={(e) => setCounterSuspect(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "8px",
                      backgroundColor: "#1a172e",
                      color: "#fff",
                      border: "2px solid #000",
                      marginTop: "2px"
                    }}
                  >
                    <option value="">-- Sélectionner le suspect --</option>
                    {gameState.players.filter(p => p.name !== player.name && !p.isFrozen).map(p => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem" }}>Quel défi secret tente-t-il de vous imposer ?</label>
                  <input
                    type="text"
                    value={counterAction}
                    onChange={(e) => setCounterAction(e.target.value)}
                    placeholder="Ex: Shifumi, Bachata, Hamac..."
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "8px",
                      backgroundColor: "#1a172e",
                      color: "#fff",
                      border: "2px solid #000",
                      marginTop: "2px"
                    }}
                  />
                </div>

                <button
                  type="button"
                  className="btn-cartoon btn-red"
                  style={{ marginTop: "1rem", height: "44px" }}
                  onClick={handleCounterAttack}
                >
                  Lancer la Dénonciation
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALE : ABANDON DE CIBLE */}
      <AnimatePresence>
        {showAbandonModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}>
            <div className="card-cartoon glow-red" style={{ width: "100%", maxWidth: "340px", textAlign: "center" }}>
              <h3 style={{ color: "var(--color-red)", marginBottom: "1rem" }}>Abandonner le contrat</h3>
              <p style={{ fontSize: "0.85rem", color: "#d1d5db", marginBottom: "1.2rem", lineHeight: "1.4" }}>
                Votre cible a fui le festival ? Abandonner le contrat entraîne une pénalité immédiate. 
                Choisissez votre sacrifice :
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  type="button"
                  className="btn-cartoon btn-red"
                  style={{ height: "44px" }}
                  disabled={player.lives <= 0.5}
                  onClick={() => {
                    abandonTarget("life");
                    setShowAbandonModal(false);
                    showToast("Cible abandonnée. Nouveau contrat pioché ! 💔");
                  }}
                >
                  Sacrifier -0.5 ❤️
                </button>

                <button
                  type="button"
                  className="btn-cartoon btn-red"
                  style={{ height: "44px" }}
                  disabled={player.score < 50}
                  onClick={() => {
                    abandonTarget("score");
                    setShowAbandonModal(false);
                    showToast("Cible abandonnée. Nouveau contrat pioché ! 🪙");
                  }}
                >
                  Payer -50 🪙
                </button>
              </div>

              {player.lives <= 0.5 && (
                <p style={{ fontSize: "0.75rem", color: "var(--color-red)", marginTop: "10px" }}>
                  ⚠️ Santé trop basse pour payer en cœurs (minimum 0.5 restant obligatoire).
                </p>
              )}

              <button
                type="button"
                className="btn-cartoon"
                style={{ width: "100%", marginTop: "1.2rem", backgroundColor: "#4b5563" }}
                onClick={() => setShowAbandonModal(false)}
              >
                Retour
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Barre de navigation basse */}
      <nav className="bottom-nav">
        <div
          className={`bottom-nav-item ${activeTab === "contrat" ? "active" : ""}`}
          onClick={() => setActiveTab("contrat")}
        >
          <span style={{ fontSize: "1.6rem" }}>🎯</span>
        </div>
        <div
          className={`bottom-nav-item ${activeTab === "source" ? "active" : ""}`}
          onClick={() => setActiveTab("source")}
        >
          <span style={{ fontSize: "1.6rem" }}>⛲</span>
        </div>
        <div
          className={`bottom-nav-item ${activeTab === "suggestion" ? "active" : ""}`}
          onClick={() => setActiveTab("suggestion")}
        >
          <span style={{ fontSize: "1.6rem" }}>💡</span>
        </div>
        <div
          className={`bottom-nav-item ${activeTab === "classement" ? "active" : ""}`}
          onClick={() => setActiveTab("classement")}
        >
          <span style={{ fontSize: "1.6rem" }}>🏆</span>
        </div>
      </nav>

    </div>
  );
}
