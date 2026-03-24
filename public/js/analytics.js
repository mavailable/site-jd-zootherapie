document.addEventListener('DOMContentLoaded', () => {
  const track = (event, props) => {
    if (typeof window.umami !== 'undefined') window.umami.track(event, props);
  };

  // Clics téléphone
  document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.addEventListener('click', () => track('phone-click', { page: window.location.pathname }));
  });

  // Clics email
  document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
    link.addEventListener('click', () => track('email-click', { page: window.location.pathname }));
  });

  // Clics CTA principaux (boutons avec data-track="cta")
  document.querySelectorAll('[data-track="cta"]').forEach(btn => {
    btn.addEventListener('click', () => track('cta-click', { label: btn.textContent?.trim() }));
  });

  // Soumission formulaire contact
  const contactForm = document.querySelector('form[action*="web3forms"]');
  if (contactForm) {
    contactForm.addEventListener('submit', () => track('form-submit', { page: window.location.pathname }));
  }
});
