
interface IRoundResult {
    lobbyId: number;
    result: any;
    time: Date;
}

const prevRoundResults: IRoundResult[] = [];

export const storeRoundResult = (result: any, lobbyId: number) => {
    const roundResult = {
        time: new Date(),
        lobbyId,
        result,
    };

    prevRoundResults.push(roundResult);


    if (prevRoundResults.length > 3) {
        prevRoundResults.shift();
    }
};

export const getPrevRoundResults = () => {
    return [...prevRoundResults];
};
