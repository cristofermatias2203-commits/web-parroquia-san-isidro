/**
 * Script Interactivo - Parroquia San Isidro Labrador de Maimón
 * Estilo institucional vaticano con Evangelio del Día Litúrgico Real
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Menú Móvil Hamburguesa
  const mobileMenuBtn = document.getElementById('mobileMenuToggle');
  const mainNav = document.getElementById('mainNav');

  if (mobileMenuBtn && mainNav) {
    mobileMenuBtn.addEventListener('click', () => {
      mainNav.classList.toggle('active');
      const icon = mobileMenuBtn.querySelector('i');
      if (icon) {
        if (mainNav.classList.contains('active')) {
          icon.className = 'fas fa-times';
        } else {
          icon.className = 'fas fa-bars';
        }
      }
    });

    const navLinks = mainNav.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          mainNav.classList.remove('active');
          const icon = mobileMenuBtn.querySelector('i');
          if (icon) icon.className = 'fas fa-bars';
        }
      });
    });
  }

  // 3. Calendario Litúrgico y Evangelio del Día
  // Base de datos del leccionario según el rito romano de la Santa Sede
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const lecturasLiturgicas = [
    {
      diaIndex: 5, // Viernes
      diaSemana: "Viernes",
      tiempo: "Tiempo Ordinario (Semana XXXI)",
      tituloLiturgico: "Viernes de la XXXI Semana del Tiempo Ordinario",
      primeraLectura: "Flp 3, 17 — 4, 1",
      salmo: "Salmo 121: «Vamos alegres a la casa del Señor»",
      aclamacion: "«Quien guarda la palabra de Cristo, ciertamente el amor de Dios ha llegado en él a su plenitud. Aleluya.»",
      cita: "Santo Evangelio según San Lucas (16, 1-8)",
      versiculo: `En aquel tiempo, Jesús dijo a sus discípulos: «Había una vez un hombre rico que tenía un administrador, el cual fue acusado ante él de haberle malgastado sus bienes. Lo llamó y le dijo: "¿Qué es eso que me han dicho de ti? Dame cuenta de tu trabajo, porque en adelante ya no serás administrador."<br><br>
      El administrador se puso a decir para sí: "¿Qué voy a hacer, pues mi señor me quita la administración? Para cavar no tengo fuerzas; mendigar me da vergüenza. Ya sé lo que voy a hacer para que, cuando me echen de la administración, encuentre quien me reciba en su casa."<br><br>
      Entonces fue llamando uno por uno a los deudores de su amo. Al primero le preguntó: "¿Cuánto le debes a mi amo?" El hombre respondió: "Cien barriles de aceite." El administrador le dijo: "Toma tu recibo, date prisa y haz otro por cincuenta." Luego preguntó al siguiente: "Y tú, ¿cuánto debes?" Éste respondió: "Cien sacos de trigo." El administrador le dijo: "Toma tu recibo y haz otro por ochenta."<br><br>
      El amo tuvo que reconocer que su mal administrador había procedido con habilidad. Pues los que pertenecen a este mundo son más hábiles en sus negocios que los que pertenecen a la luz».`,
      reflexion: "Palabra del Señor. &bull; Meditación Parroquial: Cristo nos exhorta a poner todo nuestro ingenio, fervor y bienes terrenales no en ambiciones egoístas, sino con fidelidad y caridad al servicio de Dios y de los más necesitados de Maimón, asegurando así morada eterna en los Cielos."
    },
    {
      diaIndex: 6, // Sábado
      diaSemana: "Sábado",
      tiempo: "Tiempo Ordinario (Semana XXXI)",
      tituloLiturgico: "Sábado de la XXXI Semana del Tiempo Ordinario",
      primeraLectura: "Flp 4, 10-19",
      salmo: "Salmo 111: «Dichoso quien teme al Señor»",
      aclamacion: "«Jesucristo siendo rico, se hizo pobre por nosotros, para enriquecernos con su pobreza.»",
      cita: "Santo Evangelio según San Lucas (16, 9-15)",
      versiculo: `En aquel tiempo, Jesús dijo a sus discípulos: «Gánense amigos con el dinero de iniquidad, para que cuando éste falte, los reciban a ustedes en las moradas eternas. El que es fiel en lo muy poco, también en lo más es fiel; y el que en lo muy poco es injusto, también en lo más es injusto.<br><br>
      Ningún siervo puede servir a dos señores, porque o aborrecerá al uno y amará al otro, o se apegará al uno y despreciará al otro. No podéis servir a Dios y a las riquezas».`,
      reflexion: "Palabra del Señor. &bull; Meditación Parroquial: La generosidad con los pobres transforma el dinero efímero en tesoro celestial. Que en nuestra parroquia reinen la honradez y la ayuda mutua."
    },
    {
      diaIndex: 0, // Domingo
      diaSemana: "Domingo",
      tiempo: "XXXII Domingo del Tiempo Ordinario",
      tituloLiturgico: "XXXII Domingo del Tiempo Ordinario - Día del Señor",
      primeraLectura: "1 Re 17, 10-16",
      salmo: "Salmo 145: «Alaba, alma mía, al Señor»",
      aclamacion: "«Dichosos los pobres en el espíritu, porque de ellos es el Reino de los Cielos.»",
      cita: "Santo Evangelio según San Marcos (12, 38-44)",
      versiculo: `En aquel tiempo, Jesús, sentado enfrente del arca de las ofrendas, miraba cómo la multitud echaba monedas en ella; y muchos ricos echaban mucho. Llegó una viuda pobre y echó dos moneditas de muy poco valor.<br><br>
      Jesús llamó a sus discípulos y les dijo: «En verdad os digo que esta viuda pobre ha echado más que todos los que echan en el arca; porque todos han echado de lo que les sobra, pero ella, en su indigencia, ha echado todo lo que tenía, todo su sustento».`,
      reflexion: "Palabra del Señor. &bull; Meditación Parroquial: Dios no mide la cantidad de la ofrenda sino el amor y la entrega sincera del corazón humilde. San Isidro Labrador nos inspira a entregarlo todo con confianza en la Providencia divina."
    },
    {
      diaIndex: 1, // Lunes
      diaSemana: "Lunes",
      tiempo: "Tiempo Ordinario (Semana XXXII)",
      tituloLiturgico: "Lunes de la XXXII Semana del Tiempo Ordinario",
      primeraLectura: "Tit 1, 1-9",
      salmo: "Salmo 23: «Este es el linaje de los que buscan al Señor»",
      aclamacion: "«Brilláis como lumbreras del mundo, sosteniendo firmemente la Palabra de Vida.»",
      cita: "Santo Evangelio según San Lucas (17, 1-6)",
      versiculo: `En aquel tiempo, Jesús dijo a sus discípulos: «Es imposible que no vengan escándalos; pero ¡ay de aquel por quien vienen! Más le valdría que le ataran al cuello una piedra de molino y le tiraran al mar, antes que escandalizar a uno de estos pequeños. Estad atentos.<br><br>
      Si tu hermano peca, repréndelo; y si se arrepiente, perdónalo. Y si peca contra ti siete veces al día, y siete veces vuelve diciendo: "Me arrepiento", perdónalo». Los apóstoles dijeron al Señor: «Auméntanos la fe».`,
      reflexion: "Palabra del Señor. &bull; Meditación Parroquial: El perdón fraternal y el testimonio intachable sostienen la concordia de nuestras familias y de nuestra comunidad en Maimón."
    }
  ];

  const gospelCitationEl = document.getElementById('gospelCitation');
  const gospelVerseEl = document.getElementById('gospelVerse');
  const gospelReflectionEl = document.getElementById('gospelReflection');
  const gospelSeasonEl = document.getElementById('liturgicalSeason');
  const gospelTitleEl = document.getElementById('gospelLiturgicalTitle');
  const gospelAcclamationEl = document.getElementById('gospelAcclamation');
  const gospelDateFullEl = document.getElementById('gospelDateFull');
  const parishDateEl = document.getElementById('parishCurrentDate');

  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 a 6

  // Formato oficial hispano para la fecha actual
  const fechaTexto = `${diasSemana[currentDayOfWeek]}, ${today.getDate()} de ${meses[today.getMonth()]} de ${today.getFullYear()}`;
  if (parishDateEl) parishDateEl.textContent = fechaTexto;

  // Encontrar la lectura que corresponda al día de hoy según el día de la semana
  let todayReading = lecturasLiturgicas.find(l => l.diaIndex === currentDayOfWeek) || lecturasLiturgicas[0];
  let currentIndex = lecturasLiturgicas.indexOf(todayReading);

  function renderLectura(lectura, esHoy = false) {
    if (gospelCitationEl) gospelCitationEl.textContent = lectura.cita;
    if (gospelVerseEl) gospelVerseEl.innerHTML = lectura.versiculo;
    if (gospelReflectionEl) gospelReflectionEl.innerHTML = lectura.reflexion;
    if (gospelSeasonEl) gospelSeasonEl.textContent = lectura.tiempo;
    if (gospelTitleEl) gospelTitleEl.textContent = lectura.tituloLiturgico;
    if (gospelAcclamationEl) gospelAcclamationEl.innerHTML = lectura.aclamacion;
    
    if (gospelDateFullEl) {
      if (esHoy) {
        gospelDateFullEl.innerHTML = `<i class="far fa-calendar-check" style="color:var(--color-gold);"></i> ${fechaTexto} (Hoy)`;
      } else {
        gospelDateFullEl.innerHTML = `<i class="far fa-calendar-alt"></i> Leccionario litúrgico de ${lectura.diaSemana}`;
      }
    }
  }

  // Renderizar de inmediato el evangelio de hoy
  renderLectura(todayReading, true);

  // Botón para volver al Evangelio de Hoy
  const btnTodayGospel = document.getElementById('btnTodayGospel');
  if (btnTodayGospel) {
    btnTodayGospel.addEventListener('click', (e) => {
      e.preventDefault();
      currentIndex = lecturasLiturgicas.indexOf(todayReading);
      animateTransition(() => renderLectura(todayReading, true));
    });
  }

  // Botón para alternar a las lecturas siguientes del leccionario
  const btnNextReading = document.getElementById('btnNextReading');
  if (btnNextReading) {
    btnNextReading.addEventListener('click', (e) => {
      e.preventDefault();
      currentIndex = (currentIndex + 1) % lecturasLiturgicas.length;
      const lectura = lecturasLiturgicas[currentIndex];
      const esHoy = lectura.diaIndex === currentDayOfWeek;
      animateTransition(() => renderLectura(lectura, esHoy));
    });
  }

  function animateTransition(callback) {
    const gospelCard = document.querySelector('.gospel-body');
    if (!gospelCard) {
      callback();
      return;
    }
    gospelCard.style.opacity = '0.15';
    gospelCard.style.transition = 'opacity 0.22s ease';
    setTimeout(() => {
      callback();
      gospelCard.style.opacity = '1';
    }, 220);
  }

  // 4. Modal de Intenciones y Ofrendas
  const modal = document.getElementById('intentionModal');
  const openModalBtns = document.querySelectorAll('.open-modal-intention');
  const closeModalBtn = document.getElementById('closeModal');

  if (modal && closeModalBtn) {
    openModalBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.classList.add('active');
      });
    });

    closeModalBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });

    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }

  // 5. Manejo del Formulario de Contacto
  const contactForm = document.getElementById('contactForm');
  const formSuccessAlert = document.getElementById('formSuccessAlert');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Remitiendo al Despacho...';

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        contactForm.reset();

        if (formSuccessAlert) {
          formSuccessAlert.style.display = 'block';
          setTimeout(() => {
            formSuccessAlert.style.display = 'none';
          }, 6000);
        } else {
          alert('Pax Christi. Su solicitud ha sido enviada al Despacho Parroquial.');
        }
      }, 900);
    });
  }

  // 6. Formulario del modal de intenciones
  const modalForm = document.getElementById('modalIntentionForm');
  if (modalForm) {
    modalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Bendiciones. Su intención de Misa ha sido registrada en el libro parroquial de San Isidro.');
      modalForm.reset();
      modal.classList.remove('active');
    });
  }

  // 7. Navegación activa con scroll
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;
    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 120;
      const sectionId = current.getAttribute('id');
      const navLink = document.querySelector(`.nav-list a[href*="${sectionId}"]`);

      if (navLink) {
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          navLink.classList.add('active');
        } else {
          navLink.classList.remove('active');
        }
      }
    });
  });

  // 8. Visor de la galería fotográfica (lightbox)
  const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
  const photoLightbox = document.getElementById('photoLightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  let activePhotoIndex = 0;

  function showPhoto(index) {
    if (!galleryItems.length) return;
    activePhotoIndex = (index + galleryItems.length) % galleryItems.length;
    const item = galleryItems[activePhotoIndex];
    const img = item.querySelector('img');
    if (!img) return;
    lightboxImage.src = item.dataset.full || img.src;
    lightboxImage.alt = img.alt;
    lightboxCaption.textContent = item.dataset.caption || '';
  }

  function openLightbox(index) {
    if (!photoLightbox) return;
    showPhoto(index);
    photoLightbox.classList.add('active');
    photoLightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    if (lightboxClose) lightboxClose.focus();
  }

  function closeLightbox() {
    if (!photoLightbox) return;
    photoLightbox.classList.remove('active');
    photoLightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
  }

  if (photoLightbox && lightboxImage && galleryItems.length) {
    galleryItems.forEach((item, index) => {
      item.addEventListener('click', () => openLightbox(index));
    });

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', () => showPhoto(activePhotoIndex - 1));
    if (lightboxNext) lightboxNext.addEventListener('click', () => showPhoto(activePhotoIndex + 1));

    photoLightbox.addEventListener('click', (e) => {
      if (e.target === photoLightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (!photoLightbox.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showPhoto(activePhotoIndex - 1);
      if (e.key === 'ArrowRight') showPhoto(activePhotoIndex + 1);
    });
  }
});
