// With scripting on, inserts the projects section after the experience
// section and moves the education section after the skills section: the
// page holds both only in the right order when the script runs.
const work = document.querySelector('section[aria-labelledby="section-work"]');
const projects = document.createElement('section');
projects.setAttribute('aria-labelledby', 'section-projects');
projects.innerHTML = '<h2 id="section-projects">Projects</h2><ul class="projects"><li><h3>Guided Tours System</h3></li></ul>';
work.after(projects);
document.querySelector('section[aria-labelledby="section-skills"]').after(document.querySelector('section[aria-labelledby="section-education"]'));
