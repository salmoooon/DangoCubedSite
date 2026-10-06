// Language Toggle
const translations = window.translationChunks || {};
const supportedLanguages = ["en", "tw"];
const languageTags = { en: "en", tw: "zh-Hant-TW" };
const languageStorageKey = "language";

function getStoredLanguage() {
  try {
    const savedLanguage = localStorage.getItem(languageStorageKey);
    return supportedLanguages.includes(savedLanguage) ? savedLanguage : "en";
  } catch {
    return "en";
  }
}

let currentLanguage = getStoredLanguage();

function t(key) {
  const currentTranslations = translations[currentLanguage] || {};
  const englishTranslations = translations.en || {};
  return currentTranslations[key] || englishTranslations[key] || key;
}

function renderTranslatedText(element, text) {
  let content = Array.from(element.children).find(child => child.hasAttribute("data-i18n-content"));
  if (!content) {
    content = document.createElement("span");
    content.setAttribute("data-i18n-content", "");
    const firstTextNode = Array.from(element.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
    if (firstTextNode) {
      firstTextNode.replaceWith(content);
    } else {
      element.prepend(content);
    }
  }

  const fragment = document.createDocumentFragment();
  text.split(/<br\s*\/?\s*>/i).forEach((part, index) => {
    if (index > 0) fragment.appendChild(document.createElement("br"));
    fragment.appendChild(document.createTextNode(part));
  });
  content.replaceChildren(fragment);
}

function applyTranslations() {
  const translatableAttributes = [
    ["data-i18n-placeholder", "placeholder"],
    ["data-i18n-title", "title"],
    ["data-i18n-aria-label", "aria-label"],
    ["data-i18n-alt", "alt"]
  ];
  const selector = ["data-i18n", ...translatableAttributes.map(([dataAttribute]) => dataAttribute)]
    .map(attribute => `[${attribute}]`)
    .join(", ");

  document.querySelectorAll(selector).forEach(element => {
    const textKey = element.getAttribute("data-i18n");
    if (textKey) renderTranslatedText(element, t(textKey));

    translatableAttributes.forEach(([dataAttribute, attribute]) => {
      const key = element.getAttribute(dataAttribute);
      if (key) element.setAttribute(attribute, t(key));
    });
  });
}

function setLanguage(language, saveSelection = false) {
  currentLanguage = supportedLanguages.includes(language) ? language : "en";
  document.documentElement.lang = languageTags[currentLanguage];
  applyTranslations();

  if (saveSelection) {
    try {
      localStorage.setItem(languageStorageKey, currentLanguage);
    } catch {}
  }
}

const languageCheckbox = document.querySelector("#language-checkbox");
const languageToggleIcon = document.querySelector(".language-toggle-icon");

languageToggleIcon?.classList.add("no-transition");
if (languageCheckbox) languageCheckbox.checked = currentLanguage === "tw";
setLanguage(currentLanguage);
if (languageToggleIcon) {
  requestAnimationFrame(() => languageToggleIcon.classList.remove("no-transition"));
}

languageCheckbox?.addEventListener("change", () => {
  setLanguage(languageCheckbox.checked ? "tw" : "en", true);
});

// Loop gallery
function initLoopGallery(gallery) {
  const loopImageSlots = Array.from(gallery.querySelectorAll(".loop-image"));
  const loopPrev = gallery.querySelector(".loop-arrow-left");
  const loopNext = gallery.querySelector(".loop-arrow-right");
  let loopImages = [];
  let loopIndex = 0;
  let loopTimer = null;
  let activeSlotIndex = 0;
  let isTransitioning = false;
  let transitionSafetyTimer = null;
  let dots = [];
  let descOverlay = null;
  let dotsContainer = null;
  let dotsTimer = null;

  function flashOverlays() {
    if (dotsContainer) dotsContainer.classList.add("is-visible");
    if (descOverlay && !descOverlay.hidden) descOverlay.classList.add("is-visible");
    if (dotsTimer) clearTimeout(dotsTimer);
    dotsTimer = setTimeout(() => {
      if (dotsContainer) dotsContainer.classList.remove("is-visible");
      if (descOverlay) descOverlay.classList.remove("is-visible");
    }, 2000);
  }

  function updateDesc() {
    if (!descOverlay) return;
    const text = loopImages[loopIndex]?.desc || "";
    if (text) {
      descOverlay.textContent = text;
      descOverlay.hidden = false;
    } else {
      descOverlay.textContent = "";
      descOverlay.hidden = true;
    }
  }

  function updateDots() {
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === loopIndex));
  }

  function goToImage(index) {
    if (index === loopIndex || isTransitioning) return;
    const direction = index > loopIndex ? "next" : "prev";
    stopLoop();
    showLoopImage(index, direction);
    flashOverlays();
    startLoop();
  }

  function clearSlideClasses(element) {
    element.classList.remove("slide-in-next", "slide-in-prev", "slide-out-next", "slide-out-prev");
  }

  function showLoopImage(index, direction) {
    if (!loopImageSlots.length || !loopImages.length || isTransitioning) return;
    const safeIndex = index % loopImages.length;
    const current = loopImages[safeIndex];
    const outgoing = loopImageSlots[activeSlotIndex];
    const incoming = loopImageSlots[1 - activeSlotIndex];

    isTransitioning = Boolean(direction);
    if (transitionSafetyTimer) {
      clearTimeout(transitionSafetyTimer);
      transitionSafetyTimer = null;
    }
    const preload = new Image();
    preload.onload = () => {
      clearSlideClasses(outgoing);
      clearSlideClasses(incoming);

      incoming.src = current.src;
      incoming.alt = current.alt || "loop image";
      incoming.classList.add("is-active");
      outgoing.classList.remove("is-active");

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (direction && !reducedMotion) {
        incoming.classList.add(direction === "prev" ? "slide-in-prev" : "slide-in-next");
        outgoing.classList.add(direction === "prev" ? "slide-out-prev" : "slide-out-next");
        transitionSafetyTimer = setTimeout(() => { isTransitioning = false; }, 600);
      } else {
        isTransitioning = false;
      }

      loopIndex = safeIndex;
      activeSlotIndex = 1 - activeSlotIndex;
      updateDots();
      updateDesc();
    };
    preload.onerror = () => { isTransitioning = false; };
    preload.src = current.src;
  }

  function showPrevImage() {
    if (!loopImages.length) return;
    showLoopImage((loopIndex - 1 + loopImages.length) % loopImages.length, "prev");
  }

  function showNextImage() {
    if (!loopImages.length) return;
    showLoopImage((loopIndex + 1) % loopImages.length, "next");
  }

  function startLoop() {
    if (!loopImageSlots.length || loopImages.length <= 1) return;
    if (loopTimer) clearInterval(loopTimer);
    loopTimer = setInterval(() => showLoopImage(loopIndex + 1, "next"), 4000);
  }

  function stopLoop() {
    if (loopTimer) {
      clearInterval(loopTimer);
      loopTimer = null;
    }
  }

  const gallerySource = gallery.getAttribute("data-source");
  if (!gallerySource || !loopImageSlots.length) return;

  fetch(gallerySource)
    .then(response => response.ok ? response.json() : Promise.reject(response))
    .then(data => {
      if (!Array.isArray(data?.images)) return;
      loopImages = data.images.filter(item => item?.src);
      if (!loopImages.length) return;

      loopImageSlots.forEach((slot, index) => {
        slot.addEventListener("animationend", () => {
          clearSlideClasses(slot);
          isTransitioning = false;
        });
        if (index !== activeSlotIndex) slot.classList.remove("is-active");
      });

      const first = loopImages[0];
      loopImageSlots[activeSlotIndex].src = first.src;
      loopImageSlots[activeSlotIndex].alt = first.alt || "loop image";
      loopImageSlots[activeSlotIndex].classList.add("is-active");

      loopImages.forEach((img, i) => {
        if (i === 0) return;
        const preload = new Image();
        preload.src = img.src;
      });

      if (loopImages.some(img => img.desc)) {
        descOverlay = document.createElement("div");
        descOverlay.className = "loop-desc";
        descOverlay.hidden = true;
        gallery.appendChild(descOverlay);
        updateDesc();
      }

      if (loopImages.length > 1) {
        dotsContainer = document.createElement("div");
        dotsContainer.className = "loop-dots";
        loopImages.forEach((_, i) => {
          const dot = document.createElement("button");
          dot.type = "button";
          dot.className = "loop-dot" + (i === 0 ? " is-active" : "");
          dot.addEventListener("click", () => goToImage(i));
          dotsContainer.appendChild(dot);
          dots.push(dot);
        });
        gallery.appendChild(dotsContainer);
      }

      startLoop();
    });

  gallery.addEventListener("mouseenter", stopLoop);
  gallery.addEventListener("mouseleave", startLoop);

  gallery.addEventListener("click", e => {
    if (e.target.closest(".loop-arrow")) return;
    const image = e.target.closest(".loop-image");
    if (!image || !loopImages.length) return;
    const current = loopImages[loopIndex];
    if (current?.link) {
      window.open(current.link, "_blank", "noopener");
    } else {
      flashOverlays();
    }
  });

  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;

  gallery.addEventListener("touchstart", e => {
    if (!e.touches.length) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping = true;
    stopLoop();
  }, { passive: true });

  gallery.addEventListener("touchmove", e => {
    if (!isSwiping || !e.touches.length) return;
    const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
    if (deltaX > deltaY) e.preventDefault();
  }, { passive: false });

  gallery.addEventListener("touchend", e => {
    if (!isSwiping) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const minSwipe = 40;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipe) {
      if (deltaX > 0) showPrevImage(); else showNextImage();
      flashOverlays();
    }
    isSwiping = false;
    startLoop();
  }, { passive: true });

  if (loopPrev && loopNext) {
    loopPrev.addEventListener("click", () => {
      stopLoop();
      showPrevImage();
      flashOverlays();
      startLoop();
    });
    loopNext.addEventListener("click", () => {
      stopLoop();
      showNextImage();
      flashOverlays();
      startLoop();
    });
  }

  gallery.setAttribute("tabindex", "0");
  gallery.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      stopLoop();
      showPrevImage();
      flashOverlays();
      startLoop();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      stopLoop();
      showNextImage();
      flashOverlays();
      startLoop();
    }
  });
}

