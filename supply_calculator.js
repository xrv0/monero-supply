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

function getBitcoinCirculatingSupplyOfBlock(blockHeight, startHeight, startSupply) {
    for(let i = startHeight; i < blockHeight && startSupply < 21000000; i++) {
        startSupply += getBitcoinBaseRewardForBlock(i);
    }
    return startSupply;
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
        var t0 = performance.now()
        let supplyOfBlock = getCirculatingSupplyOfBlock(blockHeight, lastBlockHeight, lastSupply);
        var t1 = performance.now()
        console.log("Monero supply calc took " + (t1 - t0) + " milliseconds.")

        let baseRewardOfBlock = getBaseRewardForBlock(blockHeight, supplyOfBlock, false);
        let baseRewardOfBlockWithoutUpdate = getBaseRewardForBlock(blockHeight, supplyOfBlock, true);

        const expectedMinedDate = getExpectedDateOfBlock(blockHeight);
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

    let lastBlockHeight = 0;
    let lastSupply = 0;
    for (let blockHeight = startBlock; blockHeight < maxBlockHeight; blockHeight += step) {
        const baseRewardOfBlockPer2Min = getBitcoinBaseRewardForBlock(blockHeight) / 5;
        const expectedMinedDate = getBitcoinExpectedDateOfBlock(blockHeight);
        const supplyOfBlock = getBitcoinCirculatingSupplyOfBlock(blockHeight, lastBlockHeight, lastSupply);

        lastBlockHeight = blockHeight;
        lastSupply = supplyOfBlock;

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
    let start = performance.now()
    const dataPoints = getDataPoints(12040000, 500000);
    let finish = performance.now()
    console.log("Monero calculation took some " + (finish - start) + " milliseconds.");

    const bitcoinDataPoints = getBitcoinDataPoints(0, 2660000, 210000)

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
