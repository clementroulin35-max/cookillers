export const vibrateLight = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(40); } catch (e) {}
  }
};

export const vibrateMedium = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(80); } catch (e) {}
  }
};

export const vibrateSuccess = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate([60, 40, 60]); } catch (e) {}
  }
};

export const vibrateFailure = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate([200, 100, 200]); } catch (e) {}
  }
};

export const vibrateDeath = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate([500, 200, 500, 200, 800]); } catch (e) {}
  }
};
