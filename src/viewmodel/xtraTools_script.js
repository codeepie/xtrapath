document.addEventListener('DOMContentLoaded', () => {
    const allXtraTools = [
        { 
            id: 'xtraanim', 
            name: 'Animation', 
            icon: 'ri-movie-2-line', 
            url: '/views/xtraAnim.html',
            status: 'active'
        },
        { 
            id: 'xtrabook', 
            name: 'Book', 
            icon: 'ri-book-open-line', 
            url: '/views/xtraBook.html',
            status: 'active'
        },
        { 
            id: 'xtragraph', 
            name: 'Graph', 
            icon: 'ri-bar-chart-2-line', 
            url: '/views/xtraGraph.html',
            status: 'active'
        },
        { 
            id: 'xtraarticle', 
            name: 'Article', 
            icon: 'ri-file-text-line', 
            url: '/views/xtraArticle.html',
            status: 'active'
        },
        { 
            id: 'svg_to_3d', 
            name: 'SVG to 3D', 
            icon: 'ri-cube-line', 
            url: '#',
            status: 'upcoming'
        },
        { 
            id: 'image_to_ascii', 
            name: 'ASCII Art', 
            icon: 'ri-font-size-2', 
            url: '#',
            status: 'upcoming'
        },
    ];

    const toolsGrid = document.getElementById('toolsGrid');

    if (toolsGrid) {
        allXtraTools.forEach(tool => {
            const isUpcoming = tool.status === 'upcoming';
            const toolLink = document.createElement('a');
            toolLink.href = isUpcoming ? '#' : tool.url;
            toolLink.className = `tool-app ${isUpcoming ? 'upcoming' : ''}`;

            toolLink.innerHTML = `
                <div class="tool-app-icon">
                    <i class="${tool.icon}"></i>
                </div>
                <span class="tool-app-name">${tool.name}</span>
            `;
            
            if (isUpcoming) {
                toolLink.title = "Coming Soon!";
            }

            toolsGrid.appendChild(toolLink);
        });
    }
});