document.querySelectorAll(".loop-gallery").forEach(initLoopGallery);

// Contact Form
const contactForm = document.querySelector("#contact-form");
const contactDraftStorageKey = "dango-contact-draft";

if (contactForm) {
  const subjectField = contactForm.elements.namedItem("subject");
  const contentField = contactForm.elements.namedItem("content");

  try {
    const savedDraft = JSON.parse(localStorage.getItem(contactDraftStorageKey) || "{}");
    if (typeof savedDraft.subject === "string") subjectField.value = savedDraft.subject;
    if (typeof savedDraft.content === "string") contentField.value = savedDraft.content;
  } catch {}

  function saveContactDraft() {
    try {
      localStorage.setItem(contactDraftStorageKey, JSON.stringify({
        subject: subjectField.value,
        content: contentField.value
      }));
    } catch {}
  }

  contactForm.querySelectorAll("input, textarea").forEach(field => {
    field.addEventListener("input", () => {
      field.setCustomValidity("");
      saveContactDraft();
    });
  });

  contactForm.addEventListener("submit", event => {
    event.preventDefault();

    const subject = subjectField.value.trim();
    const content = contentField.value.trim();

    subjectField.setCustomValidity(subject ? "" : t("contact_subject_required"));
    contentField.setCustomValidity(content ? "" : t("contact_content_required"));
    if (!contactForm.reportValidity()) return;

    const mailtoUrl = `mailto:contact@dango-cubed.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(content)}`;
    window.open(mailtoUrl, "_blank");
    contactForm.reset();
    try {
      localStorage.removeItem(contactDraftStorageKey);
    } catch {}
  });
}

