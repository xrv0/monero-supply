const maxSupply = (Math.pow(2, 64) - 1) * Math.pow(10, -12); // Max supply is 2^^4 - 1 atomic units (piconero)
const tailEmission = 0.6;
const hydrogenHelixActivationHeight = 1009827;

function getBaseRewardForBlock(blockHeight, circulatingSupply) {
    let reward = (maxSupply - circulatingSupply) * Math.pow(2, -20)
    if(blockHeight > hydrogenHelixActivationHeight) { // Double block reward after block time update
        reward *= 2
    }
    return reward > tailEmission ? reward : tailEmission; // Use tail emission if base reward is smaller than 0.6 XMR
}

// You can start from known block height with corresponding total supply for efficiency reasons
function getCirculatingSupplyOfBlock(blockHeight, startHeight, startSupply) {
    for (let bh = startHeight; bh <= blockHeight; bh++) {
        let blockReward = getBaseRewardForBlock(bh, startSupply);
        startSupply += blockReward;
    }
    return startSupply;
}

const dateOfFirstMinedBlock = new Date(2014, 4, 18, 10, 49, 53)
function getExpectedDateOfBlock(blockHeight) {
    if(blockHeight > hydrogenHelixActivationHeight) {
        const expectedBeforeUpdate = new Date(dateOfFirstMinedBlock.getTime() + hydrogenHelixActivationHeight * 60000);
        let expectedDate = new Date(expectedBeforeUpdate.getTime() + 2 * (blockHeight - hydrogenHelixActivationHeight) * 60000);
        return expectedDate;
    }else {
        const expectedBeforeUpdate = new Date(dateOfFirstMinedBlock.getTime() + 1 * blockHeight * 60000);
        return expectedBeforeUpdate;
    }
}

function getTotalSupplyDataPoints(maxBlockHeight, step) {
    let dataPoints = [];

    let lastSupply = 0;
    let lastBlockHeight = 0;
    for (let blockHeight = 0; blockHeight < maxBlockHeight; blockHeight += step) {
        let supplyOfBlock = getCirculatingSupplyOfBlock(blockHeight, lastBlockHeight, lastSupply)
        const expectedMinedDate = getExpectedDateOfBlock(blockHeight)

        dataPoints.push({
            x: expectedMinedDate,
            y: supplyOfBlock,
            label: "Block height: " + blockHeight + " Date: " + expectedMinedDate.toDateString()
        });
    }
    return dataPoints;
}

function fetchTotalSupply() {
    fetch("https://localmonero.co/blocks/api/get_stats")
        .then(response => response.json())
        .then(data => {
            const totalSupplySpan = document.getElementById("current-total-supply");
            const totalSupply = data["total_emission"] * Math.pow(10, -12);
            totalSupplySpan.innerText = totalSupply;
        });
}

function calculateChart() {
    const dataPoints = getTotalSupplyDataPoints(3500000, 75000);
    let chart = new CanvasJS.Chart("chart",
        {
            title: {
                text: "Monero total supply curve"
            },
            data: [
                {
                    type: "spline",
                    dataPoints: dataPoints
                },
            ]
        });
    chart.render();
}

window.onload = () => {
    fetchTotalSupply();
    calculateChart();
}


