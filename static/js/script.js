document.getElementById('choose-file-button').addEventListener('click', function() {
    document.getElementById('file-input').click();
});

let selectedFile = null;
let algorithmResults = [];
let eventListenersAdded = false;

document.getElementById('file-input').addEventListener('change', function() {
    selectedFile = this.files[0];
    if (selectedFile) {
        document.getElementById('file-name').textContent = selectedFile.name;
    } else {
        document.getElementById('file-name').textContent = 'No file chosen';
    }
});

document.getElementById('upload-file-button').addEventListener('click', function() {
    if (!selectedFile) {
        alert("Please choose a file first.");
        return;
    }
    let formData = new FormData();
    formData.append('file', selectedFile);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.addresses) {
            let previewList = document.getElementById('preview-list');
            previewList.innerHTML = '';
            data.addresses.forEach(address => {
                let li = document.createElement('li');
                li.textContent = address;
                previewList.appendChild(li);
            });
        } else if (data.error) {
            alert(data.error);
        }
    })
    .catch(error => console.error('Error:', error));
});

document.getElementById('optimize-route-button').addEventListener('click', function() {
    document.getElementById('loading').style.display = 'block';
    setTimeout(() => {
        fetch('/solve_tsp', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({'algorithms': ['ortools', 'christofides2opt', 'greedy2opt']})
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if (data.results && data.results.length > 0) {
                algorithmResults = data.results;
                algorithmResults.sort((a, b) => a.total_distance - b.total_distance);

                data.results.forEach(result => {
                    if (result.error) {
                        alert(`Algorithm ${result.algorithm}: ${result.error}`);
                        return;
                    }
                    const algorithmCard = document.getElementById(`algorithm-${result.algorithm}`);
                    algorithmCard.querySelector('.distance').textContent = result.total_distance;
                    const routeStops = algorithmCard.querySelector('.route-stops');
                    routeStops.innerHTML = '';
                    result.route.forEach(address => {
                        let li = document.createElement('li');
                        li.textContent = address;
                        routeStops.appendChild(li);
                    });
                });

                document.getElementById('section-2').style.display = 'block';
                document.getElementById('section-3').style.display = 'block';

                populateBestAlgorithmSection(algorithmResults[0]);

                const algorithmSelect = document.getElementById('algorithm-select');
                algorithmSelect.innerHTML = '';
                algorithmResults.forEach((result, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = `${index + 1}. ${result.algorithm}`;
                    algorithmSelect.appendChild(option);
                });

                if (!eventListenersAdded) {
                    algorithmSelect.addEventListener('change', function() {
                        const selectedIndex = this.value;
                        populateBestAlgorithmSection(algorithmResults[selectedIndex]);
                    });
                    eventListenersAdded = true;
                }

            } else if (data.error) {
                alert(data.error);
            } else {
                alert('An unexpected error occurred.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while optimizing the route.');
            document.getElementById('loading').style.display = 'none';
        });
    }, 2000);
});

function populateBestAlgorithmSection(result) {
    console.log(`Populating best algorithm section for: ${result.algorithm}`);
    document.getElementById('best-algorithm').textContent = result.algorithm;
    document.getElementById('best-distance').textContent = result.total_distance;
    const bestRouteStops = document.getElementById('best-route-stops');
    bestRouteStops.innerHTML = '';
    result.route.forEach(address => {
        let li = document.createElement('li');
        li.textContent = address;
        bestRouteStops.appendChild(li);
    });

    document.getElementById('map-loading').style.display = 'block';
    document.getElementById('route-map').style.display = 'none';

    setTimeout(() => {
        console.log(`Calling /plot_route for algorithm: ${result.algorithm}`);
        fetch('/plot_route', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({'algorithm': result.algorithm})
        })
        .then(response => response.json())
        .then(data => {
            if (data.map_url) {
                document.getElementById('route-map').src = data.map_url;
                document.getElementById('route-map').onload = function() {
                    document.getElementById('map-loading').style.display = 'none';
                    document.getElementById('route-map').style.display = 'block';
                };
            } else if (data.error) {
                alert(data.error);
                document.getElementById('map-loading').style.display = 'none';
            }
        });
    }, 2000);
}
