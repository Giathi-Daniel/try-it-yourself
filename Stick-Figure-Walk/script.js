// Click, tap or press Space to pause / play the walk
const scene = document.querySelector('.scene');

function toggle() {
  scene.classList.toggle('paused');
}

scene.addEventListener('click', toggle);

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') toggle();
});
