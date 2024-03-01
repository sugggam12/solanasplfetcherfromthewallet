const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const web3 = require("@solana/web3.js");

const botToken = '6811970105:AAFajvt_MyIQJV39zDNVxuUN90CUjcOW9BI';
//const bot = new TelegramBot(botToken, { polling: true });
const bot = new TelegramBot(botToken);
const publicKeys = [
    "2PwczP2pvqUtVSu9WeVL4zttsDtsi87fdrtWmmYh6B7s",
    "APt5jFU9HGkdBveKXKSC5QdbJ8m2jBHFeHGAbcjJRE7t",
    "G4BApsAcDEBBxSZw4wp7oKenrNrsJ1z6tKy8HLd6vG8y",
    "AzJyrw2VrtonsQGC9Ah7MuivTxZpfAkbFrpZve44FRJY",
    "4Fr4gCufCHCjQQCq533YmhwvVVMyZQhSMnnR9c5xYSYd",
    "BtqHCC5Ceqs7e1quRCBwUA4HgekMEGFW1WKTcDHkgDun",
    "3ZMN8HqmUqdAfFw1wcnBmcQ7Rd68nUchqiWHzFWLK9me",
    "EtNV8KAxbLgr643QfC2X9Hq19hpzLtRRP5cfPUcY5E9z",
    "6cdmMJLKCqjDFM2RZTr9AnhtCNoZHMioSEgj1mThe9v8",
    "6HaKExNrkuWJwF1xdLkwDHzMjbN2EUPFMskWxU6XtjAz",
    "FnFjnvWDCtnwWTTiH9jbY5Gn3QokZzyWe97RUmuL8z4w",
    "94QsBkQ1miVcsSRXZHJXdDXE36AGNQSNvNyvouAJoWQ3",
    "8FAi8gUgrTgRvVr4TwdZtu7M6ngtTeSMA81Aqxt8Vx59",
    "G8PgaiSxgrXAqKrk6rQVtzFxz2JdgBib8Ewft5R8CMiP",
    "8nUjx4KXo32h1t9U6xpnGe6vDrMFfrnmp1G6hwdNAxCp",
	"JjvWBHqEXtYVXMZQPD1t5Ehuy1XgzwvyaR7mePWA6dR",
	"BySTfHWs8uzBV8kvvE2eeEnq4im8T1ioZeiKSd8fCjK9",
	"2HRh67V2C6doFPHLmRWFvzRAgyLTdshEZEJARgWSUTU9"
	
];

// Initialize Solana connection for each public key
(async () => {
    for (const key of publicKeys) {
        const publicKey = new web3.PublicKey(key);
        const solanaConnection = new web3.Connection("http://ny-node2.hiddenodes.com:8899/", {
            wsEndpoint: "ws://ny-node2.hiddenodes.com:8900/",
			 maxSupportedTransactionVersion: 1 // Add this parameter
        });

        solanaConnection.onLogs(publicKey, async (logs, context) => {
            console.log("Signature: ", logs.signature);
            const accountOne = logs.signature;

            // Get the signature status
            const status = await solanaConnection.getSignatureStatus(accountOne, {
                searchTransactionHistory: true,
            });

            console.log("Signature Status: ", status);

            // If confirmationStatus is 'confirmed', fetch the parsed transaction
            if (status.value?.confirmationStatus === "confirmed") {
                //const parsedTransaction = await solanaConnection.getParsedTransaction(accountOne, "confirmed");
                const parsedTransaction = await solanaConnection.getParsedTransaction(accountOne, "confirmed", { encoding: "jsonParsed" });
                // Extract and print destination, lamports, and source
                parsedTransaction.transaction.message.instructions.forEach((instruction) => {
                    if (instruction.parsed && instruction.parsed.type === "transfer") {
                        const { lamports, source } = instruction.parsed.info;
                        // Convert lamports to SOL
                        const lamportsToSol = lamports / 1000000000; // 1 SOL = 1,000,000,000 lamports

                        console.log("Lamports:", lamportsToSol, "SOL");
                        console.log("Source:", source);
                        if (lamportsToSol >= 10) {
                        fetchTokenTransactions(source);
                    } else {
                        console.log("Lamports less than 10 SOL. Skipping fetching token transactions.");
						return;
                    }
                }
            });
        }
    }, "confirmed");
	}	
})();

