"use client";

import React, { createContext, useContext, useRef, useState, ReactNode } from "react";

type IntroContextType = {
  logoRef: React.RefObject<HTMLElement | null>;
  introDone: boolean;
  setIntroDone: (done: boolean) => void;
};

const IntroContext = createContext<IntroContextType | null>(null);

export function IntroProvider({ children }: { children: ReactNode }) {
  const logoRef = useRef<HTMLElement | null>(null);
  const [introDone, setIntroDone] = useState(false);

  return (
    <IntroContext.Provider value={{ logoRef, introDone, setIntroDone }}>
      {children}
    </IntroContext.Provider>
  );
}

export const useIntro = () => {
  const context = useContext(IntroContext);
  if (!context) {
    throw new Error("useIntro must be used within an IntroProvider");
  }
  return context;
};