// Back to Top
document.querySelector(".back-to-top-button")?.addEventListener("click", () => {
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
  window.scrollTo({ top: 0, behavior });
});

// Lightbox
const memberLightbox = document.querySelector("#member-lightbox");
const memberLightboxCardTemplate = document.querySelector("#member-lightbox-card");
const memberThemeClasses = ["blue-themed", "red-themed", "yellow-themed"];
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const memberCards = [];
const memberCardGap = 32;
const sideCardScaleDrop = 0.2;
const sideCardFade = 0.35;
const springStiffness = 220;
const springDamping = 26;
let cardPosition = 0;
let cardTarget = 0;
let cardVelocity = 0;
let cardSpacing = 1;
let cardAnimationFrame = 0;
let activeCardIndex = 0;
let cardDrag = null;
let suppressCardClick = false;
let memberSwipeHintUsed = false;
let memberSwipeHintTimer = 0;
let memberSwipeHintFrame = 0;

document.querySelectorAll(".member[aria-controls='member-lightbox']").forEach(member => {
  const detailsPanel = document.getElementById(member.dataset.memberTemplate)?.content.firstElementChild?.cloneNode(true);
  const card = memberLightboxCardTemplate?.content.firstElementChild?.cloneNode(true);
  if (!memberLightbox || !detailsPanel || !card) return;

  const theme = memberThemeClasses.find(themeClass => member.querySelector("img")?.classList.contains(themeClass));
  if (theme) card.classList.add(theme);
  detailsPanel.querySelectorAll("img").forEach(image => {
    image.loading = "eager";
  });
  card.appendChild(detailsPanel);
  card.querySelector(".member-lightbox-close")?.addEventListener("click", () => memberLightbox.close());
  card.inert = true;
  memberLightbox.appendChild(card);

  const index = memberCards.push(card) - 1;
  member.addEventListener("click", () => openMemberLightbox(index));
});

