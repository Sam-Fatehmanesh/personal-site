const THEME_STORAGE_KEY = 'sfv-theme';
const MOON_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"></path></svg>';
const SUN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path></svg>';

function getStoredTheme() {
    try {
        const value = localStorage.getItem(THEME_STORAGE_KEY);
        return value === 'dark' || value === 'light' ? value : null;
    } catch (error) {
        return null;
    }
}

function saveTheme(theme) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
        // Ignore storage failures in private/restricted browsing contexts.
    }
}

function updateThemeToggleButton(theme) {
    const toggle = document.getElementById('theme-toggle');

    if (!toggle) {
        return;
    }

    const isDark = theme === 'dark';
    const nextMode = isDark ? 'light' : 'dark';
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.setAttribute('aria-label', 'Switch to ' + nextMode + ' mode');
    toggle.setAttribute('title', 'Switch to ' + nextMode + ' mode');
    toggle.innerHTML = isDark ? SUN_ICON : MOON_ICON;
}

function applyTheme(theme) {
    const resolvedTheme = theme === 'dark' ? 'dark' : 'light';
    document.body.classList.toggle('theme-dark', resolvedTheme === 'dark');
    updateThemeToggleButton(resolvedTheme);
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: resolvedTheme } }));
}

function initializeTheme() {
    const initialTheme = getStoredTheme() ?? 'light';
    applyTheme(initialTheme);

    const toggle = document.getElementById('theme-toggle');

    if (!toggle) {
        return;
    }

    toggle.addEventListener('click', () => {
        const nextTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
        applyTheme(nextTheme);
        saveTheme(nextTheme);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTheme);
} else {
    initializeTheme();
}

// Local triangles renderer (no CDN/runtime dependency)
function initTrianglesParticles() {
    const container = document.getElementById('particles-js');

    if (!container) {
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return;
    }

    // Force a visible full-viewport rendering layer even if CSS is stale/cached.
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.zIndex = '0';
    container.style.pointerEvents = 'none';

    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.display = 'block';

    container.replaceChildren(canvas);

    const LINK_DISTANCE = 205;
    const REPULSE_DISTANCE = 280;
    const BASE_SPEED = 0.6;
    const TYPE_COUNT = 3;
    const INTERACTION_RADIUS = 170;
    const CORE_REPEL_RADIUS = 26;
    const FORCE_SCALE = 0.014;
    const MAX_FORCE = 0.07;
    const DRAG = 0.9975;
    const MIN_SPEED = 0.4;
    const MAX_SPEED = 2.2;
    const NOISE_STRENGTH = 0.004;
    const FORCE_MATRIX = [
        [0.08, -0.24, 0.18],
        [0.18, 0.08, -0.24],
        [-0.24, 0.18, 0.08]
    ];
    const TARGET_PARTICLES = 80;
    const BASE_DENSITY_AREA = 1920 * 1080;
    const PARTICLE_DENSITY = TARGET_PARTICLES / BASE_DENSITY_AREA;
    const MIN_PARTICLES = 32;
    const MAX_PARTICLES = 360;

    const state = {
        width: 0,
        height: 0,
        particles: [],
        mouseX: -9999,
        mouseY: -9999,
        edgeAlpha: new Map(),
        triangleAlpha: new Map()
    };

    const randomBetween = (a, b) => Math.random() * (b - a) + a;
    const lerp = (a, b, t) => a + (b - a) * t;
    const themeColors = {
        dot: '0, 0, 0',
        link: '74, 74, 74',
        triangle: '112, 112, 112'
    };

    function getThemeRgbVar(name, fallback) {
        const value = getComputedStyle(document.body).getPropertyValue(name).trim();
        return value || fallback;
    }

    function refreshThemeColors() {
        themeColors.dot = getThemeRgbVar('--particle-dot-rgb', '0, 0, 0');
        themeColors.link = getThemeRgbVar('--particle-line-rgb', '74, 74, 74');
        themeColors.triangle = getThemeRgbVar('--particle-triangle-rgb', '112, 112, 112');
    }

    function smoothFalloff(distance, radius) {
        const x = Math.max(0, Math.min(1, 1 - distance / radius));
        return x * x * (3 - 2 * x);
    }

    function particleCountForSize() {
        const area = Math.max(1, state.width * state.height);
        const scaledCount = Math.round(area * PARTICLE_DENSITY);
        return Math.max(MIN_PARTICLES, Math.min(MAX_PARTICLES, scaledCount));
    }

    function createParticle(x, y) {
        return {
            x: x ?? randomBetween(0, state.width),
            y: y ?? randomBetween(0, state.height),
            vx: randomBetween(-BASE_SPEED, BASE_SPEED),
            vy: randomBetween(-BASE_SPEED, BASE_SPEED),
            size: randomBetween(1.6, 3.6),
            alpha: randomBetween(0.5, 0.9),
            type: Math.floor(randomBetween(0, TYPE_COUNT))
        };
    }

    function syncParticleCount() {
        const target = particleCountForSize();

        while (state.particles.length < target) {
            state.particles.push(createParticle());
        }

        if (state.particles.length > target) {
            state.particles.length = target;
        }
    }

    function resizeCanvas() {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        state.width = Math.max(1, window.innerWidth);
        state.height = Math.max(1, window.innerHeight);

        canvas.width = Math.floor(state.width * dpr);
        canvas.height = Math.floor(state.height * dpr);
        canvas.style.width = state.width + 'px';
        canvas.style.height = state.height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        syncParticleCount();
    }

    function updateParticles() {
        const interactionRadius2 = INTERACTION_RADIUS * INTERACTION_RADIUS;

        // Particle-Life style pair interactions (O(n^2), fine for ~100 particles).
        for (let i = 0; i < state.particles.length; i++) {
            const a = state.particles[i];

            for (let j = i + 1; j < state.particles.length; j++) {
                const b = state.particles[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const d2 = dx * dx + dy * dy;

                if (d2 <= 0 || d2 > interactionRadius2) {
                    continue;
                }

                const d = Math.sqrt(d2);
                const ux = dx / d;
                const uy = dy / d;

                const coeff = FORCE_MATRIX[a.type][b.type] ?? 0;
                let force;

                if (d < CORE_REPEL_RADIUS) {
                    const t = 1 - d / CORE_REPEL_RADIUS;
                    force = -1.6 * t;
                } else {
                    const t = d / INTERACTION_RADIUS;
                    // Add weak long-range repulsion bias to prevent hard clumping.
                    force = coeff * (1 - t) - 0.12 * t;
                }

                force *= FORCE_SCALE;
                force = Math.max(-MAX_FORCE, Math.min(MAX_FORCE, force));

                a.vx += ux * force;
                a.vy += uy * force;
                b.vx -= ux * force;
                b.vy -= uy * force;
            }
        }

        const t = performance.now() * 0.001;

        for (const p of state.particles) {
            // Keeps the system energized so it doesn't cool into static clumps.
            p.vx += Math.sin(t * 0.9 + p.y * 0.01 + p.type * 2.1) * NOISE_STRENGTH;
            p.vy += Math.cos(t * 0.8 + p.x * 0.01 - p.type * 1.7) * NOISE_STRENGTH;

            p.x += p.vx;
            p.y += p.vy;

            if (p.x <= 0 || p.x >= state.width) p.vx *= -1;
            if (p.y <= 0 || p.y >= state.height) p.vy *= -1;

            p.x = Math.max(0, Math.min(state.width, p.x));
            p.y = Math.max(0, Math.min(state.height, p.y));

            const dx = p.x - state.mouseX;
            const dy = p.y - state.mouseY;
            const dist = Math.hypot(dx, dy);

            if (dist > 0 && dist < REPULSE_DISTANCE) {
                const force = ((REPULSE_DISTANCE - dist) / REPULSE_DISTANCE) * 0.09;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }

            p.vx *= DRAG;
            p.vy *= DRAG;

            const speed = Math.hypot(p.vx, p.vy);

            if (speed > MAX_SPEED) {
                const k = MAX_SPEED / speed;
                p.vx *= k;
                p.vy *= k;
            } else if (speed < MIN_SPEED) {
                if (speed > 0.0001) {
                    const k = MIN_SPEED / speed;
                    p.vx *= k;
                    p.vy *= k;
                } else {
                    const angle = randomBetween(0, Math.PI * 2);
                    p.vx = Math.cos(angle) * MIN_SPEED;
                    p.vy = Math.sin(angle) * MIN_SPEED;
                }
            }
        }
    }

    function drawParticles() {
        for (const p of state.particles) {
            ctx.beginPath();
            ctx.fillStyle = 'rgba(' + themeColors.dot + ', ' + p.alpha.toFixed(3) + ')';
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawLinksAndTriangles() {
        const neighborsByIndex = Array.from({ length: state.particles.length }, () => []);
        const nextEdgeAlpha = new Map();
        const nextTriangleAlpha = new Map();
        const liveEdgeAlpha = new Map();

        for (let i = 0; i < state.particles.length; i++) {
            const a = state.particles[i];

            for (let j = i + 1; j < state.particles.length; j++) {
                const b = state.particles[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.hypot(dx, dy);

                if (dist >= LINK_DISTANCE) {
                    continue;
                }

                const targetAlpha = smoothFalloff(dist, LINK_DISTANCE) * 0.62;
                const edgeKey = i + '|' + j;
                const prevAlpha = state.edgeAlpha.get(edgeKey) ?? 0;
                const linkAlpha = lerp(prevAlpha, targetAlpha, 0.22);

                if (linkAlpha < 0.003) {
                    continue;
                }

                ctx.beginPath();
                ctx.strokeStyle = 'rgba(' + themeColors.link + ', ' + linkAlpha.toFixed(3) + ')';
                ctx.lineWidth = 1;
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();

                nextEdgeAlpha.set(edgeKey, linkAlpha);
                liveEdgeAlpha.set(edgeKey, linkAlpha);

                if (linkAlpha > 0.02) {
                    neighborsByIndex[i].push(j);
                }
            }
        }

        for (let i = 0; i < state.particles.length; i++) {
            const a = state.particles[i];
            const neighbors = neighborsByIndex[i];

            for (let m = 0; m < neighbors.length; m++) {
                for (let n = m + 1; n < neighbors.length; n++) {
                    const j = neighbors[m];
                    const k = neighbors[n];
                    const b = state.particles[j];
                    const c = state.particles[k];

                    const edgeAB = liveEdgeAlpha.get(i + '|' + j) ?? 0;
                    const edgeAC = liveEdgeAlpha.get(i + '|' + k) ?? 0;
                    const edgeBC = liveEdgeAlpha.get(j + '|' + k) ?? 0;

                    if (edgeAB <= 0 || edgeAC <= 0 || edgeBC <= 0) {
                        continue;
                    }

                    const targetTriAlpha = Math.min(edgeAB, edgeAC, edgeBC) * 0.85;
                    const triangleKey = i + '|' + j + '|' + k;
                    const prevTriAlpha = state.triangleAlpha.get(triangleKey) ?? 0;
                    const triAlpha = lerp(prevTriAlpha, targetTriAlpha, 0.16);

                    if (triAlpha < 0.0025) {
                        continue;
                    }

                    ctx.beginPath();
                    ctx.fillStyle = 'rgba(' + themeColors.triangle + ', ' + triAlpha.toFixed(3) + ')';
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.lineTo(c.x, c.y);
                    ctx.closePath();
                    ctx.fill();

                    nextTriangleAlpha.set(triangleKey, triAlpha);
                }
            }
        }

        // Fade out old triangles smoothly when topology changes.
        for (const [key, prev] of state.triangleAlpha.entries()) {
            if (nextTriangleAlpha.has(key)) {
                continue;
            }

            const faded = prev * 0.88;

            if (faded < 0.0025) {
                continue;
            }

            const parts = key.split('|');
            const i = Number(parts[0]);
            const j = Number(parts[1]);
            const k = Number(parts[2]);
            const a = state.particles[i];
            const b = state.particles[j];
            const c = state.particles[k];

            if (!a || !b || !c) {
                continue;
            }

            ctx.beginPath();
            ctx.fillStyle = 'rgba(' + themeColors.triangle + ', ' + faded.toFixed(3) + ')';
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.lineTo(c.x, c.y);
            ctx.closePath();
            ctx.fill();

            nextTriangleAlpha.set(key, faded);
        }

        state.edgeAlpha = nextEdgeAlpha;
        state.triangleAlpha = nextTriangleAlpha;
    }

    function animate() {
        updateParticles();
        ctx.clearRect(0, 0, state.width, state.height);
        drawLinksAndTriangles();
        drawParticles();
        requestAnimationFrame(animate);
    }

    window.addEventListener('mousemove', (event) => {
        state.mouseX = event.clientX;
        state.mouseY = event.clientY;
    });

    window.addEventListener('mouseout', (event) => {
        if (!event.relatedTarget) {
            state.mouseX = -9999;
            state.mouseY = -9999;
        }
    });

    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('themechange', refreshThemeColors);

    refreshThemeColors();
    resizeCanvas();
    animate();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTrianglesParticles);
} else {
    initTrianglesParticles();
}

// Navigation functionality - Click control + Manual scroll detection
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    let isClickScrolling = false;
    let scrollEndTimer;
    const isChromeBrowser = (() => {
        const ua = navigator.userAgent;
        const isGoogleChrome = /Chrome\/\d+/.test(ua) && navigator.vendor === 'Google Inc.';
        const isOtherChromiumBrand = /Edg\/|OPR\/|Brave\/|SamsungBrowser\//.test(ua);
        return isGoogleChrome && !isOtherChromiumBrand;
    })();
    
    // Function to update active nav link
    const updateActiveLink = (activeId) => {
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-page') === activeId);
        });
    };

    // Use native smooth scrolling in Chrome, custom animation elsewhere.
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
        if (isChromeBrowser) {
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
            return 1400;
        }

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
        return 1000;
    };

    // Click-based navigation handler
    const handleNavClick = (targetId) => {
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            // Set flag to prevent observer interference
            isClickScrolling = true;
            
            // Update active class immediately
            updateActiveLink(targetId);
            
            // Scroll with browser-specific behavior.
            const unlockDelayMs = smoothScrollTo(targetElement, targetId);
            
            // Reset flag after scroll completes
            clearTimeout(scrollEndTimer);
            if (isChromeBrowser && 'onscrollend' in window) {
                const onScrollEnd = () => {
                    clearTimeout(scrollEndTimer);
                    isClickScrolling = false;
                };
                window.addEventListener('scrollend', onScrollEnd, { once: true });
            }
            scrollEndTimer = setTimeout(() => {
                isClickScrolling = false;
            }, unlockDelayMs);
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
