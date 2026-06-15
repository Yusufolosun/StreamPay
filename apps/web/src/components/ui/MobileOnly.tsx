import React from "react";

export const MobileOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="block sm:hidden">{children}</div>;
};

export default MobileOnly;
