document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const saveCsvCheckbox = document.getElementById('save-csv-checkbox');
    const downloadBtn = document.getElementById('download-btn');
    
    const statTotal = document.getElementById('stat-total');
    const statTcp = document.getElementById('stat-tcp');
    const statUdp = document.getElementById('stat-udp');
    const statIcmp = document.getElementById('stat-icmp');
    const statAvgSize = document.getElementById('stat-avg-size');
    
    const tableBody = document.getElementById('table-body');
    
    const filterProtocol = document.getElementById('filter-protocol');
    const filterSrcIp = document.getElementById('filter-src-ip');
    const filterDstIp = document.getElementById('filter-dst-ip');
    const applyFilterBtn = document.getElementById('apply-filter-btn');
    const resetFilterBtn = document.getElementById('reset-filter-btn');
    
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const liveBtn = document.getElementById('live-btn');
    const pageIndicator = document.getElementById('page-indicator');
    const viewMode = document.getElementById('view-mode');
    
    let isMonitoring = false;
    let pollInterval = null;
    let allData = [];
    let lastDataIds = "";
    let currentPage = 0;
    let maxPages = 1;
    let sessionWasSaved = false;

    const checkStatusOnLoad = async () => {
        try {
            const response = await fetch('/api/data');
            const data = await response.json();
            if (data.status === 'running') {
                isMonitoring = true;
                startBtn.disabled = true;
                stopBtn.disabled = false;
                statusDot.classList.add('active');
                statusText.textContent = "Live Monitoring";
                statusText.style.color = "var(--success)";
                fetchAndUpdateData();
                pollInterval = setInterval(fetchAndUpdateData, 1000);
            }
        } catch (e) { console.error("Initial status check failed"); }
    };
    checkStatusOnLoad();

    const fetchAndUpdateData = async () => {
        try {
            const response = await fetch(`/api/data?page=${currentPage}`);
            const data = await response.json();
            
            updateStats(data.stats);
            maxPages = data.max_pages;
            updatePaginationUI(data.page, data.max_pages);

            if (currentPage === 0) {
                if (data.status === 'running' || (data.status === 'stopped' && data.data.length > 0)) {
                    allData = data.data;
                    applyFiltersAndRender();
                }
            } else {
                allData = data.data;
                applyFiltersAndRender();
            }
            
            if (data.status === 'stopped' && isMonitoring) {
                stopMonitoring();
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    const updatePaginationUI = (page, max) => {
        currentPage = page;
        
        if (page === 0) {
            viewMode.textContent = "Live";
            viewMode.style.color = "var(--primary)";
            pageIndicator.textContent = "Latest";
            prevBtn.disabled = max <= 1;
            nextBtn.disabled = true;
            liveBtn.style.display = "none";
        } else {
            viewMode.textContent = "History";
            viewMode.style.color = "var(--accent)";
            pageIndicator.textContent = `Page ${page} of ${max}`;
            prevBtn.disabled = page >= max;
            nextBtn.disabled = page <= 1;
            liveBtn.style.display = "inline-flex";
        }
    };

    const updateStats = (stats) => {
        animateValue(statTotal, parseInt(statTotal.textContent) || 0, stats.total_packets, 500);
        statTcp.textContent = stats.tcp_count;
        statUdp.textContent = stats.udp_count;
        statIcmp.textContent = stats.icmp_count;
        statAvgSize.textContent = stats.avg_size + " B";
    };

    const animateValue = (obj, start, end, duration) => {
        if (start === end) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    };

    const applyFiltersAndRender = () => {
        const protocolFilter = filterProtocol.value;
        const srcIpFilter = filterSrcIp.value.trim().toLowerCase();
        const dstIpFilter = filterDstIp.value.trim().toLowerCase();
        
        const filteredData = allData.filter(row => {
            let match = true;
            if (protocolFilter !== 'ALL' && row.Protocol !== protocolFilter) match = false;
            if (srcIpFilter && !row['Source IP'].toLowerCase().includes(srcIpFilter)) match = false;
            if (dstIpFilter && !row['Destination IP'].toLowerCase().includes(dstIpFilter)) match = false;
            return match;
        });
        
        renderTable(filteredData.slice(-1000).reverse());
    };

    const renderTable = (data) => {
        const currentDataIds = data.map(r => r.Time + r['Source IP'] + r['Packet Size']).join('|');
        if (lastDataIds === currentDataIds) return;
        lastDataIds = currentDataIds;

        tableBody.innerHTML = '';
        
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 3rem;">No matching packets found.</td></tr>`;
            return;
        }

        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            if (index === 0 && isMonitoring) tr.classList.add('new-row');
            
            const protoClass = `badge-${row.Protocol.toLowerCase()}`;
            
            tr.innerHTML = `
                <td style="color: var(--text-muted); font-size: 0.75rem;">${row.Time}</td>
                <td style="font-family: monospace; font-weight: 500;">${row['Source IP']}</td>
                <td style="font-family: monospace; font-weight: 500;">${row['Destination IP']}</td>
                <td><span class="badge ${protoClass}">${row.Protocol}</span></td>
                <td>${row['Packet Size']}</td>
                <td style="color: var(--text-muted)">${row['Source Port']}</td>
                <td style="color: var(--text-muted)">${row['Destination Port']}</td>
                <td style="font-weight: 600; color: var(--accent)">${row.Service}</td>
            `;
            tableBody.appendChild(tr);
        });
    };

    const startMonitoring = async () => {
        try {
            const saveToCSV = saveCsvCheckbox.checked;
            const response = await fetch('/api/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ save_to_csv: saveToCSV })
            });
            const data = await response.json();
            
            if (data.status === 'success') {
                isMonitoring = true;
                sessionWasSaved = data.saving || false;
                startBtn.disabled = true;
                stopBtn.disabled = false;
                saveCsvCheckbox.disabled = true;
                downloadBtn.style.display = 'none';
                statusDot.classList.add('active');
                statusText.textContent = "Live Monitoring";
                statusText.style.color = "var(--success)";
                
                fetchAndUpdateData();
                pollInterval = setInterval(fetchAndUpdateData, 1000);
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error("Error starting monitoring:", error);
        }
    };


    const stopMonitoring = async () => {
        try {
            await fetch('/api/stop', { method: 'POST' });
            isMonitoring = false;
            startBtn.disabled = false;
            stopBtn.disabled = true;
            saveCsvCheckbox.disabled = false;
            statusDot.classList.remove('active');
            statusText.textContent = "Stopped";
            statusText.style.color = "var(--text-muted)";
            
            if (sessionWasSaved) {
                downloadBtn.style.display = 'inline-flex';
            }
            
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
        } catch (error) {
            console.error("Error stopping monitoring:", error);
        }
    };

    startBtn.addEventListener('click', () => {
        allData = [];
        tableBody.innerHTML = '';
        startMonitoring();
    });
    
    stopBtn.addEventListener('click', stopMonitoring);

    downloadBtn.addEventListener('click', () => {
        window.location.href = '/api/download';
    });
    
    applyFilterBtn.addEventListener('click', applyFiltersAndRender);
    
    resetFilterBtn.addEventListener('click', () => {
        filterProtocol.value = 'ALL';
        filterSrcIp.value = '';
        filterDstIp.value = '';
        applyFiltersAndRender();
    });

    prevBtn.addEventListener('click', () => {
        if (currentPage < maxPages) {
            currentPage++;
            fetchAndUpdateData();
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchAndUpdateData();
        } else if (currentPage === 1) {
            goToLiveMode();
        }
    });

    liveBtn.addEventListener('click', goToLiveMode);

    function goToLiveMode() {
        currentPage = 0;
        fetchAndUpdateData();
        if (isMonitoring && !pollInterval) {
            pollInterval = setInterval(fetchAndUpdateData, 1000);
        }
    }
});