applyTranslations();

// Maps any offset into the looping range [-count / 2, count / 2).
function wrapCardOffset(offset) {
  const count = memberCards.length;
  return (((offset + count / 2) % count) + count) % count - count / 2;
}

function measureCardSpacing() {
  const width = memberCards[0]?.offsetWidth || 0;
  cardSpacing = Math.max(1, width * (1 - sideCardScaleDrop / 2) + memberCardGap);
}

function renderMemberCards() {
  const edge = memberCards.length / 2;
  memberCards.forEach((card, index) => {
    const offset = wrapCardOffset(index - cardPosition);
    const distance = Math.abs(offset);
    const scale = 1 - sideCardScaleDrop * Math.min(distance, 1);
    const brightness = 1 - sideCardFade * Math.min(distance, 1);
    // Fade out completely before a card wraps to the other side.
    const opacity = distance <= 1 ? 1 : Math.max(0, (edge - distance) / Math.max(edge - 1, 0.001));
    card.style.transform = `translate(-50%, -50%) translate3d(${offset * cardSpacing}px, 0, 0) scale(${scale})`;
    card.style.filter = distance < 0.001 ? "" : `brightness(${brightness})`;
    card.style.opacity = opacity;
    card.style.zIndex = String(Math.round((edge - distance) * 10));
  });
}

function setActiveMemberCard(index) {
  const focusWasInDialog = memberLightbox.contains(document.activeElement);
  activeCardIndex = index;
  memberCards.forEach((card, cardIndex) => {
    card.inert = cardIndex !== index;
  });
  if (memberLightbox.open && (focusWasInDialog || document.activeElement === document.body)) {
    memberCards[index].querySelector(".member-lightbox-close")?.focus({ preventScroll: true });
  }
}

