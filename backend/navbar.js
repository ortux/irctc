
document.addEventListener('DOMContentLoaded', function () {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenu = document.getElementById('navbar-sticky');

    // Proceed only if both elements were found
    if (mobileMenuToggle && mobileMenu) {
        // Function to toggle menu visibility
        const toggleMenu = () => {
            const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
            mobileMenu.classList.toggle('hidden');
            mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
        };

        // Add click listener to the toggle button
        mobileMenuToggle.addEventListener('click', toggleMenu);

        // Add listeners to menu links to close menu on click (for mobile)
        const mobileMenuLinks = mobileMenu.querySelectorAll('a');
        mobileMenuLinks.forEach(link => {
            link.addEventListener('click', function () {
                // If on a mobile screen and menu is open, close it
                if (window.innerWidth < 768 && !mobileMenu.classList.contains('hidden')) {
                    toggleMenu();
                }
            });
        });

        // Adjust menu on window resize
        window.addEventListener('resize', function () {
            if (window.innerWidth >= 768) {
                // On desktop, menu should always be visible
                mobileMenu.classList.remove('hidden');
                mobileMenuToggle.setAttribute('aria-expanded', 'true');
            } else {
                // On mobile, menu should be hidden by default
                mobileMenu.classList.add('hidden');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
            }
        });

        // Set initial state correctly on load
        if (window.innerWidth < 768) {
            mobileMenu.classList.add('hidden');
            mobileMenuToggle.setAttribute('aria-expanded', 'false');
        }
    }

    // Dark mode toggle functionality (bonus feature)
    function toggleDarkMode() {
        document.documentElement.classList.toggle('dark');
    }
});
