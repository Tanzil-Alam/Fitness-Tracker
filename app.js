(() => {
    const views = Array.from(document.querySelectorAll('[data-app-view]'));
    const navLinks = Array.from(document.querySelectorAll('.top-nav [data-view-link]'));
    if (!views.length || !navLinks.length) return;

    const routeForHash = () => {
        const hash = window.location.hash.slice(1);
        if (hash === 'profile' || hash === 'ai') return hash;
        if (hash === 'goals') return 'goals';
        return 'workouts';
    };

    const showView = (route, updateHistory = false) => {
        const viewName = ['profile', 'ai', 'goals'].includes(route) ? route : 'workouts';
        views.forEach(view => {
            view.hidden = view.dataset.appView !== viewName;
        });

        navLinks.forEach(link => {
            const isCurrent = link.dataset.viewLink === route ||
                (route === 'goals' && link.dataset.viewLink === 'goals');
            link.classList.toggle('active', isCurrent);
            if (isCurrent) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });

        if (updateHistory) {
            const hash = route === 'workouts' ? '#workouts' : `#${route}`;
            if (window.location.hash !== hash) window.history.pushState(null, '', hash);
        }

        window.scrollTo(0, 0);

        if (viewName === 'workouts') {
            if (typeof renderDailyRoutine === 'function') renderDailyRoutine();
        }
        if (viewName === 'workouts' || viewName === 'goals') {
            if (typeof renderMonthlyGoals === 'function') renderMonthlyGoals();
        }

        if (viewName === 'ai') {
            const greetingName = document.getElementById('ai-greeting-name');
            if (greetingName) {
                greetingName.textContent = (localStorage.getItem('userName') || 'Athlete').split(/\s+/)[0];
            }
        }
    };

    navLinks.forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            showView(link.dataset.viewLink, true);
        });
    });

    document.querySelectorAll('[data-view-link="profile"]').forEach(link => {
        if (navLinks.includes(link)) return;
        link.addEventListener('click', event => {
            event.preventDefault();
            showView('profile', true);
        });
    });

    window.addEventListener('hashchange', () => showView(routeForHash()));
    window.addEventListener('popstate', () => showView(routeForHash()));

    showView(routeForHash());

    const greetingTime = document.getElementById('ai-greeting-time');
    if (greetingTime) {
        const hour = new Date().getHours();
        greetingTime.textContent = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    }

})();
