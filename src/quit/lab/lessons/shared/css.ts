/** Keyframes of the lessons copies (confetti fall, flame flicker). */
export const lsCss = `
@keyframes ls-fall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1 } 100% { transform: translateY(420px) rotate(540deg); opacity: 0 } }
@keyframes ls-flame { 0%,100% { transform: scale(1) rotate(-3deg) } 50% { transform: scale(1.12) rotate(3deg) } }
`
