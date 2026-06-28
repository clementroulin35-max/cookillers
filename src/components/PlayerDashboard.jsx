import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "../context/GameContext";
import { supabase } from "../services/supabaseClient";
import Leaderboard, { getRank } from "./Leaderboard";
import { AlertCircle, Eye, EyeOff, HelpCircle, Send, Plus, Minus, Camera, X, LogOut } from "lucide-react";
import tombstoneZombie from "../../DA/Sans_titre_1-removebg-preview.png";
import mascotteLogo from "../../DA/mascotte_logo_app.png";

const FOUNTAIN_POOL = [
  // Actions Faciles (Tier 1) — gain 0.5
  { type: "action", tier: 1, title: "Faire un compliment sincère à un inconnu.", gain: 0.5 },
  { type: "action", tier: 1, title: "Boire un verre d'eau cul-sec en public.", gain: 0.5 },
  { type: "action", tier: 1, title: "Ranger 3 déchets qui traînent par terre.", gain: 0.5 },
  { type: "action", tier: 1, title: "Lancer une partie de 'Je n'ai jamais...' au camp avec au moins 3 personnes.", gain: 0.5 },
  { type: "action", tier: 1, title: "Désigner un 'Maître du Pouce' : chaque fois que tu poses ton pouce sur la table, tout le monde doit faire de même.", gain: 0.5 },
  { type: "action", tier: 1, title: "Faire un bras de fer avec un autre joueur.", gain: 0.5 },
  // Actions Moyennes (Tier 2) — gain 1.5
  { type: "action", tier: 2, title: "Raconter une blague nulle à un groupe d'inconnus.", gain: 1.5 },
  { type: "action", tier: 2, title: "Faire un check de la main créatif avec quelqu'un.", gain: 1.5 },
  { type: "action", tier: 2, title: "Parler pendant 5 minutes avec un accent étranger.", gain: 1.5 },
  { type: "action", tier: 2, title: "Remplir un verre au milieu de la table, puis défier quelqu'un au Shifumi.", gain: 1.5 },
  { type: "action", tier: 2, title: "Inventer une règle absurde pour le camp pendant 30 min.", gain: 1.5 },
  { type: "action", tier: 2, title: "Réussir un 'Flip Cup' 3 fois de suite.", gain: 1.5 },
  // Actions Difficiles (Tier 3) — gain 3.0
  { type: "action", tier: 3, title: "Chanter le refrain d'une chanson connue en plein milieu du camp.", gain: 3.0 },
  { type: "action", tier: 3, title: "Faire une séance de 10 pompes devant une scène.", gain: 3.0 },
  { type: "action", tier: 3, title: "Convaincre un inconnu de te faire un massage de 15 secondes.", gain: 3.0 },
  { type: "action", tier: 3, title: "Défier un voisin de tente à un duel de 'Bière Pong'.", gain: 3.0 },
  { type: "action", tier: 3, title: "Faire une 'cascade' avec au moins 4 personnes où chacun boit consécutivement.", gain: 3.0 },
  // Vérités Faciles (Tier 1) — gain 0.5
  { type: "verite", tier: 1, title: "Quelle est ta chanson préférée honteuse ?", gain: 0.5 },
  { type: "verite", tier: 1, title: "Quel est ton pire défaut en festival ?", gain: 0.5 },
  { type: "verite", tier: 1, title: "As-tu déjà menti pour éviter de boire un verre ?", gain: 0.5 },
  { type: "verite", tier: 1, title: "Quel est le surnom le plus ridicule qu'on t'ait jamais donné ?", gain: 0.5 },
  { type: "verite", tier: 1, title: "Si tu devais échanger ton corps avec un joueur ici, qui choisirais-tu ?", gain: 0.5 },
  { type: "verite", tier: 1, title: "Quelle est la pire excuse que tu as sortie pour annuler une soirée ?", gain: 0.5 },
  // Vérités Moyennes (Tier 2) — gain 1.5
  { type: "verite", tier: 2, title: "Quel joueur ici présent a le style vestimentaire le plus douteux ?", gain: 1.5 },
  { type: "verite", tier: 2, title: "Quelle est la chose la plus absurde que tu aies faite en festival ?", gain: 1.5 },
  { type: "verite", tier: 2, title: "As-tu déjà fait semblant de connaître un groupe de musique ?", gain: 1.5 },
  { type: "verite", tier: 2, title: "Qui dans ce groupe serait le premier à se faire arrêter par la police ?", gain: 1.5 },
  { type: "verite", tier: 2, title: "Quel est ton plus grand plaisir coupable inavouable ?", gain: 1.5 },
  { type: "verite", tier: 2, title: "As-tu déjà eu un crush secret sur un(e) ami(e) d'un joueur présent ?", gain: 1.5 },
  // Vérités Difficiles (Tier 3) — gain 3.0
  { type: "verite", tier: 3, title: "Quel joueur du groupe as-tu le plus envie d'éliminer et pourquoi ?", gain: 3.0 },
  { type: "verite", tier: 3, title: "As-tu un secret inavouable que personne ici ne connaît ?", gain: 3.0 },
  { type: "verite", tier: 3, title: "Quelle est ta pire phobie ou situation embarrassante vécue au camping ?", gain: 3.0 },
  { type: "verite", tier: 3, title: "Si tu devais avouer un énorme mensonge dit à un joueur du groupe, ce serait quoi ?", gain: 3.0 },
  { type: "verite", tier: 3, title: "Quelle est la pire bêtise que tu aies commise sous l'effet de l'alcool ?", gain: 3.0 },
  { type: "verite", tier: 3, title: "Si ta vie amoureuse était un film, quel en serait le titre ?", gain: 3.0 },
];

