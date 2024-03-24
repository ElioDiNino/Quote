const { REST, Routes } = require('discord.js');
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})

function getNumberInput(): Promise<number> {
    return new Promise((resolve) => {
        readline.question('What command ID do you want to delete? ', (answer: string) => {
            const number = parseInt(answer, 10)
            if (isNaN(number)) {
                console.error('Invalid input. Please enter a number.')
                resolve(getNumberInput()) // Recursively ask for valid input
            } else {
                resolve(number)
            }
        })
    })
}

function getContinueInput(): Promise<string> {
    return new Promise((resolve) => {
        readline.question('Do you want to enter another number? (y/n): ', (answer: string) => {
            resolve(answer)
        })
    })
}

async function main() {
    let again = "y"
    while (again.toLowerCase() === "y") {
        const commandID = await getNumberInput()
        if (process.env.GUILD_ID) {
            await rest.delete(Routes.applicationGuildCommand(process.env.CLIENT_ID, process.env.GUILD_ID, commandID))
                .then(() => console.log('Successfully deleted guild command'))
                .catch(console.error);
        } else {
            await rest.delete(Routes.applicationCommand(process.env.CLIENT_ID, commandID))
                .then(() => console.log('Successfully deleted application command'))
                .catch(console.error);
        }
        again = await getContinueInput()
    }
    readline.close()
}

main()
