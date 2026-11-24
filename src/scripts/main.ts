import { MOBILE_BREAKPOINT, STATUS_DELAY_MS } from '../config';
import { site } from '../data/site';
import { GospelController } from '../gospel/controller';
import { pruneGospelCache } from '../gospel/cache';
import { detectInitialLanguage, getLanguage, isLanguageCode, t } from '../i18n/translate';
import { StatusController } from '../ui/status';
import { trapFocus } from '../ui/focus';
import { applyLanguage, currentLanguage, registerTranslatableContent } from '../ui/i18n-dom';
import { publicPath } from '../paths';

const PARISH_EMAIL = site.email;
const IN_APP_BROWSER = /(FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|MicroMessenger|Snapchat|; wv\))/i.test(navigator.userAgent || '');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

if (IN_APP_BROWSER) document.documentElement.classList.add('is-in-app');
pruneGospelCache();

// --- Traducción de la interfaz -------------------------------------------------
const initialLanguage = detectInitialLanguage();
registerTranslatableContent();
applyLanguage(initialLanguage, false);

const formStatus = new StatusController(document.getElementById('formStatus'));
const intentionStatus = new StatusController(document.getElementById('intentionStatus'));
const gospelStatus = new StatusController(document.getElementById('gospelStatus'));
const gospel = new GospelController(gospelStatus);
gospel.init();

// --- Menú móvil ---------------------------------------------------------------
const mobileMenuBtn = document.getElementById('mobileMenuToggle');
const mainNav = document.getElementById('mainNav');
const menuIconUse = mobileMenuBtn?.querySelector('use') ?? null;

function setMenuState(open: boolean): void {
  if (!mobileMenuBtn || !mainNav) return;
  mainNav.classList.toggle('active', open);
  mobileMenuBtn.setAttribute('aria-expanded', String(open));
  mobileMenuBtn.setAttribute(
    'aria-label',
    t(open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación')
  );
  menuIconUse?.setAttribute('href', `${publicPath('/icons/sprite.svg')}#${open ? 'fas-xmark' : 'fas-bars'}`);
}

function closeMobileMenu(): void {
  if (mainNav?.classList.contains('active')) setMenuState(false);
}

if (mobileMenuBtn && mainNav) {
  mobileMenuBtn.addEventListener('click', () => {
    setMenuState(!mainNav.classList.contains('active'));
  });

  mainNav.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      if (mobileQuery.matches) setMenuState(false);
    });
  });

  document.addEventListener('click', (event) => {
    if (!mainNav.classList.contains('active')) return;
    const target = event.target as Node;
    if (mainNav.contains(target) || mobileMenuBtn.contains(target)) return;
    setMenuState(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mainNav.classList.contains('active')) {
      setMenuState(false);
      mobileMenuBtn.focus();
    }
  });

  mobileQuery.addEventListener('change', (event) => {
    if (!event.matches) setMenuState(false);
  });
}

// --- Navegación interna y enlaces mailto --------------------------------------
function scrollToSection(hash: string): boolean {
  if (!hash || hash === '#') return false;
  const target = document.getElementById(hash.slice(1));
  if (!target) return false;

  target.scrollIntoView({
    behavior: IN_APP_BROWSER || prefersReducedMotion ? 'auto' : 'smooth',
    block: 'start',
  });
  try {
    window.history.replaceState(null, '', hash);
  } catch {
    // Algunos navegadores integrados no permiten cambiar la URL.
  }
  return true;
}

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const link = target.closest('a[href^="#"]') as HTMLAnchorElement | null;
  if (!link || event.defaultPrevented || link.classList.contains('open-modal-intention')) return;

  const hash = link.getAttribute('href');
  if (!hash || hash === '#') return;
  event.preventDefault();
  closeMobileMenu();
  scrollToSection(hash);
});

document.addEventListener('click', (event) => {
  if (!IN_APP_BROWSER) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const link = target.closest('a[href^="mailto:"]') as HTMLAnchorElement | null;
  if (!link || event.defaultPrevented) return;

  const address = (link.getAttribute('href') || '').replace(/^mailto:/, '').split('?')[0];
  // Solo se cancela el mailto nativo si la composición web se abrió de
  // verdad; si el bloqueador lo impide, el enlace sigue su curso (#54).
  if (openWebCompose(address)) event.preventDefault();
});

