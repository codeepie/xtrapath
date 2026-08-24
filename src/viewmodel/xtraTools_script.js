document.addEventListener('DOMContentLoaded', () => {
    const allXtraTools = [
        { 
            id: 'xtraanim', 
            name: 'Animation', 
            icon: 'ri-movie-2-line', 
            gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            url: '/views/xtraAnim.html',
            status: 'active'
        },
        { 
            id: 'xtrabook', 
            name: 'Book', 
            icon: 'ri-book-open-line', 
            gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
            url: '/views/xtraBook.html',
            status: 'active'
        },
        { 
            id: 'xtragraph', 
            name: 'Graph', 
            icon: 'ri-bar-chart-2-line', 
            gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            url: '/views/xtraGraph.html',
            status: 'active'
        },
        { 
            id: 'xtraarticle', 
            name: 'Article', 
            icon: 'ri-file-text-line', 
            gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            url: '/views/xtraArticle.html',
            status: 'active'
        },
        { 
            id: 'xtracourse', 
            name: 'Course', 
            icon: 'ri-graduation-cap-line', 
            gradient: 'linear-gradient(135deg, #6366f1, #3b82f6)',
            url: '/views/xtraCourse.html',
            status: 'active'
        },
        { 
            id: 'mermaid', 
            name: 'Diagram', 
            icon: 'ri-flow-chart', 
            gradient: 'linear-gradient(135deg, #14b8a6, #3b82f6)',
            url: '/views/xtraAnim.html?tool=mermaid',
            status: 'active'
        },
        { 
            id: 'katex', 
            name: 'LaTeX Math', 
            icon: 'ri-functions', 
            gradient: 'linear-gradient(135deg, #f43f5e, #a855f7)',
            url: '/views/xtraAnim.html?tool=katex',
            status: 'active'
        },
        { 
            id: 'jsxgraph', 
            name: 'JSXGraph Math', 
            icon: 'ri-compasses-2-line', 
            gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            url: '/views/xtraAnim.html?tool=jsxgraph',
            status: 'active'
        },
        { 
            id: 'zdog', 
            name: 'Zdog 3D', 
            icon: 'ri-shape-line', 
            gradient: 'linear-gradient(135deg, #e11d48, #fb7185)',
            url: '/views/xtraAnim.html?tool=zdog',
            status: 'active'
        },
        { 
            id: 'svg_to_3d', 
            name: 'SVG to 3D', 
            icon: 'ri-cube-line', 
            gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            url: '#',
            status: 'upcoming'
        },
        { 
            id: 'image_to_ascii', 
            name: 'ASCII Art', 
            icon: 'ri-font-size-2', 
            gradient: 'linear-gradient(135deg, #f97316, #eab308)',
            url: '#',
            status: 'upcoming'
        },
    ];

    const DEFAULT_TOOLS = ['xtraanim', 'xtrabook', 'xtragraph', 'xtraarticle'];

    function getSelectedToolIds() {
        try {
            const saved = JSON.parse(localStorage.getItem('userSelectedTools') || '[]');
            if (Array.isArray(saved) && saved.length > 0) return saved.slice(0, 4);
        } catch(e) {}
        return [...DEFAULT_TOOLS];
    }

    function setSelectedToolIds(ids) {
        localStorage.setItem('userSelectedTools', JSON.stringify(ids.slice(0, 4)));
        window.dispatchEvent(new Event('xtra-tools-changed'));
        if (window.rebuildStudioChoiceGrid) {
            window.rebuildStudioChoiceGrid();
        }
        renderSimpleGrid();
    }

    const gridEl = document.getElementById('simpleToolsGrid');
    const pinnedCountEl = document.getElementById('pinnedCountText');
    const toast = document.getElementById('simpleToast');
    const toastMsg = document.getElementById('simpleToastMsg');
    let toastTimeout = null;

    function showToast(message) {
        if (!toast || !toastMsg) return;
        toastMsg.textContent = message;
        toast.classList.add('show');
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2800);
    }

    function renderSimpleGrid() {
        const selectedIds = getSelectedToolIds();

        if (pinnedCountEl) {
            pinnedCountEl.textContent = `${selectedIds.length} / 4 Pinned`;
        }

        if (gridEl) {
            gridEl.innerHTML = '';
            allXtraTools.forEach(tool => {
                const isUpcoming = tool.status === 'upcoming';
                const isPinned = selectedIds.includes(tool.id);

                const card = document.createElement('div');
                card.className = `simple-tool-card ${isUpcoming ? 'upcoming' : ''} ${isPinned ? 'pinned' : ''}`;

                card.innerHTML = `
                    <div class="tool-icon-tile" style="background: ${tool.gradient};" title="${isUpcoming ? 'Coming Soon' : 'Toggle selection for ' + tool.name}">
                        <i class="${tool.icon}"></i>
                    </div>
                    <span class="tool-name-link">${tool.name}</span>
                    <button class="btn-simple-pin ${isUpcoming ? 'soon' : (isPinned ? 'active' : 'inactive')}">
                        ${isUpcoming ? 'Soon' : (isPinned ? '<i class="ri-check-line"></i> Selected' : '+ Select')}
                    </button>
                `;

                card.style.cursor = isUpcoming ? 'default' : 'pointer';

                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (isUpcoming) {
                        showToast(`${tool.name} is coming soon.`);
                        return;
                    }

                    if (isPinned) {
                        if (selectedIds.length <= 1) {
                            showToast("Keep at least 1 tool in your Studio (+) menu.");
                            return;
                        }
                        const updated = selectedIds.filter(id => id !== tool.id);
                        setSelectedToolIds(updated);
                        showToast(`Deselected ${tool.name}`);
                    } else {
                        if (selectedIds.length >= 4) {
                            showToast("Maximum 4 tools selected. Deselect one first.");
                            return;
                        }
                        const updated = [...selectedIds, tool.id];
                        setSelectedToolIds(updated);
                        showToast(`Selected ${tool.name} for Studio (+)`);
                    }
                });

                gridEl.appendChild(card);
            });
        }
    }

    renderSimpleGrid();
});