// Inserts the projects section: content that exists only with scripting on.
const section = document.createElement('section');
section.setAttribute('aria-labelledby', 'section-projects');
section.innerHTML = '<h2 id="section-projects">Projects</h2><ol class="timeline"><li><p class="date"><time datetime="2022-03">Mar 2022</time></p><h3>Guided Tours System</h3><p class="text">A booking site for walking tours.</p></li></ol>';
document.querySelector('main > section').after(section);
