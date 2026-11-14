(() => {
  "use strict";

  const year = document.getElementById("current-year");
  if (year) year.textContent = String(new Date().getFullYear());

  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".main-nav");

  if (menuButton && navigation) {
    const closeMenu = () => {
      menuButton.setAttribute("aria-expanded", "false");
      navigation.classList.remove("is-open");
      const label = menuButton.querySelector(".sr-only");
      if (label) label.textContent = "Menü öffnen";
    };

    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!isOpen));
      navigation.classList.toggle("is-open", !isOpen);
      const label = menuButton.querySelector(".sr-only");
      if (label) label.textContent = isOpen ? "Menü öffnen" : "Menü schließen";
    });

    navigation.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
        menuButton.focus();
      }
    });
  }

  const contactForm = document.querySelector(".contact-form");
  if (contactForm) {
    const status = contactForm.querySelector(".form-status");
    const submitButton = contactForm.querySelector(".contact-submit");

    const showStatus = (text, type) => {
      status.textContent = text;
      status.dataset.type = type;
    };

    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      submitButton.disabled = true;
      showStatus("Wird gesendet …", "pending");

      try {
        const response = await fetch(contactForm.action, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: new FormData(contactForm)
        });
        const result = await response.json();

        if (response.ok && result.success) {
          contactForm.reset();
          showStatus("Danke! Deine Nachricht ist angekommen. Ich melde mich bald bei dir.", "success");
        } else {
          showStatus("Das hat leider nicht geklappt. Bitte versuch es später noch einmal.", "error");
        }
      } catch {
        showStatus("Keine Verbindung. Bitte prüfe dein Internet und versuch es noch einmal.", "error");
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  const carousel = document.querySelector(".gallery-carousel");
  const lightbox = document.querySelector(".lightbox");

  if (carousel && lightbox) {
    const viewport = carousel.querySelector(".gallery-viewport");
    const track = carousel.querySelector(".gallery-track");
    const dotsBox = document.querySelector(".gallery-dots");
    const originals = [...track.children];
    const total = originals.length;
    const cloneCount = Math.min(4, total);
    const interval = Number(carousel.dataset.interval) || 4000;
    const photos = originals.map((slide) => {
      const button = slide.querySelector(".gallery-item");
      return { full: button.dataset.full, alt: button.querySelector("img").alt };
    });

    originals.forEach((slide, i) => { slide.querySelector(".gallery-item").dataset.index = String(i); });

    const makeClone = (slide) => {
      const clone = slide.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.querySelector(".gallery-item").tabIndex = -1;
      return clone;
    };
    originals.slice(-cloneCount).forEach((slide) => track.insertBefore(makeClone(slide), track.firstChild));
    originals.slice(0, cloneCount).forEach((slide) => track.appendChild(makeClone(slide)));

    const dots = !dotsBox ? [] : originals.map((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "gallery-dot";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", `Foto ${i + 1}`);
      dot.addEventListener("click", () => { goTo(i); restartAutoplay(); });
      dotsBox.appendChild(dot);
      return dot;
    });

    let index = 0;
    let isMoving = false;

    const step = () => {
      const slide = track.children[0];
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return slide.getBoundingClientRect().width + gap;
    };

    // Auf dem Handy steht das aktive Foto mittig, die Nachbarn sind links und rechts angeschnitten
    const centerShift = () => {
      if (getComputedStyle(track).getPropertyValue("--center").trim() !== "1") return 0;
      return (viewport.clientWidth - track.children[0].getBoundingClientRect().width) / 2;
    };

    const render = (animate, offset = 0) => {
      track.classList.toggle("is-animating", animate);
      track.style.transform = `translate3d(${-(index + cloneCount) * step() + centerShift() + offset}px, 0, 0)`;
      const active = ((index % total) + total) % total;
      dots.forEach((dot, i) => dot.setAttribute("aria-selected", String(i === active)));
    };

    let moveTimer = null;
    const finishMove = () => {
      clearTimeout(moveTimer);
      isMoving = false;
      if (index >= total || index < 0) {
        index = ((index % total) + total) % total;
        render(false);
      }
    };

    const goTo = (target) => {
      if (isMoving) return;
      index = target;
      isMoving = true;
      render(true);
      moveTimer = setTimeout(finishMove, 700);
    };

    track.addEventListener("transitionend", (event) => {
      if (event.target === track && isMoving) finishMove();
    });

    const next = () => goTo(index + 1);
    const prev = () => goTo(index - 1);

    let timer = null;
    const stopAutoplay = () => { clearInterval(timer); timer = null; };
    const startAutoplay = () => {
      stopAutoplay();
      if (!lightbox.hidden || document.hidden) return;
      timer = setInterval(next, interval);
    };
    const restartAutoplay = () => { if (timer) startAutoplay(); };

    carousel.querySelector(".gallery-next").addEventListener("click", () => { next(); restartAutoplay(); });
    carousel.querySelector(".gallery-prev").addEventListener("click", () => { prev(); restartAutoplay(); });
    carousel.addEventListener("mouseenter", stopAutoplay);
    carousel.addEventListener("mouseleave", startAutoplay);
    carousel.addEventListener("focusin", stopAutoplay);
    carousel.addEventListener("focusout", startAutoplay);
    document.addEventListener("visibilitychange", () => (document.hidden ? stopAutoplay() : startAutoplay()));
    window.addEventListener("resize", () => render(false));

    // Wischen auf Touch-Geräten
    let swipeStartX = null;
    let swipeDelta = 0;
    viewport.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" || isMoving) return;
      swipeStartX = event.clientX;
      swipeDelta = 0;
      stopAutoplay();
    });
    viewport.addEventListener("pointermove", (event) => {
      if (swipeStartX === null) return;
      swipeDelta = event.clientX - swipeStartX;
      render(false, swipeDelta);
    });
    const endSwipe = () => {
      if (swipeStartX === null) return;
      swipeStartX = null;
      if (swipeDelta < -40) next();
      else if (swipeDelta > 40) prev();
      else render(true);
      startAutoplay();
    };
    viewport.addEventListener("pointerup", endSwipe);
    viewport.addEventListener("pointercancel", endSwipe);

    // Fotoansicht
    const stage = lightbox.querySelector(".lightbox-stage");
    const image = lightbox.querySelector(".lightbox-image");
    const counter = lightbox.querySelector(".lightbox-counter");
    const zoomButton = lightbox.querySelector(".lightbox-zoom");
    let current = 0;
    let scale = 1;
    let panX = 0;
    let panY = 0;
    let lastFocus = null;

    const clampPan = () => {
      const maxX = Math.max(0, (image.offsetWidth * scale - stage.clientWidth) / 2);
      const maxY = Math.max(0, (image.offsetHeight * scale - stage.clientHeight) / 2);
      panX = Math.min(maxX, Math.max(-maxX, panX));
      panY = Math.min(maxY, Math.max(-maxY, panY));
    };

    const applyZoom = () => {
      clampPan();
      image.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
      lightbox.classList.toggle("is-zoomed", scale > 1);
      zoomButton.textContent = scale > 1 ? "−" : "+";
      zoomButton.setAttribute("aria-label", scale > 1 ? "Verkleinern" : "Vergrößern");
    };

    const setZoom = (value) => {
      scale = Math.min(4, Math.max(1, value));
      if (scale === 1) { panX = 0; panY = 0; }
      applyZoom();
    };

    const show = (i) => {
      current = (i + total) % total;
      setZoom(1);
      image.src = photos[current].full;
      image.alt = photos[current].alt;
      counter.textContent = `${current + 1} / ${total}`;
      [current + 1, current - 1].forEach((n) => { new Image().src = photos[(n + total) % total].full; });
    };

    const openLightbox = (i) => {
      lastFocus = document.activeElement;
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
      stopAutoplay();
      show(i);
      lightbox.querySelector(".lightbox-close").focus();
    };

    const closeLightbox = () => {
      lightbox.hidden = true;
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
      startAutoplay();
    };

    track.addEventListener("click", (event) => {
      const item = event.target.closest(".gallery-item");
      if (!item || Math.abs(swipeDelta) > 5) return;
      openLightbox(Number(item.dataset.index));
    });

    lightbox.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
    lightbox.querySelector(".lightbox-next").addEventListener("click", () => show(current + 1));
    lightbox.querySelector(".lightbox-prev").addEventListener("click", () => show(current - 1));
    zoomButton.addEventListener("click", () => setZoom(scale > 1 ? 1 : 2.5));

    document.addEventListener("keydown", (event) => {
      if (lightbox.hidden) return;
      if (event.key === "Escape") closeLightbox();
      else if (event.key === "ArrowRight") show(current + 1);
      else if (event.key === "ArrowLeft") show(current - 1);
      else if (event.key === "+" || event.key === "=") setZoom(scale + 0.5);
      else if (event.key === "-") setZoom(scale - 0.5);
    });

    stage.addEventListener("wheel", (event) => {
      event.preventDefault();
      setZoom(scale * (event.deltaY < 0 ? 1.15 : 1 / 1.15));
    }, { passive: false });

    // Ziehen, Wischen und Zwei-Finger-Zoom in der Fotoansicht
    const pointers = new Map();
    let dragStart = null;
    let pinchStart = null;
    let moved = false;
    let downTarget = null;

    stage.addEventListener("pointerdown", (event) => {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      downTarget = event.target;
      stage.setPointerCapture(event.pointerId);
      moved = false;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale };
        dragStart = null;
      } else {
        dragStart = { x: event.clientX, y: event.clientY, panX, panY };
      }
    });

    stage.addEventListener("pointermove", (event) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pinchStart && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        setZoom(pinchStart.scale * (Math.hypot(a.x - b.x, a.y - b.y) / pinchStart.distance));
        moved = true;
        return;
      }
      if (!dragStart) return;
      const dx = event.clientX - dragStart.x;
      const dy = event.clientY - dragStart.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
      if (scale > 1) {
        lightbox.classList.add("is-dragging");
        panX = dragStart.panX + dx;
        panY = dragStart.panY + dy;
        applyZoom();
      }
    });

    const endPointer = (event) => {
      const start = dragStart;
      pointers.delete(event.pointerId);
      lightbox.classList.remove("is-dragging");
      if (pointers.size < 2) pinchStart = null;
      if (pointers.size > 0) return;
      dragStart = null;
      if (!start) return;
      const dx = event.clientX - start.x;
      if (scale === 1 && moved && Math.abs(dx) > 50) {
        show(current + (dx < 0 ? 1 : -1));
        return;
      }
      if (moved) return;
      if (downTarget === image) setZoom(scale > 1 ? 1 : 2.5);
      else if (downTarget === stage) closeLightbox();
    };
    stage.addEventListener("pointerup", endPointer);
    stage.addEventListener("pointercancel", (event) => {
      pointers.delete(event.pointerId);
      pinchStart = null;
      dragStart = null;
      lightbox.classList.remove("is-dragging");
    });

    render(false);
    startAutoplay();
  }

  const sections = [...document.querySelectorAll("main section[id]")];
  const navLinks = [...document.querySelectorAll('.main-nav a[href^="#"]')];
  if ("IntersectionObserver" in window && sections.length && navLinks.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          const active = link.getAttribute("href") === `#${entry.target.id}`;
          link.classList.toggle("is-active", active);
          if (active) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-35% 0px -55% 0px", threshold: 0 });
    sections.forEach((section) => observer.observe(section));
  }
})();
