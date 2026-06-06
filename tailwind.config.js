/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand primaries
        primary: '#F0B51D',
        'primary-dark': '#C79516',
        'primary-light': '#FBCF54',
        tertiary: '#F9FAB0',
        // Backgrounds
        bg: '#09111A',
        'bg-secondary': '#081018',
        // Cards / surfaces
        card: '#151E2F',
        'card-elevated': '#1C2540',
        'card-pressed': '#243150',
        // Inputs
        'input-bg': '#141E30',
        'input-bg-focused': '#1F2C45',
        // Borders
        border: '#1F2D47',
        'border-focused': '#2C3A56',
        divider: '#172238',
        // Text
        text: '#F5F7FA',
        'text-secondary': '#C5CAD7',
        'text-tertiary': '#8B93A8',
        'text-muted': '#3D4055',
        'text-on-primary': '#000000',
        // Semantic
        success: '#34C759',
        error: '#FF3B30',
        warning: '#FF9500',
        info: '#007AFF',
        // Macros
        'macro-protein': '#FF6B6B',
        'macro-carbs': '#51CF66',
        'macro-fat': '#FFD43B',
        // Meal types
        'meal-breakfast': '#FF9500',
        'meal-lunch': '#34C759',
        'meal-dinner': '#007AFF',
        'meal-snack': '#AF52DE',
        // Chat bubbles
        'chat-self': '#2A2520',
        'chat-other': '#1C2038',
        'read-receipt': '#53BDEB',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
      },
      minHeight: {
        '11': '2.75rem',
      },
    },
  },
  plugins: [],
}
