// Emil Shipping - Main JavaScript

// Global variables
let currentSlide = 0;
const slides = [];

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeNavigation();
  initializeHeroCarousel();
  initializeVideoAutoplay();
  initializeTrackingForm();
  initializeContactForm();
  initializeChatWidget();
  initializeLanguageSelector();
});

// Navigation functionality
function initializeNavigation() {
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function() {
      navMenu.classList.toggle('active');
    });

    // Close menu when clicking on a link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        navMenu.classList.remove('active');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('active');
      }
    });
  }
}

// Hero carousel functionality
function initializeHeroCarousel() {
  const carousel = document.querySelector('.hero-carousel');
  if (!carousel) return;

  // Create slides with cargo airplane images
  const heroImages = [
    'https://images.pexels.com/photos/2226458/pexels-photo-2226458.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop',
    'https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop',
    'https://images.pexels.com/photos/906494/pexels-photo-906494.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop',
    'https://images.pexels.com/photos/1117210/pexels-photo-1117210.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop'
  ];

  heroImages.forEach((image, index) => {
    const slide = document.createElement('div');
    slide.className = `hero-slide ${index === 0 ? 'active' : ''}`;
    slide.style.backgroundImage = `url(${image})`;
    carousel.appendChild(slide);
    slides.push(slide);
  });

  // Auto-advance slides
  setInterval(nextSlide, 5000);
}

function nextSlide() {
  if (slides.length === 0) return;

  slides[currentSlide].classList.remove('active');
  currentSlide = (currentSlide + 1) % slides.length;
  slides[currentSlide].classList.add('active');
}

// Video autoplay on scroll
function initializeVideoAutoplay() {
  const videoContainer = document.querySelector('.video-container');
  if (!videoContainer) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const iframe = entry.target.querySelector('iframe');
      if (iframe) {
        if (entry.isIntersecting) {
          // Add autoplay parameter to Vimeo URL
          const src = iframe.src;
          if (src && !src.includes('autoplay=1')) {
            iframe.src = src + (src.includes('?') ? '&' : '?') + 'autoplay=1';
          }
        }
      }
    });
  }, { threshold: 0.5 });

  observer.observe(videoContainer);
}

// Tracking form functionality
function initializeTrackingForm() {
  const trackingForm = document.getElementById('trackingForm');
  if (!trackingForm) return;

  trackingForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const trackingId = document.getElementById('trackingId').value.trim();
    if (!trackingId) {
      showAlert('Please enter a tracking ID', 'error');
      return;
    }

    await trackPackage(trackingId);
  });

  // Check for tracking ID in URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const trackingId = urlParams.get('id');
  if (trackingId) {
    document.getElementById('trackingId').value = trackingId;
    trackPackage(trackingId);
  }
}

// Track package function
async function trackPackage(trackingId) {
  const resultsDiv = document.getElementById('trackingResults');
  const loadingDiv = document.getElementById('trackingLoading');
  
  if (loadingDiv) loadingDiv.style.display = 'block';
  if (resultsDiv) resultsDiv.innerHTML = '';

  try {
    const response = await fetch(`/api/tracking/${trackingId}`);
    const data = await response.json();

    if (loadingDiv) loadingDiv.style.display = 'none';

    if (response.ok) {
      displayTrackingResults(data);
    } else {
      showAlert(data.error || 'Package not found', 'error');
    }
  } catch (error) {
    if (loadingDiv) loadingDiv.style.display = 'none';
    showAlert('Error fetching tracking information', 'error');
    console.error('Tracking error:', error);
  }
}

