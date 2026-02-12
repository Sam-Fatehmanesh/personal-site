// Initialize particles.js
particlesJS('particles-js', {
    particles: {
        number: {
            value: 80,
            density: {
                enable: true,
                value_area: 800
            }
        },
        color: {
            value: '#000000'
        },
        shape: {
            type: 'circle',
            stroke: {
                width: 0,
                color: '#000000'
            }
        },
        opacity: {
            value: 0.5,
            random: false,
            anim: {
                enable: false,
                speed: 1,
                opacity_min: 0.1,
                sync: false
            }
        },
        size: {
            value: 3,
            random: true,
            anim: {
                enable: false,
                speed: 40,
                size_min: 0.1,
                sync: false
            }
        },
        line_linked: {
            enable: true,
            distance: 150,
            color: '#000000',
            opacity: 0.4,
            width: 1
        },
        move: {
            enable: true,
            speed: 6,
            direction: 'none',
            random: false,
            straight: false,
            out_mode: 'out',
            bounce: false,
            attract: {
                enable: false,
                rotateX: 600,
                rotateY: 1200
            }
        }
    },
    interactivity: {
        detect_on: 'window',
        events: {
            onhover: {
                enable: true,
                mode: 'repulse'
            },
            onclick: {
                enable: true,
                mode: 'push'
            },
            resize: true
        },
        modes: {
            grab: {
                distance: 400,
                line_linked: {
                    opacity: 1
                }
            },
            bubble: {
                distance: 400,
                size: 40,
                duration: 2,
                opacity: 8,
                speed: 3
            },
            repulse: {
                distance: 200,
                duration: 0.4
            },
            push: {
                particles_nb: 4
            },
            remove: {
                particles_nb: 2
            }
        }
    },
    retina_detect: true
});

// Navigation functionality - Click control + Manual scroll detection
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    let isClickScrolling = false;
    let scrollEndTimer;
    
    // Function to update active nav link
    const updateActiveLink = (activeId) => {
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-page') === activeId);
        });
    };

    // Custom smooth scroll function that can't be interrupted
    const smoothScrollTo = (targetElement, targetId) => {
        // Dynamic offset based on section
        let offset = 80; // Default navbar offset
        if (targetId === 'projects') {
            offset = 20; // Less offset for projects to show title properly
        } else if (targetId === 'publications') {
            offset = 20; // Less offset for publications to show title properly
        } else if (targetId === 'contact') {
            offset = 20; // More offset for contact to center content better
        }
        
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - offset;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = 800; // 800ms duration
        let start = null;

        function animation(currentTime) {
            if (start === null) start = currentTime;
            const timeElapsed = currentTime - start;
            const run = easeInOutQuad(timeElapsed, startPosition, distance, duration);
            window.scrollTo(0, run);
            if (timeElapsed < duration) requestAnimationFrame(animation);
        }

        // Easing function
        function easeInOutQuad(t, b, c, d) {
            t /= d / 2;
            if (t < 1) return c / 2 * t * t + b;
            t--;
            return -c / 2 * (t * (t - 2) - 1) + b;
        }

        requestAnimationFrame(animation);
    };

    // Click-based navigation handler
    const handleNavClick = (targetId) => {
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            // Set flag to prevent observer interference
            isClickScrolling = true;
            
            // Update active class immediately
            updateActiveLink(targetId);
            
            // Use custom smooth scroll
            smoothScrollTo(targetElement, targetId);
            
            // Reset flag after scroll completes
            clearTimeout(scrollEndTimer);
            scrollEndTimer = setTimeout(() => {
                isClickScrolling = false;
            }, 1000); // Adjusted to match custom scroll duration
        }
    };

    // IntersectionObserver for manual scrolling detection
    const observer = new IntersectionObserver(entries => {
        // Only respond if NOT during a click-initiated scroll
        if (isClickScrolling) return;
        
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                updateActiveLink(id);
            }
        });
    }, {
        root: null,
        rootMargin: '-20% 0px -20% 0px', // Smaller margin for more responsive detection
        threshold: 0.1
    });

    // Observe all sections
    sections.forEach(section => observer.observe(section));

    // Click listeners for nav links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            handleNavClick(page);
        });
    });
    
    // Handle internal links (like projects link in intro)
    document.querySelectorAll('a.link[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            handleNavClick(targetId);
        });
    });
}); 