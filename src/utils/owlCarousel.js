// Lightweight vanilla JS controller for .owl-carousel structures.
// Usage: import { initAllCarousels } from '../utils/owlCarousel'
// const stop = initAllCarousels(); // returns a cleanup function

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function getItemWidths(items){
  return Array.from(items).map(it => {
    const rect = it.getBoundingClientRect();
    const style = window.getComputedStyle(it);
    const mr = parseFloat(style.marginRight) || 0;
    return Math.round(rect.width + mr);
  });
}

function cumulativeWidths(widths){
  const arr = [0];
  for(let i=0;i<widths.length;i++) arr.push(arr[i] + widths[i]);
  return arr; 
}

export function initAllCarousels(selector = '.owl-carousel'){
  const carousels = Array.from(document.querySelectorAll(selector));
  const cleaners = carousels.map(initCarousel);
  return ()=>{ cleaners.forEach(c=>c && c()); };
}

function initCarousel(carousel){
  try{
    const stage = carousel.querySelector('.owl-stage');
    const stageOuter = carousel.querySelector('.owl-stage-outer') || carousel;
    let items = Array.from(carousel.querySelectorAll('.owl-item'));
    if(!stage || items.length === 0) {
      items = Array.from(carousel.children).filter(c=>c.classList && !c.classList.contains('owl-nav') && !c.classList.contains('owl-dots'));
    }

   
    const prevBtn = carousel.querySelector('.owl-prev');
    const nextBtn = carousel.querySelector('.owl-next');
    const dotsContainer = carousel.querySelector('.owl-dots');

    // compute widths and offsets
    let widths = getItemWidths(items);
    let offsets = cumulativeWidths(widths);
    let viewportW = stageOuter.getBoundingClientRect().width;
  let visibleCount = Math.max(1, Math.floor(viewportW / (widths[0] || viewportW)));
  let stepSize = parseInt(carousel.dataset.stepSize, 10) || Math.max(1, visibleCount);
    let maxIndex = Math.max(0, items.length - visibleCount);
    let currentIndex = 0;

    // helper to update button states and active classes
    function updateUI(){
      if(prevBtn) prevBtn.classList.toggle('disabled', currentIndex <= 0);
      if(nextBtn) nextBtn.classList.toggle('disabled', currentIndex >= maxIndex);
      // items active
      items.forEach((it, idx)=> it.classList.toggle('active', idx>=currentIndex && idx<currentIndex+visibleCount));
      // dots
      if(dotsContainer){
        const dots = Array.from(dotsContainer.querySelectorAll('.owl-dot'));
        dots.forEach((d, i)=> d.classList.toggle('active', i === currentIndex));
      }
    }

    // perform transition to index (uses transform on stage if available else scroll)
    function goto(index, smooth=true){
      index = clamp(index, 0, maxIndex);
      currentIndex = index;
      const x = offsets[index] || 0;
      if(stage){
        if(smooth) stage.style.transition = 'transform 0.45s ease';
        stage.style.transform = `translate3d(-${x}px, 0px, 0px)`;
      } else {
        // fallback to horizontal scroll
        if(smooth) stageOuter.style.scrollBehavior = 'smooth';
        stageOuter.scrollLeft = x;
        if(smooth) setTimeout(()=> stageOuter.style.scrollBehavior = '', 500);
      }
      updateUI();
    }

  function next(){ goto(currentIndex + stepSize); }
  function prev(){ goto(currentIndex - stepSize); }

    // interaction pause delay
    const pauseAfterInteractionMs = 1800;

    // wire controls with pause-on-interaction
    function onPrevClick(e){ pauseAutoplay(pauseAfterInteractionMs); prev(); }
    function onNextClick(e){ pauseAutoplay(pauseAfterInteractionMs); next(); }
    if(prevBtn) prevBtn.addEventListener('click', onPrevClick);
    if(nextBtn) nextBtn.addEventListener('click', onNextClick);

    // wire dots (if present) - assume React/HTML already rendered the correct dot count
    if(dotsContainer){
      const dots = Array.from(dotsContainer.querySelectorAll('.owl-dot'));
      dots.forEach((d, idx)=>{
        d.addEventListener('click', ()=> { pauseAutoplay(pauseAfterInteractionMs); goto(idx); });
      });
    }

    // wheel + pointer drag for stageOuter
    let isDown=false, startX=0, startScroll=0;
    function onPointerDown(e){ isDown=true; startX = e.clientX; startScroll = stageOuter.scrollLeft; stageOuter.classList.add('dragging'); }
    function onPointerMove(e){ if(!isDown) return; const dx = startX - e.clientX; stageOuter.scrollLeft = startScroll + dx; }
    function onPointerUp(e){ if(!isDown) return; isDown=false; stageOuter.classList.remove('dragging');
      // snap to nearest
      const pos = stageOuter.scrollLeft; let idx = offsets.findIndex((v,i)=> pos < offsets[i+1]); if(idx === -1) idx = offsets.length-1; goto(idx, true);
    }
    stageOuter.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    // remove wheel-based scroll: we don't want vertical-to-horizontal wheel hijacking

  // autoplay modes:
  // - continuous pixel-based ping-pong using requestAnimationFrame (default)
  // - step mode (advance by item index each interval) when the carousel has class `slide-home`
  //   or data-autoplay-mode="step" or is inside a `.box-scroll` container.
  const isStepMode = carousel.classList.contains('slide-home') || carousel.dataset.autoplayMode === 'step' || (carousel.closest && carousel.closest('.box-scroll') !== null);

  // autoplay: smooth ping-pong animation using requestAnimationFrame (continuous)
    let rafId = null;
    let autoPaused = false; // temporarily paused by user interaction
    let autoPauseTimer = null;
    let direction = 1; // 1 => forward, -1 => backward
    let lastTime = null;
  // named mouse handlers (assigned if autoplay enabled) so cleanup can remove them
  let onMouseEnter = null;
  let onMouseLeave = null;

    function getCurrentX(){
      if(stage){
        const st = stage.style.transform || '';
        const m = st.match(/translate3d\(-(\d+(?:\.\d+)?)px,/);
        if(m) return parseFloat(m[1]);
        return 0;
      } else {
        return Math.round(stageOuter.scrollLeft || 0);
      }
    }

    function applyX(x){
      x = Math.max(0, Math.min(x, Math.max(0, offsets[offsets.length-1] - viewportW)));
      if(stage){
        stage.style.transition = 'transform 0.08s linear';
        stage.style.transform = `translate3d(-${x}px, 0px, 0px)`;
      } else {
        stageOuter.scrollLeft = x;
      }
      // update approximate currentIndex for UI state
      const idx = offsets.findIndex((v,i)=> x < offsets[i+1]);
      currentIndex = idx === -1 ? offsets.length-1 : idx;
      updateUI();
    }

    // continuous mode (pixel-based) using RAF
    function autoStep(ts){
      if(autoPaused) { lastTime = ts; rafId = requestAnimationFrame(autoStep); return; }
      if(lastTime === null) lastTime = ts;
      const dt = (ts - lastTime) / 1000; // seconds
      lastTime = ts;
      const speed = parseFloat(carousel.dataset.autoplaySpeed) || 40; // px per second
      let x = getCurrentX();
      x += speed * dt * direction;
      const maxX = Math.max(0, offsets[offsets.length-1] - viewportW);
      if(x <= 0){ x = 0; direction = 1; }
      else if(x >= maxX){ x = maxX; direction = -1; }
      applyX(x);
      rafId = requestAnimationFrame(autoStep);
    }

    function startAutoplay(){ if(rafId) return; lastTime = null; rafId = requestAnimationFrame(autoStep); }
    function stopAutoplay(){ if(rafId){ cancelAnimationFrame(rafId); rafId = null; lastTime = null; } }

    // step-mode: advance by index (next/prev) at fixed intervals (ping-pong)
    let stepId = null;
    let directionStep = 1; // 1 forward, -1 backward
    function startStepAutoplay(){ if(stepId) return; const interval = parseInt(carousel.dataset.autoplayInterval,10) || 2000; stepId = setInterval(()=>{
        if(autoPaused) return;
        if(directionStep === 1){
          if(currentIndex >= maxIndex){ directionStep = -1; prev(); }
          else next();
        } else {
          if(currentIndex <= 0){ directionStep = 1; next(); }
          else prev();
        }
      }, interval); }
    function stopStepAutoplay(){ if(stepId){ clearInterval(stepId); stepId = null; } }

    function pauseAutoplay(ms = 2000){
      autoPaused = true; if(autoPauseTimer) clearTimeout(autoPauseTimer);
      // if step mode, stop timer now and restart after ms
      if(isStepMode){ stopStepAutoplay(); autoPauseTimer = setTimeout(()=>{ autoPaused = false; autoPauseTimer = null; startStepAutoplay(); }, ms); }
      else { autoPauseTimer = setTimeout(()=>{ autoPaused = false; autoPauseTimer = null; }, ms); }
    }

  if(carousel.dataset.autoplay !== undefined || carousel.classList.contains('autoplay') || isStepMode){
      // pause on hover/interaction (named handlers so we can remove them on cleanup)
      onMouseEnter = function(){ autoPaused = true; };
      onMouseLeave = function(){ autoPaused = false; };
      carousel.addEventListener('mouseenter', onMouseEnter);
      carousel.addEventListener('mouseleave', onMouseLeave);
      // start mode-appropriate autoplay
      if(isStepMode) startStepAutoplay(); else startAutoplay();
    }

    // resize handling
    let resizeTimer = null;
    function onResize(){ clearTimeout(resizeTimer); resizeTimer = setTimeout(()=>{
      widths = getItemWidths(items);
      offsets = cumulativeWidths(widths);
      viewportW = stageOuter.getBoundingClientRect().width;
  visibleCount = Math.max(1, Math.floor(viewportW / (widths[0]||viewportW)));
  stepSize = parseInt(carousel.dataset.stepSize, 10) || Math.max(1, visibleCount);
      maxIndex = Math.max(0, items.length - visibleCount);
      goto(clamp(currentIndex, 0, maxIndex), false);
    },120); }
    window.addEventListener('resize', onResize);

    // initial sync
    goto(0, false);

    // cleanup
    return ()=>{
      if(prevBtn) prevBtn.removeEventListener('click', onPrevClick);
      if(nextBtn) nextBtn.removeEventListener('click', onNextClick);
      if(dotsContainer){ Array.from(dotsContainer.querySelectorAll('.owl-dot')).forEach(d=>d.replaceWith(d.cloneNode(true))); }
      stageOuter.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if(onMouseEnter) carousel.removeEventListener('mouseenter', onMouseEnter);
      if(onMouseLeave) carousel.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('resize', onResize);
      if(autoPauseTimer) { clearTimeout(autoPauseTimer); autoPauseTimer = null; }
      stopAutoplay();
      stopStepAutoplay();
    }
  }catch(err){
    // if something goes wrong, no-op
    console.error('initCarousel error', err);
    return ()=>{};
  }
}

export default initAllCarousels;
