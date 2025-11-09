import React, { FC } from 'react';

const AdvertSidebar: FC = () => {
  // --- ADVERT CODE ---
  // Replace the content of this constant with your advert code snippet
  // (e.g., Google AdSense script or an image link).
  const advertCode = (
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0776870820469795"
     crossorigin="anonymous"></script>
<!-- exam portal -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-0776870820469795"
     data-ad-slot="8746661230"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>
  );

  return (
    <div className="bg-[rgb(var(--color-card-rgb))] p-4 rounded-xl shadow-md border border-[rgb(var(--color-border-rgb))]">
      <h3 className="text-xs font-bold text-[rgb(var(--color-text-muted-rgb))] mb-2 uppercase tracking-wider text-center">
        Advertisement
      </h3>
      <div className="rounded-lg overflow-hidden">
        {advertCode}
      </div>
    </div>
  );
};

export default AdvertSidebar;
