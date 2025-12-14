
const projectLinks = [
  'https://www.jirimacal.cz/', 
  'https://pgv-five.vercel.app/', 
  'https://playground-three-ebon.vercel.app/',
  'https://4-zsmost.vercel.app/', 
  'https://k-srdci-kl.vercel.app/',
  '', 
  'https://dokran.eu/' 
];

document.addEventListener('DOMContentLoaded', function() {
  const cards = document.querySelectorAll('.projects-grid .project-card');
  cards.forEach((card, i) => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', e => {
      if (e.target.closest('a')) return;
      if (projectLinks[i]) {
        window.open(projectLinks[i], '_blank');
      }
    });
  });
});
