import React, { createContext, useContext, useState, ReactNode } from "react";
import SpinnerLoader from "../ui/loader/SpinnerLoader";

interface SpinnerContextType {
  show: () => void;
  hide: () => void;
  visible: boolean;
}

const SpinnerContext = createContext<SpinnerContextType | undefined>(undefined);

export const SpinnerProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [visible, setVisible] = useState<boolean>(false);

  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  return (
    <SpinnerContext.Provider value={{ show, hide, visible }}>
      {children}
      {visible && <SpinnerLoader visible size={64} blurIntensity={12} />}
    </SpinnerContext.Provider>
  );
};

export const useSpinner = (): SpinnerContextType => {
  const context = useContext(SpinnerContext);
  if (!context) {
    throw new Error("useSpinner must be used within a SpinnerProvider");
  }
  return context;
};
