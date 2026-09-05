document.addEventListener('DOMContentLoaded', () => {
    const allXtraTools = window.ToolsManager?.tools || window.allXtraTools || [];
    const getSelectedToolIds = () => window.ToolsManager?.StudioChoice?.getPinnedTools ? window.ToolsManager.StudioChoice.getPinnedTools() : (window.getSelectedToolIds ? window.getSelectedToolIds() : ['xtraanim', 'xtrabook', 'xtragraph', 'xtraarticle']);
    const setSelectedToolIds = (ids) => {
        if (window.ToolsManager?.StudioChoice?.setPinnedTools) {
            window.ToolsManager.StudioChoice.setPinnedTools(ids);
        } else if (window.setSelectedToolIds) {
            window.setSelectedToolIds(ids);
        }
        renderSimpleGrid();
    };

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