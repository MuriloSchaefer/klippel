import { createContext, useContext } from "react";

export enum Theme {
  Dark = "Dark", // eslint-disable-line no-unused-vars
  Light = "Light", // eslint-disable-line no-unused-vars
}

export type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void; // eslint-disable-line no-unused-vars
};

export const ThemeContext = createContext<ThemeContextType>({
  theme: Theme.Dark,
  setTheme: (theme: Theme) => console.error("no theme provider", theme),
});
export const useTheme = () => useContext(ThemeContext);
