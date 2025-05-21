// Spur color mapping utility for Nav View and other trail UI elements

export const SPUR_COLORS = {
    "main": "#FFA500", // Orange (example main trail color)
    "green": "#00C853", // Green
    "blue": "#2979FF", // Blue
    "purple": "#9C27B0", // Purple
    // Add more as needed
};

export function getSpurColor(spurName) {
    // Normalize, default to main if not found
    if (!spurName) return SPUR_COLORS["main"];
    const key = spurName.toLowerCase();
    return SPUR_COLORS[key] || SPUR_COLORS["main"];
}