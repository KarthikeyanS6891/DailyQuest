export type ThemePref = "light" | "dark" | "system";

export const THEME_COOKIE = "dq_theme";

export function isThemePref(v: unknown): v is ThemePref {
  return v === "light" || v === "dark" || v === "system";
}

// Inline script that runs synchronously in <head> BEFORE React hydrates.
// Reads the dq_theme cookie (or defaults to "system") and applies the
// .light or .dark class on <html> so the page renders with the right
// palette on the very first paint — no flash of the wrong theme.
export const NO_FOUC_SCRIPT = `(function(){try{
var c=document.cookie.split('; ').find(function(x){return x.indexOf('${THEME_COOKIE}=')===0});
var t=c?decodeURIComponent(c.split('=')[1]):'system';
var actual=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;
var r=document.documentElement;
r.classList.remove('light','dark');
r.classList.add(actual);
}catch(e){}})();`;
