(() => {
  'use strict';

  /* ========================================================================
     1. STICKY HEADER & PŘEPÍNÁNÍ SVG NADPISŮ PODLE SEKCE
     ======================================================================== */
  const header = document.getElementById('siteHeader');
  const headlineImg = document.getElementById('headerHeadlineImg');
  const heroSection = document.getElementById('hero');
  const trackedSections = [...document.querySelectorAll('[data-headline]')];

  let currentHeadlineSrc = headlineImg?.getAttribute('src') || '';

  function updateHeader() {
    if (!heroSection || !header) return;
    const heroRect = heroSection.getBoundingClientRect();
    const showHeader = heroRect.bottom < window.innerHeight * 0.45;
    header.classList.toggle('is-visible', showHeader);
    header.setAttribute('aria-hidden', String(!showHeader));

    // Najdi sekci, která je aktuálně v horní polovině viewportu
    const pivot = window.innerHeight * 0.35;
    let active = trackedSections[0];
    for (const sec of trackedSections) {
      const rect = sec.getBoundingClientRect();
      if (rect.top <= pivot) active = sec;
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
        }, 160);
      }
    }
  }

  /* ========================================================================
     2. PLYNULÉ MASKOVÁNÍ / ZESVĚTLOVÁNÍ HORNÍCH TEXTŮ PŘI SCROLLU
        Horní odscrollované bloky se plynule zesvětlují do ztracena,
        spodní aktivní část zůstává v plném kontrastu (#07042a).
     ======================================================================== */
  const fadeBlocks = [...document.querySelectorAll('[data-scroll-fade]')];
  const fadePhrases = [...document.querySelectorAll('[data-scroll-fade-lines] .fade-phrase')];

  function calcTopFadeOpacity(rect, vh) {
    // Plná viditelnost od 52 % výšky viewportu dolů; směrem k hornímu okraji slábne k 0.12
    const centerY = rect.top + rect.height * 0.5;
    const fullAt = vh * 0.58;
    const fadedAt = vh * 0.14;
    if (centerY >= fullAt) return 1;
    if (centerY <= fadedAt) return 0.12;
    const t = (centerY - fadedAt) / (fullAt - fadedAt);
    return 0.12 + t * 0.88;
  }

  function updateScrollFades() {
    const vh = window.innerHeight;

    for (const el of fadeBlocks) {
      const opacity = calcTopFadeOpacity(el.getBoundingClientRect(), vh);
      el.style.opacity = opacity.toFixed(3);
    }

    // Pro Experience (adli 2) zesvětlujeme plynule jednotlivé věty podle pozice celé karty
    const expCard = document.querySelector('[data-scroll-fade-lines]');
    if (expCard && fadePhrases.length) {
      const rect = expCard.getBoundingClientRect();
      // Progress 0 (karta vchází) -> 1 (karta odjíždí nahoru)
      const progress = Math.max(0, Math.min(1, (vh * 0.75 - rect.top) / (vh * 0.75)));
      const total = fadePhrases.length;

      fadePhrases.forEach((phrase, idx) => {
        // Poslední 2 věty ("Jak daleko? To už je na vás.") zůstávají nejvýraznější
        const weight = idx / (total - 1);
        const fadeStrength = Math.max(0, (1 - weight) * progress);
        const opacity = Math.max(0.12, 1 - fadeStrength * 0.95);
        phrase.style.opacity = opacity.toFixed(3);
      });
    }
  }

  /* ========================================================================
     3. INSIDE SHOWCASE (adli 4) — PŘEPÍNÁNÍ SCROLLEM I KLIKEM NA TAB
     ======================================================================== */
  const insideSection = document.getElementById('inside');
  const insideImgs = [...document.querySelectorAll('[data-inside-img]')];
  const insideTabs = [...document.querySelectorAll('[data-inside-tab]')];
  const TOTAL_STEPS = insideImgs.length;
  let activeInsideStep = 0;

  function setInsideStep(index) {
    const safeIndex = Math.max(0, Math.min(TOTAL_STEPS - 1, index));
    if (safeIndex === activeInsideStep) return;
    activeInsideStep = safeIndex;

    insideImgs.forEach((img, i) => img.classList.toggle('is-active', i === safeIndex));
    insideTabs.forEach((tab, i) => tab.classList.toggle('is-active', i === safeIndex));
  }

  function updateInsideShowcase() {
    if (!insideSection || TOTAL_STEPS === 0) return;
    const rect = insideSection.getBoundingClientRect();
    const scrollable = insideSection.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return;

    const progress = Math.max(0, Math.min(0.9999, -rect.top / scrollable));
    const step = Math.floor(progress * TOTAL_STEPS);
    setInsideStep(step);
  }

  // Klik na tab posune scroll na přesnou pozici daného kroku
  insideTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (!insideSection) return;
      const idx = Number(tab.dataset.insideTab);
      const sectionTop = insideSection.getBoundingClientRect().top + window.scrollY;
      const scrollable = insideSection.offsetHeight - window.innerHeight;
      const targetY = sectionTop + ((idx + 0.15) / TOTAL_STEPS) * scrollable;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    });
  });

  /* ========================================================================
     4. SCROLL LOOP (requestAnimationFrame)
     ======================================================================== */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      updateHeader();
      updateScrollFades();
      updateInsideShowcase();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ========================================================================
     5. ASMR PŘEHRÁVAČ (připravený v levém rohu)
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
          asmrBtn.setAttribute('aria-label', 'Zastavit ASMR');
        }).catch(() => {});
      } else {
        audio.pause();
        asmrBtn.classList.remove('is-playing');
        asmrBtn.setAttribute('aria-pressed', 'false');
        asmrBtn.setAttribute('aria-label', 'Přehrát ASMR');
      }
    });
  }

  /* ========================================================================
     6. FAQ AKORDEON
     ======================================================================== */
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

  /* ========================================================================
     7. NEWSLETTER
     ======================================================================== */
  const newsletterForm = document.getElementById('newsletterForm');
  const newsletterEmail = document.getElementById('newsletterEmail');
  const newsletterStatus = document.getElementById('newsletterStatus');

  newsletterForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!newsletterEmail.checkValidity()) {
      newsletterStatus.textContent = 'Zadejte prosím platný e-mail.';
      return;
    }
    // Zde napojíš své stávající submitNewsletter() API
    newsletterStatus.textContent = 'Děkujeme, e-mail jsme přihlásili k odběru.';
    newsletterEmail.value = '';
  });

  /* ========================================================================
     8. OBJEDNÁVKOVÝ MODAL
     ======================================================================== */
  const UNIT_PRICE = 1290;
  const orderModal = document.getElementById('orderModal');
  const orderForm = document.getElementById('orderForm');
  const orderSuccess = document.getElementById('orderSuccess');
  const orderError = document.getElementById('orderError');
  const qtyInput = document.getElementById('qtyInput');
  const qtyMinus = document.getElementById('qtyMinus');
  const qtyPlus = document.getElementById('qtyPlus');
  const shippingSelect = document.getElementById('shippingOption');
  const pickupPlaceholder = document.getElementById('pickupPlaceholder');
  const summaryShipping = document.getElementById('summaryShipping');
  const summaryTotal = document.getElementById('summaryTotal');
  const successAmount = document.getElementById('successAmount');

  function getShippingPrice(option) {
    if (option === 'PERSONAL_BRNO') return 0;
    return option.endsWith('_SK') ? 179 : 119;
  }

  function updateOrderTotals() {
    const qty = Math.max(1, Math.min(99, parseInt(qtyInput.value, 10) || 1));
    qtyInput.value = qty;
    const ship = getShippingPrice(shippingSelect.value);
    const total = qty * UNIT_PRICE + ship;

    summaryShipping.textContent = ship === 0 ? 'Zdarma' : `${ship} Kč`;
    summaryTotal.textContent = `${total.toLocaleString('cs-CZ')} Kč`;
    successAmount.textContent = `${total.toLocaleString('cs-CZ')} Kč`;
    pickupPlaceholder.hidden = !shippingSelect.value.startsWith('POINT_');
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

  document.querySelectorAll('[data-open-order]').forEach((btn) => {
    btn.addEventListener('click', openOrderModal);
  });

  document.getElementById('orderModalClose')?.addEventListener('click', closeOrderModal);
  document.getElementById('orderSuccessClose')?.addEventListener('click', closeOrderModal);

  orderModal?.addEventListener('click', (e) => {
    if (e.target === orderModal) closeOrderModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !orderModal.hidden) closeOrderModal();
  });

  qtyMinus?.addEventListener('click', () => {
    qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1);
    updateOrderTotals();
  });

  qtyPlus?.addEventListener('click', () => {
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
    // Zde napojíš své stávající submitOrder() API
    orderForm.hidden = true;
    orderSuccess.hidden = false;
  });
})();
