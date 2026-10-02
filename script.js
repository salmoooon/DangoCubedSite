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

    subjectField.setCustomValidity(subject ? "" : "Please enter a subject.");
    contentField.setCustomValidity(content ? "" : "Please enter some content.");
    if (!contactForm.reportValidity()) return;

    const mailtoUrl = `mailto:contact@dango-cubed.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(content)}`;
    window.open(mailtoUrl, "_blank");
    contactForm.reset();
    try {
      localStorage.removeItem(contactDraftStorageKey);
    } catch {}
  });
}
