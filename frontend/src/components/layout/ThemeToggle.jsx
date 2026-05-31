import { useState, useEffect } from 'react';
import { HiOutlineSun, HiOutlineMoon } from 'react-icons/hi';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    // Read theme from DOM (in case index.html script ran first) or localStorage
    return document.documentElement.getAttribute('data-theme') || 
           localStorage.getItem('sts-theme') || 
           'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('sts-theme', nextTheme);
  };

  return (
    <button 
      className="theme-toggle-switch" 
      onClick={toggleTheme}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      aria-label="Toggle theme"
    >
      <div className="theme-toggle-track">
        <HiOutlineSun className="track-icon-sun" />
        <HiOutlineMoon className="track-icon-moon" />
      </div>
      <div className="theme-toggle-thumb">
        {theme === 'light' ? (
          <HiOutlineSun key="sun" />
        ) : (
          <HiOutlineMoon key="moon" />
        )}
      </div>
    </button>
  );
}
