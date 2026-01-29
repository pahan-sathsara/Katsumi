import makeWASocket, {
	useMultiFileAuthState,
	DisconnectReason,
	fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'
import Pino from 'pino'
import dotenv from 'dotenv'
import mongoose from 'mongoose'

// load env
dotenv.config()

/* ================= CONFIG ================= */

const BOT_CONFIG = {
	sessionName: process.env.BOT_SESSION_NAME || 'sessions',
	prefixes: process.env.BOT_PREFIXES
		? process.env.BOT_PREFIXES.split(',').map(p => p.trim())
		: ['!','.'],
	ownerJids: process.env.OWNER_JIDS
		? process.env.OWNER_JIDS.split(',')
		: [],
	statusView: true,
	statusReact: true
}

const MONGO_CONFIG = {
	USE_MONGO: process.env.USE_MONGO === 'true',
	uri: process.env.MONGO_URI
}

/* ================= MONGO ================= */

async function connectMongo() {
	if (!MONGO_CONFIG.USE_MONGO) return
	await mongoose.connect(MONGO_CONFIG.uri)
	console.log('✅ MongoDB connected')
}

/* ================= BOT ================= */

async function startBot() {
	await connectMongo()

	const { state, saveCreds } =
		await useMultiFileAuthState(BOT_CONFIG.sessionName)

	const { version } = await fetchLatestBaileysVersion()

	const sock = makeWASocket({
		version,
		auth: state,
		logger: Pino({ level: 'silent' }),
		printQRInTerminal: true
	})

	sock.ev.on('creds.update', saveCreds)

	/* ===== MESSAGE LISTENER ===== */
	sock.ev.on('messages.upsert', async ({ messages }) => {
		const m = messages[0]
		if (!m.message) return

		const sender = m.key.participant || m.key.remoteJid
		const from = m.key.remoteJid
		const body =
			m.message.conversation ||
			m.message.extendedTextMessage?.text ||
			''

		/* ===== STATUS VIEW + REACT ===== */
		if (from === 'status@broadcast') {
			if (BOT_CONFIG.statusView) {
				await sock.readMessages([m.key])
			}
			if (BOT_CONFIG.statusReact) {
				setTimeout(async () => {
					await sock.sendMessage(from, {
						react: { text: '❤️', key: m.key }
					})
				}, 15000)
			}
			return
		}

		/* ===== COMMAND CHECK ===== */
		const prefix = BOT_CONFIG.prefixes.find(p =>
			body.startsWith(p)
		)
		if (!prefix) return

		const args = body.slice(prefix.length).trim().split(/\s+/)
		const command = args.shift().toLowerCase()
		const isOwner = BOT_CONFIG.ownerJids.includes(sender)

		const reply = text =>
			sock.sendMessage(from, { text }, { quoted: m })

		/* ===== COMMANDS ===== */

		if (command === 'ping') {
			reply('🏓 Pong! Bot Alive')
		}

		if (command === 'owner') {
			if (!isOwner) return reply('❌ Owner only')
			reply('👑 You are owner')
		}

		if (command === 'menu') {
			reply(`🤖 BOT MENU

!ping
!menu
!owner
`)
		}
	})

	/* ===== CONNECTION ===== */
	sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
		if (connection === 'close') {
			if (
				lastDisconnect?.error?.output?.statusCode !==
				DisconnectReason.loggedOut
			) {
				startBot()
			}
		}
		if (connection === 'open') {
			console.log('✅ Bot connected')
		}
	})
}

startBot()
