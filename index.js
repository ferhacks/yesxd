const { default: WASocket, DisconnectReason, useSingleFileAuthState, useMultiFileAuthState , fetchLatestBaileysVersion, delay, jidNormalizedUser, makeWALegacySocket, useSingleFileLegacyAuthState, DEFAULT_CONNECTION_CONFIG, DEFAULT_LEGACY_CONNECTION_CONFIG } = require("@adiwajshing/baileys")
const fs = require("fs")
const pino = require("pino")
const { Boom } = require("@hapi/boom")
const { Collection, Simple, Function } = require("./lib")
const { serialize, WAConnection } = Simple
const config = require("./config.json")
if (config.PrefixType == "multi") global.prefa = /^[#$+.?_&<>!/\\]/
else global.prefa = config.PrefixType


const main = async () => {
    const { state, saveCreds } = await useMultiFileAuthState("session")
    let { version, isLatest } = await fetchLatestBaileysVersion()
    let connOptions = {
        printQRInTerminal: true,
        downloadHistory: false,
        logger: pino({ level: "silent" }),
        auth: state,
        version
    }
    const killua = new WAConnection(WASocket(connOptions))
    killua.ev.on("creds.update", saveCreds)

    killua.ev.on("connection.update", async(update) => {
        const { lastDisconnect, connection } = update
        if (connection) {
            console.info(`Connection Status : ${connection}`)
        }

        if (connection == "close") {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode
            if (reason === DisconnectReason.badSession) { console.log(`Bad Session File, Please Delete Session and Scan Again`); killua.logout(); }
            else if (reason === DisconnectReason.connectionClosed) { console.log("Connection closed, reconnecting...."); connect(); }
            else if (reason === DisconnectReason.connectionLost) { console.log("Connection Lost from Server, reconnecting..."); connect(); }
            else if (reason === DisconnectReason.connectionReplaced) { console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First"); killua.logout(); }
            else if (reason === DisconnectReason.loggedOut) { console.log(`Device Logged Out, Please Scan Again And Run.`); process.exit(); }
            else if (reason === DisconnectReason.restartRequired) { console.log("Restart Required, Restarting..."); connect(); }
            else if (reason === DisconnectReason.timedOut) { console.log("Connection TimedOut, Reconnecting..."); connect(); }
            else killua.end(`Unknown DisconnectReason: ${reason}|${connection}`)
        }
    })
    const sendButtonMessage = async (to, Buttons, teks, options = {}) => {
        let {image} = options
        console.log(Buttons)
        if (Buttons.length == 0) {
           return console.log(`[${Buttons.length}] Bottons Found, Please Select One`)
        }
        console.log(Buttons)
        let templateButtons = [...Buttons]
        console.log(Buttons)
        console.log(teks)
        
        let templateMessage 
        if (image) {
            templateMessage = {
            image: { url: image.url },
            caption: teks,
            footer: config.botName,
            templateButtons: templateButtons
        }
        killua.sendMessage(to, templateMessage)
    }
        else {
            templateMessage = {
            caption: teks,
            footer: config.botName,
            templateButtons: templateButtons
        }
        killua.sendMessage(to, templateMessage)
    }
        console.log(templateMessage)
        
}
    killua.ev.on("messages.upsert", async (chatUpdate) => {
        m = serialize(killua, chatUpdate.messages[0])

        if (!m.message) return
        if (m.key && m.key.remoteJid == "status@broadcast") return
        if (m.key.id.startsWith("BAE5") && m.key.id.length == 16) return
        
        // killua.sendReadReceipt(m.key.remoteJid, m.key.participant, [m.key.id])
        try {
            let { type, isGroup, sender, from } = m
            let body = (type == "buttonsResponseMessage") ? m.message[type].selectedButtonId : (type == "listResponseMessage") ? m.message[type].singleSelectReply.selectedRowId : (type == "templateButtonReplyMessage") ? m.message[type].selectedId : m.text 
            let metadata = isGroup ? await killua.groupMetadata(from) : {}
            let pushname = isGroup ? metadata.subject : m.pushName
            let participants = isGroup ? metadata.participants : [sender]
            let groupAdmin = isGroup ? participants.filter(v => v.admin !== null).map(v => v.id) : []
            let isBotAdmin = isGroup ? groupAdmin.includes(killua.user?.jid) : false
            let isAdmin = isGroup ? groupAdmin.includes(sender) : false
            let isOwner = [killua.user?.id, config.Owner].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(sender)

    
            var prefix = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#%^&.©^]/gi.test(body) ? body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#%^&.©^]/gi)[0] : Function.checkPrefix(prefa, body).prefix ?? "#"
    
            let isCmd = body.startsWith(prefix)
            let quoted = m.quoted ? m.quoted : m
            let mime = (quoted.msg || m.msg).mimetype
            let isMedia = /image|video|sticker|audio/.test(mime)
            let budy = (typeof m.text == "string" ? m.text : "")
            let args = body.trim().split(/ +/).slice(1)
            let ar = args.map((v) => v.toLowerCase())
            let text = q = args.join(" ")
            let cmdName = body.replace(prefix, '').trim().split(/ +/).shift().toLowerCase()
            console.log(body)
            switch (cmdName) {
                case "ping":
                    killua.sendText(m.key.remoteJid, "Pong!", m)
                break
                case 'example':
                    sendButtonMessage(m.key.remoteJid, [
                        { index: 1, urlButton: { displayText: "Url", url: "https://google.com" } },
                        { index: 2, urlButton: { displayText: `Copiar`, url: 'https://www.whatsapp.com/otp/copy/577345' } },
                        { index: 4, quickReplyButton: { displayText: "Boton 1", id: "#ping" } },
                        { index: 5, quickReplyButton: { displayText: "Boton 2", id: "#ping" } },
                        { index: 6, quickReplyButton: { displayText: "Boton 3", id: "#ping" } },
                    ], "Test", { image : { url: 'https://camo.githubusercontent.com/23f3195d91e7095ae37ef6a22475b9f1206f8334bc3e5ca61637f7d7e8cf962a/68747470733a2f2f692e70696e696d672e636f6d2f373336782f66662f38372f62372f66663837623730653963396465613464396361333263393533386138316333622e6a7067' } })
                    break
                case 'help':
                case 'menu':
                    let xd = `      ${config.botName} Bot
Commands:
${prefix}help - Muestra este menu
${prefix}ping - Pong!
${prefix}example - Muestra un ejemplo de la funcion de botones`
                    sendButtonMessage(m.key.remoteJid, [
                        { quickReplyButton: { displayText: "Ping", id: "#ping" } }
                    ], xd, { image : { url: 'https://camo.githubusercontent.com/23f3195d91e7095ae37ef6a22475b9f1206f8334bc3e5ca61637f7d7e8cf962a/68747470733a2f2f692e70696e696d672e636f6d2f373336782f66662f38372f62372f66663837623730653963396465613464396361333263393533386138316333622e6a7067' } })
                    break

            }
        } catch (e) {
            console.error(e)
        }
    })
}

main()