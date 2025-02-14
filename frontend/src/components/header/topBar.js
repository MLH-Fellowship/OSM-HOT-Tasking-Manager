import React from 'react';

export function TopBar({ pageName }: Object) {
  return (
    <div className="cf w-100 bg-grey-light">
      <div className="ph6-l">
        <h1 className="ttu f1 barlow-condensed white pv3 ph4 mt6 mb0 bg-primary dib">{pageName}</h1>
      </div>
    </div>
  );
}
