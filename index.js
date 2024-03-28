const Discord = require('discord.js-selfbot-v13');
const colors = require('colors/safe');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const BOT_ID = "450323683840491530";
const CHANNEL_ID = "1000402540908789820";

const config = yaml.load('config.yaml');
const client = new Discord.Client({
    checkUpdate: false,
    ws: { properties: { $browser: "Discord iOS" }}
});

const cooldowns = {
    "mine": 191,
    "wood": 120,
    "gather": 130,
    "fish": 130,
    "hunt": 180,
    "daily": 24 * 60 * 60
};

function extractRealNumbers(message) {
    const regex = /merci de patienter `(\d+)` minute\(s\) `(\d+)` seconde\(s\) pour réexécuter cette commande/;
    const match = message.match(regex);
    if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        return { minutes, seconds };
    }
    return null;
}

function first_run() {
    sendSlashCommand("rpg debut parrainage:2395");
    sendSlashCommand("rpg acheter id: 1");
    sendSlashCommand("rpg acheter id: 11");
    sendSlashCommand("rpg acheter id: 21");
    sendSlashCommand("rpg acheter id: 31");
    sendSlashCommand("rpg acheter id: 41");
}

async function executeAction(matchedAction, message) {
    if (matchedAction.action === "wait") {
        wait(matchedAction.timing);
    } else if (matchedAction.action === "first_run") {
        first_run();
    } else {
        await message.channel.sendSlash(BOT_ID, matchedAction.action, matchedAction.item, matchedAction.quantity);
    }
}

client.once('ready', () => {
    client.user.setActivity('Playing RPG 🤠', { type: "COMPETING" });
    console.log(colors.red(`RPG BOT STARTED 👾`));
    console.log(colors.bgYellow(`BOT IN EARLY BETA: \nhttps://github.com/m4rv4x/skyrpgbot`));
    Object.keys(getFarmActions()).forEach(async (action, index) => {
        setTimeout(async () => {
            console.log(colors.cyan(`[*] ${action} loop waiting ~${getFarmActions()[action].cooldown / 60}min delay for next ${action}`));
            await sendSlashCommand(getFarmActions()[action].action);
        }, index * 1000);
    });
    farm_loop();
});

client.on('messageCreate', async message => {
    if (message.author.id === BOT_ID && message.author.bot) {
        console.log(message.content)
        console.log(message.embeds)
        const actionOrder = getActions().find(action => message.content.includes(action.keyword));
        if (actionOrder) {
            executeAction(actionOrder, message);
        }

        const realNumbers = extractRealNumbers(message.content);
        if (realNumbers) {
            const { minutes, seconds } = realNumbers;
            Object.keys(cooldowns).forEach(key => {
                if (key === "cooldown") {
                    cooldowns[key] = minutes * 60 + seconds;
                } else if (key in getFarmActions()) {
                    cooldowns[key] = getFarmActions()[key].cooldown;
                }
            });
        }
    }
});

async function sendSlashCommand(action) {
    try {
        await client.channels.cache.get(config.channelID).sendSlash(BOT_ID, action);
    } catch (error) {
        console.log(error);
    }
}

async function farm_routine(order) {
    console.log(colors.bgRed(`[*] ${order}`));
    const actions = getFarmActions();
    const selectedAction = actions[order];
    if (selectedAction) {
        setTimeout(async () => {
            await sendSlashCommand(selectedAction.action);
            await farm_routine(order); // call the function recursively with the correct order
        }, selectedAction.cooldown * 1000);
    }
}

async function farm_loop() {
    const actions = getFarmActions();
    for (const action in actions) {
        console.log(colors.cyan(`[*] ${action} loop waiting ~${actions[action].cooldown / 60}min delay for next ${action}`));
        setTimeout(async () => {
            await farm_routine(action); // call the function recursively with the correct order
        }, actions[action].cooldown * 1000);
    }
}

///// WAIT WORKAROUND
function wait(timing) {
    console.log("[*] Waiting", timing, "seconds...");
    setTimeout(() => {
        console.log("[!] Finished waiting", timing);
    }, timing * 1000);
}

///// SCRIPT WILL HANDLE RESPONSE AND APPLY TASK
function getActions() {
    return [
        { order: "buy arrows", keyword: "de flèche pour ton arc", action: "rpg-craft crafter", item: "Flèche", quantity: "10", message: "[!] NEED ARROWS 🏹 -> -> ->" },
        { order: "buy money", keyword: "as pas assez pour acheter", action: "rpg-vendre tout", message: "[!] NEED MONEY 💵 $$$$$$" },
        { order: "get stats", keyword: "Please get your stats first", action: "first_run", message: "[!] FIRST START [NEED TO ADD ROUTINE TO CODE] !!!" },
        { order: "low energy", keyword: "Tu es en manque d'énergie", action: "rpg consommer", item: "Pomme", quantity: "10", message: "[!] LOW ENERGY ⚡ !!!" },
        { order: "low health", keyword: " Mange de la nourriture afin d'obtenir des points de vie", action: "rpg consommer", item: "Croissant", quantity: "2", message: "[!] LOW HEALTH 🖤 !!!" },
        { order: "buy croissants", keyword: "pas assez de croissant", action: "rpg acheter", item: "104", quantity: "2", message: "[!] NO MORE CROISSANTS 🥐!" },
        { order: "buy apples", keyword: "as pas assez de pomme", action: "rpg acheter", item: "102", quantity: "10", message: "[!] NO MORE APPLES 🍎!" },
        { order: "buy worms", keyword: "ver de terre pour ta canne à pêche, tu ne peux pas pêcher.", action: "rpg-craft crafter", item: "Ver de Terre", quantity: "2", message: "[!] NO MORE WORMS !" },
        { order: "max energy", keyword: "pas dépasser vos points d'énergie maximum", action: "wait", timing: 10, message: "[!] Too Much Energy, Sleeping !!!" },
        { order: "cooldown", keyword: "pour réexécuter cette commande", action: "wait", timing: cooldowns["cooldown"], message: "[!] TOO QUICK - COOLDOWN 30sec !!!" },
        { order: "max health", keyword: "de ne pas dépasser vos points de vie maximum", action: "wait", timing: 10, message: "[!] Too Much Health, Sleeping !!!" }
    ];
}

///// SCRIPT WILL RUN EVERY TASK
function getFarmActions() {
    return {
        "mine": { action: "rpg-farm miner", description: "Mining ⛏️", cooldown: cooldowns["mine"] },
        "wood": { action: "rpg-farm couper", description: "Cutting wood 🪓", cooldown: cooldowns["wood"] },
        "gather": { action: "rpg-farm cueillir", description: "Gathering 🧤", cooldown: cooldowns["gather"] },
        "fish": { action: "rpg-farm pecher", description: "Fishing 🎣", cooldown: cooldowns["fish"] },
        "hunt": { action: "rpg-farm chasser", description: "Hunting 🏹", cooldown: cooldowns["hunt"] },
        "farm": { action: "rpg-farm fermier action:Champ", description: "Farming 🌾", cooldown: cooldowns["farm"] },
        "daily": { action: "rpg-coffre daily", description: "DAILY 📦", cooldown: cooldowns["daily"] }
    };
}

client.login(config.discord_token);
