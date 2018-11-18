module.exports = {
    
    // Decides which server to perform validation using proportional RNG.
    // serverWealths: array of server's wealth integer values
    // return val: array index of the selected server
    decideValidator: (serverWealths) => {
        const calculatePropWealth = (serverWealths) => {
            const sumReducer = (acc, curr) => acc + curr;
            const getRandomInt = (max) => {
                return Math.floor(Math.random() * Math.floor(max));
            };    
            let totalWealth = serverWealths.reduce(sumReducer);
            let i = -1;
            let rand = getRandomInt(totalWealth) + 1;
            while (rand > 0 ){
                i++;
                rand = rand - serverWealths[i];
            }
            return i;
        };
        const serverOccurrences = Array.apply(null, Array(serverWealths.length)).map(Number.prototype.valueOf, 0);
        const iterations = 1000;
        for (let i = 0; i < iterations; i++) {
            const selectedServer = calculatePropWealth(serverWealths)
            serverOccurrences[selectedServer]++;
        };
        let occ = serverOccurrences.reduce((a,b) => Math.max(a,b));
        let selectedServer = serverOccurrences.indexOf(occ);
        return selectedServer;
    },

}