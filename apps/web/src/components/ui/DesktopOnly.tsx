import React from "react";

export const DesktopOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="hidden lg:block">{children}</div>;
};

export default DesktopOnly;