const getRandomFountainChallenge = (requestedType, tier) => {
  const available = FOUNTAIN_POOL.filter(p => p.tier === tier && p.type === requestedType);
  return available[Math.floor(Math.random() * available.length)];
};

export default function PlayerDashboard() {
  const {
    currentUser,
    gameCode,
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
    getPlayerPhoto,
    logOut,
    manualRefresh,
    showToast
  } = useGame();

  const player = gameState.players.find(p => p.name === currentUser);

  // Onglets : 'contrat', 'source', 'suggestion', 'classement'
  const [activeTab, setActiveTab] = useState("contrat");
  const [isMasked, setIsMasked] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [targetPhoto, setTargetPhoto] = useState(null);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [showFountainModal, setShowFountainModal] = useState(false);
  const [showSkipConfirmModal, setShowSkipConfirmModal] = useState(false);
  const [showZombieFountainModal, setShowZombieFountainModal] = useState(false);
  
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
  const [suggestType, setSuggestType] = useState("mission"); // 'mission', 'fountain_action', 'fountain_truth'
  
  // Fontaine
  const [fountainType, setFountainType] = useState("verite"); // 'action' ou 'verite'
  const [fountainTextProof, setFountainTextProof] = useState("");
  const [fountainPhotoProof, setFountainPhotoProof] = useState("");
  const [fountainChoice, setFountainChoice] = useState(null); // défi pioché

  // Zombie victime selection
  const [zombieVictim, setZombieVictim] = useState("");
  const [campPhotos, setCampPhotos] = useState({}); // { name: photoBase64 }

  // Charger les photos de profil des joueurs présents au campement
  useEffect(() => {
    if (gameState.players) {
      gameState.players.forEach(p => {
        if (p.hasPhoto && !campPhotos[p.name]) {
          getPlayerPhoto(p.name).then(photo => {
            if (photo) {
              setCampPhotos(prev => ({ ...prev, [p.name]: photo }));
            }
          }).catch(err => console.error("Erreur photo campement :", err));
        }
      });
    }
  }, [gameState.players, getPlayerPhoto, campPhotos]);

  const [triggerScreenShake, setTriggerScreenShake] = useState(false);
  const [showRedFlash, setShowRedFlash] = useState(false);
  const [cookieConfettiActive, setCookieConfettiActive] = useState(false);

  const triggerVibration = (pattern) => {
    if (lowPerfMode) return; // Pas de vibration en mode économie / perf réduite
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (err) {
        console.warn("Haptic feedback non supporté :", err);
      }
    }
  };

  const triggerDamageEffect = () => {
    if (lowPerfMode) return;
    setTriggerScreenShake(true);
    setShowRedFlash(true);
    setTimeout(() => {
      setTriggerScreenShake(false);
      setShowRedFlash(false);
    }, 300);
  };

  const triggerCookieExplosion = () => {
    if (lowPerfMode) return;
    setCookieConfettiActive(true);
    setTimeout(() => {
      setCookieConfettiActive(false);
    }, 2000);
  };

  const prevStats = useRef({
    lives: player?.lives,
    isZombie: player?.isZombie,
    kills: player?.statKillsCount,
    successCounters: player?.statSuccessfulCounterattacks,
    failedCounters: player?.statFailedCounterattacks
  });

  useEffect(() => {
    if (!player) return;
    
    // Pour éviter de déclencher l'effet au tout premier rendu ou reconnexion vide
    if (prevStats.current.lives === undefined) {
      prevStats.current = {
        lives: player.lives,
        isZombie: player.isZombie,
        kills: player.statKillsCount,
        successCounters: player.statSuccessfulCounterattacks,
        failedCounters: player.statFailedCounterattacks
      };
      return;
    }

    const prev = prevStats.current;

    // Détecter passage Zombie
    if (player.isZombie && !prev.isZombie) {
      triggerVibration(800);
    }

    // Détecter neutralisation cible
    if (player.statKillsCount > prev.kills) {
      triggerVibration([100, 50, 100]);
      triggerCookieExplosion();
    }

    // Détecter contre-attaque réussie
    if (player.statSuccessfulCounterattacks > prev.successCounters) {
      triggerVibration([50, 50, 100, 50, 150]);
    }

    // Détecter fausse accusation (statFailedCounterattacks a augmenté)
    if (player.statFailedCounterattacks > prev.failedCounters) {
      triggerVibration([100, 50, 100, 50, 100]);
      triggerDamageEffect();
    } else if (player.lives < prev.lives) {
      // Perte de vie générale (ex: morsure zombie subie)
      triggerVibration(200);
      triggerDamageEffect();
    }

    // Mettre à jour la ref
    prevStats.current = {
      lives: player.lives,
      isZombie: player.isZombie,
      kills: player.statKillsCount,
      successCounters: player.statSuccessfulCounterattacks,
      failedCounters: player.statFailedCounterattacks
    };
  }, [player, lowPerfMode]);

  // Mascotte sarcastique
  const [mascotteQuote, setMascotteQuote] = useState("");
  const [showMascotte, setShowMascotte] = useState(false);

  useEffect(() => {
    localStorage.setItem("cookillers_low_perf", lowPerfMode ? "true" : "false");
  }, [lowPerfMode]);

  // Charger la photo de profil dès le départ ou changement du joueur
  useEffect(() => {
    if (player && player.hasPhoto) {
      getPlayerPhoto(player.name).then(photo => {
        setProfilePhoto(photo);
      }).catch(err => {
        console.error("Erreur de chargement photo profil :", err);
      });
    } else {
      setProfilePhoto(null);
    }
  }, [player?.name, player?.hasPhoto, getPlayerPhoto]);

  // Charger la photo de la cible en tâche de fond
  useEffect(() => {
    if (player && player.target) {
      getPlayerPhoto(player.target).then(photo => {
        setTargetPhoto(photo);
      }).catch(err => {
        console.error("Erreur chargement photo cible :", err);
      });
    } else {
      setTargetPhoto(null);
    }
  }, [player?.target, getPlayerPhoto]);

  // Charger la photo de la cible zombie
  useEffect(() => {
    if (player?.isZombie && zombieVictim) {
      getPlayerPhoto(zombieVictim).then(photo => {
        setTargetPhoto(photo);
      }).catch(err => {
        console.error("Erreur chargement photo victime zombie :", err);
      });
    } else if (player?.isZombie) {
      setTargetPhoto(null);
    }
  }, [zombieVictim, player?.isZombie, getPlayerPhoto]);

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
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        color: "#fff",
        gap: "12px",
        backgroundColor: "#0d0a1b"
      }}>
        <span className="animate-spin" style={{ fontSize: "2rem" }}>🍪</span>
        <span style={{ fontFamily: "var(--font-title)", fontSize: "1.1rem" }}>Chargement du profil...</span>
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
      setProfilePhoto(reader.result);
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

  // Puiser un défi de la fontaine (Action ou Vérité)
  const handleFountainDraw = (requestedType) => {
    const tier = player.fountainTotalUses >= 5 ? 3 : player.fountainTotalUses >= 3 ? 2 : 1;
    const challenge = getRandomFountainChallenge(requestedType, tier);
    setFountainChoice(challenge);
    setFountainType(requestedType);
  };

  // Relance de défi de la fontaine
  const handleFountainRefresh = async () => {
    if (player.fountainRefreshesToday < 1) {
      showToast("Plus de jetons de relance 🌀 pour la Fontaine aujourd'hui.");
      return;
    }

    const { error } = await supabase.rpc("refresh_fountain_challenge_transaction", {
      p_game_code: gameCode,
      p_name: player.name,
      p_new_title: "",
      p_new_desc: "",
      p_new_type: ""
    });

    if (error) {
      showToast(`Erreur : ${error.message}`);
    } else {
      // Regénérer un défi du même type avec le tier adapté
      const tier = player.fountainTotalUses >= 5 ? 3 : player.fountainTotalUses >= 3 ? 2 : 1;
      const challenge = getRandomFountainChallenge(fountainType, tier);
      setFountainChoice(challenge);
      manualRefresh();
      showToast("Nouveau défi de la Source pioché ! 🌀");
    }
  };

  const handleSuggestSubmit = () => {
    if (!suggestTitle || !suggestDesc) {
      showToast("Titre et description requis !");
      return;
    }
    const encodedDesc = suggestType + "|" + suggestDesc;
    const finalReward = suggestType === "mission" ? suggestReward : 0;
    suggestAction(suggestTitle, encodedDesc, finalReward, suggestDamage);
    setSuggestTitle("");
    setSuggestDesc("");
    setSuggestType("mission");
    setSuggestReward(100);
    setSuggestDamage(1.5);
    showToast("Suggestion soumise en arbitrage au Grand Juge. Merci ! 💡");
  };

  // Helper pour afficher les tooltips
  const triggerTooltip = (id) => {
    if (!isHelpActive) return;
    setActiveTooltip(activeTooltip === id ? null : id);
  };

  return (
    <div className={`app-container ${isZombie ? "zombie-mode" : ""} ${triggerScreenShake ? "screen-shake" : ""}`} style={{ paddingBottom: "75px" }}>
      
      {/* Flash Rouge sur Dégâts */}
      {showRedFlash && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(239, 68, 68, 0.25)",
          zIndex: 999999,
          pointerEvents: "none"
        }} />
      )}

      {/* Pluie de Cookies (Particules de Confettis) */}
      {cookieConfettiActive && Array.from({ length: 18 }).map((_, idx) => {
        const animationNum = (idx % 6) + 1; // fly-1 à fly-6
        const rotationStart = (idx * 20) % 360;
        const scale = 0.5 + (idx % 4) * 0.2; // 0.5, 0.7, 0.9, 1.1
        const delay = (idx * 0.05).toFixed(2);
        return (
          <div
            key={idx}
            className="cookie-particle"
            style={{
              animation: `cookie-fly-${animationNum} 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both`,
              animationDelay: `${delay}s`,
              transform: `rotate(${rotationStart}deg) scale(${scale})`
            }}
          >
            🍪
          </div>
        );
      })}

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
          {profilePhoto ? (
            <img src={profilePhoto} alt="Profil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontFamily: "var(--font-title)", fontSize: "0.9rem" }}>
              {player.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        {/* Logo mini */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <img src={mascotteLogo} alt="Mascotte" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
          <span style={{ fontFamily: "var(--font-title)", fontSize: "1.1rem", textShadow: "1.5px 1.5px 0 #000", letterSpacing: "0.03em" }}>
            Cookillers
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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

          {/* Bouton de déconnexion */}
          <button
            type="button"
            onClick={() => {
              if (confirm("Voulez-vous vraiment quitter le salon ?")) {
                logOut();
              }
            }}
            style={{
              background: "none",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              display: "flex",
              alignItems: "center"
            }}
            title="Se déconnecter"
          >
            <LogOut size={22} />
          </button>
        </div>
      </header>

      {/* Onde ECG de Vitalité */}
      {(() => {
        let ecgColor = "#22c55e"; // vert
        if (isZombie) ecgColor = "#a855f7"; // violet
        else if (player.lives < 2.0) ecgColor = "#ef4444"; // rouge
        else if (player.lives < 4.0) ecgColor = "#f97316"; // orange

        return (
          <div 
            className="ecg-container" 
            style={{ margin: "4px 10px", height: "30px", borderRadius: "8px", "--ecg-base-color": ecgColor }} 
            onClick={() => triggerTooltip("ecg")}
          >
            <div className={`ecg-line ${ecgClass}`} />
            {isHelpActive && (
              <div style={{ position: "absolute", right: "6px", top: "4px", backgroundColor: "var(--color-cyan)", color: "#000", borderRadius: "50%", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyItems: "center", fontSize: "10px", fontWeight: "bold", cursor: "pointer", paddingLeft: "5px" }}>?</div>
            )}
            {activeTooltip === "ecg" && (
              <div onClick={() => setActiveTooltip(null)} style={{ position: "fixed", bottom: "90px", left: "16px", right: "16px", backgroundColor: "#1e1b30", border: "2px solid var(--color-cyan)", padding: "12px", borderRadius: "12px", zIndex: 1000, fontSize: "0.85rem", boxShadow: "0 4px 20px rgba(0,0,0,0.7)" }}>
                <strong>Constantes Vitales :</strong> Si vos cœurs ❤️ tombent à 0, vous décédez et passez zombie 🧟 (Mode Moisi).
              </div>
            )}
          </div>
        );
      })()}

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
            <div onClick={() => setActiveTooltip(null)} style={{ position: "fixed", bottom: "90px", left: "16px", right: "16px", backgroundColor: "#1e1b30", border: "2px solid var(--color-cyan)", padding: "12px", borderRadius: "12px", zIndex: 1000, fontSize: "0.85rem", boxShadow: "0 4px 20px rgba(0,0,0,0.7)" }}>
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
          {isZombie && (
            <span 
              className="rarity-badge" 
              style={{ 
                backgroundColor: "var(--color-purple)", 
                color: "#fff", 
                fontSize: "0.6rem", 
                padding: "2px 6px", 
                marginLeft: "4px",
                border: "1.5px solid #000",
                boxShadow: "1px 1px 0 #000",
                textShadow: "1px 1px 0 #000"
              }}
            >
              x0.5 🪙 (ZOMBIE)
            </span>
          )}
          {isHelpActive && (
            <div style={{ backgroundColor: "var(--color-cyan)", color: "#000", borderRadius: "50%", width: "12px", height: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: "bold" }}>?</div>
          )}
          {activeTooltip === "biscuits" && (
            <div onClick={() => setActiveTooltip(null)} style={{ position: "fixed", bottom: "90px", left: "16px", right: "16px", backgroundColor: "#1e1b30", border: "2px solid var(--color-cyan)", padding: "12px", borderRadius: "12px", zIndex: 1000, fontSize: "0.85rem", boxShadow: "0 4px 20px rgba(0,0,0,0.7)" }}>
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
            <div onClick={() => setActiveTooltip(null)} style={{ position: "fixed", bottom: "90px", left: "16px", right: "16px", backgroundColor: "#1e1b30", border: "2px solid var(--color-cyan)", padding: "12px", borderRadius: "12px", zIndex: 1000, fontSize: "0.85rem", boxShadow: "0 4px 20px rgba(0,0,0,0.7)" }}>
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

            {/* Feu de camp animé au centre (interactif) */}
            <div 
              className="fire-camp"
              onClick={() => showToast("Aïe, c'est chaud ! Ne mettez pas les doigts dans le feu... 🔥")}
              style={{
                zIndex: 5,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer"
              }}
            >
              <span style={{ fontSize: "3rem" }}>🔥</span>
            </div>

            {/* Cercle d'avatars des joueurs autour du feu */}
            <div style={{ position: "absolute", width: "100%", height: "100%", zIndex: 4 }}>
              {gameState.players.map((p, idx) => {
                const angle = (idx * 2 * Math.PI) / Math.max(1, gameState.players.length);
                const radiusX = 35; // Rayon horizontal en %
                const radiusY = 22; // Rayon vertical en % pour s'adapter au cadre
                const left = 50 + radiusX * Math.cos(angle);
                const top = 50 + radiusY * Math.sin(angle);

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

                const userPhoto = campPhotos[p.name];

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
                      zIndex: 4,
                      overflow: "hidden"
                    }}
                    title={p.name}
                  >
                    {p.isZombie ? (
                      "🧟"
                    ) : userPhoto ? (
                      <img src={userPhoto} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      p.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section Contrat principal */}
          {/* Section Contrat principal / Mode Moisi */}
          {isZombie ? (
            /* AFFICHAGE DU MODE MOISI */
            <div style={{ display: "flex", flexDirection: "column", padding: "10px", alignItems: "center" }}>
              <h2 style={{ fontSize: "2rem", color: "var(--color-zombie)", fontFamily: "var(--font-title)", textTransform: "uppercase", margin: "10px 0 2px 0", textShadow: "3px 3px 0 #000" }}>
                MODE MOISI
              </h2>
              <div style={{ backgroundColor: "#1c3d27", color: "var(--color-zombie)", border: "2px solid var(--color-zombie)", padding: "4px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px", boxShadow: "2px 2px 0 #000" }}>
                CADAVRE AMBULANT
              </div>

              {/* Image de la pierre tombale */}
              <img 
                src={tombstoneZombie} 
                alt="Tombeau Zombie" 
                style={{ width: "120px", height: "120px", objectFit: "contain", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))", marginBottom: "12px" }}
              />

              <p style={{ fontSize: "0.85rem", color: "#9ca3af", textAlign: "center", fontStyle: "italic", padding: "0 15px", lineHeight: "1.4", marginBottom: "15px" }}>
                "Vous êtes officiellement en décomposition. Votre pseudo sent le vieux camembert oublié au soleil."
              </p>

              {/* Cadre Contrat de Morsure */}
              <div className="card-cartoon" style={{ border: "3px solid var(--color-zombie)", backgroundColor: "#0c1510", width: "100%", padding: "12px", textAlign: "left", marginBottom: "15px", boxShadow: "4px 4px 0 #000", position: "relative" }}>
                {pendingHit && (
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(34, 197, 94, 0.4)",
                    backdropFilter: "blur(4px)",
                    zIndex: 30,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: "rotate(-4deg)"
                  }}>
                    <div style={{
                      backgroundColor: "var(--color-zombie)",
                      color: "#fff",
                      fontFamily: "var(--font-title)",
                      padding: "8px 24px",
                      border: "3px solid #000",
                      boxShadow: "3px 3px 0 #000",
                      textTransform: "uppercase"
                    }}>
                      Morsure en examen 🛡️
                    </div>
                  </div>
                )}
                
                <h3 style={{ fontSize: "0.8rem", color: "var(--color-zombie)", fontFamily: "var(--font-title)", textTransform: "uppercase", margin: "0 0 6px 0" }}>
                  🧟 Contrat de Morsure
                </h3>
                <h4 style={{ fontSize: "1.05rem", color: "#fff", margin: "4px 0" }}>
                  {currentAction ? currentAction.title : "Morsure Zombie"}
                </h4>
                <p style={{ fontSize: "0.85rem", color: "#9ca3af", fontStyle: "italic", margin: "4px 0 8px 0" }}>
                  {currentAction ? currentAction.description : "Faire prononcer le mot 'Cerveau' à un survivant ou lui faire mimer une marche de zombie."}
                </p>
                <div style={{ display: "flex", gap: "12px", fontSize: "0.8rem", fontWeight: "bold", borderTop: "1px solid rgba(34, 197, 94, 0.2)", paddingTop: "8px" }}>
                  <span style={{ color: "#fbbf24" }}>Récompense : +50 🪙</span>
                  <span style={{ color: "var(--color-green)" }}>Rédemption : +1.0 ❤️</span>
                </div>
              </div>

              {/* Sélection de la cible à mordre */}
              <div style={{ width: "100%", textAlign: "left", marginBottom: "15px" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--color-zombie)", fontWeight: "bold", marginBottom: "6px", display: "block" }}>
                  CIBLES POTENTIELLES :
                </label>
                <select
                  value={zombieVictim}
                  onChange={(e) => setZombieVictim(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "10px",
                    backgroundColor: "#161320",
                    color: "#fff",
                    border: "3px solid #000",
                    boxShadow: "3px 3px 0 #000"
                  }}
                  disabled={pendingHit}
                >
                  <option value="">-- Choisir un survivant à mordre --</option>
                  {gameState.players.filter(p => !p.isZombie && !p.isFrozen).map(p => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Bouton de morsure */}
              <button
                type="button"
                className="btn-cartoon btn-red animate-pulse"
                style={{ width: "100%", height: "48px", backgroundColor: "#b91c1c", border: "3px solid #000" }}
                disabled={pendingHit || !zombieVictim}
                onClick={handleHitSubmit}
              >
                MORDRE UN SURVIVANT 🧟
              </button>
            </div>
          ) : player.target ? (
            /* ÉCRAN DE TRAQUE STANDARD SURVIVANT */
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
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                      {/* Photo de profil de la cible (lazy-loaded) */}
                      <div style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "50%",
                        border: "2px solid #000",
                        backgroundColor: "#2e255c",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "2px 2px 0 #000",
                        flexShrink: 0
                      }}>
                        {targetPhoto ? (
                          <img src={targetPhoto} alt="Cible" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: "1.5rem" }}>👤</span>
                        )}
                      </div>

                      <div>
                        <span style={{ fontSize: "0.8rem", color: "var(--color-cyan)", fontFamily: "var(--font-title)", textTransform: "uppercase" }}>
                          Cible Secrète :
                        </span>
                        <h2 style={{ fontSize: "1.6rem", margin: 0, color: "#fff", transform: "none", textShadow: "2px 2px 0 #000", lineHeight: "1.2" }}>
                          {player.target}
                        </h2>
                      </div>
                    </div>

                    <span style={{ fontSize: "0.8rem", color: "var(--color-purple)", fontFamily: "var(--font-title)", textTransform: "uppercase", display: "block", marginTop: "8px" }}>
                      Piège Absurde :
                    </span>
                    <p style={{ fontSize: "0.95rem", color: "#e5e7eb", fontStyle: "italic", marginTop: "2px" }}>
                      {currentAction ? currentAction.description : "Pas de défi actif. Demandez une relance ou attendez."}
                    </p>

                    {currentAction && (
                      <div style={{ display: "flex", gap: "10px", marginTop: "12px", fontSize: "0.8rem", fontWeight: "bold" }}>
                        <span style={{ color: "#fbbf24" }}> Récompense : +{isZombie ? Math.floor(currentAction.scoreReward / 2) : currentAction.scoreReward} 🪙</span>
                        <span style={{ color: "var(--color-red)" }}> Dégâts : -{isZombie ? 0 : currentAction.damagePenalty} ❤️</span>
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
                  ⚔️ Contrat Exécuté
                </button>

                <button
                  type="button"
                  className="btn-cartoon btn-cyan"
                  style={{ flex: 1, height: "48px", padding: "0" }}
                  disabled={player.skips < 1 || pendingHit}
                  onClick={() => setShowSkipConfirmModal(true)}
                  title="Brûler la Recette"
                >
                  Brûler 🌀
                </button>
              </div>

              {/* Boutons secondaires : Dénonciation & Abandon */}
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
                  disabled={pendingHit}
                  onClick={() => setShowAbandonModal(true)}
                >
                  🏳️ Abandonner Cible
                </button>
              </div>
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
          ) : player.lives >= 7.0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--color-green)", border: "2px dashed var(--color-green)", borderRadius: "12px", lineHeight: "1.4" }}>
              Tu débordes de vie. Calme-toi, l'ami, et va plutôt courir dans la boue au lieu de vider la gourde des copains. ⛲
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

                    {player.fountainRefreshesToday > 0 && (
                      <button
                        type="button"
                        className="btn-cartoon"
                        style={{ width: "100%", padding: "0.5rem", marginBottom: "10px", backgroundColor: "var(--color-purple)", border: "2px solid #000" }}
                        onClick={handleFountainRefresh}
                      >
                        Changer de Recette 🌀
                      </button>
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
                    onClick={() => handleFountainDraw("action")}
                  >
                    Puiser une Action (+{player.fountainTotalUses >= 5 ? "3.0" : player.fountainTotalUses >= 3 ? "1.5" : "0.5"} ❤️)
                  </button>

                  <button
                    type="button"
                    className="btn-cartoon btn-cyan"
                    onClick={() => handleFountainDraw("verite")}
                  >
                    Puiser une Vérité (+{player.fountainTotalUses >= 5 ? "3.0" : player.fountainTotalUses >= 3 ? "1.5" : "0.5"} ❤️)
                  </button>
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
            {/* Sélecteur de type */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
              <button
                type="button"
                style={{ flex: 1, padding: "6px", fontSize: "0.7rem", border: "2px solid #000", borderRadius: "8px", backgroundColor: suggestType === "mission" ? "var(--color-purple)" : "#100e1f", color: "#fff", fontWeight: "bold", cursor: "pointer" }}
                onClick={() => { setSuggestType("mission"); setSuggestReward(100); setSuggestDamage(1.5); }}
              >
                Mission 🎯
              </button>
              <button
                type="button"
                style={{ flex: 1, padding: "6px", fontSize: "0.7rem", border: "2px solid #000", borderRadius: "8px", backgroundColor: suggestType === "fountain_action" ? "var(--color-purple)" : "#100e1f", color: "#fff", fontWeight: "bold", cursor: "pointer" }}
                onClick={() => { setSuggestType("fountain_action"); setSuggestReward(0); setSuggestDamage(0.5); }}
              >
                Action ⛲
              </button>
              <button
                type="button"
                style={{ flex: 1, padding: "6px", fontSize: "0.7rem", border: "2px solid #000", borderRadius: "8px", backgroundColor: suggestType === "fountain_truth" ? "var(--color-purple)" : "#100e1f", color: "#fff", fontWeight: "bold", cursor: "pointer" }}
                onClick={() => { setSuggestType("fountain_truth"); setSuggestReward(0); setSuggestDamage(0.5); }}
              >
                Vérité ⛲
              </button>
            </div>

            {suggestType === "mission" && (
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--color-purple)" }}>
                  Intitulé du défi :
                </label>
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
            )}

            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--color-purple)" }}>
                {suggestType === "fountain_truth" ? "Votre question à poser :" : "Description du défi / action à réaliser :"}
              </label>
              <textarea
                value={suggestDesc}
                onChange={(e) => setSuggestDesc(e.target.value)}
                placeholder={suggestType === "fountain_truth" ? "Votre question sincère..." : "Expliquez clairement ce qu'il faut faire..."}
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

            {suggestType === "mission" ? (
              /* Sélecteurs Récompense 🪙 et Dégâts ❤️ */
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
            ) : (
              /* Soin Fontaine pour action/verité */
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--color-cyan)", fontWeight: "bold" }}>
                  <span>Difficulté / Soin apporté :</span>
                  <span>
                    {suggestDamage === 0.5 ? "Tier I : Jus de Chaussette (+0.5 ❤️)" : 
                     suggestDamage === 1.5 ? "Tier II : Élixir du Barman (+1.5 ❤️)" : 
                     "Tier III : Larmes de VIP (+3.0 ❤️)"}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="1"
                  value={suggestDamage === 0.5 ? 1 : suggestDamage === 1.5 ? 2 : 3}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val === 1) setSuggestDamage(0.5);
                    else if (val === 2) setSuggestDamage(1.5);
                    else setSuggestDamage(3.0);
                  }}
                  style={{ width: "100%", accentColor: "var(--color-cyan)", cursor: "pointer" }}
                />
              </div>
            )}

            <button
              type="button"
              className="btn-cartoon btn-green"
              style={{ marginTop: "1rem", height: "44px" }}
              onClick={handleSuggestSubmit}
            >
              Envoyer à l'Arbitrage
            </button>

            {/* Suggestions déjà soumises et actives du joueur */}
            <div style={{ marginTop: "1.2rem" }}>
              <h4 style={{ fontFamily: "var(--font-title)", fontSize: "0.8rem", color: "var(--color-purple)", borderBottom: "2px solid var(--border-color)", paddingBottom: "4px", marginBottom: "8px" }}>
                Mes Suggestions actives
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "150px", overflowY: "auto" }}>
                {gameState.actionPool.filter(a => a.createdByPlayer === player.name).map(a => (
                  <div key={a.id} style={{ padding: "8px 10px", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: "8px", border: "1px solid rgba(168, 85, 247, 0.2)", fontSize: "0.75rem", textAlign: "left" }}>
                    <div style={{ fontWeight: "bold", color: "#fff" }}>{a.title}</div>
                    <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "2px" }}>{a.description}</div>
                    <div style={{ display: "flex", gap: "10px", marginTop: "4px", fontSize: "0.65rem", color: "var(--color-cyan)" }}>
                      <span>🪙 +{a.scoreReward}</span>
                      <span>❤️ -{a.damagePenalty}</span>
                    </div>
                  </div>
                ))}
                {gameState.actionPool.filter(a => a.createdByPlayer === player.name).length === 0 && (
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af", fontStyle: "italic", textAlign: "center", padding: "10px" }}>
                    Aucune suggestion active pour le moment. Proposez une idée !
                  </div>
                )}
              </div>
            </div>
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
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Profil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : player.hasPhoto ? (
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

      {/* MODALE : CONFIRMATION DE SKIP */}
      <AnimatePresence>
        {showSkipConfirmModal && (
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
            <div className="card-cartoon glow-purple" style={{ width: "100%", maxWidth: "340px", textAlign: "center" }}>
              <h3 style={{ color: "var(--color-purple)", marginBottom: "1rem" }}>Brûler la Recette ?</h3>
              <p style={{ fontSize: "0.85rem", color: "#d1d5db", marginBottom: "1.2rem", lineHeight: "1.4" }}>
                Voulez-vous vraiment changer de défi ? Cette action consommera <strong>1 jeton de relance 🌀</strong>.
                <br />
                <span style={{ color: "var(--color-cyan)" }}>Solde restant : {player.skips} 🌀</span>
              </p>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="btn-cartoon btn-cyan"
                  style={{ flex: 1, height: "44px" }}
                  onClick={() => {
                    skipMission();
                    setShowSkipConfirmModal(false);
                  }}
                >
                  Confirmer 🌀
                </button>
                <button
                  type="button"
                  className="btn-cartoon"
                  style={{ flex: 1, height: "44px", backgroundColor: "#4b5563" }}
                  onClick={() => setShowSkipConfirmModal(false)}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALE : ACCÈS INTERDIT AUX ZOMBIES */}
      <AnimatePresence>
        {showZombieFountainModal && (
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
              <span style={{ fontSize: "3rem" }}>🧟🔒</span>
              <h3 style={{ color: "var(--color-red)", margin: "1rem 0" }}>Accès Interdit !</h3>
              <p style={{ fontSize: "0.85rem", color: "#d1d5db", marginBottom: "1.5rem", lineHeight: "1.4" }}>
                Accès interdit aux zombies. Trouvez le GameMaster pour réclamer une rédemption.
              </p>
              <button
                type="button"
                className="btn-cartoon btn-red"
                style={{ width: "100%", height: "44px" }}
                onClick={() => setShowZombieFountainModal(false)}
              >
                Retourner Hanter le Camping
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
          onClick={() => {
            if (isZombie) {
              setShowZombieFountainModal(true);
            } else {
              setActiveTab("source");
            }
          }}
        >
          <span style={{ fontSize: "1.6rem" }}>{isZombie ? "⛲🔒" : "⛲"}</span>
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
