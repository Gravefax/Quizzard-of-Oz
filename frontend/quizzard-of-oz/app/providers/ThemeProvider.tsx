'use client';

import { useEffect } from 'react';
import useThemeStore from '@/app/stores/themeStore';

export default function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  return <>{children}</>;
}
