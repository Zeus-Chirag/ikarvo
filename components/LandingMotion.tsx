'use client';
import { useEffect } from 'react';
/**
 * Scroll-driven landing motion: Lenis smooth scroll + GSAP ScrollTrigger (both free, no account).
 * Loaded after first paint and only when the user has not asked for reduced motion, so LCP/TBT stay unaffected.
 * Elements keep their final, readable state in CSS; GSAP only animates *from* offsets.
 */
export default function LandingMotion() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let dead = false; let cleanup = () => {};
    const start = async () => {
      const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger'), import('lenis')]);
      if (dead) return; gsap.registerPlugin(ScrollTrigger); document.documentElement.classList.add('gsap-on');
      // Smooth wheel scrolling only for fine pointers; touch devices keep native momentum scrolling.
      const lenis = matchMedia('(pointer: fine)').matches ? new Lenis({ lerp: 0.11, wheelMultiplier: 1 }) : null; lenis?.on('scroll', ScrollTrigger.update);
      const tick = (t: number) => lenis?.raf(t * 1000); if (lenis) { gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0); }
      if (lenis) document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const el = document.querySelector(a.getAttribute('href')!); if (el) { e.preventDefault(); lenis.scrollTo(el as HTMLElement, { offset: -60 }); } }));
      const mm = gsap.matchMedia();
      const ctx = gsap.context(() => {
        // Hero: frame tilts up from perspective and scales as you scroll past it.
        gsap.fromTo('.hero-frame', { rotateX: 16, scale: 0.92, y: 40, transformPerspective: 1400, transformOrigin: '50% 0%' }, { rotateX: 0, scale: 1, y: 0, ease: 'none', scrollTrigger: { trigger: '.hero-frame', start: 'top 95%', end: 'top 25%', scrub: 0.6 } });
        gsap.to('.hero .display, .hero .lede, .hero-badge', { yPercent: -18, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
        // Marquee speed follows scroll velocity.
        const mq = document.querySelector<HTMLElement>('.marquee > div');
        if (mq) { const loop = gsap.to(mq, { xPercent: -50, ease: 'none', duration: 30, repeat: -1 }); ScrollTrigger.create({ onUpdate: s => { const v = Math.min(4, 1 + Math.abs(s.getVelocity()) / 600); gsap.to(loop, { timeScale: v, duration: 0.2, overwrite: true }); gsap.to(loop, { timeScale: 1, duration: 1, delay: 0.25 }); } }); mq.style.animation = 'none'; }
        // Steps: each headline reveals word by word; vignettes parallax against the copy.
        gsap.utils.toArray<HTMLElement>('.step').forEach(step => {
          const h = step.querySelector('h2'); if (h && !h.dataset.split) { h.dataset.split = '1'; h.setAttribute('aria-label', h.textContent ?? ''); h.innerHTML = (h.textContent ?? '').split(' ').map(w => `<span class="sw" aria-hidden="true"><span>${w}</span></span>`).join(' '); }
          const tl = gsap.timeline({ scrollTrigger: { trigger: step, start: 'top 78%', end: 'top 30%', scrub: 0.5 } });
          tl.from(step.querySelectorAll('.sw > span'), { yPercent: 110, stagger: 0.06, ease: 'power3.out' }, 0)
            .from(step.querySelector('.step-copy p'), { opacity: 0, y: 24 }, 0.15)
            .from(step.querySelector('.step-n'), { opacity: 0, x: -24 }, 0);
          gsap.fromTo(step.querySelector('.vig'), { y: 90, rotate: -2.5, scale: 0.94 }, { y: -30, rotate: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: step, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
        });
        // Features: staggered rise; icons spin in.
        gsap.from('.feat', { y: 48, opacity: 0, stagger: { each: 0.07, from: 'start' }, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.feat-grid', start: 'top 82%' } });
        gsap.from('.feat .ic', { rotate: -90, scale: 0.4, stagger: 0.07, duration: 0.7, ease: 'back.out(2)', scrollTrigger: { trigger: '.feat-grid', start: 'top 82%' } });
        gsap.from('.qcard', { y: 60, opacity: 0, rotate: (i: number) => (i - 1) * 3, stagger: 0.1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.quote-grid', start: 'top 85%' } });
        gsap.from('.plan', { y: 50, opacity: 0, stagger: 0.12, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.plans', start: 'top 85%' } });
        // CTA: big headline scales up with scroll.
        gsap.fromTo('.cta .display', { scale: 0.82, opacity: 0.3 }, { scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top 90%', end: 'top 40%', scrub: true } });
        mm.add('(min-width: 900px)', () => {
          // Desktop only: pin the "honest" section and slide its two columns together.
          gsap.from('.honest-grid > div:first-child', { xPercent: -14, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.honest', start: 'top 80%', end: 'top 35%', scrub: true } });
          gsap.from('.honest-grid > div:last-child', { xPercent: 14, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.honest', start: 'top 80%', end: 'top 35%', scrub: true } });
        });
      });
      const bar = document.createElement('div'); bar.className = 'scroll-progress'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar);
      gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
      cleanup = () => { ctx.revert(); mm.revert(); gsap.ticker.remove(tick); lenis?.destroy(); bar.remove(); document.documentElement.classList.remove('gsap-on'); };
    };
    // Load on first intent (scroll, wheel, touch, pointer, key) or 4 s after load, whichever comes first, so the
    // ~45 kB of motion JS never competes with first paint. Above-the-fold content is fully styled without it.
    let started = false; const EV = ['scroll', 'wheel', 'touchstart', 'pointermove', 'keydown'] as const;
    const go = () => { if (started) return; started = true; EV.forEach(e => removeEventListener(e, go)); start(); };
    EV.forEach(e => addEventListener(e, go, { passive: true, once: true }));
    const t = window.setTimeout(go, 4000);
    return () => { dead = true; clearTimeout(t); EV.forEach(e => removeEventListener(e, go)); cleanup(); };
  }, []);
  return null;
}
