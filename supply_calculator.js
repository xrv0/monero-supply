const maxSupply = (Math.pow(2, 64) - 1) * Math.pow(10, -12); // Max supply is 2^^4 - 1 atomic units (piconero)
const tailEmission = 0.6;
const hydrogenHelixActivationHeight = 1009827;

function getBaseRewardForBlock(blockHeight, circulatingSupply, ignoreBlockTimeUpdate) {
    let reward = (maxSupply - circulatingSupply) * Math.pow(2, -20)
    if(blockHeight > hydrogenHelixActivationHeight && !ignoreBlockTimeUpdate) { // Double block reward after block time update
        reward *= 2
    }
    return reward > tailEmission ? reward : tailEmission; // Use tail emission if base reward is smaller than 0.6 XMR
}

// You can start from known block height with corresponding total supply for efficiency reasons
function getCirculatingSupplyOfBlock(blockHeight, startHeight, startSupply) {
    for (let bh = startHeight; bh <= blockHeight; bh++) {
        let blockReward = getBaseRewardForBlock(bh, startSupply, false);
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

function getDataPoints(maxBlockHeight, step) {
    let totalSupplyDataPoints = [];
    let blockRewardDataPoints = [];

    let lastSupply = 0;
    let lastBlockHeight = 0;
    for (let blockHeight = 0; blockHeight < maxBlockHeight; blockHeight += step) {
        let supplyOfBlock = getCirculatingSupplyOfBlock(blockHeight, lastBlockHeight, lastSupply)
        let baseRewardOfBlock = getBaseRewardForBlock(blockHeight, supplyOfBlock, false);
        let baseRewardOfBlockWithoutUpdate = getBaseRewardForBlock(blockHeight, supplyOfBlock, true);

        const expectedMinedDate = getExpectedDateOfBlock(blockHeight);
        const color = baseRewardOfBlock === tailEmission ? "Red" : "Blue";
        const label = baseRewardOfBlock === tailEmission ? "The tail emission of " + tailEmission + " XMR per block has set in" : "Block height: " + blockHeight + " Date: " + expectedMinedDate.toDateString()

        totalSupplyDataPoints.push({
            x: expectedMinedDate,
            y: supplyOfBlock,
            label: label,
            color: color,
            lineColor: color,
        });

        blockRewardDataPoints.push({
            x: expectedMinedDate,
            y: baseRewardOfBlockWithoutUpdate,
            label: label,
            color: color,
            lineColor: color,
        });
    }
    return [totalSupplyDataPoints, blockRewardDataPoints];
}

function setupCharts() {
    const dataPoints = getDataPoints(3500000, 50000);
    let totalSupplyChart = new CanvasJS.Chart("chart-total-supply",
        {
            axisY:{
                title:"Total XMR supply",
            },
            data: [
                {
                    type: "spline",
                    dataPoints: dataPoints[0]
                },
            ]
        });

    let blockRewardChart = new CanvasJS.Chart("chart-block-reward",
        {
            axisY:{
                title:"Miner reward per 2min",
            },
            data: [
                {
                    type: "spline",
                    dataPoints: dataPoints[1]
                },
            ]
        });
    totalSupplyChart.render();
    blockRewardChart.render();
}

function fetchTotalSupply() {
    fetch("https://localmonero.co/blocks/api/get_stats")
        .then(response => response.json())
        .then(data => {
            const totalSupplySpan = document.getElementById("current-total-supply");
            const totalSupply = data["total_emission"] * Math.pow(10, -12);
            totalSupplySpan.innerText = totalSupply.toString();
        });
}

window.onload = () => {
    fetchTotalSupply();
    setupCharts();
}


