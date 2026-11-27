(() => {
  'use strict';

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (t) => t * t * (3 - 2 * t);

/* ========================================================================
      1. HERO -> EXPERIENCE MORPH + ODHALOVÁNÍ SLOVO PO SLOVU (jen opacity)
      ======================================================================== */
  const heroExpSection = document.getElementById('heroExperience');
  const morphBox = document.getElementById('morphBox');
  const heroFrame = document.getElementById('heroFrame');
  const heroLayer = document.getElementById('heroLayer');
  const expLayer = document.getElementById('experienceLayer');
  const expChunks = [...document.querySelectorAll('.exp-chunk')];

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

  const CHUNK_RANGES = [
    [0.14, 0.38],
    [0.38, 0.64],
    [0.64, 0.83],
    [0.83, 0.96],
  ];

  function updateHeroExperience() {
    if (!heroExpSection || !morphBox) return;
    const rect = heroExpSection.getBoundingClientRect();
    const scrollable = heroExpSection.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return;

    const p = clamp01(-rect.top / scrollable);

    const morphT = smoothstep(clamp01(p / 0.14));
    const scale = lerp(1, 1.07, morphT);
    morphBox.style.transform = `scale(${scale.toFixed(4)})`;

    const heroOpacity = 1 - smoothstep(clamp01(p / 0.11));
    heroLayer.style.opacity = heroOpacity.toFixed(3);
    heroLayer.style.pointerEvents = heroOpacity > 0.1 ? 'auto' : 'none';
    heroFrame.style.opacity = heroOpacity.toFixed(3);

    const expVisible = smoothstep(clamp01((p - 0.11) / 0.05));
    expLayer.style.opacity = expVisible.toFixed(3);
    expLayer.setAttribute('aria-hidden', String(expVisible < 0.1));

    // Odhalování slov čistě přes opacity (bez vertikálního posunu)
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

    // Stmívání dokončených částí
    const c0Drop1 = smoothstep(clamp01((p - 0.38) / 0.08));
    const c0Drop2 = smoothstep(clamp01((p - 0.64) / 0.10));
    expChunks[0].style.opacity = lerp(lerp(1, 0.5, c0Drop1), 0.1, c0Drop2).toFixed(3);

    const c1Drop = smoothstep(clamp01((p - 0.64) / 0.08));
    expChunks[1].style.opacity = lerp(1, 0.5, c1Drop).toFixed(3);

    expChunks[2].style.opacity = '1';
    expChunks[3].style.opacity = '1';

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

  function updateHeader(heroProgress) {
    if (!header) return;
    // Hlavička se objeví, jakmile Hero přejde do Experience
    const showHeader = heroProgress > 0.13;
    header.classList.toggle('is-visible', showHeader);
    header.setAttribute('aria-hidden', String(!showHeader));

    const pivot = window.innerHeight * 0.35;
    let active = trackedSections[0];
    for (const sec of trackedSections) {
      if (sec.getBoundingClientRect().top <= pivot) active = sec;
    }

    if (active && headlineImg) {
      const nextSrc = active.dataset.headline;
      const nextAlt = active.dataset.headlineAlt || '';
      if (nextSrc && nextSrc !== currentHeadlineSrc) {
        currentHeadlineSrc = nextSrc;
        headlineImg.classList.add('is-swapping');
        window.setTimeout(() => {
          headlineImg.src = nextSrc;
          headlineImg.alt = nextAlt;
          headlineImg.classList.remove('is-swapping');
        }, 150);
      }
    }
  }

  /* ========================================================================
     4. INSIDE SHOWCASE (scroll + klik na tab)
     ======================================================================== */
  const insideSection = document.getElementById('inside');
  const insideImgs = [...document.querySelectorAll('[data-inside-img]')];
  const insideTabs = [...document.querySelectorAll('[data-inside-tab]')];
  const TOTAL_INSIDE = insideImgs.length;
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
    const progress = clamp01(-rect.top / scrollable);
    setInsideStep(Math.min(TOTAL_INSIDE - 1, Math.floor(progress * TOTAL_INSIDE)));
  }

  insideTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (!insideSection) return;
      const idx = Number(tab.dataset.insideTab);
      const sectionTop = insideSection.getBoundingClientRect().top + window.scrollY;
      const scrollable = insideSection.offsetHeight - window.innerHeight;
      const targetY = sectionTop + ((idx + 0.15) / TOTAL_INSIDE) * scrollable;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
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
      const heroP = updateHeroExperience() ?? 0;
      updateHeader(heroP);
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
