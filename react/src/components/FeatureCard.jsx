import React from 'react';

/**
 * Feature Card Component
 * Tech-styled card for displaying features with hover effects
 */
const FeatureCard = ({ icon, title, desc, className = "", badgeText = "AI_MODULE" }) => (
    <div className={`relative p-8 border border-blue-900/20 overflow-hidden group sharp-corners tech-card cursor-default ${className}`}>
        {/* Scan line effect */}
        <div className="scan-line"></div>

        {/* Corner Accents - visible on hover */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        {/* Header */}
        <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="text-gray-500 group-hover:text-blue-400 group-hover:scale-110 transition-all duration-300 transform origin-left">
                {React.cloneElement(icon, { size: 28 })}
            </div>
            {badgeText ? (
                <div className="text-[10px] font-mono-custom text-blue-500 uppercase tracking-widest border border-blue-500/30 px-2 py-0.5 sharp-corners transition-opacity">
                    {badgeText}
                </div>
            ) : null}
        </div>

        <h3 className="text-lg font-bold font-mono-custom mb-3 text-white uppercase group-hover:text-blue-100 transition-colors relative z-10">{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed font-light group-hover:text-gray-400 transition-colors relative z-10">{desc}</p>
    </div>
);

export default FeatureCard;