// Display tracking results
function displayTrackingResults(data) {
  const resultsDiv = document.getElementById('trackingResults');
  if (!resultsDiv) return;

  const html = `
    <div class="tracking-info">
      <div class="card">
        <div class="card-header">
          <h3>Package Information</h3>
        </div>
        <div class="card-body">
          <div class="grid grid-2">
            <div>
              <p><strong>Tracking ID:</strong> ${data.id}</p>
              <p><strong>Current Status:</strong> 
                <span class="package-status status-${getStatusClass(data.status)}">
                  ${data.status}
                </span>
              </p>
            </div>
            <div>
              ${data.senderName ? `<p><strong>Sender:</strong> ${data.senderName}</p>` : ''}
              <p><strong>Recipient:</strong> ${data.receiverName}</p>
              <p><strong>From:</strong> ${data.origin}</p>
              <p><strong>To:</strong> ${data.destination}</p>
              <p><strong>Created:</strong> ${formatDate(data.createdAt)}</p>
              <p><strong>Last Updated:</strong> ${formatDate(data.updatedAt)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="timeline-container">
      <h3>Shipment Timeline</h3>
      <div class="timeline">
        ${(data.locationHistory || []).map((item, index) => `
          <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="timeline-status">${item.location}</div>
              <div class="timeline-date">${formatDate(item.timestamp)}</div>
              ${item.description ? `<div class="timeline-note">${item.description}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  resultsDiv.innerHTML = html;
  resultsDiv.style.display = 'block';
}

// Contact form functionality
function initializeContactForm() {
  const contactForm = document.getElementById('contactForm');
  if (!contactForm) return;

  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(contactForm);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      message: formData.get('message')
    };

    // Simulate form submission (replace with actual endpoint)
    try {
      showAlert('Thank you for your message! We will get back to you soon.', 'success');
      contactForm.reset();
    } catch (error) {
      showAlert('Error sending message. Please try again.', 'error');
    }
  });
}

// Chat widget initialization (only on homepage)
function initializeChatWidget() {
  // Only load JivoChat on the homepage
  const isHomepage = window.location.pathname === '/' || window.location.pathname === '/index.html';
  
  if (!isHomepage) {
    return; // Exit if not on homepage
  }
  
  // JivoChat integration
  (function(){
    var script = document.createElement("script");
    script.src = "//code.jivosite.com/widget/wfHe17HJfc";
    script.async = true;
    document.head.appendChild(script);
  })();
}

// Utility functions
function showAlert(message, type = 'info') {
  // Remove existing alerts
  const existingAlerts = document.querySelectorAll('.alert');
  existingAlerts.forEach(alert => alert.remove());

  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;

  // Insert at the top of the main content
  const main = document.querySelector('main') || document.body;
  main.insertBefore(alert, main.firstChild);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    alert.remove();
  }, 5000);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusClass(status) {
  if (!status) return 'created';
  const statusLower = status.toLowerCase();
  if (statusLower.includes('delivered')) return 'delivered';
  if (statusLower.includes('transit') || statusLower.includes('shipping')) return 'transit';
  return 'created';
}

// Smooth scrolling for anchor links
document.addEventListener('click', function(e) {
  if (e.target.matches('a[href^="#"]')) {
    e.preventDefault();
    const target = document.querySelector(e.target.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }
});

// Form validation helpers
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateTrackingId(trackingId) {
  // ESP-XXXXXXXXXXXX format
  const re = /^ESP-[A-Z0-9]{12}$/;
  return re.test(trackingId.toUpperCase());
}

// Language switching functionality
const translations = {
  en: {
    // Navigation
    nav_home: "Home",
    nav_services: "Services",
    nav_gallery: "Gallery",
    nav_track_package: "Track Package",
    nav_contact: "Contact",
    nav_sign_in: "Sign In",
    
    // Hero Section
    hero_title: "Global Shipping Solutions",
    hero_subtitle: "Reliable freight forwarding and logistics services worldwide",
    get_quote: "Get Quote",
    track_package: "Track Your Package",
    track_your_package: "Track Your Package",
    enter_tracking_number: "Enter your tracking number",
    enter_tracking_id: "Enter your tracking ID (e.g., ESP-ABC123456789)",
    track_button: "Track",
    track_now: "Track Now",
    searching_package: "Searching for your package...",
    
    // About Section
    global_freight_solutions: "Global Freight Solutions",
    reliable_fast_secure: "Reliable, fast, and secure shipping services worldwide. Track your packages in real-time with Emil Shipping.",
    about_emil_shipping: "About Emil Shipping",
    trusted_logistics_partner: "Your Trusted Logistics Partner",
    about_description_1: "With over two decades of experience in freight forwarding and logistics, Emil Shipping has established itself as a leader in global shipping solutions. We pride ourselves on delivering exceptional service, reliability, and innovation in every shipment.",
    about_description_2: "Our comprehensive network spans across continents, ensuring your cargo reaches its destination safely and on time. From small packages to large freight, we handle it all with the utmost care and professionalism.",
    global_network: "Global Network",
    worldwide_coverage: "Worldwide coverage",
    support_24_7: "24/7 Support",
    round_the_clock_service: "Round-the-clock service",
    secure_shipping: "Secure Shipping",
    safe_and_reliable: "Safe and reliable",
    video_description: "Watch our company overview and see how we handle your shipments with care.",
    
    // Services Section
    our_services: "Our Services",
    air_freight: "Air Freight",
    air_freight_description: "Fast and reliable air cargo services for time-sensitive shipments worldwide.",
    ocean_freight: "Ocean Freight",
    ocean_freight_description: "Cost-effective sea freight solutions for large volume shipments and containers.",
    ground_transport: "Ground Transport",
    ground_transport_description: "Comprehensive land transportation services including trucking and rail freight.",
    learn_more: "Learn More",
    view_all_services: "View All Services",
    
    // Why Choose Us Section
    why_choose_us: "Why Choose Emil Shipping?",
    real_time_tracking: "Real-Time Tracking",
    real_time_tracking_description: "Monitor your shipments 24/7 with our advanced tracking system. Get instant updates on your package location and delivery status.",
    expert_team: "Expert Team",
    expert_team_description: "Our experienced logistics professionals ensure your cargo is handled with expertise and care from pickup to delivery.",
    competitive_rates: "Competitive Rates",
    competitive_rates_description: "Get the best value for your shipping needs with our competitive pricing and transparent fee structure.",
    support_24_7_feature: "24/7 Support",
    support_24_7_description: "Our customer support team is available around the clock to assist you with any questions or concerns.",
    
    // Call to Action
    ready_to_ship: "Ready to Ship with Emil Shipping?",
    cta_description: "Get started today and experience the difference of professional freight forwarding services.",
    
    // Footer
    footer_description: "Your trusted partner for global freight forwarding and logistics solutions. Delivering excellence since 2000.",
    footer_quick_links: "Quick Links",
    footer_contact_us: "Contact Us",
    footer_services: "Services",
    footer_warehousing: "Warehousing",
    footer_customs_clearance: "Customs Clearance",
    footer_contact_info: "Contact Info",
    footer_address: "123 Shipping Lane, Port City, PC 12345",
    footer_support_hours: "24/7 Customer Support",
    footer_copyright: "© 2024 Emil Shipping. All rights reserved. | Privacy Policy | Terms of Service",
    
    // Language
    select_language: "Select Language"
  },
  es: {
    // Navigation
    nav_home: "Inicio",
    nav_services: "Servicios",
    nav_gallery: "Galería",
    nav_track_package: "Rastrear Paquete",
    nav_contact: "Contacto",
    nav_sign_in: "Iniciar Sesión",
    
    // Hero Section
    hero_title: "Soluciones de Envío Global",
    hero_subtitle: "Servicios confiables de transporte de carga y logística en todo el mundo",
    get_quote: "Obtener Cotización",
    track_package: "Rastrear Tu Paquete",
    track_your_package: "Rastrea tu Paquete",
    enter_tracking_number: "Ingresa tu número de seguimiento",
    enter_tracking_id: "Ingresa tu ID de rastreo (ej., ESP-ABC123456789)",
    track_button: "Rastrear",
    track_now: "Rastrear Ahora",
    searching_package: "Buscando tu paquete...",
    
    // About Section
    global_freight_solutions: "Soluciones Globales de Carga",
    reliable_fast_secure: "Servicios de envío confiables, rápidos y seguros en todo el mundo. Rastrea tus paquetes en tiempo real con Emil Shipping.",
    about_emil_shipping: "Acerca de Emil Shipping",
    trusted_logistics_partner: "Su Socio Logístico de Confianza",
    about_description_1: "Con más de dos décadas de experiencia en transporte de carga y logística, Emil Shipping se ha establecido como líder en soluciones de envío global. Nos enorgullecemos de brindar un servicio excepcional, confiabilidad e innovación en cada envío.",
    about_description_2: "Nuestra red integral se extiende por continentes, asegurando que tu carga llegue a su destino de manera segura y a tiempo. Desde paquetes pequeños hasta carga grande, manejamos todo con el máximo cuidado y profesionalismo.",
    global_network: "Red Global",
    worldwide_coverage: "Cobertura mundial",
    support_24_7: "Soporte 24/7",
    round_the_clock_service: "Servicio las 24 horas",
    secure_shipping: "Envío Seguro",
    safe_and_reliable: "Seguro y confiable",
    video_description: "Mira nuestro resumen de la empresa y ve cómo manejamos tus envíos con cuidado.",
    
    // Services Section
    our_services: "Nuestros Servicios",
    air_freight: "Carga Aérea",
    air_freight_description: "Servicios de carga aérea rápidos y confiables para envíos urgentes en todo el mundo.",
    ocean_freight: "Carga Marítima",
    ocean_freight_description: "Soluciones de carga marítima rentables para envíos de gran volumen y contenedores.",
    ground_transport: "Transporte Terrestre",
    ground_transport_description: "Servicios integrales de transporte terrestre incluyendo camiones y carga ferroviaria.",
    learn_more: "Saber Más",
    view_all_services: "Ver Todos los Servicios",
    
    // Why Choose Us Section
    why_choose_us: "¿Por Qué Elegir Emil Shipping?",
    real_time_tracking: "Rastreo en Tiempo Real",
    real_time_tracking_description: "Monitorea tus envíos 24/7 con nuestro sistema de seguimiento avanzado. Obtén actualizaciones instantáneas sobre la ubicación de tu paquete y el estado de entrega.",
    expert_team: "Equipo Experto",
    expert_team_description: "Nuestros profesionales logísticos experimentados aseguran que tu carga sea manejada con experiencia y cuidado desde la recogida hasta la entrega.",
    competitive_rates: "Tarifas Competitivas",
    competitive_rates_description: "Obtén el mejor valor para tus necesidades de envío con nuestros precios competitivos y estructura de tarifas transparente.",
    support_24_7_feature: "Soporte 24/7",
    support_24_7_description: "Nuestro equipo de atención al cliente está disponible las 24 horas para ayudarte con cualquier pregunta o inquietud.",
    
    // Call to Action
    ready_to_ship: "¿Listo para Enviar con Emil Shipping?",
    cta_description: "Comienza hoy y experimenta la diferencia de los servicios profesionales de transporte de carga.",
    
    // Footer
    footer_description: "Tu socio de confianza para soluciones globales de transporte de carga y logística. Brindando excelencia desde 2000.",
    footer_quick_links: "Enlaces Rápidos",
    footer_contact_us: "Contáctanos",
    footer_services: "Servicios",
    footer_warehousing: "Almacenamiento",
    footer_customs_clearance: "Despacho Aduanero",
    footer_contact_info: "Información de Contacto",
    footer_address: "123 Shipping Lane, Port City, PC 12345",
    footer_support_hours: "Atención al Cliente 24/7",
    footer_copyright: "© 2024 Emil Shipping. Todos los derechos reservados. | Política de Privacidad | Términos de Servicio",
    
    // Language
    select_language: "Seleccionar Idioma"
  },
  fr: {
    // Navigation
    nav_home: "Accueil",
    nav_services: "Services",
    nav_gallery: "Galerie",
    nav_track_package: "Suivre Colis",
    nav_contact: "Contact",
    nav_sign_in: "Se Connecter",
    
    // Hero Section
    hero_title: "Solutions d'Expédition Mondiale",
    hero_subtitle: "Services fiables de transport de fret et de logistique dans le monde entier",
    get_quote: "Obtenir un Devis",
    track_package: "Suivre Colis",
    track_your_package: "Suivez votre Colis",
    enter_tracking_number: "Entrez votre numéro de suivi",
    enter_tracking_id: "Entrez votre ID de suivi (ex., ESP-ABC123456789)",
    track_button: "Suivre",
    track_now: "Suivre Maintenant",
    searching_package: "Recherche de votre colis...",
    
    // About Section
    global_freight_solutions: "Solutions de Fret Mondiales",
    reliable_fast_secure: "Services d'expédition fiables, rapides et sécurisés dans le monde entier. Suivez vos colis en temps réel avec Emil Shipping.",
    about_emil_shipping: "À Propos d'Emil Shipping",
    trusted_logistics_partner: "Votre Partenaire Logistique de Confiance",
    about_description_1: "Avec plus de deux décennies d'expérience dans le transport de fret et la logistique, Emil Shipping s'est établi comme un leader dans les solutions d'expédition mondiales. Nous sommes fiers de fournir un service exceptionnel, une fiabilité et une innovation dans chaque expédition.",
    about_description_2: "Notre réseau complet s'étend sur les continents, garantissant que votre cargaison atteigne sa destination en toute sécurité et à temps. Des petits colis aux gros frets, nous gérons tout avec le plus grand soin et professionnalisme.",
    global_network: "Réseau Mondial",
    worldwide_coverage: "Couverture mondiale",
    support_24_7: "Support 24/7",
    round_the_clock_service: "Service 24h/24",
    secure_shipping: "Expédition Sécurisée",
    safe_and_reliable: "Sûr et fiable",
    video_description: "Regardez notre aperçu de l'entreprise et voyez comment nous gérons vos expéditions avec soin.",
    
    // Services Section
    our_services: "Nos Services",
    air_freight: "Fret Aérien",
    air_freight_description: "Services de fret aérien rapides et fiables pour les expéditions urgentes dans le monde entier.",
    ocean_freight: "Fret Maritime",
    ocean_freight_description: "Solutions de fret maritime rentables pour les expéditions de gros volume et les conteneurs.",
    ground_transport: "Transport Terrestre",
    ground_transport_description: "Services de transport terrestre complets incluant le camionnage et le fret ferroviaire.",
    learn_more: "En Savoir Plus",
    view_all_services: "Voir Tous les Services",
    
    // Why Choose Us Section
    why_choose_us: "Pourquoi Choisir Emil Shipping?",
    real_time_tracking: "Suivi en Temps Réel",
    real_time_tracking_description: "Surveillez vos expéditions 24/7 avec notre système de suivi avancé. Obtenez des mises à jour instantanées sur l'emplacement de votre colis et le statut de livraison.",
    expert_team: "Équipe d'Experts",
    expert_team_description: "Nos professionnels de la logistique expérimentés s'assurent que votre cargaison est manipulée avec expertise et soin de l'enlèvement à la livraison.",
    competitive_rates: "Tarifs Compétitifs",
    competitive_rates_description: "Obtenez la meilleure valeur pour vos besoins d'expédition avec nos prix compétitifs et notre structure de frais transparente.",
    support_24_7_feature: "Support 24/7",
    support_24_7_description: "Notre équipe de support client est disponible 24h/24 pour vous aider avec toute question ou préoccupation.",
    
    // Call to Action
    ready_to_ship: "Prêt à Expédier avec Emil Shipping?",
    cta_description: "Commencez aujourd'hui et découvrez la différence des services professionnels de transport de fret.",
    
    // Footer
    footer_description: "Votre partenaire de confiance pour les solutions mondiales de transport de fret et de logistique. Excellence depuis 2000.",
    footer_quick_links: "Liens Rapides",
    footer_contact_us: "Nous Contacter",
    footer_services: "Services",
    footer_warehousing: "Entreposage",
    footer_customs_clearance: "Dédouanement",
    footer_contact_info: "Informations de Contact",
    footer_address: "123 Shipping Lane, Port City, PC 12345",
    footer_support_hours: "Support Client 24/7",
    footer_copyright: "© 2024 Emil Shipping. Tous droits réservés. | Politique de Confidentialité | Conditions de Service",
    
    // Language
    select_language: "Sélectionner la Langue"
  },
  de: {
    // Navigation
    nav_home: "Startseite",
    nav_services: "Dienstleistungen",
    nav_gallery: "Galerie",
    nav_track_package: "Paket Verfolgen",
    nav_contact: "Kontakt",
    nav_sign_in: "Anmelden",
    
    // Hero Section
    hero_title: "Globale Versandlösungen",
    hero_subtitle: "Zuverlässige Frachtspedition und Logistikdienstleistungen weltweit",
    get_quote: "Angebot Erhalten",
    track_package: "Paket Verfolgen",
    track_your_package: "Ihr Paket Verfolgen",
    enter_tracking_number: "Geben Sie Ihre Sendungsnummer ein",
    enter_tracking_id: "Geben Sie Ihre Tracking-ID ein (z.B., ESP-ABC123456789)",
    track_button: "Verfolgen",
    track_now: "Jetzt Verfolgen",
    searching_package: "Suche nach Ihrem Paket...",
    
    // About Section
    global_freight_solutions: "Globale Frachtlösungen",
    reliable_fast_secure: "Zuverlässige, schnelle und sichere Versanddienstleistungen weltweit. Verfolgen Sie Ihre Pakete in Echtzeit mit Emil Shipping.",
    about_emil_shipping: "Über Emil Shipping",
    trusted_logistics_partner: "Ihr Vertrauensvoller Logistikpartner",
    about_description_1: "Mit über zwei Jahrzehnten Erfahrung in der Frachtspedition und Logistik hat sich Emil Shipping als Marktführer für globale Versandlösungen etabliert. Wir sind stolz darauf, außergewöhnlichen Service, Zuverlässigkeit und Innovation bei jeder Sendung zu bieten.",
    about_description_2: "Unser umfassendes Netzwerk erstreckt sich über Kontinente und stellt sicher, dass Ihre Fracht sicher und pünktlich ihr Ziel erreicht. Von kleinen Paketen bis hin zu großer Fracht handhaben wir alles mit größter Sorgfalt und Professionalität.",
    global_network: "Globales Netzwerk",
    worldwide_coverage: "Weltweite Abdeckung",
    support_24_7: "24/7 Support",
    round_the_clock_service: "Rund-um-die-Uhr-Service",
    secure_shipping: "Sicherer Versand",
    safe_and_reliable: "Sicher und zuverlässig",
    video_description: "Schauen Sie sich unsere Firmenübersicht an und sehen Sie, wie wir Ihre Sendungen mit Sorgfalt behandeln.",
    
    // Services Section
    our_services: "Unsere Dienstleistungen",
    air_freight: "Luftfracht",
    air_freight_description: "Schnelle und zuverlässige Luftfrachtdienste für zeitkritische Sendungen weltweit.",
    ocean_freight: "Seefracht",
    ocean_freight_description: "Kostengünstige Seefrachtlösungen für große Volumen und Container.",
    ground_transport: "Bodentransport",
    ground_transport_description: "Umfassende Landtransportdienste einschließlich LKW- und Schienenfracht.",
    learn_more: "Mehr Erfahren",
    view_all_services: "Alle Dienstleistungen Anzeigen",
    
    // Why Choose Us Section
    why_choose_us: "Warum Emil Shipping Wählen?",
    real_time_tracking: "Echtzeit-Verfolgung",
    real_time_tracking_description: "Überwachen Sie Ihre Sendungen 24/7 mit unserem fortschrittlichen Tracking-System. Erhalten Sie sofortige Updates über den Standort Ihres Pakets und den Lieferstatus.",
    expert_team: "Expertenteam",
    expert_team_description: "Unsere erfahrenen Logistikprofis stellen sicher, dass Ihre Fracht mit Expertise und Sorgfalt von der Abholung bis zur Lieferung behandelt wird.",
    competitive_rates: "Wettbewerbsfähige Preise",
    competitive_rates_description: "Erhalten Sie das beste Preis-Leistungs-Verhältnis für Ihre Versandanforderungen mit unseren wettbewerbsfähigen Preisen und transparenter Gebührenstruktur.",
    support_24_7_feature: "24/7 Support",
    support_24_7_description: "Unser Kundensupport-Team steht Ihnen rund um die Uhr zur Verfügung, um Ihnen bei Fragen oder Anliegen zu helfen.",
    
    // Call to Action
    ready_to_ship: "Bereit zum Versand mit Emil Shipping?",
    cta_description: "Beginnen Sie noch heute und erleben Sie den Unterschied professioneller Frachtspeditionsdienste.",
    
    // Footer
    footer_description: "Ihr vertrauensvoller Partner für globale Frachtspedition und Logistiklösungen. Exzellenz seit 2000.",
    footer_quick_links: "Schnelllinks",
    footer_contact_us: "Kontaktieren Sie Uns",
    footer_services: "Dienstleistungen",
    footer_warehousing: "Lagerung",
    footer_customs_clearance: "Zollabfertigung",
    footer_contact_info: "Kontaktinformationen",
    footer_address: "123 Shipping Lane, Port City, PC 12345",
    footer_support_hours: "24/7 Kundensupport",
    footer_copyright: "© 2024 Emil Shipping. Alle Rechte vorbehalten. | Datenschutzrichtlinie | Nutzungsbedingungen",
    
    // Language
    select_language: "Sprache Auswählen"
  },
  
  ar: {
    // Navigation
    nav_home: "الرئيسية",
    nav_services: "الخدمات",
    nav_gallery: "المعرض",
    nav_track_package: "تتبع الطرد",
    nav_contact: "اتصل بنا",
    nav_sign_in: "تسجيل الدخول",
    
    // Hero Section
    hero_title: "حلول الشحن العالمية",
    hero_subtitle: "خدمات موثوقة لشحن البضائع واللوجستيات في جميع أنحاء العالم",
    get_quote: "احصل على عرض سعر",
    track_package: "تتبع الطرد",
    track_your_package: "تتبع طردك",
    enter_tracking_number: "أدخل رقم التتبع الخاص بك",
    track_now: "تتبع الآن",
    
    // About Section
    about_emil_shipping: "حول إميل شيبينغ",
    trusted_logistics_partner: "شريكك اللوجستي الموثوق",
    about_description_1: "مع أكثر من عقدين من الخبرة في شحن البضائع واللوجستيات، أثبتت إميل شيبينغ نفسها كرائدة في حلول الشحن العالمية. نحن فخورون بتقديم خدمة استثنائية وموثوقية وابتكار في كل شحنة.",
    about_description_2: "شبكتنا الشاملة تمتد عبر القارات، مما يضمن وصول بضائعك إلى وجهتها بأمان وفي الوقت المحدد. من الطرود الصغيرة إلى البضائع الكبيرة، نتعامل مع كل شيء بأقصى درجات العناية والمهنية.",
    global_network: "شبكة عالمية",
    worldwide_coverage: "تغطية عالمية",
    support_24_7: "دعم 24/7",
    round_the_clock_service: "خدمة على مدار الساعة",
    secure_shipping: "شحن آمن",
    safe_and_reliable: "آمن وموثوق",
    video_description: "شاهد نظرة عامة على شركتنا وانظر كيف نتعامل مع شحناتك بعناية.",
    
    // Services Section
    our_services: "خدماتنا",
    air_freight: "الشحن الجوي",
    air_freight_description: "خدمات شحن جوي سريعة وموثوقة للشحنات الحساسة للوقت في جميع أنحاء العالم.",
    ocean_freight: "الشحن البحري",
    ocean_freight_description: "حلول شحن بحري فعالة من حيث التكلفة للشحنات الكبيرة والحاويات.",
    ground_transport: "النقل البري",
    ground_transport_description: "خدمات نقل بري شاملة تشمل الشاحنات والشحن بالسكك الحديدية.",
    learn_more: "اعرف المزيد",
    view_all_services: "عرض جميع الخدمات",
    
    // Why Choose Us Section
    why_choose_us: "لماذا تختار إميل شيبينغ؟",
    real_time_tracking: "تتبع في الوقت الفعلي",
    real_time_tracking_description: "راقب شحناتك على مدار الساعة طوال أيام الأسبوع باستخدام نظام التتبع المتقدم لدينا. احصل على تحديثات فورية حول موقع طردك وحالة التسليم.",
    expert_team: "فريق خبراء",
    expert_team_description: "يضمن محترفو اللوجستيات ذوو الخبرة لدينا التعامل مع بضائعك بخبرة وعناية من الاستلام إلى التسليم.",
    competitive_rates: "أسعار تنافسية",
    competitive_rates_description: "احصل على أفضل قيمة لاحتياجات الشحن الخاصة بك مع أسعارنا التنافسية وهيكل الرسوم الشفاف.",
    support_24_7_feature: "دعم 24/7",
    support_24_7_description: "فريق دعم العملاء لدينا متاح على مدار الساعة لمساعدتك في أي أسئلة أو مخاوف.",
    
    // Call to Action
    ready_to_ship: "هل أنت مستعد للشحن مع إميل شيبينغ؟",
    cta_description: "ابدأ اليوم واختبر الفرق في خدمات شحن البضائع المهنية.",
    
    // Footer
    footer_description: "شريكك الموثوق لحلول شحن البضائع واللوجستيات العالمية. نقدم التميز منذ عام 2000.",
    footer_quick_links: "روابط سريعة",
    footer_contact_us: "اتصل بنا",
    footer_services: "الخدمات",
    footer_warehousing: "التخزين",
    footer_customs_clearance: "التخليص الجمركي",
    footer_contact_info: "معلومات الاتصال",
    footer_address: "123 Shipping Lane, Port City, PC 12345",
    footer_support_hours: "دعم العملاء 24/7",
    footer_copyright: "© 2024 إميل شيبينغ. جميع الحقوق محفوظة. | سياسة الخصوصية | شروط الخدمة",
    
    // Language
    select_language: "اختر اللغة"
  },
  
  zh: {
    // Navigation
    nav_home: "首页",
    nav_services: "服务",
    nav_gallery: "画廊",
    nav_track_package: "包裹追踪",
    nav_contact: "联系我们",
    nav_sign_in: "登录",
    
    // Hero Section
    hero_title: "全球运输解决方案",
    hero_subtitle: "全球可靠的货运代理和物流服务",
    get_quote: "获取报价",
    track_package: "包裹追踪",
    track_your_package: "追踪您的包裹",
    enter_tracking_number: "请输入您的追踪号码",
    track_now: "立即追踪",
    
    // About Section
    about_emil_shipping: "关于埃米尔运输",
    trusted_logistics_partner: "您值得信赖的物流合作伙伴",
    about_description_1: "凭借二十多年的货运代理和物流经验，埃米尔运输已确立了自己在全球运输解决方案领域的领导地位。我们为每一次运输提供卓越的服务、可靠性和创新而感到自豪。",
    about_description_2: "我们的综合网络遍布各大洲，确保您的货物安全准时到达目的地。从小包裹到大型货物，我们以最大的关怀和专业精神处理一切。",
    global_network: "全球网络",
    worldwide_coverage: "全球覆盖",
    support_24_7: "24/7支持",
    round_the_clock_service: "全天候服务",
    secure_shipping: "安全运输",
    safe_and_reliable: "安全可靠",
    video_description: "观看我们的公司概览，了解我们如何用心处理您的货物。",
    
    // Services Section
    our_services: "我们的服务",
    air_freight: "空运",
    air_freight_description: "为全球时间敏感的货物提供快速可靠的空运服务。",
    ocean_freight: "海运",
    ocean_freight_description: "为大批量货物和集装箱提供经济高效的海运解决方案。",
    ground_transport: "陆运",
    ground_transport_description: "包括卡车运输和铁路货运在内的综合陆运服务。",
    learn_more: "了解更多",
    view_all_services: "查看所有服务",
    
    // Why Choose Us Section
    why_choose_us: "为什么选择埃米尔运输？",
    real_time_tracking: "实时追踪",
    real_time_tracking_description: "使用我们先进的追踪系统24/7监控您的货物。获取包裹位置和配送状态的即时更新。",
    expert_team: "专家团队",
    expert_team_description: "我们经验丰富的物流专业人员确保您的货物从取件到配送都得到专业和细心的处理。",
    competitive_rates: "竞争性价格",
    competitive_rates_description: "通过我们的竞争性价格和透明的费用结构，为您的运输需求获得最佳价值。",
    support_24_7_feature: "24/7支持",
    support_24_7_description: "我们的客户支持团队全天候为您提供服务，协助解决任何问题或疑虑。",
    
    // Call to Action
    ready_to_ship: "准备好与埃米尔运输一起发货了吗？",
    cta_description: "今天就开始，体验专业货运代理服务的不同之处。",
    
    // Footer
    footer_description: "您值得信赖的全球货运代理和物流解决方案合作伙伴。自2000年以来提供卓越服务。",
    footer_quick_links: "快速链接",
    footer_contact_us: "联系我们",
    footer_services: "服务",
    footer_warehousing: "仓储",
    footer_customs_clearance: "清关",
    footer_contact_info: "联系信息",
    footer_address: "123 Shipping Lane, Port City, PC 12345",
    footer_support_hours: "24/7客户支持",
    footer_copyright: "© 2024 埃米尔运输。保留所有权利。| 隐私政策 | 服务条款",
    
    // Language
    select_language: "选择语言"
  },
  
  pt: {
    // Navigation
    nav_home: "Início",
    nav_services: "Serviços",
    nav_gallery: "Galeria",
    nav_track_package: "Rastrear Encomenda",
    nav_contact: "Contato",
    nav_sign_in: "Entrar",
    
    // Hero Section
    hero_title: "Soluções de Transporte Global",
    hero_subtitle: "Serviços confiáveis de frete e logística em todo o mundo",
    get_quote: "Obter Cotação",
    track_package: "Rastrear Encomenda",
    track_your_package: "Rastreie sua Encomenda",
    enter_tracking_number: "Digite seu número de rastreamento",
    track_now: "Rastrear Agora",
    
    // About Section
    about_emil_shipping: "Sobre a Emil Shipping",
    trusted_logistics_partner: "Seu Parceiro Logístico de Confiança",
    about_description_1: "Com mais de duas décadas de experiência em frete e logística, a Emil Shipping estabeleceu-se como líder em soluções de transporte global. Orgulhamo-nos de fornecer excelência, confiabilidade e inovação em cada remessa.",
    about_description_2: "Nossa rede abrangente se estende por continentes, garantindo que sua carga chegue ao destino com segurança e pontualidade. De pequenos pacotes a grandes cargas, tratamos tudo com o máximo cuidado e profissionalismo.",
    global_network: "Rede Global",
    worldwide_coverage: "Cobertura mundial",
    support_24_7: "Suporte 24/7",
    round_the_clock_service: "Serviço 24 horas",
    secure_shipping: "Envio Seguro",
    safe_and_reliable: "Seguro e confiável",
    video_description: "Assista à nossa visão geral da empresa e veja como cuidamos da sua carga com dedicação.",
    
    // Services Section
    our_services: "Nossos Serviços",
    air_freight: "Frete Aéreo",
    air_freight_description: "Serviços de frete aéreo rápidos e confiáveis para cargas sensíveis ao tempo em todo o mundo.",
    ocean_freight: "Frete Marítimo",
    ocean_freight_description: "Soluções de frete marítimo econômicas para cargas de grande volume e contêineres.",
    ground_transport: "Transporte Terrestre",
    ground_transport_description: "Serviços abrangentes de transporte terrestre, incluindo transporte rodoviário e ferroviário.",
    learn_more: "Saiba Mais",
    view_all_services: "Ver Todos os Serviços",
    
    // Why Choose Us Section
    why_choose_us: "Por que Escolher a Emil Shipping?",
    real_time_tracking: "Rastreamento em Tempo Real",
    real_time_tracking_description: "Monitore sua carga 24/7 com nosso sistema de rastreamento avançado. Receba atualizações instantâneas sobre a localização e status de entrega do seu pacote.",
    expert_team: "Equipe Especializada",
    expert_team_description: "Nossos profissionais experientes em logística garantem que sua carga seja manuseada com expertise e cuidado desde a coleta até a entrega.",
    competitive_rates: "Tarifas Competitivas",
    competitive_rates_description: "Obtenha o melhor valor para suas necessidades de envio com nossas tarifas competitivas e estrutura de preços transparente.",
    support_24_7_feature: "Suporte 24/7",
    support_24_7_description: "Nossa equipe de atendimento ao cliente está disponível 24 horas por dia para ajudá-lo com qualquer dúvida ou preocupação.",
    
    // Call to Action
    ready_to_ship: "Pronto para Enviar com a Emil Shipping?",
    cta_description: "Comece hoje e experimente a diferença do serviço profissional de frete.",
    
    // Footer
    footer_description: "Seu parceiro confiável para soluções globais de frete e logística. Fornecendo excelência desde 2000.",
    footer_quick_links: "Links Rápidos",
    footer_contact_us: "Fale Conosco",
    footer_services: "Serviços",
    footer_warehousing: "Armazenagem",
    footer_customs_clearance: "Desembaraço Aduaneiro",
    footer_contact_info: "Informações de Contato",
    footer_address: "123 Shipping Lane, Port City, PC 12345",
    footer_support_hours: "Suporte ao Cliente 24/7",
    footer_copyright: "© 2024 Emil Shipping. Todos os direitos reservados. | Política de Privacidade | Termos de Serviço",
    
    // Language
    select_language: "Selecionar Idioma"
  },
  
  it: {
    // Navigation
    nav_home: "Home",
    nav_services: "Servizi",
    nav_gallery: "Galleria",
    nav_track_package: "Traccia Pacco",
    nav_contact: "Contatti",
    nav_sign_in: "Accedi",
    
    // Hero Section
    hero_title: "Soluzioni di Trasporto Globali",
    hero_subtitle: "Servizi affidabili di spedizione e logistica in tutto il mondo",
    get_quote: "Ottieni Preventivo",
    track_package: "Traccia Pacco",
    track_your_package: "Traccia il Tuo Pacco",
    enter_tracking_number: "Inserisci il tuo numero di tracciamento",
    track_now: "Traccia Ora",
    
    // About Section
    about_emil_shipping: "Chi è Emil Shipping",
    trusted_logistics_partner: "Il Tuo Partner Logistico di Fiducia",
    about_description_1: "Con oltre due decenni di esperienza nel settore delle spedizioni e della logistica, Emil Shipping si è affermata come leader nelle soluzioni di trasporto globali. Siamo orgogliosi di offrire eccellenza, affidabilità e innovazione in ogni spedizione.",
    about_description_2: "La nostra rete completa si estende attraverso i continenti, garantendo che il tuo carico arrivi a destinazione in modo sicuro e puntuale. Dai piccoli pacchi ai grandi carichi, gestiamo tutto con la massima cura e professionalità.",
    global_network: "Rete Globale",
    worldwide_coverage: "Copertura mondiale",
    support_24_7: "Supporto 24/7",
    round_the_clock_service: "Servizio 24 ore su 24",
    secure_shipping: "Spedizione Sicura",
    safe_and_reliable: "Sicuro e affidabile",
    video_description: "Guarda la panoramica della nostra azienda e scopri come ci prendiamo cura del tuo carico con dedizione.",
    
    // Services Section
    our_services: "I Nostri Servizi",
    air_freight: "Trasporto Aereo",
    air_freight_description: "Servizi di trasporto aereo veloci e affidabili per merci urgenti in tutto il mondo.",
    ocean_freight: "Trasporto Marittimo",
    ocean_freight_description: "Soluzioni di trasporto marittimo economiche per carichi di grandi volumi e container.",
    ground_transport: "Trasporto Terrestre",
    ground_transport_description: "Servizi completi di trasporto terrestre, inclusi trasporti su strada e ferroviari.",
    learn_more: "Scopri di Più",
    view_all_services: "Visualizza Tutti i Servizi",
    
    // Why Choose Us Section
    why_choose_us: "Perché Scegliere Emil Shipping?",
    real_time_tracking: "Tracciamento in Tempo Reale",
    real_time_tracking_description: "Monitora il tuo carico 24/7 con il nostro sistema di tracciamento avanzato. Ricevi aggiornamenti istantanei sulla posizione e lo stato di consegna del tuo pacco.",
    expert_team: "Team di Esperti",
    expert_team_description: "I nostri professionisti esperti in logistica assicurano che il tuo carico sia gestito con competenza e cura dal ritiro alla consegna.",
    competitive_rates: "Tariffe Competitive",
    competitive_rates_description: "Ottieni il miglior valore per le tue esigenze di spedizione con le nostre tariffe competitive e la struttura di prezzi trasparente.",
    support_24_7_feature: "Supporto 24/7",
    support_24_7_description: "Il nostro team di assistenza clienti è disponibile 24 ore su 24 per aiutarti con qualsiasi domanda o preoccupazione.",
    
    // Call to Action
    ready_to_ship: "Pronto a Spedire con Emil Shipping?",
    cta_description: "Inizia oggi e sperimenta la differenza del servizio professionale di spedizione.",
    
    // Footer
    footer_description: "Il tuo partner fidato per soluzioni globali di spedizione e logistica. Offrendo eccellenza dal 2000.",
    footer_quick_links: "Link Rapidi",
    footer_contact_us: "Contattaci",
    footer_services: "Servizi",
    footer_warehousing: "Magazzinaggio",
    footer_customs_clearance: "Sdoganamento",
    footer_contact_info: "Informazioni di Contatto",
    footer_address: "123 Shipping Lane, Port City, PC 12345",
    footer_support_hours: "Assistenza Clienti 24/7",
    footer_copyright: "© 2024 Emil Shipping. Tutti i diritti riservati. | Informativa sulla Privacy | Termini di Servizio",
    
    // Language
    select_language: "Seleziona Lingua"
  },
  
  ja: {
    // Navigation
    nav_home: "ホーム",
    nav_services: "サービス",
    nav_gallery: "ギャラリー",
    nav_track_package: "荷物追跡",
    nav_contact: "お問い合わせ",
    nav_sign_in: "サインイン",
    
    // Hero Section
    hero_title: "グローバル輸送ソリューション",
    hero_subtitle: "世界中で信頼できる貨物輸送・物流サービス",
    get_quote: "見積もり取得",
    track_package: "荷物追跡",
    track_your_package: "荷物を追跡する",
    enter_tracking_number: "追跡番号を入力してください",
    track_now: "今すぐ追跡",
    
    // About Section
    about_emil_shipping: "エミル・シッピングについて",
    trusted_logistics_partner: "信頼できる物流パートナー",
    about_description_1: "20年以上の貨物輸送・物流経験を持つエミル・シッピングは、グローバル輸送ソリューションのリーダーとしての地位を確立しています。私たちは、すべての輸送において卓越性、信頼性、革新性を提供することを誇りに思っています。",
    about_description_2: "私たちの包括的なネットワークは大陸にまたがり、お客様の貨物が安全かつ時間通りに目的地に到着することを保証します。小さな荷物から大きな貨物まで、私たちは最大限の注意と専門性をもってすべてを取り扱います。",
    global_network: "グローバルネットワーク",
    worldwide_coverage: "世界規模のカバレッジ",
    support_24_7: "24時間365日サポート",
    round_the_clock_service: "24時間体制のサービス",
    secure_shipping: "安全な配送",
    safe_and_reliable: "安全で信頼性の高い",
    video_description: "私たちの会社概要をご覧いただき、私たちがいかに献身的にお客様の貨物をお世話しているかをご確認ください。",
    
    // Services Section
    our_services: "私たちのサービス",
    air_freight: "航空貨物",
    air_freight_description: "世界中の時間に敏感な貨物のための迅速で信頼性の高い航空貨物サービス。",
    ocean_freight: "海上貨物",
    ocean_freight_description: "大容量貨物とコンテナのための費用対効果の高い海上貨物ソリューション。",
    ground_transport: "陸上輸送",
    ground_transport_description: "トラック輸送と鉄道貨物を含む包括的な陸上輸送サービス。",
    learn_more: "詳細を見る",
    view_all_services: "すべてのサービスを見る",
    
    // Why Choose Us Section
    why_choose_us: "なぜエミル・シッピングを選ぶのか？",
    real_time_tracking: "リアルタイム追跡",
    real_time_tracking_description: "私たちの高度な追跡システムで24時間365日貨物を監視します。荷物の位置と配送状況の即座の更新を受け取ります。",
    expert_team: "専門チーム",
    expert_team_description: "私たちの経験豊富な物流専門家が、集荷から配送まで専門知識と注意深さで貨物を取り扱うことを保証します。",
    competitive_rates: "競争力のある料金",
    competitive_rates_description: "競争力のある料金と透明な価格構造で、配送ニーズに最高の価値を提供します。",
    support_24_7_feature: "24時間365日サポート",
    support_24_7_description: "私たちのカスタマーサポートチームは24時間体制で、あらゆる質問や懸念事項についてお手伝いします。",
    
    // Call to Action
    ready_to_ship: "エミル・シッピングで配送の準備はできましたか？",
    cta_description: "今日から始めて、プロフェッショナルな貨物サービスの違いを体験してください。",
    
    // Footer
    footer_description: "グローバル貨物輸送・物流ソリューションの信頼できるパートナー。2000年から卓越性を提供。",
    footer_quick_links: "クイックリンク",
    footer_contact_us: "お問い合わせ",
    footer_services: "サービス",
    footer_warehousing: "倉庫業",
    footer_customs_clearance: "通関",
    footer_contact_info: "連絡先情報",
    footer_address: "123 Shipping Lane, Port City, PC 12345",
    footer_support_hours: "24時間365日カスタマーサポート",
    footer_copyright: "© 2024 エミル・シッピング。全著作権所有。| プライバシーポリシー | 利用規約",
    
    // Language
    select_language: "言語を選択"
  }
};

function initializeLanguageSelector() {
  const languageSelect = document.getElementById('languageSelect');
  const languageLabel = document.querySelector('.language-label');
  
  if (!languageSelect) return;

  // Load saved language preference
  const savedLanguage = localStorage.getItem('selectedLanguage') || 'en';
  languageSelect.value = savedLanguage;
  updateLanguage(savedLanguage);

  // Handle language change
  languageSelect.addEventListener('change', function() {
    const selectedLanguage = this.value;
    localStorage.setItem('selectedLanguage', selectedLanguage);
    updateLanguage(selectedLanguage);
  });

  // Update language label
  if (languageLabel) {
    languageSelect.addEventListener('change', function() {
      const selectedLanguage = this.value;
      if (translations[selectedLanguage]) {
        languageLabel.textContent = translations[selectedLanguage].select_language;
      }
    });
  }
}

function updateLanguage(language) {
  if (!translations[language]) return;

  const elements = document.querySelectorAll('[data-translate]');
  elements.forEach(element => {
    const key = element.getAttribute('data-translate');
    if (translations[language][key]) {
      element.textContent = translations[language][key];
    }
  });

  // Update placeholder text
  const trackingInput = document.getElementById('trackingId');
  if (trackingInput && translations[language].enter_tracking_id) {
    trackingInput.placeholder = translations[language].enter_tracking_id;
  }

  // Update button text
  const trackButton = document.querySelector('#trackingForm button[type="submit"]');
  if (trackButton && translations[language].track_button) {
    trackButton.innerHTML = `<i class="fas fa-search"></i> ${translations[language].track_button}`;
  }

  // Update language label
  const languageLabel = document.querySelector('.language-label');
  if (languageLabel && translations[language].select_language) {
    languageLabel.textContent = translations[language].select_language;
  }
}

// Export functions for use in other files
window.EmilShipping = {
  trackPackage,
  showAlert,
  formatDate,
  validateEmail,
  validateTrackingId,
  updateLanguage
};