function animateMemberCards() {
  cancelAnimationFrame(cardAnimationFrame);
  if (reducedMotionQuery.matches) {
    cardPosition = cardTarget;
    cardVelocity = 0;
    renderMemberCards();
    return;
  }

  let lastTime = performance.now();
  const step = now => {
    const elapsed = Math.min((now - lastTime) / 1000, 1 / 20);
    lastTime = now;
    const substeps = 4;
    const stepSize = elapsed / substeps;
    for (let i = 0; i < substeps; i++) {
      const acceleration = -springStiffness * (cardPosition - cardTarget) - springDamping * cardVelocity;
      cardVelocity += acceleration * stepSize;
      cardPosition += cardVelocity * stepSize;
    }

    if (Math.abs(cardPosition - cardTarget) < 0.0005 && Math.abs(cardVelocity) < 0.01) {
      cardPosition = cardTarget;
      cardVelocity = 0;
      renderMemberCards();
      return;
    }
    renderMemberCards();
    cardAnimationFrame = requestAnimationFrame(step);
  };
  cardAnimationFrame = requestAnimationFrame(step);
}

function cancelMemberSwipeHint() {
  clearTimeout(memberSwipeHintTimer);
  cancelAnimationFrame(memberSwipeHintFrame);
  memberSwipeHintTimer = 0;
  memberSwipeHintFrame = 0;
}

function scheduleMemberSwipeHint() {
  if (memberSwipeHintUsed) return;
  memberSwipeHintUsed = true;
  if (reducedMotionQuery.matches) return;

  memberSwipeHintTimer = setTimeout(() => {
    memberSwipeHintTimer = 0;
    if (!memberLightbox.open || reducedMotionQuery.matches) return;

    const startPosition = cardTarget;
    const startTime = performance.now();
    const step = now => {
      if (!memberLightbox.open) {
        cancelMemberSwipeHint();
        return;
      }
      const progress = Math.min((now - startTime) / 900, 1);
      if (progress === 1 || reducedMotionQuery.matches) {
        cardPosition = startPosition;
        memberSwipeHintFrame = 0;
        renderMemberCards();
        return;
      }
      cardPosition = startPosition + 0.1 * Math.sin(Math.PI * progress) ** 2;
      renderMemberCards();
      memberSwipeHintFrame = requestAnimationFrame(step);
    };
    memberSwipeHintFrame = requestAnimationFrame(step);
  }, 1000);
}

function moveMemberCardsTo(target) {
  cancelMemberSwipeHint();
  const count = memberCards.length;
  cardTarget = target;
  setActiveMemberCard(((target % count) + count) % count);
  animateMemberCards();
}

function openMemberLightbox(index) {
  cancelMemberSwipeHint();
  cancelAnimationFrame(cardAnimationFrame);
  cardPosition = cardTarget = index;
  cardVelocity = 0;
  setActiveMemberCard(index);
  memberCards.forEach(card => {
    card.scrollTop = 0;
  });
  document.documentElement.classList.add("member-lightbox-open");
  memberLightbox.showModal();
  measureCardSpacing();
  renderMemberCards();
  scheduleMemberSwipeHint();
}

function memberCardIndexAt(x, y) {
  return memberCards.findIndex(card => {
    const rect = card.getBoundingClientRect();
    return Number(card.style.opacity) > 0.05 && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  });
}

function endMemberCardDrag(event) {
  if (!cardDrag || event.pointerId !== cardDrag.pointerId) return;
  const drag = cardDrag;
  cardDrag = null;
  if (drag.axis !== "x") return;

  memberLightbox.classList.remove("is-dragging");
  suppressCardClick = true;
  setTimeout(() => {
    suppressCardClick = false;
  }, 0);

  const recentSamples = drag.samples.filter(sample => sample.time >= event.timeStamp - 100);
  const first = recentSamples[0];
  const last = recentSamples[recentSamples.length - 1];
  const pixelsPerMs = first && last && last.time > first.time ? (last.x - first.x) / (last.time - first.time) : 0;
  cardVelocity = -pixelsPerMs * 1000 / cardSpacing;

  const moved = cardPosition - drag.baseTarget;
  let target = drag.baseTarget;
  if (Math.abs(pixelsPerMs) > 0.35) {
    target = cardVelocity > 0 ? Math.floor(cardPosition) + 1 : Math.ceil(cardPosition) - 1;
  } else if (Math.abs(moved) > 0.2) {
    target = drag.baseTarget + Math.sign(moved) * Math.max(1, Math.round(Math.abs(moved)));
  }
  moveMemberCardsTo(target);
}

