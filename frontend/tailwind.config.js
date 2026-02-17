/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    corePlugins: {
        preflight: false, // Disable preflight to avoid conflict with existing CSS
    },
    theme: {
        extend: {
            colors: {
                neonCyan: '#00FFD9',
                neonMagenta: '#FF00FF',
                cyberBlack: '#040404',
                glass: 'rgba(255, 255, 255, 0.05)',
            },
            fontFamily: {
                cinematic: ['"Outfit"', 'sans-serif'], // We might need to import this font
            },
            backgroundImage: {
                'cyber-gradient': 'linear-gradient(to bottom, #040404, #121212)',
            }
        },
    },
    plugins: [],
}
