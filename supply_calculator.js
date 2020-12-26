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

function getBitcoinBaseRewardForBlock(blockHeight) {
    let reward = 50;
    for(let i = 1; i < blockHeight / 210000; i++) {
        reward *= 0.5;
    }
    return reward;
}

function getBitcoinCirculatingSupplyOfBlock(blockHeight) {
    let supply = 0;
    for(let i = 0; i < blockHeight && supply < 21000000; i++) {
        supply += getBitcoinBaseRewardForBlock(i);
    }
    return supply;
}

const bitcoinDateOfFirstMinedBlock = new Date(2009, 1, 9, 3, 54, 0)
function getBitcoinExpectedDateOfBlock(blockHeight) {
    const expectedDate = new Date(bitcoinDateOfFirstMinedBlock.getTime() + 10 * blockHeight * 60000);
    return expectedDate;
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
        let label = baseRewardOfBlock === tailEmission ? "Tail emission has started" : " Date: " + expectedMinedDate.toDateString()

        totalSupplyDataPoints.push({
            x: expectedMinedDate,
            y: supplyOfBlock,
            label: label + " Block height: " + blockHeight,
        });

        blockRewardDataPoints.push({
            x: expectedMinedDate,
            y: baseRewardOfBlockWithoutUpdate,
            label: label,
        });
    }
    return [totalSupplyDataPoints, blockRewardDataPoints];
}

function getBitcoinDataPoints(startBlock, maxBlockHeight, step) {
    let totalSupplyDataPoints = [];
    let blockRewardDataPoints = [];

    for (let blockHeight = startBlock; blockHeight < maxBlockHeight; blockHeight += step) {
        const baseRewardOfBlockPer2Min = getBitcoinBaseRewardForBlock(blockHeight) / 5;
        const expectedMinedDate = getBitcoinExpectedDateOfBlock(blockHeight);
        const supplyOfBlock = getBitcoinCirculatingSupplyOfBlock(blockHeight);

        totalSupplyDataPoints.push({
            x: expectedMinedDate,
            y: supplyOfBlock,
            label: "Bitcoin",
            color: "orange",
            lineColor: "orange",
        });

        blockRewardDataPoints.push({
            x: expectedMinedDate,
            y: baseRewardOfBlockPer2Min,
            label: "Bitcoin",
            color: "orange",
            lineColor: "orange",
        });
    }

    return [totalSupplyDataPoints, blockRewardDataPoints]
}

function setupCharts() {
    const dataPoints = getDataPoints(3500000, 50000);
    const bitcoinDataPoints = getBitcoinDataPoints(275000, 950000, 100000)

    let totalSupplyChart = new CanvasJS.Chart("chart-total-supply",
        {
            theme: "dark2",
            responsive: true,
            axisY:{
                title:"Total XMR supply",
            },
            data: [
                {
                    type: "spline",
                    dataPoints: dataPoints[0]
                },
                {
                    type: "line",
                    dataPoints: bitcoinDataPoints[0]
                }
            ]
        });

    let blockRewardChart = new CanvasJS.Chart("chart-block-reward",
        {
            theme: "dark2",
            responsive: true,
            axisY:{
                title:"Miner reward per 2min",
            },
            data: [
                {
                    type: "spline",
                    dataPoints: dataPoints[1]
                },
                {
                    type: "stepLine",
                    dataPoints: bitcoinDataPoints[1]
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

onload = () => {
    fetchTotalSupply();
    setupCharts();
}
