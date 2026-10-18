document.addEventListener("DOMContentLoaded",()=>{
  const navLinks=[...document.querySelectorAll(".nav-link")];
  const sections=[...document.querySelectorAll("main section[id]")];
  const year=document.querySelector("#current-year");

  if(year){
    year.textContent=new Date().getFullYear();
  }

  const updateActiveLink=()=>{
    if(!sections.length) return;

    const scrollPosition=window.scrollY+window.innerHeight*.35;
    let activeSection=sections[0];

    sections.forEach(section=>{
      if(scrollPosition>=section.offsetTop){
        activeSection=section;
      }
    });

    navLinks.forEach(link=>{
      const target=link.getAttribute("href");
      link.classList.toggle("is-active",target===`#${activeSection.id}`);
    });
  };

  let scrollTicking=false;

  window.addEventListener("scroll",()=>{
    if(scrollTicking) return;

    window.requestAnimationFrame(()=>{
      updateActiveLink();
      scrollTicking=false;
    });

    scrollTicking=true;
  },{passive:true});

  updateActiveLink();
});
