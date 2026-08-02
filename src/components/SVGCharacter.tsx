import { memo } from 'react';

export const SVGCharacter = memo(({ isTalking }: { isTalking: boolean }) => {
  return (
    <div className={`floating mb-6 relative ${isTalking ? 'glitch-effect' : ''}`}>
      <svg
        id="magic-book-svg"
        className={`w-48 h-48 transition-all duration-300 ${isTalking ? 'talking' : ''}`}
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="neon-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="neon-magenta" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Holographic Glow Base */}
        <circle cx="100" cy="100" r="80" fill="#00f0ff" opacity="0.1" filter="blur(15px)" />
        <circle cx="100" cy="100" r="40" fill="#ff0055" opacity="0.1" filter="blur(20px)" />

        {/* Data Rings */}
        <circle cx="100" cy="100" r="85" fill="none" stroke="#00f0ff" strokeWidth="1" strokeDasharray="4 8" opacity="0.4">
           {isTalking && <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="10s" repeatCount="indefinite" />}
        </circle>
        
        {/* Cyber Book Body - Cartoonish and Chubbier */}
        <path
          d="M 35 155 C 25 155, 35 45, 35 45 C 35 45, 100 25, 100 45 C 100 45, 100 155, 100 155 Z"
          fill="#05050a"
          stroke="#00f0ff"
          strokeWidth="3"
          filter="url(#neon-cyan)"
        >
          {isTalking && <animate attributeName="d" values="M 35 155 C 25 155, 35 45, 35 45 C 35 45, 100 25, 100 45 C 100 45, 100 155, 100 155 Z; M 30 150 C 20 150, 40 50, 40 50 C 40 50, 100 30, 100 50 C 100 50, 100 150, 100 150 Z; M 35 155 C 25 155, 35 45, 35 45 C 35 45, 100 25, 100 45 C 100 45, 100 155, 100 155 Z" dur="0.8s" repeatCount="indefinite" />}
        </path>
        <path
          d="M 165 155 C 175 155, 165 45, 165 45 C 165 45, 100 25, 100 45 C 100 45, 100 155, 100 155 Z"
          fill="#05050a"
          stroke="#00f0ff"
          strokeWidth="3"
          filter="url(#neon-cyan)"
        >
           {isTalking && <animate attributeName="d" values="M 165 155 C 175 155, 165 45, 165 45 C 165 45, 100 25, 100 45 C 100 45, 100 155, 100 155 Z; M 170 150 C 180 150, 160 50, 160 50 C 160 50, 100 30, 100 50 C 100 50, 100 150, 100 150 Z; M 165 155 C 175 155, 165 45, 165 45 C 165 45, 100 25, 100 45 C 100 45, 100 155, 100 155 Z" dur="0.8s" repeatCount="indefinite" />}
        </path>
        
        {/* Digital Pages */}
        <path
          d="M 42 148 L 42 52 C 60 40, 80 45, 95 48 L 95 148 Z"
          fill="none"
          stroke="#ff0055"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.8"
        />
        <path
          d="M 158 148 L 158 52 C 140 40, 120 45, 105 48 L 105 148 Z"
          fill="none"
          stroke="#ff0055"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.8"
        />

        {/* Cute antenna */}
        <path d="M 100 35 L 100 10" stroke="#00f0ff" strokeWidth="3" filter="url(#neon-cyan)" strokeLinecap="round">
           {isTalking && <animateTransform attributeName="transform" type="rotate" values="0 100 35; -15 100 35; 15 100 35; 0 100 35" dur="0.3s" repeatCount="indefinite" />}
        </path>
        <circle cx="100" cy="10" r="5" fill="#ff0055" filter="url(#neon-magenta)">
           {isTalking && <animate attributeName="r" values="5;9;5" dur="0.3s" repeatCount="indefinite" />}
           {isTalking && <animateTransform attributeName="transform" type="rotate" values="0 100 35; -15 100 35; 15 100 35; 0 100 35" dur="0.3s" repeatCount="indefinite" />}
        </circle>

        {/* Face / Display - Goofy Cartoon */}
        <g className="face-group">
          {/* Big Cartoon Eyes Background */}
          <circle cx="70" cy="80" r="16" fill="#fff" />
          <circle cx="130" cy="80" r="22" fill="#fff" />
          
          {/* Pupils */}
          <g className="cartoon-pupils">
            <circle cx="74" cy="83" r="8" fill="#00f0ff" filter="url(#neon-cyan)" />
            <circle cx="76" cy="81" r="3" fill="#fff" />
            
            <circle cx="126" cy="83" r="11" fill="#00f0ff" filter="url(#neon-cyan)" />
            <circle cx="129" cy="80" r="4" fill="#fff" />
            {isTalking && (
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; -4,-2; 4,2; 0,0"
                dur="0.4s"
                repeatCount="indefinite"
              />
            )}
          </g>
          
          {/* Goofy Mouth */}
          <path
            className="cartoon-mouth"
            d="M 75 115 Q 100 115 125 115"
            fill="none"
            stroke="#ff0055"
            strokeWidth="6"
            strokeLinecap="round"
            filter="url(#neon-magenta)"
          />
          
          {/* Silly teeth or tongue when talking */}
          {isTalking && (
            <path
              d="M 80 115 Q 100 150 120 115 Z"
              fill="#ff0055"
              opacity="0.9"
            >
              <animate attributeName="d" values="M 80 115 Q 100 150 120 115 Z; M 80 115 Q 100 120 120 115 Z; M 80 115 Q 100 150 120 115 Z" dur="0.2s" repeatCount="indefinite" />
            </path>
          )}

          {/* Goofy Eyebrows */}
          <path
            d="M 50 60 Q 65 50 80 65"
            fill="none"
            stroke="#00f0ff"
            strokeWidth="4"
            strokeLinecap="round"
            filter="url(#neon-cyan)"
          >
            {isTalking && <animate attributeName="d" values="M 50 60 Q 65 50 80 65; M 50 50 Q 65 40 80 55; M 50 60 Q 65 50 80 65" dur="0.4s" repeatCount="indefinite" />}
          </path>
          
          <path
            d="M 150 60 Q 135 35 115 65"
            fill="none"
            stroke="#00f0ff"
            strokeWidth="4"
            strokeLinecap="round"
            filter="url(#neon-cyan)"
          >
            {isTalking && <animate attributeName="d" values="M 150 60 Q 135 35 115 65; M 150 50 Q 135 25 115 55; M 150 60 Q 135 35 115 65" dur="0.5s" repeatCount="indefinite" />}
          </path>
        </g>
      </svg>
    </div>
  );
});
