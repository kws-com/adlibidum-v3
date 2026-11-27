(() => {
  'use strict';

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (t) => t * t * (3 - 2 * t);

  /* ========================================================================
       1. OPENING STAGE: HERO -> EXPERIENCE -> IMAGINE -> FADE OUT
       ======================================================================== */
    const openingStage = document.getElementById('openingStage');
    const morphBoxBg = document.getElementById('morphBoxBg');
    const heroFrame = document.getElementById('heroFrame');
    const heroLayer = document.getElementById('heroLayer');
    const expLayer = document.getElementById('experienceLayer');
    const expChunks = [...document.querySelectorAll('.exp-chunk')];
    const imagineLayer = document.getElementById('imagineLayer');
    const imagineItems = [...document.querySelectorAll('[data-imagine-item]')];

    const chunkWords = expChunks.map((chunk) => {
      const words = chunk.textContent.trim().split(/\s+/);
      chunk.textContent = '';
      return words.map((word) => {
        const span = document.createElement('span');
        span.className = 'exp-word';
        span.textContent = word;
        chunk.appendChild(span);
        return span;
      });
    });

    // Časové rozsahy v rámci celé sekce #openingStage (0..1):
    // 0.00–0.08: Hero mizí, obdélník se zvětší (1.00 -> 1.08)
    // 0.09–0.47: Experience slovo po slovu + stmívání bloků
    // 0.48–0.55: Experience mizí, obdélník se podruhé zvětší (1.08 -> 1.18)
    // 0.55–0.89: Imagine (Scény -> Předehra -> Vášeň, stop na středu)
    // 0.89–1.00: Imagine mizí, obdélník se potřetí zvětší (1.18 -> 1.34) a zmizí (opacity -> 0)
    const CHUNK_RANGES = [
      [0.09, 0.21],
      [0.21, 0.34],
      [0.34, 0.42],
      [0.42, 0.47],
    ];

    function updateOpeningStage() {
      if (!openingStage || !morphBoxBg) return 0;
      const rect = openingStage.getBoundingClientRect();
      const scrollable = openingStage.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return 0;

      const p = clamp01(-rect.top / scrollable);

      // --- 3-fázový morph bílého obdélníku ---
      const grow1 = smoothstep(clamp01(p / 0.08));              // 1.00 -> 1.08
      const grow2 = smoothstep(clamp01((p - 0.48) / 0.07));     // 1.08 -> 1.18
      const exitT = smoothstep(clamp01((p - 0.89) / 0.11));     // 1.18 -> 1.34 & fade out

      const boxScale = 1 + grow1 * 0.10 + grow2 * 0.26 + exitT * 0.18;
      const boxOpacity = 1 - exitT;

      morphBoxBg.style.transform = `scale(${boxScale.toFixed(4)})`;
      morphBoxBg.style.opacity = boxOpacity.toFixed(3);

      // --- Fáze 1: Hero ---
      const heroOpacity = 1 - smoothstep(clamp01(p / 0.065));
      heroLayer.style.opacity = heroOpacity.toFixed(3);
      heroLayer.style.pointerEvents = heroOpacity > 0.1 ? 'auto' : 'none';
      heroFrame.style.opacity = heroOpacity.toFixed(3);

      // --- Fáze 2: Experience ---
      const expIn = smoothstep(clamp01((p - 0.065) / 0.03));
      const expOut = 1 - smoothstep(clamp01((p - 0.48) / 0.05));
      const expOpacity = expIn * expOut;
      expLayer.style.opacity = expOpacity.toFixed(3);
      expLayer.setAttribute('aria-hidden', String(expOpacity < 0.1));

      chunkWords.forEach((words, idx) => {
        const [start, end] = CHUNK_RANGES[idx];
        const localP = clamp01((p - start) / (end - start));
        const total = words.length;

        words.forEach((wordEl, wIdx) => {
          const wStart = wIdx / total;
          const wEnd = (wIdx + 1.35) / total;
          const wp = smoothstep(clamp01((localP - wStart) / (wEnd - wStart)));
          wordEl.style.opacity = wp.toFixed(3);
        });
      });

      const c0Drop1 = smoothstep(clamp01((p - 0.21) / 0.04));
      const c0Drop2 = smoothstep(clamp01((p - 0.34) / 0.05));
      expChunks[0].style.opacity = lerp(lerp(1, 0.5, c0Drop1), 0.1, c0Drop2).toFixed(3);

      const c1Drop = smoothstep(clamp01((p - 0.34) / 0.04));
      expChunks[1].style.opacity = lerp(1, 0.5, c1Drop).toFixed(3);

      expChunks[2].style.opacity = '1';
      expChunks[3].style.opacity = '1';

      // --- Fáze 3: Imagine (stejný stop-na-středu pattern) ---
      const imgIn = smoothstep(clamp01((p - 0.53) / 0.04));
      const imgOut = 1 - smoothstep(clamp01((p - 0.89) / 0.07));
      const imgLayerOpacity = imgIn * imgOut;
      imagineLayer.style.opacity = imgLayerOpacity.toFixed(3);
      imagineLayer.setAttribute('aria-hidden', String(imgLayerOpacity < 0.1));

      const imagineP = clamp01((p - 0.56) / 0.31);
      const floatIdx = imagineP * (imagineItems.length - 1);

      imagineItems.forEach((item, i) => {
        const d = i - floatIdx;
        const yVh = d > 0 ? d * 44 : 0;

        let opacity;
        if (d >= 0) {
          const t = clamp01(1 - d);
          opacity = lerp(0.2, 1, smoothstep(t));
          if (d > 1.2) opacity = Math.max(0, lerp(0.2, 0, (d - 1.2) / 0.45));
        } else {
          const t = clamp01(1 + d / 0.65);
          opacity = smoothstep(t);
        }

        item.style.transform = `translate3d(0, calc(-50% + ${yVh.toFixed(2)}vh), 0)`;
        item.style.opacity = opacity.toFixed(3);
      });

      return p;
    }

  /* ========================================================================
      2. JEDNOTNÝ EDITORIAL DECK (stop na středu, bez rollodexu, svižné tempo)
        Prvek přijíždí zespodu (20 % -> 100 %), na středu se zastaví a
        při příjezdu dalšího prvku jen plynule mizí do 0 %.
      ======================================================================== */
  const decks = [...document.querySelectorAll('[data-editorial-deck]')].map((section) => {
    const items = [...section.querySelectorAll('[data-deck-item]')];
    const isReviews = section.classList.contains('section-reviews');
    const stepVh = isReviews ? 75 : 65;
    const spreadVh = isReviews ? 58 : 44;

    section.style.height = `${items.length * stepVh + 25}svh`;
    return { section, items, spreadVh };
  });

  function updateEditorialDecks() {
    const isMobile = window.innerWidth <= 960;

    decks.forEach(({ section, items, spreadVh }) => {
      if (isMobile && section.classList.contains('section-reviews')) return;
      const count = items.length;
      if (count === 0) return;

      const rect = section.getBoundingClientRect();
      const scrollable = section.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const p = clamp01(-rect.top / scrollable);
      const floatIdx = p * (count - 1);

      items.forEach((item, i) => {
        const d = i - floatIdx; // >0 čeká dole, 0 aktivní střed, <0 odcházející

        // Zespodu jede nahoru na střed; jakmile dosáhne středu (d <= 0), zůstává stát (y = 0)
        const yVh = d > 0 ? d * spreadVh : 0;

        let opacity;
        if (d >= 0) {
          // Přicházející zespodu: 0.20 -> 1.00
          const t = clamp01(1 - d);
          opacity = lerp(0.2, 1, smoothstep(t));
          if (d > 1.2) opacity = Math.max(0, lerp(0.2, 0, (d - 1.2) / 0.45));
        } else {
          // Zůstává na středu a mizí s příjezdem dalšího prvku (do d = -0.65 je na 0)
          const t = clamp01(1 + d / 0.65);
          opacity = smoothstep(t);
        }

        item.style.transform = `translate3d(0, calc(-50% + ${yVh.toFixed(2)}vh), 0)`;
        item.style.opacity = opacity.toFixed(3);
        item.style.pointerEvents = Math.abs(d) < 0.35 ? 'auto' : 'none';
      });
    });
  }

  /* ========================================================================
       3. STICKY HEADER & PŘEPÍNÁNÍ SVG NADPISŮ
       ======================================================================== */
    const header = document.getElementById('siteHeader');
    const headlineImg = document.getElementById('headerHeadlineImg');
    const trackedSections = [...document.querySelectorAll('[data-headline]')];
    let currentHeadlineSrc = headlineImg?.getAttribute('src') || '';

    function setHeadline(src, alt) {
      if (!headlineImg || !src || src === currentHeadlineSrc) return;
      currentHeadlineSrc = src;
      headlineImg.classList.add('is-swapping');
      window.setTimeout(() => {
        headlineImg.src = src;
        headlineImg.alt = alt || '';
        headlineImg.classList.remove('is-swapping');
      }, 140);
    }

    function updateHeader(openingP) {
      if (!header) return;
      const showHeader = openingP > 0.07;
      header.classList.toggle('is-visible', showHeader);
      header.setAttribute('aria-hidden', String(!showHeader));

      // Zkontroluj, jestli už jsme v některé z dalších sekcí (INSIDE, REVIEWS, ABOUT, FAQ)
      const pivot = window.innerHeight * 0.35;
      let activeAfter = null;
      for (const sec of trackedSections) {
        if (sec.getBoundingClientRect().top <= pivot) activeAfter = sec;
      }

      if (activeAfter) {
        setHeadline(activeAfter.dataset.headline, activeAfter.dataset.headlineAlt);
      } else if (openingP >= 0.51) {
        setHeadline('./assets/headline-imagine.svg', 'IMAGINE');
      } else {
        setHeadline('./assets/headline-experience.svg', 'EXPERIENCE');
      }
    }

    /* ========================================================================
         4. INSIDE STAGE (showcase 4 taby -> posun doleva -> spawn solo krabice -> 3 odstavce)
         ======================================================================== */
      const insideSection = document.getElementById('inside');
      const insideShowcaseWrap = document.getElementById('insideShowcaseWrap');
      const insideShowcaseStage = document.getElementById('insideShowcaseStage');
      const insideTabsNav = document.getElementById('insideTabs');
      const insideImgs = [...document.querySelectorAll('[data-inside-img]')];
      const insideTabs = [...document.querySelectorAll('[data-inside-tab]')];
      const insideDetailWrap = document.getElementById('insideDetailWrap');
      const insideClosedBox = document.getElementById('insideClosedBox');
      const insideParagraphs = [...document.querySelectorAll('[data-inside-paragraph]')];

      const TOTAL_INSIDE = insideImgs.length;
      const SHOWCASE_END = 0.36;   // 0.00–0.36: 4 taby showcase
      const TRANSITION_END = 0.48; // 0.36–0.48: posun box-outside doleva + spawn box-closed
      const DETAIL_END = 0.82;     // 0.48–0.82: 3 odstavce + cenovka (0.82–1.00 drží na místě, než ji setřou Reviews)
      let activeInsideStep = 0;

      function setInsideStep(index) {
        const safe = Math.max(0, Math.min(TOTAL_INSIDE - 1, index));
        if (safe === activeInsideStep) return;
        activeInsideStep = safe;
        insideImgs.forEach((img, i) => img.classList.toggle('is-active', i === safe));
        insideTabs.forEach((tab, i) => tab.classList.toggle('is-active', i === safe));
      }

      function updateInsideShowcase() {
        if (!insideSection || TOTAL_INSIDE === 0) return;
        const rect = insideSection.getBoundingClientRect();
        const scrollable = insideSection.offsetHeight - window.innerHeight;
        if (scrollable <= 0) return;

        const p = clamp01(-rect.top / scrollable);
        const isMobile = window.innerWidth <= 960;

        // 1. Aktivní tab v rámci 0.00–0.46
        const showcaseP = clamp01(p / SHOWCASE_END);
        setInsideStep(Math.min(TOTAL_INSIDE - 1, Math.floor(showcaseP * TOTAL_INSIDE)));

        // 2. Přechod (0.46–0.60): box-outside jede doleva, taby mizí, nad ní se spawne solo krabice
        const transT = smoothstep(clamp01((p - SHOWCASE_END) / (TRANSITION_END - SHOWCASE_END)));

        const shiftX = isMobile ? 0 : lerp(0, -24, transT);
        const stageScale = lerp(1, 0.82, transT);
        const stageOpacity = 1 - smoothstep(clamp01((transT - 0.25) / 0.75));

        if (insideShowcaseStage) {
          insideShowcaseStage.style.transform = `translate3d(${shiftX.toFixed(2)}vw, 0, 0) scale(${stageScale.toFixed(4)})`;
          insideShowcaseStage.style.opacity = stageOpacity.toFixed(3);
        }

        if (insideTabsNav) {
          const tabsOpacity = 1 - smoothstep(clamp01(transT / 0.45));
          insideTabsNav.style.opacity = tabsOpacity.toFixed(3);
          insideShowcaseWrap.style.pointerEvents = tabsOpacity > 0.1 ? 'auto' : 'none';
        }

      // Spawn solo krabice přesně nad odjíždějící levou pozicí
      if (insideDetailWrap && insideClosedBox) {
        const detailOpacity = smoothstep(clamp01((transT - 0.15) / 0.75));
        insideDetailWrap.style.opacity = detailOpacity.toFixed(3);
        insideDetailWrap.style.pointerEvents = detailOpacity > 0.5 ? 'auto' : 'none';
        insideDetailWrap.setAttribute('aria-hidden', String(detailOpacity < 0.1));
        insideClosedBox.style.transform = `scale(${lerp(0.94, 1, detailOpacity).toFixed(4)})`;
      }

      // 3. Odstavce + cenovka vpravo (0.48–0.82), pak drží na místě
      const detailP = clamp01((p - TRANSITION_END) / (DETAIL_END - TRANSITION_END));
      const floatIdx = detailP * (insideParagraphs.length - 1);

      insideParagraphs.forEach((item, i) => {
        const d = i - floatIdx;
        const yVh = d > 0 ? d * 44 : 0;

        let opacity;
        if (d >= 0) {
          const t = clamp01(1 - d);
          opacity = lerp(0.2, 1, smoothstep(t));
          if (d > 1.2) opacity = Math.max(0, lerp(0.2, 0, (d - 1.2) / 0.45));
        } else {
          const t = clamp01(1 + d / 0.65);
          opacity = smoothstep(t);
        }

        item.style.transform = `translate3d(0, calc(-50% + ${yVh.toFixed(2)}vh), 0)`;
        item.style.opacity = opacity.toFixed(3);
        item.style.pointerEvents = Math.abs(d) < 0.35 ? 'auto' : 'none';
      });
      }

      // Přímý skok na tab bez probliknutí mezikroků
      insideTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          if (!insideSection) return;
          const idx = Number(tab.dataset.insideTab);
          const sectionTop = insideSection.getBoundingClientRect().top + window.scrollY;
          const scrollable = insideSection.offsetHeight - window.innerHeight;
          const targetY = sectionTop + (((idx + 0.5) / TOTAL_INSIDE) * SHOWCASE_END) * scrollable;

          setInsideStep(idx);
          window.scrollTo({ top: targetY, behavior: 'instant' });
        });
      });

  /* ========================================================================
       5. SCROLL LOOP
       ======================================================================== */
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const openingP = updateOpeningStage();
        updateHeader(openingP);
        updateEditorialDecks();
        updateInsideShowcase();
        ticking = false;
      });
    }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ========================================================================
     6. ASMR, FAQ, NEWSLETTER, OBJEDNÁVKOVÝ MODAL
     ======================================================================== */
  const asmrBtn = document.getElementById('asmrToggle');
  if (asmrBtn) {
    const audio = new Audio('./assets/adlibidum-asmr.mp3');
    audio.loop = true;
    asmrBtn.addEventListener('click', () => {
      if (audio.paused) {
        audio.play().then(() => {
          asmrBtn.classList.add('is-playing');
          asmrBtn.setAttribute('aria-pressed', 'true');
        }).catch(() => {});
      } else {
        audio.pause();
        asmrBtn.classList.remove('is-playing');
        asmrBtn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  const faqItems = [...document.querySelectorAll('.faq-item')];
  faqItems.forEach((item) => {
    const trigger = item.querySelector('.faq-item__trigger');
    trigger?.addEventListener('click', () => {
      const wasOpen = item.classList.contains('is-open');
      faqItems.forEach((other) => {
        other.classList.remove('is-open');
        other.querySelector('.faq-item__trigger')?.setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  const newsletterForm = document.getElementById('newsletterForm');
  const newsletterEmail = document.getElementById('newsletterEmail');
  const newsletterStatus = document.getElementById('newsletterStatus');
  newsletterForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!newsletterEmail.checkValidity()) {
      newsletterStatus.textContent = 'Zadejte prosím platný e-mail.';
      return;
    }
    newsletterStatus.textContent = 'Děkujeme, e-mail jsme přihlásili k odběru.';
    newsletterEmail.value = '';
  });

  const UNIT_PRICE = 1290;
  const orderModal = document.getElementById('orderModal');
  const orderForm = document.getElementById('orderForm');
  const orderSuccess = document.getElementById('orderSuccess');
  const orderError = document.getElementById('orderError');
  const qtyInput = document.getElementById('qtyInput');
  const shippingSelect = document.getElementById('shippingOption');
  const pickupPlaceholder = document.getElementById('pickupPlaceholder');
  const summaryShipping = document.getElementById('summaryShipping');
  const summaryTotal = document.getElementById('summaryTotal');
  const successAmount = document.getElementById('successAmount');

  function updateOrderTotals() {
    const qty = Math.max(1, Math.min(99, parseInt(qtyInput.value, 10) || 1));
    qtyInput.value = qty;
    const opt = shippingSelect.value;
    const ship = opt === 'PERSONAL_BRNO' ? 0 : opt.endsWith('_SK') ? 179 : 119;
    const total = qty * UNIT_PRICE + ship;
    summaryShipping.textContent = ship === 0 ? 'Zdarma' : `${ship} Kč`;
    summaryTotal.textContent = `${total.toLocaleString('cs-CZ')} Kč`;
    successAmount.textContent = `${total.toLocaleString('cs-CZ')} Kč`;
    pickupPlaceholder.hidden = !opt.startsWith('POINT_');
  }

  function openOrderModal() {
    orderForm.hidden = false;
    orderSuccess.hidden = true;
    orderError.textContent = '';
    updateOrderTotals();
    orderModal.hidden = false;
    orderModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeOrderModal() {
    orderModal.hidden = true;
    orderModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-open-order]').forEach((b) => b.addEventListener('click', openOrderModal));
  document.getElementById('orderModalClose')?.addEventListener('click', closeOrderModal);
  document.getElementById('orderSuccessClose')?.addEventListener('click', closeOrderModal);
  orderModal?.addEventListener('click', (e) => { if (e.target === orderModal) closeOrderModal(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !orderModal.hidden) closeOrderModal(); });

  document.getElementById('qtyMinus')?.addEventListener('click', () => {
    qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1);
    updateOrderTotals();
  });
  document.getElementById('qtyPlus')?.addEventListener('click', () => {
    qtyInput.value = Math.min(99, (parseInt(qtyInput.value, 10) || 1) + 1);
    updateOrderTotals();
  });
  qtyInput?.addEventListener('change', updateOrderTotals);
  shippingSelect?.addEventListener('change', updateOrderTotals);

  orderForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!orderForm.checkValidity()) {
      orderError.textContent = 'Vyplňte prosím všechna povinná pole a potvrďte souhlas.';
      orderForm.reportValidity();
      return;
    }
    orderForm.hidden = true;
    orderSuccess.hidden = false;
  });
})();