// --- Composición de correo -----------------------------------------------------
function buildMailto(subject: string, lines: string[]): string {
  return `mailto:${PARISH_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\r\n'))}`;
}

/** Abre Gmail sin `noopener`: con esa feature `window.open` devuelve null (#50). */
function openWebCompose(address: string, subject = '', lines: string[] = []): boolean {
  const webCompose = 'https://mail.google.com/mail/?view=cm&fs=1'
    + `&to=${encodeURIComponent(address)}`
    + (subject ? `&su=${encodeURIComponent(subject)}` : '')
    + (lines.length ? `&body=${encodeURIComponent(lines.join('\r\n'))}` : '');
  try {
    const opened = window.open(webCompose, '_blank');
    if (opened) {
      try { opened.opener = null; } catch { /* WindowProxy de otro origen */ }
      return true;
    }
  } catch {
    // Ventana bloqueada: se informa desde el estado del formulario.
  }
  return false;
}

/** Devuelve false solo si no se pudo abrir nada en un navegador integrado. */
function openEmailComposer(subject: string, lines: string[]): boolean {
  if (IN_APP_BROWSER) return openWebCompose(PARISH_EMAIL, subject, lines);

  window.location.href = buildMailto(subject, lines);
  return true;
}

function emailLink(): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `mailto:${PARISH_EMAIL}`;
  link.textContent = PARISH_EMAIL;
  link.className = 'status-mailto-link';
  return link;
}

function submitWithMailto(
  status: StatusController,
  form: HTMLFormElement,
  loadingMessage: string,
  fallbackMessage: string,
  subject: string,
  lines: string[],
): void {
  if (!form.reportValidity()) return;

  status.show(loadingMessage, 'info');
  if (openEmailComposer(subject, lines)) {
    status.schedule(fallbackMessage, STATUS_DELAY_MS, { email: emailLink() });
  } else {
    status.show(fallbackMessage, 'error', { email: emailLink() });
  }
}

function value(id: string): string {
  return (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null)?.value.trim() ?? '';
}

document.getElementById('contactForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const reason = value('contactReason');
  submitWithMailto(
    formStatus,
    form,
    'Abriendo su aplicación de correo con el mensaje preparado…',
    'Si su aplicación de correo no se abrió, escriba directamente a {email}.',
    `Consulta parroquial: ${reason}`,
    [
      'Pax Christi.',
      '',
      `Nombre: ${value('contactName')}`,
      `Contacto: ${value('contactEmail')}`,
      `Motivo: ${reason}`,
      '',
      'Mensaje:',
      value('contactMessage'),
      '',
      'Enviado desde el sitio web de la Parroquia San Isidro Labrador.',
    ],
  );
});

document.getElementById('modalIntentionForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  submitWithMailto(
    intentionStatus,
    form,
    'Abriendo su aplicación de correo con los datos de la intención…',
    'Si su aplicación de correo no se abrió, escriba a {email}.',
    'Intención de Santa Misa',
    [
      'Pax Christi.',
      '',
      `Tipo de intención: ${value('intentionType')}`,
      `Se ofrece por: ${value('intentionNames')}`,
      `Fecha deseada: ${value('intentionDate')}`,
      `Solicitante y teléfono: ${value('intentionRequester')}`,
      '',
      'Enviado desde el sitio web de la Parroquia San Isidro Labrador.',
    ],
  );
});

// --- Modal de intenciones -----------------------------------------------------
const modal = document.getElementById('intentionModal');
const modalContent = modal?.querySelector<HTMLElement>('.modal-content') ?? null;
const closeModalBtn = document.getElementById('closeModal');
let lastModalTrigger: HTMLElement | null = null;

function openModal(trigger: HTMLElement | null): void {
  if (!modal) return;
  lastModalTrigger = trigger ?? (document.activeElement as HTMLElement | null);
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  const firstField = modal.querySelector<HTMLElement>('select, input, textarea');
  (firstField ?? modalContent)?.focus();
}

function closeModal(): void {
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  lastModalTrigger?.focus();
  lastModalTrigger = null;
}

document.querySelectorAll('.open-modal-intention').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    openModal(button as HTMLElement);
  });
});

