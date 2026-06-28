import { continueRender, delayRender, staticFile } from 'remotion';

let loaded = false;

export function loadFonts() {
  if (loaded) return;
  const handle = delayRender('Loading fonts');

  const geist = new FontFace('Geist', `url(${staticFile('fonts/GeistVF.woff2')})`, {
    weight: '100 900',
    style: 'normal',
  });
  const geistMono = new FontFace('Geist Mono', `url(${staticFile('fonts/GeistMonoVF.woff2')})`, {
    weight: '100 900',
    style: 'normal',
  });

  Promise.all([geist.load(), geistMono.load()])
    .then((faces) => {
      for (const f of faces) document.fonts.add(f);
      loaded = true;
      continueRender(handle);
    })
    .catch((err) => {
      console.error('Font loading failed:', err);
      continueRender(handle);
    });
}

export const FONT_SANS = "'Geist', sans-serif";
export const FONT_MONO = "'Geist Mono', monospace";
