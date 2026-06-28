import React, { useState, useEffect, useRef } from "react";

export default function TutorialOverlay({ onComplete }) {
  const [step, setStep] = useState(0);
  const [spotlightStyle, setSpotlightStyle] = useState({});
  const [tooltipStyle, setTooltipStyle] = useState({});
  const containerRef = useRef(null);

  const steps = [
    {
      selector: '[data-tuto="contrat"]',
      title: "🎯 La Cible Secrète",
      text: "Voici ta proie du moment et le piège absurde à lui tendre. Fais ça discrètement ! Si quelqu'un regarde, clique n'importe où sur cet encart pour le masquer instantanément.",
      position: "bottom"
    },
    {
      selector: '[data-tuto="campement"]',
      title: "⛺ Le Campement",
      text: "Retrouve tous les joueurs autour du feu. Tu penses être suivi ? Fais glisser la bulle du suspect directement dans le feu 🔥 pour l'accuser ! Les zombies 🧟 et gelés ❄️ ne peuvent pas être accusés.",
      position: "bottom"
    },
    {
      selector: '[data-tuto="vitalite"]',
      title: "❤️ Vitalité & 🍪 Biscuits",
      text: "Garde un œil sur tes cœurs de vie et ton score en biscuits (cookies). Si tes cœurs tombent à 0, tu décèdes et passes zombie 🧟 !",
      position: "bottom"
    },
    {
      selector: '[data-tuto="nav-contrat"]',
      title: "🎯 L'Écran Mission",
      text: "Ton écran principal pour gérer ton contrat actif, tes abandons, et lancer des accusations.",
      position: "top"
    },
    {
      selector: '[data-tuto="nav-source"]',
      title: "⛲ La Fontaine de Vie",
      text: "Rends-toi ici pour réaliser des actions ou vérités amusantes et regagner des cœurs ❤️ en cas de coup dur.",
      position: "top"
    },
    {
      selector: '[data-tuto="nav-suggestion"]',
      title: "💡 L'Usine à Sévices",
      text: "Propose de nouvelles idées de pièges absurdes ou vote pour les défis proposés par les autres joueurs.",
      position: "top"
    },
    {
      selector: '[data-tuto="nav-classement"]',
      title: "🏆 Le Classement",
      text: "Suis le classement général des survivants et des zombies en temps réel, ainsi que le flux des actualités du jeu.",
      position: "top"
    }
  ];

  const currentStep = steps[step];

  // Calcul du rectangle du spotlight
  useEffect(() => {
    const updateSpotlight = () => {
      if (!currentStep?.selector) return;
      const element = document.querySelector(currentStep.selector);
      if (!element) {
        // Si l'élément n'est pas rendu, on cache le spotlight
        setSpotlightStyle({ display: "none" });
        setTooltipStyle({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
        return;
      }

      const rect = element.getBoundingClientRect();
      const padding = 8;
      
      const newSpotlightStyle = {
        top: `${rect.top - padding + window.scrollY}px`,
        left: `${rect.left - padding + window.scrollX}px`,
        width: `${rect.width + padding * 2}px`,
        height: `${rect.height + padding * 2}px`,
        display: "block"
      };

      setSpotlightStyle(newSpotlightStyle);

      // Calculer la position de l'info-bulle (tooltip)
      const tooltipHeight = 160;
      const tooltipWidth = 280;
      let tooltipTop = 0;
      let tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2;

      // Limites de l'écran pour éviter que la bulle sorte
      tooltipLeft = Math.max(10, Math.min(window.innerWidth - tooltipWidth - 10, tooltipLeft));

      if (currentStep.position === "bottom") {
        tooltipTop = rect.bottom + 15 + window.scrollY;
      } else {
        tooltipTop = rect.top - tooltipHeight - 15 + window.scrollY;
      }

      setTooltipStyle({
        top: `${tooltipTop}px`,
        left: `${tooltipLeft}px`,
        width: `${tooltipWidth}px`
      });
    };

    updateSpotlight();
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight);
    
    // Un petit timeout pour laisser le temps aux éléments de se rendre
    const timer = setTimeout(updateSpotlight, 100);

    return () => {
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight);
      clearTimeout(timer);
    };
  }, [step, currentStep]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(prev => prev + 1);
    } else {
      localStorage.setItem("cookillers_tuto_done", "true");
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem("cookillers_tuto_done", "true");
    onComplete();
  };

  return (
    <div className="tuto-overlay" ref={containerRef}>
      {/* Zone Spotlight */}
      <div className="tuto-spotlight" style={spotlightStyle} />

      {/* Info-bulle explicative */}
      <div className="tuto-card" style={tooltipStyle}>
        <h3 style={{ margin: "0.25rem 0 0.5rem 0", color: "var(--color-cyan)" }}>
          {currentStep.title}
        </h3>
        <p style={{ fontSize: "0.9rem", color: "#d1d5db", marginBottom: "1rem", lineHeight: "1.4" }}>
          {currentStep.text}
        </p>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
          <button 
            type="button" 
            style={{ 
              background: "none", 
              border: "none", 
              color: "#9ca3af", 
              cursor: "pointer", 
              fontSize: "0.8rem", 
              fontFamily: "var(--font-title)" 
            }}
            onClick={handleSkip}
          >
            Passer
          </button>
          
          <button 
            type="button" 
            className="btn-cartoon btn-cyan" 
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
            onClick={handleNext}
          >
            {step === steps.length - 1 ? "C'est parti ! 😈" : "Suivant"}
          </button>
        </div>
        
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "0.8rem" }}>
          {steps.map((_, idx) => (
            <div 
              key={idx} 
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: idx === step ? "var(--color-cyan)" : "#4b5563"
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