closeModalBtn?.addEventListener('click', closeModal);
modal?.addEventListener('click', (event) => {
  if (event.target === modal) closeModal();
});
if (modal) {
  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
    } else {
      trapFocus(event, modal);
    }
  });
}

// --- Navegación activa --------------------------------------------------------
const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav-list a[href^="#"]'));
const sections = Array.from(document.querySelectorAll<HTMLElement>('main section[id]'));

function setActiveNav(id: string): void {
  navLinks.forEach((link) => {
    if (link.classList.contains('open-modal-intention')) {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
      return;
    }
    const isActive = link.getAttribute('href') === `#${id}`;
    link.classList.toggle('active', isActive);
    if (isActive) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

if (sections.length && navLinks.length) {
  if (typeof IntersectionObserver !== 'undefined') {
    const visible = new Set<string>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      });
      const current = sections.find((section) => visible.has(section.id));
      if (current) setActiveNav(current.id);
    }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });
    sections.forEach((section) => observer.observe(section));
  } else {
    window.addEventListener('scroll', () => {
      const scrollY = window.pageYOffset + 140;
      let currentId = sections[0].id;
      sections.forEach((section) => {
        if (section.offsetTop <= scrollY) currentId = section.id;
      });
      setActiveNav(currentId);
    }, { passive: true });
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (link.classList.contains('open-modal-intention')) return;
      const target = link.getAttribute('href');
      if (target && target.length > 1) setActiveNav(target.slice(1));
    });
  });
}

// --- Galería ------------------------------------------------------------------
const galleryItems = Array.from(document.querySelectorAll<HTMLButtonElement>('.gallery-item'));
const lightbox = document.getElementById('photoLightbox');
const lightboxImage = document.getElementById('lightboxImage') as HTMLImageElement | null;
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxClose = document.getElementById('lightboxClose');
let activePhotoIndex = 0;
let lastLightboxTrigger: HTMLElement | null = null;

function showPhoto(index: number): void {
  if (!galleryItems.length || !lightboxImage) return;
  activePhotoIndex = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[activePhotoIndex];
  const img = item.querySelector('img');
  if (!img) return;
  lightboxImage.src = item.dataset.full || img.src;
  lightboxImage.alt = img.alt;
  if (lightboxCaption) lightboxCaption.textContent = t(item.dataset.caption || '');
}

function openLightbox(index: number, trigger: HTMLElement | null): void {
  if (!lightbox) return;
  lastLightboxTrigger = trigger ?? (document.activeElement as HTMLElement | null);
  showPhoto(index);
  lightbox.classList.add('active');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('lightbox-open');
  lightboxClose?.focus();
}

function closeLightbox(): void {
  if (!lightbox) return;
  lightbox.classList.remove('active');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('lightbox-open');
  lastLightboxTrigger?.focus();
  lastLightboxTrigger = null;
}

if (lightbox && lightboxImage && galleryItems.length) {
  galleryItems.forEach((item, index) => {
    item.addEventListener('click', () => openLightbox(index, item));
  });
  lightboxClose?.addEventListener('click', closeLightbox);
  document.getElementById('lightboxPrev')?.addEventListener('click', () => showPhoto(activePhotoIndex - 1));
  document.getElementById('lightboxNext')?.addEventListener('click', () => showPhoto(activePhotoIndex + 1));
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('active')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      showPhoto(activePhotoIndex - 1);
    } else if (event.key === 'ArrowRight') {
      showPhoto(activePhotoIndex + 1);
    } else {
      trapFocus(event, lightbox);
    }
  });
}

// --- Selector de idioma -------------------------------------------------------
const languageSelect = document.getElementById('languageSelect') as HTMLSelectElement | null;
if (languageSelect) languageSelect.value = currentLanguage();

languageSelect?.addEventListener('change', () => {
  const next = languageSelect.value;
  if (!isLanguageCode(next) || next === getLanguage()) return;

  applyLanguage(next);
  formStatus.retranslate();
  intentionStatus.retranslate();
  gospelStatus.retranslate();
  setMenuState(mainNav?.classList.contains('active') ?? false);
  if (lightbox?.classList.contains('active')) showPhoto(activePhotoIndex);
  gospel.refreshLanguage();
});
