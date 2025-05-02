
interface IRoundResult {
    lobbyId: number;
    result: any;
    time: Date;
}

// Initialize an array to store previous round results
const prevRoundResults: IRoundResult[] = [];

export const storeRoundResult = (result: any, lobbyId: number) => {
    const roundResult = {
        time: new Date(),
        lobbyId,
        result,
    };

    prevRoundResults.push(roundResult);

    // Keep the array size to a maximum of 3 recent rounds
    if (prevRoundResults.length > 3) {
        prevRoundResults.shift(); // Remove the oldest round if more than 3 results are stored
    }
};

export const getPrevRoundResults = () => {
    return [...prevRoundResults]; // Return a copy to prevent external mutation
};
