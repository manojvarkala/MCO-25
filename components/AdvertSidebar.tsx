import React, { FC, useEffect } from 'react';

declare global {
    interface Window {
         adsbygoogle: any;
    }
}

const AdvertSidebar: FC = () => {

  useEffect(() => {
    // This effect will run after the component mounts.
    // The main adsbygoogle.js script is loaded in index.html,
    // so here we just need to push the ad request.
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("Failed to push AdSense ad:", err);
    }
  }, []);

  return (
    <div className="bg-[rgb(var(--color-card-rgb))] p-4 rounded-xl shadow-md border border-[rgb(var(--color-border-rgb))]">
      <h3 className="text-xs font-bold text-[rgb(var(--color-text-muted-rgb))] mb-2 uppercase tracking-wider text-center">
        Advertisement
      </h3>
      <div className="rounded-lg overflow-hidden min-h-[250px] flex items-center justify-center">
        {/* AdSense ad unit */}
        <ins 
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-0776870820469795"
          data-ad-slot="8746661230"
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      </div>
    </div>
  );
};

export default AdvertSidebar;