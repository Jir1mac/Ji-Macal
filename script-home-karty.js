const homeProjectLinks = [
  'https://4-zsmost.vercel.app/', 
  'https://k-srdci-kl.vercel.app/', 
  'https://playground-three-ebon.vercel.app/' 
];

document.addEventListener('DOMContentLoaded', function() {
  const cards = document.querySelectorAll('#projects .projects-grid .project-card');
  cards.forEach((card, i) => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', e => {
      if (e.target.closest('a')) return;
      if (homeProjectLinks[i]) {
        window.open(homeProjectLinks[i], '_blank');
      }
    });
  });
});