async function fetchTokenTransactions(source) {
    try {
        const response = await axios.get('https://api.solscan.io/v2/account/token/txs', {
            params: {
                address: source,
                offset: '0',
                limit: '10',
                cluster: ''
            },
            headers: {
                'authority': 'api.solscan.io',
                'accept': 'application/json',
                'accept-language': 'en-US,en;q=0.9',
				'au-be': 'ctMOrZ2sh7yALX2QQgHy-fq0JMnfTziL4sPmNn-DxT',
				'dnt': '1',
                
                'origin': 'https://solscan.io',
                'pragma': 'no-cache',
                'referer': 'https://solscan.io/',
                'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site',
                
                'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36'
            }
        });

        // Create a set to keep track of unique token addresses
        const uniqueTokenAddresses = new Set();

        // Extract and print tokenAddress from each transaction
        for (const transaction of response.data.data.tx.transactions) {
            const tokenAddress = transaction.change.tokenAddress;

            // Check if tokenAddress is already seen, if so, skip
            if (uniqueTokenAddresses.has(tokenAddress)) {
                continue;
            }

            uniqueTokenAddresses.add(tokenAddress);

            // Make request to fetch additional token information
            const dexScreenerResponse = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);

            if (dexScreenerResponse.data.pairs && dexScreenerResponse.data.pairs.length > 0) {
                const tokenInfo = dexScreenerResponse.data.pairs[0]; // Assuming there is only one pair
                const { address, name } = tokenInfo.baseToken;
                const { fdv, pairCreatedAt } = tokenInfo;

                // Convert Unix timestamp to human-readable date format
                const pairCreatedAtDate = new Date(pairCreatedAt);
                const pairCreatedAtIST = pairCreatedAtDate.toLocaleString('en-US', {
                    timeZone: 'Asia/Kolkata', // Set timezone to Indian Standard Time
                });

                // Calculate time difference in milliseconds
                const currentTime = new Date();
                const timeDifferenceMs = currentTime - pairCreatedAtDate;

                // Convert milliseconds to minutes
                const timeDifferenceMinutes = Math.round(timeDifferenceMs / (1000 * 60));

                // Convert milliseconds to hours
                const timeDifferenceHours = Math.round(timeDifferenceMs / (1000 * 60 * 60));

                // Format the time difference
                let formattedTimeDifference;
                if (timeDifferenceMinutes < 60) {
                    formattedTimeDifference = `${timeDifferenceMinutes} minute${timeDifferenceMinutes === 1 ? '' : 's'} ago`;
                } else {
                    formattedTimeDifference = `${timeDifferenceHours} hour${timeDifferenceHours === 1 ? '' : 's'} ago`;
                }

                //if (timeDifferenceHours <= 1) {
				if (timeDifferenceHours <= 2 && fdv > 8000 && fdv < 50000) {	
                    // Output the result to the Discord channel
                    //channel.send(`Address: ${address}\nName: ${name}\nFDV: ${fdv}\nPair Created At: ${pairCreatedAtIST}\nTime Difference: ${formattedTimeDifference}`);
                    bot.sendMessage('-4168555009', `Base Token Address: ${address}\nName: ${name}\nMARRKETCAP: ${fdv}\nPair Created At: ${pairCreatedAtIST}\nTime Difference: ${formattedTimeDifference}`);
                } else {
                    console.log(`Skipping message for token ${address} as time difference is greater than 2 hours/Marketcap is too low`);
                }
            }
        }
    } catch (error) {
        console.error('Error fetching token transactions:', error);
        throw error; // Rethrow the error to handle it in the message event
    }
}


