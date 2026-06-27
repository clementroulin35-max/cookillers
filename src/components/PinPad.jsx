import React from "react";

export default function PinPad({ value, onChange, maxLength = 4 }) {
  const handleKeyPress = (num) => {
    if (value.length < maxLength) {
      onChange(value + num);
    }
  };

  const handleBackspace = () => {
    if (value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div style={{ margin: "1.5rem 0" }}>
      {/* Indicateurs visuels (Dots) */}
      <div className="pin-dots">
        {Array.from({ length: maxLength }).map((_, idx) => (
          <div
            key={idx}
            className={`pin-dot ${idx < value.length ? "filled" : ""}`}
          />
        ))}
      </div>

      {/* Clavier numérique */}
      <div className="pin-pad-grid">
        {keys.map((key, idx) => {
          if (key === "") {
            return <div key={idx} aria-hidden="true" />;
          }
          const isBackspace = key === "⌫";
          return (
            <button
              key={idx}
              type="button"
              className="pin-key"
              onClick={isBackspace ? handleBackspace : () => handleKeyPress(key)}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
