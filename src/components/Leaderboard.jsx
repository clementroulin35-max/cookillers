import React, { useState } from "react";
import { Trophy, ShieldAlert, Shuffle, AlignJustify, Award, Activity, MessageSquare, EyeOff, Shield, Heart } from "lucide-react";
import { useGame } from "../context/GameContext";

export const getRank = (score) => {
  if (score >= 3500) return { icon: "👑", label: "Dieu du Pogo", css: "rank-alpha" };
  if (score >= 2000) return { icon: "💀", label: "Légende du Camping", css: "rank-legend" };
  if (score >= 1000) return { icon: "👻", label: "L'Ombre Invisible", css: "rank-ghost" };
  if (score >= 450) return { icon: "🐺", label: "Le Chasseur de Bières", css: "rank-predator" };
  if (score >= 150) return { icon: "🏹", label: "Le Tireur de Gobelet", css: "rank-hunter" };
  return { icon: "⚔️", label: "Le Touriste en Tongs", css: "rank-civil" };
};

export default function Leaderboard({ players, history }) {
  const { getHistoryProof } = useGame();
  const [subTab, setSubTab] = useState("scores"); // scores, trophies, flux
  const [expandedPhoto, setExpandedPhoto] = useState(null);
  const [loadedProofs, setLoadedProofs] = useState({}); // { id: proofString }

  const handleLoadProof = async (id) => {
    try {
      const proof = await getHistoryProof(id);
      setLoadedProofs(prev => ({ ...prev, [id]: proof || "Pas de preuve." }));
    } catch (err) {
      console.error("Erreur de chargement preuve :", err);
    }
  };

  // Trier les joueurs par score descendant. Si zombie, le score effectif est divisé par 2
  const sortedPlayers = [...players].map(p => ({
    ...p,
    effectiveScore: p.isZombie ? Math.floor(p.score * 0.5) : p.score
  })).sort((a, b) => {
    if (b.effectiveScore !== a.effectiveScore) return b.effectiveScore - a.effectiveScore;
    if (b.lives !== a.lives) return b.lives - a.lives;
    return a.name.localeCompare(b.name);
  });

  // Calcul des trophées selon les métriques exactes accumulées
  const getTrophyWinners = () => {
    // 1. Prédateur Alpha : Max score
    const maxScore = Math.max(...players.map(p => p.score), 0);
    const alphas = maxScore > 0 ? players.filter(p => p.score === maxScore).map(p => p.name) : [];

    // 2. Survivant Ultime : Max cœurs parmi les vivants
    const survivorsOnly = players.filter(p => !p.isZombie && !p.isFrozen);
    const maxLives = survivorsOnly.length > 0 ? Math.max(...survivorsOnly.map(p => p.lives)) : 0;
    const survivors = maxLives > 0 ? survivorsOnly.filter(p => p.lives === maxLives).map(p => p.name) : [];

    // 3. Patient Zéro : Zombie avec stat_zombie_date la plus ancienne
    const zombies = players.filter(p => p.isZombie && p.statZombieDate);
    let patientZero = [];
    if (zombies.length > 0) {
      const sortedZombies = [...zombies].sort((a, b) => new Date(a.statZombieDate) - new Date(b.statZombieDate));
      patientZero = [sortedZombies[0].name];
    }

    // 4. Le Faucheur du Camping : Max kills
    const maxKills = Math.max(...players.map(p => p.statKillsCount), 0);
    const reapers = maxKills > 0 ? players.filter(p => p.statKillsCount === maxKills).map(p => p.name) : [];

    // 5. Le Complotiste / Paranoïa+ : Max fausses accusations
    const maxFailedAcc = Math.max(...players.map(p => p.statFailedCounterattacks), 0);
    const complotistes = maxFailedAcc > 0 ? players.filter(p => p.statFailedCounterattacks === maxFailedAcc).map(p => p.name) : [];

    // 6. Le Joueur Fou / Roi du Skip : Max skips + abandons
    const crazyScores = players.map(p => ({
      name: p.name,
      totalSkips: p.statSkipsMissions + p.statAbandonCount
    }));
    const maxCrazy = Math.max(...crazyScores.map(c => c.totalSkips), 0);
    const crazyPlayers = maxCrazy > 0 ? crazyScores.filter(c => c.totalSkips === maxCrazy).map(c => c.name) : [];

    // 7. La Source de Jouvence : Max utilisations fontaine
    const maxFountain = Math.max(...players.map(p => p.statFountainUses), 0);
    const fountainLovers = maxFountain > 0 ? players.filter(p => p.statFountainUses === maxFountain).map(p => p.name) : [];

    // 8. L'Insaisissable : Max accusations correctes
    const maxSuccessfulAcc = Math.max(...players.map(p => p.statSuccessfulCounterattacks), 0);
    const elusives = maxSuccessfulAcc > 0 ? players.filter(p => p.statSuccessfulCounterattacks === maxSuccessfulAcc).map(p => p.name) : [];

    return { alphas, survivors, patientZero, reapers, complotistes, crazyPlayers, fountainLovers, elusives, maxKills, maxFailedAcc, maxCrazy, maxFountain, maxSuccessfulAcc };
  };

  const trophies = getTrophyWinners();

  // Top 3 pour le podium
  const first = sortedPlayers[0];
  const second = sortedPlayers[1];
  const third = sortedPlayers[2];

  const renderPodiumItem = (player, rank) => {
    if (!player) return <div style={{ flex: 1, minWidth: "80px" }} />;
    const colors = ["#fbbf24", "#9ca3af", "#d97706"];
    const heights = ["100px", "80px", "60px"];
    
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: "80px" }}>
        <div style={{ position: "relative", marginBottom: "8px" }}>
          <div style={{
            width: "55px",
            height: "55px",
            borderRadius: "50%",
            border: `3px solid ${colors[rank-1]}`,
            backgroundColor: "#2e2a47",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            fontWeight: "bold",
            fontSize: "1.2rem",
            filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))"
          }}>
            {player.name.slice(0, 2).toUpperCase()}
          </div>
          {player.isZombie && (
            <span style={{ position: "absolute", bottom: 0, right: 0, fontSize: "1.1rem" }}>🧟</span>
          )}
        </div>
        <span style={{ fontFamily: "var(--font-title)", fontSize: "0.85rem", textShadow: "1px 1px 0 #000", maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {player.name}
        </span>
        <span style={{ fontSize: "0.8rem", color: "#fbbf24", fontWeight: "bold" }}>
          {player.effectiveScore} 🪙
        </span>
        <div style={{
          width: "100%",
          height: heights[rank-1],
          backgroundColor: colors[rank-1],
          border: "3px solid #000",
          boxShadow: "3px 3px 0 #000",
          borderRadius: "8px 8px 0 0",
          marginTop: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <span style={{ fontFamily: "var(--font-title)", fontSize: "1.5rem", color: rank === 1 ? "#000" : "#fff", textShadow: rank !== 1 ? "1.5px 1.5px 0 #000" : "none" }}>
            {rank}
          </span>
        </div>
      </div>
    );
  };

  // Formater le message pour l'anonymisation du Flux
  const renderAnonymizedMessage = (evt) => {
    switch (evt.type) {
      case "hit_declared":
        return (
          <span style={{ fontStyle: "italic", color: "#9ca3af" }}>
            ⚔️ Transmission en cours avec le Grand Juge... Un assassinat a été déclaré sur <strong>{evt.targetName}</strong>.
          </span>
        );
      case "hit_approved":
        return (
          <span>
            ⚔️ <strong>CONTRAT EXÉCUTÉ</strong><br/>
            <strong>{evt.playerName}</strong> a validé un contrat sur <strong>{evt.targetName}</strong> !<br/>
            <span style={{ color: "var(--color-purple)", fontSize: "0.85rem", fontWeight: "bold" }}>
              Gain : +{evt.scoreReward} 🪙 | Dégâts : -{evt.damagePenalty} ❤️
            </span>
            <br/>
            <span style={{ color: "#9ca3af", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
              <EyeOff size={12} /> Le titre et la description du défi secret sont masqués.
            </span>
          </span>
        );
      case "counter_attack_pending":
        return (
          <span style={{ fontStyle: "italic", color: "#9ca3af" }}>
            ⚠️ Dénonciation en cours ! Le bureau des rumeurs examine l'accusation lancée par <strong>{evt.playerName}</strong>.
          </span>
        );
      case "counter_attack_correct":
        return (
          <span>
            🛡️ <strong>ASSASSIN REPOUSSÉ</strong><br/>
            <strong>{evt.playerName}</strong> a démasqué son traqueur ! La tentative d'assassinat échoue. L'action du tueur est brûlée.<br/>
            <span style={{ color: "#9ca3af", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
              <EyeOff size={12} /> L'identité du tueur et le défi restent anonymes.
            </span>
          </span>
        );
      case "counter_attack_incorrect":
        return (
          <span>
            ⚠️ <strong>ALERTE PARANOÏA</strong><br/>
            <strong>{evt.playerName}</strong> a lancé une fausse accusation ! La paranoïa lui coûte cher.<br/>
            <span style={{ color: "var(--color-red)", fontSize: "0.85rem", fontWeight: "bold" }}>
              Pénalité : -0.5 ❤️
            </span>
          </span>
        );
      case "fountain_use":
        const hasProof = evt.hasPhotoProof;
        const proof = loadedProofs[evt.id];
        const isPhoto = proof && proof.startsWith("data:image");
        return (
          <span>
            ⛲ <strong>SOIN SOURCE</strong><br/>
            <strong>{evt.playerName}</strong> s'est ressourcé en réalisant le défi : <strong style={{ color: "var(--color-cyan)" }}>{evt.actionTitle || "Défi de la Source"}</strong>.<br/>
            <span style={{ color: "var(--color-green)", fontSize: "0.85rem", fontWeight: "bold" }}>
              Régénération : +{Math.abs(evt.damagePenalty)} ❤️
            </span>
            
            {hasProof && !proof && (
              <div style={{ marginTop: "6px" }}>
                <button
                  type="button"
                  className="btn-cartoon"
                  style={{ padding: "4px 8px", fontSize: "0.7rem", backgroundColor: "rgba(34, 211, 238, 0.15)", border: "2px solid var(--color-cyan)" }}
                  onClick={() => handleLoadProof(evt.id)}
                >
                  👁️ Dévoiler la preuve
                </button>
              </div>
            )}

            {proof && isPhoto && (
              <div style={{ marginTop: "6px" }}>
                <img 
                  src={proof} 
                  alt="Preuve" 
                  onClick={() => setExpandedPhoto(proof)}
                  style={{ width: "90px", height: "70px", objectFit: "cover", borderRadius: "8px", border: "2px solid var(--color-cyan)", cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
                />
              </div>
            )}
            
            {proof && !isPhoto && (
              <div style={{ marginTop: "6px", backgroundColor: "rgba(34, 211, 238, 0.05)", borderLeft: "3px solid var(--color-cyan)", padding: "6px 10px", borderRadius: "0 8px 8px 0", fontStyle: "italic", fontSize: "0.85rem" }}>
                « {proof} »
              </div>
            )}
          </span>
        );
      case "zombie_bite":
        return (
          <span>
            🧟 <strong>MORSURE ZOMBIE</strong><br/>
            Un zombie a mordu <strong>{evt.targetName}</strong> ! Le zombie ressuscite et vole <strong>50 🪙</strong>.<br/>
            <span style={{ color: "var(--color-red)", fontSize: "0.85rem", fontWeight: "bold" }}>
              Victime : -1.0 ❤️ | -50 🪙
            </span>
          </span>
        );
      case "player_frozen":
        return (
          <span>
            ❄️ <strong>EXFILTRATION</strong><br/>
            Un joueur s'est exfiltré temporairement de la zone de combat.<br/>
            <span style={{ color: "#9ca3af", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
              <EyeOff size={12} /> Le pseudo du joueur gelé est masqué.
            </span>
          </span>
        );
      case "player_unfrozen":
        return (
          <span>
            🔥 <strong>RÉINTÉGRATION</strong><br/>
            Un exfiltré est de retour au camp des assassins ! La boucle a été ajustée.<br/>
            <span style={{ color: "#9ca3af", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
              <EyeOff size={12} /> Le pseudo du joueur réintégré est masqué.
            </span>
          </span>
        );
      case "rooster_crow":
        return (
          <span>
            🐓 <strong>LE CHANT DU COQ</strong><br/>
            Le matin se lève sur le festival ! Tout le monde reçoit <strong>+1 🌀</strong> et les fontaines quotidiennes sont réinitialisées.
          </span>
        );
      case "abandon_target":
        return (
          <span>
            🏳️ <strong>ABANDON DE CONTRAT</strong><br/>
            Un assassin a renoncé à son contrat. La pénalité a été appliquée en base de données.<br/>
            <span style={{ color: "#9ca3af", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
              <EyeOff size={12} /> L'identité du lâche est masquée.
            </span>
          </span>
        );
      case "game_started":
        return (
          <span style={{ color: "var(--color-green)", fontWeight: "bold" }}>
            🚀 La chasse est officiellement ouverte ! Que la paranoïa commence...
          </span>
        );
      case "game_finished":
        return (
          <span style={{ color: "#fbbf24", fontWeight: "bold" }}>
            🏆 Le festival se termine ! La chasse est close. Consultez l'onglet Trophées pour célébrer les vainqueurs.
          </span>
        );
      default:
        return <span>Action mystérieuse du jeu de type {evt.type}.</span>;
    }
  };

  return (
    <div style={{ paddingBottom: "80px" }}>
      <div className="card-cartoon glow-purple">
        <h2 style={{ textAlign: "center", width: "100%", margin: "0.5rem 0 1.2rem 0", color: "var(--color-purple)" }}>
          Le Tableau d'Affichage
        </h2>

        {/* Sous-onglets */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "1.2rem" }}>
          <button
            type="button"
            className={`btn-cartoon ${subTab === "scores" ? "btn-purple" : "btn-disabled"}`}
            style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem" }}
            onClick={() => setSubTab("scores")}
          >
            <AlignJustify size={16} /> Scores
          </button>
          <button
            type="button"
            className={`btn-cartoon ${subTab === "trophies" ? "btn-purple" : "btn-disabled"}`}
            style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem" }}
            onClick={() => setSubTab("trophies")}
          >
            <Award size={16} /> Trophées
          </button>
          <button
            type="button"
            className={`btn-cartoon ${subTab === "flux" ? "btn-purple" : "btn-disabled"}`}
            style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem" }}
            onClick={() => setSubTab("flux")}
          >
            <Activity size={16} /> Flux
          </button>
        </div>

        {/* 1. SCORES & PODIUM */}
        {subTab === "scores" && (
          <div>
            {sortedPlayers.length >= 3 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "1rem 0", marginBottom: "1.5rem", borderBottom: "2px solid var(--border-color)" }}>
                {renderPodiumItem(second, 2)}
                {renderPodiumItem(first, 1)}
                {renderPodiumItem(third, 3)}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {sortedPlayers.map((player, idx) => {
                const rank = getRank(player.score);
                return (
                  <div
                    key={player.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: player.isZombie ? "rgba(74, 222, 128, 0.05)" : "rgba(255,255,255,0.02)",
                      border: `2px solid ${player.isZombie ? "var(--color-zombie)" : "#000"}`,
                      borderRadius: "12px",
                      padding: "8px 12px",
                      boxShadow: "3px 3px 0 #000"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontFamily: "var(--font-title)", fontSize: "1.1rem", width: "24px", color: "var(--color-purple)" }}>
                        {idx + 1}
                      </span>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: "bold", fontSize: "1rem", display: "flex", alignItems: "center", gap: "6px" }}>
                          {player.name}
                          {player.isZombie && <span>🧟</span>}
                          {player.isFrozen && <span title="Gelé / Exfiltré">❄️</span>}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                          {rank.icon} {rank.label}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                        <span style={{ fontWeight: "black", fontSize: "1rem", color: "#fbbf24" }}>
                          {player.effectiveScore} 🪙
                        </span>
                        {player.isZombie && (
                          <span style={{ fontSize: "0.7rem", color: "var(--color-zombie)" }}>
                            (Score divisé par 2)
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "1.1rem" }}>
                        {player.isZombie ? "🧟" : `${player.lives} ❤️`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. TROPHÉES DE FIN */}
        {subTab === "trophies" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            
            {/* Trophée 1: Le Prédateur Alpha */}
            <div className="card-cartoon" style={{ border: "2px solid #fbbf24", margin: 0, padding: "0.8rem", backgroundColor: "rgba(251, 191, 36, 0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "2rem" }}>👑</span>
                <div>
                  <h4 style={{ color: "#fbbf24", fontFamily: "var(--font-title)", fontSize: "1rem" }}>Le Prédateur Alpha</h4>
                  <p style={{ fontSize: "0.8rem", color: "#d1d5db" }}>Le roi du pogo ayant accumulé le plus grand nombre de 🪙.</p>
                </div>
              </div>
              <div style={{ textAlign: "right", marginTop: "6px", fontSize: "0.9rem", fontStyle: "italic", fontWeight: "bold" }}>
                {trophies.alphas.join(", ") || "Aucun"}
              </div>
            </div>

            {/* Trophée 2: Le Survivant Ultime */}
            <div className="card-cartoon" style={{ border: "2px solid #ef4444", margin: 0, padding: "0.8rem", backgroundColor: "rgba(239, 68, 68, 0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "2rem" }}>🛡️</span>
                <div>
                  <h4 style={{ color: "#ef4444", fontFamily: "var(--font-title)", fontSize: "1rem" }}>Le Survivant Ultime</h4>
                  <p style={{ fontSize: "0.8rem", color: "#d1d5db" }}>Le miraculé ayant conservé le plus grand nombre de ❤️ (vivant).</p>
                </div>
              </div>
              <div style={{ textAlign: "right", marginTop: "6px", fontSize: "0.9rem", fontStyle: "italic", fontWeight: "bold" }}>
                {trophies.survivors.join(", ") || "Aucun"}
              </div>
            </div>

            {/* Trophée 3: Le Patient Zéro */}
            <div className="card-cartoon" style={{ border: "2px solid var(--color-zombie)", margin: 0, padding: "0.8rem", backgroundColor: "rgba(74, 222, 128, 0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "2rem" }}>🧟</span>
                <div>
                  <h4 style={{ color: "var(--color-zombie)", fontFamily: "var(--font-title)", fontSize: "1rem" }}>Le Patient Zéro</h4>
                  <p style={{ fontSize: "0.8rem", color: "#d1d5db" }}>La première victime à être passée dans le Mode Moisi (décédée à 0 ❤️).</p>
                </div>
              </div>
              <div style={{ textAlign: "right", marginTop: "6px", fontSize: "0.9rem", fontStyle: "italic", fontWeight: "bold" }}>
                {trophies.patientZero.join(", ") || "Aucun"}
              </div>
            </div>

            {/* Trophée 4: Le Faucheur du Camping */}
            <div className="card-cartoon" style={{ border: "2px solid var(--color-purple)", margin: 0, padding: "0.8rem", backgroundColor: "rgba(168, 85, 247, 0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "2rem" }}>🪓</span>
                <div>
                  <h4 style={{ color: "var(--color-purple)", fontFamily: "var(--font-title)", fontSize: "1rem" }}>Le Faucheur du Camping</h4>
                  <p style={{ fontSize: "0.8rem", color: "#d1d5db" }}>Le bourreau ayant infligé le coup de grâce le plus de fois ({trophies.maxKills} kills).</p>
                </div>
              </div>
              <div style={{ textAlign: "right", marginTop: "6px", fontSize: "0.9rem", fontStyle: "italic", fontWeight: "bold" }}>
                {trophies.reapers.join(", ") || "Aucun"}
              </div>
            </div>

            {/* Trophée 5: Le Complotiste */}
            <div className="card-cartoon" style={{ border: "2px solid var(--color-cyan)", margin: 0, padding: "0.8rem", backgroundColor: "rgba(34, 211, 238, 0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "2rem" }}>👁️</span>
                <div>
                  <h4 style={{ color: "var(--color-cyan)", fontFamily: "var(--font-title)", fontSize: "1rem" }}>Le Complotiste / Paranoïa+</h4>
                  <p style={{ fontSize: "0.8rem", color: "#d1d5db" }}>L'assassin ayant lancé le plus de fausses accusations ({trophies.maxFailedAcc} alertes).</p>
                </div>
              </div>
              <div style={{ textAlign: "right", marginTop: "6px", fontSize: "0.9rem", fontStyle: "italic", fontWeight: "bold" }}>
                {trophies.complotistes.join(", ") || "Aucun"}
              </div>
            </div>

            {/* Trophée 6: Le Joueur Fou */}
            <div className="card-cartoon" style={{ border: "2px solid #f97316", margin: 0, padding: "0.8rem", backgroundColor: "rgba(249, 115, 22, 0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "2rem" }}>🌀</span>
                <div>
                  <h4 style={{ color: "#f97316", fontFamily: "var(--font-title)", fontSize: "1rem" }}>Le Joueur Fou / Roi du Skip</h4>
                  <p style={{ fontSize: "0.8rem", color: "#d1d5db" }}>Le festivalier hyperactif ayant abusé de la relance ({trophies.maxCrazy} relances/abandons).</p>
                </div>
              </div>
              <div style={{ textAlign: "right", marginTop: "6px", fontSize: "0.9rem", fontStyle: "italic", fontWeight: "bold" }}>
                {trophies.crazyPlayers.join(", ") || "Aucun"}
              </div>
            </div>

            {/* Trophée 7: La Source de Jouvence */}
            <div className="card-cartoon" style={{ border: "2px solid #3b82f6", margin: 0, padding: "0.8rem", backgroundColor: "rgba(59, 130, 246, 0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "2rem" }}>⛲</span>
                <div>
                  <h4 style={{ color: "#3b82f6", fontFamily: "var(--font-title)", fontSize: "1rem" }}>La Source de Jouvence</h4>
                  <p style={{ fontSize: "0.8rem", color: "#d1d5db" }}>Le joueur s'étant abreuvé le plus grand nombre de fois à la Source ({trophies.maxFountain} fois).</p>
                </div>
              </div>
              <div style={{ textAlign: "right", marginTop: "6px", fontSize: "0.9rem", fontStyle: "italic", fontWeight: "bold" }}>
                {trophies.fountainLovers.join(", ") || "Aucun"}
              </div>
            </div>

            {/* Trophée 8: L'Insaisissable */}
            <div className="card-cartoon" style={{ border: "2px solid #ec4899", margin: 0, padding: "0.8rem", backgroundColor: "rgba(236, 72, 153, 0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "2rem" }}>👻</span>
                <div>
                  <h4 style={{ color: "#ec4899", fontFamily: "var(--font-title)", fontSize: "1rem" }}>L'Insaisissable</h4>
                  <p style={{ fontSize: "0.8rem", color: "#d1d5db" }}>Le joueur ayant esquivé le plus d'attaques en dénonçant correctement son tueur ({trophies.maxSuccessfulAcc} esquives).</p>
                </div>
              </div>
              <div style={{ textAlign: "right", marginTop: "6px", fontSize: "0.9rem", fontStyle: "italic", fontWeight: "bold" }}>
                {trophies.elusives.join(", ") || "Aucun"}
              </div>
            </div>

          </div>
        )}

        {/* 3. FLUX D'ACTIVITÉ PUBLIC ANONYMISÉ */}
        {subTab === "flux" && (
          <div>
            {history.length === 0 ? (
              <div style={{ padding: "30px 10px", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem", fontStyle: "italic" }}>
                Le journal de mission est désespérément vide pour l'instant.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {history.map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      padding: "10px 12px",
                      backgroundColor: "rgba(0, 0, 0, 0.3)",
                      border: "2px solid var(--border-color)",
                      borderRadius: "12px",
                      boxShadow: "2px 2px 0 #000",
                      fontSize: "0.9rem",
                      lineHeight: "1.4",
                      textAlign: "left"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                        {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{
                        fontSize: "0.65rem",
                        fontFamily: "var(--font-title)",
                        textTransform: "uppercase",
                        backgroundColor: evt.status === "completed" ? "rgba(34, 197, 94, 0.15)" : evt.status === "pending" ? "rgba(249, 115, 22, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        color: evt.status === "completed" ? "var(--color-green)" : evt.status === "pending" ? "#f97316" : "var(--color-red)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        border: "1px solid"
                      }}>
                        {evt.status === "completed" ? "Validé" : evt.status === "pending" ? "Examen" : "Rejeté"}
                      </span>
                    </div>
                    {renderAnonymizedMessage(evt)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox photo de preuve */}
      {expandedPhoto && (
        <div
          onClick={() => setExpandedPhoto(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            cursor: "pointer"
          }}
        >
          <img
            src={expandedPhoto}
            alt="Preuve Agrandie"
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              objectFit: "contain",
              borderRadius: "8px",
              border: "3px solid var(--color-cyan)",
              boxShadow: "0 0 30px rgba(34, 211, 238, 0.5)"
            }}
          />
        </div>
      )}
    </div>
  );
}
