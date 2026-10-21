import React from 'react';

const PageHeader = ({ icon: Icon, subtitle, title, highlight }) => {
    return (
        <div className="flex flex-col mb-8">
            <div>
                <div className="flex items-center gap-2 mb-2 text-blue-500">
                    {Icon && <Icon size={16} />}
                    <span className="text-xs font-mono-custom uppercase tracking-wider">{subtitle}</span>
                </div>
                <h1 className="text-4xl font-light text-white tracking-widest uppercase mb-2">
                    {title} <span className="text-blue-500 font-medium">{highlight}</span>
                </h1>
            </div>
        </div>
    );
};

export default PageHeader;