memberLightbox?.addEventListener("pointerdown", event => {
  if (!event.isPrimary || event.button !== 0) return;
  cardDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startPosition: cardPosition,
    baseTarget: cardTarget,
    axis: null,
    samples: [{ x: event.clientX, time: event.timeStamp }]
  };
});

memberLightbox?.addEventListener("pointermove", event => {
  if (!cardDrag || event.pointerId !== cardDrag.pointerId) {
    if (event.pointerType === "mouse") {
      const index = event.target === memberLightbox ? memberCardIndexAt(event.clientX, event.clientY) : -1;
      memberLightbox.style.cursor = index !== -1 && index !== activeCardIndex ? "pointer" : "";
    }
    return;
  }

  const deltaX = event.clientX - cardDrag.startX;
  if (!cardDrag.axis) {
    const deltaY = event.clientY - cardDrag.startY;
    if (Math.hypot(deltaX, deltaY) < 6) return;
    if (Math.abs(deltaY) >= Math.abs(deltaX)) {
      cardDrag = null;
      return;
    }

    cardDrag.axis = "x";
    cancelMemberSwipeHint();
    cancelAnimationFrame(cardAnimationFrame);
    // Rebase so the cards continue from wherever an in-flight animation left them.
    cardDrag.startPosition = cardPosition + deltaX / cardSpacing;
    memberLightbox.setPointerCapture(event.pointerId);
    memberLightbox.classList.add("is-dragging");
    memberLightbox.style.cursor = "";
    window.getSelection()?.removeAllRanges();
  }

  cardPosition = cardDrag.startPosition - deltaX / cardSpacing;
  cardDrag.samples.push({ x: event.clientX, time: event.timeStamp });
  if (cardDrag.samples.length > 20) cardDrag.samples.shift();
  renderMemberCards();
});

memberLightbox?.addEventListener("pointerup", endMemberCardDrag);
memberLightbox?.addEventListener("pointercancel", endMemberCardDrag);
memberLightbox?.addEventListener("dragstart", event => event.preventDefault());

memberLightbox?.addEventListener("click", event => {
  if (!suppressCardClick) return;
  suppressCardClick = false;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

memberLightbox?.addEventListener("click", event => {
  if (event.target !== memberLightbox) return;
  const index = memberCardIndexAt(event.clientX, event.clientY);
  if (index === -1) {
    memberLightbox.close();
  } else if (index !== activeCardIndex) {
    moveMemberCardsTo(cardTarget + Math.round(wrapCardOffset(index - cardTarget)));
  }
});

memberLightbox?.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    event.preventDefault();
    memberLightbox.close();
  }
});

document.addEventListener("keydown", event => {
  if (!memberLightbox?.open || cardDrag?.axis === "x") return;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    moveMemberCardsTo(cardTarget + (event.key === "ArrowRight" ? 1 : -1));
  }
});

memberLightbox?.addEventListener("close", () => {
  cancelMemberSwipeHint();
  cancelAnimationFrame(cardAnimationFrame);
  cardDrag = null;
  memberLightbox.classList.remove("is-dragging");
  memberLightbox.style.cursor = "";
  document.documentElement.classList.remove("member-lightbox-open");
});

window.addEventListener("resize", () => {
  if (!memberLightbox?.open) return;
  measureCardSpacing();
  renderMemberCards();
});
